import unittest
from dataclasses import replace
from datetime import UTC, datetime

from mythos_core import LoopPhase, LoopState, Scene
from mythos_runtime.options import RunSummary
from mythos_runtime.progression import (
    DEFAULT_LEARN_COST,
    DEFAULT_RANKUP_COST,
    INSIGHT_PER_CLUE,
    INSIGHT_PER_COMBAT_WON,
    INSIGHT_PER_RUN,
    MetaProgression,
    _meta_progression_memory,
    _run_summary_from_memory,
    _run_summary_memory_from_archive,
    apply_meta_progression_to_state,
    build_skill_tree,
    determine_autonomy_level,
    evaluate_meta_progression,
    learn_or_rank_skill,
    meta_progression_from_content,
    meta_progression_to_content,
    scenario_unlock_met,
)
from mythos_runtime.scenario import load_scenario

GHOST = "ghost"
ECHO = "echo_collector"

# Minimal scenario combat block mirroring neo-seoul skill shape.
_COMBAT = {
    "archetype_base_skills": {
        GHOST: ["signal_step", "packet_shot"],
        ECHO: ["patch_protocol", "covering_noise"],
    },
    "skills": {
        "signal_step": {
            "id": "signal_step",
            "name": "신호 도약",
            "tier": 0,
            "max_rank": 3,
            "rankup_cost": 2,
        },
        "packet_shot": {
            "id": "packet_shot",
            "name": "패킷 사격",
            "tier": 0,
            "max_rank": 3,
            "rankup_cost": 2,
        },
        "overload_strike": {
            "id": "overload_strike",
            "name": "과부하 일격",
            "tier": 1,
            "requires": ["packet_shot"],
            "insight_cost": 3,
            "rankup_cost": 2,
            "max_rank": 3,
        },
    },
}


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

    def _run_summary(self, scenario_id: str, *, clues: int, won: int) -> RunSummary:
        ts = datetime(2026, 6, 3, tzinfo=UTC).isoformat()
        return RunSummary(
            run_id="run_1",
            player_id="player_1",
            loop_id="loop_1",
            scenario_id=scenario_id,
            started_at=ts,
            ended_at=ts,
            ending_id=None,
            ending_label="Archived Loop",
            final_title="기록",
            final_location="x",
            phase="ended",
            stability=60,
            tension=40,
            turns=5,
            combats_won=won,
            combats_lost=0,
            clues_collected=[f"clue_{i}" for i in range(clues)],
            allies_met=["io"],
            unlocks_granted=[],
            summary_text="요약",
        )

    def test_evaluate_meta_progression_data_driven_neo_seoul(self) -> None:
        progress = MetaProgression(player_id="player_1", scenario_id="neo-seoul")
        updated, grants = evaluate_meta_progression(
            progress, self._run_summary("neo-seoul", clues=3, won=1)
        )

        self.assertEqual(updated.runs_completed, 1)
        self.assertEqual(updated.total_clues, 3)
        self.assertIn("loop_veteran", updated.unlocked_traits)
        self.assertIn("io", updated.unlocked_allies)
        # Archetypes are data-driven from archetypes[].unlock.
        self.assertIn("data_smuggler", updated.unlocked_archetypes)
        self.assertIn("echo_collector", updated.unlocked_archetypes)
        # Epiphanies UNLOCK skills (learnable) — they are not auto-learned anymore.
        self.assertIn("covering_noise", updated.unlocked_skills)
        self.assertIn("overload_strike", updated.unlocked_skills)
        self.assertIn("patch_protocol", updated.unlocked_skills)
        self.assertEqual(updated.learned_skills, [])
        self.assertEqual(updated.insight_points, 6)  # 2 run + 3 clues + 1 win

    def test_ix_clear_grants_exclusive_reward(self) -> None:
        # Beating the climax (a victory ending) permanently grants the clear trait
        # + starting item; a defeat/erasure completion does NOT (2026-07-04).
        base = MetaProgression(player_id="player_1", scenario_id="neo-seoul")
        summary = self._run_summary("neo-seoul", clues=0, won=1)
        cleared, _ = evaluate_meta_progression(
            base, replace(summary, ending_id="ending_code_rewrite")
        )
        self.assertIn("ix_vanquisher", cleared.unlocked_traits)
        self.assertIn("signal_blade", cleared.unlocked_starting_items)
        erased, _ = evaluate_meta_progression(base, replace(summary, ending_id="ending_erasure"))
        self.assertNotIn("ix_vanquisher", erased.unlocked_traits)
        self.assertNotIn("signal_blade", erased.unlocked_starting_items)

    def test_achievement_unlocks_companion_recruit(self) -> None:
        # 3 cumulative combat wins unlocks Han for recruitment in future loops
        # (his meet side-arc is then eligible to appear via attach_side_anchors).
        base = MetaProgression(player_id="player_1", scenario_id="neo-seoul", total_combats_won=2)
        unlocked, _ = evaluate_meta_progression(
            base, self._run_summary("neo-seoul", clues=0, won=1)
        )
        self.assertIn("han", unlocked.unlocked_allies)
        # Below the threshold, Han stays locked.
        low = MetaProgression(player_id="player_1", scenario_id="neo-seoul", total_combats_won=0)
        still_locked, _ = evaluate_meta_progression(
            low, self._run_summary("neo-seoul", clues=0, won=1)
        )
        self.assertNotIn("han", still_locked.unlocked_allies)

    def test_evaluate_meta_progression_is_scenario_scoped(self) -> None:
        # A glass-library run must not grant neo-seoul archetypes/skills.
        progress = MetaProgression(player_id="player_1", scenario_id="glass-library")
        updated, _ = evaluate_meta_progression(
            progress, self._run_summary("glass-library", clues=3, won=1)
        )
        self.assertIn("unreturned_reader", updated.unlocked_archetypes)
        self.assertIn("binder_fugitive", updated.unlocked_archetypes)
        self.assertNotIn("data_smuggler", updated.unlocked_archetypes)
        self.assertIn("restore_margin", updated.unlocked_skills)
        self.assertNotIn("covering_noise", updated.unlocked_skills)

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
        self.assertEqual(state["meta_progression"]["unlocked_archetypes"], ["ghost"])


