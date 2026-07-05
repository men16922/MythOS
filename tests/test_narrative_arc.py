"""G1 서사 막 스캐폴드 (뼈대는 바이블/루트가 소유, LLM은 막 안에서만 변주).

- 진행률→막 매핑(기/승/전/결)과 막별 에스컬레이션 지시.
- 오프닝 턴에는 침묵, 이후 route 레이어 기반 막 노트가 synopsis에 주입.
- 결(클라이맥스) 막에서 미회수 떡밥 회수 요구; setup 원장(note/unresolved) 동작.
- Loop2+ 오프닝 변주가 훅 떡밥을 심는다.
"""

from __future__ import annotations

import unittest
from datetime import UTC, datetime
from typing import Any

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import (
    _act_for_progress,
    build_runtime_narrative_context,
)
from mythos_runtime.session import RuntimeSessionService
from mythos_runtime.session_memory import SETUPS_KEY, note_setup, unresolved_setups

NOW = datetime(2026, 7, 5, tzinfo=UTC)


class ActMappingTest(unittest.TestCase):
    def test_ten_layer_route_maps_to_four_acts(self) -> None:
        total = 10
        names = [_act_for_progress(i, total)[0] for i in range(total)]
        self.assertEqual(names[0], "기 (설정)")
        self.assertEqual(names[1], "기 (설정)")
        self.assertEqual(names[3], "승 (전개)")
        self.assertEqual(names[6], "전 (위기)")
        self.assertEqual(names[-1], "결 (클라이맥스)")

    def test_single_layer_is_climax(self) -> None:
        self.assertEqual(_act_for_progress(0, 1)[0], "결 (클라이맥스)")


class ActNoteInjectionTest(unittest.TestCase):
    def _synopsis(self, state: dict[str, Any], turn: int = 8) -> str:
        player = PlayerProfile("p1", "T", NOW, NOW, {"archetype": "Unclassified"})
        loop = LoopState(
            "l", "p1", "s", LoopPhase.EXPLORE, "loc", 70, 30, NOW, None, state, []
        )
        ctx = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=turn,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
            player_action="살핀다",
        )
        return "\n".join(ctx.session_synopsis)

    def _route_state(self, layer: int, total: int = 10) -> dict[str, Any]:
        return {
            ROUTE_MAP_KEY: {
                "current": "n_cur",
                "nodes": {"n_cur": {"id": "n_cur", "layer": layer}},
                "layers": [[f"l{i}"] for i in range(total)],
            }
        }

    def test_mid_route_layer_injects_current_act(self) -> None:
        joined = self._synopsis(self._route_state(3))
        self.assertIn("서사 막 구조", joined)
        self.assertIn("승 (전개)", joined)

    def test_opening_turns_stay_silent(self) -> None:
        joined = self._synopsis(self._route_state(0), turn=2)
        self.assertNotIn("서사 막 구조", joined)

    def test_climax_act_demands_unresolved_setups(self) -> None:
        state = self._route_state(9)
        state = note_setup(state, "hook", "세린이 오지 않은 이유")
        joined = self._synopsis(state)
        self.assertIn("결 (클라이맥스)", joined)
        self.assertIn("미회수 떡밥", joined)
        self.assertIn("세린이 오지 않은 이유", joined)

    def test_resolved_setup_is_not_demanded(self) -> None:
        state = self._route_state(9)
        state = note_setup(state, "hook", "태오의 정체", resolve_flags=["met_tae_o"])
        state["flags"] = ["met_tae_o"]
        joined = self._synopsis(state)
        self.assertNotIn("미회수 떡밥", joined)


class SetupLedgerTest(unittest.TestCase):
    def test_note_is_idempotent_and_unresolved_respects_flags(self) -> None:
        state: dict[str, Any] = {"flags": []}
        state = note_setup(state, "a", "떡밥 A", resolve_flags=["f1"])
        state = note_setup(state, "a", "중복", resolve_flags=["f1"])
        self.assertEqual(len(state[SETUPS_KEY]), 1)
        self.assertEqual(len(unresolved_setups(state)), 1)
        state["flags"] = ["f1"]
        self.assertEqual(unresolved_setups(state), [])

    def test_loop_two_start_plants_opening_hook(self) -> None:
        store = _InMemoryStore()
        # 기본 디렉터 + fallback 옵션 → 결정론 canned 장면 (Ollama 불필요).
        service = RuntimeSessionService(store)
        _seed_loop(store, "p1", "비접속자 (Ghost)")  # 기존 루프 1개 → 다음은 2회차
        snap = service.start_loop("p1", options=RuntimeOptions(fallback=True))
        state = snap.loop.state
        self.assertNotEqual(state.get("_opening_variant"), "default")
        setups = state.get(SETUPS_KEY, [])
        self.assertTrue(
            any(str(s.get("id", "")).startswith("opening_hook_") for s in setups),
            f"no opening hook setup planted: {setups}",
        )


if __name__ == "__main__":
    unittest.main()
