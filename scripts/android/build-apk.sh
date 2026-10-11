#!/usr/bin/env bash
# Debug APK of the Android app: build-web.sh + `./gradlew assembleDebug`.
#   scripts/android/build-apk.sh                    # API = Cloud Run
#   VITE_API_BASE=http://10.0.2.2:8010 scripts/android/build-apk.sh   # emulator → local `make api`
# Optional: VERSION_CODE / VERSION_NAME (default 1 / 2.0.0). Release (signed AAB) steps: docs/android.md.
# Without android/app/google-services.json (scripts/android/fetch-firebase-config.sh) the APK builds without
# Firebase/Crashlytics.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

"$ROOT/scripts/android/build-web.sh"

cd "$ANDROID_DIR"
[[ -f local.properties ]] || echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew --console=plain assembleDebug -PversionCode="${VERSION_CODE:-1}" -PversionName="${VERSION_NAME:-2.0.0}"

APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
echo "APK: $APK ($(du -h "$APK" | cut -f1))"
