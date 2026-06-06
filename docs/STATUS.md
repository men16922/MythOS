# Project MythOS Status

최종 갱신: 2026-06-06

## Current State

Project MythOS 로컬 플레이어블 MVP 및 주요 명작 레퍼런스 기반 게임플레이 깊이 우선순위 백로그(P1~P4) 구현이 완료되었다. Streamlit 플레이어/개발자 뷰, Neo-Seoul 시나리오, Codex/단서 해금, 인과율/다중 엔딩 구조, mflux 기반 비동기 이미지 생성, BGM/SFX, 전술 전투 루프, 단일 iframe 전투 UI, 동료 참전(정세린/카이 고유 전술 AI 및 실드 버그 수정 완료), 도주 후 contact 유지, Run History MVP(루프 내러티브 잔향 연동), Meta Progression MVP, Save/Load UX MVP, 자원 제약형 선택지, 적 인텐트 가시화, 스탯 기반 내면 독백(Disco Elysium), Ending Resolver, Developer 인과율 모니터가 동작한다. 또한, Vite + React + TS SPA 클라이언트의 전체적인 동작성을 브라우저 상에서 자동으로 점검해주는 Playwright 기반 E2E 테스트 자동화 파이프라인(`make test-e2e`)이 신규 도입되어 검증 프로세스를 보강했다. 주력 콘텐츠는 Neo-Seoul 01이며, 1회 1시간/40-60턴 소설형 세션을 목표로 6막 구조와 Story Bible depth를 보강했다.

핵심 런타임:

- `RuntimeSessionService`: CLI/Streamlit 공통 orchestration.
- PostgreSQL: player, loop, scene, memory, asset metadata.
- MinIO: 생성 이미지 기본 저장소.
- Redis: visual job queue/worker heartbeat.
- Ollama: AI GM narrative generation.
- mflux/FLUX: Apple Silicon 이미지 생성 백엔드.

## Latest Verified Baseline

- `make test` (202 tests, 2 skipped) — 세션 2 배치 및 worker lock cleanup 테스트 반영. `make lint`, `make typecheck` 클린, React 빌드 클린.
- `make test-e2e` — fallback/no-image URL 모드(`?fallback=1&image=0`)로 부트 오프닝→세션 인트로→턴 0 선택지→턴 1 전환 통과. 실패 시 non-zero exit 및 `outputs/e2e_failure.png` 진단 캡처 경로 보강.
- Redux 실 파이프라인 라이브 검증 — worker queue로 세린 캐릭터 장면 512×512/4-step Redux job 처리 성공. DB asset metadata `use_redux=true`, reference `resources/neo-seoul/characters/se-rin.png`, MinIO presigned PNG GET 200, `outputs/visual-work` 작업본 삭제 확인. Cold Redux latency 17.3s(provider 17.1s).
- Visual worker 종료 안정화 — heartbeat lock owner token 유지, SIGTERM/KeyboardInterrupt 시 lock release, Postgres pool 명시 close 적용. 빈 queue worker SIGTERM 검증에서 heartbeat 1→0 및 프로세스 잔류 없음 확인.
- 세션 2 결정적/라이브 검증: 이어하기 활성 루프 선택, CHARACTER 포트레이트 분기(정세린), 전투 드래그&드롭(이동 액션 발생), 패배→메인 복귀, 장면별 행동 기록, 서사 기록 오버레이(N), 부트 오프닝→온보딩 전환, 512 이미지 워밍 ~7.5s, 오프닝 첫 장면이 비 오는 C-17/세린으로 연속, mflux Redux 0.9 얼굴 일관성 비교(`outputs/redux_compare_big.png`).
- Dev 탭 로컬 인프라 콘솔 링크(Adminer/MinIO/Redis/Jaeger) 렌더 확인(`outputs/dev_infra_links.png`). `make dev-up`/`dev-down` 원클릭 스택 파싱 검증.
- 2026-06-06 수동 QA 진행: `make dev-up` 경로에서 기본 접속/부트 오프닝/온보딩/새 게임, 이어하기 복원, 장면 전환, 장면별 `내 행동`, `📜 서사 기록 전체 보기` 오버레이, 텍스트 스트리밍 속도, 이미지 생성 체감 속도 확인. Dev 탭은 로컬 인프라 콘솔 세로 배치 확인 후 개발자 콘솔을 동일 폭 2열 카드 레이아웃으로 개선했으며 재확인 필요.
- (이전) `make test` (196 tests, 2 skipped)

