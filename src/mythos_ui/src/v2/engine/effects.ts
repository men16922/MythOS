// Mythos 2.0 — combat primitives: damage, push/bump, statuses, effect resolution, deaths, implant triggers.
//
// Everything here MUTATES the CombatState it is given. The public reducers in combat.ts clone first and
// then call into this module, so callers outside the engine never see mutation.
//
// Event conventions (CombatEvent): 'damage' carries the hp actually lost after block (`blocked` = absorbed),
// 'status' / 'block' / 'heal' / 'energy' carry the positive delta that was applied. Decay and consumption
// are not evented — the UI reads the resulting numbers from state.

import type {
  AreaShape,
  CardInstance,
  CombatEvent,
  CombatState,
  ContentRegistry,
  Dir,
  Effect,
  EffectScope,
  EnemyDef,
  ImplantPassive,
  Pos,
  Side,
  StatusKind,
  Tile,
  TriggerEvent,
  UnitState,
} from './types.ts'
import { DIRS, add, areaTiles, dirToward, inBounds, opposite, posKey, samePos } from './grid.ts'
import { pick, randInt } from './rng.ts'

export type DamageSource = 'party' | 'enemy' | 'environment'

export const HAND_MAX = 10
export const COVER_HP = 2
export const HAZARD_DAMAGE = 2
export const BUMP_DAMAGE = 1
export const WEAK_PENALTY = 2
export const BLOCKED_ARRIVAL_DAMAGE = 2

/**
 * Engine-private state extensions. They are plain optional JSON fields, so they survive save/load and
 * structuredClone; they are typed here until the shared contract grows matching fields.
 */
export interface CombatScaling {
  /** +% max HP for every enemy (Trace tier). */
  hpPct: number
  /** Extra +% max HP for elite/boss enemies (Paradox). */
  elitePct: number
  /** Flat +damage on every enemy move (Hunted tier, Paradox 4). */
  dmg: number
}
export type CombatStateExt = CombatState & {
  scaling?: CombatScaling
  /** bumpDamage from meta threads (run.flags `thread_bumpDamage`), frozen at combat start. */
  threadBump?: number
  /** Cards drawn by effects during the enemy phase, added on top of next turn's draw. */
  pendingDraw?: number
  /** True while endTurn resolves the enemy phase. */
  inEnemyPhase?: boolean
}
export type UnitStateExt = UnitState & { dmgBonus?: number }

export function dmgBonusOf(u: UnitState): number {
  return (u as UnitStateExt).dmgBonus ?? 0
}

// ---------------------------------------------------------------- lookups

export function emit(c: CombatState, ev: CombatEvent): void {
  c.events.push(ev)
}

export function tileAt(c: CombatState, p: Pos): Tile | undefined {
  return c.tiles[p.y]?.[p.x]
}

/** Living unit on a tile. */
export function unitAt(c: CombatState, p: Pos): UnitState | undefined {
  return c.units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
}

/** Living unit by uid. */
export function getUnit(c: CombatState, uid: string): UnitState | undefined {
  return c.units.find((u) => u.uid === uid && u.hp > 0)
}

export function livingEnemies(c: CombatState): UnitState[] {
  return c.units.filter((u) => u.side === 'enemy' && u.hp > 0)
}

export function livingParty(c: CombatState): UnitState[] {
  return c.units.filter((u) => u.side === 'party' && u.hp > 0)
}

export function connectorOf(c: CombatState): UnitState | undefined {
  return getUnit(c, 'connector')
}

/** Numeric suffix of a uid ('e12' → 12), used for "uid order". */
export function uidNum(uid: string): number {
  const m = /(\d+)$/.exec(uid)
  return m ? Number(m[1]) : 0
}

export function byUid(a: UnitState, b: UnitState): number {
  return uidNum(a.uid) - uidNum(b.uid) || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0)
}

