import unittest
from datetime import UTC, datetime

from mythos_core import Choice, Scene
from mythos_narrative.variation import NoveltyController


class NoveltyControllerTest(unittest.TestCase):
    def test_builds_notes_from_recent_scenes(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        scenes = [
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=0,
                title="Threshold",
                location="data-layer-01",
                narration="A gate opens.",
                choices=[Choice("choice_1", "Enter", "explore")],
                visual_brief="A gate.",
                created_at=now,
            ),
            Scene(
                scene_id="scene_2",
                loop_id="loop_2",
                turn_index=0,
                title="Threshold",
                location="data-layer-01",
                narration="A gate opens again.",
                choices=[Choice("choice_1", "Enter", "explore")],
                visual_brief="A gate.",
                created_at=now,
            ),
        ]

        signal = NoveltyController().build_signal(scenes)

        self.assertEqual(signal.recent_titles, ["Threshold"])
        self.assertEqual(signal.recent_locations, ["data-layer-01"])
        self.assertEqual(signal.recent_choice_patterns, ["explorex1"])
        self.assertTrue(any("Avoid reusing" in note for note in signal.notes))

    def test_builds_notes_from_repeated_choice_intent_patterns(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        scenes = [
            Scene(
                scene_id="scene_1",
                loop_id="loop_1",
                turn_index=0,
                title="First",
                location="data-layer-01",
                narration="A gate opens.",
                choices=[
                    Choice("choice_1", "Search", "explore"),
                    Choice("choice_2", "Touch", "interact"),
                    Choice("choice_3", "Listen", "interact"),
                ],
                visual_brief="A gate.",
                created_at=now,
            ),
            Scene(
                scene_id="scene_2",
                loop_id="loop_1",
                turn_index=1,
                title="Second",
                location="data-layer-02",
                narration="A signal answers.",
                choices=[
                    Choice("choice_1", "Rewrite", "rewrite"),
                    Choice("choice_2", "Archive", "archive"),
                ],
                visual_brief="A signal.",
                created_at=now,
            ),
        ]

        signal = NoveltyController().build_signal(scenes)

        self.assertEqual(
            signal.recent_choice_patterns,
            ["archivex1, rewritex1", "explorex1, interactx2"],
        )
        self.assertTrue(any("choice intent patterns" in note for note in signal.notes))
