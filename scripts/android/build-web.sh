#!/usr/bin/env bash
# Build the Mythos 2.0 app bundle and sync it into the Capacitor Android project.
#   1. type-check + `vite build --mode app` → src/mythos_ui/dist-app/ (relative base, own entry, API = VITE_API_BASE)
#   2. copy resources/neo-seoul/ → dist-app/resources/neo-seoul/ (game art + music ship inside the APK)
#   3. `cap sync android` (web assets + capacitor.config + plugins → android/)
# Env: VITE_API_BASE (default: the Cloud Run API; emulator vs a local `make api`: http://10.0.2.2:8010).
# Native Google sign-in is switched on (VITE_NATIVE_GOOGLE_SIGNIN=1) only when android/app/google-services.json has a
# Google web OAuth client, i.e. the Google provider is enabled in the Firebase console and the json was fetched after
# that (`make android-firebase`); otherwise the app says sign-in is not open yet. Without the json at all, `cap sync`
# also leaves the sign-in and push plugins out (capacitor.config.ts).
# The web build (`make frontend-build` → src/mythos_api/static) is untouched by this.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

cd "$UI"
[[ -d node_modules ]] || npm ci
npx tsc -b

SERVICES="$ANDROID_DIR/app/google-services.json"
if [[ -z "${VITE_NATIVE_GOOGLE_SIGNIN:-}" ]]; then
  VITE_NATIVE_GOOGLE_SIGNIN=0
  if [[ -f "$SERVICES" ]] && python3 -c '
import json, sys
cfg = json.load(open(sys.argv[1]))
ok = any(o.get("client_type") == 3 for c in cfg.get("client", []) for o in c.get("oauth_client", []))
sys.exit(0 if ok else 1)
' "$SERVICES"; then
    VITE_NATIVE_GOOGLE_SIGNIN=1
  fi
fi
export VITE_NATIVE_GOOGLE_SIGNIN
echo "native Google sign-in: $([[ "$VITE_NATIVE_GOOGLE_SIGNIN" == 1 ]] && echo on || echo "off (no Google web client in google-services.json yet)")"
npx vite build --mode app

mkdir -p dist-app/resources
rsync -a --delete --exclude '.DS_Store' "$ROOT/resources/neo-seoul/" dist-app/resources/neo-seoul/

npx cap sync android
echo "dist-app: $(du -sh dist-app | cut -f1) (resources/neo-seoul: $(du -sh dist-app/resources/neo-seoul | cut -f1)); API base: ${VITE_API_BASE:-default (Cloud Run)}"
