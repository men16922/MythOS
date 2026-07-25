# Project MythOS Next Plan

Last updated: 2026-07-25

This file keeps only upcoming (open) work as a rolling plan. Completed tracks live in
`docs/COMPLETED_SUMMARY.md`, detailed logs in `bin/docs/archive/progress-2026-0*.md`, individual designs in
`docs/plans/` (completed plans move to `bin/docs/plans/`).

## Priority 0 — Human live sign-off on the deployed bundle

Authority QA: `docs/test/neo_seoul_live_qa.md`. **Latest deploy = `mythos-api-00078-rs9` (2026-07-20; 100% traffic; pushed `c51cf63`)** — §3 alignment fix + custom icon set + skill loadout editor + aim badge are all live (`make check` 1161; health 200; app.js hash match). Owner-side Priority 0:

- `[/]` `[manual]` **§3 two-style verdict on the deployed bundle (`00078-rs9`)** — alignment fix live since `00077-8g9`. Remaining: two non-fallback deployed loops for the dull/sensitive and distinct-ending verdict (prior banked pair: `loop_22e71c...` people/help vs `loop_5b212d...` evidence→safety). Doubles as icon/loadout feel check.
- `[x]` **V2 reduction RATIFIED 2026-07-21** (owner): split = 5(+1 chip) auto / 8 monitored / 3 human (`docs/plans/2026-07-21-live-qa-reduction-split.md`); checklist active-play surface 16→3. Release calibrations keep running the 7-assertion contract per deploy.

### Narrative clarity / content follow-ups (mostly `[manual]`)
- `[ ]` remaining clarity item: Su-ah `잔향 가공사` rename (deferred). Deploy hygiene: use `make deploy` (pins .env project).
- `[/]` `[manual]` **Full-3.5 live sign-off residuals**: fresh-loop prose/tone/length verdict, Audrey EN retest, IX/companion/equipment/growth feel, authenticated production turn. Objective save/load/map/idempotency/support/loot/equip already passed via three AGY runs.
- `[/]` **CBT P1 residuals** (design `docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`; P1-A..E + S1-S4 all DONE): `[ ]` `[manual]` S4 카피 톤 검수(anchor/goal + 12 beat prose) · 6 variant intros in-game feel · decisions G2 twist tone(3 `twist_bank`)/in-layer pacing(C2)/overload-strike range(D5) · EN fresh-loop coherence retest.
- `[ ]` `[manual]` **Archetype-variant openings (long-term, 2026-07-04)**: author per-archetype opening variations (directive-layer, `resources/neo-seoul/directives/opening.md` + KO/EN), gated on CBT priorities.
- `[ ]` `[manual]` **Image continuity watch**: confirm the next app-path generation succeeds with pinned `gemini-2.5-flash-image` — 07-19 prod audit: zero app-path attempts since the pin (only the three pre-pin 3.1 404s), so the §3 non-fallback verdict loops double as this confirmation. Curated key art remains the codex lane (owner direction 2026-07-06).
- **Narrative eval bank (harness SHIPPED 2026-07-17)**: `scripts/eval/` (RUBRIC + `narrative_judge.py` claude-CLI judge + `bank_loop.py`; `make eval-narrative`). **2026-07-25: first real-loop run complete** — the 07-19 style pair was found in the LOCAL DB (prod prefix-resolve = 0 matches; script assumption corrected) and banked as `local-people-help`/`local-evidence-safety`; judge report `outputs/evals/20260725-234103/` scored 1–2/5, dominated by fallback-arm boilerplate + since-fixed leak bugs (byte tokens, `world_delta` dumps, `player_fled` codes) — treat as **baseline**, not a current-quality verdict. Remaining:
  - `[ ]` `[manual]` **bank 2+ deployed prod loops** during the owner §3 play on `00078-rs9` (agent banks by loop id after).
  - `[ ]` rubric scores accompany the §3 verdict as supporting data; later: `make eval-narrative` as a prompt/directive regression gate vs the 07-25 baseline.
  - `[ ]` **held-out split** (GRAPH_ADOPTION §3.4): once ≥4 loops banked, mark a held-out subset never scored while iterating prompts/directives; judge promotion only against it; always pair rubric with cost/loop + repetition/length compliance.

