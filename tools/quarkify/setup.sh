#!/usr/bin/env bash
#
# setup.sh — fetch the external Quarkify tool at a PINNED commit (idempotent).
# ----------------------------------------------------------------------------
# Quarkify (companyjupiter/quarkify, Apache-2.0) decomposes source into a quark
# folder topology. It is an EXTERNAL tool — it lives outside this repo so the
# repo stays clean. The engine (quarkify.mjs) imports only Node stdlib; its sole
# declared dependency (puppeteer) is unused by the core path, so NO `npm install`
# is needed — clone + checkout is enough.
#
# Home defaults to ~/tools/quarkify; override with $QUARKIFY_HOME.
#
# Usage:
#   bash tools/quarkify/setup.sh        # clone@PIN if missing, else verify PIN
# ----------------------------------------------------------------------------
set -euo pipefail

REPO_URL="https://github.com/companyjupiter/quarkify.git"
PIN="cace87f5ea96333642d6198b6364ab38efd99ff9"
QUARKIFY_HOME="${QUARKIFY_HOME:-$HOME/tools/quarkify}"

if [ -d "$QUARKIFY_HOME/.git" ]; then
  cur="$(git -C "$QUARKIFY_HOME" rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$cur" = "$PIN" ]; then
    echo "quarkify-setup: OK — already at pinned commit ($PIN) in $QUARKIFY_HOME"
    exit 0
  fi
  echo "quarkify-setup: existing clone at $cur, fetching + checking out pin $PIN…"
  git -C "$QUARKIFY_HOME" fetch --depth 1 origin "$PIN" 2>/dev/null || git -C "$QUARKIFY_HOME" fetch origin
  git -C "$QUARKIFY_HOME" checkout -q "$PIN"
else
  echo "quarkify-setup: cloning $REPO_URL → $QUARKIFY_HOME"
  mkdir -p "$(dirname "$QUARKIFY_HOME")"
  git clone -q "$REPO_URL" "$QUARKIFY_HOME"
  git -C "$QUARKIFY_HOME" checkout -q "$PIN"
fi

got="$(git -C "$QUARKIFY_HOME" rev-parse HEAD)"
[ "$got" = "$PIN" ] || { echo "FATAL: pin mismatch — wanted $PIN, got $got" >&2; exit 1; }
echo "quarkify-setup: ready at $QUARKIFY_HOME ($PIN) — no npm install required"
