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
- 전술 전투(전신 action pose·role/tags 스킬 애니메이션·아이콘 액션바·파티 직접 조작·combat-art 적 4종), Tactical Board 범례/타일 인스펙터/학습 목표 배너, Playwright E2E 구현.
- 작전 지도 route-node화(결정적 DAG + 다중 관점 anchor `route_map.py`/`route_runtime.py`) + 세션 메모리(`session_memory.py` beat 원장+롤링 시놉시스, RAG 아님).
- 진행도 해금(아키타입 게이트·통찰 투자 트리·깨달음 배너·시나리오 간 해금, 데이터 주도 grant).
- mflux/FLUX image worker, Redux 캐릭터 일관성, MinIO asset path 검증 완료.
- `session.py`는 narrative_rollup/loop_scoring/combat_session_helpers/constants로 책임 분리됨(공개 API 동일).

## Active Work

다음 우선순위는 `docs/NEXT_PLAN.md`가 권위다.

1. **Neo-Seoul 플레이 만족도 개선(최우선)**: `neo-seoul`을 30-60분 만족 플레이 주력 시나리오로 만든다. Phase 1-3, route-node화, Tactical Board(범례/인스펙터/학습 목표 배너), 조우 난이도 튜닝까지 완료. 남은 것은 live LLM 장기 세션 QA, loot/인벤토리·objective·선택 결과·Codex UX 정리, 보드 확대/반응형. 권위 계획 `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`.
2. 완료 트랙(후속은 Neo-Seoul 트랙에서 다룸): 전투 연출 개편, 진행도 해금, 파티 직접 조작, 데이터 주도 grant, route-node — `docs/COMPLETED_SUMMARY.md` M35-M39.
3. `glass-library` 확장: hold(패리티 + Story Bible 17 entries 완료, 추가 확장은 Neo-Seoul 완성 이후).

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
