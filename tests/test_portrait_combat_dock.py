"""Source locks for the portrait combat action dock (owner 2026-07-14:
"모바일 전투에서 스킬이나 공격하려면 자꾸 스크롤" — board and actions must be
co-visible in portrait touch combat, no scroll loop between looking and acting).
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class PortraitCombatDockTest(unittest.TestCase):
    def _portrait_block(self) -> str:
        css = read("src/mythos_ui/src/index.css")
        # The dock lives in the portrait+coarse media block added 2026-07-14.
        start = css.index("Portrait combat action dock")
        return css[start : start + 2500]

    def test_console_docks_fixed_to_viewport_bottom_in_portrait_combat(self) -> None:
        block = self._portrait_block()
        self.assertIn("body.combat-active .combat-bottom-row #combat-controls", block)
        self.assertIn("position: fixed", block)
        self.assertIn("bottom: 0", block)
        # Own scroll, bounded height: board stays co-visible above the sheet.
        self.assertIn("max-height: 38dvh", block)
        self.assertIn("overflow-y: auto", block)
        self.assertIn("env(safe-area-inset-bottom)", block)

    def test_page_padded_so_content_stays_reachable_above_the_dock(self) -> None:
        self.assertIn("padding-bottom: 42dvh", self._portrait_block())

    def test_portrait_combat_gets_the_lc5_style_chrome_diet(self) -> None:
        block = self._portrait_block()
        # Tabs hidden + compact header during portrait combat (same rationale
        # as LC5 for landscape) — without this the canvas started BELOW the
        # dock's top edge (emulator: canvasTop 568 vs dock 523 @844px).
        self.assertIn("body.combat-active .tabs", block)
        self.assertIn("display: none", block)

    def test_layering_dock_beats_legend_popup_and_boon_beats_dock(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        block = self._portrait_block()
        dock_z = int(re.search(r"z-index:\s*(\d+)", block).group(1))  # type: ignore[union-attr]
        boon = css[css.index(".boon-overlay") :]
        boon_z = int(re.search(r"z-index:\s*(\d+)", boon).group(1))  # type: ignore[union-attr]
        legend = css[css.index(".tactical-legend-popup") :]
        legend_z = int(re.search(r"z-index:\s*(\d+)", legend).group(1))  # type: ignore[union-attr]
        # Action dock > informational legend popup; boon draft MODAL > both.
        # (The legend popup at 50 used to sit on top of the boon cards and
        # swallow their taps on phone widths — found by the dock probe.)
        self.assertGreater(dock_z, legend_z)
        self.assertGreater(boon_z, dock_z)


if __name__ == "__main__":
    unittest.main()
