# Agent Brief

Last updated: 2026-11-05

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: On `main`; production runtime remains `505ccff` / `00185-yev` (preview 6/6, production 5/5 and real-click smoke 3/3, 2026-11-05). Local FCM follow-up reproduced token recreation after off on same-process reconnect, then fixed it with persisted topic cleanup before deletion and cancellable Settings enable. Connected deletion/renewal, interrupted cleanup, actual Settings flows, full gate (Node 594; Python 352/15 DB skips) and E2E passed. Latest unsigned AAB download estimate 368,390,232 bytes; identity/evidence: `docs/plans/2026-11-05-push-connected-acceptance.md`. Earlier API 36 / 16 KB and API 24 / development WebView 111 offline lifecycle evidence remains scoped to those builds. Next: debug upgrade acceptance from an older installed candidate, then remaining keyboard/physical/Play-signed device checks. D3 purge and policy drafts are local; production schedule, contact, account deletion and reviewer acceptance remain. Read `docs/NEXT_PLAN.md`; human Deep/Sea and Chronicle verdicts, paid Play/evaluations and public submission are separate gates. Only `main` and archive `1.0` remain as branches. Automatic approval review denied push (overnight restriction); manual push is required.

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
