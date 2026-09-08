"""Judge resolution: how many points of score movement is just the judge?

Plan 2026-08-30 P4-2. On 2026-08-13 two byte-identical transcripts moved a full
point between two judge runs, and that point was the whole gap being measured.
This script takes N runs of narrative_judge.py over the *same* samples with the
*same* pinned judge and rubric, and reports per-axis spread so the rubric's
resolution can be declared as a number rather than assumed.

Usage:
    .venv/bin/python scripts/eval/judge_resolution.py outputs/evals/<stamp> [...]

Every run directory must carry verdicts.json + provenance.json; runs whose
judge model or rubric hash differ are refused, because mixing judges measures
the mix, not the judge. Aggregation is a pure function locked by
tests/test_narrative_eval.py.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]


def _spread(values: list[float]) -> dict[str, float]:
    return {
        "n": len(values),
        "median": statistics.median(values),
        "mean": round(statistics.fmean(values), 3),
        "stdev": round(statistics.stdev(values), 3) if len(values) > 1 else 0.0,
        "min": min(values),
        "max": max(values),
        "range": max(values) - min(values),
    }


def aggregate(runs: list[dict[str, dict[str, Any]]]) -> dict[str, Any]:
    """Per-sample, per-axis spread across ``runs`` (each = verdicts.json content).

    Resolution is the largest sample standard deviation seen on any (sample,
    axis) cell — the smallest score difference that one run cannot distinguish
    from judge noise — and ``range`` is reported beside it because with N≈5 the
    range is the number a reader will actually believe.
    """
    if len(runs) < 2:
        raise ValueError("resolution needs at least two runs of the same samples")
    names = set(runs[0])
    for run in runs[1:]:
        if set(run) != names:
            raise ValueError(f"runs score different samples: {sorted(names)} vs {sorted(run)}")
    samples: dict[str, dict[str, Any]] = {}
    worst_axis = (0.0, "")
    worst_overall = 0.0
    for name in sorted(names):
        axes = sorted({axis for run in runs for axis in run[name]["scores"]})
        per_axis = {}
        for axis in axes:
            values = [float(run[name]["scores"][axis]) for run in runs]
            per_axis[axis] = _spread(values)
            if per_axis[axis]["stdev"] > worst_axis[0]:
                worst_axis = (per_axis[axis]["stdev"], f"{name}/{axis}")
        overall = _spread([float(run[name]["overall"]) for run in runs])
        worst_overall = max(worst_overall, overall["stdev"])
        samples[name] = {"axes": per_axis, "overall": overall}
    return {
        "runs": len(runs),
        "samples": samples,
        "resolution": {
            "axis_stdev_max": worst_axis[0],
            "axis_stdev_max_cell": worst_axis[1],
            "overall_stdev_max": worst_overall,
            "overall_range_max": max(s["overall"]["range"] for s in samples.values()),
        },
    }


def load_run(path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    verdicts = json.loads((path / "verdicts.json").read_text(encoding="utf-8"))
    provenance = json.loads((path / "provenance.json").read_text(encoding="utf-8"))
    return verdicts, provenance


def check_same_judge(provenances: list[dict[str, Any]]) -> None:
    keys = {
        (p.get("judge_model"), p.get("rubric_sha256"), tuple(p.get("command") or []))
        for p in provenances
    }
    if len(keys) != 1:
        raise ValueError(f"runs were scored by different judges/rubrics: {sorted(map(str, keys))}")


def render(result: dict[str, Any], provenance: dict[str, Any], run_dirs: list[Path]) -> str:
    lines = [
        "# Judge resolution",
        "",
        f"Runs: {result['runs']} · judge `{provenance.get('judge_model') or '?'}` "
        f"(`{' '.join(provenance.get('command') or [])}`) · rubric SHA-256 `{provenance.get('rubric_sha256')}`",
        f"Judge version: `{provenance.get('judge_version') or '?'}`",
        "",
        "Run dirs: " + ", ".join(f"`{d.name}`" for d in run_dirs),
        "",
        "## Resolution",
        "",
        f"- Largest per-axis stdev: **{result['resolution']['axis_stdev_max']}** "
        f"({result['resolution']['axis_stdev_max_cell']})",
        f"- Largest overall stdev: **{result['resolution']['overall_stdev_max']}**",
        f"- Largest overall range (max − min): **{result['resolution']['overall_range_max']}**",
        "",
        "A difference between two single-run scores smaller than the overall range above "
        "is not distinguishable from the judge; compare medians over the same N instead.",
        "",
    ]
    for name, sample in result["samples"].items():
        lines += [
            f"## {name}",
            "",
            "| axis | n | median | mean | stdev | min | max | range |",
            "|---|---|---|---|---|---|---|---|",
        ]
        for axis, s in sample["axes"].items():
            lines.append(
                f"| {axis} | {s['n']} | {s['median']} | {s['mean']} | {s['stdev']} | {s['min']} | {s['max']} | {s['range']} |"
            )
        o = sample["overall"]
        lines.append(
            f"| **overall** | {o['n']} | {o['median']} | {o['mean']} | {o['stdev']} | {o['min']} | {o['max']} | {o['range']} |"
        )
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runs", nargs="+", type=Path, help="narrative_judge.py output directories")
    args = parser.parse_args(argv)
    run_dirs = [p if p.is_absolute() else REPO_ROOT / p for p in args.runs]
    loaded = [load_run(p) for p in run_dirs]
    provenances = [prov for _, prov in loaded]
    check_same_judge(provenances)
    result = aggregate([verdicts for verdicts, _ in loaded])
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = REPO_ROOT / "outputs" / "evals" / f"resolution-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)
    report = render(result, provenances[0], run_dirs)
    (out_dir / "report.md").write_text(report, encoding="utf-8")
    (out_dir / "resolution.json").write_text(
        json.dumps(
            {"result": result, "provenance": provenances[0], "runs": [str(d) for d in run_dirs]},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"{report}\nreport → {out_dir / 'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
