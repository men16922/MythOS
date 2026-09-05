"""Encounter balance invariant (greedy simulation).

QA seed: "각 조우가 불가능(0%)하지도, 솔로 무난(100%)하지도 않은가" — 결정론 봇으로
content/밸런스 회귀를 잡는다. **정밀 난이도 곡선은 사람 feel-QA([manual]) 소관이고**,
이 테스트는 degenerate 한 양 극단(불가능/공짜)만 넉넉한 마진으로 가드한다.

방법: 고정 시드 N회 그리디 시뮬(기본 공격만 — 스킬/지형 미사용 → **보수적 하한**).
- **Winnable**: 대표 파티(player + 핵심 동료 2인, 직접조작=controllable)로 승률 ≥ FLOOR.
- **Non-trivial**: 솔로(player-only) 승률 ≤ CEILING (혼자 공짜로 쓸리지 않음).

리뷰 findings 반영(`scripts/overnight/logs/review-latest.md`): ① 동료는 런타임 `_party.members`
처럼 `controllable=True` 로 빌드(직접조작 파티) ② 100% 천장을 실효화(솔로 CEILING<1.0).

시나리오별 관측 기준선(N=60 고정시드, 기본공격 그리디 = 결정론):
  neo-seoul     full-party(se_rin+kai): 0.93~1.00  / solo: 0.00~0.77  (2026-06-21)
  glass-library full-party(io+miro)   : 0.62~1.00  / solo: 0.02~0.80  (2026-06-21)
공통 밴드 FLOOR=0.50 / CEILING=0.95 — 마진이 크므로 사소한 튜닝엔 안 깨지고,
불가능(파티로도 못 이김)·공짜(솔로 100%) 회귀만 잡는다. 표본 N=60 은 시드가 고정이라
결정론이며, glass-library 최난도(censor_lockdown, 파티 ~0.62) 가 FLOOR 위에 안정적으로
남도록 neo-seoul-only 시절(N=20)에서 키운 값(작은 N 은 표본노이즈로 FLOOR 를 밑돌았다).
"""

from __future__ import annotations

import unittest

from mythos_combat import (
    CombatEngine,
    PlayerAction,
    build_ally_combatant,
    build_encounter,
    build_player_combatant,
)
from mythos_combat.models import Combatant, CombatState, distance
from mythos_runtime.scenario import load_scenario

# 고정 표본 크기와 공통 밴드. 시나리오별 관측 기준선은 모듈 docstring 참조.
_SEEDS = 60
_PARTY_WIN_FLOOR = 0.50  # 대표 파티로도 이 미만이면 = 사실상 불가능(Blocker)
_SOLO_WIN_CEILING = 0.95  # 솔로가 이 초과면 = 공짜 조우(Blocker)

# 대표 플레이어 스탯(시나리오 무관, 평균치). 무기/스킬은 아키타입에서 가져온다.
_PLAYER_STATS = {"strength": 8, "intelligence": 6, "charisma": 5, "agility": 7, "perception": 6}


def _player(combat: dict, archetype: str) -> Combatant:
    return build_player_combatant(
        combatant_id="player",
        name="P",
        stats=_PLAYER_STATS,
        weapon_ids=combat["archetype_loadout"][archetype],
        weapons_pool=combat["weapons"],
        x=0,
        y=0,
        skills=combat["archetype_base_skills"][archetype],
    )


def _ally(combat: dict, ally_id: str) -> Combatant:
    # controllable=True: 런타임 _party.members 와 동일하게 직접조작 파티로 빌드(리뷰 finding).
    return build_ally_combatant(
        entry=combat["allies"][ally_id], weapons_pool=combat["weapons"], x=0, y=0, controllable=True
    )


def _greedy(engine: CombatEngine, state: CombatState) -> PlayerAction:
    """활성 조작 유닛 기준: 가장 가까운 적에게 접근 후 기본 공격(스킬 미사용 = 보수적)."""
    actor = state.active_actor()
    enemies = state.living_enemies()
    if actor is None or not enemies:
        return PlayerAction(type="defend")
    target = min(enemies, key=lambda e: distance(actor.x, actor.y, e.x, e.y))
    actions = engine.available_actions(state)
    best_tile = None
    best_d = distance(actor.x, actor.y, target.x, target.y)
    for tx, ty in actions.get("reachable", []):
        d = distance(tx, ty, target.x, target.y)
        if d < best_d:
            best_d = d
            best_tile = (tx, ty)
    return PlayerAction(type="attack", target_id=target.id, move_to=best_tile)


