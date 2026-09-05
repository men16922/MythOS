"""In-run build boon system — offer/choose/apply invariants."""

from __future__ import annotations

import unittest

from test_session_combat import _InMemoryStore

from mythos_runtime.boons import (
    BOON_OFFER_KEY,
    BOON_POOL,
    RUN_BOONS_KEY,
    boon_stat_bonus,
    offer_boons,
)
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService


class BoonUnitTest(unittest.TestCase):
    def test_offer_is_distinct_and_deterministic(self) -> None:
        a = offer_boons(seed="s", turn_index=0, taken=[])
        b = offer_boons(seed="s", turn_index=0, taken=[])
        self.assertEqual(a, b)  # deterministic
        self.assertEqual(len(a), 3)
        self.assertEqual(len(set(a)), 3)  # distinct
        self.assertTrue(all(bid in BOON_POOL for bid in a))

    def test_offer_excludes_taken_until_pool_exhausted(self) -> None:
        taken = list(BOON_POOL)[:2]
        offer = offer_boons(seed="s", turn_index=1, taken=taken)
        self.assertTrue(all(bid not in taken for bid in offer))

    def test_stat_bonus_sums_effects(self) -> None:
        # power_core (offense) + combat_protocol (allround) share no tag → no synergy.
        self.assertEqual(
            boon_stat_bonus(["power_core", "combat_protocol"]),
            {"strength": 4, "agility": 1, "perception": 1},
        )
        self.assertEqual(boon_stat_bonus(None), {})

    def test_tag_synergy_rewards_a_focused_build(self) -> None:
        from mythos_runtime.boons import SYNERGY_BONUS

        # Two offense boons (both strength) → base sum + synergy poured into strength.
        base = 3 + 4  # power_core + titan_frame strength
        total = boon_stat_bonus(["power_core", "titan_frame"])
        self.assertEqual(total["strength"], base + SYNERGY_BONUS)
        # A single offense boon → no synergy.
        self.assertEqual(boon_stat_bonus(["power_core"])["strength"], 3)


class BoonIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(
            self.store
        )  # default director → fallback works offline
        self.options = RuntimeOptions(fallback=True, scenario_id="neo-seoul")
        self.service.create_player("Tester", player_id="p1", traits={"stats": {"strength": 5}})

    def test_loop_start_offers_a_boon(self) -> None:
        snap = self.service.start_loop("p1", self.options)
        assert snap.boons is not None
        self.assertIsNotNone(snap.boons["offer"])
        self.assertEqual(len(snap.boons["offer"]), 3)
        self.assertEqual(snap.boons["active"], [])

    def test_first_loop_seeds_tutorial_party(self) -> None:
        # runs_completed == 0 → Se-rin (the opening's first guide) is the guaranteed
        # starting party; Kai and others join with context via their meet side-arcs.
        snap = self.service.start_loop("p1", self.options)
        members = snap.loop.state.get("_party", {}).get("members", [])
        member_ids = {m.get("id") for m in members if isinstance(m, dict)}
        self.assertEqual(member_ids, {"se_rin"})
        flags = set(snap.loop.state.get("flags", []))
        self.assertIn("tutorial_loop", flags)
        self.assertIn("met_se_rin", flags)
        self.assertNotIn("met_kai", flags)

    def test_choose_boon_moves_offer_to_active_and_applies_stats(self) -> None:
        snap = self.service.start_loop("p1", self.options)
        assert snap.boons is not None
        picked = snap.boons["offer"][0]["id"]
        chosen = self.service.choose_boon(snap.loop.loop_id, picked, self.options)

        # Moved offer -> active; no pending offer remains.
        assert chosen.boons is not None
        self.assertIsNone(chosen.boons["offer"])
        self.assertEqual([b["id"] for b in chosen.boons["active"]], [picked])
        self.assertNotIn(BOON_OFFER_KEY, chosen.loop.state)
        self.assertIn(picked, chosen.loop.state[RUN_BOONS_KEY])

        # The bonus is also surfaced to the Character screen via boons.statBonus.
        self.assertEqual(chosen.boons.get("statBonus"), boon_stat_bonus([picked]))

        # The chosen boon's stat delta reaches the player's combat stats.
        from mythos_runtime.scenario import load_scenario

        scenario = load_scenario("neo-seoul")
        player = self.store.get_player("p1")
        assert player is not None
        stats = self.service._player_combat_stats(player, chosen.loop, scenario)
        expected = boon_stat_bonus([picked])
        for stat, delta in expected.items():
            self.assertGreaterEqual(stats.get(stat, 0), delta)

    def test_choose_unavailable_boon_raises(self) -> None:
        snap = self.service.start_loop("p1", self.options)
        with self.assertRaises(RuntimeError):
            self.service.choose_boon(snap.loop.loop_id, "not_a_real_boon", self.options)


if __name__ == "__main__":
    unittest.main()
