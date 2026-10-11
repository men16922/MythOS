# Repository Guidelines

Thin entry point for Codex / other agents. The canonical guide is `CLAUDE.md`; design invariants are in `harness/CORE_MANDATES.md`; the current hand-off is `harness/CONTEXT_BRIDGE.md`. Do not duplicate them here.

## Project Structure

**Mythos 2.0 (세계:접속 — Signal Run)**: a browser tactics deck-builder roguelite with an AI GM off the critical path. The 1.x runtime is archived on branch `1.0`.

- `src/mythos_ui/src/v2/engine` — pure-TS game engine (seeded, JSON state, reducers); `node --test` tests.
- `src/mythos_ui/src/v2/content` — typed game data; `src/v2/ui` — React screens, combat board, audio.
- `src/mythos_api` — FastAPI server (SPA + `/resources` + CORS); `src/mythos_v2` — `/api/v2` saves + AI GM.
- `src/mythos_ui/android` — Capacitor Android app (`docs/android.md`).
- `resources/neo-seoul/` — game art/music (regenerate with `scripts/v2_assets/`). `scripts/overnight/` — overnight harness policy.

## Commands

- `make setup`, `make api` (port busy → `MYTHOS_API_PORT=8010 make api`), `make dev-up` (Postgres + api).
- `make check` (full gate), `make test-v2` (engine/content), `make test` (Python), `make test-e2e-v2` (headless muted smoke after `make frontend-build`).

## Conventions

- Engine: no `Math.random`, explicit `.ts` import extensions, rules only in `v2/engine`, data only in `v2/content`.
- Python: 4-space indent, type hints, `mypy --strict` on `mythos_api` / `mythos_v2`, stdlib `unittest`.
- Browser tests are always muted (`?mute=1`) and use at most one tab.
- Commits: concise, scoped imperative subjects. Never commit `.env`, keys, keystores or `google-services.json`.

## Agent Operations

- Operating mandates: `harness/CORE_MANDATES.md` (§5 agent discipline). Engineering bibles: `docs/engineering/README.md` + `docs/engineering/mythos/`.
- Generic workflows are plugin-owned (`$overnight-harness:sync`, `checkpoint`, `tidy-docs`, `diagnose`, `overnight-report`, `overnight-seed`). Repo skills: `$gameplay-qa`, `$codebase-design` (source `.claude/skills/`, mirrored by `harness/sync-skills.sh`).
- Unattended loop: `make overnight-<engine>-once` / `make overnight-<engine>-watch` (`docs/engineering/mythos/LOOP.md`).
