#!/usr/bin/env bash
# Register the Android app in the project's Firebase (once; idempotent) and write its google-services.json into
# src/mythos_ui/android/app/ (gitignored: never commit it). Needs Firebase on the GCP project
# (`firebase projects:addfirebase "$PROJECT_ID"`, already done 2026-10-11).
# Auth: `firebase login`, or Application Default Credentials for an account with access to the project
# (`gcloud auth application-default login`). Prints only the app id and the output path.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

: "${PROJECT_ID:?PROJECT_ID is not set (export it or add the PROJECT_ID line to .env)}"
OUT="${1:-$ANDROID_DIR/app/google-services.json}"
APP_NAME="${FIREBASE_APP_NAME:-MythOS (Android)}"

find_app() {
  firebase_cli apps:list ANDROID --project "$PROJECT_ID" --json 2>/dev/null |
    python3 -c '
import json, sys
raw = sys.stdin.read()
data = json.loads(raw[raw.index("{"):])
for app in data.get("result") or []:
    if app.get("packageName") == sys.argv[1] or app.get("namespace") == sys.argv[1]:
        print(app["appId"])
        break
' "$PACKAGE_ID"
}

APP_ID="$(find_app || true)"
if [[ -z "$APP_ID" ]]; then
  echo "Registering Firebase Android app ${PACKAGE_ID} in ${PROJECT_ID}..." >&2
  firebase_cli apps:create ANDROID "$APP_NAME" --package-name "$PACKAGE_ID" --project "$PROJECT_ID" >/dev/null
  APP_ID="$(find_app)"
fi
[[ -n "$APP_ID" ]] || { echo "Could not find or create the Firebase Android app." >&2; exit 1; }

mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
firebase_cli apps:sdkconfig ANDROID "$APP_ID" --project "$PROJECT_ID" --out "$TMP" >/dev/null 2>&1 ||
  firebase_cli apps:sdkconfig ANDROID "$APP_ID" --project "$PROJECT_ID" >"$TMP"
python3 -c '
import json, sys
cfg = json.load(open(sys.argv[1]))
assert any(c["client_info"]["android_client_info"]["package_name"] == sys.argv[2] for c in cfg["client"]), "package mismatch"
' "$TMP" "$PACKAGE_ID"
mv "$TMP" "$OUT"
trap - EXIT
echo "Firebase Android app: $APP_ID"
echo "Wrote $OUT (gitignored)"
