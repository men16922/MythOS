// Mythos 2.0 — combat primitives: damage, push/bump, statuses, effect resolution, deaths, implant triggers.
//
// Everything here MUTATES the CombatState it is given. The public reducers in combat.ts clone first and
// then call into this module, so callers outside the engine never see mutation.
//
// Event conventions (CombatEvent): 'damage' carries the hp actually lost after block (`blocked` = absorbed),
// 'status' / 'block' / 'heal' / 'energy' carry the positive delta that was applied. Decay and consumption
// are not evented — the UI reads the resulting numbers from state.

import { implantRules } from './implantRules.ts'
import { setPassives } from './implantSets.ts'
import { mutatorCombat } from './mutators.ts'
import { type StatPerks, statPerks } from './statPerks.ts'
import type {
  TurnRecord,
  GlitchKind,
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
  StatScale,
  StatusKind,
  Tile,
  TriggerEvent,
  UnitState,
} from './types.ts'
import { DIRS, add, areaTiles, dirToward, inBounds, opposite, posKey, samePos } from './grid.ts'
import { pick, randInt } from './rng.ts'
import { combatStream } from './streams.ts'

export type DamageSource = 'party' | 'enemy' | 'environment'

export const HAND_MAX = 10
export const COVER_HP = 2
export const HAZARD_DAMAGE = 2
export const BUMP_DAMAGE = 1
/** Burn a grounded unit gains when it enters burning ground or ends the enemy phase on it. */
export const FIRE_BURN = 2
export const WEAK_PENALTY = 2
export const BLOCKED_ARRIVAL_DAMAGE = 2
export const FOCUS_CRIT_THRESHOLD = 4
/** Momentum (액션성 X2): full gauge = Signal Burst. */
export const MOMENTUM_MAX = 100
export const MOMENTUM_KILL = 20
/** Each player turn after the first builds Momentum on its own (a long fight always reaches its Burst). */
export const MOMENTUM_TURN = 10
export const MOMENTUM_ENV_KILL = 10 // on top of the kill
export const MOMENTUM_CRIT = 10
export const MOMENTUM_EVADE = 10
export const MOMENTUM_CHAIN4 = 25
/** Riposte (X3): an Evade graze on the connector hits a melee attacker back for this much. */
export const RIPOSTE_DAMAGE = 2

/** Add Momentum (party only, capped; nothing after the Burst is spent). */
export function gainMomentum(c: CombatState, C: ContentRegistry, n: number): void {
  if (n <= 0 || c.burstUsed) return
  const before = c.momentum ?? 0
  const after = Math.min(MOMENTUM_MAX, before + n * (1 + (implantRules(c, C).momentumBonus ?? 0)))
  if (after === before) return
  c.momentum = after
  emit(c, { t: 'momentum', amount: after - before, total: after })
}

/** Chain (X1): kills in one player turn — 2 = draw 1, 3 = +1 energy, 4+ = +25 Momentum. */
function countChainKill(c: CombatState, C: ContentRegistry): void {
  const key = `t${c.turn}:kills`
  const n = (c.triggered[key] ?? 0) + 1
  c.triggered[key] = n
  if (n < 2) return
  emit(c, { t: 'chain', n })
  if (n === 2) drawCards(c, 1)
  else if (n === 3) {
    c.energy += 1
    emit(c, { t: 'energy', amount: 1 })
  } else gainMomentum(c, C, MOMENTUM_CHAIN4)
}
export const BASE_CRIT_MULT = 1.5

/** The run's stat perks frozen into this fight (engine/statPerks.ts). */
export function perksOf(c: CombatState): StatPerks {
  return statPerks(c.runStats)
}

