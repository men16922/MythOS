# CONTEXT_ENGINEERING — context budget · state restore · session continuity (bible)

> **General concept doc (bible).** This repo's application (read-path · /sync · entry points) is → [`mythos/CONTEXT.md`](mythos/CONTEXT.md).

## Definition
Engineering that lets an agent **restore the right work context with minimal tokens**, and lets the next session pick up seamlessly even after a session breaks. **Disk, not memory, is the source of truth.**

## 1. Read Path & Context Budget
Session start does not bulk-read all docs — read **only the entry points** (short → detailed):
1. Compressed entry point (1-minute context) → 2. current state → 3. next work (rolling plan) → 4. latest incremental log.
- Details (design/rules/scenario/dated plan/archive) are **on-demand** — open only when actually changing them.
- Put a **line budget** on entry-point docs (e.g. entry ≤60, state/plan ≤120). Split overflow into cleanup/archive.
- Core: the entry point is **a map, not a manual containing everything**. Details move by link.

## 2. Code-search acceleration — the structure index is conditional
When locating code, a structure index (symbol/call-graph folder map / LSP / ctags etc.) can be an alternative to grep, but it is **not a cure-all**.
- **The lever is round-trips × per-turn tokens, not shell latency**: the index command itself can be slower than grep. The gain comes from reducing search *round-trips* and *per-turn context tokens*.
- **When it wins**: large module + high-frequency symbol (broad search). **When it loses**: rare literals / small files — grep is cheaper. Don't adopt an "index-first" prescription without measuring.
- **structure-before-body**: don't read a large file whole; narrow with the index member-inventory first. **But index ≠ authority** — confirm body and truth always in the original source file.

## 3. Knowledge Pyramid
| Layer | Nature |
| --- | --- |
| L0 | Entry points always read at session start |
| L1 | Core docs referenced as needed (design · rules · plan) |
| L2 | Per-task details (dated plan · design-doc · structured task list) |
| L3 | Generated/referenced/large docs (review · report · trace · archive) — not in default context |

## 4. Triple State Storage
| Layer | Medium | Question it answers |
| --- | --- | --- |
| Change history | git history | what changed |
| Structured state | machine-readable ledger (work/event ledger) | how the loop ran |
| Natural-language state | current-state/progress/handoff docs | why · what next |
The three are complementary. Don't replace all of them with any one.

## 5. Session Continuity (Resume Pointer) — plan-only/incomplete handoff
When a session ends plan-only or incomplete and the next session must continue:
1. **A single "next session" pointer at the top of the entry point** = in-repo plan path + first concrete action.
2. Promote that work to the **authoritative active focus** → **align** the entry-point · state · plan docs (not just a preamble note).
3. The state-restore procedure surfaces this pointer **first** → the next session picks up seamlessly. Update/clear once taken over.
- **Forbidden**: recording a tool-generated out-of-session scratch path (random name, machine-local) as the authoritative pointer — the next session can't find it.

## 6. Preventing entry-point divergence
Multiple agent entry points (per-tool instruction files) keep **one shared body + the rest as links**. Copy-pasting the same content soon causes divergence. Unify entry points as thin wrappers and own the details in one place.

## 7. Long-horizon context policy

Fresh context and continuous context are tools, not dogma.

- Continue the same thread while goal, assumptions, scope, and current implementation layer remain stable.
- At every milestone, write a structured checkpoint: mission state, completed evidence, dirty/clean tree, next action,
  unresolved hypotheses, budgets consumed, and verifier versions.
- Reset to a fresh session on context pressure, drift, repeated self-reference, engine failure, or layer change; restore
  from the checkpoint instead of conversation compaction alone.
- Keep the prompt lean. Do not resend the full task on continuation turns; send the delta and current checkpoint.
- Subagents return summaries/evidence references, not raw transcripts, to protect the root context.

The controller, not the model, decides whether a session continues, resets, retries, or releases its claim.

## 8. Sibling Concepts (bible)
- Higher harness: [`HARNESS_ENGINEERING.md`](HARNESS_ENGINEERING.md) · loop: [`LOOP_ENGINEERING.md`](LOOP_ENGINEERING.md)
- Multi-agent: [`AGENTIC_ENGINEERING.md`](AGENTIC_ENGINEERING.md) · prompt: [`PROMPT_ENGINEERING.md`](PROMPT_ENGINEERING.md)
- This repo's application: [`mythos/CONTEXT.md`](mythos/CONTEXT.md)
