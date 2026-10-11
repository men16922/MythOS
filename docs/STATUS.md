# Project MythOS Status

Last updated: 2026-10-11

## Current Baseline

**Mythos 2.0 "Signal Run" (2026-10-10, branch `mythos-2.0`) is the active game**: a client-side TypeScript tactical deck-building roguelite (Into the Breach telegraphs on a 7×5 board + Slay the Spire deck/implants + Hades-style meta loop) with the AI GM off the critical path. Engine `src/mythos_ui/src/v2/engine` (pure TS, seeded, `node --test`), content `v2/content` (89 cards, 27 enemies, 37 encounters, 44 implants, 38 events, 23 lore, 20 unlocks), UI `v2/ui`, server `src/mythos_v2` (`/api/v2` saves + GM narrate/improvise, `v2_saves` table with memory fallback), new art/music under `resources/neo-seoul/v2/`. Rules: `docs/GAMEPLAY.md`. The 1.x runtime below is unchanged and reachable at `/?classic=1`.

The 1.x line is past local-playable MVP into a state where a React SPA + FastAPI API + Streamlit demo coexist. The core runtime is shared through a single `RuntimeSessionService`.

Major implemented axes:

- **Shared runtime/UI**: `RuntimeSessionService` is the single orchestration boundary for FastAPI REST/WS, React/Vite, Streamlit, and CLI.
- **Persistence/infra**: PostgreSQL is authoritative; MinIO/GCS store assets; OTel/Jaeger/Cloud Trace cover observability. Redis was removed 2026-07-04, so images generate synchronously in-request.
- **Narrative**: local development uses Ollama 8B storyteller + 3B parser with repair/fallback; the cloud product uses Vertex Gemini controlled generation. Prompt directives, Story Bible snippets, deterministic session synopsis, shard rollup, and outcome metrics are integrated.
- **Cloud model operations**: narrative is full `gemini-3.5-flash`; image generation is GA `gemini-3.1-flash-image` on its model-specific `global` endpoint while Cloud Run/GCS remain `us-central1`. The prior 3.1 404 was a regional endpoint mismatch, not model unavailability.
- **Visuals**: local mflux/FLUX + Redux and cloud Gemini image share the provider/storage boundary; curated scene/cutscene/ending art and synchronous generation are active.
- **Gameplay**: deterministic tactical combat, direct party control, companion growth/equipment, enemy intents, skills/items, combat cinema, rewards, boons, market/recovery, and IX boss flow are implemented. The 2026-07-11..14 combat overhaul arc (telegraph→control→status→visuals→enemy roster→balance→portrait dock) is owner-QA-passed — `COMPLETED_SUMMARY.md` M59-M60.
- **Scenario/progression**: Neo-Seoul is the primary long-form scenario; route-node DAG + multi-perspective anchors + session memory, Story Bible, Codex, Run History, achievements, meta progression, save/load, and ending resolver are implemented. Glass Library is parity-ready but held.
- **Localization/CBT**: EN-default/KO bilingual UI+API+prompts, invite-gated stable identity, loop caps, Save/Load UX, and the Cloud Run closed beta are live. Teaser V2 published (YouTube, 2026-07-14).
- **Agent operations**: plugin-owned Overnight Harness V2, required lane-aware contracts, semantic/domain verifier evidence, and three-engine worktree tooling are active. Harness pin updated to **1.4.0** 2026-09-05 (`.claude/harness-config.json` `harness_root`; the prior 1.3.4 cache dir no longer exists, which had silently broken `HARNESS_ROOT` resolution to empty). 1.4.0 adds per-repo Claude model routing (actor `CLAUDE_MODEL=claude-sonnet-5`, critic `OVERNIGHT_CRITIC_MODEL=claude-fable-5-1`), now exported from the Makefile. Generic lifecycle skills remain plugin-owned; repo-local skills remain `$gameplay-qa`/`$codebase-design`. Remote publication is intentionally absent.

Latest verified baseline:

