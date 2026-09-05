import unittest
from typing import Any

from mythos_runtime.route_map import build_route_map, route_map_paths_summary
from mythos_runtime.scenario import load_scenario


def _rm(config: dict[str, Any] | None, seed: str) -> dict[str, Any]:
    """build_route_map for known-valid configs in tests — asserts the non-None result."""
    out = build_route_map(config, seed)
    assert out is not None
    return out


class RouteMapTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = load_scenario("neo-seoul").route_map

    def test_returns_none_without_config(self) -> None:
        self.assertIsNone(build_route_map(None, "seed"))
        self.assertIsNone(build_route_map({}, "seed"))
        self.assertIsNone(build_route_map({"node_types": {"story": {}}}, "seed"))

    def test_deterministic_for_same_seed(self) -> None:
        a = _rm(self.config, "loop-seed-1")
        b = _rm(self.config, "loop-seed-1")
        self.assertEqual(a, b)

    def test_different_seeds_can_diverge(self) -> None:
        seeds = [_rm(self.config, f"seed-{i}") for i in range(8)]
        type_signatures = {
            tuple(rm["nodes"][n]["type"] for layer in rm["layers"] for n in layer) for rm in seeds
        }
        self.assertGreater(len(type_signatures), 1)

    def test_starts_on_story_anchor_ends_on_boss(self) -> None:
        rm = _rm(self.config, "seed")
        start = rm["nodes"][rm["current"]]
        boss = rm["nodes"][rm["layers"][-1][0]]
        self.assertEqual(start["type"], "story")
        self.assertTrue(start["anchor"])
        self.assertEqual(boss["type"], "boss")

    def test_anchors_carry_authored_resources(self) -> None:
        rm = _rm(self.config, "seed")
        start = rm["nodes"][rm["current"]]
        self.assertTrue(start.get("image"))
        self.assertTrue(start.get("beat"))

    def test_graph_is_connected(self) -> None:
        rm = _rm(self.config, "seed")
        edges = rm["edges"]
        # Every non-final node has an outgoing edge.
        final_ids = set(rm["layers"][-1])
        for node_id in rm["nodes"]:
            if node_id in final_ids:
                continue
            self.assertTrue(edges.get(node_id), f"{node_id} has no outgoing edge")
        # Every non-start node has an incoming edge.
        incoming = {tgt for targets in edges.values() for tgt in targets}
        for node_id in rm["nodes"]:
            if node_id == rm["current"]:
                continue
            self.assertIn(node_id, incoming, f"{node_id} has no incoming edge")

    def test_both_combat_and_avoid_paths_exist(self) -> None:
        for i in range(20):
            rm = _rm(self.config, f"path-seed-{i}")
            summary = route_map_paths_summary(rm)
            self.assertTrue(summary["combat"], f"no combat path for seed {i}")
            self.assertTrue(summary["avoid"], f"no avoid path for seed {i}")

    def _anchor_nodes(self, rm: dict) -> list[dict]:
        return [n for n in rm["nodes"].values() if n.get("perspectives")]

    def test_anchors_carry_multiple_perspectives(self) -> None:
        rm = _rm(self.config, "seed")
        anchors = self._anchor_nodes(rm)
        # Opening, market, kai, spire, boss all author multi-perspective beats.
        self.assertGreaterEqual(len(anchors), 4)
        for node in anchors:
            self.assertGreaterEqual(len(node["perspectives"]), 2, node.get("beat"))
            self.assertIn(node.get("default_perspective"), {p["id"] for p in node["perspectives"]})

    def test_perspectives_have_required_fields(self) -> None:
        rm = _rm(self.config, "seed")
        for node in self._anchor_nodes(rm):
            for p in node["perspectives"]:
                self.assertTrue(p.get("id"))
                self.assertTrue(p.get("lens"))
                self.assertTrue(p.get("axis"))
                self.assertTrue(p.get("summary"))
                self.assertTrue(p.get("ending_influence"))

    def test_perspective_ending_influence_references_real_endings(self) -> None:
        scenario = load_scenario("neo-seoul")
        valid = {e["id"] for e in scenario.endings}
        rm = _rm(self.config, "seed")
        for node in self._anchor_nodes(rm):
            for p in node["perspectives"]:
                for ending in p["ending_influence"]:
                    self.assertIn(ending, valid, f"{p['id']} -> {ending}")

    def test_boss_perspectives_cover_all_endings(self) -> None:
        scenario = load_scenario("neo-seoul")
        valid = {e["id"] for e in scenario.endings}
        rm = _rm(self.config, "seed")
        boss = rm["nodes"][rm["layers"][-1][0]]
        covered = {ending for p in boss["perspectives"] for ending in p["ending_influence"]}
        self.assertEqual(covered, valid)


if __name__ == "__main__":
    unittest.main()
