import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { bestiaryIds, codexCardIds, mergeBestiary, noteFightBestiary } from './bestiary.ts'
import { cardPool, migrateProfile, newProfile } from './meta.ts'
import { newRun } from './run.ts'
import type { CombatState } from './types.ts'

test('bestiary and card codex can be completed: every entry is reachable in play', () => {
  const ids = bestiaryIds(C)
  assert.ok(ids.length > 50)
  for (const id of ids) assert.ok(C.enemies[id], id)
  const all = { ...newProfile('x'), unlocks: Object.keys(C.unlocks) }
  const reach = new Set<string>()
  for (const a of Object.values(C.archetypes)) {
    for (const id of cardPool(all, a.id, C)) reach.add(id)
    for (const id of a.startingDeck) reach.add(id)
  }
  for (const id of codexCardIds(C)) assert.ok(reach.has(id), `codex card ${id} is in no archetype pool or starting deck`)
})

test('a run records cards it gained and the enemies of a fight, killed or not', () => {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 7, now: '2026-10-29T00:00:00.000Z' }, C)
  assert.ok((run.cardsSeen ?? []).length > 0, 'starting deck counts')
  const enc = Object.values(C.encounters).find((e) => e.enemies.length >= 2)!
  const [a, b] = enc.enemies
  const combat = {
    encounterId: enc.id,
    phase: 'won',
    units: [],
    consumables: [],
    trace: 0,
    stats: { enemiesKilled: 1, environmentKills: 0, damageDealt: 5, damageTaken: 0, cardsPlayed: 3 },
    killed: { [a!.id]: 1 },
  } as unknown as CombatState
  noteFightBestiary(run, combat, C)
  assert.equal(run.bestiary?.[a!.id], 1)
  assert.equal(run.bestiary?.[b!.id] ?? 0, a!.id === b!.id ? 1 : 0)
  assert.ok(b!.id in (run.bestiary ?? {}), 'seen even if not killed')
})

test('profile merge adds kills and keeps seen-only entries; migrate keeps zeros', () => {
  assert.deepEqual(mergeBestiary({ a: 2, b: 0 }, { a: 1, c: 0 }), { a: 3, b: 0, c: 0 })
  const m = migrateProfile({ bestiary: { a: 0, b: 4, c: 'x' }, cardsSeen: ['strike', 'strike', 3] })
  assert.deepEqual(m.bestiary, { a: 0, b: 4 })
  assert.deepEqual(m.cardsSeen, ['strike'])
})
