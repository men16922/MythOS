# Project MythOS Next Plan

Last updated: 2026-06-19

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Companion affection + cutscene unlock + prompt-layer separation (current top priority)

Authority design: `docs/plans/2026-06-16-companion-affection-cutscenes.md`. Baseline: prompt-layer Phase 0-2 done (commits `751a37b`/`cfe6a2d`/`ed37c39`/`7fd91e5`, `docs/PROMPT_LAYER.md`).
Key finding: relationship deltas (`scenario.json` perspective/choice `effect.relationship`) were **authored but ignored at runtime (dead data)** — `route_runtime.py:96` applied only flags.

- `[/]` **Prompt-layer separation (Foundation)**: Phase 0-4 + node-addressing done (overnight seeds C/D/I/J/K — fallback/naming/stat/encounter→md generic defaults, `node=`/`beat=` lookup). Remaining — `[ ]` Phase 5 system_prompt few-shot example extraction (cache-prefix sensitive, lowest priority).
- `[x]` **P0 affection runtime** (`[auto]`, seeds L/M/N/O): accumulate `effect.relationship` into `state.relationships[name]` (route reconcile + choice fold, idempotent replay) + meta progression cross-loop carry-over (migration 006) + serializer exposure contract; integrity/accumulation tests green. **Remaining: `[ ]` `[manual]` frontend affection gauge UI** (serializer exposure done, visual feel QA only).
- `[/]` **P1 cutscene unlock**: backend **merged to main** (2026-06-19, migration 006/007 applied to real DB, round-trip verified) — `directives/companions/<name>.md` loader (`CutsceneDirective`) + deterministic unlock (`cutscenes.py`) + cross-loop union (migration 007) + `memory_overview.cutscene_gallery` + integrity (`CutsceneIntegrityTest`). **Remaining: `[ ]` `[manual]` frontend gallery view** (payload ready) · `[ ]` in-game cutscene node appearance (P1-a, directive injection).
- `[/]` `[manual]` **P2 Se-rin cutscene**: `se_rin.md` 2 cuts (thresholds 2/4) authored for P1-loader validation (placeholder portrait). **Remaining: `[ ]` adopt 2 dedicated arts from `outputs/experiments/adult/serin/imagegen/*.png` (IMAGE_POLICY) + image swap + live QA.**
- `[ ]` `[manual]` **P3 companion expansion**: kai/lin_yue/tae_o/han/su_a cutscenes + promote 6 `side_arcs` to route side-anchors (WS-B track 2).

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43), only WS4 remains

- `[ ]` **WS4 (plan-only)**: agy image draft → codex fitness review → add content item to NEXT_PLAN → codex final image generation pipeline. Authority `docs/plans/2026-06-14-engineering-plan.md`.
- `[/]` **WS5 harness hardening (backlog, derived from 2026-06-19 usage report)**: ① **DONE** — `/goal` integration (`run.sh` + plugin `templates/`): `OVERNIGHT_VERIFY_GATE` external re-gate at each commit → phantom-success revert + `gate_exit`/`commit_verified` columns in `status.tsv`; opt-in `OVERNIGHT_GOAL` /goal convergence. Measured phantom detection 0→100% (fault-injection). Design+실측 `docs/plans/2026-06-19-goal-in-overnight-loop.md`. Remaining ② auto morning digest at shutdown (`/overnight-report` is manual) ③ Model B 3-lane concurrent run demonstration ④ runner iter-output cap. Low-impact / already-mitigated, deprioritized. (diagnose-first `/diagnose` + gate-phase applied 2026-06-19.)

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order.
- Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md`.
- After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md`.
- Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

On an **axis separate** from status boxes (`[x]`/`[/]`/`[ ]`/`[~]`), inline tags mark whether the unattended overnight loop (`scripts/overnight/`,
`docs/engineering/mythos/LOOP.md`) can consume an item.

- `[auto]` — only for items verifiable locally/deterministically/offline (`make check` or `make smoke-local`).
  **Must carry a 1-line completion criterion** (prevents scope creep).
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.

**Engine lanes (3 engines in parallel — conflict avoidance, design: `docs/engineering/mythos/AGENTIC.md`):** append an engine suffix to `[auto]` to
specify which engine consumes it. Each engine consumes **only its own lane** → two never pick the same item.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- When claude's quota is exhausted, codex consumes the claude lane instead (runner auto-failover, `run.sh`).

