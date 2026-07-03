# Completed Summary

최종 갱신: 2026-06-21

이 문서는 완료된 milestone의 압축 요약이다. 세부 작업 로그와 검증 기록은 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`, `bin/docs/archive/progress-2026-05.md`, `bin/docs/archive/progress-2026-06.md`를 참고한다. 최신 짧은 로그만 `PROGRESS_LOG.md`에 남긴다.

## MVP Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M0 | Repo baseline cleanup | 기획/설계 문서와 smoke 산출물 정리, 기존 image agent 유지 |
| M1 | Local Docker infra | PostgreSQL, MinIO, Redis, OTel, Jaeger, Adminer 구성 |
| M2 | Database schema | 핵심 runtime table과 raw SQL migration baseline 구현 |
| M3 | Core domain models | Player, Loop, Scene, Event, Echo, Memory, Asset dataclass 모델 구현 |
| M4 | Store layer | `psycopg` 기반 PostgreSQL CRUD, transaction, integration tests 구현 |
| M5 | Narrative Director | Ollama JSON scene, repair path, deterministic fallback scene 구현 |
| M6 | Loop Engine | phase transition, validation, Echo activation, archive guard 구현 |
| M7 | Visual Service integration | FLUX local adapter, filesystem/MinIO storage, asset metadata 저장 구현 |
| M8 | CLI vertical slice | player 생성부터 bin/docs/archive/Echo/next loop까지 CLI 플레이 구현 |
| M9 | Observability and QA | structured logging, OTel span skeleton, smoke aggregation 구현 |
| M10 | Streamlit playable demo | 브라우저에서 player 생성, loop 진행, archive, Echo carry-over, 이미지/Ollama 확인 |

## Post-MVP Milestones

| ID | Milestone | Result |
| --- | --- | --- |
| M11 | Streamlit Polish | saved player/loop selector, loop resume UX, active/archived 표시, asset/Echo layout 정리 |

## Playable Game Track (Phase 15-19)

| ID | Milestone | Result |
| --- | --- | --- |
| M15 | Player UI 분리 | '플레이어 뷰'와 '개발자 뷰' 분리, 몰입형 게임 UI 구현 |
| M16 | 목표 & 판정 시스템 | 세션 목표 HUD, 플레이어 행동에 대한 성공/부분성공/실패 판정 및 연출 구현 |
| M17 | 시나리오 & GM 톤 | «Neo-Seoul» 세계관/GM 브리프 주입, 접속자 소질(Archetype) 및 부팅 온보딩 구현 |
| M18 | 미스터리 & Codex | Narrative Shard 단서 태깅, Lore 해금 임계치 로직, '기억의 별자리' Codex UI 구현 |
| M19 | 아트 연출 통합 | Y2K/CRT 후처리, 디제틱 HUD 오버레이, 캐릭터/컨셉 기반 img2img 정체성 스티어링 구현 |

## Infrastructure & DX Improvements

| ID | Milestone | Result |
| --- | --- | --- |
| M13 | Async Visual Jobs | Redis 기반 비동기 이미지 잡, 워커 heartbeat, pending/processing/succeeded 상태, MinIO presigned 표시 구현 |
| M13.5 | mflux Visual Backend | Apple MLX `mflux` 기본 전환, 4-bit 양자화, 단일 워커 락, img2img 4-step 프리셋으로 이미지 지연과 메모리 경합 완화 |
| M13.6 | Redux Worker Pipeline & Cleanup | mflux Redux 캐릭터 identity steering을 worker→MinIO 실경로로 검증하고, heartbeat owner token 유지/lock release/Postgres pool close로 worker 종료 잔류 방지 |
| M14 | Developer Experience | Ruff(Lint/Format), Mypy(Type Check) 도입, Makefile 명령어 정비 및 전역 타입 에러 해결 |
| M14.5 | Local Dev Stack UX | `make dev-up`/`dev-down` 원클릭 스택과 React Dev 탭 인프라 콘솔 링크(Adminer/MinIO/Redis/Jaeger) 추가 |
| M20 | Configuration Decoupling | 하드코딩된 시나리오 설정을 `scenario.json`으로 분리, MinIO를 기본 이미지 저장소로 지정 |

## RPG & Narrative Quality Track (Phase 21-26)

| ID | Milestone | Result |
| --- | --- | --- |
| M21 | RPG 데이터 구조화 | 5대 핵심 스탯, 자율성 레벨, 소질별 초기값, 단서 기반 레벨업 로직 구현 |
| M22 | RPG 기반 판정 | AI GM이 스탯을 근거로 성공/부분 성공/실패를 판정하고 결과를 장면 텍스트와 HUD에 반영 |
| M23 | 진행도 기반 세계 진화 | 자율성 레벨에 따른 NPC 반응, 시점/문체 변화, 이미지 글리치 강도 조절 구현 |
| M24 | 인터랙션 고도화 | 자율성 상태 UI, 신호 제약 경고, 각성 연출, Codex 플레이어 정보 강화 |
| M25-M26 | 노벨급 서사 엔진 | 오감 묘사, NPC 페르소나, 스테이징, 라벨 제거, AI 주도 페이즈 전환, 루프 요약 저장 구현 |

## Scenario v2 & Causality Track

| ID | Milestone | Result |
| --- | --- | --- |
| M27 | Gear World Causality | NPC 아젠다, 위치/선택 기반 인과율, 나비효과, 미래 이벤트 예약 지침을 GM 컨텍스트에 통합 |
| M28 | Multi-Ending Matrix | Humanity, Dominance, Resilience, Insight 지표 기반 다중 결말 구조 정의 |
| M29 | Scenario v2 | `scenario.json`을 메인/사이드 아크, NPC 아젠다, 엔딩, 시네마틱 훅, 동적 `system_prompt` 구조로 확장 |

## Roguelike/CRPG Combat Track

| ID | Milestone | Result |
| --- | --- | --- |
| M30 | Combat Engine | 결정적 다이스, initiative, 위치 이동, 사거리, 명중/피해/치명타, 적 AI, 승패 판정 구현 |
| M31 | Combat Runtime | `CombatService`, `RuntimeSessionService.start_combat`, `combat_action`, combat scene 영속, 퍼머데스/Echo 처리 구현 |
| M32 | Encounter Map | `world_delta.spawn_encounters`, 작전 지도 접촉 배치/이동/충돌 전투 트리거, contact resolved 처리 구현 |
| M33 | Tactical UI | 장면 이미지 옆 tactical board, party/enemy roster, 적/주인공 portrait, board 직접 이동, 공격/방어/도주 명령 구현 |
| M34 | Combat Result | 전투 종료 결과 패널, combat summary, 다음 장면 진행, 패배 후 메인 복귀 흐름 구현 |

## Gameplay Depth Track (Roadmap P1~P4)

| ID | Milestone | Result |
| --- | --- | --- |
| P1 | 루프 내러티브 잔향 | 이전 루프의 주요 분기점(`run_summary`)을 Narrative Context에 기시감 가이드라인과 함께 자동 주입 |
| P2 | 자원 제약형 선택지 | `stability`/`tension` 조건 위반 시 선택 비활성화 및 선택에 따른 자원 소모 경제 구축 |
| P3 | 적 인텐트 가시화 | 적 유닛의 다음 턴 행동 의도(이동/공격/도주)를 미리 시뮬레이션 및 보드 가시화 |
| P4-1 | 스탯 기반 내면 독백 | 최고/최저 스탯의 성격에 대입하여 디스코 엘리시움 풍의 내적 독백 가이드라인을 프롬프트에 주입 |
| P4-2 | 동료 전술 성향 다각화 | 정세린(원거리 지원/실드), 카이(도발/탱커) 성향별 AI 결정 트리 구현 및 실드 적용 대상 버그 수정 |
| P4-3 | 외부 이미지 모델 후보 평가 | Se-rin 대상 Gemini/Imagen 후보를 비교 자료로 생성·검토하고, canonical 승격 기준을 action sheet 검수 방식으로 정리 |
| P4-4 | Combat action pose pipeline | Se-rin/player-noise/Kai와 humanoid enemy 2종(enforcer-unit/glitch-wraith)에 `idle/attack/guard/skill/hit` 전신 combat assets 적용 |

## Web UI Decoupling Track

| ID | Milestone | Result |
| --- | --- | --- |
| S1-S6 | Web UI Parity & React SPA | FastAPI REST/WS 백엔드 어댑터 구축, WebSocket 토큰 스트리밍, MinIO presigned URL, React + TypeScript SPA 독립형 프론트엔드(온보딩, 6종 게이지 HUD, 타입라이터, 전투 Canvas 렌더러, Codex 기억의 별자리, Save/Load, Dev 모니터) 100% 기능 패리티 완료 |
| E2E | Playwright 자동 E2E 테스트 | uvicorn 백그라운드 서버 기동 및 Playwright headless Chromium을 통한 가상 플레이어 자동 온보딩, 스트리밍 대기, 턴 진행, 화면 스냅샷 수집, 실패 non-zero exit/진단 캡처, 리소스 자동 회수 파이프라인(`make test-e2e`) 구축 |

## Long-Session Stability Track

| ID | Milestone | Result |
| --- | --- | --- |
| L1 | Narrative Shards Memory Rollup | 오래된 `narrative_shards`를 `PlayerMemory(kind="causality_summary")`로 압축하고, 최신 raw shard만 Narrative Context에 전달하여 장기 세션 토큰 압박 완화 |
| L2 | Narrative Outcome Metrics | AI GM generation outcome(`success/provider_repair/local_repair/fallback`)을 `WorldMemory(kind="narrative_metrics")`에 누적 저장하고 React Developer 탭 Outcome Ratio 카드로 표시 |
| L3 | Rollup/Metrics Quality Pass | shard retention 경계값과 narrative metric response shape를 회귀 테스트로 고정 |

## Presentation, Progression & Procedural Track (Phase 35-39)

| ID | Milestone | Result |
| --- | --- | --- |
| M35 | Combat Presentation Upgrade | 전신 action pose(idle/attack/guard/skill/hit), `combatAnim.ts` role/tags 스킬 애니메이션 레지스트리, `CombatControls` 아이콘 액션바(cost/range/cooldown/FOCUS), 스킬 아이콘 컷인 5종, 전투 종료 결과 이미지, BGM retry-safe + MusicGen SFX, 모션 다양화 + `prefers-reduced-motion` 접근성. combat-art 적 4종. 설계 `bin/docs/plans/2026-06-06-combat-darkest-dungeon-presentation.md` |
| M36 | Progression Skills / Archetypes | `MetaProgression` 해금/습득 필드, onboarding 아키타입 게이트, archetype base+learned 스킬 필터, Codex Skill 트리 + 통찰 투자(learn/rank-up `GET/POST /players/{id}/skills`, tier gating), 깨달음 배너(인-루프 즉시 연출 포함), 시나리오 간 해금(`scenario.unlock`). 설계 `bin/docs/plans/2026-06-06-progression-skills-archetypes.md` |
| M37 | Controllable Party Allies | `Combatant.controllable`, `CombatState.active_actor()`/`living_controllables()`, controllable-actor stop 턴 루프, 파티원 직접 조작 + 비파티 동맹 AI 유지, 도주는 PLAYER 한정, active actor 하이라이트/턴 지시기. 설계 `bin/docs/plans/2026-06-06-party-controllable-allies.md` |
| M38 | Data-driven Progression Grant | 진행도 grant를 `scenario.json` 데이터 주도로 전환(`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`), 시나리오 교차 오염 + `load_scenario` lru_cache 오염 버그 수정, glass-library progression/presentation 패리티 + Story Bible 17 entries |
| M39 | Procedural Route Map & Session Memory | `route_map.py` 루프 시드 결정적 layered DAG(사전저작 anchor 다중 관점 + 동적 pool), `route_runtime.py` 라이브 진행·관점·엔딩 누계, director 주입·edge=선택지 분기·combat 노드 전투 트리거, 노드 그래프 뷰, anchor 큐레이트 이미지, 노드 보상/관점 effect를 게이지·HP에 통합(rest/market 회복), `session_memory.py` beat 원장+롤링 시놉시스(RAG 아님). 설계 `bin/docs/plans/2026-06-07-route-node-procedural-map.md` |
| M40 | Progression/Inventory/Equipment 데이터모델 통합 | JSONB-on-row → 전용 테이블(migration 005). `player_progression`(player+scenario PK upsert, meta_progression append-scan 제거, `load_progression`/`persist_progression`), `loop_inventory`(loop PK, PostgresStore save_loop/get_loop 중앙 dehydrate/hydrate). 장비 시스템: scenario `kind:equipment`+slot+stats, `equip_item`(슬롯당 1개) + 전투 시작 스탯 보너스 + `POST /loops/{id}/equip` + CharacterPanel 착용 UI. 기존 36행 백필. 설계 `bin/docs/plans/2026-06-09-progression-inventory-equipment-datamodel.md` |
| M41 | Neo-Seoul 콘텐츠 대규모 확장 | scenario.json에 신규 동료 3인(태오, 한, 수아), 신규 적 4종(Shock Trooper, Tracker Spider, Suppression Mech, Purge Drone), 스킬 6종 및 장비 6종, 신규 앵커 분기 2종(데이터 소각로, 지하철 통제 중추) 및 4개 교전 추가. bible.json에 인물/분기/엔딩 Echo 변주 스토리 바이블 보강. 신규 에셋(전투용 35종 모션 스프라이트 포함) 일괄 생성 및 scenario.json 매핑 완료, 로딩 검증용 유닛 테스트 추가 및 통과. 설계 `bin/docs/plans/2026-06-11-content-expansion-tasks.md` |
| M42 | Overnight 무인 루프 하네스 + 타입 부채 0 | 타 repo LOOP_ENGINEERING을 MythOS에 이식: `scripts/overnight/{run.sh,PROMPT.md,overnight-settings.json}`(무인 전용 권한 경계 `--settings`) + `/overnight-report` 스킬 + NEXT_PLAN `[auto]/[manual]/[blocked]` 태깅 + `make overnight*` 운영 타깃. `mypy src tests` 0 errors/109 files(이전 ~129, 전부 동작 불변)로 게이트를 `make check`(ruff+eslint+mypy+tsc/vite-build+unittest)로 승격(`check-auto`는 빠른 변형 잔존). Codex 스킬 버튼 상태 결정론화+선행 미충족 클릭 버그픽스. `--once` 실검증서 REPO_ROOT 폴백 버그 발견→에이전트 자동 `[recovered]` 복구. 설계 `docs/engineering/mythos/LOOP.md` |
| M45 | Prompt Layer 분리 Phase 0-2 (코드↔프롬프트) | 서사 파이프라인의 authored 지시문 prose를 범용 엔진 코드에서 분리해 `resources/<scenario>/directives/*.md`(프롬프트 레이어)로. **Phase 0**: NEW `scenario_directives.py`(Markdown 로더+순수 파서+KeyError-tolerant placeholder, `story_bible.py` 미러) + `NarrativeContext.fallback_scene` + 분석문서 `docs/PROMPT_LAYER.md`. **Phase 1**: NEW `fallbacks.py` — director↔parser fallback prose 8곳 중복을 단일 `DEFAULT_FALLBACK`로, director는 `context.fallback_scene or DEFAULT_FALLBACK`(시나리오 override 메커니즘 겸). **Phase 2**: 오프닝 ONBOARDING ~100줄 하드코딩 → `resources/neo-seoul/directives/opening.md`(byte-parity), `scenario_context`는 게이팅·shot·채널만 남긴 제네릭 어셈블러; continuity 게이팅으로 glass-library neo-seoul 오염 제거. byte-exact 파리티 실측 + `make check` green(360 tests). 선행 베이스라인: 오프닝 5컷 + 4 근본수정(지시 truncation/phase 게이팅/novelty guard/raw-ID location). 잔여 Phase 3-5 + 노드-주소 지정은 NEXT_PLAN Priority 0. 설계 `docs/plans/2026-06-16-companion-affection-cutscenes.md`·`docs/PROMPT_LAYER.md` |
| M44 | QA Seed 콘텐츠/밸런스 무결성 invariant 배치 | overnight `[auto]` 결정론 invariant로 콘텐츠/밸런스 "안 깨지는가"를 박제(green=고정, red=Blocker surface, offline `make check`). 박제 13종: 루트·엔딩 도달성(`test_route_integrity.py`) / 플래그·조우 무결성·무기/장비·스킬 데이터·loot_table↔items·encounter 수치 경계·item.kind enum·story_bible 메타·npc_agenda 주체(`test_content_integrity.py`) / 조우 승률 밴드(`test_encounter_balance.py`, 양면 ≥0.50·≤0.95) / 진행도 경제·아키타입 정합(`test_progression.py`). npc_agenda는 strict("키=캐릭터명")가 정당 설계로 RED → 사람 triage서 **추상 주체 allowlist 재정의**(scenario.json `npc_agenda_allowed_subjects` + anti-rot). codemod 2종 동반(FastAPI `on_event`→lifespan, dotenv import `type:ignore` 중앙화). 각 invariant 고장 주입으로 허위 green 아님 실측. `make check` green(347 tests). 잔여: `[auto:agy]` 스킬 아이콘 6종 → 그 선행 위 스킬/아이콘 PNG 무결성 `[blocked]` |
| M46 | 동료 호감도 런타임 + 컷씬 언락 (Priority 0, overnight 시드 A-O + P1) | **호감도 런타임**: 저작됐으나 무시되던 `effect.relationship` dead-data 활성화 — `route_runtime` route reconcile(매턴 fresh 재계산, replay 멱등) + `session` choice fold 누적(`state.relationships`), `progression` 크로스루프 이월(insight 패턴, migration 006), serializer 노출 계약. **Foundation**: prompt-layer Phase 3/4a-c(fallback/naming/stat/encounter prose→`directives/*.md`, generic 기본값·glass-library 회귀0) + `node=`/`beat=` 노드-주소 지정. **P1 unlock/gallery**: `CutsceneDirective` + companion Markdown loader + affection/flag evaluator + migration 007 + `memory_overview.cutscene_gallery`. **P1-a in-game appearance (2026-07-03)**: first eligible unseen cutscene becomes a once-per-loop transient scene node with KO/EN full-render script lock, `scene_type=cutscene`, curated SPA/save image, and anchor/side/combat/opening deferral. `make check` 665 + smoke-local + Playwright E2E green. 설계 `docs/plans/2026-06-16-companion-affection-cutscenes.md` |
| M43 | Engineering 문서 바이블↔해석 + /sync 연속성 + 로깅/대시보드 | 에이전트 운영 하네스를 `docs/engineering/` 5개 개념으로 정의 — **범용 바이블**(`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`, portable) ↔ **`mythos/` 해석**(repo 매핑). 옛 `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md`, 원시 리서치(`AI_REARCH`·`HARNESS_RESEARCH`)→`bin/docs/archive/`(개념만 흡수). **Resume Pointer 연속성**: `AGENT_BRIEF ▶ NEXT SESSION` + in-repo 경로 + 3진입문서 일치(plan-only 세션 `/sync` 미연속 회귀 수정). 진입점 슬림화(GEMINI 76→28). **WS3 로깅**: `run.sh`→`logs/status.tsv` 원장 + `status.sh` lane 집계 트리 + `make overnight-dashboard`(tmux). skills 4미러 정합. `make check` green(317). WS4 콘텐츠 파이프라인은 plan-only. 설계 `docs/plans/2026-06-14-engineering-plan.md` |
| M47 | Invariant Batches & Overnight Critic (2026-06-20~21) | Route type/goal closures, skill/ally data-closure invariants, heal/support friendly-targeting, 11/11 skill icons generated + verified, overnight critic v0.5.0 port, companion UI bonds/gallery frontend wiring, and face thumbnail images. |
| M48 | Serena MCP LSP Integration | Created `.serena/project.yml`, enabled Pyright/Vtsls, and registered the corrected stdio start-mcp-server command with debug/trace options in client `mcp_config.json`, transitioning agent to LSP-first. |
| M49 | Overnight AGY Browser QA (WS-A..F, default-on) | overnight runner is QA-aware by default (`OVERNIGHT_BROWSER_QA=auto`; `=0` kill-switch): candidate filter (`browser-qa-filter.sh`) → AGY 2-stage decision (`browser-qa.sh`/`run-agy.sh`) → dedup ledger; post-commit hook after gate+critic + DONE-drain sweep; PASS/SKIP continue, FAIL/NEEDS stop+notify (no revert); objective defects self-record to untagged `qa-findings.md` for human triage. `status.sh`/overnight-report surface QA; standalone `live-qa-agy-probe` removed. Validated across real runs (Chrome DevTools, PASS_CANDIDATE; 2 findings triaged→fixed). Design `docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21 |


## MVP Verification Summary

검증 완료:

- Unit tests: `make test`
- PostgreSQL integration: `make test-db`
- Local smoke: `make smoke-local`
- Full smoke with DB/MinIO: `make smoke`
- CLI demo: `make connect-demo`
- Streamlit demo: `make streamlit`
- Browser text play: player 생성, loop 시작, 3턴 이상 진행, archive, Echo carry-over.
- Browser visual play: filesystem preview, MinIO `s3://mythos-assets/...png` URI.
- Browser narrative play: fallback off 상태에서 Ollama scene 생성.
- Streamlit polish regression: saved player 선택, saved loop resume, archive, next loop Echo carry-over.
- Automated browser E2E: `make test-e2e` (Playwright headless Chromium 온보딩/턴이동 성공 검증, outputs PNG 스냅샷 보관)
- Current lightweight verification: `make lint`, `make typecheck`, `make test` (264 tests, 2 skipped), `make test-e2e`.

## Completed Architecture Baseline

- Docker는 local infra만 담당한다.
- Ollama와 FLUX worker는 Mac host에서 실행한다.
- PostgreSQL이 authoritative runtime state다.
- Streamlit과 CLI는 `RuntimeSessionService`를 공유한다.
- `st.session_state`는 view state만 저장한다.
- 이미지 생성은 플레이어 뷰에서 핵심 비트 중심으로 자동 생성되며, 기본 저장소는 MinIO다.
- 이미지 생성 기본 백엔드는 Apple MLX `mflux`이고, diffusers FLUX 경로는 폴백으로 유지한다.
- 전투 판정은 `mythos_combat` 엔진이 권위이며, LLM은 인카운터 배치/서사 연결을 지시하고 결과 판정 자체는 하지 않는다.

## M50 — GCP closed beta DEPLOYED LIVE + CBT onboarding UX + EN end-to-end (2026-06-29..30)

- **Deploy**: Cloud Run us-central1 (lean Dockerfile, invite-gated `--allow-unauthenticated`, min0/max3) + **Neon Postgres 18** (migrations 001-007) + Vertex Gemini/Imagen + GCS. URL `mythos-api-1004528040791.us-central1.run.app` (rev `00003-fzb`). LIVE-verified: gate(401/200), real EN Gemini narration + Neon persist, EN tab title, admin uncapped vs tester cap 10. DECISIONS 2026-06-29.
- **CBT onboarding UX**: Option B stable identity (`stablePlayerId` cyrb53 from invite key — saves follow key cross-device, no OAuth; backend ported in `limits.py`, node-verified); game-style Save/Load modal (`SaveLoadModal.tsx` — scene·character·date·thumbnail·paging 6/page/latest 60); invite-gate screen (`InviteGate.tsx` + `GET /auth/verify-invite`); **admin keys** cap-exempt (`MYTHOS_ADMIN_KEYS`).
- **EN end-to-end**: route-choice labels + **combat-log prose (K6, `mythos_combat/log_i18n.py` + `CombatState.language`)** + post-combat continue + EN default flip (`getLang`/`resolveInitialLang`/`index.html`) + BGM first-gesture auto-on. Free narration is persisted per-scene (not re-translatable at serving) → fresh EN loops clean; pre-fix loops keep KO. K9 ending cost-free-verified (archive + `localize_for` scan = 0 residual KO).
- **Cost guards**: invite gate + loop cap 10 + scale-to-zero (idle ~$0); per-tester ≈ $3–7 @ cap 10. Runbook `docs/cloud/DEPLOY.md` §10; keys `INVITE_KEY.md`; recruitment `CBT_TEASER.md`/`CBT_RECRUIT_POST.md`. `make check` 610 green (commits `daa5438..86d3970`).

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.
