// Pure helpers for the combat timeline: pacing constants, stereo pan, facing / turn beats, event-run
// queries, FX lifetimes, and the small view edits several event builders share.

import type { CombatEvent, CombatState, Dir, Pos, Tile } from '../../../engine/types.ts'
import type { SfxName } from '../../common/sfx.ts'
import type { BPt, FxItem, ViewState } from './types.ts'

/** Timeline pace while the player fast-forwards an enemy phase. */
export const HURRY_SPEED = 0.3
/** Turn-to-face beat before a cast / an enemy wind-up. */
export const TURN_MS = 110
/** Area eruptions spread outward one Manhattan ring per RING_MS. */
export const RING_MS = 45

/** Unit-local motion offsets (% of the figure box) for each board direction. */
export const DIR_PCT: Record<Dir, [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  up: [0.35, -0.3],
  down: [-0.35, 0.3],
}

export const panOf = (x: number): number => (x / 6) * 1.6 - 0.8

export const STATUS_SFX: Partial<Record<string, SfxName>> = { burn: 'status_burn', shock: 'status_shock', mark: 'status_mark', weak: 'status_mark' }

/** Projectile / swing travel time per FX kind. */
export const travel = (kind: 'bolt' | 'beam' | 'arc' | 'slash' | 'nova' | 'burst') =>
  kind === 'bolt' ? 150 : kind === 'beam' ? 190 : kind === 'arc' ? 360 : kind === 'nova' ? 160 : 110

export function viewFrom(c: CombatState): ViewState {
  return {
    base: c,
    units: c.units,
    tiles: c.tiles,
    ufx: {},
    pendingIntents: null,
    firing: null,
    enemyPhase: false,
    handHidden: false,
    banner: null,
    flashImplant: null,
  }
}

/** `tiles` with the tile at `p` replaced. */
export function withTile(tiles: Tile[][], p: Pos, tile: Tile): Tile[][] {
  return tiles.map((row, y) => (y === p.y ? row.map((t, x) => (x === p.x ? tile : t)) : row))
}

/** Which way the sprite should look when facing `d` toward `target` (up/down only keep a side if the target is off-axis). */
export function sideOf(from: Pos, d: Dir, target: Pos | undefined): 'left' | 'right' | undefined {
  if (target && target.x !== from.x) return target.x > from.x ? 'right' : 'left'
  return d === 'left' || d === 'right' ? d : undefined
}

/** How long an FX item stays mounted: its `ms`, plus the ring stagger and particle jitter some kinds add on top. */
export function fxLife(f: FxItem): number {
  if (f.kind === 'area') return f.ms * 1.3 + f.tiles.reduce((m, p) => Math.max(m, Math.abs(p.x - f.center.x) + Math.abs(p.y - f.center.y)), 0) * f.ring
  if (f.kind === 'flame' || f.kind === 'smoke' || f.kind === 'flare' || f.kind === 'zap' || f.kind === 'impact') return f.ms * 1.35
  return f.ms
}

/** A turn beat plays when the facing changes, or when a unit already facing up/down must look to a given side
 *  (its current horizontal look lives in the board view, so that case always gets the beat). */
export function needsTurn(facing: Dir, want: Dir, side: 'left' | 'right' | undefined): boolean {
  if (want !== facing) return true
  return !!side && (facing === 'up' || facing === 'down')
}

/** Index of the next event of kind `t` after `i`, stopping at any of `stop` (undefined when none). */
export function nextOfKind(events: CombatEvent[], i: number, t: CombatEvent['t'], stop: CombatEvent['t'][]): number | undefined {
  for (let j = i + 1; j < events.length; j++) {
    const e = events[j] as CombatEvent
    if (e.t === t) return j
    if (stop.includes(e.t)) return undefined
  }
  return undefined
}

/** Position of event `i` inside its run of consecutive same-kind events (staggers ripples). */
export function runIndex(events: CombatEvent[], i: number): number {
  const t = events[i]?.t
  let n = 0
  while (i - n - 1 >= 0 && events[i - n - 1]?.t === t) n++
  return n
}

/** The edge of tile `p` facing `d`, in board coordinates (for the wall a pushed unit hits). */
export function edgeOf(p: Pos, d: Dir): [BPt, BPt] {
  switch (d) {
    case 'right':
      return [
        { x: p.x + 1, y: p.y },
        { x: p.x + 1, y: p.y + 1 },
      ]
    case 'left':
      return [
        { x: p.x, y: p.y },
        { x: p.x, y: p.y + 1 },
      ]
    case 'up':
      return [
        { x: p.x, y: p.y },
        { x: p.x + 1, y: p.y },
      ]
    case 'down':
      return [
        { x: p.x, y: p.y + 1 },
        { x: p.x + 1, y: p.y + 1 },
      ]
  }
}
