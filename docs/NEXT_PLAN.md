# Project MythOS Next Plan

Last updated: 2026-09-05

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-0*.md`, individual designs in
`docs/plans/` (completed plans move to `bin/docs/plans/`).

## Hold — MythOS Dev Graph post-baseline owner gates

Authority: `docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`. Owner retained strict 12-turn acceptance and stopped repair rollout on 2026-07-28 after the valid clean arm returned 0/3; `OVERNIGHT_REPAIR=0`, bank v1 is never tuned/retried, and reopening requires preregistration + unseen bank v2 + fresh approval.

- `[ ]` `[manual]` **Harness remote publication** — push upstream commit/tag and update the public marketplace only on explicit approval; not required for local P2 evidence.

## Priority 0 — §3 HOLD follow-through before another promotion sample

Closed items are folded out of this file (its rule: open work only) — 2026-08 defect sweep, 2026-09-05 review residuals, serving-research P0/P0-2/P1-2/T4, status-effect stacking, `_weapon_in_range`, the 2026-09-06 seed batch: see `COMPLETED_SUMMARY.md` M79–M80 and PROGRESS_LOG.

Authority QA: `docs/test/neo_seoul_live_qa.md`; scope: `docs/reports/2026-07-31-late-loop-repetition-scope.md`. **Latest deploy = `mythos-api-00089-lv8` (2026-09-06; adds the opening-cinematic/build-offer order fix and status-effect intensity stacking on top of `00088`).** Typed fallback evidence, combat pacing, structural novelty enforcement, and Gemini 3.1 image migration are live. The 2026-08-01 fresh-arm attempt (`loop_8b7a…60dc2`) was excluded at 13/14 (`parse_error`); it and the partial QA loop are evidence only.

- `[/]` **Owner rulings on the banked arm** — `[x]` the 22+25 two-build split does not disqualify it (owner, 2026-08-13, DECISIONS); `[x]` rubric scored (`outputs/evals/20260814-005948/`: new sample 3/5, both 07-28 samples 2/5). `[ ]` `[manual]` the subjective **ending/overall feel verdict** is still open — and is now the *only* usable basis, since the score cannot carry the decision (below).
- `[ ]` `[manual]` **Upstream repetition** — with the reviser corrected, the residual 59% is the model genuinely reusing locations/motifs (title repeats 32%, location streak 33% measured independently). This is narrative prompt/context work and must wait for the owner's §3 verdict, since it changes generation.
- `[~]` **Stream-stall watchdog — DO NOT BUILD** — the runaway trickle was Chrome hidden-tab timer throttling of the client reveal (5–31 chars/min hidden vs 2,147 visible; server 7–26s). Withdrawn as a candidate; automated play must foreground the tab or reload to resync.

### Narrative clarity / content follow-ups (mostly `[manual]`)
- `[/]` `[manual]` **Full-3.5 live sign-off residuals**: fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn. Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs.
- `[/]` **CBT P1 residuals** (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`; P1-A..E + S1-S4 all DONE): `[ ]` `[manual]` S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: author per-archetype opening variations (directive-layer, `resources/neo-seoul/directives/opening.md` + KO/EN), gated on CBT priorities.

## Review residuals (2026-09-05 repo-wide review; verified but not yet done)

- `[/]` **Lesser substring matches** — `serializers._calculate_zone_risk` done 2026-09-05; `ending_resolver.py:111`/`audio_service.py:63` deliberately left (scoring semantics / no boss ids exist) — `[manual]` owner call if wanted.
- `[ ]` `[manual]` **Apply migration `008`** (`narrative_shards(player_id, created_at)` index) on the production DB.

## Serving-research track — open, needs no owner decision (design `docs/plans/2026-08-30-mythos-as-serving-research-workload.md`)

Scope is a research bench, **not** production self-hosting — the evidence puts that far out of range (`docs/reference/2026-08-30-self-hosted-inference-and-mythos-as-research-platform.md`). Two benches: 12GB CUDA (mechanism) and the 48GB M4 Max (quality/capacity).

