# experiments/ — 서빙 연구 실험

MythOS를 서빙 최적화 연구의 워크로드로 쓰기 위한 실험 모음입니다.
배경 근거는 [`docs/reference/2026-08-30-self-hosted-inference-and-mythos-as-research-platform.md`](../docs/reference/2026-08-30-self-hosted-inference-and-mythos-as-research-platform.md),
실행 계획은 [`docs/plans/2026-08-30-mythos-as-serving-research-workload.md`](../docs/plans/2026-08-30-mythos-as-serving-research-workload.md).

> ⚠️ **`make check`에 포함되지 않습니다.** 실제 엔진을 호출하고 수 분이 걸리며 비결정적입니다.
> 하네스 자체 로직만 `tests/test_experiment_harness.py`가 게이트에서 지킵니다.
> **무인(overnight) 루프에서 실행 금지.**

## 왜 하네스인가

이 트랙이 방법을 물려받은 스터디의 핵심 발견은 **같은 기법이 워크로드와 부하에 따라 +199%에서 −54%까지 뒤집힌다**는 것이었습니다.
그래서 무엇을 고정했는지 적지 않은 숫자는 없는 것보다 나쁩니다 — 바로 그 잘못된 비교를 부르니까요.

`harness.py`는 그걸 구조로 강제합니다.

- **질문** 한 줄, **통제**와 **변수**를 리포트에 박습니다. 변수가 둘 이상이면 리포트가 경고를 답니다.
- **provenance** — git commit·dirty 여부·플랫폼·**실험 스크립트 SHA-256**. `scripts/eval/narrative_judge.py`가 루브릭 해시를 남기는 것과 같은 이유입니다: 나중에 *측정자가* 움직였는지 알 수 있어야 합니다.
- **한계는 필수**입니다. `limits`가 비면 리포트 생성이 거부되고 디렉터리도 남기지 않습니다.
- **발견마다 confidence** — `measured` / `reproduced` / `indicative` 셋 중 하나.

## 실행

```bash
make experiment                                   # 목록
make experiment ARGS="workload-profile --trace /tmp/mythos-trace"
make experiment ARGS="context-overflow  --trace /tmp/mythos-trace"
```

결과는 `experiments/results/<UTC스탬프>-<slug>/` 에 `report.md` · `provenance.json` · `raw/data.json`.
**덮어쓰지 않습니다** — 실행마다 새 디렉터리라, 두 실행을 diff할 수 있습니다.

## 트레이스 뜨기

대부분의 실험은 **프롬프트 트레이스**를 읽습니다. 트레이스는 `MYTHOS_PROMPT_TRACE=<dir>`가 켜졌을 때
`src/mythos_narrative/trace.py`가 남기는 JSONL이고, 프로바이더 호출 한 건이 한 줄입니다
(프로바이더가 받은 `messages` 원문 + 응답 + 지연 + 스트림이면 청크 수).

엔진에 무관하게 같은 형식이 나옵니다 — Ollama·Vertex Gemini·로컬 vLLM·MLX 모두. 그래서 **한 엔진에서 뜬
트레이스를 다른 엔진에 재생해 동일 입력으로 비교**할 수 있습니다.

```bash
make infra-up && make db-migrate
export MYTHOS_PROMPT_TRACE=/tmp/mythos-trace

.venv/bin/python -m mythos_runtime.connect_cli new-player 트레이스 --player-id p_trace
.venv/bin/python -m mythos_runtime.connect_cli connect --player-id p_trace
# 위 출력의 loop_id로:
PYTHONPATH=src:. .venv/bin/python -m experiments.capture_trace <loop_id> 8
```

`capture_trace`는 **항상 첫 번째 선택지**를 고릅니다 — 플레이 분포가 아니라 하나의 고정 경로입니다.
이 트레이스를 쓰는 리포트는 그 사실을 한계에 적어야 합니다.

## 🔒 트레이스는 소스와 동급으로 취급합니다

트레이스에는 **프롬프트 원문**이 들어갑니다. 이 저장소에서는 곧 시나리오 캐논과 서사 산문입니다.
`resources/<scenario>/story_bible`과 같은 비공개 규칙이 적용됩니다. 리포지토리 밖으로 내보내거나
외부 서비스에 업로드하기 전에 **반드시 사전 확인**하십시오. 공개할 수 있는 것은 **방법과 집계 수치**입니다.

`results/`의 리포트는 집계와 발견만 담으므로 상대적으로 안전하지만, `raw/data.json`에 원문 조각이
들어가는 실험을 새로 쓸 경우 같은 판단을 다시 해야 합니다.

## 현재 실험

| slug | 질문 |
|---|---|
| `workload-profile` | MythOS 서사 워크로드의 모양 — prefill/decode 축과 연속 턴 프리픽스 공유율 |
| `context-overflow` | 로컬 스토리텔러의 빈 응답이 컨텍스트 창 초과에서 오는가 |

## 새 실험 추가

1. `experiments/exp_<name>.py`에 `SLUG`, `build(...) -> Experiment`, `main(argv)`를 둡니다.
2. `controls`/`variables`를 **실제 실행 시점 값**으로 채웁니다 — 의도한 값이 아니라.
3. `limits`를 씁니다. 비면 하네스가 거부합니다.
4. `experiments/run.py`의 `EXPERIMENTS`에 등록합니다.

측정 규율(스터디 랩 승계):
- 한 번에 **변수 하나**.
- 워크로드별로 **갈라서** 잽니다 — 합산은 설명력이 0인 경우가 많습니다.
- 노이즈 바닥보다 작은 차이는 주장하지 않습니다. 동시성 c≤32는 재현 잡음 1.3%, **c=64는 10%**.
