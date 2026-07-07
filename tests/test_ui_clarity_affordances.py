"""Source-level locks for deterministic clarity affordances in the React UI."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class UIClarityAffordancesTest(unittest.TestCase):
    def test_choice_axis_chip_has_tooltip_and_accessible_label(self) -> None:
        source = read("src/mythos_ui/src/ChoicePanel.tsx")

        self.assertIn('t("choice.axis.tooltip")', source)
        self.assertIn('t("choice.axis.aria")', source)
        self.assertIn('className="cmd-chip axis-chip"', source)
        self.assertIn('className="axis-chip-icon"', source)

    def test_tactical_legend_auto_opens_once_per_browser(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn('TACTICAL_LEGEND_SEEN_KEY = "mythos_tactical_legend_seen"', source)
        self.assertIn("localStorage.getItem(TACTICAL_LEGEND_SEEN_KEY)", source)
        self.assertIn('localStorage.setItem(TACTICAL_LEGEND_SEEN_KEY, "1")', source)
        self.assertIn('title={t("story.legend.title")}', source)

    def test_route_legend_codex_term_opens_codex_tab(self) -> None:
        aside = read("src/mythos_ui/src/GameAside.tsx")
        app = read("src/mythos_ui/src/App.tsx")

        self.assertIn("onOpenCodex?: () => void", aside)
        self.assertIn('className="codex-term-link"', aside)
        self.assertIn('t("tab.codex")', aside)
        self.assertIn('onOpenCodex={() => handleTabClick("codex")}', app)

    def test_i18n_and_css_keys_are_present(self) -> None:
        ko = read("src/mythos_ui/src/i18n/strings.ko.ts")
        en = read("src/mythos_ui/src/i18n/strings.en.ts")
        css = read("src/mythos_ui/src/index.css")

        for key in ("choice.axis.tooltip", "choice.axis.aria"):
            self.assertIn(key, ko)
            self.assertIn(key, en)
        self.assertIn(".axis-chip", css)
        self.assertIn(".codex-term-link", css)


if __name__ == "__main__":
    unittest.main()
