"""C3 참전 예고 규칙 (CBT 피드백 #2: 태오 뜬금 참전).

- 비트 원장 companion-ref: 장면 프로즈에서 동료 이름 감지(정세린→세린 별칭, EN 글로서리,
  1음절 '한'은 조사 경계) → beat["companions"] 기록, 시놉시스가 콜백 지시를 낸다.
- 합류 신호: 플래그 언락(비파티) 아군이 이 루프에서 한 번도 언급된 적 없이 전투에
  들어오면 인터스티셜 joining으로 명시 + 원장 기록(다음 전투 재공지 없음).
"""

from __future__ import annotations

import unittest
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, cast

from test_session_combat import _InMemoryStore, _seed_loop

from mythos_core import Choice, Scene
from mythos_narrative import ScenePayload, WorldDelta
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.scenario import load_scenario
from mythos_runtime.session import (
    COMBAT_INTERSTITIAL_KEY,
    RuntimeSessionService,
    _companion_alias_map,
    _companions_in_text,
)
from mythos_runtime.session_memory import (
    BEATS_KEY,
    build_session_synopsis,
    companions_seen,
    note_companions,
)


class _NoopDirector:
    def summarize_loop(self, events, *, use_llm=True):
        return "기록."


SCENARIO = load_scenario("neo-seoul")
ALIASES = _companion_alias_map(SCENARIO, "neo-seoul")


class CompanionMentionDetectionTest(unittest.TestCase):
    def test_full_and_given_name_and_english_alias(self) -> None:
        self.assertIn("정세린", _companions_in_text(ALIASES, "정세린이 손을 내민다."))
        self.assertIn("정세린", _companions_in_text(ALIASES, "세린이 골목 끝에 나타난다."))
        self.assertIn("태오", _companions_in_text(ALIASES, "바리케이드 뒤에서 태오가 손짓한다."))
        self.assertIn("정세린", _companions_in_text(ALIASES, "Se-rin waits in the rain."))

    def test_single_syllable_name_needs_particle_boundary(self) -> None:
        # '한'은 조사 경계 없이는 일반 어절(한다/한 걸음)에 오탐하면 안 된다.
        self.assertNotIn("한", _companions_in_text(ALIASES, "그는 한 걸음 물러났다."))
        self.assertNotIn("한", _companions_in_text(ALIASES, "선택을 한다."))
        self.assertIn("한", _companions_in_text(ALIASES, "셔터 너머에서 한이 사라졌다."))


class CompanionLedgerTest(unittest.TestCase):
    def test_note_companions_merges_into_latest_beat(self) -> None:
        state = {BEATS_KEY: [{"t": 0, "title": "각성"}, {"t": 1, "title": "골목"}]}
        out = note_companions(state, ["태오"])
        self.assertEqual(out[BEATS_KEY][-1]["companions"], ["태오"])
        self.assertEqual(companions_seen(out), ["태오"])
        # 원장이 비어 있으면 no-op.
        self.assertEqual(note_companions({}, ["태오"]), {})

    def test_synopsis_calls_back_companions(self) -> None:
        state = {BEATS_KEY: [{"t": 1, "title": "골목", "companions": ["태오"]}]}
        joined = "\n".join(build_session_synopsis(state))
        self.assertIn("태오", joined)
        self.assertIn("콜백", joined)


class JoinSignalStagingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.store = _InMemoryStore()
        self.service = RuntimeSessionService(self.store, director=cast(Any, _NoopDirector()))
        self.options = RuntimeOptions(fallback=True)
        self.loop_id = _seed_loop(self.store, "p1", "비접속자 (Ghost)")

    def _commit_combat(self, state: dict[str, Any]):
        player = self.store.get_player("p1")
        loop = self.store.get_loop(self.loop_id)
        assert player is not None and loop is not None
        loop = replace(loop, state={"scenario_id": "neo-seoul", **state})
        scene = Scene(
            scene_id="s1",
            loop_id=loop.loop_id,
            turn_index=5,
            title="추적",
            location="복지 블록",
            narration="수색등이 조여든다.",
            choices=[Choice("c1", "버틴다", "resolve")],
            visual_brief=None,
            created_at=datetime(2026, 7, 5, tzinfo=UTC),
        )
        payload = ScenePayload(
            title=scene.title,
            location=scene.location,
            narration=scene.narration,
            choices=scene.choices,
            visual_brief="",
            world_delta=WorldDelta(start_combat="patrol_ambush"),
        )
        return self.service._commit_scene(
            player=player,
            loop=loop,
            scene=scene,
            payload=payload,
            options=self.options,
            span_name="test",
            log_message="test",
        )

    def test_unheralded_flag_ally_gets_join_signal(self) -> None:
        snap = self._commit_combat({"flags": ["met_tae_o"], BEATS_KEY: [{"t": 4, "title": "이동"}]})
        beat = snap.loop.state.get(COMBAT_INTERSTITIAL_KEY)
        assert beat is not None
        joining = {ally["id"] for ally in beat.get("joining", [])}
        self.assertIn("tae_o", joining)
        # 원장에 기록되어 시놉시스 콜백 + 재공지 방지.
        self.assertIn("태오", companions_seen(snap.loop.state))

    def test_previously_mentioned_ally_needs_no_signal(self) -> None:
        snap = self._commit_combat(
            {
                "flags": ["met_tae_o"],
                BEATS_KEY: [{"t": 4, "title": "바리케이드", "companions": ["태오"]}],
            }
        )
        beat = snap.loop.state.get(COMBAT_INTERSTITIAL_KEY)
        assert beat is not None
        joining = {ally["id"] for ally in beat.get("joining", [])}
        self.assertNotIn("tae_o", joining)

    def test_party_members_are_never_announced(self) -> None:
        snap = self._commit_combat(
            {
                "flags": ["met_se_rin"],
                "_party": {"members": [{"id": "se_rin"}]},
                BEATS_KEY: [{"t": 4, "title": "이동"}],
            }
        )
        beat = snap.loop.state.get(COMBAT_INTERSTITIAL_KEY)
        assert beat is not None
        joining = {ally["id"] for ally in beat.get("joining", [])}
        self.assertNotIn("se_rin", joining)


if __name__ == "__main__":
    unittest.main()
