# MythOS interpretation — HARNESS_ENGINEERING

> Maps [`../HARNESS_ENGINEERING.md`](../HARNESS_ENGINEERING.md) onto the current repo.

## Maturity: L3, with V2 control plane live

The 2026-07-19 cutover removed the divergent repo-local controller. The plugin now owns claim/recovery,
typed events, external contracts, engine adapters, verifier dispatch, evidence bundles, and graduated
oversight. MythOS owns its narrow policy and evidence seams.

Strengths now in operation:

- one authoritative offline `make check` gate plus external re-measurement;
- typed WorkContracts and lane/scope compilation before actor dispatch;
- real Codex repo-write/commit probe with network disabled and Git common-dir boundary;
- fail-closed semantic and domain verification with a distinct `needs_human` state;
- immutable evidence bundles and morning review queue;
- isolated multi-worktree operator tooling without forking the controller.

This is not L4. Remaining investments require measured benefit: evaluator calibration from human labels,
reliable long-lived mission continuation beyond one atomic commit, production observability loops, and an
entropy gardener broader than manual docs cleanup.

## Verification ladder

| Layer | MythOS mechanism |
| --- | --- |
| Change/turn | ruff, eslint, mypy, TypeScript build |
| Commit | unittest/content/doc/skill checks via `make check` |
| Independent review | read-only critic plus registered domain verifiers |
| Morning/integration | evidence queue, `$overnight-harness:overnight-report`, `overnight-review` |
| Merge/release | CI plus human play/aesthetic/product judgment |

## Permission boundary

- Claude: repo-local unattended settings allow named offline actions and deny push/network/destructive actions.
- Codex: controller forces workspace-write, network off, approval never, and a writable Git common dir; a
  disposable commit probe is mandatory for the Codex lane.
- AGY: unrestricted host access is explicit and isolated to a review worktree; evidence and human acceptance
  constrain nondeterministic output.
- All lanes: WorkContract scope + `10-diff-scope` enforce repo policy after the commit.

## Ownership and feedback

Portable behavior lives in the plugin. MythOS-specific checks live in `compile-contract.sh`,
`verifiers.d/`, tests, and engineering interpretations. A repeated review finding should be promoted
from a checklist to a deterministic test/verifier, then removed from prose when the executable guard is
the clearer source.

Generic lifecycle skills are plugin-owned and configured by `.claude/harness-config.json`; MythOS does
not keep unprefixed copies. After `$overnight-harness:overnight-report`, run
`.venv/bin/python scripts/overnight/report-evidence.py` when objective browser bundles exist. Its
attention set plus deterministic clean sample is the repo-specific evidence projection.

Related: [`LOOP.md`](LOOP.md), [`VERIFICATION.md`](VERIFICATION.md),
[`AGENTIC.md`](AGENTIC.md), [`PROMPT.md`](PROMPT.md).
