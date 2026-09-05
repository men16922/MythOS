"""Market exchange — scrap→item barter at market route nodes."""

from __future__ import annotations

import unittest
from dataclasses import replace

from test_session_combat import _InMemoryStore

from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService


class MarketExchangeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store)
        self.options = RuntimeOptions(fallback=True, scenario_id="neo-seoul")
        self.service.create_player("Tester", player_id="p1", traits={"stats": {"strength": 5}})
        snap = self.service.start_loop("p1", self.options)
        self.loop_id = snap.loop.loop_id

    def _place_on(self, node_type: str, *, scrap: int = 0) -> None:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        route = dict(loop.state.get(ROUTE_MAP_KEY) or {})
        target = next(
            (nid for nid, n in route.get("nodes", {}).items() if n.get("type") == node_type),
            None,
        )
        assert target is not None, f"route has no {node_type} node"
        route["current"] = target
        items = load_scenario("neo-seoul").combat["items"]
        state = dict(loop.state)
        state[ROUTE_MAP_KEY] = route
        state["_inventory"] = [dict(items["drone_scrap"]) for _ in range(scrap)]
        self.store.save_loop(replace(loop, state=state))

    def test_config_offers_exist_and_reference_real_items(self) -> None:
        combat = load_scenario("neo-seoul").combat
        config = combat.get("market_exchange")
        assert isinstance(config, list) and config
        items = combat["items"]
        for offer in config:
            self.assertIn(offer["give"], items)
            self.assertIn(offer["get"], items)

    def test_market_view_only_on_market_node(self) -> None:
        self._place_on("market", scrap=2)
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        view = self.service._market_view(loop, self.options)
        assert view is not None
        self.assertTrue(any(o["get"] == "nanopatch" and o["affordable"] for o in view["offers"]))
        self.assertTrue(
            any(o["get"] == "mesh_vest" and not o["affordable"] for o in view["offers"])
        )

        self._place_on("story", scrap=2)
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        self.assertIsNone(self.service._market_view(loop, self.options))

    def test_exchange_consumes_scrap_and_grants_item(self) -> None:
        self._place_on("market", scrap=3)
        snap = self.service.exchange_material(
            self.loop_id, "drone_scrap", "nanopatch", self.options
        )
        inv = snap.loop.state["_inventory"]
        ids = [e.get("id") for e in inv]
        self.assertEqual(ids.count("drone_scrap"), 1)  # 3 - 2
        self.assertIn("nanopatch", ids)
        # The granted consumable is a full definition (usable in combat).
        nano = next(e for e in inv if e.get("id") == "nanopatch")
        self.assertEqual(nano.get("kind"), "consumable")

    def test_exchange_rejects_insufficient_or_wrong_node(self) -> None:
        self._place_on("market", scrap=1)
        with self.assertRaises(RuntimeError):
            self.service.exchange_material(self.loop_id, "drone_scrap", "nanopatch", self.options)
        self._place_on("story", scrap=5)
        with self.assertRaises(RuntimeError):
            self.service.exchange_material(self.loop_id, "drone_scrap", "nanopatch", self.options)
        self._place_on("market", scrap=5)
        with self.assertRaises(RuntimeError):
            self.service.exchange_material(
                self.loop_id, "drone_scrap", "not_an_offer", self.options
            )


if __name__ == "__main__":
    unittest.main()
