import copy
import unittest

from mythos_runtime.route_content import validate_route_content
from mythos_runtime.scenario import load_scenario


class RouteContentContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.route_map = copy.deepcopy(load_scenario("neo-seoul").route_map)

    def _codes(self, route_map: dict) -> list[str]:
        return [issue.code for issue in validate_route_content(route_map)]

    def test_live_scenario_is_causally_valid(self) -> None:
        self.assertEqual(validate_route_content(self.route_map), [])

    def test_deleting_scene_producer_breaks_dependent_gate(self) -> None:
        self.route_map["layers"][1]["anchors"] = []
        issues = validate_route_content(self.route_map)
        self.assertIn("gate_without_prior_producer", [issue.code for issue in issues])
        self.assertTrue(any("lin_yue_deal" in issue.detail for issue in issues))

    def test_self_produced_selector_is_rejected(self) -> None:
        perspective = self.route_map["layers"][1]["anchors"][0]["perspectives"][1]
        perspective["when"] = ["night_market_debt"]
        self.assertIn("perspective_without_prior_selector", self._codes(self.route_map))

    def test_duplicate_beat_is_rejected(self) -> None:
        duplicate = copy.deepcopy(self.route_map["layers"][0]["anchors"][0])
        self.route_map["layers"][1]["anchors"].append(duplicate)
        self.assertIn("beat_duplicate", self._codes(self.route_map))

    def test_bad_default_perspective_is_rejected(self) -> None:
        self.route_map["layers"][0]["anchors"][0]["default_perspective"] = "missing"
        self.assertIn("default_perspective_missing", self._codes(self.route_map))

    def test_well_formed_scene_can_be_added(self) -> None:
        added = {
            "type": "event",
            "beat": "new_authored_scene",
            "title": "New Authored Scene",
            "default_perspective": "p_default",
            "perspectives": [
                {
                    "id": "p_default",
                    "when": [],
                    "effect": {"flags": ["new_scene_seen"]},
                }
            ],
        }
        self.route_map["layers"][2]["anchors"].append(added)
        self.assertEqual(validate_route_content(self.route_map), [])


if __name__ == "__main__":
    unittest.main()
