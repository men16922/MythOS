# Mythos 2.0: Core Engineering Mandates

The top-level design and engineering standard shared by all AI agents (Gemini, Claude, Cursor, etc.). This file and `docs/AGENT_BRIEF.md` take precedence over per-agent docs.

## 1. Runtime Principles

- **Game in the browser**: Mythos 2.0's rules run client-side in `src/mythos_ui/src/v2/engine` — pure TypeScript, seeded RNG stored in state, JSON-serialisable state, reducers that clone → mutate → return. No `Math.random`, no I/O, no React in the engine. Content is typed data in `v2/content`; rules never live in the UI.
- **Server is thin**: `src/mythos_api` serves the SPA/art and mounts `/api/v2` (`src/mythos_v2`): saves (offline-first; the client mirrors to localStorage) and the AI GM. The server never decides game outcomes.
- **AI off the critical path**: authored text shows first; LLM lines (narrate, improvise, companion chat, IX comms) arrive later, are cleaned/validated, and every call has an authored fallback. Improvise outcomes are clamped by the engine. Chat never changes game state.
- **Python** 3.11+ with type hints; `mypy --strict` on `mythos_api` and `mythos_v2`.

## 2. Data, Media, And Infra

- **Saves**: PostgreSQL `v2_saves` (JSONB blobs, self-creating DDL = `migrations/009_v2_saves.sql`) with an in-memory fallback; the browser mirror is authoritative for offline play.
- **Art/music**: generated 2.0 assets under `resources/neo-seoul/v2/` (Vertex Gemini image, Codex sprites, Lyria loops) via `scripts/v2_assets/` with a call-budget ledger; `content/art.test.ts` requires 100 % coverage.
- **Generated outputs**: `outputs/`, `.docker/`, `.env`, keys/keystores and `google-services.json` are not source artifacts.

## 3. Generation And Validation

- **GM output** goes through `gm.clean_*` / `talk.clean_*` (sentence caps, language check, byte-token decoding, meta/AI-claim and number stripping); anything unusable falls back to authored text.
- **Prompt injection**: player text (improvise, companion chat) is capped and screened; companions deflect in character, never reveal they are models, never state rules or numbers.
- **Determinism**: anything gameplay-relevant is seeded (`run.rng`); the daily seed is a pure function of the KST date and archetype.

## 4. Code And Test Discipline

- Prefer composition and small modules; introduce a pattern when a second real case exists, not in anticipation of one.
- Engine/content changes: a `node --test` regression test first (`make test-v2`); balance changes: measure with the run simulator before/after on the same seed blocks.
- Server changes: `make test` (stdlib `unittest`); DB tests behind `MYTHOS_RUN_DB_TESTS=1`.
- UI/flow changes: `make frontend-build` + `make test-e2e-v2`, and rendered evidence for visual work — always muted, one browser tab at most.

## 5. Agent Operations Discipline

Operating rules against failure patterns repeatedly observed in usage-insights review.

- **Diagnose before any fix**: not just performance — **every bug and behavior issue** must have its root cause confirmed with evidence before any speculative fix: **reproduce → 2-3 competing hypotheses → a measurement that distinguishes them → fix only the confirmed cause → rerun the same measurement to prove it resolved**. No "fixed" report before capturing evidence (logs/timing/memory·swap/state); commit to data, not the first plausible theory. For performance, quantify where the time goes among model load · prompt prefill · RAM/swap · I/O. (Repeated friction: a past misdiagnosis blamed Ollama config/field reordering when the real cause was swap·prefill, plus a game-render bug wasted on surface fixes — the top usage-insights friction.) Protocol enforced by `$overnight-harness:diagnose`.
- **Name the fork before implementing**: when a request admits more than one reading, or when the cheap fix and the correct fix differ, state the interpretations and your recommendation before writing code instead of choosing silently. A plan entry built on an unverified assumption is a defect — the 2026-08-08 "stream stall watchdog" was queued as the next deterministic candidate before anyone measured whether the stall was server-side, and measurement withdrew it.
- **Measure on the path the user reads**: a stored record or an intermediate artifact is a proxy, and a proxy can bypass a layer the player never skips. Scope a defect from the served output, not from whatever is easiest to query — the 2026-08-08 EN-localization item was sized at "34/59 scenes" from a banked transcript, but `bank_loop.py` reads the store while the API localizes at the serving boundary, so the real player-facing residue was 11/59.
- **Surgical changes**: a change touches only what the request demands. Preserve the surrounding file's style even where you would write it differently, remove only the imports and functions YOUR edit orphaned, and report pre-existing dead code rather than deleting it. Reformatting, type-hint additions, and adjacent cleanups never ride along with a fix; they are separate work with separate verification. (Adapted from `multica-ai/andrej-karpathy-skills`, MIT.)
- **Gameplay changes verify through `/gameplay-qa`** (`$gameplay-qa` on Codex/agy): any change to combat rules, cards, enemies, implants, status/ground effects, tactical-board interaction, combat FX or balance runs that skill's layering before claiming done — narrow `node --test` → simulator numbers when balance moves → `make check` → muted rendered evidence → leave the feel verdict manual.
- **Docs-first status**: answer project-status questions from the current docs (`AGENT_BRIEF` → `STATUS` → `NEXT_PLAN`) first, not the git working tree or code search.
- **Confirm structural moves**: confirm scope and strategy with the user before directory moves/renames/reclassification (`scratch/`, `bin/`, etc.) and large refactors. Do not move folders arbitrarily.
- **Shell discipline**: use absolute paths in shell commands (especially `.venv/bin/python`). Do not rely on cwd left by a prior `cd` — cwd dependence has caused silent failures.
- **Verify before claiming done**: in autonomous (unsupervised) cycles, report completion only after verifying the artifact actually exists — after write/edit, re-read the file to confirm the change landed (read-back), and check test output. The harness has silently dropped a write while falsely reporting "done." Write long artifacts (docs/plans/code dumps) to a file rather than chat output and report only a summary.
- **No auto-`ruff --fix`**: `make check`'s ruff selects `F` (pyflakes) + `I` (isort) (`pyproject.toml`), so running `ruff --fix` automatically (e.g. a PostToolUse hook) strips a new import that is still unused in the same edit. Use `--fix` only as a deliberate manual run.
- **Navigation tooling discipline**: for symbol/structure searches (definition, references, type, call graph, file outline), agents **with an LSP tool (e.g. Claude Code: pyright for Python, vtsls for TS/TSX — full src coverage, or Serena MCP configured with LSP) default to LSP** — it is semantic, returns exact `file:line:char`, and is always live; confirm the body in source. Agents without LSP (Codex/agy lanes) use grep. Reserve grep for rare literals / non-symbol text (<~15 hits). Details: `CLAUDE.md` "## Code navigation (LSP-first)".

## 6. Documentation And Handoff

- Start with `docs/AGENT_BRIEF.md`, then `docs/STATUS.md`, then `docs/NEXT_PLAN.md`. Do not bulk-read `docs/` unless the task explicitly requires an audit.
- Open `docs/GAMEPLAY.md`, `docs/plans/2026-10-10-mythos-2.0.md`, dated plans and archive files only on demand. 1.x history lives on branch `1.0`.
- Work completion should update the smallest relevant current docs. Use `PROGRESS_LOG.md` for short Changed/Verified/Next notes, and archive long history instead of expanding current docs indefinitely.
- Update `harness/CONTEXT_BRIDGE.md` when the next agent's active context, risks, or next recommended task changes materially.
- New global rules belong here, not in an agent-specific file.
