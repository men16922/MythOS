"""Source locks for the two-tier slice 4 turn-order strip (owner GO 2026-07-14).

The strip is a passive initiative forecast above the tactical board: acting
unit first, faction rings, stun/intent badges. Locks keep the data contract
(radar.turn_order), the mount point, the LC one-screen guard, and bilingual
labels from regressing silently.
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class TurnOrderStripTest(unittest.TestCase):
    def test_server_radar_already_exposes_turn_order(self) -> None:
        # The strip is frontend-only BECAUSE the engine already serializes the
        # initiative order — if this key leaves render_radar the strip dies.
        self.assertIn('"turn_order": list(state.order)', read("src/mythos_combat/narrator.py"))

    def test_component_renders_rotated_order_with_badges(self) -> None:
        source = read("src/mythos_ui/src/TurnOrderStrip.tsx")
        # Acting unit leads (rotation on radar.current), dead units drop out.
        self.assertIn("order.slice(currentIdx)", source)
        self.assertIn("isAlive(b)", source)  # living combatants only, via combatView
        # Stun + telegraphed intent badges.
        self.assertIn('includes("stunned")', source)
        self.assertIn("intent.damage_hint", source)

    def test_story_panel_mounts_strip_above_the_board(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        self.assertIn("TurnOrderStrip", source)
        # Mounted inside the tactical board panel, before the canvas wrapper.
        panel = source[source.index("tactical-board-panel") :]
        self.assertLess(panel.index("TurnOrderStrip"), panel.index("tactical-board-canvas-wrapper"))

    def test_radar_type_carries_turn_order(self) -> None:
        self.assertIn("turn_order?: string[]", read("src/mythos_ui/src/types.ts"))

    def test_lc_guard_hides_strip_in_landscape_coarse_combat(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        guard = css[css.index("body.combat-active .turn-order-strip") :]
        self.assertIn("display: none", guard[:120])

    def test_labels_exist_in_both_languages(self) -> None:
        for path in (
            "src/mythos_ui/src/i18n/strings.ko.ts",
            "src/mythos_ui/src/i18n/strings.en.ts",
        ):
            source = read(path)
            self.assertIn('"story.board.turnOrder"', source)
            self.assertIn('"story.board.turnOrderStunned"', source)


if __name__ == "__main__":
    unittest.main()
