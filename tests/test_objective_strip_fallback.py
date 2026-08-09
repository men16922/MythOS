"""Source-level lock: the 현재 목표 line must survive an omitted `objective`.

`Scene.objective` is optional — it is absent from the scene schema's `required`
list and typed nullable — so the model may legitimately omit it on any turn.
`_chapter_goal` exists to fill that gap; its own docstring says it gives the
objective strip a stable goal "even when the per-scene LLM `objective` is vague
or missing".

The mobile/collapsible layout implemented that fallback. The desktop layout did
not: it rendered the act goal and the current objective as two independent rows,
each guarded by its own field. So whenever the model omitted `objective`, the
desktop strip kept the ACT GOAL row and silently dropped the CURRENT OBJECTIVE
row — the strip never looked empty, which is why a server-side check ("chapter
goal covers all five playable phases, so the strip cannot go empty") ruled the
reported symptom not reproducible. The missing piece was never the strip; it was
that one line.

The lock is textual (`make check` has no frontend unit-test runner), matching
`test_scene_character_dialogue_gate.py`: it pins the load-bearing shape so a
refactor that reintroduces a bare `scene.objective &&` guard on the current-
objective row fails here.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "src/mythos_ui/src/StoryPanel.tsx"


class ObjectiveStripFallbackTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = (ROOT / SOURCE).read_text(encoding="utf-8")
        start = self.source.index("function ObjectiveStrip(")
        self.strip = self.source[start : self.source.index("\nfunction ", start + 1)]

    def test_the_shared_fallback_is_defined_once(self) -> None:
        # Both layouts read the current-objective text from this one expression,
        # so they cannot drift apart again.
        self.assertIn('scene.objective || scene.chapter_goal || ""', self.strip)
        self.assertEqual(1, self.strip.count("scene.objective ||"))

    def test_neither_layout_guards_the_current_row_on_objective_alone(self) -> None:
        # `{scene.objective && (` was the defect: it made the 현재 목표 row
        # conditional on the very field that is allowed to be missing.
        self.assertNotIn("{scene.objective && (", self.strip)

    def test_the_act_goal_row_only_appears_alongside_a_current_objective(self) -> None:
        # Otherwise the act goal renders twice — once as itself and once as the
        # fallback text of the current-objective line.
        act_goal_rows = re.findall(r"\{(\w+) && \(\n\s+<div className=\"objective-main objective-chapter\"", self.strip)
        self.assertEqual(["showChapterInBody", "showChapterInBody"], act_goal_rows)
        self.assertIn(
            "const showChapterInBody = Boolean(scene.chapter_goal && scene.objective);",
            self.strip,
        )

    def test_both_layouts_render_the_current_kicker(self) -> None:
        # The kicker is what names the line for the player; two layouts, two
        # occurrences (one-line/collapsible summary, and the desktop row).
        self.assertEqual(3, self.strip.count('t("story.obj.current")'))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
