# Completed Summary

최종 갱신: 2026-09-06

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
| M45 | Prompt Layer 분리 Phase 0-2 (코드↔프롬프트) | 서사 파이프라인의 authored 지시문 prose를 범용 엔진 코드에서 분리해 `resources/<scenario>/directives/*.md`(프롬프트 레이어)로. **Phase 0**: NEW `scenario_directives.py`(Markdown 로더+순수 파서+KeyError-tolerant placeholder, `story_bible.py` 미러) + `NarrativeContext.fallback_scene` + 분석문서 `docs/PROMPT_LAYER.md`. **Phase 1**: NEW `fallbacks.py` — director↔parser fallback prose 8곳 중복을 단일 `DEFAULT_FALLBACK`로, director는 `context.fallback_scene or DEFAULT_FALLBACK`(시나리오 override 메커니즘 겸). **Phase 2**: 오프닝 ONBOARDING ~100줄 하드코딩 → `resources/neo-seoul/directives/opening.md`(byte-parity), `scenario_context`는 게이팅·shot·채널만 남긴 제네릭 어셈블러; continuity 게이팅으로 glass-library neo-seoul 오염 제거. byte-exact 파리티 실측 + `make check` green(360 tests). 선행 베이스라인: 오프닝 5컷 + 4 근본수정(지시 truncation/phase 게이팅/novelty guard/raw-ID location). 잔여 Phase 3-5 + 노드-주소 지정은 NEXT_PLAN Priority 0. 설계 `bin/docs/plans/2026-06-16-companion-affection-cutscenes.md`·`docs/PROMPT_LAYER.md` |
| M44 | QA Seed 콘텐츠/밸런스 무결성 invariant 배치 | overnight `[auto]` 결정론 invariant로 콘텐츠/밸런스 "안 깨지는가"를 박제(green=고정, red=Blocker surface, offline `make check`). 박제 13종: 루트·엔딩 도달성(`test_route_integrity.py`) / 플래그·조우 무결성·무기/장비·스킬 데이터·loot_table↔items·encounter 수치 경계·item.kind enum·story_bible 메타·npc_agenda 주체(`test_content_integrity.py`) / 조우 승률 밴드(`test_encounter_balance.py`, 양면 ≥0.50·≤0.95) / 진행도 경제·아키타입 정합(`test_progression.py`). npc_agenda는 strict("키=캐릭터명")가 정당 설계로 RED → 사람 triage서 **추상 주체 allowlist 재정의**(scenario.json `npc_agenda_allowed_subjects` + anti-rot). codemod 2종 동반(FastAPI `on_event`→lifespan, dotenv import `type:ignore` 중앙화). 각 invariant 고장 주입으로 허위 green 아님 실측. `make check` green(347 tests). 잔여: `[auto:agy]` 스킬 아이콘 6종 → 그 선행 위 스킬/아이콘 PNG 무결성 `[blocked]` |
| M46 | 동료 호감도 런타임 + 컷씬 언락 (Priority 0, overnight 시드 A-O + P1) | **호감도 런타임**: 저작됐으나 무시되던 `effect.relationship` dead-data 활성화 — `route_runtime` route reconcile(매턴 fresh 재계산, replay 멱등) + `session` choice fold 누적(`state.relationships`), `progression` 크로스루프 이월(insight 패턴, migration 006), serializer 노출 계약. **Foundation**: prompt-layer Phase 3/4a-c(fallback/naming/stat/encounter prose→`directives/*.md`, generic 기본값·glass-library 회귀0) + `node=`/`beat=` 노드-주소 지정. **P1 unlock/gallery**: `CutsceneDirective` + companion Markdown loader + affection/flag evaluator + migration 007 + `memory_overview.cutscene_gallery`. **P1-a in-game appearance (2026-07-03)**: first eligible unseen cutscene becomes a once-per-loop transient scene node with KO/EN full-render script lock, `scene_type=cutscene`, curated SPA/save image, and anchor/side/combat/opening deferral. `make check` 665 + smoke-local + Playwright E2E green. 설계 `bin/docs/plans/2026-06-16-companion-affection-cutscenes.md` |
| M43 | Engineering 문서 바이블↔해석 + /sync 연속성 + 로깅/대시보드 | 에이전트 운영 하네스를 `docs/engineering/` 5개 개념으로 정의 — **범용 바이블**(`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`, portable) ↔ **`mythos/` 해석**(repo 매핑). 옛 `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md`, 원시 리서치(`AI_REARCH`·`HARNESS_RESEARCH`)→`bin/docs/archive/`(개념만 흡수). **Resume Pointer 연속성**: `AGENT_BRIEF ▶ NEXT SESSION` + in-repo 경로 + 3진입문서 일치(plan-only 세션 `/sync` 미연속 회귀 수정). 진입점 슬림화(GEMINI 76→28). **WS3 로깅**: `run.sh`→`logs/status.tsv` 원장 + `status.sh` lane 집계 트리 + `make overnight-dashboard`(tmux). skills 4미러 정합. `make check` green(317). WS4 콘텐츠 파이프라인은 plan-only. 설계 `bin/docs/plans/2026-06-14-engineering-plan.md` |
| M47 | Invariant Batches & Overnight Critic (2026-06-20~21) | Route type/goal closures, skill/ally data-closure invariants, heal/support friendly-targeting, 11/11 skill icons generated + verified, overnight critic v0.5.0 port, companion UI bonds/gallery frontend wiring, and face thumbnail images. |
| M48 | Serena MCP LSP Integration | Created `.serena/project.yml`, enabled Pyright/Vtsls, and registered the corrected stdio start-mcp-server command with debug/trace options in client `mcp_config.json`, transitioning agent to LSP-first. |
| M49 | Overnight AGY Browser QA (WS-A..F, default-on) | overnight runner is QA-aware by default (`OVERNIGHT_BROWSER_QA=auto`; `=0` kill-switch): candidate filter (`browser-qa-filter.sh`) → AGY 2-stage decision (`browser-qa.sh`/`run-agy.sh`) → dedup ledger; post-commit hook after gate+critic + DONE-drain sweep; PASS/SKIP continue, FAIL/NEEDS stop+notify (no revert); objective defects self-record to untagged `qa-findings.md` for human triage. `status.sh`/overnight-report surface QA; standalone `live-qa-agy-probe` removed. Validated across real runs (Chrome DevTools, PASS_CANDIDATE; 2 findings triaged→fixed). Design `bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21 |
| M51 | Route Scene Lifecycle Contract | Added causal add/delete validation (`make validate-content` + load-time fail-fast), hard-gate-safe full/dynamic graph wiring and stale-map recovery, deterministic Night Market→Kai producer chain, scene-idempotent REST/WS choices with an immediate React input lock, and correct cross-loop relationship hydration/delta archive semantics. Before→after: deal/Kai 0→100 per 100 seeds on both builders, locked visits 0, duplicate 200→404 becomes 200→200 same scene. `make check` 724 + smoke-local + E2E green. Design `bin/docs/plans/2026-07-04-route-scene-lifecycle-hardening.md`. |
| M52 | Achievements Dashboard | Memory Constellation exposes cumulative runs/wins/clues, companion recruitment and upgrade milestone progress, and unlocked trait chips from existing `meta_progression` data. KO/EN responsive UI; no backend change. E2E verifies 3 totals, 4 recruitment rows, 6 upgrade rows, and language switching; `make check` 724 + smoke-local + E2E green. |
| M53 | Companion Cutscene Set + Route/Skill UI | Completed seven KO/EN cutscenes across all six Neo-Seoul companions, adopted two dedicated Se-rin cutscene artworks, and fixed EN gallery directive loading. Added numbered/color-linked route choices↔map destinations and a dependency-column skill graph with icons/prerequisites/status. Chrome DevTools fresh-EN QA + `make check` 726 + smoke-local + E2E green. |
| M54 | Ending Art + Rank/Clue/Kai Closure | Generated and wired four dedicated Neo-Seoul ending images (including boss-defeat Forced Erasure). Rank 2/3 now changes combat potency/focus/cooldown, empty placeholder clues no longer persist and legacy duplicates are hidden, and Restarting Kai can join `_party` with an `IN PARTY` Bonds marker. Focused regressions + `make test` 729 green; browser/full-gate handoff remains. |
| M57 | CBT P1 overnight asset + opening-intro bundle (2026-07-06) | Replaced all six opening-variant key cuts with curated first-person rainy cyan/red art; promoted 10 companion/enemy/IX skill icons and four RIFF/WAV SFX with asset-integrity coverage; completed two direct AGY browser runs as `PASS_CANDIDATE` for onboarding/combat presentation and KO placeholder behavior; added KO/EN per-variant boot cinematics keyed by `_opening_variant`, with a signal-alignment hold screen preventing mid-read swaps. `make check` green through 865; subjective asset/tone sign-off remains human-owned. |
| M58 | P1.5 clarity + mobile-first + Design-System foundation + Landscape Combat (2026-07-08) | S4 variant-routed opening content; P1.5 clarity T1-T4a (identity-swap fix, WS keepalive/optimistic-choice responsiveness, fork↔choice contract, plain copy, axis affordances); mobile-first Track M (100dvh, <600px readable fonts + 44px tap targets, tap-openable tooltips, concise-mode + coarse-pointer default, board zoom/movement-affordance/tile-floor); **Design-System DS0 tokens + DS1 `Surface`/`Popover` primitives + DS2 panel migration (api/StatusPanel/aside/StoryPanel clusters, `Surface` forwards `...rest`)**; **Landscape Combat LC0-6** (orientation hook + rotate prompt, split layout, chrome compaction, one-screen no-page-scroll, tab-nav hide + actions-first). Owner sign-off on the DS2 `Surface` API (size-2=16px, glow baked, 6→8px radius). `make check` green through 953; LC + DS2 emulator-verified @844×390 (board+actions co-visible, computed-style parity); real-device feel + DS3 density + T5c iso judgment remain human-owned. Detail archive/`progress-2026-07.md`, plans `2026-07-08-{design-system,ds2-sample-migration,cbt-feedback3-clarity}.md`. |


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

## M59 — Combat overhaul arc: telegraph → control → status → visuals (2026-07-11..12)

- **P0 (deployed 00044..00048)**: full telegraph (⚔+dice+attack line; stale-radar root cause fixed), all arenas 10×7, terrain sprite layer + FLUX tiles ×3 (alpha post-processing), board declutter/dark floor/heal fix.
- **P1 + cover-pose saga**: push/pull `_skill_displace` (terrain-meaningful, hit chance kept per owner) + cover badge 🛡+3/+6 + crouch pose (`<char>-cover.png` convention). Cover sprites: 4 codex rounds + owner canon rule ("cover props only from the char's own guard sheet") → 7 approved 2026-07-12; image-judge A2A relay live-validated on the rejected batch.
- **Feedback batches (deployed 00052/00053/00055)**: skill rework (시스템 해킹=스턴 · 과부하=스플래시 · 자기 반발 신설 · 유틸 고정피해 라이더) · XCOM cell throws (EMP/소이/냉각 + previews) · responsiveness (cinema diet p50 7.0→3.6s + tap-skip) · two-tier control slices 1-3 + 🎯 aimed casts · status effects slices 1-3 (burn/corrode/acid/freeze/shock/hacked + enemy weapon riders + sim test kit) · owner live-QA fix batches.
- **Visual overhaul V1-V6 + completeness**: camera drag-pan + centering bugfix · biome-tinted backdrops · cell-true AoE/chevron range · badge chips · cinema impact slashes + grenade item-art cards · full glyph/thumbnail coverage · real grenade blasts (×2.7) · tutorial Next button.
- **Session #15 batch**: status stacking (duration accumulates, cap 6, stun included) + multi-status coherence (upkeep-DoT death fix) · collision slam (edge/full-cover/unit = flat 1d4 + burst; full cover blocks forced movement only) · cryo grenade 1d4 · `DEFAULT_BGM_ON` env-driven BGM default · victory-lineup slice(0,3) + loot-pill localization (codex lane).
- Verification: `make check` 980→**1058** green across the arc; per-batch non-fallback sim evidence (`outputs/vis-diag/`, `outputs/qa-slam/`); owner live verdicts on 00053/00055. Detail: `bin/docs/archive/progress-2026-07.md`.

## M60 — Enemy roster + balance verdicts + two-tier complete + portrait dock (2026-07-13..14)

- **Enemy roster overhaul (owner QA PASS on 00061)**: board attack-telegraph occlusion fixed (post-blip overlay pass — marker/connector were hidden under the target sprite), spawn variety (enforcer_standoff un-orphaned + per-loop no-repeat `_route_encounters_seen`), and **enemy art 20/20 regenerated via codex** to canon styles (shock-trooper→painterly enforcer sibling; purge/mech/spider→inked-comic rust/red). Pipeline: text-only canon prompts → collect from `~/.codex/generated_images` → claude vision judge (3 green-screen re-rolls) → alpha strip (codex paints a checkerboard, not real alpha; flood-fill + two-tone pocket detection) → 512×768 promote. `bin/docs/plans/2026-07-13-enemy-art-consistency.md`.
- **Balance verdicts (owner GO on the analysis, feel-passed)**: hard-CC cap split (burn/stun 3 vs utility 6 — capped burn was expected-15 armor-bypass), boss consecutive-stun resistance (`stun_guard`, floor-halving so 1-turn rotation-lock dies; deliberate deviation from the plan's "min 1" noted), cryo freeze 1→2. `bin/docs/plans/2026-07-14-combat-balance-tuning.md` (판정 기록 section).
- **Two-tier combat control COMPLETE (slices 1-4)**: slice 4 turn-order strip (`TurnOrderStrip.tsx` — server-sent `turn_order` rotated active-first, faction rings, 💫/⚔/👣 badges, LC-hidden) closed the 2026-07-12 track.
- **Portrait action dock (owner pain "스킬/공격하려면 자꾸 스크롤")**: fixed bottom console sheet (38dvh, safe-area) + LC5-style chrome diet in portrait combat; layering fixes (legend popup z50 < dock z52 < boon z55 < modals 60 — the popup was swallowing boon-card and dock taps at phone widths). Emulator-verified @390×844; real-device pass open.
- **Also**: CBT Teaser V2 published (YouTube, owner). Deploys `00060-ldj`→`00063-hpz`; `make check` 1067→**1082** green; locks `BalanceTuning20260714Test`/`test_turn_order_strip`/`test_portrait_combat_dock`.

## M61 — Ops day: A/B verdict + agent-backlog drain + eval harness + portrait hierarchy (2026-07-17)

- **Key-beat hybrid A/B CLOSED = ROLLBACK**: owner felt the 2.5 normal-turn prose drop → full `gemini-3.5-flash` restored AND source-pinned (provider default + `.env.example` + DEPLOY.md; location auto-`global`); routing/observability kept for future retries. Partial-2.5 audit: no viable spot (2 LLM touchpoints; thinking already 0; ~$1.0/loop accepted). `DECISIONS.md` 07-17.
- **3.1 image-model log audit**: prod logs proved `gemini-3.1-flash-image` NEVER succeeded (0 successes over its whole deployed life); "worked before" was `imagen-3.0` on 07-11 → probe-before-deploy lesson recorded.
- **Agent backlog drained**: clarity follow-ups (deterministic first-use term-gloss UI `termGloss.ts` + echo in-fiction naming rule) · WS4 closed by design (`docs/plans/2026-07-17-ws4-authored-content-pipeline.md`) · WS5 shutdown digest + iter-log cap (`run.sh`) · prompt-layer Phase 5 few-shot extraction (byte-parity, track complete).
- **Narrative eval harness**: `scripts/eval/` golden bank + claude-CLI rubric judge (`make eval-narrative`), end-to-end validated (judge caught canned-fallback artifacts with turn-anchored quotes). Reference analyses `docs/reference/` (Google ADK 2.0 fact-check — Antigravity≠runtime; Anthropic/OpenAI borrow list — eval loop was our gap).
- **Portrait combat hierarchy rework** (owner real-device findings): board height-fit 389px + board-first scroll (board finally dominates), dock 38→30dvh, cinema cards vw-scaled (no overlap @390px), simulator skips the boon draft. Design `bin/docs/plans/2026-07-17-portrait-combat-hierarchy.md`.
- **Ops/cost**: docs tidied to budget (plans archived, media pruned 250→68MB), 56 stale AR build images deleted + cleanup policy, git commit/push allowlisted. Deploys `00070`→`00073-zx2`; `make check` 1094→**1124** green.

## M62 — OpenAI + Anthropic Overnight Harness V2 research and design (2026-07-18)

- **Research translated**: the Sol/OpenAI and Fable/Anthropic source views plus their final synthesis are recorded under `docs/reference/2026-07-18-*harness*.md` and reflected across the engineering bibles/MythOS interpretations.
- **V2 boundary designed**: a permanent safety/evidence/recovery perimeter plus capability-aware removable scaffold around `RunController`, `WorkContract`, `VerifierRegistry`, `OversightPolicy`, and `EvidenceBundle`; assumptions are measured and ablated rather than promoted to a runtime module.
- **HITL target defined**: Neo-Seoul's 16 manual checks become 6 auto-close + 8 monitored/prefiltered + 2 human-authority, measured over three release bundles rather than assumed safe.
- **Delivery plan recorded**: `docs/plans/2026-07-18-overnight-harness-v2.md` P0–P5; no runtime implementation or irreversible runner-ownership decision in this milestone. Documentation checks passed.

## M63 — Overnight Harness V2 plugin adoption (2026-07-19)

- **Plugin 1.1.0**: external required WorkContract compiler, real Codex repo-write/commit probe with Git common-dir boundary, bounded verifiers, and typed `needs_human` pending evidence; 51 offline checks plus a real Codex 0.144.5 disposable commit pass.
- **MythOS adapters**: lane/subjectivity/scope-aware contract compiler; diff-scope, deterministic gameplay, objective browser, and image-identity verifiers; offline idempotent environment doctor and five adapter tests.
- **Skill ownership**: plugin-only namespaced lifecycle skills configured by `.claude/harness-config.json`; stale no-prefix copies removed from both engine skill roots. MythOS retains only `gameplay-qa`/`codebase-design`, and the skill-sync gate rejects plugin duplicates.
- **Single controller SoT**: Make targets resolve the plugin; repo-local runner/status/dashboard/notify, duplicate actor prompts, and stale snippet removed. `harness-init --check` confirms no vendored behavior.
- **Verification**: `make check` 1130 OK (5 skipped), `make smoke-local` PASS, plugin package/AGY manifests, shell syntax, doc budgets, and diff checks PASS. Publication/cache reinstall remains a separate normal release action; source pin is active meanwhile.
- **Boundary**: this milestone improves autonomous execution, rejection, and exception evidence; it does not yet remove live-play checks. Current formal human-QA reduction is 0/16. The 6 auto / 8 monitored / 2 human split remains a measured rollout, not a completed benefit.

## M64 — Harness V2 objective browser-QA live calibration (2026-07-19)

- **Six assertions exercised**: image arrival, companion join into a real combat roster, exact four-person party distribution, one-shot companion cutscene + normal return, choice arrival, and first-use-only term gloss each produced a required PASS `evidence-bundle.json` with hashed events/screenshots.
- **Production-state fixture seam**: isolated local players/loops prepare only the long-progression starting point; Resume, narrative choice, route `party_add`, combat begin/roster, cutscene staging/clearing, and rendered UI remain production paths. Pure fixture transforms are unit-locked.
- **Calibration result**: eight required runs (three choice + one per remaining assertion) had 0/8 observed false accepts. The authoritative six-bundle audit had 0 hash mismatches and took 507.7s total/84.6s mean; evidence reporting keeps one DB exception and samples 2/9 clean bundles.
- **Verification/boundary**: `make check` 1146 OK (5 skipped), browser screenshots independently reviewed. Formal human-QA reduction remains 0/16 until three distinct release bundles preserve false-accept/false-stop limits and demonstrate lower human minutes.

## M65 — Harness V2 human-load reduction RATIFIED (2026-07-20..21)

- **Purpose**: convert the live-QA checklist from fully human-owned (16 active items) to an evidence-backed split.
- **Evidence**: seven fail-closed assertions (route_axis_chip added 07-20); release-bundle contract passed on three distinct releases (07-19 local · `00077-8g9` · `00078-rs9` 7/7, hashes 32/32); 0 observed false accepts across all calibrations; 7.8 min unattended collection, 4-bundle human-review surface.
- **Ratified split (owner 2026-07-21)**: 5(+1 chip) auto / 8 monitored / 3 human — active-play surface 16→3 (81%). Design: `docs/plans/2026-07-21-live-qa-reduction-split.md`; checklist restructured accordingly.
- **Ongoing**: the 7-assertion contract runs per deploy; `report-evidence.py` attention list is the human touchpoint.

## M66 — Frontend deep-module decomposition track closed (2026-07-26)

- **Result**: slices 1–13 + 15–18 A/B extracted cohesive hooks; slice 14's shallow `useViewModels` bundle was human-reverted and not repeated. Final slices `useSaveLoad` (`e4ca67c`) + `useEpiphanyBanner` (`6945a2f`) reduced App.tsx 979→940 while preserving restore-before-resume and shared epiphany-notice policy.
- **CombatCinema**: skill catalog/alias policy moved behind `resolveCombatSkill` (`937d2fd`), then callback-safe fast/standard phase timing moved behind `useCombatCinemaTimeline` (`5247719`); the orchestration hook fell 419→125 lines. Image fallback remains inline as a deliberately shallow remnant.
- **Boundary**: App C `useTabs` was declined because touch behavior and a wide interface outweighed remaining depth; the track optimizes module depth, not line count.
- **Verification**: all four final slices passed `make check` (1166/1167) and official post-commit AGY `PASS_CANDIDATE`; save/load additionally proved POST restore before active-loop GET in rendered Playwright.

## M67 — Graph P0 durable ledger + resumable human checkpoint (2026-07-26, upstream; local 1.3.0 release)

- **P0-A durability**: plugin `ledger.py` owns locked append + `fsync`, schema 1 replay/schema 2 hash refs, deterministic mission projection, and corruption checks. Lifecycle/evidence writes fail closed; claim reconciliation/status/operator commands share the projector.
- **P0-B human edge**: verifier `needs_human` writes a non-terminal atomic snapshot bound to pending HEAD, evidence, and controller/policy/verifier graph fingerprint. Approve keeps the commit; reject uses the shared history-preserving compensation seam; neither reruns actor/gate/critic/verifiers.
- **Recovery guards**: interrupted claim remains paused; normal runners do not mark paused missions stalled; double/conflicting decisions and HEAD/worktree/evidence/graph drift are refused without consuming the checkpoint.
- **Consumer + proof**: MythOS adds `overnight-ledger-check`, `overnight-ledger-state`, `overnight-resume`; harness 7 offline suites 95/95, package/init/syntax checks pass, MythOS `make check` 1168 (5 skipped). Rolled into upstream `bc48e8b` / local tag `overnight-harness--v1.3.0`; no remote push/publication.

## M68 — Graph P1-A canonical mission provenance (2026-07-26, upstream; local 1.3.0 release)

- **Deep module**: `provenance.py` owns canonicalization, atomic manifest write, validation, and diff behind one shell initializer. The manifest records only whitelisted non-secret policy plus plugin/runner, schema/topology, contract compiler binding, actor/critic identity+prompt, and ordered verifier hashes.
- **Lineage contract**: every new schema-3 mission event and evidence bundle carries one `graph_fingerprint` + immutable `provenance_ref`; ledger replay rejects mixed lineage. Same fingerprint/different result is classified as nondeterministic; config changes return a field diff. Per-iteration WorkContracts stay bound by evidence `contract_ref` because one runner mission can execute several contracts.
- **Proof + consumer**: harness 8 offline suites 100/100, syntax/package/init/AGY/diff gates pass; MythOS adds `overnight-provenance-compare`, pin/ledger checks pass, and `make check` remains 1168 (5 skipped). Rolled into upstream `bc48e8b` / local tag `overnight-harness--v1.3.0`; no remote push/publication.

## M69 — Graph P1-C transition fault recovery (2026-07-26, upstream; local 1.3.0 release)

- **Recovery Module**: ledger projection exposes the latest pre-effect checkpoint and accepted evidence. Claim takeover validates immutable evidence + exact HEAD to recover accepted; otherwise it compensates the complete actor/repair range to the checkpoint base before closing stalled. Ambiguity blocks dispatch.
- **Idempotent effect seam**: compensation aborts/retries an interrupted revert and uses base/current tree identity as the durable completion marker, preventing double revert after a kill. Repair events retain diagnosis, budget, original HEAD, and full range.
- **Proof**: eight real-process `SIGKILL` fixtures cover actor/event, gate/evidence, repair recall/reverify, single/multi-commit revert, and terminal before/after; human-pause HEAD drift remains in the resume suite. Harness 9 offline suites 108/108 plus syntax/package/init/AGY/diff gates pass; MythOS `make check` remains 1168 (5 skipped). Rolled into upstream `bc48e8b` / local tag `overnight-harness--v1.3.0`; no remote push/publication.

## M70 — Graph P1-B edge-level causal trajectory (2026-07-26, upstream; local 1.3.0 release)

- **Projection Module**: `trajectory.py` deterministically derives stable node/attempt/parent identity, input/output state hashes, typed edges/verdict/evidence, and duration/token/cost from the append-only ledger. JSONL remains authoritative; OTel is only a future optional export.
- **Accounting**: actor/gate/critic/repair/repo-verifier results carry `duration_ms`; usage owns tokens/cost. Mission totals are exact child sums with a fail-closed balanced flag and negative-value rejection.
- **Proof + consumer**: accepted/repaired/reverted/needs-human paths, unique attempts, actor/repair/critic usage attribution, independent source↔child reconciliation, text path/table, and byte-deterministic replay pass in eight new fixtures; harness 10 offline suites 116/116 and packaging/integration gates pass. MythOS adds `overnight-trajectory`; `make check` remains 1168 (5 skipped). Rolled into upstream `bc48e8b` / local tag `overnight-harness--v1.3.0`; no remote push/publication.

## M71 — MythOS Dev Graph P1 offline integration smoke (2026-07-26)

- **Consumer seam**: `make overnight-graph-smoke` runs the released 1.3.0 controller and MythOS WorkContract compiler only in disposable local Git repos with the fake engine; the product worktree, network, and real mission ledger remain untouched.
- **Five paths**: design-blocked stops before actor dispatch; accepted proves base-red→candidate-green plus immutable evidence; reverted restores the exact base tree; repaired takes one bounded loop-back; paused preserves the pending commit/evidence while releasing its claim.
- **Integrity proof**: contract/provenance/artifact hashes match bytes, sequence corruption and verifier drift fail closed, trajectories are causal/accounting-balanced and byte-deterministic, every fixture cleans its claim, and two full target runs produce identical output. P2 remains owner-gated on selecting one real temporary mission.

## M72 — MythOS Dev Graph P2 first non-fixture mission (2026-07-26)

- **Contract seam**: an immutable owner-approved MissionSpec compiles design/risk/one ordered slice into the existing WorkContract and binds `15-regression-validity` through an evidence config hash; repair/revisions and subagents stayed 0.
- **Measured outcome**: Claude changed only the three approved docs and committed `1ae0d01`; the external gate caught ambient `OVERNIGHT_LANE=claude` contaminating Codex compiler fixtures, then Harness created compensation commit `80f44f0` and terminal `rejected_by_gate`. No actor change was retained.
- **Independent audit**: 11-event ledger valid, state terminal, trajectory reverted/balanced, diff-scope pass, regression base 1/candidate 0, reverted-base `make check` 1171 (5 skipped), all archived hashes pass. Evidence: `outputs/overnight/p2-first-mission-mission-20260726-181623-39074/`.
- **Containment**: compiler fixtures now clear inherited lane state before testing their explicit-engine fallback; focused tests and the real-lane graph smoke cover both sides. Claude reported 54 turns/$2.0424 against a soft 12-turn request; another real-engine run requires fresh approval and a budget-semantics decision. P3 can proceed with fake/disposable engines.

## M73 — MythOS Dev Graph empirical baseline + bounded retry (2026-07-26)

- **Current release proof**: local Harness 1.3.2 (`31fe42b`, tag-derived cache) passes 126 offline checks; five repetitions of consumer graph, pause/resume, and real-process fault suites pass 110/110 in 181.102s with 15/15 raw-log hashes and no MythOS worktree drift.
- **Real cohort**: the first task was safely rejected/compensated after a fixture-coupled gate RED; the isolated same-task retry was accepted with three scoped docs, full gate 1171 (5 skipped), regression/scope evidence, 15-event ledger, balanced trajectory, clean claim/worktree, and byte-identical owner-worktree integration.
- **Measured boundary**: retry used one Claude invocation, 223.234s, 1,951,605 reported tokens, $1.1495 under hard $2.50, repair/revisions/subagents 0. Across both real runs false accepts=0, but `turns=12` was unenforced (54/31) and retry metadata drifted 0→1.
- **Decision**: deterministic gates and narrowly bounded one-shot dogfood PROCEED; multi-iteration, repair, critic-effect, fan-out, and general productivity claims HOLD. Authority report: `docs/reports/2026-07-26-dev-graph-empirical-baseline.md`.

## M74 — Harness 1.3.3 retry contract/provenance alignment (2026-07-26)

- **Single authority**: plugin `contract_retry_budget()` preserves an explicit `CONTRACT_RETRIES`, including `0`, for external and built-in compilers; blank keeps the existing `MAX_CONSEC_FAIL` fallback. Canonical provenance records the same effective value.
- **Truthful cost boundary**: provenance names `CLAUDE_MAX_BUDGET_USD` as per-invocation and records that no mission-wide cost budget is enforced; it does not infer a nonexistent hard ceiling.
- **Proof/release**: observed MythOS compile changed `requested=0 compiled=1` to `0`; both compiler paths are full-runner fixtures. Harness 128/128 plus syntax/JSON/npm gates pass; local commit/tag/cache `0d2750e` / `overnight-harness--v1.3.3`; MythOS pinned graph smoke and compiler probe pass. No model call/push/deploy.
- **Remaining gate**: turn-budget semantics and held-out-bank ratification still block another real cohort and unattended expansion.

## M75 — Harness 1.3.4 turn-budget acceptance + held-out bank v1 ratification (2026-07-27)

- **Acceptance boundary**: built-in/external WorkContracts compile `budgets.turns`; successful actor output is parsed for final `num_turns`, recorded with the contract limit, and bound to the actor log by SHA-256. Claude success without the metric fails closed.
- **Compensation**: reported turns above the contract stop before external verification and exactly compensate any actor commit. This is post-run acceptance, not stream cancellation; wall timeout and per-invocation USD remain the actual resource caps.
- **Proof/release**: 14/12 fixture changed from success to typed reject + restored base; real retry evidence reads `exceeded|31|12`. Harness 136/136 plus syntax/JSON/npm/AGY/push-policy gates; upstream `c9a8ff7`, local tag/cache `overnight-harness--v1.3.4`; MythOS pin + five-path graph smoke pass.
- **Bank decision**: the three docs/Python/UI tasks are owner-ratified as frozen bank v1. Repair/fan-out remain off until a repair-0/subagents-0 single-actor baseline is audited; evaluation commits never merge.

## M76 — Frozen-bank repair-0 cohort fail-close + preflight hardening (2026-07-27)

- **Measured cohort**: all three frozen tasks ran once with 15-minute/$2.50 hard caps and retry/repair/revision/subagent 0. Claude reported 47/40/46 turns against 12; Harness 1.3.4 rejected before verification, created three exact compensation commits, and left zero dirty worktrees. Total actor wall/cost = 790.198s/$4.3584.
- **Validity boundary**: unlocked disposable setup selected NumPy 2.5.1, making the immutable base mypy-red against the Python 3.11 support target. No task was implemented or accepted, so the cohort proves real-call turn fail-close but is invalid for productivity, accepted-diff correctness rates, or repair lift.
- **Containment**: NumPy is constrained below 2.5 and overnight preflight now runs mypy before model dispatch; final `make check` passed 1171 tests (5 skipped). Bank task text is unchanged; rejected/evaluation commits never merge. Report: `docs/reports/2026-07-27-heldout-v1-single-actor-baseline.md`.
- **Decision**: repair/fan-out remain off. A valid clean cohort is a new paid arm requiring owner re-arm after fresh-worktree base-green proof; remote publication remains separate.

## M77 — Reproducible fresh-worktree base-green setup (2026-07-27)

- **Finding/fix**: after the NumPy `<2.5` correction, a clean `make setup` exposed missing GCP test imports because `dev` omitted the SDKs. Commit `9ffad61` adds `google-genai`/`google-cloud-storage` to `dev`; the environment doctor now checks those imports before model dispatch.
- **Proof**: a second brand-new Python 3.13 worktree selected NumPy 2.4.6 and passed import preflight, mypy across 188 files, and `make check` 1171 (5 skipped); main passed the same full gate.
- **Boundary**: this closes the clean-base prerequisite only. The invalid first cohort is not a productivity arm; new paid execution, repair, fan-out, remote publication, push, and deploy remain explicitly gated.

## M78 — Clean frozen-bank repair-0 strict-contract baseline (2026-07-28)

- **Result**: three clean-base actors produced scoped candidate commits but reported 37/28/27 turns against 12. Harness 1.3.4 rejected before external verification, exactly compensated all three, and left zero dirty trees: strict-contract verified completion 0/3, false accepts 0.
- **Economics/proof**: valid actor wall/cost/tokens = 504.072s/$2.7305/4,927,960; pre/post `make check` 1171 (5 skipped), ledgers balanced, compensation trees exact. One excluded wrong-runner dispatch raised total spend to $3.1979; evidence/report under `outputs/overnight/heldout-v1-clean-baseline/` and `docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`.
- **Owner decision**: retain strict 12-turn acceptance, accept current-contract productivity 0/3, and close repair rollout. `OVERNIGHT_REPAIR=0`; never tune/retry bank v1. Any future reopening requires preregistration, unseen owner-ratified bank v2, and fresh approval.

## M79 — 08-08 arm display gaps re-examined; Korean-only matching class closed (2026-08-09)

- **Purpose**: the 2026-08-08 owner-review arm listed its display problems as authoring/`[manual]` items awaiting the owner's read. Re-examining them instead of accepting that classification found **all four were deterministic defects**, and the last one belonged to a *class* — matching logic written in Korean literals running against an EN-default product — which was then swept for across `src/`.
- **Output (21 commits)**: tutorial tier 1→4 encounters (never-wins path 1 fight + 19 skipped beats → 20/20 across four fights, balance-simulator tuned to 0.58–0.77 solo); speaker attribution (possessive guard rejected `X's voice`, so **every** such attribution showed no portrait; speaker now decided by a speech cue rather than scenario array order; `"…," X says.` was not recognised as dialogue at all — 33% of quoted spans); value-axis chip (Korean-only vocabulary meant 96/98 EN labels read "Help people" and 43/45 scenes shared one axis → 14/45); and six instances of the matching class — Se-rin accept/refuse (**gameplay**: EN players could not refuse; `refused_se_rin` unreachable), character reference art (`change`/`channel`/`handle` bound Han's portrait), opening cinematic gate (4/9 → 8/9 EN opening turns), companion detection, an SFX marker that **deleted the rest of the English sentence** on the main path, and a combat trigger EN narration could never fire.
- **Structure**: the rule is now one module, `mythos_core/text_match.py` (`keyword_hits`/`mentions`/`name_mentions`), replacing four independently-grown copies. Korean matches as a substring, ASCII must stand alone, and a one-syllable Korean *name* is particle-bounded rather than dropped.
- **Verification**: `make check` 1222 → **1260** (5 skipped) with 38 new tests; `make smoke-local` exit 0; every fix reproduced before it was written and re-measured after. Rendered evidence: `outputs/live-qa/20260808-tier1-encounters/`, `outputs/live-qa/20260809-axis-and-attribution/`.
- **Boundary**: all local — nothing pushed or deployed, by design, so the owner's §3 verdict is not desynchronised. Generated-art effects and play feel remain unverified; `CURRENT OBJECTIVE` did not reproduce and still needs the three scene ids.

