# CLAUDE.md

이 문서는 Claude Code 에이전트를 위한 가이드다. 모든 설계의 근간은 `CORE_MANDATES.md`를, 현재 작업의 상세 맥락은 `CONTEXT_BRIDGE.md`를 최우선으로 참조하라.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The local MVP runtime for Project MythOS (`세계:접속`) — an AI-run, loop-based narrative simulation. The runnable slice is a CLI-playable vertical: create a player, start a loop, make a choice, resume, archive a loop into an "Echo", and have that Echo carried into the next loop as a player memory. Loop state persists to PostgreSQL, representative images go to MinIO (or the filesystem), and runs emit structured JSON logs (stderr) + OpenTelemetry traces to Jaeger. Everything runs locally; an Ollama LLM drives narrative generation and a Diffusers FLUX pipeline renders images on Apple Silicon MPS.

The original standalone **image agent** is retained as one component (`mythos_image_agent`): an Ollama LLM expands a (typically Korean) idea into a detailed English prompt, then `black-forest-labs/FLUX.1-schnell` renders it on MPS. Its only network dependency is the first-time Hugging Face model download.

`docs/` is split by role (see `docs/README.md` for the full map and `docs/DOCS_POLICY.md` for the update rules). The Korean vision/design docs are **`DRAFT.md`** (game vision/세계관 — the what/why; its cloud stack is aspirational, not built) and **`DESIGN.md`** (the authoritative system design — components, runtime sequences, PostgreSQL schema, plus folded-in design principles §17, risks §18, Mermaid diagrams §19, and hardware/stack rationale §20). Progress is tracked across several living docs instead of one tracker: **`STATUS.md`** (current implementation state, active focus, open risks — read this first), **`NEXT_PLAN.md`** (rolling phase/task plan), **`PROGRESS_LOG.md`** (append-only dated increments, newest on top), **`COMPLETED_SUMMARY.md`** (closed-milestone summaries), and **`DECISIONS.md`** (hard-to-reverse choices). Dated plan snapshots live in `docs/plans/YYYY-MM-DD-<topic>.md`; the old single tracker is archived at `docs/archive/IMPLEMENTATION_M0_M10.md`. **Check `STATUS.md` + `NEXT_PLAN.md`** before starting work, and when you make progress append to `PROGRESS_LOG.md`, then update `STATUS.md` (and `COMPLETED_SUMMARY.md`/`DECISIONS.md` as warranted). `DESIGN.md` specs the `mythos_core` / `mythos_memory` / `mythos_narrative` / `mythos_loop` / `mythos_runtime` packages and the schema, but the authoritative schema source is `migrations/001_init.sql`.

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

`--fallback` skips Ollama and uses canned narrative; the default path calls the Ollama-backed Narrative Director. Add `--with-image` (plus optional `--filesystem-image`, `--image-width`, `--image-height`, `--image-steps`) to generate a representative image; without `--filesystem-image` it uploads to MinIO. Default image is 1024×1024 / 4 steps.

### Image agent (direct)

Activate the venv first (`source .venv/bin/activate`):

```bash
python agent.py "한글 아이디어"                  # expand + generate
python agent.py "english prompt" --no-enhance     # skip LLM expansion, pass straight to FLUX
python agent.py "아이디어" --expand-only          # print expanded prompt only; never loads FLUX
python agent.py "아이디어" --output outputs/foo.png
python agent.py --help
```

Key flags: `--steps` (default 4, the schnell recommended value), `--seed` (42), `--width`/`--height` (1024), `--model-id`, `--ollama-model`.

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

Run a single test module: `MYTHOS_LOG_LEVEL=ERROR .venv/bin/python -m unittest discover -s tests -p 'test_loop_engine.py'`.

DB-backed tests (`tests/test_postgres_store.py`) are skipped unless `MYTHOS_RUN_DB_TESTS=1` and the Postgres service is up and migrated. There is no linter or CI configured; `make clean` references `.pytest_cache`/`.ruff_cache` but neither pytest nor ruff is a dependency (tests use stdlib `unittest`).

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

`docker-compose.local.yml` runs postgres:5432, adminer:8080, minio:9000/9001 (`minio-init` bootstraps buckets), redis:6379, otel-collector:4317/4318, jaeger:16686. Volume data lives under `.docker/` (gitignored). OTel collector config is `docker/otel-collector-config.yaml`; the collector owns the host OTLP ports and forwards traces to Jaeger internally.

## Architecture

Source lives under `src/` (setuptools src-layout; `pip install -e .` exposes the packages, and `agent.py` also prepends `src/` to `sys.path` so the image agent runs without an editable install). The runtime is composed of small packages:

