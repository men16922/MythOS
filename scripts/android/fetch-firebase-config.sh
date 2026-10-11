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

# The Firebase Management REST API with the gcloud token is the primary path (no npm; the npx firebase-tools path
# breaks when the npm cache is not writable). The firebase CLI stays as the fallback and for first registration.
api_get() {
  local token
  token="$(gcloud auth print-access-token 2>/dev/null)" || return 1
  curl -sf -H "Authorization: Bearer ${token}" -H "X-Goog-User-Project: ${PROJECT_ID}" \
    "https://firebase.googleapis.com/v1beta1/$1"
}

find_app() {
  { api_get "projects/${PROJECT_ID}/androidApps" ||
    firebase_cli apps:list ANDROID --project "$PROJECT_ID" --json 2>/dev/null; } |
    python3 -c '
import json, sys
raw = sys.stdin.read()
data = json.loads(raw[raw.index("{"):])
for app in data.get("apps") or data.get("result") or []:
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
# configFileContents is the base64 google-services.json; it is decoded straight into the temp file, never printed.
if ! api_get "projects/-/androidApps/${APP_ID}/config" |
  python3 -c 'import base64, json, sys; open(sys.argv[1], "wb").write(base64.b64decode(json.load(sys.stdin)["configFileContents"]))' "$TMP"; then
  firebase_cli apps:sdkconfig ANDROID "$APP_ID" --project "$PROJECT_ID" --out "$TMP" >/dev/null 2>&1 ||
    firebase_cli apps:sdkconfig ANDROID "$APP_ID" --project "$PROJECT_ID" >"$TMP"
fi
python3 -c '
import json, sys
cfg = json.load(open(sys.argv[1]))
assert any(c["client_info"]["android_client_info"]["package_name"] == sys.argv[2] for c in cfg["client"]), "package mismatch"
' "$TMP" "$PACKAGE_ID"
chmod 600 "$TMP"
mv "$TMP" "$OUT"
trap - EXIT
echo "Firebase Android app: $APP_ID"
echo "Wrote $OUT (gitignored)"
