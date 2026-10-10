// Board projection for the combat screen: a 7×5 grid on a gently tilted plane.
// Tile coordinates are continuous (x 0..GRID_W, y 0..GRID_H edges); y = 0 is the far row.
// Everything drawn on the board (SVG tiles, sprites, labels, FX) goes through `project`,
// so tiles, units and overlays always line up exactly.

import { GRID_H, GRID_W } from '../../engine/types.ts'
import type { ContentRegistry, Dir, Pos, UnitState } from '../../engine/types.ts'

export interface Pt {
  x: number
  y: number
}

export interface BoardGeom {
  /** Tile width at the near edge, px. */
  tw: number
  /** Board element size, px. */
  width: number
  height: number
  /** Screen y of the near edge (y = GRID_H). */
  nearY: number
  /** Screen y of the far edge (y = 0). */
  farY: number
  project: (x: number, y: number) => Pt
  /** Depth scale at continuous row y (1 at the near edge). */
  scaleAt: (y: number) => number
}

/** Far edge is drawn at this fraction of the near edge's width. */
const FAR_SCALE = 0.84
/** Near row's on-screen height as a fraction of tile width. */
const ROW_RATIO = 0.76

export function makeGeom(tw: number): BoardGeom {
  const k = (1 / FAR_SCALE - 1) / GRID_H
  const s = (y: number) => 1 / (1 + (GRID_H - y) * k)
  const th = tw * ROW_RATIO
  const K = th / (1 - s(GRID_H - 1))
  const topPad = tw * 1.25
  const depth = K * (1 - s(0))
  const nearY = topPad + depth
  const bottomPad = tw * 0.5
  const width = Math.ceil(GRID_W * tw + tw * 0.4)
  const cx = width / 2
  const project = (x: number, y: number): Pt => {
    const sc = s(y)
    return { x: cx + (x - GRID_W / 2) * tw * sc, y: nearY - K * (1 - sc) }
  }
  return { tw, width, height: Math.ceil(nearY + bottomPad), nearY, farY: topPad, project, scaleAt: s }
}

export function tileCenter(g: BoardGeom, p: Pos): Pt {
  return g.project(p.x + 0.5, p.y + 0.5)
}

export function tileScale(g: BoardGeom, p: Pos): number {
  return g.scaleAt(p.y + 0.5)
}

/** Polygon points (far-left, far-right, near-right, near-left), optionally inset (0..0.5 of a tile). */
export function tileQuad(g: BoardGeom, p: Pos, inset = 0): Pt[] {
  return [
    g.project(p.x + inset, p.y + inset),
    g.project(p.x + 1 - inset, p.y + inset),
    g.project(p.x + 1 - inset, p.y + 1 - inset),
    g.project(p.x + inset, p.y + 1 - inset),
  ]
}

export function pts(list: Pt[]): string {
  return list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** Screen-space angle (deg) of a board direction at a given tile (perspective aware). */
export function dirAngle(g: BoardGeom, from: Pos, d: Dir): number {
  const a = tileCenter(g, from)
  const v = d === 'up' ? { x: 0, y: -1 } : d === 'down' ? { x: 0, y: 1 } : d === 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 }
  const b = g.project(from.x + 0.5 + v.x * 0.5, from.y + 0.5 + v.y * 0.5)
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

/** Choose the tile width so the board fits the available area. */
export function fitTileWidth(availW: number, availH: number): number {
  // Width needs GRID_W·tw + 0.4·tw; height needs ≈ topPad + depth + bottomPad (≈ 3.6·tw at these ratios).
  const probe = makeGeom(100)
  const hPerTw = probe.height / 100
  const wPerTw = probe.width / 100
  return Math.max(56, Math.min(148, Math.floor(Math.min(availW / wPerTw, availH / hPerTw))))
}

const TIER_SCALE = { minion: 0.84, normal: 1, elite: 1.14, boss: 1.42 } as const

/** Sprite scale by enemy tier (party = 1). */
export function unitScale(C: ContentRegistry, u: UnitState): number {
  if (u.side !== 'enemy') return 1
  return TIER_SCALE[C.enemies[u.defId]?.tier ?? 'normal']
}

/** Stable 0..1 hash of a string (desyncs idle loops, seeds decor). */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}