- **`mythos_core`** — shared domain layer imported by everything else. `models.py` holds the frozen dataclasses (`PlayerProfile`, `LoopState`, `Scene`, `Choice`, `WorldEvent`, `Echo`, `PlayerMemory`/`WorldMemory`, `AssetRecord`) plus the `LoopPhase`/`Actor` `StrEnum`s and generic `to_json_dict`/`from_json_dict` (de)serialization used by the store. `ids.py` mints prefixed UUIDs (`loop_…`, `scene_…`, etc.); `seed.py` derives a deterministic loop seed (sha256 of player+loop_index+memory snapshot); `clock.py` provides `utc_now()`.
- **`mythos_memory`** — persistence. `store.py` is the `MythOSStore` ABC (players, loops, scenes, events, player/world memories, assets, plus a `transaction()` context manager); `postgres_store.py` is the psycopg implementation, with `DATABASE_URL` defaulting to `postgresql://mythos:mythos@localhost:5432/mythos` and reentrant transactions. Loop `active_echoes` are stored inside the `loops.state` JSON under `_active_echoes`. Schema is `migrations/001_init.sql`, applied via `make db-migrate`.
- **`mythos_narrative`** — the **Narrative Director**. `director.py`'s `NarrativeDirector` calls an LLM `JSONProvider` (default `OllamaJSONProvider`, via the OpenAI-compatible endpoint) to emit a JSON `ScenePayload`. Flow: generate → `parser.parse_scene_payload` → on parse failure, one LLM **repair** attempt → on repeated failure, a deterministic **fallback** scene (also used directly when `--fallback` is set). `schemas.py` defines `ScenePayload`/`WorldDelta`/`NarrativeContext` and the limits (`MAX_NARRATION_CHARS=2200`, `MAX_VISUAL_BRIEF_CHARS=700`, `MAX_CHOICES=4`, allowed world-delta keys). `prompts.py` builds the message lists; `smoke.py` is the standalone entry (`python -m mythos_narrative.smoke`).
- **`mythos_loop`** — the loop state machine. `LoopPhase` cycles `CONNECT → EXPLORE → INTERACT → REWRITE → ARCHIVE → ENDED`. `engine.py`'s `LoopEngine.apply_scene_payload()` validates the payload, advances the phase, clamps `stability`/`tension` to 0–100, merges `world_delta` flags into `loop.state`, and on ARCHIVE/ENDED mints an `Echo`. It auto-archives when `stability<=10` or `tension>=90` or the payload's `end_condition` requests it. `validator.py` enforces the allowed phase transitions, choice rules, and clamps each world-delta value to ±25; `events.py` builds player/world `WorldEvent`s.
- **`mythos_runtime`** — orchestration. `session.py`'s `RuntimeSessionService` is the core API (`create_player`/`start_loop`/`choose`/`resume`/`archive`), wiring store + director + engine and persisting each transition in one DB transaction. `connect_cli.py` is the CLI over it (it instantiates `PostgresMythOSStore` directly); `streamlit_app.py` is a UI over the same service. `visual_service.py` is a pluggable image pipeline: a `VisualProvider` (`LocalFluxProvider` → `mythos_image_agent.generate_image`) plus a `StorageAdapter` (`FilesystemStorageAdapter` or `MinIOStorageAdapter` via boto3), recording an `AssetRecord` for every attempt (status `succeeded`/`failed`/`disabled`); tests inject a fake provider so the visual smoke never loads FLUX. `observability.py` provides the JSON logger, the OTLP/Jaeger `span()`, and the `timed()` context manager.
- **`mythos_image_agent`** — the standalone two-stage image pipeline (see below).

### Image agent pipeline (two independent stages wired by its CLI)

1. **`prompting.py`** — `expand_prompt()` calls Ollama through its OpenAI-compatible endpoint (`OpenAI(base_url=.../v1, api_key="ollama")`). System prompt constrains output to one clean English paragraph under 70 words. This is the only stage that needs Ollama running.
2. **`generator.py`** — `generate_image()` loads `FluxPipeline` on MPS (`bfloat16`), enables VAE tiling, saves a PNG, and translates `GatedRepoError`/`HfHubHTTPError` into actionable `RuntimeError` messages about Hugging Face access.

`cli.py` orchestrates: parse args → build `AgentConfig` → optionally expand → optionally generate. **Heavy imports (`torch`, `diffusers`, `prompting`) are deliberately deferred inside `main()` / function bodies**, so `--help`, `--doctor`, and `--expand-only` work (and stay fast) without torch loaded or even installed. `mythos_runtime.visual_service` imports `generate_image` at module level but torch only loads when that function actually runs — preserve this lazy-import pattern so importing the runtime (and the fake-provider smoke tests) never pulls in torch.

`config.py` — `AgentConfig` is a frozen dataclass whose defaults read from environment variables (`.env` loaded at import time). `PROJECT_ROOT` is derived relative to the source file; `output_path()` resolves relative paths against it. `hf_auth_token` returns the token or `True` (telling huggingface_hub to fall back to a local `hf auth login` session).

`doctor.py` — `run_doctor()` checks Python/arch, MPS availability, required packages, Ollama reachability + whether the configured model is installed, and Hugging Face gated-model access (via a `dry_run` `hf_hub_download` of `model_index.json`). It never loads FLUX weights; returns a nonzero exit code on any failure.

`streamlit_app.py` (repo root) is a Streamlit UI over the runtime.

## Environment & constraints

- **Apple Silicon / MPS only** for image generation. `generator.py` hard-fails if `torch.backends.mps.is_available()` is False. `PYTORCH_ENABLE_MPS_FALLBACK=1` is set by default. The non-image runtime paths (`--fallback`, fake-PNG visual smoke) do not require MPS.
- **FLUX.1-schnell is a gated HF repo.** Requires accepting access on Hugging Face plus either `HF_TOKEN` in `.env` or a local `hf auth login`. `make doctor` fails here if access is missing.
- Config is driven by `.env` (copy from `.env.example`): Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, default `gemma4:latest`), the image model (`IMAGE_MODEL_ID`), `OUTPUT_DIR`, `HF_TOKEN`, plus PostgreSQL / MinIO / OTel settings consumed by the runtime — see `.env.example` for the full list. OOM mitigation: set `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` (removes the MPS memory guardrail — can cause heavy swap).
- `MYTHOS_LOG_LEVEL` controls runtime log verbosity (tests run with `ERROR`). `MYTHOS_RUN_DB_TESTS=1` opts into the Postgres integration tests.
- `outputs/` is gitignored except `.gitkeep`; the image agent default output is `outputs/mythos-output.png`.