- `[ ]` `[blocked]` **Verify the unverified adapter rows** — `vllm`/`llamacpp`/`mlx` in `engine_options.py`; blocked until one of those engines is installed locally (none is, 2026-09-06). *Done when `make experiment ARGS=option-matrix` has been run against that engine and its row matches.*
- `[ ]` **P2 bench port** — add a `mythos` trace-replay scenario to `labs/wsl2-vllm-baseline/` so results sit in the same table as the study's `prefill`/`decode`.
- `[ ]` **P3 mechanism experiments** (bench A, vLLM): E-A prefix caching on real partial sharing · E-B ngram acceptance split between JSON scaffolding and prose · E-C structured-output mode vs schema-valid rate.
- `[ ]` **P4 judge noise floor** — **the same open decision the §3 promotion track carries** (median over N / pin the judge / drop the numeric gate). Gates every quality experiment; doing it once serves both tracks.
- `[ ]` **P5 quality × cost** (bench B, 48GB): quantization ladder, model ladder to 30B-class, Gemini-vs-local Pareto on the frozen bank. Blocked on P4.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43)

- `[/]` **WS5 harness operation** — V2 cutover + repair-rollout closure detail in `COMPLETED_SUMMARY` M63/M78; local pin now 1.4.0 (remote marketplace remains 1.2.0), `OVERNIGHT_REPAIR` stays **0**. Remaining:
  - `[ ]` `[manual]` **Model-B 3-lane demonstration** — first run one objective `make overnight-<engine>-once`, then arm+observe `make overnight-worktrees-setup` + 3 engines (burns real quota, owner-armed).
  - `[/]` **cross-engine critic** — first same-diff smoke run 2026-07-25 on commit `046edc8`: **codex REPAIR vs claude PASS (1/1 disagreement)**; the codex objection (blank_output classification) was intended design → clarifying comment added to `_classify_fallback_reason`. Remaining `[ ]` `[manual]` full 1-night trial `make overnight OVERNIGHT_CRITIC_ENGINE=codex` (needs seeded `[auto]` backlog; lane currently drained) — morning: REVIEW_QUEUE + disagreement rate.
  - `[ ]` `[manual]` **Graph P2 bounded read-only scatter/gather experiment (upstream)**: only after held-out-bank ratification and explicit multi-agent authorization; compare 2–3 immutable-input scouts against one agent on wall time/tokens/valid defects/duplication. P0-A/P0-B/P1-A/P1-B/P1-C are in the local 1.3.0 release (116/116); no write-lane fan-out.

## Overnight seeds
- **Seed judgment 2026-09-06 (supervised survey, nothing recorded)**: `[auto]` backlog is 0 and the deterministic debt the runner could consume is essentially gone — 0 TODO/FIXME, eslint clean, ruff ignores only E501, 6 skipped tests are all opt-in/optional-dep, the 6 `visual_service.py` `type: ignore`s were dead (removed in-session, mypy clean) and the 3 left in `pipeline_cache.py` are live diffusers typing gaps, and the one skip-prone harness test was fixed in-session (`experiments/harness.py` counter suffix). Larger candidates (`session.py` 3.9k lines, `combatCanvas.ts` 1.5k) need a `docs/plans/` snapshot first and are not unattended-safe. **Do not manufacture seeds** for the next run; seed only from a new owner decision (boss stack resistance, `_weapon_in_range`, migration `008`) once made.

Recorded 2026-09-06 (owner-approved, 16 seeds — quality ladder, all `make check`-verifiable; per-iteration ~15–25 min measured 09-06, `MAX_ITER=24`):

