"""G3 결정론 시네마틱 큐 (C4 SFX 흡수) — 규칙 파생, 프로즈 비의존."""

from __future__ import annotations

import unittest
from dataclasses import dataclass

from mythos_api.serializers import _presentation_cues


@dataclass
class _Scene:
    scene_type: str = "static"


class PresentationCueTest(unittest.TestCase):
    def test_combat_entry_fires_alarm_and_shake(self) -> None:
        cues = _presentation_cues(
            _Scene("combat"),
            {"_combat_interstitial": {"encounter": "patrol_ambush"}},
            {"finished": False},
        )
        self.assertEqual(cues[:2], ["alarm", "shake"])

    def test_mid_combat_turns_do_not_refire_alarm(self) -> None:
        cues = _presentation_cues(_Scene("combat"), {}, {"finished": False})
        self.assertNotIn("alarm", cues)

    def test_cutscene_fires_sting_and_glitch(self) -> None:
        cues = _presentation_cues(_Scene("cutscene"), {}, None)
        self.assertEqual(cues[:2], ["sting", "glitch"])

    def test_tension_spike_fires_vignette_outside_combat_only(self) -> None:
        state = {"_last_choice_impact": {"tension_delta": 9}}
        self.assertIn("vignette", _presentation_cues(_Scene(), state, None))
        self.assertNotIn(
            "vignette",
            _presentation_cues(
                _Scene("combat"),
                {**state, "_combat_interstitial": {"encounter": "x"}},
                {"finished": False},
            ),
        )

    def test_item_gain_fires_pickup(self) -> None:
        state = {"_last_choice_impact": {"items_gained": [{"id": "drone_scrap"}]}}
        self.assertIn("pickup", _presentation_cues(_Scene(), state, None))

    def test_quiet_turn_has_no_cues(self) -> None:
        self.assertEqual(
            _presentation_cues(_Scene(), {"_last_choice_impact": {"tension_delta": 2}}, None),
            [],
        )


if __name__ == "__main__":
    unittest.main()