## M80 — Status-effect intensity stacking (owner "option 2") (2026-09-06)

- **Purpose**: the owner's 2026-08-15 call — reapplying a status should build **stacks** (intensity), not only extend duration — had sat untagged in NEXT_PLAN because its design context lived only in the conversation. Snapshot first (`docs/plans/2026-09-06-status-effect-stacking.md`), then the build, then simulator evidence.
- **Output**: `Combatant.status_stacks` as a parallel intensity ledger next to the unchanged turns ledger (`status_effects`), read through `status_stack(id)` (inactive 0, missing entry 1 — old saves and direct test setup keep working); `STATUS_STACK_CAPS = {burn: 3, corrode: 2, acid: 2}`, freeze/shock/hacked pinned at one stack; burn DoT `1d4 × stacks`, corrode armor and acid defense `-2 × stacks`; stacks clear only with the status (expiry, hacked consumption); localized ` (중첩 ×N)` / ` (×N)` suffix on the applied line, `stacks` in log detail and the blip payload; roster chip `burn ×2` and a status-colored count pip on the canvas badge.
- **Structure**: the 07-12 "duration stacks, intensity does not" rule was test-locked (`test_status_duration_caps`); that assertion now encodes the new rule. Two snapshot corrections surfaced during the build and were written back: acid already had a magnitude site (`effective_defense`), and the tuple shape was dropped for the parallel dict because ~30 test sites, the generic dataclass round-trip and persisted saves all read `status_effects[id]` as an int.
- **Verification**: `make check` 1363 → **1375** (6 skipped), 12 new tests including a same-session code-review pass (8 findings folded in: seed-before-write, `status_rules.py` table + read clamp, `clear_status` seam, revive cleanup, companion reapply gate, pop badge, comments) and the concurrent burn+acid+shock+hacked regression with a mid-tick death. Browser: non-fallback `stray_incinerator` solo — two plasma-torch hits gave "🔥 burning!" → "🔥 burning! (×2)", DoT 2 → 4, roster `burn ×2`, canvas pip "2", 0 console errors (`outputs/live-qa/20260906-status-stacking/`).
- **Boundary**: local, undeployed. Stack-clear on expiry is unit-tested, not observed in the browser. The caps and the burn curve are a starting balance, not a verdict — play feel stays `[manual]`.