export function statBonus(c: CombatState, scale: StatScale | undefined): number {
  if (!scale) return 0
  const val = c.runStats?.[scale.stat] ?? 0
  if (scale.div && scale.div > 0) return Math.max(0, Math.floor(val / scale.div))
  return Math.max(0, Math.floor(val * (scale.mult ?? 1)))
}

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
  /** Extra flat +damage on elite moves (CONTENT.tuning). */
  eliteDmg?: number
  /** Extra +% max HP for bosses only. */
  bossPct?: number
  /** Turn from which elites/bosses build Rage (CONTENT.tuning.rage; Paradox 5 starts it a turn earlier). */
  rageFrom?: number
  /** Paradox 6: elites/bosses build this much more Rage each time. */
  rageExtra?: number
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
  return ((u as UnitStateExt).dmgBonus ?? 0) + (u.statuses.rage ?? 0)
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
  for (const p of setPassives(c.implants)) read(p)
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
  } else emit(c, { t: 'cover', pos: { ...p }, hp: t.hp })
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
  const pct = s.hpPct + (def.tier === 'elite' || def.tier === 'boss' ? s.elitePct : 0) + (def.tier === 'boss' ? (s.bossPct ?? 0) : 0)
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
  const s = (c as CombatStateExt).scaling
  const bonus = (s?.dmg ?? 0) + (def.tier === 'elite' ? (s?.eliteDmg ?? 0) : 0)
  if (bonus) u.dmgBonus = bonus
  c.units.push(u)
  return u
}

/** What makes a turn big: a kill counts like six damage. */
export function turnScore(t: TurnRecord): number {
  return t.damage + t.kills * 6
}

/** Add to the player turn in progress and keep the fight's best. */
function noteTurn(c: CombatState, damage: number, kills: number): void {
  const now = c.turnNow?.turn === c.turn ? c.turnNow : { turn: c.turn, damage: 0, kills: 0 }
  c.turnNow = { turn: c.turn, damage: now.damage + damage, kills: now.kills + kills }
  if (!c.bestTurn || turnScore(c.turnNow) > turnScore(c.bestTurn)) c.bestTurn = { ...c.turnNow }
}

/** IX's interference of this kind is running right now. */
export function glitchActive(c: CombatState, kind: GlitchKind): boolean {
  return c.glitch?.kind === kind && c.turn <= c.glitch.until
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
    if (ph.glitch) {
      c.glitch = { kind: ph.glitch, until: c.turn + 1 }
      emit(c, { t: 'glitch', kind: ph.glitch })
    }
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
  const corrode = u.side === 'enemy' ? (u.statuses.corrode ?? 0) : 0
  const deathPos = { ...u.pos }
  u.hp = 0
  emit(c, { t: 'death', uid: u.uid, cause })
  if (u.uid === 'connector') {
    c.phase = 'lost'
    return
  }
  c.units = c.units.filter((x) => x !== u)
  if (u.side === 'enemy') {
    c.stats.enemiesKilled += 1
    if (!(c as CombatStateExt).inEnemyPhase) noteTurn(c, 0, 1)
    c.killed = { ...(c.killed ?? {}), [u.defId]: (c.killed?.[u.defId] ?? 0) + 1 }
    c.credits += C.enemies[u.defId]?.bounty ?? 0
    const salvage = C.enemies[u.defId]?.salvage ?? 0
    if (salvage > 0) c.parts = (c.parts ?? 0) + salvage
    const environmental = cause === 'void' || u.lastHitBy !== 'party'
    if (environmental) {
      c.stats.environmentKills += 1
      if (c.bonus?.def.kind === 'environment') c.bonus.progress += 1
    }
    if (c.phase === 'player' && !(c as CombatStateExt).inEnemyPhase) {
      gainMomentum(c, C, MOMENTUM_KILL + (environmental ? MOMENTUM_ENV_KILL : 0))
      countChainKill(c, C)
    }
    if (corrode > 0) {
      for (const adj of livingEnemies(c).sort(byUid)) {
        if (Math.abs(adj.pos.x - deathPos.x) + Math.abs(adj.pos.y - deathPos.y) === 1) {
          addStatus(c, adj, 'corrode', corrode)
        }
      }
    }
    const pyre = implantRules(c, C).killFire ?? 0
    const pyreTile = pyre > 0 ? tileAt(c, deathPos) : undefined
    if (pyreTile && isStandable(pyreTile)) {
      pyreTile.fire = Math.max(pyreTile.fire ?? 0, pyre + ((c as CombatStateExt).inEnemyPhase ? 1 : 0))
      emit(c, { t: 'fire', pos: { ...deathPos }, turns: pyreTile.fire })
    }
    fireTrigger(c, C, 'enemy_killed', deathPos)
    if (environmental) fireTrigger(c, C, 'environment_kill', deathPos)
    if (C.enemies[u.defId]?.tier === 'boss') collapseWithBoss(c, C)
  } else if (u.side === 'neutral') {
    if (c.bonus?.def.kind === 'protect') c.bonus.failed = true
    if (c.proto?.litFromX !== undefined) {
      c.proto.darkTurns = 2
      for (const v of [...c.units]) {
        if (v.hp > 0 && Math.abs(v.pos.x - deathPos.x) + Math.abs(v.pos.y - deathPos.y) === 1) dealDamage(c, C, v, 4, { source: 'environment' })
      }
    }
  }
  checkEnd(c, C)
}