## 로컬 실행 (Local Run)

풀 플레이엔 4개 서비스가 필요하다: **docker 인프라 + API + visual worker + Ollama**(Ollama는 호스트, `ollama serve`).

- 원클릭: **`make dev-up`** — docker infra → postgres 대기 → db-migrate → visual-worker(bg) → Ollama 확인 → API(foreground). Ctrl+C로 API만 종료. 전체 정리: **`make dev-down`**.
- 개별: `make infra-up` + `make api` + `make visual-worker-bg` (+ `ollama serve`).
- API 미기동 시 브라우저 `이어하기`가 `Failed to fetch`로 실패한다(온보딩은 캐시로 보일 수 있음). 인프라 콘솔 URL은 React Dev 탭에서 확인.
- `make test-e2e` (Playwright 자동 E2E 테스트) 성공 검증 (outputs/e2e_react_play.png 및 outputs/e2e_react_play_turn1.png 스크린샷 캡처 확인)
- 전투 종료 LLM 멈춤 수정: 전투 패배(루프 종료)가 fallback/fast 모드에서 8.3s→22ms (`summarize_loop` use_llm 게이트). 라이브 재측정 확인.
- PoC S1 온보딩/세션: `GET /api/v1/scenarios` + 온보딩 화면(시나리오/아키타입 선택)·이어하기(`loops/active`)·엔딩 배너. 라이브 flow 확인.
- `mythos_api` FastAPI `/api/v1` 어댑터: `tests/test_api.py`(21) — health/connect/begin/active/choose/combat REST + WebSocket `loops/stream`(begin→token→snapshot, 동일 소켓 choose, 오류 프레임) + `assets/resolve`(presigned URL) + 정적 PoC 클라이언트(`/`, `/app.js`, API 비가림) + visual_status 프레임 로직(`_terminal_visual_frame`/`_find_asset`)을 in-memory store TestClient로 검증(DB/Ollama/FLUX 불요). `MinIOStorageAdapter.presigned_url`은 boto3 mock 단위 테스트로 검증.
- API 라이브 부팅: `python -m mythos_api` → `/`·`/app.js`·`/api/v1/health` 200, `auth/connect`이 실제 Postgres에 플레이어 기록 확인.
- **이미지 경로 라이브 E2E 검증(2026-06-03)**: 실가동 인프라(Postgres/MinIO/Redis + 실행 중 visual worker + Ollama)에서 API begin(async image)→Redis 큐→worker→FLUX 생성→MinIO 저장(`s3://mythos-assets/...`)→DB asset `succeeded`까지 동작 확인. `/assets/resolve` presigned URL을 HTTP GET 시 200·image/png·유효 PNG(1.1MB) 반환. 단, 실 FLUX 생성이 WS 기존 30s 폴링 창을 초과해 `_VISUAL_POLL_TRIES`를 90s로 상향(느린 생성에서도 succeeded 프레임 전달).
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

Vite + React + TS SPA 기반의 독자적인 프론트엔드 포팅 및 Playwright 기반의 E2E 통합 테스트 검증 자동화가 완료되었습니다. 공유 계층 게임플레이 깊이 트랙(P1~P4 및 탐험 시공간 HUD/조우)과 Streamlit 패리티 구현이 100% 반영되어 최종 검증을 통과했습니다.

2026-06-06 기준으로 장기 세션 안정성 보강과 소스 품질 점검도 완료되었습니다.

