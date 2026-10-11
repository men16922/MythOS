# Status

Last updated: 2026-10-11

## Current State

**Mythos 2.0 "Signal Run" is the only game on `main`** (the 1.x AI-narrated loop runtime is archived on branch `1.0`, 2026-10-11). A browser tactics deck-builder roguelite: Into the Breach-style telegraphed combat on a 7×5 board, Slay the Spire deck/implants and map, a Hades-style Archive meta loop, and an AI GM off the critical path.

- **Engine** `src/mythos_ui/src/v2/engine` — pure TS, seeded, JSON state; combat (telegraphs incl. lock-ons, push/bump/void, burning ground and live wire, triggers, companion combat passives, bonus objectives), run/map/meta (StS map, events + bounded Improvise, shop/rest/treasure, endings, Archive unlocks, Paradox 1–5, daily seed), greedy/mixed/basic bots + run simulator.
- **Content** `v2/content` — 104 cards (12 companion reward cards, 3 Act-3 burst cards), 27 enemies, 37 encounters, 44 implants, 8 consumables, 6 companions, 3 archetypes, 38 events, 23 lore, 4 endings, 20 unlocks; 100 % generated art/music (`content/art.test.ts`).
- **UI** `v2/ui` — shell screens (pause menu + visible autosave, daily seed, companion chat, GM narration card, IX comms, boss narration), combat board with per-element FX, phone portrait/landscape + touch, procedural SFX bus + looped music, hard mute.
- **Server** `src/mythos_api` (SPA, `/resources`, CORS for the Android app, `/api/health`) + `src/mythos_v2` (`/api/v2`: profile/run saves in `v2_saves` with memory fallback; GM narrate / improvise / talk via Ollama locally or Vertex Gemini).
- **Android** `src/mythos_ui/android` — Capacitor app with Firebase (see `docs/android.md`).

Latest verified baseline (2026-10-11): `make check` green (`node --test src/v2` + Python unittest for `/api/v2` and the harness scripts), `make test-e2e-v2` (headless, muted), headless save/continue and companion-chat checks. Sim P0 over 360 runs: greedy 100 % · mixed ≈ 35 % (28–41 % by seed block) · basic 0 %; P5: 78 / 3.

Production: Cloud Run `mythos-api` still serves the 1.x revision `00090` until the owner deploys 2.0.

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

1. **Owner calls** — SFX listen-test (tests are always muted), deploy 2.0 (`make deploy-preview` → promote, or `make deploy`), Play Console + upload key for the Android app, `git push` (`main` = 2.0, `1.0` = archive).
2. **After deploy** — smoke `/api/v2` + Vertex GM on Cloud Run; the first `/api/v2` request creates `v2_saves` in the production DB.

## Open Risks

- **Client-trusted saves**: single-player, no competitive stakes; the server stores JSON blobs only (daily-seed records included).
- **Balance noise**: mixed-bot win rate swings ±6 % by seed block — A/B on identical blocks (`docs/LESSONS.md`).
- **GM quality**: local `gemma4:8b-64k` lines are serviceable; Vertex `gemini-3.5-flash` is sharper. All lines are cleaned and have authored fallbacks.
- **Generated assets** were spot-checked, not hand-curated; regenerate single files with `scripts/v2_assets/` (call-budget ledger).
- **Overnight harness**: its held-out task bank and Dev Graph experiments targeted 1.x and stay on branch `1.0`; new unattended seeds must target the 2.0 tree.
