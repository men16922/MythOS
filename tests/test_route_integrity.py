"""Route-map reachability invariants (overnight QA seed, 2026-06-14).

These are bot-checkable "doesn't break" guarantees rather than "is it fun"
judgments: for the neo-seoul route map across many seeds and both the
fully-materialized (`build_route_map`) and dynamic-seed (`build_route_seed`)
builders, assert that the generated layered DAG stays navigable —

- every node is reachable from the start (zero orphan nodes),
- every node has a path to the boss layer,
- every authored anchor is reachable from the start (gates only restrict; the
  layered connectivity guarantee means some flag combination always reaches it),
- both a combat-taking and a combat-avoiding path to the boss exist,
- every ending declared in ``scenario.endings`` is reachable through the route's
  ``ending_influence`` tally — some node that pushes toward it sits on a viable
  start→boss path (not just at the boss), and no perspective pushes toward an
  ending id that does not exist.

A violation is a real content/generation bug to fix mechanically or surface as a
Blocker, not a flaky judgment call.
"""

import unittest
from collections import deque
from typing import Any

from mythos_runtime.route_map import (
    build_route_map,
    build_route_seed,
    route_map_paths_summary,
)
from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER
from mythos_runtime.scenario import PROJECT_ROOT, load_scenario


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


def _shortest_path_len(start: str, target: str, edges: dict[str, list[str]]) -> int | None:
    """Fewest edges from ``start`` to ``target`` over ``edges`` (BFS), or None."""
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


def _influence_nodes(rm: dict[str, Any]) -> dict[str, set[str]]:
    """Map each ``ending_influence`` id to the node ids whose perspectives push it."""
    out: dict[str, set[str]] = {}
    for nid, node in rm["nodes"].items():
        for perspective in node.get("perspectives", []) or []:
            for ending in perspective.get("ending_influence", []) or []:
                out.setdefault(str(ending), set()).add(nid)
    return out


class RouteIntegrityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.scenario = load_scenario("neo-seoul")
        self.config = self.scenario.route_map
        self.assertIsNotNone(self.config, "neo-seoul must define a route_map config")
        self.ending_ids = {str(e.get("id")) for e in self.scenario.endings if e.get("id")}
        self.assertTrue(self.ending_ids, "neo-seoul must declare endings")

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

    def test_recurring_key_beats_have_fixed_curated_sequences(self) -> None:
        """High-impact beats use fixed art for every ordinary three-turn node visit."""
        expected = {
            "night_market": "scenes/night_market.png",
            "data_incinerator": "concept/05-data-incinerator.png",
            "kai_awakening": "scenes/kai_awakening.png",
            "spire_gate": "scenes/spire_gate.png",
            "ix_confrontation": "scenes/ix_confrontation.png",
        }
        anchors = {
            str(anchor.get("beat")): anchor
            for layer in self.config.get("layers", [])
            for anchor in layer.get("anchors", [])
            if isinstance(anchor, dict) and anchor.get("beat") in expected
        }
        self.assertEqual(set(anchors), set(expected), "recurring key beat missing from route map")
        resources_dir = PROJECT_ROOT / "resources" / "neo-seoul"
        for beat, image in expected.items():
            anchor = anchors[beat]
            self.assertEqual(anchor.get("image"), image)
            self.assertEqual(anchor.get("image_sequence"), [image, image, image])
            self.assertTrue((resources_dir / image).is_file(), f"{beat} image missing: {image}")

    def test_both_combat_and_avoid_paths_exist(self) -> None:
        for rm in self._maps():
            summary = route_map_paths_summary(rm)
            self.assertTrue(summary["combat"], f"no combat path (seed {rm.get('seed')})")
            self.assertTrue(summary["avoid"], f"no avoid path (seed {rm.get('seed')})")

    def test_every_ending_reachable_via_route_influence(self) -> None:
        for rm in self._maps():
            start = rm["current"]
            boss = rm["layers"][-1][0]
            reachable = _reachable_set(start, rm["edges"])
            influence = _influence_nodes(rm)
            for ending_id in self.ending_ids:
                pushers = influence.get(ending_id, set())
                self.assertTrue(
                    pushers,
                    f"ending {ending_id} has no perspective pushing toward it "
                    f"(seed {rm.get('seed')})",
                )
                # Reachable from start AND on a viable path to the boss — so the
                # tally can actually accumulate before the loop resolves.
                viable = {
                    nid
                    for nid in pushers
                    if nid in reachable and _reaches(nid, boss, rm["edges"])
                }
                self.assertTrue(
                    viable,
                    f"ending {ending_id} only pushed by nodes off any start→boss "
                    f"path {pushers} (seed {rm.get('seed')})",
                )

    def test_boss_requires_full_layer_traversal(self) -> None:
        # Climax reachability pacing guard (2026-07-03): the boss node sits on the
        # final layer and the DAG is strictly layered, so *every* start->boss path
        # crosses one node per layer — the boss is always ``num_layers - 1`` edges
        # (~``(num_layers - 1) * DEFAULT_TURNS_PER_LAYER`` turns) out and can never
        # be reached early. That distance is exactly why a mid-run ``tension>=90``
        # auto-archive would strand the golden path before the climax, which the
        # session-level tension-archive deferral (``_defer_threshold_archive_before_climax``,
        # gated on ``_route_boss_reached``) guards against. This invariant pins the
        # structural precondition that guard relies on.
        for rm in self._maps():
            start = rm["current"]
            layers = rm["layers"]
            boss = layers[-1][0]
            self.assertEqual(
                rm["nodes"][boss].get("type"),
                "boss",
                f"final-layer node {boss} must be the boss (seed {rm.get('seed')})",
            )
            dist = _shortest_path_len(start, boss, rm["edges"])
            self.assertEqual(
                dist,
                len(layers) - 1,
                f"boss reachable in {dist} edges but the map has {len(layers)} "
                f"layers — the golden path must traverse every layer "
                f"(seed {rm.get('seed')})",
            )
            # The pacing guard only matters if the boss is genuinely many turns
            # out; assert the derived turn-distance is > a single layer step.
            turns_to_boss = (len(layers) - 1) * DEFAULT_TURNS_PER_LAYER
            self.assertGreater(
                turns_to_boss,
                DEFAULT_TURNS_PER_LAYER,
                f"boss only {turns_to_boss} turns out (seed {rm.get('seed')})",
            )

    def test_route_influence_references_declared_ending(self) -> None:
        for rm in self._maps():
            for ending_id in _influence_nodes(rm):
                self.assertIn(
                    ending_id,
                    self.ending_ids,
                    f"perspective pushes toward undeclared ending {ending_id!r} "
                    f"(seed {rm.get('seed')}); declared: {sorted(self.ending_ids)}",
                )


if __name__ == "__main__":
    unittest.main()
