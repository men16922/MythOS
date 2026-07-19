# MythOS interpretation — PROMPT_ENGINEERING

> Maps [`../PROMPT_ENGINEERING.md`](../PROMPT_ENGINEERING.md) onto harness and narrative prompts.

## Harness actor prompt

MythOS no longer maintains engine-specific overnight procedure prompts. Before dispatch,
`scripts/overnight/compile-contract.sh` turns the top eligible lane item into a typed WorkContract.
The plugin renders a lean prompt containing only:

- one goal and explicit non-goals;
- include/exclude scope and allowed local actions;
- evidence contract and gate;
- wall/retry/subagent budgets;
- stop/escalation rules and minimal resume read path.

Engine adapters add capability-specific invocation and permission flags; they do not duplicate
project policy. The controller verifies the commit independently, so actor prose such as “done” is
never proof. `OVERNIGHT_CONTRACT_REQUIRED=1` makes compiler failure terminal instead of falling back
to a generic procedure prompt.

The independent semantic reviewer remains repo-specific at
`scripts/overnight/CRITIC_PROMPT.md`. `scripts/overnight/PROMPT.review.md` is the separate manual
integration-diff reviewer, not the unattended actor prompt.

## Runtime narrative prompt

Runtime narrative prompt/schema code remains under `src/mythos_narrative/`. It is a product surface,
not part of the harness contract. Controlled generation, repair/fallback, context selection, and
register evaluation remain governed by `docs/DESIGN.md`, `harness/CORE_MANDATES.md`, and human play QA.

Narrative tone, repetition feel, pacing, and story-bible authoring do not compile as unattended work.
Deterministic subproblems may be split into objective `[auto:<lane>]` items with named tests.

Related: [`LOOP.md`](LOOP.md), [`VERIFICATION.md`](VERIFICATION.md),
[`../../plans/2026-07-18-overnight-harness-v2.md`](../../plans/2026-07-18-overnight-harness-v2.md).
