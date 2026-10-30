// Duo ultimates (content/duos.ts): both must stand, same gauge, once per fight, found once and kept by the profile.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT } from '../content/index.ts'
import { DUO_PREFIX, fireBurst, startCombat, ultimatesReady } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { MOMENTUM_MAX } from './effects.ts'
import { applyRunEnd, migrateProfile, newProfile } from './meta.ts'
import { newRun, startAct, updateCombat } from './run.ts'
import type { ContentRegistry, DuoDef } from './types.ts'

const duo: DuoDef = {
  id: 'pair',
  pair: ['a', 'b'],
  name: { ko: '둘', en: 'Two' },
  text: { ko: '둘', en: 'Two' },
  effects: [{ kind: 'block', amount: 9, to: 'owner' }],
  lines: [{ ko: '하나', en: 'One' }, { ko: '둘', en: 'Two' }],
}

const companion = (id: string) => ({
  ...Object.values(FIXTURE.companions)[0]!,
  id,
  ultimate: { name: { ko: id, en: id }, text: { ko: id, en: id }, effects: [{ kind: 'block' as const, amount: 1, to: 'owner' as const }] },
})

const C: ContentRegistry = { ...FIXTURE, duos: { pair: duo }, companions: { ...FIXTURE.companions, a: companion('a'), b: companion('b') } }

const fight = (ids = ['a', 'b']) => {
  const c = startCombat(makeRun({ party: ids.map((id) => ({ id, hp: 20, maxHp: 20, bond: 0 })) }), 'duel', C)
  c.momentum = MOMENTUM_MAX
  return c
}

const KEY = `${DUO_PREFIX}pair`

test('a duo is on offer only with both standing and a full gauge', () => {
  assert.ok(ultimatesReady(fight(), C).some((o) => o.uid === KEY))
  assert.ok(!ultimatesReady(fight(['a']), C).some((o) => o.uid === KEY))
  const down = fight()
  down.units.find((u) => u.defId === 'b')!.hp = 0
  assert.ok(!ultimatesReady(down, C).some((o) => o.uid === KEY))
  const empty = fight()
  empty.momentum = 0
  assert.equal(ultimatesReady(empty, C).length, 0)
})

test('firing spends the gauge, comes from pair[0], tells the board and blocks a second one', () => {
  const c = fight()
  const after = fireBurst(c, C, KEY)
  assert.equal(after.momentum, 0)
  assert.equal(after.burstUsed, true)
  assert.equal(after.duoFired, 'pair')
  assert.equal(after.units.find((u) => u.defId === 'a')!.block, 9)
  assert.ok(after.events.some((e) => e.t === 'burst' && e.duo === 'pair' && e.companion === 'a'))
  assert.equal(ultimatesReady(after, C).length, 0)
  assert.throws(() => fireBurst(after, C, KEY))
})

test('a fired duo stays found: run, then profile, through a save', () => {
  const run = startAct(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 9, now: '2026-10-30T00:00:00.000Z' }, CONTENT), CONTENT)
  const enc = Object.values(CONTENT.encounters).find((e) => e.act === 1 && e.kind === 'normal')!.id
  const combat = startCombat(run, enc, CONTENT)
  const won = updateCombat({ ...run, screen: { kind: 'combat', combat, nodeKind: 'combat' } }, { ...combat, phase: 'won', duoFired: 'collection' }, CONTENT)
  assert.deepEqual(won.duosFired, ['collection'])
  const ended = { ...won, screen: { kind: 'ended' as const, result: 'defeat' as const, endingId: 'ending_forced_erasure' } }
  const profile = applyRunEnd(newProfile('T'), ended, CONTENT)
  assert.deepEqual(profile.duos, ['collection'])
  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(profile))).duos, ['collection'])
})

test('content: twelve duos of real companions, no pair twice, bilingual, every companion in at least one', () => {
  const duos = Object.values(CONTENT.duos ?? {})
  assert.equal(duos.length, 12)
  const pairs = new Set<string>()
  const used = new Set<string>()
  for (const d of duos) {
    const key = [...d.pair].sort().join('+')
    assert.ok(!pairs.has(key), key)
    pairs.add(key)
    for (const id of d.pair) {
      assert.ok(CONTENT.companions[id], id)
      used.add(id)
    }
    assert.notEqual(d.pair[0], d.pair[1])
    assert.ok(d.effects.length > 0, d.id)
    for (const text of [d.name, d.text, ...d.lines]) assert.ok(text.ko.trim() && text.en.trim(), d.id)
    for (const line of d.lines) assert.ok(line.ko.length <= 30, `${d.id}: line too long for the cut-in`)
  }
  assert.equal(used.size, Object.keys(CONTENT.companions).length)
})
