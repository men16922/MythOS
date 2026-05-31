from __future__ import annotations

import unittest

from mythos_core.dice import Dice


class DiceTest(unittest.TestCase):
    def test_same_seed_replays_identically(self) -> None:
        a = [Dice("loop_abc:0").d20() for _ in range(1)]
        b = [Dice("loop_abc:0").d20() for _ in range(1)]
        self.assertEqual(a, b)
        d1, d2 = Dice("s"), Dice("s")
        self.assertEqual([d1.d20() for _ in range(20)], [d2.d20() for _ in range(20)])

    def test_different_seed_diverges(self) -> None:
        a = [Dice("seed-a").d20() for _ in range(10)]
        b = [Dice("seed-b").d20() for _ in range(10)]
        self.assertNotEqual(a, b)

    def test_d20_in_range(self) -> None:
        dice = Dice("range-check")
        for _ in range(200):
            self.assertIn(dice.d20(), range(1, 21))

    def test_notation_bounds(self) -> None:
        dice = Dice("notation")
        for _ in range(200):
            value = dice.roll("2d6+3")
            self.assertGreaterEqual(value, 5)
            self.assertLessEqual(value, 15)

    def test_notation_negative_modifier(self) -> None:
        dice = Dice("neg")
        for _ in range(100):
            value = dice.roll("1d4-1")
            self.assertGreaterEqual(value, 0)
            self.assertLessEqual(value, 3)

    def test_invalid_notation_raises(self) -> None:
        with self.assertRaises(ValueError):
            Dice("x").roll("banana")


if __name__ == "__main__":
    unittest.main()
