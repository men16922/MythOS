#!/usr/bin/env bash
# Run deterministic domain oracles only when the verified diff touches their seams.
set -euo pipefail

range="${1:-}"
[ -n "$range" ] || { echo "missing commit range"; exit 2; }
files="$(git diff --name-only "$range" 2>/dev/null)" || {
  echo "unable to inspect commit range"
  exit 2
}

combat=0
route=0
printf '%s\n' "$files" | grep -Eq '^(src/.*/(combat|tactical)|tests/test_(combat|landscape_combat|portrait_combat))' && combat=1 || true
printf '%s\n' "$files" | grep -Eq '^(src/mythos_(runtime|loop)/.*route|tests/test_route_runtime\.py)' && route=1 || true

if [ "$combat" -eq 0 ] && [ "$route" -eq 0 ]; then
  echo "not applicable: no combat or route runtime change"
  exit 0
fi

python_bin="${MYTHOS_PYTHON:-.venv/bin/python}"
[ -x "$python_bin" ] || { echo "missing deterministic-test interpreter: $python_bin"; exit 2; }

tests=()
[ "$combat" -eq 1 ] && tests+=(tests.test_combat_engine)
[ "$route" -eq 1 ] && tests+=(tests.test_route_runtime)
log_dir="${OVERNIGHT_LOG_DIR:-scripts/overnight/logs}"
mkdir -p "$log_dir"
oracle_log="$log_dir/gameplay-oracle-$$.log"
MYTHOS_LOG_LEVEL=ERROR "$python_bin" -m unittest "${tests[@]}" >"$oracle_log" 2>&1 || {
  cat "$oracle_log" >&2
  fail_line="$(grep -m1 -E '^(FAIL|ERROR): ' "$oracle_log" || true)"
  # Objective, in-scope defect with the exact failing test named -> repairable (exit 4).
  echo "deterministic gameplay oracle failed: ${tests[*]}${fail_line:+ — $fail_line}; evidence=$oracle_log"
  exit 4
}
echo "deterministic gameplay oracle passed: ${tests[*]}"
