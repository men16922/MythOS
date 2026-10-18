# Online features: Google sign-in, daily leaderboard, daily push

Server half of Mythos 2.0's online layer (the client half lives in `src/mythos_ui/src/v2`, Android in
`docs/android.md`). Anonymous players still play everything offline with authored lines; signing in with Google
turns on cloud saves, the AI GM and leaderboard submits. Invite keys are gone (`MYTHOS_INVITE_KEYS`,
`X-Invite-Key`, `?invite=` no longer exist).

Code: `src/mythos_v2/auth.py` (token check, config), `daily.py` (ordering, names, KST dates), `store.py`
(`v2_daily_scores`), `api.py` (routes). Scripts: `scripts/firebase/`. Tests: `tests/test_v2_{auth,daily,api,store,firebase_scripts}.py`.

## Sign-in modes

| `MYTHOS_AUTH` | Where | Identity |
| --- | --- | --- |
| `open` (default) | `make api`, tests | `X-Player-Id` header (client id). A Bearer token, when sent, is verified and wins; a token that fails is a 401. |
| `google` | Cloud Run (`make deploy` sets it) | Saves, GM and leaderboard writes need `Authorization: Bearer <Firebase ID token>`, else 401 `{"detail":"sign-in required"}`. `X-Player-Id` is ignored. |

Any other value fails closed to `google`. The token check follows Firebase's third-party-JWT recipe (no
firebase-admin): RS256 against Google's securetoken x509 certs (cached per `Cache-Control: max-age`; an unknown
`kid` refreshes at most once a minute; fetched off the event loop), `aud` = project, `iss` =
`https://securetoken.google.com/<project>`, `exp`/`iat`/`auth_time` with 60 s leeway, non-empty `sub`, and
`firebase.sign_in_provider == "google.com"`. If Google's certs are unreachable and none are cached the route
answers 503 (not 401). The player id is `g_` + `sha256(uid)[:32]`; the `g_` prefix cannot be claimed through
`X-Player-Id`. The uid, email, name and token are never logged.

Env: `MYTHOS_AUTH`, `MYTHOS_FIREBASE_PROJECT` (else `PROJECT_ID`), `MYTHOS_FIREBASE_WEB_CONFIG` (JSON object string;
else the gitignored `.firebase/web-config.json` from `make firebase-web`). CORS allows `Content-Type`,
`X-Player-Id`, `Authorization`.

## Endpoints (`/api/v2`)

| Route | Access | Shape |
| --- | --- | --- |
| `GET /config` | public | `{"auth": "open"\|"google", "firebase": {apiKey, authDomain, projectId, appId, messagingSenderId} \| null, "leaderboard": true}` |
| `GET /health` | public | unchanged: `{status, store, gm}` |
| saves / history / GM | identity | unchanged shapes |
| `PUT /daily/{date}` | identity (both modes) | body `{"name", "result": DailyResult}` → `{"rank", "total", "best", "improved"}` |
| `GET /daily/{date}?archetype=&limit=` | public; `me` when identified | `{"date", "archetype", "total", "entries": [{"rank", "name", "result", "me"}], "me": {"rank", "name", "result"} \| null}` |
| `GET /admin/overview?days=` | admin Google account | operator dashboard payload (see "Admin dashboard") |
| `DELETE /account` | identity | erase the player's rows → `{"ok", "removed": {saves, history, daily, gm_spend, entitlements}, "sign_in_record_deleted": true\|false\|null}` (see "Account deletion") |
| `GET /plan` | identity | `{tier: free\|plus, signedIn, accountId, features: ["ai"?, "crpg"?], budget: {limitUsd, usedUsd, left}, subscription \| null, skus}`; re-checks an expired subscription with Google |
| `POST /plan/play` | signed in | body `{purchaseToken}` → verify with Google Play, check `obfuscatedAccountId` = the player, acknowledge → plan; 422 not ours/invalid, 503 Play unreachable or no access |
| `POST /gm/report` | identity | body `{route: narrate\|improvise\|talk, kind, lang, text ≤ 2000}` → `{"ok"}`; 10/min per player (`MYTHOS_V2_REPORTS_PER_MINUTE`) |

