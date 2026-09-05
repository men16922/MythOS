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

    def test_companion_arcs_are_gated_by_unlocked_recruits(self) -> None:
        # Achievement-gated recruitment: with nothing unlocked, no locked companion
        # meet-arc appears; unlocking a companion lets its arc surface on some seed.
        gated_beats = {
            "side_han_meet",
            "side_su_ah_meet",
            "side_tae_o_meet",
            "side_lin_yue_request",
        }
        for i in range(40):
            seed = f"gate-{i}"
            rm = build_route_map(self.config, seed)
            assert rm is not None
            rm = attach_side_anchors(rm, self.side_arcs, seed, unlocked_companions=set())
            assert rm is not None
            beats = {rm["nodes"][nid].get("beat") for nid in _side_ids(rm)}
            self.assertFalse(
                beats & gated_beats, f"seed {seed} leaked a gated companion arc: {beats}"
            )

        seen_han = False
        for i in range(40):
            seed = f"gate-han-{i}"
            rm = build_route_map(self.config, seed)
            assert rm is not None
            rm = attach_side_anchors(rm, self.side_arcs, seed, unlocked_companions={"han"})
            assert rm is not None
            if any(rm["nodes"][nid].get("beat") == "side_han_meet" for nid in _side_ids(rm)):
                seen_han = True
        self.assertTrue(seen_han, "unlocking han must let its meet-arc appear on some seed")

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

    def test_guaranteed_meet_arc_for_unmet_unlocked_companion(self) -> None:
        # B1 보장 슬롯 (CBT 피드백 #2: 7루프 동안 카이까지만 만남 — 노출이 병목):
        # 언락됐지만 아직 못 만난 동료가 있으면 그 만남 아크가 매 시드 지도에
        # 최소 1개 강제 포함된다. han만 언락+미만남 → 모든 시드에 han 아크.
        for i in range(20):
            seed = f"b1-han-{i}"
            rm = build_route_map(self.config, seed)
            assert rm is not None
            rm = attach_side_anchors(
                rm,
                self.side_arcs,
                seed,
                unlocked_companions={"han"},
                met_companions=set(),
            )
            assert rm is not None
            beats = {rm["nodes"][nid].get("beat") for nid in _side_ids(rm)}
            self.assertIn("side_han_meet", beats, f"seed {seed} dropped the guaranteed meet arc")

    def test_guarantee_covers_all_unmet_companions(self) -> None:
        # 여러 미만남 동료가 있으면 시드 선택으로 그중 하나가 보장된다 (전원 커버).
        unlocked = {"han", "su_ah", "tae_o", "lin_yue"}
        meet_beats = {"side_han_meet", "side_su_ah_meet", "side_tae_o_meet", "side_lin_yue_request"}
        seen: set[str] = set()
        for i in range(40):
            seed = f"b1-all-{i}"
            rm = build_route_map(self.config, seed)
            assert rm is not None
            rm = attach_side_anchors(
                rm,
                self.side_arcs,
                seed,
                unlocked_companions=unlocked,
                met_companions=set(),
            )
            assert rm is not None
            beats = {str(rm["nodes"][nid].get("beat") or "") for nid in _side_ids(rm)}
            hit = beats & meet_beats
            self.assertTrue(hit, f"seed {seed} has no unmet meet arc at all")
            seen |= hit
        self.assertEqual(seen, meet_beats, "seed rotation never surfaced some companion")

    def test_met_companions_release_the_guaranteed_slot(self) -> None:
        # 이미 만난 동료는 보장 대상이 아니다 — han을 만난 뒤에는 순수 랜덤으로
        # 돌아가므로 han 아크가 없는 시드가 존재해야 한다.
        missing_some_seed = False
        for i in range(40):
            seed = f"b1-met-{i}"
            rm = build_route_map(self.config, seed)
            assert rm is not None
            rm = attach_side_anchors(
                rm,
                self.side_arcs,
                seed,
                unlocked_companions={"han"},
                met_companions={"han"},
            )
            assert rm is not None
            beats = {rm["nodes"][nid].get("beat") for nid in _side_ids(rm)}
            if "side_han_meet" not in beats:
                missing_some_seed = True
                break
        self.assertTrue(missing_some_seed, "met companion still monopolizes the slot")

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
