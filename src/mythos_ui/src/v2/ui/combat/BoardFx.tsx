// Transient board effects: numbers, particles, projectiles, shockwaves, tile flashes, area eruptions,
// scorch marks and wall/cover/unit impacts. Each item is a DOM/SVG node with a CSS animation whose
// duration is the item's `ms`; area items stagger their tiles ring by ring with animation-delay.

import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { posKey } from '../../engine/grid.ts'
import type { Pos } from '../../engine/types.ts'
import { STATUS_ICON } from '../common/assets.ts'
import type { AreaElement, BPt, FxItem } from './animator.ts'
import type { BoardGeom, Pt } from './geometry.ts'
import { pts, tileCenter, tileQuad, tileScale } from './geometry.ts'
import './boardfx.css'

function rnd(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280
  return x - Math.floor(x)
}

const TONE_COLOR: Record<string, string> = {
  party: '#5ff6ff',
  enemy: '#ff3d6e',
  env: '#ffb648',
  heal: '#6ef59a',
  block: '#7fb8ff',
  warn: '#ffb648',
  neutral: '#b9c7c9',
  pre: '#ff9ab3',
  fire: '#ff8a2a',
  shock: '#9fe8ff',
  gold: '#ffd76a',
}

/** Area element → [hot core, body colour]. */
const ELEMENT_COLOR: Record<AreaElement, [string, string]> = {
  fire: ['#fff1b0', '#ff6a14'],
  shock: ['#ffffff', '#7fdcff'],
  blast: ['#ffffff', '#ffc070'],
  force: ['#eaf6ff', '#9cc8ff'],
  shield: ['#e6f1ff', '#7fb8ff'],
  heal: ['#eafff0', '#6ef59a'],
}

function Particles({
  id,
  n,
  color,
  spread,
  ms,
  kind,
  delay = 0,
}: {
  id: number
  n: number
  color: string
  spread: number
  ms: number
  kind: 'spark' | 'debris' | 'dust' | 'pixels'
  delay?: number
}) {
  const out: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const a = rnd(id, i) * Math.PI * 2
    const d = spread * (0.45 + rnd(id, i + 50) * 0.75)
    const style = {
      '--dx': `${Math.cos(a) * d}px`,
      '--dy': kind === 'pixels' ? `${spread * (0.6 + rnd(id, i + 90) * 0.9)}px` : `${Math.sin(a) * d * 0.62 - (kind === 'debris' ? spread * 0.4 : 0)}px`,
      '--px': kind === 'pixels' ? `${(rnd(id, i + 7) - 0.5) * spread * 0.9}px` : '0px',
      '--py': kind === 'pixels' ? `${-rnd(id, i + 13) * spread * 1.3}px` : '0px',
      '--rot': `${(rnd(id, i + 3) - 0.5) * 540}deg`,
      animationDuration: `${ms * (0.7 + rnd(id, i + 21) * 0.3)}ms`,
      animationDelay: `${delay + (kind === 'pixels' ? rnd(id, i + 31) * ms * 0.25 : 0)}ms`,
      background: color,
      width: kind === 'debris' ? 5 + rnd(id, i) * 6 : kind === 'dust' ? 14 + rnd(id, i) * 14 : kind === 'pixels' ? 4 + Math.round(rnd(id, i + 5) * 4) : 3,
      height: kind === 'debris' ? 4 + rnd(id, i + 1) * 5 : kind === 'dust' ? 10 + rnd(id, i) * 8 : kind === 'pixels' ? 4 + Math.round(rnd(id, i + 5) * 4) : 3 + rnd(id, i + 9) * 9,
    } as CSSProperties
    out.push(<i key={i} className={`m2c-pt m2c-pt--${kind}`} style={style} />)
  }
  return <>{out}</>
}

// ---------------------------------------------------------------- element particles (absolute in the board box)

/** Flame tongues licking up from a point (teardrop gradients stretching up and dying, with white-hot inner cores). */
function Tongues({ seed, n, x, y, w, h, ms, delay = 0 }: { seed: number; n: number; x: number; y: number; w: number; h: number; ms: number; delay?: number }) {
  const out: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const ox = (rnd(seed, i + 3) - 0.5) * w
    const oy = (rnd(seed, i + 11) - 0.5) * w * 0.32
    const hh = h * (0.65 + rnd(seed, i + 17) * 0.65)
    const isCore = i % 2 === 1
    out.push(
      <i
        key={i}
        className={isCore ? 'm2c-ft is-core' : 'm2c-ft'}
        style={{
          left: x + ox,
          top: y + oy,
          width: hh * (isCore ? 0.38 : 0.46),
          height: hh * (isCore ? 0.78 : 1),
          animationDuration: `${ms * (0.65 + rnd(seed, i + 23) * 0.35)}ms`,
          animationDelay: `${delay + rnd(seed, i + 29) * ms * 0.18}ms`,
        }}
      />,
    )
  }
  return <>{out}</>
}

