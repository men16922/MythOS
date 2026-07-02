"""Per-loop variation invariant (overnight QA seed, 2026-07-03).

Each loop's route is generated *deterministically from its seed*, but different
seeds must produce a materially different play-through — otherwise every loop
walks the same nodes and meets the same characters, defeating the loop premise.
These are bot-checkable "the seed actually varies the route" guarantees, not a
"is it fun" judgment.

The seed drives three independent selection points, all exercised here end-to-end
over the real neo-seoul route and both builders (`build_route_map` fully-filled /
`build_route_seed` dynamic):

- the dynamic pool sampling in the builders (which filler node *types/titles* fill
  each layer),
- the branch walk in ``advance_route`` (which nodes a turn-by-turn play actually
  *visits* on the way to the boss), and
- the character-driven side-arc selection in ``attach_side_anchors`` (which of the
  authored ``side_arcs`` — 린위에/카이/세린 … — get woven into this loop's map).

For >=5 distinct loop seeds we assert >=3 distinct visited-node sets (a node's
player-facing identity = its type/title/beat, not its positional id) and >=3
distinct woven-in side-arc ("character") sets, while a single seed stays fully
reproducible. A collapse to one-route-fits-all (seed ignored) drops the distinct
count to 1 and fails here.
"""

import unittest
from typing import Any

from mythos_runtime.route_map import (
    SIDE_ANCHOR_ORIGIN,
    attach_side_anchors,
    build_route_map,
    build_route_seed,
)
from mythos_runtime.route_runtime import (
    DEFAULT_TURNS_PER_LAYER,
    ROUTE_MAP_KEY,
    advance_route,
)
from mythos_runtime.scenario import load_scenario

# >=5 distinct loop seeds, per the completion criterion.
SEEDS = [f"loop-variation-{i}" for i in range(6)]
MIN_DISTINCT = 3


class RoutePerLoopVariationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.config = self.scenario.route_map
        self.assertIsNotNone(self.config, "neo-seoul must define a route_map config")
        self.side_arcs = self.scenario.side_arcs
        self.assertTrue(self.side_arcs, "neo-seoul must declare side_arcs")
        self.builders = [build_route_map, build_route_seed]

    def _built_map(self, builder: Any, seed: str) -> dict[str, Any]:
        route_map = builder(self.config, seed)
        assert route_map is not None
        route_map = attach_side_anchors(route_map, self.side_arcs, seed)
        assert route_map is not None
        return route_map

    def _visited_node_set(self, builder: Any, seed: str) -> frozenset[Any]:
        """Walk the route turn-by-turn to the boss; return the visited nodes'
        player-facing identity set (type/title/beat), which varies by seed even
        when the positional ids collide."""
        route_map = self._built_map(builder, seed)
        state: dict[str, Any] = {ROUTE_MAP_KEY: route_map, "flags": []}
        turns = len(route_map["layers"]) * DEFAULT_TURNS_PER_LAYER + 3
        for turn_index in range(turns):
            state = advance_route(state, turn_index=turn_index, seed=seed)
        final = state[ROUTE_MAP_KEY]
        nodes = final["nodes"]
        return frozenset(
            (nodes[nid].get("type"), nodes[nid].get("title"), nodes[nid].get("beat"))
            for nid in final["visited"]
        )

    def _side_arc_set(self, builder: Any, seed: str) -> frozenset[Any]:
        """The character-driven side arcs woven into this loop's map."""
        route_map = self._built_map(builder, seed)
        return frozenset(
            node.get("title")
            for node in route_map["nodes"].values()
            if node.get("origin") == SIDE_ANCHOR_ORIGIN
        )

    def test_visited_node_sets_vary_across_seeds(self) -> None:
        for builder in self.builders:
            distinct = {self._visited_node_set(builder, seed) for seed in SEEDS}
            self.assertGreaterEqual(
                len(distinct),
                MIN_DISTINCT,
                f"{builder.__name__}: only {len(distinct)} distinct visited-node "
                f"sets across {len(SEEDS)} seeds (want >= {MIN_DISTINCT})",
            )

    def test_side_arc_character_selection_varies_across_seeds(self) -> None:
        for builder in self.builders:
            distinct = {self._side_arc_set(builder, seed) for seed in SEEDS}
            self.assertGreaterEqual(
                len(distinct),
                MIN_DISTINCT,
                f"{builder.__name__}: only {len(distinct)} distinct side-arc "
                f"sets across {len(SEEDS)} seeds (want >= {MIN_DISTINCT})",
            )

    def test_single_seed_is_reproducible(self) -> None:
        """Variation is seed-driven, not random: one seed replays identically."""
        for builder in self.builders:
            seed = SEEDS[0]
            self.assertEqual(
                self._visited_node_set(builder, seed),
                self._visited_node_set(builder, seed),
            )
            self.assertEqual(
                self._side_arc_set(builder, seed),
                self._side_arc_set(builder, seed),
            )


if __name__ == "__main__":
    unittest.main()
