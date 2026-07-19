# LOOP_ENGINEERING — autonomous unattended loop operation (bible)

> **General concept doc (bible).** This repo's application (runner · env · make targets) is → [`mythos/LOOP.md`](mythos/LOOP.md).

## Definition
An autonomous run loop that executes a bounded **work contract** through one or more agent turns: **reconcile state → claim → act/checkpoint → verify evidence → review → record/commit**. An iteration remains one atomic commit unit, while a mission may span several iterations or sessions. Because each iteration commits, **whenever it stops, loss is at most one iteration**.

## 1. Core Principles
| Principle | Why |
| --- | --- |
| **Capability-aware context** | Continue within a stable mission when useful; checkpoint and reset on milestone, drift, timeout, context pressure, or engine failure. Re-read only the Read Path + mission checkpoint. |
| **Iteration = one task + immediate commit** | Whenever a limit/crash hits, uncommitted loss is just one iteration. The next iteration takes over. |
| **Offline gate = commit gate** | If the deterministic gate (lint+type+build+test) isn't green, no commit → broken code doesn't accumulate. This is the mechanical layer; semantic critic and creative `[manual]` review sit above it. |
| **State on files** | Backlog · history · git history. Disk, not memory, is the source of truth. |
| **Least-privilege unattended run** | allow/deny boundaries block push · network · destructive actions (`HARNESS_ENGINEERING §4`). |

## 2. One Iteration Flow (loop-once)
```
restore state → recover leftovers (prior iteration's interrupted work) → pick one task from backlog
  → compile/validate work contract → claim → implement/checkpoint → verify evidence → independent review
  → record → local commit → reconcile tracker → continue/retry/release
```
- **Leftover recovery**: a dirty tree at start = the prior iteration's interrupted leftover. If the gate is green, commit the recovery; if red, leave untouched + signal stop.
- **Outcome classification**: judge the iteration result as success/limit/failure structurally (no free-text grep — avoid false misjudgment).
  limit→wait then retry, failure→consecutive-failure count, success→check whether a commit appeared (HEAD diff) for the no-progress count.

## 3. Backlog Tagging — marking unattended targets
Tag automation on an **axis separate** from the status box:
- `auto` = locally · deterministically · offline verifiable. **One-line completion criterion required** (prevents scope blowup).
- `manual` = human feel/content/balance/feel judgment → not unattended-verifiable.
- `blocked` = accumulated failures or unmet precondition.
- untagged = not an unattended target (safe default). The runner consumes only `auto*`; no arbitrary promotion.
> **A thin backlog is normal**: the more a repo is creative/feel-heavy, the faster the `auto` backlog drains. Frequent no-progress exits are normal; for efficiency, **seed** `auto` items before running (regression backfill · codemod · lint/type debt · stale-doc cleanup).

Before dispatch, compile the selected item into a runtime work contract: goal, scope, allowed actions, budgets,
risk/oversight tier, executable evidence, and escalation rule. Markdown remains the human authority; the contract is the
machine control surface. Refuse unattended execution when no verifier or explicit human handoff is defined.

## 4. Stop Conditions (backstops)
Backlog drained (DONE) · human decision required · red leftover · max iterations/turns/tokens/wall time · stalled lease ·
N consecutive failures · N no-progress · repeated verifier disagreement. Distinguish timed-out, stalled, failed, and
canceled states because reconciliation and retry policies differ. **Stop when done** (0 extra tokens).

## 5. Applicability Limits
Full auto-accept fits **hygiene/regression/refactor/codemod/deterministic-bugfix**. Creative/feel/content work may still
enter the loop for candidate generation, objective replay, rubric prefilter, or evidence collection under the
**monitored** tier; only its irreducible taste residue remains a human decision. Never let a model judge silently become
the product authority.

## 6. Sibling Concepts (bible)
- Higher harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · commit verification: [`VERIFICATION_ENGINEERING.md`](VERIFICATION_ENGINEERING.md) · parallel multi-engine: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md)
- Context restore: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · iteration prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/LOOP.md`](mythos/LOOP.md)
