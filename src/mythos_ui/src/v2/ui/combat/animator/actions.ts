// Timeline builders for actions: a played card / consumable (turn to face, then the projectile or swing)
// and an enemy attack (wind-up on the doomed tiles, then the hit).

import { cardFace } from '../../../engine/combat.ts'
import { DIR_VEC, dirToward } from '../../../engine/grid.ts'
import { GRID_H, GRID_W } from '../../../engine/types.ts'
import { sfx } from '../../common/sfx.ts'
import { DIR_PCT, TURN_MS, cardSignature, needsTurn, nextOfKind, panOf, sideOf, travel } from './helpers.ts'
import type { Ev, Kit, Plan } from './types.ts'

export function cardSteps(kit: Kit, plan: Plan, ev: Ev<'card'>, evIdx: number): void {
  const { unitOf, addFx, pose, lunge, squash, turnTo, trauma, later, S } = kit
  const { prev, events, C } = plan
  const cardDef = C.cards[ev.cardId]
  const item = cardDef ? undefined : C.consumables[ev.cardId]
  const info = plan.cardInfo
  plan.cardInfo = undefined
  const face = cardDef ? cardFace(cardDef, info?.upgraded ?? false) : item ? { target: item.target, effects: item.effects } : null
  const def = cardDef ?? (item ? { id: item.id, type: item.effects.some((e) => e.kind === 'damage') ? 'attack' : 'skill', icon: item.icon } : undefined)
  const mode = face?.target.mode ?? 'none'
  const kind = mode === 'line' ? 'bolt' : mode === 'beam' ? 'beam' : mode === 'lob' ? 'arc' : mode === 'melee' ? 'slash' : 'burst'
  // The caster turns toward its target first (a short pivot beat), then acts.
  const owner0 = prev.units.find((u) => u.uid === ev.owner)
  const want = owner0 ? (ev.dir ?? (ev.target ? dirToward(owner0.pos, ev.target) : undefined)) : undefined
  const turning = !!owner0 && !!want && needsTurn(owner0.facing, want, sideOf(owner0.pos, want, ev.target))
  // A lob that sets off no area (single tile) still lands with a small blast.
  const landsAlone = kind === 'arc' && nextOfKind(events, evIdx, 'area', ['card', 'attack', 'turn']) === undefined
  plan.steps.push({
    dur: 170 + travel(kind) + (turning ? TURN_MS : 0),
    run: () => {
      const u = unitOf(ev.owner)
      const tgt = ev.target ?? u?.pos
      if (cardDef && info && tgt) addFx({ kind: 'card', cardId: cardDef.id, upgraded: info.upgraded, rect: info.rect, to: tgt, ms: S(620) })
      sfx('card_play', { pan: u ? panOf(u.pos.x) : 0 })
      if (!def || !u || !face) return
      const sig = cardSignature(face.effects, 'tags' in def ? def.tags : undefined)
      if (sig) later(() => sfx(sig, { pan: panOf(u.pos.x), volume: 0.8 }), S(90))
      const hasBlock = face.effects.some((e) => e.kind === 'block')
      const isAttack = def.type === 'attack'
      const d = ev.dir ?? (ev.target ? dirToward(u.pos, ev.target) : undefined)
      plan.ctxDir = d
      plan.ctxFrom = u.pos
      if (turning && d) turnTo(ev.owner, d, sideOf(u.pos, d, ev.target))
      later(
        () => {
          pose(ev.owner, isAttack ? 'attack' : hasBlock ? 'guard' : 'skill', S(560))
          if (isAttack && d) lunge(ev.owner, d)
          else squash(ev.owner)
          const from = { x: u.pos.x, y: u.pos.y }
          const pan = panOf(u.pos.x)
          if (kind === 'bolt' && ev.target) {
            addFx({ kind: 'bolt', from, to: ev.target, tone: 'party', ms: S(240) })
            sfx('shoot', { pan })
          } else if (kind === 'beam' && d) {
            const r = face.target.mode === 'beam' ? face.target.range : 3
            const v = DIR_VEC[d]
            const ex = Math.max(-0.4, Math.min(GRID_W - 0.6, u.pos.x + v.x * r))
            const ey = Math.max(-0.4, Math.min(GRID_H - 0.6, u.pos.y + v.y * r))
            addFx({ kind: 'beam', from, to: { x: ex, y: ey }, tone: 'party', ms: S(460) })
            sfx('beam', { pan })
          } else if (kind === 'arc' && ev.target) {
            const at = ev.target
            addFx({ kind: 'arc', from, to: at, tone: 'party', ms: S(380) })
            sfx('lob', { pan })
            if (landsAlone)
              later(() => {
                addFx({ kind: 'flare', at, tone: 'party', ms: S(520) })
                addFx({ kind: 'wave', at, radius: 0.7, tone: 'party', ms: S(480) })
                trauma(0.22)
                sfx('explosion', { pan: panOf(at.x), intensity: 0.5, volume: 0.6 })
              }, S(370))
          } else if (kind === 'slash' && ev.target) {
            addFx({ kind: 'slash', at: ev.target, tone: 'party', ms: S(360), dir: d })
            sfx('swing', { pan })
          } else {
            addFx({ kind: 'burst', at: ev.target ?? u.pos, tone: hasBlock ? 'block' : 'party', ms: S(480) })
            if (!hasBlock) sfx('energy', { pan, volume: 0.6 })
          }
        },
        S(150 + (turning ? TURN_MS : 0)),
      )
    },
  })
}

