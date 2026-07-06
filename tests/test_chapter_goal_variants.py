"""S2 chapter-gate variant goal (variant-routed opening, plan 2026-07-06 §2.4).

- 해석: 게이트의 `player_goal_variants[<vid>]`가 루프 상태의 `_opening_variant`로
  해석되어 목표 스트립 카피를 교체 (`serializers._chapter_goal`).
- 폴백: default 루프 / 맵 미보유 게이트 / 미등록·빈 오버라이드 → 기본 `player_goal`
  (loop-1 및 variants 미저작 시나리오는 기존과 byte-identical).
"""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import Any
from unittest import mock

from mythos_api.serializers import _chapter_goal
from mythos_core.models import LoopPhase
from mythos_runtime.scenario import load_scenario

BASE_GOAL = "정세린과 함께 C-17 정전 구역을 빠져나간다."
EXPLORE_GOAL = "복지 블록을 돌며 단서를 찾는다."
TAE_O_GOAL = "수신호가 가리킨 안전선을 따라 순찰 반대편으로 이동한다."


def _loop(phase: LoopPhase = LoopPhase.CONNECT) -> SimpleNamespace:
    return SimpleNamespace(phase=phase)


def _gates(**connect_extra: Any) -> list[dict[str, Any]]:
    return [
        {"phase": "connect", "player_goal": BASE_GOAL, **connect_extra},
        {"phase": "explore", "player_goal": EXPLORE_GOAL},
    ]


class ChapterGoalVariantTest(unittest.TestCase):
    def _goal(
        self,
        gates: list[dict[str, Any]],
        state: dict[str, Any],
        phase: LoopPhase = LoopPhase.CONNECT,
    ) -> str | None:
        scenario = SimpleNamespace(session_design={"chapter_gates": gates})
        with mock.patch("mythos_api.serializers.load_scenario", return_value=scenario):
            return _chapter_goal(_loop(phase), {"scenario_id": "neo-seoul", **state})

    def test_variant_override_resolves(self) -> None:
        gates = _gates(player_goal_variants={"tae_o": TAE_O_GOAL})
        self.assertEqual(self._goal(gates, {"_opening_variant": "tae_o"}), TAE_O_GOAL)

    def test_default_loop_ignores_variants(self) -> None:
        gates = _gates(player_goal_variants={"tae_o": TAE_O_GOAL})
        self.assertEqual(self._goal(gates, {"_opening_variant": "default"}), BASE_GOAL)
        self.assertEqual(self._goal(gates, {}), BASE_GOAL)

    def test_unmapped_variant_falls_back(self) -> None:
        gates = _gates(player_goal_variants={"tae_o": TAE_O_GOAL})
        self.assertEqual(self._goal(gates, {"_opening_variant": "han"}), BASE_GOAL)

    def test_blank_or_non_string_override_falls_back(self) -> None:
        for bad in ("   ", "", None, 7):
            gates = _gates(player_goal_variants={"tae_o": bad})
            self.assertEqual(
                self._goal(gates, {"_opening_variant": "tae_o"}), BASE_GOAL, f"override={bad!r}"
            )

    def test_malformed_variants_map_falls_back(self) -> None:
        gates = _gates(player_goal_variants=[TAE_O_GOAL])
        self.assertEqual(self._goal(gates, {"_opening_variant": "tae_o"}), BASE_GOAL)

    def test_gate_without_variants_unchanged(self) -> None:
        self.assertEqual(self._goal(_gates(), {"_opening_variant": "tae_o"}), BASE_GOAL)

    def test_variant_resolution_is_per_gate(self) -> None:
        # connect 게이트의 오버라이드는 explore 막에 새어 나가지 않는다 (막 수렴 설계).
        gates = _gates(player_goal_variants={"tae_o": TAE_O_GOAL})
        self.assertEqual(
            self._goal(gates, {"_opening_variant": "tae_o"}, LoopPhase.EXPLORE), EXPLORE_GOAL
        )

    def test_real_neo_seoul_default_unchanged(self) -> None:
        # 실데이터 경로: default 루프는 항상 게이트의 player_goal 그대로.
        gates = load_scenario("neo-seoul").session_design["chapter_gates"]
        connect = next(g for g in gates if g["phase"] == "connect")
        state = {"scenario_id": "neo-seoul"}
        self.assertEqual(_chapter_goal(_loop(), state), connect["player_goal"])
        if "player_goal_variants" not in connect:
            # S4 카피 미착륙 동안: 변주 루프도 기본 카피로 폴백 (메커니즘 휴면).
            state["_opening_variant"] = "tae_o"
            self.assertEqual(_chapter_goal(_loop(), state), connect["player_goal"])


if __name__ == "__main__":
    unittest.main()