/** Floor or hazard (a unit may stand there). */
export function isStandable(t: Tile | undefined): boolean {
  return !!t && (t.kind === 'floor' || t.kind === 'hazard')
}

/** Units the given side fights against ('neutral' counts with the party from the enemy's view). */
export function opponentsOf(c: CombatState, side: Side): UnitState[] {
  return side === 'enemy'
    ? c.units.filter((u) => u.hp > 0 && (u.side === 'party' || u.side === 'neutral'))
    : livingEnemies(c)
}

export function alliesOf(c: CombatState, side: Side): UnitState[] {
  return side === 'enemy' ? livingEnemies(c) : livingParty(c)
}

/** Sum of passives from active implants plus companions still standing. */
export function activePassive(c: CombatState, C: ContentRegistry, key: keyof ImplantPassive): number {
  let total = key === 'bumpDamage' ? ((c as CombatStateExt).threadBump ?? 0) : 0
  const read = (p: ImplantPassive | undefined) => {
    const v = p?.[key]
    if (typeof v === 'number') total += v
  }
  for (const id of c.implants) read(C.implants[id]?.passive)
  for (const u of livingParty(c)) if (u.uid !== 'connector') read(C.companions[u.defId]?.passive)
  return total
}

// ---------------------------------------------------------------- tiles

export function damageCover(c: CombatState, p: Pos, amount: number): void {
  const t = tileAt(c, p)
  if (!t || t.kind !== 'cover') return
  t.hp = (t.hp ?? COVER_HP) - amount
  if (t.hp <= 0) {
    t.kind = 'floor'
    delete t.hp
    emit(c, { t: 'tile', pos: { ...p }, kind: 'floor' })
  }
}

/** Nearest unoccupied standable tile to `from` (BFS over the board; floor preferred over hazard). */
export function nearestFreeTile(c: CombatState, from: Pos, reserved: Set<string> = new Set()): Pos | undefined {
  const seen = new Set<string>([posKey(from)])
  let frontier: Pos[] = [from]
  let hazardFallback: Pos | undefined
  while (frontier.length > 0) {
    for (const p of frontier) {
      const t = tileAt(c, p)
      if (isStandable(t) && !unitAt(c, p) && !reserved.has(posKey(p))) {
        if (t?.kind === 'floor') return { ...p }
        hazardFallback ??= { ...p }
      }
    }
    if (hazardFallback) return hazardFallback
    const next: Pos[] = []
    for (const p of frontier) {
      for (const d of DIRS) {
        const n = add(p, d)
        if (inBounds(n) && !seen.has(posKey(n))) {
          seen.add(posKey(n))
          next.push(n)
        }
      }
    }
    frontier = next
  }
  return undefined
}

// ---------------------------------------------------------------- enemies

export function scaledHp(c: CombatState, def: EnemyDef): number {
  const s = (c as CombatStateExt).scaling
  if (!s) return def.hp
  const pct = s.hpPct + (def.tier === 'elite' || def.tier === 'boss' ? s.elitePct : 0)
  return Math.max(1, Math.round(def.hp * (1 + pct / 100)))
}

/** Create an enemy unit (scaled by the fight's Trace/Paradox) at `pos`. No intent yet. */
export function spawnEnemy(c: CombatState, C: ContentRegistry, enemyId: string, pos: Pos): UnitState | undefined {
  const def = C.enemies[enemyId]
  if (!def) return undefined
  const hp = scaledHp(c, def)
  c.uidCounter += 1
  const u: UnitStateExt = {
    uid: `e${c.uidCounter}`,
    defId: def.id,
    side: 'enemy',
    name: def.name,
    sprite: def.sprite,
    pos: { ...pos },
    hp,
    maxHp: hp,
    block: 0,
    armor: def.armor ?? 0,
    move: def.move,
    moved: false,
    facing: 'left',
    statuses: {},
    intent: null,
    cooldowns: {},
    phase: 0,
  }
  if (def.flying) u.flying = true
  const bonus = (c as CombatStateExt).scaling?.dmg ?? 0
  if (bonus) u.dmgBonus = bonus
  c.units.push(u)
  return u
}

