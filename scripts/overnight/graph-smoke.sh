#!/usr/bin/env bash
# MythOS consumer integration smoke for the released Overnight Harness graph seam.
# All controller runs use disposable local Git repositories with the fake engine.
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")/../.." rev-parse --show-toplevel)"
HARNESS_ROOT="${1:-${OVERNIGHT_HARNESS_ROOT:-}}"
[ -n "$HARNESS_ROOT" ] || { echo "graph-smoke: HARNESS_ROOT is required" >&2; exit 2; }

OVERNIGHT="$HARNESS_ROOT/templates/scripts/overnight"
RUN_SH="$OVERNIGHT/run.sh"
LEDGER="$OVERNIGHT/lib/ledger.py"
TRAJECTORY="$OVERNIGHT/lib/trajectory.py"
PROVENANCE="$OVERNIGHT/lib/provenance.py"
COMPILER="$REPO_ROOT/scripts/overnight/compile-contract.sh"
PYTHON_BIN="$(command -v python3)"
GIT_BIN="$(command -v git)"
MAKE_BIN="$(command -v make)"

for required in "$RUN_SH" "$LEDGER" "$TRAJECTORY" "$PROVENANCE" "$COMPILER"; do
  [ -f "$required" ] || { echo "graph-smoke: missing dependency: $required" >&2; exit 2; }
done

plugin_version="$($PYTHON_BIN - "$HARNESS_ROOT/.claude-plugin/plugin.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1]))["version"])
PY
)"
[ "$plugin_version" = "1.3.4" ] || {
  echo "graph-smoke: expected released Harness 1.3.4, got $plugin_version" >&2
  exit 2
}

before_head="$($GIT_BIN -C "$REPO_ROOT" rev-parse HEAD)"
before_status="$($GIT_BIN -C "$REPO_ROOT" status --porcelain=v1 -uall)"
tmp_root="$(mktemp -d)"
case "$tmp_root" in
  /tmp/*|/private/tmp/*|/var/folders/*/T/tmp.*) ;;
  *) echo "graph-smoke: refusing unexpected temp path: $tmp_root" >&2; exit 2 ;;
esac
cleanup() {
  if [ "${GRAPH_SMOKE_KEEP:-0}" = "1" ]; then
    echo "graph-smoke: fixtures kept at $tmp_root" >&2
    return
  fi
  chmod -R u+w "$tmp_root" 2>/dev/null || true
  rm -rf -- "$tmp_root"
}
trap cleanup EXIT

fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; fails=$((fails + 1)); }

init_repo() { # <repo> <plan item>
  local repo="$1" item="$2"
  mkdir -p "$repo/docs" "$repo/scripts/overnight/verifiers.d"
  "$GIT_BIN" -C "$repo" init -q
  "$GIT_BIN" -C "$repo" config user.email graph-smoke@mythos.local
  "$GIT_BIN" -C "$repo" config user.name "MythOS Graph Smoke"
  printf 'check:\n\t@test -f feature.txt\n' > "$repo/Makefile"
  printf '%s\n' \
    'scripts/overnight/logs/' \
    'scripts/overnight/CLAIM' \
    'scripts/overnight/DONE' \
    'scripts/overnight/STOP' \
    > "$repo/.gitignore"
  printf '# Fixture plan\n\n%s\n' "$item" > "$repo/docs/NEXT_PLAN.md"
  printf '%s\n' '#!/usr/bin/env bash' 'echo "fixture diff scope passed"' 'exit 0' \
    > "$repo/scripts/overnight/verifiers.d/10-diff-scope.sh"
  chmod +x "$repo/scripts/overnight/verifiers.d/10-diff-scope.sh"
  "$GIT_BIN" -C "$repo" add .
  "$GIT_BIN" -C "$repo" commit -qm "test: initialize graph fixture"
}

