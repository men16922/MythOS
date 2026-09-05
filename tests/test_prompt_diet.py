"""Prompt diet regression tests (2026-07-04).

The narrative prompt serializes only GM-usable narrative data: machine memory
kinds (autosave save_slots, pipeline metrics, meta_progression snapshots) are
excluded BEFORE the recency window (so they can't crowd out echoes), and the
surviving records / loop / events are stripped of ids, seeds, and timestamps.
Target: steady-state prompt < 8k tokens (measured via scratch/prompt_breakdown.py).
"""

from __future__ import annotations

import unittest
from datetime import UTC, datetime

from mythos_core.models import (
    Actor,
    LoopPhase,
    LoopState,
    NarrativeShard,
    PlayerMemory,
    PlayerProfile,
    WorldEvent,
    WorldMemory,
)
from mythos_narrative.prompts import (
    build_next_scene_messages,
    build_next_story_messages,
)
from mythos_narrative.schemas import NarrativeContext

_NOW = datetime(2026, 7, 4, 12, 0, 0, tzinfo=UTC)


def _player() -> PlayerProfile:
    return PlayerProfile(
        player_id="p_diet",
        display_name="다이어트",
        traits={"archetype": "ghost"},
        created_at=_NOW,
        updated_at=_NOW,
    )


def _loop(state: dict | None = None) -> LoopState:
    return LoopState(
        loop_id="loop_diet_1",
        player_id="p_diet",
        seed="deadbeefcafe0000deadbeefcafe0000",
        phase=LoopPhase.EXPLORE,
        location_id="night_market",
        stability=60,
        tension=40,
        state=state or {"scenario_id": "neo-seoul", "flags": ["signal_detected"]},
        started_at=_NOW,
        ended_at=None,
        active_echoes=[],
    )


def _player_memory(kind: str, content: dict) -> PlayerMemory:
    return PlayerMemory(
        memory_id=f"memory_{kind}_x",
        player_id="p_diet",
        kind=kind,
        content=content,
        weight=1.0,
        created_at=_NOW,
        updated_at=_NOW,
    )


def _world_memory(kind: str, content: dict) -> WorldMemory:
    return WorldMemory(
        memory_id=f"memory_w_{kind}_x",
        world_id="mythos-local",
        kind=kind,
        content=content,
        weight=1.0,
        created_at=_NOW,
        updated_at=_NOW,
    )


def _event() -> WorldEvent:
    return WorldEvent(
        event_id="event_prompt_diet_1",
        loop_id="loop_diet_1",
        turn_index=3,
        actor=Actor.WORLD,
        action="scene_generated",
        result="젖은 골목의 신호",
        state_delta={"stability": -2, "tension": 4, "flags": [], "clues": []},
        created_at=_NOW,
    )


def _context(**overrides) -> NarrativeContext:
    defaults: dict = {
        "player": _player(),
        "loop": _loop(),
        "turn_index": 5,
        "recent_events": [_event()],
    }
    defaults.update(overrides)
    return NarrativeContext(**defaults)


def _user_content(context: NarrativeContext, builder) -> str:
    messages = builder(context)
    return "\n\n".join(m["content"] for m in messages if m["role"] != "system")


_BUILDERS = (build_next_scene_messages, build_next_story_messages)


