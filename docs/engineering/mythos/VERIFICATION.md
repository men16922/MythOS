# MythOS interpretation — VERIFICATION_ENGINEERING

> Maps [`../VERIFICATION_ENGINEERING.md`](../VERIFICATION_ENGINEERING.md) onto the plugin-owned
> controller and MythOS-owned verifier adapters.

## 1. Acceptance ladder

| Layer | Mechanism | Outcome |
| --- | --- | --- |
| Mechanical | actor gate plus controller rerun of `make check` | A committed HEAD builds, lints, typechecks, validates content/docs, and passes unit tests. RED is reverted. |
| Semantic | read-only `OVERNIGHT_CRITIC=auto` with `CRITIC_PROMPT.md` | Risky green-but-wrong diffs are independently reviewed. FAIL or unparseable INCONCLUSIVE is reverted. |
| Domain | executable `verifiers.d/*.sh` | Contract scope, focused gameplay oracles, browser evidence, and image identity are checked after the gate. |
| Human | `needs_human`, morning checklist, manual play | Subjective or unavailable evidence is preserved and queued; it is never mislabeled as accepted. |

The controller, not the actor's statement, decides completion. Every accepted or pending commit gets
a machine-readable evidence bundle tied to its mission, contract, commit, verifier versions/results,
and acceptance mode.

## 2. Mechanical gate

`GATE_CMD=make check` is authoritative and runs outside the actor after a new commit. It covers ruff,
eslint, mypy, TypeScript/Vite build, unittest, route content, skill sync, and entry-doc budgets.
Persistence, MinIO, external model, and live deployment checks remain explicit stronger gates.

Repeated semantic failures should move downward into deterministic tests or a verifier. Tests may not
be deleted and new suppression markers are rejected by `10-diff-scope`.

## 3. Semantic critic

The repo prompt extends the generic critic with MythOS invariants:

1. Runtime transitions stay behind `RuntimeSessionService` rather than being duplicated by adapters.
2. Existing migrations are immutable; schema changes add a compatible migration.
3. API payload changes update serializers, frontend contracts/call sites, or contract tests.
4. Generated frontend bundles are never the only edited behavior source.
5. Narrative, balance, visual composition, play feel, and product direction cannot be closed by a
   mechanical green gate.

`OVERNIGHT_CRITIC=auto` skips low-risk diffs and invokes a read-only reviewer on risk signals. Empty or
unparseable output is INCONCLUSIVE and fail-closed.

## 4. Registered verifier protocol

Every executable `scripts/overnight/verifiers.d/*.sh` is bounded by
`OVERNIGHT_VERIFIER_TIMEOUT` and receives:

- `$1`: commit range;
- `OVERNIGHT_CONTRACT_FILE`, mission id, engine name, and log directory via environment.

Exit protocol: `0 pass`, `1 hard fail`, `2 inconclusive`, `3 needs_human`, `4 repairable fail`.
Passes that are not relevant say so explicitly. Hard fail and inconclusive revert; needs-human durably
pauses the pending commit; repairable fail enters the bounded repair edge when enabled and otherwise reverts.

### Objective browser evidence

`30-browser-objective` reuses `browser-qa-filter.sh` and `browser-qa.sh` rather than owning browser
logic. Candidate UI/runtime diffs invoke the existing AGY live-QA hook. `PASS_CANDIDATE` and objective
`SKIP` pass; `FAIL_EVIDENCE` fails; missing tooling, uncertainty, or `NEEDS_HUMAN` routes to human.
Artifacts remain under `outputs/live-qa/<run_id>/`; QA ledger/dedup data remains under overnight logs.

### Image identity

`40-image-identity` checks only stable identity attributes against existing canonical art. A mismatch
fails. Missing canon, unavailable vision judge, excess batch size, or unparseable verdict becomes
`needs_human`. Composition, frame quality, and aesthetics remain human authority.

### Gameplay oracle

`20-gameplay-oracle` selects focused deterministic combat and route test modules from changed paths.
It is supplementary to the full gate, giving an explicit domain verdict in the evidence bundle.

## 5. Oversight boundary

- **Automated**: objective contract + complete mechanical/domain evidence.
- **Monitored**: browser/image or generic risk heuristic requires morning sampling/review.
- **Human decision**: verifier uncertainty, subjective product judgment, production/irreversible action,
  evaluator disagreement, or scope expansion.

The current manual checklist remains the source for unfinished human-play work. Human accept/reject
labels may later calibrate evaluators, but no evaluator silently expands its own authority.

Morning review starts with `$overnight-harness:overnight-report`. When objective browser bundles exist,
the MythOS-specific follow-up is `.venv/bin/python scripts/overnight/report-evidence.py`: include every
attention result, only its deterministic clean sample, and the omitted-clean count. This remains a
repo-owned evidence projection rather than a fork of the plugin skill.

## 6. Evidence locations

- `scripts/overnight/logs/events.jsonl`
- `scripts/overnight/logs/contract-*.json`
- `scripts/overnight/logs/gate-*.log`, `critic-*.log`
- `scripts/overnight/logs/evidence/bundle-*.json`
- `scripts/overnight/logs/REVIEW_QUEUE.md`
- `outputs/live-qa/<run_id>/`

## 7. Consumer graph smoke (P1 gate)

`make overnight-graph-smoke` is the acceptance ladder's meta-check: it verifies that the released
harness's own dispatch/trajectory/evidence machinery behaves correctly, independent of any MythOS
mission. It is offline and disposable — it runs throwaway local Git repositories (not this repo)
through the fake engine and requires all five terminal outcomes to reach their documented state
with deterministic trajectory replay and balanced evidence accounting: `design-blocked` (compiler
stop, no dispatch), `accepted` (green candidate, immutable evidence, corruption/drift rejected),
`reverted` (compensated to base), `repaired` (bounded revision closes green), and `paused`
(`needs_human` verifier keeps evidence, releases the claim).

Passing `overnight-graph-smoke` is a precondition for trusting the Mechanical/Semantic/Domain/Human
ladder above on any real mission. Its fixture trajectories are **not a real mission** and are not
acceptance evidence for one — they never substitute for `make check`, the semantic critic, or the
registered verifiers running against actual repo diffs.

Related: [`LOOP.md`](LOOP.md), [`HARNESS.md`](HARNESS.md),
[`../../plans/2026-07-18-overnight-harness-v2.md`](../../plans/2026-07-18-overnight-harness-v2.md).