- `[blocked]` `[auto:claude]` mypy strict for packages already clean: add `[[tool.mypy.overrides]] module = ["mythos_memory.*", "mythos_combat.*", "mythos_api.*"]` with `strict = true` in pyproject. Done: override present, `make check` green. **Blocker (phase=commit, evidence=runner.log 21:23–21:33):** `pyproject.toml` is outside the claude lane's WorkContract scope (`src/ tests/ harness/ scripts/overnight/ docs/ Makefile`, `compile-contract.sh` `lane_scope`), so any edit to it is reverted by `10-diff-scope` regardless of gate/critic result — hit twice this session (`8938a82`→`3d6ff1b` at 21:32, then this iteration's own attempt reverted at `095bbe7`). Needs either a `MissionSpec:` reference widening scope or a supervised session; not unattended-claude-consumable as written. The four mypy-strict sibling seeds below share this exact blocker (each needs a pyproject override too) — do not re-attempt any of them unattended until the scope question is resolved.
- `[ ]` `[auto:claude]` `mythos_core` under mypy strict (5 errors: 3 type-arg, 2 no-untyped-def) + its strict override. Done: `.venv/bin/mypy --strict src/mythos_core` 0 errors, override present, `make check` green.
- `[ ]` `[auto:claude]` `mythos_loop` under mypy strict (4 type-arg) + override. Done: same criterion for `src/mythos_loop`.
- `[ ]` `[auto:claude]` `mythos_narrative` under mypy strict (1 unused-ignore) + override. Done: same criterion for `src/mythos_narrative`.
- `[ ]` `[auto:claude]` `mythos_image_agent` under mypy strict (8; the two diffusers `attr-defined` may keep targeted ignores) + override. Done: same criterion for `src/mythos_image_agent`.
- `[ ]` `[auto:claude]` `mythos_runtime` under mypy strict (21: 16 type-arg, 5 no-untyped-def) + override. Done: same criterion for `src/mythos_runtime`.
- `[ ]` `[auto:claude]` status-effect data closure test in `tests/test_content_integrity.py`: every `applies` status id in scenario weapons/skills/items ⊆ `status_rules.STATUS_EFFECT_IDS`; every id has `status_<id>_applied` + `_expired` in `log_i18n` (hacked: applied only), `board.status.<id>` in both i18n dicts, a `STATUS_BADGES` entry in `combatCanvas.ts`, and `resources/<scenario>/status/<id>.png`. Done: test exists and passes, `make check` green.
- `[ ]` `[auto:claude]` i18n key-parity test: the key sets of `src/mythos_ui/src/i18n/strings.ko.ts` and `strings.en.ts` are equal (567 today). Done: test exists and passes.
- `[ ]` `[auto:claude]` E2E selector source-lock test: every CSS selector / id the two `scratch/run_*e2e*.py` scripts wait on (`.boot-enter-btn`, `#display-name`, `.arch-card`, `#start`, `.intro-accept-btn`, `#play`, `.tab-btn`, `#codex-tab-content`, `#story-tab-content`, `.sl-modal`, `.sl-save-row`, `.sl-title`, `.sl-load-btn`, `.sl-close`, `#save-load-panel`, `.boon-overlay`, `.boon-card`, `#resume`, `#choices`) appears in `src/mythos_ui/src/**`. Done: test exists and passes.
- `[ ]` `[auto:claude]` ruff `C4` enabled in `[tool.ruff.lint] select` and its 6 findings fixed. Done: `ruff check .` 0 findings with C4 on, `make check` green.
- `[ ]` `[auto:claude]` ruff `SIM` enabled and its 27 findings fixed (SIM117 with-statements, SIM105, SIM102, …). Done: same criterion with SIM on.
- `[ ]` `[auto:claude]` ruff `PERF` enabled and its 25 PERF401 findings fixed. Done: same criterion with PERF on.
- `[ ]` `[auto:claude]` ruff `B` enabled with `per-file-ignores = {"src/mythos_api/**" = ["B008"]}` (FastAPI `Depends` convention) and the other 11 findings fixed (B905 zip strict, B009, B904, B039). Done: same criterion with B on.
- `[ ]` `[auto:claude]` remove test-side mypy suppressions in `tests/test_combat_*.py`, `test_encounter_balance.py`, `test_session_combat.py`, `test_cutscenes.py`, `test_portrait_combat_dock.py` via typed helpers (pattern: `_require_player`). Done: `rg 'type: ignore\[' <those files>` empty, `make check` green.
- `[ ]` `[auto:claude]` same for `tests/test_visual_orchestration.py`, `test_gemini_provider.py`, `test_narrative_trace.py`, `test_postgres_retry.py`, `test_overnight_plugin_adapters.py` (code lines only — the docstring that *mentions* the marker stays), `test_runtime_session.py`. Done: `rg 'type: ignore\[' tests/` matches only that docstring, `make check` green.
- `[ ]` `[auto:claude]` move CLOSED plan docs to `bin/docs/plans/`: `2026-07-25-app-decomposition-slice18-candidates.md`, `2026-07-26-combat-cinema-decomposition-candidates.md`, `2026-08-09-value-axis-vocabulary-coverage.md`, `2026-07-18-overnight-harness-v2.md`, updating every reference (`rg` the basenames across `docs/ harness/ CLAUDE.md .claude/`). Done: no reference to the old paths remains, `make check` (doc-budget) green.

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order · Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md` · After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md` · Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