`DailyResult` = `{archetype /^[a-z_]{1,32}$/, won: bool, act 1..3, floors 0..80, echoes 0..999, kills 0..999,
secs?: 1..86400}`; strict JSON types (no `"2"`, `true` or `2.0` for an int); unknown keys ignored; violations → 422.
Submit date: today or yesterday in KST; read date: today and the 29 days before (KST); else 422 with a string
`detail`. `limit` 1..50 (default 20). Names: NFC, control/format characters dropped, whitespace collapsed, at most
16 characters, empty → `익명` (over 200 raw characters → 422). Writes are limited per player
(`MYTHOS_V2_DAILY_PER_MINUTE`, default 10/min) → 429.

## AI budget and Signal+

Plan: `docs/plans/2026-10-18-tiers-and-ai-narrative.md`. Every GM call is checked by `mythos_v2.budget` before the
model is asked: a miss serves the authored line (dashboard outcomes `budget` = the player's monthly allowance is
spent, `ceiling` = the global daily cap tripped). Spend = billed tokens × `MYTHOS_GM_PRICE_*` (default the measured
gemini-3.8-flash introductory price) in micro-USD, per player per KST month in `v2_gm_spend`.

| Env | Default | Meaning |
| --- | --- | --- |
| `MYTHOS_V2_BUDGET_FREE_USD` | 0.30 | monthly GM allowance of a signed-in free player |
| `MYTHOS_V2_BUDGET_PLUS_USD` | 1.50 | monthly allowance with Signal+ |
| `MYTHOS_V2_GM_DAILY_USD` | 20 | everyone's GM spend per KST day (0 = off) |
| `MYTHOS_V2_FREE_SHARE` | 0.7 | free players stop at this share of the daily cap; Signal+ goes on to the cap |
| `MYTHOS_PLUS_SKUS` | `signal_plus_monthly` | Play subscription ids that grant Signal+ |
| `MYTHOS_PLUS_GRANT` | — | comma list of player ids treated as Signal+ (operator testing) |

Admin accounts (`MYTHOS_ADMIN_EMAILS`, verified Google email on the token) have no monthly allowance and Signal+ features; the global daily ceiling still applies to them. `/plan` reports `admin: true` and `budget.unlimited: true`.

Signal+ (`mythos_v2.billing`): the app buys through the local `BillingPlugin` (Play Billing 8) with
`obfuscatedAccountId` = the player id from `/plan`; the server verifies the token with `purchases.subscriptionsv2`,
acknowledges it and stores one `v2_entitlements` row (erased with the account). `GET /plan` re-asks Google once the
stored expiry passed — renewals, cancellations and refunds without an RTDN endpoint. Needs the service account in Play
Console (`docs/play-store.md` step 7); until then purchases answer 503 and everyone stays free. The web has no checkout.

## Contest demo codes (off by default)

Guests get no model calls, so a contest judge who does not sign in would never see the AI. `MYTHOS_DEMO_CODES`
(comma/space separated, 6–40 chars of `[A-Za-z0-9_-]`; unset = off) opens the AI for a demo link
`<service URL>/?demo=<code>`: the client keeps the code in localStorage (`?demo=off` forgets it) and sends it as
`X-Demo-Code` with `X-Player-Id` on the GM routes and `GET /plan` only. The server maps it to `demo_<sha256(code|id)[:24]>`
with the **free** allowance per device; saves, daily writes and purchases still need sign-in, and the global daily
ceiling and the Vertex cap still apply. The title screen says "데모 접속" under the sign-in chip. Rotate a code by
changing the env var (old links fall back to authored lines). Set it with the next deploy (`.env` → `make deploy-preview`).

## Vertex spend cap (owner, 2026-10-18: "월 3만원 넘으면 Vertex 자동 차단")