class InsightAccrualTest(unittest.TestCase):
    def _summary(self, *, clues: int, won: int) -> RunSummary:
        ts = datetime(2026, 6, 7, tzinfo=UTC).isoformat()
        return RunSummary(
            run_id="run_1",
            player_id="p",
            loop_id="l",
            scenario_id="neo-seoul",
            started_at=ts,
            ended_at=ts,
            ending_id=None,
            ending_label="L",
            final_title="t",
            final_location="x",
            phase="ended",
            stability=50,
            tension=30,
            turns=3,
            combats_won=won,
            combats_lost=0,
            clues_collected=[f"clue_{i}" for i in range(clues)],
            allies_met=[],
            unlocks_granted=[],
            summary_text="",
        )

    def test_insight_accrues_per_run_clue_and_win(self) -> None:
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul")
        updated, grants = evaluate_meta_progression(progress, self._summary(clues=2, won=1))
        # 2 (run) + 2 (clues) + 1 (win)
        self.assertEqual(updated.insight_points, 5)
        self.assertIn("insight_points:+5", grants)

    def test_insight_is_cumulative_across_runs(self) -> None:
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul", insight_points=4)
        updated, _ = evaluate_meta_progression(progress, self._summary(clues=0, won=0))
        self.assertEqual(updated.insight_points, 6)


