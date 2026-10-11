#!/usr/bin/env bash
# Upload an APK to Firebase App Distribution as a new release. Upload only: this script never adds testers or
# groups and sends no invitations (the owner picks testers in the Firebase console or with
# `firebase appdistribution:testers:add` later).
#   scripts/android/distribute.sh [path/to.apk]     # default: the debug APK from build-apk.sh
# Env: RELEASE_NOTES (default: branch + commit). Auth as in fetch-firebase-config.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

: "${PROJECT_ID:?PROJECT_ID is not set (export it or add the PROJECT_ID line to .env)}"
APK="${1:-$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk}"
CONFIG="$ANDROID_DIR/app/google-services.json"
[[ -f "$APK" ]] || { echo "APK not found: $APK (run scripts/android/build-apk.sh)" >&2; exit 1; }
[[ -f "$CONFIG" ]] || { echo "Missing $CONFIG (run scripts/android/fetch-firebase-config.sh)" >&2; exit 1; }

APP_ID="$(python3 -c '
import json, sys
cfg = json.load(open(sys.argv[1]))
for c in cfg["client"]:
    if c["client_info"]["android_client_info"]["package_name"] == sys.argv[2]:
        print(c["client_info"]["mobilesdk_app_id"])
' "$CONFIG" "$PACKAGE_ID")"
[[ -n "$APP_ID" ]] || { echo "No Firebase app for $PACKAGE_ID in $CONFIG" >&2; exit 1; }

NOTES="${RELEASE_NOTES:-Mythos 2.0 Android debug build — $(git -C "$ROOT" rev-parse --abbrev-ref HEAD)@$(git -C "$ROOT" rev-parse --short HEAD)}"
echo "Uploading $(basename "$APK") ($(du -h "$APK" | cut -f1)) to App Distribution, app $APP_ID (no testers)"
firebase_cli appdistribution:distribute "$APK" --app "$APP_ID" --project "$PROJECT_ID" --release-notes "$NOTES"
