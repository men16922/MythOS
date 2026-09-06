# Project MythOS Next Plan

Last updated: 2026-09-05

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-0*.md`, individual designs in
`docs/plans/` (completed plans move to `bin/docs/plans/`).

## Hold — MythOS Dev Graph post-baseline owner gates

Authority: `docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`. Owner retained strict 12-turn acceptance and stopped repair rollout on 2026-07-28 after the valid clean arm returned 0/3; `OVERNIGHT_REPAIR=0`, bank v1 is never tuned/retried, and reopening requires preregistration + unseen bank v2 + fresh approval.

- `[ ]` `[manual]` **Harness remote publication** — push upstream commit/tag and update the public marketplace only on explicit approval; not required for local P2 evidence.

## Priority 0 — §3 HOLD follow-through before another promotion sample

Authority QA: `docs/test/neo_seoul_live_qa.md`; scope: `docs/reports/2026-07-31-late-loop-repetition-scope.md`. **Latest deploy = `mythos-api-00089-lv8` (2026-09-06; adds the opening-cinematic/build-offer order fix and status-effect intensity stacking on top of `00088`).** Typed fallback evidence, combat pacing, structural novelty enforcement, and Gemini 3.1 image migration are live. The 2026-08-01 fresh-arm attempt (`loop_8b7a…60dc2`) was excluded at 13/14 (`parse_error`); it and the partial QA loop are evidence only.

- `[x]` **Priority 0 defect sweep closed 2026-08-02..08-14** (retry gap, AMP-shard modal, EN apostrophe split, fresh 47/47 arm banked, per-turn token usage, EN localization, ended-run summary localization, structural repetition, repeated `Patrol Ambush`, clue counter/combat location, flee-odds display, tutorial-tier encounters, and the full Korean-only-matching class — value axis chip, Se-rin refusal, portrait attribution, opening cinematic gate, character-art keyword, SFX prose/marker, combat trigger) — detail in `COMPLETED_SUMMARY.md` M79 and `bin/docs/archive/progress-2026-08.md`.
- `[/]` **Owner rulings on the banked arm** — `[x]` the 22+25 two-build split does not disqualify it (owner, 2026-08-13, DECISIONS); `[x]` rubric scored (`outputs/evals/20260814-005948/`: new sample 3/5, both 07-28 samples 2/5). `[ ]` `[manual]` the subjective **ending/overall feel verdict** is still open — and is now the *only* usable basis, since the score cannot carry the decision (below).
- `[ ]` `[manual]` **Upstream repetition** — with the reviser corrected, the residual 59% is the model genuinely reusing locations/motifs (title repeats 32%, location streak 33% measured independently). This is narrative prompt/context work and must wait for the owner's §3 verdict, since it changes generation.
- `[~]` **Stream-stall watchdog — DO NOT BUILD** — the runaway trickle was Chrome hidden-tab timer throttling of the client reveal (5–31 chars/min hidden vs 2,147 visible; server 7–26s). Withdrawn as a candidate; automated play must foreground the tab or reload to resync.

### Narrative clarity / content follow-ups (mostly `[manual]`)
- `[/]` `[manual]` **Full-3.5 live sign-off residuals**: fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn. Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs.
- `[/]` **CBT P1 residuals** (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`; P1-A..E + S1-S4 all DONE): `[ ]` `[manual]` S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: author per-archetype opening variations (directive-layer, `resources/neo-seoul/directives/opening.md` + KO/EN), gated on CBT priorities.

## Review residuals (2026-09-05 repo-wide review; verified but not yet done)

