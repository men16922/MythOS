# Agent Brief

최종 갱신: 2026-06-16

이 파일은 작업 시작용 압축 문맥이다. 상세는 링크된 문서를 필요한 순간에만 연다.

> ▶ NEXT SESSION: **Priority 0 = 동료 호감도 + 컷씬 언락 + prompt-layer 분리** (권위 `docs/plans/2026-06-16-companion-affection-cutscenes.md`, NEXT_PLAN Priority 0). prompt-layer Phase 0-2 완료(`docs/PROMPT_LAYER.md`). **첫 행동 = P0 호감도 런타임**: `effect.relationship` 델타가 `route_runtime.py:96`서 무시되는 dead data — `loop.state.relationships[name]` 누적 배선부터. 그 뒤 Phase 3/노드-주소 지정 → P1 컷씬.

## Snapshot

Project MythOS는 Python 3.11+ 로컬 런타임 기반 1인용 SF 루프형 TRPG/CRPG다. AI GM(Ollama)이 장면을 진행하고, 전술 전투는 별도 deterministic combat engine이 판정한다.

현재 baseline:
- `RuntimeSessionService`가 CLI/Streamlit/FastAPI 공통 orchestration을 담당.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, Streamlit demo 모두 같은 runtime service 호출.
- PostgreSQL/MinIO/Redis/OTel/Jaeger 로컬 인프라 구성.
- Neo-Seoul 01이 주력 시나리오, `glass-library`는 확장 샘플.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver 구현.
- 전술 전투(전신 action pose·role/tags 스킬 애니메이션·아이콘 액션바·파티 직접 조작·신규 동료 3인 및 적 4종 전투 스프라이트 35종 추가 및 scenario.json 매핑 완료), Tactical Board 범례/타일 인스펙터/학습 목표 배너, Playwright E2E 구현.
- 작전 지도 route-node화(결정적 DAG + 다중 관점 anchor `route_map.py`/`route_runtime.py`) + 세션 메모리(`session_memory.py` beat 원장+롤링 시놉시스, RAG 아님).
- 진행도 해금(아키타입 게이트·통찰 투자 트리·rank pips/강화 배너·깨달음 배너·Run History+Echo/Shard 대시보드·시나리오 간 해금, 데이터 주도 grant).
- Objective/stakes 상시 표시와 선택 가치축/예상 결과/실제 결과 요약 UX.
- mflux/FLUX image worker, Redux 캐릭터 일관성, MinIO asset path 검증 완료.
- 서사는 이원화(dual-model): 스토리텔러 `OLLAMA_MODEL_STORY`=`gemma4:latest`(8B, 자유 텍스트) → 파서 `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct`(JSON 구조화). 스트리밍 경로는 정규식 파서 병행.
- 오프닝 시퀀스 정합(5컷: 각성→세린등장→다가오는손→첫접촉→추격+전투). prompt-layer 분리 진행(authored 지시문→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). 상세 상태는 `STATUS.md`.

## Active Work

다음 우선순위는 `docs/NEXT_PLAN.md`가 권위다.

1. **Neo-Seoul 플레이 만족도 개선(현재 최우선)**: `neo-seoul`을 30-60분 만족 플레이 주력 시나리오로 만든다. Phase 1-3, route-node화, Tactical Board, 조우 난이도 튜닝, 진행도 대시보드, objective/choice-result UX, live LLM 기술 QA + 반복 완화 + 8B 전환 완료. 잔여는 실제 풀스택 **사람 플레이 QA**(`docs/test/neo_seoul_live_qa.md`, 사용자 직접) — B/C 체감, D 반복, F 속도, route gate 바이어스. 권위 계획 `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`.
2. **엔지니어링 정비 트랙(WS0-3 완료)**: agent 운영 하네스를 `docs/engineering/` 바이블(범용)↔`mythos/` 해석(repo) 으로 정의 + 진입점 슬림화 + 구조화 로깅/tmux 대시보드 + Resume Pointer 연속성. `HARNESS_RESEARCH` 개념 흡수. WS4(콘텐츠 파이프라인)만 plan-only 잔존(`docs/plans/2026-06-14-engineering-plan.md`).
3. 완료 트랙(후속은 Neo-Seoul 트랙에서 다룸): 전투 연출 개편, 진행도 해금, 파티 직접 조작, 데이터 주도 grant, route-node — `docs/COMPLETED_SUMMARY.md` M35-M39.
4. `glass-library` 확장: hold(패리티 + Story Bible 17 entries 완료, 추가 확장은 Neo-Seoul 완성 이후).

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