class RelationshipCarryOverTest(unittest.TestCase):
    """Companion affection accrues into meta progression and carries across loops,
    mirroring the insight pattern (per-run tally summed into the previous total)."""

    def _summary(self, relationships: dict[str, int]) -> RunSummary:
        ts = datetime(2026, 6, 16, tzinfo=UTC).isoformat()
        return RunSummary(
            run_id="run_1",
            player_id="p",
            loop_id="l",
            scenario_id="neo-seoul",
            started_at=ts,
            ended_at=ts,
            ending_id=None,
            ending_label="L",
            final_title="t",
            final_location="x",
            phase="ended",
            stability=50,
            tension=30,
            turns=3,
            combats_won=0,
            combats_lost=0,
            clues_collected=[],
            allies_met=[],
            unlocks_granted=[],
            summary_text="",
            relationships=relationships,
        )

    def test_relationship_accrues_from_run(self) -> None:
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul")
        updated, grants = evaluate_meta_progression(
            progress, self._summary({"se_rin": 2, "kai": 1})
        )
        self.assertEqual(updated.relationships, {"se_rin": 2, "kai": 1})
        self.assertIn("relationship:se_rin:+2", grants)
        self.assertIn("relationship:kai:+1", grants)

    def test_relationship_is_cumulative_across_runs(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 3}
        )
        updated, _ = evaluate_meta_progression(progress, self._summary({"se_rin": 2, "kai": 1}))
        self.assertEqual(updated.relationships, {"se_rin": 5, "kai": 1})

    def test_negative_delta_can_net_to_zero_and_prunes(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 2}
        )
        updated, _ = evaluate_meta_progression(progress, self._summary({"se_rin": -2}))
        # net 0 → companion pruned (canonical form, matches live-state convention)
        self.assertEqual(updated.relationships, {})

    def test_empty_run_relationships_leave_previous_untouched(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 4}
        )
        updated, grants = evaluate_meta_progression(progress, self._summary({}))
        self.assertEqual(updated.relationships, {"se_rin": 4})
        self.assertFalse([g for g in grants if g.startswith("relationship:")])

    def test_content_round_trip_preserves_relationships(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 5, "kai": -1}
        )
        content = meta_progression_to_content(progress)
        restored = meta_progression_from_content(content, player_id="p", scenario_id="neo-seoul")
        self.assertEqual(restored.relationships, {"se_rin": 5, "kai": -1})

    def test_malformed_stored_relationships_are_coerced(self) -> None:
        content = {"relationships": {"se_rin": "3", "bad": "x", "zero": 0}}
        restored = meta_progression_from_content(content, player_id="p", scenario_id="neo-seoul")
        # "3" coerced, non-numeric dropped, 0 pruned
        self.assertEqual(restored.relationships, {"se_rin": 3})

    def test_archive_run_summary_round_trips_loop_relationships(self) -> None:
        now = datetime(2026, 6, 16, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_x",
            player_id="p",
            seed="seed",
            phase=LoopPhase.ENDED,
            location_id="loc",
            stability=40,
            tension=20,
            started_at=now,
            ended_at=now,
            state={"scenario_id": "neo-seoul", "relationships": {"se_rin": 3, "kai": 1}},
        )
        scene = Scene(
            scene_id="scene_x",
            loop_id="loop_x",
            turn_index=4,
            title="Finale",
            location="loc",
            narration="...",
            choices=[],
            visual_brief=None,
            created_at=now,
        )
        memory = _run_summary_memory_from_archive(loop, scene, [], [], "wrap-up")
        summary = _run_summary_from_memory(memory)
        self.assertEqual(summary.relationships, {"se_rin": 3, "kai": 1})
        # End-to-end: the run summary feeds evaluate, accruing into meta.
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul")
        updated, _ = evaluate_meta_progression(progress, summary)
        self.assertEqual(updated.relationships, {"se_rin": 3, "kai": 1})

    def test_carry_over_into_next_loop_state(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 5}
        )
        state = apply_meta_progression_to_state({"scenario_id": "neo-seoul"}, progress, {})
        self.assertEqual(state["meta_progression"]["relationships"], {"se_rin": 5})
        self.assertEqual(state["relationships"], {"se_rin": 5})
        self.assertEqual(state["_relationship_baseline"], {"se_rin": 5})

    def test_cumulative_loop_archives_only_this_run_delta(self) -> None:
        now = datetime(2026, 6, 16, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_cumulative",
            player_id="p",
            seed="seed",
            phase=LoopPhase.ENDED,
            location_id="loc",
            stability=40,
            tension=20,
            started_at=now,
            ended_at=now,
            state={
                "scenario_id": "neo-seoul",
                "relationships": {"se_rin": 5, "kai": 1},
                "_relationship_baseline": {"se_rin": 3},
            },
        )
        scene = Scene(
            scene_id="scene_cumulative",
            loop_id=loop.loop_id,
            turn_index=4,
            title="Finale",
            location="loc",
            narration="...",
            choices=[],
            visual_brief=None,
            created_at=now,
        )
        memory = _run_summary_memory_from_archive(loop, scene, [], [], "wrap-up")
        summary = _run_summary_from_memory(memory)
        self.assertEqual(summary.relationships, {"se_rin": 2, "kai": 1})
        previous = MetaProgression(
            player_id="p", scenario_id="neo-seoul", relationships={"se_rin": 3}
        )
        updated, _ = evaluate_meta_progression(previous, summary)
        self.assertEqual(updated.relationships, {"se_rin": 5, "kai": 1})


