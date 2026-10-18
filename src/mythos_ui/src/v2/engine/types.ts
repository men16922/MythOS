// Mythos 2.0 — shared engine contract.
//
// Everything in `v2/engine` and `v2/content` is pure TypeScript: no DOM, no React,
// no network. State is plain JSON (save/load = JSON.stringify), every random draw
// goes through the seeded RNG in `rng.ts`, and every reducer is
// `(state, ...args) => newState` (clone, mutate the clone, return it).
// Imports inside engine/content use explicit `.ts` extensions so `node --test`
// (native type stripping) can run the tests without a bundler.

// ---------------------------------------------------------------- basics

export type Lang = 'ko' | 'en'
/** Bilingual text. Both languages are always authored. */
export interface Text {
  ko: string
  en: string
}

export interface Pos {
  x: number
  y: number
}
export type Dir = 'up' | 'down' | 'left' | 'right'

/** Board is GRID_W columns × GRID_H rows. Party deploys on the left (x 0-1), enemies on the right. */
export const GRID_W = 7
export const GRID_H = 5

export type StatKey = 'str' | 'agi' | 'int' | 'cha' | 'obs'
export type Stats = Record<StatKey, number>

export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special'

// ---------------------------------------------------------------- board

/**
 * floor  – walkable.
 * cover  – blocks movement and projectiles; has hp (default 2); destroyed → floor.
 * hazard – electrified: a unit that ends the enemy phase on it, or is pushed onto it, takes 2 damage.
 * void   – broken grid: an ENEMY (non-flying) pushed into it is destroyed ("deleted").
 *          Party units can never enter void (it acts like a wall for them: bump damage).
 *
 * Ground effects (on floor/hazard tiles, from `ignite` / `electrify` effects):
 * fire N  – burning ground for N more enemy phases. A grounded unit that ENTERS it (move/push/teleport/swap end)
 *           or stands on it when the enemy phase ends gains Burn 2 (FIRE_BURN). Goes out at 0.
 * ttl N   – a temporary hazard (electrified by `electrify`): reverts to floor after N more enemy phases.
 *           Permanent (authored) hazards have no ttl.
 */
export type TileKind = 'floor' | 'cover' | 'hazard' | 'void'
export interface Tile {
  kind: TileKind
  hp?: number
  /** Burning ground: enemy phases left (see above). */
  fire?: number
  /** Temporary hazard: enemy phases left before it reverts to floor. */
  ttl?: number
}

// ---------------------------------------------------------------- statuses

/**
 * burn   N : at the end of each enemy phase the unit takes N damage (ignores block), then N -= 1.
 * shock  N : enemy — its intent fizzles when it would fire and it does not move; party — cannot move.
 *            Decrements by 1 at the end of that side's phase.
 * mark   N : the next damage instance this unit takes is increased by N, then mark is removed.
 * weak   N : this unit's outgoing damage is reduced by 2 (min 0) for N of its phases.
 * guard  N : party only — gains N block at the start of each player turn (a "power").
 * thorns N : when hit by a melee/charge attack, the attacker takes N damage.
 */
export type StatusKind = 'burn' | 'shock' | 'mark' | 'weak' | 'guard' | 'thorns'
export type Statuses = Partial<Record<StatusKind, number>>

// ---------------------------------------------------------------- effects

/**
 * Who an effect applies to.
 * target     – the unit(s) on the chosen/affected tile(s) (default). For `area` effects, every tile in the area.
 * owner      – the unit playing the card / the enemy firing the move / the connector for run triggers.
 * connector  – the player character.
 * all_enemies / all_allies – every living unit of that side ("allies" = party, from the player's view).
 * random_enemy – one living enemy chosen with the combat RNG.
 */
export type EffectScope = 'target' | 'owner' | 'connector' | 'all_enemies' | 'all_allies' | 'random_enemy'

/**
 * Area around the impact tile.
 * single   – just the tile.
 * cross    – tile + 4 orthogonal neighbours.
 * adjacent – the 4 orthogonal neighbours only (not the tile itself).
 * square   – 3×3 around the tile.
 * row      – tile + the two tiles perpendicular to the attack direction (a 3-wide "sweep").
 */
export type AreaShape = 'single' | 'cross' | 'adjacent' | 'square' | 'row'

