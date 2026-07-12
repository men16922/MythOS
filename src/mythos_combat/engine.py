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


def _unit(delta: int) -> int:
    """Sign of a coordinate delta (-1/0/+1) — one grid step along an axis."""
    return (delta > 0) - (delta < 0)


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


def _dice_range(spec: str) -> tuple[int, int]:
    """(min, max) of an ``NdM(+/-K)`` spec — for the shot-preview HUD, not rolling."""
    spec = spec.strip().replace(" ", "")
    if not spec:
        return (0, 0)
    mod = 0
    for sign in ("+", "-"):
        idx = spec.find(sign, 1)
        if idx != -1:
            try:
                mod = int(float(spec[idx:]))
            except ValueError:
                mod = 0
            spec = spec[:idx]
            break
    if "d" in spec:
        n_str, _, m_str = spec.partition("d")
        try:
            n, m = int(n_str or 1), int(m_str)
        except ValueError:
            return (mod, mod)
        return (n + mod, n * m + mod)
    try:
        v = int(float(spec))
        return (v + mod, v + mod)
    except ValueError:
        return (mod, mod)


# Persistent status effects (design 2026-07-12, slices 1+2). Whitelist guards
# content typos at apply time. burn=DoT · corrode=armor-2 · acid=defense-2 ·
# freeze=no movement (can still act) · shock=focus regen + cooldown tick frozen ·
# hacked=the enemy spends its next turn attacking its nearest fellow enemy
# (시스템 침투; consumed at act time like stun, not by the generic tick).
STATUS_EFFECT_IDS = ("burn", "corrode", "acid", "freeze", "shock", "hacked")

# Reapplying a status (or stun) ACCUMULATES remaining turns instead of
# max-refreshing (owner call 2026-07-12: duration stacks, intensity does not),
# bounded by this cap so chained casts can't freeze a unit out of the fight.
STATUS_EFFECT_TURNS_CAP = 6

# Forced movement (밀기/당기기) that runs into a blocker — board edge, a
# full-cover structure, or another unit — slams the target for this flat,
# armor-bypassing rider (owner 2026-07-12: collisions should hurt).
SLAM_DAMAGE_DICE = "1d4"