Inline tags (separate axis from `[x]`/`[/]`/`[ ]`/`[~]`) mark unattended-loop consumability (`scripts/overnight/`, `docs/engineering/mythos/LOOP.md`).

- `[auto]` — only locally/deterministically/offline verifiable (`make check`/`make smoke-local`); **must carry a 1-line completion criterion**.
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.
- **MythOS live-QA verifier (repo-specific, not a tag)** — browser-observable commits route through `30-browser-objective`; objective failure rejects and unavailable/uncertain evidence becomes `needs_human`. Subjective feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §4 · `VERIFICATION.md` §4.

**Engine lanes** (design `docs/engineering/mythos/AGENTIC.md`): engine suffix on `[auto]`; each engine consumes only its own lane.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both · `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate) · Codex consumes the Claude lane only with explicit operator `OVERNIGHT_CLAUDE_FAILOVER=1`; there is no silent cross-engine failover.

## P1.5 — CBT feedback #3: Clarity & Responsiveness (design `docs/plans/2026-07-08-cbt-feedback3-clarity-plan.md`)

T1-T4a + T5/T6 + Track M + T5a/T5b DONE 2026-07-08 → `COMPLETED_SUMMARY.md` M58. Open slice:
- `[ ]` `[blocked]` **T5c** (LARGE) 2D top-down toggle = second orthogonal render path. Precondition (human): owner confirms isometric still illegible @390px after T5a/b. NOT unattended-consumable — do not build on a guess. Promote to `[auto:claude]` after that judgment.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress behind Priority 0, mostly `[manual]` human play feel. Goal: raise `neo-seoul` from a tech demo to a primary scenario playable satisfyingly for 30-60 min (design `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md` + `...-live-feedback-action-plan.md`). Key criteria: 5-min goal/risk clarity · choices reveal the value axis · combat = consequence of pursuit/rescue/protection · progression informs the next loop · endings state saved/lost/carried.

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` IX and route lifecycle live feel: boss fires end-to-end; Night Market→Kai feels causal; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel).
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

### Combat — status-effect stacking rework (owner decision 2026-08-15; design snapshot `docs/plans/2026-09-06-status-effect-stacking.md`)

- `[ ]` `[manual]` **Stack feel verdict** — are caps 3/2/2 and the burn `1d4 × stacks` curve right in play, and is the badge pip legible at 390px? Owner call after a live loop. Baseline-policy evidence: `docs/reference/2026-09-06-status-stacking-balance.md` — 11/12 encounter×party cells unchanged, only `purge_incineration` solo drops 0.65→0.55 (burn ×3); **offensive side is the real question**: burn ×3 pre-placed on IX (synthetic upper bound) lifts the solo win rate 0.30→0.82 and 33% of those fights end with IX dying to a burn tick — decide whether bosses get stack resistance (cap 2 / halve DoT stacks on `ai == "boss"`, mirroring the 07-14 stun guard) or a decisive ×3 is the intended reward. Lever: one `StatusRule` row / engine guard.

## Hold — Scenario Expansion / Glass Library

- `[~]` parity + Story Bible done (M38); held until Neo-Seoul satisfaction. `[ ]` main_arcs/endings·reward meta + combat art/skill depth expansion.

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- One-time DB cleanups available on request (not scheduled): players wrongly promoted by the old ally-writeback bug (fixed `efa1c8f` 07-09) · simulator-born active loops occupying tester caps (sim admin-gated since 07-05).