Budget `mythos-vertex-cap-30000 (auto-disable Vertex)` on billing account 010556-A2B7AE-292490: ₩30,000/month for the
MythOS project, cost after all credits, thresholds 50/90/100 %, notifications to Pub/Sub `billing-vertex-cap`. The
function `vertex-cap` (`scripts/ops/vertex_cap`, Cloud Run functions gen2, SA `vertex-cap@` with Service Usage Admin)
disables `aiplatform.googleapis.com` when the month's cost reaches the budget and enables it again once a new month's
cost is under it; months before `CAP_START=2026-11` are ignored. With Vertex off the game keeps running and the GM serves
authored lines. Billing data lags by hours, so a burst can overshoot the cap before it trips. Re-enable by hand:
`gcloud services enable aiplatform.googleapis.com` (the function turns it off again only on the next over-budget
notification). Redeploy: `make vertex-cap-deploy`. Verified 2026-10-18 with test messages: October ignored, an
over-budget November message disabled the API in ~10 s, a new-month message enabled it again.

## Account deletion, AI line reports, policy pages (Play policy)

- **Account deletion** (Play: in-app + web): Settings → 계정 삭제 → inline confirmation → `DELETE /api/v2/account`. Pending
  saves go out first and the DELETE is chained behind them; the server deletes `v2_saves`, `v2_run_history` and
  `v2_daily_scores` rows in one transaction (`store.delete_player`; a test fails if a new table with `player_id` is
  not covered), then the Firebase Auth user through the Identity Toolkit admin endpoint with the service account's own
  credentials (`auth.FirebaseAccountDeleter`, no firebase-admin). The client then signs out; this device keeps its
  local progress. The Cloud Run service account needs `roles/firebaseauth.admin` for the last step — without it
  the call still erases the data and answers `sign_in_record_deleted: false` (logged as `sign-in-record-kept`; remove
  the user in the Firebase console within 30 days, as the policy page promises).
- **AI line reports** (Play AI-generated content policy): every model-written line is noted in memory
  (`ui/common/aiLines.ts`); Settings → "AI 대사 신고" lists this session's lines with a flag each (the only place for the
  click-through IX comms and boss card), and chat replies plus the event/act GM cards carry an inline flag. A flag
  posts only the line, its source and language to `v2_gm_reports` (`migrations/015`; no player id; pruned after 90
  days); the `/admin` dashboard lists them.
