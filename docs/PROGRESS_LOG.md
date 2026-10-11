# Progress Log

Last updated: 2026-10-11

## 2026-10-11 — Firebase Auth enabled; real Google sign-in verified

- Owner: "Google 로그인까지 체크해. 그리고 Firebase console도 직접수행해" (Chrome profile chosen by the owner). Console: Authentication → Get started → Google enabled (public name MythOS). `make firebase-auth-domains` added the 4 Cloud Run hosts; `google-services.json` refreshed (Android + web OAuth clients) — `fetch-firebase-config.sh` now uses the Firebase REST API first (the npx CLI path failed on an unwritable npm cache).
- Verified: web sign-in on `localhost:8010` (account chip shows the Google name; a run saved under `g_…`, no 401s); Android build reports `native Google sign-in: on` and opens the Google sign-in sheet on the emulator (completing it needs a Google account on the device — owner); cancelling returns to the title signed out.

## 2026-10-11 — Google sign-in, daily leaderboard, Android daily push

- Owner: "Play Games Services랑 푸시 알림도 붙여줘. 근데 꼭 초대코드가 필요한가? Gmail로 로그인 시키는 기능으로 대체하자" → leaderboard on our server first (Play Games once a Play developer account exists); no GM cost caps for now.
- **Server**: `MYTHOS_AUTH=open|google`; Firebase ID tokens verified in-process (`mythos_v2/auth.py`); invite keys removed; `GET /api/v2/config`; `PUT/GET /api/v2/daily/{date}` (`daily.py`, `v2_daily_scores`); run history keyed per player (migration 011 — a shared daily run id used to 409 the second player). `scripts/firebase/*` + `make firebase-*`, `push-schedule`, `push-test`; `docs/online.md`. Firebase web app + debug SHA-1 registered.
- **Client**: `net/auth.ts` (lazy Firebase popup on web, native plugin on Android), Bearer identity, account chip + settings section, `DailyBoard` with name editor, automatic daily submit with a retry queue; boot no longer re-saves the local mirror (a stale device could overwrite newer cloud progress). Android FCM topic toggle, channel `daily`, `ic_stat_mythos`, notification tap → today's board.
- Verified: `make check` (node 221, Python 210), `make test-db` 20, `make test-e2e-v2` incl. the online flow, headless save → continue → reload, emulator: one real push on `daily-ko` delivered and the tap cold-starts into the board. Google sign-in ends in the graceful "not open yet" path until the owner enables the provider.

## 2026-10-11 — 1.x archived (main = 2.0 only), Android app, frontend refactor

- Owner: "2.0 정리 + 1.x는 아카이브", "현재 2.0을 main 브랜치로 올리고, 기존 내용은 1.0 브랜치에 archive", plus an Android app version via Google's tooling (Capacitor + Firebase chosen; iOS out of scope).
- **Archive**: branch `1.0` = the last 1.x `main` (`edb5b53`). `main` drops the 1.x runtime packages, classic client, `/api/v1`, 116 tests, 1.x scripts/experiments/scratch, migrations 001–008, MinIO/OTel infra and 1.x docs; `mythos_api` is the 2.0 server (SPA + `/api/v2` + CORS); `mythos_v2` owns its config/logging. Package `mythos` 2.0.0 with lean deps. Resources 338 → 117 MB (`content/art.test.ts` guarantees 100 % 2.0 art); content art fields repointed to 2.0 files; a FinalChoice broken-image bug found and fixed.
- **Android**: Capacitor 8.5 app `com.projectmythos.signalrun` (offline play, cloud saves/GM online, back button, immersive, invite-code setting); Firebase app + Crashlytics + an App Distribution upload (no testers); SDK/emulator installed; `make android-*`; `docs/android.md`. Debug APK ≈130 MB; verified on a headless, silent emulator (offline resume, online sync).
- **Refactor**: giant UI files split into modules with pixel-parity screenshots (see M94).
- Verified: `make check`, `make test-e2e-v2`, emulator smoke; see the commits.