/** The boss is the signal source: once no boss stands, its summons and guards shut down with it (no bounty,
 *  no kill triggers) — the fight ends on the boss, not on a 5-hp drone chase. */
function collapseWithBoss(c: CombatState, C: ContentRegistry): void {
  const rest = livingEnemies(c)
  if (rest.some((e) => C.enemies[e.defId]?.tier === 'boss')) return
  for (const e of rest) {
    e.hp = 0
    emit(c, { t: 'death', uid: e.uid, cause: 'collapse' })
  }
  c.units = c.units.filter((x) => !rest.includes(x))
  c.incoming = []
}

// ---------------------------------------------------------------- damage

export interface HitOpts {
  source: DamageSource
  attacker?: UnitState
  /** Card/enemy attack: mark, weak and armor apply. Environmental ticks (bump, hazard, burn, bleed, corrode) skip them. */
  attack?: boolean
  pierce?: boolean
  ignoreBlock?: boolean
  /** Melee/charge hit (triggers the victim's thorns). */
  melee?: boolean
  bonusVsMarked?: number
  /** Tag for the board (burn / bleed / corrode tick / hazard zap / bump). */
  cause?: 'burn' | 'bleed' | 'corrode' | 'hazard' | 'bump'
}

/** DLC 2 prototype: the unit standing on the relay tile, if any, takes direct enemy hits meant for the neutral. */
export function relayProxy(c: CombatState, victim: UnitState): UnitState | undefined {
  const at = c.proto?.relay
  if (!at || victim.side !== 'neutral') return undefined
  return c.units.find((u) => u !== victim && u.hp > 0 && samePos(u.pos, at))
}

/** DLC 2 prototype: a lit tile during the grid rule. */
export function isLit(c: CombatState, p: Pos): boolean {
  const from = c.proto?.litFromX
  return from !== undefined && p.x >= from && !c.proto?.darkTurns
}

/** DLC 2 prototype: what the grid adds to an attack landing on this tile. */
export function gridDelta(c: CombatState, p: Pos): number {
  if (c.proto?.litFromX === undefined) return 0
  return isLit(c, p) ? 2 : -2
}

