#!/usr/bin/env python3
"""Prepare and validate evidence for an AGY-driven MythOS live-QA run.

This module has NO browser dependency. It only prepares the run manifest, waits
for the API to come up, and — after AGY has driven the browser itself — validates
the captured evidence and classifies a machine-readable outcome.

Outcome contract (consumed by scripts/overnight/browser-qa.sh, plan
docs/plans/2026-06-21-overnight-auto-agy-qa.md §10):

    PASS_CANDIDATE  evidence complete, AGY browser verdict positive   exit 0
    SKIP            AGY decided no browser-observable behavior         exit 0
    FAIL_EVIDENCE   AGY found a fatal regression with evidence         exit 4
    NEEDS_HUMAN     evidence incomplete / ambiguous / tool failure     exit 5

`decide_outcome` is a pure function so the fixture matrix can classify fake AGY
transcripts without a browser, API, or git.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

VERDICT_RE = re.compile(
    r"LIVE_QA_VERDICT:\s*(PASS_CANDIDATE|FAIL_EVIDENCE|NEEDS_HUMAN)", re.IGNORECASE
)
TOOL_RE = re.compile(
    r"AGY_BROWSER_TOOL:\s*(CHROME_DEVTOOLS|PLAYWRIGHT_MCP|NONE)", re.IGNORECASE
)
# Stage-2 semantic decision (plan §5): AGY's first line when given a candidate.
DECISION_RE = re.compile(r"QA_DECISION:\s*(RUN|SKIP)", re.IGNORECASE)
# Autonomous discovery: AGY reports OBJECTIVE defects as machine-parseable lines.
# `QA_FINDING: <severity> | <area> | <detail>` (severity = blocker|major|minor).
FINDING_RE = re.compile(
    r"QA_FINDING:\s*(blocker|major|minor)\s*\|\s*([^|]+?)\s*\|\s*(.+)", re.IGNORECASE
)

# outcome -> process exit code. PASS/SKIP keep the loop going; FAIL/NEEDS stop it.
OUTCOME_EXIT = {
    "PASS_CANDIDATE": 0,
    "SKIP": 0,
    "FAIL_EVIDENCE": 4,
    "NEEDS_HUMAN": 5,
}


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, check=False, capture_output=True, text=True
    )
    return result.stdout.strip()


def prepare(
    output_dir: Path,
    port: int,
    max_turns: int,
    *,
    case: str = "probe",
    mode: str = "fallback",
    trigger: str = "probe",
    diff_range: str = "",
    reason: str = "",
    checklist: str = "docs/test/neo_seoul_live_qa.md",
) -> int:
    output_dir.mkdir(parents=True, exist_ok=False)
    (output_dir / "screenshots").mkdir()
    write_json(
        output_dir / "manifest.json",
        {
            "schema_version": 2,
            "run_id": output_dir.name,
            "trigger": trigger,
            "case": case,
            "mode": mode,
            "diff_range": diff_range,
            "candidate_reason": reason,
            "scenario": "neo-seoul",
            "commit": git_output("rev-parse", "HEAD"),
            "checklist": checklist,
            "checklist_commit": git_output("hash-object", checklist),
            "started_at": utc_now(),
            "ended_at": None,
            "port": port,
            "max_turns": max_turns,
            "browser_actor": "agy",
            "browser_tool_preference": ["chrome_devtools", "playwright_mcp"],
            "status": "running",
            "error": None,
        },
    )
    return 0


def wait_for_server(url: str, timeout: float) -> int:
    deadline = time.monotonic() + timeout
    last_error = "server did not respond"
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.0) as response:
                if response.status < 500:
                    return 0
        except (OSError, urllib.error.URLError) as exc:
            last_error = str(exc)
        time.sleep(0.25)
    raise RuntimeError(f"API startup timeout: {last_error}")


def read_events(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    events: list[dict[str, Any]] = []
    errors: list[str] = []
    if not path.is_file():
        return events, ["missing events.jsonl"]
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip():
            continue
        try:
            value = json.loads(raw_line)
        except json.JSONDecodeError as exc:
            errors.append(f"events.jsonl:{line_number}: {exc.msg}")
            continue
        if not isinstance(value, dict):
            errors.append(f"events.jsonl:{line_number}: event is not an object")
            continue
        events.append(value)
    return events, errors


def parse_findings(raw: str) -> list[dict[str, str]]:
    """Extract AGY's objective findings (pure). Subjective feel is never a finding."""
    findings: list[dict[str, str]] = []
    for m in FINDING_RE.finditer(raw):
        findings.append(
            {"severity": m.group(1).lower(), "area": m.group(2).strip(), "detail": m.group(3).strip()}
        )
    return findings


