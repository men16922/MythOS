# Decision Log

이 문서는 되돌리기 어렵거나 이후 구현 방향에 영향을 주는 결정을 기록한다. 최신 항목을 위에 추가한다.

## 2026-10-24 — UX first: the game stays simple, the backend may be complex

- **Context**: Wave 1 planned many AI indicators (badges, a TopBar AI chip with a counter, intent-and-percent tags, memory tags, a telemetry HUD).
- **Decision** (owner): UI and player experience come first; the game must never feel complicated or tiring. Backend complexity is fine. New indicators are small and quiet; anything technical for judges stays hidden by default; prefer changes that cut clicks, typing and reading.
- **Consequence**: Wave 1 ships one small `✦ AI` mark on model-written lines + one-tap Improvise ideas; the TopBar AI chip and the intent-percent / memory tags are dropped. The Architect HUD (Wave 3) stays opt-in only (`?hud=1`).

## 2026-10-18 — Daily results are replay-verified server-side; verification is a badge, not a ranking rule

- **Context**: daily results were client-reported (plausibility checks only). Named RNG streams made a run reproducible from its seed and actions.
- **Decision**: the client logs each committed action of a daily run (no extra state in the save) and submits it; the server replays it with the same engine bundled for Node (`replay_verify.mjs`, built with the SPA) and stores `verified` true/false/null. The leaderboard shows a shield on verified rows but ranks as before. The Docker image gains Debian's `nodejs`.
- **Trade-off**: an honest run can be unverified (played across devices, reload lost the log, verifier busy); ranking only verified rows would hide those, so it stays an owner call for when prizes are involved. The verifier must be rebuilt whenever engine/content change (`make frontend-build` does both).

## 2026-10-18 — Named RNG streams: a daily is one run for everyone; stream names are frozen

- **Context**: one shared `run.rng` fed every roll, so on the same daily seed a player who merely opened a shop got a different Act 2/3 map and different fights (reproduced: same encounter, different opening hand). It also made balance A/B noisy (changing one card re-rolled every later map) and blocked any replay-based leaderboard check. The design follows the clean-room spec in the owner's StS2 RNG study (`~/Desktop/AI/sts2-rea-lab/REPORT.md`, `impl/INTEGRATION.md`; its `work/` decompile is MegaCrit's and is never copied here).
- **Decision**: `engine/streams.ts` — act maps `map@a<act>`, node streams `<reward|shop|treasure|event|crpg|encounter>@a<act>:<node>` (stored in `run.streams`, reset on entering a node), fights `combat@a<act>:<node>:<enc>` with separate `shuffle` and `ai` streams; a reshuffle sorts the discard (def id, upgrade, uid) first. Saves without `run.streams` keep the legacy single stream. **Stream names are part of their seeds: never rename one.** We keep mulberry32 (one uint32 of state is already an exact save); xoshiro256**/counter saves and StS2 bit compatibility bring nothing here.
- **Trade-off**: every seed now plays differently from before (dailies from 2026-10-19 on; past daily records stay). In Act 2/3 a node whose pre-rolled event the player already saw still swaps to another event. Mixed-bot win rate unchanged within noise (42.4 % → 43.3 % over 1,080 runs on identical seeds).

## 2026-10-18 — Paid Play release and Signal+ on hold; contests first

- **Context**: owner, same day as the tier decision: selling IAP in Korea needs 사업자등록 + 통신판매업 신고, a public record that could conflict with an employer's no-side-business clause; unit economics are weak (≈ $0.87/month net per Signal+ subscriber at full allowance, and the ₩30,000/month Vertex cap would cut AI for payers too).
- **Decision**: no business registration, merchant profile or `signal_plus_monthly` work until the owner reopens it. Direction: contests / hackathons / showcases (`docs/plans/2026-10-18-strategy-and-market-analysis.md` §5) — judge-accessible web demo, English write-up, demo video; check each contest's "existing project" rule. Quality bar (owner goal): commercial-grade fun and polish plus distinctive AI features.
- **Trade-off**: the Signal+ code stays shipped but dormant (no product → nobody can buy); the tier entry below still describes it.

## 2026-10-18 — Player tiers: AI within a monthly $ allowance, Signal+ subscription adds a CRPG layer