## M81 — mypy-strict quality-ladder seeds: mythos_core/mythos_loop/mythos_narrative/mythos_image_agent (2026-09-06)

- **Purpose**: 2026-09-06 quality-ladder seed batch, one `[auto:claude]` item per package — bring each already-clean package under `mypy --strict` without touching `pyproject.toml` (out of the claude lane's scope; see `docs/LESSONS.md`).
- **Output**: `python-typecheck` gained one `mypy --strict src/<pkg>` line per package (no pyproject edit). `mythos_core`: `dice.py`'s `list`/`weighted_choice`/`choice`/`shuffle` generic over a `_T = TypeVar`. `mythos_loop`: 4 bare `dict` args now `dict[str, Any]`. `mythos_narrative`: dropped an unused ignore on the lazy `google.genai` import in `gemini_provider.py`. `mythos_image_agent`: annotated `_require_mps`'s return type, typed `generator.py`'s kwargs dict, `cast(Any, ...)`'d 3 untyped diffusers pipeline-constructor calls in `pipeline_cache.py` (which freed 2 now-stale `load_ip_adapter`/`enable_model_cpu_offload` suppressions), and imported `load_image` from `diffusers.utils.loading_utils` (its actual defining module) instead of the package's implicit re-export, avoiding the 2 attr-defined errors without any suppression comment — the overnight loop's `10-diff-scope` verifier hard-rejects any commit adding one outside `*.md`, which is exactly what reverted this same seed's first attempt (`41e57f6`→`8890206`, runner.log 22:21–22:24).
- **Verification**: `make check` green after each package.
- **Boundary**: `mythos_runtime` and the combined-override seed remain open in `NEXT_PLAN.md`.

## Archive Reference

M0-M10의 상세 체크리스트, work log, verification log는 `bin/docs/archive/IMPLEMENTATION_M0_M10.md`에 보존한다.
