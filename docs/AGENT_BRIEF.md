# Agent Brief

Last updated: 2026-11-04

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-11-04: on `main`, not deployed: road recruit scenes are marked on the map and the bot routes to them, so Act 4's third slot is filled (Deep 22 → 61 % of Act 4–6 fights; Deep 30.0 %, Sea 30.7 %); card plays per line-up measured (`PROGRESS_LOG.md` 11-04); full UI run through Act 3 OK. Companions now pick one of two perks at level 3 / 5 (party screen; all-b within ±1.5 pts of the old fixed bonuses). Undo (Z) now steps back through cards that drew and rolled nothing. Every victory ending leaves a world echo (3 → 16). Eight callback scenes bring earlier choices back (W1-1). Next: owner §14 + deploy call.** 2026-11-03: on `main`, not deployed: the bot now takes companions (it always went alone at Act 2), Acts 2–3 re-tuned to match (fresh 41.6 %, Deep 27.3 %); reverse-engineering 1–3 analysed (`docs/plans/2026-11-03-reverse-engineering-1-3.md`). Next: owner deploy call, fun check, pick which of the three prototypes to build.** 2026-11-02: DLC 3 The Unwritten Sea + bot re-tune are live in `00173-mab` (`8973143`, rollback `00171-yuj`; preview 5/5 + url-smoke on preview and production). Next: owner plays `docs/test/mythos2_fun_check.md` §12–13 (fun, tide/rewind feel, late damage) and OKs new sea music (Lyria bills Vertex).** 2026-11-01: DLC 2 parallel Act 2 and the party and growth rework went live in `00171-yuj` (`de62fd1`). Earlier history: `docs/PROGRESS_LOG.md` and `COMPLETED_SUMMARY.md`.

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
- Balance: `simulateRun(seed, archetype, CONTENT, policy, { paradox, onFight })` (P0: greedy ≈ 97 % · mixed ≈ 43 % · basic 0 %; vary `run.seed`, not `run.rng`, to vary rolls).

## Guardrails

- Rules only in `v2/engine`, data only in `v2/content`; never `Math.random` in engine/content; explicit `.ts` imports.
- AI lines never block play and never change game state beyond the engine's clamped Improvise outcomes.
- Don't commit `.env`, keys, keystores, `google-services.json`, `.firebase/`, or generated outputs. `make api` pkills every `mythos_api` process — for a second server use a private uvicorn on another port. Deploys are the owner's; `git push` of verified commits is allowed (fast-forward only, no force).
