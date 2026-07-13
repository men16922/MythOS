"""Source-level lock for the Landscape Combat LC2 slice: in landscape+coarse
combat, TileInfo/Log/OperationMap fold into the right (combat-bottom-row)
column so the turn loop fits one screen. docs/plans/2026-07-08-design-system.md
"Landscape Combat".
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC2Test(unittest.TestCase):
    def test_tile_inspector_moved_into_combat_bottom_row(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        board_idx = source.index('<TacticalLegend combat={snapshot.combat} />')
        bottom_row_idx = source.index('<div className="combat-bottom-row">')
        tile_inspector_idx = source.index("<TileInspector combat={rosterCombat} cell={combatInspectCell} />")

        self.assertLess(board_idx, bottom_row_idx)
        self.assertGreater(tile_inspector_idx, bottom_row_idx)

    def test_operation_map_folds_into_bottom_row_in_landscape_coarse_pointer(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn('import { OperationMapPanel, StatusPanel } from "./GameAside";', source)
        self.assertIn(
            'import { useOrientation } from "./hooks/useOrientation";', source
        )
        self.assertIn(
            "const isLandscapeCoarseCombat = isLandscape && isCoarsePointer;", source
        )
        self.assertIn("{isLandscapeCoarseCombat && (", source)
        self.assertIn(
            '<OperationMapPanel snapshot={snapshot} onOpenCodex={onOpenCodex} />', source
        )

    def test_operation_map_panel_is_exported_for_reuse(self) -> None:
        source = read("src/mythos_ui/src/GameAside.tsx")

        self.assertIn("export function OperationMapPanel({", source)

    def test_aside_returns_null_when_folded_into_combat(self) -> None:
        # LC4 established the landscape+coarse fold; the desktop combat split
        # (owner 2026-07-13) widened it: the whole <aside> renders nothing during
        # ANY active combat — the right column belongs to roster + command console
        # (index.css "Desktop combat split"), and landscape's combat-bottom-row
        # still carries Save/Status (see LC4 test module).
        source = read("src/mythos_ui/src/GameAside.tsx")

        self.assertIn(
            "const combatActive = Boolean(finalizedSnapshot?.combat && !finalizedSnapshot.combat.finished);",
            source,
        )
        self.assertIn("if (combatActive) {\n    return null;\n  }", source)

    def test_story_panel_wires_on_open_codex_from_app(self) -> None:
        source = read("src/mythos_ui/src/App.tsx")

        self.assertIn('onOpenCodex={() => handleTabClick("codex")}', source)


if __name__ == "__main__":
    unittest.main()
