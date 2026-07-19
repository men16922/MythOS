#!/usr/bin/env bash
# Reject a commit that escapes the compiled WorkContract or weakens verification.
set -euo pipefail

range="${1:-}"
contract="${OVERNIGHT_CONTRACT_FILE:-}"
[ -n "$range" ] && [ -f "$contract" ] || {
  echo "missing commit range or WorkContract"
  exit 2
}

python3 - "$range" "$contract" <<'PY'
import json
import subprocess
import sys
from pathlib import PurePosixPath

commit_range, contract_path = sys.argv[1:]
try:
    contract = json.load(open(contract_path))
    include = tuple(contract["scope"]["include"])
    exclude = tuple(contract["scope"].get("exclude", ()))
except (OSError, ValueError, KeyError, TypeError):
    print("invalid WorkContract scope")
    sys.exit(2)

def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True, stderr=subprocess.DEVNULL)

try:
    changed = [line for line in git("diff", "--name-only", commit_range).splitlines() if line]
    patch = git("diff", "--unified=0", commit_range)
except (OSError, subprocess.CalledProcessError):
    print("unable to inspect commit range")
    sys.exit(2)

if not changed:
    print("empty commit range")
    sys.exit(1)

def under(path: str, prefix: str) -> bool:
    prefix = prefix.removeprefix("./")
    return path == prefix.rstrip("/") or path.startswith(prefix.rstrip("/") + "/")

for path in changed:
    if path.startswith("/") or ".." in PurePosixPath(path).parts:
        print(f"unsafe changed path: {path}")
        sys.exit(1)
    if any(under(path, value) for value in exclude):
        print(f"excluded path changed: {path}")
        sys.exit(1)
    if not any(value == "." or under(path, value) for value in include):
        print(f"out-of-scope path changed: {path}")
        sys.exit(1)

sensitive = (".env", ".pem", ".key", "credentials", "secrets")
for path in changed:
    low = path.lower()
    if any(token in low for token in sensitive):
        print(f"sensitive path changed: {path}")
        sys.exit(1)

deleted_tests = [line for line in git("diff", "--name-status", commit_range).splitlines()
                 if line.startswith("D\t") and "\ttests/" in f"\t{line}"]
if deleted_tests:
    print(f"test deleted: {deleted_tests[0].split(chr(9), 1)[1]}")
    sys.exit(1)

added = "\n".join(line[1:] for line in patch.splitlines()
                    if line.startswith("+") and not line.startswith("+++"))
suppression = ("# noqa", "# type: ignore", "# nosec", "eslint-disable", "pytest.skip", "@unittest.skip")
if any(marker in added for marker in suppression):
    print("new verification suppression marker")
    sys.exit(1)

print(f"{len(changed)} changed path(s) stay inside WorkContract scope")
PY
