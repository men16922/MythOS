# AGENTIC_ENGINEERING — multi-agent parallel operation (bible)

> **General concept doc (bible).** This repo's application (3-engine · worktree · make) is → [`mythos/AGENTIC.md`](mythos/AGENTIC.md).

## Definition
Engineering that **organizes multiple headless agents by role, isolation, and gates** so they collaborate without conflict. A single agent does not do everything. An orchestrator decomposes and assigns work, and specialized agents execute each in their domain.

## 1. Block conflicts by "structure"
Concurrent-write conflicts are blocked by **isolation**, not willpower. Keep three axes non-overlapping:
1. **Work-tree isolation** — a different worktree+branch per agent → they cannot touch the same file at once.
2. **Lane separation** — agent-suffix tags on backlog tasks → two agents don't pick the same item.
3. **Domain split** — per-agent directory ownership → merge conflicts are effectively nil.
4. **Shared-doc convention** — docs all three touch are append-only + merge=union, or each toggles only its own lane's one line.

## 2. Role Specialization (Builder ≠ Reviewer ≠ Researcher ≠ QA)
| Role | Responsibility |
| --- | --- |
| Orchestrator | Task decomposition · lane assignment · result integration · conflict resolution · final approval |
| Builder | Implement · refactor · write tests · pass gate |
| Reviewer | Read-only audit of git diff (bugs/edges/missing tests/drift). **Does not modify code** |
| Researcher | Investigation · doc analysis · draft (image/content) generation |
| QA | E2E · browser · screenshot verification |
Roles aren't free (token/coordination cost). For a small repo it's reasonable for the Builder to also be the Orchestrator.

## 3. Creator ≠ Reviewer (the core loop)
Separate the building agent from the auditing agent to reduce **self-confirmation bias**:
```
Builder creates → integrate → Reviewer read-only audit → feed findings back into backlog → Builder fixes
```
The reviewer fixes neither code nor backlog directly — it only produces findings. The orchestrator reflects them into the backlog.

## 4. Deterministic vs non-deterministic lanes have different gates
- **Deterministic (code)**: gate green → auto commit. Safe.
- **Non-deterministic (image/content/feel)**: same input differs each time and judgment is "feel," so it can't be frozen into a gate
  → auto-commit only via an **integrity gate** (exists / matches spec), and aesthetic/narrative quality goes to **human review**. No fabricating missing assets.

## 5. Reasoning Sandwich
Planning = high reasoning, implementation = medium reasoning, verification = high reasoning. Using the top model at every stage is wasteful. Match the model tier to each stage.

## 6. Bounded intra-task subagents

Modern frontier models can coordinate subagents inside one task. Treat this as a second scale below worktree lanes:

- Use subagents for independent exploration, competing hypotheses, test design, log analysis, or read-only review.
- Prefer one agent for ordered chains, small tasks, slow external bottlenecks, or shared mutable writes.
- Default to at most three concurrent subagents. Give each a bounded deliverable and require root synthesis.
- All descendants inherit the mission's permissions, tool allowlist, budget, and evidence rules. A child cannot widen scope.
- Measure wall-clock and cost per verified outcome; parallelism that only increases tokens is removed.

Use model/version names only as adapter configuration. The orchestrator routes by capability and measured role quality,
not prestige: high-value planning/review may use a flagship model, while repetitive classification may use a cheaper
adapter after role-specific evals.

## 7. Sibling Concepts (bible)
- Higher harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · single loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- Context: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/AGENTIC.md`](mythos/AGENTIC.md)
