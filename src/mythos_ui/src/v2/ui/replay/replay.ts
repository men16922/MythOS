// Replay a recorded daily run (record.ts) from its seed and report the result it really earned.
//
// Pure and DOM-free so it runs in the browser, in `node --test`, and in the server-side verifier. Every step must
// change the state the way it did on the player's device; a step that names an unknown action, does nothing, or
// leaves the screen it expects is a mismatch, and the run is not verified.

import { endTurn, moveUnit, playCard, undoMove, useConsumable } from '../../engine/combat.ts'
import { isDateKey } from '../../engine/daily.ts'
import { computeEchoes, dailyResultOf, newProfile } from '../../engine/meta.ts'
import type { CombatState, ContentRegistry, DailyResult, RunState } from '../../engine/types.ts'
import { rxCore } from '../shell/rxCore.ts'
import { CONTENT_ARG, type ReplayLog } from './record.ts'

type AnyFn = (...a: unknown[]) => unknown

const COMBAT: Record<string, AnyFn> = { playCard, moveUnit, undoMove, endTurn, useConsumable } as unknown as Record<string, AnyFn>
/** Run actions a log may name: every rxCore entry that returns a run state (queries are refused). */
const RUN_ACTIONS = new Set([
  'visitPoi', 'leaveDistrict', 'chooseDialogue', 'rerollDialogue', 'acceptRoll', 'closeDialogue', 'startCamp',
  'acceptThought', 'declineThought', 'forgetThought', 'selectDirective', 'claimDirective',
  'continueActIntro', 'enterNode', 'spendGrowth', 'abandon', 'discardConsumable', 'setDeployment',
  'takeCredits', 'takeCard', 'takeImplant', 'takeConsumable', 'leaveReward', 'chooseCardReward',
  'chooseOption', 'improvise', 'leaveEvent',
  'buyCard', 'buyImplant', 'buyConsumable', 'shopRemove', 'shopHeal', 'shopScrub', 'leaveShop',
  'restHeal', 'restUpgrade', 'restScrub', 'restBond', 'leaveRest',
  'openTreasure', 'leaveTreasure', 'pickCard', 'cancelPick', 'chooseEnding',
])

export const MAX_REPLAY_STEPS = 20000

export type ReplayOutcome =
  | { ok: true; run: RunState; result: DailyResult; steps: number }
  | { ok: false; error: string; step: number }

function args(a: unknown[], C: ContentRegistry): unknown[] {
  return a.map((x) => (x === CONTENT_ARG ? C : x === null ? undefined : structuredClone(x)))
}

export function replayDaily(log: ReplayLog, C: ContentRegistry): ReplayOutcome {
  if (log?.v !== 1 || !Array.isArray(log.steps) || !isDateKey(log.daily)) return { ok: false, error: 'bad log', step: -1 }
  if (log.steps.length > MAX_REPLAY_STEPS) return { ok: false, error: 'too many steps', step: -1 }
  const start = log.start ?? {}
  if (start.daily !== log.daily || typeof start.archetype !== 'string') return { ok: false, error: 'bad start', step: -1 }
  let run: RunState
  try {
    // A daily never reads the profile (engine/run.ts newRun), so any fresh profile starts the same run.
    run = rxCore.newRun(newProfile('replay'), { archetype: start.archetype, companion: null, paradox: 0, daily: log.daily }, C)
  } catch (e) {
    return { ok: false, error: `start: ${(e as Error).message}`, step: -1 }
  }
  for (let i = 0; i < log.steps.length; i++) {
    const s = log.steps[i]
    if (!s || !Array.isArray(s.a)) return { ok: false, error: 'bad step', step: i }
    try {
      if (s.k === 'combat') {
        const fn = COMBAT[s.f]
        if (!fn || run.screen.kind !== 'combat') return { ok: false, error: `combat step ${s.f} off a fight`, step: i }
        const before = run.screen.combat
        const after = fn(before, ...args(s.a, C)) as CombatState
        if (after === before) return { ok: false, error: `combat step ${s.f} changed nothing`, step: i }
        run = rxCore.updateCombat(run, after, C)
      } else if (s.k === 'run') {
        if (!RUN_ACTIONS.has(s.f)) return { ok: false, error: `unknown action ${s.f}`, step: i }
        const fn = (rxCore as unknown as Record<string, AnyFn>)[s.f] as AnyFn
        const next = fn(run, ...args(s.a, C)) as RunState
        if (next === run) return { ok: false, error: `${s.f} changed nothing`, step: i }
        run = next
      } else {
        return { ok: false, error: 'bad step kind', step: i }
      }
    } catch (e) {
      return { ok: false, error: `${s.f}: ${(e as Error).message}`, step: i }
    }
  }
  if (run.screen.kind !== 'ended') return { ok: false, error: 'run did not end', step: log.steps.length }
  return { ok: true, run, result: dailyResultOf(run, computeEchoes(run, C).total), steps: log.steps.length }
}

/** Does a claimed result match the replayed one? (`secs` is wall-clock and cannot be replayed.) */
export function sameResult(claimed: DailyResult, replayed: DailyResult): boolean {
  return (
    claimed.archetype === replayed.archetype &&
    claimed.won === replayed.won &&
    claimed.act === replayed.act &&
    claimed.floors === replayed.floors &&
    claimed.echoes === replayed.echoes &&
    claimed.kills === replayed.kills
  )
}
