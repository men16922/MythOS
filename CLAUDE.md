# CLAUDE.md

Guide for the Claude Code agent in this repo. Ground all design in `harness/CORE_MANDATES.md`; read current task context from `harness/CONTEXT_BRIDGE.md` first. The agent operations harness (loop / multi-agent / context / prompt) lives in `docs/engineering/README.md` (universal bible) + `docs/engineering/mythos/` (this repo's interpretation).

**Doc language:** agent-facing operational docs (this file, `harness/*`, `docs/engineering/**`, the `/sync` entry docs, skill bodies, `scripts/overnight/PROMPT*.md`) are authored in **English**. User-facing and narrative content (game text in `src/v2/content`, `docs/test` play guides) stays **Korean**.

## Skills (plugin-owned harness + repo-owned domain skills)

- **`overnight-harness:`-prefixed** (`sync`, `checkpoint`, `tidy-docs`, `overnight-report`, `overnight-seed`, `diagnose`) — the plugin is the only source of these generic workflows. They become repo-aware through `.claude/harness-config.json`. Always use the namespaced form in MythOS; do not add no-prefix copies.
- **No-prefix repo skills** (`gameplay-qa`, `codebase-design`) — MythOS-only domain workflows that the generic plugin does not provide. Any combat/gameplay/balance change verifies via `gameplay-qa` before claiming done (`harness/CORE_MANDATES.md` §5).

`.claude/skills/` is the source only for repo-owned domain skills. Run `bash harness/sync-skills.sh` to project them into `.agents/skills/` for Codex/AGY; `make check` rejects drift or reintroduced plugin duplicates. Plugin lifecycle skills are installed/versioned outside this repository and are never mirrored here.

## Code navigation (LSP-first)

- **LSP is the default** for symbol work — definition, references, type/hover, call hierarchy, document/workspace symbols. The whole codebase is covered (Python via pyright, TS/TSX via vtsls). It is semantic (resolves through imports/types), returns exact `file:line:char`, and is always live — beating grep on the same axis with no staleness. Use it for *which file / which function / called where*. Needs `ENABLE_LSP_TOOL=1` + the `pyright`/`vtsls` plugins (`boostvolt/claude-code-lsps`), or Serena MCP (configured with LSP backend via `.serena/project.yml`).
- **grep** for rare literals / non-symbol text (strings, config, comments) and for engines without an LSP tool (e.g. the Codex/agy overnight lanes).

## What this is

**Mythos 2.0 — 세계:접속 "Signal Run"**: a single-player cyberpunk tactics deck-builder roguelite. Into the Breach-style telegraphed combat on a 7×5 board + Slay the Spire deck/implants + a Hades-style Archive meta loop, set in Neo-Seoul under the administrator AI IX. The game runs entirely in the browser (pure-TS engine); an AI GM (Ollama locally, Vertex Gemini in the cloud) adds narration, companion chat and IX comms **off the critical path** — authored text always shows first and every AI call has an authored fallback. Ships as a web app on Cloud Run and as an Android app (Capacitor). The 1.x AI-narrated loop runtime is archived on branch **`1.0`**.

**Docs by role** (`docs/README.md` = map, `docs/DOCS_POLICY.md` = rules). Rules: `docs/GAMEPLAY.md`. Design/build contract: `docs/plans/2026-10-10-mythos-2.0.md`. Living trackers: `STATUS.md` (read first), `NEXT_PLAN.md`, `PROGRESS_LOG.md` (newest on top), `COMPLETED_SUMMARY.md`, `DECISIONS.md`. Android: `docs/android.md`. Online (sign-in, leaderboard, push): `docs/online.md`. Owner play guide: `docs/test/mythos2_first_play.md`.

## Commands

```bash
make setup            # .venv + pip install -e ".[dev]" + npm ci
make api              # local server: SPA at /, API under /api/v2 (port busy → MYTHOS_API_PORT=8010 make api)
make dev-up           # Postgres (docker) + migrate + api; the API also runs without a DB (in-memory saves)
cd src/mythos_ui && npx vite      # dev UI with HMR; proxies /api and /resources to the local api
make frontend-build   # build the SPA into src/mythos_api/static (committed; Cloud Run serves it)
```

### Tests & gates

```bash
make check            # skills mirror, doc budget, ruff/eslint, mypy (+strict on mythos_api/mythos_v2), tsc/vite build, test-v2, test
make test-v2          # engine/content tests: node --test src/v2/ (Node native TS)
make test             # Python unittest: /api/v2 (saves, GM, talk) + overnight-harness scripts
make test-e2e-v2      # headless muted browser smoke (needs make frontend-build)
make playthrough-quick # ~3 min: 5 map nodes + shop/safehouse/treasure/final-choice tour through the real UI (bot, muted, private ports)
make playthrough      # whole run through the real UI (~20 min, assist mode; `ui_playthrough.py --no-god` for unassisted)
make test-db          # Postgres save-store tests (MYTHOS_RUN_DB_TESTS=1; needs make dev-up)
```

Browser testing is **always silent** (`?mute=1` / localStorage `mythos2.mute=1`) and uses **at most one browser tab** (owner directive); prefer headless Playwright. Combat sandbox: `/?sandbox=combat&mute=1&enc=<encounterId>`. Balance: `simulateRun()` in `engine/runSim.ts` (see `.claude/skills/gameplay-qa/references/qa-routes.md`).

### Deploy

`make deploy` (Cloud Run, env-preserving, `.env` `PROJECT_ID`) / `make deploy-preview` (no-traffic tagged revision). Both stamp the revision with a `git-sha` label. After a preview deploy run `make verify-preview` (read-only: revision built from HEAD, health, google sign-in, served bundle = committed bundle) before anyone promotes it. Deploys are owner decisions; `git push` is owner-only.

## Architecture

- **`src/mythos_ui/src/v2/engine`** — pure TypeScript, seeded RNG stored in state, JSON-serialisable state, reducers clone→mutate→return. `types.ts` is the contract. Combat (`combat.ts`, `effects.ts`, `intents.ts`: telegraphs, push/bump/void, ground fire/live wire, triggers, companion passives), run/map/meta (`run.ts`, `map.ts`, `meta.ts`, `daily.ts`), bots + simulator (`combatSim.ts`, `runSim.ts`). Never `Math.random` here; imports use explicit `.ts` extensions.
- **`src/v2/content`** — typed game data (cards, enemies, encounters, implants, consumables, companions, archetypes, events, lore, endings, IX lines, unlocks, paradox). `content.test.ts` / `narrative.test.ts` / `art.test.ts` guard integrity, quotas and 100 % art coverage.
- **`src/v2/ui`** — React 19 screens (`shell/`), combat board/animator/FX (`combat/`), shared components, `common/` (assets, procedural `sfx.ts`, looped `audio.ts` with hard mute, generated `artManifest.ts`/`spriteManifest.ts`). `src/v2/net/api.ts` = offline-first client for `/api/v2` (localStorage mirror). `src/v2/native/` = Capacitor bridge (Android).
- **`src/mythos_api`** — FastAPI app: CORS, `/api/health`, mounts `/api/v2`, serves `/resources` and the SPA.
- **`src/mythos_v2`** — `/api/v2` router (`api.py`), save store (`store.py`: Postgres `v2_saves` with memory fallback, self-creating DDL = `migrations/009_v2_saves.sql`), AI GM (`gm.py` narrate/improvise, `talk.py` companion chat + IX comms, `llm.py` Ollama/Gemini seam, `config.py`, `log.py`).
- **`resources/neo-seoul/`** — game art/music (2.0 generated set under `v2/`; regenerate via `scripts/v2_assets/`).
- **`src/mythos_ui/android/`** — Capacitor Android project (see `docs/android.md`).

## Environment & constraints

- Config via `.env`: `OLLAMA_BASE_URL`, `OLLAMA_MODEL_STORY` (local GM; `gemma4:8b-64k` is the locally installed model), `MYTHOS_NARRATIVE_PROVIDER=vertex` + `PROJECT_ID` (cloud GM via ADC), `DATABASE_URL`, `MYTHOS_AUTH` (`open` locally; `google` on Cloud Run = Firebase Google sign-in required for cloud saves/GM/leaderboard, see `docs/online.md`), `MYTHOS_CORS_ORIGINS`. Never print or commit `.env` values.
- `MYTHOS_LOG_LEVEL` controls server log verbosity (tests use `ERROR`). `MYTHOS_RUN_DB_TESTS=1` opts into Postgres tests. `outputs/` is gitignored.
- Asset generation: **all new images use Codex image** (`codex exec … generate one image`; scenes, cards, sprites — owner 2026-10-18; it does not bill GCP). Vertex Gemini image (`scripts/v2_assets/gen_images.py`) is only for re-rendering an existing group and needs the owner's OK (it bills Vertex; the ledger cap is `V2_IMAGE_BUDGET`). Music: Vertex Lyria loops (`gen_music.py`). **Vertex Veo API calls are strictly banned** (owner 2026-10-18; 17 clips cost ₩73,916). Any video clip generation is done manually by the owner in the Gemini web app using `docs/test/veo_gemini_owner_guide.md` (`make cinematic-prompts`).

## Definition of done

Say "done" only with evidence, and say what was not checked:

- **Refactor / rename / removal**: grep for leftover references to the old name or path before claiming it is complete.
- **Code**: the relevant gate output (`make check`, `make test-v2`, …) — not "should pass". Gameplay changes also go through `gameplay-qa`.
- **UI / flow change**: exercise it in the real UI (muted, one tab; `make playthrough-quick` or the combat sandbox), not only unit tests.
- **Deploy**: `make verify-preview` green and the revision's `git-sha` label equals HEAD. A deploy command exiting 0 is not proof.
- Anything not run is written as "unverified" in the reply and in `PROGRESS_LOG.md`. Do not add unrequested features or change defaults (e.g. auto-sync behaviour) without asking.
- Commit what is verified and checkpointed (the plugin's `ship` skill does the checkpoint → budget → gate → commit sequence); `git push` stays the owner's.

## Agent execution constraints (from /insights 2026-07-05 — recurring friction)

- **Gate commands**: run `make check`/`make test`/… from the repo root exactly as listed in Commands. Never chain with `cd && <cmd>` (sandbox blocks compound forms); use absolute paths or Makefile targets.
- **Permission-classifier hard blocks — do not retry; hand the user the exact command to run via the `!` prefix instead**: `git push` (private repo), IAM/role grants (`gcloud iam …`), printing or materializing credentials (admin keys, tokens, Firebase configs, signing keystores; subshell injection without echoing is acceptable), editing shell profiles (`~/.zshrc`) or creating launchd/system services, plugin-marketplace config edits, launching agents with `--dangerously-skip-permissions`.
- **Destructive cleanup**: prefer explicit file-by-file removal over broad `rm -rf` on source/tool directories; confirm before deleting anything you did not create.
