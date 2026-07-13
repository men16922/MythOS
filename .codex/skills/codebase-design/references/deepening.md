# Deepening

How to deepen a cluster of shallow modules safely, given its dependencies. Assumes the vocabulary
in [../SKILL.md](../SKILL.md) — **module**, **interface**, **seam**, **adapter**. In MythOS this is
the working method for the `App.tsx`/`CombatCinema` decomposition track: extract one clean-boundary
slice per iteration, behavior-preserving, `make check` green.

## Dependency categories

When assessing a candidate for deepening, classify its dependencies. The category determines how the
deepened module is tested across its seam.

### 1. In-process

Pure computation, in-memory state, no I/O. Always deepenable — merge the modules and test through
the new interface directly, no adapter needed. Most `mythos_core` (`models.py`, `seed.py`,
`ids.py`) and `mythos_loop` validation logic is here; so are pure React view-model hooks.

### 2. Local-substitutable

Dependencies with local test stand-ins. MythOS Postgres tests run against a real container behind
`MYTHOS_RUN_DB_TESTS=1`; the filesystem `StorageAdapter` stands in for MinIO. Deepenable when the
stand-in exists — the seam is internal, no port at the module's external interface.

### 3. Remote but owned (Ports & Adapters)

Your own logic across a boundary. Define a **port** (interface) at the seam; the deep module owns
the logic, the transport is an injected **adapter**. MythOS shape: `VisualProvider`/`StorageAdapter`
and `JSONProvider` are ports — production adapters (`LocalFluxProvider`, MinIO, `OllamaJSONProvider`)
and test fakes satisfy the same port.

Recommendation shape: *"Define a port at the seam, implement the real adapter for production and an
in-memory adapter for testing, so the logic sits in one deep module even though it spans a
boundary."*

### 4. True external (Mock)

Third-party services you don't control (Ollama endpoint, Vertex/Imagen, HF model download). The
deepened module takes the dependency as an injected port; tests provide a mock adapter. Keep the
network fact inside the adapter, never leaking through the module's interface.

## Seam discipline

- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a port
  unless at least two adapters are justified (typically production + test). A single-adapter seam is
  just indirection.
- **Internal seams vs external seams.** A deep module can have internal seams (private to its
  implementation, used by its own tests) as well as the external seam at its interface. Don't expose
  internal seams through the interface just because tests use them.

## Testing strategy: replace, don't layer

- Old unit tests on shallow modules become waste once tests at the deepened module's interface exist
  — delete them.
- Write new tests at the deepened module's interface. The **interface is the test surface** (MythOS:
  the source-lock invariant tests assert behaviour through the module, e.g. every-companion
  castability, desktop-combat-split fold).
- Tests assert on observable outcomes through the interface, not internal state — they should
  survive internal refactors. If a test has to change when the implementation changes, it's testing
  past the interface.
