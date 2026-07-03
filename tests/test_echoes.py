"""Echo inscription — carried memories become a this-run modifier."""

from __future__ import annotations

import unittest

from test_session_combat import _InMemoryStore

from mythos_core import Echo
from mythos_runtime.echoes import (
    ECHO_OFFER_KEY,
    INSCRIBED_ECHOES_KEY,
    echo_offer_ids,
    echo_run_modifier,
    echo_stat_bonus,
)
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import RuntimeSessionService, _save_echo_memory


class EchoUnitTest(unittest.TestCase):
    def test_effect_is_themed_and_deterministic(self) -> None:
        from mythos_runtime.echoes import echo_effect

        a = echo_effect("echo_abc")
        b = echo_effect("echo_abc")
        self.assertEqual(a, b)  # stable per echo id
        self.assertIn("name", a)  # themed name, not a bare stat
        mod = echo_run_modifier("echo_abc")
        self.assertTrue(mod)  # yields a stat profile
        self.assertTrue(all(s in {"strength", "agility", "perception", "intelligence"} for s in mod))

    def test_stat_bonus_sums(self) -> None:
        total = echo_stat_bonus(["echo_abc", "echo_xyz"])
        self.assertEqual(sum(total.values()), sum(echo_run_modifier("echo_abc").values())
                         + sum(echo_run_modifier("echo_xyz").values()))
        self.assertEqual(echo_stat_bonus(None), {})

    def test_offer_ids_takes_recent(self) -> None:
        echoes = [Echo(echo_id=f"e{i}", source_loop_id="l", source_event_id="v", symbol="◈", text="t") for i in range(5)]
        self.assertEqual(echo_offer_ids(echoes, size=3), ["e0", "e1", "e2"])


class EchoIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store)
        self.options = RuntimeOptions(fallback=True, scenario_id="neo-seoul")
        self.service.create_player("Tester", player_id="p1", traits={"stats": {"strength": 5}})

    def test_first_loop_has_no_echo_offer(self) -> None:
        snap = self.service.start_loop("p1", self.options)
        assert snap.boons is not None
        self.assertIsNone(snap.boons.get("echoOffer"))

    def test_carried_echo_can_be_inscribed_and_applies_stats(self) -> None:
        _save_echo_memory(
            self.store, "p1",
            Echo(echo_id="echo_mem", source_loop_id="l0", source_event_id="e0", symbol="◈", text="a scar"),
        )
        snap = self.service.start_loop("p1", self.options)
        assert snap.boons is not None
        offer = snap.boons.get("echoOffer")
        assert offer is not None
        self.assertIn("echo_mem", [c["id"] for c in offer])

        inscribed = self.service.inscribe_echo(snap.loop.loop_id, "echo_mem", self.options)
        assert inscribed.boons is not None
        self.assertIn("echo_mem", inscribed.loop.state[INSCRIBED_ECHOES_KEY])
        self.assertNotIn(ECHO_OFFER_KEY, inscribed.loop.state)  # cap 1 → offer closed

        # The inscribed echo's modifier reaches combat stats.
        from mythos_runtime.scenario import load_scenario

        player = self.store.get_player("p1")
        assert player is not None
        stats = self.service._player_combat_stats(player, inscribed.loop, load_scenario("neo-seoul"))
        expected = echo_run_modifier("echo_mem")
        for stat, delta in expected.items():
            self.assertGreaterEqual(stats.get(stat, 0), delta)


if __name__ == "__main__":
    unittest.main()
