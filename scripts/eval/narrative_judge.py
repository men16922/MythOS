"""Narrative eval harness: golden loop transcripts → LLM-judge rubric scores.

Closes the trace→eval gap identified in
docs/reference/2026-07-17-anthropic-openai-agent-stacks.md §3-1: banked real-play
transcripts (scripts/eval/golden/*.json, exported by bank_loop.py) are scored by a
judge model against scripts/eval/RUBRIC.md, producing a per-transcript report that
backs the key-beat A/B verdict and gates future prompt/directive changes.

Usage:
    .venv/bin/python scripts/eval/narrative_judge.py               # development split
    .venv/bin/python scripts/eval/narrative_judge.py golden/x.json # non-promotion subset
    .venv/bin/python scripts/eval/narrative_judge.py --promotion \
        --metrics /path/to/promotion-metrics.json
    make eval-narrative

The judge engine is `claude -p` (same idiom as the overnight critic/image-judge
relays); override with EVAL_JUDGE_CMD (must accept the prompt as its last argv and
print the verdict JSON on stdout). Pure functions (load/validate, prompt assembly,
verdict parsing, report rendering) are import-safe and locked by
tests/test_narrative_eval.py without invoking any CLI.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

EVAL_DIR = Path(__file__).resolve().parent
GOLDEN_DIR = EVAL_DIR / "golden"
RUBRIC_PATH = EVAL_DIR / "RUBRIC.md"
SPLIT_PATH = EVAL_DIR / "SPLIT.json"
REPO_ROOT = EVAL_DIR.parents[1]

REQUIRED_TRANSCRIPT_KEYS = ("name", "scenario_id", "language", "scenes")
REQUIRED_SCENE_KEYS = ("turn_index", "title", "narration", "choices")
COMPANION_COMPLIANCE_VALUES = ("pass", "fail")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_split_paths(lane: str, split_path: Path = SPLIT_PATH) -> list[Path]:
    """Resolve and hash-check one frozen eval lane from SPLIT.json."""
    if lane not in {"development", "promotion"}:
        raise ValueError(f"unknown eval lane: {lane}")
    split = json.loads(split_path.read_text(encoding="utf-8"))
    entries = split.get(lane)
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"{split_path.name}: {lane} must be a non-empty list")
    paths: list[Path] = []
    eval_root = split_path.parent.resolve()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError(f"{split_path.name}: invalid {lane} entry")
        relative = entry.get("path")
        expected_hash = entry.get("sha256")
        if not isinstance(relative, str) or not isinstance(expected_hash, str):
            raise ValueError(f"{split_path.name}: {lane} entry needs path and sha256")
        path = (eval_root / relative).resolve()
        if not path.is_relative_to(eval_root):
            raise ValueError(f"{split_path.name}: path escapes eval directory: {relative}")
        if not path.is_file():
            raise ValueError(f"{split_path.name}: missing frozen sample: {relative}")
        actual_hash = _sha256(path)
        if actual_hash != expected_hash:
            raise ValueError(
                f"{split_path.name}: frozen sample hash drift: {relative} "
                f"expected={expected_hash} actual={actual_hash}"
            )
        paths.append(path)
    return paths


def load_promotion_metrics(path: Path, expected_names: set[str]) -> dict[str, Any]:
    """Validate score companion metrics required for a promotion-only run."""
    metrics = json.loads(path.read_text(encoding="utf-8"))
    samples = metrics.get("samples")
    if not isinstance(samples, dict) or set(samples) != expected_names:
        raise ValueError(
            f"{path.name}: samples must exactly match promotion bank {sorted(expected_names)}"
        )
    for name, sample in samples.items():
        if not isinstance(sample, dict):
            raise ValueError(f"{path.name}: {name} metrics must be an object")
        cost = sample.get("cost_per_loop_usd")
        if not isinstance(cost, (int, float)) or isinstance(cost, bool) or cost < 0:
            raise ValueError(f"{path.name}: {name} needs non-negative cost_per_loop_usd")
        for field in ("repetition_compliance", "length_compliance"):
            if sample.get(field) not in COMPANION_COMPLIANCE_VALUES:
                raise ValueError(
                    f"{path.name}: {name}.{field} must be pass or fail"
                )
    return metrics


def load_golden(path: Path) -> dict[str, Any]:
    """Load + validate one golden transcript (raises ValueError on shape errors)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    missing = [k for k in REQUIRED_TRANSCRIPT_KEYS if k not in data]
    if missing:
        raise ValueError(f"{path.name}: missing keys {missing}")
    if not isinstance(data["scenes"], list) or not data["scenes"]:
        raise ValueError(f"{path.name}: scenes must be a non-empty list")
    for scene in data["scenes"]:
        scene_missing = [k for k in REQUIRED_SCENE_KEYS if k not in scene]
        if scene_missing:
            raise ValueError(
                f"{path.name}: scene turn={scene.get('turn_index', '?')} missing {scene_missing}"
            )
    return data


