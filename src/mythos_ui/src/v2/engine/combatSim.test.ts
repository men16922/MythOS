import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playCardInPlace, startCombat } from './combat.ts'
import { autoPlay, leanClone, planGreedyTurn } from './combatSim.ts'
import { FIXTURE as C, makeRun } from './combat.fixture.test.ts'

const party = [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }]

test('bots always finish a fight and are deterministic', () => {
  for (const enc of Object.keys(C.encounters)) {
    for (const policy of ['greedy', 'basic'] as const) {
      const run = makeRun({ rng: 4242, party })
      const a = autoPlay(startCombat(run, enc, C), C, policy)
      const b = autoPlay(startCombat(run, enc, C), C, policy)
      assert.notEqual(a.phase, 'player', `${enc}/${policy} did not finish`)
      assert.equal(JSON.stringify(a), JSON.stringify(b))
    }
  }
})

test('greedy protects the connector better than basic against a boss', () => {
  let greedyLost = 0
  let basicLost = 0
  for (let s = 1; s <= 8; s++) {
    const run = makeRun({ rng: s * 7777, party })
    const g = autoPlay(startCombat(run, 'boss', C), C, 'greedy')
    const b = autoPlay(startCombat(run, 'boss', C), C, 'basic')
    greedyLost += 34 - (g.units.find((u) => u.uid === 'connector')?.hp ?? 0)
    basicLost += 34 - (b.units.find((u) => u.uid === 'connector')?.hp ?? 0)
  }
  assert.ok(greedyLost < basicLost, `greedy lost ${greedyLost}, basic ${basicLost}`)
})

test('leanClone is a faithful deep copy (minus the event log)', () => {
  const c = startCombat(makeRun({ party }), 'terrain', C)
  const copy = leanClone(c)
  assert.deepEqual({ ...copy, events: c.events, undo: c.undo }, c)
  const u = copy.units[0]
  assert.ok(u)
  u.pos.x = 99
  const tile = copy.tiles[0]?.[0]
  if (tile) tile.kind = 'void'
  assert.notEqual(c.units[0]?.pos.x, 99)
  assert.equal(c.tiles[0]?.[0]?.kind, 'floor')
})

test('planGreedyTurn is read-only and its first card step is playable as planned', () => {
  const c = startCombat(makeRun({ party }), 'terrain', C)
  const before = JSON.stringify(c)
  const plan = planGreedyTurn(c, C)
  assert.equal(JSON.stringify(c), before, 'planning must not mutate the combat')
  assert.ok(plan.length > 0)
  const first = plan[0]
  assert.ok(first)
  if (first.kind === 'card') {
    const played = leanClone(c)
    if (first.spot) {
      const u = played.units.find((x) => x.uid === first.origin)
      assert.ok(u)
      u.pos = { ...first.spot }
    }
    assert.doesNotThrow(() => playCardInPlace(played, C, first.cardUid, first.origin, first.target))
  }
})
