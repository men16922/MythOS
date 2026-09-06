"""Golden-path length guard (overnight QA seed, 2026-07-03).

A single loop must offer enough narrative *before* it resolves to feel like a
30-60 minute session rather than a tech-demo sprint. This is a bot-checkable
"the golden path is long enough" guarantee, not an "is it fun" judgment.

Because the route is a strictly layered DAG that advances one layer every
``DEFAULT_TURNS_PER_LAYER`` turns and the loop's climax/ending sits on the boss
node in the final layer, the number of narrative beats (scene-turns) a player
experiences before the ending is fixed by ``(num_layers - 1) * turns_per_layer``
and is the same on *every* branch (all start->boss paths cross one node per
layer). We measure it the faithful way — walk the real neo-seoul route
turn-by-turn with ``advance_route`` until the boss node becomes ``current`` and
count the pre-climax turns — over both builders (``build_route_map`` fully-filled
/ ``build_route_seed`` dynamic) and several seeds, and assert at least
``MIN_BEATS`` beats precede the ending. A regression that shortened the act
structure (fewer layers) or sped the layer cadence would drop the count and fail
here.
"""

import unittest
from typing import Any

from mythos_runtime.route_growth import extend_route
from mythos_runtime.route_map import (
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

# >=12 narrative beats reachable before an ending (30-60min proxy).
MIN_BEATS = 12
SEEDS = [f"golden-path-{i}" for i in range(6)]


class RouteGoldenPathLengthTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.config = self.scenario.route_map
        self.assertIsNotNone(self.config, "neo-seoul must define a route_map config")
        self.side_arcs = self.scenario.side_arcs
        self.builders = [build_route_map, build_route_seed]

    def _beats_before_ending(self, builder: Any, seed: str) -> int:
        """Turn-by-turn play until the boss node becomes ``current``; return the
        number of pre-climax narrative beats. Asserts the boss is actually reached
        so the count is "beats before the ending", not "beats before the budget
        ran out"."""
        route_map = builder(self.config, seed)
        assert route_map is not None
        route_map = attach_side_anchors(route_map, self.side_arcs, seed)
        assert route_map is not None
        boss = route_map["layers"][-1][0]
        self.assertEqual(
            route_map["nodes"][boss].get("type"),
            "boss",
            f"final-layer node {boss} must be the boss (seed {seed})",
        )
        # Runtime onboarding deterministically supplies met_se_rin before the
        # first gated route layer. Starting with no engine flags previously
        # passed only because the progress fallback illegally crossed locks.
        state: dict[str, Any] = {ROUTE_MAP_KEY: route_map, "flags": ["met_se_rin"]}
        # A generous ceiling: the boss is (num_layers-1)*per turns out, so this is
        # always reached well inside the budget on a strictly-layered DAG.
        max_turns = len(route_map["layers"]) * DEFAULT_TURNS_PER_LAYER + 5
        for turn_index in range(max_turns):
            state = extend_route(
                state,
                seed=seed,
                turn_index=turn_index,
                proposals=None,
            )
            state = advance_route(state, turn_index=turn_index, seed=seed)
            if state[ROUTE_MAP_KEY]["current"] == boss:
                return turn_index
        self.fail(
            f"boss node never reached within {max_turns} turns ({builder.__name__}, seed {seed})"
        )

    def test_golden_path_reaches_at_least_12_beats_before_ending(self) -> None:
        for builder in self.builders:
            for seed in SEEDS:
                beats = self._beats_before_ending(builder, seed)
                self.assertGreaterEqual(
                    beats,
                    MIN_BEATS,
                    f"{builder.__name__} (seed {seed}) reaches an ending after only "
                    f"{beats} narrative beats (want >= {MIN_BEATS})",
                )

    def test_golden_path_beat_count_is_deterministic_per_seed(self) -> None:
        """The length is structural, not flaky: one seed replays the same count."""
        for builder in self.builders:
            seed = SEEDS[0]
            self.assertEqual(
                self._beats_before_ending(builder, seed),
                self._beats_before_ending(builder, seed),
            )


if __name__ == "__main__":
    unittest.main()
