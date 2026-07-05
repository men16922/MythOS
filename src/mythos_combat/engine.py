from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from mythos_core.dice import Dice

from .log_i18n import clog
from .models import (
    ALLY,
    ENEMY,
    PLAYER,
    Combatant,
    CombatLogEntry,
    CombatState,
    Weapon,
    distance,
)

_NEIGHBORS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def _avg_dice(spec: str) -> float:
    """Expected value of an ``NdM(+/-K)`` dice spec (for ranking, not rolling).

    Plain integers and malformed specs degrade to their numeric/zero value so callers
    can rank skills without raising.
    """
    spec = spec.strip().replace(" ", "")
    if not spec:
        return 0.0
    mod = 0.0
    for sign in ("+", "-"):
        idx = spec.find(sign, 1)
        if idx != -1:
            try:
                mod = float(spec[idx:])
            except ValueError:
                mod = 0.0
            spec = spec[:idx]
            break
    if "d" in spec:
        n_str, _, m_str = spec.partition("d")
        try:
            n, m = int(n_str or 1), int(m_str)
        except ValueError:
            return mod
        return n * (m + 1) / 2.0 + mod
    try:
        return float(spec) + mod
    except ValueError:
        return mod


@dataclass
class PlayerAction:
    type: str = "wait"  # attack|defend|flee|wait|skill|item
    target_id: str | None = None
    weapon_id: str | None = None
    move_to: tuple[int, int] | None = None
    item_id: str | None = None
    skill_id: str | None = None


