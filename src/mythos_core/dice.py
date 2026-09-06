"""Deterministic, seedable dice for the TRPG/roguelike combat layer.

All combat randomness flows through ``Dice`` so a given loop seed replays
identically — essential for reproducible roguelike runs and deterministic
combat-engine tests. A ``Dice`` is seeded from a string (typically
``f"{loop.seed}:{cursor}"``); successive rolls advance an internal stream so
each call is independent but reproducible.
"""

from __future__ import annotations

import hashlib
import random
import re
from typing import TypeVar

_T = TypeVar("_T")

_DICE_RE = re.compile(r"^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$", re.IGNORECASE)


def _seed_int(seed: str) -> int:
    return int.from_bytes(hashlib.sha256(seed.encode("utf-8")).digest()[:8], "big")


class Dice:
    """A seeded RNG with TRPG dice helpers."""

    def __init__(self, seed: str) -> None:
        self.seed = seed
        self._rng = random.Random(_seed_int(seed))

    def roll_die(self, sides: int) -> int:
        if sides < 1:
            raise ValueError("die must have at least 1 side")
        return self._rng.randint(1, sides)

    def d20(self) -> int:
        return self.roll_die(20)

    def roll(self, notation: str) -> int:
        """Roll standard dice notation, e.g. ``"2d6+3"``, ``"d8"``, ``"1d4-1"``."""
        match = _DICE_RE.match(notation)
        if not match:
            raise ValueError(f"invalid dice notation: {notation!r}")
        count = int(match.group(1)) if match.group(1) else 1
        sides = int(match.group(2))
        modifier = 0
        if match.group(3):
            modifier = int(match.group(4)) * (1 if match.group(3) == "+" else -1)
        subtotal = sum(self.roll_die(sides) for _ in range(count))
        return subtotal + modifier

    def chance(self, probability: float) -> bool:
        return self._rng.random() < probability

    def choice(self, items: list[_T]) -> _T:
        return self._rng.choice(items)

    def weighted_choice(self, items: list[_T], weights: list[float]) -> _T:
        return self._rng.choices(items, weights=weights, k=1)[0]

    def shuffle(self, items: list[_T]) -> list[_T]:
        copy = list(items)
        self._rng.shuffle(copy)
        return copy