export function attackSteps(kit: Kit, plan: Plan, ev: Ev<'attack'>, evIdx: number): void {
  const { unitOf, patch, shadow, addFx, pose, lunge, squash, turnTo, animFig, later, S } = kit
  const { prev, next, events, C } = plan
  const uid = ev.uid
  const u0 = prev.units.find((u) => u.uid === uid) ?? next.units.find((u) => u.uid === uid)
  const mv = u0 ? C.enemies[u0.defId]?.moves.find((m) => m.id === ev.moveId) : undefined
  const pattern = mv?.pattern ?? 'melee'
  const support = pattern === 'buff' || pattern === 'summon'
  const kind =
    pattern === 'line' || pattern === 'track' ? 'bolt' : pattern === 'beam' ? 'beam' : pattern === 'lob' ? 'arc' : pattern === 'nova' ? 'nova' : support ? 'burst' : 'slash'
  if (u0?.side !== 'enemy') return
  // Face the attack first: the intent's direction, or toward the struck area (lobs).
  const aim = ev.tiles[Math.floor(ev.tiles.length / 2)]
  const wantDir = support || pattern === 'nova' ? undefined : (u0.intent?.dir ?? (pattern === 'lob' && aim ? dirToward(u0.pos, aim) : u0.facing))
  const wantSide = wantDir ? sideOf(u0.pos, wantDir, pattern === 'lob' ? aim : undefined) : undefined
  const turnBeat = !!wantDir && needsTurn(u0.facing, wantDir, wantSide)
  // An area attack erupts on the board itself ('area' event) — no separate landing ring.
  const erupts = nextOfKind(events, evIdx, 'area', ['attack', 'turn', 'card']) !== undefined
  // Wind-up: the doomed tiles flash hot, the enemy leans back.
  plan.steps.push({
    dur: 240 + (turnBeat ? TURN_MS : 0),
    run: () => {
      const u = unitOf(uid)
      patch({ firing: uid })
      if (!u) return
      if (ev.tiles.length) addFx({ kind: 'tiles', tiles: ev.tiles, tone: 'pre', ms: S(560) })
      if (turnBeat && wantDir) turnTo(uid, wantDir, wantSide)
      const face = wantDir ?? u.facing
      later(
        () => {
          const [vx] = DIR_PCT[face]
          animFig(uid, [{ transform: 'translate(0,0)' }, { transform: `translate(${-vx * 8}%, 0) scale(1.03, 0.96)` }], S(280), 'ease-out')
        },
        turnBeat ? S(TURN_MS) : 0,
      )
      sfx('telegraph', { pan: panOf(u.pos.x), volume: 0.7 })
    },
  })
  plan.steps.push({
    dur: travel(kind) + 40,
    run: () => {
      const u = unitOf(uid)
      const v = shadow.current
      patch({ firing: null, pendingIntents: v.pendingIntents ? v.pendingIntents.filter((x) => x !== uid) : v.pendingIntents })
      if (!u) return
      pose(uid, support ? 'skill' : 'attack', S(600))
      const from = { x: u.pos.x, y: u.pos.y }
      plan.ctxFrom = u.pos
      plan.ctxDir = u.facing
      const last = ev.tiles[ev.tiles.length - 1]
      const pan = panOf(u.pos.x)
      if (ev.tiles.length) addFx({ kind: 'tiles', tiles: ev.tiles, tone: 'enemy', ms: S(520) })
      if (kind === 'bolt' && last) {
        addFx({ kind: 'bolt', from, to: last, tone: 'enemy', ms: S(240) })
        sfx('shoot', { pan })
      } else if (kind === 'beam' && last) {
        addFx({ kind: 'beam', from, to: last, tone: 'enemy', ms: S(480) })
        sfx('beam', { pan })
      } else if (kind === 'arc' && last) {
        const mid = ev.tiles[Math.floor(ev.tiles.length / 2)] ?? last
        addFx({ kind: 'arc', from, to: mid, tone: 'enemy', ms: S(400) })
        if (!erupts) later(() => addFx({ kind: 'ring', at: mid, tone: 'enemy', ms: S(520) }), S(360))
        sfx('lob', { pan })
      } else if (kind === 'nova') {
        addFx({ kind: 'nova', at: from, tone: 'enemy', ms: S(520) })
        sfx('swing', { pan, intensity: 1.4 })
      } else if (support) {
        addFx({ kind: 'burst', at: from, tone: 'warn', ms: S(560) })
        sfx('telegraph', { pan })
      } else if (last) {
        addFx({ kind: 'slash', at: last, tone: 'enemy', ms: S(360), dir: u.facing })
        sfx('swing', { pan })
      }
      if (!support) lunge(uid, u.facing, pattern === 'melee' || pattern === 'charge' ? 1 : 0.45)
      else squash(uid)
    },
  })
}
