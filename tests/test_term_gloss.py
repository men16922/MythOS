"""Source locks for the first-use term gloss (2026-07-10 clarity-audit follow-up:
"물거미/최적화/핑 first-use gloss · Echo in-fiction definition").

Two layers must both exist:
- deterministic UI: `termGloss.ts` + StoryPanel strip — a glossary term's first
  appearance this session renders a one-line definition chip under the narration,
  guaranteed regardless of LLM directive compliance;
- directive: naming.md's first-mention rule explicitly covers 에코 and demands an
  in-fiction definition at its first mention (byte-parity with the code constant
  is locked separately in test_scenario_directives).
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class TermGlossLogicTest(unittest.TestCase):
    def setUp(self) -> None:
        self.src = read("src/mythos_ui/src/termGloss.ts")

    def test_detection_sources_the_canonical_glossary(self) -> None:
        # Definitions must come from glossary.ts (single source), not a copy.
        self.assertIn('from "./glossary"', self.src)
        self.assertIn("glossaryFor(scenarioId)", self.src)

    def test_ko_matching_guards_short_term_false_positives(self) -> None:
        # 핑 must not fire inside 쇼핑/타이핑 (preceding Hangul) or 핑계 (compound).
        self.assertIn("HANGUL.test(text[idx - 1])", self.src)
        self.assertIn("핑계", self.src)

    def test_en_matching_uses_word_boundaries(self) -> None:
        self.assertIn("\\\\b${term}\\\\b", self.src)

    def test_per_scene_cap_prevents_opening_flood(self) -> None:
        self.assertIn("MAX_GLOSS_PER_SCENE = 2", self.src)
        self.assertIn("slice(0, MAX_GLOSS_PER_SCENE)", self.src)

    def test_first_use_is_per_session_and_scene_stable(self) -> None:
        # Seen-set persists per session; a scene's chips stay stable across
        # re-renders via the scene cache (terms already marked seen).
        self.assertIn("sessionStorage", self.src)
        self.assertIn("mythos.termGloss.seen.", self.src)
        self.assertIn("sceneCache", self.src)


class TermGlossWiringTest(unittest.TestCase):
    def setUp(self) -> None:
        self.panel = read("src/mythos_ui/src/StoryPanel.tsx")

    def test_story_panel_renders_the_strip_under_finalized_narration(self) -> None:
        self.assertIn('from "./termGloss"', self.panel)
        self.assertIn("firstUseTermsForScene(", self.panel)
        self.assertIn('className="term-gloss-strip"', self.panel)
        # Only after streaming settles — never over the typewriter.
        idx = self.panel.index("term-gloss-strip")
        gate = self.panel.rindex("!isStreaming", 0, idx)
        self.assertGreater(gate, self.panel.index('id="narration"'))

    def test_strip_is_language_aware(self) -> None:
        self.assertIn('lang === "en" ? entry.term.en : entry.term.ko', self.panel)
        self.assertIn('lang === "en" ? entry.desc.en : entry.desc.ko', self.panel)

    def test_strip_styles_exist_and_stay_muted(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".term-gloss-strip", css)
        self.assertIn(".term-gloss-term", css)


class EchoInFictionDirectiveTest(unittest.TestCase):
    def test_naming_rule_demands_echo_defined_in_fiction_ko_and_en(self) -> None:
        ko = read("resources/neo-seoul/directives/naming.md")
        en = read("resources/neo-seoul/directives/naming.en.md")
        self.assertIn("물거미, 핑, 최적화, 에코", ko)
        self.assertIn("'에코'(루프가 지워져도 남는 잔향과 기억)", ko)
        self.assertIn("작중 대사나 서술로 한 줄 정의", ko)
        self.assertIn("Water Spider, ping, optimization, echo", en)
        self.assertIn('define "echo"', en)


if __name__ == "__main__":
    unittest.main()
