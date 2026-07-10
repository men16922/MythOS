# Agent Brief

Last updated: 2026-07-10

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **Session #6 (2026-07-10, DEPLOYED `mythos-api-00041-kl5`): Se-rin mid-loop casting = pure GM hallucination (prod-verified `loop_2a0ddb…`: new su_ah loop, empty party, NO met_se_rin, model-invented `serin_trace_found`) — fixed directive-layer (`dfede1e`: past-ally echo reframed as absent + persistent COMPANION PRESENCE RULE with meet-arc carve-out so recruitment holds). Prompt-guard → CONFIRM via a fresh su_ah loop (existing loops keep baked-in Se-rin, not retroactive). ── Session #5 (DEPLOYED `mythos-api-00040-skm`, smoke 200, `make check` 972, emulator @390px verified): choice-latency **image-decouple** (prod logs: choices lagged p50 9.4s/max 30s + 4% hang incl. 442s/478s — synchronous scene-image gen gated the snapshot; streaming now defers image via `RuntimeOptions.defer_image` + trailing `visual` event → existing `visual_status` frame, REST unchanged, +regression test) · mobile touch fixes (typewriter scroll jank = IntersectionObserver stick-to-bottom+instant; combat portrait page-scroll = `touch-action:pan-x` on board wrapper) · density (proportional Korean `--font-read` on narration/choices/objective, mono stays for HUD; STATUS drops raw loop UUID + `phase` enum on mobile) · stat-name unify (연산/공명/반사/지각 → 지능/매력/민첩/관측, flavor proper nouns kept). NEXT (human): `! git push` (repo sync — deploy was local-source build, git still ahead of origin) + real-device confirm of typewriter/combat touch-scroll + track-4 balance playtest.** Prior: DEPLOYED rev `mythos-api-00039-r27` (2026-07-10, `make check` 971, smoke health/root 200; deploy pins .env PROJECT_ID via --project — ambient gcloud project drifted once → stray service in `claude-study-501117`, deleted). **TOP LIVE-TEST: balance-playtest track 4** — the play-style consequence system (`26cacc8`) was dormant (axis-intent flags never produced) and is now deterministically wired (`advance_route` axis tally → flag at threshold 2); play two loops in different styles, confirm the story/results diverge and balance is OK (threshold tunable). Latest live: the Se-rin-in-variant-opening fix trio — #4 solo_opening (bible `opening_variant` gate + carried-companion suppression), #5 ally-writeback (story-flag allies no longer promoted to permanent party), #6 TRUE ROOT (Se-rin starting-party gate keys on `len(loops)` not `runs_completed`; an abandon-heavy tester kept runs_completed=0 → tutorial Se-rin re-seeded into every loop incl. variants — Neon-verified, DB cleanup deliberately NOT done). Also live: mobile "대본 최우선" (#3) + #3b setup overflow (all screens h-overflow-free @390px; market/boss/ending not swept). Latest live: **tae_o/han portrait-flash FIXED** (`6e5f13f`) · **choice-gated stat voices w/ persona cast** (`51b2264` — inner-monologue fires only on this turn's choice stat-checks; 근력=거친남성·지능=중성AI·매력=여성누나·민첩=다급소년·관측=냉철노관찰자; owner-confirmed applied) · **Companion-appearance thread CLOSED** (full audit): a prior-loop companion must re-introduce before appearing — unified on "present this loop = `unlock_flags∩flags`" across combat (`31bdceb` opening-anchor flag strip), portrait (`6e5f13f`), cutscene (`10efaeb` present-gate, was affection-only), post-combat narration (`0f52e16` dropped hardcoded 세린 example), + loop-start guardrail (`9bfce0d`). Only affection carries (echoes). Story-bible/images audited clean. Owner clean-loop retest (new player/key) pending; in-flight/legacy loops = new loop or DB cleanup. **"이번 막" objective = by-design two-tier (act vs node), not a bug.** **NEXT (human):** `! git push` (ahead of origin) + real-device mobile pass + live sign-off (tae_o flash real-device confirm, fresh-loop prose/tone, Audrey EN retest). `[auto]` overnight backlog drained.** Prior session (all live): **Se-rin-flash reopened bug FIXED** (early `loop_meta` WS frame gives the client the opening variant before the slow generation, killing the 8s-timeout default-then-swap — **owner-confirmed working live**) · **mobile UX**: header **hidden mid-play** behind a floating ⋯ menu (language/COMPACT/BGM/leave), narration-first (scene image → 16:9 banner, inline CHARACTER → collapsed chip), **tab rename** to one clear i18n noun each (이야기/도감/인물/스킬, KO+EN). Earlier this day also live: DS0–DS3 · LC0-6 · S4 · P1.5 · opening prose. `make check` **956** green; WS order `loop_meta→token→snapshot` test-locked; mobile emulator-verified @390px (header display:none + floating ⋯ + banner + chip + 42px tab row). **Human-only now:** **`! git push`** (git ahead of origin) · **real-device phone pass** (mobile is emulator-only — touch/notch/`100dvh` URL-bar) · optional S4/T4 카피 톤 · T5c iso @390px. Traps: E2E uses port 8080 (adminer conflict → use 8099); fresh browser defaults EN; chrome-devtools window has a ~500px min width — use the `emulate` tool for a true 390px viewport; `make api` (Ollama, localhost DB) is free for layout checks; `make api-cloud` is billable (Vertex) AND now points at the **PROD Neon DB** — writes hit production, stop it (`make api-stop`) when done.

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
