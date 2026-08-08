# Project MythOS Next Plan

Last updated: 2026-08-09

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-0*.md`, individual designs in
`docs/plans/` (completed plans move to `bin/docs/plans/`).

## Hold — MythOS Dev Graph post-baseline owner gates

Authority: `docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`. Owner retained strict 12-turn acceptance and stopped repair rollout on 2026-07-28 after the valid clean arm returned 0/3; `OVERNIGHT_REPAIR=0`, bank v1 is never tuned/retried, and reopening requires preregistration + unseen bank v2 + fresh approval.

- `[ ]` `[manual]` **Harness remote publication** — push upstream commit/tag and update the public marketplace only on explicit approval; not required for local P2 evidence.

## Priority 0 — §3 HOLD follow-through before another promotion sample

Authority QA: `docs/test/neo_seoul_live_qa.md`; scope: `docs/reports/2026-07-31-late-loop-repetition-scope.md`. **Latest deploy = `mythos-api-00084-nt2` (2026-08-08; 100% traffic; renderer fix live); local `main` ahead, push owner-run — seven fix bundles are committed but undeployed.** Typed fallback evidence, combat pacing, structural novelty enforcement, and Gemini 3.1 image migration are live. The 2026-08-01 fresh-arm attempt (`loop_8b7a…60dc2`) was excluded at 13/14 (`parse_error`); it and the partial QA loop are evidence only.

- `[x]` **Normal-turn retry gap diagnose/fix** — root cause `RuntimeOptions.fast_mode=True` API default vetoing `_repair_enabled`; streamed retry now has its own fast_mode-independent gate, locked by `StreamedParseFailRetryTest`, deployed on `00082-ffc` (archive `progress-2026-08.md`, 2026-08-02).
- `[x]` **AMP-shard modal non-dismiss fix** — 409-already-consumed now clears the stale offer and closes the overlay; verified on a rendered local reproduction and deployed on `00083-jt7` (archive `progress-2026-08.md`, 2026-08-02).
- `[x]` **EN dialogue apostrophe split fix + deploy** — renderer treated the ASCII apostrophe as a quote delimiter and desynchronized quote pairing; fixed, locked, `make check` 1195, deployed as `mythos-api-00084-nt2` and confirmed in production (PROGRESS_LOG 2026-08-08).
- `[x]` **Fresh zero-fallback arm completed and banked** — `loop_426b710d…` reached `ending_erasure` after 59 scenes with **47/47 non-fallback**; banked as `scripts/eval/golden/prod-people-help-20260808.json`.
- `[ ]` `[manual]` **Owner subjective ending/overall verdict** on the banked arm, plus a ruling on whether the 22+25 two-revision generation split disqualifies it as the §3 promotion sample.
- `[x]` `[auto]` **EN localization sweep** — closed: all three banked EN transcripts (209 scenes) localize to 0 Hangul, locked by six tests; `make check` 1201 (PROGRESS_LOG 2026-08-08). The "34/59" scoping figure was a banking artifact — see that entry.
- `[x]` `[auto]` **Ended-run `summary_text` localization** — closed: `summarize_loop` now takes the loop's language on both paths (the LLM prompt hard-coded "Write the summary in Korean"; the deterministic path was Korean-only), and a raw state token like `combat_finished` no longer reaches player-facing prose. `make check` 1206 (PROGRESS_LOG 2026-08-08).
- `[x]` `[auto]` **Structural repetition, re-scoped** — closed at the reviser: the motif detector carried the scenario's premise vocabulary and fired on 91% of turns, and its single fixed template then fed its own repeated-title trigger (13 of 19 hits were its own output). Motif streak now 59%; consecutive revisions produce distinct titles; both locked (PROGRESS_LOG 2026-08-08).
- `[x]` `[auto]` **Repeated `Patrol Ambush` encounter** — closed: the downgrade took the highest-weight affordable encounter, and the risk cap is keyed to combats *won*, so a player who never wins is locked to the single tier-1 encounter. It now excludes the just-fought encounter and draws by weight, skipping the beat when nothing else is affordable (PROGRESS_LOG 2026-08-08).
- `[x]` `[auto]` **Clue counter + combat scene location** — closed: `_clues_collected` dropped the store's `limit` (default 8) and ignored shard kind, pinning the CLUE MATRIX gauge at 8/16 and desyncing the displayed Insight from the ending resolver's score; and combat scenes served the raw encounter id as `location`. The archived `clues_collected: []` was correct all along. `make check` 1218 (PROGRESS_LOG 2026-08-08, `b3143d8`).
- `[/]` **Residual objective/axis display gaps** — re-examined 2026-08-09, splitting into three outcomes. `[x]` **Portrait attribution was a defect**: the possessive guard rejected `X's voice` (the ordinary EN attribution), so IX matched nobody and the line fell through to Han; fixed and locked in both languages, owner 07-11 regressions re-verified dead. `[x]` **the reported symptom itself**: with two characters named, scenario array order decided the speaker; the speaker is now the name carrying a speech cue, and both portrait surfaces share one judgment. `[x]` **also found**: `"…," X says.` was not recognised as dialogue at all (33% of quoted spans in the arm). 16/16 probe (PROGRESS_LOG 2026-08-09). `[~]` **`CURRENT OBJECTIVE` missing — not reproducible**: `chapter_goal` covers all five playable phases, so the strip cannot go empty on a well-formed loop; needs the specific scene ids to go further. `[x]` **also a defect, not authoring**: both symptoms were one bug — `_choice_axis` matched a Korean-only vocabulary, so on an EN loop the axis collapsed onto an `intent` fallback that meant "Help people" (96/98 labels), and 43/45 multi-choice scenes shared one axis. Fixed with EN vocabulary, word-bounded keywords, and no chip when the label says nothing; 43/45 → 14/45 (PROGRESS_LOG 2026-08-09). `[ ]` `[manual]` residual: 40/98 choices now show no chip — if coverage matters more than precision, widen the vocabulary rather than restore a default.
- `[x]` **Flee odds are invisible** — closed: `_flee_preview` mirrors the resolver (0/45 mismatches across agility 0-8 × adjacent 0-4) and the button shows the %. Rendered on the non-fallback simulator: `85%` → `75%` as a drone closes. `make check` 1222 (PROGRESS_LOG 2026-08-08, `4ca1d80`). `[ ]` `[manual]` residual: whether the chip is legible mid-fight at 390px is a feel verdict.
- `[x]` **Author low-risk encounters** — closed: tier 1 went from one encounter to four (`ration_line_watch`, `stray_incinerator`, `refuge_perimeter_probe`), so the never-wins path serves 20/20 ambient beats across four fights instead of 1 fight + 19 skips. The balance simulator rejected the first draft at 0.93–0.98 solo; retuned compositions sit at 0.58–0.77 (`patrol_ambush` = 0.58). `make check` 1225 (PROGRESS_LOG 2026-08-08). `[ ]` `[manual]` residual: whether the new fights read as distinct in play is a feel verdict.
- `[ ]` `[manual]` **Upstream repetition** — with the reviser corrected, the residual 59% is the model genuinely reusing locations/motifs (title repeats 32%, location streak 33% measured independently). This is narrative prompt/context work and must wait for the owner's §3 verdict, since it changes generation.
- `[~]` **Stream-stall watchdog — DO NOT BUILD** — the runaway trickle was Chrome hidden-tab timer throttling of the client reveal (5–31 chars/min hidden vs 2,147 visible; server 7–26s). Withdrawn as a candidate; automated play must foreground the tab or reload to resync.

