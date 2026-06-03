# Project MythOS Status

최종 갱신: 2026-06-03

## Current State

Project MythOS 로컬 플레이어블 MVP는 구현 완료 상태다. Streamlit 플레이어/개발자 뷰, Neo-Seoul 시나리오, Codex/단서 해금, 인과율/다중 엔딩 구조, mflux 기반 비동기 이미지 생성, BGM/SFX, 전술 전투 루프, 단일 iframe 전투 UI, 동료 참전, 도주 후 contact 유지, Run History MVP, Meta Progression MVP, Save/Load UX MVP, Ending Resolver, Developer 인과율 모니터가 동작한다. 주력 콘텐츠는 Neo-Seoul 01이며, 1회 1시간/40-60턴 소설형 세션을 목표로 6막 구조와 Story Bible depth를 보강했다.

핵심 런타임:

- `RuntimeSessionService`: CLI/Streamlit 공통 orchestration.
- PostgreSQL: player, loop, scene, memory, asset metadata.
- MinIO: 생성 이미지 기본 저장소.
- Redis: visual job queue/worker heartbeat.
- Ollama: AI GM narrative generation.
- mflux/FLUX: Apple Silicon 이미지 생성 백엔드.

## Latest Verified Baseline

- `make test` (176 tests, 2 skipped)
- `mythos_api` FastAPI `/api/v1` 어댑터: `tests/test_api.py`(17) — health/connect/begin/active/choose/combat REST + WebSocket `loops/stream`(begin→token→snapshot, 동일 소켓 choose, 오류 프레임) + `assets/resolve`(presigned URL) + 정적 PoC 클라이언트(`/`, `/app.js`, API 비가림)를 in-memory store TestClient로 검증(DB/Ollama 불요). `MinIOStorageAdapter.presigned_url`은 boto3 mock 단위 테스트로 검증.
- API 라이브 부팅: `python -m mythos_api` → `/`·`/app.js`·`/api/v1/health` 200, `auth/connect`이 실제 Postgres에 플레이어 기록 확인.
- `make typecheck`
- `make smoke-local`
- Streamlit headless boot 200 OK
- Browser Streamlit 전투 iframe 렌더 확인: 보드/로스터/컨트롤/로그가 단일 iframe 안에 표시되고 흰 입력 박스가 노출되지 않음.
- Service-level ally spawn check: `_party.members=[se_rin]`에서 ally radar/portrait/HP 반영 확인.
- Targeted combat follow-up tests: 도주 결과는 contact를 `alerted`+cooldown 상태로 유지하고 보상을 적용하지 않음.
- Combat balance tests: focus 비용 2 중심 조정, 방어 집중 회복 턴, `stim_shard` 회복량 조정 검증.
- Story Bible MVP tests: Neo-Seoul/Glass Library `story_bible/bible.json` 로딩, phase/flag/location 기반 snippet 선택, `NarrativeContext` 주입 확인.
- Run History tests: archive/permadeath 시 `run_summary` 저장, service 조회, Player View 기록 보관소 렌더 경로 확인.
- Meta Progression tests: run summary 기반 unlock 평가, `PlayerMemory(kind="meta_progression")` 저장, 새 루프 시작 시 unlocked starting item/state 반영.
- Save/Load tests: active save slot 목록, ended loop load 차단, player resume 최신 active slot 선택 확인.
- Ending Resolver tests: scenario ending condition 평가, `RunSummary.ending_id`/`ending_label` 저장 경로 확인.
- Player View hotfix tests: 선택 플레이어가 없어도 `새 게임 시작`이 player 생성 후 시작되고, `"null"` combat request sentinel은 전투 요청으로 처리하지 않음.
- Opening cinematic renderer: Streamlit iframe 기반으로, Ken Burns 확대/축소 및 슬라이드 간 이동, Typewriter 텍스트 타이핑 효과, 슬라이드 전환 연동 glitch SFX 및 화면 글리치 필터 효과 구현.
- Streamlit boot check: `http://localhost:8501` 200 OK.
- AST-based EndingResolver (P0): `eval` 제거 후 safe `ASTConditionEvaluator` 구현 완료, Neo-Seoul / Glass Library 엔딩 식 정합성 및 타입 매핑 검증 완료.
- DB Connection Churn 최적화 (P1): `@st.cache_resource` 기반 싱글톤 적용 대신, 안정적인 커넥션 관리(local instantiation + try-finally store.close)를 복구하고 Save/Load 예외 즉시 가시화 및 콘솔 traceback 출력 적용.
- NPC Agendas & Causality Timeline (P1): Developer 뷰 내 NPC 아젠다 상세 스펙 및 WorldEvents 타임라인 시각화 완료.
- Onboarding Prompt Localization (P1): turn 0, 1, 2 에 해당하는 지시문을 한국어로 강제하여 AI 게임 마스터가 한글 씬/선택지를 생성하도록 튜닝.
- Codex Progression Unification (P1): 메인 뷰 하단의 회상 잔향 및 단서 목록을 Codex 탭의 '기억의 별자리' 뷰 안으로 완전히 통합 및 안내 추가.
- Ollama API Timeout Tuning (P1): 로컬 인프라 생성 부하에 따른 타임아웃 문제를 막기 위해 default timeout을 4.5초에서 30.0초로 상향하여 loop 요약 시의 API 중단을 예방.
- Combat Exit Flow Resolution (P1): 전투에서 패배하거나 루프가 종료되어 정산할 때, 기존 메인 접속 화면으로 튕기던 하드코딩 흐름을 스냅샷 이행 화면(ENDED 페이즈 뷰)을 노출하도록 고도화.

