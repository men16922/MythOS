// Enemy intent marks on the board: the struck tiles and attack lanes (SVG), the per-tile damage / wind-up
// labels, push arrows and void-drop skulls, and the lock-on lasers + reticles that follow a tracked unit.

import type { CSSProperties, ReactNode } from 'react'
import { ChevronsRight, Crosshair, Hourglass, LocateFixed, Skull } from 'lucide-react'
import { posKey } from '../../../engine/grid.ts'
import type { CombatState, ContentRegistry, Dir, Pos } from '../../../engine/types.ts'
import type { BoardGeom, Pt } from '../geometry.ts'
import { dirAngle, pts, tileCenter, tileQuad, tileScale, unitScale } from '../geometry.ts'
import type { IntentView, TileMark } from './marks.ts'

function arrowHead(at: Pt, angleDeg: number, size: number): string {
  const a = (angleDeg * Math.PI) / 180
  const p1 = { x: at.x + Math.cos(a) * size, y: at.y + Math.sin(a) * size }
  const p2 = { x: at.x + Math.cos(a + 2.5) * size, y: at.y + Math.sin(a + 2.5) * size }
  const p3 = { x: at.x + Math.cos(a - 2.5) * size, y: at.y + Math.sin(a - 2.5) * size }
  return pts([p1, p2, p3])
}

/** SVG: the tiles an intent will strike, plus its lane (line / beam / charge / melee) or lob arc + reticle. */
export function IntentShapes({ g, iv, dim, hot }: { g: BoardGeom; iv: IntentView; dim: boolean; hot: boolean }) {
  const { info, unit } = iv
  const windup = info.windupLeft > 0
  const tone = `${windup ? 'is-wind' : 'is-hit'}${info.move.pattern === 'track' ? ' is-track' : ''}`
  const intensity = Math.min(1, 0.35 + info.damage * 0.09)
  const style = { '--int': intensity } as CSSProperties
  const from = tileCenter(g, unit.pos)
  const pattern = info.move.pattern
  const last = info.path[info.path.length - 1] ?? info.tiles[info.tiles.length - 1]
  let lane: ReactNode = null
  if ((pattern === 'line' || pattern === 'beam' || pattern === 'charge' || pattern === 'melee') && last && info.dir) {
    const to = tileCenter(g, last)
    const ang = dirAngle(g, last, info.dir)
    const sz = g.tw * 0.13 * tileScale(g, last)
    lane = (
      <g className={`m2c-lane m2c-lane--${pattern}`}>
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="m2c-lane-glow" />
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="m2c-lane-core" />
        <polygon points={arrowHead(to, ang, sz)} className="m2c-lane-head" />
      </g>
    )
  } else if (pattern === 'lob' && (info.target ?? last)) {
    const tp = (info.target ?? last) as Pos
    const to = tileCenter(g, tp)
    const cx = (from.x + to.x) / 2
    const cy = Math.min(from.y, to.y) - g.tw * 1.1
    const s = tileScale(g, tp)
    lane = (
      <g className="m2c-lane m2c-lane--lob">
        <path d={`M${from.x},${from.y - g.tw * 0.5} Q${cx},${cy} ${to.x},${to.y}`} className="m2c-lane-arc" />
        <ellipse cx={to.x} cy={to.y} rx={g.tw * 0.3 * s} ry={g.tw * 0.17 * s} className="m2c-reticle" />
        <ellipse cx={to.x} cy={to.y} rx={g.tw * 0.12 * s} ry={g.tw * 0.07 * s} className="m2c-reticle is-inner" />
      </g>
    )
  }
  return (
    <g className={`m2c-intent ${tone}${dim ? ' is-dim' : ''}${hot ? ' is-hot' : ''}`} style={style}>
      {info.tiles.map((p) => (
        <polygon key={posKey(p)} points={pts(tileQuad(g, p, 0.05))} className="m2c-int-tile" />
      ))}
      {lane}
    </g>
  )
}

/** Labels layer: damage (or wind-up turns) per struck tile, push arrows, and skulls where a push drops a unit
 *  into the void. */
