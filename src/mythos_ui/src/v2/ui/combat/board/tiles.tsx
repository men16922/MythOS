// Board terrain: the SVG slab and tiles (floor, void, hazard, cover blocks), the static part of burning
// ground, the DOM flames / embers drawn over burning tiles, and the turns-left badges of timed ground.

import { memo } from 'react'
import type { ReactNode } from 'react'
import { Flame, Zap } from 'lucide-react'
import { COVER_HP } from '../../../engine/effects.ts'
import { posKey } from '../../../engine/grid.ts'
import { GRID_H, GRID_W } from '../../../engine/types.ts'
import type { Pos, Tile } from '../../../engine/types.ts'
import type { BoardGeom, Pt } from '../geometry.ts'
import { hash, pts, tileCenter, tileQuad, tileScale } from '../geometry.ts'
import type { GroundMark } from './marks.ts'
import './tiles.css'

export type FireNeighbors = [boolean, boolean, boolean, boolean] // [N, E, S, W]

function TileShape({ g, p, t, fireNeighbors }: { g: BoardGeom; p: Pos; t: Tile; fireNeighbors: FireNeighbors }) {
  const q = tileQuad(g, p, 0.025)
  const checker = (p.x + p.y) % 2 === 0
  if (t.kind === 'void') {
    const inner = tileQuad(g, p, 0.16)
    const c = tileCenter(g, p)
    const r = hash(`${p.x}:${p.y}`)
    return (
      <g className="m2c-t-void">
        <polygon points={pts(q)} className="m2c-void-rim" />
        <polygon points={pts(inner)} className="m2c-void-hole" />
        <polyline
          className="m2c-void-crack"
          points={pts([q[0] as Pt, { x: c.x - g.tw * 0.12, y: c.y - g.tw * 0.05 }, { x: c.x + g.tw * (0.05 + r * 0.1), y: c.y + g.tw * 0.06 }, q[2] as Pt])}
        />
        <rect className="m2c-void-shard" x={c.x - g.tw * 0.22} y={c.y - 3} width={g.tw * 0.1} height={3} style={{ animationDelay: `${-r * 3}s` }} />
        <rect className="m2c-void-shard" x={c.x + g.tw * 0.1} y={c.y + 4} width={g.tw * 0.07} height={2} style={{ animationDelay: `${-r * 5 - 1}s` }} />
      </g>
    )
  }
  if (t.kind === 'hazard') {
    const c = tileCenter(g, p)
    const w = g.tw * tileScale(g, p) * 0.36
    const r = hash(`${p.y}:${p.x}`)
    const zig = [
      { x: c.x - w, y: c.y - w * 0.12 },
      { x: c.x - w * 0.45, y: c.y + w * 0.22 },
      { x: c.x - w * 0.05, y: c.y - w * 0.3 },
      { x: c.x + w * 0.4, y: c.y + w * 0.18 },
      { x: c.x + w, y: c.y - w * 0.15 },
    ]
    // A temporary (electrified) hazard crackles harder: extra arcs jumping between the tile's corners.
    const temp = t.ttl !== undefined
    const arcs = temp ? crackleArcs(g, p, r) : []
    return (
      <g className={temp ? 'm2c-t-haz is-temp' : 'm2c-t-haz'}>
        <polygon points={pts(q)} className="m2c-haz-base" />
        <polygon points={pts(q)} fill="url(#m2c-haz-stripes)" />
        <polygon points={pts(tileQuad(g, p, 0.07))} className="m2c-haz-edge" />
        <polyline points={pts(zig)} className="m2c-zap" style={{ animationDelay: `${-r * 2}s` }} />
        {arcs.map((a, i) => (
          <polyline key={i} points={pts(a)} className="m2c-zap is-arc" style={{ animationDelay: `${-r * 3 - i * 0.37}s` }} />
        ))}
        {!!t.fire && <FireBase g={g} p={p} turns={t.fire} neighbors={fireNeighbors} />}
      </g>
    )
  }
  return (
    <g>
      <polygon points={pts(q)} className={checker ? 'm2c-t-floor is-a' : 'm2c-t-floor'} />
      <polygon points={pts(tileQuad(g, p, 0.09))} className="m2c-t-bevel" />
      {!!t.fire && <FireBase g={g} p={p} turns={t.fire} neighbors={fireNeighbors} />}
    </g>
  )
}