def decide_outcome(
    raw: str,
    *,
    event_count: int,
    screenshot_count: int,
    empty_screenshot: bool,
    console_present: bool,
    agy_exit: int,
    server_stopped: bool,
    event_errors: list[str] | None = None,
) -> tuple[str, str, str, str, list[str]]:
    """Pure classifier. Returns (outcome, decision, verdict, tool, errors).

    No filesystem/network/git access — the caller passes already-gathered facts.
    """
    decision_match = DECISION_RE.search(raw)
    verdict_match = VERDICT_RE.search(raw)
    tool_match = TOOL_RE.search(raw)
    decision = decision_match.group(1).upper() if decision_match else ""
    verdict = verdict_match.group(1).upper() if verdict_match else ""
    tool = tool_match.group(1).upper() if tool_match else "NONE"

    errors: list[str] = []
    # Infra-level checks apply to every run, including a SKIP decision.
    if agy_exit != 0:
        errors.append(f"agy exited {agy_exit}")
    if not server_stopped:
        errors.append("API server did not stop")

    if decision == "SKIP":
        # AGY judged no meaningful browser-observable behavior; no evidence needed,
        # so missing events/screenshots are expected and not faults here.
        # A clean SKIP keeps the loop moving; an infra fault during it needs a human.
        outcome = "SKIP" if not errors else "NEEDS_HUMAN"
        return outcome, decision, verdict, tool, errors

    # RUN (explicit) or unspecified → AGY was expected to gather browser evidence.
    errors.extend(event_errors or [])
    if event_count < 2:
        errors.append(f"expected at least 2 events, found {event_count}")
    if screenshot_count < 2:
        errors.append(f"expected at least 2 screenshots, found {screenshot_count}")
    if empty_screenshot:
        errors.append("one or more screenshots are empty")
    if not console_present:
        errors.append("missing console.log")
    if tool == "NONE":
        errors.append("AGY did not report a browser tool")
    if not verdict:
        errors.append("missing LIVE_QA_VERDICT")

    if errors:
        # Incomplete/ambiguous evidence is never an autonomous pass or fail.
        return "NEEDS_HUMAN", decision, verdict, tool, errors
    # Evidence complete → trust AGY's browser verdict verbatim.
    return verdict, decision, verdict, tool, errors


