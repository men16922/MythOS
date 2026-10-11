// Event list → timeline steps. Walks the events appended by one engine action and hands each to its
// builder (animator/actions.ts, motion.ts, hits.ts, ground.ts, flow.ts), which push steps onto the plan.
// Builders run at planning time; the steps they push run later on the animator's timers.

import type { CombatEvent, CombatState, ContentRegistry, Lang } from '../../../engine/types.ts'
import { attackSteps, cardSteps } from './actions.ts'
import { passiveSteps, phaseSteps, triggerSteps, turnSteps } from './flow.ts'
import { areaSteps, fireSteps, tileMarkSteps, tileSteps } from './ground.ts'
import { viewFrom } from './helpers.ts'
import { blockSteps, deathSteps, damageSteps, fizzleSteps, healSteps, spawnSteps, statusSteps } from './hits.ts'
import { moveSteps, pushSteps, teleportSteps } from './motion.ts'
import type { Kit, Plan, PlayOpts, Step, ViewState } from './types.ts'

export function planTimeline(
  kit: Kit,
  C: ContentRegistry,
  lang: Lang,
  prev: CombatState,
  next: CombatState,
  opts: PlayOpts,
): { start: ViewState; steps: Step[]; events: CombatEvent[] } {
  const events: CombatEvent[] = next.events.slice(Math.max(0, opts.from))
  const plan: Plan = {
    prev,
    next,
    events,
    C,
    lang,
    k: lang === 'ko',
    steps: [],
    cardInfo: opts.card,
    enemyMoved: false,
    ctxDir: undefined,
    ctxFrom: undefined,
    lastSource: new Map(),
    lastDeathIdx: (() => {
      let idx = -1
      // A boss's collapsing minions die after it: the final-kill punch stays on the boss.
      events.forEach((e, i) => {
        if (e.t === 'death' && e.cause !== 'collapse') idx = i
      })
      return idx
    })(),
    finalKill: next.phase === 'won',
    inArea: false,
    planFire: new Map(),
  }

  const start: ViewState = { ...viewFrom(prev), handHidden: !!opts.endTurn, enemyPhase: !!opts.endTurn }
  if (opts.endTurn) start.pendingIntents = prev.units.filter((u) => u.side === 'enemy' && u.intent && u.hp > 0).map((u) => u.uid)

  events.forEach((ev, evIdx) => {
    if (ev.t === 'card' || ev.t === 'attack' || ev.t === 'turn' || ev.t === 'move' || ev.t === 'teleport' || ev.t === 'phase') plan.inArea = false
    switch (ev.t) {
      case 'turn':
        turnSteps(kit, plan, ev)
        break
      case 'card':
        cardSteps(kit, plan, ev, evIdx)
        break
      case 'attack':
        attackSteps(kit, plan, ev, evIdx)
        break
      case 'move':
        moveSteps(kit, plan, ev, evIdx)
        break
      case 'teleport':
        teleportSteps(kit, plan, ev)
        break
      case 'damage':
        damageSteps(kit, plan, ev, evIdx)
        break
      case 'heal':
        healSteps(kit, plan, ev)
        break
      case 'block':
        blockSteps(kit, plan, ev)
        break
      case 'push':
        pushSteps(kit, plan, ev, evIdx)
        break
      case 'status':
        statusSteps(kit, plan, ev)
        break
      case 'death':
        deathSteps(kit, plan, ev, evIdx)
        break
      case 'spawn':
        spawnSteps(kit, plan, ev)
        break
      case 'tile':
        tileSteps(kit, plan, ev, evIdx)
        break
      case 'area':
        areaSteps(kit, plan, ev, evIdx)
        break
      case 'ttl':
      case 'cover':
        tileMarkSteps(kit, plan, ev)
        break
      case 'fire':
        fireSteps(kit, plan, ev, evIdx)
        break
      case 'passive':
        passiveSteps(kit, plan, ev)
        break
      case 'fizzle':
        fizzleSteps(kit, plan, ev)
        break
      case 'phase':
        phaseSteps(kit, plan, ev)
        break
      case 'trigger':
        triggerSteps(kit, plan, ev)
        break
      case 'energy':
      case 'draw':
        break
    }
  })

  return { start, steps: plan.steps, events }
}