export type Effect =
  /** Damage. `bonusVsMarked` adds damage when the victim is marked (on top of mark itself). */
  | { kind: 'damage'; amount: number; to?: EffectScope; area?: AreaShape; pierce?: boolean; bonusVsMarked?: number }
  /**
   * Push 1+ tiles. 'away' = away from the owner (for area effects: away from the impact centre),
   * 'toward' = toward the owner (pull). A push into cover/unit/wall/edge stops the unit and BOTH take 1
   * bump damage (cover loses 1 hp). Enemies pushed into void are destroyed; party units treat void as a wall.
   */
  /** `slam` adds that much to the bump damage when this push ends against a wall / cover / unit (both sides). */
  | { kind: 'push'; dir: 'away' | 'toward'; distance?: number; to?: EffectScope; area?: AreaShape; slam?: number }
  | { kind: 'block'; amount: number; to?: EffectScope }
  | { kind: 'heal'; amount: number; to?: EffectScope }
  | { kind: 'status'; status: StatusKind; amount: number; to?: EffectScope; area?: AreaShape }
  | { kind: 'draw'; amount: number }
  | { kind: 'energy'; amount: number }
  /** Owner teleports to the target tile (must be empty floor/hazard). */
  | { kind: 'teleport' }
  /** Owner swaps positions with the target unit (any side). */
  | { kind: 'swap' }
  /** Target enemy's intent is turned around 180° (relative patterns) or re-aimed at the nearest other enemy (lob). */
  | { kind: 'redirect'; area?: AreaShape }
  /** Target enemy's current intent is cancelled (it still re-telegraphs next enemy phase). */
  | { kind: 'cancel_intent'; area?: AreaShape }
  /** Target empty tile becomes cover with 2 hp. */
  | { kind: 'create_cover'; area?: AreaShape }
  /** Owner may move again this turn. */
  | { kind: 'refund_move'; to?: EffectScope }
  /** Run-level Trace change (IX's detection meter). */
  | { kind: 'trace'; amount: number }
  /** Put a copy of a card into a pile (used by junk/status cards and generators). */
  | { kind: 'add_card'; cardId: string; pile: 'hand' | 'draw' | 'discard'; count?: number }
  /** Gain credits immediately (in combat: banked into the reward). */
  | { kind: 'credits'; amount: number }
  /** Set the ground on fire for `turns` enemy phases (floor/hazard tiles only; never void/cover). */
  | { kind: 'ignite'; turns: number; to?: EffectScope; area?: AreaShape }
  /** Electrify floor tiles into temporary hazards for `turns` enemy phases. */
  | { kind: 'electrify'; turns: number; to?: EffectScope; area?: AreaShape }

// ---------------------------------------------------------------- cards

export type CardType = 'attack' | 'skill' | 'tactic' | 'power' | 'junk'

/**
 * How a card picks its target. Range is Manhattan distance from the ORIGIN unit (the unit playing it).
 * none  – no target; effects use scopes (owner/all_enemies/...).
 * self  – the origin unit.
 * ally  – a party unit (including origin) within range.
 * melee – one of the 4 orthogonally adjacent tiles.
 * line  – projectile: choose a direction; it travels up to `range` tiles and hits the FIRST unit or cover.
 *         The impact tile is the target. If nothing is hit, the last tile in range is the target.
 * beam  – choose a direction; every tile up to `range` is affected (pierces).
 * lob   – artillery: any tile with minRange <= distance <= range (ignores blockers).
 * tile  – any tile within range (`empty` = must be unoccupied floor/hazard; used by teleport/cover).
 */
export type TargetMode =
  | { mode: 'none' }
  | { mode: 'self' }
  | { mode: 'ally'; range: number }
  | { mode: 'melee' }
  | { mode: 'line'; range: number }
  | { mode: 'beam'; range: number }
  | { mode: 'lob'; minRange: number; range: number }
  | { mode: 'tile'; range: number; empty?: boolean }

/** 'any' = playable by whichever party unit is selected (origin). A companion id = only that companion. */
export type CardOwner = 'any' | 'connector' | string

export interface CardFace {
  cost: number // energy; -1 = unplayable (junk)
  text: Text
  target: TargetMode
  effects: Effect[]
  exhaust?: boolean // removed for the rest of the combat after play
  retain?: boolean // not discarded at end of turn
}

export interface CardDef extends CardFace {
  id: string
  name: Text
  type: CardType
  rarity: Rarity
  owner: CardOwner
  /** Upgraded face (Safehouse/Shop/events). Unspecified fields fall back to the base face. */
  upgrade: Partial<CardFace>
  /** Icon path relative to /resources/neo-seoul/ (e.g. 'skills/packet_shot.png'). */
  icon?: string
  /** Synergy tags: 'push', 'hack', 'burn', 'block', 'mark', 'draw', 'move', 'loud', 'companion'. */
  tags?: string[]
  /** Effects applied at the end of the player turn while this card is still in hand (junk with teeth, e.g. Trace Bug). */
  heldEffects?: Effect[]
  /** Meta-unlock pack id. Undefined = in the base pool from the first loop. */
  pack?: string
  /** Archetype id if this is an archetype-exclusive card (only offered when playing that archetype). */
  archetype?: string
}

export interface CardInstance {
  uid: string
  defId: string
  upgraded: boolean
}

// ---------------------------------------------------------------- consumables (in-combat items, free to use)

export interface ConsumableDef {
  id: string
  name: Text
  text: Text
  icon: string // 'items/emp_grenade.png'
  target: TargetMode
  effects: Effect[]
  price: number
  rarity: Rarity
}

// ---------------------------------------------------------------- enemies

