// Board geometry helpers shared by the combat engine, AI and UI previews.

import { GRID_H, GRID_W } from './types.ts'
import type { AreaShape, Dir, Pos } from './types.ts'

export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left']

export const DIR_VEC: Record<Dir, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function inBounds(p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < GRID_W && p.y < GRID_H
}

export function add(p: Pos, d: Dir, n = 1): Pos {
  const v = DIR_VEC[d]
  return { x: p.x + v.x * n, y: p.y + v.y * n }
}

export function samePos(a: Pos | undefined | null, b: Pos | undefined | null): boolean {
  return !!a && !!b && a.x === b.x && a.y === b.y
}

export function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function opposite(d: Dir): Dir {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left'
}

/** Direction from a to b along the dominant axis (ties prefer horizontal). Undefined if a == b. */
export function dirToward(a: Pos, b: Pos): Dir | undefined {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return undefined
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

/** Tiles straight out from `origin` in `dir` (excluding origin), up to `range`, clipped to the board. */
export function rayTiles(origin: Pos, dir: Dir, range: number): Pos[] {
  const out: Pos[] = []
  for (let i = 1; i <= range; i++) {
    const p = add(origin, dir, i)
    if (!inBounds(p)) break
    out.push(p)
  }
  return out
}

/** Tiles covered by an area centred on `center`. `dir` orients the 'row' shape. Clipped to the board. */
export function areaTiles(center: Pos, area: AreaShape | undefined, dir?: Dir): Pos[] {
  const out: Pos[] = []
  const push = (p: Pos) => {
    if (inBounds(p)) out.push(p)
  }
  switch (area ?? 'single') {
    case 'single':
      push(center)
      break
    case 'cross':
      push(center)
      for (const d of DIRS) push(add(center, d))
      break
    case 'adjacent':
      for (const d of DIRS) push(add(center, d))
      break
    case 'square':
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) push({ x: center.x + dx, y: center.y + dy })
      break
    case 'row': {
      push(center)
      const horizontal = dir === 'left' || dir === 'right'
      if (horizontal) {
        push({ x: center.x, y: center.y - 1 })
        push({ x: center.x, y: center.y + 1 })
      } else {
        push({ x: center.x - 1, y: center.y })
        push({ x: center.x + 1, y: center.y })
      }
      break
    }
  }
  return out
}

export function posKey(p: Pos): string {
  return `${p.x},${p.y}`
}

export function allTiles(): Pos[] {
  const out: Pos[] = []
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) out.push({ x, y })
  return out
}
