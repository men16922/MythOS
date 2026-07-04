"""Boss AI invariants — the IX boss must actually use skills and phase-enrage.

These guard the engine-level boss track (separate from the data-only ``ix_confrontation``
balance/reachability guards in ``test_content_integrity``/``test_encounter_balance``):

- enemies with a ``skills`` list cast them (the "skill" combat-log action + pose fire),
- ``administrator_ix`` crosses an enrage threshold at <=50% HP and unlocks its
  ``phase: enraged`` skill,
- boss/enemy skills live in ``combat.enemy_skills`` and never leak into the player
  ``combat.skills`` tree (so no skill-tree / icon-integrity pollution).

Direct, RNG-light unit tests: ``_execute_npc_skill`` logs the activation BEFORE the
attack roll, so asserting the "skill" action is dice-independent.
"""

from __future__ import annotations

import unittest

from mythos_combat import CombatEngine, build_enemy_combatant, build_player_combatant
from mythos_combat.models import ALLY, Combatant, CombatState
from mythos_runtime.scenario import load_scenario


def _combat() -> dict:
    return load_scenario("neo-seoul").combat


def _ix_vs_target(
    hp: int = 38, focus: int = 2
) -> tuple[CombatEngine, CombatState, Combatant, Combatant]:
    combat = _combat()
    engine = CombatEngine()  # loads neo-seoul skills + enemy_skills pools
    ix = build_enemy_combatant(
        entry=combat["bestiary"]["administrator_ix"], weapons_pool=combat["weapons"], x=5, y=3
    )
    ix.hp = hp
    ix.focus = focus
    target = build_player_combatant(
        combatant_id="dummy", name="T", stats={"strength": 5, "agility": 5},
        weapon_ids=[], weapons_pool=combat["weapons"], x=4, y=3,  # adjacent → in skill range
    )
    target.faction = ALLY  # a hostile the boss will target
    target.hp = target.max_hp = 40
    state = CombatState(
        active=True, round=1, arena_w=10, arena_h=7, combatants=[ix, target],
        order=[ix.id, target.id], seed="boss-test",
    )
    return engine, state, ix, target


class BossSkillTest(unittest.TestCase):
    def test_enemy_skill_pools_are_separated(self) -> None:
        combat = _combat()
        enemy_skills = combat.get("enemy_skills", {})
        player_skills = combat.get("skills", {})
        self.assertIn("ix_purge_field", enemy_skills)
        self.assertIn("ix_optimize_overload", enemy_skills)
        # Never in the player tree (else they'd demand icons + pollute the Codex).
        for sid in ("ix_purge_field", "ix_optimize_overload"):
            self.assertNotIn(sid, player_skills, f"{sid} must stay out of combat.skills")

    def test_factory_wires_boss_skills_and_focus(self) -> None:
        _engine, _state, ix, _target = _ix_vs_target()
        self.assertEqual(ix.skills, ["ix_purge_field", "ix_optimize_overload"])
        self.assertGreater(ix.max_focus, 0)

    def test_boss_casts_skill_when_able(self) -> None:
        engine, state, ix, _target = _ix_vs_target(hp=38, focus=2)
        engine._enemy_turn(state, ix)  # boss branch should fire a skill
        skill_logs = [e for e in state.log if e.action == "skill" and e.actor == ix.id]
        self.assertTrue(skill_logs, "boss must cast a skill when in range + affordable")
        self.assertLess(ix.focus, 2, "casting a skill must spend focus")

    def test_boss_prefers_strongest_affordable_skill_when_enraged(self) -> None:
        # HP at threshold + full focus → the enraged-only overload (2d6) should win over purge (1d8).
        engine, state, ix, _target = _ix_vs_target(hp=19, focus=3)
        engine._enemy_turn(state, ix)
        self.assertTrue(ix.enraged, "<=50% HP must set the enrage flag")
        enrage_logs = [e for e in state.log if e.action == "info" and "과부하" in e.text]
        self.assertTrue(enrage_logs, "crossing the threshold must telegraph the enrage")
        cast = [e for e in state.log if e.action == "skill"]
        self.assertTrue(cast)
        self.assertEqual(
            cast[0].detail.get("skill"), "ix_optimize_overload",
            "enraged boss with full focus should pick the strongest (enraged) skill",
        )

    def test_overload_locked_until_enraged(self) -> None:
        # Above the threshold with full focus: the enraged-only skill must NOT be chosen.
        engine, state, ix, _target = _ix_vs_target(hp=38, focus=3)
        engine._enemy_turn(state, ix)
        self.assertFalse(ix.enraged)
        cast = [e for e in state.log if e.action == "skill"]
        self.assertTrue(cast)
        self.assertEqual(cast[0].detail.get("skill"), "ix_purge_field")

    def test_boss_meta_scaling_grows_with_completed_runs(self) -> None:
        # The player gets stronger every completed run (bonds/ranks/equipment),
        # so ``meta_scaling`` grows IX to keep pace: +hp_per_run HP per run and
        # +stats once every stat_every_runs runs, capped at cap_runs.
        # runs_completed=0 (first loop, all legacy callers) is a strict no-op.
        from mythos_combat import build_encounter

        combat = _combat()

        def _ix(runs: int):
            player = build_player_combatant(
                combatant_id="player", name="P", stats={"strength": 5, "agility": 5},
                weapon_ids=[], weapons_pool=combat["weapons"], x=0, y=0,
            )
            state = build_encounter(
                combat, "ix_confrontation", player=player, allies=[],
                seed="meta-scale", runs_completed=runs,
            )
            return next(e for e in state.living_enemies() if "administrator_ix" in e.id)

        base = _ix(0)
        grown = _ix(4)
        capped = _ix(99)
        self.assertEqual(grown.max_hp, base.max_hp + 3 * 4)
        self.assertEqual(grown.stats.get("strength", 0), base.stats.get("strength", 0) + 2)
        # cap_runs=6 bounds the growth no matter how many loops accrued.
        self.assertEqual(capped.max_hp, base.max_hp + 3 * 6)

    def test_boss_escorts_scale_to_party_size(self) -> None:
        # Fairness (live 2026-07-03): a fixed IX + 2-escort roster is ~8% winnable
        # with only Se-rin. Escort waves now drop out for a small party via
        # ``min_party`` so the climax stays tense-but-fair regardless of recruits.
        from mythos_combat import build_encounter

        combat = _combat()

        def _enemy_count(n_allies: int) -> int:
            player = build_player_combatant(
                combatant_id="player", name="P", stats={"strength": 5, "agility": 5},
                weapon_ids=[], weapons_pool=combat["weapons"], x=0, y=0,
            )
            allies = []
            for i in range(n_allies):
                a = build_player_combatant(
                    combatant_id=f"ally{i}", name=f"A{i}", stats={"strength": 5, "agility": 5},
                    weapon_ids=[], weapons_pool=combat["weapons"], x=0, y=0,
                )
                a.faction = ALLY
                allies.append(a)
            state = build_encounter(
                combat, "ix_confrontation", player=player, allies=allies, seed="scale-test",
            )
            return len(state.living_enemies())

        # solo (party 1) → IX only; +1 ally → +sentinel; full (party 4) → +purge.
        self.assertEqual(_enemy_count(0), 1)
        self.assertEqual(_enemy_count(1), 2)
        self.assertEqual(_enemy_count(2), 2)
        self.assertEqual(_enemy_count(3), 3)


if __name__ == "__main__":
    unittest.main()
