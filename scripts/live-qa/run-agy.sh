#!/usr/bin/env bash
# AGY live-QA hook: the wrapper owns lifecycle; AGY owns every browser action.
#
# Generalized from the WS0 probe (plan bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md §6)
# so the overnight runner (scripts/overnight/browser-qa.sh) can invoke it for both
# post-commit and drain-time QA. All inputs arrive via env; defaults reproduce the
# original probe so `scripts/live-qa/run-agy.sh` still works standalone for diagnosis.
#
# Inputs (env):
#   LIVE_QA_TRIGGER    post-commit | drain | probe        (default probe)
#   LIVE_QA_RANGE      git diff range under test           (blank for drain/probe)
#   LIVE_QA_HEAD       verified HEAD under test            (default current HEAD)
#   LIVE_QA_REASON     candidate-filter reason             (informational)
#   LIVE_QA_CHECKLIST  authoritative checklist path        (default neo_seoul_live_qa.md)
#   LIVE_QA_CASE       probe | A | F | auto                (default probe)
#   LIVE_QA_MODE       fallback | real | auto              (default fallback)
#   LIVE_QA_TIMEOUT    AGY hard cap (e.g. 15m)             (default 15m)
#   LIVE_QA_MAX_TURNS  interactive checkpoints            (default 2)
#   LIVE_QA_OBJECTIVES comma-separated objective assertion ids (optional)
#   LIVE_QA_RUN_ID / LIVE_QA_PORT                          (optional overrides)
#   LIVE_QA_TARGET_URL external deployment to test         (e.g. the Cloud Run
#                      prod URL incl. ?invite=…; skips the local server startup
#                      and points AGY at that URL directly. MODE should be real.)
#
# Output: prints one final line `LIVE_QA_OUTCOME: <PASS_CANDIDATE|SKIP|FAIL_EVIDENCE|NEEDS_HUMAN>`.
# Exit: 0=pass/skip, 4=fail_evidence, 5=needs_human, 3=git-invariance, 2=setup error.
# Never edits/commits source, never runs Python browser drivers, never pushes.
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PYTHON="$REPO_ROOT/.venv/bin/python"
ARTIFACTS="$REPO_ROOT/scripts/live-qa/artifacts.py"
PROMPT_FILE="$REPO_ROOT/scripts/live-qa/PROMPT.agy.md"
FIXTURE_PREP="$REPO_ROOT/scripts/live-qa/prepare-objective-fixture.py"

TRIGGER="${LIVE_QA_TRIGGER:-probe}"
RANGE="${LIVE_QA_RANGE:-}"
HEAD_SHA="${LIVE_QA_HEAD:-$(git rev-parse HEAD 2>/dev/null || echo none)}"
REASON="${LIVE_QA_REASON:-}"
CHECKLIST="${LIVE_QA_CHECKLIST:-docs/test/neo_seoul_live_qa.md}"
CASE="${LIVE_QA_CASE:-probe}"
MODE="${LIVE_QA_MODE:-fallback}"
AGY_TIMEOUT="${LIVE_QA_TIMEOUT:-${LIVE_QA_AGY_TIMEOUT:-15m}}"
MAX_TURNS="${LIVE_QA_MAX_TURNS:-2}"
OBJECTIVES="${LIVE_QA_OBJECTIVES:-}"
RUN_ID="${LIVE_QA_RUN_ID:-$(date '+%Y%m%d-%H%M%S')-${TRIGGER}}"
OUTPUT_DIR="$REPO_ROOT/outputs/live-qa/$RUN_ID"

emit() { printf 'LIVE_QA_OUTCOME: %s\n' "$1"; }

[ -x "$PYTHON" ]    || { echo "live-qa: missing $PYTHON" >&2; emit NEEDS_HUMAN; exit 2; }
[ -f "$ARTIFACTS" ] || { echo "live-qa: missing $ARTIFACTS" >&2; emit NEEDS_HUMAN; exit 2; }
[ -f "$PROMPT_FILE" ] || { echo "live-qa: missing $PROMPT_FILE" >&2; emit NEEDS_HUMAN; exit 2; }
[ ! -e "$OUTPUT_DIR" ] || { echo "live-qa: output already exists: $OUTPUT_DIR" >&2; emit NEEDS_HUMAN; exit 2; }
command -v agy >/dev/null 2>&1 || { echo "live-qa: agy not found" >&2; emit NEEDS_HUMAN; exit 2; }

before_status="$(git status --porcelain=v1 --untracked-files=all)"
TARGET_URL_OVERRIDE="${LIVE_QA_TARGET_URL:-}"
if [ -n "$TARGET_URL_OVERRIDE" ]; then
  # External deployment under test: no local server, AGY hits the URL as-is.
  port=0
  base_url="$TARGET_URL_OVERRIDE"
  target_url="$TARGET_URL_OVERRIDE"
else
  port="${LIVE_QA_PORT:-$($PYTHON -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')}"
  base_url="http://127.0.0.1:$port"
  if [ "$MODE" = "real" ]; then
    target_url="$base_url/"
  else
    target_url="$base_url/?fallback=1&image=0"
  fi
fi