class CutsceneUnlockCarryOverTest(unittest.TestCase):
    """Companion cutscene unlocks accrue into meta progression and carry across loops
    (the cross-loop gallery), mirroring allies_met/epiphanies_seen union semantics."""

    def _summary(self, unlocked: list[str]) -> RunSummary:
        ts = datetime(2026, 6, 16, tzinfo=UTC).isoformat()
        return RunSummary(
            run_id="run_1",
            player_id="p",
            loop_id="l",
            scenario_id="neo-seoul",
            started_at=ts,
            ended_at=ts,
            ending_id=None,
            ending_label="L",
            final_title="t",
            final_location="x",
            phase="ended",
            stability=50,
            tension=30,
            turns=3,
            combats_won=0,
            combats_lost=0,
            clues_collected=[],
            allies_met=[],
            unlocks_granted=[],
            summary_text="",
            unlocked_cutscenes=unlocked,
        )

    def test_unlock_accrues_and_grants_only_new(self) -> None:
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul")
        updated, grants = evaluate_meta_progression(progress, self._summary(["SERIN_FIRST_LIGHT"]))
        self.assertEqual(updated.unlocked_cutscenes, ["SERIN_FIRST_LIGHT"])
        self.assertIn("cutscene:SERIN_FIRST_LIGHT", grants)

    def test_already_unlocked_is_not_regranted(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", unlocked_cutscenes=["SERIN_FIRST_LIGHT"]
        )
        updated, grants = evaluate_meta_progression(
            progress, self._summary(["SERIN_FIRST_LIGHT", "SERIN_PROMISE"])
        )
        self.assertEqual(updated.unlocked_cutscenes, ["SERIN_FIRST_LIGHT", "SERIN_PROMISE"])
        # only the newly-unlocked one is granted (no duplicate banner for prior unlocks)
        self.assertNotIn("cutscene:SERIN_FIRST_LIGHT", grants)
        self.assertIn("cutscene:SERIN_PROMISE", grants)

    def test_content_round_trip(self) -> None:
        progress = MetaProgression(
            player_id="p", scenario_id="neo-seoul", unlocked_cutscenes=["SERIN_PROMISE"]
        )
        content = meta_progression_to_content(progress)
        restored = meta_progression_from_content(content, player_id="p", scenario_id="neo-seoul")
        self.assertEqual(restored.unlocked_cutscenes, ["SERIN_PROMISE"])

    def test_archive_computes_unlocks_from_real_scenario(self) -> None:
        # Live se_rin.md: SERIN_FIRST_LIGHT(affection2), SERIN_PROMISE(affection4+trusted_se_rin).
        now = datetime(2026, 6, 16, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_x",
            player_id="p",
            seed="seed",
            phase=LoopPhase.ENDED,
            location_id="loc",
            stability=40,
            tension=20,
            started_at=now,
            ended_at=now,
            state={
                "scenario_id": "neo-seoul",
                "relationships": {"se_rin": 4},
                "flags": ["met_se_rin", "trusted_se_rin"],
            },
        )
        scene = Scene(
            scene_id="scene_x",
            loop_id="loop_x",
            turn_index=4,
            title="Finale",
            location="loc",
            narration="...",
            choices=[],
            visual_brief=None,
            created_at=now,
        )
        memory = _run_summary_memory_from_archive(loop, scene, [], [], "wrap-up")
        summary = _run_summary_from_memory(memory)
        self.assertEqual(summary.unlocked_cutscenes, ["SERIN_FIRST_LIGHT", "SERIN_PROMISE"])
        progress = MetaProgression(player_id="p", scenario_id="neo-seoul")
        updated, _ = evaluate_meta_progression(progress, summary)
        self.assertEqual(updated.unlocked_cutscenes, ["SERIN_FIRST_LIGHT", "SERIN_PROMISE"])

    def test_archive_below_threshold_unlocks_nothing(self) -> None:
        now = datetime(2026, 6, 16, tzinfo=UTC)
        loop = LoopState(
            loop_id="loop_y",
            player_id="p",
            seed="seed",
            phase=LoopPhase.ENDED,
            location_id="loc",
            stability=40,
            tension=20,
            started_at=now,
            ended_at=now,
            state={"scenario_id": "neo-seoul", "relationships": {"se_rin": 1}, "flags": []},
        )
        scene = Scene(
            scene_id="s",
            loop_id="loop_y",
            turn_index=2,
            title="t",
            location="loc",
            narration="...",
            choices=[],
            visual_brief=None,
            created_at=now,
        )
        memory = _run_summary_memory_from_archive(loop, scene, [], [], "wrap-up")
        self.assertEqual(_run_summary_from_memory(memory).unlocked_cutscenes, [])


