# MythOS interpretation — LOOP_ENGINEERING

> Current implementation of [`../LOOP_ENGINEERING.md`](../LOOP_ENGINEERING.md). The generic
> controller is owned by the installed `overnight-harness` plugin; MythOS owns only policy,
> state, verifiers, and operator tooling.

## 1. Ownership boundary

| Owner | Files / responsibility |
| --- | --- |
| plugin | `templates/scripts/overnight/run.sh`, `lib/*`, status, dashboard, notify, engine adapters, claim/recovery, event ledger, gate/critic orchestration, verifier registry, evidence bundles |
| MythOS | `compile-contract.sh`, `verifiers.d/*.sh`, permission settings, `CRITIC_PROMPT.md`, backlog/docs, logs and sentinels, worktree/merge/review tools |

The repo intentionally has no fallback copy of `run.sh`, `status.sh`, `dashboard.sh`, or
`notify.sh`. `make overnight-where` prints the exact plugin root and runner in use.

## 2. Dispatch flow

```text
claim/reconcile → environment + capability probe → compile WorkContract
→ render lean contract prompt → one engine actor → require one local commit
→ external make check → read-only critic → registered MythOS verifiers
→ evidence bundle → accepted | rejected/reverted | needs_human
```

- A live claim rejects a second runner. A stale mission is reconciled to a typed terminal event.
- The MythOS compiler consumes only the top eligible lane item and fails closed when its Done
  criterion, scope, or verifier is missing.
- `drained` and `all-blocked` are distinct compiler outcomes; neither dispatches an actor.
- Gate or verifier `fail`/`inconclusive` rejects and reverts the new commit.
- `needs_human` preserves the commit as pending evidence, writes the review queue, and stops. It is
  not an automated acceptance.
- The loop never pushes or deploys.

## 3. Backlog contract

An unattended item is an open checklist line with a lane tag and an objective completion clause:

```md
- [ ] [auto:codex] Narrow refactor. Done: named tests and make check pass.
```

Lane selection:

- Claude: `[auto]`, `[auto:claude]`
- Codex: `[auto:codex]`
- AGY: `[auto:agy]`
- Kiro/OpenCode: their explicit engine tags

`[manual]`, `[blocked]`, untagged work, subjective play/narrative/balance/prompt/aesthetic work,
production changes, secrets, and irreversible actions do not compile. Optional
`OVERNIGHT_CLAUDE_FAILOVER=1` lets Codex consume the Claude lane, but it is an operator decision;
the controller does not silently switch engines.

## 4. MythOS verifier adapters

All executable scripts under `scripts/overnight/verifiers.d/` receive the verified commit range.
They return `0=pass`, `2=inconclusive`, `3=needs_human`, other=`fail`.

| Adapter | Responsibility |
| --- | --- |
| `10-diff-scope` | Enforce contract include/exclude paths; reject secrets, test deletion, and new verification suppression. |
| `20-gameplay-oracle` | Run focused deterministic combat/route unittest modules when those seams changed. |
| `30-browser-objective` | Reuse the candidate filter and AGY browser evidence pipeline; objective failure rejects, unavailable/uncertain review becomes `needs_human`. |
| `40-image-identity` | Compare changed character/enemy art to canonical poses; identity mismatch rejects, missing reference/judge becomes `needs_human`; aesthetics remain human. |

The full `make check` remains the authoritative offline gate. Stronger service/live checks stay
human-launched because they require infrastructure, model calls, or product authority.

## 5. Permissions and probes

- Claude loads `scripts/overnight/overnight-settings.json`.
- Codex is invoked with `workspace-write`, network disabled, approval `never`, and the resolved Git
  common directory as an explicit writable root. Before a Codex lane starts, a cached production-like
  disposable-repo probe must prove it can create a real commit.
- AGY is explicitly opt-in (`AGY_SKIP_PERMISSIONS=1`) and should run in an isolated worktree; its
  nondeterministic or aesthetic output remains monitored/human-reviewed.
- `scripts/overnight/env-doctor.sh` is offline and read-only: it verifies the existing Python and
  frontend environments but never installs from the network.

## 6. Operation

```sh
make overnight-where
make overnight-env-doctor
make overnight-codex-once       # first-chain smoke
make overnight-codex-watch      # background + log follow
make overnight-status
make overnight-stop
make overnight-clean
```

Use `ENGINE=claude|codex|opencode|agy|kiro` with the generic targets or the named aliases.
The Makefile always enables required WorkContracts, external verification, graduated oversight,
and the repo-write probe for Codex. Start from a clean worktree and seed executable lane items first.

Runtime state is ignored under `scripts/overnight/{logs,CLAIM,STOP,DONE}`. Evidence lives in
`logs/events.jsonl`, `contract-*.json`, `gate-*.log`, `critic-*.log`, `evidence/bundle-*.json`, and
`REVIEW_QUEUE.md`.

## 7. Parallel lanes

The plugin is deliberately single-runner. MythOS may run independent plugin instances in
`loop/{claude,codex,agy}` worktrees using `worktrees.sh`; `merge-loops.sh` and a human/Claude
orchestrator own integration. Shared writes are never made concurrently in one worktree. See
[`AGENTIC.md`](AGENTIC.md).

Design and synthesis: [`../../plans/2026-07-18-overnight-harness-v2.md`](../../plans/2026-07-18-overnight-harness-v2.md),
[`../../reference/2026-07-18-openai-anthropic-harness-synthesis.md`](../../reference/2026-07-18-openai-anthropic-harness-synthesis.md).
