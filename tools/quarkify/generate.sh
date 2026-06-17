#!/usr/bin/env bash
#
# generate.sh — (re)generate the whole-src quark topology into .quarkify/src/.
# ----------------------------------------------------------------------------
# Drives the external Quarkify tool against tools/quarkify/config.mjs.
# The output (.quarkify/) is a LOCAL BUILD ARTIFACT — gitignored, not committed.
# Re-run after pulling or changing code; it is fast (~seconds) and idempotent.
#
#   bash tools/quarkify/generate.sh        # or: make quarkify
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUARKIFY_HOME="${QUARKIFY_HOME:-$HOME/tools/quarkify}"
CONFIG="$REPO_ROOT/quarkify/config.mjs"

if [ ! -f "$QUARKIFY_HOME/quarkify.mjs" ]; then
  echo "quarkify: tool not found at $QUARKIFY_HOME" >&2
  echo "          run 'make quarkify-setup' first (clones the pinned tool)." >&2
  exit 1
fi
[ -f "$CONFIG" ] || { echo "quarkify: config missing: $CONFIG" >&2; exit 1; }

echo "quarkify: generating whole-src topology → .quarkify/src/ …"
node "$QUARKIFY_HOME/quarkify.mjs" "$CONFIG"
echo "quarkify: done. query with e.g.:"
echo "  find .quarkify/src/quark -type d -iname '*<symbol>*'"
echo "  ls   .quarkify/src/_mirror/by_role/"
