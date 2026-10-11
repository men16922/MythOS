// Timeline builders for what happens to a unit: damage (hit-stop, flash, numbers, shake), heals, block,
// statuses, deaths (kill words, the final-kill zoom punch), spawns and fizzled intents.

import { dirToward } from '../../../engine/grid.ts'
import { sfx } from '../../common/sfx.ts'
import { STATUS_SFX, panOf } from './helpers.ts'
import type { Ev, FxTone, Kit, Plan, TextTone } from './types.ts'

export function damageSteps(kit: Kit, plan: Plan, ev: Ev<'damage'>, evIdx: number): void {
  const { unitOf, updUnit, addFx, pose, figImg, hitStop, whiteFlash, squash, recoil, trauma, hurtFlash, later, S } = kit
  const { prev, events } = plan
  const uid = ev.uid
  plan.lastSource.set(uid, ev.source)
  const amt = ev.amount
  const cause = ev.cause
  const big = amt >= 6
  const pre = unitOf(uid) ?? prev.units.find((u) => u.uid === uid)
  const lethal = !!pre && amt > 0 && pre.hp - amt <= 0
  // Hits inside an area resolution land as a quick ripple; bump hits ride on the slam's own hit-stop
  // (both bodies' numbers pop together).
  const compact = plan.inArea || cause === 'bump'
  const stop = amt <= 0 || cause === 'bump' ? 0 : lethal ? 110 : compact ? 45 : Math.min(90, 50 + amt * 7)
  const nextEv = events[evIdx + 1]
  const tail = cause === 'bump' ? (nextEv?.t === 'damage' && nextEv.cause === 'bump' ? 40 : 160) : compact ? 110 : big || lethal ? 250 : 170
  plan.steps.push({
    dur: stop + tail,
    run: () => {
      const u = unitOf(uid)
      if (!u) return
      const at = { x: u.pos.x, y: u.pos.y }
      const pan = panOf(u.pos.x)
      if (amt > 0) {
        const img = figImg(uid)
        if (img) img.style.filter = 'brightness(5) saturate(0)'
        hitStop(S(stop))
        later(() => {
          if (img) img.style.filter = ''
          updUnit(uid, (x) => ({ ...x, hp: Math.max(0, x.hp - amt), block: Math.max(0, x.block - ev.blocked) }))
          const isConnector = u.uid === 'connector'
          whiteFlash(uid, isConnector || u.side === 'party')
          pose(uid, 'hit', S(420))
          const numTone: TextTone = cause === 'burn' ? 'burn' : cause === 'hazard' ? 'zap' : big ? 'crit' : 'dmg'
          addFx({ kind: 'text', at, text: `${amt}`, tone: numTone, ms: S(big ? 1250 : 1000) })
          if (cause === 'burn') {
            // Burn tick: the flames on the body flare up.
            squash(uid)
            addFx({ kind: 'flame', at, tone: 'fire', ms: S(720) })
            trauma(Math.min(0.4, 0.12 + amt * 0.03))
            sfx('fire_tick', { pan, intensity: Math.min(2, 0.7 + amt / 5) })
          } else if (cause === 'hazard') {
            squash(uid)
            addFx({ kind: 'zap', at, tone: 'shock', ms: S(560) })
            trauma(0.2)
            sfx('zap', { pan })
          } else if (cause === 'bump') {
            addFx({ kind: 'spark', at, tone: 'warn', ms: S(380) })
            sfx('hit_light', { pan, volume: 0.55 })
          } else {
            const d = plan.ctxFrom ? dirToward(plan.ctxFrom, u.pos) : plan.ctxDir
            recoil(uid, d, big || lethal)
            const tone: FxTone = ev.source === 'environment' ? 'env' : ev.source === 'party' ? 'party' : 'enemy'
            addFx({ kind: 'spark', at, tone, ms: S(big ? 560 : 440) })
            trauma(Math.min(0.75, (big ? 0.38 : 0.18) + amt * 0.025 + (lethal ? 0.15 : 0)))
            sfx(big || lethal ? 'hit_heavy' : 'hit_light', { pan, intensity: Math.min(2, 0.5 + amt / 6) })
          }
          if (u.side === 'party') hurtFlash()
          if (ev.blocked > 0) addFx({ kind: 'text', at: { x: at.x + 0.3, y: at.y - 0.15 }, text: `⛨${ev.blocked}`, tone: 'block', ms: S(900) })
        }, S(stop))
      } else if (ev.blocked > 0) {
        updUnit(uid, (x) => ({ ...x, block: Math.max(0, x.block - ev.blocked) }))
        addFx({ kind: 'text', at, text: `⛨${ev.blocked}`, tone: 'block', ms: S(950) })
        addFx({ kind: 'shield', at, tone: 'block', ms: S(480) })
        recoil(uid, plan.ctxFrom ? dirToward(plan.ctxFrom, u.pos) : plan.ctxDir, false)
        trauma(0.12)
        sfx('block', { pan })
      }
    },
  })
}

