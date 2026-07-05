"""E2 IX 보스 전용 스킬 (CBT 피드백 #2: 보스가 일반 적 스탯 강화판).

- 최적화 프로토콜: 표적 주변 자유 타일을 전기장 해저드로 봉쇄.
- 명단 소거 (enraged 페이즈 전용): 최저 HP 대상 구역 예고 → 다음 보스 턴에
  표시 타일 타격 — 이동으로 회피 가능(텔레그래프), 빈 타일이면 회피 로그.
- 텔레그래프가 pending인 동안 재예고 금지; 레이더에 표시 타일 직렬화.
"""

from __future__ import annotations

import unittest

from mythos_combat import CombatEngine, build_player_combatant, render_radar
from mythos_combat.models import Combatant
from mythos_runtime.scenario import load_scenario

COMBAT = load_scenario("neo-seoul").combat
ENEMY_SKILLS = COMBAT["enemy_skills"]
WEAPONS = COMBAT["weapons"]


def _player(x: int = 0, y: int = 0, hp: int = 30):
    player = build_player_combatant(
        combatant_id="player",
        name="당신",
        stats={"strength": 8, "agility": 6, "perception": 6},
        weapon_ids=["vibro_blade"],
        weapons_pool=WEAPONS,
        x=x,
        y=y,
    )
    player.hp = player.max_hp = hp
    return player


def _ix(x: int = 6, y: int = 0, *, enraged: bool = False, hp: int = 38):
    boss = Combatant(
        id="ix",
        name="관리자 IX",
        faction="enemy",
        hp=hp,
        max_hp=38,
        x=x,
        y=y,
        defense=12,
        speed=3,
        ai="boss",
        focus=6,
        max_focus=6,
        skills=["ix_optimization_protocol", "ix_purge_list"],
        enraged=enraged,
    )
    return boss


class BossDataIntegrityTest(unittest.TestCase):
    def test_ix_bestiary_lists_exclusive_skills(self) -> None:
        bestiary = COMBAT["bestiary"]["administrator_ix"]
        self.assertIn("ix_optimization_protocol", bestiary["skills"])
        self.assertIn("ix_purge_list", bestiary["skills"])
        self.assertEqual(ENEMY_SKILLS["ix_purge_list"].get("phase"), "enraged")

    def test_exclusive_skills_stay_out_of_player_pool(self) -> None:
        self.assertNotIn("ix_optimization_protocol", COMBAT["skills"])
        self.assertNotIn("ix_purge_list", COMBAT["skills"])


class OptimizationProtocolTest(unittest.TestCase):
    def test_seals_tiles_around_target_as_hazards(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player(0, 0)], [], seed="seal", arena=(8, 6))
        state.combatants.append(_ix(5, 0))
        boss = state.by_id("ix")
        player = state.player()
        assert boss is not None and player is not None
        before = len(state.hazards)
        engine._execute_npc_skill(
            state, boss, "ix_optimization_protocol",
            ENEMY_SKILLS["ix_optimization_protocol"], player,
        )
        self.assertEqual(len(state.hazards) - before, 3)
        self.assertTrue(all(v == "electro" for v in state.hazards.values()))
        # 표적이 서 있는 칸 자체는 봉쇄하지 않는다.
        self.assertNotIn(f"{player.x},{player.y}", state.hazards)


class PurgeListTelegraphTest(unittest.TestCase):
    def _setup(self):
        engine = CombatEngine()
        state = engine.start([_player(0, 0, hp=30)], [], seed="tg", arena=(10, 6))
        boss = _ix(6, 0, enraged=True)
        state.combatants.append(boss)
        return engine, state, boss

    def test_announce_marks_tiles_and_radar_serializes(self) -> None:
        engine, state, boss = self._setup()
        engine._execute_npc_skill(
            state, boss, "ix_purge_list", ENEMY_SKILLS["ix_purge_list"], state.player()
        )
        self.assertEqual(len(state.telegraphs), 1)
        tiles = state.telegraphs[0]["tiles"]
        self.assertIn([0, 0], tiles)  # 최저 HP(유일) 대상 위치 포함
        radar = render_radar(state)
        self.assertEqual(radar["telegraphs"][0]["tiles"], tiles)

    def test_strike_hits_if_standing_and_misses_if_dodged(self) -> None:
        engine, state, boss = self._setup()
        player = state.player()
        assert player is not None
        engine._execute_npc_skill(
            state, boss, "ix_purge_list", ENEMY_SKILLS["ix_purge_list"], player
        )
        # 회피하지 않고 그 자리에 서 있으면 다음 보스 턴에 피해.
        hp_before = player.hp
        engine._resolve_telegraphs(state, boss)
        self.assertLess(player.hp, hp_before)
        self.assertEqual(state.telegraphs, [])

        # 다시 예고 → 표시 구역 밖으로 이동하면 회피.
        engine._execute_npc_skill(
            state, boss, "ix_purge_list", ENEMY_SKILLS["ix_purge_list"], player
        )
        player.x, player.y = 4, 4  # 반경 1 밖
        hp_before = player.hp
        engine._resolve_telegraphs(state, boss)
        self.assertEqual(player.hp, hp_before)
        self.assertTrue(any(e.detail.get("telegraph_evaded") for e in state.log))

    def test_pending_telegraph_never_stacks(self) -> None:
        engine, state, boss = self._setup()
        player = state.player()
        assert player is not None
        engine._execute_npc_skill(
            state, boss, "ix_purge_list", ENEMY_SKILLS["ix_purge_list"], player
        )
        # 보스 턴이 몇 번을 돌아도: 턴 시작에 기존 예고가 먼저 해소되고, 후보
        # 필터가 pending 중 재예고를 막으므로 동시에 예고는 최대 1개다.
        for _ in range(3):
            boss.cooldowns.clear()
            engine._boss_skill_turn(state, boss, player)
            self.assertLessEqual(len(state.telegraphs), 1)
        # 첫 예고는 실제로 해소되었다 (타격 또는 회피 로그 존재).
        self.assertTrue(
            any(
                e.detail.get("telegraph") is True or e.detail.get("telegraph_evaded")
                for e in state.log
            )
        )


if __name__ == "__main__":
    unittest.main()