class SkillTreeAndLearnTest(unittest.TestCase):
    def test_build_skill_tree_marks_base_unlocked_and_locked(self) -> None:
        progress = MetaProgression(
            player_id="p",
            scenario_id="neo-seoul",
            unlocked_skills=["overload_strike"],
            insight_points=5,
        )
        nodes = {n["id"]: n for n in build_skill_tree(progress, _COMBAT, GHOST)}
        self.assertEqual(nodes["signal_step"]["status"], "learned")
        self.assertEqual(nodes["signal_step"]["action"], "rankup")
        self.assertEqual(nodes["overload_strike"]["status"], "unlocked")
        self.assertEqual(nodes["overload_strike"]["action"], "learn")
        self.assertTrue(nodes["overload_strike"]["can_afford"])

    def test_learn_unlocked_skill_spends_insight(self) -> None:
        progress = MetaProgression(
            player_id="p",
            scenario_id="neo-seoul",
            unlocked_skills=["overload_strike"],
            insight_points=5,
        )
        updated = learn_or_rank_skill(progress, _COMBAT, "overload_strike", GHOST)
        self.assertEqual(updated.insight_points, 2)
        self.assertIn("overload_strike", updated.learned_skills)
        self.assertEqual(updated.skill_ranks["overload_strike"], 1)

    def test_rank_up_increments_and_caps_at_max(self) -> None:
        progress = MetaProgression(
            player_id="p",
            scenario_id="neo-seoul",
            learned_skills=["overload_strike"],
            skill_ranks={"overload_strike": 2},
            insight_points=5,
        )
        updated = learn_or_rank_skill(progress, _COMBAT, "overload_strike", GHOST)
        self.assertEqual(updated.skill_ranks["overload_strike"], 3)
        self.assertEqual(updated.insight_points, 3)
        with self.assertRaises(ValueError):
            learn_or_rank_skill(updated, _COMBAT, "overload_strike", GHOST)

    def test_learn_rejects_locked_insufficient_and_prereq(self) -> None:
        locked = MetaProgression(player_id="p", scenario_id="neo-seoul", insight_points=5)
        with self.assertRaises(ValueError):
            learn_or_rank_skill(locked, _COMBAT, "overload_strike", GHOST)

        poor = MetaProgression(
            player_id="p",
            scenario_id="neo-seoul",
            unlocked_skills=["overload_strike"],
            insight_points=1,
        )
        with self.assertRaises(ValueError):
            learn_or_rank_skill(poor, _COMBAT, "overload_strike", GHOST)

        # Echo Collector base lacks packet_shot → prereq unmet.
        prereq = MetaProgression(
            player_id="p",
            scenario_id="neo-seoul",
            unlocked_skills=["overload_strike"],
            insight_points=5,
        )
        with self.assertRaises(ValueError):
            learn_or_rank_skill(prereq, _COMBAT, "overload_strike", ECHO)