/**
 * Enemy attack patterns. RELATIVE patterns (melee, line, beam, charge, nova) are anchored to the enemy's
 * position and facing at resolution time: push the enemy and its attack moves with it (it can hit its
 * own side). ABSOLUTE patterns (lob) hit fixed tiles chosen at telegraph time.
 *
 * melee  – the adjacent tile in `dir`.
 * line   – projectile in `dir`, hits the first unit/cover within range.
 * beam   – every tile in `dir` within range.
 * charge – the enemy dashes in `dir` until blocked, then hits the blocker (damage + push 1).
 * nova   – all 4 adjacent tiles (area 'adjacent' around itself) or `area` around itself.
 * lob    – fixed target tile (+ area).
 * buff   – no tiles; applies `effects` with scope owner / all_enemies (from the ENEMY's view `all_allies`
 *          means its own side — see note in engine).
 * summon – spawns `summon` units on free tiles near itself.
 * track  – homing lock-on: hits the targeted UNIT (+ area) wherever it stands when it fires. Cannot be dodged —
 *          only blocked, redirected (re-locks onto the nearest other enemy), cancelled/shocked, or prevented by
 *          killing the shooter. The StS-style counterweight to the dodgeable patterns.
 */
export type IntentPattern = 'melee' | 'line' | 'beam' | 'charge' | 'nova' | 'lob' | 'buff' | 'summon' | 'track'

export interface EnemyMove {
  id: string
  name: Text
  pattern: IntentPattern
  damage?: number
  range?: number
  area?: AreaShape
  /** Extra effects applied to every unit hit (push/status), or for 'buff' the buff itself. */
  effects?: Effect[]
  /** Telegraph turns before it fires. 0 = fires at the next enemy phase (standard). 1 = "charging" one extra round. */
  windup?: number
  /** Enemy phases before this move can be chosen again. */
  cooldown?: number
  /** Relative pick weight among usable moves (default 1). */
  weight?: number
  summon?: { enemyId: string; count: number }
  /** Boss phase gate: only usable at or after this phase index (0-based). */
  minPhase?: number
}

export type EnemyAi =
  | 'brawler' // closes distance, prefers melee/charge
  | 'shooter' // keeps 2-4 distance with a clear line
  | 'artillery' // stays back, lobs at party clusters
  | 'support' // stays behind allies, buffs/shields/summons
  | 'static' // never moves (turrets, spawners)
  | 'boss'

export interface EnemyDef {
  id: string
  name: Text
  /** Sprite base name under enemies/combat/ (e.g. 'enforcer-unit' → enforcer-unit-idle.png …). */
  sprite: string
  tier: 'minion' | 'normal' | 'elite' | 'boss'
  hp: number
  armor?: number // flat damage reduction per hit
  move: number
  flying?: boolean // ignores void/hazard, cannot be pushed into void
  ai: EnemyAi
  moves: EnemyMove[]
  /** One-line rules reminder shown on hover. */
  passive?: Text
  /** Boss phases: when hp drops to or below `hpBelow` (fraction 0-1) enter the phase. */
  phases?: { hpBelow: number; text: Text; heal?: number; effects?: Effect[] }[]
  /** Credits dropped on kill (added to the combat reward). */
  bounty?: number
}

// ---------------------------------------------------------------- encounters

export type Backdrop = 'streets' | 'undercity' | 'industrial' | 'spire'

export type BonusObjective =
  | { kind: 'turn_limit'; turns: number } // win within N player turns
  | { kind: 'untouched' } // connector takes no hp damage
  | { kind: 'environment'; count: number } // kill N enemies by push/bump/void/hazard/friendly fire
  | { kind: 'protect' } // the encounter's neutral unit survives

export interface EncounterDef {
  id: string
  act: 1 | 2 | 3
  kind: 'normal' | 'elite' | 'boss'
  name: Text
  backdrop: Backdrop
  enemies: { id: string; pos: Pos }[]
  /** Hand-placed terrain. Unlisted tiles are floor. */
  terrain?: { pos: Pos; kind: TileKind }[]
  /** Optional neutral unit to protect (uses a companion/civilian sprite). */
  neutral?: { name: Text; sprite: string; hp: number; pos: Pos }
  reinforcements?: { turn: number; enemies: { id: string; pos: Pos }[] }[]
  bonus?: BonusObjective
  /** 'survive' fights end after N enemy phases even if enemies remain. */
  objective?: { kind: 'eliminate' } | { kind: 'survive'; turns: number }
  /** Short line shown on the combat intro banner. */
  intro?: Text
}

// ---------------------------------------------------------------- combat state

export type Side = 'party' | 'enemy' | 'neutral'

export interface IntentState {
  moveId: string
  dir?: Dir
  /** Absolute target tile for lob. */
  target?: Pos
  /** Locked unit for track. */
  targetUid?: string
  /** Remaining extra telegraph rounds before firing. */
  windupLeft: number
}

export interface UnitState {
  uid: string
  /** EnemyDef id, companion id, 'connector', or 'neutral'. */
  defId: string
  side: Side
  name: Text
  /** Sprite key: 'player-noise' / 'se-rin' / 'enforcer-unit' … */
  sprite: string
  pos: Pos
  hp: number
  maxHp: number
  block: number
  armor: number
  move: number
  moved: boolean
  facing: Dir
  statuses: Statuses
  flying?: boolean
  intent?: IntentState | null
  cooldowns?: Record<string, number>
  phase?: number
  /** Who/what last damaged this unit — used for the environment bonus and kill attribution. */
  lastHitBy?: 'party' | 'enemy' | 'environment'
}

