// Mythos 2.0 — enemy intents: telegraph geometry, resolution and the enemy AI that picks them.
//
// Relative patterns (melee/line/beam/charge/nova) are always recomputed from the enemy's CURRENT position
// and facing, so pushing an enemy drags its attack along (it can hit its own side). Lobs keep the absolute
// tile chosen when they were telegraphed.

import type {
  CombatState,
  ContentRegistry,
  Dir,
  Effect,
  EnemyAi,
  EnemyDef,
  EnemyMove,
  IntentPattern,
  IntentState,
  Pos,
  UnitState,
} from './types.ts'
import { DIRS, add, areaTiles, dirToward, inBounds, manhattan, posKey, rayTiles, samePos } from './grid.ts'
import { rand } from './rng.ts'
import {
  applyEffects,
  byUid,
  dmgBonusOf,
  emit,
  isStandable,
  livingEnemies,
  nearestFreeTile,
  opponentsOf,
  scopeOf,
  spawnEnemy,
  tileAt,
  unitAt,
  WEAK_PENALTY,
} from './effects.ts'

export const DEFAULT_RANGE = { line: 6, beam: 6, charge: 6, lob: 5 } as const
export const LOB_MIN_RANGE = 2
/** Summoners stop calling help once this many enemies stand. */
export const SUMMON_CAP = 6

export interface IntentGeometry {
  /** Tiles that take the hit. */
  tiles: Pos[]
  /** Travel lane for line/beam/charge (for arrows); for charge, the dash tiles before the blocker. */
  path: Pos[]
  impact?: Pos
  /** Charge: where the dash ends. */
  dashTo?: Pos
}

export function findMove(C: ContentRegistry, u: UnitState, moveId: string): EnemyMove | undefined {
  return C.enemies[u.defId]?.moves.find((m) => m.id === moveId)
}

export function isRelative(p: IntentPattern): boolean {
  return p === 'melee' || p === 'line' || p === 'beam' || p === 'charge' || p === 'nova'
}

/** Damage the move would deal before the victim's mark/armor/block. */
export function effectiveIntentDamage(u: UnitState, move: EnemyMove): number {
  if (!move.damage) return 0
  return Math.max(0, move.damage + dmgBonusOf(u) - ((u.statuses.weak ?? 0) > 0 ? WEAK_PENALTY : 0))
}

export function intentGeometry(c: CombatState, u: UnitState, move: EnemyMove, intent: { dir?: Dir; target?: Pos }): IntentGeometry {
  const dir = intent.dir ?? u.facing
  switch (move.pattern) {
    case 'melee': {
      const p = add(u.pos, dir)
      if (!inBounds(p)) return { tiles: [], path: [] }
      return { tiles: areaTiles(p, move.area, dir), path: [], impact: p }
    }
    case 'line': {
      const path: Pos[] = []
      let impact: Pos | undefined
      for (const p of rayTiles(u.pos, dir, move.range ?? DEFAULT_RANGE.line)) {
        path.push(p)
        if (unitAt(c, p) || tileAt(c, p)?.kind === 'cover') {
          impact = p
          break
        }
      }
      impact ??= path[path.length - 1]
      return { tiles: impact ? areaTiles(impact, move.area, dir) : [], path, impact }
    }
    case 'beam': {
      const tiles = rayTiles(u.pos, dir, move.range ?? DEFAULT_RANGE.beam)
      return { tiles, path: tiles }
    }
    case 'charge': {
      const path: Pos[] = []
      let p = u.pos
      let blocker: Pos | undefined
      const range = move.range ?? DEFAULT_RANGE.charge
      for (let i = 0; i < range; i++) {
        const next = add(p, dir)
        if (!inBounds(next)) break
        const t = tileAt(c, next)
        if (t?.kind === 'cover' || unitAt(c, next)) {
          blocker = next
          break
        }
        if (t?.kind === 'void') break
        p = next
        path.push(next)
      }
      // A dash that ends on the last tile of its range only hits what stands right in front of it.
      if (!blocker && path.length === range) {
        const next = add(p, dir)
        if (inBounds(next) && (unitAt(c, next) || tileAt(c, next)?.kind === 'cover')) blocker = next
      }
      return { tiles: blocker ? [blocker] : [], path, impact: blocker, dashTo: { ...p } }
    }
    case 'nova':
      return { tiles: areaTiles(u.pos, move.area ?? 'adjacent').filter((p) => !samePos(p, u.pos)), path: [] }
    case 'lob':
      return intent.target ? { tiles: areaTiles(intent.target, move.area), path: [], impact: { ...intent.target } } : { tiles: [], path: [] }
    case 'buff':
    case 'summon':
      return { tiles: [], path: [] }
  }
}

