---
name: codebase-design
description: Shared vocabulary for designing deep modules in Project MythOS — small interface, lots of behaviour behind a clean seam, testable through that interface. Use on "모듈 설계", "인터페이스 설계", "리팩토링 경계", "seam/deep module", "테스트하기 쉽게", or when reshaping a module (e.g. the App.tsx/CombatCinema god-component decomposition) or when another skill needs the deep-module vocabulary. Adapted from mattpocock/skills.
---

# /codebase-design — Deep-module design vocabulary

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam,
testable through that interface. Use this language and these principles wherever MythOS code is
being designed or restructured — the shared runtime boundary, a new provider seam, or a slice of
the `App.tsx`/`CombatCinema` decomposition track (`docs/NEXT_PLAN.md` Maintenance). The aim is
leverage for callers, locality for maintainers, and testability for everyone.

MythOS already runs this pattern in places — name them consistently so design discussions and
`docs/DECISIONS.md` entries use one vocabulary.

## Glossary

Use these terms exactly — don't substitute "component," "service," "API," or "boundary."
Consistent language is the whole point.

**Module** — anything with an interface and an implementation. Scale-agnostic: a function, a
dataclass, a package, or a tier-spanning slice. `RuntimeSessionService` is a module; so is a single
`useCombatBoard` hook. _Avoid_: unit, component, service.

**Interface** — everything a caller must know to use the module correctly: the type signature, but
also invariants, ordering constraints, error modes, required configuration, and performance
characteristics. `RuntimeSessionService`'s interface includes "one DB transaction per transition,"
not just the method names. _Avoid_: API, signature (too narrow — type-level surface only).

**Implementation** — what's inside a module. Distinct from **Adapter**: a thing can be a small
adapter with a large implementation (`PostgresStore`) or a large adapter with a small
implementation (an in-memory fake store in tests). Reach for "adapter" when the seam is the topic;
"implementation" otherwise.

**Depth** — leverage at the interface: how much behaviour a caller (or test) can exercise per unit
of interface they have to learn. **Deep** = a lot of behaviour behind a small interface;
**shallow** = the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_ — a place where you can alter behaviour without editing in that
place; the *location* at which a module's interface lives. `VisualProvider`/`StorageAdapter` are
seams. Where to put the seam is its own decision, distinct from what goes behind it. _Avoid_:
boundary (overloaded with DDD's bounded context).

**Adapter** — a concrete thing that satisfies an interface at a seam. Describes *role* (what slot
it fills), not substance. `LocalFluxProvider`, `Filesystem`/`MinIO` storage, `OllamaJSONProvider`,
and the test fakes are all adapters.

**Leverage** — what callers get from depth: more capability per unit of interface learned. One
`RuntimeSessionService` pays back across CLI, Streamlit, FastAPI REST/WS, and every test.

**Locality** — what maintainers get from depth: change, bugs, and verification concentrate in one
place. Fix a transition rule in `RuntimeSessionService` once; CLI/UI/API all get it.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← create_player / start_loop / choose / resume / archive
├─────────────────────┤
│  Deep Implementation│  ← store + director + engine wiring, one txn per transition
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid): a hook that exposes a
12-field props object and just forwards it — this is exactly why decomposition slice 14
(`useViewModels`) was human-reverted (`4d88b80`). More interface than it hid.

When designing an interface, ask: Can I reduce the number of methods? Can I simplify the params?
Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally
  composed of small, swappable parts — they just aren't part of the interface. A module can have
  **internal seams** (private, used by its own tests) as well as the **external seam** at its
  interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through.
  If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. MythOS tests inject
  a fake `VisualProvider` and drive `RuntimeSessionService` — they test *through* the interface. If
  you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** `StorageAdapter` earns
  its seam (Filesystem + MinIO). Don't introduce a seam unless something actually varies across it.

## Designing for testability

1. **Accept dependencies, don't create them.** `RuntimeSessionService` takes store + director +
   visual provider; it doesn't `new` them. That's why tests can inject fakes.
2. **Return results, don't produce side effects** where you can — a function that returns a value is
   trivially testable; one that mutates shared state needs setup/teardown.
3. **Small surface area.** Fewer methods = fewer tests; fewer params = simpler setup.

## Relationships

A **Module** has exactly one **Interface**. **Depth** is measured against that interface. A **Seam**
is where the interface lives; an **Adapter** sits at a seam and satisfies the interface. **Depth**
produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as implementation-lines ÷ interface-lines** (Ousterhout's ratio): rewards padding. Use
  depth-as-leverage instead.
- **"Interface" as the `Protocol`/`interface` keyword or a class's public methods**: too narrow —
  interface here includes every fact a caller must know (invariants, ordering, error modes).
- **"Boundary"**: overloaded with DDD. Say **seam** or **interface**.

## Going deeper

- **Deepening a cluster given its dependencies** — see [references/deepening.md](references/deepening.md):
  dependency categories, seam discipline, replace-don't-layer testing. Use when picking the next
  `App.tsx`/`CombatCinema` decomposition slice.
- **Exploring alternative interfaces** — see [references/design-it-twice.md](references/design-it-twice.md):
  spin up parallel sub-agents (the `docs/engineering/mythos/AGENTIC.md` lane vocabulary) to design an
  interface several radically different ways, then compare on depth, locality, and seam placement.

Record any hard-to-reverse seam decision in `docs/DECISIONS.md`.
