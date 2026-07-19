"""Source-level lock for the Landscape Combat LC3 slice: in landscape+coarse
combat, shrink the app header/tab bar and collapse the encounter (learning
goal) banner to a one-line chip so the board fills more of the fixed-height
left column. docs/plans/2026-07-08-design-system.md "Landscape Combat" (LC
refinement).
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC3Test(unittest.TestCase):
    def test_header_and_tabs_compact_in_landscape_coarse_pointer(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        idx = css.index("@media (orientation: landscape) and (pointer: coarse) {")
        block = css[idx : idx + 1400]
        self.assertIn("header {", block)
        self.assertIn("header .sub {", block)
        self.assertIn("display: none;", block)
        self.assertIn(".tabs {", block)
        self.assertIn(".tab-btn {", block)

    def test_encounter_goal_is_a_globally_folded_top_row(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        self.assertIn('<details className="combat-learning-goal">', source)
        self.assertIn('<summary className="combat-learning-goal-summary-row">', source)
        self.assertIn(".combat-learning-goal-summary-row {", css)
        self.assertIn(".combat-learning-goal-summary {", css)
        self.assertIn("white-space: nowrap;", css)
        self.assertIn("text-overflow: ellipsis;", css)

    def test_learning_goal_summary_wrapped_for_truncation(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn(
            '<span className="combat-learning-goal-summary">{firstSentence}</span>',
            source,
        )


if __name__ == "__main__":
    unittest.main()
