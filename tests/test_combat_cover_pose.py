"""Source-level locks for the combat cover pose (crouch behind cover)."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class CombatCoverPoseTest(unittest.TestCase):
    def test_pose_union_includes_cover(self) -> None:
        source = read("src/mythos_ui/src/combatCanvas.ts")

        self.assertIn('pose?: "idle" | "attack" | "skill" | "hit" | "guard" | "cover"', source)

    def test_unit_on_cover_tile_selects_cover_pose_after_overrides(self) -> None:
        # A unit standing on a cover tile crouches; animation overrides and the
        # explicit defend stance stay ahead of it. The cover lookup must happen
        # BEFORE the pose expression (a prior wiring attempt read the badge
        # block's `aliveHere` before its declaration and broke the build).
        source = read("src/mythos_ui/src/combatCanvas.ts")

        self.assertIn('inCover ? "cover" : "idle"', source)
        self.assertIn('b.defending ? "guard"', source)
        self.assertLess(source.index("const inCover"), source.index('inCover ? "cover"'))

    def test_cover_sprite_name_convention_with_guard_fallback(self) -> None:
        # Sprite name convention: <char>-cover.png derived from the authored
        # guard/idle sprite name; a crouch sprite that fails to load falls back
        # to the guard pose sprite instead of the portrait card.
        source = read("src/mythos_ui/src/combatCanvas.ts")

        self.assertIn('"-cover.png"', source)
        self.assertIn('combatImagePath(b, "guard")', source)
        self.assertIn("brokenSprites", source)
