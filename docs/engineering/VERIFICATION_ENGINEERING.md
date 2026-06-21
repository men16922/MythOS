# VERIFICATION_ENGINEERING — what proves a commit is good (bible)

> **General concept doc (bible).** This repo's application (gate, critic, and human boundary) is → [`mythos/VERIFICATION.md`](mythos/VERIFICATION.md).

## Definition

A verification strategy that separates judgment into **mechanical, semantic, and creative** layers. Each layer owns failures it can decide reliably; work moves to a human only when neither deterministic checks nor a conservative read-only reviewer can decide it. One-line principle: **automate every check that does not need taste; reserve human review for the residue that does.**

## 1. The three layers

| Layer | Judge | Mechanism | Catches | Cannot prove |
| --- | --- | --- | --- | --- |
| **Mechanical** | Deterministic machine | Offline gate, rerun externally after every new commit | lint/type/build/test failures, forbidden patterns, contract-test breaks | untested regressions, scope creep, weakened tests |
| **Semantic** | Independent read-only LLM | Review only the committed diff after a green gate | green-but-wrong regressions, scope creep, test subversion, masking | aesthetics, game feel, balance quality, product judgment |
| **Creative** | Human | `[manual]` backlog and morning review | taste, visual quality, narrative feel, balance, strategy | nothing automatable by definition |

The layers form a filter cascade: mechanical always runs first; semantic runs when enabled or risk-triggered; creative work never enters the unattended `[auto]` queue.

## 2. Keep/revert composition

```text
agent commit → external mechanical gate
                 ├─ RED   → phantom-success: revert and count failure
                 └─ GREEN → semantic critic when enabled
                               ├─ FAIL → revert and count failure
                               └─ PASS → keep verified commit
```

- Agent-reported success is not proof; the runner reruns the gate outside the actor invocation.
- The critic fails closed only on concrete evidence and fails open on malformed or uncertain output. A parser glitch must not discard a mechanically green commit.
- Creative judgment does not block the loop because those tasks are tagged `[manual]` before selection.

## 3. Per-project specialization

| Layer | Specialization point |
| --- | --- |
| Mechanical | Repository gate command and permission boundary |
| Semantic | `scripts/overnight/CRITIC_PROMPT.md`, critic mode, and domain-specific invariants |
| Creative | `[manual]` criteria and morning-review checklist |

Recurring semantic failures should be promoted into deterministic tests whenever possible. A deterministic regression test is cheaper and more reliable than a probabilistic critic.

## 4. Principles

- **Push checks down the cascade:** test first, critic second, human only when judgment is irreducible.
- **Keep the critic conservative:** reject only concrete diff evidence, not style preferences or speculation.
- **A thin `[auto]` queue is correct:** creative projects naturally leave more work for `[manual]` review.
- **Make verdicts legible:** preserve gate logs, critic logs, and the human review checklist.
- **Do not confuse verification with scheduling:** kickoff automation, external reporting, auto-push, and goal routing belong to the host or operator.

## 5. Sibling concepts

- Parent harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · unattended loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- Multi-agent: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md) · context: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/VERIFICATION.md`](mythos/VERIFICATION.md)
