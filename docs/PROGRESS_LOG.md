# Progress Log

최신 작업만 유지하는 짧은 로그다. 2026-05 전체 상세 이력은 `docs/archive/progress-2026-05.md`에 보관했다.

형식:

```text
YYYY-MM-DD
- Status:
- Changed:
- Verified:
- Blockers:
- Next:
```

## 2026-06-03

- Status: [x] PoC UI/UX Phase 2·3 — 전투 캔버스/타입라이터 + 반응형/로그 마감.
- Changed:
  - `src/mythos_api/static/app.js`(Phase 2): 전투 캔버스가 실제 `radar.arena.w/h` 사용·컨테이너 폭 반응형(dpr). blip 팩션 색·이름 라벨·HP 막대(비율 색)·사망 디밍·현재 턴 노란 링·방어 호·`available.reachable` 사거리 셀 하이라이트. 타입라이터: 토큰 큐 → 글자 단위 적응적 출력, 완료 후 캐럿 제거 + 선택지 노출.
  - `src/mythos_api/static/index.html`(Phase 3): main max-width 1320px 중앙 정렬, 560/900px 반응형, 접이식 로그 `<details>`, 터미널 스크롤바.
- Verified: `tests/test_api.py`(21) 통과, `node --check app.js` OK, 라이브 부팅 `/` 200 + gauge/command-card/log-panel/image-frame 서빙 확인. 브라우저 육안·전투 캔버스 실트리거는 사용자 확인 예정.
- Next: PoC UX 방안 3 Phase 모두 완료. (선택) 옵션 A 풀 SPA 또는 reference 백로그 항목.

## 2026-06-03

- Status: [x] PoC UI/UX Phase 1 구현 — 녹청 터미널 팔레트·레이아웃·선택지 카드·HUD·이미지 통제.
- Changed:
  - `src/mythos_api/static/index.html`+`app.js`: 시안/블루 → Streamlit 녹청 터미널 팔레트(스캔라인·글로우·SF Mono). 본문 중심 2단 레이아웃(좌 씬 카드 + 우 340px aside), 내러티브 70ch·15.5px + 스트리밍 캐럿. 선택지를 command-card([n] 핫키+라벨+intent, hover 글로우, 키보드 1-9)로. HUD STABILITY/TENSION 게이지 막대(위험도 색) + 루프/국면/위치 메타. 이미지 full-bleed → aspect 1:1 프레임 크기 통제 + 플레이스홀더/페이드인.
- Verified: `tests/test_api.py`(21) 통과, 라이브 WS begin으로 HUD/choices(label+intent) 필드 수신 확인. 브라우저 육안은 사용자 확인 예정.
- Next: PoC Phase 2(전투 캔버스 반응형·라벨·HP·사거리 링, 타입라이터 다듬기) → Phase 3(반응형·로그).

## 2026-06-03

- Status: [x] PoC UI/UX 개선 방안 문서화(라이브 스크린샷 기반).
- Changed:
  - 라이브 PoC 스크린샷 2장 검토 → 문제점(이미지 압도/본문 가독성/선택지 바/HUD 빈약/색 불일치/전투 캔버스 휑함) 진단.
  - `docs/plans/2026-06-03-poc-ux-improvement.md`(신규): PoC는 Streamlit과 별개의 레퍼런스 클라이언트임을 명시하고, Streamlit UX 언어(녹청 터미널 팔레트·command-card 선택지·HUD metric·이미지 크기 통제·SF Mono)를 참고한 파일별(`index.html`/`app.js`) 개선 제안 + 3 Phase 스코프 + 비목표 정리.
  - STATUS/NEXT_PLAN/AGENT_BRIEF에 PoC UX 개선 트랙 연동.
- Verified: 문서 작업(코드 변경 없음). 기존 `make test`(181) 영향 없음.
- Next: 승인 시 Phase 1(팔레트·레이아웃·선택지 카드·HUD·이미지 통제) 구현.

## 2026-06-03

- Status: [x] 레퍼런스(reference.md) 기반 피드백 및 기능 추가 백로그 도출.
- Changed:
  - `reference.md`의 명작 게임(Citizen Sleeper, Disco Elysium, Slay the Princess 등) 핵심 디자인 요소와 MythOS의 현재 구현 상태 분석.
  - 신규 아티팩트 `reference_feedback_list.md`를 생성하여 자원 제약 선택지, 스탯별 내면 독백, 내러티브 잔향, 전술 Intent 가시화, 동료 전술 성향 다각화 등의 액션 아이템 설계.
  - `docs/NEXT_PLAN.md`에 '레퍼런스 기반 내러티브 & 전술 피드백 반영 (Backlog)' 신규 섹션으로 계획 반영 완료.
- Verified: `make typecheck`, `make lint` 통과.
- Next: 프론트엔드 분리(slice 4 옵션 A 풀 SPA) 또는 백로그 항목(자원 제약 선택지/내면 독백) 우선순위 구현 개시.

## 2026-06-03

