"""Route-map reachability invariants (overnight QA seed, 2026-06-14).

These are bot-checkable "doesn't break" guarantees rather than "is it fun"
judgments: for the neo-seoul route map across many seeds and both the
fully-materialized (`build_route_map`) and dynamic-seed (`build_route_seed`)
builders, assert that the generated layered DAG stays navigable —

- every node is reachable from the start (zero orphan nodes),
- every node has a path to the boss layer,
- every authored anchor is reachable from the start (gates only restrict; the
  layered connectivity guarantee means some flag combination always reaches it),
- both a combat-taking and a combat-avoiding path to the boss exist.

A violation is a real content/generation bug to fix mechanically or surface as a
Blocker, not a flaky judgment call.
"""

import unittest
from typing import Any

from mythos_runtime.route_map import (
    build_route_map,
    build_route_seed,
    route_map_paths_summary,
)
from mythos_runtime.scenario import load_scenario


def _reachable_set(start: str, edges: dict[str, list[str]]) -> set[str]:
    """Forward-reachable node ids from ``start`` over ``edges`` (BFS/DFS)."""
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


class RouteIntegrityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.config = self.scenario.route_map
        self.assertIsNotNone(self.config, "neo-seoul must define a route_map config")

    def _maps(self) -> list[dict[str, Any]]:
        """Both builders across many seeds — the universe these invariants cover."""
        maps: list[dict[str, Any]] = []
        for i in range(24):
            full = build_route_map(self.config, f"integrity-{i}")
            assert full is not None  # known-valid neo-seoul config
            maps.append(full)
            seed = build_route_seed(self.config, f"integrity-{i}")
            assert seed is not None
            maps.append(seed)
        return maps

    def test_no_orphan_nodes(self) -> None:
        for rm in self._maps():
            start = rm["current"]
            reachable = _reachable_set(start, rm["edges"])
            orphans = set(rm["nodes"]) - reachable
            self.assertEqual(orphans, set(), f"orphan nodes from {start}: {orphans}")

    def test_every_node_reaches_boss(self) -> None:
        for rm in self._maps():
            boss = rm["layers"][-1][0]
            for node_id in rm["nodes"]:
                self.assertTrue(
                    _reaches(node_id, boss, rm["edges"]),
                    f"{node_id} ({rm['nodes'][node_id]['type']}) cannot reach boss {boss}",
                )

    def test_every_anchor_reachable_from_start(self) -> None:
        for rm in self._maps():
            start = rm["current"]
            reachable = _reachable_set(start, rm["edges"])
            anchors = [nid for nid, n in rm["nodes"].items() if n.get("anchor")]
            self.assertTrue(anchors, "route map should declare authored anchors")
            for nid in anchors:
                beat = rm["nodes"][nid].get("beat") or rm["nodes"][nid]["type"]
                self.assertIn(nid, reachable, f"anchor {nid} ({beat}) unreachable from start")

    def test_both_combat_and_avoid_paths_exist(self) -> None:
        for rm in self._maps():
            summary = route_map_paths_summary(rm)
            self.assertTrue(summary["combat"], f"no combat path (seed {rm.get('seed')})")
            self.assertTrue(summary["avoid"], f"no avoid path (seed {rm.get('seed')})")


if __name__ == "__main__":
    unittest.main()
