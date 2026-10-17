// engine/legacy.ts: echo offers from the last normal loop, inscription at newRun, autonomy levels and their effects.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { AUTONOMY_ACT_SCRUB, AUTONOMY_STEPS, autonomyLevel, echoOffers, nextAutonomyStep } from './legacy.ts'
import { newProfile } from './meta.ts'
import { applyImprovisation, checkChance, newRun } from './run.ts'
import type { Improvisation, MetaProfile, RunRecord } from './types.ts'

const NOW = '2026-10-18T00:00:00.000Z'
const rec = (over: Partial<RunRecord>): RunRecord => ({
  id: 'r',
  loop: 1,
  archetype: 'ghost',
  result: 'defeat',
  endingId: 'x',
  act: 2,
  floors: 9,
  echoes: 5,
  party: ['tae_o'],
  endedAt: NOW,
  ...over,
})
const withHistory = (history: RunRecord[], codex: string[] = []): MetaProfile => ({ ...newProfile('T'), loops: history.length, history, codex })

test('the last normal loop offers up to three echoes, specific first; none on a first loop; dailies do not count', () => {
  assert.deepEqual(echoOffers(newProfile('T'), C), [])
  const fell = echoOffers(withHistory([rec({})]), C).map((e) => e.id)
  assert.deepEqual(fell, ['echo_scar', 'echo_together', 'echo_depth'])
  const won = echoOffers(withHistory([rec({ result: 'victory', act: 3, party: [] })]), C).map((e) => e.id)
  assert.deepEqual(won, ['echo_summit', 'echo_depth', 'echo_faint'])
  const dailyFirst = withHistory([rec({ daily: '2026-10-17', result: 'victory' }), rec({ result: 'abandoned', act: 1, party: [] })])
  assert.deepEqual(
    echoOffers(dailyFirst, C).map((e) => e.id),
    ['echo_cut', 'echo_faint'],
  )
})

test('an inscribed echo applies once at newRun; one not on offer, or a daily, is ignored', () => {
  const p = withHistory([rec({})])
  const base = newRun(p, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW }, C)
  const scar = newRun(p, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW, echo: 'echo_scar' }, C)
  assert.equal(scar.maxHp, base.maxHp + 5)
  assert.equal(scar.hp, base.hp + 5)
  assert.equal(scar.echo, 'echo_scar')
  const notOffered = newRun(p, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW, echo: 'echo_summit' }, C)
  assert.equal(notOffered.echo, undefined)
  assert.equal(notOffered.maxHp, base.maxHp)
  const daily = newRun(p, { archetype: 'ghost', paradox: 0, daily: '2026-10-18', echo: 'echo_scar' }, C)
  assert.equal(daily.echo, undefined)
})

test('the companion echo bonds last loop’s companion when they start with you', () => {
  const p = withHistory([rec({ party: ['se_rin'] }), rec({})])
  const run = newRun(p, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW, companion: 'se_rin', echo: 'echo_together' }, C)
  const plain = newRun(p, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW, companion: 'se_rin' }, C)
  const bond = (r: typeof run) => r.party.find((m) => m.id === 'se_rin')?.bond ?? -1
  assert.equal(bond(run), bond(plain) + 1)
})

test('autonomy: levels from lore found; level 1 eases Improvise, level 3 starts with a growth point; never on a daily', () => {
  const lore = (n: number) => Array.from({ length: n }, (_, i) => `lore_${i}`)
  assert.equal(autonomyLevel({ codex: lore(AUTONOMY_STEPS[0] - 1) }), 0)
  assert.equal(autonomyLevel({ codex: lore(AUTONOMY_STEPS[0]) }), 1)
  assert.equal(autonomyLevel({ codex: lore(AUTONOMY_STEPS[2]) }), 3)
  assert.equal(nextAutonomyStep({ codex: lore(7) }), AUTONOMY_STEPS[1])
  assert.equal(nextAutonomyStep({ codex: lore(30) }), null)
  const top = newRun(withHistory([], lore(20)), { archetype: 'ghost', paradox: 0, seed: 9, now: NOW }, C)
  assert.equal(top.autonomy, 3)
  assert.equal(top.growth, 1)
  const daily = newRun(withHistory([], lore(20)), { archetype: 'ghost', paradox: 0, daily: '2026-10-18' }, C)
  assert.equal(daily.autonomy, undefined)
  assert.ok(AUTONOMY_ACT_SCRUB > 0)
  // Improvise: the same seed and action resolve against a DC one lower at autonomy 1+.
  const imp: Improvisation = { action: 'x', stat: 'agi', dc: 6, reward: 'credits', risk: 'hp', successText: { ko: 'a', en: 'a' }, failureText: { ko: 'b', en: 'b' } }
  const atEvent = (r: typeof top) => ({ ...r, screen: { kind: 'event' as const, eventId: 'a1_dry_footprints', resolved: null, improvised: null } })
  const eased = atEvent(top)
  const plain = atEvent({ ...top, autonomy: 0 })
  assert.equal(checkChance(eased, 'agi', 5), checkChance(plain, 'agi', 6) + 10)
  assert.ok(C.events.a1_dry_footprints, 'fixture event exists')
  // Whatever the roll, both resolve; the eased one never fares worse on the same stream.
  const a = applyImprovisation(eased, imp, C)
  const b = applyImprovisation(plain, imp, C)
  const won = (r: typeof a) => (r.screen.kind === 'event' ? !!r.screen.improvised?.rolled?.success : false)
  assert.ok(won(a) || !won(b))
})