def _render_scene(scene: dict[str, Any]) -> str:
    lines = [f"### Turn {scene['turn_index']} — {scene['title']}"]
    if scene.get("location"):
        lines.append(f"장소: {scene['location']}")
    if scene.get("action_result"):
        lines.append(f"직전 행동 결과: {scene['action_result']}")
    lines.append(scene["narration"].strip())
    if scene["choices"]:
        lines.append("선택지: " + " / ".join(str(c) for c in scene["choices"]))
    return "\n".join(lines)


def build_judge_prompt(transcript: dict[str, Any], rubric: str) -> str:
    """Assemble the full judge prompt: role + rubric + transcript + output demand."""
    scenes = "\n\n".join(_render_scene(s) for s in transcript["scenes"])
    meta = (
        f"transcript={transcript['name']} · scenario={transcript['scenario_id']} · "
        f"language={transcript['language']} · scenes={len(transcript['scenes'])}"
        + (f" · note={transcript['note']}" if transcript.get("note") else "")
    )
    return (
        "You are a strict narrative-quality judge for Project MythOS (an AI-GM loop "
        "TRPG). Score the following play transcript against the rubric. Judge only "
        "what is in the transcript; do not invent context.\n\n"
        f"[META] {meta}\n\n=== RUBRIC ===\n{rubric}\n\n"
        f"=== TRANSCRIPT ===\n{scenes}\n\n"
        "=== OUTPUT ===\nReturn ONLY the raw JSON verdict object defined in the "
        "rubric's output contract. No markdown fences, no prose."
    )


def parse_verdict(raw: str) -> dict[str, Any]:
    """Parse the judge's verdict JSON (tolerates accidental code fences/prose tails)."""
    text = raw.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
    if fenced:
        text = fenced.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
    verdict = json.loads(text)
    if "scores" not in verdict or "overall" not in verdict:
        raise ValueError("verdict missing scores/overall")
    return verdict


def render_report(
    results: list[tuple[str, dict[str, Any]]],
    generated_at: str,
    companion_metrics: dict[str, Any] | None = None,
    provenance: dict[str, Any] | None = None,
) -> str:
    """Fold (name, verdict) pairs into a markdown report."""
    lines = [f"# Narrative eval report — {generated_at}", ""]
    if provenance is not None:
        # Up top, not in an appendix: a reader comparing this report against an
        # earlier one needs to know whether the judge or the rubric moved first.
        judge = " ".join(provenance.get("command") or []) or "?"
        lines.append(f"Judge: `{judge}`")
        if provenance.get("judge_version"):
            lines.append(f"Judge version: `{provenance['judge_version']}`")
        if provenance.get("rubric_sha256"):
            lines.append(f"Rubric SHA-256: `{provenance['rubric_sha256']}`")
        lines.append("")
    for name, verdict in results:
        scores = verdict.get("scores", {})
        score_str = " · ".join(f"{axis} {value}" for axis, value in scores.items())
        lines.append(f"## {name} — overall {verdict.get('overall', '?')}/5")
        lines.append(f"- {score_str}")
        if verdict.get("one_line"):
            lines.append(f"- 총평: {verdict['one_line']}")
        for issue in verdict.get("issues", []):
            lines.append(
                f"- [turn {issue.get('turn', '?')}] {issue.get('axis', '?')}: "
                f"“{issue.get('quote', '')}” — {issue.get('note', '')}"
            )
        lines.append("")
    if companion_metrics is not None:
        lines.extend(["## Promotion companion metrics", ""])
        samples = companion_metrics["samples"]
        for name, sample in samples.items():
            lines.append(
                f"- {name}: cost/loop ${sample['cost_per_loop_usd']:.4f} · "
                f"repetition {sample['repetition_compliance']} · "
                f"length {sample['length_compliance']}"
                + (f" · {sample['note']}" if sample.get("note") else "")
            )
        lines.append("")
    return "\n".join(lines)


def _judge_cmd(prompt: str) -> list[str]:
    override = os.environ.get("EVAL_JUDGE_CMD", "")
    if override:
        return [*shlex.split(override), prompt]
    return ["claude", "-p", prompt, "--permission-mode", "plan"]


