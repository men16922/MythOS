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

    def test_surface_css_uses_design_system_tokens(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        self.assertIn(".surface {", css)
        self.assertIn("border-radius: var(--radius-md);", css)
        self.assertIn(
            "padding: calc(var(--surface-pad, var(--space-3)) - var(--surface-density-offset));",
            css,
        )
        self.assertIn(".surface-size-1 {", css)
        self.assertIn("--surface-pad: var(--space-2);", css)
        self.assertIn(".surface-size-2 {", css)
        self.assertIn("--surface-pad: var(--space-3);", css)
        self.assertIn(".surface-size-3 {", css)
        self.assertIn("--surface-pad: var(--space-5);", css)
        self.assertIn(".surface-density-compact {", css)
        self.assertIn("--surface-density-offset: var(--density-step);", css)
        self.assertIn(".surface-surface {", css)
        self.assertIn(".surface-outline {", css)
        self.assertIn(".surface-ghost {", css)

    def test_surface_ships_unused_no_call_sites_migrated_yet(self) -> None:
        # DS1a is additive-only per the plan; DS2 (gated, human review first)
        # is the migration slice. Guard against accidental early adoption.
        for path in (
            "src/mythos_ui/src/App.tsx",
            "src/mythos_ui/src/GameAside.tsx",
            "src/mythos_ui/src/StoryPanel.tsx",
        ):
            self.assertNotIn("Surface", read(path))


if __name__ == "__main__":
    unittest.main()
