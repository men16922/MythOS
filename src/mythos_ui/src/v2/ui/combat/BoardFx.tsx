// Transient board effects: numbers, particles, projectiles, shockwaves, tile flashes.
// Each item is a DOM node with a CSS animation whose duration is the item's `ms`.

import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { posKey } from '../../engine/grid.ts'
import { STATUS_ICON } from '../common/assets.ts'
import type { FxItem } from './animator.ts'
import type { BoardGeom } from './geometry.ts'
import { pts, tileQuad, tileScale } from './geometry.ts'

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
}

function Particles({ id, n, color, spread, ms, kind }: { id: number; n: number; color: string; spread: number; ms: number; kind: 'spark' | 'debris' | 'dust' | 'pixels' }) {
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
      animationDelay: kind === 'pixels' ? `${rnd(id, i + 31) * ms * 0.25}ms` : '0ms',
      background: color,
      width: kind === 'debris' ? 5 + rnd(id, i) * 6 : kind === 'dust' ? 14 + rnd(id, i) * 14 : kind === 'pixels' ? 4 + Math.round(rnd(id, i + 5) * 4) : 3,
      height: kind === 'debris' ? 4 + rnd(id, i + 1) * 5 : kind === 'dust' ? 10 + rnd(id, i) * 8 : kind === 'pixels' ? 4 + Math.round(rnd(id, i + 5) * 4) : 3 + rnd(id, i + 9) * 9,
    } as CSSProperties
    out.push(<i key={i} className={`m2c-pt m2c-pt--${kind}`} style={style} />)
  }
  return <>{out}</>
}

export const BoardFx = memo(function BoardFx({ g, fx }: { g: BoardGeom; fx: FxItem[] }) {
  const tw = g.tw
  const at = (p: { x: number; y: number }) => g.project(p.x + 0.5, p.y + 0.5)
  const tiles = fx.filter((f) => f.kind === 'tiles')
  return (
    <>
      {tiles.length > 0 && (
        <svg className="m2c-fx-plane" width={g.width} height={g.height}>
          {tiles.map((f) =>
            f.kind === 'tiles'
              ? f.tiles.map((p) => (
                  <polygon
                    key={`${f.id}:${posKey(p)}`}
                    points={pts(tileQuad(g, p, 0.03))}
                    className={`m2c-fx-tile is-${f.tone}`}
                    style={{ animationDuration: `${f.ms}ms` }}
                  />
                ))
              : null,
          )}
        </svg>
      )}
      <div className="m2c-fx">
        {fx.map((f) => {
          if (f.kind === 'tiles' || f.kind === 'card') return null
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
              <div key={f.id} className={`m2c-${f.kind} is-${f.tone}`} style={{ left: x1, top: y1, width: len, transform: `rotate(${ang}deg)`, color, animationDuration: `${f.ms}ms` }}>
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
                  <div className="m2c-glow" style={{ background: `radial-gradient(circle, ${color}cc, transparent 65%)`, width: tw * s, height: tw * s, animationDuration: `${f.ms}ms` }} />
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
                  style={{ left: p.x, top: p.y, width: tw * (f.kind === 'nova' ? 2.6 : 1.6) * s, height: tw * (f.kind === 'nova' ? 1.5 : 0.95) * s, color, animationDuration: `${f.ms}ms` }}
                />
              )
            case 'shield':
              return (
                <div key={f.id} className="m2c-shieldfx" style={{ left: p.x, top: p.y - tw * 0.6 * s, width: tw * 0.95 * s, height: tw * 1.1 * s, animationDuration: `${f.ms}ms` }} />
              )
            case 'debris':
              return (
                <div key={f.id} className="m2c-burst" style={{ left: p.x, top: p.y - tw * 0.2 * s }}>
                  <Particles id={f.id} n={12} color="#7d9396" spread={tw * 0.7 * s} ms={f.ms} kind="debris" />
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
          }
          return null
        })}
      </div>
    </>
  )
})
