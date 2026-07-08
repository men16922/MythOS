"""Source-level lock for the Landscape Combat LC0 slice: the useOrientation
hook + rotate-to-landscape overlay on combat start (coarse-pointer portrait
only). docs/plans/2026-07-08-design-system.md "Landscape Combat".
"""

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
        self.assertIn("addEventListener(\"change\", update)", source)
        self.assertIn("removeEventListener(\"change\", update)", source)

    def test_rotate_overlay_shown_only_for_portrait_coarse_pointer_and_dismissible(
        self,
    ) -> None:
        source = read("src/mythos_ui/src/RotateOverlay.tsx")

        self.assertIn("import { useOrientation } from \"./hooks/useOrientation\";", source)
        self.assertIn("export function RotateOverlay()", source)
        self.assertIn("if (isLandscape || !isCoarsePointer || dismissed) return null;", source)
        self.assertIn("setDismissed(true)", source)
        self.assertIn('t("combat.rotate.prompt")', source)
        self.assertIn('t("combat.rotate.dismiss")', source)

    def test_rotate_overlay_wired_into_combat_layout(self) -> None:
        source = read("src/mythos_ui/src/StoryPanel.tsx")

        self.assertIn('import { RotateOverlay } from "./RotateOverlay";', source)
        self.assertIn("<RotateOverlay />", source)

    def test_rotate_overlay_css_hidden_in_landscape(self) -> None:
        css = read("src/mythos_ui/src/index.css")

        self.assertIn(".rotate-overlay {", css)
        self.assertIn(".rotate-overlay-dismiss {", css)
        self.assertIn("@media (orientation: landscape) {", css)

    def test_i18n_keys_present_in_both_languages(self) -> None:
        for key in ("combat.rotate.prompt", "combat.rotate.dismiss"):
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.ko.ts"))
            self.assertIn(key, read("src/mythos_ui/src/i18n/strings.en.ts"))


if __name__ == "__main__":
    unittest.main()