## Active Focus

P2 IP-Adapter 캐릭터 일관성, P1 비주얼 레이턴시 계측은 코드 반영·커밋 완료. **P3 Web UI 디커플링 실구현에 착수했고 slice 1(FastAPI `/api/v1` REST 어댑터)을 완료**했다.

- `mythos_api` 패키지(신규): `create_app` 팩토리가 `RuntimeSessionService`를 `/api/v1`로 노출(`auth/connect`, `loops/begin|active|choose`, `combat/begin|action`, `health`) + WebSocket 토큰 스트리밍(`loops/stream`, §2.2) + 자산 presigned URL 변환(`assets/resolve`, §5.2) + 경량 PoC 클라이언트(`/`에 `static/{index.html,app.js}` 서빙). Streamlit 무변경 추가형. optional `web` extra(`pip install -e ".[web]"`), 실행은 `python -m mythos_api`(또는 `mythos-api`).
- 다음 트랙(선택): 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas 전술 보드(§3,§4, Node 툴체인 신설). 완료 시 `loops/stream`에 `visual_status` 프레임 합류. 권위 설계는 `docs/plans/2026-06-03-web-ui-decoupling.md`, 프론트 결정은 `docs/plans/2026-06-03-frontend-slice4.md`.

## Completed Tracks

상세 이력은 `docs/COMPLETED_SUMMARY.md`, `docs/archive/progress-2026-05.md`, `docs/plans/`를 본다.

- M0-M10 로컬 런타임 vertical slice.
- Phase 11 Streamlit demo polish.
- Phase 12 narrative memory/novelty depth.
- Phase 13 Redis async visual jobs + mflux performance.
- Phase 14 DX: ruff, mypy, quality commands.
- Phase 15-19 playable single-player track.
- Phase 21-26 RPG stats, autonomy, novel-grade narrative.
- Causality/scenario v2 track.
- Roguelike/CRPG tactical combat base.
- 전투 스킬/아이템 실행, 주요 전투 UI 버그 수정, 단일 iframe 전투 UI 재구성, 동료/파티 참전, 도주 후 contact 유지.
- Story Bible MVP와 샘플 신규 시나리오 `세계 : 접속 - 유리성의 사서`.
- Neo-Seoul 01 long-form depth pass: 1시간 세션 구조, 6막 arc, 장면 밀도 원칙, 관계/단서/클라이맥스 Story Bible 확장.
- Run History MVP: `RunSummary` DTO, `WorldMemory(kind="run_summary")` 저장, archive/permadeath 저장 경로, Player View/Developer Memory 기록 보관소 조회.
- Meta Progression MVP: run summary 기반 trait/ally/starting item/codex unlock 평가, `PlayerMemory(kind="meta_progression")` 저장, 새 루프 초기 state와 starting inventory 반영.
- Save/Load UX MVP: active loop 기반 `SaveSlot` DTO, `PlayerMemory(kind="save_slot")` autosave metadata, Player View LOAD slot 선택, 명시적 `SAVE` 버튼, ended loop load 차단.
- Ending Resolver 초도 통합: `EndingResolver` 조건 평가, archive/permadeath `ending_id`/`ending_label` 저장, run summary 반영.
- Developer 인과율 모니터: active flags, metric score, ending condition matching 상태 노출.
- Player View hotfixes: START no-player auto-create, `"null"` combat request guard, opening cinematic iframe renderer.

## Open Risks

- `narrative_shards`는 limit query로 소비량만 제한하고 별도 장기 압축은 아직 없다.
- Ollama output은 repair/fallback path를 탈 수 있으므로 provider 품질 메트릭 추적이 계속 필요하다.
- IP-Adapter는 아직 실배선 전이라 캐릭터 얼굴-ID 고정은 img2img 레퍼런스 기반이다.
- 동료 AI는 현재 기본 NPC 공격 로직을 사용한다. 동료 스킬 자동 사용/전술 성향 고도화는 아직 없다.
- 추가 전투 밸런스는 실제 플레이 로그 기반으로 재조정할 수 있다.
- Story Bible은 전체 문서를 프롬프트에 넣으면 토큰 낭비가 크므로, phase/location/flags 기반 snippet 선택 레이어가 필요하다.
- RunSummary는 현재 `WorldMemory(kind="run_summary")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- MetaProgression은 현재 `PlayerMemory(kind="meta_progression")`, SaveSlot은 `PlayerMemory(kind="save_slot")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- EndingResolver 조건식은 현재 제한된 namespace의 expression 평가 경로다. operator whitelist/AST 기반 evaluator로 안전성을 높이는 보강이 필요하다.

## Source Of Truth

- 에이전트 진입점: `docs/AGENT_BRIEF.md`
- 다음 계획: `docs/NEXT_PLAN.md`
- 최신 로그: `docs/PROGRESS_LOG.md`
- 상세 archive: `docs/archive/progress-2026-05.md`
- 결정 기록: `docs/DECISIONS.md`
- 제품화 계획: `docs/plans/2026-05-31-story-bible-save-load.md`
