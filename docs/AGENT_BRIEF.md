# Agent Brief

Last updated: 2026-07-14

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Key-beat hybrid LIVE + ROUTING VERIFIED (`00066-blc`, 2026-07-14)** — 2.5 base + 3.5 key-beat serving; live play confirmed 4/4 key-beat + 1/1 normal turns success. En route: found+fixed a real 3.5 streaming whitespace-runaway → silent-fallback bug (`b55e933`, non-streaming retry). Next: owner matched-loop A/B feel verdict → `DECISIONS.md` keep/rollback (`docs/plans/2026-07-14-keybeat-hybrid-ab.md` Step 3-4). Owner residue: A/B verdict · real-device portrait combat pass (dock/38dvh/URL-bar/notch + strip 가독성) · Track 4 two-style playtest · `! git push`.

## Snapshot

Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. An AI GM (Ollama) drives scenes; tactical combat is adjudicated by a separate deterministic combat engine.

Current baseline:
- `RuntimeSessionService` handles shared orchestration for CLI/Streamlit/FastAPI.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, and Streamlit demo all call the same runtime service.
- PostgreSQL/MinIO/OTel/Jaeger local infra (Redis removed 2026-07-04; images generate synchronously in-request).
- Neo-Seoul 01 is the primary scenario, `glass-library` is an extension sample.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver implemented.
- Tactical combat (full-body action pose, role/tags skill animations, icon action bar, direct party control, 3 new allies and 4 enemy types with 35 new combat sprites mapped into scenario.json), Tactical Board legend/tile inspector/learning-goal banner, Playwright E2E implemented.
- Operation map route-node-ified (deterministic DAG + multi-perspective anchors `route_map.py`/`route_runtime.py`) + session memory (`session_memory.py` beat ledger + rolling synopsis, not RAG).
- Progression unlock (archetype gates, insight investment tree, rank pips/upgrade banner, epiphany banner, Run History + Echo/Shard dashboard, cross-scenario unlock, data-driven grant).
- Persistent objective/stakes display and choice value-axis/expected-result/actual-result summary UX.
- mflux/FLUX (local) / Vertex Imagen (cloud) images generate sync in-request; Redux character consistency; MinIO/GCS asset paths verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **Combat live sign-off on `00061-dzr`** (the whole 07-14 bundle is live: enemy art 20/20 + balance verdicts + telegraph/spawn/split/quick-slots): owner feel-pass is the next product gate, then 2-tier slice 4 GO/NO-GO. Plans: `docs/plans/2026-07-13-enemy-art-consistency.md`, `docs/plans/2026-07-14-combat-balance-tuning.md` (both DONE, feel residue only).
2. **CBT teaser V2: PUBLISHED 2026-07-14** — owner approved + uploaded (YouTube). Lane closed; `scripts/cbt/build_teaser.py` regenerates if a V2.1 is ever needed.
3. **Maintenance/hold**: WS4 content pipeline plan-only; `glass-library` held until Neo-Seoul satisfaction (`docs/COMPLETED_SUMMARY.md` M35-M40).

## Read Order

1. Current state: `docs/STATUS.md`
2. Next work: `docs/NEXT_PLAN.md`
3. Latest log: `docs/PROGRESS_LOG.md`
4. Before structural changes: `docs/DESIGN.md`
5. Before game-rule changes: `docs/GAMEPLAY.md`
6. Before scenario changes: `docs/scenarios/*` or `resources/<scenario>/story_bible/*`

## Commands

- Basic verify: `make test`
- Python quality: `make lint`, `make typecheck`
- React quality: `make frontend-lint`, `make frontend-build`
- Browser E2E: `make test-e2e`
- Runtime smoke: `make smoke-local`
- Persistence/MinIO: `make smoke`, `make test-db`
- Full local dev: `make dev-up` / `make dev-down`

## Guardrails

- Keep runtime orchestration in `RuntimeSessionService`; do not duplicate it into UI/API.
- Keep pure unit tests Docker-free. DB tests go through `MYTHOS_RUN_DB_TESTS=1`.
- Do not treat generated outputs, `.env`, tokens, `.docker/` data as source artifacts.
- Keep current docs short; move detailed records to `bin/docs/archive/` or dated plans.
