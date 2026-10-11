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

`DailyResult` = `{archetype /^[a-z_]{1,32}$/, won: bool, act 1..3, floors 0..80, echoes 0..999, kills 0..999,
secs?: 1..86400}`; strict JSON types (no `"2"`, `true` or `2.0` for an int); unknown keys ignored; violations → 422.
Submit date: today or yesterday in KST; read date: today and the 29 days before (KST); else 422 with a string
`detail`. `limit` 1..50 (default 20). Names: NFC, control/format characters dropped, whitespace collapsed, at most
16 characters, empty → `익명` (over 200 raw characters → 422). Writes are limited per player
(`MYTHOS_V2_DAILY_PER_MINUTE`, default 10/min) → 429.

## Leaderboard ordering and trust

One row per (date, archetype, player) keeps that player's best. Better first: won, act, floors, echoes, kills
(higher first), secs (lower first; missing = worst), then the result achieved first (`achieved_at`), then player id
so the order is total. This is exactly `engine/daily.ts` `isBetterDaily` (a test checks the server's packed `score`
against a port of it). A worse or equal resubmit keeps the stored best and its time but updates the name;
`improved` says whether the best changed. Ranks come from one index (`day, archetype, score DESC, achieved_at,
player_id`); table `v2_daily_scores` (`migrations/010_v2_daily_scores.sql`, mirrored in
`store.SCHEMA_STATEMENTS`).

Trust model: results are client-reported. The server checks only types and ranges, identity and rate. It does not
replay runs, so a modified client can post a fake best; Google sign-in makes each entry attributable and
removable. Revisit (seed replay or Play Games Services) if the board matters competitively.

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
| `make firebase-auth-domains` | owner | Adds the Cloud Run hosts (`mythos-api` URLs + `v2---` preview hosts; `EXTRA_DOMAINS=` for more) to Firebase Auth authorized domains. |
| `make push-schedule` | owner | Creates/updates the two scheduler jobs (`DRY_RUN=1` prints the commands; `PUSH_CRON`, `PUSH_TZ`, `PUSH_SA`). Never grants IAM; prints the grant if needed. |
| `make push-test` | anyone with FCM access | One test message to a topic. |
| `make deploy` / `deploy-preview` | owner | Also set `MYTHOS_AUTH=google`, `MYTHOS_FIREBASE_PROJECT`, `MYTHOS_FIREBASE_WEB_CONFIG` (from `.firebase/web-config.json`; fails if missing). |

## Owner checklist (in order)

1. Firebase console → Authentication → **Get started** → Sign-in method → **Google** → Enable (pick the support
   email) → Save. Until then sign-in cannot work and `make firebase-auth-domains` stops with
   CONFIGURATION_NOT_FOUND.
2. `make firebase-auth-domains`: authorizes the Cloud Run hosts for web sign-in.
3. `make android-firebase` again (the client side's script, `scripts/android/fetch-firebase-config.sh`): with Google
   enabled and the SHA-1 registered, `google-services.json` now carries the OAuth client Android sign-in needs.
   Rebuild the APK.
4. Deploy: `make deploy-preview`, check the `v2---` URL (sign in, finish a daily, see the board), then promote
   with `gcloud run services update-traffic mythos-api --to-tags v2=100 --region us-central1 --project <PROJECT_ID>`.
   From here every save, GM call and leaderboard write needs Google sign-in.
5. `make push-schedule` (preview first with `DRY_RUN=1 make push-schedule`).
6. If `make push-schedule` printed it (the default compute service account has no FCM role as of 2026-10-11), run
   `gcloud projects add-iam-policy-binding <PROJECT_ID> --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com --role=roles/firebasecloudmessaging.admin --condition=None`.
   Then `gcloud scheduler jobs run mythos-daily-push-ko --location us-central1 --project <PROJECT_ID>` fires one
   for real (every `daily-ko` subscriber gets it).

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
