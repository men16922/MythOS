# Agent Brief

Last updated: 2026-10-31

This file is compressed startup context. Open linked docs only when needed.

> ▶ NEXT SESSION: **2026-10-26 (Claude Opus 5.5): DLC update R1–R7 complete on `main` (`323f5bb`)** — Deep Signal 6 acts (Glass Library / Dreaming Machines / First Record + secret true ending), 11 companions, 5 archetypes, autonomy 5, mastery, Archive Vault; plan `docs/plans/2026-10-26-dlc-expansion-plan.md` §17.6. 2026-10-27: secret-fight input lock fixed + full Deep Signal run verified in the real UI (`ui_playthrough.py --secret`). Preview **`00154-lom`** (`910834b`) verified 5/5 and **promoted to production 2026-10-27** (rollback `00150-qen`). Same day: **stun status + wall-bump stun cards + 11 companion ultimates + full-screen ult cut-in** (sim-neutral, not deployed); 2026-10-28: 16 ultimate illustrations (`v2/ult/`) + illustrated cut-in (owner-approved art); + 11 companion ultimate SFX; **`00158-roq`** (`562d220`) verified 5/5 and **promoted to production 2026-10-28** (rollback `00156-fuj`). 2026-10-29/30: `make test-e2e-v2` fixed; **achievements** (64) + **bestiary / card codex** + **anomaly mixer** + **road recruits**; **`00160-qiy`** (`5bdd23f`) verified 5/5 and **promoted to production 2026-10-30** (rollback `00158-roq`). Next: owner plays a Deep Signal run to Act 6 with `docs/test/mythos2_fun_check.md` §6–7 → fun/difficulty verdict. **F1–F4** of `docs/plans/2026-10-30-next-content-expansion-plan.md` (forbidden implants, noise gates, event rotation, duo ultimates, IX interference + replica, card evolutions, best turn) were **promoted to production 2026-10-31** as **`00167-yuh`** (`7cc9ef5`, rollback `00160-qiy`), on the owner's call without the hands-on verdict. 2026-10-31 (Argon, `a4c31d9`): fixed `loops: 1` sim companion default (`57 → 57 / 150`) and phone portrait ultimate HUD overlap (`phone.css`). Still no new content (W1/W2 included) until the owner's verdict on `docs/test/mythos2_fun_check.md` §8–11 and the 39 new images; that verdict decides fixes.

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
- Local play: `make api` (busy → `MYTHOS_API_PORT=8010 make api`); dev UI `cd src/mythos_ui && npx vite`; sandbox `/?sandbox=combat&mute=1&enc=<id>`.
- Local GM model: `gemma4:8b-64k` (`.env`'s `gemma4:latest` is not installed) — `OLLAMA_MODEL_STORY=gemma4:8b-64k make api`.
- Balance: `simulateRun(seed, archetype, CONTENT, policy, { paradox, onFight })` (P0: greedy ≈ 97 % · mixed ≈ 43 % · basic 0 %; vary `run.seed`, not `run.rng`, to vary rolls).

## Guardrails

- Rules only in `v2/engine`, data only in `v2/content`; never `Math.random` in engine/content; explicit `.ts` imports.
- AI lines never block play and never change game state beyond the engine's clamped Improvise outcomes.
- Don't commit `.env`, keys, keystores, `google-services.json`, `.firebase/`, or generated outputs. `make api` pkills every `mythos_api` process — for a second server use a private uvicorn on another port. Deploys are the owner's; `git push` of verified commits is allowed (fast-forward only, no force).
