# `mlx_lm.server` 능력 확인 (T4) — 2026-09-06

서빙 리서치 플랜(`docs/plans/2026-08-30-mythos-as-serving-research-workload.md`) T4의 답. **코드가 아니라 문서·소스 읽기**로 확인했고, 벤치 B(48GB M4 Max) 설계의 전제가 된다. 확인 시점의 `ml-explore/mlx-lm` `main`.

## 결론 한 줄

`mlx_lm.server`는 **`response_format`을 받지 않는다**(요청 본문에서 읽지도 않음). 요청 *간* 프리픽스 캐시는 **있다**(`LRUPromptCache`, 최장 접두 일치) — 단 **sliding-window 층이 있는 모델(Gemma 3/4)은 재사용이 깨지고**(#980), 전층 full-attention인 **Qwen3 계열은 온전하다**. 따라서 벤치 B의 E-A(프리픽스 캐싱)는 **Qwen3-8B/14B/30B 사다리**로 돌리고, Gemma는 대조군으로만 둔다.

## 확인 항목

| 질문 | 답 | 근거 |
|---|---|---|
| `response_format`(`json_object`/`json_schema`) | **없음.** `server.py`가 읽는 본문 필드: `stream`, `stream_options`, `model`, `draft_model`, `num_draft_tokens`, `adapters`, `max_completion_tokens`, `temperature`, `top_p`, `logit_bias`, `seed`, `chat_template_kwargs`. `response_format`은 무시된다(에러도 아님). | `mlx_lm/server.py` |
| 요청 간 프리픽스 캐시 | **있음.** 서버 전역 `LRUPromptCache(prompt_cache_size)` → `fetch_nearest_cache(model_key, prompt)`가 토큰 최장 접두 일치 캐시를 돌려주고 나머지만 prefill. 플래그 `--prompt-cache-size`(기본 **10**개), `--prompt-cache-bytes`. 디스크 영속화 PR(#1405, `--prompt-cache-dir`)은 **미병합**(2026-08-21 용량 사유로 닫힘). | `mlx_lm/server.py`, PR #1405 |
| 캐시가 깨지는 모델 | **sliding-window / SSM 하이브리드.** `RotatingKVCache`는 임의 토큰 경계에서 trim이 불가해 전체 재-prefill. 이슈 #980(2026-03 닫힘, 본 repo에 병합된 수정 없음)에 Gemma 3 전 사이즈·GPT-OSS·Qwen 3.5가 명시. **Gemma 4**: `gemma4_text.make_cache`가 `layer_types`별로 sliding 층에 `RotatingKVCache(max_size=sliding_window)`, full 층에 `KVCache` — 기본 패턴 sliding 4 : full 1(≈80%)이라 **영향권**. **Qwen3**(`qwen3.py`): `make_cache` 미정의 → 기본 `KVCache` 전층 → **안전**. | `models/gemma4_text.py`, `models/qwen3.py`, #980 |
| 추측 디코딩 | **있음** — 요청별 `draft_model`/`num_draft_tokens`. | `server.py` |
| 연속 배칭 | **미확인**(문서에 언급 없음; 서버는 단일 요청 순차 처리로 보이나 소스로 확정하지 않았다). c>1 측정 전 확인 필요. | SERVER.md |
| 48GB 모델 상한 | **미확인** — 기동 로그로 잰다(스터디 규칙 5). | — |

## MythOS 통합에 대한 의미

- **파서 단계(`generate_json`)의 `response_format: json_object`는 MLX에서 무시된다.** 선택지: ① 프롬프트 계약 + 기존 `parse → repair → fallback` 경로만으로 버틴다(구조 실패율을 E-C에서 잰다), ② `response_format`/`json_schema`를 구현한 서드파티 MLX 서버(`mlx-openai-server`, `vllm-mlx`)를 쓴다 — 이때 캐시 동작은 다시 확인해야 한다. `engine_options.py`의 `mlx` 행은 이 표대로: `max_completion_tokens`(← `max_tokens` 아님), `repetition_penalty`는 **미노출**(서버 본문 필드에 없음), `json_object` **불가**.
- **E-A는 Qwen3에서만 의미가 있다.** Gemma로 재면 "캐시가 있는데 안 먹는" 아키텍처 효과를 워크로드 효과로 오독한다.
- 캐시 슬롯이 기본 10개라 동시 루프 수 > 10이면 LRU 축출이 곡선을 흔든다 — 벤치 B에서 `--prompt-cache-size`를 통제 변수로 기록한다.

## 한계

- 문서·소스 읽기이며 실측 아님. `mlx-lm`은 빠르게 움직이므로 벤치 B 첫 실행 전 `pip show mlx-lm` 버전과 함께 **재확인**한다.
- Gemma 4의 `sliding_window_pattern` 기본값은 소스의 기본 인자에서 읽었다; 실제 배포 가중치의 `config.json`이 다를 수 있다.

Sources: [mlx_lm/server.py](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/server.py) · [SERVER.md](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/SERVER.md) · [Issue #980](https://github.com/ml-explore/mlx-lm/issues/980) · [PR #1405](https://github.com/ml-explore/mlx-lm/pull/1405) · [models/gemma4_text.py](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/models/gemma4_text.py) · [models/qwen3.py](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/models/qwen3.py)
