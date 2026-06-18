#!/usr/bin/env bash
#
# check-quarkify.sh — verify the Quarkify code-topology index is fresh vs source.
# ----------------------------------------------------------------------------
# .quarkify/src/ is a gitignored, regenerable LOCAL BUILD ARTIFACT (see tools/quarkify/).
# It goes stale when src/*.py changes. This script surfaces that — but it is NON-GATING:
# the index is an OPTIONAL navigation accelerator, so this is deliberately NOT wired into
# `make check` (that would make an absent/optional artifact a mandatory build dependency,
# breaking CI and any clone without the tool). Use `make quarkify-check` on demand.
#
# Freshness rule: stale if the newest src/**/*.py mtime is newer than the index's
# ai_context_guide.txt (which Quarkify writes at the end of every generation).
#
# Usage:
#   bash harness/check-quarkify.sh --check   # report only: exit 1 if stale/missing
#   bash harness/check-quarkify.sh           # self-heal: regenerate if stale/missing
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

INDEX_DIR=".quarkify/src"
MARKER="$INDEX_DIR/ai_context_guide.txt"   # written at end of generation
SRC_DIR="src"

# mtime in epoch seconds — macOS (stat -f) and GNU (stat -c) both. (cf. scripts/overnight/status.sh)
mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0; }

CHECK=0; [ "${1:-}" = "--check" ] && CHECK=1

# state: missing | stale | fresh
state="fresh"
if [ ! -f "$MARKER" ]; then
  state="missing"
else
  marker_t="$(mtime "$MARKER")"
  newest_src="$(find "$SRC_DIR" -name '*.py' -not -path '*/__pycache__/*' -print0 \
                | xargs -0 stat -f %m 2>/dev/null || \
                find "$SRC_DIR" -name '*.py' -not -path '*/__pycache__/*' -printf '%T@\n' 2>/dev/null)"
  newest_src="$(printf '%s\n' "$newest_src" | cut -d. -f1 | sort -n | tail -1)"
  [ -z "$newest_src" ] && newest_src=0
  if [ "$newest_src" -gt "$marker_t" ]; then state="stale"; fi
fi

if [ "$CHECK" -eq 1 ]; then
  case "$state" in
    fresh)   echo "check-quarkify: OK — .quarkify/src is fresh"; exit 0 ;;
    missing) echo "check-quarkify: MISSING — .quarkify/src not built." >&2 ;;
    stale)   echo "check-quarkify: STALE — src/ changed since last index build." >&2 ;;
  esac
  # Agent-friendly error: what / where / why / how-to-fix.
  {
    echo "  what:  Quarkify code-topology index is $state"
    echo "  where: $INDEX_DIR (gitignored local build artifact)"
    echo "  why:   navigation via a $state index can mislead — authority is the source file"
    echo "  fix:   run 'make quarkify' (≈4s; first time 'make quarkify-setup')"
  } >&2
  exit 1
fi

# no flag → self-heal
if [ "$state" = "fresh" ]; then
  echo "check-quarkify: already fresh — nothing to do"
  exit 0
fi
echo "check-quarkify: $state → regenerating…"
bash "$REPO_ROOT/tools/quarkify/generate.sh"