def finalize(output_dir: Path, raw_review: Path, agy_exit: int, server_stopped: bool) -> int:
    raw = raw_review.read_text(encoding="utf-8", errors="replace") if raw_review.exists() else ""
    events, event_errors = read_events(output_dir / "events.jsonl")
    screenshots = sorted((output_dir / "screenshots").glob("*.png"))
    empty_screenshot = any(path.stat().st_size == 0 for path in screenshots)
    console_present = (output_dir / "console.log").is_file()

    outcome, decision, verdict, browser_tool, errors = decide_outcome(
        raw,
        event_count=len(events),
        screenshot_count=len(screenshots),
        empty_screenshot=empty_screenshot,
        console_present=console_present,
        agy_exit=agy_exit,
        server_stopped=server_stopped,
        event_errors=event_errors,
    )
    findings = parse_findings(raw)

    verdict_payload = {
        "schema_version": 2,
        "run_id": output_dir.name,
        "reviewed_at": utc_now(),
        "actor": "agy",
        "browser_tool": browser_tool,
        "agy_exit": agy_exit,
        "server_stopped": server_stopped,
        "qa_decision": decision or "(unspecified)",
        "requested_verdict": verdict or "(none)",
        "outcome": outcome,
        "event_count": len(events),
        "screenshot_count": len(screenshots),
        "validation_errors": errors,
        "findings": findings,
    }
    write_json(output_dir / "verdict.json", verdict_payload)
    report = (
        "# AGY Live-QA Run\n\n"
        f"- Run: `{output_dir.name}`\n"
        f"- Browser actor: `agy` (tool `{browser_tool}`)\n"
        f"- QA decision: `{decision or '(unspecified)'}`\n"
        f"- AGY verdict: `{verdict or '(none)'}`\n"
        f"- Validated outcome: `{outcome}`\n"
        f"- Events/screenshots: `{len(events)}/{len(screenshots)}`\n"
        f"- Validation errors: `{errors or 'none'}`\n\n"
        "## Raw AGY output\n\n"
        f"{raw.strip()}\n"
    )
    (output_dir / "report.md").write_text(report, encoding="utf-8")

    manifest_path = output_dir / "manifest.json"
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["ended_at"] = utc_now()
        manifest["status"] = "completed" if outcome in ("PASS_CANDIDATE", "SKIP") else "needs_review"
        manifest["browser_tool"] = browser_tool
        manifest["qa_decision"] = decision or "(unspecified)"
        manifest["outcome"] = outcome
        manifest["server_stopped"] = server_stopped
        manifest["validation_errors"] = errors
        write_json(manifest_path, manifest)

    # Final machine-readable line — browser-qa.sh treats this as authoritative.
    print(f"LIVE_QA_OUTCOME: {outcome}")
    # Re-emit findings in canonical form so the runner can record them from stdout
    # (the raw AGY transcript is in a file, not on this process's stdout).
    for f in findings:
        print(f"QA_FINDING: {f['severity']} | {f['area']} | {f['detail']}")
    return OUTCOME_EXIT.get(outcome, 5)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare_parser = subparsers.add_parser("prepare")
    prepare_parser.add_argument("--output-dir", type=Path, required=True)
    prepare_parser.add_argument("--port", type=int, required=True)
    prepare_parser.add_argument("--max-turns", type=int, default=2)
    prepare_parser.add_argument("--case", default="probe")
    prepare_parser.add_argument("--mode", default="fallback")
    prepare_parser.add_argument("--trigger", default="probe")
    prepare_parser.add_argument("--range", dest="diff_range", default="")
    prepare_parser.add_argument("--reason", default="")
    prepare_parser.add_argument("--checklist", default="docs/test/neo_seoul_live_qa.md")

    wait_parser = subparsers.add_parser("wait")
    wait_parser.add_argument("--url", required=True)
    wait_parser.add_argument("--timeout", type=float, default=30.0)

    finalize_parser = subparsers.add_parser("finalize")
    finalize_parser.add_argument("--output-dir", type=Path, required=True)
    finalize_parser.add_argument("--raw-review", type=Path, required=True)
    finalize_parser.add_argument("--agy-exit", type=int, required=True)
    finalize_parser.add_argument("--server-stopped", choices=("0", "1"), required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "prepare":
        return prepare(
            args.output_dir.resolve(),
            args.port,
            args.max_turns,
            case=args.case,
            mode=args.mode,
            trigger=args.trigger,
            diff_range=args.diff_range,
            reason=args.reason,
            checklist=args.checklist,
        )
    if args.command == "wait":
        return wait_for_server(args.url, args.timeout)
    return finalize(
        args.output_dir.resolve(),
        args.raw_review.resolve(),
        args.agy_exit,
        args.server_stopped == "1",
    )


if __name__ == "__main__":
    raise SystemExit(main())
