"""Route-label and chapter-goal completeness invariants (overnight QA seed, 2026-06-18).

Bot-checkable "doesn't break" guarantees for two player-facing surfaces whose
backing data was previously unguarded:

1. **Route destination meaning closure.** Junction choice labels are built as
   ``{title}(으)로 향한다 — {meaning}`` where ``meaning`` comes from
   ``session._ROUTE_TYPE_MEANING[node.type]`` (``_route_destination_meaning``).
   A node ``type`` with no entry silently falls through to a generic
   ``label``/"다음 지점", so a *new* route node type added to authored content
   would ship a meaningless junction label. This asserts every route node type
   the scenario can produce has an explicit player-facing meaning.

2. **Chapter-gate player_goal completeness.** ``session_design.chapter_gates[]``
   feeds the "이번 막" objective strip via ``serializers._chapter_goal``. A gate
   missing ``player_goal`` (or with a bogus phase / turn_range) would render the
   막-objective blank. ``test_content_integrity`` deliberately does NOT scan
   chapter_gates (they are prose, not structured flag consumers), so this is the
   only guard. Scenarios without chapter_gates are skipped (forward-compatible).

A violation is a concrete content bug to fix or surface as a Blocker, not a
flaky judgment call.
"""

import json
import unittest
from pathlib import Path
from typing import Any

from mythos_core.models import LoopPhase
from mythos_runtime.scenario_directives import available_opening_variants
from mythos_runtime.session import _ROUTE_TYPE_MEANING

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESOURCES = PROJECT_ROOT / "resources"


def _scenarios() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for path in sorted(RESOURCES.glob("*/scenario.json")):
        with path.open(encoding="utf-8") as handle:
            out[path.parent.name] = json.load(handle)
    return out


def _variant_goal_violations(ctx: str, gate: dict[str, Any], known: frozenset[str]) -> list[str]:
    """Violations in a gate's optional `player_goal_variants` map (S2, plan 2026-07-06 §2.4).

    Keys must be authored opening variants (`_opening_variant` can never hold
    anything else, so an unknown key is a dead override — typo or removed
    variant); values must be non-empty strings (a blank one silently falls back
    to the shared Se-rin `player_goal`)."""
    overrides = gate.get("player_goal_variants")
    if overrides is None:
        return []
    if not isinstance(overrides, dict):
        return [f"{ctx} player_goal_variants must be an object, got {type(overrides).__name__}."]
    violations: list[str] = []
    for vid, goal in overrides.items():
        if vid not in known:
            violations.append(
                f"{ctx} player_goal_variants key {vid!r} has no authored "
                f"directives/opening_{vid}.md — dead override (typo or removed variant)."
            )
        if not (isinstance(goal, str) and goal.strip()):
            violations.append(
                f"{ctx} player_goal_variants[{vid!r}] must be a non-empty string — an "
                f"empty override falls back to the shared player_goal."
            )
    return violations


class RouteDestinationMeaningTest(unittest.TestCase):
    """Every route node type the scenario can produce has a player-facing meaning."""

    def test_route_node_types_have_destination_meaning(self) -> None:
        checked = 0
        for scenario_id, data in _scenarios().items():
            route_map = data.get("route_map") or {}
            if not route_map:
                continue  # scenario does not use the procedural route map
            checked += 1
            types: set[str] = {str(t) for t in (route_map.get("node_types") or {})}
            for layer in route_map.get("layers", []) or []:
                for anchor in layer.get("anchors", []) or []:
                    node_type = anchor.get("type")
                    if isinstance(node_type, str) and node_type:
                        types.add(node_type)

            missing = sorted(t for t in types if t not in _ROUTE_TYPE_MEANING)
            self.assertEqual(
                missing,
                [],
                f"[{scenario_id}] route node type(s) {missing} have no entry in "
                f"session._ROUTE_TYPE_MEANING — their junction labels fall through to a "
                f"generic '다음 지점'. Add a player-facing meaning for each type (or drop "
                f"the unused type from route_map).",
            )
        self.assertGreater(checked, 0, "no scenario with a route_map was found to check")


class ChapterGoalCompletenessTest(unittest.TestCase):
    """Every authored chapter gate exposes a non-empty player_goal for the 막 strip."""

    def test_chapter_gates_have_player_goal(self) -> None:
        valid_phases = {phase.value for phase in LoopPhase}
        checked = 0
        for scenario_id, data in _scenarios().items():
            gates = (data.get("session_design") or {}).get("chapter_gates")
            if not gates:
                continue  # scenario does not author chapter gates
            checked += 1
            for index, gate in enumerate(gates):
                ctx = f"[{scenario_id}] chapter_gates[{index}] (phase={gate.get('phase')!r})"

                goal = gate.get("player_goal")
                self.assertTrue(
                    isinstance(goal, str) and goal.strip(),
                    f"{ctx} has no non-empty player_goal — the '이번 막' objective strip "
                    f"(serializers._chapter_goal) would render blank for this phase.",
                )

                phase = gate.get("phase")
                self.assertIn(
                    phase,
                    valid_phases,
                    f"{ctx} phase {phase!r} is not a LoopPhase ({sorted(valid_phases)}).",
                )

                turn_range = str(gate.get("turn_range", ""))
                self.assertRegex(
                    turn_range,
                    r"^\d+-\d+$",
                    f"{ctx} turn_range {turn_range!r} must be 'start-end' (e.g. '0-6').",
                )
        self.assertGreater(
            checked, 0, "no scenario with session_design.chapter_gates was found to check"
        )

    def test_player_goal_variants_are_valid(self) -> None:
        """`player_goal_variants` keys must be authored opening variants, values non-empty.

        A typo'd/dangling variant id would silently never resolve (the loop's
        `_opening_variant` only ever holds ids from `available_opening_variants`),
        so the variant loop would show the Se-rin goal again — the exact bug the
        variant-routed opening exists to fix."""
        for scenario_id, data in _scenarios().items():
            gates = (data.get("session_design") or {}).get("chapter_gates") or []
            known = available_opening_variants(scenario_id)
            for index, gate in enumerate(gates):
                ctx = f"[{scenario_id}] chapter_gates[{index}] (phase={gate.get('phase')!r})"
                self.assertEqual(_variant_goal_violations(ctx, gate, known), [])

    def test_variant_goal_guard_flags_bad_entries(self) -> None:
        """Guard-the-guard: the checker actually fires on the failure modes it exists for
        (currently no scenario authors player_goal_variants, so the scan above is vacuous
        until the S4 copy lands)."""
        known = frozenset({"tae_o", "kai"})
        self.assertEqual(_variant_goal_violations("[t]", {"player_goal": "g"}, known), [])
        self.assertEqual(
            _variant_goal_violations(
                "[t]", {"player_goal_variants": {"tae_o": "바리케이드"}}, known
            ),
            [],
        )
        bad_gate = {"player_goal_variants": {"tae_oh": "typo", "kai": "  ", "tae_o": None}}
        violations = _variant_goal_violations("[t]", bad_gate, known)
        self.assertEqual(len(violations), 3)
        self.assertTrue(any("tae_oh" in v for v in violations))
        self.assertEqual(
            len(_variant_goal_violations("[t]", {"player_goal_variants": ["g"]}, known)), 1
        )


if __name__ == "__main__":
    unittest.main()
