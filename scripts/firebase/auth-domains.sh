#!/usr/bin/env bash
# OWNER-RUN. Add the Cloud Run host(s) of mythos-api to Firebase Auth's authorized domains (idempotent), so
# web Google sign-in works on the deployed game: the service URL(s), every traffic-tag URL, and the preview
# tag host (`<PREVIEW_TAG>---<host>`, default tag v2) even before that tag exists. EXTRA_DOMAINS (comma-
# separated) adds more, e.g. a custom domain. Uses the Identity Toolkit admin v2 config API.
# Needs Firebase Authentication initialised first (console → Authentication → Get started); before that the
# API answers CONFIGURATION_NOT_FOUND and this script says so and changes nothing.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
fb_require_project

PREVIEW_TAG="${PREVIEW_TAG:-v2}"
CONFIG_URL="https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config"

status="$(fb_api GET "$CONFIG_URL")"
if [[ "$status" != "200" ]]; then
  err="$(fb_error)"
  if [[ "$status" == "404" || "$err" == *CONFIGURATION_NOT_FOUND* ]]; then
    cat >&2 <<EOF
Firebase Authentication is not initialised in $PROJECT_ID yet (CONFIGURATION_NOT_FOUND). Owner, once:
  1. https://console.firebase.google.com/project/$PROJECT_ID/authentication → "Get started"
  2. Sign-in method → Google → Enable → pick the support email → Save
Then run make firebase-auth-domains again. Nothing was changed.
EOF
    exit 2
  fi
  if [[ "$err" == *SERVICE_DISABLED* || "$err" == *"has not been used"* ]]; then
    echo "The Identity Toolkit API is not enabled in $PROJECT_ID — the console's Authentication → Get started enables it." >&2
    exit 2
  fi
  echo "Reading the Firebase Auth config failed (HTTP $status) — $err" >&2
  exit 1
fi
cp "$FB_TMP/response.json" "$FB_TMP/auth-config.json"

if ! gcloud run services describe "$FB_SERVICE" --region "$FB_REGION" --project "$PROJECT_ID" --format=json \
  >"$FB_TMP/service.json" 2>"$FB_TMP/describe.err"; then
  echo "Could not describe Cloud Run service $FB_SERVICE in $FB_REGION:" >&2
  sed -n '1,3p' "$FB_TMP/describe.err" >&2
  exit 1
fi

python3 - "$FB_TMP/service.json" "$FB_TMP/auth-config.json" "$PREVIEW_TAG" "${EXTRA_DOMAINS:-}" \
  >"$FB_TMP/patch.json" 2>"$FB_TMP/added.txt" <<'PY'
import json
import sys
from urllib.parse import urlparse

service = json.load(open(sys.argv[1]))
config = json.load(open(sys.argv[2]))
tag = sys.argv[3].strip()
extra = [d.strip() for d in sys.argv[4].split(",") if d.strip()]


def host(url):
    return (urlparse(url).hostname or "").lower() if url else ""


status = service.get("status") or {}
annotations = (service.get("metadata") or {}).get("annotations") or {}
urls = [status.get("url", "")]
try:
    urls += json.loads(annotations.get("run.googleapis.com/urls", "[]"))
except ValueError:
    pass
bases = [h for h in dict.fromkeys(host(u) for u in urls) if h]
tagged = [host(t.get("url", "")) for t in status.get("traffic") or [] if t.get("url")]
if tag:
    tagged += [f"{tag}---{h}" for h in bases if "---" not in h]
wanted = [d for d in dict.fromkeys(bases + tagged + [e.lower() for e in extra]) if d]

current = list(config.get("authorizedDomains") or [])
added = [d for d in wanted if d not in current]
for d in added:
    print(d, file=sys.stderr)
json.dump({"authorizedDomains": current + added}, sys.stdout)
PY

if [[ ! -s "$FB_TMP/added.txt" ]]; then
  echo "Firebase Auth authorized domains already include every $FB_SERVICE host."
  exit 0
fi
status="$(fb_api PATCH "$CONFIG_URL?updateMask=authorizedDomains" "$FB_TMP/patch.json")"
[[ "$status" == "200" ]] || { echo "Updating the authorized domains failed (HTTP $status) — $(fb_error)" >&2; exit 1; }
echo "Added to Firebase Auth authorized domains:"
sed 's/^/  /' "$FB_TMP/added.txt"
