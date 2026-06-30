# Project MythOS Next Plan

Last updated: 2026-06-30

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-06.md`, individual designs in
`docs/plans/`.

## Priority 0 — Companion affection + cutscene unlock + prompt-layer separation (current top priority)

Authority design: `docs/plans/2026-06-16-companion-affection-cutscenes.md`. Baseline: prompt-layer Phase 0-2 done (commits `751a37b`/`cfe6a2d`/`ed37c39`/`7fd91e5`, `docs/PROMPT_LAYER.md`).
Key finding: relationship deltas (`scenario.json` perspective/choice `effect.relationship`) were **authored but ignored at runtime (dead data)** — `route_runtime.py:96` applied only flags.

- `[/]` **Prompt-layer separation (Foundation)**: Phase 0-4 + node-addressing done. Remaining — `[ ]` Phase 5 system_prompt few-shot example extraction (cache-prefix sensitive, lowest priority).
- `[/]` **P1 cutscene unlock**: backend and frontend wiring/QA done. Remaining: `[ ]` in-game cutscene node appearance (P1-a, directive injection).
- `[/]` `[manual]` **P2 Se-rin cutscene**: `se_rin.md` 2 cuts authored. Remaining: `[ ]` adopt 2 dedicated arts from `outputs/experiments/adult/serin/imagegen/*.png` (IMAGE_POLICY) + image swap + live QA.
- `[ ]` `[manual]` **P3 companion expansion**: kai/lin_yue/tae_o/han/su_a cutscenes + promote 6 `side_arcs` to route side-anchors (WS-B track 2).

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43), only WS4 remains

- `[/]` **WS4 image regen-on-reject loop**: `scripts/overnight/image-regen.sh` + `make image-regen` (opt-in, human-launched) — `GEN_ENGINE` (agy|codex) generate → claude vision-judge vs frame bible → codex prompt-refine → FLUX-local fallback → integrity gate. **Live-validated 2026-06-20**: 6 skill icons generated + adopted (5 via agy judge-loop, nanoshield via codex). codex CAN generate (own in-session Imagen/Gemini, `PROMPT.codex.md:23`); `GEN_ENGINE=codex` skips the vision-judge + the orchestrator collects codex output from `~/.codex/generated_images/`. Design `docs/plans/2026-06-20-ws4-image-regen-loop.md`. Remaining: `[ ]` agy→codex content-pipeline (original WS4 broader scope, plan-only).
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
- **MythOS live-QA guard (repo-specific, not a tag)** — a commit touching browser-observable UI is auto-screened by AGY (`OVERNIGHT_BROWSER_QA=auto`, stop-on-FAIL); so *objective* UI refactor/codemod/wiring can be `[auto]` (criterion adds "post-commit AGY live-QA not FAIL/NEEDS"), while *subjective* feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §3.4.1 · `VERIFICATION.md` §4.

**Engine lanes (3 engines in parallel — conflict avoidance, design: `docs/engineering/mythos/AGENTIC.md`):** append an engine suffix to `[auto]` to
specify which engine consumes it. Each engine consumes **only its own lane** → two never pick the same item.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- When claude's quota is exhausted, codex consumes the claude lane instead (runner auto-failover, `run.sh`).

## Overnight QA Seed — automated content/balance integrity

> "Does it not break" (bot, deterministic) content/balance invariants. green=locked, red=Blocker surface. offline·`make check`.

- [x] [auto:claude] Content-integrity invariants for the 2026-06-27 archetype-id migration. Completion criterion: extend tests/test_content_integrity.py — (C1) every archetypes[].id unique & non-empty AND combat.archetype_loadout/archetype_base_skills key sets each equal the archetype id set (neo-seoul + glass-library); (C4) neo-seoul characters[].id unique & non-empty; (C2) every neo-seoul combat skill id has a skills/<id>.png icon (drop the test_assets.py skill-icon exclusion, neo-seoul only); make check green.
- [ ] [auto:codex] Clean up stale test_assets.py skill exclusion note in STATUS.md. Completion criterion: Remove the stale statement about test_assets.py skill icon exclusion in docs/STATUS.md.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress (current top track. Remaining is mostly `[manual]` human play QA + some `[auto]` QA seed).

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Realign gameplay, story immersion, choice consequences, combat pace, and progression rewards around a single play experience. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria:

- Within the first 5 minutes, the goal/risk/reason-to-follow-se_rin must be clear.
- Every scene's choices must reveal which of `people / evidence / safety / control` is being chosen.
- Combat must feel like a consequence of pursuit, operation failure, ally protection, and reward — without breaking narrative.
- Codex/Run History/progression must give info and rewards that make the next loop better.
- The ending must make clear what was saved, what was lost, and what carries into the next loop.

Completed (→ COMPLETED_SUMMARY M35–M40, M39): Phase 1–3 (Golden Path 45min·Story-Bible/choice-density·data baseline), P0 (insight meta·reward panel·ambient-combat ease·BGM/se_rin labeling), P1 (route-node map + session memory·Tactical Board legend/inspector·encounter difficulty tuning).

Open work:

### IX Boss Fight (CBT gap — climax is narrative-only, spawns generic drones). Authority `docs/plans/2026-06-30-ix-boss-fight.md`
- `[x]` `[auto:claude]` **IX boss DESIGN** — scenario.json: bestiary `administrator_ix` (boss-tier hp/skills/intents) + `ix_confrontation` encounter (IX + adds + hazards) + wire route `boss` node → it + IX skill defs + content/balance tests; commit **placeholder sprites** (cp suppression-mech) so make check green. Criterion: `make check` green + boss node resolves to `ix_confrontation` (IX present) + balance invariant. **DONE 2026-06-30** (`make check` 611 green): data-driven boss (hp38/def13/armor2 + `ix_optimizer_beam` 1d10 + 2 adds + 10×7 arena); boss pool → `["ix_confrontation"]`; party-win 0.68/solo 0.00; placeholder sprites pending codex art. Enemy AI ignores skills → boss via stats/weapon/adds (not player-tree skills); not in Director `start_combat` (route-node-only). See PROGRESS_LOG.
- `[x]` `[auto:codex]` **IX combat IMAGES** — **DONE 2026-06-30** (codex in-session Imagen). Real IX portrait `enemies/administrator-ix.png` (1024²) + 5 poses `enemies/combat/administrator-ix-{idle,attack,guard,skill,hit}.png` (512×768) generated + overwrote the suppression-mech placeholders. Character-consistent ARK-white control-AI colossus (crowned helm, diamond core, cyan data-ring halo), poses on-spec (attack=optimization beam, skill=channel, guard=barrier, hit=glitch). **Scope correction vs the original line**: NO skill icons (IX uses a weapon `ix_optimizer_beam`, not player-tree skills — bestiary has no `skills`), and the real peer sprites are **RGB** not RGBA. `make check` 611 green, only the 6 PNGs changed.
- `[x]` `[auto:claude]` **IX boss ENGINE track (skills + 2-phase enrage)** — **DONE 2026-06-30** (`make check` 616 green). Promoted IX from a data-only stat-block to a real patterned boss: enemy AI now casts skills (`_boss_skill_turn` in `engine.py`), so the `skill` combat pose finally renders for IX. Boss/enemy skills live in a NEW separate `combat.enemy_skills` pool (`ix_purge_field` phase-1 nuke + `ix_optimize_overload` phase-2-only burst) so they never pollute the player `combat.skills` tree / Codex / icon-integrity. Phase-2 **enrage** telegraphs + unlocks `phase:"enraged"` skills once HP ≤ 50% (`Combatant.enraged`, backward-compat serialization verified). Factory now wires `skills`/`focus`/`max_focus` for enemies. Rebalanced: party-win **0.68→0.58** (≥0.50 floor), solo 0.00; boss uses a skill in 100% of runs, reaches enrage in 98%. NEW `tests/test_combat_boss.py` (5) + headless sim `scripts/sim_boss.py` / `make sim-boss` (watch the fight turn-by-turn). **IX boss track (design + art + engine) now fully complete.**

### Live QA narrative improvements (2026-06-19, authority `docs/test/neo_seoul_live_qa.md`)

Narrative QA #1 and #3 done.
- `[/]` `[manual]` **#2 ending narrativization + #5 post-combat callback**: code merged, unit tests locked. Remaining = live feel.
- `[ ]` **#4 map in-layer choice destinations** · **#6 skill-tree RPG node graph** (separate track, frontend; analysis done).
- `[x]` Automatic AGY browser QA in overnight (WS-A..F) — done & default-on → COMPLETED_SUMMARY (guide `docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21).

### Opening sequence consistency (live_qa §1.1) — done (foundation), montage follow-up

- `[ ]` Pre-game montage repositioning: move the pursuit cut to a later beat to ease the time-spoiler where the montage runs ahead of in-game awakening.
- `[ ]` Full 4-turn human play feel (awakening→arrival→contact→pursuit, image transition·se_rin portrait sync).
- `[ ]` Minor: turn1 "corridor" word leaks once·title "Changed " prefix artifact, intro bullet chips (`·`) CSS polish.

### Human play QA findings (live_qa §0/§1-6) — A/B/C/E/G done, F·D remaining

- `[/]` **F streaming speed**: root cause RAM shortage identified + dual-model narrative (8B story → 3b parser) wired·context 8192 cap applied. Remaining: with user RAM freed, approach ~13s, actual multi-turn live feel. Design `bin/docs/plans/2026-06-10-dual-model-narrative-orchestration.md`.
- `[/]` **D narrative repetition**: synopsis truncation-drop fix (`session_synopsis` dedicated field fully rendered) + scene length/prefill cache fix. Remaining: actual multi-turn live feel.

- `[/]` P0-P2 mostly done (detail COMPLETED_SUMMARY M35-M40·PROGRESS archive; live LLM 14-turn QA pass·F1 repetition-mitigation·anti-stickiness·Tactical Board zoom·recovery/consumable/equipment·memory-constellation reorg·objective/stakes·choice-result summary). **Remaining**: F2 combat-frequency/streak tuning (observe) · Tactical Board touch pin lock · consumable/equipment balance · act-gate required-beat enforcement + inject current node into visual prompt · memory constellation tab subdivision · expand choice-result with relationship/Codex/Shard · objective act-transition gate · (op-map foundation done) static-scenario→route conversion (consider).
- `[ ]` P2 archetype meaning strengthening: unlock-milestone limits + differentiate opening/start-location/skills/items/NPC reactions.
- `[manual]` Codex Skill status wording (first-player feel). Button state logic (`deriveSkillAction`) is done.
- `[ ]` Phase 4 — objective/choice result/Codex feedback UX integration finish. `[ ]` Phase 5 — Neo-Seoul RC: manual QA (`docs/test/neo_seoul_live_qa.md`) + auto regression.

## Post-local — GCP 클로즈베타 (DEPLOYED LIVE)
- `[x]` **🚀 DEPLOYED LIVE (2026-06-29, rev `mythos-api-00003-fzb`)** — `https://mythos-api-1004528040791.us-central1.run.app` (Cloud Run us-central1 + Neon PG18 + Vertex/GCS), EN default + admin key(uncapped) + tester cap 10, keys `INVITE_KEY.md`. CBT 온보딩 UX(Option B 신원·게임식 Save/Load·초대 게이트)·EN end-to-end localization·Vertex 어댑터 3종·cost gating 전부 **DONE** → 상세 `COMPLETED_SUMMARY` M50 + `PROGRESS_LOG`(2026-06-29..30)·archive. **NEXT = human/비차단**: `git push origin main` · 결제 예산 알림 + Vertex 일일 쿼터(콘솔) · 피드백 Google Form → 종료화면 · `?invite=` 링크 배포 → r/playtesters(모집물 `CBT_TEASER.md`/`CBT_RECRUIT_POST.md`) · 오버나이트로 IX 보스(위) 소비 · (선택) Neon TRUNCATE 테스트데이터 리셋. 잔여 EN: K9 자연엔딩 스샷(사람 플레이), glass-library glossary, session `_outcome`. 런북 `docs/cloud/DEPLOY.md` §10. 전략 `docs/cloud/CLOSED_BETA_FEEDBACK_STRATEGY.md`.

## Hold — Scenario Expansion / Glass Library

Status: `[~]` progression/presentation parity + Story Bible 17 entries done (M38). Further extension held until after Neo-Seoul satisfaction improvements.

- `[ ]` `glass-library` main_arcs/endings·reward meta expansion (now main_arcs 4 / endings 4) + combat art/skill depth (now 5 skills, 4 enemies; new action sheets are follow-ups).

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- `[ ]` `[blocked]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 done (App.tsx 1261→696; hooks useInGameEpiphany/useCombatBoard/useTypewriter/useGameSocket/useCombatCinemaQueue/useSceneVisuals/useSessionLifecycle/useDataLoaders/useCombatRest/useSessionControls/useSnapshotReceiver/useNarrativeStream/useKeyboardChoice + shared `archetypes.ts`). Per-slice detail: `bin/docs/archive/progress-2026-06.md` + git. **slice 14 (`useViewModels`, view-model `useMemo` cluster) was committed green (`d7b3b35`) then HUMAN-REVERTED 8s later (`4d88b80`) — DO NOT re-attempt verbatim (deliberate revert; needed a 12-field props object = net-negative). `[blocked]` 2026-06-28 (2nd encounter, twice-blocked rule): remove the tag after a human names a different clean-boundary slice or closes the track._
- AGY live-QA findings (from `/overnight-report` triage of `logs/qa-findings.md`): None open (2026-06-21: 2 fixed — name-input `name` + favicon 204).