class CombatEngine:
    """Turn-based tactical resolver. Pure + deterministic given the seed."""

    def __init__(self, skills_pool: dict[str, Any] | None = None) -> None:
        if skills_pool is None:
            try:
                from mythos_runtime.scenario import load_scenario

                # Copy: load_scenario is lru_cached, so the returned combat dict is
                # shared. Callers (and tests) mutate engine.skills_pool, which must
                # not leak back into the cached scenario.
                combat = load_scenario("neo-seoul").combat
                self.skills_pool = dict(combat.get("skills", {}))
                # Boss/enemy-only skill defs live in a SEPARATE pool so they never
                # pollute the player skill tree / Codex / icon-integrity checks.
                self.enemy_skills_pool = dict(combat.get("enemy_skills", {}))
            except Exception:
                self.skills_pool = {}
                self.enemy_skills_pool = {}
        else:
            self.skills_pool = skills_pool
            self.enemy_skills_pool = {}

    def _build_deterministic_terrain(self, state: CombatState) -> None:
        import hashlib

        seed_bytes = state.seed.encode("utf-8")
        h = hashlib.sha256(seed_bytes).digest()

        idx = 0
        for y in range(state.arena_h):
            for x in range(state.arena_w):
                key = f"{x},{y}"
                # Ensure starting edges are clear
                if x <= 1 or x >= state.arena_w - 2:
                    continue
                val = h[idx % len(h)]
                idx += 1

                if val < 26:
                    state.elevations[key] = 1
                elif val < 65:
                    state.covers[key] = "full" if val % 2 == 0 else "half"
                elif val < 81:
                    state.hazards[key] = "electro" if val % 2 == 0 else "acid"

    def start(
        self,
        party: list[Combatant],
        enemies: list[Combatant],
        *,
        seed: str,
        arena: tuple[int, int] = (8, 6),
        encounter_id: str | None = None,
        language: str = "ko",
    ) -> CombatState:
        state = CombatState(
            active=True,
            round=1,
            arena_w=arena[0],
            arena_h=arena[1],
            combatants=[*party, *enemies],
            seed=seed,
            encounter_id=encounter_id,
            language=language,
        )
        self._build_deterministic_terrain(state)
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
                text=clog(language, "start"),
                detail={"order": list(state.order)},
            )
        )
        self._run_opening(state)
        return state

    def take_player_turn(
        self,
        state: CombatState,
        action: PlayerAction,
        *,
        skill_def: dict[str, Any] | None = None,
        item_def: dict[str, Any] | None = None,
        item_available: bool = False,
    ) -> CombatState:
        if not state.active:
            return state
        # The acting unit is whoever the initiative pointer is on, as long as it is
        # player-driven (the player or a controllable party member). AI allies and
        # enemies are resolved by the engine in _run_until_controllable.
        actor = state.active_actor()
        if actor is None or not actor.alive or not actor.is_controllable:
            return state

        # `spent` is False when the action was rejected (no focus / on cooldown /
        # missing item / no valid target) so the turn is NOT handed to the enemies.
        spent = True
        if action.type == "skill":
            spent = self._player_skill(state, actor, action, skill_def, item_available)
        elif action.type == "item":
            spent = self._player_item(state, actor, action, item_def, item_available)
        else:
            dice = self._dice(state)
            if action.move_to is not None:
                self._move_player(state, actor, action.move_to)
            if action.type == "attack":
                self._player_attack(state, actor, action, dice)
            elif action.type == "defend":
                actor.defending = True
                gained = self._restore_focus(actor, 1)
                detail = {"focus_gained": gained} if gained else {}
                self._log(
                    state,
                    actor,
                    "defend",
                    clog(state.language, "defend", name=actor.name),
                    detail,
                )
            elif action.type == "flee":
                # Only the player can break off the engagement; party members must
                # take a different action on their turn.
                if actor.faction == PLAYER:
                    self._player_flee(state, actor, dice)
                else:
                    self._log(state, actor, "info", clog(state.language, "cannot_leave", name=actor.name))
                    spent = False
            else:
                self._log(state, actor, "info", clog(state.language, "observe", name=actor.name))

        self._check_outcome(state)
        if not state.active or state.outcome == "player_fled":
            return self._finish(state)

        if not spent:
            return state

        self._run_until_controllable(state)
        if not state.active:
            return self._finish(state)
        return state

    def available_actions(self, state: CombatState) -> dict[str, Any]:
        actor = state.active_actor()
        if actor is None or not actor.alive or not state.active or not actor.is_controllable:
            return {"can_act": False, "targets": [], "reachable": []}
        targets: list[dict[str, Any]] = []
        for enemy in state.living_enemies():
            targets.append(
                {
                    "id": enemy.id,
                    "name": enemy.name,
                    "distance": distance(actor.x, actor.y, enemy.x, enemy.y),
                    "in_range": self._weapon_in_range(actor, enemy, actor.primary_weapon()),
                    "hp": enemy.hp,
                    "max_hp": enemy.max_hp,
                }
            )
        # Friendlies (self + allies) so the UI can direct heal/shield support skills.
        friendly_targets: list[dict[str, Any]] = [
            {
                "id": ally.id,
                "name": ally.name,
                "distance": distance(actor.x, actor.y, ally.x, ally.y),
                "hp": ally.hp,
                "max_hp": ally.max_hp,
                "is_self": ally.id == actor.id,
            }
            for ally in state.friendlies_of(actor)
        ]
        self.update_enemy_intents(state)
        return {
            "can_act": True,
            "active_actor_id": actor.id,
            "active_actor_name": actor.name,
            "is_player": actor.faction == PLAYER,
            "move_range": actor.speed,
            "reachable": self._reachable_tiles(state, actor),
            "targets": targets,
            "friendly_targets": friendly_targets,
            "weapons": [w.id for w in actor.weapons],
            "focus": actor.focus,
            "max_focus": actor.max_focus,
            "skills": [self._skill_action_info(skill_id, actor) for skill_id in actor.skills],
        }

    def _skill_action_info(self, skill_id: str, player: Combatant) -> dict[str, Any]:
        """Skill payload for the UI: cooldown + presentation/animation metadata.

        ``role``/``tags`` let the web client pick icons and skill-specific
        animations data-driven (see docs/plans/2026-06-06-combat-darkest-dungeon-
        presentation.md) instead of hardcoding per skill id.
        """
        definition = self.skills_pool.get(skill_id, {}) or {}
        return {
            "id": skill_id,
            "cooldown": int(player.cooldowns.get(skill_id, 0)),
            "name": str(definition.get("name", skill_id)),
            "role": definition.get("role"),
            "tags": list(definition.get("tags", []) or []),
            "cost": dict(definition.get("cost", {}) or {}),
            "range": definition.get("range"),
            # Structured effect numbers (damage/heal/move/defense_bonus/duration/…)
            # so the client can compose a one-line expected-effect summary — CBT
            # feedback #2: "스킬이 뭘 하는지 안 읽힌다" (D1 skill legibility).
            "effect": dict(definition.get("effect", {}) or {}),
        }

    def update_enemy_intents(self, state: CombatState) -> None:
        """이전 Into the Breach와 마찬가지로, 현재 상태를 기반으로 적들이 다음 플레이어 차례 전에 할 행동을 미리 예측하여 노출합니다."""
        from mythos_combat.models import EnemyIntent, distance

        state.enemy_intents = []
        temp_positions = {c.id: (c.x, c.y) for c in state.combatants}

        for enemy in state.living_enemies():
            targets = state.hostiles_of(enemy)
            if not targets:
                state.enemy_intents.append(
                    EnemyIntent(
                        enemy_id=enemy.id,
                        action="idle",
                        target_x=temp_positions[enemy.id][0],
                        target_y=temp_positions[enemy.id][1],
                    )
                )
                continue

            curr_x, curr_y = temp_positions[enemy.id]
            target = min(targets, key=lambda t: (distance(curr_x, curr_y, t.x, t.y), t.hp))
            weapon = enemy.primary_weapon()
            reach = weapon.effective_range if weapon else 1

            is_coward = enemy.ai == "coward" and enemy.hp <= max(1, int(enemy.max_hp * 0.3))
            desired = max(reach + 3, 6) if is_coward else max(1, reach)

            sim_x, sim_y = curr_x, curr_y
            budget = enemy.speed
            while budget > 0:
                current_dist = distance(sim_x, sim_y, target.x, target.y)
                if current_dist == desired:
                    break
                best = None
                best_metric = abs(current_dist - desired)
                for ox, oy in _NEIGHBORS:
                    nx, ny = sim_x + ox, sim_y + oy
                    if not self._in_bounds(state, nx, ny):
                        continue

                    is_occupied = False
                    for other_id, pos in temp_positions.items():
                        if other_id == enemy.id:
                            continue
                        other_c = state.by_id(other_id)
                        if other_c and not other_c.alive:
                            continue
                        if pos[0] == nx and pos[1] == ny:
                            is_occupied = True
                            break
                    if is_occupied:
                        continue

                    metric = abs(distance(nx, ny, target.x, target.y) - desired)
                    if metric < best_metric:
                        best_metric = metric
                        best = (nx, ny)
                if best is None:
                    break
                sim_x, sim_y = best
                budget -= 1

            temp_positions[enemy.id] = (sim_x, sim_y)

            target_dist = distance(sim_x, sim_y, target.x, target.y)
            if not is_coward and weapon and target_dist <= reach:
                state.enemy_intents.append(
                    EnemyIntent(
                        enemy_id=enemy.id,
                        action="attack",
                        target_x=target.x,
                        target_y=target.y,
                        target_name=target.name,
                    )
                )
            elif is_coward:
                state.enemy_intents.append(
                    EnemyIntent(enemy_id=enemy.id, action="flee", target_x=sim_x, target_y=sim_y)
                )
            else:
                state.enemy_intents.append(
                    EnemyIntent(enemy_id=enemy.id, action="move", target_x=sim_x, target_y=sim_y)
                )

    # --- dice & logging -------------------------------------------------

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
            self._log(state, player, "info", clog(state.language, "target_gone", name=player.name))
            return
        weapon = self._select_weapon(player, action.weapon_id)
        if weapon is None:
            self._log(state, player, "info", clog(state.language, "no_weapon", name=player.name))
            return
        if not self._weapon_in_range(player, target, weapon):
            self._log(
                state,
                player,
                "info",
                clog(state.language, "out_of_range", target=target.name, weapon=weapon.name),
                {"distance": distance(player.x, player.y, target.x, target.y)},
            )
            return
        self._attack(state, player, target, weapon, dice)

    @staticmethod
    def _perception_mods(combatant: Combatant) -> tuple[int, int]:
        """Perception's combat contribution: ``(to-hit bonus, crit-range widening)``.

        Baseline-neutral: the default stat line (perception 5) gets +0/+0, so
        only invested perception (kits, boons, echoes, bond tiers) shifts the
        math — honoring the promised "perception -> accuracy/crit" contract
        that was previously display/narrative-only (crit was nat-20 only and
        to-hit used strength/agility alone).
        """
        perception = combatant.stat("perception")
        return max(0, (perception - 5) // 3), max(0, (perception - 5) // 5)

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
        accuracy_bonus, crit_widen = self._perception_mods(attacker)

        # 1. 고저차 연산
        att_key = f"{attacker.x},{attacker.y}"
        def_key = f"{defender.x},{defender.y}"
        att_el = state.elevations.get(att_key, 0)
        def_el = state.elevations.get(def_key, 0)

        el_bonus = 0
        el_dmg = 0
        if att_el > def_el:
            el_bonus = 2
            el_dmg = 1

        # 2. 엄폐 연산 (원거리 사격 시 방어 가산)
        cover_defense_bonus = 0
        if weapon.is_ranged:
            cover_type = state.covers.get(def_key, "none")
            if cover_type == "half":
                cover_defense_bonus = 3
            elif cover_type == "full":
                cover_defense_bonus = 6

        roll = dice.d20()
        total = roll + stat + weapon.to_hit_bonus + el_bonus + accuracy_bonus
        crit = roll >= 20 - crit_widen
        dc = defender.effective_defense + cover_defense_bonus

        if not crit and total < dc:
            # D4 cover legibility: when the shot would have hit WITHOUT the cover
            # bonus, narrate the cover doing its job instead of a generic miss.
            cover_saved = (
                cover_defense_bonus > 0 and total >= dc - cover_defense_bonus
            )
            if cover_saved:
                miss_text = clog(
                    state.language,
                    "attack_miss_cover",
                    attacker=attacker.name,
                    weapon=weapon.name,
                    defender=defender.name,
                    cover=cover_defense_bonus,
                )
            else:
                miss_text = clog(
                    state.language,
                    "attack_miss",
                    attacker=attacker.name,
                    weapon=weapon.name,
                    defender=defender.name,
                )
            self._log(
                state,
                attacker,
                "miss",
                miss_text,
                {
                    "roll": roll,
                    "total": total,
                    "dc": dc,
                    "target": defender.id,
                    "high_ground": att_el > def_el,
                    "cover_applied": cover_defense_bonus > 0,
                    "cover_saved": cover_saved,
                },
            )
            return

        damage = dice.roll(weapon.damage) + (stat // 2 if melee else stat // 3) + el_dmg
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
            "high_ground": att_el > def_el,
            "cover_applied": cover_defense_bonus > 0,
        }
        if defender.hp <= 0:
            defender.alive = False
            self._log(
                state,
                attacker,
                "defeat",
                clog(
                    state.language,
                    "attack_kill",
                    attacker=attacker.name,
                    defender=defender.name,
                    damage=damage,
                ),
                detail,
            )
        else:
            tag = clog(state.language, "crit_tag") if crit else ""
            self._log(
                state,
                attacker,
                "hit",
                clog(
                    state.language,
                    "attack_hit",
                    tag=tag,
                    attacker=attacker.name,
                    weapon=weapon.name,
                    defender=defender.name,
                    damage=damage,
                ),
                detail,
            )

    def _player_flee(self, state: CombatState, player: Combatant, dice: Dice) -> None:
        adjacent = [
            e for e in state.living_enemies() if distance(player.x, player.y, e.x, e.y) <= 1
        ]
        dc = 12 + 2 * len(adjacent)
        total = dice.d20() + player.stat("agility")
        if total >= dc:
            state.outcome = "player_fled"
            state.active = False
            self._log(
                state,
                player,
                "flee",
                clog(state.language, "flee_success", name=player.name),
                {"dc": dc, "total": total},
            )
        else:
            self._log(
                state,
                player,
                "info",
                clog(state.language, "flee_fail", name=player.name),
                {"dc": dc, "total": total},
            )

    # --- skills & items -------------------------------------------------
    def _player_skill(
        self,
        state: CombatState,
        player: Combatant,
        action: PlayerAction,
        skill_def: dict[str, Any] | None,
        item_available: bool,
    ) -> bool:
        if not isinstance(skill_def, dict):
            self._log(state, player, "info", clog(state.language, "unknown_skill", name=player.name))
            return False
        skill_id = str(skill_def.get("id", action.skill_id or ""))
        name = str(skill_def.get("name", skill_id))

        remaining = int(player.cooldowns.get(skill_id, 0))
        if remaining > 0:
            self._log(
                state, player, "info",
                clog(state.language, "skill_recharge", name=name, remaining=remaining),
            )
            return False
        cost = skill_def.get("cost", {}) if isinstance(skill_def.get("cost"), dict) else {}
        focus_cost = int(cost.get("focus", 0))
        if focus_cost > player.focus:
            self._log(state, player, "info", clog(state.language, "skill_no_focus", name=name))
            return False
        item_cost = cost.get("item")
        if item_cost and not item_available:
            self._log(state, player, "info", clog(state.language, "skill_no_resource", name=name))
            return False

        effect = skill_def.get("effect", {}) if isinstance(skill_def.get("effect"), dict) else {}
        skill_range = int(skill_def.get("range", 1))

        # Pre-validate damage target (so a whiffed cast does not burn focus/turn).
        target: Combatant | None = None
        if "damage" in effect or "damage_bonus" in effect:
            target = state.by_id(action.target_id)
            if target is None or not target.alive:
                target = self._nearest_enemy_in_range(state, player, skill_range)
            if target is None:
                self._log(state, player, "info", clog(state.language, "skill_no_target", name=name))
                return False

        detail: dict[str, Any] = {"skill": skill_id}
        if item_cost:
            detail["consumed"] = str(item_cost)
        self._log(
            state, player, "skill",
            clog(state.language, "skill_activate", actor=player.name, skill=name), detail,
        )

        dice = self._dice(state)
        if "move" in effect:
            self._skill_move(state, player, action.move_to, int(effect.get("move", player.speed)))
        if target is not None:
            self._skill_attack(state, player, target, name, effect, dice)
        # Heal/shield support effects can target a friendly in range (default self).
        support = (
            self._friendly_target(state, player, action.target_id, skill_range)
            if ("defense_bonus" in effect or "heal" in effect)
            else player
        )
        if "defense_bonus" in effect:
            support.defense_buff = int(effect.get("defense_bonus", 0))
            support.defense_buff_turns = max(1, int(effect.get("duration", 1)))
            self._log(
                state,
                player,
                "defend",
                clog(state.language, "cover_noise", name=support.name, buff=support.defense_buff),
            )
        if "heal" in effect:
            healed = self._apply_heal(support, str(effect.get("heal", "0")), dice)
            self._log(
                state, player, "info",
                clog(state.language, "recover_hp", name=support.name, healed=healed),
            )

        player.focus = max(0, player.focus - focus_cost)
        player.cooldowns[skill_id] = int(skill_def.get("cooldown", 0))
        return True

    def _player_item(
        self,
        state: CombatState,
        player: Combatant,
        action: PlayerAction,
        item_def: dict[str, Any] | None,
        item_available: bool,
    ) -> bool:
        if not isinstance(item_def, dict):
            self._log(state, player, "info", clog(state.language, "item_unusable", name=player.name))
            return False
        if not item_available:
            self._log(state, player, "info", clog(state.language, "item_missing", name=player.name))
            return False
        item_id = str(item_def.get("id", action.item_id or ""))
        name = str(item_def.get("name", item_id))
        effect = str(item_def.get("effect", ""))
        detail: dict[str, Any] = {"item": item_id, "consumed": item_id}
        dice = self._dice(state)
        if effect == "heal":
            healed = self._apply_heal(player, str(item_def.get("heal", "2d6")), dice)
            self._log(
                state,
                player,
                "item",
                clog(state.language, "item_heal", actor=player.name, item=name, healed=healed),
                detail,
            )
            return True
        if effect == "focus":
            bonus = int(item_def.get("bonus", 1))
            detail["focus_gained"] = self._restore_focus(player, bonus)
            self._log(
                state, player, "item",
                clog(state.language, "item_focus", actor=player.name, item=name), detail,
            )
            return True
        if effect == "revive":
            # Reboot the most valuable casualty: the first downed ALLY (the
            # player being down ends the fight before an item could fire). Not
            # consumed when nobody is down.
            downed = next(
                (c for c in state.combatants if c.faction == ALLY and not c.alive), None
            )
            if downed is None:
                self._log(
                    state, player, "info",
                    clog(state.language, "item_revive_no_target", item=name),
                )
                return False
            downed.alive = True
            downed.hp = max(int(item_def.get("bonus", 1)), downed.max_hp // 3)
            detail["revived"] = downed.id
            self._log(
                state,
                player,
                "item",
                clog(
                    state.language,
                    "item_revive",
                    actor=player.name,
                    item=name,
                    target=downed.name,
                    hp=downed.hp,
                ),
                detail,
            )
            return True
        self._log(state, player, "info", clog(state.language, "item_combat_only", name=name))
        return False

    def _skill_move(
        self, state: CombatState, player: Combatant, dest: tuple[int, int] | None, max_move: int
    ) -> None:
        if dest is not None:
            dx, dy = dest
            if (
                self._in_bounds(state, dx, dy)
                and not self._occupied(state, dx, dy, player)
                and distance(player.x, player.y, dx, dy) <= max_move
            ):
                player.x, player.y = dx, dy
                self._log(
                    state,
                    player,
                    "move",
                    clog(state.language, "signal_step_move", name=player.name, dx=dx, dy=dy),
                    {"to": [dx, dy]},
                )
            return
        # No destination given: gap-close toward the nearest enemy.
        enemies = state.living_enemies()
        if not enemies:
            return
        foe = min(enemies, key=lambda e: distance(player.x, player.y, e.x, e.y))
        budget = max_move
        moved = False
        while budget > 0 and distance(player.x, player.y, foe.x, foe.y) > 1:
            best: tuple[int, int] | None = None
            best_metric = distance(player.x, player.y, foe.x, foe.y)
            for ox, oy in _NEIGHBORS:
                nx, ny = player.x + ox, player.y + oy
                if not self._in_bounds(state, nx, ny) or self._occupied(state, nx, ny, player):
                    continue
                metric = distance(nx, ny, foe.x, foe.y)
                if metric < best_metric:
                    best_metric = metric
                    best = (nx, ny)
            if best is None:
                break
            player.x, player.y = best
            moved = True
            budget -= 1
        if moved:
            self._log(
                state,
                player,
                "move",
                clog(state.language, "signal_step_dive", name=player.name, x=player.x, y=player.y),
                {"to": [player.x, player.y]},
            )

    def _skill_attack(
        self,
        state: CombatState,
        player: Combatant,
        target: Combatant,
        skill_name: str,
        effect: dict[str, Any],
        dice: Dice,
    ) -> None:
        stat = max(player.stat("strength"), player.stat("agility"))
        accuracy_bonus, crit_widen = self._perception_mods(player)
        roll = dice.d20()
        total = roll + stat + int(effect.get("to_hit_bonus", 0)) + accuracy_bonus
        crit = roll >= 20 - crit_widen
        dc = target.effective_defense
        if not crit and total < dc:
            self._log(
                state,
                player,
                "miss",
                clog(
                    state.language, "skill_miss",
                    actor=player.name, skill=skill_name, target=target.name,
                ),
                {"roll": roll, "total": total, "dc": dc, "target": target.id},
            )
            return
        if "damage" in effect:
            damage = dice.roll(str(effect["damage"]))
        else:
            weapon = player.primary_weapon()
            damage = dice.roll(weapon.damage) if weapon else dice.roll("1d4")
        if "damage_bonus" in effect:
            damage += dice.roll(str(effect["damage_bonus"]))
        armor_pen = int(effect.get("armor_pen", 0))
        damage = max(1, damage - max(0, target.armor - armor_pen))
        if crit:
            damage *= 2
        target.hp = max(0, target.hp - damage)
        detail = {
            "roll": roll,
            "total": total,
            "dc": dc,
            "damage": damage,
            "crit": crit,
            "target": target.id,
            "target_hp": target.hp,
            "target_max_hp": target.max_hp,
        }
        if target.hp <= 0:
            target.alive = False
            self._log(
                state,
                player,
                "defeat",
                clog(
                    state.language, "skill_kill",
                    actor=player.name, skill=skill_name, target=target.name, damage=damage,
                ),
                detail,
            )
        else:
            tag = clog(state.language, "crit_tag") if crit else ""
            self._log(
                state,
                player,
                "hit",
                clog(
                    state.language, "skill_hit",
                    tag=tag, actor=player.name, skill=skill_name, target=target.name, damage=damage,
                ),
                detail,
            )

    def _apply_heal(self, combatant: Combatant, heal_dice: str, dice: Dice) -> int:
        amount = dice.roll(heal_dice)
        before = combatant.hp
        combatant.hp = min(combatant.max_hp, combatant.hp + amount)
        return combatant.hp - before

    def _restore_focus(self, combatant: Combatant, amount: int) -> int:
        before = combatant.focus
        cap = combatant.max_focus if combatant.max_focus else before + amount
        combatant.focus = min(cap, combatant.focus + max(0, amount))
        return combatant.focus - before

    def _friendly_target(
        self, state: CombatState, player: Combatant, target_id: str | None, reach: int
    ) -> Combatant:
        """Resolve a support (heal/shield) target to a living friendly in range.

        Falls back to the caster when ``target_id`` is missing, hostile, dead,
        or out of range — preserving the prior self-only behavior as a safe default.
        """
        target = state.by_id(target_id)
        if (
            target is not None
            and target is not player
            and target.alive
            and target in state.friendlies_of(player)
            and distance(player.x, player.y, target.x, target.y) <= reach
        ):
            return target
        return player

    def _nearest_enemy_in_range(
        self, state: CombatState, player: Combatant, reach: int
    ) -> Combatant | None:
        candidates = [
            e for e in state.living_enemies() if distance(player.x, player.y, e.x, e.y) <= reach
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda e: (distance(player.x, player.y, e.x, e.y), e.hp))

    def _apply_hazard_effect(
        self, state: CombatState, combatant: Combatant, hazard_type: str
    ) -> None:
        dice = self._dice(state)
        if hazard_type == "acid":
            damage = max(1, dice.roll("1d4"))
            combatant.hp = max(0, combatant.hp - damage)
            combatant.defense = max(5, combatant.defense - 1)
            self._log(
                state,
                combatant,
                "info",
                clog(state.language, "hazard_acid", name=combatant.name, damage=damage),
                {"damage": damage, "hp": combatant.hp},
            )
        elif hazard_type == "electro":
            damage = max(1, dice.roll("1d6"))
            combatant.hp = max(0, combatant.hp - damage)
            combatant.focus = 0
            self._log(
                state,
                combatant,
                "info",
                clog(state.language, "hazard_shock", name=combatant.name, damage=damage),
                {"damage": damage, "hp": combatant.hp},
            )
        if combatant.hp <= 0:
            combatant.alive = False
            self._log(
                state,
                combatant,
                "defeat",
                clog(state.language, "hazard_death", name=combatant.name),
                {"target": combatant.id},
            )

    def _tick_round_upkeep(self, state: CombatState, actor: Combatant) -> None:
        """Per-turn upkeep for any combatant: focus regen, cooldowns, expiring buffs, hazards."""
        if actor.max_focus:
            actor.focus = min(actor.max_focus, actor.focus + 1)
        for skill_id in list(actor.cooldowns):
            actor.cooldowns[skill_id] -= 1
            if actor.cooldowns[skill_id] <= 0:
                del actor.cooldowns[skill_id]
        if actor.defense_buff_turns > 0:
            actor.defense_buff_turns -= 1
            if actor.defense_buff_turns <= 0:
                actor.defense_buff = 0

        # Hazard check
        key = f"{actor.x},{actor.y}"
        hazard = state.hazards.get(key)
        if hazard and actor.alive:
            self._apply_hazard_effect(state, actor, hazard)

    # --- enemy / ally AI ------------------------------------------------
    def _run_opening(self, state: CombatState) -> None:
        """Auto-resolve NPC turns up to the first player-driven unit, then stop."""
        n = len(state.order)
        for i in range(n):
            actor = state.by_id(state.order[i])
            if not (actor and actor.alive):
                continue
            if actor.is_controllable:
                state.turn_ptr = i
                return
            self._npc_turn(state, actor)
            self._check_outcome(state)
            if not state.active:
                return
        state.turn_ptr = 0

    def _run_until_controllable(self, state: CombatState) -> None:
        """Auto-resolve AI ally/enemy turns until the next player-driven unit's turn."""
        n = len(state.order)
        i = (state.turn_ptr + 1) % n
        guard = 0
        while guard < n * 3:
            guard += 1
            # A new round begins each time the pointer wraps to the top of the order.
            if i == 0:
                state.round += 1
            actor = state.by_id(state.order[i])
            if actor and actor.alive:
                if actor.is_controllable:
                    actor.defending = False
                    self._tick_round_upkeep(state, actor)
                    state.turn_ptr = i
                    return
                self._npc_turn(state, actor)
                self._check_outcome(state)
                if not state.active:
                    return
            i = (i + 1) % n
        state.turn_ptr = i

    def _npc_turn(self, state: CombatState, actor: Combatant) -> None:
        self._tick_round_upkeep(state, actor)
        if actor.faction == ENEMY:
            self._enemy_turn(state, actor)
        elif actor.faction == ALLY:
            self._ally_turn(state, actor)

    def _execute_npc_skill(
        self,
        state: CombatState,
        actor: Combatant,
        skill_id: str,
        skill_def: dict[str, Any],
        target: Combatant | None = None,
    ) -> bool:
        name = str(skill_def.get("name", skill_id))
        cost = skill_def.get("cost", {}) if isinstance(skill_def.get("cost"), dict) else {}
        focus_cost = int(cost.get("focus", 0))
        effect = skill_def.get("effect", {}) if isinstance(skill_def.get("effect"), dict) else {}

        detail = {"skill": skill_id}
        self._log(
            state, actor, "skill",
            clog(state.language, "skill_activate", actor=actor.name, skill=name), detail,
        )

        dice = self._dice(state)
        if target is not None and ("damage" in effect or "damage_bonus" in effect):
            self._skill_attack(state, actor, target, name, effect, dice)
        if "defense_bonus" in effect:
            buff_target = target if target is not None else actor
            buff_target.defense_buff = int(effect.get("defense_bonus", 0))
            buff_target.defense_buff_turns = max(1, int(effect.get("duration", 1)))
            self._log(
                state,
                actor,
                "defend",
                clog(state.language, "cover_noise", name=buff_target.name, buff=buff_target.defense_buff),
            )
        if "heal" in effect:
            heal_target = target if target is not None else actor
            healed = self._apply_heal(heal_target, str(effect.get("heal", "0")), dice)
            self._log(
                state,
                actor,
                "info",
                clog(state.language, "heal_other", actor=actor.name, target=heal_target.name, healed=healed),
            )
        if "move" in effect:
            move_budget = int(effect.get("move", actor.speed))
            weapon = actor.primary_weapon()
            reach = weapon.effective_range if weapon else 1
            desired_dist = max(reach + 3, 6) if actor.ai == "coward" else max(1, reach)
            move_ref = (
                target
                if target is not None
                else (state.living_enemies()[0] if state.living_enemies() else actor)
            )
            self._move_to_band(state, actor, move_ref, desired=desired_dist, budget=move_budget)

        actor.focus = max(0, actor.focus - focus_cost)
        actor.cooldowns[skill_id] = int(skill_def.get("cooldown", 0))
        return True

    def _enemy_turn(self, state: CombatState, enemy: Combatant) -> None:
        dice = self._dice(state)
        targets = state.hostiles_of(enemy)
        if not targets:
            return
        target = min(targets, key=lambda t: (distance(enemy.x, enemy.y, t.x, t.y), t.hp))
        weapon = enemy.primary_weapon()
        reach = weapon.effective_range if weapon else 1

        # Boss AI: phase telegraph + skill usage. Returns True if a skill was cast this
        # turn; otherwise the boss falls through to a normal weapon attack below.
        if enemy.skills and self._boss_skill_turn(state, enemy, target):
            return

        if enemy.ai == "coward" and enemy.hp <= max(1, int(enemy.max_hp * 0.3)):
            self._move_to_band(state, enemy, target, desired=max(reach + 3, 6))
            self._log(state, enemy, "flee", clog(state.language, "enemy_flee", name=enemy.name))
            return

        self._move_to_band(state, enemy, target, desired=max(1, reach))
        if weapon and self._weapon_in_range(enemy, target, weapon):
            self._attack(state, enemy, target, weapon, dice)

    def _enemy_skill_def(self, skill_id: str) -> dict[str, Any]:
        """Resolve a skill def for an enemy: boss/enemy pool first, then the shared pool."""
        sdef = self.enemy_skills_pool.get(skill_id) or self.skills_pool.get(skill_id)
        return sdef if isinstance(sdef, dict) else {}

    def _boss_skill_turn(self, state: CombatState, enemy: Combatant, target: Combatant) -> bool:
        """One boss decision: cross the enrage threshold (once), then cast the strongest
        affordable, off-cooldown, phase-permitted skill that can reach ``target``.

        Returns True iff a skill was actually cast (the skill pose / "skill" log fires).
        """
        # Phase 2: announce the enrage once HP crosses 50%, unlocking ``phase: enraged`` skills.
        if not enemy.enraged and enemy.hp <= enemy.max_hp // 2:
            enemy.enraged = True
            self._log(state, enemy, "info", clog(state.language, "boss_enrage", name=enemy.name))

        candidates: list[tuple[str, dict[str, Any]]] = []
        for skill_id in enemy.skills:
            sdef = self._enemy_skill_def(skill_id)
            if not sdef or skill_id in enemy.cooldowns:
                continue
            if str(sdef.get("phase", "")) == "enraged" and not enemy.enraged:
                continue
            cost = sdef.get("cost", {}) if isinstance(sdef.get("cost"), dict) else {}
            if enemy.focus < int(cost.get("focus", 0)):
                continue
            candidates.append((skill_id, sdef))
        if not candidates:
            return False

        def _avg_damage(item: tuple[str, dict[str, Any]]) -> float:
            effect = item[1].get("effect", {}) if isinstance(item[1].get("effect"), dict) else {}
            return _avg_dice(str(effect.get("damage", "0")))

        skill_id, sdef = max(candidates, key=_avg_damage)
        skill_range = int(sdef.get("range", 1))
        self._move_to_band(state, enemy, target, desired=max(1, skill_range))
        if distance(enemy.x, enemy.y, target.x, target.y) <= skill_range:
            return self._execute_npc_skill(state, enemy, skill_id, sdef, target)
        return False

    def _ally_turn(self, state: CombatState, ally: Combatant) -> None:
        dice = self._dice(state)
        enemies = state.living_enemies()
        if not enemies:
            return

        player = state.player()

        # Determine archetype from ai or fallback to ID mappings for backward compatibility
        ai_type = ally.ai
        if ai_type == "ranged_support" or ally.id == "se_rin":
            ai_type = "ranged_support"
        elif ai_type == "melee_tank" or ally.id == "kai":
            ai_type = "melee_tank"

        # 1. Ranged Support Archetype (e.g. se_rin / ranged_support)
        if ai_type == "ranged_support":
            # Find defensive/shield skill from available skills
            shield_skill_id = None
            for sid in ally.skills:
                skill_def = self.skills_pool.get(sid, {})
                effect = skill_def.get("effect", {})
                if isinstance(effect, dict) and "defense_bonus" in effect:
                    shield_skill_id = sid
                    break

            # Find damage skill
            dmg_skill_id = None
            for sid in ally.skills:
                skill_def = self.skills_pool.get(sid, {})
                effect = skill_def.get("effect", {})
                if isinstance(effect, dict) and ("damage" in effect or "damage_bonus" in effect):
                    dmg_skill_id = sid
                    break

            # 1-1. Protect player with shield skill if player is critically low on health and has no defense buff
            if (
                player
                and player.alive
                and player.hp <= int(player.max_hp * 0.6)
                and player.defense_buff_turns <= 0
                and shield_skill_id
                and shield_skill_id not in ally.cooldowns
            ):
                skill_def = self.skills_pool.get(shield_skill_id, {})
                focus_cost = int(skill_def.get("cost", {}).get("focus", 0))
                if ally.focus >= focus_cost:
                    skill_range = int(skill_def.get("range", 4))
                    if distance(ally.x, ally.y, player.x, player.y) <= skill_range:
                        self._execute_npc_skill(state, ally, shield_skill_id, skill_def, player)
                        return

            # 1-2. Self-defense: use shield skill on self if self has no defense buff
            if (
                shield_skill_id
                and shield_skill_id not in ally.cooldowns
                and ally.defense_buff_turns <= 0
            ):
                skill_def = self.skills_pool.get(shield_skill_id, {})
                focus_cost = int(skill_def.get("cost", {}).get("focus", 0))
                if ally.focus >= focus_cost:
                    self._execute_npc_skill(state, ally, shield_skill_id, skill_def, ally)
                    return

            # 1-3. Use damage skill if focus is available and enemy is in range
            if dmg_skill_id and dmg_skill_id not in ally.cooldowns:
                skill_def = self.skills_pool.get(dmg_skill_id, {})
                focus_cost = int(skill_def.get("cost", {}).get("focus", 0))
                if ally.focus >= focus_cost:
                    skill_range = int(skill_def.get("range", 5))
                    valid_targets = [
                        e for e in enemies if distance(ally.x, ally.y, e.x, e.y) <= skill_range
                    ]
                    if valid_targets:
                        # Target the weakest enemy in range
                        atk_target = min(valid_targets, key=lambda e: e.hp)
                        self._execute_npc_skill(state, ally, dmg_skill_id, skill_def, atk_target)
                        return

            # 1-4. Ranged basic attack fallback (keep distance of 4 and fire)
            target = min(enemies, key=lambda t: (distance(ally.x, ally.y, t.x, t.y), t.hp))
            weapon = ally.primary_weapon()
            reach = weapon.effective_range if weapon else 4
            self._move_to_band(state, ally, target, desired=reach)
            if weapon and self._weapon_in_range(ally, target, weapon):
                self._attack(state, ally, target, weapon, dice)
            return

        # 2. Melee Tank Archetype (e.g. kai / melee_tank)
        elif ai_type == "melee_tank":
            # Target selection: focus on enemies closest to the player to protect them
            if player and player.alive:
                enemies_near_player = sorted(
                    enemies, key=lambda e: distance(player.x, player.y, e.x, e.y)
                )
                target = enemies_near_player[0]
            else:
                target = min(enemies, key=lambda t: (distance(ally.x, ally.y, t.x, t.y), t.hp))

            # Find melee damage skill
            melee_skill_id = None
            for sid in ally.skills:
                skill_def = self.skills_pool.get(sid, {})
                effect = skill_def.get("effect", {})
                if isinstance(effect, dict) and ("damage" in effect or "damage_bonus" in effect):
                    melee_skill_id = sid
                    break

            # 2-2. Use melee skill if focus is available
            if melee_skill_id and melee_skill_id not in ally.cooldowns:
                skill_def = self.skills_pool.get(melee_skill_id, {})
                focus_cost = int(skill_def.get("cost", {}).get("focus", 0))
                if ally.focus >= focus_cost:
                    skill_range = int(skill_def.get("range", 1))
                    # Move to melee range
                    self._move_to_band(state, ally, target, desired=skill_range)
                    if distance(ally.x, ally.y, target.x, target.y) <= skill_range:
                        self._execute_npc_skill(state, ally, melee_skill_id, skill_def, target)
                        return

            # 2-3. Melee basic attack fallback
            weapon = ally.primary_weapon()
            reach = weapon.effective_range if weapon else 1
            self._move_to_band(state, ally, target, desired=reach)
            if weapon and self._weapon_in_range(ally, target, weapon):
                self._attack(state, ally, target, weapon, dice)
            return

        # 3. Generic Companion fallback logic
        else:
            target = min(enemies, key=lambda t: (distance(ally.x, ally.y, t.x, t.y), t.hp))
            weapon = ally.primary_weapon()
            reach = weapon.effective_range if weapon else 1

            for skill_id in ally.skills:
                if skill_id not in self.skills_pool:
                    continue
                skill_def = self.skills_pool[skill_id]
                cost = skill_def.get("cost", {}) if isinstance(skill_def.get("cost"), dict) else {}
                focus_cost = int(cost.get("focus", 0))
                if ally.focus < focus_cost or skill_id in ally.cooldowns:
                    continue

                effect = (
                    skill_def.get("effect", {}) if isinstance(skill_def.get("effect"), dict) else {}
                )

                # Healing
                if "heal" in effect:
                    skill_range = int(skill_def.get("range", 3))
                    friendlies = [
                        c for c in state.combatants if c.alive and c.faction in ("player", ALLY)
                    ]
                    wounded = [
                        f
                        for f in friendlies
                        if f.hp <= int(f.max_hp * 0.6)
                        and distance(ally.x, ally.y, f.x, f.y) <= skill_range
                    ]
                    if wounded:
                        heal_target = min(wounded, key=lambda f: f.hp / f.max_hp)
                        self._execute_npc_skill(state, ally, skill_id, skill_def, heal_target)
                        return

                # Defense
                elif "defense_bonus" in effect:
                    if ally.defense_buff_turns <= 0:
                        self._execute_npc_skill(state, ally, skill_id, skill_def)
                        return

                # Damage
                elif "damage" in effect or "damage_bonus" in effect:
                    skill_range = int(skill_def.get("range", 1))
                    self._move_to_band(state, ally, target, desired=skill_range)
                    if distance(ally.x, ally.y, target.x, target.y) <= skill_range:
                        self._execute_npc_skill(state, ally, skill_id, skill_def, target)
                        return

                # Mobility / Flee
                elif "move" in effect:
                    if ally.ai == "coward" and ally.hp <= max(1, int(ally.max_hp * 0.3)):
                        self._execute_npc_skill(state, ally, skill_id, skill_def, target)
                        return

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
                clog(state.language, "move", name=player.name, x=player.x, y=player.y),
                {"from": list(old), "to": [player.x, player.y]},
            )

    def _move_to_band(
        self,
        state: CombatState,
        mover: Combatant,
        target: Combatant,
        *,
        desired: int,
        budget: int | None = None,
    ) -> None:
        if budget is None:
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
                clog(state.language, "move_shift", name=mover.name, x=mover.x, y=mover.y),
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
        self,
        attacker: Combatant,
        defender: Combatant,
        weapon: Weapon | None,
        state: CombatState | None = None,
    ) -> bool:
        if weapon is None:
            return False
        bonus_range = 0
        if state is not None and weapon.is_ranged:
            att_el = state.elevations.get(f"{attacker.x},{attacker.y}", 0)
            def_el = state.elevations.get(f"{defender.x},{defender.y}", 0)
            if att_el > def_el:
                bonus_range = 1
        return distance(attacker.x, attacker.y, defender.x, defender.y) <= (
            weapon.effective_range + bonus_range
        )

    def _select_weapon(self, combatant: Combatant, weapon_id: str | None) -> Weapon | None:
        if weapon_id is not None:
            chosen = next((w for w in combatant.weapons if w.id == weapon_id), None)
            if chosen is not None:
                return chosen
        return combatant.primary_weapon()

    def _check_outcome(self, state: CombatState) -> None:
        if state.outcome:
            return
        # Defeat once every player-driven unit (player + controllable party) is down.
        if not state.living_controllables():
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
            key = {
                "player_victory": "end_victory",
                "player_defeat": "end_defeat",
                "player_fled": "end_fled",
            }.get(state.outcome or "", "end_over")
            self._log(state, None, "end", clog(state.language, key), {"outcome": state.outcome})
        return state


__all__ = ["CombatEngine", "PlayerAction"]
