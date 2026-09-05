"""Experiment harness: run a measurement, emit a dated report you can audit later.

Why a harness rather than ad-hoc scripts. The serving-research track (see
``docs/plans/2026-08-30-mythos-as-serving-research-workload.md``) inherits its
method from a study whose central finding was that **the same technique flips
from +199% to −54% depending on the workload and the load**. Numbers that do not
record what was held constant are therefore worse than no numbers: they invite
exactly the comparison that produced the wrong answer. So every run here writes
down, in the report itself:

- the **question** it is answering, in one line;
- the **controls** (held constant) and the **variables** (what actually changed);
- **provenance** — git commit, dirtiness, platform, and a SHA-256 of the
  experiment module, mirroring how ``scripts/eval/narrative_judge.py`` records
  the rubric hash so a later reader can tell whether the *measurer* moved;
- the **limits**, which are structurally required — an experiment that declares
  none refuses to produce a report.

Reports go to ``experiments/results/<UTC stamp>-<slug>/``. They are meant to be
read months later by someone who no longer remembers the session.

**Experiments are not part of ``make check``.** They call live engines (Ollama, a
local vLLM/MLX server), take minutes, and are non-deterministic. The gate covers
this harness's own logic via ``tests/test_experiment_harness.py``.
"""

from __future__ import annotations

import hashlib
import json
import platform
import subprocess
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = Path(__file__).resolve().parent / "results"


class ExperimentError(RuntimeError):
    """Raised when a result cannot honestly be turned into a report."""


@dataclass(frozen=True)
class Table:
    """A measurement table. ``note`` carries the caveat that belongs with it."""

    title: str
    headers: Sequence[str]
    rows: Sequence[Sequence[Any]]
    note: str = ""


@dataclass(frozen=True)
class Finding:
    """One claim plus the evidence that licenses it.

    ``confidence`` is deliberately coarse and deliberately mandatory:
    ``measured`` (this run shows it), ``reproduced`` (shown more than once, or by
    replay), ``indicative`` (consistent with the data, not established).
    """

    claim: str
    evidence: str
    confidence: str = "measured"

    def __post_init__(self) -> None:
        allowed = {"measured", "reproduced", "indicative"}
        if self.confidence not in allowed:
            raise ExperimentError(
                f"confidence must be one of {sorted(allowed)}: {self.confidence!r}"
            )


@dataclass
class ExperimentResult:
    findings: list[Finding] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    #: Required. What this run cannot support — sample size, single machine,
    #: proxy metrics, anything a reader could otherwise over-read.
    limits: list[str] = field(default_factory=list)
    #: Written verbatim to ``raw/data.json`` so a finding can be re-derived.
    raw: dict[str, Any] = field(default_factory=dict)
    #: Free-form prose placed before the tables. Optional.
    summary: str = ""


@dataclass(frozen=True)
class Experiment:
    """A named measurement.

    ``controls`` and ``variables`` are not documentation — they are the reason
    the harness exists. Fill them with the values actually in force at run time,
    not the values you intended.
    """

    slug: str
    question: str
    controls: dict[str, Any]
    variables: dict[str, Any]
    run: Callable[[], ExperimentResult]
    #: Module file whose hash is recorded, so an edited experiment is visible.
    source: Path | None = None


