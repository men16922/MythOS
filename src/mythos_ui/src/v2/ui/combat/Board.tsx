// The tactical board: tilted 7×5 plane (SVG), y-sorted unit sprites (DOM), intent/target
// overlays, number labels and the board FX layer. Pure view — all decisions live in CombatScreen.

import { memo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ChevronsRight, Crosshair, Flame, Hourglass, LocateFixed, Plus, Skull, Sparkles, Swords, Target, Zap, CircleDot, Radiation } from 'lucide-react'
import type { CombatPreview, IntentInfo } from '../../engine/combat.ts'
import { COVER_HP, FIRE_BURN } from '../../engine/effects.ts'
import { add, dirToward, posKey } from '../../engine/grid.ts'
import { GRID_H, GRID_W } from '../../engine/types.ts'
import type { CombatState, ContentRegistry, Dir, EnemyMove, Lang, Pos, StatusKind, Tile, UnitState } from '../../engine/types.ts'
import { STATUS_ICON, sprite } from '../common/assets.ts'
import { V2_SPRITES } from '../common/spriteManifest.ts'
import type { UnitFx, FxItem } from './animator.ts'
import { BoardFx } from './BoardFx.tsx'
import type { BoardGeom, Pt } from './geometry.ts'
import { dirAngle, hash, pts, tileCenter, tileQuad, tileScale, unitScale } from './geometry.ts'

export interface IntentView {
  uid: string
  unit: UnitState
  info: IntentInfo
}

export interface DirArrow {
  dir: Dir
  at: Pos
  active: boolean
}

export interface BoardProps {
  g: BoardGeom
  vc: CombatState
  ufx: Record<string, UnitFx>
  C: ContentRegistry
  lang: Lang
  intents: IntentView[]
  focusEnemy: string | null
  firing: string | null
  threat: Record<string, number> | null
  moves: Pos[]
  moveHover: Pos | null
  targets: Pos[]
  active: Pos[]
  activeHostile: boolean
  dirArrows: DirArrow[]
  preview: CombatPreview | null
  selectedUid: string | null
  originUid: string | null
  hoverPos: Pos | null
  incoming: { pos: Pos; enemyId: string }[]
  fx: FxItem[]
  dimIntents: boolean
  onTileEnter: (p: Pos | null) => void
  onTileClick: (p: Pos) => void
  onTileContext: () => void
  onDirClick: (d: Dir) => void
  onDirEnter: (d: Dir | null) => void
  registerFigure: (uid: string, el: HTMLElement | null) => void
  registerBoard: (el: HTMLElement | null) => void
}

export function PatternIcon({ p, size = 14 }: { p: EnemyMove['pattern']; size?: number }) {
  switch (p) {
    case 'melee':
      return <Swords size={size} strokeWidth={2.4} />
    case 'line':
      return <Crosshair size={size} strokeWidth={2.4} />
    case 'beam':
      return <Zap size={size} strokeWidth={2.4} />
    case 'charge':
      return <ChevronsRight size={size} strokeWidth={2.6} />
    case 'nova':
      return <Radiation size={size} strokeWidth={2.4} />
    case 'lob':
      return <Target size={size} strokeWidth={2.4} />
    case 'buff':
      return <Sparkles size={size} strokeWidth={2.4} />
    case 'summon':
      return <Plus size={size} strokeWidth={2.8} />
    case 'track':
      return <LocateFixed size={size} strokeWidth={2.4} />
  }
}

// ---------------------------------------------------------------- tiles

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