- **Policy pages**: `/privacy` and `/account-deletion` (Korean + English, `src/mythos_api/legal/`), filled at startup
  with `MYTHOS_CONTACT_EMAIL` (without it they point at the store listing's developer email) and
  `MYTHOS_DEVELOPER_NAME` (default `Project Mythos`); `make deploy` passes both from `.env`. Bump
  `legal.EFFECTIVE_DATE` when the text changes. These are the URLs for Play Console's privacy-policy and
  account-deletion fields.

## Admin dashboard (`/admin`)

Operator page for the owner: players, activity, runs per day (KST), win rate by archetype, killers, endings, today's
daily board, per-player roster (active run, last run) and AI GM outcome counters. New in 2.0 — the 1.x invite-key
tester dashboard is archived on branch `1.0`.

- **Access**: `MYTHOS_ADMIN_EMAILS` (comma-separated Google accounts, case-insensitive, **verified email required**;
  empty = nobody). `/admin` is public static HTML that signs in with Firebase Google; every data call
  (`GET /api/v2/admin/overview`) is checked server-side → 401 without a valid token, 403 for any other account.
  `X-Player-Id` never grants admin. Limit `MYTHOS_V2_ADMIN_PER_MINUTE` (default 30) → 429.
- **Local dev**: `MYTHOS_AUTH=open MYTHOS_ADMIN_OPEN=1` serves the overview without sign-in (ignored in `google` mode).
- **Deploy**: `make deploy` / `make deploy-preview` pass `.env`'s `MYTHOS_ADMIN_EMAILS` along. To set it on the running
  service without a rebuild: `gcloud run services update mythos-api --region us-central1 --update-env-vars MYTHOS_ADMIN_EMAILS=<email>`.
- **Privacy**: the Google email is only compared in memory (never stored or logged); players appear as their chosen name +
  a short `ref` of the opaque id. Anonymous (not signed-in) play never reaches the server, so it is not counted.
- **Data**: read-only queries over `v2_saves`, `v2_run_history`, `v2_daily_scores`, plus `v2_gm_usage` (one counter row per
  KST day / route / outcome — no player ids or text; written best-effort, 2 s cap, after the GM reply is decided). The
  "서버 · AI GM" counters are per Cloud Run instance since it started; the daily table is the durable record.
  Each row also sums the billed tokens (`prompt_tokens`, `output_tokens`; thinking counts as output) that the Gemini / OpenAI-compat
  backend reported for the call (`llm.take_last_usage`, read on the worker thread). Calls abandoned by the wall-clock timeout are
  counted but their tokens are lost, so tokens slightly under-count. The dashboard shows an estimated USD cost only when the server
  has `MYTHOS_GM_PRICE_IN_PER_M` and `MYTHOS_GM_PRICE_OUT_PER_M` (USD per million tokens, both); no price is assumed.

## Leaderboard ordering and trust

One row per (date, archetype, player) keeps that player's best. Better first: won, act, floors, echoes, kills
(higher first), secs (lower first; missing = worst), then the result achieved first (`achieved_at`), then player id
so the order is total. This is exactly `engine/daily.ts` `isBetterDaily` (a test checks the server's packed `score`
against a port of it). A worse or equal resubmit keeps the stored best and its time but updates the name;
`improved` says whether the best changed. Ranks come from one index (`day, archetype, score DESC, achieved_at,
player_id`); table `v2_daily_scores` (`migrations/010_v2_daily_scores.sql`, mirrored in
`store.SCHEMA_STATEMENTS`).

Trust model (2026-10-18): the client records every committed action of a daily run (`ui/replay/record.ts`:
`rx` and the combat actions tag the states they return; the store logs what it commits) and sends the log with
the result. The server re-runs it with the game's own engine (`mythos_v2/replay.py` → `node replay_verify.mjs`, a
bundle of engine + content rebuilt by `make frontend-build`) from the date's seed and stores `verified`
(`migrations/018`): true = the replay reaches exactly the claimed result (all but `secs`, which is wall-clock), false
= it does not, null = no log (a reload on another device, a dev-tool edit) or no verifier (`node` missing,
`MYTHOS_REPLAY_VERIFY=off`, busy, timeout). The board shows a shield on verified rows; **ranking is unchanged** (a
verified-only board would be a one-line change in the board query if it ever matters for prizes). At most two
replays run at once per instance, 10 s each; a real full daily (533 steps) replays in well under a second.

## Daily push

No device tokens are stored anywhere. The app subscribes to the FCM topic for its language (`daily-ko` /
`daily-en`). Two Cloud Scheduler HTTP jobs (`mythos-daily-push-ko`, `-en`; default 19:00 Asia/Seoul, us-central1)
post straight to `https://fcm.googleapis.com/v1/projects/<project>/messages:send` with an OAuth token for a service
account (default `<project-number>-compute@developer.gserviceaccount.com`, override `PUSH_SA`). Message:
`notification {title, body}`, `data {"open": "daily"}`, `android {ttl "21600s", collapse_key "daily",
notification {channel_id "daily", icon "ic_stat_mythos", color "#3ef0ff"}}`; ko "오늘의 시드가 열렸다" /
"모두가 같은 판, 같은 적. 오늘의 기록을 남겨라.", en "Today's seed is live" / "Same run, same enemies for everyone.
Set today's record." `make push-test PUSH_TOPIC=<topic> [PUSH_LANG=ko|en]` sends one such message with your gcloud
credentials; use a private test topic, since `daily-ko` / `daily-en` reach every player.

## Make targets