def _simulate(
    combat: dict, encounter_id: str, ally_ids: tuple[str, ...], archetype: str, seed: str
) -> bool:
    """한 판을 끝까지 돌려 player_victory 면 True. guard 로 무한 루프 방지."""
    engine = CombatEngine()
    allies = [_ally(combat, a) for a in ally_ids]
    state: CombatState = build_encounter(
        combat,
        encounter_id,
        player=_player(combat, archetype),
        allies=allies,
        seed=seed,
        engine=engine,
    )
    guard = 0
    while state.active and guard < 300:
        guard += 1
        actor = state.active_actor()
        if actor is None:
            break
        action = _greedy(engine, state) if actor.is_controllable else PlayerAction(type="defend")
        state = engine.take_player_turn(state, action)
    return bool(state.outcome == "player_victory")


def _win_rate(combat: dict, encounter_id: str, ally_ids: tuple[str, ...], archetype: str) -> float:
    tag = "-".join(ally_ids) or "solo"
    wins = sum(
        _simulate(combat, encounter_id, ally_ids, archetype, f"{encounter_id}:{tag}:{i}")
        for i in range(_SEEDS)
    )
    return wins / _SEEDS


class _EncounterBalanceContract:
    """시나리오별 조우 밸런스 회귀 가드. 구상 클래스는 클래스 속성 3개를 채운다.

    (`unittest.TestCase` 를 직접 상속하지 않아 베이스 자체는 수집되지 않는다.)
    """

    scenario: str  # load_scenario 키
    archetype: str  # 대표 플레이어 아키타입
    representative_party: tuple[str, ...]  # 초반 핵심 동료(직접조작)

    @property
    def _combat(self) -> dict:
        return load_scenario(self.scenario).combat

    def test_every_encounter_is_winnable_with_party(self) -> None:
        """대표 파티(직접조작)로 모든 조우가 합리적으로 이길 수 있어야 한다(불가능 회귀 가드)."""
        combat = self._combat
        offenders = []
        for eid in combat["encounters"]:
            rate = _win_rate(combat, eid, self.representative_party, self.archetype)
            if rate < _PARTY_WIN_FLOOR:
                offenders.append(f"{eid}={rate:.2f}")
        self.assertEqual(  # type: ignore[attr-defined]
            offenders,
            [],
            f"[{self.scenario}] 대표 파티({'+'.join(self.representative_party)})로도 승률 "
            f"< {_PARTY_WIN_FLOOR:.0%} 인 조우(사실상 불가능): {sorted(offenders)}. "
            f"적 스탯/조우 구성 점검 필요.",
        )

    def test_no_encounter_is_a_trivial_solo_walkover(self) -> None:
        """솔로로 거의 항상 이기는 조우는 시시하다(공짜 조우 회귀 가드)."""
        combat = self._combat
        offenders = []
        for eid in combat["encounters"]:
            rate = _win_rate(combat, eid, (), self.archetype)
            if rate > _SOLO_WIN_CEILING:
                offenders.append(f"{eid}={rate:.2f}")
        self.assertEqual(  # type: ignore[attr-defined]
            offenders,
            [],
            f"[{self.scenario}] 솔로 승률 > {_SOLO_WIN_CEILING:.0%} 인 조우(시시함): "
            f"{sorted(offenders)}. 적이 너무 약하지 않은지 점검 필요.",
        )

    def test_simulation_is_deterministic(self) -> None:
        """같은 시드는 같은 결과 — 시뮬이 결정론이라야 밴드가 의미 있다."""
        combat = self._combat
        eid = next(iter(combat["encounters"]))
        a = _simulate(combat, eid, self.representative_party, self.archetype, "determinism-check")
        b = _simulate(combat, eid, self.representative_party, self.archetype, "determinism-check")
        self.assertEqual(a, b)  # type: ignore[attr-defined]


class EncounterBalanceTest(_EncounterBalanceContract, unittest.TestCase):
    scenario = "neo-seoul"
    archetype = "ghost"
    representative_party = ("se_rin", "kai")  # 초반 핵심 동료 2인(직접조작)


class GlassLibraryEncounterBalanceTest(_EncounterBalanceContract, unittest.TestCase):
    scenario = "glass-library"
    archetype = "binder_fugitive"
    representative_party = ("io", "miro")  # 초반 핵심 동료 2인(직접조작)


if __name__ == "__main__":
    unittest.main()
