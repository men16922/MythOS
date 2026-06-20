# Project MythOS: Core Engineering Mandates

The top-level design and engineering standard shared by all AI agents (Gemini, Claude, Cursor, etc.). This file and `docs/AGENT_BRIEF.md` take precedence over per-agent docs.

## 1. Runtime Principles

- **Language**: Python 3.11+ with explicit type hints and small dataclass-first domain boundaries.
- **Local-first inference**: model inference (Ollama, mflux/FLUX, audio generation) defaults to running locally on the Apple Silicon host.
- **Shared orchestration**: business logic for the CLI, Streamlit, and FastAPI/React paths lives in `RuntimeSessionService`. Do not duplicate loop orchestration in entrypoints or the UI layer.
- **Frontend split**: React + TypeScript SPA is the recommended active play path. Streamlit remains a playable/demo path and compatibility surface.

## 2. Data, Media, And Infra

- **RDBMS**: PostgreSQL with JSONB state/memory records.
- **Object storage**: MinIO/S3-compatible storage for generated assets and large media.
- **Queue/cache**: Redis for visual job queue, worker heartbeat, and transient locks.
- **Observability**: structured logs and OpenTelemetry/Jaeger spans should stay wired for runtime flows.
- **Generated assets**: `outputs/`, `.docker/`, `.env`, Hugging Face tokens, and generated model outputs are not source artifacts.

## 3. Generation And Validation

- **Narrative validation**: LLM-generated scenes must pass the Myth Protocol parser/validator path before state mutation.
- **Fallback path**: narrative, visual, and summary generation failures need deterministic or user-visible fallback behavior.
- **Context selection**: do not inject full Story Bible, full scenario, or full narrative shard history into prompts. Use phase/location/flags snippets and rolled-up `causality_summary`.
- **Visual consistency**: character scenes should use the existing mflux Redux portrait reference route when available.

## 4. Code And Test Discipline

- Prefer composition and provider/service protocols over inheritance-heavy designs.
- Keep pure unit tests independent of Docker. Gate DB tests behind `MYTHOS_RUN_DB_TESTS=1`.
- For runtime flow changes, run at least `make test`; use `make smoke-local` for broader local runtime changes and `make smoke` for persistence/MinIO behavior.
- For React/API UI changes, run `make frontend-build` or `make test-e2e` when the change touches user flow.

## 5. Agent Operations Discipline

Operating rules against failure patterns repeatedly observed in usage-insights review.

- **Diagnose before any fix**: not just performance — **every bug and behavior issue** must have its root cause confirmed with evidence before any speculative fix: **reproduce → 2-3 competing hypotheses → a measurement that distinguishes them → fix only the confirmed cause → rerun the same measurement to prove it resolved**. No "fixed" report before capturing evidence (logs/timing/memory·swap/state); commit to data, not the first plausible theory. For performance, quantify where the time goes among model load · prompt prefill · RAM/swap · I/O. (Repeated friction: a past misdiagnosis blamed Ollama config/field reordering when the real cause was swap·prefill, plus a game-render bug wasted on surface fixes — the top usage-insights friction.) Protocol enforced by the `/diagnose` skill.
- **Docs-first status**: answer project-status questions from the current docs (`AGENT_BRIEF` → `STATUS` → `NEXT_PLAN`) first, not the git working tree or code search.
- **Confirm structural moves**: confirm scope and strategy with the user before directory moves/renames/reclassification (`scratch/`, `bin/`, etc.) and large refactors. Do not move folders arbitrarily.
- **Shell discipline**: use absolute paths in shell commands (especially `.venv/bin/python`). Do not rely on cwd left by a prior `cd` — cwd dependence has caused silent failures.
- **Verify before claiming done**: in autonomous (unsupervised) cycles, report completion only after verifying the artifact actually exists — after write/edit, re-read the file to confirm the change landed (read-back), and check test output. The harness has silently dropped a write while falsely reporting "done." Write long artifacts (docs/plans/code dumps) to a file rather than chat output and report only a summary.
- **No auto-`ruff --fix`**: `make check`'s ruff selects `F` (pyflakes) + `I` (isort) (`pyproject.toml`), so running `ruff --fix` automatically (e.g. a PostToolUse hook) strips a new import that is still unused in the same edit. Use `--fix` only as a deliberate manual run.
- **Navigation tooling discipline**: for symbol/structure searches (definition, references, type, call graph, file outline), agents **with an LSP tool (e.g. Claude Code: pyright for Python, vtsls for TS/TSX — full src coverage) default to LSP** — it is semantic, returns exact `file:line:char`, and is always live; confirm the body in source. Agents without LSP (Codex/agy/Gemini lanes) use grep. Reserve grep for rare literals / non-symbol text (<~15 hits). Details: `CLAUDE.md` "## Code navigation (LSP-first)".

## 6. Documentation And Handoff

- Start with `docs/AGENT_BRIEF.md`, then `docs/STATUS.md`, then `docs/NEXT_PLAN.md`. Do not bulk-read `docs/` unless the task explicitly requires an audit.
- Open `docs/DESIGN.md`, `docs/GAMEPLAY.md`, scenario docs, dated plans, and archive files only on demand.
- Work completion should update the smallest relevant current docs. Use `PROGRESS_LOG.md` for short Changed/Verified/Next notes, and archive long history instead of expanding current docs indefinitely.
- Update `harness/CONTEXT_BRIDGE.md` when the next agent's active context, risks, or next recommended task changes materially.
- New global rules belong here, not in an agent-specific file.
