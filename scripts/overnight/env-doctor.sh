#!/usr/bin/env bash
# Offline, idempotent preflight. Provisioning remains a human-run setup action.
set -euo pipefail

fail=0
check() {
  if "$@"; then printf 'ok    %s\n' "$*"; else printf 'miss  %s\n' "$*"; fail=1; fi
}

check test -x .venv/bin/python
check test -d src/mythos_ui/node_modules
check test -x scripts/overnight/compile-contract.sh
check test -x scripts/overnight/verifiers.d/10-diff-scope.sh
if [ -x .venv/bin/python ]; then
  check .venv/bin/python -c 'import mythos_runtime, mythos_loop'
fi
if [ -x .venv/bin/mypy ]; then
  # Burn no model quota when the immutable base already fails the Python gate. This also
  # catches dependency-stub drift that a shallow import probe cannot see.
  check .venv/bin/mypy src tests
fi
if [ "$fail" -ne 0 ]; then
  echo "environment incomplete; run make setup and make frontend-setup manually"
  exit 1
fi
echo "overnight environment ready"