"$PYTHON" "$ARTIFACTS" prepare \
  --output-dir "$OUTPUT_DIR" \
  --port "$port" \
  --max-turns "$MAX_TURNS" \
  --case "$CASE" --mode "$MODE" --trigger "$TRIGGER" \
  --range "$RANGE" --reason "$REASON" --checklist "$CHECKLIST" \
  --objectives "$OBJECTIVES"

fixture_context="（none — use the normal new-loop procedure）"
fixture_objective=""
for candidate in companion_join party_distribution cutscene_cardinality_return; do
  case ",$OBJECTIVES," in
    *",$candidate,"*) fixture_objective="$candidate"; break ;;
  esac
done
if [ -n "$fixture_objective" ]; then
  fixture_file="$OUTPUT_DIR/objective-fixture.json"
  "$PYTHON" "$FIXTURE_PREP" \
    --objective "$fixture_objective" \
    --run-id "$RUN_ID" \
    --output "$fixture_file" > "$OUTPUT_DIR/objective-fixture.prepare.log" 2>&1
  fixture_context="$(cat "$fixture_file")"
fi

server_pid=""
server_stopped=0
stop_server() {
  if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [ -z "$server_pid" ] || ! kill -0 "$server_pid" 2>/dev/null; then
    server_stopped=1
  fi
}
trap stop_server EXIT INT TERM

echo "live-qa: AGY actor run=$RUN_ID trigger=$TRIGGER case=$CASE mode=$MODE url=$target_url turns=$MAX_TURNS"
if [ -n "$TARGET_URL_OVERRIDE" ]; then
  "$PYTHON" "$ARTIFACTS" wait --url "$target_url" --timeout 30
else
  PYTHONPATH="$REPO_ROOT/src${PYTHONPATH:+:$PYTHONPATH}" \
    MYTHOS_API_HOST=127.0.0.1 MYTHOS_API_PORT="$port" \
    "$PYTHON" -m mythos_api > "$OUTPUT_DIR/server.log" 2>&1 &
  server_pid=$!
  "$PYTHON" "$ARTIFACTS" wait --url "$base_url/?fallback=1&image=0" --timeout 30
fi

actor_prompt="$(cat "$PROMPT_FILE")

## Run context
- Trigger: $TRIGGER
- Case: $CASE
- Mode: $MODE
- Diff range under test: ${RANGE:-（none — drain/probe）}
- Verified HEAD: $HEAD_SHA
- Candidate reason: ${REASON:-（n/a）}
- Authoritative checklist (read-only): $CHECKLIST
- Base URL: $base_url
- Suggested target URL: $target_url
- Output directory: $OUTPUT_DIR
- Required objective assertions: ${OBJECTIVES:-（none）}
- Persisted objective fixture (browser Resume; none means create a new loop): $fixture_context
- Maximum interactive checkpoints: $MAX_TURNS"
raw_review="$OUTPUT_DIR/agy-output.raw.txt"
# The agy CLI can finish its review (verdict printed) yet never exit — a dangling
# chrome-devtools connection keeps its event loop alive and --print-timeout does not
# fire (measured 2026-07-06: verdict written, process alive 29m until the outer
# ITER_TIMEOUT killed the whole tree, so finalize never ran). Wrap in a hard timeout
# and treat a timeout-kill as success when the verdict line made it to the output.
TIMEOUT_BIN="$(command -v gtimeout || command -v timeout || true)"
HARD_TIMEOUT="${LIVE_QA_HARD_TIMEOUT:-1020}"  # seconds; AGY_TIMEOUT(15m) + 2m grace
set +e
${TIMEOUT_BIN:+"$TIMEOUT_BIN" "$HARD_TIMEOUT"} agy --print "$actor_prompt" --dangerously-skip-permissions --print-timeout "$AGY_TIMEOUT" \
  --add-dir "$REPO_ROOT" > "$raw_review" 2>&1
agy_rc=$?
if [ "$agy_rc" -eq 124 ] && grep -qi 'LIVE_QA_VERDICT:' "$raw_review"; then
  echo "live-qa: agy hung after completing its review — timeout-kill treated as success" >&2
  agy_rc=0
fi
set -e

stop_server
trap - EXIT INT TERM

set +e
"$PYTHON" "$ARTIFACTS" finalize \
  --output-dir "$OUTPUT_DIR" \
  --raw-review "$raw_review" \
  --agy-exit "$agy_rc" \
  --server-stopped "$server_stopped"
finalize_rc=$?
set -e

after_status="$(git status --porcelain=v1 --untracked-files=all)"
if [ "$before_status" != "$after_status" ]; then
  echo "live-qa: FAIL source state changed during AGY QA run" >&2
  echo "--- before ---" >&2; printf '%s\n' "$before_status" >&2
  echo "--- after ---" >&2;  printf '%s\n' "$after_status" >&2
  emit NEEDS_HUMAN
  exit 3
fi

echo "live-qa: artifacts=$OUTPUT_DIR agy_rc=$agy_rc finalize_rc=$finalize_rc server_stopped=$server_stopped"
# finalize already printed the authoritative `LIVE_QA_OUTCOME:` line; propagate its exit code.
exit "$finalize_rc"
