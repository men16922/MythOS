"""E1 동료 시그니처 스킬 (CBT 피드백 #2: 공용 풀이라 전투에서 개성이 안 읽힘).

- 데이터 무결성: allies[*].signature가 companion_skills 풀에 존재, 필수 필드 보유.
- 효과 수치 잠금: 차폐 필드(반경 아군 방어+2) · 정밀 EMP(⚡감전 2턴 — su_ah 스턴화로 시그니처가
  겹쳐져 2026-07-12 분리) · 시스템 해킹(1턴 스턴; 구 집중 드레인은
  집중 0 적에게 "-0" 무효과라 2026-07-12 오너 지시로 교체) ·
  지름길 호출(파티 이동+2) · 수호 방벽(도발+방어) · 백도어 루트(아군 재배치).
- AI 아군이 시그니처를 상황에 맞게 자동 발동; 컨트롤러블 동료 액션 바에도 노출.
"""

from __future__ import annotations

import unittest

from mythos_combat import CombatEngine, build_ally_combatant, build_player_combatant
from mythos_combat.models import distance
from mythos_runtime.scenario import load_scenario

COMBAT = load_scenario("neo-seoul").combat
SIGS = COMBAT["companion_skills"]
WEAPONS = COMBAT["weapons"]


def _player(x: int = 0, y: int = 0):
    return build_player_combatant(
        combatant_id="player",
        name="당신",
        stats={"strength": 8, "agility": 6, "perception": 6},
        weapon_ids=["vibro_blade"],
        weapons_pool=WEAPONS,
        x=x,
        y=y,
    )


def _ally(ally_id: str, x: int, y: int, *, hp: int | None = None):
    entry = dict(COMBAT["allies"][ally_id])
    signature = str(entry.get("signature"))
    return build_ally_combatant(
        entry=entry,
        weapons_pool=WEAPONS,
        x=x,
        y=y,
        hp=hp,
        extra_skills=[signature],
    )


def _enemy_entry(x: int, y: int, *, hp: int = 30, focus: int = 4):
    from mythos_combat.models import Combatant

    enemy = Combatant(
        id="foe",
        name="드론",
        faction="enemy",
        hp=hp,
        max_hp=hp,
        x=x,
        y=y,
        defense=10,
        speed=3,
        focus=focus,
        max_focus=max(4, focus),
    )
    return enemy


class SignatureDataIntegrityTest(unittest.TestCase):
    def test_every_ally_signature_resolves(self) -> None:
        for ally_id, entry in COMBAT["allies"].items():
            signature = entry.get("signature")
            self.assertTrue(signature, f"{ally_id} has no signature")
            sdef = SIGS.get(signature)
            self.assertIsNotNone(sdef, f"{ally_id} signature {signature} missing from pool")
            assert sdef is not None
            for field in ("name", "role", "cost", "cooldown", "effect"):
                self.assertIn(field, sdef, f"{signature} missing {field}")

    def test_signatures_stay_out_of_player_pool(self) -> None:
        for sid in SIGS:
            self.assertNotIn(sid, COMBAT["skills"], f"{sid} leaked into the player skill tree")


