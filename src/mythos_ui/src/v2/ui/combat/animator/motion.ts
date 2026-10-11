// Timeline builders for movement: walking / dashing a path, teleports, and pushes (slide, then a slam
// into a wall, a cover block or another unit).

import { COVER_HP } from '../../../engine/effects.ts'
import { DIR_VEC, dirToward } from '../../../engine/grid.ts'
import { sfx } from '../../common/sfx.ts'
import { edgeOf, panOf, withTile } from './helpers.ts'
import type { Ev, ImpactSurface, Kit, Plan } from './types.ts'

export function moveSteps(kit: Kit, plan: Plan, ev: Ev<'move'>, evIdx: number): void {
  const { unitOf, patch, shadow, updFx, updUnit, animFig, squash, S } = kit
  const uid = ev.uid
  const prevEv = plan.events[evIdx - 1]
  const dash = prevEv?.t === 'attack' && prevEv.uid === uid
  const per = dash ? 60 : 105
  plan.steps.push({
    dur: 0,
    run: () => {
      const u = unitOf(uid)
      if (!dash && u?.side === 'enemy' && shadow.current.enemyPhase && !plan.enemyMoved) {
        plan.enemyMoved = true
        patch({ pendingIntents: shadow.current.units.filter((x) => x.side === 'enemy' && (x.intent?.windupLeft ?? 0) > 0).map((x) => x.uid) })
      }
      if (u) sfx(dash ? 'push' : 'move', { pan: panOf(u.pos.x), volume: 0.7 })
    },
  })
  let any = false
  // The engine's path starts at the unit's own tile.
  for (const p of ev.path.length > 1 ? ev.path.slice(1) : ev.path) {
    const to = p
    plan.steps.push({
      dur: per,
      run: () => {
        const u = unitOf(uid)
        if (!u || (u.pos.x === to.x && u.pos.y === to.y)) return
        const face = dirToward(u.pos, to) ?? u.facing
        updFx(uid, { moveMs: S(per), ease: 'linear' })
        updUnit(uid, (x) => ({ ...x, pos: to, facing: face }))
        if (!dash) animFig(uid, [{ transform: 'translateY(0)' }, { transform: 'translateY(-7%)', offset: 0.45 }, { transform: 'translateY(0)' }], S(per), 'ease-in-out')
      },
    })
    any = true
  }
  if (any)
    plan.steps.push({
      dur: dash ? 0 : 60,
      run: () => {
        updFx(uid, { moveMs: 0 })
        if (!dash) squash(uid)
      },
    })
}

export function teleportSteps(kit: Kit, plan: Plan, ev: Ev<'teleport'>): void {
  const { updFx, updUnit, addFx, squash, S } = kit
  const uid = ev.uid
  plan.steps.push({
    dur: 170,
    run: () => {
      updFx(uid, { vanish: true })
      addFx({ kind: 'pixels', at: ev.from, tone: 'party', ms: S(520) })
      sfx('void', { pan: panOf(ev.from.x), volume: 0.5, intensity: 0.6 })
    },
  })
  plan.steps.push({
    dur: 40,
    run: () => {
      updFx(uid, { moveMs: 0 })
      updUnit(uid, (x) => ({ ...x, pos: ev.to }))
    },
  })
  plan.steps.push({
    dur: 220,
    run: () => {
      updFx(uid, { vanish: false })
      addFx({ kind: 'burst', at: ev.to, tone: 'party', ms: S(420) })
      squash(uid)
    },
  })
}

export function pushSteps(kit: Kit, plan: Plan, ev: Ev<'push'>, evIdx: number): void {
  const { unitOf, shadow, commit, updFx, updUnit, addFx, pose, slam, whiteFlash, recoil, trauma, hitStop, later, S } = kit
  const { events, k } = plan
  const uid = ev.uid
  const moved = ev.from.x !== ev.to.x || ev.from.y !== ev.to.y
  const voidDrop = moved && events[evIdx + 1]?.t === 'death' && (events[evIdx + 1] as { uid: string }).uid === uid
  const bumped = ev.bumped
  const d = ev.dir
  // A push that ends in a slam accelerates into the obstacle instead of easing out.
  const slide = bumped ? 150 : 190
  if (moved)
    plan.steps.push({
      dur: slide,
      run: () => {
        updFx(uid, { moveMs: S(slide), ease: bumped ? 'in' : 'out' })
        updUnit(uid, (x) => ({ ...x, pos: ev.to }))
        addFx({ kind: 'dust', at: ev.from, tone: 'neutral', ms: S(500) })
        sfx('push', { pan: panOf(ev.to.x) })
      },
    })
  if (bumped) {
    const surface: ImpactSurface = bumped === 'wall' ? 'wall' : bumped === 'cover' ? 'cover' : 'unit'
    plan.steps.push({
      dur: 330,
      run: () => {
        updFx(uid, { moveMs: 0 })
        const other = surface === 'unit' ? unitOf(bumped) : undefined
        const v = DIR_VEC[d]
        const at = { x: ev.to.x + v.x * 0.5, y: ev.to.y + v.y * 0.5 }
        const pan = panOf(at.x)
        slam(uid, d)
        // Contact lands ~16 % into the slam: everything hits on that frame, then the board freezes.
        later(() => {
          whiteFlash(uid, false)
          pose(uid, 'hit', S(480))
          if (other) {
            whiteFlash(other.uid, false)
            pose(other.uid, 'hit', S(480))
            recoil(other.uid, d, true)
          }
          if (surface === 'cover') {
            // The block cracks on impact; the engine's 'cover' event that follows confirms the same hp.
            const cp = { x: ev.to.x + v.x, y: ev.to.y + v.y }
            const vw = shadow.current
            const cur = vw.tiles[cp.y]?.[cp.x]
            if (cur?.kind === 'cover') {
              const hp = Math.max(1, (cur.hp ?? COVER_HP) - 1)
              commit({ ...vw, tiles: withTile(vw.tiles, cp, { ...cur, hp }) })
            }
          }
          addFx({ kind: 'impact', at, dir: d, surface, ...(surface === 'wall' ? { edge: edgeOf(ev.to, d) } : {}), ms: S(780) })
          addFx({ kind: 'debris', at, tone: surface === 'cover' ? 'block' : 'neutral', ms: S(820) })
          addFx({ kind: 'dust', at, tone: 'neutral', ms: S(760) })
          addFx({ kind: 'text', at: { x: at.x, y: at.y - 0.3 }, text: k ? '쾅!' : 'SLAM!', tone: 'slam', ms: S(1150) })
          trauma(surface === 'unit' ? 0.42 : 0.47)
          hitStop(S(72))
          sfx(surface === 'unit' ? 'bump' : 'wall_slam', { pan, intensity: 1.5 })
        }, S(70))
      },
    })
  } else if (moved && !voidDrop) plan.steps.push({ dur: 20, run: () => updFx(uid, { moveMs: 0 }) })
}
