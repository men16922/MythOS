# VERIFICATION_ENGINEERING — what proves a commit is good (bible)

> **General concept doc (bible).** This repo's application (gate, critic, and human boundary) is → [`mythos/VERIFICATION.md`](mythos/VERIFICATION.md).

## Definition

A verification strategy that composes **mechanical, behavioral, semantic/evaluator, and human** evidence. Each layer owns
failures it can decide reliably; work moves to a human only when risk, low confidence, evaluator disagreement, or
irreducible taste requires it. One-line principle: **automate every check that does not need taste; calibrate the rest;
reserve human review for exceptions and authority decisions.**

## 1. The four evidence layers

| Layer | Judge | Mechanism | Catches | Cannot prove |
| --- | --- | --- | --- | --- |
| **Mechanical** | Deterministic machine | Offline gate, rerun externally after every new commit | lint/type/build/test failures, forbidden patterns, contract-test breaks | untested regressions, scope creep, weakened tests |
| **Behavioral** | Runtime/browser/state replay | Reproduce the real flow and capture evidence | render, state transition, console/network, latency, trace regressions | subjective quality outside its assertions |
| **Semantic/evaluator** | Independent LLM or rubric judge | Review committed diff and evidence bundle | green-but-wrong regressions, scope creep, test subversion, rubric violations | stable human intent without calibration |
| **Human** | Owner/reviewer | risk-based exception + sampled audit | product direction, taste, ambiguous tradeoffs, evaluator drift | scalable exhaustive coverage |

The layers form a filter cascade: cheap deterministic checks run first; behavioral and evaluator checks run when their
evidence contract requires them; human review receives only authority decisions, low-confidence/disagreement cases, and
an audit sample.

## 2. Keep/revert composition

```text
agent commit → external mechanical gate
                 ├─ RED   → phantom-success: revert and count failure
                 └─ GREEN → semantic critic when enabled
                               ├─ FAIL → revert and count failure
                               └─ PASS → behavioral/evaluator evidence when required
                                             ├─ clear PASS + low risk → keep
                                             ├─ FAIL → retry/revert/stop by policy
                                             └─ uncertain/disagree/high risk → human decision
```

- Agent-reported success is not proof; the runner reruns the gate outside the actor invocation.
- The critic fails closed only on concrete evidence and fails open on malformed or uncertain output. A parser glitch must not discard a mechanically green commit.
- Human judgment does not block unrelated work: checkpoint the mission as `needs_human`, release its write lease, and
  continue other eligible missions.

## 3. Per-project specialization

| Layer | Specialization point |
| --- | --- |
| Mechanical | Repository gate command and permission boundary |
| Behavioral | Runtime/state/browser journey and evidence artifact contract |
| Semantic/evaluator | `scripts/overnight/CRITIC_PROMPT.md`, rubric judges, and domain-specific invariants |
| Human | Oversight policy, audit sample, calibration bank, and authority decisions |

Recurring semantic failures should be promoted into deterministic tests whenever possible. A deterministic regression test is cheaper and more reliable than a probabilistic critic.

## 4. Principles

- **Push checks down the cascade:** test first, critic second, human only when judgment is irreducible.
- **Keep the critic conservative:** reject only concrete diff evidence, not style preferences or speculation.
- **A thin auto-accept queue can be correct:** monitored work may still collect evidence and continue without pretending
  its subjective residue is deterministic.
- **Make verdicts legible:** preserve gate logs, critic logs, and the human review checklist.
- **Do not confuse verification with scheduling:** kickoff automation, external reporting, auto-push, and goal routing belong to the host or operator.

## 5. Verification horizon and judge calibration

Every verifier is a proxy for intent. As generators improve, static tests and rubrics saturate or invite reward hacking.
Operate verification as a co-evolving system:

1. version every rubric/verifier and attach the version to the evidence bundle;
2. store human accept/reject/pairwise choices as a calibration bank;
3. measure false accept, false stop, disagreement, and margin drift;
4. promote recurring findings into executable tests or behavioral assertions;
5. adversarially check test weakening, mock-only success, evidence omission, and spec/test mismatch.

Use `pass@k` for exploration where one good candidate is enough; use `pass^k` for release paths that must succeed
repeatedly. A high benchmark or judge score is not proof of production reliability.

## 6. Sibling concepts

- Parent harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · unattended loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- Multi-agent: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md) · context: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/VERIFICATION.md`](mythos/VERIFICATION.md)
