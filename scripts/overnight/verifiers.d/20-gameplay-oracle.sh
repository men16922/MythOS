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
MYTHOS_LOG_LEVEL=ERROR "$python_bin" -m unittest "${tests[@]}" >&2 || {
  echo "deterministic gameplay oracle failed: ${tests[*]}"
  exit 1
}
echo "deterministic gameplay oracle passed: ${tests[*]}"
