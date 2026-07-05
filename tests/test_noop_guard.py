"""C1 no-op 턴 가드 (CBT 피드백 #2: 시간끌기 체감 — "선택이 반영 안 되는 느낌").

- 커밋 카운터: 비분기·무변화 턴 연속 수를 `_noop_turns`로 추적, 실질 델타/정션/전투에
  리셋.
- 프롬프트 주입: 1턴 무변화 = 세계 반응 에스컬레이션 지시, 2턴+ = 강제 이벤트 지시
  (synopsis 채널, 풀렌더).
"""

from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_core import Choice, LoopPhase, LoopState, PlayerProfile, Scene
from mythos_core.models import Actor, WorldEvent
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context
from mythos_runtime.session import RuntimeSessionService

NOW = datetime(2026, 7, 5, tzinfo=UTC)


class _NoopDirector:
    def summarize_loop(self, events, *, use_llm=True):
        return "기록."


class NoopCounterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=cast(Any, _NoopDirector()))
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def _commit(
        self,
        state: dict[str, Any],
        *,
        turn: int = 5,
        delta: WorldDelta | None = None,
    ):
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None and loop is not None
        loop = replace(loop, state={"scenario_id": "neo-seoul", **state})
        scene = Scene(
            scene_id=f"s{turn}",
            loop_id=loop.loop_id,
            turn_index=turn,
            title="정적",
            location="복지 블록",
            narration="아무 일도 일어나지 않는다.",
            choices=[Choice("c1", "주변을 살핀다", "explore")],
            visual_brief=None,
            created_at=NOW,
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief="",
            world_delta=delta or WorldDelta(),
        )
        event = WorldEvent(
            event_id=f"e{turn}",
            loop_id=loop.loop_id,
            turn_index=turn,
            actor=Actor.PLAYER,
            action="주변을 살핀다",
            result=None,
            state_delta={},
            created_at=NOW,
        )
        return self.service._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
            player_event=event,
            impact_base_loop=loop,
        )

    def test_zero_delta_turns_accumulate(self) -> None:
        snap = self._commit({})
        self.assertEqual(snap.loop.state.get("_noop_turns"), 1)
        snap2 = self._commit(dict(snap.loop.state), turn=6)
        self.assertEqual(snap2.loop.state.get("_noop_turns"), 2)

    def test_real_delta_resets_streak(self) -> None:
        snap = self._commit({"_noop_turns": 2}, delta=WorldDelta(tension=6))
        self.assertEqual(snap.loop.state.get("_noop_turns"), 0)

    def test_combat_begin_clears_streak(self) -> None:
        snap = self._commit(
            {"_noop_turns": 2}, delta=WorldDelta(start_combat="patrol_ambush")
        )
        self.assertEqual(snap.scene.scene_type, "combat")
        self.assertNotIn("_noop_turns", snap.loop.state)


class NoopPromptInjectionTest(unittest.TestCase):
    def _synopsis(self, noop_turns: int) -> str:
        player = PlayerProfile("p1", "T", NOW, NOW, {"archetype": "Unclassified"})
        state: dict[str, Any] = {"_loop_index": 1}
        if noop_turns:
            state["_noop_turns"] = noop_turns
        loop = LoopState(
            "l", "p1", "s", LoopPhase.EXPLORE, "loc", 70, 30, NOW, None, state, []
        )
        ctx = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=7,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action="살핀다",
        )
        return "\n".join(ctx.session_synopsis)

    def test_single_stall_asks_world_to_react(self) -> None:
        joined = self._synopsis(1)
        self.assertIn("세계 반응 에스컬레이션", joined)
        self.assertNotIn("강제 세계 이벤트", joined)

    def test_repeated_stall_forces_event(self) -> None:
        joined = self._synopsis(2)
        self.assertIn("강제 세계 이벤트", joined)

    def test_no_stall_no_note(self) -> None:
        joined = self._synopsis(0)
        self.assertNotIn("에스컬레이션", joined)
        self.assertNotIn("강제 세계 이벤트", joined)


if __name__ == "__main__":
    unittest.main()