/** Seeded molten magma veins radiating from the tile center toward edges and connected burning neighbors. */
function fireFissures(g: BoardGeom, p: Pos, seed: number): Pt[][] {
  const out: Pt[][] = []
  for (let i = 0; i < 3; i++) {
    const u0 = 0.42 + (hash(`${seed}:c:${i}`) - 0.5) * 0.16
    const v0 = 0.42 + (hash(`${seed}:d:${i}`) - 0.5) * 0.16
    const a = g.project(p.x + u0, p.y + v0)
    const b = rim(g, p, (seed + i * 0.33 + hash(`${seed}:r:${i}`) * 0.14) % 1)
    const mid1 = {
      x: a.x + (b.x - a.x) * 0.42 + (hash(`${seed}:m1:${i}`) - 0.5) * g.tw * 0.11,
      y: a.y + (b.y - a.y) * 0.42 + (hash(`${seed}:n1:${i}`) - 0.5) * g.tw * 0.07,
    }
    const mid2 = {
      x: a.x + (b.x - a.x) * 0.76 + (hash(`${seed}:m2:${i}`) - 0.5) * g.tw * 0.09,
      y: a.y + (b.y - a.y) * 0.76 + (hash(`${seed}:n2:${i}`) - 0.5) * g.tw * 0.06,
    }
    out.push([a, mid1, mid2, b])
  }
  return out
}

