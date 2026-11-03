import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROCEDURAL_PEOPLE } from '../../content/eventsProcedural.ts'
import { proceduralPerson } from './eventOpening.ts'

test('a procedural event casts the same person for a run and event, and different runs meet different people', () => {
  const a = proceduralPerson({ seed: 42 }, 'pc_watcher')
  assert.ok(a && PROCEDURAL_PEOPLE.includes(a))
  assert.equal(proceduralPerson({ seed: 42 }, 'pc_watcher'), a, 'stable across retries and reloads')
  const seen = new Set(Array.from({ length: 40 }, (_, i) => proceduralPerson({ seed: i }, 'pc_watcher')))
  assert.ok(seen.size >= 8, `spread over the pool: ${seen.size}`)
  for (const p of PROCEDURAL_PEOPLE) assert.ok(p.ko && p.en && !/\d/.test(p.ko + p.en))
})
