import unittest
from typing import Any

from mythos_runtime.route_map import ROUTE_MAP_KEY, build_route_map, build_route_seed
from mythos_runtime.route_runtime import (
    DEFAULT_TURNS_PER_LAYER,
    advance_route,
    fold_relationship,
    junction_options,
    node_encounter_id,
    route_status,
    select_perspective,
)
from mythos_runtime.scenario import load_scenario


def _state(seed: str, flags: list[str] | None = None) -> dict:
    config = load_scenario("neo-seoul").route_map
    initial_flags = ["met_se_rin"] if flags is None else flags
    return {ROUTE_MAP_KEY: build_route_map(config, seed), "flags": initial_flags}


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

    def test_perspective_party_add_recruits_companion_once(self) -> None:
        route_map = {
            "current": "kai",
            "visited": ["kai"],
            "layers": [["kai"]],
            "nodes": {
                "kai": {
                    "id": "kai",
                    "layer": 0,
                    "default_perspective": "awaken",
                    "perspectives": [
                        {"id": "awaken", "effect": {"party_add": ["kai"]}}
                    ],
                }
            },
            "edges": {"kai": []},
        }
        state = {ROUTE_MAP_KEY: route_map, "flags": [], "_party": {"members": []}}
        first = advance_route(state, turn_index=0, seed="kai")
        replay = advance_route(first, turn_index=0, seed="kai")
        self.assertEqual(replay["_party"]["members"], [{"id": "kai"}])


    def test_night_market_entry_unlocks_kai_causally(self) -> None:
        state = _state("kai-causal", ["met_se_rin"])
        opened = advance_route(state, turn_index=0, seed="kai-causal")
        at_market = advance_route(
            opened,
            turn_index=DEFAULT_TURNS_PER_LAYER,
            seed="kai-causal",
        )
        self.assertIn("lin_yue_deal", at_market["flags"])

    def test_locked_edge_recovers_to_ungated_node_without_bypass(self) -> None:
        route_map = {
            "current": "start",
            "visited": ["start"],
            "layers": [["start"], ["locked", "open"]],
            "nodes": {
                "start": {"id": "start", "layer": 0},
                "locked": {"id": "locked", "layer": 1, "gate": ["missing"]},
                "open": {"id": "open", "layer": 1},
            },
            "edges": {"start": ["locked"], "locked": [], "open": []},
        }
        out = advance_route(
            {ROUTE_MAP_KEY: route_map, "flags": []},
            turn_index=DEFAULT_TURNS_PER_LAYER,
            seed="recover",
        )
        repaired = out[ROUTE_MAP_KEY]
        self.assertEqual(repaired["current"], "open")
        self.assertNotIn("locked", repaired["visited"])
        self.assertIn("open", repaired["edges"]["start"])

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
        late = advance_route(state, turn_index=DEFAULT_TURNS_PER_LAYER * 6 + 2, seed="seed")
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


