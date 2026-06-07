# Agent Brief

최종 갱신: 2026-06-07

이 파일은 작업 시작용 압축 문맥이다. 상세는 링크된 문서를 필요한 순간에만 연다.

## Snapshot

Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다. AI GM(Ollama)이 장면을 진행하고, 전술 전투는 별도 deterministic combat engine이 판정한다.

현재 baseline:

- `RuntimeSessionService`가 CLI/Streamlit/FastAPI 공통 orchestration을 담당.
- React + TypeScript SPA와 FastAPI `/api/v1` REST/WS adapter 구현 완료.
- Streamlit demo도 유지되며 같은 runtime service를 호출.
- PostgreSQL/MinIO/Redis/OTel/Jaeger 로컬 인프라 구성.
- Neo-Seoul 01이 주력 시나리오, `glass-library`는 확장 샘플.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver 구현.
- 전술 전투, 동료 참전, 적 인텐트, 전투 VFX Phase 1, CombatCinema 전신 action pose, role/tags 스킬 애니메이션, 스킬 아이콘 액션바(Phase 4), Playwright E2E 구현. combat-art 적 4종.
- mflux/FLUX image worker, Redux 캐릭터 일관성, MinIO asset path 검증 완료.
- `session.py`는 narrative_rollup/loop_scoring/combat_session_helpers/constants로 책임 분리됨(공개 API 동일).

## Active Work

다음 우선순위는 `docs/NEXT_PLAN.md`가 권위다.

1. 전투 연출 개편: 전신 action pose·스킬 애니메이션 레지스트리·아이콘 액션바(Phase 4)까지 완료, 다음은 Phase 2 표시 위치/스케일/타이밍/가독성 polish(live QA).
2. 진행도 해금: Phase 1·2·3 완료(아키타입 게이트, base/learned 필터, Codex 통찰 투자 트리 + learn/rank-up API, 깨달음 배너, 시나리오 간 해금 게이팅). 다음 신규 트랙은 파티 조작.
3. 파티 조작 2단계: 완료(파티원 직접 조작, 비파티 동맹 AI 유지).
4. `glass-library` 확장: 진행도/프레젠테이션 패리티 + 데이터 주도 진행도 완료. 남은 것은 서사(arcs/endings/Story Bible) 깊이 + 전투 아트.

## Read Order

1. 현재 상태: `docs/STATUS.md`
2. 다음 작업: `docs/NEXT_PLAN.md`
3. 최신 로그: `docs/PROGRESS_LOG.md`
4. 구조 변경 전: `docs/DESIGN.md`
5. 게임 규칙 변경 전: `docs/GAMEPLAY.md`
6. 시나리오 변경 전: `docs/scenarios/*` 또는 `resources/<scenario>/story_bible/*`

## Commands

- 기본 검증: `make test`
- Python 품질: `make lint`, `make typecheck`
- React 품질: `make frontend-lint`, `make frontend-build`
- Browser E2E: `make test-e2e`
- Runtime smoke: `make smoke-local`
- Persistence/MinIO: `make smoke`, `make test-db`
- Full local dev: `make dev-up` / `make dev-down`

## Guardrails

- Runtime orchestration은 UI/API에 복제하지 말고 `RuntimeSessionService`에 둔다.
- 순수 unit test는 Docker 없이 유지한다. DB tests는 `MYTHOS_RUN_DB_TESTS=1` 경유.
- Generated outputs, `.env`, tokens, `.docker/` data는 source artifact로 취급하지 않는다.
- Current docs는 짧게 유지하고, 상세 기록은 `bin/docs/archive/` 또는 dated plan으로 이동한다.
