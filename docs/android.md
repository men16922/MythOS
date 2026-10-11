# Android app (Capacitor)

The Mythos 2.0 client (`src/mythos_ui/src/v2`) packaged as an Android app with Capacitor 8. iOS is not a target.

- **Package id:** `com.projectmythos.signalrun` (permanent once uploaded to Google Play; change it in
  `capacitor.config.ts`, `android/app/build.gradle` `namespace`/`applicationId`, the `MainActivity` package path
  and `scripts/android/env.sh` before the first upload).
- **Name:** 세계:접속 (ko) / MythOS (other locales). Launcher icon and splash come from
  `src/mythos_ui/src/assets/mythos-logo-concept.png` (`scripts/android/make_icons.py`).
- **Firebase project:** the GCP project in `.env` `PROJECT_ID`. Android app id `1:1004528040791:android:fac98c760cf605a75d1c12`.

## What is inside the APK

- The app build of the web client: `vite build --mode app` → `src/mythos_ui/dist-app/`. It has a relative base,
  boots from `src/v2/native/main.tsx` (Mythos 2.0 plus the native hooks, no dev sandbox router), and reads
  `VITE_API_BASE` for the API origin (default: the Cloud Run URL in `vite.config.ts`).
- All game art and music: `resources/neo-seoul/` is copied to `dist-app/resources/neo-seoul/` and loaded from the
  APK (`VITE_ASSET_BASE`, see `src/v2/ui/common/assets.ts`).
- The game engine is client-side TypeScript, so a run plays fully offline. Only saves/sync, the AI GM
  (narrate / improvise / talk) and the daily leaderboard go to `/api/v2`, and all of them fall back when the API is
  unreachable: saves keep a localStorage mirror and sync on the next successful load, the GM falls back to authored
  text, and a daily result waits in a queue until it can be posted.
- Google sign-in (Firebase Auth) turns on cloud saves, the AI GM and posting to the leaderboard. A signed-out player
  plays everything offline on the device; on the production API (`MYTHOS_AUTH=google`) the client then makes no
  save/GM requests at all.
- Exception: the UI fonts load from Google Fonts. Offline the game falls back to system fonts.

The web build (`make frontend-build` → `src/mythos_api/static`) does not change. It keeps same-origin `/api` and
`/resources`, and no Capacitor code reaches it.

## Native behaviour

| Feature | Where |
| --- | --- |
| Hardware/gesture back: closes the top modal, disarms an armed card, skips the prologue, opens the pause menu in a run, follows the screen's back button in archive/setup, and minimises the app at the title (it never exits) | `src/v2/native/backButton.ts` |
| Immersive fullscreen (swipe from an edge to see the bars for a moment) and keep-screen-on while in the foreground | `android/app/src/main/java/.../MainActivity.java` |
| Music suspends when the app goes to the background; pending saves are pushed | `src/v2/native/init.ts` |
| Both orientations (the combat screen has phone portrait and landscape layouts) | default manifest |
| Google sign-in (native account picker, then the native Firebase SDK holds the session and issues ID tokens). Title chip + Settings account section; sign-in adopts the account's cloud save (else uploads this device's), sign-out keeps local progress | `src/v2/native/authNative.ts`, `src/v2/net/auth.ts`, `src/v2/ui/components/AccountControl.tsx` |
| "오늘의 시드 알림" (Settings, app build only, default off): FCM topic `daily-ko` / `daily-en`, channel `daily`; a tap opens the title with today's leaderboard | `src/v2/native/push.ts` |
| Crashlytics: native crashes plus JS errors (window errors, unhandled rejections, React errors) as non-fatals, at most 20 per launch, with no player data. Players can turn it off in Settings ("오류 보고 보내기", app build only) | `src/v2/native/crash.ts` |

## Toolchain (macOS, one time)

```bash
brew install --cask android-commandlinetools          # SDK root: /opt/homebrew/share/android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools   # per shell / script, never in ~/.zshrc
yes | sdkmanager --licenses                            # or accept only android-sdk-license (+ android-sdk-arm-dbt-license for the arm64 emulator image)
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "build-tools;35.0.0" \
           "emulator" "system-images;android-36;google_apis;arm64-v8a"
```

You also need JDK 21 (`brew install openjdk@21`). `scripts/android/env.sh` sets `ANDROID_HOME`, `JAVA_HOME` and
`PATH` for every script, so no shell profile edits are needed. Capacitor 8.5 targets `compileSdk`/`targetSdk` 36
and `minSdk` 24 (`android/variables.gradle`).

## Build (debug)

