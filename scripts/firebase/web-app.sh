#!/usr/bin/env bash
# Register the Firebase WEB app "MythOS (Web)" in the project's Firebase (once; idempotent) and write its SDK
# config to .firebase/web-config.json (gitignored, mode 600). The server serves it from GET /api/v2/config
# (locally from the file; on Cloud Run `make deploy` passes it as MYTHOS_FIREBASE_WEB_CONFIG).
# The web config is public by design (every web client ships it), but it is never printed or committed:
# this script prints only the app's display name and the output path.
# Auth: gcloud credentials with Firebase access to the project (`gcloud auth login`).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
fb_require_project

APP_NAME="${FIREBASE_WEB_APP_NAME:-MythOS (Web)}"
OUT="${1:-$FB_ROOT/.firebase/web-config.json}"
BASE="$FIREBASE_API/projects/$PROJECT_ID"

find_app() {
  local status
  status="$(fb_api GET "$BASE/webApps?pageSize=100")"
  if [[ "$status" != "200" ]]; then
    echo "Listing Firebase web apps failed (HTTP $status) — $(fb_error)" >&2
    return 1
  fi
  fb_json "next((x['appId'] for x in d.get('apps', []) if x.get('displayName') == a[0] and x.get('state', 'ACTIVE') == 'ACTIVE'), None)" "$APP_NAME"
}

APP_ID="$(find_app)"
if [[ -z "$APP_ID" ]]; then
  echo "Registering the Firebase web app \"$APP_NAME\" in $PROJECT_ID..." >&2
  python3 -c 'import json, sys; print(json.dumps({"displayName": sys.argv[1]}))' "$APP_NAME" >"$FB_TMP/create.json"
  status="$(fb_api POST "$BASE/webApps" "$FB_TMP/create.json")"
  if [[ "$status" != "200" ]]; then
    echo "Creating the web app failed (HTTP $status) — $(fb_error)" >&2
    exit 1
  fi
  OP="$(fb_json "d.get('name')")"
  for _ in $(seq 1 30); do
    [[ "$(fb_json "d.get('done', False)")" == "true" ]] && break
    sleep 2
    status="$(fb_api GET "$FIREBASE_API/$OP")"
    if [[ "$status" != "200" ]]; then
      echo "Polling the create operation failed (HTTP $status) — $(fb_error)" >&2
      exit 1
    fi
  done
  if [[ -n "$(fb_json "d.get('error')")" ]]; then
    echo "Creating the web app failed — $(fb_error)" >&2
    exit 1
  fi
  APP_ID="$(find_app)"
fi
[[ -n "$APP_ID" ]] || { echo "Could not find or create the Firebase web app." >&2; exit 1; }

status="$(fb_api GET "$BASE/webApps/$APP_ID/config")"
if [[ "$status" != "200" ]]; then
  echo "Fetching the web app config failed (HTTP $status) — $(fb_error)" >&2
  exit 1
fi
mkdir -p "$(dirname "$OUT")"
chmod 700 "$(dirname "$OUT")" 2>/dev/null || true
(
  umask 077
  python3 - "$FB_TMP/response.json" "$OUT" <<'PY'
import json
import sys

cfg = json.load(open(sys.argv[1]))
needed = ("apiKey", "authDomain", "projectId", "appId", "messagingSenderId")
missing = [k for k in needed if not cfg.get(k)]
if missing:
    sys.exit("web config lacks " + ", ".join(missing))
keep = {k: v for k, v in cfg.items() if isinstance(v, str) and v}
with open(sys.argv[2], "w", encoding="utf-8") as fh:
    json.dump(keep, fh, indent=2, sort_keys=True)
    fh.write("\n")
PY
)
chmod 600 "$OUT"
echo "Firebase web app: \"$APP_NAME\" (registered)"
echo "Wrote ${OUT#"$FB_ROOT"/} (gitignored, mode 600; contents not printed)"
