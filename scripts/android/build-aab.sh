#!/usr/bin/env bash
# Signed release bundle (AAB) for Play: build-web.sh (API = Cloud Run) + `./gradlew bundleRelease`.
#   VERSION_CODE=2 VERSION_NAME=2.0.1 scripts/android/build-aab.sh
# Needs the owner's upload key, described by android/keystore.properties (gitignored; docs/android.md "Release"),
# or KEYSTORE_PROPERTIES=<path>. VERSION_CODE is required: Play rejects a code it has already seen.
# Checks after the build: the bundle is signed by the configured upload key, and it is under Play's 200 MB limit.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

PROPS="${KEYSTORE_PROPERTIES:-$ANDROID_DIR/keystore.properties}"
[[ -f "$PROPS" ]] || { echo "No signing config at $PROPS — create the upload key first (docs/android.md, Release)." >&2; exit 1; }
[[ "${VERSION_CODE:-}" =~ ^[1-9][0-9]*$ ]] || { echo "Set VERSION_CODE (a positive integer, higher than the last Play upload)." >&2; exit 1; }
VERSION_NAME="${VERSION_NAME:-2.0.$VERSION_CODE}"
prop() { sed -n "s/^$1=//p" "$PROPS" | head -1; }
STORE="$(prop storeFile)"
ALIAS="$(prop keyAlias)"
[[ -f "$STORE" ]] || { echo "storeFile in $PROPS does not exist." >&2; exit 1; }
[[ -n "$ALIAS" ]] || { echo "keyAlias missing in $PROPS." >&2; exit 1; }

"$ROOT/scripts/android/build-web.sh"

cd "$ANDROID_DIR"
[[ -f local.properties ]] || echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew --console=plain bundleRelease -PversionCode="$VERSION_CODE" -PversionName="$VERSION_NAME" \
  -PkeystoreProperties="$PROPS"

AAB="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
[[ -f "$AAB" ]] || { echo "bundleRelease produced no $AAB" >&2; exit 1; }

# Signature: jarsigner must verify it and the signer must be the configured alias (passwords are never read here).
VERIFY="$("$JAVA_HOME/bin/jarsigner" -verify -verbose -certs "$AAB" 2>&1 || true)"
grep -q "jar verified" <<<"$VERIFY" || { echo "AAB signature does not verify:" >&2; tail -5 <<<"$VERIFY" >&2; exit 1; }
grep -q "jar is unsigned" <<<"$VERIFY" && { echo "AAB is unsigned." >&2; exit 1; }

BYTES="$(stat -f%z "$AAB" 2>/dev/null || stat -c%s "$AAB")"
LIMIT=$((200 * 1024 * 1024))
(( BYTES < LIMIT )) || { echo "AAB is $((BYTES / 1048576)) MB — over Play's 200 MB base-module limit (docs/android.md, Size)." >&2; exit 1; }

echo "AAB: $AAB ($((BYTES / 1048576)) MB, versionCode $VERSION_CODE, versionName $VERSION_NAME, signed, alias $ALIAS)"
