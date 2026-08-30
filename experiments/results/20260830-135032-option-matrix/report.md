# option-matrix

**질문** — OpenAI 호환 엔드포인트에서 실제로 도달하는 샘플러 파라미터는 무엇인가?

실행 2026-08-30T13:51:22.139110+00:00 · commit `ef2c4348d71ab1ab63688c816210fde67be8936d` · ⚠️ **dirty tree** (커밋이 실행된 코드를 특정하지 못함) · Darwin 25.6.0 arm64
실험 스크립트 SHA-256 `7aa0a36ab6959849…`

## 통제와 변수

| | 항목 | 값 |
|---|---|---|
| 통제 | `model` | gemma4:latest |
| 통제 | `endpoint` | http://localhost:11434/v1 |
| 통제 | `temperature` | 0 (샘플러 팔) |
| 통제 | `prompt` | 고정 |
| **변수** | `파라미터 전달 형태와 이름` | **표 참조** |

## 요약

출력 상한은 **max_tokens=** 으로만 전달됩니다. temperature=0 기준선을 움직인 샘플러 노브: **frequency_penalty=2.0, presence_penalty=2.0**.

## 측정

### ① 출력 상한(5 토큰) 전달 형태

| 전달 형태 | 출력 문자 | 적용됨 |
|---|---|---|
| none (baseline) | 691 | — |
| max_tokens= | 0 | **예** |
| extra_body={'options':{'num_predict'}} — 현행 | 691 | 아니오 |
| extra_body={'num_predict'} (top level) | 691 | 아니오 |

> 효과가 명백한 검사라 이 표는 결정적입니다.

### ② 샘플러 노브 — temperature=0 기준선에서 완성이 달라지는가

| 파라미터 | 출력 문자 | 기준선과 다름 |
|---|---|---|
| top_p=0.1 | 762 | 아니오 |
| frequency_penalty=2.0 | 767 | **예** |
| presence_penalty=2.0 | 884 | **예** |
| extra_body top_k=1 | 762 | 아니오 |
| extra_body repeat_penalty=2.0 | 762 | 아니오 |

> '다름'은 적용됐다는 뜻이고, '같음'은 무시됐다는 **강한 신호**이지 증명은 아닙니다 — 효과가 없는 값일 수도 있습니다. 그래서 극단값(top_p=0.1, penalty=2.0, top_k=1)을 썼습니다.

## 발견

1. **[measured]** 이 엔드포인트에서 출력 길이를 제어하는 유일한 방법은 max_tokens=이다.
   - 근거: 무제한 691자 대비, 네 가지 전달 형태 중 위 표의 결과.
2. **[measured]** 쓸 수 있는 샘플러 노브는 frequency_penalty=2.0, presence_penalty=2.0뿐이다.
   - 근거: 극단값을 넣고 temperature=0 완성이 바뀌는지로 판정.
3. **[indicative]** 어댑터는 이 목록만 사용해야 하며, 쓸 수 없는 노브(예: 컨텍스트 길이)는 요청이 아니라 모델 선택으로 다뤄야 한다.
   - 근거: 현행 코드는 여섯 노브를 보내고 있고 EXP-03에서 전부 버려짐을 확인했다.

## 한계

- 모델 1종·프롬프트 2종·각 팔 1회. 재실행 분산은 측정하지 않았습니다.
- 이 Ollama 버전의 호환 계층 관측입니다. vLLM·MLX는 다시 재야 합니다 (vLLM은 top_k·repetition_penalty를 extra_body 최상위로 받는 것으로 알려져 있으나 미확인).
- ②의 '같음'은 무시의 강한 신호이지 증명이 아닙니다 — 효과 없는 값일 가능성이 남습니다.
- 출력 품질은 보지 않았습니다. 오직 파라미터가 도달하는지만 봤습니다.
- num_ctx는 여기서 검사하지 않았습니다 — 호환 엔드포인트에서 요청 단위 설정 대상이 아닙니다.

---

생성: `experiments/harness.py`. 재현은 위 통제·변수와 commit 기준.
