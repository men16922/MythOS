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


def _require_match(match: re.Match[str] | None) -> re.Match[str]:
    assert match is not None
    return match


class PortraitCombatDockTest(unittest.TestCase):
    def _portrait_block(self) -> str:
        css = read("src/mythos_ui/src/index.css")
        # The dock lives in the portrait+coarse media block added 2026-07-14.
        start = css.index("Portrait combat action dock")
        return css[start : start + 9000]

    def test_console_docks_fixed_to_viewport_bottom_in_portrait_combat(self) -> None:
        block = self._portrait_block()
        self.assertIn("body.combat-active .combat-bottom-row #combat-controls", block)
        self.assertIn("position: fixed", block)
        self.assertIn("bottom: 0", block)
        # Fixed-height, no inner scroll: all dense controls stay co-visible.
        self.assertIn("height: 30dvh", block)
        self.assertIn("overflow: visible", block)
        self.assertNotIn("overflow-y: auto", block)
        self.assertIn("env(safe-area-inset-bottom)", block)

    def test_page_padded_so_content_stays_reachable_above_the_dock(self) -> None:
        self.assertIn("padding-bottom: 34dvh", self._portrait_block())

    def test_board_band_claims_the_space_between_chrome_and_dock(self) -> None:
        # Portrait hierarchy 2026-07-17: the canvas wrapper gets an explicit
        # height band and combatCanvas fits the board INTO it (height-fit, grow
        # only) — without this the board was width-bound to ~273px on a 390px
        # phone, smaller than the console it should dominate.
        block = self._portrait_block()
        self.assertIn("body.combat-active .tactical-board-canvas-wrapper", block)
        self.assertIn("height: calc(100dvh - 176px - 30dvh)", block)
        self.assertIn("justify-content: flex-start", block)
        canvas_src = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn("isPortraitCoarse", canvas_src)
        self.assertIn('window.matchMedia("(orientation: portrait)")', canvas_src)
        self.assertIn("cssW = Math.max(cssW, cssWFromHeight, minCssW)", canvas_src)

    def test_cinema_cards_scale_on_narrow_portrait(self) -> None:
        # Owner 2026-07-17: fixed 220/240px cinema cards overlapped on a 390px
        # phone (skill poster over both unit cards). The narrow-portrait block
        # rescales them in vw so the three lanes stay separate.
        css = read("src/mythos_ui/src/index.css")
        start = css.index("Narrow portrait (owner 2026-07-17")
        block = css[start : start + 1600]
        self.assertIn("width: 27vw", block)
        self.assertIn("width: 31vw", block)

    def test_simulator_entry_strips_the_boon_draft(self) -> None:
        # Owner 2026-07-17: the sandbox must go straight to combat — no run
        # boon pick (apiBegin's real loop carries one; the sim snapshot drops it).
        hook = read("src/mythos_ui/src/hooks/useSessionLifecycle.ts")
        self.assertIn("boons: null", hook)

    def test_portrait_combat_gets_the_lc5_style_chrome_diet(self) -> None:
        block = self._portrait_block()
        # Tabs hidden + compact header during portrait combat (same rationale
        # as LC5 for landscape) — without this the canvas started BELOW the
        # dock's top edge (emulator: canvasTop 568 vs dock 523 @844px).
        self.assertIn("body.combat-active .tabs", block)
        self.assertIn("display: none", block)

    def test_boon_modal_beats_dock_and_legend_popup_is_gone(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        block = self._portrait_block()
        dock_z = int(_require_match(re.search(r"z-index:\s*(\d+)", block)).group(1))
        boon = css[css.index(".boon-overlay") :]
        boon_z = int(_require_match(re.search(r"z-index:\s*(\d+)", boon)).group(1))
        self.assertGreater(boon_z, dock_z)
        self.assertNotIn(".tactical-legend-popup", css)

    def test_dense_portrait_controls_use_image_actions_and_real_skill_art(self) -> None:
        block = self._portrait_block()
        source = read("src/mythos_ui/src/CombatControls.tsx")
        self.assertIn("grid-template-columns: repeat(4, minmax(0, 1fr))", block)
        self.assertIn("width: 50px", block)
        self.assertIn("src={`/assets/icons/combat-${action}.svg`}", source)
        self.assertIn("src={`/resources/${scenarioId}/skills/${skill.id}.png`}", source)


if __name__ == "__main__":
    unittest.main()
