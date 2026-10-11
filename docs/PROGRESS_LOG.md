# Progress Log

Last updated: 2026-10-11

## 2026-10-11 — Combat balance pass: Incinerator tuned; card audit (no change)

- Per-encounter telemetry (mixed bot, 4 seed blocks × 60 runs): the curve is as designed (Act 1 ≈ 0–3 % losses, Act 2 elites/boss 0–8 %, Act 3 6–27 %, IX 26 %), with one outlier — `a2_elite_incinerator` lost 20 % of the time and cost 15.7 HP per fight vs 0–5 % and ≈ 4 HP for the other Act 2 elites. In isolation (starter decks × 60 seeds × 3 archetypes): mixed 91 % win / 15.5 HP lost, greedy 5.0 HP lost vs 0.4–0.7 for Reaver and Captain.
- Levers tried one at a time (isolated mixed win / HP lost): firestorm burn 3 → 2: 96 % / 12.7 · plus drone cooldown 3 → 4: 97 % / 12.2 · plus HP 40 → 34: 96 % / 11.6. Only the burn change moves it; the others are marginal, so the change is **burn 3 → 2 and nothing else**. Run level: Incinerator loses 20 % → 16 %, 15.7 → 12.6 HP; greedy bot loses 0 of 70 (was 1 %); overall mixed 41 % unchanged (98 → 99 wins / 240). It stays the hardest Act 2 elite on purpose — it punishes standing in ground fire.
- Card audit (crude points per energy by rarity, no change made): outliers by that scale are `static_discharge`, `overheat`, `blink_strike`, `serin_slipstream`, `kai_spotter`, `adrenaline`, `taeo_breach_drive`, `meltdown`, `insider_trading` (strong) and `hot_wire`, `blackout` (weak). The scale ignores statuses and utility, and the simulator has no per-card contribution measure, so this is a watch list for real-play data, not a tuning order.
- Greedy bot baseline note: 98–99 % over 240 runs on these blocks (the docs' 100 % was a different 360-run sample); it was 98 % before this change.

## 2026-10-11 — Event balance audit + guard (and a correction)

- **Correction**: the wave-4 entry says "the sim does not resolve events". It does — `runSim.decideEvent` picks the best expected-value option with `outcomeValue`; I had read a field that doesn't exist. Balance of events was therefore measurable all along.
- Audit (`outcomeValue` per option at a mid-run state, stats 4 and 6): the new street-level events sat at the bottom of their acts — 5 had every open option net-negative, i.e. a pure tax. Retuned `a1_bus_stop_scan`, `a1_hand_crank_lamp`, `a2_toll_bridge_kids`, `a2_lantern_ferry`, `a2_face_stall`, `a3_name_archive`, `a3_maintenance_priest`, `a3_serin_inside_line` (small credit / ◈ / HP gains, lighter failures, a few DCs 7→6); all open-option bests are now ≥ 0.7. The five arc finales intentionally tie at 10 (gated behind two earlier parts); `a3_ix_offer` (21.7) is the deliberate outlier.
- New `engine/event-balance.test.ts` locks it: best open option ≥ 0.5 and ≤ 12 for every rolled event, with two named exceptions (`a3_blank_in_list` — an authored heavy-trade twist the scale undervalues; `a3_ix_offer`) and a check that exemptions don't go stale. `runSim.outcomeValue` is now exported for it.
- Sim A/B on identical seeds (mixed bot, 3 blocks × 60): before any event wave 72/180 (40 %) → after the waves 74/180 (41 %) → after this retune 78/180 (43 %). Differences are inside the ±5 pp noise; the 30 extra events did not move difficulty.
- Continuity fix: `a3_kai_name_given` no longer assumes the umbrella was bought (touch-only path).

## 2026-10-11 — Companion arcs for Tae-o, Han, Se-rin, Kai and Lin-yue (15 events)

- Same shape as the Su-ah arc (`content/eventsArcs.ts`): three events per companion (Act 2 → Act 3 → Act 3), event-level gated on that companion being in the party, later parts read the flag the earlier one set; each picks up the thread their lore entry leaves open. **Tae-o** "처리 대기" (the wanted board → the pending file → holding the line; flags `taeo_trail`, `taeo_cleared`) · **Han** "구경하는 버그" (the blank registration booth → the first poke at IX → the empty reply "user unrecognized"; `han_probe`, `han_poked`) · **Se-rin** "열세 번째 선" (the radio that answers → the hidden line inside → finishing the chalk line; `serin_signal`, `serin_line`).
- 9 scene images (portrait-referenced; 9 calls, 0 failures, ledger 248), manifest + SPA rebuilt. `engine/suah-arc.test.ts` now drives all four arcs through the real reducers (companion gating, a sure no-check path to the first flag, the second flag opening the payoff). Pool: 62 events.
- **Kai** "노란 우산" (umbrella stall → crosswalk footage → the day he was named; `kai_clue`, `kai_found`) and **Lin-yue** "붉은 페이지" (crew roll → the Moonlight lot → the last entry; `linyue_crew`, `linyue_names`) followed in the same pass (6 more images, ledger 254) — every companion now has a 3-event arc; pool 68 events. The arc test table covers all five in `engine/suah-arc.test.ts`.

## 2026-10-11 — Su-ah arc: the voice in the drawer (3 events)

- Su-ah (the 4th companion) had the fewest dedicated events, and the Memory Forge leaves her "mother's voice in the drawer" as a thread nobody picks up. `content/eventsMore.ts` `SUAH_ARC`: `a2_suah_first_pour` (add a memory / pay 45 ₵ / tell her to stop) → sets `suah_voice`; `a3_suah_voice_archive` (listen needs `suah_voice`; or copy the file; or pull the plug) → sets `suah_voice_heard`; `a3_suah_last_pour` (only after the voice was heard: forge defence / edge / just stay). All three are event-level gated on Su-ah being in the party, so they never roll for other parties. 3 scene images (portrait-referenced), SPA rebuilt.
- New `engine/suah-arc.test.ts` drives the real reducers: gating by companion, the flag chain, bond/credit/max-HP effects.
- Guard rails added with it: a content invariant (a flag may be read only in the act where it can already have been set — a flag set only in a later act would lock its reader forever) and `build_overview` edge-case tests (empty input, `days` clamp, the KST midnight split, odd run fields).
- Verified: `make test-v2`, `make test-e2e-v2`. Pool is now 53 events.

## 2026-10-11 — Durable AI GM usage counters (dashboard)

- The GM counters lived in process memory (lost on every Cloud Run restart), so there was no basis to decide on a cost guard. `v2_gm_usage` (migration 013, also in `SCHEMA_STATEMENTS`) counts calls per KST day / route / outcome; `log_gm` writes it best-effort (2 s cap, never fails or delays a reply beyond that). Dashboard: "AI GM 일별 호출" — total, LLM, fallback and the fallback rate, plus the outcome mix (timeout / rate_limited / rejected …).
- Decision: the GM cost guard stays off (owner: none for now); revisit when this table shows real volume (≈ $0.085 per run measured).
- Not done on purpose: re-seeding the overnight held-out bank — `scripts/overnight/heldout-bank.md` is the owner-ratified frozen v1 and its three tasks target 1.x code that now lives on branch `1.0`; replacing it needs a recorded owner decision.

## 2026-10-11 — Event wave 4: 12 new street-level events (16 per act)

- Goal from the owner: "계속해서 2.0의 퀼리티 업그레이드 및 잔여작업 수행해". A veteran meets ~3 events per act from a pool of 12, so repeats showed up after a few runs; each act now rolls from 16.
- `content/eventsMore.ts`: 4 per act (noodle stall, hand-crank lamp, courier lockbox, bus-stop scan beam · lantern ferry, face stall, toll kids, stalled maglev · glass atrium, name-tag archive, maintenance priest, window cleaner). Each has a stat-check option with a stinging failure, a no-risk option and a trade-off; no companion conflict and no new flags, so they roll in any order. 12 scene images (`scripts/v2_assets`, 12 calls, 0 failures; `V2_IMAGE_BUDGET=250` for the run since the ledger was already past the old 220), art manifest rebuilt, SPA rebuilt.
- **Deployed** as rev `00095` together with the new-players metric (migration 012 ran on first use; preview smoke: health postgres, bundle + art served, overview 401 unsigned) and promoted to 100 %.
- Verified: `make test-v2` 221, `make test-e2e-v2`, sim mixed bot 35/90 = 39 % (inside the 28–41 % band; the sim does not resolve events, so event balance rests on the narrative tests and the numbers matching existing events' ranges).

## 2026-10-11 — Operator dashboard for 2.0 (`/admin`)

- Owner: "Admin용 대시보드는 어디갔어?" → "내 계정으로 admin을 잡고, 2.0용으로 새로 만들고싶어". The 1.x invite-key dashboard stayed on branch `1.0`; 2.0 gets a new one.
- **Server**: `mythos_v2/admin.py` (pure aggregation + `GMStats`), `V2Store.admin_players/admin_runs/admin_daily` (Memory + Postgres, field-subset SQL so full blobs are never pulled), `auth.Identity` / `verify_identity` (email + email_verified), `MYTHOS_ADMIN_EMAILS`, `GET /api/v2/admin/overview?days=` (401/403/429), `GET /admin` (no-store, noindex). Local shortcut `MYTHOS_ADMIN_OPEN=1` in `open` mode only. `make deploy*` pass `.env`'s `MYTHOS_ADMIN_EMAILS`.
- **Page**: KPIs, per-day stacked chart, archetype win rates, killers/endings, today's daily board, GM/server block, player roster with active run + last run; 30 s refresh; every string escaped.
- **Deployed** (owner: "일단 배포해"): `make deploy-preview` → rev `00093`; smoke on the preview URL (health postgres + gemini, `/admin` 200 no-store, overview 401 for no/forged token and `X-Player-Id`) → `update-traffic --to-latest` (100 %). A real Google sign-in on `/admin` is still the owner's check.
- **Follow-up (not yet deployed)**: `v2_saves.created_at` (migration 012, also in `SCHEMA_STATEMENTS`, so the self-creating DDL adds it on first use) → dashboard "신규 가입" (24 h / 7 d KPI, per-day, roster join age). Existing rows read as the migration time.
- Verified: `tests/test_v2_admin.py` (access matrix, aggregation, page), store contract on memory + Postgres (`make test-db`), headless render of the real payload with a stubbed Firebase. **Not verified**: a real Google sign-in on `/admin` (needs the owner's browser) and production (not deployed).

## 2026-10-11 — 2.0 live on Cloud Run; daily push scheduled

- Owner: "나머지는 수행하라고" (deploy, push account + schedule, git push; Play account = owner's $25).
- `make deploy-preview` never worked: Cloud Run tags need ≥ 3 characters → tag renamed `v2-preview` (Makefile, `auth-domains.sh`, docs) and its hosts authorized. Preview rev `00091` smoke: health, `store: postgres`, `gm: gemini:gemini-3.5-flash`, `/config` auth google, unsigned PUT and forged token → 401, public board 200, CORS for `https://localhost`; real Google sign-in on the preview URL, a run saved (PUT 200) and a Vertex narrate (`llm`, 3.4 s). Promoted with `update-traffic --to-latest` (100 %); both service URLs serve 2.0.
- Push: service account `mythos-push@` + `roles/firebasecloudmessaging.admin` only; `PUSH_SA=… make push-schedule` → `mythos-daily-push-{ko,en}` 19:00 Asia/Seoul; a manual run of the ko job got HTTP 200 from FCM (no subscribers yet).

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

Older entries: `bin/docs/archive/progress-2026-*.md` (2.0 build: `progress-2026-10-10-mythos2-overnight-build.md`; 2.0 feedback round + residuals: `progress-2026-10-11-mythos2-early.md`); 1.x: branch `1.0`.
