"""G2 반전 뱅크 — authored 조건 트리거, 루프당 1회, G3 큐 강제 결합.

콘텐츠 3종(조력자의 이중성/관리망의 진짜 목적/플레이어 정체)은 드래프트 —
사람 톤 검수 대기 (NEXT_PLAN `[manual]`).
"""

from __future__ import annotations

import unittest
from dataclasses import dataclass
from typing import Any

from mythos_api.serializers import _presentation_cues
from mythos_runtime.route_map import ROUTE_MAP_KEY
from mythos_runtime.scenario import load_scenario
from mythos_runtime.twists import (
    ACTIVE_TWIST_KEY,
    PENDING_TWIST_KEY,
    TWISTS_FIRED_KEY,
    advance_twist_lifecycle,
    select_twist,
    twist_directive_note,
)

BANK = load_scenario("neo-seoul").twist_bank


def _route_state(layer: int) -> dict[str, Any]:
    return {
        ROUTE_MAP_KEY: {
            "current": "n",
            "nodes": {"n": {"id": "n", "layer": layer}},
            "layers": [["x"]] * 10,
        }
    }


class TwistSelectionTest(unittest.TestCase):
    def test_bank_authored_with_conditions(self) -> None:
        self.assertEqual(len(BANK), 3)
        for twist in BANK:
            self.assertTrue(twist.get("directive"))
            self.assertIn("when", twist)

    def test_conditions_gate_selection(self) -> None:
        # 조건 미충족(레이어 0, 플래그 없음) → 없음.
        state = {**_route_state(0), "flags": []}
        self.assertIsNone(select_twist(BANK, state, seed="s", turn_index=9))
        # 플레이어 정체 단서: min_layer 6만 요구 → 레이어 6에서 발화 가능.
        state6 = {**_route_state(6), "flags": []}
        picked = select_twist(BANK, state6, seed="s", turn_index=9)
        assert picked is not None
        self.assertEqual(picked["id"], "twist_player_identity")

    def test_one_twist_per_loop_cap(self) -> None:
        state = {**_route_state(6), "flags": [], TWISTS_FIRED_KEY: ["twist_player_identity"]}
        self.assertIsNone(select_twist(BANK, state, seed="s", turn_index=9))

    def test_pending_blocks_reselection(self) -> None:
        state = {**_route_state(6), "flags": [], PENDING_TWIST_KEY: {"id": "x"}}
        self.assertIsNone(select_twist(BANK, state, seed="s", turn_index=9))


class TwistLifecycleTest(unittest.TestCase):
    def test_pending_becomes_active_then_clears(self) -> None:
        state: dict[str, Any] = {
            PENDING_TWIST_KEY: {"id": "t1", "title": "T", "directive": "D"}
        }
        # 커밋 N+1: pending → active(발화 장면) + fired 원장.
        state = advance_twist_lifecycle(state)
        self.assertNotIn(PENDING_TWIST_KEY, state)
        self.assertEqual(state[ACTIVE_TWIST_KEY]["id"], "t1")
        self.assertEqual(state[TWISTS_FIRED_KEY], ["t1"])
        # 커밋 N+2: active 소거, fired 유지.
        state = advance_twist_lifecycle(state)
        self.assertNotIn(ACTIVE_TWIST_KEY, state)
        self.assertEqual(state[TWISTS_FIRED_KEY], ["t1"])

    def test_directive_note_only_while_pending(self) -> None:
        pending = {PENDING_TWIST_KEY: {"id": "t", "title": "제목", "directive": "지시문"}}
        note = twist_directive_note(pending)
        self.assertIn("반전 발화", note)
        self.assertIn("지시문", note)
        self.assertEqual(twist_directive_note({}), "")


class TwistCueCouplingTest(unittest.TestCase):
    def test_delivery_scene_forces_sting_and_glitch(self) -> None:
        @dataclass
        class _Scene:
            scene_type: str = "static"

        cues = _presentation_cues(
            _Scene(), {ACTIVE_TWIST_KEY: {"id": "t"}}, None
        )
        self.assertEqual(cues[:2], ["sting", "glitch"])


if __name__ == "__main__":
    unittest.main()