class NeoSeoulProgressionEconomyTest(unittest.TestCase):
    def setUp(self) -> None:
        self.combat = load_scenario("neo-seoul").combat
        self.skills = self.combat["skills"]

    def _skill_int(self, skill: dict[str, object], key: str, default: int) -> int:
        value = skill.get(key, default)
        if not isinstance(value, int):
            self.fail(f"{key} must be int, got {value!r}")
        return value

    def _tier_costs(self, cost_key: str, default: int) -> dict[int, list[int]]:
        costs: dict[int, list[int]] = {}
        for skill in self.skills.values():
            self.assertIsInstance(skill, dict)
            tier = self._skill_int(skill, "tier", 0)
            costs.setdefault(tier, []).append(self._skill_int(skill, cost_key, default))
        return costs

    def test_skill_costs_are_monotonic_by_tier(self) -> None:
        for cost_key, default in (
            ("insight_cost", DEFAULT_LEARN_COST),
            ("rankup_cost", DEFAULT_RANKUP_COST),
        ):
            previous_max = 0
            for tier, costs in sorted(self._tier_costs(cost_key, default).items()):
                current_min = min(costs)
                self.assertGreaterEqual(
                    current_min,
                    previous_max,
                    f"{cost_key} tier {tier} drops below a lower tier: {costs}",
                )
                previous_max = max(costs)

    def test_tier_zero_skills_are_starting_archetype_skills(self) -> None:
        base_by_archetype = self.combat["archetype_base_skills"]
        self.assertIsInstance(base_by_archetype, dict)
        starting_skill_ids = {
            skill_id for skill_ids in base_by_archetype.values() for skill_id in skill_ids
        }
        tier_zero_ids = {
            skill_id
            for skill_id, skill in self.skills.items()
            if self._skill_int(skill, "tier", 0) == 0
        }

        self.assertTrue(tier_zero_ids)
        self.assertLessEqual(tier_zero_ids, starting_skill_ids)

    def test_each_tier_has_a_reasonable_income_path(self) -> None:
        conservative_first_run_income = INSIGHT_PER_RUN + INSIGHT_PER_CLUE + INSIGHT_PER_COMBAT_WON
        two_run_income = conservative_first_run_income * 2

        for tier, costs in sorted(self._tier_costs("insight_cost", DEFAULT_LEARN_COST).items()):
            reachable_cost = min(costs)
            if tier == 0:
                self.assertLessEqual(reachable_cost, DEFAULT_LEARN_COST)
            else:
                self.assertLessEqual(
                    reachable_cost,
                    two_run_income,
                    f"tier {tier} has no skill learnable within two conservative runs",
                )

        rankup_costs = self._tier_costs("rankup_cost", DEFAULT_RANKUP_COST)
        for tier, costs in sorted(rankup_costs.items()):
            self.assertLessEqual(
                min(costs),
                conservative_first_run_income,
                f"tier {tier} has no rank-up affordable from one conservative run",
            )


