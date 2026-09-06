# Agent Brief

Last updated: 2026-09-06

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Status-effect stacking is built and browser-verified (2026-09-06, undeployed; `docs/plans/2026-09-06-status-effect-stacking.md`)** — owner feel verdict on caps 3/2/2 + pip legibility is `[manual]`, and **boss stack resistance is an open owner decision** (synthetic burn ×3 on IX: solo 0.30→0.82, 33% burn-tick kills — `docs/reference/2026-09-06-status-stacking-balance.md`); do not add a boss guard on your own. Everything else open in NEXT_PLAN is owner-gated (§3 verdict, `_weapon_in_range`, prod migration `008`) or `[blocked]` (P2 bench port needs `labs/wsl2-vllm-baseline/`; adapter rows need an engine). `[auto]` backlog is **0** — `/overnight-seed` before the next unattended run. Prod = `mythos-api-00088-v66` (main `8bf30b9`); `main` ahead of `origin/main` — owner `git push`. **Do not**: build a stream-stall watchdog; add keyword inflections on principle; decay stacks per turn (only with expiry — design §Stack decay); put `experiments/`/`scripts/<other>` paths in `[auto:claude]` seeds.

## Snapshot

Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. An AI GM (Ollama) drives scenes; tactical combat is adjudicated by a separate deterministic combat engine.

Current baseline:
- `RuntimeSessionService` handles shared orchestration for CLI/Streamlit/FastAPI.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, and Streamlit demo all call the same runtime service.
- PostgreSQL/MinIO/OTel/Jaeger local infra (Redis removed 2026-07-04; images generate synchronously in-request).
- Neo-Seoul 01 is the primary scenario, `glass-library` is an extension sample.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver implemented.
- Tactical combat (full-body action pose, role/tags skill animations, compact image action bar, direct party control, 3 new allies and 4 enemy types with 35 new combat sprites mapped into scenario.json), Tactical Board direct key/tile inspector/folded learning goal, Playwright E2E implemented.
- Operation map route-node-ified (deterministic DAG + multi-perspective anchors `route_map.py`/`route_runtime.py`) + session memory (`session_memory.py` beat ledger + rolling synopsis, not RAG).
- Progression unlock (archetype gates, insight investment tree, rank pips/upgrade banner, epiphany banner, Run History + Echo/Shard dashboard, cross-scenario unlock, data-driven grant).
- Persistent objective/stakes display and choice value-axis/expected-result/actual-result summary UX.
- mflux/FLUX (local) / Vertex Gemini Image (cloud, `gemini-3.1-flash-image` via `global`) generate sync in-request; Redux character consistency; MinIO/GCS asset paths verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **§3 human re-sign-off** — the 47/47 arm is banked, admitted to the frozen promotion bank and scored; **only the owner's ending/overall feel verdict remains**, and it is now the sole usable basis because judge variance (~1 point) is as large as the score gap.
2. **MythOS Dev Graph** — repair rollout closed at strict-contract 0/3; repair remains 0 and bank v1 stays frozen. Remote publication/fan-out remain separately owner-gated.
3. **Serving-research track (new 2026-08-30, unblocked)** — `docs/plans/2026-08-30-...-research-workload.md`; P1–P3 need no owner call, P4 is the same judge-noise decision as §3. Local sampler/timeout defects found and fixed by its first experiments (degradation 44%→0%; `repeat_penalty` had never applied locally).
4. **Manual residuals/hold**: S4 copy tone, variant intro feel, G2 twist tone, EN fresh-loop retest; `glass-library` held.

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
