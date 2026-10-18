import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { claimDirective, directiveState, offeredDirectives, selectDirective } from './directives.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'

test('directives: 3 deterministic offers per act, select, advance, and claim reward cache', () => {
  const r0 = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 42, now: '2026-10-18T00:00:00.000Z' }, C)
  const offers = offeredDirectives(r0)
  assert.equal(offers.length, 3)
  assert.deepEqual(
    offers.map((d) => d.id),
    offeredDirectives(r0).map((d) => d.id),
    'deterministic per seed and act',
  )
  assert.equal(directiveState(r0).selected, null, 'none active before selection')

  const chosen = offers[0]!
  const r1 = selectDirective(r0, 1)
  const active1 = directiveState(r1)
  assert.ok(active1.selected)
  assert.equal(active1.selected.id, chosen.id)
  assert.equal(active1.progress, 0)
  assert.equal(active1.completed, false)

  // Complete progress and claim
  const rDone = {
    ...r1,
    flags: { ...r1.flags, [`dir_a${r1.act}_prog`]: chosen.target },
  }
  const active2 = directiveState(rDone)
  assert.ok(active2.completed)
  assert.equal(active2.claimed, false)

  const rClaimed = claimDirective(rDone)
  const active3 = directiveState(rClaimed)
  assert.ok(active3.claimed)
  assert.ok(rClaimed.credits > rDone.credits)
  assert.equal(claimDirective(rClaimed), rClaimed, 'cannot double-claim')
})
