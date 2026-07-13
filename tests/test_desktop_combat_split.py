"""Source locks for the desktop combat split + skill quick-slots (owner 2026-07-13).

During combat the page aside folds away on every form factor, the freed right
column hosts the roster/command console (desktop CSS grid), and the skill bar
caps at six quick slots with a per-slot swap picker.
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


class DesktopCombatSplitTest(unittest.TestCase):
    def test_aside_folds_during_any_active_combat(self) -> None:
        source = read("src/mythos_ui/src/GameAside.tsx")
        self.assertIn(
            "const combatActive = Boolean(finalizedSnapshot?.combat && !finalizedSnapshot.combat.finished);",
            source,
        )
        self.assertIn("if (combatActive) {\n    return null;\n  }", source)

    def test_desktop_split_css_scoped_to_fine_pointer_wide(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        idx = css.index("@media (pointer: fine) and (min-width: 1101px) {")
        block = css[idx : idx + 900]
        self.assertIn("body.combat-active main {", block)
        self.assertIn("grid-template-columns: minmax(0, 1fr);", block)
        self.assertIn("body.combat-active .combat-stack {", block)
        self.assertIn("grid-template-columns: minmax(0, 1fr) 400px;", block)
        self.assertIn("body.combat-active .combat-bottom-row {", block)
        self.assertIn("position: sticky;", block)

    def test_skill_bar_caps_at_six_quick_slots_with_swap_picker(self) -> None:
        source = read("src/mythos_ui/src/CombatControls.tsx")
        self.assertIn("const MAX_SKILL_SLOTS = 6;", source)
        self.assertIn("slotIds.slice(0, MAX_SKILL_SLOTS)", source)
        self.assertIn('className="cc-slot-menu"', source)
        self.assertIn("mythos-skill-slots:", source)
        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".cc-slot-menu {", css)
        self.assertIn(".cc-slot-swap {", css)

    def test_swap_strings_exist_in_both_languages(self) -> None:
        for lang in ("ko", "en"):
            strings = read(f"src/mythos_ui/src/i18n/strings.{lang}.ts")
            self.assertIn('"cc.swapSkill"', strings)
            self.assertIn('"cc.swapPick"', strings)


if __name__ == "__main__":
    unittest.main()
