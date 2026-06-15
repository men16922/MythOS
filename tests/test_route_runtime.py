import unittest
from typing import Any

from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map
from mythos_runtime.route_runtime import (
    DEFAULT_TURNS_PER_LAYER,
    advance_route,
    junction_options,
    node_encounter_id,
    route_status,
    select_perspective,
)
from mythos_runtime.scenario import load_scenario


def _state(seed: str, flags: list[str] | None = None) -> dict:
    config = load_scenario("neo-seoul").route_map
    return {ROUTE_MAP_KEY: build_route_map(config, seed), "flags": flags or []}


class RouteRuntimeTest(unittest.TestCase):
    def test_noop_without_route_map(self) -> None:
        state: dict[str, Any] = {"flags": []}
        self.assertIs(advance_route(state, turn_index=10, seed="s"), state)

    def test_current_advances_with_turns(self) -> None:
        state = _state("seed")
        start = state[ROUTE_MAP_KEY]["current"]
        late = advance_route(state, turn_index=DEFAULT_TURNS_PER_LAYER * 2, seed="seed")
        moved = late[ROUTE_MAP_KEY]["current"]
        self.assertNotEqual(moved, start)
        self.assertGreaterEqual(len(late[ROUTE_MAP_KEY]["visited"]), 2)

    def test_reaches_boss_by_end(self) -> None:
        rm0 = _state("seed")[ROUTE_MAP_KEY]
        layers = rm0["layers"]
        boss = layers[-1][0]
        state = _state("seed")
        final_turn = DEFAULT_TURNS_PER_LAYER * len(layers) + 2
        late = advance_route(state, turn_index=final_turn, seed="seed")
        self.assertEqual(late[ROUTE_MAP_KEY]["current"], boss)

    def test_deterministic(self) -> None:
        a = advance_route(_state("seed", ["trusted_se_rin"]), turn_index=12, seed="seed")
        b = advance_route(_state("seed", ["trusted_se_rin"]), turn_index=12, seed="seed")
        self.assertEqual(a[ROUTE_MAP_KEY], b[ROUTE_MAP_KEY])
        self.assertEqual(a["flags"], b["flags"])

    def test_perspective_effect_flags_applied(self) -> None:
        # trusted_se_rin selects the opening "p_trust" perspective which adds the
        # same flag (idempotent) — verify effect flags land in state flags.
        state = _state("seed", ["trusted_se_rin"])
        out = advance_route(state, turn_index=2, seed="seed")
        self.assertIn("trusted_se_rin", out["flags"])

    def test_flag_routes_perspective_selection(self) -> None:
        node = {
            "default_perspective": "d",
            "perspectives": [
                {"id": "d", "when": [], "ending_influence": ["e1"]},
                {"id": "evidence", "when": ["evidence_first"], "ending_influence": ["e2"]},
            ],
        }
        default_p = select_perspective(node, set())
        assert default_p is not None
        self.assertEqual(default_p["id"], "d")
        evidence_p = select_perspective(node, {"evidence_first"})
        assert evidence_p is not None
        self.assertEqual(evidence_p["id"], "evidence")

    def test_ending_tally_reflects_route(self) -> None:
        # A trust-leaning route should accumulate ending influence toward the
        # endings the trust perspectives lean to (safe_refuge appears).
        flags = ["trusted_se_rin"]
        state = _state("seed", flags)
        late = advance_route(
            state, turn_index=DEFAULT_TURNS_PER_LAYER * 6 + 2, seed="seed"
        )
        tally = late[ROUTE_MAP_KEY]["ending_tally"]
        self.assertTrue(tally, "ending tally should be populated along the route")
        leaderboard = late[ROUTE_MAP_KEY]["ending_leaderboard"]
        self.assertEqual(leaderboard[0][1], max(v for v in tally.values()))

    def test_route_status_summary(self) -> None:
        state = advance_route(_state("seed"), turn_index=6, seed="seed")
        status = route_status(state)
        assert status is not None
        self.assertIn("node", status)
        self.assertIn("ending_leaderboard", status)


