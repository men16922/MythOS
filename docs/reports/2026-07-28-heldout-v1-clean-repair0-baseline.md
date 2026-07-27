# Held-out v1 clean repair-0 strict-contract baseline

Date: 2026-07-28

## Decision

**The clean repair-0 arm is valid for the current strict contract: verified completion is 0/3.
Do not run repair-1 under the same contract.**

The fresh base passed the strengthened environment doctor and independent `make check` before
dispatch. Each Claude actor then produced a scoped commit and reported its own full gate green,
but reported 37, 28, and 27 turns against the frozen WorkContract limit of 12. Harness 1.3.4
rejected each commit before external verification, created an exact compensation commit, and left
the disposable worktree clean.

This is not a code-quality failure rate: the external gate, critic, and domain verifiers were never
reached. It is a valid result for the current acceptance policy: no candidate can reach a repairable
verifier edge, so a repair-1 arm cannot measure repair lift.

## Frozen protocol

- Source bank: `scripts/overnight/heldout-bank.md`, owner-ratified frozen bank v1; main unchanged.
- Base: MythOS `5cd1754`; disposable branch/worktree
  `eval/heldout-v1-clean-baseline-20260728` / `MythOS-eval-heldout-v1-clean-baseline-20260728`.
- Harness: explicit local tag-derived 1.3.4 cache; runner SHA-256 matched upstream `c9a8ff7`.
- Per valid task: `MAX_ITER=1`, `ITER_TIMEOUT=900`, `GOAL_MAX_TURNS=12`, retry/repair/revision/
  subagent 0, critic auto, no merge/push/deploy. Task 1's valid retry cap was reduced to $2.0325
  after excluded dispatch overhead; it completed at $1.1029, so the reduced cap was nonbinding.
- Raw evidence: `outputs/overnight/heldout-v1-clean-baseline/task-{1,2,3}/runner-logs/`.
- Selection-only commits advanced past tasks 1 and 2 after terminal compensation; evaluation
  commits never merge and bank v1 remains unchanged on main.

## Valid cohort results

| Task | Mission | Actor / compensation | Turns | Actor wall | Cost | Acceptance |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `useItemNotice` extraction | `mission-20260728-001737-99750` | `2078269` / `fbc4aea` | 37/12 | 196.259s | $1.1028513 | rejected before verification; exact compensation |
| soft-repair regression tests | `mission-20260728-002203-7325` | `14ef337` / `c2895cc` | 28/12 | 153.987s | $0.8024436 | rejected before verification; exact compensation |
| `bank_loop --max-scenes` | `mission-20260728-002519-13592` | `2885953` / `3f5cb57` | 27/12 | 153.826s | $0.8251566 | rejected before verification; exact compensation |

Aggregate:

- verified completions / accepted commits: **0/3 / 0**;
- false accepts: **0 observed** (empty accepted set; not a correctness-rate estimate);
- turn-budget rejects / exact compensations / dirty leftovers: **3/3 / 3/3 / 0/3**;
- actor wall / turns / cost / raw Harness tokens: **504.072s / 92 / $2.7304515 /
  4,927,960**;
- external gate, critic, and domain verifiers: **not reached** because turn acceptance runs first;
- accepted-diff human audits: **0 required**. Independent scope inspection found all three rejected
  commits limited to the selected task, its tests/generated frontend bundle where applicable, and
  the required bank checkbox; `git diff-tree --check` passed for each.

## Excluded operator incidents

The first `make setup` selected `/usr/bin/python3` 3.9.6 because the session PATH preceded
Homebrew. It failed the project's Python >=3.11 metadata before model dispatch. Re-running through
the supported `PYTHON=/opt/homebrew/bin/python3.13` Make variable selected Python 3.13.14, NumPy
2.4.6, mypy 2.3.0, google-genai 2.14.0, and google-cloud-storage 3.13.0.

The fresh worktree did not inherit main's ignored `.claude/harness-config.json`, so the first
dispatch resolved the Codex Harness 1.2.0 cache. The runner command exposed the drift; the process
was terminated, uncommitted changes were archived/restored, and the dispatch was excluded because
1.2.0 lacks turn acceptance. It consumed 15 turns, 60.650s, and $0.4674009, and triggered one
failure email before later runs set `HARNESS_NOTIFY=0`. Evidence is under
`outputs/overnight/heldout-v1-clean-baseline/invalid-runner-1.2.0/`.

Total actual spend including this excluded overhead was **$3.1978524**, below the approved $7.50.
Subsequent commands pinned Harness 1.3.4 explicitly and verified the runner SHA-256 before dispatch.

## Independent verification

- fresh preflight: imports green; mypy 188 files;
- immutable base `make check`: 1171 tests, 5 skipped;
- each valid ledger: 11 events, terminal reverted, balanced trajectory;
- each compensation tree exactly matched its recorded base with `git diff --exit-code`;
- final compensation-tree `make check`: 1171 tests, 5 skipped;
- final disposable worktree: clean.

## Follow-up boundary

Keep `OVERNIGHT_REPAIR=0`. With turn acceptance before verifiers, the observed 12-turn contract
provides zero repair opportunities, so spending on repair-1 would not test repair effectiveness.
Do not raise the threshold or retry after seeing bank-v1 outcomes: that would tune against the
held-out set. Owner decision recorded 2026-07-28: retain strict 12-turn acceptance, record
current-contract productivity 0/3, and stop the repair rollout. `OVERNIGHT_REPAIR` remains 0. Any
future reopening requires independently preregistered contract semantics, an unseen owner-ratified
frozen bank v2, and fresh cost approval; bank v1 is never tuned or retried.

Fan-out, remote Harness publication, push, deploy, and production actions remain separately gated.
