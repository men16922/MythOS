from __future__ import annotations

import unittest
from datetime import UTC, datetime
from typing import Any, cast

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_api.serializers import snapshot_to_dict
from mythos_core import Choice, Scene
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.session import (
    COMBAT_INTERSTITIAL_KEY,
    RuntimeSessionService,
    _build_route_choices,
)


class _NoopDirector:
    def summarize_loop(self, events, *, use_llm=True, language="ko"):
        return "기록."


def _scene(loop_id: str, turn_index: int = 0, choices: list[Choice] | None = None) -> Scene:
    return Scene(
        scene_id=f"scene_{turn_index}",
        loop_id=loop_id,
        turn_index=turn_index,
        title="정전 구역",
        location="복지 블록",
        narration="수색등 아래로 그림자가 길게 늘어난다.",
        choices=choices or [Choice("c1", "숨을 죽인다", "explore")],
        visual_brief="어두운 골목.",
        created_at=datetime(2026, 7, 5, tzinfo=UTC),
    )


def _payload(scene: Scene, *, start_combat: str | None = None) -> ScenePayload:
    return ScenePayload(
        title=scene.title,
        location=scene.location,
        narration=scene.narration,
        choices=scene.choices,
        visual_brief=scene.visual_brief or "",
        world_delta=WorldDelta(start_combat=start_combat),
    )


class RouteChoiceCombatRiskTest(unittest.TestCase):
    """정션 선택지의 결정론 전투 예고 (CBT 피드백 #1 'combat jump-scare')."""

    def test_combat_destination_marks_combat_risk(self) -> None:
        options = [
            {"id": "n1", "title": "감시 사각", "type": "patrol", "combat": True, "risk": 2},
            {"id": "n2", "title": "기록 보관소", "type": "clue", "combat": False, "risk": 1},
            {"id": "n3", "title": "야시장", "type": "market", "risk": 0},
        ]
        choices = _build_route_choices(options)
        self.assertTrue(choices[0].combat_risk)
        self.assertFalse(choices[1].combat_risk)
        self.assertFalse(choices[2].combat_risk)

    def test_director_choice_defaults_to_no_combat_risk(self) -> None:
        self.assertFalse(Choice("c1", "달린다", "explore").combat_risk)


class PendingBossChoiceFlagTest(unittest.TestCase):
    """보스 대면 씬(파킹된 클라이맥스)에서는 모든 선택지가 전투로 직결된다."""

    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=cast(Any, _NoopDirector()))
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def _snapshot_dict(self, state: dict[str, Any]) -> dict[str, Any]:
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        from dataclasses import replace

        loop = replace(loop, state=state)
        scene = _scene(loop.loop_id, choices=[Choice("c1", "맞선다", "resolve")])
        player = self.store.get_player("p1")
        assert player is not None
        from mythos_runtime.options import RuntimeSnapshot

        snap = RuntimeSnapshot(player=player, loop=loop, scene=scene, assets=[])
        return snapshot_to_dict(snap)

    def test_pending_boss_flags_every_choice(self) -> None:
        data = self._snapshot_dict({"_pending_boss_combat": "ix_confrontation"})
        for choice in data["active_scene"]["choices"]:
            self.assertTrue(choice["combat_risk"])

    def test_plain_scene_keeps_director_default(self) -> None:
        data = self._snapshot_dict({})
        for choice in data["active_scene"]["choices"]:
            self.assertFalse(choice["combat_risk"])


class CombatInterstitialTest(unittest.TestCase):
    """전투 진입 1비트 인터스티셜 서술자의 기록·종류·수명."""

    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=cast(Any, _NoopDirector()))
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def test_ambient_combat_begin_stages_interstitial(self) -> None:
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None and loop is not None
        scene = _scene(loop.loop_id)
        snap = self.service._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=_payload(scene, start_combat="patrol_ambush"),
            options=self.options,
            span_name="test",
            log_message="test",
        )
        self.assertEqual(snap.scene.scene_type, "combat")
        beat = snap.loop.state.get(COMBAT_INTERSTITIAL_KEY)
        assert beat is not None
        self.assertEqual(beat["encounter"], "patrol_ambush")
        self.assertEqual(beat["kind"], "ambient")
        self.assertEqual(beat["name"], "순찰 매복")
        # Authored hook line from scenario.json rides along for the overlay.
        self.assertIn("수색등", beat["line"])

    def test_route_origin_is_recorded(self) -> None:
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None and loop is not None
        snap = self.service._begin_requested_combat(
            player, loop, "sentinel_checkpoint", self.options, origin="route"
        )
        beat = snap.loop.state.get(COMBAT_INTERSTITIAL_KEY)
        assert beat is not None
        self.assertEqual(beat["kind"], "route")

    def test_next_narrative_commit_clears_interstitial(self) -> None:
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None and loop is not None
        from dataclasses import replace

        stale = replace(
            loop,
            state={COMBAT_INTERSTITIAL_KEY: {"encounter": "patrol_ambush", "kind": "ambient"}},
        )
        scene = _scene(loop.loop_id, turn_index=1)
        snap = self.service._commit_scene(
            player=player,
            loop=stale,
            scene=scene,
            payload=_payload(scene),
            options=self.options,
            span_name="test",
            log_message="test",
        )
        self.assertNotIn(COMBAT_INTERSTITIAL_KEY, snap.loop.state)


if __name__ == "__main__":
    unittest.main()
