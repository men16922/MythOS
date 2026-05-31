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

from dataclasses import dataclass, field, replace
from typing import Any

from mythos_combat import (
    CombatEngine,
    PlayerAction,
    build_encounter,
    build_player_combatant,
    combat_state_from_dict,
    combat_state_to_dict,
    loadout_for_archetype,
    narrate_since,
    render_radar,
)
from mythos_combat.models import CombatState
from mythos_core import LoopState
from mythos_core.dice import Dice


@dataclass
class CombatTurnResult:
    loop: LoopState
    prose: str
    radar: dict[str, Any]
    available: dict[str, Any]
    finished: bool
    outcome: str | None = None
    rewards: dict[str, Any] = field(default_factory=dict)


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
    ) -> CombatTurnResult:
        weapon_ids = loadout_for_archetype(scenario_combat, archetype)
        player = build_player_combatant(
            combatant_id="player",
            name=player_name,
            stats=player_stats,
            weapon_ids=weapon_ids,
            weapons_pool=scenario_combat.get("weapons", {}),
            x=0,
            y=0,
            hp=self._carried_hp(loop),
        )
        combat_seed = seed or f"{loop.seed}:combat:{encounter_id}"
        state = build_encounter(
            scenario_combat, encounter_id, player=player, seed=combat_seed, engine=self.engine
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
        before = len(state.log)
        state = self.engine.take_player_turn(state, action)
        prose = narrate_since(state, before)
        loop = self._store_combat(loop, state)
        return self._build_result(loop, state, prose, scenario_combat)

    # --- internals ------------------------------------------------------
    def _build_result(
        self,
        loop: LoopState,
        state: CombatState,
        prose: str,
        scenario_combat: dict[str, Any],
    ) -> CombatTurnResult:
        radar = render_radar(state)
        if state.active:
            return CombatTurnResult(
                loop=loop,
                prose=prose,
                radar=radar,
                available=self.engine.available_actions(state),
                finished=False,
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
        party = {"player_hp": player.hp if player else 0}

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

    def _store_combat(self, loop: LoopState, state: CombatState) -> LoopState:
        new_state = dict(loop.state) if isinstance(loop.state, dict) else {}
        new_state["_combat"] = combat_state_to_dict(state)
        return replace(loop, state=new_state)

    def _carried_hp(self, loop: LoopState) -> int | None:
        party = loop.state.get("_party") if isinstance(loop.state, dict) else None
        if isinstance(party, dict):
            hp = party.get("player_hp")
            if isinstance(hp, int) and hp > 0:
                return hp
        return None

    def _roll_loot(
        self, scenario_combat: dict[str, Any], table_id: str, dice: Dice
    ) -> str | None:
        table = scenario_combat.get("loot_tables", {}).get(table_id)
        if not table:
            return None
        items = [entry["item"] for entry in table]
        weights = [float(entry.get("weight", 1)) for entry in table]
        if not items:
            return None
        return str(dice.weighted_choice(items, weights))


__all__ = ["CombatService", "CombatTurnResult"]