// ---------------------------------------------------------------- resolution

/** Fire (or wind up / fizzle) one enemy's intent during the enemy phase. */
export function fireIntent(c: CombatState, C: ContentRegistry, u: UnitState): void {
  const intent = u.intent
  if (!intent || u.hp <= 0) return
  if ((u.statuses.shock ?? 0) > 0) {
    u.intent = null
    emit(c, { t: 'fizzle', uid: u.uid })
    return
  }
  if (intent.windupLeft > 0) {
    intent.windupLeft -= 1
    return
  }
  u.intent = null
  const move = findMove(C, u, intent.moveId)
  if (!move) return
  const dir = intent.dir ?? u.facing
  const geo = intentGeometry(c, u, move, intent)
  emit(c, { t: 'attack', uid: u.uid, moveId: move.id, tiles: geo.tiles.map((p) => ({ ...p })) })

  if (move.pattern === 'buff') {
    applyEffects(c, C, move.effects ?? [], { origin: u, side: 'enemy', impact: u.pos, tiles: [u.pos], source: 'enemy' })
    return
  }
  if (move.pattern === 'summon') {
    const s = move.summon
    if (!s) return
    for (let i = 0; i < s.count; i++) {
      const at = nearestFreeTile(c, u.pos)
      if (!at) break
      const spawned = spawnEnemy(c, C, s.enemyId, at)
      if (spawned) {
        spawned.facing = u.facing
        emit(c, { t: 'spawn', uid: spawned.uid })
      }
    }
    return
  }
  if (move.pattern === 'charge' && geo.dashTo && !samePos(geo.dashTo, u.pos)) {
    emit(c, { t: 'move', uid: u.uid, path: [{ ...u.pos }, ...geo.path.map((p) => ({ ...p }))] })
    u.pos = { ...geo.dashTo }
  }
  const effects: Effect[] = []
  // Weak is applied per hit by dealDamage (the attacker is the origin).
  if (move.damage) effects.push({ kind: 'damage', amount: move.damage + dmgBonusOf(u) })
  if (move.pattern === 'charge') effects.push({ kind: 'push', dir: 'away', distance: 1 })
  effects.push(...(move.effects ?? []))
  const centre = move.pattern === 'nova' ? u.pos : move.area && move.area !== 'single' ? geo.impact : undefined
  applyEffects(c, C, effects, {
    origin: u,
    side: 'enemy',
    impact: geo.impact,
    dir,
    tiles: geo.tiles,
    source: 'enemy',
    melee: move.pattern === 'melee' || move.pattern === 'charge',
    attack: true,
    ...(centre ? { centre: { ...centre } } : {}),
  })
}

// ---------------------------------------------------------------- AI

interface Orientation {
  dir?: Dir
  target?: Pos
}

interface Spot {
  pos: Pos
  path: Pos[]
}

interface AiContext {
  /** Units the enemies want to hit (party + neutral). */
  targets: UnitState[]
  /** posKey → damage already telegraphed onto that tile by other enemies. */
  threat: Map<string, number>
  incoming: Set<string>
  /**
   * posKey → how likely a party unit ends its next turn there: 1 where it stands now, less on tiles it can
   * reach (more on tiles next to an enemy — where it would stand to attack). Lets lanes/areas value zoning.
   */
  heat: Map<string, number>
}

/** AI weights (exported so balance sweeps can tune them without editing the engine). */
export const AI_TUNING = {
  /** Presence heat on a tile a party unit can reach that is next to an enemy (an attack spot). */
  heatAttackSpot: 0.35,
  /** Presence heat on any other tile a party unit can reach. */
  heatReachable: 0.12,
  /** Score noise (combat RNG) so equal options vary between fights. */
  noise: 0.4,
}