function enterPhases(c: CombatState, C: ContentRegistry, u: UnitState): void {
  const phases = C.enemies[u.defId]?.phases
  if (!phases) return
  let idx = u.phase ?? 0
  for (let ph = phases[idx]; ph && u.hp > 0 && u.hp <= ph.hpBelow * u.maxHp; ph = phases[idx]) {
    idx += 1
    u.phase = idx
    emit(c, { t: 'phase', uid: u.uid, phase: idx, text: ph.text })
    if (ph.heal) healUnit(c, u, ph.heal)
    if (ph.effects?.length) {
      applyEffects(c, C, ph.effects, { origin: u, side: 'enemy', tiles: [u.pos], impact: u.pos, source: 'enemy' })
    }
  }
}

// ---------------------------------------------------------------- end of fight

export function finalizeBonus(c: CombatState): void {
  const b = c.bonus
  if (!b) return
  switch (b.def.kind) {
    case 'turn_limit':
      if (c.turn > b.def.turns) b.failed = true
      break
    case 'environment':
      if (b.progress < b.def.count) b.failed = true
      break
    default:
      break
  }
}

export function winCombat(c: CombatState, C: ContentRegistry): void {
  if (c.phase !== 'player') return
  c.phase = 'won'
  finalizeBonus(c)
  fireTrigger(c, C, 'combat_won')
}

/** Lose if the connector is down, win if no enemy stands. */
export function checkEnd(c: CombatState, C: ContentRegistry): void {
  if (c.phase !== 'player') return
  if (!connectorOf(c)) {
    c.phase = 'lost'
    return
  }
  if (livingEnemies(c).length === 0) winCombat(c, C)
}

/**
 * A unit dies. Enemies/companions/neutral are removed from `units`; the connector stays at 0 hp so the
 * run can read the final state, and the fight is lost.
 */
export function killUnit(c: CombatState, C: ContentRegistry, u: UnitState, cause: 'damage' | 'void'): void {
  u.hp = 0
  emit(c, { t: 'death', uid: u.uid, cause })
  if (u.uid === 'connector') {
    c.phase = 'lost'
    return
  }
  c.units = c.units.filter((x) => x !== u)
  if (u.side === 'enemy') {
    c.stats.enemiesKilled += 1
    c.credits += C.enemies[u.defId]?.bounty ?? 0
    const environmental = cause === 'void' || u.lastHitBy !== 'party'
    if (environmental) {
      c.stats.environmentKills += 1
      if (c.bonus?.def.kind === 'environment') c.bonus.progress += 1
    }
    fireTrigger(c, C, 'enemy_killed', u.pos)
    if (environmental) fireTrigger(c, C, 'environment_kill', u.pos)
  } else if (u.side === 'neutral' && c.bonus?.def.kind === 'protect') {
    c.bonus.failed = true
  }
  checkEnd(c, C)
}

// ---------------------------------------------------------------- damage

export interface HitOpts {
  source: DamageSource
  attacker?: UnitState
  /** Card/enemy attack: mark, weak and armor apply. Environmental ticks (bump, hazard, burn) skip them. */
  attack?: boolean
  pierce?: boolean
  ignoreBlock?: boolean
  /** Melee/charge hit (triggers the victim's thorns). */
  melee?: boolean
  bonusVsMarked?: number
}