/** Embers / motes / sparks that rise and drift (`kind` picks the look). */
function Rising({
  seed,
  n,
  x,
  y,
  w,
  rise,
  ms,
  delay = 0,
  kind,
}: {
  seed: number
  n: number
  x: number
  y: number
  w: number
  rise: number
  ms: number
  delay?: number
  kind: 'ember' | 'mote' | 'smoke'
}) {
  const out: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const style = {
      left: x + (rnd(seed, i + 41) - 0.5) * w,
      top: y + (rnd(seed, i + 43) - 0.5) * w * 0.3,
      '--dx': `${(rnd(seed, i + 47) - 0.5) * w * 0.8}px`,
      '--dy': `${-rise * (0.6 + rnd(seed, i + 53) * 0.7)}px`,
      animationDuration: `${ms * (0.6 + rnd(seed, i + 59) * 0.4)}ms`,
      animationDelay: `${delay + rnd(seed, i + 61) * ms * 0.25}ms`,
    } as CSSProperties
    out.push(<i key={i} className={`m2c-rise is-${kind}`} style={style} />)
  }
  return <>{out}</>
}

/** A forked lightning strike from above down onto (x, y). */
function Lightning({ seed, x, y, h, ms, delay = 0, small }: { seed: number; x: number; y: number; h: number; ms: number; delay?: number; small?: boolean }) {
  const w = h * 0.5
  const segs = small ? 4 : 6
  const main: Pt[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const jx = i === 0 || i === segs ? 0 : (rnd(seed, i + 71) - 0.5) * w * 0.7
    main.push({ x: w / 2 + jx, y: t * h })
  }
  const bi = 2 + Math.floor(rnd(seed, 79) * (segs - 3))
  const from = main[bi] as Pt
  const branch: Pt[] = [from]
  const side = rnd(seed, 83) > 0.5 ? 1 : -1
  for (let i = 1; i <= 2; i++) branch.push({ x: from.x + side * w * 0.22 * i + (rnd(seed, 89 + i) - 0.5) * w * 0.1, y: from.y + h * 0.12 * i })
  return (
    <svg
      className={small ? 'm2c-lightning is-small' : 'm2c-lightning'}
      width={w}
      height={h}
      viewBox={`0 0 ${w.toFixed(1)} ${h.toFixed(1)}`}
      style={{ left: x - w / 2, top: y - h, animationDuration: `${ms}ms`, animationDelay: `${delay}ms` }}
    >
      <polyline points={pts(main)} className="is-glow" />
      <polyline points={pts(main)} className="is-core" />
      <polyline points={pts(branch)} className="is-branch" />
    </svg>
  )
}

/** Speed lines bursting out of an impact point. */
function Streaks({ seed, n, x, y, len, ms, color }: { seed: number; n: number; x: number; y: number; len: number; ms: number; color: string }) {
  const out: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * 360 + (rnd(seed, i + 101) - 0.5) * 30
    out.push(
      <i
        key={i}
        className="m2c-streak"
        style={{ left: x, top: y, width: len * (0.6 + rnd(seed, i + 103) * 0.6), color, '--a': `${ang}deg`, animationDuration: `${ms * 0.55}ms` } as CSSProperties}
      />,
    )
  }
  return <>{out}</>
}

/** Jagged crack polylines radiating from `c` (within `r`), optionally clipped to a direction cone. */
function cracks(seed: number, c: Pt, r: number, n: number, flatten = 1): Pt[][] {
  const out: Pt[][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(seed, i + 131) * 0.8
    const len = r * (0.55 + rnd(seed, i + 137) * 0.5)
    const line: Pt[] = [c]
    const steps = 3
    for (let s = 1; s <= steps; s++) {
      const t = (s / steps) * len
      const wob = (rnd(seed, i * 7 + s + 139) - 0.5) * 0.7
      line.push({ x: c.x + Math.cos(a + wob) * t, y: c.y + Math.sin(a + wob) * t * flatten })
    }
    out.push(line)
  }
  return out
}

const ringOf = (p: Pos, c: Pos) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y)