- `[x]` **Closed 2026-09-05** (detail PROGRESS_LOG 2026-09-05): `_commit_scene` pure reducer · Snapshot builders · Fetch-once progress facts · Intent telegraph vs `_enemy_turn` · WS pins a pooled DB connection per open socket · `requested_next_phase: "archive"` bypasses the soft-defeat guard · Refusal cannot clear a pre-seeded `met_se_rin` · Route replay re-scores passed anchors with later flags · Frontend `NarrationReveal` + `combatView.ts` · `combatCanvas` per-frame layout.
- `[ ]` `[manual]` **`_weapon_in_range(state=None)` high-ground +1 range is dead** (no caller passes `state`) — wire it or drop the parameter. Owner call; measured 2026-09-06 (`docs/reference/2026-09-06-status-stacking-balance.md` appendix): wiring changes 0.03% of range checks and no outcome in 24 cells; nothing promises it to players. Recommendation: drop unless a high-ground positioning feature is planned.
- `[/]` **Lesser substring matches** — `serializers._calculate_zone_risk` done 2026-09-05; `ending_resolver.py:111`/`audio_service.py:63` deliberately left (scoring semantics / no boss ids exist) — `[manual]` owner call if wanted.
- `[ ]` `[manual]` **Apply migration `008`** (`narrative_shards(player_id, created_at)` index) on the production DB.

## Serving-research track — open, needs no owner decision (design `docs/plans/2026-08-30-mythos-as-serving-research-workload.md`)

Scope is a research bench, **not** production self-hosting — the evidence puts that far out of range (`docs/reference/2026-08-30-self-hosted-inference-and-mythos-as-research-platform.md`). Two benches: 12GB CUDA (mechanism) and the 48GB M4 Max (quality/capacity).