class SignatureEffectTest(unittest.TestCase):
    def _engine_state(self, allies, enemies, seed="sig"):
        engine = CombatEngine()
        state = engine.start([_player()], enemies, seed=seed, arena=(10, 6))
        for ally in allies:
            state.combatants.append(ally)
        return engine, state

    def test_shield_field_buffs_all_adjacent_friendlies(self) -> None:
        engine, state = self._engine_state([_ally("se_rin", 1, 0)], [_enemy_entry(6, 0)])
        se_rin = state.by_id("se_rin")
        assert se_rin is not None
        engine._execute_npc_skill(state, se_rin, "shield_field", SIGS["shield_field"])
        player = state.player()
        assert player is not None
        self.assertEqual(player.defense_buff, 2)  # 인접 아군
        self.assertEqual(se_rin.defense_buff, 2)  # 시전자 자신 포함

    def test_precision_emp_applies_shock(self) -> None:
        # 2026-07-12 owner call: system_hack's stun rework made su_ah and
        # lin_yue functionally identical — 정밀 EMP now applies ⚡감전 (2T of no
        # focus regen + frozen cooldowns) instead of a stun.
        engine, state = self._engine_state([_ally("lin_yue", 1, 0)], [_enemy_entry(4, 0)])
        lin = state.by_id("lin_yue")
        foe = state.by_id("foe")
        assert lin is not None and foe is not None
        engine._execute_npc_skill(state, lin, "precision_emp", SIGS["precision_emp"], foe)
        self.assertEqual(foe.stunned_turns, 0)
        self.assertEqual(foe.status_effects.get("shock"), 2)
        self.assertIn("shock", foe.status)

    def test_system_hack_stuns_target(self) -> None:
        # 2026-07-12 owner call: focus_drain was an invisible no-op vs 0-focus
        # enemies ("집중 -0") — system_hack now hard-stuns for 1 turn instead.
        engine, state = self._engine_state([_ally("su_ah", 1, 0)], [_enemy_entry(4, 0, focus=4)])
        su_ah = state.by_id("su_ah")
        foe = state.by_id("foe")
        assert su_ah is not None and foe is not None
        engine._execute_npc_skill(state, su_ah, "system_hack", SIGS["system_hack"], foe)
        self.assertEqual(foe.stunned_turns, 1)
        self.assertIn("stunned", foe.status)

    def test_shortcut_call_buffs_party_speed(self) -> None:
        engine, state = self._engine_state([_ally("han", 1, 0)], [_enemy_entry(6, 0)])
        han = state.by_id("han")
        assert han is not None
        engine._execute_npc_skill(state, han, "shortcut_call", SIGS["shortcut_call"])
        player = state.player()
        assert player is not None
        self.assertEqual(player.speed_buff, 2)
        self.assertEqual(player.effective_speed, player.speed + 2)

    def test_guardian_wall_taunts_enemy_targeting(self) -> None:
        engine, state = self._engine_state(
            [_ally("tae_o", 1, 1)], [_enemy_entry(3, 0, hp=40)]
        )
        tae_o = state.by_id("tae_o")
        foe = state.by_id("foe")
        assert tae_o is not None and foe is not None
        engine._execute_npc_skill(state, tae_o, "guardian_wall", SIGS["guardian_wall"])
        self.assertGreater(tae_o.taunt_turns, 0)
        self.assertIn("taunting", tae_o.status)
        self.assertEqual(tae_o.defense_buff, 2)
        # 도발 중에는 적이 태오를 표적으로 잡는다 (더 가까운 플레이어 무시).
        engine._enemy_turn(state, foe)
        hits = [e for e in state.log if e.action in ("hit", "miss") and e.actor == "foe"]
        if hits:
            self.assertEqual(hits[-1].detail.get("target"), "tae_o")

    def test_backdoor_route_relocates_endangered_ally(self) -> None:
        engine, state = self._engine_state(
            [_ally("kai", 0, 1), _ally("se_rin", 5, 0, hp=5)], [_enemy_entry(6, 0)]
        )
        kai = state.by_id("kai")
        se_rin = state.by_id("se_rin")
        foe = state.by_id("foe")
        assert kai is not None and se_rin is not None and foe is not None
        before = distance(se_rin.x, se_rin.y, foe.x, foe.y)
        engine._execute_npc_skill(state, kai, "backdoor_route", SIGS["backdoor_route"])
        after = distance(se_rin.x, se_rin.y, foe.x, foe.y)
        self.assertGreater(after, before, "endangered ally was not moved to safety")


class SignatureAiAndBarTest(unittest.TestCase):
    def test_ai_ally_autocasts_status_signature(self) -> None:
        # AI lin_yue reads the `applies` shape and fires 정밀 EMP when the
        # victim lacks the status it would apply.
        engine = CombatEngine()
        state = engine.start([_player()], [_enemy_entry(4, 0)], seed="ai-sig", arena=(10, 6))
        lin = _ally("lin_yue", 1, 0)
        state.combatants.append(lin)
        engine._ally_turn(state, lin)
        foe = state.by_id("foe")
        assert foe is not None
        self.assertIn("shock", foe.status_effects)

    def test_controllable_companion_sees_signature_on_action_bar(self) -> None:
        engine = CombatEngine()
        state = engine.start([_player()], [_enemy_entry(4, 0)], seed="bar-sig", arena=(10, 6))
        tae_o = _ally("tae_o", 1, 0)
        tae_o.controllable = True
        state.combatants.append(tae_o)
        state.order.append(tae_o.id)
        state.turn_ptr = state.order.index(tae_o.id)
        actions = engine.available_actions(state)
        skills = {s["id"]: s for s in actions["skills"]}
        self.assertIn("guardian_wall", skills)
        self.assertEqual(skills["guardian_wall"]["name"], "수호 방벽")
        self.assertTrue(skills["guardian_wall"]["effect"].get("taunt"))


if __name__ == "__main__":
    unittest.main()
