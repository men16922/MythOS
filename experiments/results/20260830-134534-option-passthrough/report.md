# option-passthrough

**질문** — director.py가 extra_body.options로 보내는 샘플러 설정이 실제로 모델에 도달하는가?

실행 2026-08-30T13:45:50.815940+00:00 · commit `713a8ca3dc13187a4821f275e1a079d5c50b3ea6` · ⚠️ **dirty tree** (커밋이 실행된 코드를 특정하지 못함) · Darwin 25.6.0 arm64
실험 스크립트 SHA-256 `12fc79111bcd386e…`

## 통제와 변수

| | 항목 | 값 |
|---|---|---|
| 통제 | `prompt` | 고정 프로브 |
| 통제 | `model` | gemma4:latest |
| 통제 | `endpoint` | http://localhost:11434/v1 |
| 통제 | `cap` | 5 |
| **변수** | `상한 전달 방식` | **없음 / extra_body.options / max_tokens** |

## 요약

`num_predict=5`를 director.py와 같은 `extra_body.options` 형태로 보냈을 때 출력 **691자** — 무제한 기준선 691자와 **같습니다. 옵션이 무시됩니다.** 같은 상한을 OpenAI 네이티브 `max_tokens`로 주면 0자입니다.

## 측정

### 동일 프롬프트, 상한 5 토큰을 전달하는 방식만 변경

| 전달 방식 | 출력 문자 | 상한이 적용됐는가 |
|---|---|---|
| 없음 (기준선) | 691 | — |
| `extra_body={'options': {...}}` — director.py가 보내는 방식 | 691 | **아니오** |
| `max_tokens=` — OpenAI 네이티브 | 0 | 예 |

## 발견

1. **[measured]** Ollama의 OpenAI 호환 엔드포인트는 `extra_body.options`를 조용히 버린다.
   - 근거: num_predict=5로 691자, 무제한 기준선 691자. 동일 상한을 max_tokens로 주면 0자.
2. **[indicative]** 따라서 director.py의 num_ctx·num_predict·repeat_penalty·repeat_last_n·top_p·top_k는 지금까지 로컬 경로에서 한 번도 적용된 적이 없다 — 같은 dict에 실려 함께 버려진다.
   - 근거: 여섯 값 모두 동일한 `extra_body['options']`에 담겨 전송된다 (director.py OllamaJSONProvider).

## 한계

- 프로브 1종·모델 1종·각 팔 1회. 재실행 분산은 측정하지 않았습니다.
- 이 Ollama 버전의 호환 계층에 대한 관측입니다. 버전이 바뀌면 달라질 수 있습니다.
- `num_predict`로 검사했습니다. 나머지 옵션은 같은 dict에 실린다는 사실에서 추론한 것이며 개별적으로 확인하지 않았습니다.
- vLLM·MLX의 호환 계층은 다를 수 있습니다 — 엔진마다 다시 재야 합니다.
- temperature와 response_format은 최상위 OpenAI 파라미터라 이 결과에 해당하지 않습니다.

---

생성: `experiments/harness.py`. 재현은 위 통제·변수와 commit 기준.