/** Apply one damage instance. Returns hp actually lost. */
export function dealDamage(c: CombatState, C: ContentRegistry, victim: UnitState, amount: number, o: HitOpts): number {
  if (victim.hp <= 0) return 0
  let dmg = amount
  if (o.attack) {
    const mark = victim.statuses.mark ?? 0
    if (mark > 0) {
      dmg += mark + (o.bonusVsMarked ?? 0)
      delete victim.statuses.mark
    }
    if (o.attacker && (o.attacker.statuses.weak ?? 0) > 0) dmg -= WEAK_PENALTY
    if (!o.pierce) dmg -= victim.armor
  }
  dmg = Math.max(0, dmg)
  let blocked = 0
  if (!o.pierce && !o.ignoreBlock && victim.block > 0) {
    blocked = Math.min(victim.block, dmg)
    victim.block -= blocked
    dmg -= blocked
  }
  const lost = Math.min(victim.hp, dmg)
  victim.hp -= lost
  victim.lastHitBy = o.source
  emit(c, { t: 'damage', uid: victim.uid, amount: dmg, blocked, source: o.source })
  if (victim.side === 'enemy' && o.source === 'party') c.stats.damageDealt += lost
  if (victim.uid === 'connector' && lost > 0) {
    c.stats.damageTaken += lost
    if (c.bonus?.def.kind === 'untouched') c.bonus.failed = true
  }
  const thorns = victim.statuses.thorns ?? 0
  if (o.melee && thorns > 0 && o.attacker && o.attacker !== victim && o.attacker.hp > 0) {
    dealDamage(c, C, o.attacker, thorns, { source: victim.side === 'enemy' ? 'enemy' : 'party' })
  }
  if (victim.hp <= 0) {
    killUnit(c, C, victim, 'damage')
    return lost
  }
  if (victim.side === 'enemy') enterPhases(c, C, victim)
  if (victim.uid === 'connector' && lost > 0) fireTrigger(c, C, 'damage_taken', victim.pos)
  return lost
}

export function healUnit(c: CombatState, u: UnitState, amount: number): void {
  if (u.hp <= 0) return
  const healed = Math.min(amount, u.maxHp - u.hp)
  if (healed <= 0) return
  u.hp += healed
  emit(c, { t: 'heal', uid: u.uid, amount: healed })
}

export function gainBlock(c: CombatState, u: UnitState, amount: number): void {
  if (u.hp <= 0 || amount <= 0) return
  u.block += amount
  emit(c, { t: 'block', uid: u.uid, amount })
}

export function addStatus(c: CombatState, u: UnitState, status: StatusKind, amount: number): void {
  if (u.hp <= 0 || amount === 0) return
  const next = Math.max(0, (u.statuses[status] ?? 0) + amount)
  if (next > 0) u.statuses[status] = next
  else delete u.statuses[status]
  if (amount > 0) emit(c, { t: 'status', uid: u.uid, status, amount })
}

/** Decrement a status by 1 (removing it at 0). */
export function decayStatus(u: UnitState, status: StatusKind): void {
  const v = u.statuses[status]
  if (v === undefined) return
  if (v <= 1) delete u.statuses[status]
  else u.statuses[status] = v - 1
}

// ---------------------------------------------------------------- push

/**
 * Push `u` up to `distance` tiles in `dir`. Blocked by edge / cover / a unit / void (party, neutral and
 * flyers treat void as a wall): the pushed unit and the blocker each take 1 bump damage (+bumpDamage
 * passive for non-party units), cover loses 1 hp. A non-flying enemy pushed into void is deleted.
 * `stopBefore` (a uid) ends a pull silently in front of the puller instead of bumping into it.
 */
