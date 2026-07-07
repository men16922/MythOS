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

    def test_concise_mode_state_is_persisted_and_device_aware(self) -> None:
        # T6a (mobile foundation): a global concise/information-density mode
        # must default ON for coarse-pointer/small-viewport devices (mobile is
        # UX-degraded by info density) but respect an explicit user override,
        # and be reachable from anywhere without prop-drilling (Context, same
        # shape as the existing `lang` context).
        state = read("src/mythos_ui/src/conciseMode.ts")

        self.assertIn('STORAGE_KEY = "mythos_concise_mode"', state)
        self.assertIn('COARSE_POINTER_QUERY = "(pointer: coarse)"', state)
        self.assertIn('SMALL_VIEWPORT_QUERY = "(max-width: 600px)"', state)
        self.assertIn("export function resolveInitialConciseMode(", state)
        self.assertIn("export function persistConciseMode(", state)
        self.assertIn("export const ConciseModeContext = createContext<ConciseModeContextValue | null>(null)", state)
        self.assertIn("export function useConciseMode(", state)

        provider = read("src/mythos_ui/src/ConciseModeProvider.tsx")
        self.assertIn("export function ConciseModeProvider(", provider)
        self.assertIn('document.body.classList.toggle("concise-mode", conciseMode)', provider)
        self.assertIn("persistConciseMode(next)", provider)

        main = read("src/mythos_ui/src/main.tsx")
        self.assertIn("<ConciseModeProvider>", main)

        header = read("src/mythos_ui/src/HeaderBar.tsx")
        self.assertIn("useConciseMode()", header)
        self.assertIn('className={`concise-toggle ${conciseMode ? "is-on" : "is-off"}`}', header)
        self.assertIn("aria-pressed={conciseMode}", header)

        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".concise-toggle {", css)
        self.assertIn(".concise-toggle.is-on {", css)
        self.assertIn(".concise-toggle.is-off {", css)

        for key in ("hdr.conciseOn", "hdr.conciseOff"):
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.ko.ts"))
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.en.ts"))

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

    def test_aside_save_and_map_panels_collapse_to_chip_in_concise_mode(self) -> None:
        # T6b (mobile density): in concise mode, the Save and Map aside panels
        # start collapsed as a one-line summary chip (native details/summary,
        # same tap-to-expand shape LogPanel already used); non-concise mode
        # renders them unwrapped, unchanged from before T6b.
        source = read("src/mythos_ui/src/GameAside.tsx")

        self.assertIn('import { useConciseMode } from "./conciseMode";', source)
        self.assertIn("function AsideChip(", source)
        self.assertIn('<details className="panel aside-chip">', source)
        self.assertIn('<summary className="panel-title aside-chip-summary">{title}</summary>', source)
        self.assertIn("const { conciseMode } = useConciseMode();", source)
        self.assertIn('conciseMode ? (\n        <AsideChip title={t("save.title")}>{saveHistory}</AsideChip>', source)
        self.assertIn('conciseMode ? (\n          <AsideChip title={t("aside.route.title")}>{operationMap}</AsideChip>', source)

        css = read("src/mythos_ui/src/index.css")
        self.assertIn(".aside-chip-summary", css)
        self.assertIn(".aside-chip-body .panel", css)

    def test_combat_panel_collapses_secondary_clusters_to_chip_in_concise_mode(self) -> None:
        # T6c (mobile density): at combat's ~9-10-cluster peak, the tile
        # inspector and combat log — secondary/on-demand info, not needed to
        # take a turn — start collapsed as a one-line summary chip in concise
        # mode, reusing the same details/summary chip shape T6b introduced.
        # Non-concise mode renders them unwrapped, unchanged from before T6c.
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn('import { useConciseMode } from "./conciseMode";', source)
        self.assertIn("function CombatChip(", source)
        self.assertIn('<details className="panel aside-chip">', source)
        self.assertIn('<summary className="panel-title aside-chip-summary">{title}</summary>', source)
        self.assertIn("const { conciseMode } = useConciseMode();", source)
        self.assertIn(
            'conciseMode ? (\n                <CombatChip title={t("story.tile.title")}>',
            source,
        )
        self.assertIn(
            'conciseMode && combatLog ? (\n              <CombatChip title={t("combatLog.title")}>',
            source,
        )

        for key in ("story.tile.title",):
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.ko.ts"))
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.en.ts"))

    def test_combat_board_previews_move_target_and_auto_centers_active_unit(self) -> None:
        # T5a (mobile board affordance): the reachable-tile highlight already
        # existed only while actively dragging; hovering (or tapping-before-
        # drag on touch) now previews the same target highlight plus a dashed
        # ground-trail path from the active unit, and the board auto-scrolls
        # to keep the active unit in view when its turn starts.
        canvas = read("src/mythos_ui/src/combatCanvas.ts")

        self.assertIn("hover?: [number, number] | null", canvas)
        self.assertIn("const previewCell = drag?.targetCell ?? hover ?? null;", canvas)
        self.assertIn("const isTarget = previewReachable && previewCell![0] === x && previewCell![1] === y;", canvas)
        self.assertIn("ctx.setLineDash([5, 5]);", canvas)

        board = read("src/mythos_ui/src/hooks/useCombatBoard.ts")
        self.assertIn("const hoverRef = useRef<[number, number] | null>(null);", board)
        self.assertIn("redrawCombat(undefined, [cx, cy]);", board)
        self.assertIn("wrapper.scrollTo({", board)
        self.assertIn("}, [activeUnitId]);", board)

    def test_board_zoom_defaults_higher_on_small_viewport_with_a_tile_size_floor(self) -> None:
        # T5b (mobile board affordance): coarse-pointer/small-viewport devices
        # start the board zoomed in (instead of requiring the player to find
        # the zoom-in button first), and the on-screen tile size never shrinks
        # below a tappable floor regardless of zoom, viewport, or arena size.
        board = read("src/mythos_ui/src/hooks/useCombatBoard.ts")

        self.assertIn('COARSE_POINTER_QUERY = "(pointer: coarse)";', board)
        self.assertIn('SMALL_VIEWPORT_QUERY = "(max-width: 600px)";', board)
        self.assertIn("function resolveInitialBoardZoom(): number {", board)
        self.assertIn("useState(resolveInitialBoardZoom)", board)

        canvas = read("src/mythos_ui/src/combatCanvas.ts")
        self.assertIn("export const MIN_ISO_STEP_PX = 26;", canvas)
        self.assertIn("const minCssW = Math.ceil((MIN_ISO_STEP_PX * (cols + rows)) / 0.92);", canvas)
        self.assertIn("const cssW = Math.max(Math.floor(baseW * zoom), minCssW);", canvas)

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
