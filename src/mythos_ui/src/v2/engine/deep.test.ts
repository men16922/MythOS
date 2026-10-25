// Deep Signal (DLC R3/R4): the run continues past Act 3 into the packs' acts; standard runs end at Act 3.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { deepSignalOpen, lastAct, leaveReward, newRun, STANDARD_ACTS } from './run.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-26T00:00:00.000Z'
const won = { ...newProfile('T'), wins: 1 }

/** Put a run on the reward screen right after this act's boss. */
function afterBoss(run: RunState, act: number): RunState {
  const r = structuredClone(run)
  r.act = act
  r.nodeId = r.map.bossId
  r.screen = {
    kind: 'reward',
    reward: { credits: 0, cardChoices: [], implantChoices: [], taken: { credits: true, cards: [], implant: false, consumable: false } },
  } as unknown as RunState['screen']
  return r
}

test('Deep Signal opens after a win and only when a pack adds an act', () => {
  assert.equal(deepSignalOpen(newProfile('T'), C), false)
  assert.equal(deepSignalOpen(won, C), true)
  assert.equal(deepSignalOpen(won, { acts: { 1: C.acts[1]!, 2: C.acts[2]!, 3: C.acts[3]! } }), false)
  assert.equal(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 1, now: NOW, mode: 'deep' }, C).mode, undefined, 'locked before a win')
  assert.equal(newRun(won, { archetype: 'ghost', paradox: 0, seed: 1, now: NOW, mode: 'deep', daily: '2026-10-26' }, C).mode, undefined, 'never on a daily')
})

test('standard runs end after Act 3; Deep Signal runs go on to Act 4 and end after its boss', () => {
  const std = newRun(won, { archetype: 'ghost', paradox: 0, seed: 2, now: NOW }, C)
  assert.equal(lastAct(std, C), STANDARD_ACTS)
  assert.equal(leaveReward(afterBoss(std, 3), C).screen.kind, 'final_choice')

  const deep = newRun(won, { archetype: 'ghost', paradox: 0, seed: 2, now: NOW, mode: 'deep' }, C)
  assert.equal(deep.mode, 'deep')
  assert.ok(lastAct(deep, C) >= 4)
  const act4 = leaveReward(afterBoss(deep, 3), C)
  assert.equal(act4.act, 4)
  assert.equal(act4.screen.kind, 'act_intro')
  assert.equal(act4.map.act, 4)
  const encounters = Object.values(act4.map.nodes).flatMap((n) => (n.encounterId ? [C.encounters[n.encounterId]!] : []))
  assert.ok(encounters.length > 0 && encounters.every((e) => e.act === 4), 'Act 4 map rolls Act 4 fights')
  assert.equal(leaveReward(afterBoss(act4, lastAct(deep, C)), C).screen.kind, 'final_choice')
})

test('Endless Signal wraps to Act 1 one lap deeper, never offers the final choice, and keeps the record', async () => {
  const { applyRunEnd } = await import('./meta.ts')
  const run = newRun(won, { archetype: 'ghost', paradox: 0, seed: 4, now: NOW, mode: 'endless' }, C)
  assert.equal(run.mode, 'endless')
  const last = lastAct(run, C)
  const lap1 = leaveReward(afterBoss(run, last), C)
  assert.equal(lap1.lap, 1)
  assert.equal(lap1.act, 1)
  assert.equal(lap1.screen.kind, 'act_intro')
  assert.equal(lap1.map.act, 1)
  const ended = { ...lap1, act: 2, screen: { kind: 'ended', result: 'defeat', endingId: 'x' } } as unknown as RunState
  assert.equal(applyRunEnd(won, ended, C).endlessBest, 102, 'lap 1, act 2')
})
