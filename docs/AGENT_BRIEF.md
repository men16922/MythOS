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
- 전술 전투, 동료 참전, 적 인텐트, 전투 VFX Phase 1, CombatCinema 전신 action pose, Playwright E2E 구현.
- mflux/FLUX image worker, Redux 캐릭터 일관성, MinIO asset path 검증 완료.

## Active Work

다음 우선순위는 `docs/NEXT_PLAN.md`가 권위다.

1. 전투 연출 개편: party 3인 + humanoid enemy 전신 action pose 적용 완료, 다음은 표시 위치/스케일/타이밍 polish.
2. 진행도 해금: Ghost-only 시작, 아키타입 게이트, base/learned 스킬 필터, Codex Skill 탭.
3. 파티 조작 2단계: 파티원은 플레이어 직접 조작, 비파티 동맹은 AI 유지.
4. `glass-library` Story Bible/시나리오 확장.

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