export function IntentLabels({ g, tileDmg, focusEnemy, dimIntents }: { g: BoardGeom; tileDmg: Map<string, TileMark>; focusEnemy: string | null; dimIntents: boolean }) {
  const marks = [...tileDmg.values()]
  return (
    <>
      {marks
        .filter((t) => t.labelled)
        .map((t) => {
          const at = g.project(t.p.x + 0.2, t.p.y + 0.26)
          const dim = !!focusEnemy && !t.uids.includes(focusEnemy)
          return (
            <div key={`d${posKey(t.p)}`} className={`m2c-tdmg${t.dmg > 0 ? '' : ' is-wind'}${dim || dimIntents ? ' is-dim' : ''}`} style={{ left: at.x, top: at.y }}>
              {t.dmg > 0 ? (
                <>
                  <Crosshair size={11} strokeWidth={2.8} />
                  {t.dmg}
                </>
              ) : (
                <>
                  <Hourglass size={10} strokeWidth={2.8} />
                  {t.wind}
                </>
              )}
            </div>
          )
        })}
      {marks
        .filter((t) => t.push)
        .map((t) => {
          const c = tileCenter(g, t.p)
          const ang = dirAngle(g, t.p, t.push as Dir)
          return (
            <div key={`p${posKey(t.p)}`} className={`m2c-tpush${dimIntents ? ' is-dim' : ''}`} style={{ left: c.x, top: c.y, transform: `translate(-50%,-50%) rotate(${ang}deg)` }}>
              <ChevronsRight size={18} strokeWidth={3} />
            </div>
          )
        })}
      {marks
        .filter((t) => t.drops && !dimIntents)
        .map((t) => {
          const c = tileCenter(g, t.p)
          return (
            <div key={`d${posKey(t.p)}`} className="m2c-tdrop" style={{ left: c.x, top: c.y - g.tw * 0.62 }}>
              <Skull size={15} strokeWidth={2.6} />
            </div>
          )
        })}
    </>
  )
}

/** Lock-on reticles: follow the locked unit, slide when the lock moves. */
export function LockOns(p: {
  g: BoardGeom
  intents: IntentView[]
  vc: CombatState
  C: ContentRegistry
  focusEnemy: string | null
  dimIntents: boolean
  firing: string | null
}) {
  const { g, C } = p
  return p.intents
    .filter((iv) => iv.info.move.pattern === 'track' && iv.info.targetUid)
    .map((iv, _i, locks) => {
      const stack = locks.filter((o) => o.info.targetUid === iv.info.targetUid)
      const nth = stack.indexOf(iv)
      const tgt = p.vc.units.find((x) => x.uid === iv.info.targetUid)
      if (!tgt) return null
      const a = tileCenter(g, iv.unit.pos)
      const b = tileCenter(g, tgt.pos)
      const sa = tileScale(g, iv.unit.pos) * unitScale(C, iv.unit)
      const sb = tileScale(g, tgt.pos)
      const ax = a.x
      const ay = a.y - g.tw * 0.75 * sa
      const bx = b.x
      const by = b.y - g.tw * 0.62 * sb
      const len = Math.hypot(bx - ax, by - ay)
      const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
      const dim = (!!p.focusEnemy && p.focusEnemy !== iv.uid) || p.dimIntents
      const wind = iv.info.windupLeft > 0
      return (
        <div key={`lock${iv.uid}`} className={`m2c-lock${dim ? ' is-dim' : ''}${wind ? ' is-wind' : ''}${p.firing === iv.uid ? ' is-hot' : ''}`}>
          <div className="m2c-lock-laser" style={{ transform: `translate(${ax}px, ${ay}px) rotate(${ang}deg)`, width: len }} />
          <div
            className="m2c-lock-ret"
            style={
              {
                transform: `translate(${bx}px, ${by}px)`,
                width: g.tw * (0.9 + nth * 0.22) * sb,
                height: g.tw * (0.9 + nth * 0.22) * sb,
                '--nth': nth,
              } as CSSProperties
            }
          >
            <i className="m2c-lock-ring" />
            <i className="m2c-lock-ticks" />
            <b>
              {wind ? <Hourglass size={11} strokeWidth={2.8} /> : <LocateFixed size={11} strokeWidth={2.8} />}
              {wind ? iv.info.windupLeft + 1 : iv.info.damage}
            </b>
          </div>
        </div>
      )
    })
}
