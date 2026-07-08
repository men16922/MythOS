"""Source-level lock for the Surface design-system primitive (DS1a).

docs/plans/2026-07-08-design-system.md Phase 1: variant x size x density
primitive, additive only — ships unused, no call sites migrated yet.
"""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class DesignSystemSurfaceTest(unittest.TestCase):
    def test_surface_component_exposes_variant_size_density_props(self) -> None:
        source = read("src/mythos_ui/src/Surface.tsx")

        self.assertIn(
            'export type SurfaceVariant = "surface" | "outline" | "ghost";', source
        )
        self.assertIn("export type SurfaceSize = 1 | 2 | 3;", source)
        self.assertIn(
            'export type SurfaceDensity = "comfortable" | "compact";', source
        )
        self.assertIn("export function Surface(", source)
        self.assertIn('variant = "surface"', source)
        self.assertIn("size = 2", source)
        self.assertIn('density = "comfortable"', source)
        self.assertIn('"surface"', source)
        self.assertIn("`surface-${variant}`", source)
        self.assertIn("`surface-size-${size}`", source)
        self.assertIn("`surface-density-${density}`", source)
        # DS2-b: forwards standard element attributes (id/style/handlers/data-*/
        # aria-*) so `.panel` sites carrying an id migrate without enumerating each.
        self.assertIn("extends HTMLAttributes<HTMLElement>", source)
        self.assertIn("...rest", source)
        # DS2-d: `as` renders a semantic element (section/details/…) with the same
        # chrome; defaults to <div>.
        self.assertIn("as?: ElementType;", source)
        self.assertIn('as: Tag = "div"', source)
        self.assertIn("<Tag className={classes} {...rest}>", source)

    def test_surface_css_uses_design_system_tokens(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        self.assertIn(".surface {", css)
        self.assertIn("border-radius: var(--radius-md);", css)
        # DS2-api: default fallback + size-2 both = --space-4 (16px), matching the
        # base `.panel` padding so the sweep keeps pixel-parity.
        self.assertIn(
            "padding: calc(var(--surface-pad, var(--space-4)) - var(--surface-density-offset));",
            css,
        )
        self.assertIn(".surface-size-1 {", css)
        self.assertIn("--surface-pad: var(--space-3);", css)
        self.assertIn(".surface-size-2 {", css)
        self.assertIn("--surface-pad: var(--space-4);", css)
        self.assertIn(".surface-size-3 {", css)
        self.assertIn("--surface-pad: var(--space-5);", css)
        self.assertIn(".surface-density-compact {", css)
        self.assertIn("--surface-density-offset: var(--density-step);", css)
        self.assertIn(".surface-surface {", css)
        # DS2-api (G3): the brand glow lives on the surface variant.
        self.assertIn("box-shadow: 0 0 22px rgba(0, 255, 170, 0.07);", css)
        self.assertIn(".surface-outline {", css)
        self.assertIn(".surface-ghost {", css)

    def test_surface_adoption_is_deliberate(self) -> None:
        # DS2 is unblocked (owner sign-off 2026-07-08) and migrates per-slice.
        # DS2-a: StatusPanel. DS2-b: the aside cluster (OperationMap x2 +
        # Save/RunHistory). Guard the still-unmigrated files against accidental
        # adoption so each cluster stays a deliberate, reviewed slice.
        gameaside = read("src/mythos_ui/src/GameAside.tsx")
        self.assertIn('import { Surface } from "./Surface";', gameaside)
        self.assertIn(
            '<Surface variant="surface" className={`status-panel ${showHints ? "hints-on" : ""}`}>',
            gameaside,
        )
        # DS2-b aside cluster: the OperationMap `.panel` div containers are gone
        # (the two remaining `<details className="panel …">` chips — AsideChip /
        # LogPanel — are deferred: Surface renders a <div>, not <details>).
        self.assertNotIn('<div className="panel minimap-panel"', gameaside)
        savehistory = read("src/mythos_ui/src/SaveHistoryPanel.tsx")
        self.assertIn('import { Surface } from "./Surface";', savehistory)
        self.assertNotIn('className="panel"', savehistory)
        # DS2-c StoryPanel cluster: board/roster/scene-image/narrative-script
        # migrated; only the deferred `<details className="panel aside-chip">`
        # (CombatChip) keeps a `panel` token here.
        story = read("src/mythos_ui/src/StoryPanel.tsx")
        self.assertIn('import { Surface } from "./Surface";', story)
        for cls in (
            "tactical-board-panel",
            "roster-panel",
            "scene-image-panel",
            "narrative-script-panel",
        ):
            self.assertNotIn(f'<div className="panel {cls}"', story)
        # DS2-d onboarding/dashboard cluster: OnboardingPanel's `<section>` uses
        # the new `as` prop; ProgressDashboard/TesterDashboard migrated too.
        onboarding = read("src/mythos_ui/src/OnboardingPanel.tsx")
        self.assertIn('<Surface as="section" variant="surface" id="onboarding">', onboarding)
        # DS2-e character/codex/skill cluster migrated too.
        for path in (
            "src/mythos_ui/src/ProgressDashboard.tsx",
            "src/mythos_ui/src/TesterDashboard.tsx",
            "src/mythos_ui/src/CharacterPanel.tsx",
            "src/mythos_ui/src/CharacterTabPanel.tsx",
            "src/mythos_ui/src/CodexPanel.tsx",
            "src/mythos_ui/src/SkillTreePanel.tsx",
            "src/mythos_ui/src/DevConsolePanel.tsx",
        ):
            src = read(path)
            self.assertIn('import { Surface } from "./Surface";', src)
            # No base `.panel` div container should remain in a migrated file.
            self.assertNotIn('className="panel"', src)
            self.assertNotIn('className="panel ', src)
        # App.tsx has no base `.panel` container of its own → stays unmigrated.
        self.assertNotIn("Surface", read("src/mythos_ui/src/App.tsx"))

    def test_ds3a_compact_density_reduces_surface_padding_globally(self) -> None:
        # DS3a (owner-approved): the header's compact toggle drives
        # `body.concise-mode`; in that mode every <Surface> drops one
        # --density-step of padding app-wide (a real spacing reduction, not just
        # the T6 collapse). Only container padding shrinks → 48px tap targets safe.
        css = read("src/mythos_ui/src/index.css")
        self.assertIn("body.concise-mode .surface {", css)
        idx = css.index("body.concise-mode .surface {")
        self.assertIn(
            "--surface-density-offset: var(--density-step);",
            css[idx : idx + 120],
        )
        # The toggle is relabelled from CONCISE to a density/COMPACT control.
        header = read("src/mythos_ui/src/HeaderBar.tsx")
        self.assertIn('COMPACT {conciseMode ? "ON" : "OFF"}', header)

    def test_ds2_base_panel_sweep_is_complete(self) -> None:
        # DS2-a..f + the deferred <details> chips migrated every base `.panel`
        # container onto <Surface> (incl. as="section"/as="details"). Guard that
        # no `<div|section|details|aside className="panel"|"panel …">` container
        # regresses in. Child classes (panel-title, panel-info-toggle, …) are fine.
        import re

        pat = re.compile(r'<(?:div|section|details|aside|article)\b[^>]*className=(?:"panel"|"panel |`panel )')
        src_dir = ROOT / "src" / "mythos_ui" / "src"
        offenders = [
            p.relative_to(ROOT).as_posix()
            for p in src_dir.glob("*.tsx")
            if pat.search(p.read_text(encoding="utf-8"))
        ]
        self.assertEqual(offenders, [], f"un-migrated base .panel containers: {offenders}")


if __name__ == "__main__":
    unittest.main()
