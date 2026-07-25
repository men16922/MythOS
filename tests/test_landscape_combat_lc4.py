"""Source-level lock for the Landscape Combat LC4 slice: true one-screen —
`.combat-layout` becomes a bounded, non-scrolling fixed-height container in
landscape+coarse combat, the page-level aside folds entirely into
StoryPanel's combat-bottom-row (which already carries TileInfo/Log/Map since
LC2/T6c) so Save/Status join it too, and only that right column scrolls.
docs/plans/2026-07-08-design-system.md "Landscape Combat" (LC refinement).
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC4Test(unittest.TestCase):
    def test_combat_layout_is_bounded_and_non_scrolling(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        idx = css.index("@media (orientation: landscape) and (pointer: coarse) {")
        block = css[idx : idx + 700]
        self.assertIn(".combat-layout {", block)
        self.assertIn("height: calc(100dvh - 160px);", block)
        self.assertIn("overflow: hidden;", block)
        self.assertIn(".combat-stack {", block)
        self.assertIn("height: 100%;", block)

    def test_aside_folds_entirely_into_combat_in_landscape_coarse_pointer(self) -> None:
        # Widened by the desktop combat split (owner 2026-07-13): the aside now
        # folds during ANY active combat, which subsumes the landscape+coarse case.
        source = read("src/mythos_ui/src/GameAside.tsx")

        self.assertIn("if (combatActive) {\n    return null;\n  }", source)
        self.assertIn("export function StatusPanel({", source)

    def test_save_and_status_join_combat_bottom_row(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn('import { OperationMapPanel, StatusPanel } from "./GameAside";', source)
        self.assertIn('import { SaveHistoryPanel } from "./SaveHistoryPanel";', source)
        self.assertIn("isLandscapeCoarseCombat && onOpenSave && onOpenLoad", source)
        self.assertIn(
            '<CombatChip title={t("save.title")}>\n                <SaveHistoryPanel',
            source,
        )
        self.assertIn(
            '<CombatChip title={t("aside.status.title")}>\n                <StatusPanel snapshot={snapshot} />\n              </CombatChip>',
            source,
        )

    def test_story_panel_props_and_app_wiring(self) -> None:
        story_panel = read("src/mythos_ui/src/StoryPanel.tsx")
        app = read("src/mythos_ui/src/App.tsx")

        self.assertIn("onOpenSave?: () => void;", story_panel)
        self.assertIn("onOpenLoad?: () => void;", story_panel)
        self.assertIn("onOpenSave={openSave}", app)
        self.assertIn("onOpenLoad={openLoad}", app)


if __name__ == "__main__":
    unittest.main()