- **Context**: owner — "사용자 Tier를 나눠야할거같아", "로그인 유저는 금액 한도로 AI를 넣고, 별도로 유료 월 구독을 넣어서 그 사람들은 금액 한도를 늘려주는거지", "전투 요소 위주라서 CRPG 관련 요소도 … 유료 버전을 위한 혜택 … 발더스 게이트". The game was free with no IAP, so every GM call was pure cost with no ceiling.
- **Decision**: guests get no AI; signed-in players get AI lines within a monthly money budget (default $0.30), Signal+ (monthly subscription, Google Play only) raises it (default $1.50) and unlocks the CRPG layer (districts, d20 dialogue, backgrounds, approval, quests, AI NPC talk, camp nights, banter). A global daily ceiling stops free players first. Paid content never touches the daily seed. Growth points, echo inscription, autonomy and the thought cabinet are authored and for everyone. Plan: `docs/plans/2026-10-18-tiers-and-ai-narrative.md`.
- **Trade-off**: the CRPG layer is content-heavy (6 districts at launch); purchases are verified server-side without RTDN (expiry re-check on `GET /plan`), so a refund can take until the stored expiry to land. Owner confirmed the same day: ₩3,900/month, free $0.30 / Signal+ $1.50 per month, $20/day global ceiling; web checkout stays off.

## 2026-10-13 — Overnight harness: held-out bank v2 for the 2.0 tree; model pins kept

- **Context**: bank v1 (`scripts/overnight/heldout-bank.md`, frozen 2026-07-27) targeted 1.x code now on branch `1.0`; plugin 1.8.0 defaults actor and critic to Opus 5.5 while the `Makefile` pins actor `claude-sonnet-5` / critic `claude-fable-5-1`.
- **Decision**: owner approved bank v2 (extract `useTierAlert`, lock `effectiveIntentDamage`/`isRelative`, cover `RateLimiter` eviction) — frozen again, mechanical audit PASS (open in source, not in NEXT_PLAN, the claude contract compiles). Owner kept the current model pins (cost unchanged).
- **Trade-off**: the bank is small (3 tasks) so it can be audited 100 %; Opus-default quality is not used unless the owner revisits cost.

## 2026-10-11 — Operator dashboard is rebuilt for 2.0 (`/admin`), gated by a Google email allow-list

- **Context**: owner — "Admin용 대시보드는 어디갔어?" then "내 계정으로 admin을 잡고, 2.0용으로 새로 만들고싶어". The 1.x dashboard was invite-key based and went to branch `1.0` with the archive.
- **Decision**: `GET /api/v2/admin/overview` + a static `/admin` page. Admin = a verified Google email in `MYTHOS_ADMIN_EMAILS` (env, not committed). No new tables: the numbers are read-only aggregates over saves, run history and daily scores; the email is compared in memory and never stored, so the roster shows names + short refs only.
- **Trade-off**: anonymous play is invisible (it never reaches the server by design); figures are client-reported; GM counters are per instance. No GM cost figure (would need persisted per-call usage).

## 2026-10-11 — Google sign-in replaces invite keys; daily leaderboard on our own server; daily push by topic

