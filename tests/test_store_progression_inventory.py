"""Regression for the MythOSStore progression/inventory default (in-memory) impls.

These back the test fakes and keep the ABC usable without Postgres; the real
SQL path is exercised by the DB-gated integration tests.
"""

import unittest

from test_session_combat import _InMemoryStore


class StoreProgressionInventoryDefaultsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()

    def test_progression_roundtrip_and_isolation(self) -> None:
        self.assertIsNone(self.store.get_progression("p1", "neo-seoul"))
        self.store.save_progression("p1", "neo-seoul", {"insight_points": 5, "unlocked_skills": ["a"]})
        got = self.store.get_progression("p1", "neo-seoul")
        assert got is not None
        self.assertEqual(got["insight_points"], 5)
        self.assertEqual(got["unlocked_skills"], ["a"])
        # keyed by (player, scenario)
        self.assertIsNone(self.store.get_progression("p1", "glass-library"))
        self.assertIsNone(self.store.get_progression("p2", "neo-seoul"))
        # returns a copy — mutating the result must not leak back
        got["insight_points"] = 999
        self.assertEqual(self.store.get_progression("p1", "neo-seoul")["insight_points"], 5)

    def test_inventory_roundtrip_per_loop(self) -> None:
        self.assertEqual(self.store.list_inventory("loop_a"), [])
        self.store.set_inventory(
            "loop_a",
            [{"item_id": "nanopatch", "quantity": 2, "equipped": False}],
        )
        self.assertEqual(
            self.store.list_inventory("loop_a"),
            [{"item_id": "nanopatch", "quantity": 2, "equipped": False}],
        )
        # per-loop isolation
        self.assertEqual(self.store.list_inventory("loop_b"), [])
        # overwrite semantics
        self.store.set_inventory("loop_a", [{"item_id": "blade", "quantity": 1, "equipped": True}])
        self.assertEqual(self.store.list_inventory("loop_a")[0]["item_id"], "blade")


if __name__ == "__main__":
    unittest.main()
