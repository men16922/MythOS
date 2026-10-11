#!/usr/bin/env bash
# Build the Mythos 2.0 app bundle and sync it into the Capacitor Android project.
#   1. type-check + `vite build --mode app` → src/mythos_ui/dist-app/ (relative base, own entry, API = VITE_API_BASE)
#   2. copy resources/neo-seoul/ → dist-app/resources/neo-seoul/ (game art + music ship inside the APK)
#   3. `cap sync android` (web assets + capacitor.config + plugins → android/)
# Env: VITE_API_BASE (default: the Cloud Run API; emulator vs a local `make api`: http://10.0.2.2:8010).
# The web build (`make frontend-build` → src/mythos_api/static) is untouched by this.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

cd "$UI"
[[ -d node_modules ]] || npm ci
npx tsc -b
npx vite build --mode app

mkdir -p dist-app/resources
rsync -a --delete --exclude '.DS_Store' "$ROOT/resources/neo-seoul/" dist-app/resources/neo-seoul/

npx cap sync android
echo "dist-app: $(du -sh dist-app | cut -f1) (resources/neo-seoul: $(du -sh dist-app/resources/neo-seoul | cut -f1)); API base: ${VITE_API_BASE:-default (Cloud Run)}"
