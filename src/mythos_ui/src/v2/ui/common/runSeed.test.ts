import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../../content/index.ts'
import { newProfile } from '../../engine/meta.ts'
import { rx } from '../shell/rx.ts'
import { freshRunSeed } from './runSeed.ts'

test('a normal run draws a fresh seed; the same profile no longer replays the same first map', () => {
  const seeds = new Set(Array.from({ length: 50 }, () => freshRunSeed()))
  assert.ok(seeds.size >= 49, 'seeds are random 32-bit values')
  for (const s of seeds) assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff)
  const p = newProfile('Connector')
  const a = rx.newRun(p, { archetype: 'ghost', paradox: 0 }, C)
  const b = rx.newRun(p, { archetype: 'ghost', paradox: 0 }, C)
  assert.notEqual(a.seed, b.seed)
  assert.notDeepEqual(a.map, b.map, 'two first loops get different maps')
  assert.equal(rx.newRun(p, { archetype: 'ghost', paradox: 0, seed: 7 }, C).seed, 7, 'an explicit seed still wins')
})

test('a daily run keeps the shared date seed', () => {
  const p = newProfile('Connector')
  const a = rx.newRun(p, { archetype: 'ghost', paradox: 0, daily: '2026-10-17' }, C)
  const b = rx.newRun(p, { archetype: 'ghost', paradox: 0, daily: '2026-10-17' }, C)
  assert.equal(a.seed, b.seed)
  assert.deepEqual(a.map, b.map)
})