const BoardPlane = memo(function BoardPlane({ g, tiles, part }: { g: BoardGeom; tiles: Tile[][]; part: 'floor' | 'covers' }) {
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

// ---------------------------------------------------------------- intents

function arrowHead(at: Pt, angleDeg: number, size: number): string {
  const a = (angleDeg * Math.PI) / 180
  const p1 = { x: at.x + Math.cos(a) * size, y: at.y + Math.sin(a) * size }
  const p2 = { x: at.x + Math.cos(a + 2.5) * size, y: at.y + Math.sin(a + 2.5) * size }
  const p3 = { x: at.x + Math.cos(a - 2.5) * size, y: at.y + Math.sin(a - 2.5) * size }
  return pts([p1, p2, p3])
}

function IntentShapes({ g, iv, dim, hot }: { g: BoardGeom; iv: IntentView; dim: boolean; hot: boolean }) {
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

// ---------------------------------------------------------------- units

interface UnitProps {
  /** 'body' = sprite + ring + hit box (y-sorted); 'hud' = bars/intent badge (always above every sprite). */
  layer: 'body' | 'hud'
  u: UnitState
  fx: UnitFx | undefined
  g: BoardGeom
  scale: number
  selected: boolean
  origin: boolean
  hovered: boolean
  xray: boolean
  /** A unit or terrain sits directly behind this one: fade the upper sprite so it stays readable. */
  occluding: boolean
  /** The tile right behind is clickable (a unit, a move or a card target): the hit box stops short of it so the
   *  tall sprite never swallows a click meant for that tile. */
  hitShort: boolean
  danger: number
  preview: CombatPreview['units'][number] | undefined
  intent: IntentInfo | null
  intentDim: boolean
  bobSeed: number
  registerFigure: (uid: string, el: HTMLElement | null) => void
  onEnter: (p: Pos) => void
  onClick: (p: Pos) => void
}

const STATUS_ORDER: StatusKind[] = ['burn', 'shock', 'mark', 'weak', 'guard', 'thorns']
/** Sprite box in tile widths. 1.x art is 512×768 with feet at ~93 %; 2.0 art keeps feet 18 px above the
 *  bottom edge (97.7 %) and bosses use square 768×768 canvases. */
const FIG_W = 1.12
const FIG_H = 1.68
const SQUARE_SPRITES = new Set(['haetae', 'echo_eater', 'ix_avatar'])
function spriteBox(key: string, tw: number): { w: number; h: number; feet: number } {
  const v2 = !!V2_SPRITES[key]
  const h = tw * FIG_H
  return { w: SQUARE_SPRITES.has(key) ? h : tw * FIG_W, h, feet: v2 ? 0.977 : 0.93 }
}

const UnitSprite = memo(function UnitSprite(p: UnitProps) {
  const { u, g, fx } = p
  const c = tileCenter(g, u.pos)
  const s = tileScale(g, u.pos)
  const pose = fx?.pose ?? 'idle'
  const nativeRight = u.side !== 'enemy'
  // Sprites only look left or right. Facing up/down keeps the last horizontal look (or the side of an off-axis
  // target the animator turned toward), so a unit that aims up the board does not snap back to its native side.
  const horiz = u.facing === 'left' || u.facing === 'right' ? u.facing : (fx?.faceX ?? null)
  const [lastHoriz, setLastHoriz] = useState<'left' | 'right'>(horiz ?? (nativeRight ? 'right' : 'left'))
  if (horiz && horiz !== lastHoriz) setLastHoriz(horiz)
  const lookLeft = (horiz ?? lastHoriz) === 'left'
  const flip = nativeRight ? lookLeft : !lookLeft
  const tw = g.tw
  const down = u.hp <= 0 && u.side !== 'enemy' && !fx?.dying
  const moveMs = fx?.moveMs ?? 0
  const ease = fx?.ease === 'out' ? 'cubic-bezier(.15,.85,.3,1)' : fx?.ease === 'in' ? 'cubic-bezier(.55,0,.95,.55)' : 'linear'
  const wrapStyle: CSSProperties = {
    transform: `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`,
    zIndex: 100 + u.pos.y * 10 + u.pos.x,
    transition: moveMs > 0 ? `transform ${moveMs}ms ${ease}` : 'none',
  }
  const burning = (u.statuses.burn ?? 0) > 0 && u.hp > 0 && !fx?.dying
  const box = spriteBox(u.sprite, tw)
  const figW = box.w
  const figH = box.h
  const hpPct = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)))
  const pv = p.preview
  const pvHp = pv ? Math.max(0, pv.hpAfter) / Math.max(1, u.maxHp) : null
  const statuses = STATUS_ORDER.filter((k) => (u.statuses[k] ?? 0) > 0)
  const cls = [
    'm2c-unit',
    `is-${u.side}`,
    p.selected ? 'is-selected' : '',
    p.origin ? 'is-origin' : '',
    p.hovered ? 'is-hovered' : '',
    p.xray ? 'is-xray' : '',
    p.occluding && !p.xray ? 'is-occluding' : '',
    p.danger > 0 ? 'is-danger' : '',
    fx?.dying ? `is-dying is-dying-${fx.dying}` : '',
    fx?.spawning ? 'is-spawning' : '',
    fx?.vanish ? 'is-vanish' : '',
    down ? 'is-down' : '',
    u.moved && u.side === 'party' ? 'is-moved' : '',
    burning ? 'is-burning' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const intent = p.intent
  return (
    <div className={cls} style={wrapStyle} data-uid={p.layer === 'body' ? u.uid : undefined}>
      {p.layer === 'body' && (
        <div className="m2c-u-body" style={{ transform: `scale(${(s * p.scale).toFixed(3)})` }}>
          <div className="m2c-u-shadow" style={{ width: tw * 0.7, height: tw * 0.2, left: -tw * 0.35, top: -tw * 0.1 }} />
          <div className="m2c-u-ring" style={{ width: tw * 0.78, height: tw * 0.36, left: -tw * 0.39, top: -tw * 0.18 }}>
            {u.side === 'enemy' && <i className={`m2c-u-facing to-${u.facing}`} />}
          </div>
          {burning && <div className="m2c-u-burnglow" style={{ width: tw * 0.95, height: tw * 0.4, left: -tw * 0.475, top: -tw * 0.2 }} />}
          <div className="m2c-fig" ref={(el) => p.registerFigure(u.uid, el)} style={{ width: figW, height: figH, left: -figW / 2, top: -figH * box.feet }}>
            {burning && <BurnFlames feet={box.feet} seed={p.bobSeed} tw={tw} w={figW} layer="back" />}
            <div className="m2c-bob" style={{ animationDelay: `${-p.bobSeed * 3}s`, animationDuration: `${2.6 + p.bobSeed}s` }}>
              <img src={sprite(u.sprite, pose)} alt="" draggable={false} className={flip ? 'is-flip' : undefined} />
            </div>
            {burning && <BurnFlames feet={box.feet} seed={p.bobSeed} tw={tw} w={figW} layer="front" />}
          </div>
        </div>
      )}
      {p.layer === 'hud' && (
        <div className="m2c-u-hud" style={{ transform: `scale(${s.toFixed(3)})` }}>
          {intent && u.side === 'enemy' && (
            <div
              className={`m2c-u-intent${intent.windupLeft > 0 ? ' is-wind' : ''}${p.intentDim ? ' is-dim' : ''}`}
              style={{ top: -tw * (1.3 * p.scale + 0.16) }}
            >
              <PatternIcon p={intent.move.pattern} size={13} />
              {intent.damage > 0 && <b>{intent.damage}</b>}
              {intent.windupLeft > 0 && (
                <span className="m2c-u-wind">
                  <Hourglass size={10} strokeWidth={2.6} />
                  {intent.windupLeft + 1}
                </span>
              )}
            </div>
          )}
          <div className="m2c-u-bars" style={{ top: tw * 0.1, width: tw * 0.84, left: -tw * 0.42 }}>
            {statuses.length > 0 && (
              <div className="m2c-u-status">
                {statuses.map((k) => (
                  <span key={k} className={`m2c-st m2c-st--${k}`}>
                    <img src={STATUS_ICON[k]} alt="" />
                    <b>{u.statuses[k]}</b>
                  </span>
                ))}
              </div>
            )}
            <div className="m2c-hp">
              <div className="m2c-hp-fill" style={{ width: `${hpPct * 100}%` }} />
              {pvHp !== null && pvHp < hpPct && <div className="m2c-hp-loss" style={{ left: `${pvHp * 100}%`, width: `${(hpPct - pvHp) * 100}%` }} />}
              {p.danger > 0 && pvHp === null && (
                <div
                  className="m2c-hp-threat"
                  style={{
                    left: `${Math.max(0, hpPct - p.danger / Math.max(1, u.maxHp)) * 100}%`,
                    width: `${Math.min(hpPct, p.danger / Math.max(1, u.maxHp)) * 100}%`,
                  }}
                />
              )}
              <span className="m2c-hp-num">
                {u.hp}
                <small>/{u.maxHp}</small>
              </span>
              {u.block > 0 && (
                <span className="m2c-hp-block">
                  <ShieldGlyph />
                  {u.block}
                </span>
              )}
              {u.armor > 0 && <span className="m2c-hp-armor">{u.armor}</span>}
            </div>
          </div>
          {u.moved && u.side === 'party' && u.hp > 0 && <div className="m2c-u-moved" style={{ top: tw * 0.1, left: tw * 0.47 }} />}
        </div>
      )}
      {p.layer === 'body' && (
        <div
          className="m2c-u-hit"
          style={{
            width: tw * 0.66 * p.scale * s,
            left: -tw * 0.33 * p.scale * s,
            // Tall box = the figure, capped below the centre of the tile two rows back (~1.45 tw up). Short box =
            // own tile + the front lip of the tile behind (that tile's centre, ~0.74 tw up, stays free).
            height: (p.hitShort ? tw * 0.66 : tw * (Math.min(1.2 * p.scale, 1.1) + 0.12)) * s,
            top: (p.hitShort ? -tw * 0.54 : -tw * Math.min(1.2 * p.scale, 1.1)) * s,
          }}
          onMouseEnter={() => p.onEnter(u.pos)}
          onClick={() => p.onClick(u.pos)}
        />
      )}
    </div>
  )
})

/** Small flames licking up around a burning unit (inside the figure box, so they follow every lunge). Most sit
 *  behind the sprite so the unit stays readable for the turns the status lasts; one tiny tongue licks in front. */
function BurnFlames({ feet, seed, tw, w, layer }: { feet: number; seed: number; tw: number; w: number; layer: 'back' | 'front' }) {
  const spots = layer === 'back' ? [-0.22, 0.2, -0.02] : [0.08]
  return (
    <div className={`m2c-u-burn is-${layer}`} style={{ top: `${feet * 100}%` }}>
      {spots.map((dx, i) => {
        const h = tw * (layer === 'back' ? 0.34 : 0.2) * (0.8 + hash(`${seed}:${layer}:${i}`) * 0.4)
        return <i key={i} className="m2c-flame" style={{ left: w / 2 + dx * tw, top: -tw * (layer === 'back' ? 0.06 : 0), width: h * 0.55, height: h, animationDelay: `${-(seed * 3 + i * 0.29)}s` }} />
      })}
      {layer === 'back' &&
        [0, 1].map((i) => <i key={`e${i}`} className="m2c-fire-ember" style={{ left: w / 2 + (i - 0.5) * tw * 0.3, top: -tw * 0.3, animationDelay: `${-(seed * 2 + i * 0.8)}s` }} />)}
    </div>
  )
}

/** Burning ground, animated part (DOM above the floor, below units): a warm glow that spills onto neighbouring
 *  tiles, layered flickering tongues spread over the tile and rising embers. Fewer, lower flames on the last turn. */
const GroundFire = memo(function GroundFire({ g, p, turns }: { g: BoardGeom; p: Pos; turns: number }) {
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

export function ShieldGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
      <path d="M8 1 L14 3.4 V7.6 C14 11.2 11.4 13.8 8 15 C4.6 13.8 2 11.2 2 7.6 V3.4 Z" fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------- board

interface TileMark {
  /** false when only lock-on intents touch the tile (their number sits on the reticle). */
  labelled: boolean
  p: Pos
  dmg: number
  wind: number
  uids: string[]
  push: Dir | null
  /** The unit standing here gets pushed into the void by this intent (enemy-on-enemy kills included). */
  drops: boolean
}

/** Aggregate intent damage per tile (labels) and incoming damage per party unit. */
function aggregateIntents(intents: IntentView[], c: CombatState): { tileDmg: Map<string, TileMark>; danger: Record<string, number> } {
  const units = c.units
  const tileDmg = new Map<string, TileMark>()
  for (const iv of intents) {
    // A charge always shoves what it hits one tile on (engine/intents.ts fireIntent).
    const pushes = iv.info.move.pattern === 'charge' ? ({ kind: 'push', dir: 'away' } as const) : iv.info.move.effects?.find((e) => e.kind === 'push')
    for (const p of iv.info.tiles) {
      if (p.x === iv.unit.pos.x && p.y === iv.unit.pos.y) continue
      const key = posKey(p)
      const cur = tileDmg.get(key) ?? { p, dmg: 0, wind: 0, uids: [], push: null, labelled: false, drops: false }
      if (iv.info.move.pattern !== 'track') cur.labelled = true
      if (iv.info.windupLeft > 0) cur.wind = Math.max(cur.wind, iv.info.windupLeft + 1)
      else cur.dmg += iv.info.damage
      cur.uids.push(iv.uid)
      if (pushes && pushes.kind === 'push') {
        const away =
          iv.info.dir && iv.info.move.pattern !== 'lob' && iv.info.move.pattern !== 'nova' ? iv.info.dir : dirToward(iv.info.target ?? iv.unit.pos, p)
        const d = away && pushes.dir === 'toward' ? ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[away] : away
        cur.push = d ?? null
        // Mirrors engine pushUnit: a grounded enemy shoved onto a void tile falls (allies stop at the rim).
        const victim = units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
        const dest = d ? add(p, d) : null
        if (victim && dest && victim.side === 'enemy' && !victim.flying && c.tiles[dest.y]?.[dest.x]?.kind === 'void' && !units.some((u) => u.hp > 0 && u.pos.x === dest.x && u.pos.y === dest.y))
          cur.drops = true
      }
      tileDmg.set(key, cur)
    }
  }
  const danger: Record<string, number> = {}
  for (const u of units) {
    if (u.side === 'enemy' || u.hp <= 0) continue
    const t = tileDmg.get(posKey(u.pos))
    if (t && t.dmg > 0) danger[u.uid] = t.dmg
  }
  return { tileDmg, danger }
}

export function Board({ registerBoard, ...props }: BoardProps) {
  const { g, vc, C, intents, preview } = props
  // The animator removes the dead after their death beat; never drop a unit just because hp hit 0 mid-hit.
  const units = vc.units
  const { tileDmg, danger } = aggregateIntents(intents, vc)
  const intentByUid: Record<string, IntentInfo> = {}
  for (const iv of intents) intentByUid[iv.uid] = iv.info
  const previewByUid: Record<string, CombatPreview['units'][number]> = {}
  for (const r of preview?.units ?? []) previewByUid[r.uid] = r

  // Ground effects with a countdown: burning ground and temporary (electrified) hazards.
  const ground: { p: Pos; fire: number; ttl: number }[] = []
  vc.tiles.forEach((row, y) =>
    row.forEach((t, x) => {
      const fire = t.fire ?? 0
      const ttl = t.kind === 'hazard' ? (t.ttl ?? 0) : 0
      if (fire > 0 || ttl > 0) ground.push({ p: { x, y }, fire, ttl })
    }),
  )

  const hover = props.hoverPos
  const label = (p: Pos, dx: number, dy: number) => g.project(p.x + dx, p.y + dy)
  const moveSet = new Set(props.moves.map(posKey))
  const targetSet = new Set(props.targets.map(posKey))

  const renderUnits = (layer: 'body' | 'hud') =>
    units.map((u) => {
      // X-ray (fade units in front of the hovered tile) is for inspecting/moving. While aiming a card it would
      // fade the very unit you are aiming at (the hover tile goes stale under the direction arrows), so it is off.
      const xray =
        !props.originUid && !!hover && hover.y < u.pos.y && u.pos.y - hover.y <= 2 && Math.abs(hover.x - u.pos.x) <= 1 && !(hover.x === u.pos.x && hover.y === u.pos.y)
      const reach = unitScale(C, u) > 1.2 ? 1 : 0
      // Fade the upper sprite when it would hide a unit or terrain (cover / hazard / void) right behind it.
      const terrainBehind = (dx: number) => {
        const t = vc.tiles[u.pos.y - 1]?.[u.pos.x + dx]
        return !!t && t.kind !== 'floor'
      }
      // Any unit behind counts, same side included: the party column (default formation) otherwise hides the
      // back-row companion, and a tall executor hides the spider standing behind it.
      // A boss-size sprite is two tiles tall, so it also hides the unit two rows back in its own column.
      // Terrain only fades normal-size units: a boss washed out by a cover block behind it reads as a ghost.
      const occluding =
        units.some(
          (v) =>
            v.uid !== u.uid &&
            v.hp > 0 &&
            ((v.pos.y === u.pos.y - 1 && Math.abs(v.pos.x - u.pos.x) <= reach) ||
              (reach > 0 && v.pos.y === u.pos.y - 2 && v.pos.x === u.pos.x)),
        ) ||
        (reach === 0 && terrainBehind(0))
      const behind = posKey({ x: u.pos.x, y: u.pos.y - 1 })
      const hitShort =
        u.pos.y > 0 &&
        (moveSet.has(behind) || targetSet.has(behind) || units.some((v) => v.uid !== u.uid && v.hp > 0 && v.pos.x === u.pos.x && v.pos.y === u.pos.y - 1))
      return (
        <UnitSprite
          key={u.uid}
          layer={layer}
          u={u}
          fx={props.ufx[u.uid]}
          g={g}
          scale={unitScale(C, u)}
          selected={props.selectedUid === u.uid}
          origin={props.originUid === u.uid}
          hovered={!!hover && hover.x === u.pos.x && hover.y === u.pos.y}
          xray={xray}
          occluding={occluding}
          hitShort={hitShort}
          danger={danger[u.uid] ?? 0}
          preview={previewByUid[u.uid]}
          intent={intentByUid[u.uid] ?? null}
          intentDim={!!props.focusEnemy && props.focusEnemy !== u.uid}
          bobSeed={hash(u.uid)}
          registerFigure={props.registerFigure}
          onEnter={props.onTileEnter}
          onClick={props.onTileClick}
        />
      )
    })

  return (
    <div className="m2c-board" ref={registerBoard} style={{ width: g.width, height: g.height }} onMouseLeave={() => props.onTileEnter(null)}>
      <svg className="m2c-plane" width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`}>
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
        <BoardPlane g={g} tiles={vc.tiles} part="floor" />
        {/* threat heat (T / Alt) */}
        {props.threat &&
          Object.entries(props.threat).map(([k, v]) => {
            const [x, y] = k.split(',').map(Number) as [number, number]
            return (
              <polygon
                key={`th${k}`}
                points={pts(tileQuad(g, { x, y }, 0.04))}
                className="m2c-heat"
                style={{ '--heat': Math.min(1, v / 8) } as CSSProperties}
              />
            )
          })}
        {/* move range */}
        {props.moves.map((p) => (
          <polygon
            key={`mv${posKey(p)}`}
            points={pts(tileQuad(g, p, 0.06))}
            className={props.moveHover && props.moveHover.x === p.x && props.moveHover.y === p.y ? 'm2c-move is-hover' : 'm2c-move'}
          />
        ))}
        {/* intents */}
        <g className={props.dimIntents ? 'm2c-intents is-faded' : 'm2c-intents'}>
          {intents.map((iv) => (
            <IntentShapes
              key={iv.uid}
              g={g}
              iv={iv}
              dim={!!props.focusEnemy && props.focusEnemy !== iv.uid}
              hot={props.firing === iv.uid || props.focusEnemy === iv.uid}
            />
          ))}
        </g>
        {/* reinforcement drop zones */}
        {props.incoming.map((r, i) => (
          <polygon key={`in${i}`} points={pts(tileQuad(g, r.pos, 0.1))} className="m2c-incoming" />
        ))}
        {/* card targets */}
        {props.targets.map((p) => (
          <polygon key={`tg${posKey(p)}`} points={pts(tileQuad(g, p, 0.08))} className="m2c-target" />
        ))}
        {props.active.map((p) => (
          <polygon key={`ac${posKey(p)}`} points={pts(tileQuad(g, p, 0.04))} className={props.activeHostile ? 'm2c-active is-hostile' : 'm2c-active'} />
        ))}
        <BoardPlane g={g} tiles={vc.tiles} part="covers" />
        {hover && <polygon points={pts(tileQuad(g, hover, 0.02))} className={moveSet.has(posKey(hover)) ? 'm2c-hover is-move' : 'm2c-hover'} />}
        {/* hit areas */}
        <g className="m2c-hitgrid">
          {Array.from({ length: GRID_H * GRID_W }, (_, i) => {
            const p = { x: i % GRID_W, y: Math.floor(i / GRID_W) }
            return (
              <polygon
                key={`h${i}`}
                points={pts(tileQuad(g, p))}
                onMouseEnter={() => props.onTileEnter(p)}
                onClick={() => props.onTileClick(p)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  props.onTileContext()
                }}
              />
            )
          })}
        </g>
      </svg>

      {ground.length > 0 && (
        <div className="m2c-ground">
          {ground
            .filter((t) => t.fire > 0)
            .map((t) => (
              <GroundFire key={posKey(t.p)} g={g} p={t.p} turns={t.fire} />
            ))}
        </div>
      )}

      <div className="m2c-units" onContextMenu={(e) => (e.preventDefault(), props.onTileContext())}>
        {renderUnits('body')}
      </div>
      <div className="m2c-huds">{renderUnits('hud')}</div>

      <div className="m2c-labels">
        {/* burning ground / electrified tiles: turns left */}
        {ground.map((t) => {
          const at = label(t.p, 0.86, 0.84)
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
        })}
        {/* intent damage per tile */}
        {[...tileDmg.values()]
          .filter((t) => t.labelled)
          .map((t) => {
            const at = label(t.p, 0.2, 0.26)
            const dim = !!props.focusEnemy && !t.uids.includes(props.focusEnemy)
            return (
              <div
                key={`d${posKey(t.p)}`}
                className={`m2c-tdmg${t.dmg > 0 ? '' : ' is-wind'}${dim || props.dimIntents ? ' is-dim' : ''}`}
                style={{ left: at.x, top: at.y }}
              >
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
        {[...tileDmg.values()]
          .filter((t) => t.push)
          .map((t) => {
            const c = tileCenter(g, t.p)
            const ang = dirAngle(g, t.p, t.push as Dir)
            return (
              <div
                key={`p${posKey(t.p)}`}
                className={`m2c-tpush${props.dimIntents ? ' is-dim' : ''}`}
                style={{ left: c.x, top: c.y, transform: `translate(-50%,-50%) rotate(${ang}deg)` }}
              >
                <ChevronsRight size={18} strokeWidth={3} />
              </div>
            )
          })}
        {[...tileDmg.values()]
          .filter((t) => t.drops && !props.dimIntents)
          .map((t) => {
            const c = tileCenter(g, t.p)
            return (
              <div key={`d${posKey(t.p)}`} className="m2c-tdrop" style={{ left: c.x, top: c.y - g.tw * 0.62 }}>
                <Skull size={15} strokeWidth={2.6} />
              </div>
            )
          })}
        {/* threat numbers */}
        {props.threat &&
          Object.entries(props.threat).map(([k, v]) => {
            const [x, y] = k.split(',').map(Number) as [number, number]
            const c = tileCenter(g, { x, y })
            return (
              <div key={`tn${k}`} className="m2c-heatnum" style={{ left: c.x, top: c.y }}>
                {v}
              </div>
            )
          })}
        {/* incoming reinforcements */}
        {props.incoming.map((r, i) => {
          const c = tileCenter(g, r.pos)
          return (
            <div key={`ir${i}`} className="m2c-inc" style={{ left: c.x, top: c.y }}>
              <CircleDot size={14} strokeWidth={2.6} />
              <span>{props.lang === 'ko' ? '증원' : 'INBOUND'}</span>
            </div>
          )
        })}
        {/* lock-on reticles: follow the locked unit, slide when the lock moves */}
        {intents
          .filter((iv) => iv.info.move.pattern === 'track' && iv.info.targetUid)
          .map((iv, _i, locks) => {
            const stack = locks.filter((o) => o.info.targetUid === iv.info.targetUid)
            const nth = stack.indexOf(iv)
            const tgt = vc.units.find((x) => x.uid === iv.info.targetUid)
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
            const dim = (!!props.focusEnemy && props.focusEnemy !== iv.uid) || props.dimIntents
            const wind = iv.info.windupLeft > 0
            return (
              <div key={`lock${iv.uid}`} className={`m2c-lock${dim ? ' is-dim' : ''}${wind ? ' is-wind' : ''}${props.firing === iv.uid ? ' is-hot' : ''}`}>
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
          })}
        {/* preview chips */}
        {preview?.units.map((r) => {
          const u = vc.units.find((x) => x.uid === r.uid)
          if (!u) return null
          const s = tileScale(g, u.pos)
          const c = tileCenter(g, u.pos)
          const lost = r.hpBefore - r.hpAfter
          const blockGain = r.blockAfter - u.block
          const top = c.y - g.tw * 1.2 * s * unitScale(C, u)
          return (
            <div key={`pv${r.uid}`}>
              <div className={`m2c-pv${r.dies ? ' is-lethal' : ''}${u.side === 'party' ? ' is-friendly' : ''}`} style={{ left: c.x, top }}>
                {r.dies && <Skull size={16} strokeWidth={2.6} />}
                {lost > 0 && <b>-{lost}</b>}
                {lost < 0 && <b className="is-heal">+{-lost}</b>}
                {blockGain > 0 && (
                  <span className="is-block">
                    <ShieldGlyph />+{blockGain}
                  </span>
                )}
              </div>
              {r.to && (
                <>
                  <PushArrow g={g} from={u.pos} to={r.to} />
                  <Ghost g={g} u={u} at={r.to} scale={unitScale(C, u)} />
                </>
              )}
            </div>
          )
        })}
        {/* move destination: ghost + what waits there */}
        {props.moveHover &&
          (() => {
            const mu = vc.units.find((x) => x.uid === props.selectedUid)
            if (!mu) return null
            const at = props.moveHover
            const c = tileCenter(g, at)
            const sc = tileScale(g, at)
            const hit = tileDmg.get(posKey(at))
            const haz = vc.tiles[at.y]?.[at.x]?.kind === 'hazard'
            const locked = intents.filter((iv) => iv.info.move.pattern === 'track' && iv.info.targetUid === mu.uid && iv.info.windupLeft === 0)
            const tileHit =
              (hit?.dmg ?? 0) -
              (hit
                ? intents
                    .filter((iv) => iv.info.move.pattern === 'track' && iv.info.windupLeft === 0 && iv.info.tiles.some((p) => p.x === at.x && p.y === at.y))
                    .reduce((n, iv) => n + iv.info.damage, 0)
                : 0)
            const dmg = Math.max(0, tileHit) + locked.reduce((n, iv) => n + iv.info.damage, 0) + (haz ? 2 : 0)
            // Walking into burning ground sets you on fire.
            const burn = (vc.tiles[at.y]?.[at.x]?.fire ?? 0) > 0 && !mu.flying ? FIRE_BURN : 0
            const ko = props.lang === 'ko'
            const parts = [dmg > 0 ? (ko ? `위험 -${dmg}` : `DANGER -${dmg}`) : '', burn > 0 ? (ko ? `화상 +${burn}` : `BURN +${burn}`) : ''].filter(Boolean)
            return (
              <>
                <Ghost g={g} u={mu} at={at} scale={1} move />
                <div className={parts.length ? 'm2c-movechip is-bad' : 'm2c-movechip'} style={{ left: c.x, top: c.y - g.tw * 1.25 * sc }}>
                  {parts.length ? parts.join(' · ') : ko ? '안전' : 'SAFE'}
                </div>
              </>
            )
          })()}
        {/* direction picker */}
        {props.dirArrows.map((a) => {
          const c = tileCenter(g, a.at)
          const ang = dirAngle(g, a.at, a.dir)
          return (
            <button
              key={`da${a.dir}`}
              type="button"
              className={a.active ? 'm2c-dir is-active' : 'm2c-dir'}
              style={{ left: c.x, top: c.y }}
              onMouseEnter={() => props.onDirEnter(a.dir)}
              onMouseLeave={() => props.onDirEnter(null)}
              onClick={() => props.onDirClick(a.dir)}
            >
              <span style={{ transform: `rotate(${ang}deg)` }}>
                <ChevronsRight size={20} strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </div>

      <BoardFx g={g} fx={props.fx} />
    </div>
  )
}

function PushArrow({ g, from, to }: { g: BoardGeom; from: Pos; to: Pos }) {
  const a = tileCenter(g, from)
  const b = tileCenter(g, to)
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return (
    <div className="m2c-pusharrow" style={{ left: a.x, top: a.y, width: len, transform: `rotate(${ang}deg)` }}>
      <i />
    </div>
  )
}

function Ghost({ g, u, at, scale, move }: { g: BoardGeom; u: UnitState; at: Pos; scale: number; move?: boolean }) {
  const c = tileCenter(g, at)
  const s = tileScale(g, at) * scale
  const box = spriteBox(u.sprite, g.tw)
  const w = box.w
  const h = box.h
  const nativeRight = u.side !== 'enemy'
  const faceLeft = move ? at.x < u.pos.x : u.facing === 'left'
  const flip = nativeRight ? faceLeft : u.facing === 'right'
  return (
    <div className={move ? 'm2c-ghost is-move' : 'm2c-ghost'} style={{ left: c.x, top: c.y, transform: `scale(${s})` }}>
      <img
        src={sprite(u.sprite, move ? 'idle' : 'hit')}
        alt=""
        style={{ width: w, height: h, left: -w / 2, top: -h * box.feet }}
        className={flip ? 'is-flip' : undefined}
      />
    </div>
  )
}
