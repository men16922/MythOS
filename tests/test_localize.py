"""Tests for the serving-boundary combat/status glossary localization."""
from __future__ import annotations

import unittest
from typing import Any

from mythos_api.localize import load_glossary, localize_for, localize_payload


class LocalizeTest(unittest.TestCase):
    def test_load_glossary_neo_seoul_en(self) -> None:
        g = load_glossary("neo-seoul", "en")
        self.assertEqual(g.get("신호 도약"), "Signal Step")
        self.assertEqual(g.get("정비 드론"), "Maintenance Drone")

    def test_ko_and_unknown_lang_are_noop(self) -> None:
        self.assertEqual(load_glossary("neo-seoul", "ko"), {})
        self.assertEqual(load_glossary("neo-seoul", ""), {})

    def test_localize_payload_exact_match_only(self) -> None:
        g = {"신호 도약": "Signal Step", "정비 드론": "Maintenance Drone"}
        payload: dict[str, Any] = {
            "skills": [{"id": "signal_step", "name": "신호 도약"}],
            "enemies": [{"name": "정비 드론", "hp": 12}],
            # exact whole-string match only — substring inside prose is untouched
            "narration": "신호 도약 was already English here",
        }
        out = localize_payload(payload, g)
        self.assertEqual(out["skills"][0]["name"], "Signal Step")
        self.assertEqual(out["enemies"][0]["name"], "Maintenance Drone")
        self.assertEqual(out["narration"], "신호 도약 was already English here")  # not replaced
        # input not mutated
        self.assertEqual(payload["skills"][0]["name"], "신호 도약")

    def test_localize_for_ko_is_identity(self) -> None:
        payload = {"name": "신호 도약"}
        self.assertEqual(localize_for(payload, "neo-seoul", "ko"), payload)
        self.assertEqual(localize_for(payload, "neo-seoul", "en")["name"], "Signal Step")

    def test_glossary_substring_in_composed_strings(self) -> None:
        # Composed status strings embed a glossary term inside variable text. The
        # phrases layer handles the prefix; the glossary-substring fallback localizes
        # the embedded route title / value axis (which are exact glossary keys).
        payload = {
            "stakes_summary": ["현재 지점: 추락과 첫 신뢰"],
            "choice_stakes": ["가치축: 시민/관계"],
        }
        out = localize_for(payload, "neo-seoul", "en")
        self.assertEqual(out["stakes_summary"][0], "Current point: The Fall and First Trust")
        self.assertEqual(out["choice_stakes"][0], "Value axis: People/Relations")

    def test_substring_fallback_skips_english_strings(self) -> None:
        # A fully-English string (no Hangul) is never touched by the substring pass.
        en = "You take Se-rin's hand for the first time."
        self.assertEqual(localize_for({"t": en}, "neo-seoul", "en")["t"], en)

    def test_new_glossary_entries_present(self) -> None:
        g = load_glossary("neo-seoul", "en")
        # chapter_goal (explore), core_stake premise, cutscene titles
        self.assertIn(
            "Roam the welfare blocks",
            g["복지 블록과 한강 야시장을 돌며 '최적화 명단'의 정체에 관한 단서를 찾고 동료를 만난다."],
        )
        self.assertIn("unregistered signal", g["당신은 어떤 명단에도 없는 '비식별 신호'입니다. "
            "관리자 IX는 기준에서 벗어난 당신을 '최적화'(기억 삭제·소거)하려 합니다."])
        self.assertEqual(g["깜빡이는 신뢰"], "Flickering Trust")
        self.assertEqual(g["약속의 잔향"], "Echo of a Promise")

    def test_localize_payload_without_gloss_sub_keeps_prose(self) -> None:
        # Calling localize_payload with only a glossary (no gloss_sub) preserves the
        # exact-match-only behavior — a glossary term inside prose stays put.
        g = {"신호 도약": "Signal Step"}
        out = localize_payload({"narration": "신호 도약 inside prose"}, g)
        self.assertEqual(out["narration"], "신호 도약 inside prose")


if __name__ == "__main__":
    unittest.main()
