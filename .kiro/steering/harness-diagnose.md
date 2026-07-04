---
inclusion: always
---


# /diagnose - root-cause-first protocol

Stops the highest-frequency failure mode: applying surface fixes against the wrong cause and
having to redo them. **Do NOT apply any fix until the cause is confirmed with evidence, and do
NOT report "fixed" without a before/after measurement.** Commit to the data, not the first
plausible theory.

## Procedure (leave evidence at each step - skipping one voids it)

1. **Reproduce + capture evidence.** Actually reproduce the failure and capture concrete
   evidence - logs (stderr/structured), timings, memory/swap (`vm_stat`/`top`/`free`), process
   state, a snapshot of the relevant files/state. If you can't reproduce, record that fact and
   the observed symptoms only, then go to hypotheses (still no speculative fix).
2. **2-3 competing hypotheses**, ranked by likelihood. Never write just one (confirmation bias).
   For each, state *what must be observed* if it's true.
3. **A measurement that distinguishes them.** Design and run one experiment/measurement that
   splits the hypotheses. Let the data point to the cause - do not conclude from reading code or
   reasoning alone; use numbers/logs.
4. **Fix only the confirmed cause.** Change the one thing the measurement implicated. No
   simultaneous speculative fixes (you'd never know which one worked).
5. **Re-measure to prove resolution.** Re-run the *same* measurement from step 1 and show
   before/after before reporting complete. Where possible, lock a regression guard
   (test/invariant) so the cause can't silently return.

## For an overnight gate-red

The runner/PROMPT hands you which gate phase broke. Start at step 1 on that phase: run the
individual gate stages (lint / typecheck / build / test) to isolate the failure, capture the
exact error, and record **phase + evidence** in the Blocker - never an opaque "failure".

## Rules

- **Forbidden**: fixing before measuring; multiple speculative fixes at once; "fixed" with no
  re-measurement; concluding a cause from reading code alone.
- If reproduction is expensive/impossible, state the limit and narrow hypotheses with the
  cheapest possible measurement - but still no speculative fix.
- Write long diagnostic logs/measurement dumps to a file, report only the conclusion + evidence
  summary (output discipline).
- This skill's job is **diagnosis**. Once the cause is confirmed, implement/refactor in the
  normal flow.
