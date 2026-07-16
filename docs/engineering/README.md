# Engineering — the 6 agent-operations concepts (bible → interpretation)

This directory defines MythOS's **AI agent-operations harness** in 6 concepts. The structure is **bible → interpretation**:
- **Bible** (`*_ENGINEERING.md`) = the **general, portable** concept doc. Not tied to a specific repo (can be carried to other projects).
- **Interpretation** (`mythos/*.md`) = an application doc mapping that concept onto **this repo's actual files, commands, and mechanisms**.

The bible holds the "what/why"; the interpretation holds "how in this repo." Each bible ends with a link to its paired interpretation.

## The 6 Concepts
| Concept | Bible (general) | Interpretation (MythOS) |
| --- | --- | --- |
| Harness (top-level operations system) | [HARNESS_ENGINEERING.md](HARNESS_ENGINEERING.md) | [mythos/HARNESS.md](mythos/HARNESS.md) |
| Autonomous unattended loop | [LOOP_ENGINEERING.md](LOOP_ENGINEERING.md) | [mythos/LOOP.md](mythos/LOOP.md) |
| Verification (mechanical · semantic · creative) | [VERIFICATION_ENGINEERING.md](VERIFICATION_ENGINEERING.md) | [mythos/VERIFICATION.md](mythos/VERIFICATION.md) |
| Multi-agent parallelism | [AGENTIC_ENGINEERING.md](AGENTIC_ENGINEERING.md) | [mythos/AGENTIC.md](mythos/AGENTIC.md) |
| Context · continuity | [CONTEXT_ENGINEERING.md](CONTEXT_ENGINEERING.md) | [mythos/CONTEXT.md](mythos/CONTEXT.md) |
| Prompt | [PROMPT_ENGINEERING.md](PROMPT_ENGINEERING.md) | [mythos/PROMPT.md](mythos/PROMPT.md) |

## Read Order
1. **Learning a concept first**: bible `HARNESS_ENGINEERING.md` (the whole picture) → the bible of the needed concept.
2. **Actually running it in this repo**: the paired interpretation `mythos/<concept>.md` (runner · make · file paths).
3. What proves a commit = `mythos/VERIFICATION.md`; unattended operation = `mythos/LOOP.md` → `mythos/AGENTIC.md` if parallel.
4. Docs/state/session continuity = `mythos/CONTEXT.md` · prompt/narrative tone = `mythos/PROMPT.md`.

## Authority / Higher Docs
- Design invariants (shared by all agents): `harness/CORE_MANDATES.md`
- Doc operating rules: `docs/DOCS_POLICY.md` · docs index: `docs/README.md` · backlog/lane tags: `docs/NEXT_PLAN.md`
- Raw research (preserved): `bin/docs/archive/HARNESS_RESEARCH.md` · `bin/docs/archive/AI_REARCH.md` · refined `bin/docs/archive/AI_TEAM_BLUEPRINT.md`
