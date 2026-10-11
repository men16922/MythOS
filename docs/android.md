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
- The game engine is client-side TypeScript, so a run plays fully offline. Only saves/sync and the AI GM
  (narrate / improvise / talk) go to `/api/v2`, and all of them fall back when the API is unreachable: saves keep a
  localStorage mirror and sync on the next successful load, and the GM falls back to authored text.
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
| Invite code field (stores `mythos_invite`, the key is never displayed; saving reloads the game under the new identity) | `src/v2/ui/components/SettingsPanel.tsx`, `setInviteKey` in `src/v2/net/api.ts` |
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
# → src/mythos_ui/android/app/build/outputs/apk/debug/app-debug.apk (~124 MiB, mostly art/music)
```

- Without `google-services.json` the app still builds and runs, but without Firebase (Gradle prints a warning).
- `VERSION_CODE` / `VERSION_NAME` are passed to Gradle as `-PversionCode` / `-PversionName` (defaults: 1 / 2.0.0).
- `scripts/android/build-web.sh` runs the web half only (`dist-app` + `cap sync`) when you open the project in
  Android Studio instead.
- Regenerate the icons and splash after a logo change: `.venv/bin/python scripts/android/make_icons.py`.

Firebase auth for the scripts: run `firebase login`, or use Application Default Credentials for an account with
access to the project (`gcloud auth application-default login`). `env.sh` sets `GOOGLE_CLOUD_QUOTA_PROJECT` to the
project, which the App Distribution API needs when it is called with ADC.

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
   gameplay saves and the AI GM text through the API) and a content rating.
5. **Size.** The AAB base module must stay under Play's 200 MB compressed download limit. Today it is about 125 MB
   (art and music are already webp/m4a). If it grows, move the art into a Play Asset Delivery install-time pack.

## Prerequisites outside this repo

- **Production CORS.** The Cloud Run API must allow the app origin `https://localhost` (`MYTHOS_CORS_ORIGINS`,
  `src/mythos_api/app.py`). Until that deploy, the Cloud Run build plays offline only: saves stay on the device and the GM uses
  authored text.
- **Invite code.** Players type it in Settings. Without one the production API rejects saves and GM calls, and the game
  plays offline.
