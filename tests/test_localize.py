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


if __name__ == "__main__":
    unittest.main()