/** Apply one damage instance. Returns hp actually lost. */
export function dealDamage(c: CombatState, C: ContentRegistry, victim: UnitState, amount: number, o: HitOpts): number {
  if (victim.hp <= 0) return 0
  const proxy = o.attack && o.source === 'enemy' ? relayProxy(c, victim) : undefined
  if (proxy) return dealDamage(c, C, proxy, amount, o)
  let dmg = amount
  if (o.attack) dmg += gridDelta(c, victim.pos)
  if (o.cause === 'bump' && c.proto?.litFromX !== undefined && !isLit(c, victim.pos)) dmg += 2
  let crit = false
  let evaded = 0
  if (o.attack) {
    if (o.attacker?.uid === 'connector' && o.source === 'party') {
      dmg += perksOf(c).attack
    }
    if (o.source === 'party') dmg += implantRules(c, C).attackBonus ?? 0
    const mark = victim.statuses.mark ?? 0
    if (mark > 0) {
      dmg += mark + (o.bonusVsMarked ?? 0) + (o.source === 'party' ? perksOf(c).mark : 0)
      delete victim.statuses.mark
    }
    if (o.attacker && (o.attacker.statuses.weak ?? 0) > 0) dmg -= WEAK_PENALTY
    if (o.attacker && (o.attacker.statuses.focus ?? 0) >= FOCUS_CRIT_THRESHOLD && dmg > 0) {
      crit = true
      const mult = BASE_CRIT_MULT + (o.source === 'party' ? activePassive(c, C, 'critMult') : 0)
      dmg = Math.ceil(dmg * mult)
      addStatus(c, o.attacker, 'focus', -FOCUS_CRIT_THRESHOLD)
      if (o.source === 'party') gainMomentum(c, C, MOMENTUM_CRIT)
    } else if (o.attacker && o.source === 'party' && dmg > 0) {
      const fg = perksOf(c).focusPerHit
      if (fg > 0) addStatus(c, o.attacker, 'focus', fg)
    }
    if (!o.pierce && !crit) dmg -= victim.armor
    if (dmg > 0 && (victim.statuses.evade ?? 0) > 0) {
      const after = Math.floor(dmg / 2)
      evaded = dmg - after
      dmg = after
      decayStatus(victim, 'evade')
      if (victim.side === 'party') gainMomentum(c, C, MOMENTUM_EVADE)
    }
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
  const dmgEv: Extract<CombatEvent, { t: 'damage' }> = {
    t: 'damage',
    uid: victim.uid,
    amount: dmg,
    blocked,
    source: o.source,
  }
  if (o.cause) dmgEv.cause = o.cause
  if (crit) dmgEv.crit = true
  if (evaded > 0) dmgEv.evaded = evaded
  emit(c, dmgEv)
  if (victim.side === 'enemy' && o.source === 'party') {
    c.stats.damageDealt += lost
    noteTurn(c, lost, 0)
  }
  if (victim.uid === 'connector' && lost > 0) {
    c.stats.damageTaken += lost
    if (c.bonus?.def.kind === 'untouched') c.bonus.failed = true
  }
  const thorns = victim.statuses.thorns ?? 0
  if (o.melee && thorns > 0 && o.attacker && o.attacker !== victim && o.attacker.hp > 0) {
    dealDamage(c, C, o.attacker, thorns, { source: victim.side === 'enemy' ? 'enemy' : 'party' })
  }
  // Riposte (X3): the connector grazes a melee hit with Evade and cuts back.
  if (evaded > 0 && o.melee && victim.uid === 'connector' && victim.hp > 0 && o.attacker && o.attacker.side === 'enemy' && o.attacker.hp > 0) {
    dealDamage(c, C, o.attacker, RIPOSTE_DAMAGE, { source: 'party' })
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
  if (status === 'stun') {
    stunUnit(c, u)
    return
  }
  const next = Math.max(0, (u.statuses[status] ?? 0) + amount)
  if (next > 0) u.statuses[status] = next
  else delete u.statuses[status]
  if (amount > 0) emit(c, { t: 'status', uid: u.uid, status, amount })
}

/**
 * Stun (never stacks): an enemy's telegraphed attack is cancelled on the spot and it sits out the next enemy
 * phase — no move, no new telegraph (elites and bosses re-telegraph at that phase's end). A stunned party unit
 * can neither move nor play cards until its turn ends.
 */
export function stunUnit(c: CombatState, u: UnitState): void {
  if (u.hp <= 0 || (u.statuses.stun ?? 0) > 0) return
  u.statuses.stun = 1
  emit(c, { t: 'status', uid: u.uid, status: 'stun', amount: 1 })
  if (u.side === 'enemy' && u.intent) {
    u.intent = null
    emit(c, { t: 'fizzle', uid: u.uid })
  }
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
export function pushUnit(c: CombatState, C: ContentRegistry, u: UnitState, dir: Dir, distance: number, stopBefore?: string, slam = 0, stun = false): void {
  if (u.hp <= 0 || distance <= 0) return
  const from = { ...u.pos }
  const fromTile = tileAt(c, from)
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
    const extra = activePassive(c, C, 'bumpDamage') + perksOf(c).bump
    dealDamage(c, C, u, BUMP_DAMAGE + slam + (u.side === 'party' ? 0 : extra), { source: 'environment', cause: 'bump' })
    if (bumped === 'cover' && bumpPos) damageCover(c, bumpPos, 1)
    else if (bumped !== 'wall') {
      const other = getUnit(c, bumped)
      if (other) {
        dealDamage(c, C, other, BUMP_DAMAGE + slam + (other.side === 'party' ? 0 : extra), { source: 'environment', cause: 'bump' })
        if (other.hp > 0 && implantRules(c, C).pushChain) pushUnit(c, C, other, dir, 1)
      }
    }
    if (stun && u.hp > 0) stunUnit(c, u)
    fireTrigger(c, C, 'bump', u.hp > 0 ? u.pos : bumpPos)
  }
  if (moved && u.hp > 0) {
    tickMoveBleed(c, C, u)
  }
  if (moved && u.hp > 0 && !u.flying) groundJolt(c, C, u, fromTile)
  if (moved) enterGround(c, u)
}

/**
 * Forced movement through damaging ground (owner idea 2026-10-26): a unit shoved onto — or dragged off — fire,
 * live wire or a hazard tile takes that ground's damage once, right now (at most one jolt per push):
 * onto fire = a burn hit, onto a hazard = the hazard hit, off fire / a hazard onto safe ground = that hit.
 */
function groundJolt(c: CombatState, C: ContentRegistry, u: UnitState, fromTile: Tile | undefined): void {
  const to = tileAt(c, u.pos)
  if (to?.kind === 'hazard') {
    dealDamage(c, C, u, hazardDamage(c), { source: 'environment', cause: 'hazard' })
    return
  }
  if ((to?.fire ?? 0) > 0) {
    dealDamage(c, C, u, FIRE_BURN, { source: 'environment', ignoreBlock: true, cause: 'burn' })
    return
  }
  if (fromTile?.kind === 'hazard') dealDamage(c, C, u, hazardDamage(c), { source: 'environment', cause: 'hazard' })
  else if ((fromTile?.fire ?? 0) > 0) dealDamage(c, C, u, FIRE_BURN, { source: 'environment', ignoreBlock: true, cause: 'burn' })
}

/** Damage a hazard tile deals this fight (a mutator can multiply it). */
export function hazardDamage(c: CombatState): number {
  return HAZARD_DAMAGE * (mutatorCombat(c).hazardMult ?? 1)
}

/** AGI perk: the connector's first 3+ tile move each turn grants Evade 1. */
export function sprintEvade(c: CombatState, u: UnitState, tiles: number): void {
  if (u.uid !== 'connector' || tiles < 3 || !perksOf(c).sprintEvade) return
  const key = `t${c.turn}:sprint_evade`
  if (c.triggered[key]) return
  c.triggered[key] = 1
  addStatus(c, u, 'evade', 1)
}

/** Movement / forced movement triggers bleed immediately (ignores block) and decays it by 1. */
export function tickMoveBleed(c: CombatState, C: ContentRegistry, u: UnitState): void {
  if (u.hp <= 0) return
  const bleed = u.statuses.bleed ?? 0
  if (bleed <= 0) return
  dealDamage(c, C, u, bleed, { source: u.side === 'enemy' ? 'party' : 'enemy', ignoreBlock: true, cause: 'bleed' })
  if (u.hp > 0) decayStatus(u, 'bleed')
}

/** A unit just arrived on its tile (move / push / teleport / swap end): burning ground sets it alight. */
export function enterGround(c: CombatState, u: UnitState): void {
  if (u.hp <= 0 || u.flying) return
  if ((tileAt(c, u.pos)?.fire ?? 0) > 0) catchFire(c, u)
}

/** Fire keeps a unit burning at FIRE_BURN or more; it does not stack on top of a fiercer burn. */
function catchFire(c: CombatState, u: UnitState): void {
  const gap = FIRE_BURN - (u.statuses.burn ?? 0)
  if (gap > 0) addStatus(c, u, 'burn', gap)
}

/**
 * End of the enemy phase, before burn ticks: grounded units standing in fire catch (more) fire.
 * After the ticks, `decayGround` burns the fires down and lets temporary hazards revert.
 */
export function igniteStanding(c: CombatState): void {
  for (const u of c.units.slice().sort(byUid)) {
    if (u.hp > 0 && !u.flying && (tileAt(c, u.pos)?.fire ?? 0) > 0) catchFire(c, u)
  }
}

export function decayGround(c: CombatState): void {
  c.tiles.forEach((row, y) =>
    row.forEach((t, x) => {
      if (t.fire !== undefined) {
        t.fire -= 1
        if (t.fire <= 0) delete t.fire
        emit(c, { t: 'fire', pos: { x, y }, turns: t.fire ?? 0 })
      }
      if (t.ttl !== undefined) {
        t.ttl -= 1
        if (t.ttl <= 0) {
          delete t.ttl
          if (t.kind === 'hazard') {
            t.kind = 'floor'
            emit(c, { t: 'tile', pos: { x, y }, kind: 'floor' })
          }
        } else emit(c, { t: 'ttl', pos: { x, y }, turns: t.ttl })
      }
    }),
  )
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

/** Total order for a reshuffle: what the discard holds decides the new draw pile, not the order it was played in. */
function canonicalCardOrder(a: CardInstance, b: CardInstance): number {
  if (a.defId !== b.defId) return a.defId < b.defId ? -1 : 1
  if (!!a.upgraded !== !!b.upgraded) return a.upgraded ? 1 : -1
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0
}

function shuffleInPlace(c: CombatState, cards: CardInstance[]): CardInstance[] {
  // Stream fights sort first (legacy fights shuffle in discard order, as their saves were made).
  const out = c.streams ? cards.slice().sort(canonicalCardOrder) : cards.slice()
  const h = combatStream(c, 'shuffle')
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(h, 0, i)
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
    else if (pile === 'draw') c.draw.splice(randInt(combatStream(c, 'shuffle'), 0, c.draw.length), 0, card)
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
    case 'ignite':
    case 'electrify':
    case 'redirect':
    case 'cancel_intent':
    case 'rewrite':
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

const DEBUFFS: ReadonlySet<StatusKind> = new Set<StatusKind>(['burn', 'bleed', 'corrode', 'shock', 'mark', 'weak', 'stun'])

/** Units an effect applies to. `random_enemy` consumes the combat RNG. */
export function effectTargets(c: CombatState, eff: Effect, res: Resolution): UnitState[] {
  const scope = scopeOf(eff)
  switch (scope) {
    case 'target': {
      const out: UnitState[] = []
      // An attack never hits its own caster — damage, push, or a debuff riding on it (IX stood inside its own
      // Purge List and marked itself). Buff statuses on 'target' tiles still reach the caster.
      const excludeOrigin =
        res.attack && (eff.kind === 'damage' || eff.kind === 'push' || (eff.kind === 'status' && DEBUFFS.has(eff.status)))
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
  emitArea(c, effects, res)
  for (const eff of effects) {
    if (c.phase === 'lost') return
    applyEffect(c, C, eff, res)
  }
}

/** Dominant flavour of an area resolution (see the 'area' event). */
function areaElement(effects: readonly Effect[]): Extract<CombatEvent, { t: 'area' }>['element'] | null {
  const has = (f: (e: Effect) => boolean) => effects.some(f)
  if (has((e) => e.kind === 'ignite' || (e.kind === 'status' && e.status === 'burn'))) return 'fire'
  if (has((e) => e.kind === 'electrify' || (e.kind === 'status' && (e.status === 'shock' || e.status === 'corrode')))) return 'shock'
  if (has((e) => e.kind === 'damage' || (e.kind === 'status' && e.status === 'bleed'))) return 'blast'
  if (has((e) => e.kind === 'push')) return 'force'
  if (has((e) => e.kind === 'block')) return 'shield'
  if (has((e) => e.kind === 'heal')) return 'heal'
  return null
}

/**
 * One 'area' event per multi-tile resolution — an effect with its own area, or an enemy area attack (nova /
 * area lob, which carry a `centre`) — so the board can light up the whole footprint, empty tiles included.
 */
function emitArea(c: CombatState, effects: readonly Effect[], res: Resolution): void {
  const targeted = effects.filter((e) => scopeOf(e) === 'target')
  const shaped = targeted.filter((e) => {
    const a = areaOf(e)
    return a !== undefined && a !== 'single'
  })
  if (shaped.length === 0 && !res.centre) return
  const tiles = uniqPositions((shaped.length > 0 ? shaped : targeted).flatMap((e) => effectTiles(e, res)))
  const element = areaElement(effects)
  if (tiles.length < 2 || !element) return
  const center = res.centre ?? res.impact ?? tiles[0]
  if (!center) return
  emit(c, { t: 'area', tiles, center: { ...center }, element, side: res.side === 'enemy' ? 'enemy' : 'party' })
}

function applyEffect(c: CombatState, C: ContentRegistry, eff: Effect, res: Resolution): void {
  switch (eff.kind) {
    case 'damage': {
      const dmgAmt = eff.amount + statBonus(c, eff.statScale)
      if (dmgAmt > 0) {
        // Environmental sources (held junk, hazards) carry no attacker: no weak/mark/armor interplay.
        const environmental = res.source === 'environment'
        for (const u of effectTargets(c, eff, res)) {
          dealDamage(c, C, u, dmgAmt, {
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
      const reversed = res.side === 'party' && glitchActive(c, 'reverse_push')
      const plans = effectTargets(c, eff, res)
        .map((u) => ({ u, d: pushDirFor(eff, res, u) }))
        .filter((x): x is { u: UnitState; d: Dir } => x.d !== undefined)
        .map((x) => (reversed ? { ...x, d: opposite(x.d) } : x))
      // Front-most units move first so a row of units does not bump into itself.
      const lead = (x: { u: UnitState; d: Dir }) => {
        const v = add({ x: 0, y: 0 }, x.d)
        return x.u.pos.x * v.x + x.u.pos.y * v.y
      }
      plans.sort((a, b) => lead(b) - lead(a))
      const stopBefore = eff.dir === 'toward' ? res.origin?.uid : undefined
      const rules = implantRules(c, C)
      const dist = (eff.distance ?? 1) + (res.side === 'party' ? (mutatorCombat(c).pushBonus ?? 0) + (rules.pushBonus ?? 0) : 0)
      for (const { u, d } of plans) pushUnit(c, C, u, d, dist, stopBefore, eff.slam ?? 0, eff.stun ?? false)
      const recoil = res.side === 'party' ? (rules.pushRecoil ?? 0) : 0
      const first = plans[0]
      if (recoil > 0 && first && res.origin && res.origin.hp > 0 && res.origin.uid !== first.u.uid) {
        pushUnit(c, C, res.origin, opposite(first.d), recoil)
      }
      return
    }
    case 'block': {
      const blkAmt = eff.amount + statBonus(c, eff.statScale)
      for (const u of effectTargets(c, eff, res)) gainBlock(c, u, blkAmt)
      return
    }
    case 'heal':
      for (const u of effectTargets(c, eff, res)) healUnit(c, u, eff.amount)
      return
    case 'status': {
      const isDot = eff.status === 'burn' || eff.status === 'bleed' || eff.status === 'corrode'
      let stAmt = eff.amount + statBonus(c, eff.statScale)
      if (isDot && res.side === 'party' && stAmt > 0) stAmt += perksOf(c).dot
      for (const u of effectTargets(c, eff, res)) addStatus(c, u, eff.status, stAmt)
      return
    }
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
      enterGround(c, o)
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
      enterGround(c, o)
      enterGround(c, other)
      return
    }
    case 'redirect':
      if (eff.to === 'all_enemies') {
        for (const u of livingEnemies(c).sort(byUid)) redirectIntent(c, C, u)
        return
      }
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
    case 'recall': {
      for (let n = 0; n < eff.count && c.hand.length < HAND_MAX; n++) {
        const i = c.exhaust.findLastIndex((card) => (C.cards[card.defId]?.cost ?? -1) >= 0)
        if (i < 0) break
        c.hand.push(c.exhaust.splice(i, 1)[0]!)
      }
      return
    }
    case 'credits':
      c.credits += eff.amount
      return
    case 'ignite': {
      // Lit during the enemy phase, it also has to survive that phase's own burn-down to reach the player's turn.
      const turns = eff.turns + ((c as CombatStateExt).inEnemyPhase ? 1 : 0)
      for (const p of effectTiles(eff, res)) {
        const t = tileAt(c, p)
        if (!t || !isStandable(t) || eff.turns <= 0) continue
        t.fire = Math.max(t.fire ?? 0, turns)
        emit(c, { t: 'fire', pos: { ...p }, turns: t.fire })
      }
      return
    }
    case 'rewrite': {
      for (const p of effectTiles(eff, res)) {
        const t = tileAt(c, p)
        if (!t || t.kind === eff.tile) continue
        // Solid and empty tiles can only be written where nobody stands.
        if ((eff.tile === 'cover' || eff.tile === 'void') && unitAt(c, p)) continue
        t.kind = eff.tile
        delete t.ttl
        if (eff.tile === 'cover') t.hp = COVER_HP
        else delete t.hp
        emit(c, { t: 'tile', pos: { ...p }, kind: eff.tile })
      }
      return
    }
    case 'electrify': {
      const turns = eff.turns + ((c as CombatStateExt).inEnemyPhase ? 1 : 0)
      for (const p of effectTiles(eff, res)) {
        const t = tileAt(c, p)
        if (!t || eff.turns <= 0) continue
        if (t.kind === 'floor') {
          t.kind = 'hazard'
          t.ttl = turns
          emit(c, { t: 'tile', pos: { ...p }, kind: 'hazard' })
        } else if (t.kind === 'hazard' && t.ttl !== undefined && turns > t.ttl) {
          t.ttl = turns
          emit(c, { t: 'ttl', pos: { ...p }, turns })
        }
      }
      return
    }
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

/** `by` = the party unit that caused it (card plays): companion passives marked `ownerOnly` need it to match. */
export function fireTrigger(c: CombatState, C: ContentRegistry, on: TriggerEvent, at?: Pos, by?: string): void {
  if (c.phase === 'lost' || triggerDepth >= MAX_TRIGGER_DEPTH) return
  triggerDepth += 1
  try {
    fireTriggerUnguarded(c, C, on, at)
    firePassives(c, C, on, at, by)
  } finally {
    triggerDepth -= 1
  }
}

/** Companion combat passives: like implant triggers, but each standing companion is the origin of its own. */
function firePassives(c: CombatState, C: ContentRegistry, on: TriggerEvent, at: Pos | undefined, by: string | undefined): void {
  const mates = c.units.filter((u) => u.side === 'party' && u.uid !== 'connector' && u.hp > 0).sort(byUid)
  for (const m of mates) {
    const passive = C.companions[m.defId]?.combatPassive
    if (!passive) continue
    passive.triggers.forEach((t, i) => {
      if (t.on !== on || m.hp <= 0 || c.phase === 'lost') return
      if (t.ownerOnly && by !== m.uid) return
      if (t.limit) {
        const key = t.limit === 'turn' ? `t${c.turn}:p:${m.uid}#${i}` : `c:p:${m.uid}#${i}`
        if ((c.triggered[key] ?? 0) >= 1) return
        c.triggered[key] = (c.triggered[key] ?? 0) + 1
      }
      emit(c, { t: 'passive', uid: m.uid, companionId: m.defId })
      applyEffects(c, C, t.effects, {
        origin: m,
        side: 'party',
        impact: at ? { ...at } : { ...m.pos },
        tiles: [{ ...m.pos }],
        source: 'party',
        attack: true,
      })
    })
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
