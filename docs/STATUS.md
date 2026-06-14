# Project MythOS Status

최종 갱신: 2026-06-14

## Current Baseline

Project MythOS는 로컬 플레이어블 MVP를 넘어 React SPA + FastAPI API + Streamlit demo가 공존하는 상태다. 핵심 runtime은 `RuntimeSessionService` 하나로 공유된다.

구현 완료된 주요 축:

- Neo-Seoul 01 long-form scenario, Story Bible snippet injection, Codex.
- PostgreSQL persistence, MinIO assets, Redis visual queue/worker, OTel/Jaeger.
- Ollama narrative generation with repair/fallback and persisted outcome metrics. 서사 경로는 **이원화(dual-model)**: 스토리텔러(`OLLAMA_MODEL_STORY`=`gemma4:latest` 8B, 자유 텍스트)→파서(`OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct`, JSON 구조화)로 분리(`director.py`/`prompts.py`). 미커밋 배치(2026-06-14 PROGRESS_LOG 참조).
- mflux/FLUX image generation, Redux character identity steering, async worker cleanup.
- Tactical combat engine, encounters, allies, skills/items, enemy intents, combat VFX Phase 1, CombatCinema full-body action pose swap.
- Run History, Meta Progression MVP, Save/Load UX, Ending Resolver, objective/choice-result feedback strip.
- FastAPI `/api/v1` REST/WS adapter and Vite React TypeScript SPA.
- Playwright E2E regression gate with updated timeline synchronizations.
- Combat presentation overhaul: basic action signal cards, self-targeting 2-poster layouts, and standalone utility skill cinematic zoom triggers.
- `combatAnim.ts` role/tags skill animation registry wired into `combatEffects.ts`; per-skill icon cut-ins (`skills/<skill_id>.png`) in `CombatCinema`. Motion variety(동료 부여 펄스/실드, melee burst 충격파) + `prefers-reduced-motion` 접근성(전역 CSS + JS 게이팅).
- Phase 4 `CombatControls` 스킬 아이콘 액션바: data-driven 아이콘 타일 + cost/range 배지 + cooldown 오버레이 + FOCUS 게이팅 + tooltip.
- Drone enemies(`maintenance-drone`, `sentinel-drone`) promoted with full combat action sheets — 4 combat-art enemies total.
- Neo-Seoul P0 playability fixes: combat `encounter_reward.insight` is now persisted as meta progression, combat rewards are visible in the result panel, and early ambient forced combat is disabled unless pressure is high.
- 작전 지도 route-node(Step 1~2b-4): 결정적 절차 생성 layered DAG(`route_map.py`, anchor 사전저작 비트+다중 관점+동적 pool) + 라이브 진행/관점·엔딩 누계(`route_runtime.py`) + director 주입/edge=선택지 분기/combat 노드 전투 트리거(`session.py`/`scenario_context.py`) + 노드 그래프 뷰 + anchor 큐레이트 이미지(`scenes/<beat>.png`). 세션 메모리(`session_memory.py`, `_beats`+롤링 시놉시스+직전 장면 창, RAG 아님)로 연속성/반복 방지. 상세 설계 `bin/docs/plans/2026-06-07-route-node-procedural-map.md`. 남은(2b): 게이지 effect 통합+회복 루프, 동적 노드 title 다양화, `_map` 제거.

Repo hygiene (2026-06-07):

- 정크 제거(`.playwright-mcp`/`.antigravitycli`/`report.md`), historical 문서/완료 plan은 `bin/`으로 이관(활성 plan만 `docs/plans/`).
- `session.py` 1878→1349줄: `narrative_rollup.py`/`loop_scoring.py`/`combat_session_helpers.py`/`constants.py`로 책임 분리(공개 API·import 경로 호환 유지). `scratch/`는 재사용 에셋 파이프라인이라 root 유지.
- 문서 정리: `ADULT_VISUAL_POLICY.md`→`IMAGE_POLICY.md`(이미지 파이프라인 실무 가이드), `bin/reference.md`→`docs/REFERENCES.md`(디자인 레퍼런스).