## Engineering maintenance track — WS0-3 done (COMPLETED_SUMMARY M43)

- `[/]` **WS5 harness operation**: plugin V2 cutover DONE 2026-07-19 (`COMPLETED_SUMMARY` M63). **1.2.0 adopted 2026-07-25** (typed verifier exits 4/3, 3-value critic PASS/REPAIR/FAIL, `budgets.revisions`, Makefile repair/critic-engine knobs; `docs/plans/2026-07-25-harness-120-adoption.md`). `OVERNIGHT_REPAIR` stays **0**. Remaining:
  - `[ ]` `[manual]` **Model-B 3-lane demonstration** — first run one objective `make overnight-<engine>-once`, then arm+observe `make overnight-worktrees-setup` + 3 engines (burns real quota, owner-armed).
  - `[/]` **cross-engine critic** — first same-diff smoke run 2026-07-25 on commit `046edc8`: **codex REPAIR vs claude PASS (1/1 disagreement)**; the codex objection (blank_output classification) was intended design → clarifying comment added to `_classify_fallback_reason`. Remaining `[ ]` `[manual]` full 1-night trial `make overnight OVERNIGHT_CRITIC_ENGINE=codex` (needs seeded `[auto]` backlog; lane currently drained) — morning: REVIEW_QUEUE + disagreement rate.
  - `[/]` **held-out task bank — precondition for `OVERNIGHT_REPAIR=1`**: constructed 2026-07-25 at `scripts/overnight/heldout-bank.md` (3 reserved tasks; compile sanity-checked via `PLAN_DOC=` override; eval runs on disposable worktrees; paired metrics mandated). Remaining `[ ]` `[manual]` owner ratifies composition; do not enable the repair edge before then.
- `[x]` **V2 human-load rollout — COMPLETE 2026-07-21**: evidence 3/3 (0 false accepts) → owner ratified **5(+1 chip) auto / 8 monitored / 3 human**; checklist restructured (직접확인 3 / 이상시기록 8), active surface 16→3 (81% reduction). Ongoing: 7-assertion contract per deploy; report attention list is the human touchpoint. Compress to COMPLETED_SUMMARY on next tidy.

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

- `[ ]` `[manual]` **M4** verify 7 `position:fixed` modals for scroll-lock/clip on phone.
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
- `[/]` `[auto:claude]` frontend god-component decomposition (App.tsx·CombatCinema): extract custom hooks/modules **one slice per iteration**, behavior-preserving. Done = `make check` green + post-commit AGY live-QA not FAIL/NEEDS (auto-screened, §3.4.1). _Progress: slices 1–13 + 15 + 16 + 17 done (slice 17 `useInviteGate` `fe1585c`, App.tsx →979; earlier detail archive + git). **slice 14 (`useViewModels`) HUMAN-REVERTED (`4d88b80`) — DO NOT re-attempt verbatim.** **Fresh survey DONE 2026-07-25**: `docs/plans/2026-07-25-app-decomposition-slice18-candidates.md` — A `useSaveLoad` (deepest) · B `useEpiphanyBanner` · C `useTabs` · D `useItemNotice` (D is RESERVED for the held-out bank — not a normal slice). After A+B the App.tsx half is a candidate for closing. Owner picks to unblock._
- One-time DB cleanups available on request (not scheduled): players wrongly promoted by the old ally-writeback bug (fixed `efa1c8f` 07-09) · simulator-born active loops occupying tester caps (sim admin-gated since 07-05).
- AGY live-QA findings: none open.
