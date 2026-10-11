// Companion mastery: shared victories earn a head start (I: the signature card starts upgraded; II: start at bond 1).
// Counted from normal victories only; never applied to (or earned on) a daily.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { MASTERY_WINS, applyRunEnd, masteryFor, masteryTier, migrateProfile, newProfile } from './meta.ts'
import { chooseEnding, newRun } from './run.ts'
import type { MetaProfile, RunState } from './types.ts'

const NOW = '2026-10-12T00:00:00.000Z'
const withWins = (wins: Record<string, number>): MetaProfile => ({ ...newProfile('T'), loops: 1, companionWins: wins })
const start = (profile: MetaProfile, companion: string, over: Record<string, unknown> = {}): RunState =>
  newRun(profile, { archetype: 'ghost', paradox: 0, seed: 11, now: NOW, companion, ...over }, C)

/** A finished run with the given outcome, built by forcing the ending screen (the reducers decide the rest). */
function finished(profile: MetaProfile, kind: 'victory' | 'defeat' | 'abandoned', over: Partial<RunState> = {}): RunState {
  const run = start(profile, 'se_rin')
  Object.assign(run, over)
  if (kind === 'victory') {
    run.screen = { kind: 'final_choice' }
    const done = chooseEnding(run, 'ending_noble_sacrifice', C)
    assert.equal(done.screen.kind, 'ended')
    return done
  }
  run.screen = { kind: 'ended', result: 'defeat', endingId: 'ending_forced_erasure' }
  if (kind === 'abandoned') run.flags.abandoned = 1
  return run
}

test('tiers: 0 below two shared wins, I at two, II at five', () => {
  assert.deepEqual(MASTERY_WINS, [2, 5])
  assert.deepEqual([0, 1, 2, 4, 5, 20].map(masteryTier), [0, 0, 1, 1, 2, 2])
  assert.deepEqual(masteryFor({ companionWins: { se_rin: 1, tae_o: 2, han: 6 } }), { tae_o: 1, han: 2 })
  assert.deepEqual(masteryFor({}), {})
})

test('a victory counts for everyone in the party; a defeat, an abandon and a daily do not', () => {
  const p = newProfile('T')
  const won = applyRunEnd(p, finished(p, 'victory'), C)
  assert.equal(won.companionWins?.se_rin, 1)
  const lost = applyRunEnd(p, finished(p, 'defeat'), C)
  assert.deepEqual(lost.companionWins, {})
  const quit = applyRunEnd(p, finished(p, 'abandoned'), C)
  assert.deepEqual(quit.companionWins, {})
  const daily = applyRunEnd(p, finished(p, 'victory', { daily: '2026-10-12' }), C)
  assert.deepEqual(daily.companionWins, {}, 'daily victories do not earn mastery')
  const twice = applyRunEnd(won, { ...finished(won, 'victory'), id: 'another-run' }, C)
  assert.equal(twice.companionWins?.se_rin, 2)
})

test('mastery I: the signature card starts upgraded; II: the companion starts at bond 1', () => {
  const sig = C.companions.tae_o!.cards[0]!
  const none = start(withWins({}), 'tae_o')
  assert.equal(none.deck.find((c) => c.defId === sig)?.upgraded, false)
  assert.equal(none.party.find((m) => m.id === 'tae_o')?.bond, 0)

  const one = start(withWins({ tae_o: 2 }), 'tae_o')
  assert.equal(one.deck.find((c) => c.defId === sig)?.upgraded, true)
  assert.equal(one.party.find((m) => m.id === 'tae_o')?.bond, 0, 'bond only from tier II')

  const two = start(withWins({ tae_o: 5 }), 'tae_o')
  assert.equal(two.deck.find((c) => c.defId === sig)?.upgraded, true)
  assert.equal(two.party.find((m) => m.id === 'tae_o')?.bond, 1)
  assert.deepEqual(two.mastery, { tae_o: 2 })
})

test('mastery only touches the companion who earned it', () => {
  const run = start(withWins({ tae_o: 5 }), 'han')
  const sig = C.companions.han!.cards[0]!
  assert.equal(run.deck.find((c) => c.defId === sig)?.upgraded, false)
  assert.equal(run.party.find((m) => m.id === 'han')?.bond, 0)
})

test('a daily ignores the profile entirely (identical for everybody)', () => {
  const a = newRun(withWins({ se_rin: 9 }), { archetype: 'ghost', paradox: 0, daily: '2026-10-12', now: NOW }, C)
  const b = newRun(newProfile('Fresh'), { archetype: 'ghost', paradox: 0, daily: '2026-10-12', now: NOW }, C)
  assert.equal(a.mastery, undefined)
  assert.deepEqual(a.deck.map((c) => [c.defId, c.upgraded]), b.deck.map((c) => [c.defId, c.upgraded]))
  assert.deepEqual(a.party, b.party)
})

test('old profiles migrate to no wins; junk is dropped', () => {
  assert.deepEqual(migrateProfile({ playerName: 'Old' }).companionWins, {})
  assert.deepEqual(migrateProfile({ companionWins: { han: 3, bad: -1, '': 4, kai: 'x', lin_yue: 2.9 } }).companionWins, { han: 3, lin_yue: 2 })
  const round = migrateProfile(JSON.parse(JSON.stringify(withWins({ su_ah: 7 }))))
  assert.equal(masteryTier(round.companionWins?.su_ah ?? 0), 2)
})
