from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "scripts" / "live-qa" / "prepare-objective-fixture.py"
SPEC = importlib.util.spec_from_file_location("live_qa_objective_fixture", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
fixture = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fixture)


def _state() -> dict:
    return {
        "flags": ["tutorial_loop", "met_han"],
        "relationships": {"han": 8},
        "_party": {"members": [{"id": "se_rin"}, {"id": "han"}]},
        "_route_map": {
            "nodes": {
                "opening": {"id": "opening", "layer": 0, "anchor": True},
                "han_meet": {
                    "id": "han_meet",
                    "layer": 1,
                    "beat": "side_han_meet",
                    "title": "Han joins",
                    "side_arc": True,
                },
                "transit": {"id": "transit", "layer": 1, "title": "Safe transit"},
            },
            "edges": {"opening": ["han_meet", "transit"]},
            "current": "opening",
            "visited": ["opening"],
            "relationship_tally": {"han": 1},
        },
    }


class ObjectiveFixtureStateTest(unittest.TestCase):
    def test_companion_fixture_is_one_transition_before_real_join(self) -> None:
        state, details = fixture.prepare_companion_state(_state())
        self.assertEqual(state["_route_map"]["current"], "opening")
        self.assertEqual(state["_route_map"]["preferred_next"], "han_meet")
        self.assertNotIn("met_han", state["flags"])
        self.assertNotIn("han", state["relationships"])
        self.assertEqual([member["id"] for member in state["_party"]["members"]], ["se_rin"])
        self.assertEqual(details["companion_id"], "han")

    def test_cutscene_fixture_uses_non_anchor_and_real_unlock_inputs(self) -> None:
        state, details = fixture.prepare_cutscene_state(_state())
        self.assertEqual(state["_route_map"]["current"], "transit")
        self.assertIn("ally_han", state["flags"])
        self.assertGreaterEqual(state["relationships"]["han"], 1)
        self.assertEqual(state["_seen_cutscenes"], [])
        self.assertEqual(details["expected_cutscene_id"], "HAN_DEAD_CHANNEL")


if __name__ == "__main__":
    unittest.main()
