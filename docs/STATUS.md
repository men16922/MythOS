# Status

Last updated: 2026-10-24

## Current State

**Mythos 2.0 "Signal Run" is the only game on `main`** (the 1.x AI-narrated loop runtime is archived on branch `1.0`, 2026-10-11). A browser tactics deck-builder roguelite: Into the Breach-style telegraphed combat on a 7×5 board, Slay the Spire deck/implants and map, a Hades-style Archive meta loop, and an AI GM off the critical path.

- **Engine** `src/mythos_ui/src/v2/engine` — pure TS, seeded, JSON state; combat (telegraphs incl. lock-ons, push/bump/void, burning ground and live wire, triggers, companion combat passives, bonus objectives), run/map/meta (StS map, events + bounded Improvise, shop/rest/treasure, endings, Archive unlocks, Paradox 1–5, daily seed), greedy/mixed/basic bots + run simulator.
- **Content** `v2/content` — 104 cards (12 companion reward cards, 3 Act-3 burst cards), 29 enemies (incl. Act 1 boss `jujak_core` & Act 2 boss `arachne_queen`), 39 encounters, 44 implants, 8 consumables, 6 companions, 3 archetypes, 68 events (5-choice opening gambit `a1_opening`, every companion has a 3-event flag-chained arc), 6 tactical directives (`engine/directives.ts`), 12 bond cutscenes, 8 daily mutators, stat voices and IX's mirror, 23 lore, 4 endings, 20 unlocks; 100 % generated art/music (`content/art.test.ts`).
- **UI** `v2/ui` — shell screens (pause menu + visible autosave, daily seed, companion chat, GM narration card with local contextual fallback, event companion whispers, Act 1 solo map banter, tactical directive panel, IX comms, boss narration), combat board with isometric magma-crater Area Burn FX & dynamic per-encounter BGM, phone portrait/landscape + touch, procedural SFX bus + looped music, hard mute.
- **Server** `src/mythos_api` (SPA, `/resources`, CORS for the Android app, `/api/health`) + `src/mythos_v2` (`/api/v2`: Firebase Google sign-in (`MYTHOS_AUTH`), profile/run saves in `v2_saves` with memory fallback, per-player run history, daily-seed leaderboard `v2_daily_scores`; GM narrate / improvise / talk via Ollama locally or Vertex Gemini). `docs/online.md`.
- **Android** `src/mythos_ui/android` — Capacitor app with Firebase: Crashlytics, App Distribution, native Google sign-in, FCM daily-seed push (see `docs/android.md`).
- **Online UI** — account chip/settings, `DailyBoard` leaderboard (auto-submit at daily run end), anonymous play stays fully offline.
- **Play policy pieces** (2026-10-14, live in `00125`) — in-app account deletion (`DELETE /api/v2/account`: saves, history, daily rows + the Firebase sign-in record), AI-line reporting (inline flags + Settings list → `v2_gm_reports`, shown on `/admin`), `/privacy` + `/account-deletion` pages; submission sheet + store graphics in `docs/play-store.md`.
- **Roguelite Replayability, Act 1 Immersion, Magma Area Burn FX, LLM/Budget fixes & Veo block** (2026-10-18, live in `00113-w55` / `LATEST`) — Multi-boss rotation (`jujak_core` in Act 1, `arachne_queen` in Act 2), 5-choice opening gambit (`a1_opening`), Chapter Tactical Directives (`engine/directives.ts` + combat node hover previews on `MapScreen`), always-on contextual `GmCard` (`localNarrate`), `CompanionWhisper` on `EventScreen`, Act 1 `SOLO_BANTER` (`MapBanter`), full CRPG Background & Camp Night (`minApproval: 2`) access on web runs, dynamic Act 1 BGM (`CombatScreen`), isometric magma-crater Area Burn (`FireTopOverlay`), SFX differentiation, `EndingScreen` share summary, `_balance_quotes` + `_ACT_SENSORY` (`gm.py`), late-usage budget charging (`api.py`), 8×2 voice pins (`voices.json`), and Vertex Veo API hard-block (`docs/test/veo_gemini_owner_guide.md`).
- **Player tiers + Signal+ CRPG layer** (2026-10-18, live: rev `00113-w55`) — signed-in players get AI within a monthly $ allowance, a global daily ceiling stops free players first, Signal+ (Play subscription) raises the allowance; CRPG districts (6), d20 dialogue, backgrounds, approval, quests, AI NPC talk, camp nights, banter, growth points, echo inscription, autonomy and the thought cabinet are live. Plan `docs/plans/2026-10-18-tiers-and-ai-narrative.md`, rules `docs/GAMEPLAY.md`.
- **Enemy taunts, déjà-vu openings, `make gm-eval`, Gemini thinking headroom** (2026-10-17). Everything from 10-14 and 10-17 is live: production revision `00127` at 100 % since 2026-10-17 (rollback `00125` / `00123`).
- **Party bench, random run seeds, AI toggle, IX loop memory** (2026-10-17, live in `00125`) — unlimited recruits, two deployed, swap on the map (party screen); every normal run has a random seed; Settings 'AI 대사 사용'; IX recalls earlier loops; the chronicle uses typed Improvise actions; tutorial no longer repeats.
- **Comms log + GM model switch** (2026-10-17, live in `00125`) — per-run log of every GM / IX / boss / companion line (HUD + pause menu, AI lines flaggable); Vertex GM `gemini-3.8-flash` (3.5-flash failed 9/40 calls with 504s in an A/B, 3.8 0/40); `make deploy*` passes `.env` `MODEL`.

