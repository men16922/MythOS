"""Source-level lock for the Landscape Combat LC5 slice: in landscape+coarse
combat, hide the tab-nav entirely and shrink the header (scoped to a
`body.combat-active` signal set by App.tsx) so the tactical board reclaims the
~215px of chrome the emulator pass found above it.
docs/plans/2026-07-08-design-system.md "Landscape Combat" (LC refinement).
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC5Test(unittest.TestCase):
    def test_app_marks_body_combat_active_from_combat_live(self) -> None:
        source = read("src/mythos_ui/src/App.tsx")

        # An effect toggles the body class off the existing combatLive signal,
        # and cleans it up on unmount so it never lingers past a fight.
        self.assertIn(
            'document.body.classList.toggle("combat-active", combatLive);',
            source,
        )
        self.assertIn(
            'document.body.classList.remove("combat-active");',
            source,
        )

    def test_landscape_combat_hides_tabnav_and_shrinks_header(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        idx = css.index("@media (orientation: landscape) and (pointer: coarse) {")
        block = css[idx : idx + 2800]
        # Scoped to combat only (body.combat-active), not all landscape+coarse.
        self.assertIn("body.combat-active .tabs {", block)
        self.assertIn("body.combat-active header {", block)
        # The fixed-height board column grows because less chrome is subtracted.
        self.assertIn("body.combat-active .combat-layout {", block)
        self.assertIn("height: calc(100dvh - 96px);", block)

    def test_tabnav_hidden_before_combat_layout_height_override(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        # The combat-scoped .combat-layout override must live in the same
        # landscape+coarse media block, after the base LC4 `.combat-layout`
        # rule, so its higher specificity wins the height.
        base = css.index(".combat-layout {\n    height: calc(100dvh - 160px);")
        override = css.index("body.combat-active .combat-layout {")
        self.assertLess(base, override)


if __name__ == "__main__":
    unittest.main()