export function healSteps(kit: Kit, plan: Plan, ev: Ev<'heal'>): void {
  const { unitOf, updUnit, addFx, S } = kit
  plan.steps.push({
    dur: 220,
    run: () => {
      const u = unitOf(ev.uid)
      if (!u) return
      updUnit(ev.uid, (x) => ({ ...x, hp: Math.min(x.maxHp, x.hp + ev.amount) }))
      addFx({ kind: 'text', at: u.pos, text: `+${ev.amount}`, tone: 'heal', ms: S(1000) })
      addFx({ kind: 'burst', at: u.pos, tone: 'heal', ms: S(520) })
      sfx('heal', { pan: panOf(u.pos.x) })
    },
  })
}

export function blockSteps(kit: Kit, plan: Plan, ev: Ev<'block'>): void {
  const { unitOf, updUnit, addFx, pose, shadow, S } = kit
  plan.steps.push({
    dur: 220,
    run: () => {
      const u = unitOf(ev.uid)
      if (!u) return
      updUnit(ev.uid, (x) => ({ ...x, block: x.block + ev.amount }))
      addFx({ kind: 'text', at: u.pos, text: `⛨+${ev.amount}`, tone: 'block', ms: S(950) })
      addFx({ kind: 'shield', at: u.pos, tone: 'block', ms: S(520) })
      if (!shadow.current.enemyPhase) pose(ev.uid, 'guard', S(560))
      sfx('block', { pan: panOf(u.pos.x) })
    },
  })
}

export function statusSteps(kit: Kit, plan: Plan, ev: Ev<'status'>): void {
  const { unitOf, updUnit, addFx, S } = kit
  if (ev.amount <= 0) return
  plan.steps.push({
    dur: plan.inArea ? 70 : 170,
    run: () => {
      const u = unitOf(ev.uid)
      if (!u) return
      updUnit(ev.uid, (x) => ({ ...x, statuses: { ...x.statuses, [ev.status]: (x.statuses[ev.status] ?? 0) + ev.amount } }))
      addFx({ kind: 'text', at: { x: u.pos.x - 0.2, y: u.pos.y - 0.25 }, text: `+${ev.amount}`, tone: 'status', icon: ev.status, ms: S(1050) })
      const s = STATUS_SFX[ev.status]
      if (s) sfx(s, { pan: panOf(u.pos.x) })
    },
  })
}

