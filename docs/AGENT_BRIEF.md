# Agent Brief

Last updated: 2026-07-08

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Design-System DS0–DS3 COMPLETE — all `[auto:claude]` frontier work is done; remaining priorities are human-gated (pick one).** This session landed **LC5/LC6** (Landscape Combat COMPLETE) + the **entire DS2 `Surface` sweep** (all ~30 base `.panel` containers → `<Surface>`; gained `...rest`/`id`/`as`) + **DS3** (owner-approved density decision → `DECISIONS.md`): **DS3a** compact-density mode (`body.concise-mode .surface` −4px app-wide, toggle relabelled COMPACT, 48px taps preserved) + **DS3b** fixed-size combat inspector (always HP·Intent·Cover, `.tile-inspector` 96px, no jump). All emulator-verified. `make check` **956** green. **Human-only/blocked (nothing auto remains):** **DS3** density system (needs owner's density defaults/step → then it's `[auto:claude]`) · **T5c** iso legibility @390px judgment · **real-device mobile/landscape pass** (emulator-only so far — `docs/test/neo_seoul_live_qa.md` 📱 section) · S4/T4 카피 톤 + 2회차 feel run · **Cloud Run redeploy** (origin pushed to `889f713`; live rev `00025-856` is stale — a large undeployed batch; local `.env` MODEL now = gemini-3.5-flash to match prod) · re-push the DS2-sweep commits · tear down `api-cloud` (pid was 5031, Vertex-billed). Optional low-pri: bespoke non-`.panel` classes (out of sweep scope). Traps: AGY can't see landscape (desktop viewport) → landscape/mobile needs the emulator; reload the cloud build cache-bypassed for a fresh bundle; DevConsole-style repeated identical blocks migrate via `replace_all` opens + tsc-guided close balancing.

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

1. **CBT P1** (`docs/plans/2026-07-05-cbt-onboarding-replay-density-plan.md`): **code track + auto asset/QA tracks complete** (2026-07-06: art/icons/SFX landed, live-QA PASS_CANDIDATE). Open: `[manual]` only — asset feel review, G2 tone review, balance calls (G5 dialogue markup + G6 dynamic voice remain future items). Parallel human lane: sign-off run on rev `00025-856`, voice-id pinning, `git push` (ahead 10), Audrey reply. Cost levers env-only: `GEMINI_MODEL_KEYBEAT` hybrid ($0.5) / full-2.5 ($0.2).
2. **Engineering maintenance track (WS0-3 done)**: 6-layer agent ops bible↔MythOS interpretation (including mechanical→semantic→creative verification), slim entry points, structured logging/dashboard, and Resume Pointer continuity. Only WS4 content pipeline remains plan-only (`docs/plans/2026-06-14-engineering-plan.md`).
3. `glass-library` extension: hold (parity + Story Bible 17 entries done; further extension after Neo-Seoul completion). Completed tracks (combat/progression/party/grant/route-node) → `docs/COMPLETED_SUMMARY.md` M35-M40.

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
