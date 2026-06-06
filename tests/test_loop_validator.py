import unittest
from datetime import UTC, datetime

from mythos_core import Choice, LoopPhase, LoopState, Scene
from mythos_loop import Validator
from mythos_narrative import ScenePayload, WorldDelta


class ValidatorTest(unittest.TestCase):
    def setUp(self) -> None:
        now = datetime(2026, 5, 30, tzinfo=UTC)
        self.loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=now,
        )
        self.scene = Scene(
            scene_id="scene_1",
            loop_id="loop_1",
            turn_index=0,
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[Choice("choice_1", "Enter", "explore")],
            visual_brief="A luminous gate.",
            created_at=now,
        )

    def test_rejects_invalid_phase_transition(self) -> None:
        result = Validator().validate_phase_transition(LoopPhase.CONNECT, LoopPhase.REWRITE)

        self.assertFalse(result.ok)
        self.assertEqual(result.errors[0].code, "invalid_phase_transition")

    def test_rejects_invalid_state_delta(self) -> None:
        result = Validator().validate_state_delta({"unknown": True})

        self.assertFalse(result.ok)
        self.assertEqual(result.errors[0].code, "invalid_state_delta")

    def test_rejects_invalid_choice_count(self) -> None:
        payload = ScenePayload(
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[],
            visual_brief="A luminous gate.",
            world_delta=WorldDelta(),
        )

        result = Validator().validate_scene_payload(self.loop, self.scene, payload)

        self.assertFalse(result.ok)
        self.assertEqual(result.errors[0].code, "invalid_choice_count")

    def test_repairs_overlarge_world_delta(self) -> None:
        payload = ScenePayload(
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[Choice("choice_1", "Enter", "explore")],
            visual_brief="A luminous gate.",
            world_delta=WorldDelta(stability=-99, tension=99),
        )

        result = Validator().validate_scene_payload(self.loop, self.scene, payload)

        self.assertTrue(result.ok)
        assert result.repaired_payload is not None
        self.assertEqual(result.repaired_payload.world_delta.stability, -25)
        self.assertEqual(result.repaired_payload.world_delta.tension, 25)

    def test_repairs_invalid_choices(self) -> None:
        payload = ScenePayload(
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[
                Choice("", "", ""),
                Choice("dup", "First", "explore"),
                Choice("dup", "Second", "explore"),
            ],
            visual_brief="A luminous gate.",
            world_delta=WorldDelta(),
        )

        result = Validator().validate_scene_payload(self.loop, self.scene, payload)

        self.assertFalse(result.ok)
        repaired = result.repaired_payload
        self.assertIsNotNone(repaired)
        assert repaired is not None
        self.assertEqual(len(repaired.choices), 3)
        self.assertEqual(repaired.choices[0].choice_id, "choice_0")
        self.assertEqual(repaired.choices[0].label, "계속하기")
        self.assertEqual(repaired.choices[0].intent, "explore")
        self.assertEqual(repaired.choices[1].choice_id, "dup")
        self.assertEqual(repaired.choices[2].choice_id, "dup_2")
        self.assertTrue(all(not err.is_fatal for err in result.errors))
