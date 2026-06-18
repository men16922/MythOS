---
name: diagnose
description: Pin down the root cause of an unexplained bug/performance/render/failure issue with evidence before any speculative fix (reproduce → hypothesize → measure → fix → re-measure). Use on "왜 안 되는지", "원인 모르겠는 버그", "느린/멈추는 이유", repeated surface fixes, or an overnight gate-red. The enforced protocol behind `harness/CORE_MANDATES.md §5 Diagnose before any fix`.
---

# /diagnose — Root-cause diagnosis protocol

Stops the spinning of assumption-based surface fixes (the top friction in usage insights). **Apply no fix
before evidence confirms the cause, and never report "fixed" without before/after measurement.** Commit to
the data, not the first plausible theory.

## Procedure (leave evidence at each step — skipping invalidates it)

1. **Reproduce + capture evidence.** Actually reproduce the failure and grab concrete evidence — logs (`logs/`, stderr JSON),
   timing, memory/swap (`vm_stat`/`top`), process state, relevant file/state snapshots. If you can't reproduce, record only that
   fact and the observed symptoms, then move to hypotheses (no speculative fix).
2. **2-3 competing hypotheses**, ordered by likelihood. Don't write just one (avoids confirmation bias). For each,
   state *what should be observed* if it's true.
3. **A measurement that distinguishes hypotheses.** Design and run one measurement/experiment that separates the hypotheses.
   Let the data point to the cause (don't confirm by reading code/reasoning alone — use numbers/logs).
4. **Fix only the confirmed cause.** Fix the one cause the measurement pointed to. No simultaneous speculative fixes
   (you'd lose track of what fixed it).
5. **Prove resolution by re-measuring.** Re-run the *same* measurement as step 1 and prove resolution before/after, then
   report done. If a regression guard is feasible, lock it in with a test/invariant (`docs/engineering/mythos/HARNESS.md`
   Feedback Ladder: 3x+ → invariant).

## This repo's context

- **Gate**: `make check` (ruff+eslint+mypy+tsc/vite+unittest). On gate-red, first isolate **which phase broke**
  (run `make python-lint`/`typecheck`/`frontend-build`/`test` individually) — the phase is the first hypothesis.
- **Performance/stall**: measure where time goes among model load · prompt prefill · RAM/swap · I/O · duplicate workers
  (`scratch/ttft_bench.py`-style, `vm_stat`, Ollama `/api/tags` latency). 48GB RAM swap saturation was the past culprit.
- **Image/MPS**: model re-load · `PYTORCH_MPS_HIGH_WATERMARK_RATIO` · Flux1+Redux co-load memory.
- **Narrative/LLM**: gemma4 doesn't see the image (text only) → coherence issues are instruction fidelity. Confirm with 2 real Ollama regenerations.
- **Render/frontend**: assert only after observing the actual screen via live Playwright (`make test-e2e`).
- **overnight gate-red**: take the runner-classified phase pointer as input and reproduce from step 1 starting at that phase.

## Rules

- **Forbidden**: fix before measurement, multiple speculative fixes at once, "fixed" report without re-measurement, root-causing by reading code alone.
- If reproduction is expensive or impossible, state that limit and narrow hypotheses with the smallest feasible measurement (still no speculative fix).
- Long diagnosis logs/measurement dumps go to a file (e.g. `logs/`), not chat; report only the conclusion + evidence summary
  (`CORE_MANDATES §5` output discipline).
- This skill is **diagnosis**. Post-confirmation implementation/refactor follows the normal flow.