class MachineMemoryExclusionTest(unittest.TestCase):
    def test_machine_player_memory_kinds_never_reach_the_prompt(self) -> None:
        context = _context(
            memories=[
                _player_memory("save_slot", {"slot_id": "slot_z", "label": "자동저장 5"}),
                _player_memory("meta_progression", {"runs_completed": 3}),
                _player_memory("echo", {"symbol": "first_trust", "text": "세린의 손을 잡았다"}),
            ]
        )
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertNotIn("save_slot", content)
            self.assertNotIn("slot_z", content)
            self.assertNotIn('meta_progression"', content.replace("'", '"'))
            self.assertIn("세린의 손을 잡았다", content)

    def test_machine_world_memory_kinds_never_reach_the_prompt(self) -> None:
        context = _context(
            world_memories=[
                _world_memory("narrative_metrics", {"success_ratio": 1.0, "total": 9}),
                _world_memory("archive_compacted", {"loop_id": "loop_old"}),
                _world_memory(
                    "loop_archive",
                    {
                        "final_title": "마지막 신호",
                        "final_location": "core",
                        "stability": 8,
                        "tension": 92,
                    },
                ),
            ]
        )
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertNotIn("narrative_metrics", content)
            self.assertNotIn("success_ratio", content)
            self.assertNotIn("archive_compacted", content)
            self.assertIn("마지막 신호", content)

    def test_note_digested_kinds_are_not_duplicated_as_raw_json(self) -> None:
        # run_summary / causality_summary reach the model via scenario_context's
        # NARRATIVE ECHOES / CAUSALITY SUMMARY note blocks — the raw records must
        # not ALSO be serialized into the memory windows.
        context = _context(
            memories=[_player_memory("causality_summary", {"summary_text": "장기 인과 요약문"})],
            world_memories=[
                _world_memory("run_summary", {"ending_label": "고결한 희생", "turns": 42})
            ],
        )
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertNotIn("장기 인과 요약문", content)
            self.assertNotIn("고결한 희생", content)

    def test_autosaves_cannot_crowd_echoes_out_of_the_recency_window(self) -> None:
        autosaves = [
            _player_memory("save_slot", {"slot_id": f"slot_{i}", "label": f"자동저장 {i}"})
            for i in range(10)
        ]
        echo = _player_memory("echo", {"symbol": "first_trust", "text": "이전 루프의 메아리"})
        context = _context(memories=[echo, *autosaves])
        for builder in _BUILDERS:
            self.assertIn("이전 루프의 메아리", _user_content(context, builder))

    def test_memory_machine_fields_are_stripped(self) -> None:
        context = _context(
            memories=[_player_memory("echo", {"symbol": "s", "text": "메아리 본문"})],
            world_memories=[
                _world_memory("loop_archive", {"final_title": "끝", "stability": 10, "tension": 90})
            ],
        )
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertNotIn("memory_echo_x", content)
            self.assertNotIn("memory_w_loop_archive_x", content)
            self.assertNotIn("2026-07-04T12:00:00", content)


class LoopAndEventSlimmingTest(unittest.TestCase):
    def test_loop_ids_seed_and_timestamps_are_dropped(self) -> None:
        context = _context()
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertNotIn("deadbeefcafe", content)
            self.assertNotIn("loop_diet_1", content)
            self.assertIn("night_market", content)
            self.assertIn("signal_detected", content)

    def test_meta_progression_defaults_are_dropped_but_progress_kept(self) -> None:
        state = {
            "scenario_id": "neo-seoul",
            "meta_progression": {
                "player_id": "p_diet",
                "scenario_id": "neo-seoul",
                "runs_completed": 2,
                "endings_seen": ["ending_erasure"],
                "unlocked_traits": [],
                "insight_points": 0,
                "skill_ranks": {},
            },
        }
        context = _context(loop=_loop(state))
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertIn("runs_completed", content)
            self.assertIn("ending_erasure", content)
            self.assertNotIn("unlocked_traits", content)
            self.assertNotIn("insight_points", content)
            self.assertNotIn("skill_ranks", content)

    def test_events_keep_action_and_delta_but_not_ids(self) -> None:
        context = _context()
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertIn("scene_generated", content)
            self.assertIn("젖은 골목의 신호", content)
            self.assertNotIn("event_prompt_diet_1", content)

    def test_shards_keep_text_but_not_ids(self) -> None:
        shard = NarrativeShard(
            shard_id="shard_diet_1",
            loop_id="loop_diet_1",
            player_id="p_diet",
            symbol="betrayal",
            emotional_tone="grief",
            text="조각난 기억의 파편",
            weight=1.0,
            created_at=_NOW,
        )
        context = _context(narrative_shards=[shard])
        for builder in _BUILDERS:
            content = _user_content(context, builder)
            self.assertIn("조각난 기억의 파편", content)
            self.assertNotIn("shard_diet_1", content)


if __name__ == "__main__":
    unittest.main()