def _git(*args: str) -> str | None:
    try:
        proc = subprocess.run(
            ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, timeout=10, check=False
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout.strip() or None if proc.returncode == 0 else None


def _sha256(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def provenance_for(experiment: Experiment) -> dict[str, Any]:
    """Everything needed to tell whether a later run is comparable to this one."""
    dirty = _git("status", "--porcelain")
    return {
        "ran_at": datetime.now(UTC).isoformat(),
        "slug": experiment.slug,
        "git_commit": _git("rev-parse", "HEAD"),
        "git_branch": _git("rev-parse", "--abbrev-ref", "HEAD"),
        # A dirty tree means the commit does not identify the code that ran.
        "git_dirty": bool(dirty),
        "experiment_sha256": _sha256(experiment.source) if experiment.source else None,
        "python": sys.version.split()[0],
        "platform": f"{platform.system()} {platform.release()} {platform.machine()}",
        "controls": experiment.controls,
        "variables": experiment.variables,
    }


def _table_md(table: Table) -> str:
    head = "| " + " | ".join(str(h) for h in table.headers) + " |"
    rule = "|" + "|".join("---" for _ in table.headers) + "|"
    body = [
        "| " + " | ".join("" if c is None else str(c) for c in row) + " |" for row in table.rows
    ]
    out = [f"### {table.title}", "", head, rule, *body]
    if table.note:
        out += ["", f"> {table.note}"]
    return "\n".join(out)


def render_report(experiment: Experiment, result: ExperimentResult, prov: dict[str, Any]) -> str:
    if not result.limits:
        raise ExperimentError(
            f"experiment {experiment.slug!r} declared no limits; "
            "every run has them and an unqualified number is the failure mode this harness exists to prevent"
        )

    lines = [
        f"# {experiment.slug}",
        "",
        f"**질문** — {experiment.question}",
        "",
        f"실행 {prov['ran_at']} · commit `{prov['git_commit'] or '?'}`"
        + (" · ⚠️ **dirty tree** (커밋이 실행된 코드를 특정하지 못함)" if prov["git_dirty"] else "")
        + f" · {prov['platform']}",
    ]
    if prov.get("experiment_sha256"):
        lines.append(f"실험 스크립트 SHA-256 `{prov['experiment_sha256'][:16]}…`")

    lines += ["", "## 통제와 변수", "", "| | 항목 | 값 |", "|---|---|---|"]
    for key, value in experiment.controls.items():
        lines.append(f"| 통제 | `{key}` | {value} |")
    for key, value in experiment.variables.items():
        lines.append(f"| **변수** | `{key}` | **{value}** |")
    if len(experiment.variables) > 1:
        lines += [
            "",
            "> ⚠️ 변수가 둘 이상입니다. 어느 것이 결과를 만들었는지 이 실험만으로는 가를 수 없습니다.",
        ]

    if result.summary:
        lines += ["", "## 요약", "", result.summary]

    if result.tables:
        lines += ["", "## 측정"]
        for table in result.tables:
            lines += ["", _table_md(table)]

    if result.findings:
        lines += ["", "## 발견", ""]
        for i, finding in enumerate(result.findings, 1):
            lines.append(f"{i}. **[{finding.confidence}]** {finding.claim}")
            lines.append(f"   - 근거: {finding.evidence}")

    lines += ["", "## 한계", ""]
    lines += [f"- {limit}" for limit in result.limits]
    lines += ["", "---", "", "생성: `experiments/harness.py`. 재현은 위 통제·변수와 commit 기준."]
    return "\n".join(lines) + "\n"


def run_experiment(experiment: Experiment, results_dir: Path | None = None) -> Path:
    """Run it, write ``report.md`` + ``provenance.json`` + ``raw/data.json``."""
    base = results_dir or RESULTS_DIR
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    out = base / f"{stamp}-{experiment.slug}"

    result = experiment.run()
    prov = provenance_for(experiment)
    # Render BEFORE creating the directory so a result that cannot honestly be
    # reported leaves no half-written run behind.
    report = render_report(experiment, result, prov)

    (out / "raw").mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(report, encoding="utf-8")
    (out / "provenance.json").write_text(
        json.dumps(prov, ensure_ascii=False, indent=2, default=str), encoding="utf-8"
    )
    (out / "raw" / "data.json").write_text(
        json.dumps(result.raw, ensure_ascii=False, indent=2, default=str), encoding="utf-8"
    )
    return out


__all__ = [
    "Experiment",
    "ExperimentError",
    "ExperimentResult",
    "Finding",
    "RESULTS_DIR",
    "Table",
    "provenance_for",
    "render_report",
    "run_experiment",
]
