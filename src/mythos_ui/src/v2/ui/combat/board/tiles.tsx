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
export const BoardPlane = memo(function BoardPlane({ g, tiles, part }: { g: BoardGeom; tiles: Tile[][]; part: 'floor' | 'covers' }) {
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
  return (
    <g>
      <polygon points={pts([nl, nr, { x: nr.x - 4, y: nr.y + thick }, { x: nl.x + 4, y: nl.y + thick }])} className="m2c-slab-front" />
      <polygon points={pts(corners)} className="m2c-slab-top" />
      {cells}
      <polygon points={pts(corners)} className="m2c-slab-rim" />
    </g>
  )
})

/** Burning ground, animated part (DOM above the floor, below units): a warm glow that spills onto neighbouring
 *  tiles, heatwave shimmer ring, rising smoke wisps, layered flickering tongues (with white-hot plasma cores), and rising embers. */
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
  const boost = cluster ? 1.14 : 1
  // Back sheet: big, slow tongues along the far half; front: crisp tongues over the near half; core: white-hot inner plasma.
  const back: [number, number][] = strong
    ? [
        [-0.24, -0.18],
        [0.04, -0.25],
        [0.26, -0.12],
        ...(cluster ? ([[-0.1, -0.06]] as [number, number][]) : []),
      ]
    : [[0, -0.16]]
  const front: [number, number][] = strong
    ? [
        [-0.28, 0.06],
        [-0.06, 0.12],
        [0.16, 0.04],
        [0.3, 0.22],
        [-0.16, 0.28],
      ]
    : [
        [-0.2, 0.1],
        [0.12, 0.16],
        [0.0, -0.02],
      ]
  const cores: [number, number][] = strong
    ? [
        [-0.08, 0.06],
        [0.12, 0.02],
        ...(cluster ? ([[0.02, -0.1]] as [number, number][]) : []),
      ]
    : [[0.0, 0.06]]
  const tongue = (u: number, v: number, i: number, kind: 'back' | 'front' | 'core') => {
    const at = g.project(p.x + 0.5 + u, p.y + 0.5 + v)
    const k = hash(`fire:${p.x}:${p.y}:${i}`)
    const baseMul = kind === 'back' ? 0.66 : kind === 'core' ? 0.34 : 0.44
    const h = tw * s * baseMul * (strong ? 1 : 0.76) * boost * (0.74 + k * 0.56)
    const cls = kind === 'back' ? 'm2c-flame is-back' : kind === 'core' ? 'm2c-flame is-core' : 'm2c-flame'
    return (
      <i
        key={i}
        className={cls}
        style={{
          left: at.x,
          top: at.y,
          width: h * (kind === 'back' ? 0.74 : kind === 'core' ? 0.52 : 0.64),
          height: h,
          animationDelay: `${-(r * 2 + i * 0.21)}s`,
          animationDuration: `${(kind === 'back' ? 1.02 : kind === 'core' ? 0.54 : 0.68) + k * 0.26}s`,
        }}
      />
    )
  }
  const emberCount = strong || cluster ? 6 : 4
  return (
    <>
      <i
        className={cluster ? 'm2c-fire-glow is-cluster' : 'm2c-fire-glow'}
        style={{ left: c.x, top: c.y, width: tw * (cluster ? 2.65 : 2.3) * s, height: tw * (cluster ? 1.8 : 1.55) * s, animationDelay: `${-r * 2}s` }}
      />
      <i
        className="m2c-fire-heatwave"
        style={{ left: c.x, top: c.y, width: tw * 0.96 * s, height: tw * 0.58 * s, animationDelay: `${-r * 1.7}s` }}
      />
      <i className="m2c-fire-pool" style={{ left: c.x, top: c.y, width: tw * 0.98 * s * boost, height: tw * 0.62 * s * boost, animationDelay: `${-r * 1.3}s` }} />
      {strong &&
        [0, 1].map((i) => {
          const at = g.project(p.x + 0.36 + i * 0.28, p.y + 0.44 - i * 0.08)
          return (
            <i
              key={`sm${i}`}
              className="m2c-fire-smoke"
              style={{
                left: at.x,
                top: at.y,
                width: tw * 0.42 * s,
                height: tw * 0.42 * s,
                animationDelay: `${-(r * 2.4 + i * 1.1)}s`,
              }}
            />
          )
        })}
      {back.map(([u, v], i) => tongue(u, v, i, 'back'))}
      {front.map(([u, v], i) => tongue(u, v, i + 10, 'front'))}
      {cores.map(([u, v], i) => tongue(u, v, i + 20, 'core'))}
      {Array.from({ length: emberCount }, (_, i) => {
        const at = g.project(p.x + 0.5 + (hash(`fe:${p.x}:${p.y}:${i}`) - 0.5) * 0.68, p.y + 0.5 + (hash(`fe:${p.y}:${p.x}:${i}`) - 0.5) * 0.48)
        return <i key={`e${i}`} className="m2c-fire-ember" style={{ left: at.x, top: at.y, animationDelay: `${-(r * 3 + i * 0.39)}s` }} />
      })}
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