export function pushUnit(c: CombatState, C: ContentRegistry, u: UnitState, dir: Dir, distance: number, stopBefore?: string): void {
  if (u.hp <= 0 || distance <= 0) return
  const from = { ...u.pos }
  let bumped: string | undefined
  let bumpPos: Pos | undefined
  for (let i = 0; i < distance; i++) {
    const next = add(u.pos, dir)
    const t = inBounds(next) ? tileAt(c, next) : undefined
    if (!t) {
      bumped = 'wall'
      break
    }
    if (t.kind === 'cover') {
      bumped = 'cover'
      bumpPos = next
      break
    }
    const occ = unitAt(c, next)
    if (occ) {
      if (occ.uid !== stopBefore) {
        bumped = occ.uid
        bumpPos = next
      }
      break
    }
    if (t.kind === 'void') {
      if (u.side === 'enemy' && !u.flying) {
        u.pos = next
        emit(c, { t: 'push', uid: u.uid, from, to: { ...next }, dir })
        u.lastHitBy = 'environment'
        killUnit(c, C, u, 'void')
        return
      }
      bumped = 'wall'
      break
    }
    u.pos = next
  }
  const moved = !samePos(from, u.pos)
  if (!moved && !bumped) return
  emit(c, bumped ? { t: 'push', uid: u.uid, from, to: { ...u.pos }, dir, bumped } : { t: 'push', uid: u.uid, from, to: { ...u.pos }, dir })
  if (bumped) {
    const extra = activePassive(c, C, 'bumpDamage')
    dealDamage(c, C, u, BUMP_DAMAGE + (u.side === 'party' ? 0 : extra), { source: 'environment' })
    if (bumped === 'cover' && bumpPos) damageCover(c, bumpPos, 1)
    else if (bumped !== 'wall') {
      const other = getUnit(c, bumped)
      if (other) dealDamage(c, C, other, BUMP_DAMAGE + (other.side === 'party' ? 0 : extra), { source: 'environment' })
    }
    fireTrigger(c, C, 'bump', u.hp > 0 ? u.pos : bumpPos)
  }
  if (moved && u.hp > 0 && !u.flying && tileAt(c, u.pos)?.kind === 'hazard') {
    dealDamage(c, C, u, HAZARD_DAMAGE, { source: 'environment' })
  }
}

// ---------------------------------------------------------------- cards in combat

/** Draw up to `n` cards (reshuffling the discard when the draw pile runs out; hand max 10). */
export function drawCards(c: CombatState, n: number): number {
  let drawn = 0
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= HAND_MAX) break
    if (c.draw.length === 0) {
      if (c.discard.length === 0) break
      c.draw = shuffleInPlace(c, c.discard)
      c.discard = []
    }
    const card = c.draw.shift()
    if (!card) break
    c.hand.push(card)
    drawn += 1
  }
  if (drawn > 0) emit(c, { t: 'draw', count: drawn })
  return drawn
}

function shuffleInPlace(c: CombatState, cards: CardInstance[]): CardInstance[] {
  const out = cards.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(c, 0, i)
    const tmp = out[i] as CardInstance
    out[i] = out[j] as CardInstance
    out[j] = tmp
  }
  return out
}

function addCards(c: CombatState, cardId: string, pile: 'hand' | 'draw' | 'discard', count: number): void {
  for (let i = 0; i < count; i++) {
    c.uidCounter += 1
    const card: CardInstance = { uid: `x${c.uidCounter}`, defId: cardId, upgraded: false }
    if (pile === 'hand' && c.hand.length < HAND_MAX) c.hand.push(card)
    else if (pile === 'draw') c.draw.splice(randInt(c, 0, c.draw.length), 0, card)
    else c.discard.push(card)
  }
}

// ---------------------------------------------------------------- effect resolution

/** Context of one card play / enemy move / implant trigger. */
export interface Resolution {
  origin?: UnitState
  /** Side the effect is cast from (decides all_enemies / all_allies / random_enemy). */
  side: Side
  /** Impact centre for area effects. */
  impact?: Pos
  /** Attack direction (push 'away' for non-area hits; orients 'row' areas). */
  dir?: Dir
  /** Tiles the 'target' scope covers for effects without their own area. */
  tiles: Pos[]
  source: DamageSource
  melee?: boolean
  /** Attacks never damage or push their own origin through the 'target' scope. */
  attack?: boolean
  /**
   * Centre of an area attack (enemy nova = the enemy itself, area lob = its target): 'target' pushes go
   * outward from it even when the push effect has no area of its own.
   */
  centre?: Pos
}

