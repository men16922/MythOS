"""The shared keyword/name matching rule (`mythos_core.text_match`).

Four sites learned the same lesson separately before this module existed — the
value-axis chip, Se-rin's opening flags, character reference art, and companion
detection — so the behaviour is pinned once, here.
"""

from __future__ import annotations

import unittest

from mythos_core.text_match import keyword_hits, mentions, name_mentions


class KeywordMatchTest(unittest.TestCase):
    def test_ascii_keywords_must_stand_alone(self) -> None:
        # Each of these substrings shipped a real defect: "ix" gave an
        # observation choice the control axis, "own"/"hand" decided whether the
        # player accepted Se-rin, "han" bound Han's portrait.
        self.assertFalse(mentions("Fix the layout in your memory", ["ix"]))
        self.assertFalse(mentions("Head downtown past the handlers", ["own", "hand"]))
        self.assertFalse(mentions("The channel goes dead", ["han"]))
        self.assertTrue(mentions("Confront Administrator IX", ["ix"]))
        self.assertTrue(mentions("Take her hand", ["hand"]))

    def test_korean_keywords_match_as_substrings(self) -> None:
        # Korean has no word boundaries and the scenario authors stems.
        self.assertTrue(mentions("배수로로 빠져나간다", ["빠져나"]))
        self.assertTrue(mentions("몸을 숨긴다", ["숨"]))

    def test_matching_is_case_insensitive(self) -> None:
        self.assertTrue(mentions("REFUSE her hand", ["refuse"]))

    def test_hits_are_end_offsets_so_callers_can_read_what_follows(self) -> None:
        text = "the administrator's voice echoes"
        (end,) = keyword_hits(text, "administrator")
        self.assertTrue(text[end:].startswith("'s"))

    def test_empty_keyword_never_matches(self) -> None:
        self.assertEqual(keyword_hits("anything", "   "), [])
        self.assertFalse(mentions("anything", ["", "  "]))


class NameMatchTest(unittest.TestCase):
    def test_single_syllable_korean_name_needs_a_particle(self) -> None:
        # Bare 한 sits inside 한강 / 한번 / 한 걸음.
        self.assertFalse(name_mentions("한강 야시장을 지난다", ["한"]))
        self.assertFalse(name_mentions("한 걸음 뒤로 물러난다", ["한"]))
        self.assertTrue(name_mentions("한이 송신기를 뜯어낸다", ["한"]))
        self.assertTrue(name_mentions("한과 함께 통로를 따라간다", ["한"]))

    def test_single_syllable_name_is_bounded_not_dropped(self) -> None:
        # Skipping the name entirely would make the character undetectable in
        # the language they are authored in — the opposite failure.
        self.assertTrue(name_mentions("한은 아무 말도 하지 않았다", ["한"]))

    def test_ascii_name_must_stand_alone(self) -> None:
        self.assertFalse(name_mentions("you handle the terminal", ["han"]))
        self.assertFalse(name_mentions("exchange rates change", ["han"]))
        self.assertTrue(name_mentions("han rips the transmitter out", ["han"]))

    def test_longer_korean_names_match_as_substrings(self) -> None:
        self.assertTrue(name_mentions("정세린이 뒤를 돌아본다", ["정세린"]))
