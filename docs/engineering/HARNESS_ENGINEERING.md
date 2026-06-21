# HARNESS_ENGINEERING — agent safe-operations scaffolding (bible)

> **General concept doc (bible).** Not tied to a specific repo. This repo's application (interpretation) is → [`mythos/HARNESS.md`](mythos/HARNESS.md).

## Definition
An operations system that, instead of letting an AI agent generate code freely, embeds **knowledge, constraints, verification, state records, and a review loop inside the repo** so the agent runs safely and repeatedly. One-line principle: **Humans steer. Agents execute.** Humans set direction, boundaries, and exceptions; agents iterate implementation, verification, fixing, and recording within them.

## 1. Maturity Ladder (L0→L4)
| Level | Definition |
| --- | --- |
| L0 Ad-hoc | Human approval every time; rules/state exist only in the chat |
| L1 Basic Harness | Agent instruction file + lint/test gate + worktree/branch isolation + documented plans |
| L2 Automated Feedback | Gate script + independent reviewer + auto-retry on failure + checkpoint saving |
| L3 Multi-Agent | coder/reviewer/gardener role split + risk-based approval + parallel worktrees + periodic entropy scan |
| L4 Self-Evolving | Failure-trace analysis + self-improving harness PRs + human intervention only on exceptions |
For most projects **L2→L3** is the realistic target. Self-diagnose your level and invest only in the next one-step gap.

## 2. Feedback Ladder — recurring feedback gets promoted to a stronger system
| Recurrence | Encoding target |
| --- | --- |
| Once | Review note |
| Twice | Doc |
| 3×+ | Script / linter / test (deterministic gate) |
| Safety violation | Hard gate (block) |
Core: when the same point recurs, **freeze it into a deterministic gate**, not prose.

## 3. Verification Layers — deterministic first, probabilistic on top
| Layer | Trigger | Catches |
| --- | --- | --- |
| L1 | File change | Forbidden patterns · file size · secret · conflict marker |
| L2 | Turn end | lint · format · typecheck · architecture/dependency rules |
| L3 | Before done | unit · integration · contract tests |
| L4 | After L3 | LLM/Codex read-only review (bugs · edges · drift) |
| L5 | PR/merge | full CI · E2E · human approval |
Establish L1-L3 (deterministic) first, then layer L4 (probabilistic review) on top. You may bundle them into one gate command or split into scripts — only **what gets caught where** must be clear.

## 4. Tier-based boundary security — boundaries, not per-command approval
| Tier | Action |
| --- | --- |
| 1 Always allowed | read · grep · glob · git status/diff |
| 2 Allowed within repo | edit src/tests/docs/scripts + enumerated safe commands + local commit |
| 3 Conditional (block/human) | push · network · destructive commands · secret · prod · dependency install |
Tier 3 requires a plan before execution (what/why/impact/recovery/command). An unattended environment **physically blocks** Tier 3.

## 5. Adoption Principles
- **Repository as SoT**: rules/state live in the repo, not chat/memory. Plans live inside the repo too (no scratch paths).
- **Agent Legibility First**: small entry points, short core docs, details by link. Forbiddens enforced by tests/scripts.
- **Constraints Create Speed**: stating "what not to do" reduces guessing/drift and is therefore faster.
- **Progressive Deletability**: attach a **removal condition** to every rule/gate (e.g. 3 months no violation · CI does the same check · remove on architecture mismatch).
- **Agent-friendly errors**: a gate failure carries the 4 elements — *what / where / why forbidden / how to fix* — so the agent can self-correct.
- **Measured Adoption**: do not adopt external tools / harness prompts as prescribed. **Measure the effect, derive a conditional policy**, and attach a **removal condition**. (A vendor "X-FIRST/avoid-Y" prompt → after measurement, qualify it as "only for large·high-frequency; authority is the source.") Do not gate optional accelerators (no making them a required build dependency).

## 6. Triple State Storage
git history (change history) + structured ledger (work/event ledger) + natural language (state/progress/handoff docs).
Disk, not memory, is the source of truth → restore from fresh context each iteration.

## 7. Sibling Concepts (bible)
- Autonomous loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md) · verification: [`VERIFICATION_ENGINEERING.md`](VERIFICATION_ENGINEERING.md) · multi-agent: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md)
- Context: [`CONTEXT_ENGINEERING.md`](CONTEXT_ENGINEERING.md) · prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/HARNESS.md`](mythos/HARNESS.md)
