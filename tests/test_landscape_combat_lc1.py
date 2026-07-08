"""Source-level lock for the Landscape Combat LC1 slice: the split layout
(board height-fit left | roster/controls/log column right, own scroll) for
coarse-pointer landscape combat. docs/plans/2026-07-08-design-system.md
"Landscape Combat".
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC1Test(unittest.TestCase):
    def test_combat_stack_splits_row_in_landscape_coarse_pointer(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        self.assertIn("@media (orientation: landscape) and (pointer: coarse) {", css)
        self.assertIn("flex-direction: row;", css)
        self.assertIn("width: 58%;", css)
        self.assertIn("width: 42%;", css)

    def test_bottom_row_scrolls_independently_in_landscape_split(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        idx = css.index("@media (orientation: landscape) and (pointer: coarse) {")
        block = css[idx : idx + 900]
        self.assertIn(".combat-bottom-row {", block)
        self.assertIn("overflow-y: auto;", block)

    def test_canvas_fits_to_height_in_landscape_coarse_pointer(self) -> None:
        source = read("src/mythos_ui/src/combatCanvas.ts")

        self.assertIn("isLandscapeCoarse", source)
        self.assertIn('"(orientation: landscape)"', source)
        self.assertIn('"(pointer: coarse)"', source)
        self.assertIn("cssWFromHeight", source)


if __name__ == "__main__":
    unittest.main()
