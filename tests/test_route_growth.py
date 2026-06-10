import unittest

from mythos_runtime.route_growth import extend_route
from mythos_runtime.route_map import (
    ROUTE_MAP_KEY,
    _reachable_from,
    build_route_seed,
    route_map_paths_summary,
)
from mythos_runtime.scenario import load_scenario


def _layer_of(route_map: dict, node_id: str) -> int:
    return int(route_map["nodes"][node_id]["layer"])


def _advance_pointer(state: dict, layer_index: int) -> dict:
    """Move the route pointer to the first node of a given layer (test harness)."""
    route_map = dict(state[ROUTE_MAP_KEY])
    node_id = route_map["layers"][layer_index][0]
    route_map["current"] = node_id
    route_map["visited"] = [*route_map.get("visited", []), node_id]
    new_state = dict(state)
    new_state[ROUTE_MAP_KEY] = route_map
    return new_state


class RouteSeedTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = load_scenario("neo-seoul").route_map

    def test_seed_marks_dynamic_mode(self) -> None:
        rm = build_route_seed(self.config, "seed-1")
        self.assertEqual(rm["mode"], "dynamic")
        self.assertEqual(rm["horizon"], 2)

    def test_seed_only_fills_initial_horizon(self) -> None:
        rm = build_route_seed(self.config, "seed-1", horizon=2)
        # Layers beyond the horizon start as anchor-only stubs (not filled).
        self.assertTrue(rm["growth"]["0"]["filled"])
        self.assertTrue(rm["growth"]["2"]["filled"])
        self.assertFalse(rm["growth"]["3"]["filled"])
        # Unfilled layer carries only its authored anchor(s).
        stub_layer = rm["layers"][3]
        self.assertTrue(all(rm["nodes"][n]["anchor"] for n in stub_layer))

    def test_seed_carries_mandatory_and_gate(self) -> None:
        rm = build_route_seed(self.config, "seed-1")
        start = rm["nodes"][rm["current"]]
        boss = rm["nodes"][rm["layers"][-1][0]]
        self.assertTrue(start["mandatory"])
        self.assertTrue(boss["mandatory"])
        gated = [n for n in rm["nodes"].values() if n.get("gate")]
        self.assertTrue(gated, "expected at least one branch-gated anchor")


class RouteGrowthTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = load_scenario("neo-seoul").route_map

    def _grow_through(self, proposals=None):
        state = {ROUTE_MAP_KEY: build_route_seed(self.config, "grow-seed"), "flags": []}
        last = len(state[ROUTE_MAP_KEY]["layers"]) - 1
        for layer in range(last + 1):
            state = _advance_pointer(state, layer)
            state = extend_route(
                state,
                seed="grow-seed",
                turn_index=layer * 4,
                proposals=proposals if layer == 1 else None,
            )
        return state[ROUTE_MAP_KEY]

    def test_growth_fills_layers_as_player_advances(self) -> None:
        rm = build_route_seed(self.config, "grow-seed")
        before = [len(layer) for layer in rm["layers"]]
        grown = self._grow_through()
        after = [len(layer) for layer in grown["layers"]]
        # Mid layers grew; node count strictly increased overall.
        self.assertGreater(sum(after), sum(before))

    def test_growth_keeps_all_anchors_reachable(self) -> None:
        grown = self._grow_through()
        start = grown["layers"][0][0]
        anchors = [nid for nid, n in grown["nodes"].items() if n.get("anchor")]
        for anchor in anchors:
            self.assertTrue(
                _reachable_from(start, anchor, grown["edges"]),
                f"anchor {anchor} became unreachable after growth",
            )

    def test_growth_preserves_avoid_and_combat_paths(self) -> None:
        grown = self._grow_through()
        summary = route_map_paths_summary(grown)
        self.assertTrue(summary["avoid"])
        self.assertTrue(summary["combat"])

    def test_llm_proposals_are_consumed(self) -> None:
        proposals = [
            {"type": "clue", "title": "끊긴 송출탑"},
            {"type": "event", "title": "정전된 광장"},
        ]
        grown = self._grow_through(proposals)
        titles = {n.get("title") for n in grown["nodes"].values()}
        self.assertIn("끊긴 송출탑", titles)
        self.assertIn("정전된 광장", titles)

    def test_invalid_proposal_type_is_dropped(self) -> None:
        # An unknown node type must not appear; the layer falls back to its pool.
        proposals = [{"type": "not_a_real_type", "title": "유령 노드"}]
        grown = self._grow_through(proposals)
        titles = {n.get("title") for n in grown["nodes"].values()}
        self.assertNotIn("유령 노드", titles)
        types = {n["type"] for n in grown["nodes"].values()}
        self.assertNotIn("not_a_real_type", types)

    def test_extend_is_noop_for_static_map(self) -> None:
        from mythos_runtime.route_map import build_route_map

        static_rm = build_route_map(self.config, "static-seed")
        state = {ROUTE_MAP_KEY: static_rm}
        out = extend_route(state, seed="static-seed", turn_index=4)
        self.assertIs(out, state)


if __name__ == "__main__":
    unittest.main()
