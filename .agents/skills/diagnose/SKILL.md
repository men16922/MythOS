---
name: diagnose
description: 원인 모를 버그·성능·렌더·실패 이슈를 추정 수정 없이 근본원인부터 증거로 확정한다(재현→가설→측정→수정→재측정). "왜 안 되는지", "원인 모르겠는 버그", "느린/멈추는 이유", 표면 수정 반복, overnight gate-red 시 사용. `harness/CORE_MANDATES.md §5 Diagnose before any fix`의 프로토콜 강제판.
---

# /diagnose — 근본원인 진단 프로토콜

추정 기반 표면 수정으로 헛도는 것(usage insights 최다 마찰)을 막는다. **증거로 원인을 확정하기 전에는
어떤 수정도 적용하지 않고, before/after 측정 없이 "fixed"라 보고하지 않는다.** 첫 그럴듯한 이론이 아니라
데이터에 커밋한다.

## 절차 (각 단계 증거를 남긴다 — 건너뛰면 무효)

1. **재현 + 증거 캡처.** 실패를 실제로 재현하고 구체 증거를 잡는다 — 로그(`logs/`, stderr JSON),
   타이밍, 메모리/swap(`vm_stat`/`top`), 프로세스 상태, 관련 파일/상태 스냅샷. 재현 불가면 그 사실과
   관찰된 증상만 적고 가설 단계로(추정 수정 금지).
2. **경쟁 가설 2~3개**를 가능도 순으로 세운다. 하나만 적지 말 것(확증편향 방지). 각 가설이 맞다면
   *무엇이 관측돼야 하는지*를 명시한다.
3. **가설을 구별하는 측정.** 가설들을 가르는 한 가지 측정/실험을 설계해 돌린다. 데이터가 가설을
   지목하게 한다(코드 읽기·추론만으로 확정하지 않는다 — 수치/로그로).
4. **확정된 원인만 수정.** 측정이 지목한 원인 한 가지만 고친다. 동시에 여러 추정 수정 금지(무엇이
   고쳤는지 모르게 된다).
5. **재측정으로 해소 증명.** 1단계와 *동일한* 측정을 재실행해 before/after로 해소를 증명한 뒤에만
   완료 보고한다. 회귀 가드가 가능하면 테스트/invariant로 박제(`docs/engineering/mythos/HARNESS.md`
   Feedback Ladder: 3회+ → invariant).

## 이 repo 맥락

- **게이트**: `make check`(ruff+eslint+mypy+tsc/vite+unittest). gate-red면 **어느 phase가 깼는지** 먼저
  분리한다(`make python-lint`/`typecheck`/`frontend-build`/`test` 개별 실행) — phase가 곧 1차 가설.
- **성능/멈춤**: model load·prompt prefill·RAM/swap·I/O·중복 워커 중 어디서 시간이 가는지 수치로
  (`scratch/ttft_bench.py` 류, `vm_stat`, Ollama `/api/tags` 지연). 48GB RAM swap 포화가 과거 진범.
- **이미지/MPS**: 모델 재적재·`PYTORCH_MPS_HIGH_WATERMARK_RATIO`·Flux1+Redux 동시적재 메모리.
- **서사/LLM**: gemma4는 이미지를 안 봄(텍스트만) → 정합 문제는 지시 fidelity. 실 Ollama 2회 재생성으로 확인.
- **렌더/프론트**: live Playwright(`make test-e2e`)로 실제 화면 관찰 후 단정.
- **overnight gate-red**: 러너가 분류한 phase 포인터를 입력으로 받아 그 phase부터 1단계 재현.

## 규칙

- **금지**: 측정 전 수정, 한 번에 여러 추정 수정, 재측정 없는 "fixed" 보고, 코드 읽기만으로 원인 단정.
- 재현이 비싸거나 불가하면 그 한계를 명시하고, 가능한 최소 측정으로 가설을 좁힌다(그래도 추정 수정은 금지).
- 진단 과정의 긴 로그/측정 덤프는 채팅이 아니라 파일로(예: `logs/`), 결론·증거 요약만 보고
  (`CORE_MANDATES §5` 출력 규율).
- 이 스킬은 **진단**이 본분이다. 원인 확정 후의 구현/리팩터는 평소 흐름으로.
