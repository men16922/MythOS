# Agent Context Bridge

이 파일은 에이전트 간 작업 맥락을 넘기는 루트 하네스다. 세부 상태의 source of truth는 `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, `docs/NEXT_PLAN.md`이고, 이 파일은 다음 작업자가 즉시 방향을 잡기 위한 초압축 핸드오프로 유지한다.

## Active Context

- **프로젝트 상태**: Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다. Streamlit 데모, FastAPI-served React + TypeScript SPA, CLI가 공존하며 핵심 orchestration은 `RuntimeSessionService`가 담당한다.
- **주 플레이 경로**: 현재 권장 플레이 경로는 React SPA다. `make dev-up`이 docker infra, DB migration, background visual worker, FastAPI API를 준비하고 `http://localhost:8000`을 서빙한다. Ollama는 Mac host에서 별도로 `ollama serve`가 필요하다.
- **구현 완료 축**: Neo-Seoul 01, Story Bible snippet 주입, Run History, Meta Progression, Save/Load UX, Ending Resolver, Developer 인과율 모니터, 자원 제약 선택지, 적 인텐트, 스탯 기반 내면 독백, 전술 전투, 단일 iframe Streamlit 전투 UI, React SPA 패리티, Playwright E2E, narrative shard rollup, narrative metrics dashboard가 구현됐다.
- **비주얼 파이프라인**: 기본 이미지 백엔드는 mflux/FLUX. 캐릭터 장면은 mflux Redux portrait reference로 라우팅해 얼굴 일관성을 보강한다. Redis visual worker -> MinIO -> presigned PNG 경로가 실검증됐다.
- **최신 검증 기준**: `make test`는 226 tests, 2 skipped 기준 통과 기록이 있다. `make test-e2e`는 `?fallback=1&image=0` 결정적 React 경로로 부트 오프닝, 세션 인트로, 턴 0 선택지, 턴 1 전환을 검증한다. Neo-Seoul fallback 12선택 장기 진행은 초반 강제 ambient 전투 없이 통과했다.
- **문서 진입점**: 새 작업자는 전체 `docs/`를 통째로 읽지 말고 `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> `docs/NEXT_PLAN.md` 순서로 시작한다. 필요한 경우에만 `docs/DESIGN.md`, `docs/GAMEPLAY.md`, 시나리오, dated plan, archive를 연다.

## Current Handover

1. **Priority 1(Neo-Seoul 플레이 만족도)**: 새 최우선 트랙. Phase 1 문서 확정, Phase 2 데이터 보강, Phase 3 데이터 기준선 완료. P0 일부 구현 완료: `encounter_reward.insight`는 meta progression 통찰로 즉시 저장되고, 전투 결과 패널에 보상 변화가 표시되며, 초반 forced ambient combat은 high tension/low stability 전까지 억제된다. 다음은 live LLM 10장면 이후 장기 QA, 작전 지도 route-node 구현, Tactical Board legend/inspector다.
2. **QA 기준**: 범용 수동 QA 문서는 폐기. Neo-Seoul 실제 플레이 확인 항목은 `docs/neo_seoul_live_qa.md`, 설계 rubric은 `docs/scenarios/01-neo-seoul-connect.md` §5.5, 작업 체크리스트는 `docs/NEXT_PLAN.md`를 따른다.
3. **완료 축**: 전투 연출 live QA, 진행도 해금, 파티 조작, 데이터 주도 progression grant, React SPA 패리티, Playwright E2E는 완료 상태로 유지한다.
4. **glass-library**: 현재 hold. progression/presentation 패리티까지 완료됐지만, 추가 서사(arcs/endings/Story Bible) 깊이와 전투 아트/스킬 확장은 Neo-Seoul 만족도 개선 이후로 미룬다.
5. **장기 worker 안정성**: Redux 단독 job과 종료 cleanup은 검증됐지만, txt2img(Flux1) + Redux(Flux1Redux) 동시 적재 시 메모리/스왑 멈춤 재발 여부는 장기 플레이에서 관찰해야 한다.

## Open Risks

- Story Bible과 narrative shards는 전체 원문을 프롬프트에 넣지 않는다. phase/location/flags 기반 snippet 및 causality summary만 주입한다.
- `narrative_shards` 원본 row는 보존되며 오래된 raw shard만 prompt에서 제외된다. 삭제/조회 정책이 필요하면 별도 migration 또는 status를 세운다.
- Redux는 IP-Adapter 수준의 얼굴 고정은 아니다. FLUX-schnell 4 step 한계상 portrait reference steering으로 취급한다.
- `RunSummary`, `MetaProgression`, `SaveSlot`, `narrative_metrics`는 현재 JSONB memory row에 저장된다. 조회/필터 요구가 커지면 별도 table migration 후보가 된다.
