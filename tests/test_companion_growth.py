"""Companion growth: bond tiers + achievement kit upgrades + party boons.

Allies were fixed scenario kits (the only cross-loop change was WHO you could
recruit); these lock the three growth channels that now fold into each ally's
combat build — and that their absence preserves exact prior behavior.
"""

from __future__ import annotations

import unittest

from mythos_combat.models import ALLY
from mythos_core import LoopPhase, LoopState
from mythos_core.clock import utc_now
from mythos_runtime.boons import boon_stat_bonus, party_boon_bonus
from mythos_runtime.combat_service import CombatService
from mythos_runtime.companion_growth import (
    BOND_HP_PER_TIER,
    bond_tier,
    growth_bonus,
)
from mythos_runtime.scenario import load_scenario

POOL = load_scenario("neo-seoul").combat


def _scenario_ids() -> list[str]:
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "resources"
    return sorted(p.parent.name for p in root.glob("*/scenario.json"))


def _loop(state: dict | None = None) -> LoopState:
    return LoopState(
        loop_id="loop_growth",
        player_id="p1",
        seed="growth-seed",
        phase=LoopPhase.EXPLORE,
        location_id="loc",
        stability=70,
        tension=20,
        started_at=utc_now(),
        state=state or {},
    )


class CompanionGrowthUnitTest(unittest.TestCase):
    def test_bond_tier_math(self) -> None:
        self.assertEqual(bond_tier(None), 0)
        self.assertEqual(bond_tier(-3), 0)
        self.assertEqual(bond_tier(1), 0)
        self.assertEqual(bond_tier(2), 1)
        self.assertEqual(bond_tier(4), 2)
        self.assertEqual(bond_tier(99), 3)  # capped at BOND_TIER_MAX

    def test_growth_bonus_composes_all_three_channels(self) -> None:
        entry = {
            "id": "se_rin",
            "upgrades": [
                {
                    "id": "up1",
                    "requires": {"total_combats_won": 4},
                    "skills": ["glitch_blink"],
                    "stats": {"agility": 1},
                }
            ],
        }
        growth = growth_bonus(
            entry=entry,
            affection=4,  # tier 2
            meta_progression={"total_combats_won": 5},
            run_boons=["guardian_protocol", "squad_sync"],
        )
        self.assertEqual(growth.bond_tier, 2)
        self.assertEqual(growth.upgrade_ids, ["up1"])
        self.assertEqual(growth.skills, ["glitch_blink"])
        # hp: bond 2 tiers + guardian_protocol party boon
        self.assertEqual(growth.hp, BOND_HP_PER_TIER * 2 + 4)
        # stats: bond (str+2, per+2) + upgrade (agi+1) + squad_sync (str+1, per+1)
        self.assertEqual(growth.stats, {"strength": 3, "perception": 3, "agility": 1})

    def test_growth_bonus_is_noop_without_inputs(self) -> None:
        growth = growth_bonus(entry={"id": "x"})
        self.assertEqual(growth.stats, {})
        self.assertEqual(growth.hp, 0)
        self.assertEqual(growth.skills, [])

    def test_upgrade_locked_below_threshold(self) -> None:
        entry = {"upgrades": [{"id": "up1", "requires": {"total_combats_won": 6}}]}
        growth = growth_bonus(entry=entry, meta_progression={"total_combats_won": 5})
        self.assertEqual(growth.upgrade_ids, [])

    def test_party_boons_excluded_from_player_bonus(self) -> None:
        # target="party" boons must buff allies only — the player stat channel
        # (and its synergy tag counts) ignores them entirely.
        run = ["guardian_protocol", "squad_sync", "link_overdrive"]
        self.assertEqual(boon_stat_bonus(run), {})
        stats, hp = party_boon_bonus(run)
        self.assertEqual(hp, 4)
        self.assertEqual(
            stats, {"strength": 1, "perception": 1, "agility": 1, "intelligence": 1}
        )


