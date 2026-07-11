"""Source-level lock for the Landscape Combat LC6 slice + portrait extension: on
any COARSE-pointer (touch) combat the command console (target selection +
Attack/Defend/Skills) leads the row (actions-first, right under the board) while
DESKTOP (fine pointer) keeps it in its original mid slot below the roster.
Landscape was the original LC6 case; portrait joined it 2026-07-11 ("세로 전투
플레이 불가") via the shared `isCoarsePointer` gate.
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

    def test_actions_lead_the_row_on_touch(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        row = source.index('<div className="combat-bottom-row">')
        end = source.index('</div>\n        </div>\n      </div>', row)
        block = source[row:end]

        touch_controls = block.index("{isCoarsePointer && controlsEl}")
        roster = block.index("roster-panel")
        desktop_controls = block.index("{!isCoarsePointer && controlsEl}")

        # Any touch device places the console at the top of the row (actions-first)…
        self.assertLess(touch_controls, roster)
        # …while the desktop (fine-pointer) placement stays below the roster.
        self.assertLess(roster, desktop_controls)


if __name__ == "__main__":
    unittest.main()