class NeoSeoulArchetypeConsistencyTest(unittest.TestCase):
    """Invariant: archetype_base_skills and archetype_loadout describe the same
    archetype set, and every referenced skill/weapon actually exists."""

    def setUp(self) -> None:
        self.combat = load_scenario("neo-seoul").combat
        self.base_skills = self.combat["archetype_base_skills"]
        self.loadout = self.combat["archetype_loadout"]

    @staticmethod
    def _pool_ids(pool: object) -> set[str]:
        if isinstance(pool, dict):
            return set(pool.keys())
        ids: set[str] = set()
        if isinstance(pool, list):
            for record in pool:
                if isinstance(record, dict) and isinstance(record.get("id"), str):
                    ids.add(record["id"])
        return ids

    def test_archetype_key_sets_are_identical(self) -> None:
        self.assertIsInstance(self.base_skills, dict)
        self.assertIsInstance(self.loadout, dict)
        base_keys = set(self.base_skills.keys())
        loadout_keys = set(self.loadout.keys())
        self.assertEqual(
            base_keys,
            loadout_keys,
            "archetype_base_skills / archetype_loadout 아키타입 집합 불일치: "
            f"base만={sorted(base_keys - loadout_keys)}, "
            f"loadout만={sorted(loadout_keys - base_keys)}",
        )

    def test_archetype_base_skills_exist(self) -> None:
        skill_ids = self._pool_ids(self.combat.get("skills"))
        self.assertTrue(skill_ids, "combat.skills 가 비어있음")
        for archetype, refs in self.base_skills.items():
            self.assertIsInstance(refs, list, f"{archetype!r} base skills must be a list")
            dangling = [s for s in refs if s not in skill_ids]
            self.assertEqual(
                dangling, [], f"archetype_base_skills[{archetype!r}] dangling 스킬: {dangling}"
            )

    def test_archetype_loadout_weapons_exist(self) -> None:
        weapon_ids = self._pool_ids(self.combat.get("weapons"))
        self.assertTrue(weapon_ids, "combat.weapons 가 비어있음")
        for archetype, weapons in self.loadout.items():
            self.assertIsInstance(weapons, list, f"{archetype!r} loadout must be a list")
            dangling = [w for w in weapons if w not in weapon_ids]
            self.assertEqual(
                dangling, [], f"archetype_loadout[{archetype!r}] dangling 무기: {dangling}"
            )


class ScenarioUnlockTest(unittest.TestCase):
    def test_no_unlock_is_always_available(self) -> None:
        self.assertTrue(scenario_unlock_met(None, [], "p"))
        self.assertTrue(scenario_unlock_met({}, [], "p"))

    def test_tutorial_completed_gates_until_first_run(self) -> None:
        unlock = {"tutorial_completed": True}
        self.assertFalse(scenario_unlock_met(unlock, [], "p"))
        done = _meta_progression_memory(
            MetaProgression(player_id="p", scenario_id="neo-seoul", runs_completed=1)
        )
        self.assertTrue(scenario_unlock_met(unlock, [done], "p"))

    def test_runs_completed_threshold(self) -> None:
        unlock = {"runs_completed": 2}
        one = _meta_progression_memory(
            MetaProgression(player_id="p", scenario_id="neo-seoul", runs_completed=1)
        )
        self.assertFalse(scenario_unlock_met(unlock, [one], "p"))
        two = _meta_progression_memory(
            MetaProgression(player_id="p", scenario_id="neo-seoul", runs_completed=2)
        )
        self.assertTrue(scenario_unlock_met(unlock, [two], "p"))

    def test_disabled_hard_blocks_regardless_of_progress(self) -> None:
        # CBT hold: ``disabled`` wins over met conditions AND over the live-play
        # bypass (checked before it), so the scenario is never selectable.
        unlock = {"disabled": True, "tutorial_completed": True}
        done = _meta_progression_memory(
            MetaProgression(player_id="p", scenario_id="neo-seoul", runs_completed=3)
        )
        self.assertFalse(scenario_unlock_met(unlock, [done], "p"))

    def test_glass_library_is_disabled_for_cbt(self) -> None:
        # Content lock: the shipped glass-library data carries the hold; remove
        # ``disabled`` from its unlock block when the scenario reopens.
        from mythos_runtime.scenario import load_scenario

        unlock = load_scenario("glass-library").unlock
        self.assertTrue((unlock or {}).get("disabled"))
        self.assertFalse(scenario_unlock_met(unlock, [], "p"))


if __name__ == "__main__":
    unittest.main()