class RouteAntiRepeatTest(unittest.TestCase):
    """Consecutive-scene anti-repeat invariant (overnight QA seed, 2026-07-03).

    D narrative repetition's structural root: if the route stalls or backtracks,
    the GM is asked to narrate the same place twice in a row. The scene's prose
    location is LLM-set (non-deterministic), but the *route node* is the
    deterministic anchor that fixes which authored location/beat a main scene is
    staged at. So the bot-checkable guard is: walking the route turn-by-turn
    through the live runtime (``advance_route``), each time the current node
    changes — a new *main scene* — it must move to a genuinely different node in a
    later layer (a distinct authored location/beat), and no node is ever revisited
    as a fresh main scene. In-layer repeat turns (same node, ``turns_per_layer``
    apart) are handled separately by the director's forward-motion directive and
    ``session_memory`` anti-repeat guidance; this invariant owns the node track.
    """

    def _main_scene_sequence(
        self, route_map: dict[str, Any], seed: str, flags: list[str] | None = None
    ) -> list[str]:
        """Walk the route across a full loop's turns; return the ordered node ids
        the player is staged at as *main scenes* (consecutive duplicates collapsed
        — an unchanged node across a layer's turns is the same scene continuing)."""
        state: dict[str, Any] = {ROUTE_MAP_KEY: route_map, "flags": list(flags or [])}
        num_layers = len(route_map["layers"])
        last_turn = DEFAULT_TURNS_PER_LAYER * num_layers + 2
        sequence: list[str] = []
        for turn in range(last_turn + 1):
            state = advance_route(state, turn_index=turn, seed=seed)
            current = state[ROUTE_MAP_KEY]["current"]
            if not sequence or sequence[-1] != current:
                sequence.append(current)
        return sequence

    def _location_key(self, node: dict[str, Any]) -> tuple[int, str]:
        """Deterministic location descriptor for a node: its layer band plus the
        authored beat/title that fixes where the scene is staged."""
        descriptor = node.get("beat") or node.get("title") or node.get("arc") or node["type"]
        return int(node.get("layer", 0)), str(descriptor)

    def test_consecutive_main_scenes_differ_in_node_and_location(self) -> None:
        for i in range(24):
            for builder in (build_route_map, build_route_seed):
                config = load_scenario("neo-seoul").route_map
                route_map = builder(config, f"anti-repeat-{i}")
                assert route_map is not None
                nodes = route_map["nodes"]
                seq = self._main_scene_sequence(route_map, f"anti-repeat-{i}")
                self.assertGreaterEqual(
                    len(seq), 3, f"route should stage several main scenes (seed {i})"
                )
                # No node is ever staged twice as a fresh main scene (no backtrack /
                # revisit) — the whole main-scene sequence is node-distinct.
                self.assertEqual(
                    len(seq),
                    len(set(seq)),
                    f"a route node repeats as a main scene ({builder.__name__} seed {i}): {seq}",
                )
                for prev_id, next_id in zip(seq, seq[1:]):
                    prev, nxt = nodes[prev_id], nodes[next_id]
                    self.assertNotEqual(
                        prev_id,
                        next_id,
                        f"consecutive main scenes share a node ({builder.__name__} seed {i})",
                    )
                    # Strictly deeper layer => a different act/location band, so the
                    # scene can never re-describe the immediately-prior place.
                    self.assertGreater(
                        int(nxt.get("layer", 0)),
                        int(prev.get("layer", 0)),
                        f"main scene did not advance to a later layer "
                        f"({builder.__name__} seed {i}): {prev_id}->{next_id}",
                    )
                    self.assertNotEqual(
                        self._location_key(prev),
                        self._location_key(nxt),
                        f"consecutive main scenes share a location "
                        f"({builder.__name__} seed {i}): {prev_id}->{next_id}",
                    )

    def test_anti_repeat_holds_when_junctions_are_steered(self) -> None:
        # Even when the player explicitly picks branches at each junction, the
        # main-scene sequence must stay node/location non-repeating.
        seed = "steered"
        config = load_scenario("neo-seoul").route_map
        route_map = build_route_map(config, seed)
        assert route_map is not None
        nodes = route_map["nodes"]
        state: dict[str, Any] = {ROUTE_MAP_KEY: route_map, "flags": []}
        num_layers = len(route_map["layers"])
        sequence: list[str] = [route_map["current"]]
        for turn in range(DEFAULT_TURNS_PER_LAYER * num_layers + 2):
            options = junction_options(state, turn_index=turn)
            pick = options[-1]["id"] if options else None
            state = advance_route(state, turn_index=turn, seed=seed, preferred_next=pick)
            current = state[ROUTE_MAP_KEY]["current"]
            if sequence[-1] != current:
                sequence.append(current)
        self.assertEqual(
            len(sequence),
            len(set(sequence)),
            f"a steered route repeats a main-scene node: {sequence}",
        )
        for prev_id, next_id in zip(sequence, sequence[1:]):
            self.assertGreater(
                int(nodes[next_id].get("layer", 0)),
                int(nodes[prev_id].get("layer", 0)),
                f"steered main scene did not advance a layer: {prev_id}->{next_id}",
            )


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


