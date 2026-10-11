// Timeline builders for the board itself: tile changes (cover shattering, electrified ground), area
// eruptions rippling ring by ring, live-wire countdowns / cover chips, and burning ground.

import type { CombatEvent, Pos, Tile } from '../../../engine/types.ts'
import { sfx } from '../../common/sfx.ts'
import { RING_MS, panOf, runIndex, withTile } from './helpers.ts'
import type { Ev, FxTone, Kit, Plan } from './types.ts'

export function tileSteps(kit: Kit, plan: Plan, ev: Ev<'tile'>, evIdx: number): void {
  const { shadow, commit, addFx, trauma, later, S } = kit
  const { events, next } = plan
  // Runs of tile changes (an electrified cross, a whole board reverting) ripple instead of queueing.
  const runIdx = runIndex(events, evIdx)
  const more = events[evIdx + 1]?.t === 'tile'
  plan.steps.push({
    dur: more ? 35 : 150,
    run: () => {
      const v = shadow.current
      const cur = v.tiles[ev.pos.y]?.[ev.pos.x]
      const prevKind = cur?.kind
      const nt = next.tiles[ev.pos.y]?.[ev.pos.x]
      // Kind/hp/ttl from the committed tile; burning ground stays as the timeline has it.
      const tile: Tile = { ...(nt && nt.kind === ev.kind ? nt : { kind: ev.kind }) }
      delete tile.fire
      if (cur?.fire && (ev.kind === 'floor' || ev.kind === 'hazard')) tile.fire = cur.fire
      commit({ ...v, tiles: withTile(v.tiles, ev.pos, tile) })
      const pan = panOf(ev.pos.x)
      if (prevKind === 'cover' && ev.kind !== 'cover') {
        // Cover shatters: chips, dust, a heavy crack.
        addFx({ kind: 'debris', at: ev.pos, tone: 'block', ms: S(820) })
        addFx({ kind: 'debris', at: ev.pos, tone: 'neutral', ms: S(900) })
        addFx({ kind: 'dust', at: ev.pos, tone: 'neutral', ms: S(900) })
        trauma(0.32)
        sfx('wall_slam', { pan, intensity: 0.8, volume: 0.8 })
      }
      if (ev.kind === 'cover') {
        addFx({ kind: 'ring', at: ev.pos, tone: 'block', ms: S(460) })
        sfx('block', { pan })
      }
      if (prevKind === 'floor' && ev.kind === 'hazard') {
        // Electrified: the tile crackles to life.
        later(() => addFx({ kind: 'zap', at: ev.pos, tone: 'shock', ms: S(520) }), S(runIdx * 30))
        if (runIdx === 0) sfx('zap', { pan, intensity: 0.8 })
      }
      if (prevKind === 'hazard' && ev.kind === 'floor') {
        addFx({ kind: 'spark', at: ev.pos, tone: 'shock', ms: S(380) })
        if (runIdx === 0) sfx('status_shock', { pan, volume: 0.4 })
      }
    },
  })
}

