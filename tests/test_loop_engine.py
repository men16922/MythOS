import unittest
from dataclasses import replace
from datetime import UTC, datetime

from mythos_core import Choice, LoopPhase, LoopState, Scene
from mythos_loop import LoopEngine, create_player_event
from mythos_narrative import ScenePayload, WorldDelta


class LoopEngineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 5, 30, tzinfo=UTC)
        self.loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=self.now,
        )

    def test_three_turn_loop_state_transition(self) -> None:
        engine = LoopEngine()
        loop = self.loop

        # Turn 0: CONNECT -> EXPLORE (automatic)
        scene = self._scene(0)
        payload = self._payload(tension=5)
        transition = engine.apply_scene_payload(loop, scene, payload)
        self.assertTrue(transition.ok)
        loop = transition.loop
        self.assertEqual(loop.phase, LoopPhase.EXPLORE)

        # Turn 1: Stay in EXPLORE (no requested_next_phase)
        scene = self._scene(1)
        payload = self._payload(tension=5)
        transition = engine.apply_scene_payload(loop, scene, payload)
        self.assertTrue(transition.ok)
        loop = transition.loop
        self.assertEqual(loop.phase, LoopPhase.EXPLORE)

        # Turn 2: Move to INTERACT (explicit request)
        scene = self._scene(2)
        payload = self._payload(tension=5)
        payload = replace(payload, requested_next_phase="interact")
        transition = engine.apply_scene_payload(loop, scene, payload)
        self.assertTrue(transition.ok)
        loop = transition.loop
        self.assertEqual(loop.phase, LoopPhase.INTERACT)

        self.assertEqual(loop.tension, 35)
        self.assertEqual(loop.state["flags"], ["signal_detected"])

    def test_archive_trigger_creates_echo(self) -> None:
        engine = LoopEngine()
        scene = self._scene(0)
        payload = self._payload(end_condition="archive")
        transition = engine.apply_scene_payload(
            self.loop,
            scene,
            payload,
            create_player_event(self.loop.loop_id, 0, "force archive"),
        )

        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.phase, LoopPhase.ARCHIVE)
        self.assertIsNotNone(transition.echo)
        assert transition.echo is not None
        self.assertEqual(transition.echo.source_loop_id, self.loop.loop_id)
        self.assertEqual(len(transition.loop.active_echoes), 1)

    def test_soft_defeat_pending_blocks_immediate_archive(self) -> None:
        engine = LoopEngine()
        loop = replace(
            self.loop,
            phase=LoopPhase.EXPLORE,
            tension=88,
            state={"_soft_defeat_pending": True, "_last_combat_outcome": "soft_defeat"},
        )
        payload = self._payload(tension=5, end_condition="archive")

        transition = engine.apply_scene_payload(loop, self._scene(3), payload)

        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.phase, LoopPhase.EXPLORE)
        self.assertIsNone(transition.echo)
        self.assertEqual(transition.loop.tension, 93)

    def test_archive_phase_transitions_to_ended(self) -> None:
        archive_loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.ARCHIVE,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=self.now,
        )

        transition = LoopEngine().apply_scene_payload(
            archive_loop,
            self._scene(1),
            self._payload(),
        )

        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.phase, LoopPhase.ENDED)
        self.assertIsNotNone(transition.loop.ended_at)

    def test_stability_and_tension_are_clamped(self) -> None:
        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=5,
            tension=95,
            started_at=self.now,
        )

        transition = LoopEngine().apply_scene_payload(
            loop,
            self._scene(0),
            ScenePayload(
                title="Threshold",
                location="data-layer-01",
                narration="The gate opens.",
                choices=[Choice("choice_1", "Enter", "explore")],
                visual_brief="A luminous gate.",
                world_delta=WorldDelta(stability=-25, tension=25),
            ),
        )

        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.stability, 0)
        self.assertEqual(transition.loop.tension, 100)

    def test_ended_loop_mutation_guard(self) -> None:
        ended = LoopState(
            loop_id="loop_ended",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.ENDED,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=self.now,
            ended_at=self.now,
        )

        transition = LoopEngine().apply_scene_payload(
            ended,
            self._scene(0, loop_id="loop_ended"),
            self._payload(),
        )

        self.assertFalse(transition.ok)
        self.assertEqual(transition.errors[0].code, "loop_ended")

    def _scene(self, turn: int, loop_id: str = "loop_1") -> Scene:
        return Scene(
            scene_id=f"scene_{turn}",
            loop_id=loop_id,
            turn_index=turn,
            title=f"Threshold {turn}",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[Choice(f"choice_{turn}", "Enter", "explore")],
            visual_brief="A luminous gate.",
            created_at=self.now,
        )

    def _payload(self, tension: int = 1, end_condition: str | None = None) -> ScenePayload:
        return ScenePayload(
            title="Threshold",
            location="data-layer-01",
            narration="The gate opens.",
            choices=[Choice("choice_1", "Enter", "explore")],
            visual_brief="A luminous gate.",
            world_delta=WorldDelta(stability=0, tension=tension, flags=["signal_detected"]),
            end_condition=end_condition,
        )

    def test_player_hp_clamp_in_delta(self) -> None:
        engine = LoopEngine()

        # Test case 1: Healing is capped at max HP
        loop = replace(self.loop, state={"_party": {"player_hp": 15, "player_max_hp": 20}})
        scene = self._scene(0)
        payload = replace(self._payload(), world_delta=WorldDelta(hp=10))

        transition = engine.apply_scene_payload(loop, scene, payload)
        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.state["_party"]["player_hp"], 20)
        self.assertEqual(transition.loop.state["_party"]["player_max_hp"], 20)

        # Test case 2: Damage is clamped at 0
        loop = replace(self.loop, state={"_party": {"player_hp": 15, "player_max_hp": 20}})
        payload = replace(self._payload(), world_delta=WorldDelta(hp=-25))

        transition = engine.apply_scene_payload(loop, scene, payload)
        self.assertTrue(transition.ok)
        self.assertEqual(transition.loop.state["_party"]["player_hp"], 0)
