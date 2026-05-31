from __future__ import annotations

import unittest
from datetime import UTC, datetime

from mythos_core import LoopPhase, LoopState, PlayerProfile
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context
from mythos_runtime.story_bible import (
    StoryBible,
    StoryBibleEntry,
    load_story_bible,
    select_story_bible_entries,
    story_bible_notes,
)


def _loop(
    *,
    phase: LoopPhase = LoopPhase.EXPLORE,
    turn_index: int = 3,
    flags: list[str] | None = None,
    location_id: str = "data-layer-01",
) -> LoopState:
    return LoopState(
        loop_id="loop_story_bible",
        player_id="player_story_bible",
        seed="seed_story_bible",
        phase=phase,
        location_id=location_id,
        stability=70,
        tension=20,
        started_at=datetime(2026, 5, 31, tzinfo=UTC),
        state={"flags": flags or [], "turn_index": turn_index},
    )


class StoryBibleTest(unittest.TestCase):
    def test_load_story_bible_reads_neo_seoul_entries(self) -> None:
        bible = load_story_bible("neo-seoul")

        self.assertEqual(bible.scenario_id, "neo-seoul")
        self.assertGreaterEqual(len(bible.entries), 3)
        self.assertTrue(any(entry.entry_id == "neo_seoul_canon_core" for entry in bible.entries))

    def test_missing_story_bible_is_empty(self) -> None:
        bible = load_story_bible("missing-story-bible")

        self.assertTrue(bible.empty)
        self.assertEqual(
            select_story_bible_entries(bible, _loop(), turn_index=1),
            [],
        )

    def test_select_story_bible_entries_filters_by_phase_flags_and_location(self) -> None:
        bible = StoryBible(
            scenario_id="test",
            title="Test",
            premise="",
            entries=[
                StoryBibleEntry(
                    entry_id="connect_only",
                    kind="act",
                    title="Connect",
                    summary="connect",
                    content="connect content",
                    when={"phase": ["connect"]},
                    priority=10,
                ),
                StoryBibleEntry(
                    entry_id="se_rin",
                    kind="npc",
                    title="Se-rin",
                    summary="ally",
                    content="ally content",
                    when={"flags_any": ["ally_se_rin"]},
                    priority=9,
                ),
                StoryBibleEntry(
                    entry_id="market",
                    kind="location",
                    title="Market",
                    summary="market",
                    content="market content",
                    when={"locations_any": ["market"]},
                    priority=7,
                ),
            ],
        )
        loop = _loop(flags=["ally_se_rin"], location_id="night-market")

        entries = select_story_bible_entries(bible, loop, turn_index=3)

        self.assertEqual([entry.entry_id for entry in entries], ["se_rin", "market"])

    def test_story_bible_notes_are_prompt_ready(self) -> None:
        note = story_bible_notes(
            [
                StoryBibleEntry(
                    entry_id="core",
                    kind="world",
                    title="Core",
                    summary="Canon summary",
                    content="Canon content",
                )
            ]
        )[0]

        self.assertIn("STORY_BIBLE_SNIPPET", note)
        self.assertIn("core", note)
        self.assertIn("Canon content", note)

    def test_runtime_context_includes_selected_story_bible_snippets(self) -> None:
        player = PlayerProfile(
            player_id="player_story_bible",
            display_name="당신",
            created_at=datetime(2026, 5, 31, tzinfo=UTC),
            updated_at=datetime(2026, 5, 31, tzinfo=UTC),
            traits={"archetype": "비접속자 (Ghost)"},
        )
        loop = _loop(phase=LoopPhase.CONNECT, turn_index=0)

        context = build_runtime_narrative_context(
            player=player,
            loop=loop,
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )

        notes = "\n".join(context.novelty_notes)
        self.assertIn("STORY_BIBLE_SNIPPET", notes)
        self.assertIn("act1_c17_blackout", notes)


if __name__ == "__main__":
    unittest.main()
