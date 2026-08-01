import unittest
from datetime import UTC, datetime

from mythos_core import Choice, Scene
from mythos_narrative.variation import NoveltyController


class NoveltyControllerTest(unittest.TestCase):
    def _scene(
        self,
        scene_id: str,
        *,
        title: str,
        location: str,
        narration: str,
    ) -> Scene:
        return Scene(
            scene_id=scene_id,
            loop_id="loop_1",
            turn_index=int(scene_id.rsplit("_", 1)[-1]),
            title=title,
            location=location,
            narration=narration,
            choices=[Choice(f"choice_{scene_id}", "Enter", "explore")],
            visual_brief="A route.",
            created_at=datetime(2026, 5, 30, tzinfo=UTC),
        )

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

    def test_assesses_normalized_title_location_and_motif_streak(self) -> None:
        controller = NoveltyController()
        signal = controller.build_signal(
            [
                self._scene(
                    "scene_1",
                    title="The Sluice Gate Squeeze",
                    location="C-17 Drainage Network",
                    narration="Searchlights tighten above the drainage channel.",
                ),
                self._scene(
                    "scene_2",
                    title="Side Sluice",
                    location="c17_drainage_network",
                    narration="A patrol closes the sewer pursuit route.",
                ),
            ]
        )

        assessment = controller.assess_candidate(
            signal,
            title="Changed The Sluice Gate Squeeze",
            location="C-17 drainage network",
            narration="The searchlight pursuit continues through the drain.",
        )

        self.assertTrue(assessment.repeated_title)
        self.assertTrue(assessment.repeated_location_streak)
        self.assertTrue(assessment.repeated_motif_streak)

    def test_revision_moves_structural_repeat_to_route_location(self) -> None:
        controller = NoveltyController()
        signal = controller.build_signal(
            [
                self._scene(
                    "scene_1",
                    title="First Drain",
                    location="C-17 Drainage Network",
                    narration="A searchlight sweeps the drain.",
                ),
                self._scene(
                    "scene_2",
                    title="Second Drain",
                    location="C-17 Drainage Network",
                    narration="The pursuit enters the sewer.",
                ),
            ]
        )

        revision = controller.revise_candidate(
            signal,
            title="Third Drain",
            location="C-17 Drainage Network",
            narration="The chase follows the same drainage route.",
            alternate_location="폐쇄된 화물 승강장",
            language="ko",
        )

        self.assertIsNotNone(revision)
        assert revision is not None
        self.assertEqual(revision.location, "폐쇄된 화물 승강장")
        self.assertFalse(revision.title.startswith(("Changed ", "달라진 ")))
        self.assertIn("새 제약", revision.narration)

    def test_nonrepeating_candidate_is_not_revised(self) -> None:
        controller = NoveltyController()
        signal = controller.build_signal(
            [
                self._scene(
                    "scene_1",
                    title="Night Market Bargain",
                    location="Jongno Night Market",
                    narration="A vendor opens a hidden stall.",
                ),
                self._scene(
                    "scene_2",
                    title="Signal Archive",
                    location="Archive Stack",
                    narration="Static runs across an old circuit.",
                ),
            ]
        )

        revision = controller.revise_candidate(
            signal,
            title="Rooftop Witness",
            location="Rain Tower Roof",
            narration="A witness points toward a distant helicopter.",
            alternate_location=None,
            language="en",
        )

        self.assertIsNone(revision)
