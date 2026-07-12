# CLAUDE.md

Guide for the Claude Code agent in this repo. Ground all design in `harness/CORE_MANDATES.md`; read current task context from `harness/CONTEXT_BRIDGE.md` first. The agent operations harness (loop / multi-agent / context / prompt) lives in `docs/engineering/README.md` (universal bible) + `docs/engineering/mythos/` (this repo's interpretation).

**Doc language:** agent-facing operational docs (this file, `harness/*`, `docs/engineering/**`, the `/sync` entry docs, skill bodies, `scripts/overnight/PROMPT*.md`) are authored in **English**. User-facing and narrative content (scenarios, `story_bible`, `directives`, `docs/test` live-QA) stays **Korean**.

## Skills (local + plugin coexistence)

Seeing two skills of the same name in `/skills` is **intentional, not duplication** — same name, different content.

- **No-prefix** (`checkpoint`, `sync`, `tidy-docs`, `overnight-report`, `overnight-seed`, `diagnose`, `gameplay-qa`) — this repo's **`.claude/skills/`** local copies, repo-aware of the MythOS doc system (`STATUS.md`/`NEXT_PLAN.md`/`PROGRESS_LOG.md` …). **Use these for MythOS work.** Bodies are English; the frontmatter `description:` keeps Korean trigger keywords for invocation matching. **Any combat/gameplay change verifies via `gameplay-qa` before claiming done** (`harness/CORE_MANDATES.md` §5).
- **`overnight-harness:`-prefixed** — the plugin's generic (repo-agnostic) originals, the SSOT for installing the harness into other repos; they don't know MythOS context.

Why both: MythOS is the harness **origin tier**, not a consumer, so the local copies are not de-vendored. `.claude/skills/` is the multi-engine SSOT — edit **only `.claude/skills/`**, then `bash harness/sync-skills.sh` projects to the `.codex`/`.gemini`/`.agents` mirrors (`make check` catches drift via `--check`). Mirrors are git-tracked, no symlinks. Rationale: `harness/sync-skills.sh` header.

## Code navigation (LSP-first)

- **LSP is the default** for symbol work — definition, references, type/hover, call hierarchy, document/workspace symbols. The whole codebase is covered (Python via pyright, TS/TSX via vtsls). It is semantic (resolves through imports/types), returns exact `file:line:char`, and is always live — beating grep on the same axis with no staleness. Use it for *which file / which function / called where*. Needs `ENABLE_LSP_TOOL=1` + the `pyright`/`vtsls` plugins (`boostvolt/claude-code-lsps`), or Serena MCP (configured with LSP backend via `.serena/project.yml`).
- **grep** for rare literals / non-symbol text (strings, config, comments) and for engines without an LSP tool (e.g. the Codex/agy overnight lanes).

## What this is

The local MVP runtime for Project MythOS (`세계:접속`) — an AI-run, loop-based narrative simulation. The runnable vertical: create a player, start a loop, make a choice, resume, archive a loop into an "Echo", and carry that Echo into the next loop as a player memory. Loop state persists to PostgreSQL, representative images go to MinIO (or filesystem), runs emit structured JSON logs (stderr) + OpenTelemetry traces to Jaeger. Everything is local; an Ollama LLM drives narrative and a Diffusers FLUX pipeline renders images on Apple Silicon MPS. The standalone **image agent** (`mythos_image_agent`) is retained: Ollama expands a (usually Korean) idea into an English prompt, then `black-forest-labs/FLUX.1-schnell` renders on MPS (only network dep: first-time HF model download).

**Docs by role** (`docs/README.md` = map, `docs/DOCS_POLICY.md` = rules). Vision/design: `bin/docs/archive/DRAFT.md` (game vision/세계관; its cloud stack is aspirational) and `DESIGN.md` (authoritative system design — components, runtime sequences, PostgreSQL schema, principles §17, risks §18, diagrams §19, hardware/stack §20). Living trackers: `STATUS.md` (current state/focus/risks — read first), `NEXT_PLAN.md` (rolling plan), `PROGRESS_LOG.md` (dated increments, newest on top), `COMPLETED_SUMMARY.md`, `DECISIONS.md`. Dated snapshots in `docs/plans/YYYY-MM-DD-<topic>.md`. **Read `STATUS.md` + `NEXT_PLAN.md` before working**; on progress append `PROGRESS_LOG.md` then update `STATUS.md` (+ `COMPLETED_SUMMARY.md`/`DECISIONS.md` as warranted). Authoritative schema source is `migrations/001_init.sql`.

## Commands

```bash
make setup        # create .venv, pip install -e .
make doctor       # python agent.py --doctor (env preflight; does NOT load FLUX)
make hf-login     # hf auth login
make run          # image agent: generate from a sample Korean prompt
make clean        # remove caches and build artifacts
make streamlit    # streamlit run streamlit_app.py
```

### Playing the runtime (CLI)

```bash
make connect-demo   # fast fallback demo: new-player + connect --fallback

python -m mythos_runtime.connect_cli new-player "이름" --player-id player_001
python -m mythos_runtime.connect_cli connect --player-id player_001 --fallback   # no Ollama
python -m mythos_runtime.connect_cli connect --player-id player_001              # real Narrative Director (needs Ollama)
python -m mythos_runtime.connect_cli choose --loop-id <id> --choice-id <id> --fallback
python -m mythos_runtime.connect_cli resume --loop-id <id>
python -m mythos_runtime.connect_cli archive --loop-id <id>
```

`--fallback` skips Ollama (canned narrative); default calls the Ollama-backed Narrative Director. `--with-image` (+ optional `--filesystem-image`/`--image-width`/`--image-height`/`--image-steps`) generates a representative image; without `--filesystem-image` it uploads to MinIO. Default image 1024×1024 / 4 steps.

### Image agent (direct)

Activate the venv first (`source .venv/bin/activate`):

```bash
python agent.py "한글 아이디어"                  # expand + generate
python agent.py "english prompt" --no-enhance     # skip LLM expansion, pass straight to FLUX
python agent.py "아이디어" --expand-only          # print expanded prompt only; never loads FLUX
python agent.py "아이디어" --output outputs/foo.png
python agent.py --help
```

Key flags: `--steps` (default 4), `--seed` (42), `--width`/`--height` (1024), `--model-id`, `--ollama-model`.

### Tests & smoke

```bash
make test         # unittest discover -s tests   (MYTHOS_LOG_LEVEL=ERROR)
make test-db      # postgres integration tests (MYTHOS_RUN_DB_TESTS=1; needs infra-up + db-migrate)
make smoke-local  # compileall + test + narrative-smoke-fallback + visual-smoke (no external services)
make smoke        # smoke-local + test-db + visual-smoke-minio-db (needs full infra)

make narrative-smoke           # python -m mythos_narrative.smoke (uses Ollama)
make narrative-smoke-fallback  # canned, no Ollama
make visual-smoke              # fake-PNG visual path, no FLUX
make visual-smoke-minio-db     # visual path -> MinIO + Postgres
make visual-smoke-flux-tiny    # real FLUX at 128x128, 1 step
```

Single module: `MYTHOS_LOG_LEVEL=ERROR .venv/bin/python -m unittest discover -s tests -p 'test_loop_engine.py'`. DB tests (`tests/test_postgres_store.py`) skip unless `MYTHOS_RUN_DB_TESTS=1` + Postgres up/migrated. Quality: ruff (`[tool.ruff]` in `pyproject.toml`) + mypy (dev deps via `pip install -e .[dev]`), eslint on frontend; `make lint`/`typecheck`/`check`/`check-auto` wire them. `make check` also runs `check-skills` (mirror drift) + `check-doc-budget` (entry-doc line caps). CI (`.github/workflows/ci.yml`) runs `make lint`/`typecheck`/`test` on push/PR to `main`. Tests use stdlib `unittest` (not pytest).

### Local infra (stateful stores + dev tooling; Ollama and FLUX stay on the host)

```bash
make infra-up     # docker compose -f docker-compose.local.yml up -d
make infra-ps     # service status
make infra-logs   # follow logs
make infra-down   # stop and remove containers
make infra-reset  # down -v AND wipe .docker/ volume data (destructive)
make db-migrate   # apply migrations/*.sql inside the postgres container
make db-reset     # DROP/CREATE public schema, then re-migrate (destructive)
make db-shell     # psql into the postgres container
```

`docker-compose.local.yml`: postgres:5432, adminer:8080, minio:9000/9001 (`minio-init` bootstraps buckets), otel-collector:4317/4318, jaeger:16686. (Redis was removed 2026-07-04 — image generation is synchronous in-request everywhere.) Volume data under `.docker/` (gitignored). OTel config `docker/otel-collector-config.yaml`; the collector owns the host OTLP ports and forwards to Jaeger internally.

## Architecture

Source under `src/` (setuptools src-layout; `pip install -e .` exposes packages; `agent.py` also prepends `src/` to `sys.path`). Small packages — see `DESIGN.md` for full specs:

- **`mythos_core`** — shared domain layer. `models.py` (frozen dataclasses: `PlayerProfile`/`LoopState`/`Scene`/`Choice`/`WorldEvent`/`Echo`/`PlayerMemory`/`WorldMemory`/`AssetRecord`, `LoopPhase`/`Actor` `StrEnum`s, generic `to_json_dict`/`from_json_dict`); `ids.py` (prefixed UUIDs); `seed.py` (deterministic loop seed = sha256 of player+loop_index+memory snapshot); `clock.py` (`utc_now()`).
- **`mythos_memory`** — persistence. `store.py` = `MythOSStore` ABC (+ `transaction()`); `postgres_store.py` = psycopg impl, `DATABASE_URL` default `postgresql://mythos:mythos@localhost:5432/mythos`, reentrant transactions. Loop `active_echoes` live in `loops.state` JSON under `_active_echoes`. Schema `migrations/001_init.sql`.
- **`mythos_narrative`** — Narrative Director. `director.py` `NarrativeDirector` calls an LLM `JSONProvider` (default `OllamaJSONProvider`) → JSON `ScenePayload`. Flow: generate → `parser.parse_scene_payload` → one LLM **repair** on parse failure → deterministic **fallback** (also `--fallback`). `schemas.py` limits: `MAX_NARRATION_CHARS=2200`, `MAX_VISUAL_BRIEF_CHARS=700`, `MAX_CHOICES=4`. `prompts.py` builds messages; `smoke.py` standalone entry.
- **`mythos_loop`** — state machine. `LoopPhase`: `CONNECT → EXPLORE → INTERACT → REWRITE → ARCHIVE → ENDED`. `engine.py` `apply_scene_payload()` validates, advances phase, clamps `stability`/`tension` 0–100, merges `world_delta` flags, mints an `Echo` on ARCHIVE/ENDED. Auto-archives at `stability<=10` / `tension>=90` / payload `end_condition`. `validator.py` enforces transitions + clamps world-delta to ±25; `events.py` builds `WorldEvent`s.
- **`mythos_runtime`** — orchestration. `session.py` `RuntimeSessionService` = core API (`create_player`/`start_loop`/`choose`/`resume`/`archive`), wiring store+director+engine, one DB transaction per transition. `connect_cli.py` = CLI; `streamlit_app.py` = UI; `visual_service.py` = pluggable `VisualProvider` (`LocalFluxProvider` → `mythos_image_agent.generate_image`) + `StorageAdapter` (`Filesystem`/`MinIO` via boto3), recording an `AssetRecord` per attempt (tests inject a fake provider). `observability.py` = JSON logger, OTLP/Jaeger `span()`, `timed()`.
- **`mythos_image_agent`** — standalone two-stage image pipeline (below).

### Image agent pipeline

1. **`prompting.py`** — `expand_prompt()` calls Ollama (OpenAI-compatible endpoint). System prompt → one clean English paragraph <70 words. Only stage needing Ollama.
2. **`generator.py`** — `generate_image()` loads `FluxPipeline` on MPS (`bfloat16`), VAE tiling, saves PNG; translates `GatedRepoError`/`HfHubHTTPError` into actionable `RuntimeError`s about HF access.

`cli.py` orchestrates: args → `AgentConfig` → optional expand → optional generate. **Heavy imports (`torch`, `diffusers`, `prompting`) are deferred inside `main()`/function bodies**, so `--help`/`--doctor`/`--expand-only` stay fast without torch. `mythos_runtime.visual_service` imports `generate_image` at module level but torch only loads when it runs — **preserve this lazy-import pattern** so importing the runtime never pulls in torch. `config.py` `AgentConfig` = frozen dataclass, defaults from env (`.env` at import); `hf_auth_token` returns token or `True`. `doctor.py` `run_doctor()` checks Python/arch, MPS, packages, Ollama + model, and HF gated access (dry-run `hf_hub_download` of `model_index.json`); never loads FLUX weights.

## Environment & constraints

- **Apple Silicon / MPS only** for image generation. `generator.py` hard-fails if MPS unavailable. `PYTORCH_ENABLE_MPS_FALLBACK=1` default. Non-image paths (`--fallback`, fake-PNG visual smoke) need no MPS.
- **FLUX.1-schnell is a gated HF repo** — accept access + `HF_TOKEN` in `.env` or local `hf auth login`. `make doctor` fails if access missing.
- Config via `.env` (copy `.env.example`): Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL` default `gemma4:latest`), `IMAGE_MODEL_ID`, `OUTPUT_DIR`, `HF_TOKEN`, + PostgreSQL/MinIO/OTel. OOM mitigation: `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` (removes MPS guardrail — can swap heavily).
- `MYTHOS_LOG_LEVEL` controls runtime log verbosity (tests use `ERROR`). `MYTHOS_RUN_DB_TESTS=1` opts into Postgres tests. `outputs/` is gitignored except `.gitkeep` (default `outputs/mythos-output.png`).

## Agent execution constraints (from /insights 2026-07-05 — recurring friction)

- **Gate commands**: run `make check`/`make test`/… from the repo root exactly as listed in Commands. Never chain with `cd && <cmd>` (sandbox blocks compound forms); use absolute paths or Makefile targets.
- **Permission-classifier hard blocks — do not retry; hand the user the exact command to run via the `!` prefix instead**: `git push` (private repo), IAM/role grants (`gcloud iam …`), printing or materializing credentials (admin keys, tokens, `INVITE_KEY.md`; subshell injection without echoing is acceptable), editing shell profiles (`~/.zshrc`) or creating launchd/system services, plugin-marketplace config edits, launching agents with `--dangerously-skip-permissions`.
- **Destructive cleanup**: prefer explicit file-by-file removal over broad `rm -rf` on source/tool directories; confirm before deleting anything you did not create.
