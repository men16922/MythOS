# MythOS interpretation — AGENTIC_ENGINEERING

> Maps [`../AGENTIC_ENGINEERING.md`](../AGENTIC_ENGINEERING.md) onto MythOS's engine lanes and
> worktree operator tools. The plugin controller itself remains single-runner.

## Conflict prevention by structure

Parallelism is across isolated missions, not concurrent writers in one checkout:

1. one worktree and branch per engine: `loop/{claude,codex,agy}`;
2. one explicit lane tag per backlog item;
3. domain-aware scope emitted by the WorkContract compiler;
4. integration owned by a human/Claude orchestrator after each lane stops;
5. creator and reviewer are different roles where practical.

`PROGRESS_LOG.md` is append-oriented; lane actors touch only their own plan item. `STATUS.md` and
`AGENT_BRIEF.md` are integration/checkpoint surfaces, not simultaneous shared-write targets.

## Engine roles

| Engine | Lane | Typical work | Boundary |
| --- | --- | --- | --- |
| Claude | `[auto]`, `[auto:claude]` | complex deterministic code/refactor/invariants | repo unattended settings; no push/network/destructive commands |
| Codex | `[auto:codex]` | code/docs/resources with objective Done criteria; integration reviewer is a separate read-only invocation | workspace-write, network off, approval never, Git common-dir writable; real commit probe required |
| AGY | `[auto:agy]` | bounded image/resource drafts and browser evidence | explicit no-sandbox opt-in, isolated review branch, integrity/identity verifier, human aesthetic authority |
| Kiro/OpenCode | explicit engine lane | deterministic work with the same contract/gate/verifier chain | adapter-specific permissions plus contract scope |

Codex does not silently inherit Claude work. An operator may set `OVERNIGHT_CLAUDE_FAILOVER=1`; this
is visible in the compiled contract. AGY browser QA is evidence work and never closes subjective play
items.

## Two scales of delegation

- Cross-mission: separate plugin runners in separate worktrees.
- Intra-mission: the contract may budget up to three bounded subagents for independent exploration,
  diagnosis, test analysis, or read-only review.

The default MythOS Make targets set the subagent budget to zero. A child cannot widen scope,
permissions, network, production authority, or share a write target. Shared writes stay serialized.

## Environment fidelity

A worktree must not symlink the main checkout's `.venv` or `node_modules`: editable Python imports can
point at the wrong source, and frontend tools write shared temporary state. Use one of two modes:

- code lanes sequentially in the main checkout; or
- provision each code worktree's own environment with `make overnight-worktrees-setup` before launch.

Image/doc-only lanes may omit a code environment only if their contract and gate remain computable.
`env-doctor.sh` fails before dispatch when the required local environment is absent.

## Operation

```sh
make overnight-worktrees
make overnight-worktrees-setup       # required for parallel code lanes

(cd ../MythOS-loop-claude && make overnight-claude-watch)
(cd ../MythOS-loop-codex  && make overnight-codex-watch)
(cd ../MythOS-loop-agy    && make overnight-agy-watch)

make overnight-merge                 # local integration + gate, never push
make overnight-review                # independent read-only Codex review
```

Each worktree owns its ignored claim/log/sentinel state. Commits remain local. The orchestrator reviews
evidence and pending `needs_human` items before merging or pushing.

Related: [`LOOP.md`](LOOP.md), [`VERIFICATION.md`](VERIFICATION.md),
[`../../../bin/docs/plans/2026-07-18-overnight-harness-v2.md`](../../../bin/docs/plans/2026-07-18-overnight-harness-v2.md).
