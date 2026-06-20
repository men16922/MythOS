# Project MythOS Status

Last updated: 2026-06-21

## Current Baseline

Project MythOS is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- Neo-Seoul 01 long-form scenario, Story Bible snippet injection, Codex.
- PostgreSQL persistence, MinIO assets, Redis visual queue/worker, OTel/Jaeger.
- Ollama narrative generation with repair/fallback and persisted outcome metrics. The narrative path is **dual-model**: storyteller (`OLLAMA_MODEL_STORY`=`gemma4:latest` 8B, free text) → parser (`OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct`, JSON structuring) split (`director.py`/`prompts.py`). Uncommitted batch (see 2026-06-14 PROGRESS_LOG).
- mflux/FLUX image generation, Redux character identity steering, async worker cleanup.
- Tactical combat engine, encounters, allies, skills/items, enemy intents, combat VFX Phase 1, CombatCinema full-body action pose swap.
- Run History, Meta Progression MVP, Save/Load UX, Ending Resolver, objective/choice-result feedback strip.
- FastAPI `/api/v1` REST/WS adapter and Vite React TypeScript SPA.
- Playwright E2E regression gate with updated timeline synchronizations.
- Combat presentation overhaul: basic action signal cards, self-targeting 2-poster layouts, and standalone utility skill cinematic zoom triggers.
- `combatAnim.ts` role/tags skill animation registry wired into `combatEffects.ts`; per-skill icon cut-ins (`skills/<skill_id>.png`) in `CombatCinema`. Motion variety (ally-grant pulse/shield, melee burst shockwave) + `prefers-reduced-motion` accessibility (global CSS + JS gating).
- Phase 4 `CombatControls` skill icon action bar: data-driven icon tiles + cost/range badges + cooldown overlay + FOCUS gating + tooltip.
- Drone enemies (`maintenance-drone`, `sentinel-drone`) promoted with full combat action sheets — 4 combat-art enemies total.
- Neo-Seoul P0 playability fixes: combat `encounter_reward.insight` is now persisted as meta progression, combat rewards are visible in the result panel, and early ambient forced combat is disabled unless pressure is high.
- Operation map route-node (Step 1~2b-4): deterministic procedurally-generated layered DAG (`route_map.py`, anchor pre-authored beats + multi-perspective + dynamic pool) + live progress/perspective/ending tallies (`route_runtime.py`) + director injection / edge=choice branch / combat-node combat trigger (`session.py`/`scenario_context.py`) + node graph view + anchor curated images (`scenes/<beat>.png`). Session memory (`session_memory.py`, `_beats` + rolling synopsis + previous-scene window, not RAG) for continuity/anti-repetition. Detailed design `bin/docs/plans/2026-06-07-route-node-procedural-map.md`. Remaining (2b): gauge effect integration + recovery loop, dynamic node title variety, remove `_map`.

Repo hygiene (2026-06-07):

- Junk removed (`.playwright-mcp`/`.antigravitycli`/`report.md`); historical docs/completed plans moved to `bin/` (only active plans in `docs/plans/`).
- `session.py` 1878→1349 lines: responsibilities split into `narrative_rollup.py`/`loop_scoring.py`/`combat_session_helpers.py`/`constants.py` (public API and import paths kept compatible). `scratch/` stays at root as it's the reusable asset pipeline.
- Doc cleanup: `ADULT_VISUAL_POLICY.md`→`IMAGE_POLICY.md` (image pipeline practical guide), `bin/reference.md`→`docs/REFERENCES.md` (design references).

Progression Phase 2·3 & Hotfixes (2026-06-07):

- Phase 2: insight point accrual (run+2/clue+1/win+1), `GET/POST /api/v1/players/{id}/skills` tree/investment API, Codex acquire/upgrade buttons, tier (requires) prerequisite gating. Combat-available skills are archetype base + learned only.
- Phase 3: epiphany notification banner (new unlocked skills from recent runs, localStorage one-time dismiss), cross-scenario unlock gating (`scenario.unlock`; Neo-Seoul unlocked by default, glass-library on tutorial completion).
- Hotfix: when viewing/learning Codex mid-run, merge the active loop's real-time epiphany list into unlocked_skills so LOCKED unlocks in real time.

