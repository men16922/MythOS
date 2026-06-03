import unittest
from datetime import UTC, datetime

from mythos_runtime.options import RunSummary
from mythos_runtime.progression import (
    MetaProgression,
    apply_meta_progression_to_state,
    determine_autonomy_level,
    evaluate_meta_progression,
)


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

    def test_evaluate_meta_progression_grants_first_run_and_clue_unlocks(self) -> None:
        progress = MetaProgression(player_id="player_1", scenario_id="glass-library")
        summary = RunSummary(
            run_id="run_1",
            player_id="player_1",
            loop_id="loop_1",
            scenario_id="glass-library",
            started_at=datetime(2026, 6, 3, tzinfo=UTC).isoformat(),
            ended_at=datetime(2026, 6, 3, tzinfo=UTC).isoformat(),
            ending_id=None,
            ending_label="Archived Loop",
            final_title="기록",
            final_location="catalog-hall",
            phase="ended",
            stability=60,
            tension=40,
            turns=5,
            combats_won=1,
            combats_lost=0,
            clues_collected=["loan_card_0000"],
            allies_met=["io"],
            unlocks_granted=[],
            summary_text="요약",
        )

        updated, grants = evaluate_meta_progression(progress, summary)

        self.assertEqual(updated.runs_completed, 1)
        self.assertEqual(updated.total_clues, 1)
        self.assertIn("loop_veteran", updated.unlocked_traits)
        self.assertIn("io", updated.unlocked_allies)
        self.assertIn("memory_slip", updated.unlocked_starting_items)
        self.assertIn("repair_tape", updated.unlocked_starting_items)
        self.assertIn("unlocked_allies:io", grants)

    def test_apply_meta_progression_to_state_grants_known_starting_items(self) -> None:
        progress = MetaProgression(
            player_id="player_1",
            scenario_id="glass-library",
            unlocked_starting_items=["memory_slip", "missing_item"],
        )
        combat = {
            "items": {
                "memory_slip": {"id": "memory_slip", "name": "기억 조각"},
            }
        }

        state = apply_meta_progression_to_state({"scenario_id": "glass-library"}, progress, combat)

        self.assertEqual(state["_inventory"], [{"id": "memory_slip", "name": "기억 조각"}])
        self.assertEqual(
            state["meta_progression"]["unlocked_starting_items"], ["memory_slip", "missing_item"]
        )


if __name__ == "__main__":
    unittest.main()
