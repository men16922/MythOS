// Board units: the y-sorted sprite (body layer) and its bars / intent badge (hud layer), the flames on a
// burning unit, and the translucent ghosts / push arrows a preview draws.

import { memo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Hourglass } from 'lucide-react'
import type { CombatPreview, IntentInfo } from '../../../engine/combat.ts'
import type { Pos, StatusKind, UnitState } from '../../../engine/types.ts'
import { STATUS_ICON, sprite } from '../../common/assets.ts'
import { V2_SPRITES } from '../../common/spriteManifest.ts'
import type { UnitFx } from '../animator.ts'
import type { BoardGeom } from '../geometry.ts'
import { hash, tileCenter, tileScale } from '../geometry.ts'
import { PatternIcon, ShieldGlyph } from './glyphs.tsx'
import { FlameTongueSvg } from './tiles.tsx'
import './units.css'

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
  /** Unit is standing on a burning ground tile (and not flying). */
  inFire?: boolean
  registerFigure: (uid: string, el: HTMLElement | null) => void
  onEnter: (p: Pos) => void
  onClick: (p: Pos) => void
}

const STATUS_ORDER: StatusKind[] = ['burn', 'bleed', 'corrode', 'shock', 'mark', 'weak', 'guard', 'thorns', 'evade', 'focus', 'rage', 'redact']
/** Sprite box in tile widths. 1.x art is 512×768 with feet at ~93 %; 2.0 art keeps feet 18 px above the
 *  bottom edge (97.7 %) and bosses use square 768×768 canvases. */
const FIG_W = 1.12
const FIG_H = 1.68
const SQUARE_SPRITES = new Set(['haetae', 'echo_eater', 'ix_avatar', 'baekho', 'hyeonmu', 'architect-omega', 'jujak', 'arachne', 'io', 'blank', 'first-reader'])
function spriteBox(key: string, tw: number): { w: number; h: number; feet: number } {
  const v2 = !!V2_SPRITES[key]
  const h = tw * FIG_H
  return { w: SQUARE_SPRITES.has(key) ? h : tw * FIG_W, h, feet: v2 ? 0.977 : 0.93 }
}

