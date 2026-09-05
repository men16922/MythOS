#!/usr/bin/env bash
# Prove the MissionSpec regression assertion on the committed base and candidate trees.
set -euo pipefail

range="${1:-}"
contract="${OVERNIGHT_CONTRACT_FILE:-}"
log_dir="${OVERNIGHT_LOG_DIR:-scripts/overnight/logs}"
[ -n "$range" ] && [ -f "$contract" ] || {
  echo "missing commit range or WorkContract"
  exit 2
}

python3 - "$range" "$contract" "$log_dir" <<'PY'
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

commit_range, contract_path, log_dir = sys.argv[1:]
repo = Path.cwd().resolve()

try:
    contract = json.load(open(contract_path))
except (OSError, json.JSONDecodeError) as exc:
    print(f"invalid MissionSpec contract binding: {exc}")
    sys.exit(1)

# The runner executes every script in verifiers.d regardless of the contract, and
# treats fail/inconclusive as a reject. This verifier only has something to prove
# when the compiler bound a MissionSpec (contract evidence carries our entry);
# an ordinary [auto] seed has none, and rejecting it would revert every such
# commit (2026-09-06: iteration 1's clean ruff-format commit was rejected here).
bound = [
    item
    for item in contract.get("evidence", [])
    if isinstance(item, dict) and item.get("verifier") == "15-regression-validity"
]
if not bound:
    print("no MissionSpec bound in WorkContract — not applicable, skipped")
    sys.exit(0)

try:
    entry = bound[0]
    ref = entry["config"]["mission_spec_ref"]
    expected_slices = entry["config"]["slice_ids"]
    path_text, expected_hash = ref.rsplit("#sha256=", 1)
    spec_path = (repo / path_text).resolve()
    spec_path.relative_to(repo)
    actual_hash = hashlib.sha256(spec_path.read_bytes()).hexdigest()
    if actual_hash != expected_hash:
        raise ValueError("MissionSpec hash drift")
    spec = json.loads(spec_path.read_text())
except (OSError, ValueError, KeyError, TypeError, StopIteration, json.JSONDecodeError) as exc:
    print(f"invalid MissionSpec contract binding: {exc}")
    sys.exit(1)

if spec.get("schema") != 1 or spec.get("approval", {}).get("decision") != "approved" or spec.get("approval", {}).get("by") != "owner":
    print("MissionSpec is not owner-approved")
    sys.exit(1)
slices = spec.get("slices")
if not isinstance(slices, list) or [item.get("id") for item in slices] != expected_slices:
    print("MissionSpec slice order drift")
    sys.exit(1)

try:
    base, candidate = commit_range.split("..", 1)
    base = subprocess.check_output(["git", "rev-parse", base], text=True).strip()
    candidate = subprocess.check_output(["git", "rev-parse", candidate], text=True).strip()
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", f"{base}..{candidate}"], text=True
    ).splitlines()
except (ValueError, subprocess.CalledProcessError) as exc:
    print(f"unable to resolve regression range: {exc}")
    sys.exit(2)

allowed = []
for slice_spec in slices:
    allowed.extend(slice_spec["include"])

def under(path: str, prefix: str) -> bool:
    prefix = prefix.removeprefix("./").rstrip("/")
    return path == prefix or path.startswith(prefix + "/")

escaped = [path for path in changed if not any(under(path, prefix) for prefix in allowed)]
if escaped:
    print(f"regression slice scope escaped: {escaped[0]}")
    sys.exit(1)

regression = spec.get("regression", {})
if regression.get("mode") == "exemption":
    exemption = regression.get("exemption", {})
    if exemption.get("approved_by") != "owner" or not exemption.get("reason"):
        print("regression exemption is not owner-approved")
        sys.exit(1)
    print(f"regression exemption accepted: {exemption.get('type')}: {exemption['reason']}")
    sys.exit(0)
if regression.get("mode") != "command":
    print("unsupported regression mode")
    sys.exit(1)

command = regression.get("command")
if not isinstance(command, list) or not command:
    print("missing regression command")
    sys.exit(1)

def run_at(revision: str, target: Path) -> subprocess.CompletedProcess[str]:
    target.mkdir()
    archive = subprocess.Popen(["git", "archive", revision], stdout=subprocess.PIPE)
    assert archive.stdout is not None
    extract = subprocess.run(["tar", "-x", "-C", str(target)], stdin=archive.stdout, check=False)
    archive.stdout.close()
    archive_rc = archive.wait()
    if archive_rc or extract.returncode:
        raise RuntimeError(f"archive failed: git={archive_rc} tar={extract.returncode}")
    return subprocess.run(command, cwd=target, text=True, capture_output=True, check=False)

try:
    with tempfile.TemporaryDirectory(prefix="mythos-regression-") as temp:
        root = Path(temp)
        base_result = run_at(base, root / "base")
        candidate_result = run_at(candidate, root / "candidate")
except (OSError, RuntimeError, subprocess.SubprocessError) as exc:
    print(f"regression execution failed: {exc}")
    sys.exit(2)

report = {
    "schema": 1,
    "mission_spec_ref": ref,
    "slice_ids": expected_slices,
    "range": {"base": base, "candidate": candidate},
    "command": command,
    "base": {"exit": base_result.returncode, "stdout": base_result.stdout[-4000:], "stderr": base_result.stderr[-4000:]},
    "candidate": {"exit": candidate_result.returncode, "stdout": candidate_result.stdout[-4000:], "stderr": candidate_result.stderr[-4000:]},
}
safe_mission = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(contract.get("id", "mission")))
report_path = Path(log_dir) / f"regression-validity-{safe_mission}.json"
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, indent=2) + "\n")

expected_base = regression.get("base_exit", 1)
expected_candidate = regression.get("candidate_exit", 0)
if base_result.returncode != expected_base:
    print(f"regression invalid: base exit {base_result.returncode}, expected {expected_base}; evidence={report_path}")
    sys.exit(1)
if candidate_result.returncode != expected_candidate:
    print(f"regression candidate failed: exit {candidate_result.returncode}, expected {expected_candidate}; evidence={report_path}")
    sys.exit(4)
print(f"regression validity passed for {','.join(expected_slices)}; evidence={report_path}")
PY
