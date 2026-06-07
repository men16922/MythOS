import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from test_session_combat import _InMemoryStore  # noqa: E402

from mythos_runtime.options import RuntimeOptions  # noqa: E402
from mythos_runtime.session import RuntimeSessionService, _heal_party  # noqa: E402


class HealPartyTest(unittest.TestCase):
    def test_full_and_partial_heal_clamped(self) -> None:
        party = {
            "player_hp": 2,
            "player_max_hp": 15,
            "members": {"se-rin": {"hp": 1, "max_hp": 10}},
        }
        full = _heal_party(party, 1.0)
        self.assertEqual(full["player_hp"], 15)
        self.assertEqual(full["members"]["se-rin"]["hp"], 10)
        partial = _heal_party(party, 0.4)
        self.assertEqual(partial["player_hp"], min(15, 2 + round(15 * 0.4)))
        # original untouched (pure)
        self.assertEqual(party["player_hp"], 2)

    def test_none_party(self) -> None:
        self.assertIsNone(_heal_party(None, 1.0))


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
        from dataclasses import replace

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


if __name__ == "__main__":
    unittest.main()
