"""B3 루프 모디파이어 (CBT 피드백 #2: 다회차 체감 랜덤성).

- 선택: 1회차/테이블 없음 = None; 2회차+ 시드 결정론 + 시드 로테이션으로 전 항목 노출.
- 효과 적용: 순찰 강화(쿨다운 단축·승리 통찰 보너스), 시장 활황(교환 비용 -1, 바닥 1),
  신호 교란(단서 노드 통찰 보너스·동적 지도 horizon 축소).
"""

from __future__ import annotations

import unittest
from dataclasses import replace
from typing import Any, cast

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_runtime.constants import COMBAT_COOLDOWN_SCENES
from mythos_runtime.loop_modifiers import (
    LOOP_MODIFIER_KEY,
    modifier_effect,
    select_loop_modifier,
)
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import RuntimeSessionService


class _NoopDirector:
    def summarize_loop(self, events, *, use_llm=True):
        return "기록."


MODIFIERS = load_scenario("neo-seoul").loop_modifiers


class LoopModifierSelectionTest(unittest.TestCase):
    def test_neo_seoul_authors_three_modifiers(self) -> None:
        self.assertEqual(
            {m["id"] for m in MODIFIERS}, {"patrol_surge", "market_boom", "signal_jam"}
        )

    def test_loop_one_and_missing_table_get_none(self) -> None:
        self.assertIsNone(select_loop_modifier(MODIFIERS, seed="s", loop_index=1))
        self.assertIsNone(select_loop_modifier([], seed="s", loop_index=3))
        self.assertIsNone(select_loop_modifier(None, seed="s", loop_index=3))

    def test_loop_two_pick_is_deterministic_and_rotates(self) -> None:
        first = select_loop_modifier(MODIFIERS, seed="det", loop_index=2)
        second = select_loop_modifier(MODIFIERS, seed="det", loop_index=2)
        self.assertEqual(first, second)
        assert first is not None
        self.assertIn("effect", first)
        seen = {
            cast(dict[str, Any], select_loop_modifier(MODIFIERS, seed=f"r{i}", loop_index=2))["id"]
            for i in range(40)
        }
        self.assertEqual(seen, {"patrol_surge", "market_boom", "signal_jam"})

    def test_modifier_effect_reads_state_defensively(self) -> None:
        state = {LOOP_MODIFIER_KEY: {"id": "x", "effect": {"a": -2, "bad": "?"}}}
        self.assertEqual(modifier_effect(state, "a"), -2)
        self.assertEqual(modifier_effect(state, "missing"), 0)
        self.assertEqual(modifier_effect(state, "bad"), 0)
        self.assertEqual(modifier_effect({}, "a"), 0)
        self.assertEqual(modifier_effect(None, "a"), 0)


class LoopModifierEffectTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=cast(Any, _NoopDirector()))
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def _loop(self, extra_state: dict[str, Any]):
        loop = self.store.get_loop(self.loop_id)
        assert loop is not None
        return replace(loop, state={"scenario_id": "neo-seoul", **extra_state})

    def test_patrol_surge_shortens_ambient_cooldown(self) -> None:
        turn = 10
        recent = turn - (COMBAT_COOLDOWN_SCENES - 1)  # within default cooldown
        base_state = {"_last_combat_turn": recent, "_combat_count": 1}
        suppressed = self.service._gate_next_combat(
            self._loop(base_state), turn, "patrol_ambush", self.options
        )
        self.assertIsNone(suppressed)
        surged = self.service._gate_next_combat(
            self._loop(
                {
                    **base_state,
                    LOOP_MODIFIER_KEY: {
                        "id": "patrol_surge",
                        "effect": {"combat_cooldown_delta": -2},
                    },
                }
            ),
            turn,
            "patrol_ambush",
            self.options,
        )
        self.assertEqual(surged, "patrol_ambush")

    def test_signal_jam_sweetens_clue_node_insight(self) -> None:
        node = {"type": "clue", "reward": {"insight": 2}}

        def _insight(extra: dict[str, Any]) -> int:
            # 독립 store/서비스 — 진행도(insight_points)가 측정 간 누적되지 않게.
            store = _InMemoryStore()
            service = RuntimeSessionService(store, director=cast(Any, _NoopDirector()))
            loop_id = _seed_loop(store, "p1", "비접속자 (Ghost)")
            loop = store.get_loop(loop_id)
            assert loop is not None
            loop = replace(
                loop,
                state={
                    "scenario_id": "neo-seoul",
                    ROUTE_MAP_KEY: {"applied_rewards": []},
                    **extra,
                },
            )
            out = service._apply_route_node_reward(loop, "n1", node, None)
            meta = out.state.get("meta_progression", {})
            return int(meta.get("insight_points", 0))

        base = _insight({})
        jammed = _insight(
            {LOOP_MODIFIER_KEY: {"id": "signal_jam", "effect": {"clue_insight_bonus": 1}}}
        )
        self.assertEqual(jammed - base, 1)

    def test_market_boom_cheapens_offers_with_floor_one(self) -> None:
        # 시장 노드 위 상태를 흉내: 현재 노드 type=market + 모디파이어.
        route = {
            "current": "m1",
            "nodes": {"m1": {"id": "m1", "type": "market"}},
            "applied_rewards": [],
        }
        loop = self._loop(
            {
                ROUTE_MAP_KEY: route,
                "_inventory": [],
                LOOP_MODIFIER_KEY: {"id": "market_boom", "effect": {"market_cost_delta": -1}},
            }
        )
        view = self.service._market_view(loop, self.options)
        assert view is not None
        config = load_scenario("neo-seoul").combat.get("market_exchange", [])
        base_counts = {
            (str(o.get("give")), str(o.get("get"))): max(1, int(o.get("count", 1) or 1))
            for o in config
        }
        for offer in view["offers"]:
            base = base_counts[(offer["give"], offer["get"])]
            self.assertEqual(offer["count"], max(1, base - 1))


if __name__ == "__main__":
    unittest.main()
