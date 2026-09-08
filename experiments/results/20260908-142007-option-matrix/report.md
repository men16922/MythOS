# option-matrix

**질문** — OpenAI 호환 엔드포인트에서 실제로 도달하는 샘플러 파라미터는 무엇인가?

실행 2026-09-08T14:21:02.014092+00:00 · commit `104cbfc5f8f99cbd6276d51ede27d52bab4a0a54` · ⚠️ **dirty tree** (커밋이 실행된 코드를 특정하지 못함) · Darwin 25.6.0 arm64
실험 스크립트 SHA-256 `5d749fcb04e0aa0d…`

## 통제와 변수

| | 항목 | 값 |
|---|---|---|
| 통제 | `engine` | mlx |
| 통제 | `model` | mlx-community/Qwen2.5-Coder-7B-Instruct-4bit |
| 통제 | `endpoint` | http://127.0.0.1:8081/v1 |
| 통제 | `temperature` | 0 (①②④) · 1.0 (③) |
| 통제 | `prompt` | 고정 |
| **변수** | `파라미터 전달 형태와 이름` | **표 참조** |

## 요약

[mlx] 출력 상한은 **max_tokens=, max_completion_tokens=** 으로 전달됩니다. temperature=0 기준선을 움직인 페널티: **frequency_penalty=2.0, presence_penalty=2.0, extra_body repetition_penalty=2.0 (vLLM/MLX 이름)**. temperature=1.0 샘플링을 argmax로 붕괴시킨 잘라내기 샘플러: **top_p=0.01 @ T=1.0, extra_body top_k=1 @ T=1.0**. `response_format=json_object`: **무시**.

## 측정

### ① 출력 상한(5 토큰) 전달 형태

| 전달 형태 | 출력 문자 | 적용됨 |
|---|---|---|
| none (baseline) | 537 | — |
| max_tokens= | 17 | **예** |
| max_completion_tokens= | 17 | **예** |
| extra_body={'options':{'num_predict'}} — Ollama 네이티브 | 537 | 아니오 |
| extra_body={'num_predict'} (top level) | 537 | 아니오 |

> 효과가 명백한 검사라 이 표는 결정적입니다.

### ② 로짓 페널티 — temperature=0 기준선에서 완성이 달라지는가 (페널티 없는 요청 뒤에 연속 2회 전송)

| 파라미터 | 1회째 문자 | 1회째 다름 | 2회째 문자 | 2회째 다름 |
|---|---|---|---|---|
| frequency_penalty=2.0 | 631 | 아니오 | 649 | **예** |
| presence_penalty=2.0 | 631 | 아니오 | 687 | **예** |
| extra_body repeat_penalty=2.0 (Ollama/llama.cpp 이름) | 631 | 아니오 | 631 | 아니오 |
| extra_body repetition_penalty=2.0 (vLLM/MLX 이름) | 631 | 아니오 | 677 | **예** |

> 그리디 재현성: 확인. penalty류는 argmax 이전에 로짓을 바꾸므로 그리디 디코딩에서도 판정이 성립합니다. 판정은 2회째 기준입니다 — 1회째만 '아니오'면 서버가 첫 요청의 프로세서를 떨어뜨린 것입니다. '아니오'는 무시의 강한 신호이지 증명은 아닙니다.

### ③ 잘라내기 샘플러 — temperature=1.0에서 그리디 기준선으로 붕괴하는가

| 파라미터 | 출력 문자 | 그리디 기준선과 동일 |
|---|---|---|
| none @ T=1.0 (control) | 384 | — |
| top_p=0.01 @ T=1.0 | 631 | **예** |
| extra_body top_k=1 @ T=1.0 | 631 | **예** |

> top_p/top_k는 그리디에서 원래 무효라 temperature=1.0에서 잽니다: 도달하면 후보가 1개로 잘려 argmax와 같은 완성이 나오고, 버려지면 자유 샘플링이라 달라집니다. 자유 샘플링 대조(temperature=1.0, 노브 없음)가 기준선과 다른가: 예.

### ④ JSON 모드 — 평문 요청에 response_format을 붙이면 JSON이 나오는가

| 요청 | 출력 문자 | JSON 파싱 |
|---|---|---|
| none (baseline) | 94 | 아니오 |
| response_format={'type':'json_object'} | 94 | 아니오 |

> 프롬프트는 JSON을 언급하지 않습니다. 기준선이 이미 JSON이거나 어느 쪽이든 빈 출력이면 판정 불가. 스키마 준수가 아니라 파싱 가능 여부만 봅니다.

## 발견

1. **[measured]** mlx: 출력 길이는 max_tokens=, max_completion_tokens= 으로 제어된다.
   - 근거: 무제한 537자 대비, 다섯 가지 전달 형태 중 위 표의 결과.
2. **[measured]** mlx: 도달하는 로짓 페널티는 frequency_penalty=2.0, presence_penalty=2.0, extra_body repetition_penalty=2.0 (vLLM/MLX 이름) 이다.
   - 근거: 극단값을 넣고 temperature=0 완성이 바뀌는지로 판정(연속 2회째 기준)
3. **[measured]** mlx: 페널티 없는 요청 직후의 첫 요청은 페널티를 잃는다 — frequency_penalty=2.0, presence_penalty=2.0, extra_body repetition_penalty=2.0 (vLLM/MLX 이름).
   - 근거: 같은 요청을 페널티 없는 요청 뒤에 연속 2회 보내 1회째/2회째를 각각 기준선과 비교.
4. **[measured]** mlx: 도달하는 잘라내기 샘플러는 top_p=0.01 @ T=1.0, extra_body top_k=1 @ T=1.0 이다.
   - 근거: temperature=1.0에서 노브를 넣었을 때 완성이 그리디 기준선과 같아지는지로 판정
5. **[measured]** mlx: `response_format=json_object`는 무시된다.
   - 근거: 평문 요청 기준선 JSON=False, response_format 붙인 요청 JSON=False.
6. **[indicative]** `engine_options.py`의 `mlx` 행은 이 목록만 실어야 한다; 쓸 수 없는 노브는 요청이 아니라 모델 선택으로 다뤄야 한다.
   - 근거: 위 네 표. 어댑터 행은 믿음이 아니라 측정이어야 한다는 원칙.

## 한계

- 모델 1종·프롬프트 3종·각 팔 1회(②는 연속 2회). 재실행 분산은 그리디 재현성 1회 반복으로만 확인했습니다.
- 이 mlx 서버 버전의 관측입니다. 다른 엔진·버전은 다시 재야 합니다.
- ③의 '아니오'는 top_p=0.01 핵이 두 토큰 이상을 남긴 드문 경우에도 나올 수 있습니다 (거짓 음성 가능). '예'는 우연으로 나오기 어렵습니다.
- ②·③의 '아니오'는 무시의 강한 신호이지 증명이 아닙니다 — 효과 없는 값일 가능성이 남습니다.
- ④는 파싱 가능 여부만 봅니다. 스키마 유효율은 별도 실험(플랜 E-C)입니다.
- 출력 품질은 보지 않았습니다. 오직 파라미터가 도달하는지만 봤습니다.
- 컨텍스트 길이는 여기서 검사하지 않았습니다 — 호환 엔드포인트에서 요청 단위 설정 대상이 아닙니다.

---

생성: `experiments/harness.py`. 재현은 위 통제·변수와 commit 기준.
