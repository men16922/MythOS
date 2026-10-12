"""Check that a deployed Cloud Run revision really is the code at HEAD before it takes traffic.

  .venv/bin/python scripts/dev/verify_preview.py                 # the no-traffic `v2-preview` tag from `make deploy-preview`
  .venv/bin/python scripts/dev/verify_preview.py --url URL       # any base URL (skips the revision-label check)

A green deploy command says the build finished, not that the revision serves what you think (an old image once
shipped behind a new commit message). Checks, each printed as PASS/FAIL:

1. the revision behind the tag carries the label `git-sha=<HEAD short sha>` that `make deploy*` stamps (a `-dirty` suffix
   means it was built from uncommitted files and never matches);
2. `/api/health` and `/api/v2/health` answer ok;
3. `/api/v2/config` reports `auth: google` (production sign-in is on);
4. the served `/app.js` is byte-identical to the committed `src/mythos_api/static/app.js`.

Read-only: it never changes traffic. Exit 0 = all checks passed; the promote command is then printed, not run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "src" / "mythos_api" / "static" / "app.js"
REGION = "us-central1"
SERVICE = "mythos-api"


def sh(*cmd: str) -> str:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def head_sha() -> str:
    return sh("git", "rev-parse", "--short", "HEAD")


def project_id() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("PROJECT_ID="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("PROJECT_ID missing from .env")


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=20) as resp:
        return resp.read()


def tag_revision(project: str, tag: str) -> tuple[str, str]:
    """(tag url, revision name) of a Cloud Run traffic tag."""
    svc = json.loads(
        sh(
            "gcloud",
            "run",
            "services",
            "describe",
            SERVICE,
            "--region",
            REGION,
            "--project",
            project,
            "--format=json",
        )
    )
    for entry in svc["status"].get("traffic", []):
        if entry.get("tag") == tag:
            return entry["url"], entry["revisionName"]
    raise SystemExit(f"no traffic tag {tag!r} on {SERVICE} — run `make deploy-preview` first")


def revision_label(project: str, revision: str, key: str) -> str:
    rev = json.loads(
        sh(
            "gcloud",
            "run",
            "revisions",
            "describe",
            revision,
            "--region",
            REGION,
            "--project",
            project,
            "--format=json",
        )
    )
    return str(rev.get("metadata", {}).get("labels", {}).get(key, ""))


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--url", help="base URL to check instead of the v2-preview tag")
    ap.add_argument("--tag", default="v2-preview")
    args = ap.parse_args()

    results: list[tuple[str, bool, str]] = []
    revision = ""
    if args.url:
        base = args.url.rstrip("/")
    else:
        project = project_id()
        base, revision = tag_revision(project, args.tag)
        want = head_sha()
        got = revision_label(project, revision, "git-sha")
        results.append(
            (
                f"revision {revision} built from HEAD",
                got == want,
                f"label git-sha={got or '(none)'}, HEAD={want}",
            )
        )
    base = base.rstrip("/")

    for path in ("/api/health", "/api/v2/health"):
        try:
            body = json.loads(fetch(base + path))
            results.append((f"GET {path}", body.get("status") == "ok", json.dumps(body)))
        except Exception as exc:
            results.append((f"GET {path}", False, str(exc)[:160]))
    try:
        cfg = json.loads(fetch(base + "/api/v2/config"))
        results.append(
            ("sign-in mode is google", cfg.get("auth") == "google", f"auth={cfg.get('auth')}")
        )
    except Exception as exc:
        results.append(("sign-in mode is google", False, str(exc)[:160]))
    try:
        served = hashlib.sha256(fetch(base + "/app.js")).hexdigest()[:12]
        local = hashlib.sha256(BUNDLE.read_bytes()).hexdigest()[:12]
        results.append(
            (
                "served app.js matches the committed build",
                served == local,
                f"served {served}, local {local}",
            )
        )
    except Exception as exc:
        results.append(("served app.js matches the committed build", False, str(exc)[:160]))

    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name} — {detail}")
    if all(ok for _, ok, _ in results):
        print(f"\nAll {len(results)} checks passed for {base}.")
        if revision:
            print(
                f"Promote (owner call): gcloud run services update-traffic {SERVICE} --to-latest --region {REGION}"
            )
        return 0
    print("\nNOT safe to promote.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
