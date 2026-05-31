from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from mythos_core.dice import Dice

from .models import (
    ALLY,
    ENEMY,
    Combatant,
    CombatLogEntry,
    CombatState,
    Weapon,
    distance,
)

_NEIGHBORS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


@dataclass
class PlayerAction:
    type: str = "wait"  # attack|defend|flee|wait|item
    target_id: str | None = None
    weapon_id: str | None = None
    move_to: tuple[int, int] | None = None
    item_id: str | None = None


class CombatEngine:
    """Turn-based tactical resolver. Pure + deterministic given the seed."""

    def start(
        self,
        party: list[Combatant],
        enemies: list[Combatant],
        *,
        seed: str,
        arena: tuple[int, int] = (8, 6),
        encounter_id: str | None = None,
    ) -> CombatState:
        state = CombatState(
            active=True,
            round=1,
            arena_w=arena[0],
            arena_h=arena[1],
            combatants=[*party, *enemies],
            seed=seed,
            encounter_id=encounter_id,
        )
        roll = self._dice(state)
        for combatant in state.combatants:
            combatant.initiative = roll.d20() + combatant.stat("agility")
        state.order = [c.id for c in sorted(state.combatants, key=lambda c: (-c.initiative, c.id))]
        state.log.append(
            CombatLogEntry(
                round=1,
                actor="system",
                actor_name="SYSTEM",
                action="start",
                text="전투 개시.",
                detail={"order": list(state.order)},
            )
        )
        self._run_opening(state)
        return state

    def take_player_turn(self, state: CombatState, action: PlayerAction) -> CombatState:
        if not state.active:
            return state
        player = state.player()
        if player is None or not player.alive:
            return state

        dice = self._dice(state)
        if action.move_to is not None:
            self._move_player(state, player, action.move_to)

        if action.type == "attack":
            self._player_attack(state, player, action, dice)
        elif action.type == "defend":
            player.defending = True
            self._log(state, player, "defend", f"{player.name}이(가) 방어 태세를 취한다.")
        elif action.type == "flee":
            self._player_flee(state, player, dice)
        elif action.type == "item":
            self._log(state, player, "info", f"{player.name}은(는) 잠시 호흡을 고른다.")
        else:
            self._log(state, player, "info", f"{player.name}은(는) 상황을 살핀다.")

        self._check_outcome(state)
        if not state.active or state.outcome == "player_fled":
            return self._finish(state)

        self._run_until_player(state)
        if not state.active:
            return self._finish(state)
        return state

    def available_actions(self, state: CombatState) -> dict[str, Any]:
        player = state.player()
        if player is None or not player.alive or not state.active:
            return {"can_act": False, "targets": [], "reachable": []}
        targets: list[dict[str, Any]] = []
        for enemy in state.living_enemies():
            targets.append(
                {
                    "id": enemy.id,
                    "name": enemy.name,
                    "distance": distance(player.x, player.y, enemy.x, enemy.y),
                    "in_range": self._weapon_in_range(player, enemy, player.primary_weapon()),
                    "hp": enemy.hp,
                    "max_hp": enemy.max_hp,
                }
            )
        return {
            "can_act": True,
            "move_range": player.speed,
            "reachable": self._reachable_tiles(state, player),
            "targets": targets,
            "weapons": [w.id for w in player.weapons],
        }

    # --- dice & logging -------------------------------------------------
    def _dice(self, state: CombatState) -> Dice:
        dice = Dice(f"{state.seed}:{state.rng_cursor}")
        state.rng_cursor += 1
        return dice

    def _log(
        self,
        state: CombatState,
        actor: Combatant | None,
        action: str,
        text: str,
        detail: dict[str, Any] | None = None,
    ) -> None:
        state.log.append(
            CombatLogEntry(
                round=state.round,
                actor=actor.id if actor else "system",
                actor_name=actor.name if actor else "SYSTEM",
                action=action,
                text=text,
                detail=detail or {},
            )
        )

    # --- resolution -----------------------------------------------------
    def _player_attack(
        self, state: CombatState, player: Combatant, action: PlayerAction, dice: Dice
    ) -> None:
        target = state.by_id(action.target_id)
        if target is None or not target.alive:
            self._log(state, player, "info", f"{player.name}의 표적이 사라졌다.")
            return
        weapon = self._select_weapon(player, action.weapon_id)
        if weapon is None:
            self._log(state, player, "info", f"{player.name}에게 무기가 없다.")
            return
        if not self._weapon_in_range(player, target, weapon):
            self._log(
                state,
                player,
                "info",
                f"{target.name}은(는) {weapon.name}의 사거리 밖에 있다.",
                {"distance": distance(player.x, player.y, target.x, target.y)},
            )
            return
        self._attack(state, player, target, weapon, dice)

    def _attack(
        self,
        state: CombatState,
        attacker: Combatant,
        defender: Combatant,
        weapon: Weapon,
        dice: Dice,
    ) -> None:
        melee = not weapon.is_ranged
        stat = attacker.stat("strength") if melee else attacker.stat("agility")
        roll = dice.d20()
        total = roll + stat + weapon.to_hit_bonus
        crit = roll == 20
        dc = defender.effective_defense
        if not crit and total < dc:
            self._log(
                state,
                attacker,
                "miss",
                f"{attacker.name}의 {weapon.name} 공격이 {defender.name}을(를) 빗나갔다.",
                {"roll": roll, "total": total, "dc": dc, "target": defender.id},
            )
            return
        damage = dice.roll(weapon.damage) + (stat // 2 if melee else stat // 3)
        damage = max(1, damage - max(0, defender.armor - weapon.armor_pen))
        if crit:
            damage *= 2
        defender.hp = max(0, defender.hp - damage)
        detail = {
            "roll": roll,
            "total": total,
            "dc": dc,
            "damage": damage,
            "crit": crit,
            "target": defender.id,
            "target_hp": defender.hp,
            "target_max_hp": defender.max_hp,
        }
        if defender.hp <= 0:
            defender.alive = False
            self._log(
                state,
                attacker,
                "defeat",
                f"{attacker.name}이(가) {defender.name}을(를) 쓰러뜨렸다! ({damage} 피해)",
                detail,
            )
        else:
            tag = "치명타! " if crit else ""
            self._log(
                state,
                attacker,
                "hit",
                f"{tag}{attacker.name}의 {weapon.name}이(가) {defender.name}에게 {damage} 피해.",
                detail,
            )

    def _player_flee(self, state: CombatState, player: Combatant, dice: Dice) -> None:
        adjacent = [e for e in state.living_enemies() if distance(player.x, player.y, e.x, e.y) <= 1]
        dc = 12 + 2 * len(adjacent)
        total = dice.d20() + player.stat("agility")
        if total >= dc:
            state.outcome = "player_fled"
            state.active = False
            self._log(state, player, "flee", f"{player.name}이(가) 전장을 이탈했다.", {"dc": dc, "total": total})
        else:
            self._log(
                state, player, "info", f"{player.name}이(가) 이탈에 실패했다. 적이 길을 막는다.", {"dc": dc, "total": total}
            )

    # --- enemy / ally AI ------------------------------------------------
    def _run_opening(self, state: CombatState) -> None:
        player = state.player()
        if player is None:
            return
        player_idx = state.order.index(player.id)
        for i in range(player_idx):
            actor = state.by_id(state.order[i])
            if actor and actor.alive and not actor.is_player:
                self._npc_turn(state, actor)
                self._check_outcome(state)
                if not state.active:
                    return
        state.turn_ptr = player_idx

    def _run_until_player(self, state: CombatState) -> None:
        player = state.player()
        if player is None:
            return
        n = len(state.order)
        player_idx = state.order.index(player.id)
        i = (player_idx + 1) % n
        guard = 0
        while guard < n * 3:
            guard += 1
            if i == player_idx:
                state.round += 1
                player.defending = False
                state.turn_ptr = player_idx
                return
            actor = state.by_id(state.order[i])
            if actor and actor.alive and not actor.is_player:
                self._npc_turn(state, actor)
                self._check_outcome(state)
                if not state.active:
                    return
            i = (i + 1) % n

    def _npc_turn(self, state: CombatState, actor: Combatant) -> None:
        if actor.faction == ENEMY:
            self._enemy_turn(state, actor)
        elif actor.faction == ALLY:
            self._ally_turn(state, actor)

    def _enemy_turn(self, state: CombatState, enemy: Combatant) -> None:
        dice = self._dice(state)
        targets = state.hostiles_of(enemy)
        if not targets:
            return
        target = min(targets, key=lambda t: (distance(enemy.x, enemy.y, t.x, t.y), t.hp))
        weapon = enemy.primary_weapon()
        reach = weapon.effective_range if weapon else 1

        if enemy.ai == "coward" and enemy.hp <= max(1, int(enemy.max_hp * 0.3)):
            self._move_to_band(state, enemy, target, desired=max(reach + 3, 6))
            self._log(state, enemy, "flee", f"{enemy.name}이(가) 겁에 질려 물러난다.")
            return

        self._move_to_band(state, enemy, target, desired=max(1, reach))
        if weapon and self._weapon_in_range(enemy, target, weapon):
            self._attack(state, enemy, target, weapon, dice)

    def _ally_turn(self, state: CombatState, ally: Combatant) -> None:
        dice = self._dice(state)
        enemies = state.living_enemies()
        if not enemies:
            return
        target = min(enemies, key=lambda t: (distance(ally.x, ally.y, t.x, t.y), t.hp))
        weapon = ally.primary_weapon()
        reach = weapon.effective_range if weapon else 1
        self._move_to_band(state, ally, target, desired=reach)
        if weapon and self._weapon_in_range(ally, target, weapon):
            self._attack(state, ally, target, weapon, dice)

    # --- movement -------------------------------------------------------
    def _move_player(self, state: CombatState, player: Combatant, dest: tuple[int, int]) -> None:
        dx, dy = dest
        if not self._in_bounds(state, dx, dy) or self._occupied(state, dx, dy, player):
            return
        if distance(player.x, player.y, dx, dy) > player.speed:
            return
        old = (player.x, player.y)
        player.x, player.y = dx, dy
        if old != (player.x, player.y):
            self._log(
                state,
                player,
                "move",
                f"{player.name}이(가) ({player.x}, {player.y})로 이동한다.",
                {"from": list(old), "to": [player.x, player.y]},
            )

    def _move_to_band(
        self, state: CombatState, mover: Combatant, target: Combatant, *, desired: int
    ) -> None:
        budget = mover.speed
        moved = False
        while budget > 0:
            current = distance(mover.x, mover.y, target.x, target.y)
            if current == desired:
                break
            best: tuple[int, int] | None = None
            best_metric = abs(current - desired)
            for ox, oy in _NEIGHBORS:
                nx, ny = mover.x + ox, mover.y + oy
                if not self._in_bounds(state, nx, ny) or self._occupied(state, nx, ny, mover):
                    continue
                metric = abs(distance(nx, ny, target.x, target.y) - desired)
                if metric < best_metric:
                    best_metric = metric
                    best = (nx, ny)
            if best is None:
                break
            mover.x, mover.y = best
            moved = True
            budget -= 1
        if moved:
            self._log(
                state,
                mover,
                "move",
                f"{mover.name}이(가) ({mover.x}, {mover.y})로 움직인다.",
                {"to": [mover.x, mover.y]},
            )

    def _reachable_tiles(self, state: CombatState, mover: Combatant) -> list[list[int]]:
        tiles: list[list[int]] = []
        for ny in range(state.arena_h):
            for nx in range(state.arena_w):
                if nx == mover.x and ny == mover.y:
                    continue
                if distance(mover.x, mover.y, nx, ny) > mover.speed:
                    continue
                if self._occupied(state, nx, ny, mover):
                    continue
                tiles.append([nx, ny])
        return tiles

    # --- predicates & lifecycle -----------------------------------------
    def _in_bounds(self, state: CombatState, x: int, y: int) -> bool:
        return 0 <= x < state.arena_w and 0 <= y < state.arena_h

    def _occupied(self, state: CombatState, x: int, y: int, mover: Combatant) -> bool:
        return any(c.alive and c.id != mover.id and c.x == x and c.y == y for c in state.combatants)

    def _weapon_in_range(
        self, attacker: Combatant, defender: Combatant, weapon: Weapon | None
    ) -> bool:
        if weapon is None:
            return False
        return distance(attacker.x, attacker.y, defender.x, defender.y) <= weapon.effective_range

    def _select_weapon(self, combatant: Combatant, weapon_id: str | None) -> Weapon | None:
        if weapon_id is not None:
            chosen = next((w for w in combatant.weapons if w.id == weapon_id), None)
            if chosen is not None:
                return chosen
        return combatant.primary_weapon()

    def _check_outcome(self, state: CombatState) -> None:
        if state.outcome:
            return
        player = state.player()
        if player is not None and not player.alive:
            state.outcome = "player_defeat"
            state.active = False
        elif not state.living_enemies():
            state.outcome = "player_victory"
            state.active = False

    def _finish(self, state: CombatState) -> CombatState:
        state.active = False
        for combatant in state.combatants:
            combatant.defending = False
        if not (state.log and state.log[-1].action == "end"):
            text = {
                "player_victory": "적을 모두 제압했다.",
                "player_defeat": "당신은 쓰러졌다.",
                "player_fled": "당신은 전장을 벗어났다.",
            }.get(state.outcome or "", "전투 종료.")
            self._log(state, None, "end", text, {"outcome": state.outcome})
        return state


__all__ = ["CombatEngine", "PlayerAction"]