run_fake() { # <repo> <actor command> [extra env ...]
  local repo="$1" actor="$2"
  shift 2
  mkdir -p "$repo/scripts/overnight/logs"
  (
    cd "$repo"
    env \
      HARNESS_NOTIFY=0 \
      HARNESS_REPO_ROOT="$repo" \
      OVERNIGHT_ENGINE=fake \
      OVERNIGHT_LANE=claude \
      FAKE_ENGINE_CMD="$actor" \
      GATE_CMD="make check" \
      PAUSE=0 \
      MAX_ITER=1 \
      MAX_CONSEC_FAIL=1 \
      MAX_NO_PROGRESS=1 \
      OVERNIGHT_CONTRACT=1 \
      OVERNIGHT_CONTRACT_REQUIRED=1 \
      OVERNIGHT_CONTRACT_COMPILER="$COMPILER" \
      CONTRACT_PLAN_DOC="$repo/docs/NEXT_PLAN.md" \
      OVERNIGHT_VERIFY=1 \
      OVERNIGHT_CRITIC=0 \
      OVERNIGHT_OVERSIGHT=off \
      OVERNIGHT_SUBAGENTS=0 \
      OVERNIGHT_REPO_WRITE_PROBE=0 \
      "$@" \
      bash "$RUN_SH" --once > "$repo/scripts/overnight/logs/smoke-run.out" 2>&1
  )
}

trajectory_json() {
  "$PYTHON_BIN" "$TRAJECTORY" "$1/scripts/overnight/logs/events.jsonl" --format json
}

assert_trajectory() { # <repo> <outcome> <required edge>...
  local repo="$1" outcome="$2" first second
  shift 2
  first="$(trajectory_json "$repo")"
  second="$(trajectory_json "$repo")"
  if [ "$first" != "$second" ]; then
    fail "$outcome: repeated projection drifted"
    return
  fi
  if "$PYTHON_BIN" - "$outcome" "$first" "$@" <<'PY'
import json, sys
expected, raw, *required = sys.argv[1:]
items = json.loads(raw)
assert len(items) == 1, items
t = items[0]
edges = [node["edge_type"] for node in t["nodes"]]
assert t["outcome"] == expected, (t["outcome"], expected)
assert t["accounting"]["balanced"] is True
assert t["accounting"]["source_sums"] == t["accounting"]["child_sums"] == t["totals"]
assert len({node["attempt_id"] for node in t["nodes"]}) == len(t["nodes"])
assert isinstance(t["graph_fingerprint"], str) and len(t["graph_fingerprint"]) == 64
for prior, node in zip(t["nodes"], t["nodes"][1:]):
    assert node["parent_id"] == prior["node_id"]
    assert node["input_state_hash"] == prior["output_state_hash"]
for edge in required:
    assert edge in edges, (edge, edges)
PY
  then
    pass "$outcome: deterministic trajectory + balanced accounting"
  else
    fail "$outcome: trajectory contract"
  fi
}

assert_no_claim() {
  if [ ! -e "$1/scripts/overnight/CLAIM" ]; then
    pass "$2: no persistent claim"
  else
    fail "$2: persistent claim left behind"
  fi
}

ACCEPT_ACTOR='printf "green\n" > feature.txt; git add feature.txt; git -c user.email=f@t.local -c user.name=Fixture commit -qm "feat: fixture accepted"; printf "{\"is_error\":false,\"usage\":{\"total_tokens\":12},\"total_cost_usd\":0.02}"'
REJECT_ACTOR='printf "wrong\n" > wrong.txt; git add wrong.txt; git -c user.email=f@t.local -c user.name=Fixture commit -qm "feat: fixture rejected"; printf "{\"is_error\":false,\"usage\":{\"total_tokens\":7},\"total_cost_usd\":0.01}"'
REPAIR_ACTOR='n=$(cat "$CT" 2>/dev/null || echo 0); n=$((n+1)); echo "$n" > "$CT"; if [ "$n" = 1 ]; then printf "wrong\n" > wrong.txt; git add wrong.txt; git -c user.email=f@t.local -c user.name=Fixture commit -qm "feat: fixture broken"; else printf "green\n" > feature.txt; git add feature.txt; git -c user.email=f@t.local -c user.name=Fixture commit -qm "fix: fixture repaired"; fi; printf "{\"is_error\":false,\"usage\":{\"total_tokens\":7},\"total_cost_usd\":0.01}"'

# 1. Design-blocked: compiler exit 4 is a terminal human edge and dispatches no actor.
repo="$tmp_root/design-blocked"
init_repo "$repo" '- [ ] [auto:claude] [blocked] Implement fixture after design approval. Done: approved design exists.'
if run_fake "$repo" 'touch "$CT"; printf "{\"is_error\":false}"' CT="$tmp_root/design-actor"; then
  if [ ! -e "$tmp_root/design-actor" ] && [ "$(cat "$repo/scripts/overnight/DONE")" = "all-blocked" ] && \
     [ ! -e "$repo/scripts/overnight/logs/contract-1.json" ]; then
    pass "design-blocked: compiler stops before actor dispatch"
  else
    fail "design-blocked: actor or contract escaped the block"
  fi
