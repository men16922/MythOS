#!/usr/bin/env bash
# Send ONE daily notification (the exact message the scheduled jobs send) to an FCM topic, with the caller's
# gcloud credentials: scripts/firebase/push-test.sh <topic> [ko|en]   (language defaults from a -ko/-en suffix,
# else ko). For emulator verification, subscribe the test device to a private topic and send to that, not to
# daily-ko/daily-en (those reach every player). The token goes only into a request header, never printed.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
fb_require_project

TOPIC="${1:-}"
[[ -n "$TOPIC" ]] || { echo "usage: $0 <topic> [ko|en]" >&2; exit 2; }
fb_valid_topic "$TOPIC" || { echo "invalid FCM topic name: $TOPIC" >&2; exit 2; }
LANG_CODE="${2:-}"
if [[ -z "$LANG_CODE" ]]; then
  case "$TOPIC" in *-en) LANG_CODE=en ;; *) LANG_CODE=ko ;; esac
fi
[[ "$LANG_CODE" == "ko" || "$LANG_CODE" == "en" ]] || { echo "language must be ko or en" >&2; exit 2; }

push_message_json "$TOPIC" "$LANG_CODE" >"$FB_TMP/message.json"
status="$(fb_api POST "https://fcm.googleapis.com/v1/projects/$PROJECT_ID/messages:send" "$FB_TMP/message.json")"
if [[ "$status" != "200" ]]; then
  echo "FCM send failed (HTTP $status) — $(fb_error)" >&2
  exit 1
fi
echo "Sent the $LANG_CODE daily notification to topic '$TOPIC' ($(fb_json "d.get('name', '')"))."
