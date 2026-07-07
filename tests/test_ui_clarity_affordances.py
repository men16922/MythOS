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
        self.assertIn('className={`cmd-chip axis-chip', source)
        self.assertIn('className="axis-chip-icon"', source)

    def test_choice_axis_chip_tooltip_is_tap_openable(self) -> None:
        # M3 (mobile clarity): the axis chip's hint was a hover-only `title=`,
        # dead on touch. Locks that it is now a tap-toggled popover instead.
        source = read("src/mythos_ui/src/ChoicePanel.tsx")

        self.assertIn("function AxisChip(", source)
        self.assertIn("setOpen((prev) => !prev)", source)
        self.assertIn('className="axis-chip-tooltip" role="tooltip"', source)
        self.assertNotIn("title={axisTooltip}", source)

        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".axis-chip-tooltip", css)
        self.assertIn(".axis-chip.axis-chip-open .axis-chip-tooltip", css)

    def test_combat_skill_tooltip_is_tap_openable(self) -> None:
        # M3 (mobile clarity): the skill button's cost/range/cooldown detail was
        # a hover-only `title=` on the whole (already-tappable) button, dead on
        # touch. Locks that it is now a nested tap-toggle popover instead.
        source = read("src/mythos_ui/src/CombatControls.tsx")

        self.assertIn("function SkillInfoTooltip(", source)
        self.assertIn("setOpen((prev) => !prev)", source)
        self.assertIn('className="cc-skill-info-tooltip" role="tooltip"', source)
        self.assertIn("event.stopPropagation()", source)
        self.assertIn("<SkillInfoTooltip tooltip={tooltip} />", source)
        self.assertNotIn("title={tooltip}", source)

        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".cc-skill-info-tooltip", css)
        self.assertIn(".cc-skill-info.cc-skill-info-open .cc-skill-info-tooltip", css)

    def test_game_aside_info_divs_are_tap_openable(self) -> None:
        # M3 (mobile clarity): the route node, fog stub, and minimap cell divs
        # had no click handler at all, so their hover-only `title=` was fully
        # dead on touch (highest touch-info-loss of the ~20 M3 sites). Locks
        # that they now share the InfoPopover tap-toggle popover instead.
        source = read("src/mythos_ui/src/GameAside.tsx")

        self.assertIn("function InfoPopover(", source)
        self.assertIn("setOpen((prev) => !prev)", source)
        self.assertIn('className="aside-info-tooltip" role="tooltip"', source)
        self.assertIn("<InfoPopover key={id} className={cls} tooltip={title} ariaLabel={label}>", source)
        self.assertIn('<InfoPopover className="route-fog" tooltip={t("aside.route.fogTitle")}>', source)
        self.assertIn('<InfoPopover key={coordKey} className="mm-cell mm-enemy" tooltip={name}>', source)
        self.assertIn("<InfoPopover key={coordKey} className={cls} tooltip={tileName}>", source)
        self.assertNotIn("title={title}", source)
        self.assertNotIn('title={t("aside.route.fogTitle")}', source)
        self.assertNotIn("title={name}", source)
        self.assertNotIn('title={tile.name || ""}', source)

        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".aside-info-tooltip", css)
        self.assertIn(".aside-info-hint.aside-info-open .aside-info-tooltip", css)

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
