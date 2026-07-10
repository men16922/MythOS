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

    def test_market_vendor_override_survives(self) -> None:
        # The deterministic barter-dock vendor face (live 2026-07-04) is exempt
        # from the dialogue gate by design.
        self.assertIn("snapshot?.market?.vendor?.name", self.source)


if __name__ == "__main__":
    unittest.main()