/** Burning ground, static part (the flames themselves are DOM, see GroundFire): connected molten floor, magma veins, and area-burn perimeter. */
function FireBase({ g, p, turns, neighbors }: { g: BoardGeom; p: Pos; turns: number; neighbors: FireNeighbors }) {
  const r = hash(`fb:${p.x}:${p.y}`)
  const hot = turns >= 2
  const isCluster = neighbors[0] || neighbors[1] || neighbors[2] || neighbors[3]
  const inner = tileQuad(g, p, 0.05) as [Pt, Pt, Pt, Pt]
  const core = tileQuad(g, p, hot ? 0.22 : 0.3)
  const fissures = fireFissures(g, p, r)
  const edges: [Pt, Pt][] = [
    [inner[0], inner[1]], // N
    [inner[1], inner[2]], // E
    [inner[2], inner[3]], // S
    [inner[3], inner[0]], // W
  ]
  // Seamless molten bridges across shared East / South edges when adjacent tiles are also burning
  const bridgeE = neighbors[1]
    ? [g.project(p.x + 0.86, p.y + 0.14), g.project(p.x + 1.14, p.y + 0.14), g.project(p.x + 1.14, p.y + 0.86), g.project(p.x + 0.86, p.y + 0.86)]
    : null
  const bridgeS = neighbors[2]
    ? [g.project(p.x + 0.14, p.y + 0.86), g.project(p.x + 0.86, p.y + 0.86), g.project(p.x + 0.86, p.y + 1.14), g.project(p.x + 0.14, p.y + 1.14)]
    : null

  return (
    <g className={`m2c-t-fire${hot ? ' is-hot' : ' is-smolder'}${isCluster ? ' is-cluster' : ''}`}>
      <polygon points={pts(tileQuad(g, p, 0.015))} fill="url(#m2c-fire-grad)" className="m2c-fire-floor" />
      {bridgeE && <polygon points={pts(bridgeE)} fill="url(#m2c-fire-grad)" className="m2c-fire-bridge" />}
      {bridgeS && <polygon points={pts(bridgeS)} fill="url(#m2c-fire-grad)" className="m2c-fire-bridge" />}
      <polygon points={pts(core)} fill="url(#m2c-fire-core-grad)" className="m2c-fire-core" />
      {fissures.map((f, i) => (
        <polyline key={`fis${i}`} points={pts(f)} className="m2c-fire-fissure" style={{ animationDelay: `${-(r * 2 + i * 0.4)}s` }} />
      ))}
      <polygon points={pts(inner)} className="m2c-fire-edge" />
      {edges.map(([a, b], side) =>
        !neighbors[side] ? (
          <line key={`per${side}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="m2c-fire-perimeter" />
        ) : null,
      )}
    </g>
  )
}

/** Three jagged arcs between random points on the tile's rim (electrified tile). */
function crackleArcs(g: BoardGeom, p: Pos, seed: number): Pt[][] {
  const out: Pt[][] = []
  for (let i = 0; i < 3; i++) {
    const r1 = hash(`${seed}:${i}:a`)
    const r2 = hash(`${seed}:${i}:b`)
    const a = rim(g, p, r1)
    const b = rim(g, p, (r1 + 0.35 + r2 * 0.3) % 1)
    const line: Pt[] = [a]
    for (let k = 1; k < 4; k++) {
      const t = k / 4
      const j = (hash(`${seed}:${i}:${k}`) - 0.5) * g.tw * 0.16
      line.push({ x: a.x + (b.x - a.x) * t + j, y: a.y + (b.y - a.y) * t - Math.abs(j) * 0.6 })
    }
    line.push(b)
    out.push(line)
  }
  return out
}

/** Point at fraction `u` (0..1) around tile `p`'s rim, slightly inset. */
function rim(g: BoardGeom, p: Pos, u: number): Pt {
  const side = Math.floor(u * 4)
  const f = u * 4 - side
  const i = 0.12
  const xy = side === 0 ? [i + f * (1 - 2 * i), i] : side === 1 ? [1 - i, i + f * (1 - 2 * i)] : side === 2 ? [1 - i - f * (1 - 2 * i), 1 - i] : [i, 1 - i - f * (1 - 2 * i)]
  return g.project(p.x + (xy[0] as number), p.y + (xy[1] as number))
}

function CoverBlock({ g, p, hp }: { g: BoardGeom; p: Pos; hp: number }) {
  const base = tileQuad(g, p, 0.13)
  const s = tileScale(g, p)
  const h = g.tw * 0.36 * s
  const top = base.map((v) => ({ x: v.x, y: v.y - h }))
  const [fl, fr, nr, nl] = base as [Pt, Pt, Pt, Pt]
  const [tfl, tfr, tnr, tnl] = top as [Pt, Pt, Pt, Pt]
  const leftVisible = p.x + 0.5 > GRID_W / 2
  const rightVisible = p.x + 0.5 < GRID_W / 2
  const pipW = (nr.x - nl.x) / 5
  return (
    <g className="m2c-cover">
      <ellipse cx={(nl.x + nr.x) / 2} cy={nl.y + 2} rx={(nr.x - nl.x) * 0.55} ry={h * 0.22} className="m2c-cover-shadow" />
      {leftVisible && <polygon points={pts([tfl, tnl, nl, fl])} className="m2c-cover-side" />}
      {rightVisible && <polygon points={pts([tfr, tnr, nr, fr])} className="m2c-cover-side" />}
      <polygon points={pts([tnl, tnr, nr, nl])} className="m2c-cover-front" />
      <polygon points={pts(top)} className="m2c-cover-top" />
      <line x1={tnl.x} y1={tnl.y} x2={tnr.x} y2={tnr.y} className="m2c-cover-lip" />
      {Array.from({ length: Math.max(0, Math.min(4, hp)) }, (_, i) => (
        <rect key={i} x={nl.x + pipW * (0.6 + i * 1.05)} y={tnl.y + h * 0.42} width={pipW * 0.8} height={Math.max(3, h * 0.16)} className="m2c-cover-pip" />
      ))}
      {hp < COVER_HP && (
        // Damaged: cracks split the front face and the top.
        <g className="m2c-cover-cracks">
          <polyline
            points={pts([
              { x: tnl.x + (tnr.x - tnl.x) * 0.38, y: tnl.y },
              { x: tnl.x + (tnr.x - tnl.x) * 0.46, y: tnl.y + h * 0.35 },
              { x: tnl.x + (tnr.x - tnl.x) * 0.36, y: tnl.y + h * 0.62 },
              { x: nl.x + (nr.x - nl.x) * 0.44, y: nl.y },
            ])}
          />
          <polyline
            points={pts([
              { x: tnl.x + (tnr.x - tnl.x) * 0.46, y: tnl.y + h * 0.35 },
              { x: tnl.x + (tnr.x - tnl.x) * 0.66, y: tnl.y + h * 0.5 },
              { x: tnl.x + (tnr.x - tnl.x) * 0.74, y: tnl.y + h * 0.8 },
            ])}
          />
          <polyline
            points={pts([
              { x: tnl.x + (tnr.x - tnl.x) * 0.38, y: tnl.y },
              { x: tfl.x + (tfr.x - tfl.x) * 0.5, y: (tfl.y + tnl.y) / 2 },
              { x: tfl.x + (tfr.x - tfl.x) * 0.62, y: tfl.y },
            ])}
          />
        </g>
      )}
    </g>
  )
}

/** The SVG paint servers the tiles reference (hazard stripes, burning floor, molten core, void hole). */
export function TileDefs() {
  return (
    <defs>
      <pattern id="m2c-haz-stripes" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
        <rect width="3.2" height="9" fill="rgba(255,190,70,0.16)" />
      </pattern>
      <radialGradient id="m2c-fire-grad" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor="#ffd26a" stopOpacity="0.88" />
        <stop offset="34%" stopColor="#ff6a14" stopOpacity="0.74" />
        <stop offset="72%" stopColor="#8a1e04" stopOpacity="0.82" />
        <stop offset="100%" stopColor="#2a0801" stopOpacity="0.92" />
      </radialGradient>
      <radialGradient id="m2c-fire-core-grad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#fffbe0" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#ffb838" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#ff4e00" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m2c-void-grad" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#000" />
        <stop offset="70%" stopColor="#05030a" />
        <stop offset="100%" stopColor="#2a0a24" />
      </radialGradient>
    </defs>
  )
}

/** Orthogonal neighbor burning check [N, E, S, W] for connected Area Burn rendering. */
function getFireNeighbors(tiles: Tile[][], x: number, y: number): FireNeighbors {
  const hasFire = (tx: number, ty: number) => (tiles[ty]?.[tx]?.fire ?? 0) > 0
  return [hasFire(x, y - 1), hasFire(x + 1, y), hasFire(x, y + 1), hasFire(x - 1, y)]
}

/** The slab with its tiles ('floor') or just the cover blocks ('covers', drawn above the overlays). */
export const BoardPlane = memo(function BoardPlane({ g, tiles, part }: { g: BoardGeom; tiles: Tile[][]; part: 'floor' | 'covers' | 'fire' }) {
  const corners = [g.project(0, 0), g.project(GRID_W, 0), g.project(GRID_W, GRID_H), g.project(0, GRID_H)]
  const [, , nr, nl] = corners as [Pt, Pt, Pt, Pt]
  const thick = g.tw * 0.13
  const cells: ReactNode[] = []
  const covers: ReactNode[] = []
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const t = tiles[y]?.[x] ?? { kind: 'floor' }
      const p = { x, y }
      const fn = t.fire ? getFireNeighbors(tiles, x, y) : ([false, false, false, false] as FireNeighbors)
      cells.push(<TileShape key={`${x},${y}`} g={g} p={p} t={t.kind === 'cover' ? { kind: 'floor', fire: t.fire } : t} fireNeighbors={fn} />)
      if (t.kind === 'cover') covers.push(<CoverBlock key={`c${x},${y}`} g={g} p={p} hp={t.hp ?? 2} />)
    }
  if (part === 'covers') return <g className="m2c-covers">{covers}</g>
  if (part === 'fire') {
    const fireOverlays: ReactNode[] = []
    for (let y = 0; y < GRID_H; y++)
      for (let x = 0; x < GRID_W; x++) {
        const t = tiles[y]?.[x]
        if (t?.fire) {
          const fn = getFireNeighbors(tiles, x, y)
          fireOverlays.push(<FireTopOverlay key={`fo${x},${y}`} g={g} p={{ x, y }} turns={t.fire} neighbors={fn} />)
        } else if (t?.kind === 'hazard') {
          fireOverlays.push(<HazardTopOverlay key={`ho${x},${y}`} g={g} p={{ x, y }} temp={t.ttl !== undefined} />)
        }
      }
    return <g className="m2c-fire-top">{fireOverlays}</g>
  }
  return (
    <g>
      <polygon points={pts([nl, nr, { x: nr.x - 4, y: nr.y + thick }, { x: nl.x + 4, y: nl.y + thick }])} className="m2c-slab-front" />
      <polygon points={pts(corners)} className="m2c-slab-top" />
      {cells}
      <polygon points={pts(corners)} className="m2c-slab-rim" />
    </g>
  )
})

/** Irregular isometric volcanic crater polygon in tile coordinates. */
function lavaCraterQuad(g: BoardGeom, p: Pos, seed: number, scale: number): Pt[] {
  const angles = [
    [0.5, 0.5 - scale],
    [0.5 + scale * 0.85, 0.5 - scale * 0.45],
    [0.5 + scale, 0.5 + scale * 0.15],
    [0.5 + scale * 0.65, 0.5 + scale * 0.9],
    [0.5 - scale * 0.2, 0.5 + scale],
    [0.5 - scale * 0.9, 0.5 + scale * 0.55],
    [0.5 - scale, 0.5 - scale * 0.25],
    [0.5 - scale * 0.55, 0.5 - scale * 0.85],
  ]
  return angles.map(([u, v], idx) => {
    const jx = (hash(`${seed}:lcx:${idx}`) - 0.5) * scale * 0.35
    const jy = (hash(`${seed}:lcy:${idx}`) - 0.5) * scale * 0.35
    return g.project(p.x + (u as number) + jx, p.y + (v as number) + jy)
  })
}

/** Drawn ABOVE enemy intent telegraphs so persistent Area Burn magma craters, tectonic fissures, charred obsidian crust, and inter-tile lava bridges are 100% visible. */
function FireTopOverlay({ g, p, turns, neighbors }: { g: BoardGeom; p: Pos; turns: number; neighbors: FireNeighbors }) {
  const r = hash(`fto:${p.x}:${p.y}`)
  const hot = turns >= 2
  const inner = tileQuad(g, p, 0.04) as [Pt, Pt, Pt, Pt]
  const slag = tileQuad(g, p, 0.08)
  const outerCrater = lavaCraterQuad(g, p, r, hot ? 0.34 : 0.26)
  const innerCrater = lavaCraterQuad(g, p, r + 0.5, hot ? 0.19 : 0.14)
  const fissures = fireFissures(g, p, r)
  const c = tileCenter(g, p)
  const edges: [Pt, Pt][] = [
    [inner[0], inner[1]], // N
    [inner[1], inner[2]], // E
    [inner[2], inner[3]], // S
    [inner[3], inner[0]], // W
  ]
  const bridgeE = neighbors[1]
    ? [g.project(p.x + 0.76, p.y + 0.22), g.project(p.x + 1.24, p.y + 0.22), g.project(p.x + 1.24, p.y + 0.78), g.project(p.x + 0.76, p.y + 0.78)]
    : null
  const bridgeS = neighbors[2]
    ? [g.project(p.x + 0.22, p.y + 0.76), g.project(p.x + 0.78, p.y + 0.76), g.project(p.x + 0.78, p.y + 1.24), g.project(p.x + 0.22, p.y + 1.24)]
    : null
  const bridgeLineE = neighbors[1]
    ? [c, g.project(p.x + 0.95, p.y + 0.44), g.project(p.x + 1.15, p.y + 0.56), tileCenter(g, { x: p.x + 1, y: p.y })]
    : null
  const bridgeLineS = neighbors[2]
    ? [c, g.project(p.x + 0.44, p.y + 0.95), g.project(p.x + 0.56, p.y + 1.15), tileCenter(g, { x: p.x, y: p.y + 1 })]
    : null

  return (
    <g className={hot ? 'm2c-fire-overlay is-hot' : 'm2c-fire-overlay is-smolder'}>
      <polygon points={pts(slag)} className="m2c-fire-slag" />
      {bridgeE && <polygon points={pts(bridgeE)} fill="url(#m2c-fire-grad)" className="m2c-fire-bridge" />}
      {bridgeS && <polygon points={pts(bridgeS)} fill="url(#m2c-fire-grad)" className="m2c-fire-bridge" />}
      <polygon points={pts(outerCrater)} className="m2c-fire-crater-outer" />
      <polygon points={pts(innerCrater)} className="m2c-fire-crater-inner" />
      {bridgeLineE && <polyline points={pts(bridgeLineE)} className="m2c-fire-vein-link" />}
      {bridgeLineS && <polyline points={pts(bridgeLineS)} className="m2c-fire-vein-link" />}
      {fissures.map((f, i) => (
        <g key={`fis${i}`}>
          <polyline points={pts(f)} className="m2c-fire-fissure-glow" />
          <polyline points={pts(f)} className="m2c-fire-fissure" style={{ animationDelay: `${-(r * 2 + i * 0.4)}s` }} />
        </g>
      ))}
      {edges.map(([a, b], side) =>
        !neighbors[side] ? (
          <line key={`per${side}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="m2c-fire-perimeter" />
        ) : null,
      )}
    </g>
  )
}

/** High-voltage circuit frame drawn above intent telegraphs for persistent & temporary electrified hazard tiles. */
function HazardTopOverlay({ g, p, temp }: { g: BoardGeom; p: Pos; temp: boolean }) {
  const inner = tileQuad(g, p, 0.06) as [Pt, Pt, Pt, Pt]
  const core = tileQuad(g, p, 0.24)
  return (
    <g className={temp ? 'm2c-haz-overlay is-temp' : 'm2c-haz-overlay'}>
      <polygon points={pts(inner)} className="m2c-haz-frame" />
      <polygon points={pts(core)} className="m2c-haz-core-grid" />
      {inner.map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r={2.4} className="m2c-haz-pylon" />
      ))}
    </g>
  )
}