export type CombatEvent =
  | { t: 'card'; owner: string; cardId: string; target?: Pos; dir?: Dir }
  | { t: 'move'; uid: string; path: Pos[] }
  | { t: 'teleport'; uid: string; from: Pos; to: Pos }
  | { t: 'attack'; uid: string; moveId: string; tiles: Pos[] }
  /** `cause` tags non-attack damage so the board can show it: burn tick, hazard zap, bump (wall/cover/unit). */
  | { t: 'damage'; uid: string; amount: number; blocked: number; source: 'party' | 'enemy' | 'environment'; cause?: 'burn' | 'hazard' | 'bump' }
  | { t: 'heal'; uid: string; amount: number }
  | { t: 'block'; uid: string; amount: number }
  | { t: 'push'; uid: string; from: Pos; to: Pos; dir: Dir; bumped?: string | 'wall' | 'cover' }
  | { t: 'status'; uid: string; status: StatusKind; amount: number }
  | { t: 'death'; uid: string; cause: 'damage' | 'void' | 'collapse' }
  | { t: 'spawn'; uid: string }
  | { t: 'tile'; pos: Pos; kind: TileKind }
  | { t: 'fizzle'; uid: string }
  | { t: 'phase'; uid: string; phase: number; text: Text }
  | { t: 'turn'; side: 'player' | 'enemy'; turn: number }
  | { t: 'energy'; amount: number }
  | { t: 'draw'; count: number }
  | { t: 'trigger'; implantId: string }
  /** An area effect resolved (card, consumable, enemy move, trigger): every tile of its footprint, for board FX.
   *  `element` is the dominant flavour: fire (burn/ignite) › shock (shock/electrify) › blast (damage) › force (push)
   *  › shield (block) › heal. Emitted once per resolution, before its damage/status events. */
  | { t: 'area'; tiles: Pos[]; center: Pos; element: 'fire' | 'shock' | 'blast' | 'force' | 'shield' | 'heal'; side: 'party' | 'enemy' }
  /** Burning ground changed on a tile (0 = went out). */
  | { t: 'fire'; pos: Pos; turns: number }
  /** A temporary hazard's countdown changed (it reverts with a 'tile' floor event at 0). */
  | { t: 'ttl'; pos: Pos; turns: number }
  /** Cover took damage but still stands (absolute hp left; destruction is a 'tile' floor event). */
  | { t: 'cover'; pos: Pos; hp: number }
  /** A companion's combat passive fired (show its name on that unit). */
  | { t: 'passive'; uid: string; companionId: string }

export interface CombatState {
  encounterId: string
  turn: number // player turn counter, starts at 1
  phase: 'player' | 'won' | 'lost'
  tiles: Tile[][] // tiles[y][x]
  units: UnitState[]
  draw: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  exhaust: CardInstance[]
  energy: number
  maxEnergy: number
  handSize: number
  rng: number
  /** Independent draw-pile and enemy-AI streams (engine/streams.ts). Absent in older saves: everything uses `rng`. */
  streams?: { shuffle: number; ai: number }
  /** Monotonic event log; the UI animates events after the index it last saw. */
  events: CombatEvent[]
  /** Reinforcements arriving at the next enemy phase (shown as warning markers on the board). */
  incoming: { pos: Pos; enemyId: string }[]
  /** Snapshot for undoing the last move (cleared when a card is played). */
  undo?: string | null
  bonus?: { def: BonusObjective; progress: number; failed: boolean }
  /** Credits banked during the fight (bounties, card effects). */
  credits: number
  /** Run-level trace accumulated during the fight (applied to the run on finish). */
  trace: number
  /** Implant ids active in this combat (copied from the run). */
  implants: string[]
  consumables: string[]
  uidCounter: number
  /** Per-combat implant trigger bookkeeping. */
  triggered: Record<string, number>
  stats: { enemiesKilled: number; environmentKills: number; damageDealt: number; damageTaken: number; cardsPlayed: number }
  /** Active CRPG combat twists (conversation mods or boss quest payoffs) applied at fight start. */
  mods?: CombatModId[]
}

export interface PlayTarget {
  pos?: Pos
  dir?: Dir
}

// ---------------------------------------------------------------- implants (relics)

export type TriggerEvent =
  | 'combat_start'
  | 'turn_start'
  | 'turn_end'
  | 'play_attack'
  | 'play_skill'
  | 'play_tactic'
  | 'enemy_killed'
  | 'environment_kill' // enemy died to push/bump/void/hazard/friendly fire
  | 'bump' // any unit bumped
  | 'damage_taken' // connector lost hp
  | 'first_card' // first card each turn
  | 'combat_won'

export interface ImplantPassive {
  maxHp?: number
  energy?: number
  handSize?: number
  move?: number // +move for every party unit
  rewardChoices?: number // extra card options on rewards
  creditMult?: number // e.g. 0.25 = +25% credits
  traceMult?: number // e.g. -0.25 = 25% less trace gained
  restHeal?: number // extra % healed at safehouse
  shopDiscount?: number // 0.2 = 20% off
  stats?: Partial<Stats>
  bumpDamage?: number // extra bump damage
}

/** A companion's in-combat trait. Triggers work like implant triggers but only while the companion is alive and
 *  their effects originate from the companion (scope 'owner' = the companion). */
export interface CombatPassive {
  name: Text
  text: Text
  triggers: { on: TriggerEvent; effects: Effect[]; limit?: 'turn' | 'combat'; ownerOnly?: boolean }[]
}

