// Self-play for replay checks: a daily run driven by the greedy combat planner through the same recorded `rx` and
// combat actions the shell uses, committed through `noteCommit` like the store does. Used by replay.test.ts and by
// sample.cli.ts (a real log for the Python verifier test). Not part of the game bundle.

import { CONTENT as C } from '../../content/index.ts'
import { planGreedyTurn } from '../../engine/combatSim.ts'
import { newProfile } from '../../engine/meta.ts'
import type { CombatState, RunState } from '../../engine/types.ts'
import { endTurn, moveUnit, playCard } from '../combat/recordedActions.ts'
import { rx } from '../shell/rx.ts'
import { noteCommit, resetRecorder, stepOf, tag } from './record.ts'

/** Play a daily the way the shell does: every state goes through a recorded call, then `setRun` (noteCommit). */
export function playRecorded(maxFights: number, day: string): RunState {
  resetRecorder()
  let prev: RunState | null = null
  let run = rx.newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, daily: day }, C)
  const commit = (next: RunState): void => {
    noteCommit(prev, next)
    prev = next
    run = next
  }
  const commitCombat = (c: CombatState): void => {
    const next = rx.updateCombat(run, c, C)
    const step = stepOf(c)
    if (step) tag(next, step)
    commit(next)
  }
  commit(run)
  let fights = 0
  for (let guard = 0; guard < 400 && run.screen.kind !== 'ended'; guard++) {
    const s = run.screen
    if (fights >= maxFights && s.kind === 'map') {
      commit(rx.abandon(run))
      break
    }
    switch (s.kind) {
      case 'act_intro':
        commit(rx.continueActIntro(run, C))
        break
      case 'event': {
        if (s.resolved) commit(rx.leaveEvent(run, C))
        else commit(rx.chooseOption(run, rx.eventOptions(run, C).find((v) => v.available)?.index ?? 0, C))
        break
      }
      case 'map':
        commit(rx.enterNode(run, rx.reachable(run)[0] as string, C))
        break
      case 'combat': {
        let c = s.combat
        if (c.phase === 'player') {
          for (const p of planGreedyTurn(c, C)) {
            if (p.kind === 'card' && p.spot) {
              const moved = moveUnit(c, C, p.origin, p.spot)
              if (moved !== c) {
                c = moved
                commitCombat(c)
                if (c.phase !== 'player') break
              }
            }
            const next = p.kind === 'move' ? moveUnit(c, C, p.uid, p.to) : playCard(c, C, p.cardUid, p.origin, p.target)
            if (next === c) continue
            c = next
            commitCombat(c)
            if (c.phase !== 'player') break
          }
          if (c.phase === 'player') {
            c = endTurn(c, C)
            commitCombat(c)
          }
          if (c.phase !== 'player') fights += 1
        }
        break
      }
      case 'reward':
        commit(rx.leaveReward(run, C))
        break
      case 'card_reward':
        commit(rx.chooseCardReward(run, null, C))
        break
      default:
        commit(rx.abandon(run))
    }
  }
  return run
}

