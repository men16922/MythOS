// engine/thoughts.ts + content/thoughts.ts: offers after checks, two slots, settling after THOUGHT_NODES nodes.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { THOUGHTS } from '../content/thoughts.ts'
import { newProfile } from './meta.ts'
import { enterNode, newRun, reachableNodes } from './run.ts'
import { THOUGHT_NODES, THOUGHT_SLOTS, acceptThought, advanceThoughts, declineThought, forgetThought, offerThought } from './thoughts.ts'
import type { RunState, StatKey } from './types.ts'

const run0 = (): RunState => newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 11, now: '2026-10-18T00:00:00.000Z' }, C)

test('content: unique ids, every stat has a success and a failure thought, effects are small and never interactive', () => {
  assert.equal(new Set(THOUGHTS.map((x) => x.id)).size, THOUGHTS.length)
  for (const stat of ['str', 'agi', 'int', 'cha', 'obs'] as StatKey[]) {
    assert.ok(THOUGHTS.some((x) => x.stat === stat && x.on === 'success'), `${stat} success`)
    assert.ok(THOUGHTS.some((x) => x.stat === stat && x.on === 'failure'), `${stat} failure`)
  }
  for (const x of THOUGHTS) {
    for (const txt of [x.name, x.offer, x.settled, x.gain]) assert.ok(txt.ko.trim() && txt.en.trim(), x.id)
    assert.ok(!/\d/.test(x.offer.ko + x.settled.ko), `${x.id}: voice lines carry no numbers`)
    for (const e of x.effects) {
      assert.ok(!['card_choice', 'remove_card', 'combat', 'companion', 'implant'].includes(e.kind), `${x.id}: ${e.kind}`)
      if (e.kind === 'upgrade_card') assert.equal(e.random, true, `${x.id}: random upgrades only`)
      if (e.kind === 'credits') assert.ok(e.amount <= 40, x.id)
      if (e.kind === 'stat') assert.equal(e.amount, 1, x.id)
    }
  }
})

test('a check offers one thought at a time; carry up to two; let one go and it never returns', () => {
  let run = run0()
  offerThought(run, 'obs', true, THOUGHTS)
  assert.equal(run.thoughts?.offer, 'th_wet_footprints')
  offerThought(run, 'str', true, THOUGHTS)
  assert.equal(run.thoughts?.offer, 'th_wet_footprints', 'one offer at a time')
  run = acceptThought(run)
  assert.deepEqual(run.thoughts?.slots, [{ id: 'th_wet_footprints', progress: 0 }])
  offerThought(run, 'obs', true, THOUGHTS)
  assert.equal(run.thoughts?.offer, 'th_count_the_cameras', 'next unseen of that stat')
  run = acceptThought(run)
  offerThought(run, 'str', false, THOUGHTS)
  assert.equal(acceptThought(run), run, `only ${THOUGHT_SLOTS} slots`)
  run = declineThought(run)
  offerThought(run, 'str', false, THOUGHTS)
  assert.equal(run.thoughts?.offer, null, 'a declined thought is not offered again (no other str failure thought)')
  run = forgetThought(run, 'th_count_the_cameras')
  assert.equal(run.thoughts?.slots.length, 1)
  assert.ok(run.thoughts?.declined.includes('th_count_the_cameras'))
})

test(`a carried thought settles after ${THOUGHT_NODES} nodes and applies its effects`, () => {
  let run = run0()
  offerThought(run, 'obs', true, THOUGHTS)
  run = acceptThought(run)
  const obs = run.stats.obs
  for (let i = 0; i < THOUGHT_NODES; i++) {
    run = { ...run, screen: { kind: 'map' } }
    const id = reachableNodes(run)[0]
    assert.ok(id)
    run = enterNode(run, id, C)
  }
  assert.equal(run.stats.obs, obs + 1)
  assert.deepEqual(run.thoughts?.done, ['th_wet_footprints'])
  assert.equal(run.thoughts?.settled, 'th_wet_footprints')
  assert.deepEqual(advanceThoughts(run, THOUGHTS), [])
  assert.equal(run.thoughts?.slots.length, 0)
})