class RouteRelationshipTest(unittest.TestCase):
    """P0 호감도 런타임: perspective ``effect.relationship`` accrues into
    ``state["relationships"]`` (was dead data — only ``effect.flags`` was applied)."""

    def test_relationship_delta_applied(self) -> None:
        # trusted_se_rin selects the opening p_trust perspective (relationship
        # se_rin:+1). Only the layer-0 anchor is visited at turn 2.
        state = _state("seed", ["met_se_rin", "trusted_se_rin"])
        out = advance_route(state, turn_index=2, seed="seed")
        self.assertEqual(out["relationships"], {"se_rin": 1})
        # The route's contribution is also recorded on the map for reconciliation.
        self.assertEqual(out[ROUTE_MAP_KEY]["relationship_tally"], {"se_rin": 1})

    def test_negative_relationship_delta(self) -> None:
        # p_caution (safety_first/refused_se_rin) leans relationship se_rin:-1.
        state = _state("seed", ["safety_first", "refused_se_rin"])
        out = advance_route(state, turn_index=2, seed="seed")
        self.assertEqual(out["relationships"], {"se_rin": -1})

    def test_replay_does_not_double_count(self) -> None:
        # advance_route replays the whole visited path every turn; re-advancing at
        # the same turn must not re-add the route's relationship deltas.
        first = advance_route(
            _state("seed", ["met_se_rin", "trusted_se_rin"]), turn_index=2, seed="seed"
        )
        second = advance_route(first, turn_index=2, seed="seed")
        self.assertEqual(second["relationships"], first["relationships"])
        self.assertEqual(first["relationships"], {"se_rin": 1})

    def test_non_route_contribution_preserved(self) -> None:
        # A pre-existing relationship (e.g. a scene-choice delta applied elsewhere)
        # survives route advance and survives replay reconciliation.
        state = _state("seed", ["met_se_rin", "trusted_se_rin"])
        state["relationships"] = {"kai": 5}
        out = advance_route(state, turn_index=2, seed="seed")
        self.assertEqual(out["relationships"], {"kai": 5, "se_rin": 1})
        replay = advance_route(out, turn_index=2, seed="seed")
        self.assertEqual(replay["relationships"], {"kai": 5, "se_rin": 1})

    def test_deterministic_and_monotonic_along_route(self) -> None:
        # Same seed/flags/turn → identical relationships, and a longer route
        # accumulates at least as much affection magnitude as a short one.
        flags = ["met_se_rin", "trusted_se_rin"]
        a = advance_route(_state("seed", flags), turn_index=2, seed="seed")
        b = advance_route(_state("seed", flags), turn_index=2, seed="seed")
        self.assertEqual(a["relationships"], b["relationships"])
        late = advance_route(
            _state("seed", flags),
            turn_index=DEFAULT_TURNS_PER_LAYER * 6 + 2,
            seed="seed",
        )
        self.assertGreaterEqual(
            sum(abs(v) for v in late["relationships"].values()),
            sum(abs(v) for v in a["relationships"].values()),
        )


class JunctionTest(unittest.TestCase):
    def test_junction_only_at_layer_boundary(self) -> None:
        state = _state("seed")
        # Mid-layer turns are not junctions.
        self.assertEqual(junction_options(state, turn_index=1), [])
        # Last turn of layer 0 (per-1) is a junction with >=2 branch options.
        opts = junction_options(state, turn_index=DEFAULT_TURNS_PER_LAYER - 1)
        self.assertGreaterEqual(len(opts), 2)
        self.assertTrue(all("id" in o for o in opts))

    def test_no_junction_without_route_map(self) -> None:
        self.assertEqual(junction_options({"flags": []}, turn_index=3), [])

    def test_preferred_next_steers_branch(self) -> None:
        state = _state("seed")
        boundary = DEFAULT_TURNS_PER_LAYER - 1
        opts = junction_options(state, turn_index=boundary)
        target = opts[-1]["id"]
        # Advancing into the next layer with the pick should land on it.
        out = advance_route(
            state, turn_index=DEFAULT_TURNS_PER_LAYER, seed="seed", preferred_next=target
        )
        self.assertEqual(out[ROUTE_MAP_KEY]["current"], target)
        self.assertIsNone(out[ROUTE_MAP_KEY].get("preferred_next"))


