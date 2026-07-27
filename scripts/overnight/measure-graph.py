#!/usr/bin/env python3
"""Repeat released graph/recovery suites and emit one auditable metrics bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_VERSION = "1.3.4"
SUITES = (
    {
        "name": "consumer-graph",
        "cases": 5,
        "assertions": 20,
        "marker": "graph-smoke: all five paths passed",
    },
    {
        "name": "resume",
        "cases": 9,
        "assertions": 9,
        "marker": "resume: all passed",
    },
    {
        "name": "fault-matrix",
        "cases": 8,
        "assertions": 8,
        "marker": "fault-matrix: all passed",
    },
)


def _run(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, cwd=cwd, text=True, capture_output=True, check=False)


def _git(cwd: Path, *args: str) -> str:
    result = _run(["git", *args], cwd)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _nearest_rank(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, math.ceil(percentile * len(ordered)) - 1)]


def _version(plugin_root: Path) -> str:
    manifest = plugin_root / ".claude-plugin/plugin.json"
    return str(json.loads(manifest.read_text())["version"])


def _validate_release(source: Path, installed: Path) -> tuple[str, str]:
    if not source.is_absolute() or not installed.is_absolute():
        raise RuntimeError("source and installed plugin paths must be absolute")
    if _git(source, "status", "--porcelain"):
        raise RuntimeError(f"Harness source checkout is dirty: {source}")
    source_plugin = source / "plugins/overnight-harness"
    source_version = _version(source_plugin)
    installed_version = _version(installed)
    if source_version != EXPECTED_VERSION or installed_version != EXPECTED_VERSION:
        raise RuntimeError(
            f"expected released Harness {EXPECTED_VERSION}, got source={source_version} "
            f"installed={installed_version}"
        )
    commit = _git(source, "rev-parse", "HEAD")
    tag_commit = _git(source, "rev-parse", f"overnight-harness--v{EXPECTED_VERSION}^{{commit}}")
    if commit != tag_commit:
        raise RuntimeError(f"Harness source HEAD {commit} is not the {EXPECTED_VERSION} tag")
    comparison = _run(
        ["diff", "-qr", "--exclude=.orphaned_at", str(source_plugin), str(installed)], ROOT
    )
    if comparison.returncode:
        raise RuntimeError("released source and installed cache differ:\n" + comparison.stdout)
    return source_version, commit


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--harness-source", required=True, type=Path)
    parser.add_argument("--repetitions", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.repetitions < 1:
        parser.error("--repetitions must be positive")

    source = args.harness_source.resolve()
    output = args.output.resolve()
    if output.exists():
        raise RuntimeError(f"refusing to overwrite metrics output: {output}")
    output.mkdir(parents=True)

    config = json.loads((ROOT / ".claude/harness-config.json").read_text())
    installed = Path(config["harness_root"]).resolve()
    version, harness_commit = _validate_release(source, installed)
    repo_head = _git(ROOT, "rev-parse", "HEAD")
    status_before = _git(ROOT, "status", "--porcelain=v1", "-uall")

    runs: list[dict[str, object]] = []
    for repetition in range(1, args.repetitions + 1):
        for suite in SUITES:
            name = str(suite["name"])
            if name == "consumer-graph":
                argv = ["make", "overnight-graph-smoke"]
                cwd = ROOT
            else:
                argv = ["bash", f"tests/{name}.sh"]
                cwd = source
            started = time.monotonic()
            result = _run(argv, cwd)
            duration = time.monotonic() - started
            raw = result.stdout + result.stderr
            log_path = output / f"{name}-run-{repetition}.log"
            log_path.write_text(raw)
            assertion_count = sum(line.startswith("PASS  ") for line in raw.splitlines())
            passed = (
                result.returncode == 0
                and str(suite["marker"]) in raw
                and assertion_count == int(suite["assertions"])
            )
            runs.append(
                {
                    "suite": name,
                    "repetition": repetition,
                    "cases": suite["cases"],
                    "expected_assertions": suite["assertions"],
                    "observed_pass_assertions": assertion_count,
                    "exit": result.returncode,
                    "passed": passed,
                    "duration_seconds": round(duration, 6),
                    "log": log_path.name,
                    "log_sha256": _sha256(raw.encode()),
                }
            )

    status_after = _git(ROOT, "status", "--porcelain=v1", "-uall")
    suite_metrics: dict[str, dict[str, object]] = {}
    for suite in SUITES:
        name = str(suite["name"])
        selected = [run for run in runs if run["suite"] == name]
        durations = [float(run["duration_seconds"]) for run in selected]
        suite_metrics[name] = {
            "suite_runs": len(selected),
            "case_runs_attempted": int(suite["cases"]) * len(selected),
            "case_runs_passed": sum(int(suite["cases"]) for run in selected if run["passed"]),
            "assertions_expected": int(suite["assertions"]) * len(selected),
            "assertions_observed_pass": sum(
                int(run["observed_pass_assertions"]) for run in selected
            ),
            "duration_seconds": {
                "total": round(sum(durations), 6),
                "median": round(_nearest_rank(durations, 0.5), 6),
                "p95_nearest_rank": round(_nearest_rank(durations, 0.95), 6),
            },
        }

    total_cases = sum(int(run["cases"]) for run in runs)
    passed_cases = sum(int(run["cases"]) for run in runs if run["passed"])
    metrics = {
        "schema": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),  # noqa: UP017
        "release": {
            "version": version,
            "source_commit": harness_commit,
            "installed_root": str(installed),
            "source_root": str(source),
            "cache_metadata_excluded": [".orphaned_at"],
        },
        "mythos": {
            "head": repo_head,
            "status_before_sha256": _sha256(status_before.encode()),
            "status_after_sha256": _sha256(status_after.encode()),
            "worktree_unchanged": status_before == status_after,
        },
        "repetitions": args.repetitions,
        "totals": {
            "suite_runs": len(runs),
            "case_runs_attempted": total_cases,
            "case_runs_passed": passed_cases,
            "case_pass_rate": passed_cases / total_cases,
            "failed_suite_runs": sum(not bool(run["passed"]) for run in runs),
            "duration_seconds": round(sum(float(run["duration_seconds"]) for run in runs), 6),
        },
        "suites": suite_metrics,
        "runs": runs,
    }
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics["totals"], sort_keys=True))
    if status_before != status_after or passed_cases != total_cases:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