// ---------------------------------------------------------------- board layers

/** SVG ground layer (below units): tile flashes, area tile eruptions, scorch decals. */
function Ground({ g, fx }: { g: BoardGeom; fx: FxItem[] }) {
  const tw = g.tw
  return (
    <svg className="m2c-fx-plane" width={g.width} height={g.height}>
      <defs>
        <radialGradient id="m2c-scorch-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050302" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#120804" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#1a0c06" stopOpacity="0" />
        </radialGradient>
      </defs>
      {fx.map((f) => {
        if (f.kind === 'tiles')
          return f.tiles.map((p) => (
            <polygon key={`${f.id}:${posKey(p)}`} points={pts(tileQuad(g, p, 0.03))} className={`m2c-fx-tile is-${f.tone}`} style={{ animationDuration: `${f.ms}ms` }} />
          ))
        if (f.kind === 'scorch')
          return f.tiles.map((p, i) => {
            const c = tileCenter(g, p)
            const s = tileScale(g, p)
            const rx = tw * 0.44 * s
            const ry = tw * 0.3 * s
            const blob: Pt[] = []
            for (let k = 0; k < 11; k++) {
              const a = (k / 11) * Math.PI * 2
              const r = 0.72 + rnd(f.id + i, k + 151) * 0.34
              blob.push({ x: c.x + Math.cos(a) * rx * r, y: c.y + Math.sin(a) * ry * r })
            }
            const lines =
              f.element === 'blast'
                ? cracks(f.id + i * 13, c, rx * 0.9, 4, 0.62)
                : f.element === 'fire'
                  ? cracks(f.id + i * 17, c, rx * 0.85, 5, 0.62)
                  : []
            return (
              <g key={`${f.id}:${posKey(p)}`} className={`m2c-scorch is-${f.element}`} style={{ animationDuration: `${f.ms}ms` }}>
                <polygon points={pts(blob)} fill="url(#m2c-scorch-grad)" className={f.element === 'fire' ? 'm2c-scorch-rim' : undefined} />
                {lines.map((l, j) => (
                  <polyline key={j} points={pts(l)} className={f.element === 'fire' ? 'm2c-scorch-crack is-fire' : 'm2c-scorch-crack'} />
                ))}
                {f.element === 'fire' &&
                  [0, 1, 2, 3, 4, 5].map((j) => (
                    <circle
                      key={`e${j}`}
                      cx={c.x + (rnd(f.id + i, j + 161) - 0.5) * rx * 1.15}
                      cy={c.y + (rnd(f.id + i, j + 163) - 0.5) * ry * 1.15}
                      r={1.5 + rnd(f.id + i, j + 167) * 2.0}
                      className="m2c-scorch-ember"
                      style={{ animationDelay: `${-rnd(f.id + i, j + 171) * 900}ms` }}
                    />
                  ))}
              </g>
            )
          })
        if (wallBehind(f) && f.kind === 'impact') return <WallPanel key={f.id} g={g} f={f} />
        if (f.kind === 'area')
          return f.tiles.map((p) => {
            const delay = ringOf(p, f.center) * f.ring
            const style = { animationDuration: `${f.ms * 0.62}ms`, animationDelay: `${delay}ms` }
            return (
              <g key={`${f.id}:${posKey(p)}`} className={`m2c-erupt is-${f.element}`}>
                <polygon points={pts(tileQuad(g, p, 0.02))} className="m2c-erupt-tile" style={style} />
                <polygon points={pts(tileQuad(g, p, 0.24))} className="m2c-erupt-core" style={style} />
              </g>
            )
          })
        return null
      })}
    </svg>
  )
}

