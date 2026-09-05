"""Orientation stays available for layout while the portrait rotate nudge is gone."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class LandscapeCombatLC0Test(unittest.TestCase):
    def test_use_orientation_hook_tracks_landscape_and_coarse_pointer(self) -> None:
        source = read("src/mythos_ui/src/hooks/useOrientation.ts")

        self.assertIn('"(orientation: landscape)"', source)
        self.assertIn('"(pointer: coarse)"', source)
        self.assertIn("export interface OrientationState", source)
        self.assertIn("isLandscape: boolean;", source)
        self.assertIn("isCoarsePointer: boolean;", source)
        self.assertIn("export function useOrientation(): OrientationState", source)
        self.assertIn('addEventListener("change", update)', source)
        self.assertIn('removeEventListener("change", update)', source)

    def test_rotate_overlay_is_removed_from_combat_layout(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")
        self.assertNotIn("RotateOverlay", source)
        self.assertFalse((ROOT / "src/mythos_ui/src/RotateOverlay.tsx").exists())

    def test_rotate_overlay_css_and_copy_are_removed(self) -> None:
        css = read("src/mythos_ui/src/index.css")
        self.assertNotIn(".rotate-overlay", css)
        for lang in ("ko", "en"):
            self.assertNotIn("combat.rotate.", read(f"src/mythos_ui/src/i18n/strings.{lang}.ts"))


if __name__ == "__main__":
    unittest.main()
