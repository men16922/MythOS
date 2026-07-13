# Design It Twice

When exploring alternative interfaces for a chosen deepening candidate, use this parallel sub-agent
pattern. Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best. Uses
the vocabulary in [../SKILL.md](../SKILL.md) — **module**, **interface**, **seam**, **adapter**,
**leverage** — and the multi-agent lane vocabulary in `docs/engineering/mythos/AGENTIC.md`.

## Process

### 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the chosen
candidate:

- The constraints any new interface would need to satisfy (MythOS invariants: shared runtime
  boundary stays in `RuntimeSessionService`, one DB transaction per transition, no torch import on
  the runtime path, etc.).
- The dependencies it relies on, and which category they fall into (see [deepening.md](deepening.md)).
- A rough illustrative code sketch to ground the constraints — not a proposal, just a way to make
  the constraints concrete.

Show this to the user, then proceed to Step 2 while they read.

### 2. Spawn sub-agents

Spawn 3+ sub-agents in parallel with the Agent tool (or a `Workflow` parallel stage). Each must
produce a **radically different** interface for the deepened module. Give each a separate technical
brief (file paths, coupling details, dependency category, what sits behind the seam) and a different
design constraint:

- Agent 1: "Minimize the interface — 1–3 entry points max. Maximise leverage per entry point."
- Agent 2: "Maximise flexibility — support many use cases and extension."
- Agent 3: "Optimise for the most common caller — make the default case trivial."
- Agent 4 (if cross-seam): "Design around ports & adapters for the boundary dependency."

Include both the [SKILL.md](../SKILL.md) vocabulary and the project's domain language
(`docs/engineering/mythos/CONTEXT.md`, Story-Bible/Codex canon terms) so sub-agents name things
consistently.

Each sub-agent outputs:

1. Interface (types, methods, params — plus invariants, ordering, error modes)
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [deepening.md](deepening.md))
5. Trade-offs — where leverage is high, where it's thin

### 3. Present and compare

Present designs sequentially so the user can absorb each, then compare in prose. Contrast by
**depth** (leverage at the interface), **locality** (where change concentrates), and **seam
placement**. Give an opinionated recommendation — the strongest design and why; propose a hybrid if
elements combine well. The user wants a strong read, not a menu. Record the chosen seam in
`docs/DECISIONS.md`.