@dataclass
class PlayerAction:
    type: str = "wait"  # attack|defend|flee|wait|skill|item
    target_id: str | None = None
    weapon_id: str | None = None
    move_to: tuple[int, int] | None = None
    item_id: str | None = None
    skill_id: str | None = None
    # XCOM-style ground targeting (2026-07-12): an AoE consumable (EMP 수류탄)
    # is thrown at a CELL, not a unit — everything in the blast radius is hit.
    target_cell: tuple[int, int] | None = None


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
                # E1 companion signature skills: separate pool for the same reason.
                self.companion_skills_pool = dict(combat.get("companion_skills", {}))
            except Exception:
                self.skills_pool = {}
                self.enemy_skills_pool = {}
                self.companion_skills_pool = {}
        else:
            self.skills_pool = skills_pool
            self.enemy_skills_pool = {}
            self.companion_skills_pool = {}

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

        # F stun: a stunned player-driven unit loses this turn outright — the
        # attempted action is discarded and initiative moves on.
        if self._consume_stun(state, actor):
            self._run_until_controllable(state)
            if not state.active:
                return self._finish(state)
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
            if action.move_to is not None and not self._movement_frozen(state, actor):
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
                    # Two-tier slice 2 (2026-07-12): deterministic shot preview —
                    # hit % + post-armor damage range + the cover the shot faces —
                    # mirrors _attack's exact math, XCOM-HUD style.
                    **self._attack_preview(state, actor, enemy),
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
            "move_range": actor.effective_speed,
            "reachable": self._reachable_tiles(state, actor),
            "targets": targets,
            "friendly_targets": friendly_targets,
            "weapons": [w.id for w in actor.weapons],
            "focus": actor.focus,
            "max_focus": actor.max_focus,
            "skills": [self._skill_action_info(skill_id, actor) for skill_id in actor.skills],
        }

    def _attack_preview(
        self, state: CombatState, actor: Combatant, enemy: Combatant
    ) -> dict[str, Any]:
        """Deterministic weapon-attack forecast against ``enemy``.

        MUST mirror ``_attack``'s to-hit/damage math (stat + weapon + elevation
        + perception vs effective_defense + ranged cover; crit always hits).
        Returns {} when the actor has no weapon, so the target chip degrades."""
        weapon = actor.primary_weapon()
        if weapon is None:
            return {}
        melee = not weapon.is_ranged
        stat = actor.stat("strength") if melee else actor.stat("agility")
        accuracy_bonus, crit_widen = self._perception_mods(actor)
        att_el = state.elevations.get(f"{actor.x},{actor.y}", 0)
        def_el = state.elevations.get(f"{enemy.x},{enemy.y}", 0)
        el_bonus = 2 if att_el > def_el else 0
        el_dmg = 1 if att_el > def_el else 0
        cover_bonus = 0
        if weapon.is_ranged:
            cover_type = state.covers.get(f"{enemy.x},{enemy.y}", "none")
            cover_bonus = 3 if cover_type == "half" else 6 if cover_type == "full" else 0
        dc = enemy.effective_defense + cover_bonus
        mod = stat + weapon.to_hit_bonus + el_bonus + accuracy_bonus
        crit_floor = 20 - crit_widen
        hits = sum(1 for r in range(1, 21) if r >= crit_floor or r + mod >= dc)
        lo, hi = _dice_range(weapon.damage)
        dmg_bonus = (stat // 2 if melee else stat // 3) + el_dmg
        armor = max(0, enemy.armor - weapon.armor_pen)
        return {
            "hit_chance": round(hits / 20 * 100),
            "damage_min": max(1, lo + dmg_bonus - armor),
            "damage_max": max(1, hi + dmg_bonus - armor),
            "cover_bonus": cover_bonus,
        }

    def _skill_action_info(self, skill_id: str, player: Combatant) -> dict[str, Any]:
        """Skill payload for the UI: cooldown + presentation/animation metadata.

        ``role``/``tags`` let the web client pick icons and skill-specific
        animations data-driven (see docs/plans/2026-06-06-combat-darkest-dungeon-
        presentation.md) instead of hardcoding per skill id.
        """
        definition = self._ally_skill_def(skill_id) or {}
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
            budget = enemy.effective_speed
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
                        damage_hint=weapon.damage,
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
        damage = max(1, damage - max(0, self._effective_armor(defender) - weapon.armor_pen))
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
        # Weapon status riders (status slice 3): 화염 분사 등이 명중 시 상태를
        # 남긴다 — enemies now spread burn/acid/shock onto the party too.
        if defender.alive and weapon.applies:
            for status_id, turns in weapon.applies.items():
                self._apply_status_effect(state, attacker, defender, status_id, turns)

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
        if "move" in effect and not self._movement_frozen(state, player):
            self._skill_move(state, player, action.move_to, int(effect.get("move", player.speed)))
            # Arrival discharge (신호 도약 rider): guaranteed small shock to every
            # enemy adjacent to the landing cell — a blink into melee has value,
            # while a blink to safety still works with no target requirement.
            arrival = str(effect.get("arrival_damage", "") or "")
            if arrival:
                for foe in state.living_enemies():
                    if distance(player.x, player.y, foe.x, foe.y) <= 1:
                        self._apply_shock_damage(
                            state, player, foe, arrival, dice, name, "arrival_shock"
                        )
        if target is not None:
            self._skill_attack(state, player, target, name, effect, dice)
        # 밀기/당기기 (P1 forced movement): displace an enemy along the line. Resolve
        # the target even for a no-damage skill; a defeated target isn't shoved.
        if "push" in effect or "pull" in effect:
            disp = target or state.by_id(action.target_id)
            if disp is None or not disp.alive or disp.faction != ENEMY:
                disp = self._nearest_enemy_in_range(state, player, skill_range)
            if "push" in effect:
                self._skill_displace(state, player, disp, int(effect.get("push", 0) or 0), toward=False)
            if "pull" in effect:
                self._skill_displace(state, player, disp, int(effect.get("pull", 0) or 0), toward=True)
            # Slam rider (자기 견인): the yank itself hurts — guaranteed shock on
            # the gripped target even if it could not be moved, so the cast is
            # never a wasted turn.
            slam = str(effect.get("displace_damage", "") or "")
            if slam and disp is not None and disp.alive:
                self._apply_shock_damage(state, player, disp, slam, dice, name, "displace_shock")
        # Heal/shield support effects can target a friendly in range (default self).
        support = (
            self._friendly_target(state, player, action.target_id, skill_range)
            if ("defense_bonus" in effect or "heal" in effect)
            else player
        )
        # Radius-covered defense (차폐 필드) is handled by _apply_extended_effects;
        # the single-target branch below only serves classic shield skills.
        if "defense_bonus" in effect and not effect.get("radius"):
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
        # F stun (EMP pulse): stun the picked/nearest enemy in range; an ``aoe``
        # tagged skill also catches enemies adjacent to that target. A
        # ``shock_damage`` rider (owner 2026-07-12 "EMP 펄스 등도 데미지가
        # 없음") zaps every stunned victim for a small guaranteed hit.
        if effect.get("stun"):
            stun_target = state.by_id(action.target_id)
            if stun_target is None or not stun_target.alive or stun_target.faction != ENEMY:
                stun_target = self._nearest_enemy_in_range(state, player, skill_range)
            if stun_target is not None:
                duration = max(1, int(effect.get("duration", 1) or 1))
                zap = str(effect.get("shock_damage", "") or "")
                victims = [stun_target]
                if "aoe" in (skill_def.get("tags") or []):
                    for splash in state.living_enemies():
                        if splash.id != stun_target.id and (
                            distance(splash.x, splash.y, stun_target.x, stun_target.y) <= 1
                        ):
                            victims.append(splash)
                for victim in victims:
                    self._apply_stun(state, player, victim, duration)
                    if zap and victim.alive:
                        self._apply_shock_damage(
                            state, player, victim, zap, dice, name, "splash_hit"
                        )
            else:
                self._log(
                    state, player, "info", clog(state.language, "skill_no_target", name=name)
                )
        # E1 signature effects (radius defense / focus drain / party speed /
        # taunt / ally relocation).
        self._apply_extended_effects(
            state,
            player,
            effect,
            target=state.by_id(action.target_id),
            skill_range=skill_range,
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
        if effect in ("stun", "status_grenade"):
            # XCOM-style AoE throws (owner 2026-07-12): the grenade targets a
            # CELL within throw range and hits every enemy in the blast radius.
            # "stun" = EMP 수류탄; "status_grenade" = 소이/냉각 수류탄 (optional
            # flat damage dice + `applies` status riders). Falls back to the
            # chosen/nearest enemy's cell when no ground target was given.
            throw_range = int(item_def.get("range", 4) or 4)
            radius = int(item_def.get("radius", 1) or 1)
            cell: tuple[int, int] | None = None
            if action.target_cell is not None:
                cx, cy = int(action.target_cell[0]), int(action.target_cell[1])
                if (
                    self._in_bounds(state, cx, cy)
                    and distance(player.x, player.y, cx, cy) <= throw_range
                ):
                    cell = (cx, cy)
            if cell is None:
                aim = state.by_id(action.target_id)
                if aim is None or not aim.alive or aim.faction != ENEMY:
                    aim = self._nearest_enemy_in_range(state, player, throw_range)
                if aim is not None:
                    cell = (aim.x, aim.y)
            if cell is None:
                self._log(
                    state, player, "info", clog(state.language, "skill_no_target", name=name)
                )
                return False
            victims = [
                foe
                for foe in state.living_enemies()
                if distance(foe.x, foe.y, cell[0], cell[1]) <= radius
            ]
            if not victims:
                self._log(
                    state, player, "info", clog(state.language, "skill_no_target", name=name)
                )
                return False
            detail["cell"] = [cell[0], cell[1]]
            detail["radius"] = radius
            if effect == "stun":
                turns = max(1, int(item_def.get("bonus", 1) or 1))
                detail["stunned"] = [v.id for v in victims]
                self._log(
                    state, player, "item",
                    clog(
                        state.language, "item_stun_aoe",
                        actor=player.name, item=name, x=cell[0], y=cell[1], count=len(victims),
                    ),
                    detail,
                )
                for victim in victims:
                    self._apply_stun(state, player, victim, turns)
                return True
            # status_grenade: flat blast damage (no to-hit) + status riders.
            detail["hit"] = [v.id for v in victims]
            self._log(
                state, player, "item",
                clog(
                    state.language, "item_status_aoe",
                    actor=player.name, item=name, x=cell[0], y=cell[1], count=len(victims),
                ),
                detail,
            )
            blast = str(item_def.get("damage", "") or "")
            applies_raw = item_def.get("applies")
            applies = applies_raw if isinstance(applies_raw, dict) else {}
            for victim in victims:
                if blast:
                    self._apply_shock_damage(
                        state, player, victim, blast, dice, name, "splash_hit"
                    )
                if victim.alive:
                    for status_id, turns_raw in applies.items():
                        self._apply_status_effect(
                            state, player, victim, str(status_id), int(turns_raw or 1)
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

    def _skill_displace(
        self,
        state: CombatState,
        actor: Combatant,
        target: Combatant | None,
        tiles: int,
        *,
        toward: bool,
    ) -> None:
        """Forced movement (밀기/당기기). Steps ``target`` one tile at a time along
        the actor↔target line — away for push, toward the actor for pull — stopping
        at the board edge, a full-cover structure, or an occupied tile (no
        overshoot). Terrain-meaningful by design: shoving an enemy off a cover /
        high-ground tile strips the bonus it was standing on, since every combat
        calc reads elevation/cover from the combatant's CURRENT tile. Objectives
        flagged ``immovable`` don't budge.

        Collision slam (owner 2026-07-12): a displacement cut short by a blocker
        slams the target into it for ``SLAM_DAMAGE_DICE`` armor-bypassing bonus
        damage. Full cover blocks FORCED movement only (you get slammed against
        the server rack; walking behind it deliberately stays legal), and being
        pulled flush against the caster is a clean catch, not a collision."""
        if target is None or not target.alive or tiles <= 0:
            return
        mode = "pull" if toward else "push"
        if getattr(target, "immovable", False):
            self._log(
                state, actor, "info",
                clog(state.language, "skill_no_budge", target=target.name),
                {"target": target.id, "forced": mode, "tiles": 0},
            )
            return
        sx = _unit(target.x - actor.x)
        sy = _unit(target.y - actor.y)
        if toward:
            sx, sy = -sx, -sy
        if sx == 0 and sy == 0:
            return
        from_xy = [target.x, target.y]
        moved = 0
        obstacle: str | None = None
        for _ in range(tiles):
            nx, ny = target.x + sx, target.y + sy
            if not self._in_bounds(state, nx, ny):
                obstacle = "edge"
                break
            if state.covers.get(f"{nx},{ny}") == "full":
                obstacle = "cover"
                break
            occupant = next(
                (
                    c
                    for c in state.combatants
                    if c.alive and c.id != target.id and c.x == nx and c.y == ny
                ),
                None,
            )
            if occupant is not None:
                # Landing flush against the caster (pull terminus) is a clean
                # catch; bumping into anyone else is a collision.
                obstacle = None if occupant.id == actor.id else "unit"
                break
            target.x, target.y = nx, ny
            moved += 1
        if moved:
            self._log(
                state,
                actor,
                "move",
                clog(
                    state.language,
                    "skill_pull" if toward else "skill_push",
                    target=target.name,
                    x=target.x,
                    y=target.y,
                ),
                {
                    "to": [target.x, target.y],
                    "from": from_xy,
                    "target": target.id,
                    "tiles": moved,
                    "forced": mode,
                    "actor_at": [actor.x, actor.y],
                },
            )
        else:
            # A yank that moved nothing must still SAY something — the silent
            # no-op was unreadable ("발동했는지도 모르겠다").
            self._log(
                state, actor, "info",
                clog(state.language, "skill_no_budge", target=target.name),
                {"target": target.id, "forced": mode, "tiles": 0},
            )
        if obstacle is not None and target.alive:
            self._apply_shock_damage(
                state,
                actor,
                target,
                SLAM_DAMAGE_DICE,
                self._dice(state),
                clog(state.language, "slam_label"),
                "slam_hit",
                extra={"slam": True, "obstacle": obstacle, "forced": mode},
            )

    def _apply_shock_damage(
        self,
        state: CombatState,
        actor: Combatant,
        victim: Combatant,
        expr: str | int,
        dice: Dice,
        skill_name: str,
        msg_key: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        """Flat, no-to-hit rider damage (forced-movement slam / arrival
        discharge / AoE splash — pass an int to reuse an already-rolled value).

        Bypasses armor by design: the value of these riders is that they are
        small but GUARANTEED, so the utility cast never feels wasted."""
        damage = max(1, expr if isinstance(expr, int) else dice.roll(expr))
        victim.hp = max(0, victim.hp - damage)
        detail = {
            "damage": damage,
            "target": victim.id,
            "target_hp": victim.hp,
            "target_max_hp": victim.max_hp,
            "shock": True,
        }
        if extra:
            detail.update(extra)
        if victim.hp <= 0:
            victim.alive = False
            self._log(
                state, actor, "defeat",
                clog(
                    state.language, "skill_kill",
                    actor=actor.name, skill=skill_name, target=victim.name, damage=damage,
                ),
                detail,
            )
        else:
            self._log(
                state, actor, "hit",
                clog(
                    state.language, msg_key,
                    actor=actor.name, target=victim.name, damage=damage,
                ),
                detail,
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
        damage = max(1, damage - max(0, self._effective_armor(target) - armor_pen))
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
        # Persistent status riders (2026-07-12): a landed skill hit can apply
        # statuses via effect `applies: {"burn": 2, ...}` (whitelisted ids).
        applies = effect.get("applies")
        if isinstance(applies, dict) and target.alive:
            for status_id, turns in applies.items():
                self._apply_status_effect(state, player, target, str(status_id), int(turns or 1))
        # Splash (과부하 일격): the blast that landed on the primary target also
        # catches every other enemy within ``aoe_radius`` of the impact cell —
        # flat (no separate to-hit) at HALF the rolled damage (owner 2026-07-12:
        # full-damage splash one-shot two drones per cast, "스킬 언밸런스").
        radius = int(effect.get("aoe_radius", 0) or 0)
        if radius > 0:
            splash_damage = max(1, damage // 2)
            for foe in list(state.living_enemies()):
                if foe.id == target.id:
                    continue
                if distance(foe.x, foe.y, target.x, target.y) <= radius:
                    self._apply_shock_damage(
                        state, player, foe, splash_damage, dice, skill_name, "splash_hit"
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

    def _nearest_hostile_in_range(
        self, state: CombatState, actor: Combatant, reach: int
    ) -> Combatant | None:
        """Caster-relative variant (works for enemy casters too)."""
        candidates = [
            h
            for h in state.hostiles_of(actor)
            if h.alive and distance(actor.x, actor.y, h.x, h.y) <= reach
        ]
        if not candidates:
            return None
        return min(candidates, key=lambda h: (distance(actor.x, actor.y, h.x, h.y), h.hp))

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
        # 감전 (slice 2): circuits lag — no focus regen and cooldowns stay
        # frozen for the shocked turn (the status itself still ticks below).
        shocked = "shock" in actor.status_effects
        if actor.max_focus and not shocked:
            actor.focus = min(actor.max_focus, actor.focus + 1)
        if not shocked:
            for skill_id in list(actor.cooldowns):
                actor.cooldowns[skill_id] -= 1
                if actor.cooldowns[skill_id] <= 0:
                    del actor.cooldowns[skill_id]
        if actor.defense_buff_turns > 0:
            actor.defense_buff_turns -= 1
            if actor.defense_buff_turns <= 0:
                actor.defense_buff = 0
        if actor.speed_buff_turns > 0:
            actor.speed_buff_turns -= 1
            if actor.speed_buff_turns <= 0:
                actor.speed_buff = 0
        if actor.taunt_turns > 0:
            actor.taunt_turns -= 1
            if actor.taunt_turns <= 0 and "taunting" in actor.status:
                actor.status.remove("taunting")

        # Stun chip cleanup: the badge outlives the consumed stun until the
        # unit's next turn starts (so the skipped turn is visible on the board);
        # clear it here, right before the unit actually acts again.
        if actor.stunned_turns <= 0 and "stunned" in actor.status:
            actor.status.remove("stunned")
        # Same for act-time-consumed statuses (hacked): the chip stays visible
        # through the betrayal turn and clears at the unit's next upkeep.
        for sid in list(actor.status):
            if sid in STATUS_EFFECT_IDS and sid not in actor.status_effects:
                actor.status.remove(sid)

        # Persistent status effects (2026-07-12 design): DoT tick + expiry at
        # the owner's turn start, before they act.
        if actor.status_effects and actor.alive:
            self._tick_status_effects(state, actor)

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
                    # A DoT tick (burn/hazard) can down the unit in its own
                    # upkeep — never hand the turn to a corpse: settle the
                    # outcome and keep walking the order instead.
                    if not actor.alive:
                        self._check_outcome(state)
                        if not state.active:
                            return
                        i = (i + 1) % n
                        continue
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
        # A burn tick in upkeep can down the actor before it acts.
        if not actor.alive:
            return
        # F stun: a stunned NPC (EMP'd machine, mostly) skips its turn entirely.
        if self._consume_stun(state, actor):
            return
        # 시스템 침투: a hacked enemy spends this turn attacking its own side.
        if actor.faction == ENEMY and "hacked" in actor.status_effects:
            self._hacked_turn(state, actor)
            return
        if actor.faction == ENEMY:
            self._enemy_turn(state, actor)
        elif actor.faction == ALLY:
            self._ally_turn(state, actor)

    def _hacked_turn(self, state: CombatState, actor: Combatant) -> None:
        """해킹된 적의 배신 턴: 가장 가까운 동료 적을 공격한다 (1턴 소모).

        Consumed at act time (mirrors stun); the 🕹 chip stays until the unit's
        next upkeep so the seized turn reads on the board."""
        del actor.status_effects["hacked"]
        others = [e for e in state.living_enemies() if e.id != actor.id]
        if not others:
            self._log(
                state, actor, "info",
                clog(state.language, "hacked_idle", name=actor.name),
                {"status": "hacked", "target": actor.id},
            )
            return
        target = min(others, key=lambda e: distance(actor.x, actor.y, e.x, e.y))
        self._log(
            state, actor, "info",
            clog(state.language, "hacked_turn", name=actor.name, target=target.name),
            {"status": "hacked", "target": target.id},
        )
        weapon = actor.primary_weapon()
        reach = weapon.effective_range if weapon else 1
        self._move_to_band(state, actor, target, desired=max(1, reach))
        if weapon and distance(actor.x, actor.y, target.x, target.y) <= reach:
            log_before = len(state.log)
            self._attack(state, actor, target, weapon, self._dice(state))
            # Mark the betrayal blow so the client gives it a full-screen
            # cinema beat — owner 2026-07-12: resolved in one transition it
            # read as "즉발 데미지", not as the enemy's seized turn.
            for entry in state.log[log_before:]:
                if entry.action in ("hit", "miss", "defeat"):
                    entry.detail["hacked_blow"] = True

    def _apply_status_effect(
        self, state: CombatState, source: Combatant, victim: Combatant,
        status_id: str, turns: int,
    ) -> None:
        """Apply/extend a persistent status (2026-07-12 design; mirrors stun).

        Reapplying the same status ACCUMULATES remaining turns up to
        ``STATUS_EFFECT_TURNS_CAP`` (owner call 2026-07-12: duration stacks,
        intensity does not). ``hacked`` is consumed wholesale at act time, so
        extra turns on it are cosmetic."""
        if status_id not in STATUS_EFFECT_IDS or not victim.alive:
            return
        victim.status_effects[status_id] = min(
            STATUS_EFFECT_TURNS_CAP,
            victim.status_effects.get(status_id, 0) + max(1, int(turns)),
        )
        if status_id not in victim.status:
            victim.status.append(status_id)
        self._log(
            state, source, "info",
            clog(state.language, f"status_{status_id}_applied", target=victim.name),
            {"status": status_id, "target": victim.id, "turns": victim.status_effects[status_id]},
        )

    def _tick_status_effects(self, state: CombatState, actor: Combatant) -> None:
        """Turn-start tick: burn deals its DoT, every status counts down/expires."""
        dice = self._dice(state)
        for status_id in list(actor.status_effects):
            if status_id == "hacked":
                continue  # consumed when the hacked turn plays out (_hacked_turn)
            if status_id == "burn" and actor.alive:
                damage = max(1, dice.roll("1d4"))
                actor.hp = max(0, actor.hp - damage)
                detail = {
                    "status": "burn", "damage": damage, "target": actor.id,
                    "target_hp": actor.hp, "target_max_hp": actor.max_hp,
                }
                if actor.hp <= 0:
                    actor.alive = False
                    self._log(
                        state, actor, "defeat",
                        clog(state.language, "status_burn_kill", name=actor.name, damage=damage),
                        detail,
                    )
                else:
                    self._log(
                        state, actor, "hit",
                        clog(state.language, "status_burn_tick", name=actor.name, damage=damage),
                        detail,
                    )
            actor.status_effects[status_id] -= 1
            if actor.status_effects[status_id] <= 0:
                del actor.status_effects[status_id]
                if status_id in actor.status:
                    actor.status.remove(status_id)
                self._log(
                    state, actor, "info",
                    clog(state.language, f"status_{status_id}_expired", name=actor.name),
                    {"status": status_id, "target": actor.id, "expired": True},
                )

    def _effective_armor(self, combatant: Combatant) -> int:
        """Armor after persistent-status penalties (corrode: -2 while active)."""
        armor = combatant.armor
        if "corrode" in combatant.status_effects:
            armor -= 2
        return max(0, armor)

    def _movement_frozen(self, state: CombatState, actor: Combatant) -> bool:
        """True + a log line when 냉동 blocks this movement (acting stays allowed)."""
        if "freeze" not in actor.status_effects:
            return False
        self._log(
            state, actor, "info",
            clog(state.language, "status_freeze_hold", name=actor.name),
            {"status": "freeze", "target": actor.id, "held": True},
        )
        return True

    def _apply_stun(
        self, state: CombatState, source: Combatant, victim: Combatant, turns: int
    ) -> None:
        """Stun ``victim`` for ``turns`` of their own initiative (F foundation).

        Shared by the EMP-pulse skill effect and the EMP-grenade item so both
        finally do what their text promises. Reapplying ACCUMULATES turns up to
        ``STATUS_EFFECT_TURNS_CAP`` (owner call 2026-07-12), and keeps the D2
        status chip ("stunned") in sync.
        """
        victim.stunned_turns = min(
            STATUS_EFFECT_TURNS_CAP, victim.stunned_turns + max(1, int(turns))
        )
        if "stunned" not in victim.status:
            victim.status.append("stunned")
        # Action "info", not "skill": this is a RESULT line — logging it as a
        # second "skill" entry made the cinema queue play the cast twice
        # (owner 2026-07-12 "시스템 해킹이 2번 표시").
        self._log(
            state,
            source,
            "info",
            clog(
                state.language,
                "stun_applied",
                actor=source.name,
                target=victim.name,
                turns=victim.stunned_turns,
            ),
            {"stunned": victim.id, "turns": victim.stunned_turns},
        )

    def _apply_extended_effects(
        self,
        state: CombatState,
        caster: Combatant,
        effect: dict[str, Any],
        *,
        target: Combatant | None = None,
        skill_range: int = 1,
    ) -> None:
        """E1 signature-skill effects shared by player-driven and NPC casts.

        Handles the mechanics beyond the classic damage/heal/defense trio:
        radius ally-defense (차폐 필드), enemy focus drain (시스템 해킹), party
        speed buff (지름길 호출), taunt (수호 방벽), ally relocation (백도어
        루트). Each is deterministic and no-ops when its key is absent.
        """
        # 차폐 필드: defense_bonus with a radius covers every friendly near the caster.
        radius = int(effect.get("radius", 0) or 0)
        if "defense_bonus" in effect and radius > 0:
            bonus = int(effect.get("defense_bonus", 0))
            duration = max(1, int(effect.get("duration", 1)))
            for friendly in state.friendlies_of(caster):
                if distance(friendly.x, friendly.y, caster.x, caster.y) <= radius:
                    friendly.defense_buff = max(friendly.defense_buff, bonus)
                    friendly.defense_buff_turns = max(friendly.defense_buff_turns, duration)
                    self._log(
                        state,
                        caster,
                        "defend",
                        clog(state.language, "cover_noise", name=friendly.name, buff=bonus),
                    )
        # Persistent status riders for UTILITY casts (정밀 EMP ⚡감전 등): damage
        # skills apply theirs on-hit inside _skill_attack, so skip those here.
        applies = effect.get("applies")
        if (
            isinstance(applies, dict)
            and "damage" not in effect
            and "damage_bonus" not in effect
        ):
            victim = target
            if victim is None or not victim.alive or victim.faction == caster.faction:
                victim = self._nearest_hostile_in_range(state, caster, skill_range)
            if victim is not None:
                for status_id, turns in applies.items():
                    self._apply_status_effect(
                        state, caster, victim, str(status_id), int(turns or 1)
                    )
                zap = str(effect.get("shock_damage", "") or "")
                if zap and victim.alive:
                    self._apply_shock_damage(
                        state, caster, victim, zap, self._dice(state), "", "splash_hit"
                    )
        # 시스템 침투 (hack_control — previously a phantom effect with no engine
        # handling): seize the target's next turn; it attacks its nearest
        # fellow enemy instead (resolved in _hacked_turn).
        if effect.get("hack_control"):
            victim = target
            if victim is None or not victim.alive or victim.faction == caster.faction:
                victim = self._nearest_hostile_in_range(state, caster, skill_range)
            if victim is not None:
                self._apply_status_effect(
                    state, caster, victim, "hacked", max(1, int(effect.get("duration", 1) or 1))
                )
        # 시스템 해킹: drain the target enemy's skill resource.
        drain = int(effect.get("focus_drain", 0) or 0)
        if drain > 0:
            victim = target
            if victim is None or not victim.alive or victim.faction == caster.faction:
                victim = self._nearest_hostile_in_range(state, caster, skill_range)
            if victim is not None:
                drained = min(victim.focus, drain)
                victim.focus = max(0, victim.focus - drain)
                self._log(
                    state,
                    caster,
                    "skill",
                    clog(
                        state.language,
                        "focus_drained",
                        actor=caster.name,
                        target=victim.name,
                        drained=drained,
                    ),
                    {"focus_drained": victim.id, "amount": drained},
                )
        # 지름길 호출: party-wide temporary movement bonus.
        speed_bonus = int(effect.get("party_speed_bonus", 0) or 0)
        if speed_bonus > 0:
            duration = max(1, int(effect.get("duration", 1)))
            for friendly in state.friendlies_of(caster):
                friendly.speed_buff = max(friendly.speed_buff, speed_bonus)
                friendly.speed_buff_turns = max(friendly.speed_buff_turns, duration)
            self._log(
                state,
                caster,
                "skill",
                clog(state.language, "party_speed", actor=caster.name, bonus=speed_bonus),
                {"party_speed": speed_bonus},
            )
        # 수호 방벽: the caster forces enemy attention onto itself.
        if effect.get("taunt"):
            caster.taunt_turns = max(caster.taunt_turns, max(1, int(effect.get("duration", 1))))
            if "taunting" not in caster.status:
                caster.status.append("taunting")
            self._log(
                state,
                caster,
                "skill",
                clog(state.language, "taunt", actor=caster.name),
                {"taunt": caster.id},
            )
        # 백도어 루트: instantly reposition the most endangered other friendly
        # away from its nearest enemy.
        relocate_budget = int(effect.get("relocate_ally", 0) or 0)
        if relocate_budget > 0:
            candidates = [
                f
                for f in state.friendlies_of(caster)
                if f.id != caster.id and f.alive and state.living_enemies()
            ]
            if candidates:
                def _danger(friendly: Combatant) -> tuple[float, float]:
                    nearest = min(
                        distance(friendly.x, friendly.y, e.x, e.y)
                        for e in state.living_enemies()
                    )
                    return (nearest, friendly.hp / max(1, friendly.max_hp))

                mover = min(candidates, key=_danger)
                threat = min(
                    state.living_enemies(),
                    key=lambda e: distance(mover.x, mover.y, e.x, e.y),
                )
                before = (mover.x, mover.y)
                self._move_to_band(
                    state,
                    mover,
                    threat,
                    desired=distance(mover.x, mover.y, threat.x, threat.y) + relocate_budget,
                    budget=relocate_budget,
                )
                if (mover.x, mover.y) != before:
                    self._log(
                        state,
                        caster,
                        "skill",
                        clog(
                            state.language,
                            "relocated",
                            actor=caster.name,
                            target=mover.name,
                        ),
                        {"relocated": mover.id, "to": [mover.x, mover.y]},
                    )

    def _consume_stun(self, state: CombatState, actor: Combatant) -> bool:
        """True when ``actor`` loses this turn to stun (decrements the counter).

        The "stunned" chip is deliberately NOT removed here: a stun applied and
        consumed within one server transition would otherwise never appear in
        any client snapshot (owner 2026-07-12 "기절이 보드에 표기가 안 돼") —
        the chip stays visible until the unit's next upkeep clears it."""
        if actor.stunned_turns <= 0:
            return False
        actor.stunned_turns -= 1
        self._log(
            state,
            actor,
            "info",
            clog(state.language, "stunned_skip", name=actor.name),
            {"stunned_skip": actor.id},
        )
        return True

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
        if "defense_bonus" in effect and not effect.get("radius"):
            buff_target = target if target is not None else actor
            buff_target.defense_buff = int(effect.get("defense_bonus", 0))
            buff_target.defense_buff_turns = max(1, int(effect.get("duration", 1)))
            self._log(
                state,
                actor,
                "defend",
                clog(state.language, "cover_noise", name=buff_target.name, buff=buff_target.defense_buff),
            )
        # F stun for NPC casts (수아 시스템 해킹, boss disables).
        if effect.get("stun"):
            stun_victim = target
            if stun_victim is None or not stun_victim.alive or stun_victim.faction == actor.faction:
                stun_victim = self._nearest_hostile_in_range(
                    state, actor, int(skill_def.get("range", 1))
                )
            if stun_victim is not None:
                self._apply_stun(
                    state, actor, stun_victim, max(1, int(effect.get("duration", 1) or 1))
                )
                zap = str(effect.get("shock_damage", "") or "")
                if zap and stun_victim.alive:
                    self._apply_shock_damage(
                        state, actor, stun_victim, zap, self._dice(state),
                        str(skill_def.get("name", "")), "splash_hit",
                    )
        # E1 signature effects (radius defense / focus drain / party speed /
        # taunt / ally relocation).
        self._apply_extended_effects(
            state,
            actor,
            effect,
            target=target,
            skill_range=int(skill_def.get("range", 1)),
        )
        # E2 최적화 프로토콜: seal tiles around the target as electro hazards.
        seal_count = int(effect.get("seal_tiles", 0) or 0)
        if seal_count > 0 and target is not None:
            sealed = self._seal_tiles_near(state, target, seal_count)
            if sealed:
                self._log(
                    state,
                    actor,
                    "skill",
                    clog(state.language, "tiles_sealed", actor=actor.name, count=len(sealed)),
                    {"sealed": sealed},
                )
        # E2 명단 소거: announce a strike on the lowest-HP hostile's position —
        # it fires on the caster's NEXT turn against the marked tiles (dodgeable).
        telegraph_damage = str(effect.get("telegraph_damage") or "")
        if telegraph_damage:
            victims = state.hostiles_of(actor)
            if victims:
                mark = min(victims, key=lambda v: v.hp)
                radius = int(effect.get("telegraph_radius", 0) or 0)
                tiles = [
                    [x, y]
                    for x in range(mark.x - radius, mark.x + radius + 1)
                    for y in range(mark.y - radius, mark.y + radius + 1)
                    if 0 <= x < state.arena_w and 0 <= y < state.arena_h
                ]
                state.telegraphs.append(
                    {
                        "caster": actor.id,
                        "name": name,
                        "tiles": tiles,
                        "damage": telegraph_damage,
                    }
                )
                self._log(
                    state,
                    actor,
                    "skill",
                    clog(
                        state.language,
                        "boss_telegraph",
                        actor=actor.name,
                        skill=name,
                        target=mark.name,
                    ),
                    {"telegraph": tiles, "marked": mark.id},
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
        # E1 taunt (tae_o signature): a taunting hostile forces itself into the
        # enemy's target pool.
        taunters = [t for t in targets if t.taunt_turns > 0]
        pool = taunters or targets
        target = min(pool, key=lambda t: (distance(enemy.x, enemy.y, t.x, t.y), t.hp))
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

    def _ally_skill_def(self, skill_id: str) -> dict[str, Any]:
        """Resolve a skill def for a friendly: shared pool first, then companion signatures."""
        sdef = self.skills_pool.get(skill_id) or self.companion_skills_pool.get(skill_id)
        return sdef if isinstance(sdef, dict) else {}

    def _resolve_telegraphs(self, state: CombatState, caster: Combatant) -> None:
        """E2: fire this caster's announced strikes against their marked tiles.

        Runs at the start of the caster's turn — everyone had a full round to
        move off the marked tiles, so standing in one is a readable mistake.
        """
        pending = [t for t in state.telegraphs if t.get("caster") == caster.id]
        if not pending:
            return
        state.telegraphs = [t for t in state.telegraphs if t.get("caster") != caster.id]
        dice = self._dice(state)
        for telegraph in pending:
            tiles = {(int(x), int(y)) for x, y in telegraph.get("tiles", [])}
            name = str(telegraph.get("name") or "")
            struck = False
            for victim in state.hostiles_of(caster):
                if (victim.x, victim.y) in tiles:
                    damage = max(1, dice.roll(str(telegraph.get("damage") or "1d6")))
                    victim.hp = max(0, victim.hp - damage)
                    if victim.hp <= 0:
                        victim.alive = False
                    struck = True
                    self._log(
                        state,
                        caster,
                        "hit",
                        clog(
                            state.language,
                            "telegraph_hit",
                            actor=caster.name,
                            skill=name,
                            target=victim.name,
                            damage=damage,
                        ),
                        {"damage": damage, "target": victim.id, "telegraph": True},
                    )
            if not struck:
                self._log(
                    state,
                    caster,
                    "info",
                    clog(state.language, "telegraph_evaded", actor=caster.name, skill=name),
                    {"telegraph_evaded": True},
                )

    def _seal_tiles_near(
        self, state: CombatState, target: Combatant, count: int
    ) -> list[list[int]]:
        """E2: mark up to ``count`` free tiles around ``target`` as electro hazards."""
        sealed: list[list[int]] = []
        for radius in (1, 2):
            for x in range(target.x - radius, target.x + radius + 1):
                for y in range(target.y - radius, target.y + radius + 1):
                    if len(sealed) >= count:
                        return sealed
                    key = f"{x},{y}"
                    if not (0 <= x < state.arena_w and 0 <= y < state.arena_h):
                        continue
                    if (x, y) == (target.x, target.y) or key in state.hazards:
                        continue
                    if self._occupied(state, x, y, target):
                        continue
                    state.hazards[key] = "electro"
                    sealed.append([x, y])
        return sealed

    def _boss_skill_turn(self, state: CombatState, enemy: Combatant, target: Combatant) -> bool:
        """One boss decision: cross the enrage threshold (once), then cast the strongest
        affordable, off-cooldown, phase-permitted skill that can reach ``target``.

        Returns True iff a skill was actually cast (the skill pose / "skill" log fires).
        """
        # E2: announced strikes fire first — the round in between was the dodge window.
        self._resolve_telegraphs(state, enemy)
        # Phase 2: announce the enrage once HP crosses 50%, unlocking ``phase: enraged`` skills.
        if not enemy.enraged and enemy.hp <= enemy.max_hp // 2:
            enemy.enraged = True
            self._log(state, enemy, "info", clog(state.language, "boss_enrage", name=enemy.name))

        has_pending_telegraph = any(t.get("caster") == enemy.id for t in state.telegraphs)
        candidates: list[tuple[str, dict[str, Any]]] = []
        for skill_id in enemy.skills:
            sdef = self._enemy_skill_def(skill_id)
            if not sdef or skill_id in enemy.cooldowns:
                continue
            if str(sdef.get("phase", "")) == "enraged" and not enemy.enraged:
                continue
            effect_probe = sdef.get("effect", {}) if isinstance(sdef.get("effect"), dict) else {}
            # Never stack a second announcement while one strike is still pending.
            if effect_probe.get("telegraph_damage") and has_pending_telegraph:
                continue
            cost = sdef.get("cost", {}) if isinstance(sdef.get("cost"), dict) else {}
            if enemy.focus < int(cost.get("focus", 0)):
                continue
            candidates.append((skill_id, sdef))
        if not candidates:
            return False

        def _avg_damage(item: tuple[str, dict[str, Any]]) -> float:
            effect = item[1].get("effect", {}) if isinstance(item[1].get("effect"), dict) else {}
            score = _avg_dice(str(effect.get("damage", "0")))
            # E2 specials: a telegraphed strike is near-full value (dodgeable),
            # tile sealing has a flat tactical worth.
            score = max(score, _avg_dice(str(effect.get("telegraph_damage", "0"))) * 0.9)
            if effect.get("seal_tiles"):
                score = max(score, 3.5)
            return score

        skill_id, sdef = max(candidates, key=_avg_damage)
        skill_range = int(sdef.get("range", 1))
        self._move_to_band(state, enemy, target, desired=max(1, skill_range))
        if distance(enemy.x, enemy.y, target.x, target.y) <= skill_range:
            return self._execute_npc_skill(state, enemy, skill_id, sdef, target)
        return False

    def _try_signature_cast(
        self, state: CombatState, ally: Combatant, enemies: list[Combatant]
    ) -> bool:
        """AI ally: cast the companion signature when it is clearly useful (E1).

        One deterministic applicability check per effect shape; the skill's own
        cooldown/focus cost gates spam. Returns True iff a signature fired.
        """
        for skill_id in ally.skills:
            sdef = self.companion_skills_pool.get(skill_id)
            if not isinstance(sdef, dict) or skill_id in ally.cooldowns:
                continue
            cost = sdef.get("cost", {}) if isinstance(sdef.get("cost"), dict) else {}
            if ally.focus < int(cost.get("focus", 0)):
                continue
            effect = sdef.get("effect", {}) if isinstance(sdef.get("effect"), dict) else {}
            skill_range = int(sdef.get("range", 1))
            victim = self._nearest_hostile_in_range(state, ally, skill_range)
            target: Combatant | None = None
            applicable = False
            if effect.get("stun"):
                applicable = victim is not None and victim.stunned_turns <= 0
                target = victim
            elif isinstance(effect.get("applies"), dict):
                # Status rider signature (정밀 EMP ⚡감전): useful while the
                # victim lacks at least one of the statuses it would apply.
                applicable = victim is not None and any(
                    sid not in victim.status_effects for sid in effect["applies"]
                )
                target = victim
            elif effect.get("focus_drain"):
                applicable = victim is not None and victim.focus > 0
                target = victim
            elif effect.get("taunt"):
                applicable = ally.taunt_turns <= 0 and len(enemies) >= 2
            elif effect.get("party_speed_bonus"):
                applicable = any(
                    f.speed_buff_turns <= 0 for f in state.friendlies_of(ally)
                )
            elif effect.get("relocate_ally"):
                applicable = any(
                    f.id != ally.id
                    and f.hp <= f.max_hp * 0.5
                    and min(distance(f.x, f.y, e.x, e.y) for e in enemies) <= 1
                    for f in state.friendlies_of(ally)
                )
            elif "defense_bonus" in effect and effect.get("radius"):
                radius = int(effect.get("radius", 1) or 1)
                applicable = any(
                    f.hp <= f.max_hp * 0.7
                    and f.defense_buff_turns <= 0
                    and distance(f.x, f.y, ally.x, ally.y) <= radius
                    for f in state.friendlies_of(ally)
                )
            if applicable:
                return self._execute_npc_skill(state, ally, skill_id, sdef, target)
        return False

    def _ally_turn(self, state: CombatState, ally: Combatant) -> None:
        dice = self._dice(state)
        enemies = state.living_enemies()
        if not enemies:
            return

        # E1 companion signature: fires before the generic archetype heuristics
        # so each companion's identity actually shows up in combat.
        if self._try_signature_cast(state, ally, enemies):
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
            budget = mover.effective_speed
        if "freeze" in mover.status_effects:
            # 냉동 (slice 2): actuators locked — the AI stays put but still acts.
            return
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
        # 냉동 (slice 2): no reachable tiles → the board affordance (bright
        # tiles / drag) honestly shows the unit cannot move this turn.
        if "freeze" in mover.status_effects:
            return []
        tiles: list[list[int]] = []
        for ny in range(state.arena_h):
            for nx in range(state.arena_w):
                if nx == mover.x and ny == mover.y:
                    continue
                if distance(mover.x, mover.y, nx, ny) > mover.effective_speed:
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
