"""Source-level lock for the Landscape Combat LC6 slice: in landscape+coarse
combat the command console (target selection + Attack/Defend/Skills) leads the
right column (actions-first, co-visible with the board) while portrait/desktop
keep it in its original mid-column slot below the roster.
docs/plans/2026-07-08-design-system.md "Landscape Combat" (LC refinement).
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC6Test(unittest.TestCase):
    def test_controls_hoisted_into_single_element(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        # The active-combat console is defined once as controlsEl so it isn't
        # duplicated across the two placements (only one branch renders per
        # orientation); both placements reference the same element.
        self.assertIn("const controlsEl = (", source)
        row = source.index('<div className="combat-bottom-row">')
        end = source.index('</div>\n        </div>\n      </div>', row)
        block = source[row:end]
        # No inline <CombatControls> in the row — it is placed only via controlsEl.
        self.assertNotIn("<CombatControls", block)

    def test_actions_lead_the_landscape_right_column(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        row = source.index('<div className="combat-bottom-row">')
        end = source.index('</div>\n        </div>\n      </div>', row)
        block = source[row:end]

        landscape_controls = block.index("{isLandscapeCoarseCombat && controlsEl}")
        roster = block.index("roster-panel")
        portrait_controls = block.index("{!isLandscapeCoarseCombat && controlsEl}")

        # Landscape places the console at the very top of the column…
        self.assertLess(landscape_controls, roster)
        # …while the portrait/desktop placement stays below the roster.
        self.assertLess(roster, portrait_controls)


if __name__ == "__main__":
    unittest.main()
