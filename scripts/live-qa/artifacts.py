#!/usr/bin/env python3
"""Prepare and validate evidence for an AGY-driven MythOS live-QA run.

This module has NO browser dependency. It only prepares the run manifest, waits
for the API to come up, and — after AGY has driven the browser itself — validates
the captured evidence and classifies a machine-readable outcome.

Outcome contract (consumed by scripts/overnight/browser-qa.sh, plan
bin/docs/plans/2026-06-21-overnight-auto-agy-qa.md §10):

    PASS_CANDIDATE  evidence complete, AGY browser verdict positive   exit 0
    SKIP            AGY decided no browser-observable behavior         exit 0
    FAIL_EVIDENCE   AGY found a fatal regression with evidence         exit 4
    NEEDS_HUMAN     evidence incomplete / ambiguous / tool failure     exit 5

`decide_outcome` is a pure function so the fixture matrix can classify fake AGY
transcripts without a browser, API, or git.
"""

from __future__ import annotations

import argparse
import hashlib
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
    objectives: str = "",
) -> int:
    required_objectives = [
        objective.strip() for objective in objectives.split(",") if objective.strip()
    ]
    output_dir.mkdir(parents=True, exist_ok=False)
    (output_dir / "screenshots").mkdir()
    write_json(
        output_dir / "manifest.json",
        {
            "schema_version": 3,
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
            "required_objectives": required_objectives,
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


OBJECTIVE_IDS = (
    "image_arrival",
    "companion_join",
    "party_distribution",
    "cutscene_cardinality_return",
    "choice_arrival",
    "first_use_gloss",
    "route_axis_chip",
)


# Independent re-encoding of the §2 value-axis chip policy (2026-07-19 fix:
# junction chips derive from the destination node, never keyword heuristics).
# Deliberately NOT imported from mythos_api/mythos_runtime — the evaluator is
# double-entry bookkeeping: if the serializer policy regresses, the mirror here
# disagrees and the assertion fails instead of both drifting together. KO labels
# only; the actor is instructed to run with lang=ko.
_ROUTE_AXIS_CHIP = {
    "people": "사람 돕기",
    "evidence": "단서 찾기",
    "safety": "안전하게 가기",
    "control": "밀고 나가기",
}
_ROUTE_TYPE_AXIS_POLICY = {
    "clue": "evidence",
    "rest": "safety",
    "patrol": "safety",
    "combat": "control",
}


def _expected_route_chip(
    node: Any, flags: list[str] | tuple[str, ...]
) -> tuple[str | None, bool]:
    """Expected KO chip for a junction destination, and whether it was computable.

    Anchors (nodes with perspectives) answer with the perspective that flag
    scoring would select (highest |when ∩ flags|; zero/tie prefers the authored
    ``default_perspective``); waypoints answer with the authored ``axis`` or the
    type policy. ``(None, True)`` means "no chip should render" (market/event).
    ``(None, False)`` means the recorded node data is unusable.
    """
    if not isinstance(node, dict):
        return None, False
    perspectives = node.get("perspectives")
    if isinstance(perspectives, list) and perspectives:
        if not all(isinstance(p, dict) for p in perspectives):
            return None, False
        flag_set = {str(flag) for flag in flags}
        best_score, best, tied = -1, None, False
        for perspective in perspectives:
            when = perspective.get("when") or []
            score = len({str(w) for w in when} & flag_set)
            if score > best_score:
                best_score, best, tied = score, perspective, False
            elif score == best_score:
                tied = True
        chosen = best
        default_id = node.get("default_perspective")
        if default_id and (best_score <= 0 or tied):
            chosen = next(
                (p for p in perspectives if p.get("id") == default_id), best
            )
        axis = chosen.get("axis") if isinstance(chosen, dict) else None
        return (_ROUTE_AXIS_CHIP.get(axis) if isinstance(axis, str) else None), True
    authored = node.get("axis")
    if isinstance(authored, str) and authored in _ROUTE_AXIS_CHIP:
        return _ROUTE_AXIS_CHIP[authored], True
    node_type = node.get("type")
    if not isinstance(node_type, str) or not node_type:
        return None, False
    axis = _ROUTE_TYPE_AXIS_POLICY.get(node_type)
    return (_ROUTE_AXIS_CHIP[axis] if axis else None), True


def _event_ref(event: dict[str, Any]) -> dict[str, Any]:
    return {
        key: event[key]
        for key in ("turn", "scene_id", "screenshot")
        if event.get(key) not in (None, "")
    }


def evaluate_objectives(
    events: list[dict[str, Any]], required: list[str] | tuple[str, ...] = ()
) -> dict[str, Any]:
    """Evaluate the objective live-QA assertions from structured browser facts.

    The actor records facts under objective_evidence. An assertion passes only
    when enough evidence proves its whole invariant; incomplete coverage stays
    not_observed and cannot auto-close a required objective.
    """

    required_set = set(required)
    facts = [
        event.get("objective_evidence", {})
        if isinstance(event.get("objective_evidence"), dict)
        else {}
        for event in events
    ]

    def result(
        objective_id: str,
        status: str,
        reason: str,
        indexes: list[int] | tuple[int, ...] = (),
    ) -> dict[str, Any]:
        return {
            "id": objective_id,
            "required": objective_id in required_set,
            "status": status,
            "reason": reason,
            "evidence": [_event_ref(events[index]) for index in indexes],
        }

    assertions: list[dict[str, Any]] = []

    image_rows = [
        (index, value["image"])
        for index, value in enumerate(facts)
        if isinstance(value.get("image"), dict)
        and value["image"].get("status") is not None
    ]
    if len(image_rows) < 2:
        assertions.append(result("image_arrival", "not_observed", "need at least two image-bearing turns"))
    else:
        known = {"loaded", "missing", "pending", "timeout", "error"}
        invalid = [
            (index, str(image.get("status")))
            for index, image in image_rows
            if str(image.get("status")).lower() not in known
        ]
        bad_indexes = [
            index
            for index, image in image_rows
            if str(image.get("status")).lower() in {"timeout", "error"}
        ]
        consecutive_missing: list[int] = []
        for left, right in zip(image_rows, image_rows[1:]):
            left_missing = str(left[1].get("status")).lower() in {"missing", "pending"}
            right_missing = str(right[1].get("status")).lower() in {"missing", "pending"}
            if left_missing and right_missing:
                consecutive_missing.extend((left[0], right[0]))
        if invalid:
            assertions.append(
                result(
                    "image_arrival",
                    "inconclusive",
                    f"unknown image status: {invalid[0][1]}",
                    [invalid[0][0]],
                )
            )
        elif bad_indexes or consecutive_missing:
            refs = sorted(set(bad_indexes + consecutive_missing))
            assertions.append(
                result(
                    "image_arrival",
                    "fail",
                    "image errored/timed out or was absent on consecutive turns",
                    refs,
                )
            )
        else:
            assertions.append(
                result(
                    "image_arrival",
                    "pass",
                    "no image error and no consecutive missing-image turns",
                    [index for index, _ in image_rows],
                )
            )

    recruit_rows = [
        (index, value["party"])
        for index, value in enumerate(facts)
        if isinstance(value.get("party"), dict)
        and value["party"].get("recruit_trigger")
    ]
    if not recruit_rows:
        assertions.append(result("companion_join", "not_observed", "no companion recruit trigger observed"))
    else:
        join_failures: list[int] = []
        join_incomplete = False
        join_refs: list[int] = []
        for trigger_index, party in recruit_rows:
            companion = str(party["recruit_trigger"])
            later = [
                (index, later_fact["party"])
                for index, later_fact in enumerate(facts[trigger_index:], trigger_index)
                if isinstance(later_fact.get("party"), dict)
                and isinstance(later_fact["party"].get("controllable_members"), list)
            ]
            if not later:
                join_incomplete = True
                join_refs.append(trigger_index)
                continue
            observed_index, observed_party = later[-1]
            join_refs.extend((trigger_index, observed_index))
            members = {str(member) for member in observed_party["controllable_members"]}
            if companion not in members:
                join_failures.append(observed_index)
        if join_failures:
            assertions.append(
                result(
                    "companion_join",
                    "fail",
                    "recruited companion missing from a later controllable party",
                    sorted(set(join_refs + join_failures)),
                )
            )
        elif join_incomplete:
            assertions.append(
                result(
                    "companion_join",
                    "not_observed",
                    "recruit trigger observed but no later controllable-party snapshot",
                    sorted(set(join_refs)),
                )
            )
        else:
            assertions.append(
                result(
                    "companion_join",
                    "pass",
                    "every observed recruit appears in a later controllable party",
                    sorted(set(join_refs)),
                )
            )

    distribution_rows = [
        (index, value["party"])
        for index, value in enumerate(facts)
        if isinstance(value.get("party"), dict)
        and isinstance(value["party"].get("expected_members"), list)
        and isinstance(value["party"].get("controllable_members"), list)
    ]
    if not distribution_rows:
        assertions.append(
            result("party_distribution", "not_observed", "no expected/controllable party snapshot observed")
        )
    else:
        mismatches: list[int] = []
        for index, party in distribution_rows:
            expected = [str(member) for member in party["expected_members"]]
            actual = [str(member) for member in party["controllable_members"]]
            if len(actual) != len(set(actual)) or set(expected) != set(actual):
                mismatches.append(index)
        assertions.append(
            result(
                "party_distribution",
                "fail" if mismatches else "pass",
                (
                    "controllable party differs from expected state or contains duplicates"
                    if mismatches
                    else "controllable party exactly matches expected state"
                ),
                mismatches or [index for index, _ in distribution_rows],
            )
        )

    cutscene_rows = [
        (index, value["cutscene"])
        for index, value in enumerate(facts)
        if isinstance(value.get("cutscene"), dict) and value["cutscene"].get("id")
    ]
    enter_rows = [
        (index, cutscene)
        for index, cutscene in cutscene_rows
        if cutscene.get("phase") == "enter"
    ]
    if not enter_rows:
        assertions.append(
            result("cutscene_cardinality_return", "not_observed", "no cutscene entry observed")
        )
    else:
        cutscene_failures: list[int] = []
        cutscene_incomplete = False
        cutscene_refs: list[int] = []
        ids = [str(cutscene["id"]) for _, cutscene in enter_rows]
        for cutscene_id in set(ids):
            matching_enters = [
                (index, cutscene)
                for index, cutscene in enter_rows
                if str(cutscene["id"]) == cutscene_id
            ]
            cutscene_refs.extend(index for index, _ in matching_enters)
            if len(matching_enters) != 1:
                cutscene_failures.extend(index for index, _ in matching_enters)
                continue
            enter_index, enter = matching_enters[0]
            returns = [
                (index, cutscene)
                for index, cutscene in cutscene_rows
                if index > enter_index
                and str(cutscene["id"]) == cutscene_id
                and cutscene.get("phase") == "return"
            ]
            if not returns:
                cutscene_incomplete = True
                continue
            return_index, returned = returns[0]
            cutscene_refs.append(return_index)
            expected_scene = enter.get("expected_return_scene_id")
            if not expected_scene or returned.get("scene_id") != expected_scene:
                cutscene_failures.append(return_index)
        if cutscene_failures:
            assertions.append(
                result(
                    "cutscene_cardinality_return",
                    "fail",
                    "cutscene repeated or returned to the wrong scene",
                    sorted(set(cutscene_refs + cutscene_failures)),
                )
            )
        elif cutscene_incomplete:
            assertions.append(
                result(
                    "cutscene_cardinality_return",
                    "not_observed",
                    "cutscene entry observed without a return checkpoint",
                    sorted(set(cutscene_refs)),
                )
            )
        else:
            assertions.append(
                result(
                    "cutscene_cardinality_return",
                    "pass",
                    "each cutscene appeared once and returned to its declared scene",
                    sorted(set(cutscene_refs)),
                )
            )

    choice_rows = [
        (index, value["choice"])
        for index, value in enumerate(facts)
        if isinstance(value.get("choice"), dict)
    ]
    if len(choice_rows) < 2:
        assertions.append(result("choice_arrival", "not_observed", "need at least two choice checkpoints"))
    else:
        choice_failures = [
            index
            for index, choice in choice_rows
            if choice.get("status") != "visible"
            or not isinstance(choice.get("wait_ms"), (int, float))
            or choice["wait_ms"] > 30_000
            or choice.get("reload_required") is not False
        ]
        assertions.append(
            result(
                "choice_arrival",
                "fail" if choice_failures else "pass",
                (
                    "choice missing, late, or required a reload"
                    if choice_failures
                    else "choices arrived within 30 seconds without reload"
                ),
                choice_failures or [index for index, _ in choice_rows],
            )
        )

    gloss_rows = [
        (index, value["gloss"])
        for index, value in enumerate(facts)
        if isinstance(value.get("gloss"), dict)
        and isinstance(value["gloss"].get("mentioned_terms"), list)
        and isinstance(value["gloss"].get("visible_terms"), list)
    ]
    if not gloss_rows:
        assertions.append(result("first_use_gloss", "not_observed", "no term-gloss evidence observed"))
    else:
        mentions: dict[str, list[int]] = {}
        visible_by_index: dict[int, set[str]] = {}
        gloss_failures: list[int] = []
        for index, gloss in gloss_rows:
            mentioned = {str(term) for term in gloss["mentioned_terms"]}
            visible = {str(term) for term in gloss["visible_terms"]}
            visible_by_index[index] = visible
            if visible - mentioned:
                gloss_failures.append(index)
            for term in mentioned:
                mentions.setdefault(term, []).append(index)
        repeated = {term: indexes for term, indexes in mentions.items() if len(indexes) >= 2}
        for term, indexes in mentions.items():
            first, *rest = indexes
            if term not in visible_by_index[first]:
                gloss_failures.append(first)
            if any(term in visible_by_index[index] for index in rest):
                gloss_failures.extend(index for index in rest if term in visible_by_index[index])
        if gloss_failures:
            assertions.append(
                result(
                    "first_use_gloss",
                    "fail",
                    "gloss missing on first mention, repeated later, or shown for an unmentioned term",
                    sorted(set(gloss_failures)),
                )
            )
        elif not repeated:
            assertions.append(
                result(
                    "first_use_gloss",
                    "not_observed",
                    "first mention observed but no repeated mention proves one-time behavior",
                    [index for index, _ in gloss_rows],
                )
            )
        else:
            refs = sorted({index for indexes in repeated.values() for index in indexes})
            assertions.append(
                result(
                    "first_use_gloss",
                    "pass",
                    "gloss appears on first mention only and does not repeat",
                    refs,
                )
            )

    route_rows = [
        (index, value["route_axis"])
        for index, value in enumerate(facts)
        if isinstance(value.get("route_axis"), dict)
        and isinstance(value["route_axis"].get("options"), list)
    ]
    junction_rows = [
        (index, route_axis)
        for index, route_axis in route_rows
        if len(route_axis["options"]) >= 2
    ]
    if not junction_rows:
        assertions.append(
            result(
                "route_axis_chip",
                "not_observed",
                "no junction checkpoint with at least two route options observed",
            )
        )
    else:
        chip_failures: list[int] = []
        chip_invalid: list[int] = []
        verified_chips = 0
        for index, route_axis in junction_rows:
            raw_flags = route_axis.get("flags")
            flags = (
                [str(flag) for flag in raw_flags] if isinstance(raw_flags, list) else []
            )
            for option in route_axis["options"]:
                if not isinstance(option, dict):
                    chip_invalid.append(index)
                    continue
                expected, computable = _expected_route_chip(option.get("node"), flags)
                if not computable:
                    chip_invalid.append(index)
                    continue
                chip = option.get("chip")
                observed = str(chip) if isinstance(chip, str) and chip.strip() else None
                if observed != expected:
                    chip_failures.append(index)
                elif expected is not None:
                    verified_chips += 1
        if chip_failures:
            assertions.append(
                result(
                    "route_axis_chip",
                    "fail",
                    "displayed value-axis chip contradicts the destination node's semantics",
                    sorted(set(chip_failures)),
                )
            )
        elif chip_invalid:
            assertions.append(
                result(
                    "route_axis_chip",
                    "inconclusive",
                    "route option recorded without usable destination node data",
                    sorted(set(chip_invalid)),
                )
            )
        elif verified_chips < 1:
            assertions.append(
                result(
                    "route_axis_chip",
                    "not_observed",
                    "junction observed but no chip-bearing option proves alignment",
                    [index for index, _ in junction_rows],
                )
            )
        else:
            assertions.append(
                result(
                    "route_axis_chip",
                    "pass",
                    "every junction chip matches its destination's authored semantics",
                    [index for index, _ in junction_rows],
                )
            )

    for objective_id in sorted(required_set - set(OBJECTIVE_IDS)):
        assertions.append(
            result(objective_id, "inconclusive", "unknown required objective assertion")
        )

    counts = {
        status: sum(assertion["status"] == status for assertion in assertions)
        for status in ("pass", "fail", "not_observed", "inconclusive")
    }
    return {
        "schema_version": 1,
        "required_objectives": list(required),
        "summary": counts,
        "assertions": assertions,
    }


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

    manifest_path = output_dir / "manifest.json"
    manifest: dict[str, Any] = {}
    if manifest_path.is_file():
        try:
            loaded_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(loaded_manifest, dict):
                manifest = loaded_manifest
        except (OSError, json.JSONDecodeError):
            event_errors.append("invalid manifest.json")
    raw_required = manifest.get("required_objectives", [])
    if not isinstance(raw_required, list) or not all(
        isinstance(objective, str) for objective in raw_required
    ):
        event_errors.append("manifest required_objectives must be a string list")
        required_objectives: list[str] = []
    else:
        required_objectives = raw_required

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
    objective_bundle = evaluate_objectives(events, required_objectives)
    required_results = [
        assertion
        for assertion in objective_bundle["assertions"]
        if assertion["required"]
    ]
    if not required_results:
        objective_decision = "not_required"
    elif any(assertion["status"] == "fail" for assertion in required_results):
        objective_decision = "fail"
    elif all(assertion["status"] == "pass" for assertion in required_results):
        objective_decision = "pass"
    else:
        objective_decision = "needs_human"

    if required_results and decision == "SKIP":
        outcome = "NEEDS_HUMAN"
        errors.append("required objective assertions cannot be skipped")
    elif outcome == "PASS_CANDIDATE":
        if objective_decision == "fail":
            outcome = "FAIL_EVIDENCE"
        elif objective_decision == "needs_human":
            outcome = "NEEDS_HUMAN"
            unresolved = [
                f"{assertion['id']}={assertion['status']}"
                for assertion in required_results
                if assertion["status"] != "pass"
            ]
            errors.append("required objective assertions unresolved: " + ", ".join(unresolved))

    def artifact(path: Path, artifact_type: str) -> dict[str, Any] | None:
        if not path.is_file():
            return None
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        try:
            ref = str(path.relative_to(output_dir))
        except ValueError:
            ref = str(path)
        return {
            "type": artifact_type,
            "ref": ref,
            "sha256": digest,
            "bytes": path.stat().st_size,
        }

    evidence_artifacts = [
        value
        for value in (
            artifact(output_dir / "events.jsonl", "browser-events"),
            artifact(output_dir / "console.log", "browser-console"),
            *(artifact(path, "screenshot") for path in screenshots),
        )
        if value is not None
    ]
    objective_bundle.update(
        {
            "run_id": output_dir.name,
            "created_at": utc_now(),
            "commit": manifest.get("commit", "(unknown)"),
            "checklist": manifest.get("checklist", "(unknown)"),
            "checklist_commit": manifest.get("checklist_commit", "(unknown)"),
            "decision": objective_decision,
            "artifacts": evidence_artifacts,
        }
    )
    evidence_path = output_dir / "evidence-bundle.json"
    write_json(evidence_path, objective_bundle)

    findings = parse_findings(raw)
    verdict_payload = {
        "schema_version": 3,
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
        "required_objectives": required_objectives,
        "objective_decision": objective_decision,
        "objective_summary": objective_bundle["summary"],
        "evidence_bundle": str(evidence_path),
    }
    write_json(output_dir / "verdict.json", verdict_payload)
    report = (
        "# AGY Live-QA Run\n\n"
        f"- Run: {output_dir.name}\n"
        f"- Browser actor: agy (tool {browser_tool})\n"
        f"- QA decision: {decision or '(unspecified)'}\n"
        f"- AGY verdict: {verdict or '(none)'}\n"
        f"- Validated outcome: {outcome}\n"
        f"- Events/screenshots: {len(events)}/{len(screenshots)}\n"
        f"- Required objectives: {required_objectives or 'none'}\n"
        f"- Objective decision: {objective_decision}\n"
        f"- Objective summary: {objective_bundle['summary']}\n"
        f"- Evidence bundle: {evidence_path}\n"
        f"- Validation errors: {errors or 'none'}\n\n"
        "## Raw AGY output\n\n"
        f"{raw.strip()}\n"
    )
    (output_dir / "report.md").write_text(report, encoding="utf-8")

    if manifest:
        manifest["ended_at"] = utc_now()
        manifest["status"] = "completed" if outcome in ("PASS_CANDIDATE", "SKIP") else "needs_review"
        manifest["browser_tool"] = browser_tool
        manifest["qa_decision"] = decision or "(unspecified)"
        manifest["outcome"] = outcome
        manifest["server_stopped"] = server_stopped
        manifest["validation_errors"] = errors
        manifest["objective_decision"] = objective_decision
        manifest["objective_summary"] = objective_bundle["summary"]
        manifest["evidence_bundle"] = str(evidence_path)
        write_json(manifest_path, manifest)

    print(f"LIVE_QA_OUTCOME: {outcome}")
    print(f"LIVE_QA_EVIDENCE: {evidence_path}")
    for finding in findings:
        print(
            f"QA_FINDING: {finding['severity']} | "
            f"{finding['area']} | {finding['detail']}"
        )
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
    prepare_parser.add_argument("--objectives", default="")

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
            objectives=args.objectives,
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
