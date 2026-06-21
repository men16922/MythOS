# LOOP_ENGINEERING — autonomous unattended loop operation (bible)

> **General concept doc (bible).** This repo's application (runner · env · make targets) is → [`mythos/LOOP.md`](mythos/LOOP.md).

## Definition
An autonomous run loop that repeatedly invokes one prompt headless, where each iteration **restores state from a small context → implements one task and passes the gate → records → commits locally**. One iteration = one atomic unit of work. Because each iteration commits, **whenever it stops, loss is at most one iteration**.

## 1. Core Principles
| Principle | Why |
| --- | --- |
| **Fresh context per iteration** | New process each iteration → no context bloat/summarization. Re-read only the Read Path to restore. |
| **Iteration = one task + immediate commit** | Whenever a limit/crash hits, uncommitted loss is just one iteration. The next iteration takes over. |
| **Offline gate = commit gate** | If the deterministic gate (lint+type+build+test) isn't green, no commit → broken code doesn't accumulate. This is the mechanical layer; semantic critic and creative `[manual]` review sit above it. |
| **State on files** | Backlog · history · git history. Disk, not memory, is the source of truth. |
| **Least-privilege unattended run** | allow/deny boundaries block push · network · destructive actions (`HARNESS_ENGINEERING §4`). |

## 2. One Iteration Flow (loop-once)
```
restore state → recover leftovers (prior iteration's interrupted work) → pick one task from backlog
  → implement + pass gate → record → local commit → (pause) → repeat
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

## 4. Stop Conditions (backstops)
Backlog drained (DONE) · manual/red leftover (STOP) · max iterations · N consecutive failures · N no-progress. **Stop when done** (0 extra tokens).

## 5. Applicability Limits
This loop fits **hygiene/regression/refactor/codemod/deterministic-bugfix**. Do not use it for creative/feel/content authoring — the unattended gate can't verify those (that's `manual`, human QA).

## 6. Sibling Concepts (bible)
- Higher harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · commit verification: [`VERIFICATION_ENGINEERING.md`](VERIFICATION_ENGINEERING.md) · parallel multi-engine: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md)
- Context restore: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · iteration prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/LOOP.md`](mythos/LOOP.md)