export function scopeOf(eff: Effect): EffectScope {
  switch (eff.kind) {
    case 'damage':
    case 'push':
    case 'block':
    case 'heal':
    case 'status':
      return eff.to ?? 'target'
    case 'refund_move':
      return eff.to ?? 'owner'
    default:
      return 'target'
  }
}

function areaOf(eff: Effect): AreaShape | undefined {
  switch (eff.kind) {
    case 'damage':
    case 'push':
    case 'status':
    case 'create_cover':
      return eff.area
    default:
      return undefined
  }
}

function uniqPositions(list: Pos[]): Pos[] {
  const seen = new Set<string>()
  const out: Pos[] = []
  for (const p of list) {
    const k = posKey(p)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(p)
    }
  }
  return out
}

/** Tiles an effect touches through the 'target' scope. */
export function effectTiles(eff: Effect, res: Resolution): Pos[] {
  const area = areaOf(eff)
  if (!area) return res.tiles
  const centres = res.impact ? [res.impact] : res.tiles
  return uniqPositions(centres.flatMap((p) => areaTiles(p, area, res.dir)))
}

/** Units an effect applies to. `random_enemy` consumes the combat RNG. */
export function effectTargets(c: CombatState, eff: Effect, res: Resolution): UnitState[] {
  const scope = scopeOf(eff)
  switch (scope) {
    case 'target': {
      const out: UnitState[] = []
      const excludeOrigin = res.attack && (eff.kind === 'damage' || eff.kind === 'push')
      for (const p of effectTiles(eff, res)) {
        const u = unitAt(c, p)
        if (u && !out.includes(u) && !(excludeOrigin && u === res.origin)) out.push(u)
      }
      return out
    }
    case 'owner':
      return res.origin && res.origin.hp > 0 ? [res.origin] : []
    case 'connector': {
      const conn = connectorOf(c)
      return conn ? [conn] : []
    }
    case 'all_enemies':
      return opponentsOf(c, res.side).sort(byUid)
    case 'all_allies':
      return alliesOf(c, res.side).sort(byUid)
    case 'random_enemy': {
      const pool = opponentsOf(c, res.side).sort(byUid)
      return pool.length > 0 ? [pick(c, pool)] : []
    }
  }
}

function pushDirFor(eff: Extract<Effect, { kind: 'push' }>, res: Resolution, u: UnitState): Dir | undefined {
  const scope = eff.to ?? 'target'
  const centre = scope !== 'target' ? undefined : eff.area && res.impact ? res.impact : res.centre
  let d: Dir | undefined
  if (centre) {
    d = samePos(u.pos, centre) ? (res.dir ?? (res.origin ? dirToward(res.origin.pos, centre) : undefined)) : dirToward(centre, u.pos)
  } else if (scope === 'target' && res.dir) {
    d = res.dir
  } else if (res.origin) {
    d = dirToward(res.origin.pos, u.pos)
  }
  if (!d) return undefined
  return eff.dir === 'toward' ? opposite(d) : d
}

/** Apply effects in order; each effect resolves against all of its targets before the next one. */
export function applyEffects(c: CombatState, C: ContentRegistry, effects: readonly Effect[], res: Resolution): void {
  for (const eff of effects) {
    if (c.phase === 'lost') return
    applyEffect(c, C, eff, res)
  }
}

