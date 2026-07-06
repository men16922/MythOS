"""S3 variant-routed opening: early-window Se-rin contact-flag clamp.

On a variant loop the opening window (turn <= 3) belongs to the variant hook,
so the canonical first-contact flags (met/trusted/refused_se_rin) must not
enter world state from the model. Design:
docs/plans/2026-07-06-variant-routed-opening.md §2.3.
"""

import unittest
from datetime import UTC, datetime

from mythos_core import Choice, LoopPhase, LoopState, Scene
from mythos_loop import LoopEngine, Validator
from mythos_loop.validator import SE_RIN_CLAMP_MAX_TURN, SE_RIN_CONTACT_FLAGS
from mythos_narrative import ScenePayload, WorldDelta

NOW = datetime(2026, 7, 7, tzinfo=UTC)


def _loop(state: dict | None = None) -> LoopState:
    return LoopState(
        loop_id="loop_1",
        player_id="player_1",
        seed="seed_1",
        phase=LoopPhase.CONNECT,
        location_id="data-layer-01",
        stability=50,
        tension=20,
        started_at=NOW,
        state=state or {},
    )


def _scene(turn_index: int) -> Scene:
    return Scene(
        scene_id="scene_1",
        loop_id="loop_1",
        turn_index=turn_index,
        title="Threshold",
        location="data-layer-01",
        narration="The gate opens.",
        choices=[Choice("choice_1", "Enter", "explore")],
        visual_brief="A luminous gate.",
        created_at=NOW,
    )


def _payload(flags: list[str]) -> ScenePayload:
    return ScenePayload(
        title="Threshold",
        location="data-layer-01",
        narration="The gate opens.",
        choices=[Choice("choice_1", "Enter", "explore")],
        visual_brief="A luminous gate.",
        world_delta=WorldDelta(flags=flags),
    )


class SeRinFlagClampValidatorTest(unittest.TestCase):
    def test_variant_loop_strips_contact_flags_in_window(self) -> None:
        loop = _loop({"_opening_variant": "tae_o"})
        payload = _payload(["met_se_rin", "trusted_se_rin", "refused_se_rin", "found_terminal"])

        result = Validator().validate_scene_payload(loop, _scene(1), payload)

        self.assertTrue(result.ok)
        assert result.repaired_payload is not None
        self.assertEqual(result.repaired_payload.world_delta.flags, ["found_terminal"])

    def test_variant_loop_strips_at_window_boundary(self) -> None:
        loop = _loop({"_opening_variant": "kai"})
        payload = _payload(["met_se_rin"])

        result = Validator().validate_scene_payload(loop, _scene(SE_RIN_CLAMP_MAX_TURN), payload)

        assert result.repaired_payload is not None
        self.assertEqual(result.repaired_payload.world_delta.flags, [])

    def test_variant_loop_passes_flags_after_window(self) -> None:
        loop = _loop({"_opening_variant": "kai"})
        payload = _payload(["met_se_rin", "found_terminal"])

        result = Validator().validate_scene_payload(
            loop, _scene(SE_RIN_CLAMP_MAX_TURN + 1), payload
        )

        self.assertTrue(result.ok)
        self.assertIsNone(result.repaired_payload)

    def test_default_loop_is_untouched_in_window(self) -> None:
        for state in ({}, {"_opening_variant": "default"}, {"_opening_variant": None}):
            with self.subTest(state=state):
                payload = _payload(["met_se_rin", "trusted_se_rin"])

                result = Validator().validate_scene_payload(_loop(dict(state)), _scene(0), payload)

                self.assertTrue(result.ok)
                self.assertIsNone(result.repaired_payload)

    def test_non_contact_flags_untouched_on_variant_loop(self) -> None:
        loop = _loop({"_opening_variant": "solo"})
        payload = _payload(["found_terminal", "heard_signal"])

        result = Validator().validate_scene_payload(loop, _scene(0), payload)

        self.assertTrue(result.ok)
        self.assertIsNone(result.repaired_payload)

    def test_contact_flag_set_matches_design(self) -> None:
        self.assertEqual(
            SE_RIN_CONTACT_FLAGS, {"met_se_rin", "trusted_se_rin", "refused_se_rin"}
        )
        self.assertEqual(SE_RIN_CLAMP_MAX_TURN, 3)


class SeRinFlagClampEngineTest(unittest.TestCase):
    """The clamp holds through apply_scene_payload: state merge + event record."""

    def test_variant_loop_state_and_event_carry_no_contact_flags(self) -> None:
        loop = _loop({"scenario_id": "neo-seoul", "_opening_variant": "tae_o"})
        payload = _payload(["met_se_rin", "found_terminal"])

        transition = LoopEngine().apply_scene_payload(loop, _scene(1), payload)

        self.assertTrue(transition.ok)
        self.assertNotIn("met_se_rin", transition.loop.state["flags"])
        self.assertIn("found_terminal", transition.loop.state["flags"])
        scene_event = transition.events[-1]
        self.assertNotIn("met_se_rin", scene_event.state_delta.get("flags", []))

    def test_default_loop_state_keeps_contact_flags(self) -> None:
        # No scenario_id: the neo-seoul keyword heuristic stays out of the way,
        # isolating the clamp's default-loop pass-through.
        loop = _loop({})
        payload = _payload(["met_se_rin"])

        transition = LoopEngine().apply_scene_payload(loop, _scene(1), payload)

        self.assertTrue(transition.ok)
        self.assertIn("met_se_rin", transition.loop.state["flags"])

    def test_variant_loop_passes_contact_flags_after_window(self) -> None:
        loop = _loop({"scenario_id": "neo-seoul", "_opening_variant": "su_ah"})
        payload = _payload(["trusted_se_rin"])

        transition = LoopEngine().apply_scene_payload(
            loop, _scene(SE_RIN_CLAMP_MAX_TURN + 1), payload
        )

        self.assertTrue(transition.ok)
        self.assertIn("trusted_se_rin", transition.loop.state["flags"])


if __name__ == "__main__":
    unittest.main()
