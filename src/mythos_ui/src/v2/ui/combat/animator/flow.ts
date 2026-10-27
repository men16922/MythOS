// Timeline builders for the flow of a fight: turn banners, boss phase shifts, implant triggers and
// companion passives.

import { portrait } from '../../common/assets.ts'
import { tr } from '../../common/lang.ts'
import { setMusicDuck, sfx, type SfxName } from '../../common/sfx.ts'
import { panOf } from './helpers.ts'
import type { Ev, Kit, Plan } from './types.ts'

/** Each archetype's Signal Burst signature cue. */
const BURST_SFX: Record<string, SfxName> = {
  ghost: 'burst_ghost',
  smuggler: 'burst_smuggler',
  echo_collector: 'burst_echo',
  archivist: 'burst_archivist',
  scrapborn: 'burst_scrapborn',
}

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

/** X1 chain: 2+ kills in one player turn — a rising count over the board (reward is in the engine). */
export function chainSteps(kit: Kit, plan: Plan, ev: Ev<'chain'>): void {
  const { addFx, trauma, S } = kit
  const k = plan.k
  const reward = ev.n === 2 ? (k ? '카드 +1' : 'Draw 1') : ev.n === 3 ? (k ? '에너지 +1' : 'Energy +1') : k ? '기세 +25' : 'Momentum +25'
  plan.steps.push({
    dur: 260,
    run: () => {
      addFx({ kind: 'text', at: { x: 3, y: -0.35 }, text: `${ev.n} ${k ? '연쇄!' : 'CHAIN!'} · ${reward}`, tone: 'crit', ms: S(1300) })
      trauma(0.18 + 0.08 * Math.min(4, ev.n))
      sfx('chain', { intensity: 0.9 + 0.15 * Math.min(5, ev.n) })
    },
  })
}

/** X2 Signal Burst: portrait cut-in banner, gold nova on the connector, a heavy shake. */
export function burstSteps(kit: Kit, plan: Plan, ev: Ev<'burst'>): void {
  const { showBanner, addFx, unitOf, pose, trauma, hitStop, S } = kit
  const arch = plan.C.archetypes[ev.archetype]
  const comp = ev.companion ? plan.C.companions[ev.companion] : undefined
  const def = comp ? comp.ultimate : arch?.burst
  const name = def ? tr(def.name, plan.lang) : plan.k ? '시그널 버스트' : 'SIGNAL BURST'
  const who = comp ? tr(comp.name, plan.lang) : arch ? tr(arch.name, plan.lang) : ''
  const art = portrait(comp ? comp.sprite : (arch?.sprite ?? 'player-noise'))
  const uid = ev.companion ?? 'connector'
  plan.steps.push({
    dur: 1250,
    run: () => {
      showBanner({ kind: 'burst', title: name, sub: who, art, tone: comp ? 'ult' : 'burst' }, S(1400))
      const u = unitOf(uid)
      if (u) {
        addFx({ kind: 'nova', at: u.pos, tone: comp ? 'shock' : 'gold', ms: S(900) })
        addFx({ kind: 'ring', at: u.pos, tone: comp ? 'shock' : 'gold', ms: S(800) })
        pose(uid, 'skill', S(900))
      }
      hitStop(S(120))
      trauma(0.75)
      const sig = comp ? 'shockwave' : (BURST_SFX[ev.archetype] ?? 'shockwave')
      sfx('unlock')
      sfx(sig, { intensity: 1.4 })
    },
  })
}

/** X2: the gauge just filled — a charged chime and a small call-out over the connector. */
export function momentumSteps(kit: Kit, plan: Plan, ev: Ev<'momentum'>): void {
  if (ev.total < 100 || ev.total - ev.amount >= 100) return
  const { addFx, unitOf, S } = kit
  plan.steps.push({
    dur: 120,
    run: () => {
      const u = unitOf('connector')
      if (u) {
        addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.6 }, text: plan.k ? '필살기 준비!' : 'BURST READY!', tone: 'passive', ms: S(1400) })
        addFx({ kind: 'ring', at: u.pos, tone: 'gold', ms: S(700) })
      }
      sfx('momentum_full')
    },
  })
}