- **Context**: owner — "꼭 초대코드가 필요한가? Gmail로 로그인 시키는 기능으로 대체하자", plus Play Games Services and push. No Play developer account exists yet.
- **Decision**: Firebase Auth (Google provider) is the only cloud identity: Cloud Run runs `MYTHOS_AUTH=google`, the server verifies Firebase ID tokens itself (RS256 against Google's securetoken certs, no firebase-admin) and keys data on `g_<sha256(uid)>`. Anonymous play stays fully offline with authored lines. The daily-seed leaderboard lives in `/api/v2/daily` (`v2_daily_scores`), ordered like `isBetterDaily`; Play Games leaderboards mirror it later. Push = FCM topics `daily-ko`/`daily-en` sent by Cloud Scheduler straight to the FCM API (no device tokens stored). GM cost caps: none for now (owner).
- **Trade-off**: results are client-reported (plausibility checks only), acceptable for a single-player daily board; old pre-sign-in cloud saves are not claimable (2.0 had none in production). Owner steps: enable Google in Firebase Auth, authorized domains, deploy, scheduler + an FCM role for its service account (`docs/online.md`).

## 2026-10-11 — `main` becomes 2.0-only; 1.x is archived on branch `1.0`

Decision: owner ("2.0 정리 + 1.x는 아카이브", then "현재 2.0을 main 브랜치로 올리고, 기존 내용은 1.0 브랜치에 archive"). Branch `1.0` points at the last 1.x `main` (`edb5b53`); `main` fast-forwards to the 2.0 line and drops the 1.x runtime packages (`mythos_core/memory/loop/narrative/runtime/combat/image_agent`), the classic React client (`/?classic=1`), the 1.x `/api/v1` + WebSocket API, 1.x tests/scripts/experiments, migrations 001–008, MinIO/OTel/Jaeger infra, and 205 MB of art used only by 1.x or as dead fallbacks. `mythos_v2` gains its own `config.py` / `log.py`; the server is `mythos_api` (SPA + `/api/v2` + CORS).

Reason/impact: the owner rated 2.0's feel good and chose it as the product; carrying two runtimes doubled the gate, the image size and the agent context. The next deploy replaces what CBT testers see. The overnight harness keeps running but its 1.x task bank and Dev Graph missions stay on `1.0` until re-seeded for 2.0. The 1.x-era entries (2026-05 … 2026-09) are kept on branch `1.0`.

## 2026-10-11 — 2.0: burning/live ground is a board layer; the AI comes back to the front without blocking play

Decision: (1) Area cards, items and some enemy moves leave **ground effects** on tiles — `Tile.fire` (burning ground, N enemy phases) and `Tile.ttl` (temporary live wire). Fire is a *floor* on Burn (entering it or ending the enemy phase on it sets Burn ≥ 2), not a stack, and a fire lit during the enemy phase gets +1 turn so the player always sees it. Enemies path around both. (2) Owner choice (2026-10-11, asked when they noticed "the LLM conversation isn't visible"): **companion chat + stronger GM**. The safehouse bond action becomes a free-text chat with the companion (LLM in character, ≤4 messages, authored fallbacks, no game-state effect beyond the existing bond +1), event/act-intro GM narration is a prominent card, and IX comments on notable combat moments via a click-through comms box (authored line first, one LLM swap, ≤1 line per 2 turns). New endpoint `POST /api/v2/gm/talk` (`src/mythos_v2/talk.py`). (3) Companions get an in-combat passive (`CompanionDef.combatPassive`, trigger-driven) and two reward cards each that are offered only while they travel with you; companion/archetype cards are weighted ×2.5/×1.8 in rewards.

Reason/impact: owner feedback after the first 2.0 session — AoE felt weak and "nothing happens on the area", DoT/passives were invisible, character cards lacked identity, sound was weak, the AI felt gone. Stacking fire (first cut) dropped the careless-bot win rate 52 → 23 % because enemy-lit fire double-burned in the same phase; the burn-floor rule restored it to 38 % with Act 2 as the new first hurdle. The AI stays off the critical path (DECISIONS 2026-10-10); talk output never changes game state.

## 2026-10-10 — Mythos 2.0: the game is rebuilt as a client-side tactical deck-building roguelite

Decision: under the owner's mandate ("fun is D, make it S, rebuild anything, by morning") the playable game becomes **Mythos 2.0 "Signal Run"** — Into the Breach-style telegraphed tactics on a 7×5 board + Slay the Spire deckbuilding + a Hades-style meta loop, with the AI GM moved off the critical path (authored text first, GM line layered on; free-text Improvise adjudicated inside engine-clamped bounds). The rules engine is **pure TypeScript in the client** (`src/mythos_ui/src/v2/engine`, seeded RNG, JSON state, `node --test`), content is typed data (`v2/content`), and the server only persists profile/run blobs and serves GM text (`src/mythos_v2`, `/api/v2`, table `v2_saves`, memory fallback). All 2.0 art and music are newly generated (Gemini image + Lyria on Vertex, Codex image for transparent sprites) under `resources/neo-seoul/v2/`. The 1.x runtime, API and SPA are untouched and remain reachable at `/?classic=1`.

Reason/impact: the 2026-10-10 audit (PROGRESS_LOG) traced the D rating to structure, not polish — every click blocked on a 10–60 s LLM wall of text, choices had no defined consequences, a run was ~46 turns/1 h with no failure before the boss, and combat was won by basic-attack spam. Those are properties of the server-authoritative narrative loop itself, so the fix is a new core loop rather than another tuning pass. A client-side engine gives instant previews/undo (the heart of telegraph tactics) and makes balance measurable headlessly (bots: greedy 97 % / mixed 40 % / basic 0 % at Paradox 0). Trade-offs accepted: rules are client-trusted (single-player, no competitive stakes); 1.x systems (Narrative Director, combat engine, route map, progression) are no longer on the 2.0 path but are kept, not deleted, until the owner decides the classic build's fate. Deploying 2.0 to Cloud Run (which would change what CBT testers see) stays an owner call.

(1.x decisions, 2026-05 … 2026-09: branch `1.0`, `docs/DECISIONS.md`.)
