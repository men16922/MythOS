# Status

Last updated: 2026-10-17

## Current State

**Mythos 2.0 "Signal Run" is the only game on `main`** (the 1.x AI-narrated loop runtime is archived on branch `1.0`, 2026-10-11). A browser tactics deck-builder roguelite: Into the Breach-style telegraphed combat on a 7×5 board, Slay the Spire deck/implants and map, a Hades-style Archive meta loop, and an AI GM off the critical path.

- **Engine** `src/mythos_ui/src/v2/engine` — pure TS, seeded, JSON state; combat (telegraphs incl. lock-ons, push/bump/void, burning ground and live wire, triggers, companion combat passives, bonus objectives), run/map/meta (StS map, events + bounded Improvise, shop/rest/treasure, endings, Archive unlocks, Paradox 1–5, daily seed), greedy/mixed/basic bots + run simulator.
- **Content** `v2/content` — 104 cards (12 companion reward cards, 3 Act-3 burst cards), 27 enemies, 37 encounters, 44 implants, 8 consumables, 6 companions, 3 archetypes, 68 events (every companion has a 3-event flag-chained arc), 12 bond cutscenes, 8 daily mutators, stat voices and IX's mirror, 23 lore, 4 endings, 20 unlocks; 100 % generated art/music (`content/art.test.ts`).
- **UI** `v2/ui` — shell screens (pause menu + visible autosave, daily seed, companion chat, GM narration card, IX comms, boss narration), combat board with per-element FX, phone portrait/landscape + touch, procedural SFX bus + looped music, hard mute.
- **Server** `src/mythos_api` (SPA, `/resources`, CORS for the Android app, `/api/health`) + `src/mythos_v2` (`/api/v2`: Firebase Google sign-in (`MYTHOS_AUTH`), profile/run saves in `v2_saves` with memory fallback, per-player run history, daily-seed leaderboard `v2_daily_scores`; GM narrate / improvise / talk via Ollama locally or Vertex Gemini). `docs/online.md`.
- **Android** `src/mythos_ui/android` — Capacitor app with Firebase: Crashlytics, App Distribution, native Google sign-in, FCM daily-seed push (see `docs/android.md`).
- **Online UI** — account chip/settings, `DailyBoard` leaderboard (auto-submit at daily run end), anonymous play stays fully offline.
- **Play policy pieces** (2026-10-14, not deployed yet) — in-app account deletion (`DELETE /api/v2/account`: saves, history, daily rows + the Firebase sign-in record), AI-line reporting (inline flags + Settings list → `v2_gm_reports`, shown on `/admin`), `/privacy` + `/account-deletion` pages; submission sheet + store graphics in `docs/play-store.md`.
- **Enemy taunts, déjà-vu openings, `make gm-eval`, Gemini thinking headroom** (2026-10-17). Everything from 10-14 and 10-17 is on preview revision `00125` (0 % traffic, verify-preview 5/5); production is still `00123` until promoted.
- **Party bench, random run seeds, AI toggle, IX loop memory** (2026-10-17, not deployed yet) — unlimited recruits, two deployed, swap on the map (party screen); every normal run has a random seed; Settings 'AI 대사 사용'; IX recalls earlier loops; the chronicle uses typed Improvise actions; tutorial no longer repeats.
- **Comms log + GM model switch** (2026-10-17, not deployed yet) — per-run log of every GM / IX / boss / companion line (HUD + pause menu, AI lines flaggable); Vertex GM `gemini-3.8-flash` (3.5-flash failed 9/40 calls with 504s in an A/B, 3.8 0/40); `make deploy*` passes `.env` `MODEL`.

Latest verified baseline (2026-10-12): `make check` green (`node --test src/v2` 268 + Python unittest 250 + 7 DB tests skipped without Postgres), `make test-db` 22, `make test-e2e-v2` (headless, muted, incl. sign-in note + leaderboard submit), `make playthrough-quick` (2 min) and a whole unassisted UI run to a victory ending (10 min, 0 console errors), headless save/continue/reload, emulator push delivery; real Google sign-in on the web (token verified server-side, `g_` save) and the native sign-in sheet on Android. Sim P0 over 360 runs: greedy 100 % · mixed ≈ 35 % (28–41 % by seed block) · basic 0 %; P5: 78 / 3.

Production (2026-10-13): Cloud Run `mythos-api` serves 2.0 — revision `00123` at 100 % (`git-sha=7e57217`; `/admin` dashboard, `MYTHOS_ADMIN_EMAILS` set) (`MYTHOS_AUTH=google`, production Postgres, Vertex `gemini-3.5-flash`); the 1.x revision `00090` stays available for rollback. Daily push: Cloud Scheduler `mythos-daily-push-{ko,en}` at 19:00 KST as `mythos-push@` (FCM role only).

## Active Focus

Authority plan: `docs/NEXT_PLAN.md`.

1. **Owner calls** — Play release per `docs/play-store.md` (account, contact email + deploy, `firebaseauth.admin` grant for `mythos-run@`, upload key, 12 closed-test testers), SFX listen-test, trailer spots, voice pins.
2. **Watch production** — first real players on 2.0: Cloud Run logs (`v2 gm` outcomes, 401/429 rates), the 19:00 KST push job status, Crashlytics. Checked 2026-10-13: only owner/QA traffic so far (no real players → no balance data yet), 0 × 429, 0 × 5xx, the 10-11 405s were Android-emulator CORS preflights from before the origin fix (preflight now 200 for all three Capacitor origins), push jobs ran 10-13 19:00 KST with OK status.

## Open Risks

- **Client-trusted results**: saves are JSON blobs and leaderboard results are client-reported (plausibility checks only) — fine for a single-player daily board, not for prizes.
- **Balance noise**: mixed-bot win rate swings ±6 % by seed block — A/B on identical blocks (`docs/LESSONS.md`).
- **GM quality**: local `gemma4:8b-64k` lines are serviceable; Vertex `gemini-3.8-flash` is sharper (production still on 3.5-flash until the next deploy; 3.8's introductory price reportedly doubles in Jan 2027). All lines are cleaned and have authored fallbacks.
- **Generated assets** were spot-checked, not hand-curated; regenerate single files with `scripts/v2_assets/` (call-budget ledger).
- **Account deletion on production**: until `mythos-run@` has `roles/firebaseauth.admin`, deletion erases the game data but reports `sign_in_record_deleted: false` (remove the user in the Firebase console; the policy page promises 30 days).
- **Overnight harness**: its held-out task bank and Dev Graph experiments targeted 1.x and stay on branch `1.0`; new unattended seeds must target the 2.0 tree.