## 2026-10-11 — 2.0 residuals: boss narration, sharper IX, daily seed, phone combat, Act 3 burst cards

- Owner: "잔여 작업 전부 수행해". Closed every open item from the feedback round plus the post-verdict candidates that need no owner call.
- **AI**: boss entrance/phase narration (`BossNarration.tsx`, GM card over combat; authored first, one LLM swap); IX prompt sharpened (concrete subject + ruling, ≤ 60 자, no place boilerplate) — local gemma4 and Vertex `gemini-3.5-flash` samples now name the unit/companion and end on a verdict; separate event-opening brief (`gm.is_event_opening`); client/server authored-pool sync test (caught one drifted apostrophe); IX comms + boss card moved to the side columns on wide screens (no longer over the back row).
- **Engine**: `ttl` / `cover` events (live-wire countdown, chipped cover) replace animator guesswork; 3 burst cards vs Act 3 armor (`armor_breaker`, `execution_protocol`, `overcharge_lance`; art) — Act 3 elite fights 9.0 → 7.7 turns (greedy), careless-bot rate unchanged within seed noise.
- **Daily seed** (`engine/daily.ts`): KST date × archetype seed, base pools/no threads/paradox 0, per-day best + attempts, title/setup/archive UI, history rows tagged; determinism tested across a fresh and a veteran profile.
- **Phone combat**: see the agent report folded into M93 (portrait/landscape, touch inspector).
- Verified: card text overflow 0/101 (base + upgraded); Vertex smoke of talk/narrate (0.9–2.2 s); sim P0 greedy 100 % · mixed ≈ 35 % (28–41 % by seed block, 360 runs) · basic 0 %; P5 78 / 3.

## 2026-10-11 — 2.0 feedback round: battlefield effects, punchier sound, companion identity, AI back in front, visible auto-save

