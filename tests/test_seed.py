import unittest

from mythos_core import create_loop_seed


class SeedTest(unittest.TestCase):
    def test_same_input_creates_same_loop_seed(self) -> None:
        snapshot = {"echoes": ["mirror"], "traits": {"resolve": 3}}

        first = create_loop_seed("player_1", 2, snapshot)
        second = create_loop_seed("player_1", 2, {"traits": {"resolve": 3}, "echoes": ["mirror"]})

        self.assertEqual(first, second)

    def test_different_loop_index_changes_seed(self) -> None:
        self.assertNotEqual(create_loop_seed("player_1", 1), create_loop_seed("player_1", 2))
