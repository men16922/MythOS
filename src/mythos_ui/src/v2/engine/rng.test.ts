import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rand, randInt, shuffle, hashSeed } from './rng.ts'
import { areaTiles, rayTiles } from './grid.ts'

test('rng is deterministic and serialisable', () => {
  const a = { rng: hashSeed('mythos') }
  const b = { rng: hashSeed('mythos') }
  const xs = [rand(a), rand(a), randInt(a, 1, 6)]
  const ys = [rand(b), rand(b), randInt(b, 1, 6)]
  assert.deepEqual(xs, ys)
  const copy = JSON.parse(JSON.stringify(a)) as { rng: number }
  assert.equal(rand(copy), rand(a))
})

test('shuffle keeps members', () => {
  const h = { rng: 7 }
  assert.deepEqual(shuffle(h, [1, 2, 3, 4]).sort(), [1, 2, 3, 4])
})

test('grid helpers clip to the board', () => {
  assert.equal(rayTiles({ x: 5, y: 0 }, 'right', 4).length, 1)
  assert.equal(areaTiles({ x: 0, y: 0 }, 'cross').length, 3)
})
