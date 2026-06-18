# Agent Context Bridge

The root handoff harness for passing work context between agents. The source of truth for detailed state is `docs/AGENT_BRIEF.md`, `docs/STATUS.md`, `docs/NEXT_PLAN.md`; this file stays a hyper-compressed handoff that lets the next worker orient immediately.

## Active Context

- **Project state**: Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. A Streamlit demo, a FastAPI-served React + TypeScript SPA, and a CLI coexist; core orchestration is owned by `RuntimeSessionService`.
- **Primary play path**: the React SPA is the currently recommended path. `make dev-up` prepares docker infra, DB migration, the background visual worker, and the FastAPI API, serving `http://localhost:8000`. Ollama needs `ollama serve` separately on the Mac host.
- **Implemented axes**: Neo-Seoul 01, Story Bible snippet injection, Run History, Meta Progression, Save/Load UX, Ending Resolver, the Developer causality monitor, resource-constrained choices, enemy intent, stat-driven internal monologue, tactical combat, a single-iframe Streamlit combat UI, React SPA parity, Playwright E2E, narrative shard rollup, and the narrative metrics dashboard.
- **Visual pipeline**: the default image backend is mflux/FLUX. Character scenes route through mflux Redux portrait reference to reinforce face consistency. The Redis visual worker -> MinIO -> presigned PNG path is verified live.
- **Latest verification baseline**: `make test` has a passing record at 264 tests, 2 skipped. `make test-e2e` verifies boot opening, session intro, turn-0 choices, and the turn-1 transition over the deterministic React path (`?fallback=1&image=0`). A Neo-Seoul fallback 12-choice long run passed without an early forced ambient combat.
- **Doc entry point**: new workers do not read all of `docs/`; start `docs/AGENT_BRIEF.md` -> `docs/STATUS.md` -> `docs/NEXT_PLAN.md`. Open `docs/DESIGN.md`, `docs/GAMEPLAY.md`, scenarios, dated plans, and archive only on demand.

## Current Handover

1. **Priority 1 (Neo-Seoul play satisfaction)**: top track. Done: Phase 1-3, operation-map route-node-ization + session memory (M39), Tactical Board (legend/tile inspector/learning-objective banner), encounter difficulty tuning (per-spawn `overrides`), and P0 (insight rewards, results panel, forced-ambient relaxation, BGM/Serine-label QA). Next: live LLM long-session QA, loot/inventory · objective · choice-result · Codex UX cleanup, and board zoom/responsiveness.
2. **QA basis**: the generic manual-QA doc is retired. Neo-Seoul live-play check items live in `docs/test/neo_seoul_live_qa.md`, the design rubric in `docs/scenarios/01-neo-seoul-connect.md` §5.5, and the work checklist in `docs/NEXT_PLAN.md`.
3. **Done axes**: combat-staging live QA, progression unlocks, party control, data-driven progression grant, React SPA parity, and Playwright E2E remain done.
4. **glass-library**: on hold. Progression/presentation parity is done, but deeper narrative (arcs/endings/Story Bible) and combat-art/skill expansion are deferred until after Neo-Seoul satisfaction improvements.
5. **Long-run worker stability**: solo Redux jobs and shutdown cleanup are verified, but whether memory/swap stalls recur when txt2img (Flux1) + Redux (Flux1Redux) are loaded simultaneously must be observed in long play.

## Open Risks

- Story Bible and narrative shards are never injected as full text into prompts. Only phase/location/flags-based snippets and the causality summary are injected.
- `narrative_shards` source rows are preserved; only stale raw shards are excluded from prompts. If a deletion/query policy is needed, set up a separate migration or status.
- Redux is not IP-Adapter-grade face locking. Given the FLUX-schnell 4-step limit, treat it as portrait-reference steering.
- `RunSummary`, `MetaProgression`, `SaveSlot`, and `narrative_metrics` currently live in JSONB memory rows. If query/filter demand grows, they become candidates for a separate table migration.