const FLAME_PATHS: [string, string, string][] = [
  // Variant 0: Sleek wind-curved single lava lick (no multi-prong comb!)
  [
    'M 20 58 C 9 58 4 49 7 38 C 10 27 21 19 25 4 C 31 15 35 28 32 41 C 30 51 26 58 20 58 Z',
    'M 20 56 C 12 56 9 49 11 40 C 14 31 21 24 24 12 C 28 21 30 31 28 42 C 26 50 24 56 20 56 Z',
    'M 20 54 C 15 54 14 48 16 41 C 18 34 21 28 23 21 C 25 28 25 36 24 44 C 23 50 22 54 20 54 Z',
  ],
  // Variant 1: Broad curling campfire wisp with a single detached spark droplet
  [
    'M 20 58 C 8 58 4 48 8 36 C 12 24 18 16 15 5 C 24 12 33 24 33 38 C 33 50 28 58 20 58 Z M 28 14 C 26 10 28 5 31 3 C 33 7 32 12 28 14 Z',
    'M 20 56 C 12 56 9 48 12 39 C 15 30 19 22 17 13 C 23 19 29 28 29 39 C 29 49 25 56 20 56 Z',
    'M 20 54 C 15 54 14 48 16 41 C 18 35 20 29 19 23 C 23 28 25 35 25 43 C 24 50 22 54 20 54 Z',
  ],
  // Variant 2: Low sweeping S-curve ember tongue
  [
    'M 20 58 C 10 58 5 50 7 40 C 9 29 19 22 27 8 C 30 19 35 30 33 42 C 31 52 26 58 20 58 Z M 12 20 C 10 16 11 11 14 9 C 16 13 15 18 12 20 Z',
    'M 20 56 C 13 56 9 49 11 41 C 13 33 20 26 25 16 C 27 24 30 33 29 43 C 27 51 24 56 20 56 Z',
    'M 20 54 C 16 54 14 49 15 43 C 17 37 21 31 24 25 C 25 31 26 38 25 45 C 24 51 22 54 20 54 Z',
  ],
]

