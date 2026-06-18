#!/usr/bin/env bash
# check-doc-budget.sh — enforce the context-budget line caps on the /sync entry docs.
#
# These docs are read into every session and every overnight iteration, so unbounded
# growth is a direct, compounding token cost. DOCS_POLICY.md states the caps; this
# script makes them a hard gate (wired into `make check`). Pure wc -l, no network.
#
# Caps: AGENT_BRIEF.md <= 60 ; STATUS.md / NEXT_PLAN.md / PROGRESS_LOG.md <= 120.
# When over budget: compress completed items into COMPLETED_SUMMARY.md / archive the
# old PROGRESS_LOG tail (see the /tidy-docs skill).
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0
check() {
  local path="$1" cap="$2"
  if [ ! -f "$path" ]; then
    echo "doc-budget: MISSING $path"
    fail=1
    return
  fi
  local n
  n=$(wc -l < "$path" | tr -d ' ')
  if [ "$n" -gt "$cap" ]; then
    echo "doc-budget: OVER  $path = ${n} lines (cap ${cap}) — run /tidy-docs"
    fail=1
  else
    echo "doc-budget: ok    $path = ${n}/${cap}"
  fi
}

check docs/AGENT_BRIEF.md 60
check docs/STATUS.md 120
check docs/NEXT_PLAN.md 120
check docs/PROGRESS_LOG.md 120

if [ "$fail" -ne 0 ]; then
  echo "doc-budget: FAIL — entry docs exceed context budget"
  exit 1
fi
echo "doc-budget: OK (all entry docs within budget)"
