from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, cast

from mythos_core.models import from_json_dict, to_json_dict

# Faction tags
PLAYER = "player"
ALLY = "ally"
ENEMY = "enemy"


def distance(ax: int, ay: int, bx: int, by: int) -> int:
    """Chebyshev (king-move) distance so the radar grid maps 1:1 to range."""
    return max(abs(ax - bx), abs(ay - by))


@dataclass
class Weapon:
    id: str
    name: str
    kind: str = "melee"  # "melee" | "ranged"
    damage: str = "1d6"  # dice notation
    reach: int = 1  # melee reach in tiles
    range: int = 0  # ranged distance in tiles (0 = melee only)
    to_hit_bonus: int = 0
    armor_pen: int = 0

    @property
    def is_ranged(self) -> bool:
        return self.kind == "ranged" and self.range > 0

    @property
    def effective_range(self) -> int:
        return self.range if self.is_ranged else self.reach


@dataclass
class Combatant:
    id: str
    name: str
    faction: str
    hp: int
    max_hp: int
    x: int
    y: int
    stats: dict[str, int] = field(default_factory=dict)
    defense: int = 10
    speed: int = 4
    armor: int = 0
    weapons: list[Weapon] = field(default_factory=list)
    ai: str = "melee"  # "melee" | "ranged" | "coward" | "player"
    blip: str = "●"
    status: list[str] = field(default_factory=list)
    initiative: int = 0
    defending: bool = False
    alive: bool = True
    loot_table: str | None = None
    portrait: str = ""
    combat_images: dict[str, str] = field(default_factory=dict)
    focus: int = 0  # skill resource (spent on skills, regen each round)
    max_focus: int = 0
    skills: list[str] = field(default_factory=list)  # skill ids the combatant can use
    cooldowns: dict[str, int] = field(default_factory=dict)  # skill_id -> rounds remaining
    defense_buff: int = 0  # temporary defense bonus from skills (e.g. covering_noise)
    defense_buff_turns: int = 0  # rounds the defense_buff persists
    stunned_turns: int = 0  # turns this combatant loses to stun (EMP pulse/grenade)
    speed_buff: int = 0  # temporary movement bonus (E1 han signature)
    speed_buff_turns: int = 0  # rounds the speed_buff persists
    taunt_turns: int = 0  # rounds enemies must target this combatant (E1 tae_o signature)
    controllable: bool = False  # party member the player drives directly (vs AI ally)
    enraged: bool = False  # boss phase-2 flag: set once HP crosses the enrage threshold

    @property
    def is_player(self) -> bool:
        return self.faction == PLAYER

    @property
    def is_controllable(self) -> bool:
        """The player themselves, or a party member the player commands directly."""
        return self.faction == PLAYER or self.controllable

    @property
    def effective_defense(self) -> int:
        return self.defense + (4 if self.defending else 0) + max(0, self.defense_buff)

    @property
    def effective_speed(self) -> int:
        return self.speed + max(0, self.speed_buff)

    def stat(self, name: str) -> int:
        return int(self.stats.get(name, 0))

    def primary_weapon(self) -> Weapon | None:
        return self.weapons[0] if self.weapons else None


@dataclass
class EnemyIntent:
    enemy_id: str
    action: str  # "attack" | "move" | "flee" | "idle"
    target_x: int
    target_y: int
    target_name: str | None = None
    # Full telegraph (combat P0 2026-07-11): what the announced attack will
    # cost, as the weapon's dice notation (e.g. "2d6") — the threatened tile
    # reads "⚔ 2d6" instead of a bare threat icon.
    damage_hint: str | None = None


@dataclass
class CombatLogEntry:
    round: int
    actor: str
    actor_name: str
    action: str  # start|attack|hit|miss|move|defeat|defend|flee|item|end|info
    text: str
    detail: dict[str, Any] = field(default_factory=dict)


@dataclass
class CombatState:
    active: bool
    round: int
    arena_w: int
    arena_h: int
    combatants: list[Combatant]
    order: list[str] = field(default_factory=list)
    turn_ptr: int = 0
    log: list[CombatLogEntry] = field(default_factory=list)
    outcome: str | None = None  # None|player_victory|player_defeat|player_fled
    seed: str = ""
    rng_cursor: int = 0
    encounter_id: str | None = None
    enemy_intents: list[EnemyIntent] = field(default_factory=list)
    elevations: dict[str, int] = field(default_factory=dict)
    covers: dict[str, str] = field(default_factory=dict)
    hazards: dict[str, str] = field(default_factory=dict)
    # E2 boss telegraphs: announced strikes that resolve on the caster's NEXT
    # turn against marked tiles — dodgeable by moving off them.
    # [{"caster", "name", "tiles": [[x, y], ...], "damage"}]
    telegraphs: list[dict[str, Any]] = field(default_factory=list)
    # Active player language for combat-log prose ("ko" default → behavior-preserving).
    language: str = "ko"

    def by_id(self, combatant_id: str | None) -> Combatant | None:
        return next((c for c in self.combatants if c.id == combatant_id), None)

    def living(self, faction: str | None = None) -> list[Combatant]:
        return [c for c in self.combatants if c.alive and (faction is None or c.faction == faction)]

    def player(self) -> Combatant | None:
        return next((c for c in self.combatants if c.is_player), None)

    def active_actor(self) -> Combatant | None:
        """Combatant whose turn it is, per ``turn_ptr`` into the initiative order."""
        if not self.order or not (0 <= self.turn_ptr < len(self.order)):
            return None
        return self.by_id(self.order[self.turn_ptr])

    def living_controllables(self) -> list[Combatant]:
        """Living player-driven combatants (player + party); empty ⇒ defeat."""
        return [c for c in self.combatants if c.alive and c.is_controllable]

    def living_enemies(self) -> list[Combatant]:
        return self.living(ENEMY)

    def hostiles_of(self, combatant: Combatant) -> list[Combatant]:
        if combatant.faction == ENEMY:
            return [c for c in self.combatants if c.alive and c.faction in (PLAYER, ALLY)]
        return self.living(ENEMY)

    def friendlies_of(self, combatant: Combatant) -> list[Combatant]:
        """Living units on ``combatant``'s side (includes the combatant itself)."""
        if combatant.faction == ENEMY:
            return self.living(ENEMY)
        return [c for c in self.combatants if c.alive and c.faction in (PLAYER, ALLY)]


def combat_state_to_dict(state: CombatState) -> dict[str, Any]:
    return cast(dict[str, Any], to_json_dict(state))


def combat_state_from_dict(data: dict[str, Any]) -> CombatState:
    return from_json_dict(CombatState, data)