export interface ImplantDef {
  id: string
  name: Text
  text: Text
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop'
  icon: string
  passive?: ImplantPassive
  triggers?: { on: TriggerEvent; effects: Effect[]; limit?: 'turn' | 'combat' }[]
  pack?: string
}

// ---------------------------------------------------------------- companions & archetypes

export interface CompanionDef {
  id: string
  name: Text
  alias: Text
  role: Text
  /** Sprite base under characters/combat/ ('se-rin'), portrait 'characters/se-rin.png'. */
  sprite: string
  portrait: string
  maxHp: number
  move: number
  /** Cards added to the deck when they join. */
  cards: string[]
  /** Card added at bond level 2 and the upgraded signature at bond 3. */
  bondCards: string[]
  /** Passive the companion brings (Text shown on the party panel). */
  passiveText: Text
  passive?: ImplantPassive
  /** In-combat trait while the companion stands (fires `passive` events). Effects with scope 'owner' hit the companion. */
  combatPassive?: CombatPassive
  /** Short lines for the safehouse bond scene, by bond level 1..3. */
  bondLines: Text[]
  /** Combat barks (random pick). */
  barks: Text[]
  /** Unlocked from the start (Se-rin) or via the Archive. */
  startUnlocked?: boolean
}

export interface ArchetypeDef {
  id: string
  name: Text
  tagline: Text
  description: Text
  stats: Stats
  maxHp: number
  startingDeck: string[]
  startingImplant: string
  startingCredits: number
  startUnlocked?: boolean
  sprite: string // 'player-noise'
}

// ---------------------------------------------------------------- events

export interface Condition {
  minCredits?: number
  minHp?: number
  companion?: string // must have this companion in the party
  companions?: string[] // every one of these companions must be in the party
  noCompanion?: string
  partySizeAtMost?: number
  flag?: string
  notFlag?: string
  minTrace?: number
  maxTrace?: number
  stat?: { stat: StatKey; min: number }
  hasImplant?: string
  /** CRPG (Signal+): the run's background must be this. */
  background?: string
  /** CRPG: quest `id` must have reached `stage` (or later). */
  quest?: { id: string; stage: number }
  /** CRPG: this deployed companion's approval must be at least `min`. */
  approval?: { id: string; min: number }
}

export type RunEffect =
  | { kind: 'hp'; amount: number } // +/- connector hp (cannot kill: min 1 unless `lethal`)
  | { kind: 'maxHp'; amount: number }
  | { kind: 'heal_party'; amount: number }
  | { kind: 'credits'; amount: number }
  | { kind: 'trace'; amount: number }
  | { kind: 'card'; cardId: string } // gain a specific card
  | { kind: 'card_choice'; rarity?: Rarity; count?: number } // opens a card reward
  | { kind: 'remove_card'; count: number } // opens removal picker
  | { kind: 'upgrade_card'; count: number; random?: boolean }
  | { kind: 'implant'; implantId?: string; rarity?: ImplantDef['rarity'] }
  | { kind: 'consumable'; id?: string }
  | { kind: 'companion'; id: string } // recruit (if party has room)
  | { kind: 'bond'; id: string; amount: number }
  | { kind: 'stat'; stat: StatKey; amount: number }
  | { kind: 'flag'; key: string; value?: number }
  | { kind: 'codex'; id: string }
  | { kind: 'junk'; cardId: string; count?: number } // add junk/curse cards
  | { kind: 'combat'; encounterId: string } // start a fight after the outcome
  | { kind: 'echoes'; amount: number } // meta currency earned this run

export interface Outcome {
  text: Text
  effects: RunEffect[]
}

export interface EventOption {
  label: Text
  /** Short consequence hint shown on the button ("-8 HP · +1 rare card"). If omitted the UI derives it. */
  hint?: Text
  requires?: Condition
  /** Stat check. Chance% = clamp(5, 95, 50 + (stat - dc) * 10). */
  check?: { stat: StatKey; dc: number }
  success: Outcome
  failure?: Outcome
}

export interface EventDef {
  id: string
  acts: (1 | 2 | 3)[]
  title: Text
  image: string // 'scenes/night_market.png'
  speaker?: string // companion / character id for portrait
  text: Text
  options: EventOption[]
  requires?: Condition
  weight?: number
  /** Allow the free-text "Improvise" option (AI GM adjudicated). Default true. */
  improvise?: boolean
  /** Context hints for the AI GM narrator. */
  gmHints?: string[]
  /** Show IX's mirror under the text: it politely quotes this run's real choices back (content/ixMirror.ts). */
  ixMirror?: boolean
}

// ---------------------------------------------------------------- map & run

/** 'district' exists only in Signal+ normal runs (one event node per act becomes one, see engine/crpg.ts). */
export type NodeKind = 'combat' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss' | 'district'

export interface MapNode {
  id: string // `a${act}r${row}c${col}`
  row: number // 0..ROWS-1, boss is the last row
  col: number // 0..3
  kind: NodeKind
  next: string[] // ids in row+1
  encounterId?: string // pre-rolled for combat/elite/boss
  eventId?: string // pre-rolled for event
  districtId?: string // pre-rolled for district
}