- Status: [x] API 이미지 경로 라이브 E2E 검증 + WS 폴링 창 상향.
- Changed:
  - 실가동 인프라(Postgres/MinIO/Redis + 실행 중 visual worker + Ollama)에서 API begin(async image)→Redis→worker→FLUX→MinIO→DB `succeeded`까지 실제 동작 확인. `/assets/resolve` presigned URL HTTP GET → 200/image/png/유효 PNG(1.1MB).
  - 발견: 실 FLUX 1024px 생성이 WS 30s 폴링 창을 초과 → `src/mythos_api/app.py`의 `_VISUAL_POLL_TRIES` 30→90으로 상향(느린 생성에서도 succeeded 프레임 전달). 단위 테스트/lint/typecheck 무영향.
- Verified: 위 라이브 E2E PASS, `tests/test_api.py`(21) 통과.
- Next: (선택) 옵션 A 풀 SPA, provider 메트릭 영속 집계, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] P3 consolidation(`make api` + `docs/API.md`) + provider 품질 메트릭 OTel/로그 방출.
- Changed:
  - `Makefile`: `make api`/`api-stop` 타겟, `make setup`이 `.[dev,web]` 설치. `docs/API.md`(신규): 실행법/엔드포인트표/WS 프레임/RuntimeSnapshot 형태.
  - `src/mythos_narrative/director.py`: `_record_outcome`이 outcome + 누적 집계(total/degraded/success_ratio)를 `mythos.narrative.outcome` OTel 스팬과 구조화 로그로 방출 — per-request director 리셋과 무관하게 provider 저하 관측. 저장소/마이그레이션 무변경.
  - `tests/test_narrative_director.py`(+1): outcome 로그의 누적 지표 포함 검증.
- Verified: `make test`(181 tests, 2 skipped), `make lint`, `make typecheck` 통과. `make api` 라이브 부팅 `/`·`/api/v1/health` 200.
- Next: (선택) 옵션 A 풀 SPA, 또는 provider 메트릭 영속 집계/대시보드, JSONB→전용 테이블 migration.

## 2026-06-03

- Status: [x] WS visual_status 합류 — API 이미지 생성 + 실시간 그림 전달.
- Changed:
  - 문제: 지금까지 API는 글만 보내고 이미지를 생성하지 않아 slice 3 presigned URL·기존 visual_worker·slice 2 WS가 end-to-end로 안 엮임. PoC 이미지 칸이 항상 비어 있었음.
  - `src/mythos_api/app.py`: WS begin/choose 메시지에 `with_image`/`visual_async`/`image_every_turn` 전달. snapshot 송신 후 `_emit_visual_status`로 씬 이미지 라이프사이클을 `visual_status` 프레임으로 스트리밍 — 동기 생성은 즉시 terminal, 비동기(Redis worker)는 pending 통보 후 store 폴링(최대 30s)으로 processing→succeeded(presigned url)/failed. `_terminal_visual_frame`/`_find_asset`/`_visual_frame` 헬퍼.
  - `src/mythos_api/static/{index.html,app.js}`: "이미지" 토글 추가, visual_status 수신 시 pending/processing은 "그림 생성 중", succeeded는 presigned url로 이미지 교체.
  - `tests/test_api.py`(+4): `_terminal_visual_frame`(succeeded url 서명/failed 무 url/pending None) + `_find_asset` 단위 검증(FLUX/Redis 불요).
- Verified: `make test`(180 tests, 2 skipped), `make lint`, `make typecheck` 통과.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드 별도 트랙. 또는 Open Risks(narrative_shards 압축, JSONB→전용 테이블 migration).

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 4(B) — 경량 PoC 레퍼런스 클라이언트 구현.
- Changed:
  - `src/mythos_api/static/index.html` + `app.js`(신규): Node 툴체인 없는 vanilla JS 클라이언트. connect → WS begin → 토큰 실시간 누적 → snapshot 확정 → 선택지 클릭 → WS choose 재스트리밍. `assets/resolve`로 presigned 이미지 렌더, `combat.radar`는 `<canvas>` blip 최소 시각화.
  - `src/mythos_api/app.py`: 모든 라우트 등록 후 `StaticFiles(html=True)`를 `/`에 마운트(API/WS 우선). `pyproject.toml` package-data로 `static/*` 포함.
  - `tests/test_api.py`(+3): `GET /` 200, `GET /app.js` 200, `/api/v1/health`가 정적 마운트에 가려지지 않음 검증.
  - 결정/스펙 문서: `docs/plans/2026-06-03-frontend-slice4.md` (옵션 B 먼저 → 추후 옵션 A 풀 SPA).
- Verified: `make test`(176 tests, 2 skipped), `make lint`, `make typecheck` 통과. 라이브 부팅 `python -m mythos_api`로 `/`·`/app.js`·`/api/v1/health` 200, `auth/connect`이 실제 Postgres에 플레이어 기록 확인.
- Next: (선택) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드를 별도 트랙으로. visual_status WS 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 3 — S3 presigned URL 자산 전달 구현.
- Changed:
  - `src/mythos_runtime/visual_service.py`: `MinIOStorageAdapter._client()` 헬퍼로 boto3 client 생성 분리, `presigned_url(storage_uri, expires_in=600)` 추가. 논리 `s3://bucket/key`를 만료시간 있는 HTTPS presigned URL로 변환, 비-s3 URI는 그대로 통과, malformed는 ValueError (설계 §5.2).
  - `src/mythos_api/app.py`: `POST /api/v1/assets/resolve`. storage_uri를 presigned URL로 가상화해 `{"url","expires_in"}` 반환, malformed s3는 400.
  - `src/mythos_api/service.py`: `get_storage_adapter` dependency.
  - `tests/test_api.py`(+3) / `tests/test_visual_service.py`(+3, boto3 mock으로 generate_presigned_url 인자 검증).
  - 분산 visual worker(`visual_worker.py`, Redis BRPOP + heartbeat)는 기존 구현 — slice 3의 미구현 갭은 presigned URL 전달이었음.