Progression Phase 2·3 & Hotfixes (2026-06-07):

- Phase 2: 통찰 포인트 적립(run+2/clue+1/win+1), `GET/POST /api/v1/players/{id}/skills` 트리/투자 API, Codex 습득/강화 버튼, tier(requires) 선행 게이팅. 전투 가용 스킬은 archetype base + learned만.
- Phase 3: 깨달음 알림 배너(최근 런 신규 해금 스킬, localStorage 1회 dismiss), 시나리오 간 해금 게이팅(`scenario.unlock`; Neo-Seoul 기본 해금, glass-library는 튜토리얼 완료 시).
- Hotfix: 미드런 Codex 조회/학습 시 active 루프의 실시간 epiphany 목록을 unlocked_skills에 병합 처리하여 LOCKED가 즉각 실시간 해제되도록 수정.

Scenario Expansion / 데이터 주도 진행도 (2026-06-07):

- 진행도 grant를 scenario.json 데이터 주도로 전환(`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`). 깨달음은 해금만(자동 습득 제거)→통찰 습득과 일관. 시나리오 교차 오염 + `load_scenario` lru_cache 오염 버그 수정. glass-library를 progression/presentation 패리티(base_skills/archetype_base_skills/epiphanies/ui_copy)로 보강.
- Hotfix: 로컬/라이브 테스트의 개발 편의성을 위해 테스트 환경(unittest 등)이 아닌 일반 실행 상태인 경우 `scenario_unlock_met`을 바이패스하여 튜토리얼 완주 없이도 `glass-library`가 해금되도록 조치.
- Story Bible 보강: `glass-library` snippets 10→17개. phase/location/flags 기준으로 무음 열람실, 반납되지 않은 복도, 금서 색인, 이오 신뢰 분기, 검열 전투, 최초 기록 보관고, 엔딩 잔향을 추가.

Controllable Party Allies (2026-06-07):

- 전투 턴 루프를 controllable-actor stop으로 일반화. `_party.members` 소속 동료는 플레이어가 직접 조작(턴에서 정지, active actor 기준 행동), flag 해금 비파티 동맹은 AI 유지. 패배 판정 = 조작 가능 유닛 전멸. UI는 현재 차례(플레이어/동료) 표시.

데이터모델 통합 + 플레이 피드백 UX (2026-06-09):

- M40 progression/inventory/equipment를 JSONB-on-row → 전용 테이블(migration 005). `player_progression`(append-scan 제거), `loop_inventory`(PostgresStore 경계 dehydrate/hydrate, CombatService 무변경), 장비 착용 시스템(scenario `kind:equipment`+stats, `equip_item`, 전투 보너스, 착용 UI). 기존 36행 백필. 상세 `bin/docs/plans/2026-06-09-progression-inventory-equipment-datamodel.md`.
- 플레이 피드백 UX Phase A/B 완료: 상태 게이지 숫자화+설명토글, 결말 경향 설명, 보드 범례 버튼+팝업, drag 안내 제거, 전리품 인벤토리 표시 버그 수정, 결말/현재시점을 기억의 별자리로 이동, SPA 번들 no-cache, 전투 중 소모품 사용 버튼, 보드 확대/zoom, 작전 지도 확대, 행동→이동 명확화, 기억의 별자리 스탯/장비/인벤토리 통합.
- Live QA 발견 UX 후속 4건 처리: 작전 지도 compact/detail 레이아웃 분리+범례 grid, 인벤토리 종류별 분류+아이콘, table-form `item_id` 장비 버튼 표시 보강, 소모품 0개 빈 상태.

Live LLM QA & 반복 완화 (2026-06-08):

