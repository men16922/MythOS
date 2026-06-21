# Repository Guidelines

## Project Structure & Module Organization

This is a Python 3.11+ local runtime for Project MythOS. Source packages live under `src/`:

- `src/mythos_core`: pure domain models, IDs, clocks, and seed helpers.
- `src/mythos_memory`: PostgreSQL store interfaces and implementations.
- `src/mythos_narrative`: Ollama-backed narrative generation, prompts, schemas, and parsing.
- `src/mythos_loop`: validation, events, and loop state transitions.
- `src/mythos_runtime`: CLI, Streamlit session service, visual generation, and observability.
- `src/mythos_image_agent`: standalone local Ollama + FLUX image agent.

Tests are in `tests/`. Local infra files are in `docker/`, `docker-compose.local.yml`, and `migrations/`. Runtime outputs belong in `outputs/` and should not be treated as source artifacts. Project planning and design docs are in `docs/`.

## Build, Test, and Development Commands

Use the Makefile targets from the repository root:

- `make setup`: create `.venv` and install the package editable.
- `make infra-up`: start PostgreSQL, MinIO, Redis, OTel, Jaeger, and Adminer.
- `make db-migrate`: apply SQL migrations from `migrations/`.
- `make test`: run standard `unittest` tests.
- `make test-db`: run PostgreSQL integration tests.
- `make smoke-local`: run compile, tests, fallback narrative smoke, and visual smoke.
- `make smoke`: run local smoke plus DB and MinIO checks.
- `make connect-demo`: create a demo player and start a fallback loop.
- `make streamlit`: launch the playable Streamlit demo at `http://localhost:8501`.

## Coding Style & Naming Conventions

Use 4-space indentation, type hints, and small functions with explicit boundaries. Follow the existing dataclass-first style in domain code. Module and function names use `snake_case`; classes use `PascalCase`; constants use `UPPER_SNAKE_CASE`. Keep runtime orchestration in `RuntimeSessionService` rather than duplicating logic in CLI or Streamlit.

## Code Navigation

Use Serena's LSP tools first for symbol-oriented navigation such as definitions, references, types, call hierarchies, and workspace symbols. The repository's `.serena/project.yml` configures Pyright for Python and Vtsls for TypeScript. Use `rg` for literals, configuration, comments, and as the fallback when semantic tooling is unavailable; avoid broad file reads when a targeted symbol or text query is sufficient.

## Testing Guidelines

Tests use Python `unittest` and are named `tests/test_*.py`. Keep pure unit tests independent of Docker. Gate DB tests behind `MYTHOS_RUN_DB_TESTS=1`, as `make test-db` does. For changes touching runtime flows, run at least `make smoke-local`; run `make smoke` when persistence or MinIO behavior changes.

## Commit & Pull Request Guidelines

Use concise, scoped imperative commit subjects (Conventional-Commits style is used in history, e.g. `feat(combat): ...`, `docs: ...`, `chore: ...`). PRs should include a short summary, verification commands, linked issue or task context, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit `.env`, Hugging Face tokens, generated model outputs, or `.docker/` data. Copy `.env.example` to `.env` locally. Ollama and FLUX run on the Mac host; Docker is only for local infrastructure.

## Agent Operations & Context

- Operating mandates live in `harness/CORE_MANDATES.md` (§4 testing, §5 agent discipline: measure-before-perf-fix, docs-first status, confirm structural moves, absolute paths, read-back after writes). Follow them.
- Agent-operation engineering (harness / loop / multi-agent / context / prompt) is defined in `docs/engineering/README.md` — generic bibles (`*_ENGINEERING.md`) plus this repo's interpretation in `docs/engineering/mythos/`.
- Restore context the documented way (`AGENT_BRIEF.md` → `STATUS.md` → `NEXT_PLAN.md` → `PROGRESS_LOG.md`); the procedure is in `.agents/skills/sync/SKILL.md`. Record finished work via `.agents/skills/checkpoint/SKILL.md`. Entry points for specific agent engines are `CLAUDE.md` and `GEMINI.md`. Do not bulk-read `docs/`.
- This repo runs an unattended overnight loop for `[auto]` tasks (`docs/engineering/mythos/LOOP.md`). It supports multiple engines via `scripts/overnight/run.sh` (`ENGINE=claude|codex|agy`). Launch with `make overnight-<engine>-once` (single round) / `make overnight-<engine>-watch`.
