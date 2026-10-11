// Timeline builders for the flow of a fight: turn banners, boss phase shifts, implant triggers and
// companion passives.

import { tr } from '../../common/lang.ts'
import { setMusicDuck, sfx } from '../../common/sfx.ts'
import { panOf } from './helpers.ts'
import type { Ev, Kit, Plan } from './types.ts'

export function turnSteps(kit: Kit, plan: Plan, ev: Ev<'turn'>): void {
  const { patch, showBanner, S } = kit
  const k = plan.k
  if (ev.side === 'enemy') {
    plan.steps.push({
      dur: 720,
      run: () => {
        patch({ enemyPhase: true, handHidden: true })
        showBanner({ kind: 'enemy', title: k ? '적 페이즈' : 'ENEMY PHASE', sub: k ? '예고된 공격이 실행된다' : 'Telegraphed attacks resolve' }, S(1000))
        setMusicDuck(true)
        sfx('enemy_turn')
      },
    })
  } else {
    plan.steps.push({
      dur: 380,
      run: () => {
        patch({ enemyPhase: false, pendingIntents: [], firing: null })
        showBanner({ kind: 'player', title: k ? '당신의 턴' : 'YOUR TURN', sub: k ? `${ev.turn}턴` : `Turn ${ev.turn}` }, S(950))
        setMusicDuck(false)
        sfx('player_turn')
      },
    })
  }
}

export function phaseSteps(kit: Kit, plan: Plan, ev: Ev<'phase'>): void {
  const { unitOf, showBanner, addFx, pose, squash, trauma, S } = kit
  const { k, lang } = plan
  plan.steps.push({
    dur: 1600,
    run: () => {
      const u = unitOf(ev.uid)
      showBanner({ kind: 'phase', title: u ? tr(u.name, lang) : k ? '페이즈 전환' : 'PHASE SHIFT', sub: tr(ev.text, lang) }, S(1750))
      if (u) {
        addFx({ kind: 'nova', at: u.pos, tone: 'enemy', ms: S(760) })
        pose(ev.uid, 'skill', S(1000))
        squash(ev.uid)
      }
      trauma(0.8)
      sfx('phase')
    },
  })
}

export function triggerSteps(kit: Kit, plan: Plan, ev: Ev<'trigger'>): void {
  const { patch, later, shadow, S } = kit
  plan.steps.push({
    dur: 240,
    run: () => {
      patch({ flashImplant: ev.implantId })
      later(() => {
        if (shadow.current.flashImplant === ev.implantId) patch({ flashImplant: null })
      }, S(1000))
      sfx('energy', { volume: 0.6 })
    },
  })
}

export function passiveSteps(kit: Kit, plan: Plan, ev: Ev<'passive'>): void {
  const { unitOf, addFx, S } = kit
  plan.steps.push({
    dur: 420,
    run: () => {
      const u = unitOf(ev.uid)
      if (!u) return
      const name = plan.C.companions[ev.companionId]?.combatPassive?.name
      if (name) addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.55 }, text: tr(name, plan.lang), tone: 'passive', ms: S(1450) })
      addFx({ kind: 'ring', at: u.pos, tone: 'gold', ms: S(640) })
      addFx({ kind: 'burst', at: u.pos, tone: 'gold', ms: S(560) })
      sfx('passive', { pan: panOf(u.pos.x) })
    },
  })
}
