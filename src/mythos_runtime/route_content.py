"""Authoring-time contract for route scenes and their flag dependencies.

Route scenes form a causal program: entry effects and selected perspectives
produce flags, while later scene gates consume them. A plain "referenced
somewhere" check misses self- and forward-dependencies, so this module validates
the program in layer order before any random route is built.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ENGINE_ROUTE_FLAGS = frozenset({"met_se_rin", "refused_se_rin"})
NARRATIVE_ROUTE_FLAGS = frozenset(
    {
        "safety_first",
        "stability_focus",
        "dominance_focus",
        "insight_focus",
        "humanity_first",
        "destruction_will",
        "abandoned_citizen",
        "control_net_lockdown",
        "lin_yue_debt_due",
        "no_kai",
        "optimization_log_stolen",
        "rx09_extracted",
    }
)


@dataclass(frozen=True)
class RouteContentIssue:
    code: str
    path: str
    detail: str

    def __str__(self) -> str:
        return f"{self.code} at {self.path}: {self.detail}"


def _flag_list(value: Any) -> set[str]:
    return {str(flag) for flag in value} if isinstance(value, list) else set()


def _effect_flags(value: Any) -> set[str]:
    if not isinstance(value, dict):
        return set()
    return _flag_list(value.get("flags"))


def validate_route_content(route_map: Any) -> list[RouteContentIssue]:
    """Return causal/schema issues for a raw ``scenario.json`` route map."""

    if not isinstance(route_map, dict) or not route_map:
        return []
    layers = route_map.get("layers")
    if not isinstance(layers, list):
        return [RouteContentIssue("layers_invalid", "route_map.layers", "expected a list")]

    issues: list[RouteContentIssue] = []
    seen_beats: dict[str, str] = {}
    # Narrative flags may select a perspective, but only engine or reachable
    # authored effects may satisfy a hard route gate.
    causal = set(ENGINE_ROUTE_FLAGS | NARRATIVE_ROUTE_FLAGS)
    authored = set(ENGINE_ROUTE_FLAGS)

    for layer_index, layer in enumerate(layers):
        if not isinstance(layer, dict):
            issues.append(
                RouteContentIssue(
                    "layer_invalid", f"route_map.layers[{layer_index}]", "expected an object"
                )
            )
            continue
        anchors = layer.get("anchors", []) or []
        if not isinstance(anchors, list):
            issues.append(
                RouteContentIssue(
                    "anchors_invalid",
                    f"route_map.layers[{layer_index}].anchors",
                    "expected a list",
                )
            )
            continue

        # A sibling in the same layer cannot produce a gate for another sibling.
        layer_causal_additions: set[str] = set()
        layer_authored_additions: set[str] = set()
        for anchor_index, anchor in enumerate(anchors):
            path = f"route_map.layers[{layer_index}].anchors[{anchor_index}]"
            if not isinstance(anchor, dict):
                issues.append(RouteContentIssue("anchor_invalid", path, "expected an object"))
                continue
            beat = str(anchor.get("beat") or "").strip()
            if not beat:
                issues.append(
                    RouteContentIssue("beat_missing", path, "anchor requires a stable beat id")
                )
            elif beat in seen_beats:
                issues.append(
                    RouteContentIssue(
                        "beat_duplicate",
                        f"{path}.beat",
                        f"{beat!r} already declared at {seen_beats[beat]}",
                    )
                )
            else:
                seen_beats[beat] = f"{path}.beat"

            gates = _flag_list(anchor.get("gate"))
            missing_gates = gates - authored
            for flag in sorted(missing_gates):
                issues.append(
                    RouteContentIssue(
                        "gate_without_prior_producer",
                        f"{path}.gate",
                        f"{flag!r} has no engine/authored producer in an earlier layer",
                    )
                )
            reachable = not missing_gates
            entry_flags = _effect_flags(anchor.get("effect")) if reachable else set()
            local_causal = causal | entry_flags
            if reachable:
                layer_authored_additions.update(entry_flags)
                layer_causal_additions.update(entry_flags)

            perspectives = anchor.get("perspectives", []) or []
            if not isinstance(perspectives, list):
                issues.append(
                    RouteContentIssue(
                        "perspectives_invalid", f"{path}.perspectives", "expected a list"
                    )
                )
                continue
            ids = [str(p.get("id") or "") for p in perspectives if isinstance(p, dict)]
            if len(ids) != len(set(ids)):
                issues.append(
                    RouteContentIssue(
                        "perspective_id_duplicate",
                        f"{path}.perspectives",
                        "perspective ids must be unique within a scene",
                    )
                )
            default_id = str(anchor.get("default_perspective") or "")
            if perspectives and default_id not in ids:
                issues.append(
                    RouteContentIssue(
                        "default_perspective_missing",
                        f"{path}.default_perspective",
                        f"{default_id!r} does not reference a declared perspective id",
                    )
                )

            for perspective_index, perspective in enumerate(perspectives):
                p_path = f"{path}.perspectives[{perspective_index}]"
                if not isinstance(perspective, dict):
                    issues.append(
                        RouteContentIssue("perspective_invalid", p_path, "expected an object")
                    )
                    continue
                perspective_id = str(perspective.get("id") or "")
                when = _flag_list(perspective.get("when"))
                selectable = reachable and (
                    perspective_id == default_id or not when or bool(when & local_causal)
                )
                if reachable and not selectable:
                    issues.append(
                        RouteContentIssue(
                            "perspective_without_prior_selector",
                            f"{p_path}.when",
                            "none of the selector flags can exist before this perspective resolves",
                        )
                    )
                    continue
                if selectable:
                    produced = _effect_flags(perspective.get("effect"))
                    layer_authored_additions.update(produced)
                    layer_causal_additions.update(produced)

        authored.update(layer_authored_additions)
        causal.update(layer_causal_additions)

    return issues


def assert_route_content_valid(route_map: Any, *, scenario_id: str) -> None:
    issues = validate_route_content(route_map)
    if issues:
        rendered = "\n".join(f"- {issue}" for issue in issues)
        raise ValueError(f"Invalid route content for scenario {scenario_id!r}:\n{rendered}")


def main(argv: list[str] | None = None) -> int:
    """Validate every scenario file for authoring/CI workflows."""

    parser = argparse.ArgumentParser(description="Validate MythOS route scene content")
    parser.add_argument("root", nargs="?", default="resources", help="scenario resources root")
    args = parser.parse_args(argv)
    failures: list[str] = []
    checked = 0
    for path in sorted(Path(args.root).glob("*/scenario.json")):
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        checked += 1
        for issue in validate_route_content(data.get("route_map", {})):
            failures.append(f"{path}: {issue}")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"route content valid: {checked} scenario(s)")
    return 0


__all__ = [
    "ENGINE_ROUTE_FLAGS",
    "NARRATIVE_ROUTE_FLAGS",
    "RouteContentIssue",
    "assert_route_content_valid",
    "validate_route_content",
]


if __name__ == "__main__":
    raise SystemExit(main())