function applyEffect(c: CombatState, C: ContentRegistry, eff: Effect, res: Resolution): void {
  switch (eff.kind) {
    case 'damage': {
      if (eff.amount > 0) {
        // Environmental sources (held junk, hazards) carry no attacker: no weak/mark/armor interplay.
        const environmental = res.source === 'environment'
        for (const u of effectTargets(c, eff, res)) {
          dealDamage(c, C, u, eff.amount, {
            source: res.source,
            attacker: environmental ? undefined : res.origin,
            attack: !environmental,
            pierce: eff.pierce,
            melee: res.melee,
            bonusVsMarked: eff.bonusVsMarked,
          })
        }
      }
      if (scopeOf(eff) === 'target') for (const p of effectTiles(eff, res)) damageCover(c, p, 1)
      return
    }
    case 'push': {
      const plans = effectTargets(c, eff, res)
        .map((u) => ({ u, d: pushDirFor(eff, res, u) }))
        .filter((x): x is { u: UnitState; d: Dir } => x.d !== undefined)
      // Front-most units move first so a row of units does not bump into itself.
      const lead = (x: { u: UnitState; d: Dir }) => {
        const v = add({ x: 0, y: 0 }, x.d)
        return x.u.pos.x * v.x + x.u.pos.y * v.y
      }
      plans.sort((a, b) => lead(b) - lead(a))
      const stopBefore = eff.dir === 'toward' ? res.origin?.uid : undefined
      for (const { u, d } of plans) pushUnit(c, C, u, d, eff.distance ?? 1, stopBefore)
      return
    }
    case 'block':
      for (const u of effectTargets(c, eff, res)) gainBlock(c, u, eff.amount)
      return
    case 'heal':
      for (const u of effectTargets(c, eff, res)) healUnit(c, u, eff.amount)
      return
    case 'status':
      for (const u of effectTargets(c, eff, res)) addStatus(c, u, eff.status, eff.amount)
      return
    case 'draw': {
      if (res.side !== 'party') return
      const x = c as CombatStateExt
      // Off-turn draws (e.g. an environment kill during the enemy phase) carry into the next hand.
      if (x.inEnemyPhase) x.pendingDraw = (x.pendingDraw ?? 0) + eff.amount
      else drawCards(c, eff.amount)
      return
    }
    case 'energy':
      if (res.side === 'party' && eff.amount !== 0) {
        c.energy = Math.max(0, c.energy + eff.amount)
        emit(c, { t: 'energy', amount: eff.amount })
      }
      return
    case 'teleport': {
      const o = res.origin
      const to = res.impact
      if (!o || o.hp <= 0 || !to || unitAt(c, to) || !isStandable(tileAt(c, to))) return
      const from = { ...o.pos }
      o.pos = { ...to }
      emit(c, { t: 'teleport', uid: o.uid, from, to: { ...to } })
      return
    }
    case 'swap': {
      const o = res.origin
      const other = res.impact ? unitAt(c, res.impact) : undefined
      if (!o || o.hp <= 0 || !other || other === o) return
      const a = { ...o.pos }
      const b = { ...other.pos }
      o.pos = b
      other.pos = a
      emit(c, { t: 'teleport', uid: o.uid, from: a, to: { ...b } })
      emit(c, { t: 'teleport', uid: other.uid, from: b, to: { ...a } })
      return
    }
    case 'redirect':
      for (const p of effectTiles(eff, res)) {
        const u = unitAt(c, p)
        if (u?.side === 'enemy') redirectIntent(c, C, u)
      }
      return
    case 'cancel_intent':
      for (const p of effectTiles(eff, res)) {
        const u = unitAt(c, p)
        if (u?.side === 'enemy' && u.intent) {
          u.intent = null
          emit(c, { t: 'fizzle', uid: u.uid })
        }
      }
      return
    case 'create_cover':
      for (const p of effectTiles(eff, res)) {
        const t = tileAt(c, p)
        if (!t || !isStandable(t) || unitAt(c, p)) continue
        t.kind = 'cover'
        t.hp = COVER_HP
        emit(c, { t: 'tile', pos: { ...p }, kind: 'cover' })
      }
      return
    case 'refund_move':
      for (const u of effectTargets(c, eff, res)) if (u.side === 'party') u.moved = false
      return
    case 'trace':
      c.trace += eff.amount
      return
    case 'add_card':
      addCards(c, eff.cardId, eff.pile, eff.count ?? 1)
      return
    case 'credits':
      c.credits += eff.amount
      return
  }
}

