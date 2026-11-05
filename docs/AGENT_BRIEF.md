# Agent Brief

Last updated: 2026-11-05

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: On `main`; production remains `505ccff` / `00185-yev`, freshly confirmed at 100% traffic. D7 read-only audit confirms Neon PostgreSQL (documented hostname region `us-east-1`), Cloud Run `us-central1`, Gemini resolving to `global`, absent active-model request/response logging config (default disabled), and log retention 30/400 days. Evidence: `docs/plans/2026-11-05-data-locations-backup-audit.md`. Actual Neon history/snapshots/exports and restore/deletion reconciliation remain unknown; owner asked for non-secret Console facts. Next: D6 Android diagnostics toggle/pending-report acceptance without sending reports. Previous debug upgrade and native keyboard checks passed; full gate Node 594, Python 352/15 DB skips, E2E passed; unsigned AAB estimate 368,390,479 bytes, 16 KB verified (`docs/plans/2026-11-05-android-upgrade-keyboard-qa.md`). Signing/contact, physical/Play-signed/reviewer/account deletion, production retention scheduling and policy publication remain open. Human fun and paid/public release remain separate gates. Only `main` and archive `1.0` remain. Automatic approval review denied push (overnight restriction); manual push required.

## Snapshot

Mythos 2.0 (세계:접속 — "Signal Run"): a single-player cyberpunk tactics deck-builder roguelite — Into the Breach telegraphed combat on a 7×5 board + Slay the Spire deck/implants/map + Hades-style Archive meta, AI GM off the critical path. Web (Cloud Run) + Android (Capacitor).

Layout:
- `src/mythos_ui/src/v2/engine` — pure TS, seeded RNG, JSON state, reducers; `node --test` (`make test-v2`). Combat (`combat.ts`/`effects.ts`/`intents.ts`), run/map/meta/daily (`run.ts`/`map.ts`/`meta.ts`/`daily.ts`), bots + sim (`combatSim.ts`/`runSim.ts`). Contract: `types.ts`.
- `v2/content` — typed data; `content.test.ts` / `narrative.test.ts` / `art.test.ts` guard integrity, quotas, art coverage.
- `v2/ui` — `shell/` screens (GameShell, TopBar, events, chat, IX comms, boss narration), `combat/` board/animator/FX + phone layouts, `common/` (assets, `sfx.ts`, `audio.ts` + hard mute, generated manifests), `v2/net/api.ts` (offline-first client), `v2/native/` (Capacitor bridge).
- `src/mythos_api` — FastAPI: SPA, `/resources`, CORS, `/api/health`. `src/mythos_v2` — `/api/v2` sign-in (`auth.py`, `MYTHOS_AUTH`), saves, daily leaderboard (`daily.py`), GM (`gm.py`, `talk.py`, `llm.py`), `config.py`, `log.py`, `store.py`. Online design + owner checklist: `docs/online.md`.
- `src/mythos_ui/android` — Capacitor Android project (`docs/android.md`). `resources/neo-seoul/` — art/music (`scripts/v2_assets/`).

## Read Order

1. `docs/STATUS.md` → 2. `docs/NEXT_PLAN.md` → 3. `docs/PROGRESS_LOG.md` (top) → 4. `docs/GAMEPLAY.md` / `docs/plans/2026-10-10-mythos-2.0.md` on demand.

## Commands

- Full gate: `make check`; browser smoke: `make frontend-build && make test-e2e-v2`.
- Deployed URL smoke (real clicks, anonymous, muted; run after `make verify-preview`): `make url-smoke URL=https://<service>.run.app`.
- Local play: `make api` (busy → `MYTHOS_API_PORT=8010 make api`); dev UI `cd src/mythos_ui && npx vite`; sandbox `/?sandbox=combat&mute=1&enc=<id>`.
- Local GM model: `gemma4:8b-64k` (`.env`'s `gemma4:latest` is not installed) — `OLLAMA_MODEL_STORY=gemma4:8b-64k make api`.
- Balance: `simulateRun(seed, archetype, CONTENT, policy, { paradox, onFight })` (historical rates depend on content and policy; vary `run.seed`, not `run.rng`, to vary rolls).

## Guardrails

- Rules only in `v2/engine`, data only in `v2/content`; never `Math.random` in engine/content; explicit `.ts` imports.
- AI lines never block play and never change game state beyond the engine's clamped Improvise outcomes.
- Don't commit `.env`, keys, keystores, `google-services.json`, `.firebase/`, or generated outputs. `make api` pkills every `mythos_api` process — for a second server use a private uvicorn on another port. Deploys are the owner's; `git push` of verified commits is allowed (fast-forward only, no force).
