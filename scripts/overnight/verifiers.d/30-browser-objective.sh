#!/usr/bin/env bash
# Route browser-facing commits through the existing objective AGY QA hook.
set -euo pipefail

range="${1:-}"
[ -n "$range" ] || { echo "missing commit range"; exit 2; }
filter="${BROWSER_QA_FILTER:-scripts/overnight/browser-qa-filter.sh}"
runner="${BROWSER_QA_RUNNER:-scripts/overnight/browser-qa.sh}"
contract="${OVERNIGHT_CONTRACT_FILE:-}"
[ -x "$filter" ] && [ -x "$runner" ] || {
  echo "browser QA adapter unavailable"
  exit 2
}

set +e
filter_out="$("$filter" "$range" 2>/dev/null)"
filter_rc=$?
set -e
case "$filter_out" in
  SKIP*) echo "not applicable: ${filter_out#*$'\t'}"; exit 0 ;;
  CANDIDATE*) ;;
  *) echo "browser candidate classification inconclusive (exit=$filter_rc)"; exit 3 ;;
esac

head_sha="$(git rev-parse HEAD 2>/dev/null)" || { echo "unable to resolve HEAD"; exit 2; }
objectives=""
if [ -f "$contract" ]; then
  objectives="$(python3 - "$contract" <<'PY'
import json
import sys

try:
    contract = json.load(open(sys.argv[1]))
except (OSError, ValueError):
    sys.exit(0)
for entry in contract.get("evidence", []):
    if entry.get("verifier") == "30-browser-objective":
        print(",".join(entry.get("assertions", [])))
        break
PY
)"
fi
set +e
out="$(LIVE_QA_OBJECTIVES="$objectives" \
  "$runner" maybe_browser_qa post-commit "$range" "$head_sha" 2>&1)"
rc=$?
set -e
result="$(printf '%s\n' "$out" | sed -n 's/^QA_RESULT: //p' | tail -1)"
evidence="$(printf '%s\n' "$out" | sed -n 's/.*LIVE_QA_EVIDENCE: //p' | tail -1)"
evidence_suffix="${evidence:+; evidence=$evidence}"
case "$result" in
  PASS_CANDIDATE) echo "objective browser QA passed$evidence_suffix"; exit 0 ;;
  SKIP|filter-skip|dedup) echo "objective browser QA skipped: $result"; exit 0 ;;
  # Reproducible objective assertion failure with an evidence bundle -> repairable (exit 4).
  FAIL_EVIDENCE) echo "objective browser QA found reproducible failure$evidence_suffix"; exit 4 ;;
  NEEDS_HUMAN) echo "objective browser QA needs human decision$evidence_suffix"; exit 3 ;;
  *) echo "objective browser QA inconclusive (exit=$rc result=${result:-none})"; exit 3 ;;
esac