/** Turn a relative intent around (180°) or re-aim a lob at the nearest other enemy. */
export function redirectIntent(c: CombatState, C: ContentRegistry, u: UnitState): void {
  const intent = u.intent
  if (!intent) return
  const move = C.enemies[u.defId]?.moves.find((m) => m.id === intent.moveId)
  if (!move) return
  if (move.pattern === 'track') {
    // The lock jumps to the nearest other enemy (or fizzles if it is alone).
    const other = livingEnemies(c)
      .filter((e) => e !== u)
      .sort((a, b) => Math.abs(a.pos.x - u.pos.x) + Math.abs(a.pos.y - u.pos.y) - (Math.abs(b.pos.x - u.pos.x) + Math.abs(b.pos.y - u.pos.y)) || byUid(a, b))[0]
    if (other) intent.targetUid = other.uid
    else {
      u.intent = null
      emit(c, { t: 'fizzle', uid: u.uid })
    }
    return
  }
  if (move.pattern === 'lob') {
    const others = livingEnemies(c)
      .filter((e) => e !== u)
      .sort((a, b) => Math.abs(a.pos.x - u.pos.x) + Math.abs(a.pos.y - u.pos.y) - (Math.abs(b.pos.x - u.pos.x) + Math.abs(b.pos.y - u.pos.y)) || byUid(a, b))
    const tgt = others[0]
    if (tgt) intent.target = { ...tgt.pos }
    return
  }
  if (move.pattern === 'melee' || move.pattern === 'line' || move.pattern === 'beam' || move.pattern === 'charge') {
    intent.dir = opposite(intent.dir ?? u.facing)
    u.facing = intent.dir
  }
}

// ---------------------------------------------------------------- implant triggers

/**
 * Fire every implant trigger listening to `on`. Effects resolve with the connector as owner; 'target'
 * effects without an area land on the connector, area effects are centred on `at` (e.g. where an enemy died).
 */
/** Guards against implant chains feeding each other forever (kill → explode → kill ...). */
let triggerDepth = 0
const MAX_TRIGGER_DEPTH = 8

export function fireTrigger(c: CombatState, C: ContentRegistry, on: TriggerEvent, at?: Pos): void {
  if (c.phase === 'lost' || triggerDepth >= MAX_TRIGGER_DEPTH) return
  triggerDepth += 1
  try {
    fireTriggerUnguarded(c, C, on, at)
  } finally {
    triggerDepth -= 1
  }
}

function fireTriggerUnguarded(c: CombatState, C: ContentRegistry, on: TriggerEvent, at?: Pos): void {
  const conn = connectorOf(c)
  for (const id of c.implants) {
    const triggers = C.implants[id]?.triggers
    if (!triggers) continue
    triggers.forEach((t, i) => {
      if (t.on !== on) return
      if (t.limit) {
        const key = t.limit === 'turn' ? `t${c.turn}:${id}#${i}` : `c:${id}#${i}`
        if ((c.triggered[key] ?? 0) >= 1) return
        c.triggered[key] = (c.triggered[key] ?? 0) + 1
      }
      emit(c, { t: 'trigger', implantId: id })
      applyEffects(c, C, t.effects, {
        origin: conn,
        side: 'party',
        impact: at ? { ...at } : conn ? { ...conn.pos } : undefined,
        tiles: conn ? [{ ...conn.pos }] : [],
        source: 'party',
        attack: true,
      })
    })
  }
}

/** Drop per-turn trigger bookkeeping from earlier turns. */
export function pruneTurnKeys(c: CombatState): void {
  const prefix = `t${c.turn}:`
  for (const key of Object.keys(c.triggered)) {
    if (key.startsWith('t') && !key.startsWith(prefix)) delete c.triggered[key]
  }
}