/** Sleek single-tip vector flame wisp (outer crimson mantle, mid amber blaze, inner white-hot core) used by GroundFire and BurnFlames. */
export function FlameTongueSvg({
  variant,
  kind,
  flip,
  style,
}: {
  variant: number
  kind: 'back' | 'front' | 'core'
  flip?: boolean
  style: React.CSSProperties
}) {
  const [outer, mid, inner] = FLAME_PATHS[variant % FLAME_PATHS.length]!
  const cls = `m2c-flame m2c-flame-svg${kind === 'back' ? ' is-back' : kind === 'core' ? ' is-core' : ''}${flip ? ' is-flip' : ''}`
  return (
    <svg className={cls} viewBox="0 0 40 60" preserveAspectRatio="none" style={style}>
      <path d={outer} className="m2c-fl-outer" />
      <path d={mid} className="m2c-fl-mid" />
      <path d={inner} className="m2c-fl-inner" />
    </svg>
  )
}

/** Burning ground, animated part (DOM above the floor, below units): keeps the tile center open so the isometric magma crater
 *  and fissures shine through, placing compact swirling flame wisps along the crater rim and rising sparks. */
export const GroundFire = memo(function GroundFire({
  g,
  p,
  turns,
  cluster = false,
}: {
  g: BoardGeom
  p: Pos
  turns: number
  cluster?: boolean
}) {
  const c = tileCenter(g, p)
  const s = tileScale(g, p)
  const tw = g.tw
  const r = hash(`fire:${p.x}:${p.y}`)
  const strong = turns > 1
  const boost = cluster ? 1.08 : 1
  // Sparse rim positions around the isometric crater so flames never form a horizontal comb or hide the magma fissures.
  const back: [number, number][] = strong
    ? [
        [-0.31, -0.22],
        [0.31, -0.18],
      ]
    : [[-0.26, -0.2]]
  const front: [number, number][] = strong
    ? [
        [-0.28, 0.24],
        [0.29, 0.22],
      ]
    : [[0.24, 0.22]]
  const cores: [number, number][] = strong ? [[(r - 0.5) * 0.16, -0.04]] : []
  const tongue = (u: number, v: number, i: number, kind: 'back' | 'front' | 'core') => {
    const at = g.project(p.x + 0.5 + u, p.y + 0.5 + v)
    const k = hash(`fire:${p.x}:${p.y}:${i}`)
    const baseMul = kind === 'back' ? 0.34 : kind === 'core' ? 0.28 : 0.31
    const h = tw * s * baseMul * (strong ? 1 : 0.82) * boost * (0.88 + k * 0.24)
    return (
      <FlameTongueSvg
        key={i}
        variant={Math.floor(k * 9) + i}
        kind={kind}
        flip={k > 0.5}
        style={{
          left: at.x,
          top: at.y,
          width: h * (kind === 'core' ? 0.78 : 0.72),
          height: h,
          animationDelay: `${-(r * 2 + i * 0.27)}s`,
          animationDuration: `${(kind === 'back' ? 0.95 : kind === 'core' ? 0.58 : 0.74) + k * 0.22}s`,
        }}
      />
    )
  }
  const emberCount = strong || cluster ? 8 : 4
  return (
    <>
      <i
        className={cluster ? 'm2c-fire-glow is-cluster' : 'm2c-fire-glow'}
        style={{ left: c.x, top: c.y, width: tw * (cluster ? 1.85 : 1.55) * s, height: tw * (cluster ? 1.1 : 0.92) * s, animationDelay: `${-r * 2}s` }}
      />
      <i
        className="m2c-fire-heatwave"
        style={{ left: c.x, top: c.y, width: tw * 0.88 * s, height: tw * 0.48 * s, animationDelay: `${-r * 1.7}s` }}
      />
      {strong &&
        [0, 1].map((i) => {
          const at = g.project(p.x + 0.26 + i * 0.48, p.y + 0.36 - i * 0.08)
          return (
            <i
              key={`sm${i}`}
              className="m2c-fire-smoke"
              style={{
                left: at.x,
                top: at.y,
                width: tw * 0.36 * s,
                height: tw * 0.36 * s,
                animationDelay: `${-(r * 2.4 + i * 1.1)}s`,
              }}
            />
          )
        })}
      {back.map(([u, v], i) => tongue(u, v, i, 'back'))}
      {front.map(([u, v], i) => tongue(u, v, i + 10, 'front'))}
      {cores.map(([u, v], i) => tongue(u, v, i + 20, 'core'))}
      {Array.from({ length: emberCount }, (_, i) => {
        const at = g.project(p.x + 0.5 + (hash(`fe:${p.x}:${p.y}:${i}`) - 0.5) * 0.72, p.y + 0.5 + (hash(`fe:${p.y}:${p.x}:${i}`) - 0.5) * 0.52)
        return <i key={`e${i}`} className="m2c-fire-ember" style={{ left: at.x, top: at.y, animationDelay: `${-(r * 3 + i * 0.35)}s` }} />
      })}
    </>
  )
})