- Owner played 2.0 ("feel is good") and asked for: AoE impact on the area itself, wall-bump impact, stronger sound, visible DoT/passives, stronger character cards, turn-to-target before casting, more natural/expressive Korean, a visible save/continue, and the LLM conversation back. All addressed (three parallel agents: combat FX + SFX, Korean writing pass, AI presence; lead: engine/content/save).
- **Engine**: ground layer (`ignite` → burning tiles, `electrify` → temporary live wire; burn floor ≥ 2, enemy-lit ground survives into the player's turn; AI avoids both), `area` / `fire` / `passive` events and `damage.cause` (burn/hazard/bump) for the board, `push.slam` (extra bump damage), area redirect/cancel, casters keep facing their target, companion combat passives (`combatPassive`, owner-only triggers), companion reward cards gated to the party + weighted rewards.
- **Content**: 12 new companion cards (2 each, Gemini art), fire/electric on 9 cards/items and 4 enemy types, companion card buffs; 101 cards. Korean pass over events/lore/acts/endings/IX/cards/enemies/UI (voice per character, '~한다' rules text, unified terms: 수호, 접속자, 은신처, 정예, 붕괴 구역, 전기 바닥).
- **Board/sound**: per-tile eruptions by element with scorch, flames/arcs on live tiles with turn badges, burning-unit flames, wall/cover/unit slams ("쾅!", hit-stop, cracks), turn-before-cast; SFX bus with its own punchier compressor + limiter (push +23 dB, burn +7, hits +4; stacked hits no longer clip: 1.34 → 0.98 peak), new cues explosion/ignite/zap/wall_slam/….
- **AI presence**: safehouse companion chat (LLM in voice, injection-hardened, authored fallbacks), GM narration card on events + act intros, IX comms in combat (7 triggers). `POST /api/v2/gm/talk`.
- **Save**: every action auto-saves (already true); now visible — HUD "자동 저장" pulse, pause menu in HUD + combat (save & quit / settings / abandon), Continue shows place + time. Headless check: turn 2 before quit = after Continue = after reload.
- Sim P0 (60 runs): greedy 93 % · mixed 38 % · basic 0 %; P5 83 / 6.
- Verified: `node --test src/v2` 161 pass, `test_v2_*.py` 103 pass, ruff/mypy-strict/tsc/eslint clean, `make check` (see commit), `make test-e2e-v2`.

## 2026-10-10..11 — Mythos 2.0 "Signal Run" built overnight (branch `mythos-2.0`, undeployed)

- Status: the owner rated the 1.x game's fun "D" and authorised a full rebuild by morning ("rebuild anything; keep what's fun"). Audit (two read-only sweeps + a local play session): every click waited 10–60 s on an LLM wall of text; choices had no defined consequences; a run was ~46 turns / 1 h with no failure before the boss; combat was won by basic-attack spam; builds were flat stat boons; the UI was a dev console. Decision + trade-offs: DECISIONS 2026-10-10; design/contract `docs/plans/2026-10-10-mythos-2.0.md`; rules `docs/GAMEPLAY.md`.
- **Built** (10 parallel agents against a lead-written type contract, then lead integration): pure-TS seeded engine `src/mythos_ui/src/v2/engine` (combat: telegraphed intents incl. undodgeable `track` lock-ons, push/bump/void/friendly fire, fire-roots rule, triggers, bonus objectives, enemy AI; run/map/meta: StS map gen, events + bounded Improvise, shop/rest/treasure/rewards, endings, Archive unlocks, Paradox 1–5; greedy/mixed/basic bots + full-run sim); typed content `v2/content` (89 cards, 27 enemies, 37 encounters, 44 implants, 8 consumables, 6 companions, 3 archetypes, 38 events, 23 lore, 4 endings, 20 unlocks); UI `v2/ui` (shell screens + combat board with hit-stop/shake/particles/previews/coach marks, procedural WebAudio SFX + duckable buffer-looped music); server `src/mythos_v2` (`/api/v2` profile/run saves in `v2_saves` with memory fallback, GM narrate/improvise via Ollama/Gemini with authored fallbacks). Classic 1.x untouched at `/?classic=1`.
- **Assets regenerated for 2.0** (`resources/neo-seoul/v2/`, ~33 MB): Gemini image (title/archive/acts/maps/arenas/boss splashes/endings/38 events/89 cards/44 implants/8 consumables), Lyria (18 seamless loops), Codex image (93 transparent sprites: 3 bosses, 3 connector archetypes, 6 companions, 8 elites, 8 variants). Generators idempotent under `scripts/v2_assets/`.
- **Balance** (60 runs, P0, `runSim` + `onFight` telemetry): greedy 93 % · mixed (¾ greedy) 52 % · basic 0 %; P5 greedy 92 % / mixed 11 %. Fight length (greedy): Act 1 normals 4.5 turns, IX 12 (was 16). Tuning moves: lock-on intents, reinforcement waves, HP/damage retune, shorter bosses, loop-1 recruit (Tae-o/Han start unlocked), boss wins raise bonds, IX → ending choice directly; a boss's death shuts its minions down.
- **QA**: three agent playtests in the browser (muted; the last played Acts 2–3 through IX, the ending and the Archive) — fixes for readability, per-act shop, boss phase ticks, mark-aware danger, fast-forward + queued end turn, telegraphs that re-aim under a card preview, enemy push-into-void preview, ending stakes + codex counter, chronicle that closes on IX, Trace naming + tier banner, combat overflow, recruit portraits, ending progress, GM byte-token decoding (client + server), IX cold voice, Korean particles; sound toggles verified + `audio*.test.ts`; hard test mute `?mute=1`.
- Verified: `node --test src/v2` 138 pass; `make test` 1476+ pass (incl. 1.x tests at the time); ruff/mypy-strict/tsc/eslint clean; `make test-e2e` (classic at `/?classic=1`) and new `make test-e2e-v2` (headless muted smoke) pass.
- Next: owner first play (`docs/test/mythos2_first_play.md`) → D–S grade; ship decision (merge + no-traffic Cloud Run tag vs full rollout); `git push` is the owner's.

Older (1.x) entries: branch `1.0`, `bin/docs/archive/progress-2026-*.md`.
