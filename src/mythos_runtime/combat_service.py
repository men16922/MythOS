"""Combat orchestration over a LoopState (no DB, no UI).

Owns the combat lifecycle inside ``loop.state``:
- ``_combat``    : serialized CombatState while a fight is active.
- ``_party``     : player HP carried across encounters (roguelike persistence).
- ``_inventory`` : items the player holds (loot lands here on victory).
- ``_run``       : run meta (encounters_cleared, dead).

Engine-authoritative: this layer never decides hit/damage/movement — it calls
``CombatEngine`` for that and only manages persistence, loot, and the
narration/radar payloads the runtime + UI consume. Pure given the loop seed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from typing import Any

from mythos_combat import (
    CombatEngine,
    PlayerAction,
    build_ally_combatant,
    build_encounter,
    build_player_combatant,
    combat_state_from_dict,
    combat_state_to_dict,
    loadout_for_archetype,
    narrate_since,
    render_radar,
    serialize_combat_log,
)
from mythos_combat.models import Combatant, CombatState
from mythos_core import LoopState
from mythos_core.dice import Dice
from mythos_runtime.boons import RUN_BOONS_KEY
from mythos_runtime.companion_growth import growth_bonus

_DICE_SPEC = re.compile(r"^(\d*)d(\d+)(?:([+-])(\d+))?$", re.IGNORECASE)
_RANKED_EFFECT_KEYS = {
    "damage",
    "damage_bonus",
    "heal",
    "shield",
    "defense_bonus",
    "move",
    "armor_pen",
    "to_hit_bonus",
    "speed_bonus",
    "crit_bonus",
}


def skill_rank_bonuses(rank: int) -> dict[str, int]:
    """System-wide skill scaling: potency each rank, efficiency at ranks 2/3."""
    rank = max(1, int(rank))
    return {
        "power": rank - 1,
        "focus_reduction": 1 if rank >= 2 else 0,
        "cooldown_reduction": 1 if rank >= 3 else 0,
    }


def _ranked_value(value: Any, bonus: int) -> Any:
    if bonus <= 0:
        return value
    if isinstance(value, bool):
        return value
    if isinstance(value, int | float):
        return value + bonus
    if isinstance(value, str):
        match = _DICE_SPEC.fullmatch(value.replace(" ", ""))
        if match:
            count = match.group(1) or "1"
            sides = match.group(2)
            modifier = int(match.group(4) or 0) * (-1 if match.group(3) == "-" else 1)
            total = modifier + bonus
            suffix = f"{total:+d}" if total else ""
            return f"{count}d{sides}{suffix}"
    return value


def ranked_skill_definition(skill_def: Any, rank: int) -> dict[str, Any] | None:
    """Return the exact combat definition for a learned skill at ``rank``."""
    if not isinstance(skill_def, dict):
        return None
    bonuses = skill_rank_bonuses(rank)
    ranked = dict(skill_def)
    effect = dict(skill_def.get("effect", {})) if isinstance(skill_def.get("effect"), dict) else {}
    for key in _RANKED_EFFECT_KEYS & effect.keys():
        effect[key] = _ranked_value(effect[key], bonuses["power"])
    ranked["effect"] = effect
    cost = dict(skill_def.get("cost", {})) if isinstance(skill_def.get("cost"), dict) else {}
    if isinstance(cost.get("focus"), int | float):
        cost["focus"] = max(1, int(cost["focus"]) - bonuses["focus_reduction"])
    ranked["cost"] = cost
    ranked["cooldown"] = max(
        0, int(skill_def.get("cooldown", 0)) - bonuses["cooldown_reduction"]
    )
    ranked["rank"] = max(1, int(rank))
    ranked["rank_bonuses"] = bonuses
    return ranked


@dataclass
class CombatTurnResult:
    loop: LoopState
    prose: str
    radar: dict[str, Any]
    available: dict[str, Any]
    finished: bool
    outcome: str | None = None
    rewards: dict[str, Any] = field(default_factory=dict)
    # Structured combat log + deterministic terrain for the web client's
    # per-hit cinematic / board rendering (mirrors CombatState fields).
    log: list[dict[str, Any]] = field(default_factory=list)
    elevations: dict[str, int] = field(default_factory=dict)
    covers: dict[str, str] = field(default_factory=dict)
    hazards: dict[str, str] = field(default_factory=dict)


class CombatService:
    def __init__(self, engine: CombatEngine | None = None) -> None:
        self.engine = engine or CombatEngine()

    # --- state helpers --------------------------------------------------
    @staticmethod
    def is_active(loop: LoopState) -> bool:
        data = loop.state.get("_combat") if isinstance(loop.state, dict) else None
        return bool(isinstance(data, dict) and data.get("active"))

    @staticmethod
    def load_state(loop: LoopState) -> CombatState | None:
        data = loop.state.get("_combat") if isinstance(loop.state, dict) else None
        if not isinstance(data, dict):
            return None
        return combat_state_from_dict(data)

    # --- lifecycle ------------------------------------------------------
    def begin(
        self,
        loop: LoopState,
        *,
        scenario_combat: dict[str, Any],
        encounter_id: str,
        player_name: str,
        player_stats: dict[str, int],
        archetype: str | None,
        seed: str | None = None,
        language: str = "ko",
        exclude_ally_ids: frozenset[str] | set[str] = frozenset(),
    ) -> CombatTurnResult:
        weapon_ids = loadout_for_archetype(scenario_combat, archetype)
        skill_ids = self._player_skill_ids(loop, scenario_combat, archetype)
        player = build_player_combatant(
            combatant_id="player",
            name=player_name,
            stats=player_stats,
            weapon_ids=weapon_ids,
            weapons_pool=scenario_combat.get("weapons", {}),
            x=0,
            y=0,
            hp=self._carried_hp(loop),
            skills=skill_ids,
        )
        player.portrait = "characters/player-noise.png"
        allies = self._build_allies(loop, scenario_combat, exclude_ally_ids=exclude_ally_ids)
        combat_seed = seed or f"{loop.seed}:combat:{encounter_id}"
        # Meta scaling input: the boss keeps pace with cross-loop player growth
        # (encounters opt in via ``meta_scaling``; first loop = no-op).
        meta = loop.state.get("meta_progression") if isinstance(loop.state, dict) else None
        runs_completed = int(meta.get("runs_completed", 0)) if isinstance(meta, dict) else 0
        state = build_encounter(
            scenario_combat,
            encounter_id,
            player=player,
            allies=allies,
            seed=combat_seed,
            engine=self.engine,
            language=language,
            runs_completed=runs_completed,
        )
        loop = self._store_combat(loop, state)
        prose = narrate_since(state, 0)
        return self._build_result(loop, state, prose, scenario_combat)

    def act(
        self,
        loop: LoopState,
        action: PlayerAction,
        *,
        scenario_combat: dict[str, Any],
    ) -> CombatTurnResult:
        state = self.load_state(loop)
        if state is None or not state.active:
            raise RuntimeError("no active combat for this loop")

        inventory = list(loop.state.get("_inventory", [])) if isinstance(loop.state, dict) else []
        skill_def: dict[str, Any] | None = None
        item_def: dict[str, Any] | None = None
        item_available = False
        if action.type == "skill" and action.skill_id:
            # Companion signatures live in a separate pool (never in the player
            # skill tree) — a controllable companion can still cast them.
            skill_def = scenario_combat.get("skills", {}).get(action.skill_id) or (
                scenario_combat.get("companion_skills", {}) or {}
            ).get(action.skill_id)
            skill_def = ranked_skill_definition(
                skill_def,
                self._player_skill_rank(loop, action.skill_id),
            )
            cost = skill_def.get("cost", {}) if isinstance(skill_def, dict) else {}
            item_cost = cost.get("item") if isinstance(cost, dict) else None
            item_available = self._has_item(inventory, str(item_cost)) if item_cost else True
        elif action.type == "item" and action.item_id:
            item_def = scenario_combat.get("items", {}).get(action.item_id)
            item_available = self._has_item(inventory, action.item_id)

        before = len(state.log)
        state = self.engine.take_player_turn(
            state, action, skill_def=skill_def, item_def=item_def, item_available=item_available
        )

        # Consume any items the engine flagged as used this turn (detail["consumed"]).
        inventory_changed = False
        for entry in state.log[before:]:
            consumed = entry.detail.get("consumed") if isinstance(entry.detail, dict) else None
            if consumed:
                inventory, removed = self._remove_item(inventory, str(consumed))
                inventory_changed = inventory_changed or removed

        prose = narrate_since(state, before)
        loop = self._store_combat(loop, state, inventory if inventory_changed else None)
        return self._build_result(loop, state, prose, scenario_combat)

    # --- internals ------------------------------------------------------
    def _build_result(
        self,
        loop: LoopState,
        state: CombatState,
        prose: str,
        scenario_combat: dict[str, Any],
    ) -> CombatTurnResult:
        # Plan the enemies' next moves BEFORE snapshotting the radar so the board's
        # full telegraph (⚔ dice cost + attacker→target connector) reflects what the
        # enemies will actually do on the upcoming turn. available_actions() runs the
        # intent planner (update_enemy_intents); calling render_radar first serialized
        # stale intents from the previous cycle (enemies had since moved) or an empty
        # list at combat start, so the telegraph never updated. session.py builds the
        # snapshot in this same order.
        available = self.engine.available_actions(state) if state.active else {}
        # Flag each skill's consumable availability so the action bar can disable
        # an item-gated skill (e.g. patch_protocol needs a nanopatch) instead of
        # letting the player press a no-op. The engine plans skills without the
        # inventory, so annotate here where loop.state._inventory is in scope.
        skills = available.get("skills") if isinstance(available, dict) else None
        if skills:
            inv = loop.state.get("_inventory", []) if isinstance(loop.state, dict) else []
            for sk in skills:
                item_cost = (sk.get("cost") or {}).get("item")
                sk["item_available"] = self._has_item(inv, str(item_cost)) if item_cost else True
        radar = render_radar(state)
        log = serialize_combat_log(state.log)
        terrain: dict[str, Any] = {
            "elevations": dict(state.elevations),
            "covers": dict(state.covers),
            "hazards": dict(state.hazards),
        }
        if state.active:
            return CombatTurnResult(
                loop=loop,
                prose=prose,
                radar=radar,
                available=available,
                finished=False,
                log=log,
                **terrain,
            )
        loop, rewards = self._finish(loop, state, scenario_combat)
        return CombatTurnResult(
            loop=loop,
            prose=prose,
            radar=radar,
            available={},
            finished=True,
            outcome=state.outcome,
            rewards=rewards,
            log=log,
            **terrain,
        )

    def _finish(
        self, loop: LoopState, state: CombatState, scenario_combat: dict[str, Any]
    ) -> tuple[LoopState, dict[str, Any]]:
        item_defs = scenario_combat.get("items", {})
        granted: list[str] = []
        if state.outcome == "player_victory":
            dice = Dice(f"{state.seed}:loot")
            for combatant in state.combatants:
                if combatant.faction == "enemy" and not combatant.alive and combatant.loot_table:
                    drop = self._roll_loot(scenario_combat, combatant.loot_table, dice)
                    if drop:
                        granted.append(drop)

        inventory = list(loop.state.get("_inventory", [])) if isinstance(loop.state, dict) else []
        for item_id in granted:
            inventory.append(item_defs.get(item_id, {"id": item_id, "name": item_id}))

        run = dict(loop.state.get("_run", {})) if isinstance(loop.state, dict) else {}
        if state.outcome == "player_victory":
            run["encounters_cleared"] = int(run.get("encounters_cleared", 0)) + 1
        if state.outcome == "player_defeat":
            run["dead"] = True

        player = state.player()
        party = self._finish_party_state(loop, state, player.hp if player else 0)

        new_state = dict(loop.state) if isinstance(loop.state, dict) else {}
        new_state["_combat"] = combat_state_to_dict(state)
        new_state["_inventory"] = inventory
        new_state["_run"] = run
        new_state["_party"] = party

        encounter = scenario_combat.get("encounters", {}).get(state.encounter_id, {})
        rewards = {
            "outcome": state.outcome,
            "items": granted,
            "encounter_reward": encounter.get("reward", {}),
        }
        return replace(loop, state=new_state), rewards

    def _store_combat(
        self, loop: LoopState, state: CombatState, inventory: list[Any] | None = None
    ) -> LoopState:
        new_state = dict(loop.state) if isinstance(loop.state, dict) else {}
        new_state["_combat"] = combat_state_to_dict(state)
        if inventory is not None:
            new_state["_inventory"] = inventory
        return replace(loop, state=new_state)

    def _build_allies(
        self,
        loop: LoopState,
        scenario_combat: dict[str, Any],
        *,
        exclude_ally_ids: frozenset[str] | set[str] = frozenset(),
    ) -> list[Combatant]:
        allies_pool = scenario_combat.get("allies", {})
        if not isinstance(allies_pool, dict):
            return []
        weapons_pool = scenario_combat.get("weapons", {})
        state = loop.state if isinstance(loop.state, dict) else {}
        party = state.get("_party")
        party = party if isinstance(party, dict) else {}
        members = self._party_members(party)
        flags = set(state.get("flags", []))
        # Companion growth inputs: cross-loop affection + meta milestones, plus
        # this run's party-targeted boons (see ``companion_growth``).
        relationships = state.get("relationships")
        relationships = relationships if isinstance(relationships, dict) else {}
        meta_progression = state.get("meta_progression")
        run_boons = state.get(RUN_BOONS_KEY)
        built = []
        # Exclusive roster (combat simulator): when the caller pinned the party
        # explicitly, story-flag allies do not auto-join.
        exclusive = bool(party.get("exclusive"))
        for ally_id, entry in allies_pool.items():
            if not isinstance(entry, dict):
                continue
            actual_id = str(entry.get("id", ally_id))
            member = members.get(actual_id)
            unlock_flags = {str(flag) for flag in entry.get("unlock_flags", [])}
            unlocked = bool(member) or (not exclusive and bool(unlock_flags.intersection(flags)))
            if not unlocked:
                continue
            # C3 unheralded hold (owner 2026-07-11): a flag-only ally the narration
            # has never referenced this loop is held out of the fight instead of
            # popping in with a join signal — they join the first combat AFTER the
            # prose introduces them. Party members are never held (joining the
            # party is always an on-screen event).
            if not member and actual_id in exclude_ally_ids:
                continue
            hp = member.get("hp") if isinstance(member, dict) else None
            # A member downed in a previous fight is not lost for the loop — they
            # limp back into the next encounter at a quarter of their max HP
            # (min 1) instead of sitting the rest of the run out.
            downed = isinstance(hp, int | float) and int(hp) <= 0
            # Party members (in _party.members) are player-controllable; allies
            # unlocked only via story flags stay AI-driven.
            is_party_member = bool(member)
            growth = growth_bonus(
                entry=entry,
                affection=relationships.get(actual_id),
                meta_progression=meta_progression,
                run_boons=run_boons,
            )
            # Companion-worn gear (inventory entries equipped_by=<ally id>)
            # folds into the same bonus channel as growth, so equipment scales
            # defense/speed/focus like it does for the player.
            bonus_stats = dict(growth.stats)
            for stat, value in self._worn_equipment_stats(
                state, scenario_combat, actual_id
            ).items():
                bonus_stats[stat] = bonus_stats.get(stat, 0) + value
            # E1: the companion's signature skill (data-driven, separate pool)
            # rides along with growth-granted skills.
            extra_skills = list(growth.skills)
            signature = str(entry.get("signature") or "")
            if signature and signature not in extra_skills:
                extra_skills.append(signature)
            combatant = build_ally_combatant(
                entry=entry,
                weapons_pool=weapons_pool,
                x=0,
                y=0,
                hp=None if downed else (int(hp) if isinstance(hp, int | float) else None),
                controllable=is_party_member,
                bonus_stats=bonus_stats,
                bonus_hp=growth.hp,
                extra_skills=extra_skills,
            )
            if downed:
                combatant.hp = max(1, combatant.max_hp // 4)
            built.append(combatant)
        return built

    @staticmethod
    def _worn_equipment_stats(
        state: dict[str, Any], scenario_combat: dict[str, Any], wearer_id: str
    ) -> dict[str, int]:
        """Stat bonuses from inventory equipment worn by ``wearer_id``."""
        items = scenario_combat.get("items", {}) if isinstance(scenario_combat, dict) else {}
        inventory = state.get("_inventory", []) if isinstance(state, dict) else []
        total: dict[str, int] = {}
        for entry in inventory:
            if not isinstance(entry, dict) or not entry.get("equipped"):
                continue
            if str(entry.get("equipped_by") or "player") != wearer_id:
                continue
            definition = items.get(str(entry.get("id") or entry.get("item_id") or ""), {})
            bonus = definition.get("stats") if isinstance(definition, dict) else None
            if isinstance(bonus, dict):
                for stat, value in bonus.items():
                    if isinstance(value, int | float):
                        total[stat] = total.get(stat, 0) + int(value)
        return total

    @staticmethod
    def _player_skill_rank(loop: LoopState, skill_id: str) -> int:
        state = loop.state if isinstance(loop.state, dict) else {}
        meta = state.get("meta_progression")
        ranks = meta.get("skill_ranks") if isinstance(meta, dict) else {}
        try:
            return max(1, int(ranks.get(skill_id, 1))) if isinstance(ranks, dict) else 1
        except (TypeError, ValueError):
            return 1

    @staticmethod
    def _player_skill_ids(
        loop: LoopState,
        scenario_combat: dict[str, Any],
        archetype: str | None,
    ) -> list[str]:
        skills_pool = scenario_combat.get("skills", {})
        if not isinstance(skills_pool, dict):
            return []
        valid_ids = set(skills_pool.keys())
        state = loop.state if isinstance(loop.state, dict) else {}
        meta = state.get("meta_progression")
        meta = meta if isinstance(meta, dict) else {}
        learned = [
            skill_id
            for skill_id in _string_list(meta.get("learned_skills"))
            if skill_id in valid_ids
        ]
        base: list[str] = []
        base_by_archetype = scenario_combat.get("archetype_base_skills", {})
        if isinstance(base_by_archetype, dict) and archetype:
            base = [
                skill_id
                for skill_id in _string_list(base_by_archetype.get(archetype))
                if skill_id in valid_ids
            ]

        if not base:
            base = [
                skill_id
                for skill_id in _string_list(scenario_combat.get("base_skills"))
                if skill_id in valid_ids
            ]

        filtered = _ordered_unique([*base, *learned])
        return filtered if filtered else list(skills_pool.keys())

    @staticmethod
    def _party_members(party: dict[str, Any]) -> dict[str, dict[str, Any]]:
        raw = party.get("members", [])
        members: dict[str, dict[str, Any]] = {}
        if not isinstance(raw, list):
            return members
        for entry in raw:
            if isinstance(entry, str):
                members[entry] = {"id": entry}
            elif isinstance(entry, dict):
                member_id = str(entry.get("id", ""))
                if member_id:
                    members[member_id] = dict(entry)
        return members

    def _finish_party_state(
        self, loop: LoopState, state: CombatState, player_hp: int
    ) -> dict[str, Any]:
        previous = loop.state.get("_party") if isinstance(loop.state, dict) else None
        previous = previous if isinstance(previous, dict) else {}
        members_by_id = self._party_members(previous)
        for combatant in state.combatants:
            if combatant.faction != "ally":
                continue
            # Only real party members persist. `controllable` was set from
            # `is_party_member` at build (True = already in _party.members via the
            # initial party or a route `party_add`). A story-flag ally (Se-rin via
            # met_se_rin, etc.) co-fights this encounter AI-driven (controllable=
            # False) and must NOT be promoted into the permanent party — that
            # writeback was carrying Se-rin across loops and reintroducing her
            # everywhere (incl. variant openings). Combat only UPDATES existing
            # members' HP; it never recruits.
            if not combatant.controllable:
                continue
            member = members_by_id.get(combatant.id, {"id": combatant.id, "name": combatant.name})
            member["id"] = combatant.id
            member["name"] = combatant.name
            member["hp"] = combatant.hp
            member["max_hp"] = combatant.max_hp
            members_by_id[combatant.id] = member
        player_combatant = state.player()
        player_max_hp = player_combatant.max_hp if player_combatant else player_hp
        party: dict[str, Any] = {
            "player_hp": player_hp,
            "player_max_hp": player_max_hp,
        }
        if members_by_id:
            party["members"] = list(members_by_id.values())
        return party

    @staticmethod
    def _item_id(entry: Any) -> str:
        if isinstance(entry, dict):
            return str(entry.get("id") or entry.get("item_id") or "")
        return str(entry)

    @classmethod
    def _has_item(cls, inventory: list[Any], item_id: str) -> bool:
        return any(cls._item_id(entry) == item_id for entry in inventory)

    @classmethod
    def _remove_item(cls, inventory: list[Any], item_id: str) -> tuple[list[Any], bool]:
        out: list[Any] = []
        removed = False
        for entry in inventory:
            if not removed and cls._item_id(entry) == item_id:
                removed = True
                continue
            out.append(entry)
        return out, removed

    def _carried_hp(self, loop: LoopState) -> int | None:
        party = loop.state.get("_party") if isinstance(loop.state, dict) else None
        if isinstance(party, dict):
            hp = party.get("player_hp")
            if isinstance(hp, int) and hp > 0:
                return hp
        return None

    def _roll_loot(self, scenario_combat: dict[str, Any], table_id: str, dice: Dice) -> str | None:
        table = scenario_combat.get("loot_tables", {}).get(table_id)
        if not table:
            return None
        # An authored loot-table entry missing "item" must not crash the whole
        # combat-turn commit (lost progress) — skip it, mirroring the tolerant
        # ``.get`` on the sibling "weight" key.
        rows = [entry for entry in table if isinstance(entry, dict) and "item" in entry]
        items = [entry["item"] for entry in rows]
        weights = [float(entry.get("weight", 1)) for entry in rows]
        if not items:
            return None
        return str(dice.weighted_choice(items, weights))


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


def _ordered_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


__all__ = ["CombatService", "CombatTurnResult"]
