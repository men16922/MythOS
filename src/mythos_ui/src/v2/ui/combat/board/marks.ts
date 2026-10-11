// Board overlays as data: the intents per tile (damage, wind-up, pushes, void drops) and the tiles with a
// countdown (burning ground, electrified hazards). Pure — the board's label / tile layers render these.

import type { IntentInfo } from '../../../engine/combat.ts'
import { add, dirToward, posKey } from '../../../engine/grid.ts'
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
        const away =
          iv.info.dir && iv.info.move.pattern !== 'lob' && iv.info.move.pattern !== 'nova' ? iv.info.dir : dirToward(iv.info.target ?? iv.unit.pos, p)
        const d = away && pushes.dir === 'toward' ? ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[away] : away
        cur.push = d ?? null
        // Mirrors engine pushUnit: a grounded enemy shoved onto a void tile falls (allies stop at the rim).
        const victim = units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
        const dest = d ? add(p, d) : null
        if (victim && dest && victim.side === 'enemy' && !victim.flying && c.tiles[dest.y]?.[dest.x]?.kind === 'void' && !units.some((u) => u.hp > 0 && u.pos.x === dest.x && u.pos.y === dest.y))
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