/** One area eruption's particles (DOM, above units). */
function AreaBurst({ g, f }: { g: BoardGeom; f: Extract<FxItem, { kind: 'area' }> }) {
  const tw = g.tw
  const [core, body] = ELEMENT_COLOR[f.element]
  const cc = tileCenter(g, f.center)
  const cs = tileScale(g, f.center)
  const radius = f.tiles.reduce((m, p) => Math.max(m, ringOf(p, f.center)), 0) + 0.7
  const flashW = tw * radius * 2 * cs
  const nodes: ReactNode[] = []
  f.tiles.forEach((p, i) => {
    const c = tileCenter(g, p)
    const s = tileScale(g, p)
    const delay = ringOf(p, f.center) * f.ring
    const seed = f.id * 31 + i
    const k = posKey(p)
    switch (f.element) {
      case 'fire':
        nodes.push(
          <i
            key={`fl${k}`}
            className="m2c-tileflash"
            style={{
              left: c.x,
              top: c.y - tw * 0.05 * s,
              width: tw * 1.05 * s,
              height: tw * 0.68 * s,
              background: `radial-gradient(closest-side, ${core}ee, ${body}99 48%, transparent)`,
              animationDuration: `${f.ms * 0.34}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(
          <i
            key={`fr${k}`}
            className="m2c-firering"
            style={{
              left: c.x,
              top: c.y,
              width: tw * 0.96 * s,
              height: tw * 0.58 * s,
              animationDuration: `${f.ms * 0.52}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(
          <i
            key={`fp${k}`}
            className="m2c-firepillar"
            style={{
              left: c.x,
              top: c.y + tw * 0.06 * s,
              width: tw * 0.48 * s,
              height: tw * 1.15 * s,
              animationDuration: `${f.ms * 0.58}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(<Tongues key={`t${k}`} seed={seed} n={5} x={c.x} y={c.y + tw * 0.08 * s} w={tw * 0.68 * s} h={tw * 0.76 * s} ms={f.ms * 0.88} delay={delay} />)
        nodes.push(<Rising key={`e${k}`} seed={seed} n={6} x={c.x} y={c.y} w={tw * 0.65 * s} rise={tw * 1.05 * s} ms={f.ms} delay={delay} kind="ember" />)
        nodes.push(<Rising key={`sm${k}`} seed={seed + 19} n={2} x={c.x} y={c.y - tw * 0.1 * s} w={tw * 0.48 * s} rise={tw * 0.65 * s} ms={f.ms * 1.1} delay={delay + 70} kind="smoke" />)
        break
      case 'shock':
        nodes.push(<Lightning key={`l${k}`} seed={seed} x={c.x + (rnd(seed, 1) - 0.5) * tw * 0.2 * s} y={c.y} h={tw * 1.25 * s} ms={f.ms * 0.55} delay={delay} />)
        nodes.push(
          <i
            key={`fl${k}`}
            className="m2c-tileflash"
            style={{
              left: c.x,
              top: c.y,
              width: tw * 0.9 * s,
              height: tw * 0.55 * s,
              background: `radial-gradient(closest-side, ${core}, ${body}99 50%, transparent)`,
              animationDuration: `${f.ms * 0.3}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(<Rising key={`s${k}`} seed={seed} n={4} x={c.x} y={c.y} w={tw * 0.7 * s} rise={tw * 0.45 * s} ms={f.ms * 0.6} delay={delay} kind="mote" />)
        break
      case 'blast':
        nodes.push(
          <i
            key={`fl${k}`}
            className="m2c-tileflash is-hot"
            style={{
              left: c.x,
              top: c.y - tw * 0.1 * s,
              width: tw * 1.1 * s,
              height: tw * 0.78 * s,
              background: `radial-gradient(closest-side, #fff, ${core} 30%, ${body}99 55%, transparent)`,
              animationDuration: `${f.ms * 0.3}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(
          <div key={`d${k}`} className="m2c-burst" style={{ left: c.x, top: c.y - tw * 0.12 * s }}>
            <div className="m2c-delay" style={{ animationDelay: `${delay}ms` }}>
              <Particles id={seed} n={5} color="#8a7a6a" spread={tw * 0.6 * s} ms={f.ms * 0.8} kind="debris" delay={delay} />
            </div>
          </div>,
        )
        nodes.push(<Rising key={`sm${k}`} seed={seed} n={2} x={c.x} y={c.y - tw * 0.1 * s} w={tw * 0.5 * s} rise={tw * 0.55 * s} ms={f.ms * 1.1} delay={delay + 90} kind="smoke" />)
        break
      case 'force':
        nodes.push(
          <i
            key={`r${k}`}
            className="m2c-ripple"
            style={{ left: c.x, top: c.y, width: tw * 0.95 * s, height: tw * 0.6 * s, color: body, animationDuration: `${f.ms * 0.55}ms`, animationDelay: `${delay}ms` }}
          />,
        )
        nodes.push(
          <div key={`d${k}`} className="m2c-burst" style={{ left: c.x, top: c.y }}>
            <div className="m2c-delay" style={{ animationDelay: `${delay}ms` }}>
              <Particles id={seed} n={3} color="rgba(200,220,235,.3)" spread={tw * 0.4 * s} ms={f.ms * 0.7} kind="dust" delay={delay} />
            </div>
          </div>,
        )
        break
      case 'shield':
      case 'heal':
        nodes.push(
          <i
            key={`g${k}`}
            className="m2c-tileflash is-soft"
            style={{
              left: c.x,
              top: c.y - tw * 0.2 * s,
              width: tw * 0.95 * s,
              height: tw * 0.95 * s,
              background: `radial-gradient(closest-side, ${core}cc, ${body}66 50%, transparent)`,
              animationDuration: `${f.ms * 0.7}ms`,
              animationDelay: `${delay}ms`,
            }}
          />,
        )
        nodes.push(<Rising key={`m${k}`} seed={seed} n={3} x={c.x} y={c.y} w={tw * 0.6 * s} rise={tw * 0.7 * s} ms={f.ms} delay={delay} kind="mote" />)
        break
    }
  })
  const soft = f.element === 'shield' || f.element === 'heal'
  return (
    <div className={`m2c-area is-${f.element}`} style={{ '--c1': core, '--c2': body } as CSSProperties}>
      {/* centre flash sized to the footprint */}
      <i
        className={soft ? 'm2c-areaflash is-soft' : 'm2c-areaflash'}
        style={{
          left: cc.x,
          top: cc.y - tw * 0.2 * cs,
          width: flashW,
          height: flashW * 0.72,
          background: `radial-gradient(closest-side, ${core}, ${body}bb 35%, ${body}33 65%, transparent)`,
          animationDuration: `${f.ms * (soft ? 0.7 : 0.42)}ms`,
        }}
      />
      {nodes}
    </div>
  )
}

/** Where a unit slammed into the board edge: that edge lights up as a grid barrier and cracks. SVG content in
 *  board coordinates (the caller wraps it in its own <svg> or <g>). */
function WallPanel({ g, f }: { g: BoardGeom; f: Extract<FxItem, { kind: 'impact' }> }) {
  if (!f.edge) return null
  const tw = g.tw
  const s = g.scaleAt(f.at.y + 0.5)
  const p = g.project(f.at.x + 0.5, f.at.y + 0.5)
  const hit = { x: p.x, y: p.y - tw * 0.42 * s }
  const a = g.project(f.edge[0].x, f.edge[0].y)
  const b = g.project(f.edge[1].x, f.edge[1].y)
  const h = tw * 0.95 * s
  const up = (q: Pt, v: number) => ({ x: q.x, y: q.y - h * v })
  const lerp = (u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
  const grid: Pt[][] = []
  for (const v of [0.25, 0.5, 0.75]) grid.push([up(a, v), up(b, v)])
  for (const u of [0.2, 0.4, 0.6, 0.8]) grid.push([lerp(u), up(lerp(u), 1)])
  const gid = `m2c-wallg-${f.id}`
  return (
    <g className="m2c-impact-g" style={{ animationDuration: `${f.ms}ms` }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff4c8" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffb648" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={pts([a, b, up(b, 1), up(a, 1)])} fill={`url(#${gid})`} />
      {grid.map((l, i) => (
        <polyline key={`g${i}`} points={pts(l)} className="m2c-wall-grid" />
      ))}
      <polyline points={pts([a, b])} className="m2c-wall-base" />
      {cracks(f.id, hit, tw * 0.5 * s, 6, 1).map((l, i) => (
        <polyline key={`c${i}`} points={pts(l)} className="m2c-crack" />
      ))}
    </g>
  )
}

/** A far / side wall stands behind the unit that hit it (ground layer); only the near edge is drawn in front. */
const wallBehind = (f: FxItem) => f.kind === 'impact' && f.surface === 'wall' && !!f.edge && f.dir !== 'down'

/** Wall / cover / unit impact: flash, speed lines, and the struck surface (near wall panel / cover cracks). */
function Impact({ g, f }: { g: BoardGeom; f: Extract<FxItem, { kind: 'impact' }> }) {
  const tw = g.tw
  const p = g.project(f.at.x + 0.5, f.at.y + 0.5)
  const s = g.scaleAt(f.at.y + 0.5)
  const lift = f.surface === 'cover' ? 0.2 : f.surface === 'wall' ? 0.42 : 0.5
  const hit = { x: p.x, y: p.y - tw * lift * s }
  let surface: ReactNode = null
  if (f.surface === 'wall' && f.edge && !wallBehind(f)) {
    surface = (
      <svg className="m2c-impact-svg" width={g.width} height={g.height}>
        <WallPanel g={g} f={f} />
      </svg>
    )
  } else if (f.surface === 'cover') {
    surface = (
      <svg className="m2c-impact-svg" width={g.width} height={g.height}>
        <g className="m2c-impact-g" style={{ animationDuration: `${f.ms * 1.4}ms` }}>
          {cracks(f.id, hit, tw * 0.32 * s, 5, 0.7).map((l, i) => (
            <polyline key={`c${i}`} points={pts(l)} className="m2c-crack is-cover" />
          ))}
        </g>
      </svg>
    )
  }
  return (
    <>
      {surface}
      <div className="m2c-burst" style={{ left: hit.x, top: hit.y }}>
        <div className="m2c-impactflash" style={{ width: tw * 1.3 * s, height: tw * 1.3 * s, animationDuration: `${f.ms * 0.45}ms` }} />
        <Streaks seed={f.id} n={9} x={0} y={0} len={tw * 0.7 * s} ms={f.ms} color={f.surface === 'unit' ? '#ffd38c' : '#fff1c8'} />
        {f.surface === 'unit' && (
          <div className="m2c-star" style={{ left: 0, top: 0, width: tw * 0.95 * s, height: tw * 0.95 * s, animationDuration: `${f.ms * 0.7}ms` }}>
            <i />
          </div>
        )}
        <Particles
          id={f.id + 7}
          n={f.surface === 'cover' ? 14 : 10}
          color={f.surface === 'cover' ? '#9fd8d4' : '#ffe2a0'}
          spread={tw * 0.8 * s}
          ms={f.ms * 0.8}
          kind={f.surface === 'cover' ? 'debris' : 'spark'}
        />
      </div>
    </>
  )
}

export const BoardFx = memo(function BoardFx({ g, fx }: { g: BoardGeom; fx: FxItem[] }) {
  const tw = g.tw
  const at = (p: BPt) => g.project(p.x + 0.5, p.y + 0.5)
  const ground = fx.some((f) => f.kind === 'tiles' || f.kind === 'area' || f.kind === 'scorch' || wallBehind(f))
  return (
    <>
      {ground && <Ground g={g} fx={fx} />}
      <div className="m2c-fx">
        {fx.map((f) => {
          if (f.kind === 'tiles' || f.kind === 'card' || f.kind === 'scorch') return null
          if (f.kind === 'area') return <AreaBurst key={f.id} g={g} f={f} />
          if (f.kind === 'impact') return <Impact key={f.id} g={g} f={f} />
          if (f.kind === 'wave') {
            const p = at(f.at)
            const s = tileScale(g, { x: Math.round(f.at.x), y: Math.round(f.at.y) })
            const w = tw * f.radius * 2 * s
            const color = TONE_COLOR[f.tone] ?? '#fff'
            return (
              <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y }}>
                <i className="m2c-wave" style={{ width: w, height: w * 0.62, color, animationDuration: `${f.ms}ms` }} />
                <i
                  className="m2c-wave is-inner"
                  style={{ width: w * 0.7, height: w * 0.7 * 0.62, color, animationDuration: `${f.ms * 0.8}ms`, animationDelay: `${f.ms * 0.08}ms` }}
                />
              </div>
            )
          }
          const color = TONE_COLOR[f.tone] ?? '#fff'
          if (f.kind === 'text') {
            const p = at(f.at)
            const s = tileScale(g, { x: Math.round(f.at.x), y: Math.round(f.at.y) })
            const drift = (rnd(f.id, 1) - 0.5) * tw * 0.5
            return (
              <div
                key={f.id}
                className={`m2c-num is-${f.tone}`}
                style={{ left: p.x, top: p.y - tw * 0.6 * s, animationDuration: `${f.ms}ms`, '--drift': `${drift}px` } as CSSProperties}
              >
                <span>
                  {f.icon && <img src={STATUS_ICON[f.icon]} alt="" />}
                  {f.text}
                </span>
              </div>
            )
          }
          if (f.kind === 'bolt' || f.kind === 'beam' || f.kind === 'arc') {
            const a = at(f.from)
            const b = at(f.to)
            const lift = tw * 0.55 * tileScale(g, { x: Math.round(f.from.x), y: Math.round(f.from.y) })
            const lift2 = tw * 0.45 * tileScale(g, { x: Math.round(f.to.x), y: Math.round(f.to.y) })
            if (f.kind === 'arc') {
              const dx = b.x - a.x
              const dy = b.y - a.y + lift
              const cx = dx / 2
              const cy = Math.min(0, dy) - tw * 1.3
              return (
                <div key={f.id} className={`m2c-arc is-${f.tone}`} style={{ left: a.x, top: a.y - lift, color, animationDuration: `${f.ms}ms` }}>
                  <i style={{ offsetPath: `path('M0,0 Q${cx.toFixed(1)},${cy.toFixed(1)} ${dx.toFixed(1)},${dy.toFixed(1)}')`, animationDuration: `${f.ms}ms` }} />
                </div>
              )
            }
            const x1 = a.x
            const y1 = a.y - lift
            const x2 = b.x
            const y2 = b.y - (f.kind === 'beam' ? lift : lift2)
            const len = Math.hypot(x2 - x1, y2 - y1)
            const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
            return (
              <div
                key={f.id}
                className={`m2c-${f.kind} is-${f.tone}`}
                style={{ left: x1, top: y1, width: len, transform: `rotate(${ang}deg)`, color, animationDuration: `${f.ms}ms` }}
              >
                <i style={{ animationDuration: `${f.ms}ms` }} />
              </div>
            )
          }
          if (!('at' in f)) return null
          const p = at(f.at)
          const s = tileScale(g, { x: Math.round(f.at.x), y: Math.round(f.at.y) })
          const chest = p.y - tw * 0.55 * s
          switch (f.kind) {
            case 'spark':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: chest }}>
                  <div className="m2c-flashdot" style={{ background: color, animationDuration: `${f.ms * 0.6}ms` }} />
                  <Particles id={f.id} n={14} color={color} spread={tw * 0.75 * s} ms={f.ms} kind="spark" />
                </div>
              )
            case 'burst':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.35 * s }}>
                  <div
                    className="m2c-glow"
                    style={{ background: `radial-gradient(circle, ${color}cc, transparent 65%)`, width: tw * s, height: tw * s, animationDuration: `${f.ms}ms` }}
                  />
                  <Particles id={f.id} n={8} color={color} spread={tw * 0.55 * s} ms={f.ms} kind="spark" />
                </div>
              )
            case 'slash':
              return (
                <div key={f.id} className="m2c-slash" style={{ left: p.x, top: chest, color, animationDuration: `${f.ms}ms` }}>
                  <i style={{ width: tw * 1.1 * s, animationDuration: `${f.ms}ms` }} />
                  <i style={{ width: tw * 0.9 * s, animationDuration: `${f.ms}ms`, animationDelay: `${f.ms * 0.12}ms` }} />
                </div>
              )
            case 'nova':
            case 'ring':
              return (
                <div
                  key={f.id}
                  className={`m2c-ring${f.kind === 'nova' ? ' is-nova' : ''}`}
                  style={{
                    left: p.x,
                    top: p.y,
                    width: tw * (f.kind === 'nova' ? 2.6 : 1.6) * s,
                    height: tw * (f.kind === 'nova' ? 1.5 : 0.95) * s,
                    color,
                    animationDuration: `${f.ms}ms`,
                  }}
                />
              )
            case 'shield':
              return (
                <div
                  key={f.id}
                  className="m2c-shieldfx"
                  style={{ left: p.x, top: p.y - tw * 0.6 * s, width: tw * 0.95 * s, height: tw * 1.1 * s, animationDuration: `${f.ms}ms` }}
                />
              )
            case 'debris':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.2 * s }}>
                  <Particles id={f.id} n={12} color={f.tone === 'block' ? '#4f6b70' : '#7d9396'} spread={tw * 0.7 * s} ms={f.ms} kind="debris" />
                </div>
              )
            case 'dust':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y }}>
                  <Particles id={f.id} n={6} color="rgba(190,205,210,.32)" spread={tw * 0.42 * s} ms={f.ms} kind="dust" />
                </div>
              )
            case 'star':
              return (
                <div key={f.id} className="m2c-star" style={{ left: p.x, top: p.y - tw * 0.45 * s, width: tw * 0.9 * s, height: tw * 0.9 * s, animationDuration: `${f.ms}ms` }}>
                  <i />
                </div>
              )
            case 'pixels':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.2 * s }}>
                  <Particles id={f.id} n={22} color={color} spread={tw * 0.9 * s} ms={f.ms} kind="pixels" />
                </div>
              )
            case 'flame':
              // Burn tick on a unit: the body goes up in a searing column of fire and thermal shock ring.
              return (
                <div key={f.id} className="m2c-fxgroup is-fire">
                  <i
                    className="m2c-tileflash"
                    style={{
                      left: p.x,
                      top: chest,
                      width: tw * 1.05 * s,
                      height: tw * 1.2 * s,
                      background: 'radial-gradient(closest-side, #fff8d2, #ff6a14bb 48%, transparent)',
                      animationDuration: `${f.ms * 0.48}ms`,
                    }}
                  />
                  <i
                    className="m2c-firering"
                    style={{
                      left: p.x,
                      top: p.y,
                      width: tw * 0.92 * s,
                      height: tw * 0.54 * s,
                      animationDuration: `${f.ms * 0.55}ms`,
                    }}
                  />
                  <i
                    className="m2c-firepillar"
                    style={{
                      left: p.x,
                      top: p.y + tw * 0.04 * s,
                      width: tw * 0.44 * s,
                      height: tw * 1.05 * s,
                      animationDuration: `${f.ms * 0.6}ms`,
                    }}
                  />
                  <Tongues seed={f.id} n={7} x={p.x} y={p.y - tw * 0.05 * s} w={tw * 0.6 * s} h={tw * 0.82 * s} ms={f.ms} />
                  <Rising seed={f.id} n={7} x={p.x} y={chest} w={tw * 0.55 * s} rise={tw * 0.95 * s} ms={f.ms * 1.2} kind="ember" />
                </div>
              )
            case 'zap':
              return (
                <div key={f.id} className="m2c-fxgroup is-shock">
                  <i
                    className="m2c-tileflash"
                    style={{
                      left: p.x,
                      top: p.y - tw * 0.25 * s,
                      width: tw * 0.9 * s,
                      height: tw * 0.9 * s,
                      background: 'radial-gradient(closest-side, #fff, #7fdcffaa 45%, transparent)',
                      animationDuration: `${f.ms * 0.4}ms`,
                    }}
                  />
                  <Lightning seed={f.id} x={p.x - tw * 0.15 * s} y={p.y} h={tw * 0.75 * s} ms={f.ms * 0.7} small />
                  <Lightning seed={f.id + 3} x={p.x + tw * 0.18 * s} y={p.y + tw * 0.05 * s} h={tw * 0.6 * s} ms={f.ms * 0.7} delay={f.ms * 0.15} small />
                  <div className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.2 * s }}>
                    <Particles id={f.id} n={8} color="#bff3ff" spread={tw * 0.55 * s} ms={f.ms * 0.8} kind="spark" />
                  </div>
                </div>
              )
            case 'smoke':
              return (
                <div key={f.id} className="m2c-fxgroup">
                  <Rising seed={f.id} n={5} x={p.x} y={p.y} w={tw * 0.55 * s} rise={tw * 0.8 * s} ms={f.ms} kind="smoke" />
                </div>
              )
            case 'flare':
              // A tile catching fire (tone 'fire') or a lobbed shot landing without an area (any other tone).
              return f.tone === 'fire' ? (
                <div key={f.id} className="m2c-fxgroup is-fire">
                  <i
                    className="m2c-tileflash"
                    style={{
                      left: p.x,
                      top: p.y - tw * 0.1 * s,
                      width: tw * 1.15 * s,
                      height: tw * 0.85 * s,
                      background: 'radial-gradient(closest-side, #fff8d2, #ff6a14bb 48%, transparent)',
                      animationDuration: `${f.ms * 0.45}ms`,
                    }}
                  />
                  <i
                    className="m2c-firering"
                    style={{
                      left: p.x,
                      top: p.y,
                      width: tw * 0.98 * s,
                      height: tw * 0.58 * s,
                      animationDuration: `${f.ms * 0.55}ms`,
                    }}
                  />
                  <Tongues seed={f.id} n={5} x={p.x} y={p.y + tw * 0.08 * s} w={tw * 0.64 * s} h={tw * 0.78 * s} ms={f.ms} />
                  <Rising seed={f.id} n={6} x={p.x} y={p.y} w={tw * 0.64 * s} rise={tw * 0.98 * s} ms={f.ms * 1.1} kind="ember" />
                </div>
              ) : (
                <div key={f.id} className="m2c-fxgroup">
                  <i
                    className="m2c-tileflash is-hot"
                    style={{
                      left: p.x,
                      top: p.y - tw * 0.15 * s,
                      width: tw * 1.1 * s,
                      height: tw * 0.85 * s,
                      background: `radial-gradient(closest-side, #fff, ${color}aa 45%, transparent)`,
                      animationDuration: `${f.ms * 0.45}ms`,
                    }}
                  />
                  <div className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.15 * s }}>
                    <Particles id={f.id} n={10} color={color} spread={tw * 0.7 * s} ms={f.ms} kind="spark" />
                  </div>
                </div>
              )
          }
          return null
        })}
      </div>
    </>
  )
})
