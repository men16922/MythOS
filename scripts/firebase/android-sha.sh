#!/usr/bin/env bash
# Register this machine's DEBUG keystore SHA-1 on the Firebase Android app com.projectmythos.signalrun
# (idempotent). Google sign-in on Android needs it: Firebase then mints the Android OAuth client, and the next
# `make android-firebase` writes it into google-services.json. A release/upload key is registered the same way
# later (KEYSTORE=... KEY_ALIAS=... STOREPASS_FILE=...), never from this repo.
# The debug keystore and its android/android password are the Android SDK's public defaults (not secrets).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
fb_require_project

KEYSTORE="${KEYSTORE:-$HOME/.android/debug.keystore}"
KEY_ALIAS="${KEY_ALIAS:-androiddebugkey}"
BASE="$FIREBASE_API/projects/$PROJECT_ID"

[[ -f "$KEYSTORE" ]] || { echo "No keystore at $KEYSTORE (build a debug APK once: make android-apk)." >&2; exit 1; }

KEYTOOL="$(command -v keytool || true)"
if [[ -z "$KEYTOOL" ]]; then
  for candidate in "${JAVA_HOME:-}/bin/keytool" "$(/usr/libexec/java_home 2>/dev/null || true)/bin/keytool" \
    /opt/homebrew/opt/openjdk@21/bin/keytool; do
    [[ -x "$candidate" ]] && { KEYTOOL="$candidate"; break; }
  done
fi
[[ -n "$KEYTOOL" ]] || { echo "keytool not found (install a JDK, e.g. brew install openjdk@21)." >&2; exit 1; }

if [[ -n "${STOREPASS_FILE:-}" ]]; then
  STOREPASS_ARGS=(-storepass:file "$STOREPASS_FILE")
else
  STOREPASS_ARGS=(-storepass android)
fi
SHA1="$("$KEYTOOL" -list -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" "${STOREPASS_ARGS[@]}" 2>/dev/null |
  awk '/SHA1:/ {print $2; exit}' | tr -d ':' | tr 'A-F' 'a-f')"
[[ "$SHA1" =~ ^[0-9a-f]{40}$ ]] || { echo "Could not read the SHA-1 of $KEY_ALIAS in $KEYSTORE." >&2; exit 1; }

status="$(fb_api GET "$BASE/androidApps?pageSize=100")"
[[ "$status" == "200" ]] || { echo "Listing Firebase Android apps failed (HTTP $status) — $(fb_error)" >&2; exit 1; }
APP_ID="$(fb_json "next((x['appId'] for x in d.get('apps', []) if x.get('packageName') == a[0]), None)" "$FB_PACKAGE_ID")"
[[ -n "$APP_ID" ]] || { echo "No Firebase Android app for $FB_PACKAGE_ID — run make android-firebase first." >&2; exit 1; }

status="$(fb_api GET "$BASE/androidApps/$APP_ID/sha")"
[[ "$status" == "200" ]] || { echo "Listing SHA certificates failed (HTTP $status) — $(fb_error)" >&2; exit 1; }
if [[ "$(fb_json "any(c.get('shaHash', '').lower() == a[0] for c in d.get('certificates', []))" "$SHA1")" == "true" ]]; then
  echo "SHA-1 $SHA1 ($KEY_ALIAS) is already registered on $FB_PACKAGE_ID."
  exit 0
fi

python3 -c 'import json, sys; print(json.dumps({"shaHash": sys.argv[1], "certType": "SHA_1"}))' "$SHA1" >"$FB_TMP/sha.json"
status="$(fb_api POST "$BASE/androidApps/$APP_ID/sha" "$FB_TMP/sha.json")"
[[ "$status" == "200" ]] || { echo "Registering the SHA-1 failed (HTTP $status) — $(fb_error)" >&2; exit 1; }
echo "Registered SHA-1 $SHA1 ($KEY_ALIAS) on $FB_PACKAGE_ID."
echo "Next: once Google sign-in is enabled in the Firebase console, re-run make android-firebase."