class CompanionGrowthServiceTest(unittest.TestCase):
    """End-to-end through CombatService.begin: growth folds into the built ally."""

    def _se_rin(self, state: dict):
        service = CombatService()
        result = service.begin(
            _loop(state),
            scenario_combat=POOL,
            encounter_id="patrol_ambush",
            player_name="당신",
            player_stats={"strength": 9, "agility": 8, "perception": 6},
            archetype="ghost",
        )
        combat_state = CombatService.load_state(result.loop)
        assert combat_state is not None
        ally = next(c for c in combat_state.combatants if c.faction == ALLY and c.id == "se_rin")
        return ally

    def test_baseline_ally_is_unchanged_without_growth_state(self) -> None:
        ally = self._se_rin({"flags": ["met_se_rin"]})
        self.assertEqual(ally.max_hp, 14)
        self.assertEqual(ally.stats["strength"], 4)
        self.assertEqual(ally.skills, ["covering_noise", "packet_shot"])

    def test_bond_tier_raises_hp_and_stats(self) -> None:
        ally = self._se_rin({"flags": ["met_se_rin"], "relationships": {"se_rin": 4}})
        self.assertEqual(ally.max_hp, 14 + BOND_HP_PER_TIER * 2)
        self.assertEqual(ally.stats["strength"], 4 + 2)
        self.assertEqual(ally.stats["perception"], 7 + 2)

    def test_achievement_upgrade_adds_skill_and_stats(self) -> None:
        ally = self._se_rin(
            {"flags": ["met_se_rin"], "meta_progression": {"total_combats_won": 4}}
        )
        self.assertIn("glitch_blink", ally.skills)
        self.assertEqual(ally.stats["agility"], 7 + 1)

    def test_party_boon_buffs_ally(self) -> None:
        ally = self._se_rin({"flags": ["met_se_rin"], "_run_boons": ["guardian_protocol"]})
        self.assertEqual(ally.max_hp, 14 + 4)


class CompanionRosterTest(unittest.TestCase):
    """CHARACTER-tab roster (snapshot ``companions``): met-only, growth-folded."""

    def test_roster_includes_met_companion_with_growth_sheet(self) -> None:
        from mythos_api.serializers import _companion_roster

        state = {
            "scenario_id": "neo-seoul",
            "flags": ["met_se_rin"],
            "relationships": {"se_rin": 4},
            "_run_boons": ["guardian_protocol"],
            "meta_progression": {"total_combats_won": 4},
            "_party": {"members": [{"id": "se_rin", "hp": 9}]},
        }
        roster = _companion_roster(state)
        se_rin = next(c for c in roster if c["id"] == "se_rin")
        self.assertEqual(se_rin["bond_tier"], 2)
        # 14 kit + bond 2 tiers * 2 + guardian_protocol party boon 4
        self.assertEqual(se_rin["max_hp"], 14 + 4 + 4)
        self.assertEqual(se_rin["hp"], 9)  # carried in-loop HP, not reset
        self.assertTrue(se_rin["in_party"])
        self.assertIn("glitch_blink", [s["id"] for s in se_rin["skills"]])
        self.assertEqual(se_rin["upgrades"][0]["id"], "se_rin_practiced_maneuvers")
        self.assertEqual(se_rin["stat_bonus"]["strength"], 2)  # bond only; boon hp is flat

    def test_roster_excludes_unmet_companions(self) -> None:
        from mythos_api.serializers import _companion_roster

        roster = _companion_roster({"scenario_id": "neo-seoul", "flags": []})
        self.assertEqual(roster, [])


class UpgradeIntegrityTest(unittest.TestCase):
    def test_upgrade_skills_exist_in_scenario_pool(self) -> None:
        # Content invariant: every authored ally upgrade must reference real
        # skills and carry a numeric requires gate (typos would silently no-op).
        for scenario_id in _scenario_ids():
            combat = load_scenario(scenario_id).combat
            skill_pool = set((combat.get("skills") or {}).keys())
            for ally_id, entry in (combat.get("allies") or {}).items():
                for upgrade in entry.get("upgrades", []):
                    with self.subTest(scenario=scenario_id, ally=ally_id):
                        self.assertTrue(upgrade.get("id"))
                        requires = upgrade.get("requires")
                        self.assertIsInstance(requires, dict)
                        self.assertTrue(requires)
                        for value in requires.values():
                            self.assertIsInstance(value, int)
                        for skill_id in upgrade.get("skills", []):
                            self.assertIn(skill_id, skill_pool)


if __name__ == "__main__":
    unittest.main()
