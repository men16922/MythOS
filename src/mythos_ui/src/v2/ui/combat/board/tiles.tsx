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

function TileShape({ g, p, t }: { g: BoardGeom; p: Pos; t: Tile }) {
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
        {!!t.fire && <FireBase g={g} p={p} />}
      </g>
    )
  }
  return (
    <g>
      <polygon points={pts(q)} className={checker ? 'm2c-t-floor is-a' : 'm2c-t-floor'} />
      <polygon points={pts(tileQuad(g, p, 0.09))} className="m2c-t-bevel" />
      {!!t.fire && <FireBase g={g} p={p} />}
    </g>
  )
}

/** Burning ground, static part (the flames themselves are DOM, see GroundFire): a charred, glowing tile. */
function FireBase({ g, p }: { g: BoardGeom; p: Pos }) {
  return (
    <g className="m2c-t-fire">
      <polygon points={pts(tileQuad(g, p, 0.02))} fill="url(#m2c-fire-grad)" className="m2c-fire-floor" />
      <polygon points={pts(tileQuad(g, p, 0.06))} className="m2c-fire-edge" />
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
          <polyline points={pts([{ x: tnl.x + (tnr.x - tnl.x) * 0.38, y: tnl.y }, { x: tnl.x + (tnr.x - tnl.x) * 0.46, y: tnl.y + h * 0.35 }, { x: tnl.x + (tnr.x - tnl.x) * 0.36, y: tnl.y + h * 0.62 }, { x: nl.x + (nr.x - nl.x) * 0.44, y: nl.y }])} />
          <polyline points={pts([{ x: tnl.x + (tnr.x - tnl.x) * 0.46, y: tnl.y + h * 0.35 }, { x: tnl.x + (tnr.x - tnl.x) * 0.66, y: tnl.y + h * 0.5 }, { x: tnl.x + (tnr.x - tnl.x) * 0.74, y: tnl.y + h * 0.8 }])} />
          <polyline points={pts([{ x: tnl.x + (tnr.x - tnl.x) * 0.38, y: tnl.y }, { x: tfl.x + (tfr.x - tfl.x) * 0.5, y: (tfl.y + tnl.y) / 2 }, { x: tfl.x + (tfr.x - tfl.x) * 0.62, y: tfl.y }])} />
        </g>
      )}
    </g>
  )
}

/** The SVG paint servers the tiles reference (hazard stripes, burning floor, void hole). */
export function TileDefs() {
  return (
    <defs>
      <pattern id="m2c-haz-stripes" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
        <rect width="3.2" height="9" fill="rgba(255,190,70,0.16)" />
      </pattern>
      <radialGradient id="m2c-fire-grad" cx="50%" cy="50%" r="62%">
        <stop offset="0%" stopColor="#ffb347" stopOpacity="0.8" />
        <stop offset="38%" stopColor="#d9430e" stopOpacity="0.62" />
        <stop offset="78%" stopColor="#5a1404" stopOpacity="0.78" />
        <stop offset="100%" stopColor="#2a0801" stopOpacity="0.9" />
      </radialGradient>
      <radialGradient id="m2c-void-grad" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#000" />
        <stop offset="70%" stopColor="#05030a" />
        <stop offset="100%" stopColor="#2a0a24" />
      </radialGradient>
    </defs>
  )
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
      cells.push(<TileShape key={`${x},${y}`} g={g} p={p} t={t.kind === 'cover' ? { kind: 'floor' } : t} />)
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
 *  tiles, layered flickering tongues spread over the tile and rising embers. Fewer, lower flames on the last turn. */
export const GroundFire = memo(function GroundFire({ g, p, turns }: { g: BoardGeom; p: Pos; turns: number }) {
  const c = tileCenter(g, p)
  const s = tileScale(g, p)
  const tw = g.tw
  const r = hash(`fire:${p.x}:${p.y}`)
  const strong = turns > 1
  // Back sheet: a few big, dim, slow tongues along the far half; front: smaller bright ones over the near half.
  const back: [number, number][] = strong
    ? [
        [-0.22, -0.18],
        [0.06, -0.24],
        [0.26, -0.1],
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
  const tongue = (u: number, v: number, i: number, big: boolean) => {
    const at = g.project(p.x + 0.5 + u, p.y + 0.5 + v)
    const k = hash(`fire:${p.x}:${p.y}:${i}`)
    const h = tw * s * (big ? 0.62 : 0.4) * (strong ? 1 : 0.75) * (0.7 + k * 0.6)
    return (
      <i
        key={i}
        className={big ? 'm2c-flame is-back' : 'm2c-flame'}
        style={{ left: at.x, top: at.y, width: h * (big ? 0.72 : 0.62), height: h, animationDelay: `${-(r * 2 + i * 0.23)}s`, animationDuration: `${(big ? 1.05 : 0.7) + k * 0.3}s` }}
      />
    )
  }
  return (
    <>
      <i className="m2c-fire-glow" style={{ left: c.x, top: c.y, width: tw * 2.3 * s, height: tw * 1.55 * s, animationDelay: `${-r * 2}s` }} />
      <i className="m2c-fire-pool" style={{ left: c.x, top: c.y, width: tw * 0.95 * s, height: tw * 0.6 * s, animationDelay: `${-r * 1.3}s` }} />
      {back.map(([u, v], i) => tongue(u, v, i, true))}
      {front.map(([u, v], i) => tongue(u, v, i + 10, false))}
      {[0, 1, 2, 3].map((i) => {
        const at = g.project(p.x + 0.5 + (hash(`fe:${p.x}:${p.y}:${i}`) - 0.5) * 0.6, p.y + 0.5 + (hash(`fe:${p.y}:${p.x}:${i}`) - 0.5) * 0.4)
        return <i key={`e${i}`} className="m2c-fire-ember" style={{ left: at.x, top: at.y, animationDelay: `${-(r * 3 + i * 0.47)}s` }} />
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
