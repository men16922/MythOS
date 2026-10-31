// Board overlays as data: the intents per tile (damage, wind-up, pushes, void drops) and the tiles with a
// countdown (burning ground, electrified hazards). Pure — the board's label / tile layers render these.

import type { CombatPreview, IntentInfo } from '../../../engine/combat.ts'
import { gridDelta, relayProxy } from '../../../engine/effects.ts'
import { add, dirToward, posKey, samePos } from '../../../engine/grid.ts'
import type { CombatState, Dir, Pos, Tile, UnitState } from '../../../engine/types.ts'

export interface IntentView {
  uid: string
  unit: UnitState
  info: IntentInfo
}

export interface TileMark {
  /** false when only lock-on intents touch the tile (their number sits on the reticle). */
  labelled: boolean
  p: Pos
  dmg: number
  wind: number
  uids: string[]
  push: Dir | null
  /** The unit standing here gets pushed into the void by this intent (enemy-on-enemy kills included). */
  drops: boolean
}

/** Aggregate intent damage per tile (labels) and incoming damage per party unit. */
export function aggregateIntents(intents: IntentView[], c: CombatState): { tileDmg: Map<string, TileMark>; danger: Record<string, number> } {
  const units = c.units
  const tileDmg = new Map<string, TileMark>()
  for (const iv of intents) {
    // A charge always shoves what it hits one tile on (engine/intents.ts fireIntent).
    const pushes = iv.info.move.pattern === 'charge' ? ({ kind: 'push', dir: 'away' } as const) : iv.info.move.effects?.find((e) => e.kind === 'push')
    for (const p of iv.info.tiles) {
      if (p.x === iv.unit.pos.x && p.y === iv.unit.pos.y) continue
      const key = posKey(p)
      const cur = tileDmg.get(key) ?? { p, dmg: 0, wind: 0, uids: [], push: null, labelled: false, drops: false }
      if (iv.info.move.pattern !== 'track') cur.labelled = true
      if (iv.info.windupLeft > 0) cur.wind = Math.max(cur.wind, iv.info.windupLeft + 1)
      else cur.dmg += iv.info.damage
      cur.uids.push(iv.uid)
      if (pushes && pushes.kind === 'push') {
        const away = iv.info.dir && iv.info.move.pattern !== 'lob' && iv.info.move.pattern !== 'nova' ? iv.info.dir : dirToward(iv.info.target ?? iv.unit.pos, p)
        const d = away && pushes.dir === 'toward' ? ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[away] : away
        cur.push = d ?? null
        // Mirrors engine pushUnit: a grounded enemy shoved onto a void tile falls (allies stop at the rim).
        const victim = units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
        const dest = d ? add(p, d) : null
        if (
          victim &&
          dest &&
          victim.side === 'enemy' &&
          !victim.flying &&
          c.tiles[dest.y]?.[dest.x]?.kind === 'void' &&
          !units.some((u) => u.hp > 0 && u.pos.x === dest.x && u.pos.y === dest.y)
        )
          cur.drops = true
      }
      tileDmg.set(key, cur)
    }
  }
  const danger: Record<string, number> = {}
  for (const u of units) {
    if (u.side === 'enemy' || u.hp <= 0) continue
    const t = tileDmg.get(posKey(u.pos))
    if (t && t.dmg > 0) danger[u.uid] = t.dmg
  }
  return { tileDmg, danger }
}

/** The board once the aimed card has landed: pushed units on their landing tile, hp as predicted. */
export function boardAfter(c: CombatState, preview: CombatPreview | null | undefined): CombatState {
  if (!preview || !preview.units.some((r) => r.to || r.dies)) return c
  const rows = new Map(preview.units.map((r) => [r.uid, r]))
  return {
    ...c,
    units: c.units.map((u) => {
      const r = rows.get(u.uid)
      return r ? { ...u, pos: r.to ? { ...r.to } : u.pos, hp: r.hpAfter } : u
    }),
  }
}

const fires = (iv: IntentView): boolean => iv.info.windupLeft === 0 && (iv.unit.statuses.shock ?? 0) === 0 && iv.info.damage > 0

/** Hp `u` stands to lose this enemy phase. Walks the hits in firing order so Mark counts (+N on the next hit, and Lock
 *  On re-marks after each hit), then takes armor and current block off. `standsFor` is the neutral's tile when `u` is on
 *  the relay: those hits land on `u` too, so a sweep over both tiles hits it twice. */
export function expectedLoss(u: UnitState, intents: IntentView[], c: CombatState, standsFor?: Pos): number {
  let mark = u.statuses.mark ?? 0
  let total = 0
  const delta = gridDelta(c, u.pos)
  for (const iv of intents) {
    if (!fires(iv)) continue
    const hits = iv.info.tiles.filter((p) => (samePos(p, u.pos) || (!!standsFor && samePos(p, standsFor))) && !samePos(p, iv.unit.pos)).length
    if (hits === 0) continue
    for (let i = 0; i < hits; i++) {
      total += Math.max(0, iv.info.damage + delta + mark - u.armor)
      mark = 0
    }
    for (const e of iv.info.move.effects ?? []) if (e.kind === 'status' && e.status === 'mark' && !e.to) mark += e.amount
  }
  return Math.max(0, total - u.block)
}

export interface RelayHit {
  neutralUid: string
  proxyUid: string
  /** Everything the unit on the relay stands to lose, its own tile included. */
  hit: number
}

/** Who answers for the neutral this enemy phase; null unless a unit is on the relay and a fired attack is aimed at it. */
export function relayHit(intents: IntentView[], c: CombatState): RelayHit | null {
  const neutral = c.units.find((u) => u.side === 'neutral' && u.hp > 0)
  const proxy = neutral && relayProxy(c, neutral)
  if (!neutral || !proxy) return null
  if (!intents.some((iv) => fires(iv) && iv.info.tiles.some((p) => samePos(p, neutral.pos) && !samePos(p, iv.unit.pos)))) return null
  return { neutralUid: neutral.uid, proxyUid: proxy.uid, hit: expectedLoss(proxy, intents, c, neutral.pos) }
}

/** A tile with a countdown: burning ground (`fire` turns) and / or a temporary electrified hazard (`ttl`). */
export interface GroundMark {
  p: Pos
  fire: number
  ttl: number
}

/** Ground effects with a countdown: burning ground and temporary (electrified) hazards. */
export function groundMarks(tiles: Tile[][]): GroundMark[] {
  const ground: GroundMark[] = []
  tiles.forEach((row, y) =>
    row.forEach((t, x) => {
      const fire = t.fire ?? 0
      const ttl = t.kind === 'hazard' ? (t.ttl ?? 0) : 0
      if (fire > 0 || ttl > 0) ground.push({ p: { x, y }, fire, ttl })
    }),
  )
  return ground
}
