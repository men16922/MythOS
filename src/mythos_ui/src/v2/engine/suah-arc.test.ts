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

// ---------------------------------------------------------------- Tae-o / Han / Se-rin arcs (content/eventsArcs.ts)

interface Arc {
  who: 'tae_o' | 'han' | 'se_rin'
  events: [string, string, string]
  /** Flag the first part sets, and the flag the second part sets (which opens the third). */
  flags: [string, string]
}
const ARCS: Arc[] = [
  { who: 'tae_o', events: ['a2_taeo_wanted_board', 'a3_taeo_pending_file', 'a3_taeo_hold_the_line'], flags: ['taeo_trail', 'taeo_cleared'] },
  { who: 'han', events: ['a2_han_blank_booth', 'a3_han_first_poke', 'a3_han_empty_reply'], flags: ['han_probe', 'han_poked'] },
  { who: 'se_rin', events: ['a2_serin_answering_radio', 'a3_serin_inside_line', 'a3_serin_thirteenth_line'], flags: ['serin_signal', 'serin_line'] },
]

function partyOf(who: string): RunState {
  const run = newRun(newProfile('Tester'), { archetype: 'ghost', paradox: 0, seed: 4242, now: NOW }, C)
  run.party = [{ id: who, hp: 20, maxHp: 20, bond: 0 }]
  run.credits = 200
  return run
}

for (const arc of ARCS) {
  test(`${arc.who} arc: acts, companion gating and the flag chain`, () => {
    const [first, second, third] = arc.events as [string, string, string]
    assert.deepEqual(C.events[first]?.acts, [2])
    assert.deepEqual(C.events[second]?.acts, [3])
    assert.deepEqual(C.events[third]?.acts, [3])
    const other = arc.who === 'han' ? 'tae_o' : 'han'
    for (const id of arc.events) {
      assert.equal(conditionMet(partyOf(other), C.events[id]?.requires, C).ok, false, `${id} must not roll for ${other}`)
    }
    let run = partyOf(arc.who)
    assert.equal(conditionMet(run, C.events[first]?.requires, C).ok, true)
    assert.equal(conditionMet(run, C.events[second]?.requires, C).ok, true)
    assert.equal(conditionMet(run, C.events[third]?.requires, C).ok, false, 'the payoff waits for the second flag')

    // The second part's flag-gated option (index 0) is locked until the first part's flag exists.
    const [f1, f2] = arc.flags as [string, string]
    assert.equal(eventOptions(openEvent(run, second), C)[0]?.available, false)

    // First part: a no-check option sets the first flag (and bonds), so the chain never depends on a roll.
    const sure = C.events[first]?.options.findIndex(
      (o) => !o.check && !o.requires && o.success.effects.some((e) => e.kind === 'flag' && e.key === f1),
    )
    assert.ok(sure !== undefined && sure >= 0, `${first} has a sure way to set ${f1}`)
    const bondBefore = run.party[0]?.bond ?? 0
    run = chooseEventOption(openEvent(run, first), sure as number, C)
    assert.ok((run.flags[f1] ?? 0) > 0, `${first} sets ${f1}`)
    assert.equal(run.party[0]?.bond, Math.min(3, bondBefore + 1))

    // Second part: with the first flag the gated option opens, resolves (success branch forced) and sets the second flag.
    run.screen = { kind: 'map' }
    assert.equal(eventOptions(openEvent(run, second), C)[0]?.available, true)
    const def = C.events[second]
    const fx = def?.options[0]?.success.effects ?? []
    assert.ok(fx.some((e) => e.kind === 'flag' && e.key === f2), `${second} option 1 sets ${f2} on success`)
    run.flags[f2] = 1 // the check may fail at random; the chain under test is the flag handoff
    assert.equal(conditionMet(run, C.events[third]?.requires, C).ok, true, 'the payoff opens once the second flag is set')
    run.screen = { kind: 'map' }
    const paid = chooseEventOption(openEvent(run, third), 0, C)
    assert.notEqual(paid, run, 'the payoff resolves')
  })
}