- `[x]` **P0 instrumentation** — prompt trace + per-engine sampler adapter + `experiments/` harness; found/fixed two local sampler defects on the way (degradation 44% → 0%, PROGRESS_LOG 2026-08-30).
- `[x]` **P1-2 prefix-sharing curve** — done 2026-09-06 (`experiments/results/20260905-154138-workload-profile/`): 44 consecutive `generate_story` calls, 0 degraded, share median **68.1%**, early/mid/late 68.2/68.7/67.4%, slope −0.05 pct/pair → **flat**. Shared prefix ~10.6k chars is constant and the prompt grows only 15.2k→15.8k: the bounded synopsis keeps the ratio flat. Sets P3: E-A runs at a fixed ~68% partial share, not a falling curve.
- `[x]` **P0-2 residual: Ollama token usage** — closed 2026-09-05 (`cee577a`: `normalize_usage` reads the OpenAI `CompletionUsage` vocabulary, every `OllamaJSONProvider` call records it, streams request `stream_options.include_usage`; a local streamed turn logs `prompt_tokens`/`output_tokens`, director-level test).
- `[x]` **T4 — MLX capability check** — answered 2026-09-06 (`docs/reference/2026-09-06-mlx-lm-server-capability-check.md`): `mlx_lm.server` ignores `response_format`; `LRUPromptCache` reuses prefixes across requests but sliding-window models (Gemma 3/4) re-prefill fully (#980) while Qwen3 keeps the cache → bench B E-A runs on the Qwen3 ladder.
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

- `[x]` **2026-09-06 batch (8 owner-approved seeds) all landed** — ruff-format ×4 + lint wiring, PROGRESS_LOG compression, 14 `union-attr` suppressions → `_require_player`, `capture_trace` autoplay test. Detail: PROGRESS_LOG 2026-09-06 / COMPLETED M80 neighbours.
- **Seed judgment 2026-09-06 (supervised survey, nothing recorded)**: `[auto]` backlog is 0 and the deterministic debt the runner could consume is essentially gone — 0 TODO/FIXME, eslint clean, ruff ignores only E501, 6 skipped tests are all opt-in/optional-dep, the 6 `visual_service.py` `type: ignore`s were dead (removed in-session, mypy clean) and the 3 left in `pipeline_cache.py` are live diffusers typing gaps, and the one skip-prone harness test was fixed in-session (`experiments/harness.py` counter suffix). Larger candidates (`session.py` 3.9k lines, `combatCanvas.ts` 1.5k) need a `docs/plans/` snapshot first and are not unattended-safe. **Do not manufacture seeds** for the next run; seed only from a new owner decision (boss stack resistance, `_weapon_in_range`, migration `008`) once made.

## Rules

- Before starting work, read `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> this file in order.
- Leave a design snapshot for large work in `docs/plans/YYYY-MM-DD-<topic>.md`.
- After completion, keep only the latest summary in `docs/PROGRESS_LOG.md`; compress completed tracks into `COMPLETED_SUMMARY.md`.
- Record hard-to-reverse choices in `docs/DECISIONS.md`.

### Automation tags (for the overnight loop)

Inline tags (separate axis from `[x]`/`[/]`/`[ ]`/`[~]`) mark unattended-loop consumability (`scripts/overnight/`, `docs/engineering/mythos/LOOP.md`).

- `[auto]` — only locally/deterministically/offline verifiable (`make check`/`make smoke-local`); **must carry a 1-line completion criterion**.
- `[manual]` — human play-feel QA, content/Story-Bible authoring, balance/prompt-feel tuning, etc.; not unattended-verifiable.
- `[blocked]` — Blocker accumulated twice on the same item (runner appends automatically). Remove after human review. Also covers unmet prerequisites.
- **No tag = not an unattended target** (safe default). The runner consumes only `[auto*]` and never promotes untagged items.
- **MythOS live-QA verifier (repo-specific, not a tag)** — browser-observable commits route through `30-browser-objective`; objective failure rejects and unavailable/uncertain evidence becomes `needs_human`. Subjective feel stays `[manual]`. Detail `docs/engineering/mythos/LOOP.md` §4 · `VERIFICATION.md` §4.

**Engine lanes** (design `docs/engineering/mythos/AGENTIC.md`): engine suffix on `[auto]`; each engine consumes only its own lane.
- `[auto]` / `[auto:claude]` — claude lane (src/tests/harness/complex refactor·invariant). claude consumes both.
- `[auto:codex]` — codex lane (deterministic docs/scenario/story_bible refactor·verify; make check gate).
- `[auto:agy]` — agy lane (image draft + simple verify; resources/ image dirs only, integrity gate).
- Codex consumes the Claude lane only with explicit operator `OVERNIGHT_CLAUDE_FAILOVER=1`; there is no silent cross-engine failover.

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

- `[x]` **Statuses stack on reapplication + concurrent statuses resolve correctly** — done 2026-09-06 (PROGRESS_LOG): `status_stacks` ledger, caps burn 3 / corrode 2 / acid 2, freeze/shock/hacked pinned at 1, `StatusIntensityStackingTest` (incl. burn+acid+shock+hacked mid-tick-death regression), roster chip `×N` + canvas pip, browser-verified on `stray_incinerator`.
- `[ ]` `[manual]` **Stack feel verdict** — are caps 3/2/2 and the burn `1d4 × stacks` curve right in play, and is the badge pip legible at 390px? Owner call after a live loop. Baseline-policy evidence: `docs/reference/2026-09-06-status-stacking-balance.md` — 11/12 encounter×party cells unchanged, only `purge_incineration` solo drops 0.65→0.55 (burn ×3); **offensive side is the real question**: burn ×3 pre-placed on IX (synthetic upper bound) lifts the solo win rate 0.30→0.82 and 33% of those fights end with IX dying to a burn tick — decide whether bosses get stack resistance (cap 2 / halve DoT stacks on `ai == "boss"`, mirroring the 07-14 stun guard) or a decisive ×3 is the intended reward. Lever: one `StatusRule` row / engine guard.

## Hold — Scenario Expansion / Glass Library

- `[~]` parity + Story Bible done (M38); held until Neo-Seoul satisfaction. `[ ]` main_arcs/endings·reward meta + combat art/skill depth expansion.

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- One-time DB cleanups available on request (not scheduled): players wrongly promoted by the old ally-writeback bug (fixed `efa1c8f` 07-09) · simulator-born active loops occupying tester caps (sim admin-gated since 07-05).
