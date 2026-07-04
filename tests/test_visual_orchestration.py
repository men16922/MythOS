import unittest
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from unittest import mock

from mythos_core import AssetRecord, LoopPhase, LoopState, Scene
from mythos_core.clock import utc_now
from mythos_runtime import visual_orchestration
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.visual_orchestration import (
    _curated_anchor_image,
    _has_inflight_asset,
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
        loop = _loop(
            {"current": "n1", "nodes": {"n1": {"anchor": True, "image": "scenes/x.png"}}}
        )
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
            store=None,  # type: ignore[arg-type]
            options=RuntimeOptions(with_image=True, image_every_turn=True, scenario_id="neo-seoul"),
            loop=_loop(rm),
            scene=_scene(),
            player_id="player_test",
        )
        self.assertIsNone(result)

    def test_with_image_off_still_returns_none(self) -> None:
        result = maybe_generate_scene_image(
            store=None,  # type: ignore[arg-type]
            options=RuntimeOptions(with_image=False),
            loop=_loop(None),
            scene=_scene(),
            player_id="player_test",
        )
        self.assertIsNone(result)


class SyncFallbackTests(unittest.TestCase):
    """image_sync_fallback must survive the default fast_mode=True.

    Cloud Run has no Redis worker, so the async enqueue always fails; the API
    opts into the sync fallback via image_sync_fallback=True but never touches
    fast_mode (default True). A fast_mode veto here silently disabled every
    dynamic scene image on Cloud Run (2026-07-04)."""

    def _run(self, options: RuntimeOptions) -> object:
        calls: list[str] = []

        class _DeadQueue:
            def worker_alive(self) -> bool:
                return False

        class _RecordingService:
            def __init__(self, **_: object) -> None:
                pass

            def generate_for_scene(self, *_: object, **__: object) -> str:
                calls.append("sync")
                return "generated"

        with (
            mock.patch.object(visual_orchestration, "VisualJobQueue", _DeadQueue),
            mock.patch.object(visual_orchestration, "storage_adapter_for", lambda kind: object()),
            mock.patch.object(visual_orchestration, "VisualService", _RecordingService),
        ):
            return maybe_generate_scene_image(
                store=None,  # type: ignore[arg-type]
                options=options,
                loop=_loop(None),
                scene=_scene(),
                player_id="player_test",
            )

    def test_sync_fallback_runs_despite_default_fast_mode(self) -> None:
        result = self._run(
            RuntimeOptions(
                with_image=True,
                visual_async=True,
                image_every_turn=True,
                image_sync_fallback=True,
            )
        )
        self.assertEqual(result, "generated")

    def test_no_fallback_opt_in_still_skips(self) -> None:
        result = self._run(
            RuntimeOptions(with_image=True, visual_async=True, image_every_turn=True)
        )
        self.assertIsNone(result)


def _asset(status: str, age_seconds: float) -> AssetRecord:
    return AssetRecord(
        asset_id="asset_x",
        scene_id="scene_test",
        loop_id="loop_test",
        provider="p",
        model_id="m",
        prompt="",
        seed=0,
        width=8,
        height=8,
        steps=1,
        storage_uri="",
        metadata={},
        created_at=utc_now() - timedelta(seconds=age_seconds),
        status=status,
    )


class _FakeAssetStore:
    def __init__(self, assets: list[AssetRecord]) -> None:
        self._assets = assets

    def list_assets(self, loop_id: str) -> list[AssetRecord]:
        return self._assets


class HasInflightAssetTests(unittest.TestCase):
    def _check(self, assets: list[AssetRecord]) -> bool:
        return _has_inflight_asset(_FakeAssetStore(assets), "loop_test")  # type: ignore[arg-type]

    def test_fresh_pending_is_inflight(self) -> None:
        self.assertTrue(self._check([_asset("pending", 2)]))

    def test_fresh_processing_is_inflight(self) -> None:
        self.assertTrue(self._check([_asset("processing", 5)]))

    def test_stale_pending_is_ignored(self) -> None:
        # Worker died mid-flight: an orphaned pending must not wedge the loop.
        self.assertFalse(self._check([_asset("pending", 400)]))

    def test_succeeded_is_not_inflight(self) -> None:
        self.assertFalse(self._check([_asset("succeeded", 2)]))

    def test_no_assets_is_not_inflight(self) -> None:
        self.assertFalse(self._check([]))

    def test_fresh_pending_wins_over_stale(self) -> None:
        self.assertTrue(self._check([_asset("pending", 400), _asset("processing", 3)]))


if __name__ == "__main__":
    unittest.main()
