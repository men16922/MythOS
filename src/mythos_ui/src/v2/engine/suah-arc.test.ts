// The Su-ah arc (content/eventsMore.ts SUAH_ARC) against the real run reducers: the three events only roll
// while she is in the party, and the later parts follow the flags the earlier ones set.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { actEventPool } from './map.ts'
import { chooseEventOption, conditionMet, eventOptions, newRun } from './run.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-11T00:00:00.000Z'
const ARC = ['a2_suah_first_pour', 'a3_suah_voice_archive', 'a3_suah_last_pour'] as const

function runWith(companion: 'se_rin' | 'su_ah'): RunState {
  const run = newRun(newProfile('Tester'), { archetype: 'ghost', paradox: 0, seed: 777, now: NOW }, C)
  // Loop 1 always starts with Se-rin; put the companion under test in the party directly (Su-ah is an
  // Act 2 recruit / unlock in real runs). The arc is about events, not the opening.
  run.party = [{ id: companion, hp: 20, maxHp: 20, bond: 0 }]
  run.credits = 200
  return run
}

function openEvent(run: RunState, eventId: string): RunState {
  const next = structuredClone(run)
  next.screen = { kind: 'event', eventId, resolved: null, improvised: null }
  return next
}

test('arc events exist in their acts and are gated on Su-ah being in the party', () => {
  assert.deepEqual(C.events[ARC[0]]?.acts, [2])
  assert.deepEqual(C.events[ARC[1]]?.acts, [3])
  assert.deepEqual(C.events[ARC[2]]?.acts, [3])
  const without = runWith('se_rin')
  const withSuah = runWith('su_ah')
  for (const id of ARC.slice(0, 2)) {
    assert.equal(conditionMet(without, C.events[id]?.requires, C).ok, false, `${id} must not roll without Su-ah`)
    assert.equal(conditionMet(withSuah, C.events[id]?.requires, C).ok, true, `${id} rolls with Su-ah`)
  }
  assert.ok(actEventPool(2, C).some((e) => e.id === ARC[0]))
  assert.ok(actEventPool(3, C).some((e) => e.id === ARC[1]) && actEventPool(3, C).some((e) => e.id === ARC[2]))
})

test('the last pour waits for the voice to be heard; the archive reads the first pour', () => {
  let run = runWith('su_ah')
  assert.equal(conditionMet(run, C.events[ARC[2]]?.requires, C).ok, false, 'no voice heard yet')

  // Archive: the "stay and listen" option needs `suah_voice` from the first pour.
  let archive = eventOptions(openEvent(run, ARC[1]), C)
  assert.equal(archive[0]?.available, false, 'listening needs the first pour')
  assert.equal(archive.filter((o) => o.available).length, 2, 'two other options stay open')

  // First pour: the memory option removes a card (picker), bonds and sets the flag.
  const before = run.party.find((p) => p.id === 'su_ah')?.bond ?? 0
  run = chooseEventOption(openEvent(run, ARC[0]), 0, C)
  assert.ok((run.flags.suah_voice ?? 0) > 0, 'first pour sets suah_voice')
  assert.equal(run.party.find((p) => p.id === 'su_ah')?.bond, Math.min(3, before + 1))

  run.screen = { kind: 'map' }
  archive = eventOptions(openEvent(run, ARC[1]), C)
  assert.equal(archive[0]?.available, true, 'listening is open after the first pour')
  run = chooseEventOption(openEvent(run, ARC[1]), 0, C)
  assert.ok((run.flags.suah_voice_heard ?? 0) > 0, 'listening sets suah_voice_heard')

  assert.equal(conditionMet(run, C.events[ARC[2]]?.requires, C).ok, true, 'the last pour is now open')
  const hpMax = run.maxHp
  run.screen = { kind: 'map' }
  const poured = chooseEventOption(openEvent(run, ARC[2]), 0, C)
  assert.equal(poured.maxHp, hpMax + 5, 'forging defence adds max HP')
})

test('paying for the first pour needs the credits', () => {
  const run = runWith('su_ah')
  run.credits = 20
  const opts = eventOptions(openEvent(run, ARC[0]), C)
  assert.equal(opts[1]?.available, false)
  run.credits = 60
  const ok = chooseEventOption(openEvent(run, ARC[0]), 1, C)
  assert.equal(ok.credits, 15)
  assert.ok((ok.flags.suah_voice ?? 0) > 0)
})
