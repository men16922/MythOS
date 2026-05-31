import unittest

from mythos_runtime.progression import determine_autonomy_level


class ProgressionTest(unittest.TestCase):
    def test_determine_autonomy_level_uses_highest_reached_threshold(self) -> None:
        config = {
            "1": {"clues_required": 0},
            "2": {"clues_required": 2},
            "3": {"clues_required": 5},
        }

        self.assertEqual(determine_autonomy_level(config, clue_count=4), 2)
        self.assertEqual(determine_autonomy_level(config, clue_count=5), 3)

    def test_determine_autonomy_level_ignores_invalid_thresholds(self) -> None:
        config = {
            "2": {"clues_required": "many"},
            "3": {},
        }

        self.assertEqual(determine_autonomy_level(config, clue_count=10), 1)


if __name__ == "__main__":
    unittest.main()
