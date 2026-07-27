# Held-out task bank — harness evaluation only (NEVER a tuning target)

Purpose (GRAPH_ADOPTION §3.4 / research doc §7 G4): a task set structurally separate from
`docs/NEXT_PLAN.md` so prompt/effort/contract tuning can never touch it. It is the anchor that
detects the repair edge's intrinsic failure mode — an actor learning to appease the reviewer —
which is invisible in completion counts alone.

## Protocol

- **Never** consumed by normal overnight runs: the runner compiles contracts from
  `docs/NEXT_PLAN.md` only; this file is used solely via an explicit evaluation dispatch:
  `PLAN_DOC=scripts/overnight/heldout-bank.md make overnight-once` (the runner's `PLAN_DOC`
  env default is NEXT_PLAN; the compiler receives it as `CONTRACT_PLAN_DOC`).
- **When to run**: only immediately before promoting a harness default — e.g. flipping
  `OVERNIGHT_REPAIR` 0→1, changing PROMPT/effort defaults, or swapping the critic engine
  default. Two comparison nights (arm A vs arm B) on this bank, then decide.
- **Where**: evaluation runs execute in a disposable worktree/branch
  (`make overnight-worktrees-setup`); main never merges bank commits, so tasks stay reusable.
- **Paired metrics (report both, always)**: verified-complete count WITH false-accept count
  (human-audit every accepted bank commit — the bank is small enough to audit 100%);
  cost/tokens per verified commit WITH dirty-leftover rate.
- **Composition changes**: owner-approved only. If a task leaks into normal work (someone
  fixes it on main), replace it here and note the swap below.

## Tasks (each `[auto:claude]`-shaped, deterministic, gate-verifiable)

- [ ] [auto:claude] Extract `useItemNotice` from `src/mythos_ui/src/App.tsx` (item-gain toast:
  `itemNotice` state + timer ref + `onItemsGained` body + auto-dismiss/clear lifecycle) into
  `src/mythos_ui/src/hooks/useItemNotice.ts`, behavior-preserving; banner JSX may stay in App.
  Done: make check green (frontend lint/build included) and App.tsx no longer owns the toast
  timer lifecycle. (Reserved from the slice-18 candidate doc — do NOT pick as a normal slice.)
- [ ] [auto:claude] Add engine-level regression tests locking the `choices_defaulted` and
  `choices_capped` soft-repair codes: an empty-choices payload and a 6-choice payload each
  commit through `LoopEngine.apply_scene_payload` and surface the expected code in
  `LoopTransition.repairs`. Done: make check green with both new tests in
  `tests/test_loop_engine.py`.
- [ ] [auto:claude] Add a `--max-scenes N` option to `scripts/eval/bank_loop.py` (bank only the
  first N scenes of a loop; default unchanged = all), with unittest coverage in
  `tests/test_narrative_eval.py` for the truncation path. Done: make check green; option
  documented in the module docstring.

## Swap log

- 2026-07-25: initial composition (3 tasks) authored during 1.2.0 adoption; owner may amend.
- 2026-07-26: mechanical re-audit PASS — all 3 tasks remain open in source, each has a deterministic
  Done criterion, none is copied into `docs/NEXT_PLAN.md`, and the Claude contract compiles with
  revisions/subagents both 0 plus gate/diff-scope/gameplay/browser evidence. This validates bank
  integrity only; owner composition ratification is still pending.
- 2026-07-27: owner ratified the three-task composition as **frozen bank v1** while directing the
  priority sequence through completion. Any replacement or task-content change requires a new
  recorded owner decision; evaluation commits remain disposable and must never merge to main.
