# 2026-05-30 Visual Job Architecture Entry Decision

상태: `[x]` Decision recorded → **이후 진입함**. 파이프라인 캐싱 + auto-on-transition 도입
으로 동기 블로킹이 문제화되어 Phase 13 async를 구현했다(2026-05-30, 같은 날 후속).
구현 요약은 `DECISIONS.md`(Enter Phase 13), 진행은 `PROGRESS_LOG.md`, 항목 체크는
`NEXT_PLAN.md` Phase 13. 아래 "Async Design Sketch"가 실제 구현과 거의 일치한다.

이 문서는 Phase 13 Visual Job Architecture의 **진입 조건**을 판단하기 위한 측정 방법과 결정을 기록한다. 최신 rolling plan은 `docs/NEXT_PLAN.md`, 결정 요약은 `docs/DECISIONS.md`를 따른다.

## Context

현재 이미지 생성은 동기식이다.

- `mythos_runtime.visual_service.VisualService.generate()`가 `provider.generate()`(FLUX MPS) → `storage.store()`를 직렬로 실행한다.
- Streamlit에서는 `_run_action()`이 `st.spinner` 안에서 `service.start_loop/choose(... with_image=True)`를 호출하므로, FLUX가 끝날 때까지 그 rerun이 블로킹된다.
- 텍스트 플레이는 `with_image=False`가 기본이라 이미지 경로를 타지 않으면 영향이 없다.

즉 블로킹은 **이미지를 켰을 때만**, 그리고 **해당 턴 한정**으로 발생한다.

## Measurement Method

새 계측을 추가할 필요는 없다. 동기 생성 지연은 이미 구조적 로그/trace로 측정된다.

- `mythos.visual.generate` `timed()` span이 `latency_ms`를 JSON 로그(stderr)와 Jaeger에 남긴다 (`observability.py`).
- 따라서 실제 FLUX 지연 p50/p95는 다음으로 수집한다.
  1. `MYTHOS_LOG_LEVEL=INFO`로 Streamlit/CLI를 `--with-image` 실행.
  2. stderr JSON 로그에서 `"message":"visual generation finished"` 항목의 `latency_ms` 수집, 또는 Jaeger(`http://localhost:16686`)에서 `mythos.visual.generate` span 조회.
- 파이프라인 오버헤드(FLUX 제외, record/storage)는 `make visual-smoke`(fake-PNG provider)의 `mythos.visual.generate` `latency_ms`로 따로 확인한다. 이 값이 작으면 지연은 전적으로 FLUX 추론에 있다는 뜻이다.

기준 해상도/스텝: 기본 1024×1024 / 4 steps. 데모 기본값은 512×512 / 1 step.

## Entry Criteria (async 도입 조건)

다음을 **모두** 만족하면 Phase 13 async 작업을 시작한다.

1. 측정된 FLUX `latency_ms` p50가 인터랙티브 플레이를 끊는 수준(잠정 기준: > 8000ms)이고,
2. 데모/사용 시나리오에서 `with_image`를 켠 채 연속 턴을 진행하는 흐름이 실제로 필요하며,
3. "이미지 생성 중 텍스트 플레이를 계속하고 싶다"는 요구가 생긴 경우.

하나라도 미충족이면 동기 방식을 유지한다.

## Decision

**현 시점 async/Redis queue 도입은 보류한다.**

- 이미지 생성은 기본 disabled이고 명시적으로 켠 턴에만 동기 실행되므로, 텍스트 플레이의 크리티컬 패스를 막지 않는다.
- 지연은 이미 `mythos.visual.generate` `latency_ms`로 관측 가능하므로, 별도 측정 인프라 없이 진입 조건을 모니터링할 수 있다.
- Redis는 infra에 이미 떠 있으나(`docker-compose.local.yml`), worker/queue/asset pending 상태 모델은 위 Entry Criteria가 충족될 때 도입한다.

## Async Design Sketch (진입 시 적용)

진입 조건 충족 시 구현 스케치:

- `assets`에 `pending`/`processing` status를 추가(현재 `succeeded`/`failed`/`disabled`).
- `RuntimeSessionService`는 `with_image` 시 동기 생성 대신 Redis에 visual job을 enqueue하고 `pending` AssetRecord를 즉시 기록.
- 별도 worker entrypoint(`python -m mythos_runtime.visual_worker` 가칭)가 job을 소비해 FLUX 실행 후 asset status를 갱신.
- Streamlit `_render_assets`가 `pending`/`processing`/`succeeded`/`failed`를 구분 표시하고, 폴링 또는 수동 새로고침으로 최신 상태를 보여줌.

## Verification

- 결정 문서이므로 코드 변경 없음.
- 측정 방법은 기존 `make visual-smoke`(파이프라인 오버헤드)와 `mythos.visual.generate` 로그/trace(실제 FLUX 지연)로 검증 가능.