- Verified: `make test`(173 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 4 — Next.js/Vite 프론트엔드 + Canvas 전술 보드(설계 §3,§4). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 2 — WebSocket 토큰 스트리밍 `/api/v1/loops/stream` 구현.
- Changed:
  - `src/mythos_api/app.py`: `@app.websocket("/api/v1/loops/stream")` 추가. 인바운드 `{"event":"begin"|"choose", ...}`를 `stream_start_loop`/`stream_choose`에 매핑하고, 블로킹 동기 제너레이터를 `iterate_in_threadpool`로 async 브리지해 이벤트 루프 비차단. 프레임: `token`/`snapshot`/`error`. 하나의 소켓에서 begin/choose 반복 처리.
  - `tests/test_api.py`: WebSocket 4 tests(begin→token→snapshot, 동일 소켓 choose 연속, unknown event/없는 player 오류 프레임).
- Verified: `make test`(167 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과.
- Next: P3 slice 3 — 분산 visual worker(`visual_worker.py`, Redis BRPOP + Redlock heartbeat) + S3 presigned URL 자산 전달(설계 §5). 완료 시 `loops/stream`에 `visual_status` 프레임 합류.

## 2026-06-03

- Status: [x] P3 Web UI 디커플링 slice 1 — FastAPI `/api/v1` REST 백엔드 어댑터 구현.
- Changed:
  - `src/mythos_api/`(신규): `create_app` 팩토리(`app.py`), 스냅샷/플레이어 직렬화(`serializers.py`, `to_json_dict` 기반 GameState 계약), 요청별 Postgres store 주입 dependency(`service.py`), uvicorn 엔트리포인트(`__main__.py`).
  - 엔드포인트 7개: `health`, `auth/connect`, `loops/begin`, `loops/active`, `loops/choose`, `combat/begin`, `combat/action`. combat은 `combat_server` 응답 헬퍼 재사용. RuntimeError→404/409 매핑.
  - `pyproject.toml`: optional `web` extra(fastapi/uvicorn/httpx), `mythos-api` 콘솔 스크립트.
  - `tests/test_api.py`(신규, 7 tests): TestClient + in-memory store 주입으로 DB/Ollama 없이 검증.
- Verified: `make test`(163 tests, 2 skipped), `make lint`, `make typecheck`, `make smoke-local` 전체 통과. `create_app` 라우트 7개 등록 확인.
- Blockers: 인증 레이어 부재로 id를 요청 바디로 명시 전달(설계 대비 의도적 편차). 실 Postgres 연동 라이브 부팅은 미검증(unit은 in-memory).
- Next: P3 slice 2 — WebSocket 토큰 스트리밍(`/api/v1/loops/stream`, `stream_choose` 연동).

## 2026-06-03

- Status: [x] 미커밋 작업 트리(P1 레이턴시/P2 IP-Adapter/동료 AI/엔딩 AST/CI) 검증 후 논리 단위 커밋 정리.
- Changed:
  - 17개 수정 파일 + 신규(`.github/workflows/ci.yml`, P2/P3 plan docs)를 combat / visual / runtime-ui / ci / docs 5개 커밋으로 분리.
  - `.gitignore`에 `screenshots/` 추가, `NEXT_PLAN`의 마지막 미완료 항목 `CI 도입`을 `[x]`로 마감.
- Verified: `make test`(156 tests, 2 skipped), `make lint`, `make typecheck` 전체 통과. 작업 트리 clean.
- Next: P3 Web UI 디커플링 실구현(FastAPI 백엔드 어댑터). 설계는 `docs/plans/2026-06-03-web-ui-decoupling.md`.

## 2026-06-03

- Status: [x] Ollama API 타임아웃 튜닝 및 전투 종료 후 메인 화면 튕김 UX 흐름 개선 완료.
- Changed:
  - `config.py` (`src/mythos_image_agent/config.py`):
    - 로컬 LLM(Gemma 4) 기동 시 첫 토큰 생성 지연에 따른 타임아웃 예외(`APITimeoutError`)를 방지하기 위해 `ollama_timeout_seconds` 기본값을 4.5초에서 30.0초로 상향 조정.
  - `streamlit_app.py`:
    - 전투가 패배(`player_defeat`) 처리되거나 루프가 종결(`LoopPhase.ENDED`)되어 정산 버튼을 클릭했을 때, 이전처럼 메인 접속 화면으로 즉각 리다이렉트되어 진행이 끊기던 버그성 UX 흐름 수정.
    - 튕기지 않고 스냅샷을 갱신하여 부모 창에 루프 아카이브 성공/패배 메시지 및 런 히스토리, 해금 결과(`LoopPhase.ENDED` 상태 뷰)를 유저에게 그대로 렌더링하도록 갱신.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 세린 오프닝 연출(Ken Burns, 타이프라이터, Glitch SFX) 및 한국어화 튜닝, Codex 진척도/기억 단일화 통합 완료.
- Changed:
  - `streamlit_app.py`:
    - `_player_session_intro` 및 `_render_opening_cinematic`, `_opening_cinematic_html`을 전면 개편.
    - 단일 그리드로 표시되던 세린의 오프닝 씬들을 CSS Ken Burns 확대/축소, Typewriter 한글 타이핑 효과, 슬라이드 간 수동/자동 전환(7초)이 가능한 HTML5 sequential 슬라이드쇼로 탈바꿈.
    - 슬라이드가 전환될 때마다 `sfx_glitch.wav` 효과음 재생 및 화면 글리치 필터(0.3초)가 동기화되어 작동하도록 구현.
    - 오프닝 첫 접속 단계 시 BGM을 네오서울 메인 테마(`bgm_main.wav`)로 오버라이드하여 재생하도록 연계.
    - 메인 이야기 뷰 및 전투 뷰 하단에 흩어져 노출되던 "회상 잔향(Echo)"과 "모은 단서" 뷰(`_render_player_memory`)를 완전히 지우고, Codex(기억의 별자리) 탭의 `_render_codex_lore` 메뉴 하단에 유기적으로 통합 렌더링.
    - `SAVE` 버튼 동작 실패 및 `AUTOSAVE :: 슬롯 준비 중`에서 멈추는 에러 원인을 즉각 추적할 수 있도록 예외 발생 시 콘솔 traceback 출력 및 active 화면 상단에 붉은 에러 박스로 실시간 가시화 처리.
  - `scenario_context.py` (`src/mythos_runtime/scenario_context.py`):
    - `ONBOARDING_ACT1_SHOT1 / SHOT2 / SHOT3` 프롬프트 지시사항 및 씬 묘사 조건들을 완벽하게 한국어로 번역하여 AI 게임 마스터가 한글 씬 및 선택지들을 일관되게 생성하도록 프롬프트 최적화.
- Verified: `make lint`, `make typecheck`, `make test` (156 tests), `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] 동료 AI 전술 고도화, 전술 전투 밸런스 최종 조율, CI 파이프라인 도입 완료.
- Changed:
  - `engine.py` (`src/mythos_combat/engine.py`):
    - 동료 AI 스킬 선택 로직을 하드코딩 방식에서 데이터 중심의 범용적 동적 스킬 평가 루프(Generic Skill Evaluation Loop)로 전면 개편.
    - 힐링 스킬(`restore_margin`)을 보유한 동료가 범위 내 부상당한 아군(HP <= 60%)을 찾아 자동으로 치료하도록 AI 행동 패턴 연동.
    - 이동/탈출 스킬(`silent_shelve`, `signal_step` 등)을 보유한 겁쟁이(coward) AI 동료가 체력이 낮을 때 자동으로 텔레포트/이동 회피를 수행하도록 배선.
    - `_execute_npc_skill` 및 `_move_to_band`를 리팩토링하여 아군 대상 힐링 처리 및 이동 효과(`move`) 처리 연계.
  - `scenario.json` (`resources/neo-seoul/scenario.json`, `resources/glass-library/scenario.json`):
    - 정비 드론, 감시 드론, 집행 유닛 등 주요 적들의 HP, 방어력, 장갑을 상향하여 동료 합류 시의 전투 긴장감 유지.
    - 전술 소모품(나노패치, 자극 파편) 획득 밸런스 조정을 위해 전리품 획득 확률(Loot Table Weights) 하향 튜닝.
  - `.github/workflows/ci.yml` (신규):
    - GitHub Actions 지속적 통합 워크플로우 구성. 파이썬 3.11 환경에서 `make setup`, `make lint`, `make typecheck`, `make test`를 자동 실행하여 회귀 버그 방지 체계 마련.
  - `tests/test_combat_engine.py`:
    - 동료의 자동 힐링(`test_ally_uses_restore_margin_automatically`) 및 자동 이동 회피(`test_ally_uses_silent_shelve_automatically`) 검증을 위한 단위 테스트 추가.
- Verified: `make test` (156 tests), `make lint`, `make typecheck`, `make smoke-local` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 및 Web UI 아키텍처 연계 진행.

## 2026-06-03

- Status: [x] P1 이미지 생성 레이턴시 계측 및 최적화 프리셋 구현 완료.
- Changed:
  - `visual_service.py` (`src/mythos_runtime/visual_service.py`): 이미지 생성(`provider_ms`), Y2K/오버레이 필터 적용(`postprocess_ms`), 스토리지 업로드(`storage_ms`)의 구간별 시간과 총 소요 시간(`latency_ms`)을 계측하도록 고도화.
  - `observability.py` (`src/mythos_runtime/observability.py`): JsonFormatter에 계측 필드를 추가해 로깅 시 전송하며, `set_span_attribute()` 헬퍼를 도입해 OTel 스팬 속성에 주입.
  - `streamlit_app.py`: Player View 장면 이미지 하단에 구간별 레이턴시 캡션을 렌더링하고, 플레이어용 해상도/steps 프리셋(Fast, Balanced, Quality, Ultra) 선택박스를 사이드바에 추가.
- Verified: `make lint`, `make typecheck`, `make test`(148 tests), `make smoke-local`, `make test-db` 전체 통과.
- Next: P2 IP-Adapter 캐릭터 비주얼 일관성 도입 진행.

## 2026-06-03

- Status: [x] EndingResolver, 인과율/아젠다 디버그 모니터, Player View hotfix 기준선 최신화.
- Changed:
  - `EndingResolver` (`src/mythos_runtime/ending_resolver.py`) 신규 구현: `loop.state.flags` 내 Humanity/Insight/Resilience/Dominance 점수를 파싱/계산하고, `scenario.json`에 정의된 endings 조건식을 제한된 namespace에서 평가.
  - `session.py`의 `archive()` 및 `_combat_permadeath()` 시점에 `EndingResolver.resolve_ending`을 연결해 `ending_id` 및 `ending_label`이 `LoopState`와 `RunSummary`에 기록되도록 확장.
  - `streamlit_app.py` 내 Developer view에 `_causality_monitor_panel()` 디버그 모니터 신규 탑재: 실시간 스탯 스코어, active flags, endings 매칭 상태 및 조건식 확인 가능.
  - 선택 플레이어가 없어도 `새 게임 시작`이 새 player를 생성한 뒤 loop를 시작하도록 정리.
  - narrative parser와 runtime combat request guard가 `"null"`, `"none"`, `"undefined"` 같은 sentinel을 실제 encounter id로 처리하지 않도록 보강.
  - 오프닝 시네마틱 렌더를 self-contained iframe 경로로 바꿔 raw HTML이 화면에 노출되는 문제를 방지.
  - `tests/test_ending_resolver.py`에 다중 엔딩 매칭 단위 테스트를 추가하고 `test_runtime_session.py`에 통합 테스트(`test_archive_resolves_ending`) 반영.
- Verified: `make test`(148 tests, 2 skipped), `make typecheck`, `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 기반 검증은 못 함.
- Next: P0 엔딩 리졸버 조건식 안전화/시나리오 ending condition 보강 후 P1 비주얼 생성 레이턴시 계측.

## 2026-06-03

- Status: [x] 미완료 태스크 리스트업 및 로드맵 설계 완료.
- Changed:
  - 현재 로컬 런타임의 미완료 작업 항목 및 제품화 과제를 분석하고 P0~P3 우선순위와 함께 세부 체크리스트를 리스트업함.
  - 신규 아티팩트 `remaining_tasks_plan.md` 생성 및 `docs/NEXT_PLAN.md`에 세부 연동 정보 반영.
- Verified: `make lint`, `make typecheck`, `make test`, `make smoke-local` 확인.
- Next: P0 명시적 엔딩 조건 평가 및 저장 확장 (`EndingResolver`) 구현 및 검증.

## 2026-06-03

- Status: [x] Save/Load UX MVP 구현.
- Changed:
  - `SaveSlot` DTO 추가 및 active loop만 LOAD 대상으로 조회.
  - `PlayerMemory(kind="save_slot")` autosave metadata 저장. start/choice/stream/combat 진행 시 갱신.
  - `RuntimeSessionService.list_save_slots()` / `save_slot()` 추가.
  - `resume(player_id=...)`가 ended loop가 아니라 최신 active save slot을 선택하도록 변경.
  - Player View LOAD 카드에 active save slot 선택 UI 추가, ended loop는 기록 보관소 대상으로 분리.
  - Player active/combat 화면에 autosave 상태와 명시적 `SAVE` 버튼 추가.
- Verified: targeted save slot/runtime/combat tests, ruff, `make typecheck`, `make test`(142 tests, 2 skipped), `make smoke-local`, Streamlit HTTP 200 boot.
- Blockers: in-app Browser `iab` 세션이 없어 스크린샷 검증은 못 함. OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: 명시적 ending condition 경로의 `ending_id`/`ending_label` 저장 확장 또는 Web UI/클라우드 후속.

## 2026-06-03

- Status: [x] Meta Progression MVP 구현.
- Changed:
  - `MetaProgression` 모델과 run summary 기반 unlock 평가 추가.
  - 첫 런/단서/전투 승리/동료 만남에 따라 trait, codex, starting item, ally unlock 누적.
  - archive/permadeath 종료 시 `PlayerMemory(kind="meta_progression")` 저장 및 `PlayerProfile.traits` 갱신.
  - 새 루프 시작 시 meta progression state와 unlocked starting item을 초기 state/inventory에 반영.
  - Developer Memory 패널에 meta progression 요약 표시.
- Verified: targeted progression/runtime/combat tests, ruff, `make typecheck`, `make test`(141 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: active loop/save slot 기반 명시적 Save/Load UX.

## 2026-06-03

- Status: [x] Run History MVP 구현.
- Changed:
  - `RunSummary` DTO 추가 및 archive/permadeath 종료 시 `WorldMemory(kind="run_summary")` 저장.
  - `RuntimeSessionService.list_run_summaries()`와 `MemoryOverview.run_summaries` 조회 경로 추가.
  - 전투 종료 이벤트를 저장해 run summary의 전투 승/패 카운트를 집계.
  - Player View 접속 화면과 Developer Memory 패널에 `기록 보관소` 렌더링 추가.
  - loop summary 생성 실패가 archive/permadeath를 깨지 않도록 provider 예외 fallback 처리.
- Verified: targeted run history/combat tests, ruff, `make typecheck`, `make test`(139 tests, 2 skipped), `make smoke-local`.
- Blockers: OTel collector 미기동 시 trace export shutdown 재시도 로그가 남지만 검증은 통과.
- Next: run summary 기반 Meta Progression/unlock MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 오프닝/캐릭터 고품질 사전 제작 자산 정책 반영.
- Changed:
  - 세린 기준 얼굴을 사용자 제공 이미지 기준으로 재정의하고 `resources/neo-seoul/characters/se-rin.png`, `se-rin-biker.png`를 고품질 imagegen 결과로 교체.
  - 린위에를 "거래와 부채의 여왕" 컨셉으로 재생성해 `resources/neo-seoul/characters/lin-yue.png` 교체.
  - 이전 mflux 오프닝 초안 파일을 삭제하고, 고품질 `opening-01-serin-arrival.png`, `opening-02-first-contact.png`, `opening-03-drone-chase.png`를 정식 v1 오프닝 컷으로 확정.
  - Streamlit Player View 첫 세션 인트로가 `scenario.json["ui_copy"]["session_intro"]["cinematic_shots"]`를 시네마틱 패널로 렌더하도록 연결.
  - 비주얼 정책 정리: 사전 제작 고품질 키아트/캐릭터/적은 FLUX 또는 imagegen 중 품질 좋은 쪽 선택, 게임 중 동적 장면 이미지는 `mflux`, enemy/bestiary는 가능한 사전 제작 자산으로 분류.
- Verified: Neo-Seoul `scenario.json` 파싱, `streamlit_app.py` py_compile, `python -m unittest tests.test_story_bible`(9 tests).
- Blockers: 없음.
- Next: Player View 브라우저에서 오프닝 시네마틱 실제 렌더 확인 또는 Run History MVP.

## 2026-06-02

- Status: [x] Neo-Seoul 01을 1시간 소설형 세션 depth로 보강.
- Changed:
  - `resources/neo-seoul/scenario.json`에 `session_design` 추가. 40-60턴/1시간 목표, phase gate, 장면 밀도 규칙 명시.
  - Neo-Seoul main arc를 4막 요약에서 6막 구조로 확장: C-17 탈출, 점수/부채의 도시, 구출 작전, 카이 각성, 스파이어 접근, 관리자 IX 최종 대면.
  - side arc와 NPC agenda를 보강해 세린/린위에/카이/최적화 명단 대상자의 갈등이 장기 세션에 남도록 정리.
  - `resources/neo-seoul/story_bible/bible.json`을 15개 이상 snippet으로 확장. pacing contract, 막별 장면, 최적화 명단 진실, 구출 작전, 카이의 꿈, 스파이어 접근, 엔딩 Echo 정리를 추가.
  - `docs/scenarios/01-neo-seoul-connect.md`에 40-60턴 세션 구조와 장면 밀도 원칙 추가.
- Verified: Neo-Seoul JSON 2종 파싱, `python -m unittest tests.test_story_bible`(8 tests), `ruff check tests/test_story_bible.py`, `make test`(137, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP 또는 Player View에서 Neo-Seoul long-form 진행/phase gate 체감 확인.

## 2026-06-02

- Status: [x] 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성.
- Changed:
  - `docs/scenarios/02-glass-library.md` 추가. 기억 도서관 유리성, 사서 AI 이오, 잊힌 독자 미로, 백색 제본사, 첫 번째 접속 기록 미스터리를 정리.
  - `resources/glass-library/scenario.json` 추가. archetype, arcs, NPC agendas, endings, 최소 combat pool, 시나리오 전용 system prompt를 포함.
  - `resources/glass-library/story_bible/bible.json` 추가. phase/location/flags 기반으로 선택 가능한 Story Bible snippet 작성.
  - Glass Library scenario/story bible 로딩과 `NarrativeContext` snippet 주입 테스트 추가.
- Verified: `python -m json.tool`로 Glass Library JSON 2종 파싱 확인, `python -m unittest tests.test_story_bible`(7 tests), 변경 파일 ruff, `make test`(136, 2 skipped), `make typecheck`.
- Blockers: 없음.
- Next: Run History MVP(`RunSummary` 생성/저장/조회 및 Player View 기록 보관소).

## 2026-05-31

- Status: [x] 전투 후속 선택 섹션 마무리.
- Changed:
  - Neo-Seoul 주요 액티브 스킬(`signal_step`, `overload_strike`, `packet_shot`, `covering_noise`) focus 비용을 1에서 2로 조정해 매 라운드 무료 반복을 줄임.
  - `defend`가 즉시 focus 1을 회복하고, 기존 라운드 upkeep +1과 합쳐 재충전 턴 역할을 하도록 변경.
  - `stim_shard` focus 회복량을 2에서 3으로 올려 소비품 가치 보강.
  - custom component drag/drop tactical board는 현 단일 iframe 보드가 안정적이므로 필수 작업 없음으로 정리.
- Verified: `tests.test_combat_engine`, `tests.test_combat_service`, 변경 Python 파일 ruff, `scenario.json` 파싱, `make test`(134, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: Story Bible / Run History / Save Load 트랙 계속 진행.

## 2026-05-31

- Status: [x] Story Bible MVP 로더/선택/주입 구현.
- Changed:
  - `src/mythos_runtime/story_bible.py` 추가. `resources/<scenario>/story_bible/bible.json`을 읽고 phase/location/flags/turn 조건과 token budget에 맞는 snippet만 선택.
  - `build_runtime_narrative_context`가 선택된 Story Bible snippet을 `NarrativeContext.novelty_notes`에 `STORY_BIBLE_SNIPPET`으로 주입.
  - `resources/neo-seoul/story_bible/bible.json` 추가. Neo-Seoul 정사, C-17 첫 접속, 정세린, 한강 야시장, 카이, 관리자 IX 조각을 최소 바이블로 작성.
  - Story Bible 로딩/필터링/프롬프트 노트/context 주입 테스트 추가.
- Verified: `tests.test_story_bible`, 변경 파일 ruff, `make test`(133, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서` 작성 또는 RunSummary MVP.

## 2026-05-31

- Status: [x] Story Bible / Run History / Save Load 제품화 계획 문서화.
- Changed:
  - `docs/plans/2026-05-31-story-bible-save-load.md` 추가. 시나리오 바이블 snippet 주입, 샘플 게임북, RunSummary, 메타 진행도/해금, Save/Load UX의 단계별 구현 계획을 정리.
  - `docs/NEXT_PLAN.md`, `docs/STATUS.md`, `docs/AGENT_BRIEF.md`에 새 제품화 트랙을 다음 우선순위로 반영.
- Verified: 문서 변경만 수행.
- Blockers: 없음.
- Next: Story Bible MVP(`story_bible.py` loader/selector + Neo-Seoul 최소 bible)부터 구현.

## 2026-05-31

- Status: [x] 도주 후 encounter contact 유지 정책 구현.
- Changed:
  - `RuntimeSessionService._apply_combat_rewards`를 결과별로 분기해 `player_victory`만 보상/`defeated` 정산을 적용하고, `player_fled`는 보상 없이 contact를 `alerted`로 되돌리도록 변경.
  - `mark_encounter_alerted` 추가. 도주 contact는 `cooldown=1`을 받아 다음 encounter map tick에서 즉시 재충돌하지 않고 한 칸 물러난 뒤 맵에 남는다.
  - victory/flee 정산 단위 테스트와 alerted contact map tick 테스트 추가.
- Verified: `tests.test_encounter_map`, `tests.test_session_combat`, 변경 파일 ruff, `make test`(128, 2 skipped), `make typecheck`, `make smoke-local`.
- Blockers: 없음.
- Next: focus 재생량과 skill cost 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투 시뮬레이션 동료 선택 UI 추가.
- Changed: 전투 시뮬레이션 영역에 `시뮬레이션 동료` multiselect를 추가하고, 선택된 동료를 `RuntimeSessionService.start_combat(..., party_members=...)`로 넘겨 `_party.members`에 주입한 뒤 전투를 시작하도록 연결.
- Verified: `test_session_combat` party override 테스트 추가, `make test`(124, 2 skipped), `make typecheck`, 변경 파일 ruff, Browser에서 시뮬레이션 동료 선택 UI 표시 확인.
- Blockers: 없음.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 동료/파티 참전 구현.
- Changed:
  - `build_ally_combatant` 추가 및 `build_encounter(..., allies=...)` 확장. player+ally party를 전장 좌측에 배치하고 기존 엔진의 ally AI 턴을 사용.
  - `CombatService.begin`이 `_party.members`와 scenario ally `unlock_flags`를 읽어 정세린/카이 같은 ally combatant를 생성. 전투 종료/진행 후 ally HP를 `_party.members`에 carry-over.
  - ally radar/portrait/faction이 기존 단일 iframe 전투 UI roster/board에 그대로 표시되도록 연결.
  - 동료 spawn/flag unlock/HP persistence 테스트 추가.
- Verified: `make test`(123, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, service-level `se_rin` ally radar 확인.
- Blockers: 동료 스킬 자동 사용은 아직 없음(기본 NPC weapon AI). 밸런스는 후속 조정 가능.
- Next: 도주 후 contact roaming 유지 또는 focus/skill 밸런스 재검토.

## 2026-05-31

- Status: [x] 전투화면 단일 iframe 재구성 완료 — per-action Streamlit rerun/remount 제거.
- Changed:
  - `src/mythos_runtime/combat_server.py` 추가: 127.0.0.1 localhost JSON bridge, `combat_action_response` / `combat_state_response` 순수 핸들러, 요청별 `RuntimeSessionService` 위임.
  - `streamlit_app.py` 전투 fragment 단순화: 전투 중에는 `_build_combat_app_html` 단일 iframe이 보드/로스터/컨트롤/로그/결과를 렌더하고, 액션은 fetch로 처리. Streamlit은 종료 신호만 받아 다음 장면/메인 복귀를 수행.
  - `tests/test_combat_server.py` 추가: 상태 응답, 스킬 액션, 좌표 이동 매핑 검증.
- Verified: `make test`(121, 2 skipped), `make typecheck`, 변경 파일 ruff, `make smoke-local`, Browser Streamlit 전투 iframe 렌더 확인.
- Blockers: iframe 내부 버튼 클릭까지 자동화하지는 못했으나, 핸들러 단위 액션과 브라우저 렌더는 검증됨.
- Next: 동료/파티 참전.

## 2026-05-31

- Status: [x] 전투 스킬/아이템 실행 + 이동/blank 버그 수정. [ ] 깜박임/흰박스는 단일 iframe 재구성으로 인계.
- Changed:
  - 전투 스킬/아이템 엔진 배선: `Combatant`에 focus/skills/cooldowns/defense_buff, `factory.derive_max_focus`,
    `engine`의 `_player_skill`/`_player_item`/`_tick_player_round`, `CombatService` 스킬 부여 + 인벤토리 소비,
    radar/available에 focus·skills 노출, Streamlit 전투 컨트롤에 스킬/아이템 버튼 + 집중 게이지.
  - 전투 UI 버그: 보드 미표시(`st.markdown` iframe sanitize) → 인라인 `st.iframe`(srcdoc) 렌더로 교체.
    이동 무반응 → fragment select/move 후 `st.rerun(scope="fragment")`. 스킬 클릭 blank → `_dispatch` 헬퍼로
    액션 후 fragment rerun. 흰 박스 → `hidden_combat_action` label collapsed + `.st-key-` 숨김 CSS.
- Verified: `make test`(118, 2 skipped)·`make typecheck`·`make smoke-local` PASS, Streamlit headless 200 OK.
- Blockers: **깜박임 + 스킬창 흰 박스 잔존** — per-action rerun + iframe remount 구조 한계. 부분 완화만 됨.
- Next(codex 인계): **전투화면 단일 iframe 재구성** — `docs/plans/2026-05-31-combat-single-iframe.md`,
  `docs/NEXT_PLAN.md` §1. 엔진/스키마 무변경, 표현 계층만 재작성.

## 2026-05-31

- Status: [x] 문서 토큰 사용 최적화.
- Changed: `AGENT_BRIEF.md` 진입점 추가, 2026-05 상세 로그 archive 분리, current docs를 요약/링크 중심으로 정리.
- Verified: 문서 링크/크기 확인.
- Blockers: 없음.
- Next: 동료/파티 참전 작업 시 `STATUS.md`와 `NEXT_PLAN.md`만 갱신하고 상세 구현 기록은 필요한 만큼만 append.

## 2026-06-03

- Status: [x] P2 (IP-Adapter 캐릭터 비주얼 일관성 실배선) 및 P3 (Web UI 디커플링 아키텍처 설계) 완료.
- Changed:
  - `src/mythos_image_agent/config.py`: IP-Adapter 레포, 가중치명, CLIP 이미지 인코더 설정 속성 추가.
  - `src/mythos_image_agent/pipeline_cache.py`: `get_flux_ip_adapter_pipeline` 추가 (CLIP Image Encoder CPU 격리 로딩, base components 공유 생성, IP-Adapter 가중치 탑재).
  - `src/mythos_image_agent/generator.py`: `generate_image`에 `ip_adapter_image_path`/`ip_adapter_scale` 추가 배선 및 비사용 시 scale 0.0 처리.
  - `src/mythos_runtime/visual_service.py`: `_request_from_scene`에서 캐릭터 포트레이트 일치 시 `use_ip_adapter=True` 자동 설정, `LocalFluxProvider` 내 IP-Adapter 생성 분기 배선.
  - `resources/neo-seoul/scenario.json`: 누락되었던 `character_map` 및 `concept_map` 정보 추가 설정.
  - `docs/plans/2026-06-03-web-ui-decoupling.md` 및 `docs/plans/2026-06-03-p2-p3-implementation.md` 작성: Next.js/Vite 상태 바인딩, REST/WebSocket API boundary 규격, Canvas 기반 전술 전투 보드 설계 및 Redis Queue/S3 락 사양 정의.
  - `tests/test_visual_service.py`: 캐릭터 감지(IP-Adapter 활성화), 개념 감지(IP-Adapter 비활성), LocalFluxProvider 분기 라우팅, `get_flux_ip_adapter_pipeline` mock 단위 테스트 추가.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P0 EndingResolver 조건식 AST/whitelist evaluator 교체 및 시나리오 엔딩 조건식 정합성 점검.

## 2026-06-03

- Status: [x] 1순위 (P0 EndingResolver AST 안전화 및 시나리오 정합성 점검), 2순위 (P1 DB Connection Churn 최적화), 3순위 (P1 NPC 아젠다 & 이벤트 타임라인 디벨로퍼 뷰 고도화) 완료.
- Changed:
  - `src/mythos_runtime/ending_resolver.py`: `ASTConditionEvaluator` 구현. `eval`을 AST 파서/화이트리스트 기반 조건식 평가로 교체하여 RCE 보안 위험을 구조적으로 제거.
  - `tests/test_ending_resolver.py`: AST 평가식 및 논리 연산자, `flags contains` 조건 검증을 기존 유닛 테스트로 안정 작동 확인.
  - `streamlit_app.py`:
    - `@st.cache_resource` 데코레이터를 이용한 싱글톤 `get_shared_store()` 헬퍼 도입. 모든 UI 액션/스트림/로더에서 DB Store를 매번 생성하고 닫던 오버헤드(Connection Churn)를 완전히 제거하여 반응성 향상.
    - Developer panel (`_causality_monitor_panel`)에 NPC 아젠다 Goal/Rules 노출 및 매칭 활성 플래그 표시, `store.list_events`를 활용한 월드 이벤트 히스토리 타임라인(Causality Event Timeline) 시각화 보강.
- Verified: `make test` (152 tests, 2 skipped), `make typecheck`, `make smoke-local` 전부 성공 통과.
- Blockers: 없음.
- Next: P1/P2 동료 AI/행동 및 전술 밸런싱 고도화.
