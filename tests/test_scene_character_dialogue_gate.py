"""Source-level lock for the CHARACTER portrait dialogue gate (owner rule 2026-07-11).

``detectSceneCharacter`` (frontend ``sceneCharacter.ts``) must show a character
only when that character *speaks* this scene — a passing mention is not
presence. Two owner-screenshot false positives motivated the gate:

- absent-character mention: "정세린의 숨겨진 과거 … 그녀의 서명" (a document
  ABOUT Se-rin) showed her portrait though she isn't in the scene;
- hidden-text hit: ``visual_brief`` is an English image prompt the player never
  sees, and "kai"/"rx-09" inside it flashed Kai's portrait with zero on-screen
  text.

The lock is textual (there is no frontend unit-test runner in ``make check``):
it pins the load-bearing pieces of the implementation so a refactor that
silently reverts to any-mention matching fails here.
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class SceneCharacterDialogueGateTest(unittest.TestCase):
    def setUp(self) -> None:
        self.source = read("src/mythos_ui/src/sceneCharacter.ts")

    def test_hidden_and_non_dialogue_fields_are_not_scanned(self) -> None:
        # visual_brief is player-invisible; title/location mentions are not
        # dialogue. Presence must be derived from narration only. (The comment
        # may name the fields; the code must not read them off the scene.)
        self.assertNotIn("scene.visual_brief", self.source)
        self.assertNotIn("scene.title", self.source)
        self.assertNotIn("scene.location", self.source)
        self.assertIn("scene.narration", self.source)

    def test_detection_requires_a_spoken_line(self) -> None:
        # Paragraph-level dialogue gate: only paragraphs carrying a sentence-like
        # quoted span contribute, and the name must sit in the attribution text
        # (outside the quotes), so names dropped inside someone else's line or in
        # pure-mention prose never match.
        self.assertIn("hasDialogue", self.source)
        self.assertIn("outsideQuotes", self.source)
        self.assertIn("SPEECH_PUNCTUATION", self.source)
        self.assertIn(".filter((p) => p.hasDialogue)", self.source)

    def test_stat_voice_quotes_excluded_from_dialogue(self) -> None:
        # Stat-voice inner monologue — (관측: "…") — is NOT spoken dialogue. The
        # dialogue segmenter must skip those quoted spans (via statVoiceRanges /
        # inStatVoiceRange) so a stat check never renders as a character portrait
        # callout or leaves an empty "(관측: "")" shell (regression 2026-07-11).
        self.assertIn('from "./statVoice"', self.source)
        self.assertIn("statVoiceRanges", self.source)
        self.assertIn("inStatVoiceRange", self.source)

    def test_market_vendor_override_survives(self) -> None:
        # The deterministic barter-dock vendor face (live 2026-07-04) is exempt
        # from the dialogue gate by design.
        self.assertIn("snapshot?.market?.vendor?.name", self.source)

    def test_word_internal_apostrophe_is_not_a_quote_delimiter(self) -> None:
        # EN narration writes contractions/possessives with the same character KO
        # prose uses to delimit speech. Treating a word-internal apostrophe as a
        # quote mark opened a span at "You'" and closed it at "sector'", splitting
        # both words across a dialogue callout (live EN evidence 2026-08-08,
        # loop_426b710d…, outputs/live-qa/20260808-arm-426b710d/).
        self.assertIn("APOSTROPHE_LIKE", self.source)
        self.assertIn("isIntraWordApostrophe", self.source)
        # Both the opener guard and the closer search must consult it, or one half
        # of the split comes back.
        self.assertIn("opensQuote(paragraph, i)", self.source)
        self.assertIn("findClosingQuote(paragraph, pair[1], i + 1)", self.source)
        self.assertNotIn("paragraph.indexOf(pair[1], i + 1)", self.source)

    def test_non_speech_quoted_span_is_consumed_whole(self) -> None:
        # A quoted span that fails SPEECH_PUNCTUATION stays narration, but the
        # scanner must still skip PAST it. Resuming inside the span let its
        # closing mark be read as the next opening mark, so EN attribution prose
        # ("… Han mutters, …") became the bubble while the real spoken line stayed
        # narration (same 2026-08-08 evidence).
        segment_fn = self.source.split("export function segmentParagraph", 1)[1]
        self.assertIn("narration += paragraph.slice(i, end + 1)", segment_fn)


if __name__ == "__main__":
    unittest.main()
