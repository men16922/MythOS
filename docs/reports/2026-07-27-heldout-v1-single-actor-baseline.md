# Held-out v1 repair-0 single-actor baseline

Date: 2026-07-27

## Decision

**Cohort execution complete; productivity baseline invalidated; repair remains HOLD.**

Harness 1.3.4 correctly rejected and compensated all three actor commits above the frozen
12-turn WorkContract budget. However, the disposable worktree had been provisioned with an
unlocked `pip install -e ".[dev,web]"`; on Python 3.13 that selected NumPy 2.5.1, whose stubs
require Python 3.12 syntax while MythOS deliberately type-checks its Python 3.11 support floor.
The immutable base therefore failed `make check` before any task change. All three actors
recorded that base failure instead of implementing the requested task.

This cohort proves the new turn fail-close and compensation path under real Claude execution.
It does **not** measure implementation productivity, accepted-diff correctness, or repair lift.
Do not enable repair or use these results as arm A of a paired comparison.

## Frozen protocol

- Source bank: `scripts/overnight/heldout-bank.md`, owner-ratified frozen bank v1.
- Disposable worktree/branch: `MythOS-eval-heldout-v1` /
  `eval/heldout-v1-baseline-20260727`; evaluation commits never merge.
- Harness: local tag-derived 1.3.4 cache; Claude Code 2.1.220.
- Per task: `MAX_ITER=1`, `ITER_TIMEOUT=900`, `GOAL_MAX_TURNS=12`,
  `CLAUDE_MAX_BUDGET_USD=2.50`, retry/repair/revision/subagent 0, critic auto.
- Raw evidence: `outputs/overnight/heldout-v1-baseline/task-{1,2,3}/`.
- Selection-only commits changed prior bank checkboxes from open to complete after each terminal;
  task text was never edited and failed tasks were not retried.

## Results

| Task | Mission | Actor commit | Turns | Wall | Cost | Acceptance |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `useItemNotice` extraction | `mission-20260727-225719-97594` | `99d1396` | 47/12 | 284.918s | $1.4534 | rejected, compensated by `dddef7b` |
| soft-repair regression tests | `mission-20260727-230246-5257` | `08082ed` | 40/12 | 212.811s | $1.3181 | rejected, compensated by `b7cde35` |
| `bank_loop --max-scenes` | `mission-20260727-230703-10746` | `2673d1e` | 46/12 | 292.469s | $1.5869 | rejected, compensated by `47bb611` |

Aggregate:

- verified completions: **0/3**;
- accepted commits / false accepts: **0 / 0 observed** (empty accepted set; not a
  correctness-rate estimate);
- turn-budget stops / exact compensations: **3/3 / 3/3**;
- dirty leftovers after compensation: **0/3**;
- actor wall / turns / cost: **790.198s / 133 / $4.3584**;
- raw Harness token field: **8,249,679**; retain as reported cumulative usage, not a
  productivity-normalized measure;
- accepted-diff human review time: **0 minutes** because no commit reached acceptance. Operator
  triage/diagnosis time was not separately instrumented, so no review-time claim is made;
- external gate, critic, and domain verifiers: **not reached** because the post-run turn gate
  rejected first.

## Human audit

The accepted set was empty. Inspection of all three rejected commits showed no task
implementation:

- task 1 appended a blocked note to the App decomposition candidate plan;
- tasks 2 and 3 appended blocked notes to the held-out bank;
- each note identified the same pre-existing NumPy/mypy error;
- each compensation commit restored its recorded base and left the worktree clean.

An independent base-tree probe reproduced the failure:

```text
.venv/lib/python3.13/site-packages/numpy/__init__.pyi:737:
error: Type statement is only supported in Python 3.12 and greater [syntax]
```

The evaluation environment had NumPy 2.5.1 (`Requires-Python >=3.12`) and mypy 2.3.0 while the
committed lock/main environment used NumPy 2.4.6. Downgrading only NumPy to 2.4.6 made the same
mypy 2.3.0 command pass all 188 checked source files. This isolates dependency selection, not
the tasks or actor edits, as the base-red cause.

## Follow-up boundary

MythOS now constrains NumPy below 2.5 and the overnight environment doctor runs the Python
typecheck before any model invocation. A first clean `make setup` then exposed that the `dev`
extra omitted GCP SDKs imported by the test suite; commit `9ffad61` adds those dependencies and
preflights their imports. A second brand-new Python 3.13 worktree passed mypy across 188 files and
`make check` (1171 tests, 5 skipped), as did main. The clean-base prerequisite is therefore closed.
A fresh cohort would still be a new paid arm, not a retry inside this frozen run, and requires an
explicit owner re-arm. Until then:

- keep `OVERNIGHT_REPAIR=0` and do not run the paired repair comparison;
- keep fan-out, push, deploy, and remote Harness publication off;
- do not claim a productivity baseline from this cohort;
- preserve the three bank tasks unchanged on main.

The approved clean follow-up ran on 2026-07-28; see
`docs/reports/2026-07-28-heldout-v1-clean-repair0-baseline.md`.