/** Persistent electrified / live-wire ground (DOM layer above floor, below units): pulsing plasma node and jumping high-voltage arcs. */
export const GroundHazard = memo(function GroundHazard({ g, p, temp }: { g: BoardGeom; p: Pos; temp: boolean }) {
  const c = tileCenter(g, p)
  const s = tileScale(g, p)
  const tw = g.tw
  const r = hash(`ghaz:${p.x}:${p.y}`)
  return (
    <>
      <i
        className={temp ? 'm2c-haz-glow is-temp' : 'm2c-haz-glow'}
        style={{ left: c.x, top: c.y, width: tw * 1.35 * s, height: tw * 0.82 * s, animationDelay: `${-r * 2}s` }}
      />
      <svg
        className={temp ? 'm2c-haz-arcs is-temp' : 'm2c-haz-arcs'}
        viewBox="0 0 80 50"
        style={{ left: c.x, top: c.y, width: tw * 0.88 * s, height: tw * 0.52 * s, animationDelay: `${-r * 1.5}s` }}
      >
        <ellipse cx="40" cy="25" rx="28" ry="13" className="m2c-haz-ring" />
        <polyline points="10,28 24,14 35,28 48,10 58,26 70,16" className="m2c-haz-bolt" />
        <polyline points="16,35 30,22 42,35 55,18 66,31" className="m2c-haz-bolt is-alt" style={{ animationDelay: `${-(r + 0.45)}s` }} />
      </svg>
    </>
  )
})

/** Burning ground / electrified tiles: turns left (labels layer, above the units). */
export function GroundBadges({ g, ground }: { g: BoardGeom; ground: GroundMark[] }) {
  return ground.map((t) => {
    const at = g.project(t.p.x + 0.86, t.p.y + 0.84)
    return (
      <div key={`gb${posKey(t.p)}`} className="m2c-tbadges" style={{ left: at.x, top: at.y }}>
        {t.fire > 0 && (
          <span className="m2c-tbadge is-fire">
            <Flame size={10} strokeWidth={2.8} />
            {t.fire}
          </span>
        )}
        {t.ttl > 0 && (
          <span className="m2c-tbadge is-shock">
            <Zap size={10} strokeWidth={2.8} />
            {t.ttl}
          </span>
        )}
      </div>
    )
  })
}