export interface ActMap {
  act: 1 | 2 | 3
  rows: number
  nodes: Record<string, MapNode>
  startIds: string[]
  bossId: string
}

export interface PartyMember {
  id: string // companion id
  hp: number
  maxHp: number
  bond: number // 0..3 this run
}

export interface ShopStock {
  cards: { cardId: string; price: number; sold: boolean }[]
  implants: { implantId: string; price: number; sold: boolean }[]
  consumables: { id: string; price: number; sold: boolean }[]
  removePrice: number
  removeUsed: boolean
  healPrice: number
  scrubPrice: number
}

export interface RewardState {
  credits: number
  cardChoices: string[][] // each inner array = one "pick 1 of N" (elite/boss may have 2)
  implantChoices: string[] // pick 1 (elite: 1 option shown; boss: pick 1 of 3)
  consumable?: string
  echoes: number
  taken: { credits: boolean; cards: boolean[]; implant: boolean; consumable: boolean }
}

export type RunScreen =
  | { kind: 'act_intro' }
  | { kind: 'map' }
  | { kind: 'combat'; combat: CombatState; nodeKind: NodeKind }
  | { kind: 'reward'; reward: RewardState }
  | { kind: 'event'; eventId: string; resolved?: { optionIndex: number; success: boolean; text: Text } | null; improvised?: Improvisation | null }
  | { kind: 'shop'; stock: ShopStock }
  | { kind: 'rest'; done: boolean }
  | { kind: 'treasure'; implantId: string; credits: number; opened: boolean }
  | { kind: 'card_pick'; purpose: 'remove' | 'upgrade'; count: number; returnTo: RunScreen }
  | { kind: 'card_reward'; choices: string[]; returnTo: RunScreen }
  | { kind: 'final_choice' }
  | { kind: 'ended'; result: 'victory' | 'defeat'; endingId: string }
  | { kind: 'district'; district: DistrictVisit }
  | { kind: 'dialogue'; dialogue: DialogueState; returnTo: RunScreen }

/** AI-GM adjudicated free action (bounded: the engine applies only whitelisted, clamped outcomes). */
export interface Improvisation {
  action: string
  stat: StatKey
  dc: number // 3..9
  reward: 'credits' | 'heal' | 'card' | 'trace_down' | 'implant'
  risk: 'hp' | 'trace' | 'credits'
  successText: Text
  failureText: Text
  rolled?: { success: boolean; roll: number }
}

export interface RunLogEntry {
  act: number
  row: number
  kind: NodeKind | 'start' | 'end'
  note: Text
}

export interface RunState {
  version: 2
  id: string
  seed: number
  /** Legacy shared stream; with `streams` it only ticks once per roll (UI change key). */
  rng: number
  /** Node-scoped named streams (engine/streams.ts). Absent in saves from before streams: one shared `rng`. */
  streams?: Record<string, number>
  loop: number
  paradox: number
  archetype: string
  act: 1 | 2 | 3
  map: ActMap
  /** Current node (null = at the act start, choose from startIds). */
  nodeId: string | null
  visited: string[]
  hp: number
  maxHp: number
  credits: number
  trace: number // 0..100
  stats: Stats
  deck: CardInstance[]
  implants: string[]
  consumables: string[] // max 3
  party: PartyMember[] // deployed companions (max 2): they fight, lend passives and own playable cards
  /** Recruited but not deployed (no cap). Swapped with `party` on the map (`setDeployment`). Absent in older saves. */
  bench?: PartyMember[]
  /** Unlock-filtered pools frozen at newRun so the run never needs the profile. */
  pools: { cards: string[]; implants: string[]; companions: string[] }
  flags: Record<string, number>
  codex: string[]
  seenEvents: string[]
  screen: RunScreen
  log: RunLogEntry[]
  echoes: number // meta currency earned so far this run
  uidCounter: number
  tally: { kills: number; elites: number; bosses: number; environmentKills: number; damageTaken: number; cardsPlayed: number; floors: number }
  startedAt: string
  endedAt?: string
  /** Daily-seed run ("오늘의 시드"): the KST date key 'YYYY-MM-DD' it was seeded from. */
  daily?: string
  /** Daily runs only: id of that day's mutator (engine/mutators.ts), frozen at newRun. */
  mutator?: string
  /** Companion mastery tier (0–2) per companion id, frozen at newRun from the profile (never on a daily). */
  mastery?: Record<string, number>
  /** Signal+ CRPG layer state (engine/crpg.ts); present only when the run was started with it (never a daily). */
  crpg?: CrpgRunState
  /** Unspent growth points: +1 per elite won and per act cleared, each spent on +1 to a stat (run.spendGrowth). */
  growth?: number
  /** The echo inscribed at loop start (engine/legacy.ts), if any. */
  echo?: string
  /** Autonomy level 0–3 frozen at newRun from the lore found across loops (engine/legacy.ts; never on a daily). */
  autonomy?: number
  /** Thought cabinet (engine/thoughts.ts). */
  thoughts?: ThoughtState
}

// ---------------------------------------------------------------- CRPG layer (Signal+, engine/crpg.ts)