```bash
scripts/android/fetch-firebase-config.sh   # once per machine: registers the app if needed, writes android/app/google-services.json (gitignored)
scripts/android/build-apk.sh               # web build + copy resources + cap sync + ./gradlew assembleDebug
# → src/mythos_ui/android/app/build/outputs/apk/debug/app-debug.apk (~127 MiB, mostly art/music)
```

- Without `google-services.json` the app still builds and runs, but without Firebase (Gradle prints a warning), and
  `cap sync` leaves the sign-in and push plugins out (`capacitor.config.ts`: Firebase Auth's native SDK would abort
  the app at start without a Firebase config).
- `build-web.sh` prints `native Google sign-in: on|off`. It is on only when `google-services.json` carries a Google
  web OAuth client (see [Google sign-in](#google-sign-in)); while it is off the app answers a sign-in tap with
  "Google 로그인은 아직 열리지 않았다…" instead of calling the plugin.
- `VERSION_CODE` / `VERSION_NAME` are passed to Gradle as `-PversionCode` / `-PversionName` (defaults: 1 / 2.0.0).
- `scripts/android/build-web.sh` runs the web half only (`dist-app` + `cap sync`) when you open the project in
  Android Studio instead.
- Regenerate the icons, splash and the notification icon after a logo change:
  `.venv/bin/python scripts/android/make_icons.py` (`… make_icons.py stat` redraws only `ic_stat_mythos`, the white-on-
  transparent status-bar glyph in `drawable-*dpi/`).

Firebase auth for the scripts: run `firebase login`, or use Application Default Credentials for an account with
access to the project (`gcloud auth application-default login`). `env.sh` sets `GOOGLE_CLOUD_QUOTA_PROJECT` to the
project, which the App Distribution API needs when it is called with ADC.

## Google sign-in

Native Google sign-in uses `@capacitor-firebase/authentication` (Credential Manager account picker,
`skipNativeAuth: false`; `rgcfaIncludeGoogle = true` in `android/variables.gradle` bundles the Google SDKs). The
server verifies the Firebase ID token (`Authorization: Bearer`). Google sign-in only works for an APK whose signing
key's SHA-1 is registered on the Firebase Android app, and only once Google is enabled as a provider:

1. **Owner, once:** Firebase console → Authentication → *Get started*, then Sign-in method → Google → *Enable*
   (pick the support email). Until then every sign-in ends in the graceful "not open yet" line (web and app).
2. **SHA-1 per signing key.** The debug keystore of this build machine is registered (`make firebase-sha`). The
   release **upload key** and Play's **app signing key** (Play Console → App integrity) are owner items: add their
   SHA-1 (and SHA-256) to the Firebase Android app before testing a release build.
3. **Re-fetch the config** after step 1 (and after adding a SHA): `make android-firebase` writes a new
   `google-services.json` that now carries the Google web OAuth client; rebuild (`scripts/android/build-apk.sh`
   prints `native Google sign-in: on`).

A key that is not registered shows up as a "Developer console is not set up correctly" error, which the app also
reports as "not open yet". The web client signs in with a Google popup; the deployed origin must be an authorized
domain in Firebase Auth (`make firebase-auth-domains`, owner-run).

## Daily notification (push)

- **Topics, not tokens.** The server stores no device tokens: Cloud Scheduler sends one FCM message a day to the topic
  `daily-ko` / `daily-en` (default 19:00 KST; created and updated by the owner with `make push-schedule`).
- **Opt-in.** Settings → "오늘의 시드 알림" (default off). Turning it on asks for the notification permission
  (Android 13+), creates the channel `daily` ("오늘의 시드" / "Daily Signal", default importance, no vibration),
  subscribes `daily-<game language>` and unsubscribes the other. A language change moves the subscription; turning
  it off unsubscribes both. A denied permission leaves it off with a hint to allow it in system settings.
- **Message.** Title/body per language, `data.open = "daily"`, channel `daily`, small icon `ic_stat_mythos`, accent
  `#3ef0ff` (the manifest also sets these as FCM defaults). A tap (app in the background or not running) opens the
  title with today's leaderboard and the daily item flagged. A push that arrives while the game is open shows only a
  small toast.
- **Test send:** `make push-test PUSH_TOPIC=<topic> PUSH_LANG=ko` (`scripts/firebase/push-test.sh`, your gcloud
  credentials). `daily-ko` / `daily-en` reach every subscribed player, so once testers exist use a private topic.

## Emulator smoke test (headless, silent)

```bash
scripts/android/emulator.sh                                  # AVD mythos-api36 (pixel_7, API 36 arm64), -no-window -no-audio, serial emulator-5580
VITE_API_BASE=http://10.0.2.2:8010 scripts/android/build-apk.sh   # app → host's `make api` (debug-only cleartext to 10.0.2.2)
adb -s emulator-5580 install -r src/mythos_ui/android/app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5580 shell am start -n com.projectmythos.signalrun/.MainActivity
adb -s emulator-5580 exec-out screencap -p > outputs/shot.png
scripts/android/emulator.sh stop
```

- Debug builds are WebView-debuggable. Run `adb -s emulator-5580 forward tcp:9337 localabstract:webview_devtools_remote_$(adb -s emulator-5580 shell pidof com.projectmythos.signalrun)`, then open `chrome://inspect` or use CDP on `:9337`.
- To test offline, run `adb -s emulator-5580 shell cmd connectivity airplane-mode enable` (use `disable` to go back online).
- Push on the emulator (the `google_apis` image has Play services): turn the toggle on (accept the permission dialog),
  press Home, send one test message, check `adb -s emulator-5580 shell dumpsys notification --noredact | grep -A30
  signalrun` (channel `daily`, title "오늘의 시드가 열렸다"), then tap it from the shade
  (`adb -s emulator-5580 shell cmd statusbar expand-notifications`): the app opens on today's leaderboard. Turn the
  toggle off afterwards so the emulator does not stay subscribed.
- Point the app at a private local API with `VITE_API_BASE=http://10.0.2.2:<port>`; never stop the owner's servers to
  free a port (`make api` kills every running `mythos_api`).
- An `http://` `VITE_API_BASE` also turns on WebView mixed content (`capacitor.config.ts`), because the app page is
  `https://localhost`. Release builds must use the https Cloud Run URL.

## Firebase App Distribution

```bash
scripts/android/distribute.sh                # uploads the debug APK as a new release; adds NO testers, sends NO invites
```

Testers are added later by the owner, in the Firebase console (App Distribution → Testers & Groups) or with
`firebase appdistribution:distribute <apk> --app <id> --groups <alias>` / `appdistribution:testers:add`.

## Release (AAB + signing): owner steps

No signing key exists in the repo or on the build machine. These steps are the owner's call.

1. **Upload key** (keep it and its passwords outside the repo, and back them up):
   ```bash
   keytool -genkeypair -v -keystore ~/keys/mythos-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
2. **Signing config.** Create `src/mythos_ui/android/keystore.properties` (gitignored, like `*.jks`/`*.keystore`):
   ```properties
   storeFile=/Users/<you>/keys/mythos-upload.jks
   storePassword=…
   keyAlias=upload
   keyPassword=…
   ```
   and add to `android/app/build.gradle`:
   ```gradle
   def ksFile = rootProject.file('keystore.properties')
   def ks = new Properties(); if (ksFile.exists()) ks.load(new FileInputStream(ksFile))
   android {
       signingConfigs { release { if (ksFile.exists()) { storeFile file(ks.storeFile); storePassword ks.storePassword; keyAlias ks.keyAlias; keyPassword ks.keyPassword } } }
       buildTypes { release { signingConfig signingConfigs.release } }
   }
   ```
3. **Build the bundle** against the production API (https):
   ```bash
   scripts/android/build-web.sh
   (cd src/mythos_ui/android && ./gradlew bundleRelease -PversionCode=<N> -PversionName=2.0.<x>)
   # → android/app/build/outputs/bundle/release/app-release.aab
   ```
   `versionCode` must go up with every Play upload.
4. **Play Console** (owner account, one-time US$25 registration): create the app with the package id above, turn on
   **Play App Signing** (Google holds the app signing key and your keystore is only the upload key), then upload the AAB to
   Internal testing first. Play needs a privacy policy URL, the Data safety form (crash data through Crashlytics,
   the Google account (Firebase Auth: account id, email, name), gameplay saves, the AI GM text and the daily
   leaderboard name through the API, and the FCM topic subscription) and a content rating. Register the upload and
   app-signing keys' SHA-1 for Google sign-in first (see [Google sign-in](#google-sign-in)).
5. **Size.** The AAB base module must stay under Play's 200 MB compressed download limit. Today it is about 125 MB
   (art and music are already webp/m4a). If it grows, move the art into a Play Asset Delivery install-time pack.

## Prerequisites outside this repo

- **Production CORS.** The Cloud Run API must allow the app origin `https://localhost` (`MYTHOS_CORS_ORIGINS`,
  `src/mythos_api/app.py`). Until that deploy, the Cloud Run build plays offline only: saves stay on the device and the GM uses
  authored text.
- **Sign-in on the server.** Production runs `MYTHOS_AUTH=google`: saves, the GM and leaderboard posts need a signed-in
  player, and a signed-out client does not even try (it plays offline with authored lines). Invite codes are gone.
- **Firebase Auth enabled** (owner, see [Google sign-in](#google-sign-in)) and the daily push schedule created
  (`make push-schedule`, owner).