def judge_provenance(rubric_path: Path = RUBRIC_PATH) -> dict[str, Any]:
    """Record what actually did the scoring, so score drift is attributable.

    On 2026-08-13 two hash-frozen, byte-identical transcripts scored 2/5 where
    they had scored 3/5 in July. Nothing in the run recorded which judge engine or
    which rubric text produced either number, so the drift could not be attributed
    to a model change, a rubric edit, or plain sampling noise. Both inputs are
    recorded here; the rubric is injected into the prompt verbatim, so its hash
    belongs in the record exactly as much as the engine does.

    This records; it does not stabilise. Whether to median over N runs, pin the
    engine, or drop the numeric gate is an owner decision (NEXT_PLAN).
    """
    # Filter the prompt out by sentinel rather than position: the override form
    # appends it last, but the default form puts it at index 2, so slicing the
    # tail silently records the wrong argv.
    sentinel = "\x00mythos-prompt-placeholder\x00"
    command = [arg for arg in _judge_cmd(sentinel) if arg != sentinel]
    provenance: dict[str, Any] = {
        "command": command,
        "judge_cmd_override": bool(os.environ.get("EVAL_JUDGE_CMD", "")),
        "rubric_sha256": _sha256(rubric_path) if rubric_path.is_file() else None,
    }
    # Best-effort: the engine may not exist (CI, a stubbed override) and must not
    # take the run down just because its version could not be read.
    try:
        proc = subprocess.run(
            [command[0], "--version"], capture_output=True, text=True, timeout=15
        )
        if proc.returncode == 0:
            provenance["judge_version"] = proc.stdout.strip()[:200] or None
    except (OSError, subprocess.SubprocessError):
        pass
    return provenance


def run(
    paths: list[Path], companion_metrics: dict[str, Any] | None = None
) -> int:
    rubric = RUBRIC_PATH.read_text(encoding="utf-8")
    results: list[tuple[str, dict[str, Any]]] = []
    for path in paths:
        transcript = load_golden(path)
        prompt = build_judge_prompt(transcript, rubric)
        print(f"judging {transcript['name']} ({len(transcript['scenes'])} scenes)…")
        proc = subprocess.run(
            _judge_cmd(prompt), capture_output=True, text=True, timeout=600
        )
        if proc.returncode != 0:
            print(f"  judge failed (rc={proc.returncode}): {proc.stderr[:300]}")
            return 1
        results.append((transcript["name"], parse_verdict(proc.stdout)))
    provenance = judge_provenance()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = REPO_ROOT / "outputs" / "evals" / stamp
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    report = render_report(results, stamp, companion_metrics, provenance)
    (out_dir / "report.md").write_text(report, encoding="utf-8")
    (out_dir / "verdicts.json").write_text(
        json.dumps(dict(results), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if companion_metrics is not None:
        (out_dir / "companion-metrics.json").write_text(
            json.dumps(companion_metrics, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    print(f"\n{report}\nreport → {out_dir / 'report.md'}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "paths",
        nargs="*",
        help="explicit non-promotion transcripts relative to scripts/eval",
    )
    parser.add_argument(
        "--promotion",
        action="store_true",
        help="score the frozen promotion bank for an explicit promotion decision",
    )
    parser.add_argument(
        "--metrics",
        type=Path,
        help="JSON companion metrics required with --promotion",
    )
    args = parser.parse_args(argv)

    promotion_paths = load_split_paths("promotion")
    companion_metrics: dict[str, Any] | None = None
    if args.promotion:
        if args.paths:
            parser.error("--promotion uses the frozen bank and does not accept paths")
        if args.metrics is None:
            parser.error("--promotion requires --metrics")
        paths = promotion_paths
        expected_names = {load_golden(path)["name"] for path in paths}
        companion_metrics = load_promotion_metrics(args.metrics, expected_names)
    elif args.paths:
        if args.metrics is not None:
            parser.error("--metrics is valid only with --promotion")
        paths = [
            Path(value) if Path(value).is_absolute() else EVAL_DIR / value
            for value in args.paths
        ]
        frozen = {path.resolve() for path in promotion_paths}
        selected_frozen = [path for path in paths if path.resolve() in frozen]
        if selected_frozen:
            names = ", ".join(path.name for path in selected_frozen)
            parser.error(
                f"promotion samples require --promotion and companion metrics: {names}"
            )
    else:
        if args.metrics is not None:
            parser.error("--metrics is valid only with --promotion")
        paths = load_split_paths("development")
    if not paths:
        print("no golden transcripts found — bank one with scripts/eval/bank_loop.py")
        return 1
    return run(paths, companion_metrics)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