- P0 live LLM 장기 세션 기술 QA: in-process 드라이버(인메모리 스토어 + 실제 Ollama director, Docker 불필요)로 gemma4 14턴 검증. 기술 파이프라인 양호(파싱 예외 0·선택지 상존·전투 후 `choose(action=...)` 재개·멈춤 없음·패배 시 루프 종료 정상).
- F1 반복 완화: `build_session_synopsis` 반복 억제 지침 강화(도입부 배경 재묘사 금지 + 최근 비트 location 동일 시 추가 지침). 14턴 재검증서 반복 탐지 0·이야기 전진 확인. 회귀 테스트 2건. 잔여: F2 전투 빈도 튜닝, phase explore 정체 점검.
- 문서 정리: 완료된 dated plan 6종을 `bin/docs/plans/`로 이관(neo-seoul playability/live-feedback만 활성 유지), 참조 경로 갱신.

Recent verified baseline recorded in docs:

- **`make check` green**: ruff + eslint + `mypy src tests` **0 errors/110 files** + tsc/vite-build + 308 unittests(skipped 2). 이번 세션 mypy 부채 0화 → overnight 게이트를 `make check`로 승격(COMPLETED_SUMMARY M42). CI도 실재(`.github/workflows/ci.yml`). 루트 도달성 invariant(`test_route_integrity.py`) 박제(2026-06-14, QA seed #1).
- **overnight 무인 루프 하네스**(`bin/overnight/`, `make overnight*`): `--once` 실검증 완료 — 헤드리스 체인·잔여물 복구 실증, REPO_ROOT 버그 자동 `[recovered]` 복구. 콘텐츠/밸런스 QA `[auto]` seed 7종 대기(가동 시 invariant 박제 또는 Blocker surface).
- 오프닝 시퀀스 정합(2026-06-14): scene1=홀로 각성(이미지 정합)·4비트 온보딩(인트로 3컷을 인게임 비트로)·장면별 `image_sequence`·인트로 화면 간결화. live Ollama로 turn0/1 정합 확인.
- frontend lint/build clean, `tests/playwright/test_e2e_play_checklist.py` green (refactored 서버 기동 포함).
- `make smoke-local` succeeded (fallback narrative & visual smoke green).
- Redux worker live path: Redis queue -> mflux Redux -> MinIO -> presigned PNG GET 200.
- Combat assets: party 6인 (태오, 한, 수아 추가됨) + 적 8종 (Enforcer Unit, Glitch Wraith, Maintenance Drone, Sentinel Drone, Shock Trooper, Tracker Spider, Suppression Mech, Purge Drone) `idle/attack/guard/skill/hit` 70종 `RGBA 512x768` 및 512x768, skill icon 11종.

## Active Focus

권위 계획: `docs/NEXT_PLAN.md`.

1. **Neo-Seoul playability upgrade**: 새 최우선 트랙. `neo-seoul`을 기술 데모가 아니라 30-60분 플레이 만족도가 있는 주력 시나리오로 끌어올린다. Phase 1 문서 확정 완료(Golden Path, 실패/우회 Path, QA rubric), Phase 2 데이터 보강 완료(Story Bible 17→24 entries, playability choice axes/route branches/ending echo targets), Phase 3 데이터 기준선 완료(encounter learning goals/reward intent, progression reward tuning). P0/P1 1차 묶음 완료: 전투 보상 통찰 반영, 전투 결과 보상 표시, 초반 forced ambient combat 완화, 조우 쿨다운/난이도 캡, 전투 패배 소프트 후속(`defeat_soft`), Codex rank pips/강화 완료 배너, Run History+Echo/Shard/Insight 대시보드, objective/stakes 상시 표시, 선택 가치축/결과 요약. Tactical Board는 범례+타일 인스펙터+학습 목표 배너+보드 줌/줌 버튼 보정+지형 배지(엄호/고지)+우측 조작부 하단 배치까지 완료. 조우 난이도 튜닝 완료(`build_encounter` per-spawn `overrides` + 학습 목표별 수치 재조정, 그리디 시뮬 승률 95~98%). live LLM 장기 세션 기술 QA 완료(파이프라인 양호) + F1 반복 완화 적용·재검증 완료. 다음 집중은 실제 풀스택 사람 플레이 QA(`docs/test/neo_seoul_live_qa.md`)에서 목표/선택 결과 체감, D 반복/F 속도 체감, 남은 route gate 바이어스 확인. 권위 설계는 `docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`.
2. **Combat presentation upgrade**: 완료. 모션 다양화·reduced-motion 접근성·표시 위치/스케일/타이밍/가독성 Live QA까지 완료(사용자 확인 완료). 범용 수동 QA 문서는 폐기했고, Neo-Seoul 실제 플레이 확인 항목은 `docs/test/neo_seoul_live_qa.md`를 따른다.
3. **Progression skills/archetypes**: 완료. Phase 1·2·3 완료(아키타입 게이트, base/learned 필터, Codex 통찰 투자 트리, 깨달음 배너, 시나리오 간 해금). 후속은 Neo-Seoul 플레이 만족도 트랙 안에서 밸런스 조정.
4. ~~**Controllable party allies**~~: 완료(파티원 직접 조작, 비파티 동맹 AI 유지).
5. **Scenario expansion / glass-library**: hold. glass-library 진행도/프레젠테이션 패리티와 Story Bible 17 entries까지 완료했지만, 추가 확장은 Neo-Seoul 완성도 개선 이후로 미룬다.

## Open Risks

- **로컬 main 미푸시(2026-06-14)**: 이번 세션 작업(오프닝 정합·overnight 하네스·mypy 0·QA seed 등)이 로컬 main에만 있음. private repo push는 안전 분류기 하드블록 → 사용자가 `gh repo create … --push` 직접 실행 필요(men16922 본인 계정).
- **LLM 스트리밍 first-token 지연(해결 2026-06-11, 스토리 8B 전환)**: "TTFT 11.1초/완료" 주장은 재현 안 됨. 실측 근본 원인은 **48GB RAM**(64GB 아님) 스왑 포화 — 26B(18GB)+FLUX 이미지가 안 들어가 26B가 evict/페이지인되며 TTFT 13→**43~127초** 폭발. **결정·적용**: 스토리 모델을 **`gemma4:26b`→`gemma4:latest`(8B, 9.6GB)** 로 전환(head-to-head서 한국어 산문 품질 경쟁력 확인, **warm TTFT 9~10초**, RAM 상주로 FLUX와 공존). 파서는 `qwen2.5:3b-instruct`(스트리밍 경로는 실제론 정규식 파서 사용). 64GB+ 머신에서만 26B 재권장. 상세 `docs/DECISIONS.md`/`PROGRESS_LOG.md` 2026-06-11, 재측정 `scratch/ttft_bench.py`.
- **이미지 vs 큐레이트 중복(해결 2026-06-11)**: 앵커는 프론트가 큐레이트 이미지(`route_map.image`=`scenes/*.png`)를 표시하는데 백엔드가 그 앵커에서도 FLUX를 돌려 표시 안 될 그림 생성 + 느린 턴을 유발했다. `maybe_generate_scene_image`에 `_curated_anchor_image()` 가드 추가 — 현재 노드가 `image` 보유 앵커면 FLUX 스킵(프론트가 큐레이트 이미지를 표시하므로 화면 변화 없이 느린 턴만 제거). 회귀 테스트 `tests/test_visual_orchestration.py` 6건.
- **작전 지도 horizon 미갱신(라이브 발견)**: 동적 라우팅 2막 horizon이 진행 중 갱신 안 되는 것으로 보고됨
  (구 정적 루프 잔존 or 버그) — 재현/수정 필요. 선택→route 노드 연결 체감(C)도 미해결.
- txt2img `Flux1` + Redux `Flux1Redux` 동시 적재는 장기 플레이에서 메모리/스왑 모니터가 필요하다.
- `narrative_shards` raw rows are retained even after rollup; future pruning/status migration may be needed if DB size matters.
- Run summaries, meta progression, save slots, narrative metrics are JSONB memory records; heavy querying may justify dedicated tables later.
- Some detailed plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, and `PROGRESS_LOG.md` for current truth.
- Combat image 품질은 캐릭터별 편차가 크다. 독립 pose 생성 대신 action sheet 기반 파이프라인을 우선 적용한다.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`