function presenceHeat(c: CombatState, targets: UnitState[]): Map<string, number> {
  const heat = new Map<string, number>()
  const bump = (p: Pos, h: number) => heat.set(posKey(p), Math.max(heat.get(posKey(p)) ?? 0, h))
  const enemies = livingEnemies(c)
  for (const t of targets) {
    bump(t.pos, 1)
    if (t.side !== 'party' || (t.statuses.shock ?? 0) > 0) continue
    for (let y = 0; y < c.tiles.length; y++) {
      for (let x = 0; x < (c.tiles[y]?.length ?? 0); x++) {
        const p = { x, y }
        const d = manhattan(p, t.pos)
        if (d === 0 || d > t.move || !isStandable(tileAt(c, p)) || unitAt(c, p)) continue
        bump(p, enemies.some((e) => manhattan(e.pos, p) === 1) ? AI_TUNING.heatAttackSpot : AI_TUNING.heatReachable)
      }
    }
  }
  return heat
}

/** Tiles an enemy can end its move on: BFS ≤ move, through other enemies, never through party/cover. */
export function enemyReach(c: CombatState, u: UnitState): Spot[] {
  const start = u.pos
  const paths = new Map<string, Pos[]>([[posKey(start), []]])
  const queue: Pos[] = [start]
  while (queue.length > 0) {
    const p = queue.shift() as Pos
    const path = paths.get(posKey(p)) ?? []
    if (path.length >= u.move) continue
    for (const d of DIRS) {
      const n = add(p, d)
      if (!inBounds(n) || paths.has(posKey(n))) continue
      const t = tileAt(c, n)
      if (!t || t.kind === 'cover' || (t.kind === 'void' && !u.flying)) continue
      const occ = unitAt(c, n)
      if (occ && occ.side !== 'enemy') continue
      paths.set(posKey(n), [...path, n])
      queue.push(n)
    }
  }
  const out: Spot[] = []
  for (const [, path] of paths) {
    const pos = path[path.length - 1] ?? start
    if (path.length > 0) {
      const t = tileAt(c, pos)
      if (!isStandable(t) || unitAt(c, pos)) continue
      if (t?.kind === 'hazard' && !u.flying) continue
    }
    out.push({ pos, path })
  }
  return out
}

function telegraphThreat(c: CombatState, C: ContentRegistry, self: UnitState): Map<string, number> {
  const threat = new Map<string, number>()
  for (const e of livingEnemies(c)) {
    if (e === self || !e.intent) continue
    const move = findMove(C, e, e.intent.moveId)
    if (!move) continue
    const dmg = effectiveIntentDamage(e, move)
    for (const p of intentGeometry(c, e, move, e.intent).tiles) {
      threat.set(posKey(p), (threat.get(posKey(p)) ?? 0) + Math.max(1, dmg))
    }
  }
  return threat
}

function flavour(ai: EnemyAi, pattern: IntentPattern): number {
  switch (ai) {
    case 'brawler':
      return pattern === 'melee' || pattern === 'charge' ? 1.2 : 1
    case 'shooter':
      return pattern === 'line' || pattern === 'beam' ? 1.2 : 1
    case 'artillery':
      return pattern === 'lob' ? 1.25 : 1
    case 'support':
      return pattern === 'buff' || pattern === 'summon' ? 1.4 : 1
    default:
      return 1
  }
}

function minDist(p: Pos, units: UnitState[]): number {
  let best = 99
  for (const u of units) best = Math.min(best, manhattan(p, u.pos))
  return best
}

function positionScore(c: CombatState, u: UnitState, def: EnemyDef, p: Pos, ctx: AiContext): number {
  const dmin = minDist(p, ctx.targets)
  let s = 0
  switch (def.ai) {
    case 'brawler':
    case 'boss':
      s -= 0.35 * dmin
      break
    case 'shooter':
      s += dmin < 2 ? -1.5 * (2 - dmin) : dmin > 4 ? -0.4 * (dmin - 4) : 0.3
      break
    case 'artillery':
      s += dmin <= 1 ? -2.5 : dmin < 3 ? -0.8 : 0.1 * Math.min(dmin, 6)
      break
    case 'support': {
      const allies = livingEnemies(c).filter((e) => e !== u)
      s += dmin <= 1 ? -2 : dmin < 3 ? -0.6 : 0.2
      if (allies.length > 0) s -= 0.1 * minDist(p, allies)
      break
    }
    case 'static':
      break
  }
  if (!u.flying) {
    for (const d of DIRS) if (tileAt(c, add(p, d))?.kind === 'void') s -= 0.5
  }
  s -= 1.2 * (ctx.threat.get(posKey(p)) ?? 0)
  if (ctx.incoming.has(posKey(p))) s -= 4
  return s
}