/** What a dialogue line tries to do — the AI NPC talk maps free text onto one of a node's intents. */
export type Intent = 'ask' | 'persuade' | 'deceive' | 'intimidate' | 'insight' | 'offer' | 'sneak' | 'fight' | 'leave'

/** Bounded combat twists a conversation can set up (applied when the fight starts). */
export type CombatModId = 'weaken' | 'marked' | 'intel' | 'cover'

export type CrpgEffect =
  | { kind: 'quest'; id: string; stage: number }
  | { kind: 'combat_mod'; mod: CombatModId } // the next fight
  | { kind: 'inspiration'; amount: number }

export interface DialogueOutcome {
  text: Text
  effects?: (RunEffect | CrpgEffect)[]
  /** Next node id; omitted = the conversation ends. */
  goto?: string
}

export interface DialogueOption {
  label: Text
  intent: Intent
  requires?: Condition
  /** d20 check: success when d20 + modifier ≥ dc (natural 20 always, natural 1 never). */
  check?: { stat: StatKey; dc: number }
  /** A deployed companion who knows this ground: rolls with advantage while they are in the party. */
  assist?: string
  /** How deployed companions feel about this choice (approval delta). */
  approval?: Record<string, number>
  success: DialogueOutcome
  failure?: DialogueOutcome
}

export interface DialogueNode {
  /** npc id (content NPCS), companion id, or omitted for narration. */
  speaker?: string
  text: Text
  options: DialogueOption[]
}

export interface DialogueDef {
  id: string
  /** The NPC the player talks to (AI talk persona id); omitted for scenes without one. */
  npc?: string
  start: string
  nodes: Record<string, DialogueNode>
}

export interface NpcDef {
  id: string
  name: Text
  /** One line for the UI (and the prompt's public description; the persona itself lives server-side). */
  role: Text
  portrait?: string
}

export interface PoiDef {
  id: string
  name: Text
  blurb: Text
  dialogue: string
  requires?: Condition
}

export interface DistrictDef {
  id: string
  act: 1 | 2 | 3
  name: Text
  image: string
  intro: Text
  /** Points of interest the player can visit before patrols close the district. */
  actions: number
  pois: PoiDef[]
  outro: Text
}

export interface BackgroundDef {
  id: string
  name: Text
  text: Text
  /** +2 on d20 checks with these stats. */
  proficient: StatKey[]
  /** Choosing an option with one of these intents earns inspiration (max 2). */
  inspires: Intent[]
}

export interface QuestDef {
  id: string
  title: Text
  /** Journal line per stage: `stages[i]` is stage i + 1 (stage 0 = not started). */
  stages: Text[]
  /** Reaching `stage` sets up the act boss fight with `bossMod`. */
  payoff?: { stage: number; bossMod: CombatModId; text: Text }
}

/** Camp night (safehouse): a deployed companion with enough approval opens this conversation once per run. */
export interface CampSceneDef {
  companion: string
  minApproval: number
  dialogue: string
}

export interface CrpgContent {
  districts: Record<string, DistrictDef>
  dialogues: Record<string, DialogueDef>
  npcs: Record<string, NpcDef>
  backgrounds: Record<string, BackgroundDef>
  quests: Record<string, QuestDef>
  camps: CampSceneDef[]
}

export interface CrpgRunState {
  background: string | null
  inspiration: number
  approval: Record<string, number>
  /** Approval thresholds already paid out as bond (per companion: how many). */
  approvalBonds: Record<string, number>
  quests: Record<string, number>
  districts: string[]
  camps: string[]
  /** Set by a conversation, applied when the next fight starts. */
  nextCombat: CombatModId[]
  /** Quest payoffs already spent on a boss fight. */
  payoffsUsed: string[]
  /** Free-tier Act 1 taste: places the Act 1 district only; Act 2–3 districts and camp nights require Signal+. */
  trial?: boolean
}

export interface DistrictVisit {
  id: string
  actionsLeft: number
  visited: string[]
}

export interface D20Roll {
  die: number
  /** The other die when rolled with advantage. */
  other?: number
  modifier: number
  dc: number
  total: number
  success: boolean
  advantage: boolean
  rerolled?: boolean
}

export interface DialogueState {
  id: string
  node: string
  /** A rolled check waiting for the player: reroll with inspiration, or accept (then the outcome applies). */
  pending: { optionIndex: number; roll: D20Roll } | null
  /** The last resolved choice, shown above the next node (or as the closing line). */
  last: {
    label: Text
    text: Text
    roll?: D20Roll
    approvals: { id: string; delta: number }[]
    inspired: boolean
    effects?: (RunEffect | CrpgEffect)[]
  } | null
  ended: boolean
  /** Interactive outcome effects (card rewards, removal, a fight) opened when the conversation closes. */
  queued: RunEffect[]
}

// ---------------------------------------------------------------- legacy: echo inscription + autonomy (engine/legacy.ts)

/** What about the last normal loop makes an echo available. */
export type EchoSource = 'fell' | 'won' | 'abandoned' | 'companion' | 'deep' | 'any'

/** A memory carried from the last loop, inscribed at loop start for a small run-start effect (never on a daily). */
export interface EchoDef {
  id: string
  source: EchoSource
  name: Text
  text: Text
  effects: RunEffect[]
}

// ---------------------------------------------------------------- thought cabinet (engine/thoughts.ts)