- **완료된 최신 작업**:
  1. **서사 메모리 장기 압축 레이어 구현 (Narrative Shards Memory Rollup)**: 오래된 `narrative_shards`를 `PlayerMemory(kind="causality_summary")`로 압축하고, 최신 raw shard만 `NarrativeContext`에 남기도록 구성.
  2. **AI GM 서사 품질 모니터링 영속화 (Narrative Outcome Metrics)**: `success/provider_repair/local_repair/fallback` outcome을 `WorldMemory(kind="narrative_metrics")`에 누적 저장하고 React Developer 탭 Outcome Ratio 카드로 노출.
  3. **소스 품질 리팩토링**: shard rollup retention 경계값(`retention=0`) 처리와 narrative metric outcome ratio shape를 안정화하고 회귀 테스트를 추가.
  4. **React SPA 클라이언트 디자인 개선 및 빌드 복구**: `StoryPanel.tsx` 타입 임포트 문제를 수정하여 Vite 빌드를 복구하고, 이미지/텍스트 영역을 물리적인 터미널 윈도우 스타일 패널로 시각적 분리 및 세로 정렬(높이 맞춤)을 고도화했습니다.
  5. **대화 내역 비동기 스트리밍 & 이미지 유지**: 이전 대화 텍스트들이 자연스럽게 누적되어 올라가는 스크롤 구조를 구현하고, 선택 시 이미지를 비워버리지 않고 새 이미지가 완전히 생성/수급될 때까지 이전 이미지를 그대로 유지하게 하여 비동기 이미지 교체 딜레이 체감을 없앴습니다.
  6. **씬 히스토리 데이터베이스 조회 엔드포인트 신설**: FastAPI에 `/api/v1/loops/{loop_id}/scenes` GET 엔드포인트를 추가하고, 프론트엔드 이어하기 진입 시 이전 대화의 텍스트 히스토리를 데이터베이스로부터 조회해 스크롤 대화창에 완벽히 복원해내도록 처리했습니다.
  7. **전술 전투 UI 대폭 개선**: PARTY/ENEMY 로스터 영역을 수직으로 깔끔하게 배치하여 로스터 정보의 가독성을 확보함과 동시에, TACTICAL BOARD 영역을 `1.8fr 1fr` 그리드로 확대하여 시각적 스케일 및 조작 편의성을 대폭 보강했습니다.
  8. **테스트 커버리지 보강**: 가짜 스토어들에 `list_scenes` 목킹 구현을 완료하여 `make test` 검증 baseline을 199개 전체 성공 상태로 복구 및 유지했습니다.

2026-06-06 (세션 2)에 UX·비주얼·전투 배치를 일괄 구현했고, 후속 E2E/Redux worker/Dev stack/QA UI 수정까지 기능 단위 커밋 정리를 완료했다(상세: `docs/PROGRESS_LOG.md`). 요약:

- 이어하기 409 수정, 스토리/캐릭터 레이아웃 개편 + CHARACTER 컨텍스트 분기(내 정보↔대화상대 portrait), 전투 드래그&드롭, 오프닝 시네마틱→첫 장면 연속성, 이미지 512/타자기 속도 최적화, 전투 패배→메인 화면 버튼, 장면별 행동 기록, 서사 기록 별도 오버레이, 오프닝 이미지 컷 복사→재생성, 첫 진입 부트 오프닝, **mflux Redux 기반 캐릭터 얼굴 일관성**, visual-work 로컬 작업본 자동 정리.