export function areaSteps(kit: Kit, plan: Plan, ev: Ev<'area'>, evIdx: number): void {
  const { shadow, commit, addFx, trauma, hitStop, later, S } = kit
  const { events } = plan
  plan.inArea = true
  const n = ev.tiles.length
  const rings = ev.tiles.reduce((m, p) => Math.max(m, Math.abs(p.x - ev.center.x) + Math.abs(p.y - ev.center.y)), 0)
  const harmful = ev.element === 'fire' || ev.element === 'shock' || ev.element === 'blast' || ev.element === 'force'
  const big = harmful && n >= 5
  // The ground this resolution sets on fire catches during the eruption itself, so its flames hand over to
  // the burning tiles without a gap (the later 'fire' events then only confirm the count).
  const ignites: { pos: Pos; turns: number }[] = []
  for (let j = evIdx + 1; j < events.length; j++) {
    const e = events[j] as CombatEvent
    if (e.t === 'card' || e.t === 'attack' || e.t === 'turn' || e.t === 'area') break
    if (e.t === 'fire' && e.turns > 0) {
      ignites.push(e)
      plan.planFire.set(`${e.pos.x},${e.pos.y}`, e.turns)
    }
  }
  plan.steps.push({
    dur: rings * RING_MS + (harmful ? 210 : 150) + (big ? 80 : 0),
    run: () => {
      // Hits that follow recoil away from the centre of the blast.
      plan.ctxFrom = ev.center
      plan.ctxDir = undefined
      const pan = panOf(ev.center.x)
      const tone: FxTone = ev.element === 'fire' ? 'fire' : ev.element === 'shock' ? 'shock' : ev.element === 'heal' ? 'heal' : ev.element === 'shield' ? 'block' : ev.element === 'force' ? 'neutral' : ev.side === 'enemy' ? 'enemy' : 'warn'
      addFx({ kind: 'area', tiles: ev.tiles, center: ev.center, element: ev.element, side: ev.side, ring: S(RING_MS), ms: S(harmful ? 950 : 850) })
      if (harmful) addFx({ kind: 'wave', at: ev.center, radius: rings + 0.65, tone, ms: S(560 + rings * 60) })
      if (ev.element === 'fire' || ev.element === 'blast') addFx({ kind: 'scorch', tiles: ev.tiles, element: ev.element, ms: S(3100) })
      if (ignites.length)
        later(() => {
          const vw = shadow.current
          const at = new Map(ignites.map((e) => [`${e.pos.x},${e.pos.y}`, e.turns]))
          const tiles = vw.tiles.map((row, y) => row.map((t, x) => (at.has(`${x},${y}`) ? { ...t, fire: Math.max(t.fire ?? 0, at.get(`${x},${y}`) ?? 0) } : t)))
          commit({ ...vw, tiles })
        }, S(rings * RING_MS + 260))
      if (harmful) {
        trauma(Math.min(0.85, 0.3 + 0.05 * n))
        // Freeze on the bloom of the centre flash.
        if (big) later(() => hitStop(S(n >= 9 ? 90 : 65)), S(45))
      }
      const kSize = Math.min(2, 0.7 + n * 0.12)
      switch (ev.element) {
        case 'fire':
          sfx('explosion', { pan, intensity: kSize * 0.8 })
          sfx('ignite', { pan, volume: 0.9 })
          break
        case 'shock':
          sfx('zap', { pan, intensity: kSize })
          sfx('explosion', { pan, intensity: 0.5, volume: 0.55 })
          break
        case 'blast':
          sfx('explosion', { pan, intensity: kSize })
          break
        case 'force':
          sfx('shockwave', { pan, intensity: kSize })
          break
        case 'shield':
          sfx('block', { pan })
          break
        case 'heal':
          sfx('heal', { pan })
          break
      }
    },
  })
}

/** Bookkeeping on a standing tile: a live wire's countdown ('ttl'), or cover chipped by a hit ('cover'). */
export function tileMarkSteps(kit: Kit, plan: Plan, ev: Ev<'ttl'> | Ev<'cover'>): void {
  const { shadow, commit, addFx, S } = kit
  const pos = ev.pos
  plan.steps.push({
    dur: 0,
    run: () => {
      const v = shadow.current
      const cur = v.tiles[pos.y]?.[pos.x]
      if (!cur) return
      const tile: Tile = ev.t === 'ttl' ? { ...cur, ttl: ev.turns } : { ...cur, hp: ev.hp }
      // A bump already cracked this block at impact: only chip it when the hit is news.
      if (ev.t === 'cover' && cur.hp !== ev.hp) addFx({ kind: 'debris', at: pos, tone: 'block', ms: S(620) })
      commit({ ...v, tiles: withTile(v.tiles, pos, tile) })
    },
  })
}

export function fireSteps(kit: Kit, plan: Plan, ev: Ev<'fire'>, evIdx: number): void {
  const { shadow, commit, addFx, later, S } = kit
  const { events, prev } = plan
  const runIdx = runIndex(events, evIdx)
  const more = events[evIdx + 1]?.t === 'fire'
  const fk = `${ev.pos.x},${ev.pos.y}`
  const prevFire = plan.planFire.get(fk) ?? prev.tiles[ev.pos.y]?.[ev.pos.x]?.fire ?? 0
  plan.planFire.set(fk, ev.turns)
  plan.steps.push({
    // Burning down a turn is silent bookkeeping; igniting / going out gets a beat at the end of the run.
    dur: more ? 0 : ev.turns > prevFire ? 150 : ev.turns === 0 ? 110 : 0,
    run: () => {
      const v = shadow.current
      const cur = v.tiles[ev.pos.y]?.[ev.pos.x]
      if (!cur) return
      const was = cur.fire ?? 0
      const tile: Tile = { ...cur }
      if (ev.turns > 0) tile.fire = ev.turns
      else delete tile.fire
      commit({ ...v, tiles: withTile(v.tiles, ev.pos, tile) })
      const pan = panOf(ev.pos.x)
      if (ev.turns > was) {
        later(() => addFx({ kind: 'flare', at: ev.pos, tone: 'fire', ms: S(720) }), S(runIdx * 35))
        if (runIdx === 0) sfx('ignite', { pan, volume: 0.75 })
      } else if (ev.turns === 0 && was > 0) {
        later(() => addFx({ kind: 'smoke', at: ev.pos, tone: 'neutral', ms: S(1200) }), S(runIdx * 30))
        if (runIdx === 0) sfx('extinguish', { pan })
      }
    },
  })
}
