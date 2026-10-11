# Progress log — archived 2026-10-11

Moved out of docs/PROGRESS_LOG.md by the doc budget (oldest entries first): Firebase sign-in, daily leaderboard, Android app, 1.x archive.

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