else
  fail "design-blocked: controller crashed"
fi
assert_trajectory "$repo" needs_human mission.terminal
assert_no_claim "$repo" design-blocked

# 2. Accepted: prove base-red -> candidate-green, immutable evidence, corruption rejection, and drift refusal.
repo="$tmp_root/accepted"
init_repo "$repo" '- [ ] [auto:claude] Implement accepted graph fixture. Done: feature.txt exists and make check passes.'
if "$MAKE_BIN" -C "$repo" check >/dev/null 2>&1; then
  fail "accepted: regression was not red on base"
else
  pass "accepted: regression is red on base"
fi
if run_fake "$repo" "$ACCEPT_ACTOR"; then
  if "$MAKE_BIN" -C "$repo" check >/dev/null 2>&1; then
    pass "accepted: candidate is green"
  else
    fail "accepted: candidate gate is red"
  fi
else
  fail "accepted: controller failed"
fi
assert_trajectory "$repo" accepted actor.invoke gate.verify evidence.bundle mission.terminal
assert_no_claim "$repo" accepted

bundle="$(find "$repo/scripts/overnight/logs/evidence" -type f -name 'bundle-*.json' -print -quit)"
if [ -n "$bundle" ] && "$PYTHON_BIN" - "$bundle" "$repo" <<'PY'
import hashlib, json, re, sys
from pathlib import Path

bundle = json.load(open(sys.argv[1]))
repo = Path(sys.argv[2])

def resolve(ref: str) -> Path:
    path = Path(ref)
    return path if path.is_absolute() else repo / path

assert bundle["schema"] == 3
assert bundle["acceptance"]["decision"] == "accepted"
assert re.fullmatch(r"[0-9a-f]{64}", bundle["graph_fingerprint"])
for key in ("contract_ref", "provenance_ref"):
    path, expected = bundle[key].rsplit("#sha256=", 1)
    assert hashlib.sha256(resolve(path).read_bytes()).hexdigest() == expected
for artifact in bundle["artifacts"]:
    if artifact["type"] == "commit":
        actual = hashlib.sha256(artifact["ref"].encode()).hexdigest()
    else:
        actual = hashlib.sha256(resolve(artifact["ref"]).read_bytes()).hexdigest()
    assert actual == artifact["sha256"], artifact
names = {item["name"]: item["verdict"] for item in bundle["verifiers"]}
assert names["gate"] == names["10-diff-scope"] == "pass"
PY
then
  pass "accepted: contract/provenance/evidence hashes match bytes"
else
  fail "accepted: immutable evidence contract"
fi

corrupt="$repo/scripts/overnight/logs/corrupt-events.jsonl"
"$PYTHON_BIN" - "$repo/scripts/overnight/logs/events.jsonl" "$corrupt" <<'PY'
import json, sys
events = [json.loads(line) for line in open(sys.argv[1])]
events[1]["seq"] += 2
with open(sys.argv[2], "w") as handle:
    for event in events:
        handle.write(json.dumps(event, separators=(",", ":")) + "\n")
PY
if "$PYTHON_BIN" "$LEDGER" check "$corrupt" >/dev/null 2>&1; then
  fail "accepted: corrupt ledger was accepted"
else
  pass "accepted: ledger sequence corruption rejected"
fi

if [ -n "$bundle" ]; then
  read -r fingerprint manifest_ref < <("$PYTHON_BIN" - "$bundle" <<'PY'
import json, sys
b = json.load(open(sys.argv[1]))
print(b["graph_fingerprint"], b["provenance_ref"])
PY
  )
  printf '\n# provenance drift fixture\n' >> "$repo/scripts/overnight/verifiers.d/10-diff-scope.sh"
  if "$PYTHON_BIN" "$PROVENANCE" validate --repo "$repo" --controller "$OVERNIGHT" \
       --manifest-ref "$manifest_ref" --fingerprint "$fingerprint" >/dev/null 2>&1; then
    fail "accepted: verifier provenance drift was accepted"
  else
    pass "accepted: verifier provenance drift rejected"
  fi
