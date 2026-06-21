#!/usr/bin/env bash
#
# browser-qa.sh — WS-C/WS-D: the overnight runner's automatic browser-QA phase.
# ----------------------------------------------------------------------------
# Sourced by scripts/overnight/run.sh and called at two trigger points:
#   maybe_browser_qa  post-commit <range> <head>   — after gate + critic pass
#   maybe_drain_browser_qa        <head>           — once at DONE, bounded A/F sweep
#
# Flow (plan docs/plans/2026-06-21-overnight-auto-agy-qa.md §3-§10):
#   dedup ledger → Stage-1 candidate filter (post-commit only) → AGY hook (Stage 2)
#   → classify outcome → record ledger + marker.
# Outcome → return code: 0 = keep commit + continue loop · 3 = stop the loop.
# QA never reverts a commit and never touches the no-progress/consec-fail counters.
#
# Side effects are confined to the ignored runtime ledger under QA_LOG_DIR. It
# never edits source, commits, pushes, or runs a Python browser driver — the AGY
# hook (LIVE_QA_HOOK_CMD) owns every browser action and enforces git invariance.
#
# Testability: the hook command and the candidate filter are overridable via env
# (LIVE_QA_HOOK_CMD / BROWSER_QA_FILTER) so a fake-runner E2E needs no real AGY.
# ----------------------------------------------------------------------------

# --- configuration (overridable; defaults match the repo layout) ---
: "${QA_LOG_DIR:=scripts/overnight/logs}"
: "${QA_LEDGER_TSV:=$QA_LOG_DIR/qa-status.tsv}"
: "${QA_REVIEWED_DIR:=$QA_LOG_DIR/qa-reviewed}"
: "${BROWSER_QA_FILTER:=scripts/overnight/browser-qa-filter.sh}"
: "${LIVE_QA_HOOK_CMD:=scripts/live-qa/run-agy.sh}"
: "${LIVE_QA_CHECKLIST:=docs/test/neo_seoul_live_qa.md}"

# Use run.sh's log() when sourced into it; otherwise print plainly (standalone/tests).
# Check for a *function* named log specifically — macOS ships a /usr/bin/log binary,
# so a plain `command -v log` would wrongly match it when running standalone.
qa_log() { if [ "$(type -t log 2>/dev/null)" = function ]; then log "$1"; else printf '%s\n' "$1"; fi; }

qa_sha256() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then sha256sum | awk '{print $1}'
  else cksum | awk '{print $1}'; fi
}

qa_checklist_hash() { git hash-object "$LIVE_QA_CHECKLIST" 2>/dev/null || echo none; }

# Dedup key = sha256(trigger | head | range | checklist-hash). A new HEAD or a
# changed checklist yields a new key → eligible again; the same pair never reruns.
qa_ledger_key() {
  printf '%s|%s|%s|%s' "$1" "$2" "$3" "$(qa_checklist_hash)" | qa_sha256
}

qa_already_reviewed() { [ -f "$QA_REVIEWED_DIR/$1" ]; }

# Append one ledger row and stamp the dedup marker so this key is never redone.
# cols: ts  trigger  head  key  outcome  case  run_id  reason
qa_record() {  # trigger head outcome case run_id reason key
  local trigger="$1" head="$2" outcome="$3" case_="$4" runid="$5" reason="$6" key="$7"
  mkdir -p "$QA_LOG_DIR" "$QA_REVIEWED_DIR"
  [ -f "$QA_LEDGER_TSV" ] || printf 'ts\ttrigger\thead\tkey\toutcome\tcase\trun_id\treason\n' > "$QA_LEDGER_TSV"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S')" "$trigger" "${head:0:9}" "${key:0:12}" \
    "$outcome" "${case_:--}" "${runid:--}" "${reason:--}" >> "$QA_LEDGER_TSV"
  printf '%s\n' "$outcome" > "$QA_REVIEWED_DIR/$key"
}

# Safety net only — run-agy.sh always prints an authoritative LIVE_QA_OUTCOME line.
qa_outcome_from_rc() {
  case "$1" in 4) echo FAIL_EVIDENCE ;; *) echo NEEDS_HUMAN ;; esac
}

