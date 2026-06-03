import unittest

from mythos_core import LoopState
from mythos_runtime.ending_resolver import EndingResolver
from mythos_runtime.scenario import ScenarioConfig


class EndingResolverTest(unittest.TestCase):
    def test_score_calculation(self) -> None:
        # Loop state with various flags representing metric additions
        from datetime import UTC, datetime

        from mythos_core import LoopPhase

        now = datetime(2026, 6, 3, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=50,
            tension=20,
            started_at=now,
            state={
                "flags": [
                    "humanity",
                    "humanity_plus_5",
                    "humanity_2",
                    "insight_boost",
                    "insight_10",
                    "resilience",
                    "dominance_plus_3",
                    "unrelated_flag",
                ]
            },
        )

        scores = EndingResolver.calculate_scores(loop, clue_count=3)

        # humanity: "humanity" (1) + "humanity_plus_5" (5) + "humanity_2" (2) = 8
        self.assertEqual(scores["Humanity"], 8)

        # insight: "insight_boost" (1) + "insight_10" (10) + clue_count (3) = 14
        self.assertEqual(scores["Insight"], 14)

        # resilience: "resilience" (1) = 1
        self.assertEqual(scores["Resilience"], 1)

        # dominance: "dominance_plus_3" (3) = 3
        self.assertEqual(scores["Dominance"], 3)

    def test_preprocess_condition(self) -> None:
        # Tests conversion of logical operators and contains syntax
        cond1 = "Humanity > 15 && Stability > 70"
        self.assertEqual(
            EndingResolver._preprocess_condition(cond1),
            "Humanity > 15  and  Stability > 70",
        )

        cond2 = "Insight > 10 && Autonomy == 5"
        self.assertEqual(
            EndingResolver._preprocess_condition(cond2),
            "Insight > 10  and  Autonomy == 5",
        )

        cond3 = "Humanity > 12 && flags contains miro_return_card_found"
        self.assertEqual(
            EndingResolver._preprocess_condition(cond3),
            'Humanity > 12  and  "miro_return_card_found" in flags',
        )

        cond4 = "flags contains \"double_quoted\" || flags contains 'single_quoted'"
        self.assertEqual(
            EndingResolver._preprocess_condition(cond4),
            '"double_quoted" in flags  or  "single_quoted" in flags',
        )

    def test_resolve_ending_matches_first_valid(self) -> None:
        from datetime import UTC, datetime

        from mythos_core import LoopPhase

        now = datetime(2026, 6, 3, tzinfo=UTC)
        scenario = ScenarioConfig(
            scenario_id="test-scenario",
            name="Test Scenario",
            brief="Brief",
            endings=[
                {
                    "id": "ending_1",
                    "title": "Ending One",
                    "condition": "Humanity > 10 && Stability > 50",
                },
                {
                    "id": "ending_2",
                    "title": "Ending Two",
                    "condition": "Insight > 5 && Autonomy == 3",
                },
                {
                    "id": "ending_3",
                    "title": "Ending Three",
                    "condition": "flags contains special_flag",
                },
            ],
            autonomy_config={
                "1": {"clues_required": 0},
                "3": {"clues_required": 3},
            },
        )

        # Case 1: Ending 1 should match
        loop1 = LoopState(
            loop_id="loop_1",
            player_id="player_1",
            seed="seed",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=60,
            tension=20,
            started_at=now,
            state={"flags": ["humanity_12"]},
        )
        ending_id, label = EndingResolver.resolve_ending(loop1, scenario, clue_count=0)
        self.assertEqual(ending_id, "ending_1")
        self.assertEqual(label, "Ending One")

        # Case 2: Ending 2 should match
        loop2 = LoopState(
            loop_id="loop_2",
            player_id="player_1",
            seed="seed",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=40,
            tension=20,
            started_at=now,
            state={"flags": ["insight_6"]},
        )
        # clue_count = 3 -> Autonomy level = 3
        ending_id, label = EndingResolver.resolve_ending(loop2, scenario, clue_count=3)
        self.assertEqual(ending_id, "ending_2")
        self.assertEqual(label, "Ending Two")

        # Case 3: Ending 3 should match
        loop3 = LoopState(
            loop_id="loop_3",
            player_id="player_1",
            seed="seed",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=40,
            tension=20,
            started_at=now,
            state={"flags": ["special_flag"]},
        )
        ending_id, label = EndingResolver.resolve_ending(loop3, scenario, clue_count=0)
        self.assertEqual(ending_id, "ending_3")
        self.assertEqual(label, "Ending Three")

        # Case 4: No ending matches
        loop4 = LoopState(
            loop_id="loop_4",
            player_id="player_1",
            seed="seed",
            phase=LoopPhase.CONNECT,
            location_id="data-layer-01",
            stability=40,
            tension=20,
            started_at=now,
            state={"flags": []},
        )
        ending_id, label = EndingResolver.resolve_ending(loop4, scenario, clue_count=0)
        self.assertIsNone(ending_id)
        self.assertEqual(label, "Archived Loop")