### Narrative clarity / content follow-ups (mostly `[manual]`)
- `[/]` `[manual]` **Full-3.5 live sign-off residuals**: fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn. Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs.
- `[/]` **CBT P1 residuals** (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`; P1-A..E + S1-S4 all DONE): `[ ]` `[manual]` S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: author per-archetype opening variations (directive-layer, `resources/neo-seoul/directives/opening.md` + KO/EN), gated on CBT priorities.
- `[x]` **Image continuity watch**: `00081-8lc` generated, delivered, and rendered new GCS-backed images with `gemini-3.1-flash-image` on `global`; the Cloud Run WS timeout is 3600s so deferred visual events survive long sessions. Curated key art remains the codex lane.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43)

- `[/]` **WS5 harness operation**: plugin V2 cutover DONE 2026-07-19 (`COMPLETED_SUMMARY` M63). **1.3.4 locally released/pinned; repair experiment CLOSED 2026-07-28 at strict-contract 0/3** (`COMPLETED_SUMMARY` M78; remote marketplace remains 1.2.0). `OVERNIGHT_REPAIR` stays **0**. Remaining:
  - `[ ]` `[manual]` **Model-B 3-lane demonstration** — first run one objective `make overnight-<engine>-once`, then arm+observe `make overnight-worktrees-setup` + 3 engines (burns real quota, owner-armed).
  - `[/]` **cross-engine critic** — first same-diff smoke run 2026-07-25 on commit `046edc8`: **codex REPAIR vs claude PASS (1/1 disagreement)**; the codex objection (blank_output classification) was intended design → clarifying comment added to `_classify_fallback_reason`. Remaining `[ ]` `[manual]` full 1-night trial `make overnight OVERNIGHT_CRITIC_ENGINE=codex` (needs seeded `[auto]` backlog; lane currently drained) — morning: REVIEW_QUEUE + disagreement rate.
  - `[ ]` `[manual]` **Graph P2 bounded read-only scatter/gather experiment (upstream)**: only after held-out-bank ratification and explicit multi-agent authorization; compare 2–3 immutable-input scouts against one agent on wall time/tokens/valid defects/duplication. P0-A/P0-B/P1-A/P1-B/P1-C are in the local 1.3.0 release (116/116); no write-lane fan-out.

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

T1-T4a + T5/T6 + Track M + T5a/T5b DONE 2026-07-08 → `COMPLETED_SUMMARY.md` M58. Open slices:

- `[ ]` `[blocked]` **T5c** (LARGE) 2D top-down toggle = second orthogonal render path. Precondition (human): owner confirms isometric still illegible @390px after T5a/b. NOT unattended-consumable — do not build on a guess. Promote to `[auto:claude]` after that judgment.

## Priority 1 — Neo-Seoul Playability Upgrade

Status: `[/]` in progress behind Priority 0; remaining work is mostly `[manual]` human play feel.

Goal: raise `neo-seoul` from a tech demo to a primary scenario a general user can play satisfyingly for 30-60 min. Authority design: `bin/docs/plans/2026-06-07-neo-seoul-playability-upgrade.md`; live feedback action plan: `bin/docs/plans/2026-06-07-neo-seoul-live-feedback-action-plan.md`.

Key criteria (compressed): 5-min goal/risk clarity · choices reveal the value axis · combat = consequence of pursuit/rescue/protection · progression informs the next loop · endings state saved/lost/carried.

### Live QA / play-feel (authority `docs/test/neo_seoul_live_qa.md`) — mostly `[manual]` live feel
- `[ ]` `[manual]` IX and route lifecycle live feel: boss fires end-to-end; Night Market→Kai feels causal; no visually locked node is entered.
- `[/]` `[manual]` #2 ending narrativization + #5 post-combat callback (code merged; remaining = live feel).
- `[/]` `[manual]` D narrative repetition + F streaming speed (mitigations wired; remaining = multi-turn feel).
- `[ ]` Opening montage repositioning + turn1 polish · P2 archetype meaning · Phase 4/5 RC. Detail → COMPLETED_SUMMARY M35-M40 + archive.

## Hold — Scenario Expansion / Glass Library

- `[~]` parity + Story Bible done (M38); held until Neo-Seoul satisfaction. `[ ]` main_arcs/endings·reward meta + combat art/skill depth expansion.

## Maintenance

- `[ ]` `[manual]` long-play Flux1 + Flux1Redux simultaneous-load memory monitor.
- `[ ]` `[blocked]` `_map` removal cleanup (held until route-node track done; engine records every scene + encounter_map coords·story_bible location·glass-library fallback minimap depend on it). Prereq: all scenarios converted to route_map. When met, promote to `[auto]` (codemod + `make check` green).
- One-time DB cleanups available on request (not scheduled): players wrongly promoted by the old ally-writeback bug (fixed `efa1c8f` 07-09) · simulator-born active loops occupying tester caps (sim admin-gated since 07-05).
- AGY live-QA findings: none open.
