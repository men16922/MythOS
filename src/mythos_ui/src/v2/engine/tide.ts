// Mythos 2.0 — the tide (DLC 3): water climbs the board from the bottom row and falls again on a fixed, public pattern.
// A flooded floor tile is simply a hazard tile with `water` set, so pushes, enemy pathing, threat maps and the bots all read
// it the way they read live wire. It rises after the enemies fire, so the tiles shown as next stand a full turn of warning.

import { emit, killUnit, unitAt } from './effects.ts'
import type { CombatState, ContentRegistry, Pos } from './types.ts'

const levelAt = (pattern: readonly number[], step: number): number => pattern[step % pattern.length] ?? 0

export const tideLevel = (c: CombatState): number => (c.tide ? levelAt(c.tide.pattern, c.tide.step) : 0)

/** How high the water stands after the coming enemy phase. */
export const nextTideLevel = (c: CombatState): number => (c.tide ? levelAt(c.tide.pattern, c.tide.step + 1) : 0)

/** Will this tile be under water once the coming enemy phase has run? */
export function floodsNext(c: CombatState, p: Pos): boolean {
  return !!c.tide && p.y >= c.tiles.length - nextTideLevel(c)
}

/** Bring the tiles in line with the current level. Rising water sweeps away the lightest enemies it reaches. */
function settle(c: CombatState, C: ContentRegistry, sweep: boolean): void {
  const wet = c.tiles.length - tideLevel(c)
  c.tiles.forEach((row, y) =>
    row.forEach((t, x) => {
      const pos = { x, y }
      if (y >= wet && t.kind === 'floor') {
        t.kind = 'hazard'
        t.water = true
        delete t.fire
        emit(c, { t: 'tile', pos, kind: 'hazard' })
        const u = sweep ? unitAt(c, pos) : undefined
        if (u && u.side === 'enemy' && !u.flying && C.enemies[u.defId]?.tier === 'minion') killUnit(c, C, u, 'void')
      } else if (y < wet && t.water) {
        t.kind = 'floor'
        delete t.water
        emit(c, { t: 'tile', pos, kind: 'floor' })
      }
    }),
  )
}

export function startTide(c: CombatState, C: ContentRegistry, pattern: readonly number[]): void {
  c.tide = { pattern: [...pattern], step: 0 }
  settle(c, C, false)
}

export function advanceTide(c: CombatState, C: ContentRegistry): void {
  if (!c.tide) return
  c.tide.step += 1
  settle(c, C, true)
}

