# Agent Brief

Last updated: 2026-09-05

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-09-05: the 08-09 hold is lifted — `mythos-api-00085-mvr` ships the 39-commit fix bundle, and a repo-wide review landed three more bundles (`047fcf0`..`f1d22d6`), all live on `mythos-api-00087-w7z` (with 8/13 review residuals) — read PROGRESS_LOG 2026-09-05 first; the `MYTHOS_WORLD_ID` split it found means the next arm is the first with archive-driven starting scores. Residuals are in NEXT_PLAN "Review residuals". Run `/overnight-harness:tidy-docs` (entry docs over budget).** **Two tracks. The product track is owner-gated; the serving-research track is not.** **Research (unblocked, start here):** `docs/plans/2026-08-30-mythos-as-serving-research-workload.md` — P0 done (prompt trace, engine adapter, `experiments/` harness); **first action = P1-2, capture a long clean arm (30–50 turns) via `make infra-up` → `connect` → `python -m experiments.capture_trace <loop_id> 40` with `MYTHOS_PROMPT_TRACE` set, then `make experiment ARGS="workload-profile --trace <dir>"`** to curve prefix sharing over loop length; that sets the P3 prefix-caching design. Scope is a research bench, **not** production self-hosting — the evidence puts that far out of range (`docs/reference/2026-08-30-self-hosted-inference-and-mythos-as-research-platform.md`). **Product track — OWNER VERDICT still blocks it; do not start Priority 0 coding.** The §3 arm `loop_426b710d…` is banked, audited **47/47 non-fallback** (59 scenes, EN, `ending_erasure`), **admitted to the frozen `promotion` bank on 2026-08-13** (the 22+25 two-build split was ruled acceptable) and **scored 3/5**. **Do not read a promotion off that score**: re-scoring the two byte-identical 07-28 samples returned 2/5 where they scored 3/5 in July, so judge variance (~1 point) is as large as the gap. Report `outputs/evals/20260814-005948/`; owner packet `outputs/evals/20260808-owner-review/owner-review.md`; checklist `docs/test/neo_seoul_live_qa.md`. **Two decisions are the owner's** — (1) the ending/overall feel verdict, now the *only* usable basis; **read the ending from Run History (`make api-cloud`, read-only) — the transcript's last three scenes are the boss-fight log**; and (2) how to make the rubric decidable at all (median over N runs / pin the judge engine / drop the numeric gate), since it currently cannot separate a real change from its own noise. **`main` is unpushed and ahead of `origin/main`, all undeployed on purpose** — this session and the 08-09 sweep changed a *gameplay* branch (EN players can now refuse Se-rin) plus axis chips, portraits and opening art, so deploying first desyncs what the owner is judging and the next arm stops being comparable on those axes (M79, DECISIONS 2026-08-09). The whole 08-08 display-gap track is now **closed**: the chip-coverage call was decided (coverage adopted, chipless 34% → 10%, `docs/plans/2026-08-09-value-axis-vocabulary-coverage.md`) and `CURRENT OBJECTIVE` **did** reproduce — the earlier ruling-out measured the server; the desktop strip had no `objective || chapter_goal` fallback. **Do not build the stream-stall watchdog** (hidden-tab throttling, not a server stall). **Do not add keyword inflections on principle** — measured 2026-08-09: 7 of 9 change nothing and 2 misclassify. New in plan (queued behind the verdict): combat status-effect **stacking** rework, owner decision 2026-08-15 — design snapshot first (NEXT_PLAN "Combat — status-effect stacking rework").

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
