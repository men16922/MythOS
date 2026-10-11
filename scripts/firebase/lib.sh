# shellcheck shell=bash
# Shared helpers for scripts/firebase/*.sh (sourced, not executed). bash 3.2-compatible (macOS /bin/bash).
#
# - Reads only the PROJECT_ID line of the repo .env (nothing else).
# - Access tokens come from `gcloud auth print-access-token`, live only in a shell variable and reach curl
#   through a process-substitution header file (`-H @<(...)`): never argv, never stdout, never a log.
# - Responses land in a private temp dir that is removed on exit; callers print only what is safe.

FB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FB_PACKAGE_ID="${FB_PACKAGE_ID:-com.projectmythos.signalrun}"
FB_REGION="${REGION:-us-central1}"
FB_SERVICE="${SERVICE:-mythos-api}"
FIREBASE_API="https://firebase.googleapis.com/v1beta1"

if [[ -z "${PROJECT_ID:-}" && -f "$FB_ROOT/.env" ]]; then
  PROJECT_ID="$(grep -E '^PROJECT_ID=' "$FB_ROOT/.env" | head -1 | cut -d= -f2- | tr -d "\"' ")"
fi

fb_require_project() {
  if [[ -z "${PROJECT_ID:-}" ]]; then
    echo "PROJECT_ID is not set (export it or add the PROJECT_ID line to .env)" >&2
    exit 1
  fi
}

# A private scratch dir for request/response bodies; removed when the script exits. Created at source time
# (bottom of this file) so `$(fb_api ...)` subshells write into the parent's dir.
fb_tmpdir() {
  if [[ -z "${FB_TMP:-}" ]]; then
    FB_TMP="$(mktemp -d)"
    chmod 700 "$FB_TMP"
    # shellcheck disable=SC2064
    trap "rm -rf '$FB_TMP'" EXIT
  fi
}

# fb_api METHOD URL [BODY_FILE] → prints the HTTP status; the response body is in "$FB_TMP/response.json".
fb_api() {
  local method="$1" url="$2" body="${3:-}" token
  fb_tmpdir
  if ! token="$(gcloud auth print-access-token 2>/dev/null)" || [[ -z "$token" ]]; then
    echo "gcloud has no usable credentials — run 'gcloud auth login' first" >&2
    return 1
  fi
  local -a args=(-sS -o "$FB_TMP/response.json" -w '%{http_code}' -X "$method"
    -H "Content-Type: application/json" -H "x-goog-user-project: $PROJECT_ID")
  if [[ -n "$body" ]]; then
    args+=(--data-binary "@$body")
  fi
  curl "${args[@]}" -H @<(printf 'Authorization: Bearer %s\n' "$token") "$url"
}

# fb_json EXPR [ARG...] → evaluates a Python expression over the last response (`d`, extra args in `a`);
# prints the result (strings raw, everything else as JSON; nothing for None).
fb_json() {
  local expr="$1"
  shift
  python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    d = {}
r = eval(sys.argv[2], {"d": d, "a": sys.argv[3:]})
if r is not None:
    print(r if isinstance(r, str) else json.dumps(r))
' "$FB_TMP/response.json" "$expr" "$@"
}

# A short, non-secret description of an API error response ("STATUS: message").
fb_error() {
  fb_json '(d.get("error") or {}).get("status", "") + ": " + (d.get("error") or {}).get("message", "")' 2>/dev/null || true
}

# push_message_json TOPIC LANG → the FCM v1 `messages:send` body for the daily notification (contract shape).
push_message_json() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

topic, lang = sys.argv[1], sys.argv[2]
texts = {
    "ko": ("오늘의 시드가 열렸다", "모두가 같은 판, 같은 적. 오늘의 기록을 남겨라."),
    "en": ("Today's seed is live", "Same run, same enemies for everyone. Set today's record."),
}
if lang not in texts:
    sys.exit(f"unknown language {lang!r} (ko|en)")
title, body = texts[lang]
message = {
    "message": {
        "topic": topic,
        "notification": {"title": title, "body": body},
        "data": {"open": "daily"},
        "android": {
            "ttl": "21600s",
            "collapse_key": "daily",
            "notification": {"channel_id": "daily", "icon": "ic_stat_mythos", "color": "#3ef0ff"},
        },
    }
}
print(json.dumps(message, ensure_ascii=False))
PY
}

# The FCM topic name rule (https://firebase.google.com/docs/cloud-messaging/send-message#send-messages-to-topics).
fb_valid_topic() {
  local re='^[a-zA-Z0-9_.~%-]+$' # length checked separately: macOS ERE caps {m,n} at 255
  [[ ${#1} -ge 1 && ${#1} -le 900 && "$1" =~ $re ]]
}

fb_tmpdir