## Overnight QA Seed — automated content/balance integrity

> "Does it not break" (bot, deterministic) content/balance invariants. green=locked, red=Blocker surface. offline·`make check`.

- `[x]` **Completed invariant batches (2026-06-14~16)** — detail in `COMPLETED_SUMMARY.md` (QA Seed integrity batch + M46) + PROGRESS archive: route/ending reachability, flag·encounter integrity, win-rate band (≥0.50·≤0.95), progression economy, weapons·equipment, skill data, archetype consistency, loot_table↔items, encounter numeric bounds, item.kind enum, story_bible meta, npc_agenda subject, FastAPI/dotenv codemod, doc compression; + seeds A-O (6 content-integrity invariants relationship/effect/ending/node-type/image/perspective + prompt-layer Phase 3/4a-c node-addressing + affection runtime L/M/N/O migration 006). Morning review PASS, origin/main pushed.
- `[x]` **2026-06-18 seeds P/Q (`[auto:claude]` player-facing data closure)** — `tests/test_route_meaning_and_goals.py` 2 items: ① route node `type` closure (all node_types/anchor types present in `session._ROUTE_TYPE_MEANING` → prevents junction-label generic fallthrough, fault-injection RED proven) ② `session_design.chapter_gates` player_goal completeness (every gate has non-empty player_goal + LoopPhase phase + turn_range format — prevents `_chapter_goal` act-strip blanks, content_integrity unscanned area). `make check` green (445, +2).
- `[x]` `[auto:claude]` **skill/ally data-closure invariant batch** (2026-06-20 seed): one test file adding ① `allies[].skills` ⊆ `combat.skills` (dangling 0) ② skill `requires[]` reference real skills + acyclic + tier-monotonic ③ skill `cost.item` ⊆ `items` (e.g. `patch_protocol`→`nanopatch`) ④ skill `epiphany` references a real epiphany trigger (icon-independent slice of the blocked icon-integrity item). Completion: 4 closure assertions in `tests/test_content_integrity.py`, fault-injection RED proven, `make check` green.
- `[ ]` `[auto:agy]` 6 skill icon drafts: draft `resources/neo-seoul/skills/<id>.png` for `emp_pulse`·`glitch_blink`·`memory_resonance`·`nanoshield_projector`·`signal_overdrive`·`system_intrusion` using IMAGE_POLICY + existing skill-icon style as bible (no placeholder fabrication). Completion: 6 PNGs exist·non-empty·spec-matching. (**2026-06-20 live finding**: this is the cause of han/tae_o/su_ah skills not rendering in the combat bar — only these 6 lack an icon. 2026-06-14 first batch aesthetically rejected — `outputs/agy/skills/VERDICT.md`; regenerate with a strict card template.)
- `[ ]` `[auto:claude]` **heal/support ally-targeting** (2026-06-20 live finding): `engine.py:533` `heal` (and `defense_bonus` shield) always applies to the caster, ignoring `action.target_id` → `patch_protocol`(나노패치 힐)/`nanoshield_projector` can't heal/shield an ally. Resolve `target_id` to a friendly-in-range (default self) for `role:healing`/support effects + `can_act` exposes friendly targets. Completion: ally-heal/shield unit tests in `tests/test_combat*`, `make check` green.
- `[blocked]` `[auto:claude]` skill/icon integrity invariant: every `combat.skills[].id` has `resources/neo-seoul/skills/<id>.png` + archetype base/learnable + `epiphany` unlock references a real skill. Completion: added to `test_assets.py`, green or Blocker. **Unmet prereq**: unblocked after the `[auto:agy]` 6 icons above are adopted/merged.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress (current top track. Remaining is mostly `[manual]` human play QA + some `[auto]` QA seed).

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria:

- Within the first 5 minutes, the goal/risk/reason-to-follow-se_rin must be clear.
- Every scene's choices must reveal which of `people / evidence / safety / control` is being chosen.
- Combat must feel like a consequence of pursuit, operation failure, ally protection, and reward — without breaking narrative.
- Codex/Run History/progression must give info and rewards that make the next loop better.
- The ending must make clear what was saved, what was lost, and what carries into the next loop.