class FoldRelationshipTest(unittest.TestCase):
    """The non-route folding helper used by ``session`` for choice-level affection."""

    def test_accumulates_onto_existing(self) -> None:
        self.assertEqual(
            fold_relationship({"se_rin": 1}, {"se_rin": 1, "kai": 2}),
            {"se_rin": 2, "kai": 2},
        )

    def test_negative_and_zero_prune(self) -> None:
        # A delta that cancels an existing balance prunes the key entirely.
        self.assertEqual(fold_relationship({"se_rin": 1}, {"se_rin": -1}), {})
        self.assertEqual(fold_relationship({}, {"se_rin": -1}), {"se_rin": -1})

    def test_ignores_non_int_and_handles_missing_current(self) -> None:
        self.assertEqual(fold_relationship(None, {"se_rin": 2}), {"se_rin": 2})
        bad_delta: dict[str, Any] = {"kai": "bad"}
        self.assertEqual(fold_relationship({"se_rin": 1}, bad_delta), {"se_rin": 1})

    def test_survives_route_reconcile(self) -> None:
        # A folded choice delta must persist through advance_route's reconcile and
        # sum with the route's own perspective relationship tally.
        state = _state("seed", ["met_se_rin", "trusted_se_rin"])
        state["relationships"] = fold_relationship(None, {"se_rin": 2, "kai": 1})
        out = advance_route(state, turn_index=2, seed="seed")
        # route adds se_rin:+1 (p_trust); choice contribution preserved.
        self.assertEqual(out["relationships"], {"se_rin": 3, "kai": 1})


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
            _state("seed", ["trusted_se_rin", "met_se_rin"]),
            turn_index=DEFAULT_TURNS_PER_LAYER,
            seed="seed",
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

    def test_layer1_anchor_image_hint_fires_on_steering_resume_turn(self) -> None:
        """bug#4: layer 1's boundary turn (4) falls inside the scripted opening
        (steering suppressed until turn 5), so turn 5 — the first scene actually
        staged at the layer-1 node — must count as fresh. Otherwise a layer-1
        anchor's curated-image directive is unreachable and the anti-repeat
        directive fires against a scene the GM never established."""
        from mythos_core import LoopPhase, LoopState
        from mythos_core.clock import utc_now
        from mythos_runtime.scenario_context import (
            ROUTE_STEERING_START_TURN,
            _route_director_notes,
        )

        scenario = load_scenario("neo-seoul")
        # met_se_rin routes the layer walk onto the gated night_market anchor
        # (layer 1, curated image scenes/night_market.png).
        state = advance_route(
            _state("seed", ["met_se_rin"]),
            turn_index=ROUTE_STEERING_START_TURN,
            seed="seed",
        )
        node = state[ROUTE_MAP_KEY]["nodes"][state[ROUTE_MAP_KEY]["current"]]
        self.assertEqual(node.get("layer"), 1)
        self.assertTrue(str(node.get("image") or "").strip(), "layer-1 anchor must carry an image")
        loop = LoopState(
            loop_id="loop_b4",
            player_id="p1",
            seed="seed",
            phase=LoopPhase.EXPLORE,
            location_id="data-layer-01",
            stability=50,
            tension=50,
            started_at=utc_now(),
            state=state,
        )
        resume = "\n".join(
            _route_director_notes(scenario, loop, turn_index=ROUTE_STEERING_START_TURN)
        )
        later = "\n".join(
            _route_director_notes(scenario, loop, turn_index=ROUTE_STEERING_START_TURN + 1)
        )
        # turn 5 (first steered scene at the layer-1 node): establish + image hint.
        self.assertIn("이미지 정합성", resume)
        self.assertNotIn("반복 금지", resume)
        # turn 6 (same node): forward motion, no image hint.
        self.assertIn("반복 금지", later)
        self.assertNotIn("이미지 정합성", later)


if __name__ == "__main__":
    unittest.main()


class AxisIntentFlagTest(unittest.TestCase):
    """Deterministic play-style → axis-intent flags (route_runtime).

    Selected perspectives carry an axis (people/control/evidence/safety); once an
    axis is tallied >= threshold the mapped intent flag (humanity_first/…) is set
    deterministically, waking the previously-dormant perspective/bible/ending
    gates that consume it.
    """

    def test_people_path_sets_humanity_first_deterministically(self) -> None:
        from mythos_runtime.route_runtime import _AXIS_INTENT_FLAG, _AXIS_INTENT_THRESHOLD

        # The trusted-Se-rin path selects people-axis default perspectives
        # (p_trust/p_fair/p_rescue …); after >= threshold, humanity_first is set.
        state = _state("seed", ["met_se_rin", "trusted_se_rin"])
        late = advance_route(state, turn_index=DEFAULT_TURNS_PER_LAYER * 4, seed="seed")
        rm = late[ROUTE_MAP_KEY]
        axis_tally = rm.get("axis_tally", {})
        self.assertTrue(axis_tally, "no axis accrued along the path")
        self.assertGreaterEqual(axis_tally.get("people", 0), _AXIS_INTENT_THRESHOLD)
        self.assertIn("humanity_first", late["flags"])
        # Every axis at/over threshold must have set its intent flag; none below.
        for axis, count in axis_tally.items():
            flag = _AXIS_INTENT_FLAG.get(axis)
            if flag is None:
                continue
            if count >= _AXIS_INTENT_THRESHOLD:
                self.assertIn(flag, late["flags"])

    def test_axis_intent_emission_is_reproducible(self) -> None:
        a = advance_route(
            _state("seed", ["met_se_rin", "trusted_se_rin"]),
            turn_index=DEFAULT_TURNS_PER_LAYER * 4,
            seed="seed",
        )
        b = advance_route(
            _state("seed", ["met_se_rin", "trusted_se_rin"]),
            turn_index=DEFAULT_TURNS_PER_LAYER * 4,
            seed="seed",
        )
        self.assertEqual(a["flags"], b["flags"])
        self.assertEqual(a[ROUTE_MAP_KEY]["axis_tally"], b[ROUTE_MAP_KEY]["axis_tally"])