function riderValue(effects: readonly Effect[] | undefined, pattern: IntentPattern): number {
  let v = pattern === 'charge' ? 1.5 : 0
  for (const e of effects ?? []) {
    if (e.kind === 'push') v += 1.5
    else if (e.kind === 'status') v += 0.8 * e.amount
  }
  return v
}

function buffValue(c: CombatState, u: UnitState, move: EnemyMove): number {
  let v = 0
  const self = [u]
  for (const e of move.effects ?? []) {
    const scope = scopeOf(e)
    const recips =
      scope === 'all_allies'
        ? livingEnemies(c)
        : scope === 'all_enemies' || scope === 'random_enemy' || scope === 'connector'
          ? opponentsOf(c, 'enemy').slice(0, scope === 'all_enemies' ? undefined : 1)
          : self
    for (const r of recips) {
      const hostile = r.side !== 'enemy'
      switch (e.kind) {
        case 'block':
          v += hostile ? 0 : 0.35 * Math.min(e.amount, 8)
          break
        case 'heal':
          v += hostile ? 0 : 0.6 * Math.min(e.amount, r.maxHp - r.hp)
          break
        case 'status':
          v += (hostile ? 1.2 : 0.6) * e.amount
          break
        case 'damage':
          v += hostile ? e.amount : -e.amount
          break
        default:
          v += 0.3
      }
    }
  }
  return Math.max(0.3, v)
}

function attackValue(c: CombatState, u: UnitState, move: EnemyMove, geo: IntentGeometry, ctx: AiContext): number {
  const dmg = effectiveIntentDamage(u, move)
  const rider = riderValue(move.effects, move.pattern)
  let v = 0
  let hit = false
  for (const p of geo.tiles) {
    const t = unitAt(c, p)
    if (!t) {
      // Zoning: an empty tile the party is likely to step onto.
      const h = ctx.heat.get(posKey(p)) ?? 0
      if (h > 0 && dmg > 0) v += (dmg + rider) * h * (ctx.threat.has(posKey(p)) ? 0.4 : 1)
      continue
    }
    if (t === u) continue
    const eff = Math.max(0, dmg - t.armor)
    if (t.side === 'enemy') {
      v -= 0.9 * (eff + 1)
      continue
    }
    const w = t.side === 'neutral' ? 1.2 : t.uid === 'connector' ? 1.5 : 1
    let tv = (eff + rider) * w * (eff >= t.hp ? 3 : 1)
    if (ctx.threat.has(posKey(p))) tv *= 0.75
    v += tv
    hit = true
  }
  if (!hit && ctx.targets.length > 0) {
    // Nothing in the way yet: aim at the lane closest to the party so the telegraph still zones them.
    let best = 0
    for (const p of [...geo.tiles, ...geo.path]) best = Math.max(best, 1.6 / (1 + minDist(p, ctx.targets)))
    v += best
  }
  return v
}

function orientations(c: CombatState, u: UnitState, move: EnemyMove, ctx: AiContext): Orientation[] {
  switch (move.pattern) {
    case 'melee':
    case 'line':
    case 'beam':
    case 'charge':
      return DIRS.map((dir) => ({ dir }))
    case 'lob': {
      const range = move.range ?? DEFAULT_RANGE.lob
      const inRange = (p: Pos) => {
        const d = manhattan(u.pos, p)
        return d >= LOB_MIN_RANGE && d <= range && inBounds(p)
      }
      const seen = new Set<string>()
      const out: Orientation[] = []
      for (const t of ctx.targets) {
        for (const p of areaTiles(t.pos, move.area)) {
          if (inRange(p) && !seen.has(posKey(p))) {
            seen.add(posKey(p))
            out.push({ target: p })
          }
        }
      }
      if (out.length === 0) {
        // Nobody in range: lob at the reachable tile nearest the party.
        let best: Pos | undefined
        let bestD = 99
        for (let y = 0; y < c.tiles.length; y++) {
          for (let x = 0; x < (c.tiles[y]?.length ?? 0); x++) {
            const p = { x, y }
            if (!inRange(p)) continue
            const d = minDist(p, ctx.targets)
            if (d < bestD) {
              bestD = d
              best = p
            }
          }
        }
        if (best) out.push({ target: best })
      }
      return out
    }
    case 'nova':
    case 'buff':
    case 'summon':
      return [{}]
  }
}