export function deathSteps(kit: Kit, plan: Plan, ev: Ev<'death'>, evIdx: number): void {
  const { unitOf, updFx, updUnit, shadow, commit, addFx, trauma, zoomPunch, S } = kit
  const k = plan.k
  const uid = ev.uid
  const isFinal = plan.finalKill && evIdx === plan.lastDeathIdx
  const isVoid = ev.cause === 'void'
  if (ev.cause === 'collapse') {
    // The boss fell: its summons power down one after another (no kill text, no shake).
    plan.steps.push({
      dur: 260,
      run: () => {
        const u = unitOf(uid)
        if (!u) return
        updFx(uid, { dying: 'damage', pose: 'hit', moveMs: 0 })
        addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.45 }, text: k ? '정지' : 'SHUTDOWN', tone: 'fizzle', ms: S(1100) })
        addFx({ kind: 'pixels', at: u.pos, tone: 'enemy', ms: S(600) })
        sfx('status_shock', { pan: panOf(u.pos.x), volume: 0.5 })
      },
    })
    plan.steps.push({
      dur: 0,
      run: () => {
        const v = shadow.current
        commit({ ...v, units: v.units.filter((x) => x.uid !== uid) })
      },
    })
    return
  }
  plan.steps.push({
    dur: (isVoid ? 720 : 560) + (isFinal ? 520 : 0),
    run: () => {
      const u = unitOf(uid)
      if (!u) return
      updFx(uid, { dying: isVoid ? 'void' : 'damage', pose: 'hit', moveMs: 0 })
      const src = plan.lastSource.get(uid)
      const friendly = u.side === 'enemy' && src === 'enemy'
      const word = isVoid
        ? k
          ? '삭제!'
          : 'VOID!'
        : u.side !== 'enemy'
          ? k
            ? '쓰러짐'
            : 'DOWN'
          : friendly
            ? k
              ? '아군 사격!'
              : 'FRIENDLY FIRE!'
            : src === 'environment'
              ? k
                ? '환경 처치!'
                : 'ENV KILL!'
              : k
                ? '처치!'
                : 'KILL!'
      addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.45 }, text: word, tone: 'kill', ms: S(1300) })
      if (isVoid) {
        addFx({ kind: 'pixels', at: u.pos, tone: 'enemy', ms: S(900) })
        sfx('void', { pan: panOf(u.pos.x), intensity: 1.4 })
        trauma(0.55)
      } else {
        addFx({ kind: 'pixels', at: u.pos, tone: u.side === 'enemy' ? 'enemy' : 'party', ms: S(700) })
        sfx('kill', { pan: panOf(u.pos.x), intensity: u.side === 'enemy' ? 1.2 : 0.8 })
        trauma(0.35)
      }
      if (isFinal) zoomPunch(uid)
    },
  })
  plan.steps.push({
    dur: 0,
    run: () => {
      const u = unitOf(uid)
      if (!u) return
      if (u.uid === 'connector') {
        updFx(uid, { dying: undefined })
        updUnit(uid, (x) => ({ ...x, hp: 0 }))
      } else {
        const v = shadow.current
        commit({ ...v, units: v.units.filter((x) => x.uid !== uid) })
      }
    },
  })
}

export function spawnSteps(kit: Kit, plan: Plan, ev: Ev<'spawn'>): void {
  const { shadow, commit, addFx, S } = kit
  const uid = ev.uid
  plan.steps.push({
    dur: 400,
    run: () => {
      const nu = plan.next.units.find((u) => u.uid === uid)
      if (!nu) return
      const v = shadow.current
      const units = v.units.some((u) => u.uid === uid) ? v.units : [...v.units, { ...nu, intent: null }]
      commit({ ...v, units, ufx: { ...v.ufx, [uid]: { pose: 'idle', moveMs: 0, spawning: true } } })
      addFx({ kind: 'ring', at: nu.pos, tone: 'enemy', ms: S(560) })
      sfx('telegraph', { pan: panOf(nu.pos.x) })
    },
  })
}

export function fizzleSteps(kit: Kit, plan: Plan, ev: Ev<'fizzle'>): void {
  const { unitOf, shadow, patch, addFx, S } = kit
  const k = plan.k
  plan.steps.push({
    dur: 380,
    run: () => {
      const u = unitOf(ev.uid)
      const v = shadow.current
      patch({ pendingIntents: v.pendingIntents ? v.pendingIntents.filter((x) => x !== ev.uid) : v.pendingIntents })
      if (!u) return
      addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.3 }, text: k ? '불발' : 'FIZZLE', tone: 'fizzle', ms: S(950) })
      addFx({ kind: 'spark', at: u.pos, tone: 'warn', ms: S(420) })
      sfx('status_shock', { pan: panOf(u.pos.x) })
    },
  })
}
