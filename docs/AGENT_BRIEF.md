# Agent Brief

최종 갱신: 2026-06-03

이 파일은 AI 에이전트가 작업 시작 시 가장 먼저 읽는 압축 문맥이다. 상세 설계가 필요할 때만 링크된 문서를 연다.

## Snapshot

- Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다.
- UI는 Streamlit, 핵심 오케스트레이션은 `RuntimeSessionService`가 담당한다.
- 상태 저장은 PostgreSQL, 이미지/미디어는 MinIO, visual job은 Redis worker, LLM은 Ollama, 이미지 백엔드는 mflux/FLUX다.
- 로컬 MVP, 플레이어 뷰, Neo-Seoul 시나리오, Codex, 인과율/엔딩 구조, mflux 이미지 성능 개선, 전술 전투, 단일 iframe 전투 UI, 동료 참전, 도주 후 contact 유지 정책, Run History, Meta Progression, Save/Load UX는 구현됨.

## Current Focus

- 완료: 전투 스킬/아이템 실행, 전투 이동/blank 버그 수정, 전투화면 단일 iframe 재구성, 동료/파티 참전, 도주 후 contact alerted 유지, focus/skill 밸런스 정리.
- 전투 UI는 `src/mythos_runtime/combat_server.py`의 localhost JSON bridge와 `streamlit_app.py`의 `_build_combat_app_html`이 담당한다. 전투 중 per-action Streamlit rerun은 제거했고, 종료 시에만 Streamlit으로 돌아온다.
- 동료 참전은 `_party.members` 또는 scenario ally `unlock_flags`가 `loop.state["flags"]`와 맞을 때 `CombatService.begin`에서 ally combatant로 투입된다.
- 다음 우선순위: IP-Adapter 캐릭터 비주얼 일관성(P2) 도입이다. 권위 계획은 `docs/plans/2026-05-31-story-bible-save-load.md`.
- Story Bible MVP는 `src/mythos_runtime/story_bible.py`와 `resources/neo-seoul/story_bible/bible.json`로 시작했다. `scenario_context`가 phase/location/flags에 맞는 snippet만 `NarrativeContext.novelty_notes`에 주입한다.
- 주력 콘텐츠는 Neo-Seoul 01이다. `resources/neo-seoul/scenario.json`과 `resources/neo-seoul/story_bible/bible.json`은 1회 1시간/40-60턴 소설형 세션을 목표로 6막 구조, pacing contract, 관계/단서/클라이맥스 snippet을 포함한다.
- 샘플 게임북 `세계 : 접속 - 유리성의 사서`는 멀티 시나리오 구조 검증용으로 `docs/scenarios/02-glass-library.md`, `resources/glass-library/scenario.json`, `resources/glass-library/story_bible/bible.json`에 있다.
- Run History MVP is 구현됨. archive/permadeath 시 `WorldMemory(kind="run_summary")`가 저장되고, `RuntimeSessionService.list_run_summaries()`와 Player View `기록 보관소`에서 조회한다.
- Meta Progression MVP is 구현됨. run summary 기반으로 trait/ally/starting item/codex unlock을 누적하고 `PlayerMemory(kind="meta_progression")`에 저장하며, 새 루프 시작 state/inventory에 반영한다.
- Save/Load UX MVP is 구현됨. active loop만 `SaveSlot`으로 LOAD 대상이 되고, autosave metadata는 `PlayerMemory(kind="save_slot")`에 저장된다. Player View에는 LOAD slot 선택과 명시적 `SAVE` 버튼이 있다. ended loop는 기록 보관소 대상이다.
- Ending Resolver 구현 완료: archive/permadeath 시 scenario ending condition을 동적으로 안전하게 평가하고 `RunSummary.ending_id`/`ending_label`에 저장한다.
- Developer 인과율 모니터 구현 완료: active flags, metric score, ending condition matching 상태를 실시간 노출한다.
- 최신 Player View hotfix: `새 게임 시작`은 선택 player가 없어도 player 생성 후 시작한다. `"null"` combat request sentinel은 무시한다. 오프닝 시네마틱은 raw HTML 노출 방지를 위해 iframe으로 렌더한다.
- P3 Web UI 디커플링 slice 1·2·3·4(B) 완료: `src/mythos_api/`가 `RuntimeSessionService`를 FastAPI `/api/v1` REST(`auth/connect`, `loops/begin|active|choose`, `combat/begin|action`, `health`) + WebSocket 토큰 스트리밍 + `visual_status` 이미지 프레임(`loops/stream`) + 자산 presigned URL 변환(`assets/resolve`)으로 노출하고, 경량 PoC 클라이언트(`static/{index.html,app.js}`)를 `/`에 서빙. WS begin/choose가 `with_image`/`visual_async`로 이미지 생성을 트리거하고 완성 시 presigned URL을 푸시한다(글 먼저, 그림은 나중에 채움). Streamlit 무변경 추가형, optional `web` extra, `python -m mythos_api`로 실행. 테스트는 `tests/test_api.py`(in-memory TestClient, 21 tests). 분산 visual worker는 `visual_worker.py`로 기존 구현됨.
- 이미지 경로는 라이브 E2E 검증됨(begin→worker→FLUX→MinIO→presigned→GET 200/PNG). PoC는 Streamlit과 별개의 레퍼런스 클라이언트다.
- 그다음(선택): (a) PoC UI/UX 개선 — Streamlit UX 언어(녹청 터미널·command-card·HUD·이미지 크기 통제) 참고, 빌드리스 유지. 방안 `docs/plans/2026-06-03-poc-ux-improvement.md`. (b) 옵션 A 풀 Next.js/Vite SPA + PixiJS Canvas. 프론트 결정 `docs/plans/2026-06-03-frontend-slice4.md`, 백엔드 설계 `docs/plans/2026-06-03-web-ui-decoupling.md`.

## Read Order

1. 현재 상태: `docs/STATUS.md`
2. 다음 작업: `docs/NEXT_PLAN.md`
3. 작업 로그: `docs/PROGRESS_LOG.md`
4. 구조 변경 전: `docs/DESIGN.md`
5. 게임 규칙 변경 전: `docs/GAMEPLAY.md`
6. 시나리오 변경 전: `docs/scenarios/01-neo-seoul-connect.md`
7. Story Bible/Save Load 변경 전: `docs/plans/2026-05-31-story-bible-save-load.md`
8. 과거 상세 로그: `docs/archive/`

## Commands

- 기본 검증: `make test`
- 타입/린트: `make lint`, `make typecheck`
- 런타임 흐름 변경: `make smoke-local`
- DB/MinIO persistence 변경: `make smoke`
- 데모 실행: `make streamlit`

## Guardrails

- 순수 unit test는 Docker 없이 유지한다. DB 테스트는 `MYTHOS_RUN_DB_TESTS=1` 경유.
- 런타임 orchestration은 CLI/Streamlit에 복제하지 말고 `RuntimeSessionService`에 둔다.
- generated outputs, `.env`, 토큰, `.docker/` 데이터는 소스 취급하지 않는다.
- 문서 갱신은 현재 문서에 요약, 상세 이력은 archive/plans로 분산한다.