Completed (summary): Phase 1 (Golden Path 45 min + fail/bypass Path + QA rubric → `docs/scenarios/01-neo-seoul-connect.md`),
Phase 2 (Story Bible/choice density + `scenario.json` playability meta), Phase 3 data baseline (encounter learning_goal/reward_intent).
P0 (`encounter_reward.insight` meta applied, combat-result panel reward display, early forced ambient combat eased, BGM/se_rin labeling Live QA, encounter reward baseline update).
P1 operation map route-node-ification + session memory (→ COMPLETED_SUMMARY M39), Tactical Board legend/tile inspector/learning-goal banner, encounter difficulty tuning (per-spawn `overrides` + per-learning-goal numerics).

Open work:

### Live QA narrative improvements (2026-06-19, authority `docs/test/neo_seoul_live_qa.md`)

Narrative QA 4 items **merged to main** (`..44fd4e7`). Follow-ups (narrative architecture doc·BGM toggle·api log visibility·opening manual choices) on branch **`feat/narrative-doc-bgm-logging`** (pushed, unmerged, green 454).
- `[x]` `[manual]` **#1 opening grounding + #3 IX threat rationale**: `opening.md` edit → **live PASS**.
- `[/]` `[manual]` **#2 ending narrativization + #5 post-combat callback**: code merged to main + unit tests locked in. Remaining = live feel.
- `[ ]` **#4 map in-layer choice destinations** · **#6 skill-tree RPG node graph** (separate track, frontend; analysis done).

### Operation map dynamic routing — done (foundation, detail in COMPLETED_SUMMARY/archive)

- `[/]` Follow-up: dynamic node title variety/dedup done. Remaining: inject current node into visual prompt, consider gradual conversion of static scenarios too.

### Opening sequence consistency (live_qa §1.1) — done (foundation), montage follow-up

- `[ ]` Pre-game montage repositioning: move the pursuit cut to a later beat to ease the time-spoiler where the montage runs ahead of in-game awakening.
- `[ ]` Full 4-turn human play feel (awakening→arrival→contact→pursuit, image transition·se_rin portrait sync).
- `[ ]` Minor: turn1 "corridor" word leaks once·title "Changed " prefix artifact, intro bullet chips (`·`) CSS polish.

### Human play QA findings (live_qa §0/§1-6) — A/B/C/E/G done, F·D remaining

- `[/]` **F streaming speed**: root cause RAM shortage identified + dual-model narrative (8B story → 3b parser) wired·context 8192 cap applied. Remaining: with user RAM freed, approach ~13s, actual multi-turn live feel. Design `bin/docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
- `[/]` **D narrative repetition**: synopsis truncation-drop fix (`session_synopsis` dedicated field fully rendered) + scene length/prefill cache fix. Remaining: actual multi-turn live feel.

- `[/]` P0-P2 mostly done (detail COMPLETED_SUMMARY M35-M40·PROGRESS archive; live LLM 14-turn QA pass·F1 repetition-mitigation·anti-stickiness·Tactical Board zoom·recovery/consumable/equipment·memory-constellation reorg·objective/stakes·choice-result summary). **Remaining**: F2 combat-frequency/streak tuning (observe) · Tactical Board touch pin lock · consumable/equipment balance · act-gate required-beat enforcement + inject current node into visual prompt · memory constellation tab subdivision · expand choice-result with relationship/Codex/Shard · objective act-transition gate.
- `[ ]` P2 archetype meaning strengthening: unlock-milestone limits + differentiate opening/start-location/skills/items/NPC reactions.
- `[manual]` Codex Skill status wording (first-player feel). Button state logic (`deriveSkillAction`) is done.
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX integration finish. `[ ]` Phase 5 — Neo-Seoul RC: manual QA (`docs/test/neo_seoul_live_qa.md`) + auto regression.

## Hold — Scenario Expansion / Glass Library

Status: `[~]` progression/presentation parity + Story Bible 17 entries done (M38). Further extension held until after Neo-Seoul satisfaction improvements.

- `[ ]` `glass-library` main_arcs/endings branch·reward meta expansion (currently main_arcs 4 / endings 4).
- `[ ]` glass-library combat art/skill depth (currently 5 skills, 4 enemies; new combat action sheets are follow-ups).

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[manual]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules. E2E-sensitive, so proceed gradually with live QA.
