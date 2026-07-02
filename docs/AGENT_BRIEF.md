# Agent Brief

Last updated: 2026-07-03

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **CBT CONSOLIDATION on `loop/integration` (2026-07-03, `make check` 649 green, NOT merged/pushed):** overnight 3-lane merged — IX **boss-fire fix** (`_defer_threshold_archive_for_climax`+`_defer_tension_archive_before_climax`: tension auto-archive no longer preempts the IX fight) + **side-anchor mechanism** (`attach_side_anchors` weaves side_arcs into the route DAG) + per-loop variation + invariants; agy character scenes **regenerated for portrait consistency via codex Imagen** (se-rin/kai/lin-yue); **3 NEW companion side_arcs** (han/su_ah/tae_o) + character-consistent meet art + **7 side-arc Story Bible entries (KO+EN)** → all 6 companions can surface narratively. **NEXT = human: merge `loop/integration`→main + push + live play-QA** (`docs/test/neo_seoul_live_qa.md` 🔴: does IX boss actually fire · do companions/side scenes vary per loop · 30-60min feel). Open: side_arc `trigger_flag` **producers unwired** (P3 — arcs are data/art/bible-ready but no choice sets `han_met`/etc.). Prior 2026-07-02 pre-CBT hardening (`6afa6d9`/`7b8ad88`/`3b7d26b`) also unpushed on main. — **🚀 GCP CLOSED BETA IS LIVE (2026-06-29).** URL `https://mythos-api-1004528040791.us-central1.run.app` (Cloud Run us-central1, rev mythos-api-00003-fzb) on **Neon Postgres 18** (migrations applied) + Vertex Gemini/Imagen + GCS. End-to-end verified LIVE: gate(no-key 401/key 200) · real EN Gemini narration + Neon persist · EN default + English tab title · admin key uncapped vs tester cap 10(429). Cost guards live: invite gate + loop cap 10 + scale-to-zero. Keys in `INVITE_KEY.md` (gitignored): 8 tester + admin `admin-43dc07f266c2` (uncapped). All code (EN combat-log i18n K6, EN default, BGM auto-on, admin keys, save/load+gate) committed `daa5438..de95632`, `make check` 610 green, **UNPUSHED** (`main` FF-merged, ahead of origin). **CBT Recruitment & Teaser finalized (2026-07-01)**: Edited the 2.5-min trailer video (`Mythos_Teaser_Edited.mp4`), extracted high-quality UI/Combat preview screenshots, created Itch.io setup guide (`ITCH.md`), and updated all posts with final YouTube/Form links in `docs/cbt/`. Discord posting template ready. **NEXT = human, non-blocking:** push `main` to origin · post the thread in `#showcase-your-game` on AI Game Dev Org Discord (give feedback to 2 other games first) · monitor playtest sign-ups. Loose EN tails: K9 full natural-ending screenshot (human play), glass-library glossary, session `_outcome`. App.tsx slice-14 decomp `[blocked]`. **Post-combat EN leak FIXED + redeployed.** Open content gaps: **IX boss = narrative-only** (no boss enemy — plan `docs/plans/2026-06-30-ix-boss-fight.md`, overnight 2-lane claude-design+codex-art); **Korean on resume = persisted pre-fix prose** (free narration not re-translatable — fresh EN loops clean). Runbook `docs/cloud/DEPLOY.md` §10.**

## Snapshot

Project MythOS is a single-player SF loop-based TRPG/CRPG on a Python 3.11+ local runtime. An AI GM (Ollama) drives scenes; tactical combat is adjudicated by a separate deterministic combat engine.

Current baseline:
- `RuntimeSessionService` handles shared orchestration for CLI/Streamlit/FastAPI.
- React+TS SPA + FastAPI `/api/v1` REST/WS adapter, and Streamlit demo all call the same runtime service.
- PostgreSQL/MinIO/Redis/OTel/Jaeger local infra.
- Neo-Seoul 01 is the primary scenario, `glass-library` is an extension sample.
- Story Bible, Codex, Run History, Meta Progression, Save/Load, Ending Resolver implemented.
- Tactical combat (full-body action pose, role/tags skill animations, icon action bar, direct party control, 3 new allies and 4 enemy types with 35 new combat sprites mapped into scenario.json), Tactical Board legend/tile inspector/learning-goal banner, Playwright E2E implemented.
- Operation map route-node-ified (deterministic DAG + multi-perspective anchors `route_map.py`/`route_runtime.py`) + session memory (`session_memory.py` beat ledger + rolling synopsis, not RAG).
- Progression unlock (archetype gates, insight investment tree, rank pips/upgrade banner, epiphany banner, Run History + Echo/Shard dashboard, cross-scenario unlock, data-driven grant).
- Persistent objective/stakes display and choice value-axis/expected-result/actual-result summary UX.
- mflux/FLUX image worker, Redux character consistency, MinIO asset path verified.
- Narrative is dual-model: storyteller `OLLAMA_MODEL_STORY`=`gemma4:latest` (8B, free text) → parser `OLLAMA_MODEL_PARSER`=`qwen2.5:3b-instruct` (JSON structuring). Streaming path runs a regex parser in parallel.
- Opening sequence consistency (5 cuts: awakening→se_rin appears→approaching hand→first contact→pursuit+combat). Prompt-layer separation in progress (authored directives→`resources/<scenario>/directives/*.md`, `docs/PROMPT_LAYER.md`). Detailed state in `STATUS.md`.

## Active Work

`docs/NEXT_PLAN.md` is authoritative for next priorities.

1. **Automatic AGY QA inside existing overnight (WS-A..F DONE)**: `make overnight*` stays the sole operator flow; after gate+critic a candidate filter + AGY 2-stage decision drive browser QA, plus a DONE-time A/F drain sweep. Now **default-on** (`OVERNIGHT_BROWSER_QA=auto`; `=0` kill-switch). 502 tests + 1 real run (Chrome DevTools, PASS) verified. `docs/plans/2026-06-21-overnight-auto-agy-qa.md` §20-21.
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