fi

# 3. Reverted: a red candidate is compensated to the exact base tree.
repo="$tmp_root/reverted"
init_repo "$repo" '- [ ] [auto:claude] Implement reverted graph fixture. Done: feature.txt exists and make check passes.'
base_sha="$($GIT_BIN -C "$repo" rev-parse HEAD)"
run_fake "$repo" "$REJECT_ACTOR" || true
if "$GIT_BIN" -C "$repo" diff --quiet "$base_sha" HEAD --; then
  pass "reverted: compensation restores the base tree"
else
  fail "reverted: compensated tree differs from base"
fi
assert_trajectory "$repo" reverted checkpoint.revert_pending checkpoint.reverted mission.terminal
assert_no_claim "$repo" reverted

# 4. Repaired: one bounded revision loops through the gate and closes as repaired.
repo="$tmp_root/repaired"
init_repo "$repo" '- [ ] [auto:claude] Implement repaired graph fixture. Done: feature.txt exists and make check passes.'
if run_fake "$repo" "$REPAIR_ACTOR" CT="$tmp_root/repair-counter" OVERNIGHT_REPAIR=1; then
  if "$MAKE_BIN" -C "$repo" check >/dev/null 2>&1 && [ "$(cat "$tmp_root/repair-counter")" = "2" ]; then
    pass "repaired: bounded revision reaches green on attempt 2"
  else
    fail "repaired: revision count or candidate gate"
  fi
else
  fail "repaired: controller failed"
fi
assert_trajectory "$repo" repaired repair.attempted repair.result repair.closed evidence.bundle mission.terminal
assert_no_claim "$repo" repaired

# 5. Paused: needs_human keeps the candidate and evidence but releases the claim.
repo="$tmp_root/paused"
init_repo "$repo" '- [ ] [auto:claude] Implement browser fixture. Done: feature.txt exists and browser evidence is reviewed.'
printf '%s\n' '#!/usr/bin/env bash' 'echo "fixture browser evidence requires human"' 'exit 3' \
  > "$repo/scripts/overnight/verifiers.d/30-browser-objective.sh"
chmod +x "$repo/scripts/overnight/verifiers.d/30-browser-objective.sh"
"$GIT_BIN" -C "$repo" add scripts/overnight/verifiers.d/30-browser-objective.sh
"$GIT_BIN" -C "$repo" commit -qm "test: add human verifier fixture"
run_fake "$repo" "$ACCEPT_ACTOR" || true
paused_snapshot="$(find "$repo/scripts/overnight/logs/paused" -type f -name '*.json' -print -quit)"
paused_bundle="$(find "$repo/scripts/overnight/logs/evidence" -type f -name 'bundle-*.json' -print -quit)"
if [ -f "$repo/feature.txt" ] && [ -n "$paused_snapshot" ] && [ -n "$paused_bundle" ] && \
   "$PYTHON_BIN" - "$paused_snapshot" "$paused_bundle" <<'PY'
import json, sys
snapshot = json.load(open(sys.argv[1]))
bundle = json.load(open(sys.argv[2]))
assert snapshot["status"] == "paused"
assert bundle["acceptance"]["decision"] == "needs_human"
assert bundle["acceptance"]["mode"] == "human-decision"
PY
then
  pass "paused: pending commit and immutable human evidence preserved"
else
  fail "paused: durable snapshot/evidence contract"
fi
assert_trajectory "$repo" needs_human verifier.30-browser-objective wait.human
assert_no_claim "$repo" paused

after_head="$($GIT_BIN -C "$REPO_ROOT" rev-parse HEAD)"
after_status="$($GIT_BIN -C "$REPO_ROOT" status --porcelain=v1 -uall)"
if [ "$before_head" = "$after_head" ] && [ "$before_status" = "$after_status" ] && \
   [ ! -e "$REPO_ROOT/scripts/overnight/CLAIM" ]; then
  pass "isolation: MythOS worktree/head unchanged and no claim created"
else
  fail "isolation: MythOS source state changed"
fi

echo
if [ "$fails" -gt 0 ]; then
  echo "graph-smoke: $fails FAILED"
  exit 1
fi
echo "graph-smoke: all five paths passed (Harness $plugin_version, offline fake engine)"
