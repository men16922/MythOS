import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import cast
from unittest import mock

from mythos_core import LoopPhase, LoopState, Scene
from mythos_memory import MythOSStore
from mythos_runtime import visual_orchestration
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.visual_orchestration import (
    _curated_anchor_image,
    maybe_generate_scene_image,
)

NOW = datetime(2026, 5, 30, tzinfo=UTC)


def _loop(route_map: dict | None) -> LoopState:
    state = {ROUTE_MAP_KEY: route_map} if route_map is not None else {}
    return LoopState(
        loop_id="loop_test",
        player_id="player_test",
        seed="seed",
        phase=LoopPhase.EXPLORE,
        location_id="data-layer-01",
        stability=60,
        tension=30,
        started_at=NOW,
        state=state,
    )


def _scene() -> Scene:
    return Scene(
        scene_id="scene_test",
        loop_id="loop_test",
        turn_index=0,
        title="Threshold",
        location="data-layer-01",
        narration="The gate opens.",
        choices=[],
        visual_brief="A luminous gate.",
        created_at=NOW,
    )


class CuratedAnchorImageTests(unittest.TestCase):
    def test_active_cutscene_image_precedes_route_anchor(self) -> None:
        loop = _loop({"current": "n1", "nodes": {"n1": {"anchor": True, "image": "scenes/x.png"}}})
        state = dict(loop.state)
        state["_active_cutscene"] = {"image": "characters/se-rin.png"}
        loop = replace(loop, state=state)
        self.assertEqual(_curated_anchor_image(loop), "characters/se-rin.png")

    def test_returns_image_for_anchor_with_curated_image(self) -> None:
        rm = {"current": "n1", "nodes": {"n1": {"anchor": True, "image": "scenes/x.png"}}}
        self.assertEqual(_curated_anchor_image(_loop(rm)), "scenes/x.png")

    def test_none_when_node_not_anchor(self) -> None:
        rm = {"current": "n1", "nodes": {"n1": {"anchor": False, "image": "scenes/x.png"}}}
        self.assertIsNone(_curated_anchor_image(_loop(rm)))

    def test_none_when_anchor_has_no_image(self) -> None:
        rm = {"current": "n1", "nodes": {"n1": {"anchor": True}}}
        self.assertIsNone(_curated_anchor_image(_loop(rm)))

    def test_none_when_no_route_map(self) -> None:
        self.assertIsNone(_curated_anchor_image(_loop(None)))


class MaybeGenerateSkipsCuratedAnchorTests(unittest.TestCase):
    def test_skips_flux_on_curated_anchor_even_when_image_every_turn(self) -> None:
        rm = {"current": "n1", "nodes": {"n1": {"anchor": True, "image": "scenes/x.png"}}}
        # store/provider intentionally None: the skip must short-circuit before use.
        result = maybe_generate_scene_image(
            store=cast(MythOSStore, None),
            options=RuntimeOptions(with_image=True, image_every_turn=True, scenario_id="neo-seoul"),
            loop=_loop(rm),
            scene=_scene(),
            player_id="player_test",
        )
        self.assertIsNone(result)

    def test_with_image_off_still_returns_none(self) -> None:
        result = maybe_generate_scene_image(
            store=cast(MythOSStore, None),
            options=RuntimeOptions(with_image=False),
            loop=_loop(None),
            scene=_scene(),
            player_id="player_test",
        )
        self.assertIsNone(result)


class SyncGenerationTests(unittest.TestCase):
    """Image generation is synchronous in-request (the Redis queue/worker was
    removed 2026-07-04): with_image on a non-curated scene must generate, and
    the default fast_mode=True must not veto it. The fast_mode veto silently
    disabled every dynamic scene image on Cloud Run."""

    def _run(self, options: RuntimeOptions) -> object:
        class _RecordingService:
            def __init__(self, **_: object) -> None:
                pass

            def generate_for_scene(self, *_: object, **__: object) -> str:
                return "generated"

        with (
            mock.patch.object(visual_orchestration, "storage_adapter_for", lambda kind: object()),
            mock.patch.object(visual_orchestration, "VisualService", _RecordingService),
        ):
            return maybe_generate_scene_image(
                store=cast(MythOSStore, None),
                options=options,
                loop=_loop(None),
                scene=_scene(),
                player_id="player_test",
            )

    def test_generates_despite_default_fast_mode(self) -> None:
        result = self._run(RuntimeOptions(with_image=True, image_every_turn=True))
        self.assertEqual(result, "generated")

    def test_key_beat_turn_zero_generates_without_every_turn(self) -> None:
        result = self._run(RuntimeOptions(with_image=True))
        self.assertEqual(result, "generated")  # _scene() is turn 0 = key beat


if __name__ == "__main__":
    unittest.main()
