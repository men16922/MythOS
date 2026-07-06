#!/usr/bin/env bash
#
# browser-qa-filter.sh — WS-A: cheap deterministic candidate filter for automatic browser QA.
# ----------------------------------------------------------------------------
# Decides whether a commit/diff range touches behavior observable through the
# playable UI, so the overnight runner can avoid spending AGY/browser time on
# commits that cannot change anything a player sees (docs/tests/harness churn).
#
# This is Stage 1 of the two-stage decision in
# bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md §5 — a COST gate, not the final
# semantic decision. Stage 2 (AGY `QA_DECISION: RUN|SKIP`) makes the real call.
# Therefore this filter BIASES TOWARD CANDIDATE whenever it is uncertain.
#
# Side effects: NONE. It only reads git (`git diff --name-only`). It never
# writes, commits, checks out, or mutates the working tree.
#
# Usage (CLI):
#   scripts/overnight/browser-qa-filter.sh <range>     # e.g. HEAD~1..HEAD
# Usage (sourced, for run.sh integration in WS-C):
#   source scripts/overnight/browser-qa-filter.sh
#   browser_qa_candidate_reason "<range>"
#
# Output: exactly one machine-readable line on stdout —
#   CANDIDATE\t<reason>   diff touches UI-observable behavior → browser QA justified
#   SKIP\t<reason>        diff is clearly non-browser-facing → no AGY cost
# Exit code: 0 = candidate, 1 = skip. (Reserved 2 = usage error.)
# Both the line and the exit code agree, so callers may use either.
# ----------------------------------------------------------------------------
set -uo pipefail

# classify_path <path> — pure, no git, no I/O. Echoes one of:
#   ui:<p> | api:<p> | runtime:<p> | scenario:<p> | e2e:<p>   (browser-relevant)
#   skip                                                       (recognized non-browser)
#   unknown:<p>                                                (unrecognized → bias candidate)
# Order matters: browser-relevant prefixes are matched BEFORE the skip allowlist
# so e.g. tests/playwright/* (browser E2E) wins over the generic tests/* skip.
classify_path() {
  case "$1" in
    # --- browser-relevant: directly drives or shapes the playable UI ---
    src/mythos_ui/*)          printf 'ui:%s' "$1" ;;
    src/mythos_api/*)         printf 'api:%s' "$1" ;;
    src/mythos_runtime/*|src/mythos_loop/*|src/mythos_narrative/*|src/mythos_core/*|src/mythos_memory/*|src/mythos_combat/*|src/mythos_image_agent/*)
                              printf 'runtime:%s' "$1" ;;
    resources/*)              printf 'scenario:%s' "$1" ;;   # scenario.json / directives / story_bible / curated assets
    tests/playwright/*)       printf 'e2e:%s' "$1" ;;        # browser-facing selectors/test-ids
    # --- recognized non-browser: safe to skip ---
    docs/*|bin/*|harness/*|scripts/*|migrations/*|docker/*|screenshots/*|outputs/*|scratch/*) printf 'skip' ;;
    .github/*|.claude/*|.codex/*|.gemini/*|.agents/*|.docker/*|__pycache__/*|*.egg-info/*)     printf 'skip' ;;
    tests/*)                  printf 'skip' ;;                # python unit/invariant tests (no runtime change)
    Makefile|.gitignore|.env*) printf 'skip' ;;
    *.md|*.toml|*.cfg|*.ini|*.lock|*.json|*.yml|*.yaml|*.txt) printf 'skip' ;;  # root config / formatting
    # --- unrecognized: bias toward candidate (Stage 2 makes the real call) ---
    *)                        printf 'unknown:%s' "$1" ;;
  esac
}

# browser_qa_candidate_reason <range> — verdict for a diff range.
# CANDIDATE if ANY changed file is browser-relevant or unrecognized; SKIP only
# when EVERY changed file is on the recognized non-browser allowlist.
browser_qa_candidate_reason() {
  local range="${1:-}"
  if [ -z "$range" ]; then
    printf 'CANDIDATE\tuncertain:empty-range\n'; return 0
  fi

  local files
  if ! files="$(git diff --name-only "$range" 2>/dev/null)"; then
    printf 'CANDIDATE\tuncertain:git-error\n'; return 0
  fi
  if [ -z "$files" ]; then
    printf 'CANDIDATE\tuncertain:no-changes\n'; return 0
  fi

  local browser_hit="" unknown_hit="" skip_count=0 c
  # heredoc (not pipe) so the loop runs in this shell and vars survive.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    c="$(classify_path "$f")"
    case "$c" in
      skip)      skip_count=$((skip_count + 1)) ;;
      unknown:*) [ -n "$unknown_hit" ] || unknown_hit="$c" ;;
      *)         [ -n "$browser_hit" ] || browser_hit="$c" ;;
    esac
  done <<EOF
$files
EOF

  if [ -n "$browser_hit" ]; then
    printf 'CANDIDATE\t%s\n' "$browser_hit"; return 0
  fi
  if [ -n "$unknown_hit" ]; then
    printf 'CANDIDATE\t%s\n' "$unknown_hit"; return 0
  fi
  printf 'SKIP\tnon-browser:%d-files\n' "$skip_count"; return 1
}

# CLI entry — only when executed directly, not when sourced into run.sh.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  if [ "$#" -lt 1 ]; then
    printf 'usage: %s <git-range>   (e.g. HEAD~1..HEAD)\n' "$0" >&2
    exit 2
  fi
  browser_qa_candidate_reason "$1"
  exit $?
fi