class NodeEncounterTest(unittest.TestCase):
    def setUp(self) -> None:
        mapping = load_scenario("neo-seoul").route_map.get("combat_encounters")
        assert mapping is not None
        self.mapping = mapping

    def test_non_combat_node_has_no_encounter(self) -> None:
        node = {"id": "n", "type": "clue", "combat": False}
        self.assertIsNone(node_encounter_id(node, self.mapping, seed="s"))

    def test_combat_node_maps_to_pool_encounter(self) -> None:
        node = {"id": "n", "type": "patrol", "combat": True}
        pick = node_encounter_id(node, self.mapping, seed="s")
        self.assertIn(pick, self.mapping["patrol"])

    def test_boss_node_maps_to_boss_encounter(self) -> None:
        node = {"id": "b", "type": "boss", "combat": True}
        pick = node_encounter_id(node, self.mapping, seed="s")
        self.assertIn(pick, self.mapping["boss"])

    def test_multi_pool_pick_is_deterministic_and_valid(self) -> None:
        node = {"id": "c1", "type": "combat", "combat": True}
        pick = node_encounter_id(node, self.mapping, seed="s")
        self.assertEqual(pick, node_encounter_id(node, self.mapping, seed="s"))
        self.assertIn(pick, self.mapping["combat"])


class RouteDirectorNotesTest(unittest.TestCase):
    def test_notes_reflect_current_node_and_perspective(self) -> None:

        from mythos_core import LoopPhase, LoopState
        from mythos_core.clock import utc_now
        from mythos_runtime.scenario import load_scenario
        from mythos_runtime.scenario_context import _route_director_notes

        scenario = load_scenario("neo-seoul")
        # turn lands on the arc_2 market anchor (has authored perspectives);
        # trusted_se_rin biases edge selection toward that anchor.
        state = advance_route(
            _state("seed", ["trusted_se_rin", "met_se_rin"]), turn_index=DEFAULT_TURNS_PER_LAYER, seed="seed"
        )
        loop = LoopState(
            loop_id="loop_x",
            player_id="p1",
            seed="seed",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-01",
            stability=50,
            tension=50,
            started_at=utc_now(),
            state=state,
        )
        notes = _route_director_notes(scenario, loop, turn_index=DEFAULT_TURNS_PER_LAYER)
        blob = "\n".join(notes)
        self.assertIn("ROUTE NODE STEERING", blob)
        self.assertIn("활성 시점", blob)
        # Ending lean should resolve to an authored ending title, not a raw id.
        titles = {e["title"] for e in scenario.endings}
        self.assertTrue(any(t in blob for t in titles))

    def test_no_notes_without_route_map(self) -> None:
        from mythos_core import LoopPhase, LoopState
        from mythos_core.clock import utc_now
        from mythos_runtime.scenario import load_scenario
        from mythos_runtime.scenario_context import _route_director_notes

        loop = LoopState(
            loop_id="loop_y",
            player_id="p1",
            seed="seed",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-01",
            stability=50,
            tension=50,
            started_at=utc_now(),
            state={"flags": []},
        )
        self.assertEqual(_route_director_notes(load_scenario("neo-seoul"), loop, turn_index=1), [])

    def test_advance_directive_only_on_repeat_turns(self) -> None:
        """First scene on a node establishes it (image hint); later scenes on the
        same node push forward motion (anti-stickiness) — the explore 정체 fix."""
        from mythos_core import LoopPhase, LoopState
        from mythos_core.clock import utc_now
        from mythos_runtime.scenario import load_scenario
        from mythos_runtime.scenario_context import _route_director_notes

        scenario = load_scenario("neo-seoul")
        loop = LoopState(
            loop_id="loop_z",
            player_id="p1",
            seed="seed",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-01",
            stability=50,
            tension=50,
            started_at=utc_now(),
            state=_state("seed", []),  # fresh layer-0 anchor (has curated image)
        )
        fresh = "\n".join(_route_director_notes(scenario, loop, turn_index=1))
        repeat = "\n".join(_route_director_notes(scenario, loop, turn_index=2))
        # turn 1: establish + image, no advance directive.
        self.assertIn("이미지 정합성", fresh)
        self.assertNotIn("반복 금지", fresh)
        # turn 2 (same node): advance directive, no image hint.
        self.assertIn("반복 금지", repeat)
        self.assertNotIn("이미지 정합성", repeat)


if __name__ == "__main__":
    unittest.main()