- **2026-10-11 2.0 residuals closed** — boss narration, sharper IX, daily seed, phone combat, Act 3 burst cards. Sim P0 greedy 100 % · mixed ≈ 35 % (P5 78 / 3). Only owner calls remain (SFX listen, deploy, push).
- **2026-10-11 2.0 feedback round** — ground effects + board FX, punchier SFX, companion passives/cards, AI companion chat + GM card + IX comms, visible autosave. Sim P0 greedy 93 % · mixed 38 % (P5 83 / 6). Detail: PROGRESS_LOG 2026-10-11, DECISIONS 2026-10-11.
- **2026-10-10..11 MYTHOS 2.0 BUILT (branch `mythos-2.0`, UNDEPLOYED)** — the default `/` is now 2.0; 1.x unchanged at `/?classic=1`. Gates: `node --test src/v2` (engine/content), `make test` (Python incl. `/api/v2`), tsc/eslint/vite build. Sim: greedy 93 % · mixed 52 % · basic 0 % (P0); P5 92 / 11. Detail: PROGRESS_LOG 2026-10-11, `docs/plans/2026-10-10-mythos-2.0.md`, DECISIONS 2026-10-10.
- **1.x line** — last verified state (prod `00090`, 1404 tests, 2026-09-08) folded into COMPLETED_SUMMARY M90.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

1. **Owner first-play verdict on Mythos 2.0** — `docs/test/mythos2_first_play.md` (how to run it, five things to judge, D–S grade). Everything below waits on it.
2. **Deploy decision** — 2.0 is local-only on branch `mythos-2.0`; shipping it to Cloud Run changes what CBT testers see (owner call; a no-traffic tagged revision is the low-risk option). `main` is also ahead of `origin` (owner `git push`).
3. **1.x tracks paused** — §3 feel verdict, stack/boss-cap verdict, serving-research P2–P5 and the Dev Graph holds stay as written in NEXT_PLAN but are behind the 2.0 verdict; they only resume if the owner keeps investing in the classic build.

## Open Risks

