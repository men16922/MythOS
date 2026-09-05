#!/usr/bin/env python3
"""Select only actionable and sampled objective evidence for overnight-report.

The report skill consumes this module through one interface: ``build_review``.
All required failures, incomplete evidence, and actor/assertion disagreements are
returned; clean passes are deterministically sampled instead of dumped wholesale.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any

DEFAULT_SAMPLE_RATE = 0.20
DEFAULT_SAMPLE_CAP = 3


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _review_item(
    bundle_path: Path,
    bundle: dict[str, Any],
    verdict: dict[str, Any],
    reasons: list[str],
) -> dict[str, Any]:
    return {
        "run_id": str(bundle.get("run_id") or bundle_path.parent.name),
        "bundle": str(bundle_path),
        "outcome": str(verdict.get("outcome") or "(unknown)"),
        "objective_decision": str(bundle.get("decision") or "(unknown)"),
        "required_objectives": bundle.get("required_objectives", []),
        "reasons": reasons,
    }


def _classify(
    bundle_path: Path, bundle: dict[str, Any]
) -> tuple[str, dict[str, Any]]:
    verdict = _read_json(bundle_path.parent / "verdict.json") or {}
    required = bundle.get("required_objectives", [])
    if not isinstance(required, list) or not required:
        return "not_applicable", _review_item(bundle_path, bundle, verdict, [])

    assertions = bundle.get("assertions", [])
    assertion_by_id = {
        assertion.get("id"): assertion
        for assertion in assertions
        if isinstance(assertion, dict) and assertion.get("required") is True
    }
    reasons: list[str] = []
    for objective_id in required:
        assertion = assertion_by_id.get(objective_id)
        if assertion is None:
            reasons.append(f"missing required assertion: {objective_id}")
            continue
        status = assertion.get("status")
        if status != "pass":
            reasons.append(f"{objective_id}={status}: {assertion.get('reason', '')}")

    objective_decision = str(bundle.get("decision") or "")
    actor_verdict = str(verdict.get("requested_verdict") or "")
    validated_outcome = str(verdict.get("outcome") or "")
    if objective_decision in {"fail", "needs_human"} and not reasons:
        reasons.append(f"objective decision={objective_decision}")
    if validated_outcome in {"FAIL_EVIDENCE", "NEEDS_HUMAN"}:
        reasons.append(f"validated outcome={validated_outcome}")

    actor_positive = actor_verdict == "PASS_CANDIDATE"
    assertion_positive = objective_decision == "pass"
    actor_negative = actor_verdict in {"FAIL_EVIDENCE", "NEEDS_HUMAN"}
    if (actor_positive and not assertion_positive) or (actor_negative and assertion_positive):
        reasons.append(
            f"actor/assertion disagreement: actor={actor_verdict}, assertions={objective_decision}"
        )

    item = _review_item(bundle_path, bundle, verdict, list(dict.fromkeys(reasons)))
    if reasons:
        return "attention", item
    if objective_decision == "pass" and validated_outcome == "PASS_CANDIDATE":
        return "clean", item
    item["reasons"] = [
        f"unclassified required evidence: outcome={validated_outcome}, decision={objective_decision}"
    ]
    return "attention", item


def build_review(
    evidence_root: Path,
    *,
    sample_rate: float = DEFAULT_SAMPLE_RATE,
    sample_cap: int = DEFAULT_SAMPLE_CAP,
    seed: str = "mythos-objective-evidence-v1",
) -> dict[str, Any]:
    """Return actionable evidence plus a deterministic sample of clean passes."""

    if not 0 <= sample_rate <= 1:
        raise ValueError("sample_rate must be between 0 and 1")
    if sample_cap < 0:
        raise ValueError("sample_cap must be non-negative")

    attention: list[dict[str, Any]] = []
    clean: list[dict[str, Any]] = []
    not_applicable = 0
    invalid = 0
    for bundle_path in sorted(evidence_root.glob("*/evidence-bundle.json")):
        bundle = _read_json(bundle_path)
        if bundle is None:
            invalid += 1
            attention.append(
                {
                    "run_id": bundle_path.parent.name,
                    "bundle": str(bundle_path),
                    "outcome": "(invalid)",
                    "objective_decision": "(invalid)",
                    "required_objectives": [],
                    "reasons": ["invalid evidence-bundle.json"],
                }
            )
            continue
        classification, item = _classify(bundle_path, bundle)
        if classification == "attention":
            attention.append(item)
        elif classification == "clean":
            clean.append(item)
        else:
            not_applicable += 1

    sample_count = 0
    if clean and sample_rate > 0 and sample_cap > 0:
        sample_count = min(sample_cap, max(1, math.ceil(len(clean) * sample_rate)))
    ranked = sorted(
        clean,
        key=lambda item: hashlib.sha256(
            f"{seed}:{item['run_id']}".encode()
        ).hexdigest(),
    )
    sample = ranked[:sample_count]
    return {
        "schema_version": 1,
        "policy": {
            "attention": "all fail, needs_human, incomplete, invalid, and disagreement bundles",
            "clean_sample_rate": sample_rate,
            "clean_sample_min": 1 if sample_rate > 0 and sample_cap > 0 else 0,
            "clean_sample_cap": sample_cap,
            "seed": seed,
        },
        "counts": {
            "attention": len(attention),
            "clean": len(clean),
            "sampled_clean": len(sample),
            "omitted_clean": len(clean) - len(sample),
            "not_applicable": not_applicable,
            "invalid": invalid,
        },
        "attention": attention,
        "sample": sample,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("outputs/live-qa"))
    parser.add_argument("--sample-rate", type=float, default=DEFAULT_SAMPLE_RATE)
    parser.add_argument("--sample-cap", type=int, default=DEFAULT_SAMPLE_CAP)
    parser.add_argument("--seed", default="mythos-objective-evidence-v1")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    review = build_review(
        args.root,
        sample_rate=args.sample_rate,
        sample_cap=args.sample_cap,
        seed=args.seed,
    )
    print(json.dumps(review, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
