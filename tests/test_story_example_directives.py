"""Phase 5 prompt-layer separation: storyteller few-shot examples.

The scenario-flavored few-shot snippets inside STORY_SYSTEM_PROMPT(_EN) moved to
``resources/<scenario>/directives/story_examples(.en).md``. These tests lock:
byte-parity (extraction is lossless), the swap seam in ``_story_system_prompt``,
and graceful fallback for scenarios without the directive (glass-library).
"""

from __future__ import annotations

import unittest
from datetime import UTC, datetime

from mythos_core.models import LoopPhase, LoopState, PlayerProfile
from mythos_narrative.prompts import (
    STORY_EXAMPLE_DEFAULTS,
    STORY_SYSTEM_PROMPT,
    STORY_SYSTEM_PROMPT_EN,
    _story_system_prompt,
)
from mythos_narrative.schemas import NarrativeContext
from mythos_runtime.scenario_directives import load_scenario_directives


def _context(**kwargs) -> NarrativeContext:
    now = datetime(2026, 7, 17, tzinfo=UTC)
    player = PlayerProfile("p1", "T", now, now, {"archetype": "Unclassified"})
    loop = LoopState("l1", "p1", "s", LoopPhase.EXPLORE, "loc", 70, 30, now, None, {}, [])
    return NarrativeContext(player=player, loop=loop, turn_index=1, recent_events=[], **kwargs)


class StoryExampleParityTest(unittest.TestCase):
    """The authored md must equal the code defaults byte-for-byte (lossless move)."""

    def test_neo_seoul_ko_examples_byte_parity_with_defaults(self) -> None:
        loaded = load_scenario_directives("neo-seoul", "ko").story_examples
        assert loaded is not None
        self.assertEqual(loaded, STORY_EXAMPLE_DEFAULTS["ko"])

    def test_neo_seoul_en_examples_byte_parity_with_defaults(self) -> None:
        loaded = load_scenario_directives("neo-seoul", "en").story_examples
        assert loaded is not None
        self.assertEqual(loaded, STORY_EXAMPLE_DEFAULTS["en"])

    def test_defaults_are_embedded_in_both_templates(self) -> None:
        # The templates interpolate the defaults; if someone edits the template text
        # directly the swap seam silently stops matching — catch that here.
        for key in ("choice_examples", "grounding", "texture"):
            self.assertIn(STORY_EXAMPLE_DEFAULTS["ko"][key], STORY_SYSTEM_PROMPT)
            self.assertIn(STORY_EXAMPLE_DEFAULTS["en"][key], STORY_SYSTEM_PROMPT_EN)


class StorySystemPromptSwapTest(unittest.TestCase):
    def test_no_directive_renders_the_historical_prompt(self) -> None:
        self.assertEqual(_story_system_prompt(_context()), STORY_SYSTEM_PROMPT.strip())
        self.assertEqual(
            _story_system_prompt(_context(language="en")), STORY_SYSTEM_PROMPT_EN.strip()
        )

    def test_authored_snippet_replaces_the_default(self) -> None:
        ctx = _context(story_examples={"texture": "CUSTOM_TEXTURE_SNIPPET"})
        prompt = _story_system_prompt(ctx)
        self.assertIn("CUSTOM_TEXTURE_SNIPPET", prompt)
        self.assertNotIn(STORY_EXAMPLE_DEFAULTS["ko"]["texture"], prompt)
        # Untouched keys keep their defaults.
        self.assertIn(STORY_EXAMPLE_DEFAULTS["ko"]["grounding"], prompt)

    def test_swap_is_language_scoped(self) -> None:
        ctx = _context(language="en", story_examples={"grounding": "EN_GROUNDING"})
        prompt = _story_system_prompt(ctx)
        self.assertIn("EN_GROUNDING", prompt)
        self.assertNotIn(STORY_EXAMPLE_DEFAULTS["en"]["grounding"], prompt)

    def test_scenario_authored_examples_leave_prompt_byte_identical_today(self) -> None:
        # The extracted md equals the defaults, so wiring it through must not change
        # the rendered prompt at all (cache-prefix + behavior preserving).
        loaded = load_scenario_directives("neo-seoul", "ko").story_examples
        ctx = _context(story_examples=loaded)
        self.assertEqual(_story_system_prompt(ctx), STORY_SYSTEM_PROMPT.strip())


class StoryExampleFallbackTest(unittest.TestCase):
    def test_scenario_without_story_examples_md_is_none(self) -> None:
        self.assertIsNone(load_scenario_directives("glass-library").story_examples)


if __name__ == "__main__":
    unittest.main()