- **2.0 is client-trusted and unplayed by a human end-to-end yet.** Rules run in the browser (single-player, no competitive stakes). Balance is bot-measured (greedy/mixed/basic); the human curve is the owner's first-play verdict. Saves mirror to localStorage and `/api/v2`; the server table self-creates on first use and silently falls back to memory if the DB role can't create it (check `GET /api/v2/health` → `"store":"postgres"`).
- **2.0 generated assets** (`resources/neo-seoul/v2/`, Gemini image + Lyria + Codex image) were spot-checked, not hand-curated; regenerate individual files with `scripts/v2_assets/*` (idempotent, `--force <id>`).
- **Local narrative path: the sampler was inert until 2026-08-30.** `OllamaJSONProvider` sent six options in `extra_body["options"]`, which the OpenAI-compatible endpoint discards — so `repeat_penalty`/`repeat_last_n` (the repetition tuning), `top_p`, `top_k`, `num_predict` and `num_ctx` had never applied. Fixed via `mythos_narrative/engine_options.py` (per-engine translation; `repeat_penalty` → the measured-working `frequency_penalty`; `top_k` undeliverable and dropped explicitly); the 30s client timeout, shorter than a 12–90s generation, is now 180s. Degradation 44% → 0% on a 9-call arm. **Consequence: any local repetition judgement made before this date was made against a model that never received the setting.** Production (Vertex Gemini) is a separate path and unaffected. Residual: the `vllm`/`llamacpp` rows in `engine_options` are **unverified** (the `mlx` row was measured 2026-09-08) — run `make experiment ARGS="option-matrix --engine <id> …"` against an engine before trusting it. Also measured 2026-09-08: **gemma4 spends `max_tokens` on `reasoning` first** on the compat endpoint (a 200-token cap returned empty content), so a tight per-stage `max_output_tokens` on a thinking model can silently yield empty scenes that the fallback hides.
- **Local `.env` points at a model that is not installed (`OLLAMA_MODEL*=gemma4:latest`; only `gemma4:8b-64k` is on disk, 2026-09-06).** Every local narrative call then fails at the provider and the deterministic fallback hides it — a local session looks fine while measuring nothing. Override on the command line (`OLLAMA_MODEL=gemma4:8b-64k OLLAMA_MODEL_STORY=gemma4:8b-64k …`) or have the owner update `.env`; the Ollama server is not running by default (`ollama serve`).
- **World-id unification (2026-09-05) changes what production players see next loop.** Readers now find the archives written since 06-06, so `_initial_loop_scores` applies `recent_archives_*` adjustments to existing players' next loop for the first time, and the memory overview lists their past archives. Expected, but a behaviour change to watch on the next arm; `_player_rollup`/compaction will also run for the first time on players with >retention archives.
- **Context length is a model property, not a setting.** The compat endpoint takes no per-request window; Ollama reads it from the Modelfile. `OLLAMA_NUM_CTX` was removed rather than left as a knob that looks live and does nothing. A model whose window cannot hold ~7.8k prompt + 2k generation returns empty scenes that the fallback hides — pick a `*-64k` variant.
- **Harness/Dev Graph watch items**: local tag/cache is 1.4.0 while remote tag/marketplace remains 1.2.0. Turn excess now rejects acceptance but cannot stop the running Claude invocation; wall/USD caps remain mandatory. Held-out composition is ratified, but repair (`OVERNIGHT_REPAIR=0`) stays off until the frozen single-actor baseline is complete; read-only fan-out still requires explicit authorization. Cross-engine critic has one disagreement datum.
- **Image provider migrated 2026-07-31**: the former 3.1 404 was reproduced only at `us-central1`; the official `global` endpoint produced a real 1024² probe and two successful app-path production assets on `00080`/`00081`. Default/deploy now pin `IMAGEN_LOCATION=global`; 429 and safety-filter empties remain watch items.
- **3.5 whitespace runaway**: streaming controlled generation can emit trailing-whitespace runaway → JSON truncation; a same-model non-streaming retry is live (`b55e933`). Watch `streamed payload unparseable` warning frequency in prod logs — 07-19 audit: **0 occurrences in 5 days** (light traffic caveat).
- **Production narrative fallback watch (2026-07-28)**: excluded safety/evidence `loop_f148…2350` recorded 3/15 fallback; replacement `loop_84df…33ef` passed 47/47. Continue the full Cloud Logging zero-fallback audit before banking every future production sample. **Audited 2026-09-06 (read-only, `project-ec7809f7…`)**: since 08-30 prod logged **0 narrative turns** and 11 `/api/v1/` calls (all this session's probes) — nobody has played on `00085`–`00088`; the only WARNING+ entries are own 404 probes. Nothing to bank; the watch stays armed for the next arm.
- **fallback = static combat is intended (2026-06-06 design)**: combat VFX only play at `?fallback=0`; open the sim WITHOUT `?fallback=1` to see animations.
- **agy browser attach flaky**: intermittent silent hang acquiring browser tools; gtimeout ceiling + verdict-rescue landed. Run live-QA direct from a supervising session; if attach fails twice, hand to human.
- **3.5-flash cost accepted (~$1.0/loop)**: hybrid rolled back 2026-07-17 (quality verdict); partial-2.5 audit found no viable spot (2 LLM touchpoints; thinking already 0). Remaining levers: prompt-cache hit monitoring · prompt diet round 2 (feel-sensitive, deliberately held) · re-evaluate at scale with golden-bank rubric scores.
- DB hygiene (low): `narrative_shards` raw rows retained post-rollup; prune only if size/query load bites.
- Some dated plan files may have stale status headers. Prefer `STATUS.md`, `NEXT_PLAN.md`, `PROGRESS_LOG.md` for current truth.
- Combat image quality varies per character. Prefer an action-sheet-based pipeline over independent pose generation.
- **Closed watch items, kept as one line so the next arm re-checks them** (detail: COMPLETED_SUMMARY M79, `bin/docs/archive/progress-2026-08.md`): play-style consequence alignment (code-side resolved, HOLD verdict was late-loop repetition) · reviser repetition fixed / **upstream model repetition open** (title 32%, location streak 33%; prompt work, gated on §3) · EN localization 0 Hangul (re-check the `획득` chip + `[8시 40분 54초]` timestamps on the next arm) · the runaway trickle was hidden-tab throttling, **do not build a server watchdog** · the 08-08 display gaps were all deterministic defects, fixed · the 08-02 production fallback/`New Vector` watch (retry now live) · companion variant-loop and ally-writeback fixed (one-time DB cleanup on request).

## Source Of Truth

- Agent entry: `docs/AGENT_BRIEF.md`
- Architecture summary: `docs/DESIGN.md`
- Rolling plan: `docs/NEXT_PLAN.md`
- Latest short log: `docs/PROGRESS_LOG.md`
- Completed milestones: `docs/COMPLETED_SUMMARY.md`
- Decisions: `docs/DECISIONS.md`
- Long logs/design: `bin/docs/archive/`
