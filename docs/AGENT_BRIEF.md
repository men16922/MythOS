# Agent Brief

최종 갱신: 2026-05-31

이 파일은 AI 에이전트가 작업 시작 시 가장 먼저 읽는 압축 문맥이다. 상세 설계가 필요할 때만 링크된 문서를 연다.

## Snapshot

- Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다.
- UI는 Streamlit, 핵심 오케스트레이션은 `RuntimeSessionService`가 담당한다.
- 상태 저장은 PostgreSQL, 이미지/미디어는 MinIO, visual job은 Redis worker, LLM은 Ollama, 이미지 백엔드는 mflux/FLUX다.
- 로컬 MVP, 플레이어 뷰, Neo-Seoul 시나리오, Codex, 인과율/엔딩 구조, mflux 이미지 성능 개선, 전술 전투, 단일 iframe 전투 UI, 동료 참전, 도주 후 contact 유지 정책은 구현됨.

## Current Focus

- 완료: 전투 스킬/아이템 실행, 전투 이동/blank 버그 수정, 전투화면 단일 iframe 재구성, 동료/파티 참전, 도주 후 contact alerted 유지, focus/skill 밸런스 정리.
- 전투 UI는 `src/mythos_runtime/combat_server.py`의 localhost JSON bridge와 `streamlit_app.py`의 `_build_combat_app_html`이 담당한다. 전투 중 per-action Streamlit rerun은 제거했고, 종료 시에만 Streamlit으로 돌아온다.
- 동료 참전은 `_party.members` 또는 scenario ally `unlock_flags`가 `loop.state["flags"]`와 맞을 때 `CombatService.begin`에서 ally combatant로 투입된다.
- 다음 우선순위: Story Bible / Run History / Save Load 제품화 트랙. 권위 계획은 `docs/plans/2026-05-31-story-bible-save-load.md`.
- Story Bible MVP는 `src/mythos_runtime/story_bible.py`와 `resources/neo-seoul/story_bible/bible.json`로 시작했다. `scenario_context`가 phase/location/flags에 맞는 snippet만 `NarrativeContext.novelty_notes`에 주입한다.
- 남은 이 트랙 작업은 샘플 게임북 `세계 : 접속 - 유리성의 사서`, 엔딩별 RunSummary 저장/조회, 메타 해금, active loop/save slot UX다.
- 그다음: IP-Adapter, 인과율/NPC 가시화, 클라우드/Web UI.

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
