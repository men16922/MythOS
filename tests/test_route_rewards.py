import sys
import unittest
from dataclasses import replace
from pathlib import Path
from typing import Any, cast

sys.path.insert(0, str(Path(__file__).resolve().parent))

from test_session_combat import _InMemoryStore  # noqa: E402

from mythos_core import Choice, LoopPhase, Scene  # noqa: E402
from mythos_narrative import ScenePayload, WorldDelta  # noqa: E402
from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.route_map import (  # noqa: E402
    ROUTE_MAP_KEY,
    attach_side_anchors,
    build_route_seed,
)
from mythos_runtime.scenario import load_scenario  # noqa: E402
from mythos_runtime.session import (  # noqa: E402
    RuntimeSessionService,
    _heal_party,
    _route_node_allows_cutscene,
)


class _CaptureDirector:
    def __init__(self) -> None:
        self.contexts: list[Any] = []

    def generate_next_scene(self, context):
        self.contexts.append(context)
        choices = [Choice(choice_id="continue", label="계속", intent="explore")]
        scene = Scene(
            scene_id=f"captured_{len(self.contexts)}",
            loop_id=context.loop.loop_id,
            turn_index=context.turn_index,
            title="다음 장면",
            location="route-target",
            narration="선택한 경로로 이동한다.",
            choices=choices,
            visual_brief="The selected route destination.",
            created_at=context.loop.started_at,
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=choices,
            visual_brief=scene.visual_brief or "",
            world_delta=WorldDelta(),
        )
        return scene, payload


class HealPartyTest(unittest.TestCase):
    def test_full_and_partial_heal_clamped(self) -> None:
        party = {
            "player_hp": 2,
            "player_max_hp": 15,
            "members": {"se-rin": {"hp": 1, "max_hp": 10}},
        }
        full = _heal_party(party, 1.0)
        assert full is not None
        self.assertEqual(full["player_hp"], 15)
        self.assertEqual(full["members"]["se-rin"]["hp"], 10)
        partial = _heal_party(party, 0.4)
        assert partial is not None
        self.assertEqual(partial["player_hp"], min(15, 2 + round(15 * 0.4)))
        # original untouched (pure)
        self.assertEqual(party["player_hp"], 2)

    def test_none_party(self) -> None:
        self.assertIsNone(_heal_party(None, 1.0))