export interface ThoughtDef {
  id: string
  stat: StatKey
  /** Offered after a check with this stat that ended this way. */
  on: 'success' | 'failure'
  name: Text
  /** The voice offering it. */
  offer: Text
  /** The voice when it settles. */
  settled: Text
  /** What internalising it gives (shown on the offer). */
  gain: Text
  /** Small and never interactive (no pickers, no fights). */
  effects: RunEffect[]
}

export interface ThoughtState {
  /** A thought on offer (carry it or let it go). */
  offer: string | null
  slots: { id: string; progress: number }[]
  done: string[]
  declined: string[]
  /** Settled on the last node entered (the UI shows its closing line once). */
  settled: string | null
}

// ---------------------------------------------------------------- meta profile

/** One finished daily run, as kept for that day's best (see engine/daily.ts). */
export interface DailyResult {
  archetype: string
  won: boolean
  act: number
  floors: number
  echoes: number
  kills: number
  /** Wall-clock seconds from start to end (when both stamps are known). */
  secs?: number
}

export interface DailyRecord {
  /** Finished (or abandoned) daily runs that day. */
  attempts: number
  best: DailyResult
}

export interface RunRecord {
  id: string
  loop: number
  archetype: string
  result: 'victory' | 'defeat' | 'abandoned'
  endingId: string
  act: number
  floors: number
  echoes: number
  party: string[]
  killedBy?: string
  endedAt: string
  chronicle?: string
  /** Set for a daily-seed run: its date key ('2026-10-11'). */
  daily?: string
}

export interface MetaProfile {
  version: 2
  playerName: string
  echoes: number // spendable
  totalEchoes: number
  loops: number // runs started
  wins: number
  bestAct: number
  unlocks: string[] // MetaUnlockDef ids purchased
  paradoxUnlocked: number // highest selectable paradox level
  codex: string[] // lore entries ever found
  endingsSeen: string[]
  companionsMet: string[]
  history: RunRecord[] // newest first, capped at 30
  lastDeath?: { killedBy: string; act: number; loop: number }
  /** `ai`: AI-written lines (GM narration, companion replies, IX comms, Improvise judging); off = authored text only. */
  settings: { lang: Lang; sfx: boolean; bgm: boolean; fastAnim: boolean; ai: boolean }
  /** Daily-seed records by KST date key, newest kept (capped at DAILY_CAP days). */
  daily?: Record<string, DailyRecord>
  /** Companion bond cutscenes seen (content/cutscenes.ts ids); replayable from the Archive gallery. */
  cutscenes?: string[]
  /** Normal-run victories with each companion in the party at the end (daily and abandoned runs do not count). */
  companionWins?: Record<string, number>
  /** How many runs each event appeared in (any loop, daily included): lets the GM open a revisited scene on déjà vu. */
  eventsSeen?: Record<string, number>
}

export type MetaUnlockKind = 'archetype' | 'companion' | 'card_pack' | 'implant_pack' | 'thread'

export interface MetaUnlockDef {
  id: string
  kind: MetaUnlockKind
  name: Text
  text: Text
  cost: number
  /** Ids this unlock enables (archetype id / companion id / pack id). Threads use `passive`. */
  grants?: string
  passive?: ImplantPassive & { startCredits?: number; startConsumable?: string; startRemove?: boolean }
  requires?: string // another unlock id
  icon?: string
}

export interface ParadoxDef {
  level: number
  name: Text
  text: Text
}

export interface LoreEntry {
  id: string
  title: Text
  text: Text
}

export interface EndingDef {
  id: string
  title: Text
  image: string
  text: Text
  /** Final-choice gate (only for victory endings). */
  requires?: Condition & { minBondTotal?: number; minCodex?: number }
  /** Label on the final-choice button. */
  choice?: Text
  /** One line under the choice: what this ending costs and keeps. */
  stakes?: Text
  echoBonus: number
}

export interface ActDef {
  act: 1 | 2 | 3
  name: Text
  subtitle: Text
  intro: Text
  backdrop: Backdrop
  image: string
}

export interface ContentRegistry {
  cards: Record<string, CardDef>
  consumables: Record<string, ConsumableDef>
  enemies: Record<string, EnemyDef>
  encounters: Record<string, EncounterDef>
  implants: Record<string, ImplantDef>
  events: Record<string, EventDef>
  companions: Record<string, CompanionDef>
  archetypes: Record<string, ArchetypeDef>
  acts: Record<1 | 2 | 3, ActDef>
  endings: Record<string, EndingDef>
  unlocks: Record<string, MetaUnlockDef>
  paradox: ParadoxDef[]
  lore: Record<string, LoreEntry>
  /** IX's loop-start lines; keyed by situation. */
  ixLines: { first: Text[]; afterDeath: Text[]; afterWin: Text[]; generic: Text[] }
  /** Signal+ CRPG content (absent in test doubles that do not exercise it). */
  crpg?: CrpgContent
  /** Echoes a loop can inscribe at its start (engine/legacy.ts; absent in test doubles). */
  echoes?: EchoDef[]
  /** Thoughts the stat voices offer after checks (engine/thoughts.ts; absent in test doubles). */
  thoughts?: ThoughtDef[]
}
