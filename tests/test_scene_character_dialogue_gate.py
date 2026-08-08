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
        # The gate lives in speakerForParagraph, which both portrait surfaces
        # now route through: no spoken line in the paragraph -> no speaker.
        speaker_fn = self.source.split("export function speakerForParagraph", 1)[1]
        self.assertIn("if (!speech.hasDialogue) return null;", speaker_fn)
        self.assertIn("speech.outsideQuotes.toLowerCase()", speaker_fn)

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

    def test_possessive_guard_still_rejects_a_modifier(self) -> None:
        # The owner's original case (2026-07-11) must stay dead: "린위에의 부하" /
        # "Lin-yue's henchman" is a different person, so a possessive followed by
        # anything that is not the speaker's own speech disqualifies the name.
        self.assertIn("possessiveShadows", self.source)
        matcher = self.source.split("export function keywordHits", 1)[1]
        self.assertIn("possessiveShadows(", matcher)

    def test_possessive_speech_noun_is_the_speaker(self) -> None:
        # ...but "the Administrator's voice echoes" / "세린의 목소리가 갈라진다" IS
        # that character speaking — it is the ordinary English attribution form.
        # Rejecting it matched nobody, so the paragraph fell through to whatever
        # other character it named and an Administrator IX line rendered on Han's
        # portrait (live EN evidence 2026-08-08, loop_426b710d…, turn 50).
        self.assertIn("POSSESSIVE_SPEECH", self.source)
        self.assertIn("SPEECH_NOUNS_EN", self.source)
        self.assertIn("SPEECH_NOUNS_KO", self.source)
        for noun in ("voice", "목소리"):
            self.assertIn(noun, self.source)

    def test_speaker_is_the_name_carrying_a_speech_cue(self) -> None:
        # A paragraph routinely names a second character who only reacts ("Han
        # grips his weapon tighter"). Scanning the whole attribution text and
        # taking the first hit let the scenario's character ARRAY ORDER decide
        # the speaker, so a boss line rendered on an ally's portrait. The name
        # carrying a speech cue wins; the any-name scan remains the fallback so
        # single-character paragraphs are unchanged.
        self.assertIn("SPEECH_CUE", self.source)
        self.assertIn("isAttributed", self.source)
        speaker_fn = self.source.split("export function speakerForParagraph", 1)[1]
        self.assertIn("isAttributed(haystack, character)", speaker_fn)
        self.assertIn("firstNamed(haystack, characters)", speaker_fn)

    def test_both_portrait_surfaces_share_one_judgment(self) -> None:
        # Owner rule 2026-07-11: the dialogue callout and the CHARACTER panel must
        # not disagree. detectSceneCharacter must therefore route through
        # speakerForParagraph rather than keep its own any-name scan.
        detect_fn = self.source.split("export function detectSceneCharacter", 1)[1]
        self.assertIn("speakerForParagraph(paragraph, portrayed)", detect_fn)
        self.assertNotIn("keywordMatches", detect_fn)

    def test_attribution_comma_counts_as_a_spoken_line(self) -> None:
        # `"We should go," Se-rin says.` carries no sentence punctuation INSIDE
        # the quote, so the sentence-like test rejected it and the line rendered
        # as prose instead of a callout — 5 of 15 quoted spans (33%) in the
        # 2026-08-08 banked arm. Term-emphasis spans ('최적화'), which that test
        # exists to exclude, never carry a trailing comma.
        self.assertIn("ATTRIBUTION_COMMA", self.source)
        self.assertIn("isSpokenLine", self.source)
        # Both the dialogue gate and the segmenter must use the same predicate.
        self.assertEqual(self.source.count("isSpokenLine(paragraph.slice(i + 1, end))"), 2)

    def test_name_boundary_stays_zero_width_on_the_right(self) -> None:
        # The possessive decision reads the text *after* the name, so the trailing
        # boundary must not consume a character. The old form
        # `([^a-z0-9_-]|$)` swallowed the apostrophe and made the check impossible.
        matcher = self.source.split("export function keywordHits", 1)[1]
        self.assertIn("(?![a-z0-9_-])", matcher)
        self.assertNotIn("([^a-z0-9_-]|$)", matcher)


if __name__ == "__main__":
    unittest.main()