/**
 * Pick where an enemy moves and what it telegraphs next. Scores every (reachable tile × usable move ×
 * orientation) and commits the best: damage to the party (connector ×1.5, lethal ×3, protect target ×1.2),
 * minus friendly fire, plus an AI-flavoured position score and a little combat-RNG noise.
 */
export function planIntent(c: CombatState, C: ContentRegistry, u: UnitState, canMove: boolean): void {
  const def = C.enemies[u.defId]
  u.intent = null
  if (!def) return
  const phase = u.phase ?? 0
  // Moves on cooldown (or locked behind a later boss phase) are out; with none left the enemy only repositions.
  const usable = def.moves.filter((m) => (m.minPhase ?? 0) <= phase && (m.weight ?? 1) > 0 && (u.cooldowns?.[m.id] ?? 0) <= 0)
  const targets = opponentsOf(c, 'enemy')
  const ctx: AiContext = {
    targets,
    threat: telegraphThreat(c, C, u),
    incoming: new Set(c.incoming.map((i) => posKey(i.pos))),
    heat: presenceHeat(c, targets),
  }
  const mobile = canMove && def.ai !== 'static' && u.move > 0 && (u.statuses.shock ?? 0) <= 0
  const spots = mobile ? enemyReach(c, u) : [{ pos: u.pos, path: [] }]
  const home = u.pos
  let best: { score: number; spot: Spot; move?: EnemyMove; o: Orientation } | undefined
  const consider = (score: number, spot: Spot, move?: EnemyMove, o: Orientation = {}) => {
    if (!best || score > best.score) best = move ? { score, spot, move, o } : { score, spot, o }
  }
  for (const spot of spots) {
    u.pos = spot.pos
    const ps = positionScore(c, u, def, spot.pos, ctx) + (spot.path.length === 0 ? 0.1 : 0)
    if (usable.length === 0) consider(ps + rand(c) * AI_TUNING.noise, spot)
    for (const move of usable) {
      const f = flavour(def.ai, move.pattern) * Math.sqrt(move.weight ?? 1)
      for (const o of orientations(c, u, move, ctx)) {
        let val: number
        if (move.pattern === 'buff') val = buffValue(c, u, move)
        else if (move.pattern === 'summon') val = livingEnemies(c).length < SUMMON_CAP ? 3.5 * (move.summon?.count ?? 1) : -5
        else val = attackValue(c, u, move, intentGeometry(c, u, move, o), ctx)
        consider(ps + val * f + rand(c) * AI_TUNING.noise, spot, move, o)
      }
    }
  }
  u.pos = home
  const pick = best as { score: number; spot: Spot; move?: EnemyMove; o: Orientation } | undefined
  if (!pick) return
  if (pick.spot.path.length > 0) {
    emit(c, { t: 'move', uid: u.uid, path: [{ ...home }, ...pick.spot.path.map((p) => ({ ...p }))] })
    u.pos = { ...pick.spot.pos }
  }
  const move = pick.move
  if (!move) return
  const facing = pick.o.dir ?? (pick.o.target ? dirToward(u.pos, pick.o.target) : undefined)
  if (facing) u.facing = facing
  const intent: IntentState = { moveId: move.id, windupLeft: move.windup ?? 0 }
  if (pick.o.dir) intent.dir = pick.o.dir
  if (pick.o.target) intent.target = { ...pick.o.target }
  u.intent = intent
  if (move.cooldown) {
    u.cooldowns ??= {}
    u.cooldowns[move.id] = move.cooldown + 1 + (move.windup ?? 0)
  }
}

/** Step (c) of the enemy phase: tick cooldowns, then every enemy without a pending windup moves and telegraphs. */
export function enemiesTelegraph(c: CombatState, C: ContentRegistry, canMove: boolean): void {
  for (const e of livingEnemies(c).sort(byUid)) {
    if (!e.cooldowns) continue
    for (const k of Object.keys(e.cooldowns)) {
      const v = (e.cooldowns[k] ?? 0) - 1
      if (v > 0) e.cooldowns[k] = v
      else delete e.cooldowns[k]
    }
  }
  for (const e of livingEnemies(c).sort(byUid)) {
    if (c.phase !== 'player') return
    // A pending (winding-up) intent stays; everyone who fired, fizzled or just arrived re-plans.
    if (e.hp <= 0 || e.intent) continue
    planIntent(c, C, e, canMove)
  }
}