class CompanionCutsceneRuntimeIntegrationTest(unittest.TestCase):
    def test_anchor_and_combat_nodes_defer_cutscene(self) -> None:
        for node in (
            {"anchor": True},
            {"side_arc": True},
            {"combat": True},
            {"type": "boss"},
        ):
            state = {
                ROUTE_MAP_KEY: {
                    "current": "n1",
                    "nodes": {"n1": node},
                    "layers": [["n1"]],
                }
            }
            self.assertFalse(_route_node_allows_cutscene(state))

    def setUp(self) -> None:
        self.store = _InMemoryStore()
        bootstrap = RuntimeSessionService(self.store)
        bootstrap.create_player("Tester", player_id="cutscene-player", traits={"archetype": "ghost"})
        started = bootstrap.start_loop(
            "cutscene-player",
            RuntimeOptions(fallback=True, scenario_id="neo-seoul", language="en"),
        )
        loop = self.store.get_loop(started.loop.loop_id)
        assert loop is not None
        state = dict(loop.state)
        state.pop(ROUTE_MAP_KEY, None)
        state.pop("_encounter_map", None)
        state["relationships"] = {"se_rin": 2}
        self.store.save_loop(replace(loop, phase=LoopPhase.EXPLORE, state=state))
        self.store.save_scene(
            Scene(
                scene_id="cutscene_threshold_ready",
                loop_id=loop.loop_id,
                turn_index=5,
                title="Transit",
                location="quiet-alley",
                narration="The pursuit fades behind them.",
                choices=[Choice(choice_id="continue", label="Continue", intent="explore")],
                visual_brief="A quiet neon alley.",
                created_at=started.scene.created_at,
            )
        )
        self.loop_id = loop.loop_id

    def test_threshold_stages_cutscene_once_then_clears_active_node(self) -> None:
        director = _CaptureDirector()
        service = RuntimeSessionService(self.store, director=cast(Any, director))
        options = RuntimeOptions(
            fallback=False,
            fast_mode=True,
            scenario_id="neo-seoul",
            language="en",
        )

        cutscene = service.choose(self.loop_id, choice_id="continue", options=options)
        self.assertEqual(cutscene.scene.scene_type, "cutscene")
        self.assertEqual(cutscene.scene.title, "Flickering Trust")
        self.assertEqual(cutscene.loop.state["_seen_cutscenes"], ["SERIN_FIRST_LIGHT"])
        self.assertEqual(
            cutscene.loop.state["_active_cutscene"]["image"],
            "characters/se-rin.png",
        )
        rendered = "\n".join(director.contexts[0].session_synopsis)
        self.assertIn("COMPANION CUTSCENE SCENE LOCK", rendered)
        self.assertIn("synthetic coffee", rendered)

        following = service.choose(self.loop_id, choice_id="continue", options=options)
        self.assertEqual(following.scene.scene_type, "static")
        self.assertNotIn("_active_cutscene", following.loop.state)
        self.assertEqual(following.loop.state["_seen_cutscenes"], ["SERIN_FIRST_LIGHT"])
        self.assertNotIn(
            "COMPANION CUTSCENE SCENE LOCK",
            "\n".join(director.contexts[1].session_synopsis),
        )


class RouteNodeRewardIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.svc = RuntimeSessionService(self.store, director=None)
        self.svc.create_player("테스터", player_id="p1", traits={"archetype": "ghost"})
        self.opts = RuntimeOptions(fallback=True, scenario_id="neo-seoul")

    def _drive(self, loop_id, prefer_label=None, turns=14):
        snap = None
        for _ in range(turns):
            scene = self.store.get_latest_scene(loop_id)
            route_choices = [c for c in scene.choices if c.choice_id.startswith("route:")]
            pick = None
            if prefer_label:
                pick = next(
                    (c.choice_id for c in route_choices if prefer_label in c.label), None
                )
            if not pick:
                pick = (
                    route_choices[0].choice_id
                    if route_choices
                    else (scene.choices[0].choice_id if scene.choices else None)
                )
            snap = self.svc.choose(loop_id, choice_id=pick, options=self.opts)
        return snap

    def test_rest_node_heals_and_raises_stability_once(self) -> None:
        snap = self.svc.start_loop("p1", self.opts)
        loop_id = snap.loop.loop_id
        # wound the player
        loop = self.store.get_loop(loop_id)
        state = dict(loop.state)
        party = dict(state.get("_party", {}))
        party["player_hp"] = 2
        state["_party"] = party
        self.store.save_loop(replace(loop, state=state))

        snap = self._drive(loop_id, prefer_label="정비")
        route = snap.loop.state["_route_map"]
        # rest node entered -> HP fully restored, applied tracked
        self.assertEqual(snap.loop.state["_party"]["player_hp"], snap.loop.state["_party"]["player_max_hp"])
        self.assertTrue(route.get("applied_rewards"))
        # applied list has no duplicates (applied once even while lingering)
        applied = route["applied_rewards"]
        self.assertEqual(len(applied), len(set(applied)))

    def test_companion_side_choice_persists_and_unlocks_combat_ally(self) -> None:
        """Product-path proof for side-entry effects.

        The player chooses a real ``route:<node>`` choice through
        ``RuntimeSessionService.choose``. The resulting loop must persist Han's
        canonical meeting flag and affection, and a subsequent combat must consume
        that flag by building Han as an ally.
        """
        scenario = load_scenario("neo-seoul")
        route_map = None
        side_id = None
        for index in range(100):
            seed = f"session-side-han-{index}"
            candidate = attach_side_anchors(
                build_route_seed(scenario.route_map, seed),
                scenario.side_arcs,
                seed,
            )
            assert candidate is not None
            side_id = next(
                (
                    node_id
                    for node_id, node in candidate["nodes"].items()
                    if node.get("beat") == "side_han_meet"
                ),
                None,
            )
            if side_id is not None:
                route_map = candidate
                break
        self.assertIsNotNone(route_map, "seed scan did not exercise side_han_meet")
        self.assertIsNotNone(side_id)
        assert route_map is not None and side_id is not None

        source = next(
            node_id for node_id, targets in route_map["edges"].items() if side_id in targets
        )
        source_layer = int(route_map["nodes"][source]["layer"])
        from mythos_runtime.route_runtime import DEFAULT_TURNS_PER_LAYER

        boundary_turn = (source_layer + 1) * DEFAULT_TURNS_PER_LAYER - 1

        started = self.svc.start_loop("p1", self.opts)
        loop = self.store.get_loop(started.loop.loop_id)
        assert loop is not None
        state = dict(loop.state)
        state.pop("_encounter_map", None)
        state[ROUTE_MAP_KEY] = {
            **route_map,
            "current": source,
            "visited": [source],
        }
        # Teleporting the pointer mid-route must also move the narrative route
        # clock (start_loop stamped _story_turn=0): in real play they advance
        # together — the clock counts story commits, not combat rounds. It equals
        # the latest narrative scene's turn, so the next commit crosses the boundary.
        state["_story_turn"] = boundary_turn
        self.store.save_loop(
            replace(
                loop,
                seed=str(route_map["seed"]),
                phase=LoopPhase.EXPLORE,
                state=state,
            )
        )
        self.store.save_scene(
            Scene(
                scene_id="scene_side_han_junction",
                loop_id=loop.loop_id,
                turn_index=boundary_turn,
                title="러너의 신호",
                location="control-grid-blind-spot",
                narration="관리망 사각에서 한의 신호가 잡힌다.",
                choices=[
                    Choice(
                        choice_id=f"route:{side_id}",
                        label="러너의 지름길로 향한다",
                        intent="explore",
                    )
                ],
                visual_brief="A hidden route through the control grid.",
                created_at=started.scene.created_at,
            )
        )

        # Use a fresh service so no optional Redis session cache can mask the
        # loop/scene state prepared above.
        director = _CaptureDirector()
        service = RuntimeSessionService(self.store, director=cast(Any, director))
        live_opts = replace(self.opts, fallback=False, fast_mode=True)
        chosen = service.choose(
            loop.loop_id,
            choice_id=f"route:{side_id}",
            options=live_opts,
        )
        self.assertEqual(chosen.loop.state[ROUTE_MAP_KEY]["current"], side_id)
        self.assertIn("met_han", chosen.loop.state["flags"])
        self.assertEqual(chosen.loop.state["relationships"]["han"], 1)
        self.assertEqual(len(director.contexts), 1)
        rendered_context = "\n".join(
            [
                *director.contexts[0].novelty_notes,
                *director.contexts[0].session_synopsis,
            ]
        )
        self.assertIn(route_map["nodes"][side_id]["title"], rendered_context)
        self.assertIn("scenes/han_meet.png", rendered_context)
        self.assertIn("SIDE ARC SCENE LOCK", rendered_context)
        self.assertIn("ROUTE_BEAT: side_han_meet", rendered_context)
        self.assertIn("한이 사각지대 지름길을 제안", rendered_context)

        combat = service.start_combat(loop.loop_id, "patrol_ambush", live_opts)
        assert combat.combat is not None
        ally_ids = {
            blip["id"]
            for blip in combat.combat["radar"]["blips"]
            if blip.get("faction") == "ally"
        }
        self.assertIn("han", ally_ids)


if __name__ == "__main__":
    unittest.main()
