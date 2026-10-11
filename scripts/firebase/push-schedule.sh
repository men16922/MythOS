#!/usr/bin/env bash
# OWNER-RUN. Create or update the two Cloud Scheduler HTTP jobs that post the daily "today's seed is open"
# notification straight to the FCM v1 API (topics daily-ko and daily-en; no device tokens are stored anywhere).
# Each job authenticates as a service account with an OAuth token Cloud Scheduler mints itself.
#   PUSH_CRON  cron schedule            (default "0 19 * * *")
#   PUSH_TZ    schedule time zone       (default Asia/Seoul)
#   PUSH_SA    service account email    (default <project-number>-compute@developer.gserviceaccount.com)
#   REGION     Cloud Scheduler location (default us-central1)
#   DRY_RUN=1  print the gcloud commands (and the message bodies) instead of running them
# Never grants IAM roles: when the service account looks unable to send FCM messages it prints the exact
# `gcloud projects add-iam-policy-binding` command for the owner.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
fb_require_project

DRY_RUN="${DRY_RUN:-0}"
PUSH_CRON="${PUSH_CRON:-0 19 * * *}"
PUSH_TZ="${PUSH_TZ:-Asia/Seoul}"
JOB_PREFIX="${PUSH_JOB_PREFIX:-mythos-daily-push}"
FCM_URI="https://fcm.googleapis.com/v1/projects/$PROJECT_ID/messages:send"
FCM_SCOPE="https://www.googleapis.com/auth/firebase.messaging"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || true)"
if [[ -z "${PUSH_SA:-}" ]]; then
  if [[ -z "$PROJECT_NUMBER" ]]; then
    [[ "$DRY_RUN" == "1" ]] || { echo "Could not read the project number; set PUSH_SA." >&2; exit 1; }
    PROJECT_NUMBER="PROJECT_NUMBER"
  fi
  PUSH_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
fi

[[ "$DRY_RUN" == "1" ]] && echo "# DRY RUN — nothing is created; the commands that would run:"

# APIs: Cloud Scheduler (the jobs) and FCM (what they call).
for api in cloudscheduler.googleapis.com fcm.googleapis.com; do
  enabled="$(gcloud services list --enabled --project "$PROJECT_ID" --filter="config.name=$api" \
    --format='value(config.name)' 2>/dev/null || true)"
  if [[ "$enabled" != "$api" ]]; then
    run gcloud services enable "$api" --project "$PROJECT_ID"
  fi
done

for lang in ko en; do
  job="$JOB_PREFIX-$lang"
  body="$FB_TMP/daily-$lang.json"
  push_message_json "daily-$lang" "$lang" >"$body"
  common=(--location "$FB_REGION" --project "$PROJECT_ID" --schedule "$PUSH_CRON" --time-zone "$PUSH_TZ"
    --uri "$FCM_URI" --http-method POST --message-body-from-file "$body"
    --oauth-service-account-email "$PUSH_SA" --oauth-token-scope "$FCM_SCOPE"
    --attempt-deadline 60s --max-retry-attempts 2
    --description "Mythos 2.0: daily seed notification (topic daily-$lang)")
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "# message body for $job: $(cat "$body")"
  fi
  if gcloud scheduler jobs describe "$job" --location "$FB_REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run gcloud scheduler jobs update http "$job" "${common[@]}" --update-headers Content-Type=application/json
  else
    run gcloud scheduler jobs create http "$job" "${common[@]}" --headers Content-Type=application/json
  fi
done

# FCM send permission (cloudmessaging.messages.create) for the job's service account. Read-only check.
roles="$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten='bindings[].members' \
  --filter="bindings.members:serviceAccount:$PUSH_SA" --format='value(bindings.role)' 2>/dev/null || true)"
grant="gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$PUSH_SA --role=roles/firebasecloudmessaging.admin --condition=None"
if grep -qxE 'roles/(owner|firebase\.admin|firebasecloudmessaging\.admin)' <<<"$roles"; then
  :
elif grep -qx 'roles/editor' <<<"$roles"; then
  echo "Note: $PUSH_SA sends with roles/editor. If a job run fails with 403, owner, run:"
  echo "  $grant"
else
  echo "$PUSH_SA has no role that can send FCM messages. Owner, run once:"
  echo "  $grant"
fi

if [[ "$DRY_RUN" != "1" ]]; then
  echo "Scheduled $JOB_PREFIX-ko and $JOB_PREFIX-en: '$PUSH_CRON' ($PUSH_TZ) as $PUSH_SA."
  echo "Fire one now (sends to every subscriber of that topic):"
  echo "  gcloud scheduler jobs run $JOB_PREFIX-ko --location $FB_REGION --project $PROJECT_ID"
fi