Latest verified baseline (2026-10-19, streams + UX pass 1 + demo codes + replay): `make check` green (`node --test src/v2` 344 + Python unittest 329 + 12 DB tests skipped without Postgres; `make test-db` 33 OK against Postgres 16), `make test-e2e-v2` green (headless, muted), `make playthrough-quick` OK (5 nodes + shop/safehouse/treasure/final-choice tour, 223 s). Sim P0 (3 × 360 mixed, identical seeds before/after): greedy ≈ 97 % · mixed ≈ 43 % (36–53 % by 120-run block) · basic 0 %.

Production (2026-10-24): Cloud Run `mythos-api` serves 2.0 — revision `00142-neh` at 100 % `LATEST` (`git-sha=4a3e65b`; rollback `00140-paw`; `/admin` dashboard, `MYTHOS_ADMIN_EMAILS` set) (`MYTHOS_AUTH=google`, production Postgres, Vertex `gemini-3.8-flash`); 1.x lives only as code on branch `1.0`. Daily push: Cloud Scheduler `mythos-daily-push-{ko,en}` at 19:00 KST as `mythos-push@` (FCM role only).

## Active Focus

Authority plan: `docs/NEXT_PLAN.md` · improvement & direction plan: `docs/plans/2026-10-24-improvement-and-direction-plan.md` · global showcase: `docs/plans/2026-10-24-global-showcase-2026.md`.

1. **Global showcase + Wave 1–4 improvements** (owner direction 2026-10-24; paid Play release and Signal+ on hold, `DECISIONS.md`) — named RNG streams and replay-verified daily board are live (`00140-paw`); next: Wave 1 (Gemini `✦ LIVE AI` visibility & `gm.ts` source preservation, Improvise/NPC chips), Wave 2 (Connector `maxHp` reduction `42/40/44 → 34/32/36` + Act 1 puzzle tension), Wave 3 (`Architect Telemetry HUD`), Wave 4 (`?lang=en` auto-entry + `docs/contest/architecture-en.md`).
2. **Watch production** — first real players on 2.0: Cloud Run logs (`v2 gm` outcomes, 401/429 rates), the 19:00 KST push job status, Crashlytics. Checked 2026-10-13: only owner/QA traffic so far (no real players → no balance data yet), 0 × 429, 0 × 5xx, the 10-11 405s were Android-emulator CORS preflights from before the origin fix (preflight now 200 for all three Capacitor origins), push jobs ran 10-13 19:00 KST with OK status.

## Open Risks

- **Signal+ is dormant and unproven end to end** (paid release on hold 2026-10-18): purchase verification is tested against a fake Play API only; the product, the merchant profile and the service account's Play Console access do not exist yet. Refunds land at the stored expiry (no RTDN). Budget defaults rest on the unverified 3.8 price.

- **Daily results**: replay-verified server-side (live since 2026-10-20; shield badge; ranking unchanged — an unverified row can still rank). Saves stay client JSON blobs.
- **Vertex tail latency**: some GM calls take 10–20 s or end in 504 DEADLINE_EXCEEDED; hedging + 14 s narrate timeout bring act intros to ~83 % answered (local measure). Authored text covers the rest; watch `v2 gm` outcomes after promotion.
- **Fun / purchase intent is unjudged by a human**: everything above is automated evidence; the owner's play check (`docs/test/mythos2_fun_check.md`) is the open verdict.
- **Balance noise**: mixed-bot win rate swings ±6 % by seed block — A/B on identical blocks (`docs/LESSONS.md`).
- **GM quality**: local `gemma4:8b-64k` lines are serviceable; Vertex `gemini-3.8-flash` is sharper (3.8's introductory price reportedly doubles in Jan 2027). All lines are cleaned and have authored fallbacks.
- **Generated assets** were spot-checked, not hand-curated; regenerate single files with `scripts/v2_assets/` (call-budget ledger).
- **Account deletion on production**: until `mythos-run@` has `roles/firebaseauth.admin`, deletion erases the game data but reports `sign_in_record_deleted: false` (remove the user in the Firebase console; the policy page promises 30 days).
- **Overnight harness**: its held-out task bank and Dev Graph experiments targeted 1.x and stay on branch `1.0`; new unattended seeds must target the 2.0 tree.