| Target | Who | What |
| --- | --- | --- |
| `make firebase-web` | done 2026-10-11 | Registers the Firebase web app "MythOS (Web)" (idempotent) and writes `.firebase/web-config.json` (mode 600, never printed). |
| `make firebase-sha` | done 2026-10-11 | Registers this Mac's debug keystore SHA-1 on `com.projectmythos.signalrun`. Re-run on another dev machine; release/upload keys later via `KEYSTORE=… KEY_ALIAS=… STOREPASS_FILE=…`. |
| `make firebase-auth-domains` | owner | Adds the Cloud Run hosts (`mythos-api` URLs + `v2-preview---` preview hosts; `EXTRA_DOMAINS=` for more) to Firebase Auth authorized domains. |
| `make push-schedule` | owner | Creates/updates the two scheduler jobs (`DRY_RUN=1` prints the commands; `PUSH_CRON`, `PUSH_TZ`, `PUSH_SA`). Never grants IAM; prints the grant if needed. |
| `make push-test` | anyone with FCM access | One test message to a topic. |
| `make deploy` / `deploy-preview` | owner | Also set `MYTHOS_AUTH=google`, `MYTHOS_FIREBASE_PROJECT`, `MYTHOS_FIREBASE_WEB_CONFIG` (from `.firebase/web-config.json`; fails if missing). |

## Owner checklist (in order)

Done 2026-10-11 (lead agent, owner-approved): steps 1–6 — deployed (rev `00091`, promoted with `--to-latest`), `mythos-push@` created with the FCM role only, scheduler jobs live (a manual run got HTTP 200 from FCM). Steps 1–3 — Google provider enabled (public name "MythOS"), Cloud Run
hosts authorized, `google-services.json` refreshed; a real web sign-in on `localhost:8010` stored a save under a
`g_` id, and the Android build opens the native Google sign-in sheet.

1. Firebase console → Authentication → **Get started** → Sign-in method → **Google** → Enable (pick the support
   email) → Save. Until then sign-in cannot work and `make firebase-auth-domains` stops with
   CONFIGURATION_NOT_FOUND.
2. `make firebase-auth-domains`: authorizes the Cloud Run hosts for web sign-in.
3. `make android-firebase` again (the client side's script, `scripts/android/fetch-firebase-config.sh`): with Google
   enabled and the SHA-1 registered, `google-services.json` now carries the OAuth client Android sign-in needs.
   Rebuild the APK.
4. Deploy: `make deploy-preview`, check the `v2-preview---` URL (sign in, finish a daily, see the board), then promote
   with `gcloud run services update-traffic mythos-api --to-tags v2-preview=100 --region us-central1 --project <PROJECT_ID>`.
   From here every save, GM call and leaderboard write needs Google sign-in.
5. Push sender account (least privilege — the default compute account also runs Cloud Run, so give FCM rights to
   a push-only account instead):
   `gcloud iam service-accounts create mythos-push --display-name "Mythos daily push" --project <PROJECT_ID>`
   `gcloud projects add-iam-policy-binding <PROJECT_ID> --member=serviceAccount:mythos-push@<PROJECT_ID>.iam.gserviceaccount.com --role=roles/firebasecloudmessaging.admin --condition=None`
6. `PUSH_SA=mythos-push@<PROJECT_ID>.iam.gserviceaccount.com make push-schedule` (preview first with `DRY_RUN=1`).
   `gcloud scheduler jobs run mythos-daily-push-ko --location us-central1 --project <PROJECT_ID>` fires one for real
   (every `daily-ko` subscriber gets it).

Local: `make api` stays `open`; `/api/v2/config` already serves the web config from `.firebase/web-config.json`, so
web sign-in can be tried locally once step 1 is done (`localhost` is authorized by default).

## Play Games Services (later)

Needs a Google Play Console developer account. Then: create the game in Play Console → Play Games Services, link
the Android app (same package + SHA-1s), create one leaderboard per archetype, note the game id and leaderboard
ids, and mirror each improved daily submit there from the client (Play Games SDK, after a successful
`PUT /daily/{date}` with `improved: true`). A Play Games score is one int64, higher = better: the packed
`DailyResult.score` (`src/mythos_v2/daily.py`) fits as is. Play Games' own "daily" time span resets on US Pacific
time, not KST, so our server stays the source of truth for the per-KST-day board; Play Games adds the platform's
friends lists and achievements.