- **다음 수행/검증 필요** (상세: `docs/NEXT_PLAN.md` "다음 수행/검증 필요"):
  1. ~~라이브 인프라(`make infra-up` + visual worker)로 **Redux 얼굴 일관성 실 파이프라인** 검증~~ 완료: 캐릭터 장면 Redux 생성→MinIO 저장→presigned PNG 확인.
  2. 워커 **종료 안정성**은 보강 완료: heartbeat owner token 유지, 종료 시 lock release, Postgres pool 명시 close, SIGTERM 검증 완료. 다만 txt2img(Flux1) + Redux(Flux1Redux) 동시 로드 시 스왑/멈춤 재발 여부(이전 멈춤 이력)는 장기 플레이 모니터 필요.
  3. ~~**visual-work 자동 삭제** 실 워커 경로 동작 확인, **512 이미지 속도** 라이브 재확인~~ 완료: 작업본 삭제 및 Redux cold 17.3s 확인.
  4. ~~**`make test-e2e` 재실행**~~ 완료: 부트 인트로/세션 시네마틱 dismiss 및 fallback/no-image E2E 모드로 통과 확인.
  5. `docs/play-checklist.md` 수동 QA 진행 중: 기본 접속/이어하기/기록 오버레이/행동 기록/텍스트 속도/이미지 속도는 확인 완료. Dev 탭 균형 레이아웃, 전투 드래그&드롭, 패배→메인, CHARACTER 포트레이트 분기, 오프닝 연속성은 추가 확인 필요.
  6. 파티 조작 2단계 구현(`docs/plans/2026-06-06-party-controllable-allies.md`, 설계 승인 시).
  7. 다중 시나리오(`glass-library`) 스크립트 및 Story Bible 확장.

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

- `narrative_shards`는 오래된 raw shard를 원문 프롬프트에서 제외하고 `causality_summary` 메모리로 압축한다. DB row 자체는 보존하므로, 조회/삭제 정책이 필요해지면 별도 status/migration을 추가한다.
- Ollama output은 repair/fallback path를 탈 수 있다. provider 품질 메트릭(outcome + total/degraded/success_ratio)은 `mythos.narrative.outcome` OTel 스팬과 구조화 로그로 방출되고, `WorldMemory(kind="narrative_metrics")`에도 누적 저장되어 Developer 뷰에서 볼 수 있다.
- 캐릭터 얼굴 일관성은 mflux **Redux**(strength 0.9, portrait 레퍼런스)로 steering한다. img2img보다 낫지만 IP-Adapter만큼 얼굴을 핀포인트로 고정하진 않는다(FLUX-schnell 4스텝 한계). diffusers IP-Adapter 경로는 fallback 메타데이터로만 남아 있다.
- 워커가 한 세션에서 txt2img(Flux1)와 Redux(Flux1Redux) 두 모델을 동시에 적재할 수 있다(각 ~7GB q4). Redux 단독 worker job과 종료 cleanup은 성공했지만, 동시 적재 메모리 압박/멈춤 여부는 장기 플레이 모니터 필요.
- visual-work 로컬 작업본은 저장 성공 후 자동 삭제된다. Redux worker→MinIO 실경로에서 작업본 및 빈 loop dir 삭제 확인 완료.
- 추가 전투 밸런스는 실제 플레이 로그 기반으로 재조정할 수 있다.
- Story Bible은 전체 문서를 프롬프트에 넣으면 토큰 낭비가 크므로, phase/location/flags 기반 snippet 선택 레이어가 필요하다.
- RunSummary는 현재 `WorldMemory(kind="run_summary")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- MetaProgression은 현재 `PlayerMemory(kind="meta_progression")`, SaveSlot은 `PlayerMemory(kind="save_slot")` JSONB로 저장한다. 조회/필터가 늘어나면 별도 테이블 migration이 필요하다.
- EndingResolver 조건식은 `ASTConditionEvaluator` 기반 제한 evaluator로 전환되어 `eval` 경로는 제거됐다. 새 시나리오 조건식을 추가할 때는 지원 연산자/타입 매핑 테스트를 함께 추가해야 한다.

## Source Of Truth

- 에이전트 진입점: `docs/AGENT_BRIEF.md`
- 다음 계획: `docs/NEXT_PLAN.md`
- 최신 로그: `docs/PROGRESS_LOG.md`
- 플레이 검증 체크리스트: [docs/play-checklist.md](file:///Users/men1692/Desktop/local/MythOS/docs/play-checklist.md)
- 상세 archive: `docs/archive/progress-2026-05.md`
- 결정 기록: `docs/DECISIONS.md`
- 제품화 계획: `docs/plans/2026-05-31-story-bible-save-load.md`
- HTTP API 사용/엔드포인트: `docs/API.md` (`make api`)
- Streamlit vs API 버전 비교: `docs/STREAMLIT_VS_API.md`
