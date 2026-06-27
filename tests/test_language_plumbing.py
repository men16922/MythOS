"""S0 language plumbing: the target output language must thread end-to-end from
RuntimeOptions through build_runtime_narrative_context into the NarrativeContext the
Narrative Director receives, and reach the dual-model prompt builders.

S0 is behavior-preserving (both languages still render Korean); EN content lands in S1.
See docs/plans/2026-06-27-en-ko-localization.md §3.
"""

import unittest
from datetime import UTC, datetime

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.prompts import build_first_story_messages, build_next_story_messages
from mythos_narrative.schemas import NarrativeContext
from mythos_runtime.options import RuntimeOptions
from mythos_runtime.scenario import load_scenario
from mythos_runtime.scenario_context import build_runtime_narrative_context

_NOW = datetime(2026, 6, 27, tzinfo=UTC)


def _player() -> PlayerProfile:
    return PlayerProfile("p1", "T", _NOW, _NOW, {"archetype": "ghost"})


def _loop() -> LoopState:
    return LoopState(
        "l", "p1", "neo-seoul", LoopPhase.CONNECT, "data-layer-01", 70, 30, _NOW, None, {}, []
    )


def _context(language: str = "ko") -> NarrativeContext:
    return build_runtime_narrative_context(
        player=_player(),
        loop=_loop(),
        scenario=load_scenario("neo-seoul"),
        turn_index=0,
        recent_events=[],
        memories=[],
        world_memories=[],
        narrative_shards=[],
        novelty_notes=[],
        language=language,
    )


class RuntimeOptionsLanguageTest(unittest.TestCase):
    def test_default_is_ko(self) -> None:
        self.assertEqual(RuntimeOptions().language, "ko")

    def test_accepts_en(self) -> None:
        self.assertEqual(RuntimeOptions(language="en").language, "en")


class NarrativeContextLanguageTest(unittest.TestCase):
    def test_field_default_is_ko(self) -> None:
        self.assertEqual(NarrativeContext.__dataclass_fields__["language"].default, "ko")

    def test_builder_threads_language_to_context(self) -> None:
        # This NarrativeContext is exactly what the director receives, so threading
        # it here == the language reaching the director.
        self.assertEqual(_context(language="en").language, "en")
        self.assertEqual(_context(language="ko").language, "ko")

    def test_builder_default_language_is_ko(self) -> None:
        ctx = build_runtime_narrative_context(
            player=_player(),
            loop=_loop(),
            scenario=load_scenario("neo-seoul"),
            turn_index=0,
            recent_events=[],
            memories=[],
            world_memories=[],
            narrative_shards=[],
            novelty_notes=[],
        )
        self.assertEqual(ctx.language, "ko")


class StoryPromptLanguageSeamTest(unittest.TestCase):
    def test_story_builders_consume_language_without_crashing(self) -> None:
        for language in ("ko", "en"):
            ctx = _context(language=language)
            for messages in (build_first_story_messages(ctx), build_next_story_messages(ctx)):
                self.assertEqual(messages[0]["role"], "system")
                self.assertTrue(messages[0]["content"].strip())


if __name__ == "__main__":
    unittest.main()
