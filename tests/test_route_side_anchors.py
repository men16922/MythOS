"""Side-anchor mechanism invariants (overnight QA seed, 2026-07-03).

`route_map.attach_side_anchors` weaves a scenario's authored ``side_arcs`` into a
built route DAG as seed-selected *optional* branch nodes. These are bot-checkable
"doesn't break" guarantees for that mechanism across many seeds and both builders:

- at least one side_arc node lands in the graph when the scenario declares arcs,
- every side node is reachable from the start (edge-graph reachability) and still
  reaches the boss (never a dead-end),
- side nodes never orphan an existing node and never shortcut the boss (its
  start-distance stays ``num_layers - 1`` — the full-layer-traversal pacing guard),
- side nodes sit only in intermediate layers (never the opening or boss layer),
- the attachment is deterministic (same seed → identical result), and
- it is a strict no-op when there are no side arcs / no map (behavior-preserving).
"""

import unittest
from collections import deque
from typing import Any

from mythos_runtime.route_map import (
    ROUTE_MAP_KEY,
    SIDE_ANCHOR_ORIGIN,
    attach_side_anchors,
    build_route_map,
    build_route_seed,
)
from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER, advance_route, junction_options
from mythos_runtime.scenario import load_scenario


def _reachable_set(start: str, edges: dict[str, list[str]]) -> set[str]:
    seen: set[str] = set()
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        stack.extend(edges.get(cur, []))
    return seen


def _reaches(start: str, target: str, edges: dict[str, list[str]]) -> bool:
    return target in _reachable_set(start, edges)


def _shortest_path_len(start: str, target: str, edges: dict[str, list[str]]) -> int | None:
    queue: deque[tuple[str, int]] = deque([(start, 0)])
    seen = {start}
    while queue:
        node, dist = queue.popleft()
        if node == target:
            return dist
        for nxt in edges.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, dist + 1))
    return None


def _side_ids(rm: dict[str, Any]) -> list[str]:
    return [nid for nid, n in rm["nodes"].items() if n.get("side_arc")]


class RouteSideAnchorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.config = self.scenario.route_map
        self.assertIsNotNone(self.config, "neo-seoul must define a route_map config")
        self.side_arcs = self.scenario.side_arcs
        self.assertTrue(self.side_arcs, "neo-seoul must declare side_arcs")

    def _maps(self) -> list[dict[str, Any]]:
        """Both builders across many seeds, each with side anchors attached."""
        maps: list[dict[str, Any]] = []
        for i in range(24):
            seed = f"side-anchor-{i}"
            full = build_route_map(self.config, seed)
            dyn = build_route_seed(self.config, seed)
            assert full is not None and dyn is not None
            full = attach_side_anchors(full, self.side_arcs, seed)
            dyn = attach_side_anchors(dyn, self.side_arcs, seed)
            assert full is not None and dyn is not None
            maps.append(full)
            maps.append(dyn)
        return maps

    def test_at_least_one_side_node_attached(self) -> None:
        for rm in self._maps():
            self.assertTrue(
                _side_ids(rm),
                f"no side_arc node attached (seed {rm.get('seed')})",
            )
            for nid in _side_ids(rm):
                self.assertEqual(rm["nodes"][nid].get("origin"), SIDE_ANCHOR_ORIGIN)
                self.assertTrue(rm["nodes"][nid].get("optional"))

    def test_side_node_reachable_and_reaches_boss(self) -> None:
        for rm in self._maps():
            start = rm["current"]
            boss = rm["layers"][-1][0]
            reachable = _reachable_set(start, rm["edges"])
            for nid in _side_ids(rm):
                self.assertIn(nid, reachable, f"side node {nid} unreachable from start")
                self.assertTrue(
                    _reaches(nid, boss, rm["edges"]),
                    f"side node {nid} cannot reach boss {boss}",
                )

    def test_no_orphans_and_boss_distance_preserved(self) -> None:
        for rm in self._maps():
            start = rm["current"]
            layers = rm["layers"]
            boss = layers[-1][0]
            orphans = set(rm["nodes"]) - _reachable_set(start, rm["edges"])
            self.assertEqual(orphans, set(), f"side attach orphaned {orphans}")
            # Every node still reaches the boss (no dead-ends introduced).
            for nid in rm["nodes"]:
                self.assertTrue(
                    _reaches(nid, boss, rm["edges"]),
                    f"{nid} cannot reach boss after side attach",
                )
            # The side branch must not shortcut the strictly-layered boss distance.
            self.assertEqual(
                _shortest_path_len(start, boss, rm["edges"]),
                len(layers) - 1,
                f"side attach changed boss distance (seed {rm.get('seed')})",
            )

    def test_side_nodes_only_in_intermediate_layers(self) -> None:
        for rm in self._maps():
            last = len(rm["layers"]) - 1
            for nid in _side_ids(rm):
                layer = int(rm["nodes"][nid].get("layer", -1))
                self.assertGreater(layer, 0, f"side node {nid} in opening layer")
                self.assertLess(layer, last, f"side node {nid} in boss layer")

    def test_min_layer_and_independent_edges(self) -> None:
        for rm in self._maps():
            for nid in _side_ids(rm):
                node = rm["nodes"][nid]
                self.assertGreaterEqual(
                    int(node.get("layer", 0)),
                    int(node.get("min_layer", 1)),
                    f"side node {nid} landed before its trigger can be produced",
                )
                for source, targets in rm["edges"].items():
                    if nid in targets:
                        self.assertFalse(
                            rm["nodes"][source].get("side_arc"),
                            f"side node {nid} depends on side node {source}",
                        )
                for target in rm["edges"][nid]:
                    self.assertFalse(
                        rm["nodes"][target].get("side_arc"),
                        f"side node {nid} routes through side node {target}",
                    )

    def test_unearned_gated_side_nodes_never_leak_through_fallback(self) -> None:
        for rm in self._maps():
            for nid in _side_ids(rm):
                node = rm["nodes"][nid]
                gate = node.get("gate")
                if not gate:
                    continue
                sources = [source for source, targets in rm["edges"].items() if nid in targets]
                self.assertEqual(len(sources), 1)
                source = sources[0]
                source_layer = int(rm["nodes"][source]["layer"])
                state = {
                    "flags": [],
                    ROUTE_MAP_KEY: {**rm, "current": source, "visited": [source]},
                }
                options = junction_options(
                    state,
                    turn_index=(source_layer + 1) * DEFAULT_TURNS_PER_LAYER - 1,
                )
                self.assertNotIn(
                    nid,
                    {option["id"] for option in options},
                    f"gated side node {nid} leaked into junction options",
                )
                advanced = advance_route(
                    state,
                    turn_index=(source_layer + 1) * DEFAULT_TURNS_PER_LAYER,
                    seed=str(rm["seed"]),
                )
                self.assertNotEqual(
                    advanced[ROUTE_MAP_KEY]["current"],
                    nid,
                    f"gated side node {nid} auto-selected without {gate}",
                )

    def test_companion_entry_effects_set_canonical_flags_and_affection(self) -> None:
        expected = {
            "side_han_meet": ("met_han", "han"),
            "side_su_ah_meet": ("met_su_ah", "su_ah"),
            "side_tae_o_meet": ("met_tae_o", "tae_o"),
        }
        observed: set[str] = set()
        for rm in self._maps():
            for nid in _side_ids(rm):
                node = rm["nodes"][nid]
                beat = str(node.get("beat") or "")
                if beat not in expected:
                    continue
                sources = [source for source, targets in rm["edges"].items() if nid in targets]
                self.assertEqual(len(sources), 1)
                source = sources[0]
                source_layer = int(rm["nodes"][source]["layer"])
                state = {
                    "flags": [],
                    ROUTE_MAP_KEY: {**rm, "current": source, "visited": [source]},
                }
                out = advance_route(
                    state,
                    turn_index=(source_layer + 1) * DEFAULT_TURNS_PER_LAYER,
                    seed=str(rm["seed"]),
                    preferred_next=nid,
                )
                flag, companion = expected[beat]
                self.assertEqual(out[ROUTE_MAP_KEY]["current"], nid)
                self.assertIn(flag, out["flags"])
                self.assertEqual(out["relationships"].get(companion), 1)
                observed.add(beat)
        self.assertEqual(observed, set(expected), "not every companion entry arc was exercised")

    def test_deterministic(self) -> None:
        a = attach_side_anchors(build_route_map(self.config, "det"), self.side_arcs, "det")
        b = attach_side_anchors(build_route_map(self.config, "det"), self.side_arcs, "det")
        assert a is not None and b is not None
        self.assertEqual(a["nodes"], b["nodes"])
        self.assertEqual(a["edges"], b["edges"])
        self.assertEqual(a["layers"], b["layers"])

    def test_noop_without_side_arcs_or_map(self) -> None:
        base = build_route_map(self.config, "noop")
        assert base is not None
        before_nodes = dict(base["nodes"])
        after = attach_side_anchors(base, [], "noop")
        assert after is not None
        self.assertEqual(after["nodes"], before_nodes)
        self.assertEqual(_side_ids(after), [])
        # No map is a straight pass-through.
        self.assertIsNone(attach_side_anchors(None, self.side_arcs, "noop"))


if __name__ == "__main__":
    unittest.main()