# Invoke the AGY hook, classify, record. Sets QA_LAST_OUTCOME/QA_LAST_RUNID.
# Returns 0 (continue) for PASS_CANDIDATE/SKIP, 3 (stop) otherwise.
qa_invoke_hook() {  # trigger range head reason case mode key
  local trigger="$1" range="$2" head="$3" reason="$4" case_="$5" mode="$6" key="$7"
  qa_log "browser-qa: AGY $trigger (case=$case_ mode=$mode head=${head:0:9} reason=${reason:--})"
  local out rc=0
  out="$(LIVE_QA_TRIGGER="$trigger" LIVE_QA_RANGE="$range" LIVE_QA_HEAD="$head" \
         LIVE_QA_REASON="$reason" LIVE_QA_CASE="$case_" LIVE_QA_MODE="$mode" \
         LIVE_QA_CHECKLIST="$LIVE_QA_CHECKLIST" \
         "$LIVE_QA_HOOK_CMD" 2>&1)" || rc=$?
  while IFS= read -r ln; do [ -n "$ln" ] && qa_log "    [agy] $ln"; done <<EOF
$out
EOF
  local outcome runid
  outcome="$(printf '%s\n' "$out" | grep -oE 'LIVE_QA_OUTCOME: [A-Z_]+' | tail -1 | awk '{print $2}')"
  [ -n "$outcome" ] || outcome="$(qa_outcome_from_rc "$rc")"
  runid="$(printf '%s\n' "$out" | grep -oE 'run=[^ ]+' | tail -1 | cut -d= -f2)"
  QA_LAST_OUTCOME="$outcome"; QA_LAST_RUNID="$runid"
  qa_record "$trigger" "$head" "$outcome" "$case_" "$runid" "$reason" "$key"
  case "$outcome" in
    PASS_CANDIDATE|SKIP) qa_log "browser-qa: $outcome — keep commit, continue"; return 0 ;;
    *)                   qa_log "browser-qa: $outcome — STOP (no revert)"; return 3 ;;
  esac
}

# --- Trigger A: post-commit QA -------------------------------------------------
maybe_browser_qa() {  # trigger range head
  local trigger="$1" range="$2" head="$3"
  QA_LAST_OUTCOME=""; QA_LAST_RUNID=""
  local key; key="$(qa_ledger_key "$trigger" "$head" "$range")"
  if qa_already_reviewed "$key"; then
    QA_LAST_OUTCOME="dedup"; qa_log "browser-qa: dedup skip (key=${key:0:12})"; return 0
  fi
  local verdict; verdict="$("$BROWSER_QA_FILTER" "$range" 2>/dev/null || true)"
  if [ "${verdict%%	*}" = "SKIP" ]; then   # tab-delimited verdict
    QA_LAST_OUTCOME="filter-skip"
    qa_log "browser-qa: candidate filter SKIP ($range)"
    qa_record "$trigger" "$head" "filter-skip" "-" "" "${verdict#*	}" "$key"
    return 0
  fi
  local reason; reason="$(printf '%s' "$verdict" | cut -f2)"
  qa_invoke_hook "$trigger" "$range" "$head" "$reason" "auto" "auto" "$key"
}

# --- Trigger B: drain-time sweep (no candidate filter; bounded A/F) ------------
maybe_drain_browser_qa() {  # head
  local head="$1" trigger="drain" range=""
  QA_LAST_OUTCOME=""; QA_LAST_RUNID=""
  local key; key="$(qa_ledger_key "$trigger" "$head" "$range")"
  if qa_already_reviewed "$key"; then
    QA_LAST_OUTCOME="dedup"; qa_log "browser-qa: drain dedup skip (key=${key:0:12})"; return 0
  fi
  qa_invoke_hook "$trigger" "$range" "$head" "drain-sweep" "A/F" "auto" "$key"
}

# CLI dispatcher — only when executed directly (sourced into run.sh: no-op).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  set -uo pipefail
  cmd="${1:-}"; shift || true
  case "$cmd" in
    maybe_browser_qa)       maybe_browser_qa "$@";       rc=$?; printf 'QA_RESULT: %s\n' "${QA_LAST_OUTCOME:-?}"; exit $rc ;;
    maybe_drain_browser_qa) maybe_drain_browser_qa "$@"; rc=$?; printf 'QA_RESULT: %s\n' "${QA_LAST_OUTCOME:-?}"; exit $rc ;;
    *) echo "usage: browser-qa.sh maybe_browser_qa <trigger> <range> <head> | maybe_drain_browser_qa <head>" >&2; exit 2 ;;
  esac
fi