export const UnitSprite = memo(function UnitSprite(p: UnitProps) {
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
    // V5: Rage aura strength (0..1) — the CSS pulse reads it.
    ['--rage' as string]: Math.min(1, (u.statuses.rage ?? 0) / 9).toFixed(2),
  }
  const alive = u.hp > 0 && !fx?.dying
  const burnStacks = alive ? (u.statuses.burn ?? 0) : 0
  const burning = burnStacks > 0 || (!!p.inFire && alive)
  const shocked = alive && (u.statuses.shock ?? 0) > 0
  const marked = alive && (u.statuses.mark ?? 0) > 0
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
    p.inFire && alive ? 'is-in-fire' : '',
    shocked ? 'is-shocked' : '',
    marked ? 'is-marked' : '',
    (u.statuses.rage ?? 0) > 0 && alive ? 'is-raging' : '',
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
            {marked && <i className="m2c-u-mark-reticle" />}
          </div>
          {burning && <div className="m2c-u-burnglow" style={{ width: tw * 0.98, height: tw * 0.42, left: -tw * 0.49, top: -tw * 0.21 }} />}
          <div className="m2c-fig" ref={(el) => p.registerFigure(u.uid, el)} style={{ width: figW, height: figH, left: -figW / 2, top: -figH * box.feet }}>
            {burning && <BurnFlames feet={box.feet} seed={p.bobSeed} tw={tw} w={figW} stacks={Math.max(1, burnStacks)} layer="back" />}
            <div className="m2c-bob" style={{ animationDelay: `${-p.bobSeed * 3}s`, animationDuration: `${2.6 + p.bobSeed}s` }}>
              <img src={sprite(u.sprite, pose)} alt="" draggable={false} className={flip ? 'is-flip' : undefined} />
            </div>
            {burning && <BurnFlames feet={box.feet} seed={p.bobSeed} tw={tw} w={figW} stacks={Math.max(1, burnStacks)} layer="front" />}
            {shocked && <ShockSparks feet={box.feet} seed={p.bobSeed} tw={tw} w={figW} />}
          </div>
        </div>
      )}
      {p.layer === 'hud' && (
        <div className="m2c-u-hud" style={{ transform: `scale(${s.toFixed(3)})` }}>
          {intent && u.side === 'enemy' && (
            <div className={`m2c-u-intent${intent.windupLeft > 0 ? ' is-wind' : ''}${p.intentDim ? ' is-dim' : ''}`} style={{ top: -tw * (1.3 * p.scale + 0.16) }}>
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

/** Sleek orbiting flame wisps rising at staggered heights around a burning unit (never a flat foot comb). */
function BurnFlames({
  feet,
  seed,
  tw,
  w,
  stacks,
  layer,
}: {
  feet: number
  seed: number
  tw: number
  w: number
  stacks: number
  layer: 'back' | 'front'
}) {
  const intense = stacks >= 2
  const scale = 1 + Math.min(2, stacks - 1) * 0.1
  const spots: [number, number][] =
    layer === 'back'
      ? intense
        ? [
            [-0.25, 0.16],
            [0.25, 0.34],
          ]
        : [[-0.22, 0.18]]
      : intense
        ? [
            [0.16, 0.06],
            [-0.18, 0.42],
          ]
        : [[0.14, 0.08]]
  return (
    <div className={`m2c-u-burn is-${layer}`} style={{ top: `${feet * 100}%` }}>
      {spots.map(([dx, dy], i) => {
        const k = hash(`${seed}:${layer}:${i}`)
        const h = tw * (layer === 'back' ? 0.28 : 0.22) * scale * (0.88 + k * 0.24)
        const isCore = intense && layer === 'front' && i === 0
        return (
          <FlameTongueSvg
            key={i}
            variant={Math.floor(k * 9) + i}
            kind={isCore ? 'core' : layer === 'back' ? 'back' : 'front'}
            flip={dx < 0}
            style={{
              left: w / 2 + dx * tw,
              top: -tw * dy,
              width: h * 0.72,
              height: h,
              animationDelay: `${-(seed * 3 + i * 0.31)}s`,
            }}
          />
        )
      })}
      {layer === 'back' &&
        Array.from({ length: intense ? 4 : 2 }, (_, i) => (
          <i key={`e${i}`} className="m2c-fire-ember" style={{ left: w / 2 + (i - 1.1) * tw * 0.24, top: -tw * 0.34, animationDelay: `${-(seed * 2 + i * 0.55)}s` }} />
        ))}
    </div>
  )
}

/** Crackling SVG electric lightning arcs jumping around a shocked unit. */
function ShockSparks({ feet, seed, tw, w }: { feet: number; seed: number; tw: number; w: number }) {
  return (
    <div className="m2c-u-shock" style={{ top: `${feet * 100}%` }}>
      {[0, 1, 2].map((i) => {
        const dx = (i - 1) * 0.22
        const dy = 0.2 + i * 0.22
        return (
          <svg
            key={i}
            className="m2c-u-spark"
            viewBox="0 0 36 18"
            style={{
              left: w / 2 + dx * tw,
              top: -tw * dy,
              width: tw * 0.32,
              height: tw * 0.16,
              transform: `translate(-50%, -50%) rotate(${-28 + i * 44}deg)`,
              animationDelay: `${-(seed * 2 + i * 0.37)}s`,
            }}
          >
            <polyline points="2,12 11,4 18,13 26,3 34,10" fill="none" stroke="#effdff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      })}
    </div>
  )
}

/** Preview: an arrow from where a unit stands to where the card will push it. */
export function PushArrow({ g, from, to }: { g: BoardGeom; from: Pos; to: Pos }) {
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

/** Preview: a translucent copy of the unit where it will end up (pushed, or the selected unit's move). */
export function Ghost({ g, u, at, scale, move }: { g: BoardGeom; u: UnitState; at: Pos; scale: number; move?: boolean }) {
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
      <img src={sprite(u.sprite, move ? 'idle' : 'hit')} alt="" style={{ width: w, height: h, left: -w / 2, top: -h * box.feet }} className={flip ? 'is-flip' : undefined} />
    </div>
  )
}
