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

    def test_empty_clue_objects_do_not_create_placeholder_shards(self) -> None:
        payload = replace(
            self._payload(),
            world_delta=WorldDelta(clues=[{}, {"symbol": "clue"}]),
        )
        transition = LoopEngine().apply_scene_payload(self.loop, self._scene(0), payload)
        self.assertEqual(transition.discovered_shards, [])

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

    def test_soft_defeat_pending_also_blocks_a_requested_archive_phase(self) -> None:
        # The prompt advertises requested_next_phase "archive"; that branch used
        # to bypass the soft-defeat guard that end_condition/thresholds obey.
        engine = LoopEngine()
        loop = replace(
            self.loop,
            phase=LoopPhase.EXPLORE,
            state={"_soft_defeat_pending": True, "_last_combat_outcome": "soft_defeat"},
        )
        payload = replace(self._payload(tension=1), requested_next_phase="archive")

        transition = engine.apply_scene_payload(loop, self._scene(3), payload)

        self.assertEqual(transition.loop.phase, LoopPhase.EXPLORE)
        self.assertIsNone(transition.echo)

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

    def test_transition_surfaces_validator_repairs(self) -> None:
        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
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
                world_delta=WorldDelta(stability=-99, tension=0),
            ),
        )

        self.assertTrue(transition.ok)
        self.assertIn("world_delta_clamped", transition.repairs)

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


class SeRinContactFlagTest(unittest.TestCase):
    """The opening's accept/refuse branch must work in the product's default language.

    The keyword lists were Korean-only, and the branch is not symmetric — anything
    that is not a detected refusal falls through to ``met_se_rin``. So on an EN
    loop every player was recorded as having taken Se-rin's hand, whatever they
    chose, and ``refused_se_rin`` could never be set. These flags gate route
    content, Se-rin's presence in combat and ending branches, so the whole refusal
    arm of the opening was unreachable in English (measured 2026-08-09).
    """

    def setUp(self) -> None:
        self.now = datetime(2026, 8, 9, tzinfo=UTC)

    def _flags(self, action: str) -> list[str]:
        from mythos_loop import create_player_event

        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=self.now,
            state={"scenario_id": "neo-seoul", "_opening_variant": "default"},
        )
        scene = Scene(
            scene_id="scene_0",
            loop_id="loop_1",
            turn_index=0,
            title="C-17",
            location="data-layer-01",
            narration="The alley lights die.",
            choices=[Choice("choice_0", action, "explore")],
            visual_brief="",
            created_at=self.now,
        )
        payload = ScenePayload(
            title="C-17",
            location="data-layer-01",
            narration="The alley lights die.",
            choices=[Choice("choice_1", "Next", "explore")],
            visual_brief="",
            world_delta=WorldDelta(stability=0, tension=1, flags=[]),
        )
        event = create_player_event(loop_id="loop_1", turn_index=0, action=action)
        transition = LoopEngine().apply_scene_payload(loop, scene, payload, chosen_event=event)
        return [f for f in transition.loop.state.get("flags", []) if "se_rin" in f]

    def test_refusal_clears_a_pre_seeded_met_flag(self) -> None:
        # Loop 1 pre-seeds met_se_rin (tutorial party). The merge is a union, so
        # removing the flag from the delta alone left both flags set.
        from mythos_loop import create_player_event

        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed_1",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=self.now,
            state={
                "scenario_id": "neo-seoul",
                "_opening_variant": "default",
                "flags": ["met_se_rin", "tutorial_loop"],
            },
        )
        action = "Refuse her hand and slip into the alley alone"
        scene = Scene(
            scene_id="scene_0",
            loop_id="loop_1",
            turn_index=0,
            title="C-17",
            location="data-layer-01",
            narration="The alley lights die.",
            choices=[Choice("choice_0", action, "explore")],
            visual_brief="",
            created_at=self.now,
        )
        payload = ScenePayload(
            title="C-17",
            location="data-layer-01",
            narration="The alley lights die.",
            choices=[Choice("choice_1", "Next", "explore")],
            visual_brief="",
            world_delta=WorldDelta(stability=0, tension=1, flags=[]),
        )
        event = create_player_event(loop_id="loop_1", turn_index=0, action=action)
        transition = LoopEngine().apply_scene_payload(loop, scene, payload, chosen_event=event)
        flags = transition.loop.state["flags"]
        self.assertIn("refused_se_rin", flags)
        self.assertNotIn("met_se_rin", flags)
        self.assertIn("tutorial_loop", flags)

    def test_english_refusal_is_recorded_as_refusal(self) -> None:
        for action in (
            "Refuse her hand and slip into the alley alone",
            "Decline unexplained favors and seek another exit",
            "Hide and watch her from the shadows",
        ):
            with self.subTest(action=action):
                self.assertEqual(self._flags(action), ["refused_se_rin"])

    def test_english_acceptance_is_recorded_as_acceptance(self) -> None:
        for action in (
            "Take Jung Se-rin's hand and run",
            "Follow her onto the bike",
            "Trust the stranger and go together",
        ):
            with self.subTest(action=action):
                self.assertEqual(self._flags(action), ["met_se_rin"])

    def test_korean_behaviour_is_unchanged(self) -> None:
        self.assertEqual(self._flags("정세린의 손을 잡는다"), ["met_se_rin"])
        self.assertEqual(self._flags("그녀를 따라 오토바이에 탑승한다"), ["met_se_rin"])
        self.assertEqual(self._flags("그녀의 제안을 거절하고 혼자 움직인다"), ["refused_se_rin"])

    def test_refusal_verb_beats_the_noun_it_refuses(self) -> None:
        # "Refuse her hand" carries both signals; the old rule let "hand" win.
        self.assertEqual(self._flags("Refuse her hand"), ["refused_se_rin"])
        # ...but a soft marker still defers to acceptance.
        self.assertEqual(self._flags("Take her hand instead of hiding alone"), ["met_se_rin"])

    def test_ascii_keywords_do_not_match_inside_words(self) -> None:
        # "own" inside *downtown*, "hand" inside *handle* — these keywords pick a
        # branch of the story, so a substring must not decide it.
        self.assertEqual(self._flags("Head downtown past the handlers"), ["met_se_rin"])

    def test_unmatched_action_keeps_the_existing_default(self) -> None:
        self.assertEqual(self._flags("Step toward the far end"), ["met_se_rin"])