Scenario Expansion / data-driven progression (2026-06-07):

- Progression grant moved to scenario.json data-driven (`archetypes[].unlock`·`combat.skills[].epiphany`+`combat.epiphanies`). Epiphany is unlock-only (auto-acquire removed) → consistent with insight acquisition. Fixed cross-scenario contamination + `load_scenario` lru_cache contamination bug. glass-library bolstered to progression/presentation parity (base_skills/archetype_base_skills/epiphanies/ui_copy).
- Hotfix: for local/live test dev convenience, bypass `scenario_unlock_met` in normal-run (non-test, e.g. non-unittest) state so `glass-library` unlocks without tutorial completion.
- Story Bible bolstered: `glass-library` snippets 10→17. Added (by phase/location/flags) the silent reading room, the un-returned corridor, the forbidden-book index, the Io trust branch, the censorship combat, the first records vault, and the ending afterglow.

Controllable Party Allies (2026-06-07):

- Combat turn loop generalized to controllable-actor stop. Allies in `_party.members` are directly player-controlled (stop on their turn, act per active actor); flag-unlocked non-party allies stay AI. Defeat = all controllable units down. UI shows current turn (player/ally).

Datamodel consolidation + play feedback UX (2026-06-09):

- M40 progression/inventory/equipment moved JSONB-on-row → dedicated tables (migration 005). `player_progression` (append-scan removed), `loop_inventory` (PostgresStore boundary dehydrate/hydrate, CombatService unchanged), equipment system (scenario `kind:equipment`+stats, `equip_item`, combat bonus, equip UI). Backfilled existing 36 rows. Details `bin/docs/plans/2026-06-09-progression-inventory-equipment-datamodel.md`.
- Play feedback UX Phase A/B done: state gauge numerics + description toggle, ending tendency description, board legend button + popup, drag-hint removed, loot inventory display bug fixed, ending/current-point moved to memory constellation, SPA bundle no-cache, in-combat consumable use button, board zoom, operation map zoom, action→move clarification, memory constellation stats/equipment/inventory integration.
- 4 Live QA UX follow-ups handled: operation map compact/detail layout split + legend grid, inventory by-type classification + icons, table-form `item_id` equip button display fix, empty state for 0 consumables.

Live LLM QA & repetition mitigation (2026-06-08):

- P0 live LLM long-session technical QA: in-process driver (in-memory store + real Ollama director, no Docker) verified gemma4 over 14 turns. Technical pipeline healthy (0 parse exceptions, choices always present, post-combat `choose(action=...)` resume, no stalls, normal loop end on defeat).
- F1 repetition mitigation: strengthened `build_session_synopsis` repetition-suppression guidance (no re-describing intro background + extra guidance when recent beat location is identical). 14-turn re-verify: 0 repetition detections, story advances. 2 regression tests. Remaining: F2 combat-frequency tuning, phase-explore stagnation check.
- Doc cleanup: 6 completed dated plans moved to `bin/docs/plans/` (only neo-seoul playability/live-feedback kept active), reference paths updated.

Recent verified baseline recorded in docs:

- **Overnight critic port + 2 companion UIs** (2026-06-21): ported plugin 0.5.0 critic/telemetry/RCA into the origin-tier runner (`OVERNIGHT_CRITIC=0|1|auto` read-only per-engine critic + auto risk-gate, `status.tsv` 9→13 cols, `CRITIC_PROMPT.md`, `status.sh` always shows main lane) + fixed `parse_usage` token over-count (per-block max, 88292→33272; same bug in plugin 0.5.0, handoff ready). A live overnight run (`=auto`) built + externally re-gated-GREEN the P0 affection gauge (`d3d6786`, Character tab) and P1 cutscene gallery (`17a42a2`, Codex tab); telemetry populated (~$5.4). Both UIs are compile/type/lint only (no FE test runner; critic auto-skipped both as low-risk) → `[manual]` visual QA pending (`docs/test/neo_seoul_live_qa.md §J`). PROGRESS 2026-06-21(c). main ahead 8; `loop/*` worktrees 16-18 stale.
- **WS4 image regen-on-reject loop + 11/11 skill icons** (2026-06-20): `scripts/overnight/image-regen.sh` + `make image-regen` (opt-in) — `GEN_ENGINE` (agy|codex) generate → claude vision-judge vs the peer-card frame bible → codex prompt-refine → FLUX fallback → integrity gate. **codex CAN generate images** (own in-session Imagen/Gemini, `PROMPT.codex.md:23`); `GEN_ENGINE=codex` skips the judge + the orchestrator collects from `~/.codex/generated_images/`. All 6 previously-missing Neo-Seoul skill icons generated + adopted (5 agy via judge-loop, nanoshield via codex) → fixes the combat-bar render gap for han/tae_o/su_ah. Heal/support skills now target a friendly-in-range (`engine.py` `friendlies_of`/`_friendly_target`, `available_actions.friendly_targets[]`). `make check` 461 green. Design `docs/plans/2026-06-20-ws4-image-regen-loop.md`. **Skill/icon integrity invariant now unblocked (icons present) but not yet implemented** — `test_assets.py` still excludes skill icons (~line 62).
- **LSP-first code navigation** (2026-06-19): Claude Code LSP enabled (`ENABLE_LSP_TOOL=1` + `pyright`/`vtsls` plugins from `boostvolt/claude-code-lsps`) — semantic def/refs/hover/call-graph over the whole `src/` (Python+TS). **Quarkify fully retired**: removed `tools/quarkify*`, `harness/check-quarkify.sh`, the `quarkify*` Makefile targets, `.gitignore` entry, and the `quarkify-poc` plan; policy in `CLAUDE.md`/`CORE_MANDATES §5`/`engineering/mythos/CONTEXT.md` switched to LSP-first (grep for rare literals / non-LSP engines). DECISIONS 2026-06-19.
- **Token/context optimization** (2026-06-19): agent-only operational docs (CLAUDE.md, `harness/*`, `docs/engineering/**`, `/sync` entry docs, skill bodies, overnight `PROMPT*.md`) converted Korean→English; narrative/user-facing content stays Korean ([[op-docs-english]], DECISIONS 2026-06-19). Measured -16.6% tokens on the converted set (fixed-cost set 22.7k→19.0k). NEW `harness/check-doc-budget.sh` in `make check` hard-gates entry-doc line caps. (Quarkify, briefly promoted as default broad-search, was **fully retired 2026-06-19** in favor of LSP-first navigation — see the LSP baseline above.)
- **`make check` green**: ruff + eslint + `mypy src tests` **0 errors/111 files** + tsc/vite-build + 320 unittests (skipped 2). Encounter balance invariant added (`test_encounter_balance.py`, two-sided guard: party winnable ≥0.50 / solo non-trivial ≤0.95, QA seed #5). This session zeroed mypy debt → overnight gate promoted to `make check` (COMPLETED_SUMMARY M42). CI is real (`.github/workflows/ci.yml`). Route+ending reachability invariant (`test_route_integrity.py`) + flag-reference/encounter integrity invariant (`test_content_integrity.py`) locked in (2026-06-14, QA seed #1·#2·#3·#4).
- **Engineering doc bible ↔ interpretation** (2026-06-14): `docs/engineering/` — 5 generic bibles (`{HARNESS,LOOP,AGENTIC,CONTEXT,PROMPT}_ENGINEERING.md`) + 5 `mythos/` interpretations (repo mapping). Old `docs/{LOOP_ENGINEERING,MULTI_AGENT}.md`→`mythos/{LOOP,AGENTIC}.md` moved, raw research→`bin/docs/archive/`. **/sync continuity**: Resume Pointer convention (`AGENT_BRIEF ▶ NEXT SESSION` + in-repo paths + 3 entry docs consistent). **Logging/dashboard**: `logs/status.tsv` ledger + `status.sh` aggregation tree + `make overnight-dashboard` (tmux). Entry points slimmed, skills 4-mirror consistent. Details `docs/plans/2026-06-14-engineering-plan.md` (only WS4 content pipeline plan-only).
- **3-engine parallel overnight harness** (`scripts/overnight/`, `docs/engineering/mythos/AGENTIC.md`): `ENGINE=claude|codex|agy` — worktree isolation (Model B) + lane tags (`[auto:claude|codex|agy]`) + integration merge (`overnight-merge`) + hybrid codex reviewer (generator≠reviewer, `overnight-review`) + failure mail (`notify.sh`) + claude→codex failover. End-to-end demonstrated with 3 parallel engines (each worktree's own-env `make check` green). agy/codex images use their own Imagen/Gemini, not FLUX (`outputs/agy/` staging→resources cp). **skills are git-tracked** (`.claude`/`.agents`/`.codex`/`.gemini`, 4 locations, no re-ignore — DECISIONS 2026-06-14). QA seed #1-4 locked in.
- Opening sequence consistency (2026-06-14): scene1=solo awakening (image-consistent), 4-beat onboarding (3 intro cuts as in-game beats), per-scene `image_sequence`, intro screen simplified. turn0/1 consistency verified with live Ollama.
- **Opening 5 cuts + 4 root fixes + prompt-layer separation Phase 0-2** (2026-06-16): debugging opening↔image drift, fixed 4 root causes (directive truncation→session_synopsis, phase-agnostic gating, novelty guard opening skip, raw-ID location→prose) + opening_escape 5th cut. Code↔prompt layer separation — authored directives moved to `resources/<scenario>/directives/*.md` (`scenario_directives.py` loader, `fallbacks.py` unified, opening→`opening.md` byte-parity). `make check` green (360). Details `docs/PROMPT_LAYER.md`·`docs/plans/2026-06-16-companion-affection-cutscenes.md`.
- frontend lint/build clean, `tests/playwright/test_e2e_play_checklist.py` green (refactored server startup included).
- `make smoke-local` succeeded (fallback narrative & visual smoke green).
- Redux worker live path: Redis queue -> mflux Redux -> MinIO -> presigned PNG GET 200.
- Combat assets: party of 6 (tae_o, han, su_a added) + 8 enemy types (Enforcer Unit, Glitch Wraith, Maintenance Drone, Sentinel Drone, Shock Trooper, Tracker Spider, Suppression Mech, Purge Drone), 70 `idle/attack/guard/skill/hit` `RGBA 512x768` at 512x768, 11 skill icons.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

0. **Companion affection + cutscene unlock + prompt-layer separation (nearly done, 2026-06-16)**: P0 affection runtime (seeds L/M/N/O — relationship dead-data activation: route reconcile + choice fold accumulation, meta cross-loop carry-over migration 006, serializer exposure) + Foundation Phase 0-4 / node-addressing (seeds C/D/I/J/K) + **P1 cutscene unlock backend** (branch `feat/companion-cutscene-unlock` commit `d8a8888` — `cutscenes.py` deterministic unlock + `MetaProgression.unlocked_cutscenes` migration 007 + `memory_overview.cutscene_gallery` + `CutsceneIntegrityTest`, `make check` green) done. **2026-06-19 backend merged to main** (fast-forward `8d2fc77..98d5f5c`, migration 006/007 applied to real DB, round-trip verified). **Remaining**: `[manual]` frontend affection gauge / cutscene gallery view (payload ready) + P2 Se-rin dedicated art + P1-a in-game cutscene node + Phase 5. Authority `docs/plans/2026-06-16-companion-affection-cutscenes.md`.
1. **Neo-Seoul playability upgrade (follow-up — human play QA)**: raise `neo-seoul` from a tech demo to a primary scenario with 30-60 min play satisfaction. Phase 1 doc finalized (Golden Path, fail/bypass Path, QA rubric), Phase 2 data bolstered (Story Bible 17→24 entries, playability choice axes/route branches/ending echo targets), Phase 3 data baseline (encounter learning goals/reward intent). P0/P1 first bundle done: combat reward insight applied, combat-result reward display, early forced ambient combat eased, encounter cooldown/difficulty cap, combat-defeat soft follow-up (`defeat_soft`), Codex rank pips/upgrade-complete banner, Run History + Echo/Shard/Insight dashboard, persistent objective/stakes display, choice value-axis/result summary. Tactical Board done through legend + tile inspector + learning-goal banner + board zoom/zoom-button correction + terrain badges (cover/high-ground) + right control panel bottom placement. Encounter difficulty tuning done (`build_encounter` per-spawn `overrides` + per-learning-goal numeric retuning, greedy-sim win rate 95~98%). Live LLM long-session technical QA done (pipeline healthy) + F1 repetition mitigation applied/re-verified. Next focus is real full-stack human play QA (`docs/test/neo_seoul_live_qa.md`) for objective/choice-result feel, D repetition / F speed feel, remaining route gate bias. Authority design `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`.
2. **Combat presentation upgrade**: done. Motion variety, reduced-motion accessibility, display position/scale/timing/legibility through Live QA done (user-confirmed). Generic manual QA doc retired; Neo-Seoul actual-play check items follow `docs/test/neo_seoul_live_qa.md`.
3. **Progression skills/archetypes**: done. Phase 1·2·3 done (archetype gates, base/learned filter, Codex insight investment tree, epiphany banner, cross-scenario unlock). Follow-up balance tuning within the Neo-Seoul play-satisfaction track.
4. ~~**Controllable party allies**~~: done (direct party-member control, non-party allies stay AI).
5. **Scenario expansion / glass-library**: hold. glass-library progression/presentation parity and Story Bible 17 entries done, but further extension is deferred until after Neo-Seoul completion improvements.

## Open Risks

- **push workflow (ongoing)**: private-repo push is a hard-block by the safety classifier so the agent cannot do it → user pushes directly (men16922's own account). As of 2026-06-19 origin/main is synced (cutscene backend + Quarkify tooling + route/chapter invariant merged, ahead 0). But live-QA narrative improvements are on unmerged branch `feat/neo-seoul-narrative-qa-fixes`.
- **LLM streaming first-token latency (resolved 2026-06-11, story 8B switch)**: the "TTFT 11.1s/done" claim was not reproducible. The measured root cause is **48GB RAM** (not 64GB) swap saturation — 26B (18GB)+FLUX image don't fit, so 26B gets evicted/paged-in and TTFT blows up 13→**43~127s**. **Decision/applied**: switched story model **`gemma4:26b`→`gemma4:latest` (8B, 9.6GB)** (head-to-head confirmed competitive Korean-prose quality, **warm TTFT 9~10s**, RAM-resident, coexists with FLUX). Parser is `qwen2.5:3b-instruct` (streaming path actually uses regex parser). Re-recommend 26B only on 64GB+ machines. Details `docs/DECISIONS.md`/`PROGRESS_LOG.md` 2026-06-11, re-measurement `scratch/ttft_bench.py`.
- **image vs curated duplication (resolved 2026-06-11)**: at anchors the frontend shows the curated image (`route_map.image`=`scenes/*.png`), but the backend was also running FLUX at those anchors, producing a never-displayed image + slow turns. Added a `_curated_anchor_image()` guard in `maybe_generate_scene_image` — if the current node is an anchor with an `image`, skip FLUX (frontend shows the curated image, so no visible change, just the slow turn removed). Regression tests `tests/test_visual_orchestration.py` 6 items.
- **operation map horizon not updating (live finding)**: the dynamic-routing act-2 horizon is reported as not refreshing mid-progression
  (old static loop leftover or a bug) — needs reproduction/fix. Choice→route node connection feel (C) also unresolved.
- Loading txt2img `Flux1` + Redux `Flux1Redux` simultaneously needs memory/swap monitoring in long play.
- `narrative_shards` raw rows are retained even after rollup; future pruning/status migration may be needed if DB size matters.
- Run summaries, meta progression, save slots, narrative metrics are JSONB memory records; heavy querying may justify dedicated tables later.
- Some detailed plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, and `PROGRESS_LOG.md` for current truth.
- Combat image quality varies widely per character. Prefer an action-sheet-based pipeline over independent pose generation.

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`
