// Noise gates and the cross-loop event rotation.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { applyRunEnd, newProfile, RECENT_EVENT_LOOPS } from './meta.ts'
import { activeMutators, noiseMutatorFor } from './mutators.ts'
import { generateActMap } from './map.ts'
import { startCombat } from './combat.ts'
import { chooseEventOption, eventOptions, newRun, resolveEventId, startAct, updateCombat } from './run.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-30T00:00:00.000Z'
const fresh = (seed = 7): RunState => startAct(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed, now: NOW }, C), C)

const atGate = (seed = 7, id = 'noise_gate_street'): RunState => ({ ...fresh(seed), screen: { kind: 'event', eventId: id } })

const win = (run: RunState): RunState => {
  const nodeKind = 'combat' as const
  const combat = startCombat(run, Object.values(C.encounters).find((e) => e.act === 1 && e.kind === 'normal')!.id, C)
  return updateCombat({ ...run, screen: { kind: 'combat', combat, nodeKind } }, { ...combat, phase: 'won' }, C)
}

test('a gate names its bargain, takes the HP and opens the mutator for three wins', () => {
  const run = atGate()
  const hint = eventOptions(run, C)[0]!.option.hint!
  const m = noiseMutatorFor(run)
  assert.ok(hint.ko.includes(m.name.ko) && hint.en.includes(m.name.en))
  const next = chooseEventOption(run, 0, C)
  assert.equal(next.hp, run.hp - 6)
  assert.equal(next.noiseMutator, m.id)
  assert.equal(next.noiseLeft, 3)
  assert.ok(activeMutators(next).some((x) => x.id === m.id))
  assert.ok(activeMutators(startCombat(next, Object.values(C.encounters).find((e) => e.act === 1 && e.kind === 'normal')!.id, C)).some((x) => x.id === m.id))
})

test('declining takes nothing but the credits', () => {
  const run = atGate()
  const next = chooseEventOption(run, 1, C)
  assert.equal(next.noiseMutator, undefined)
  assert.equal(next.hp, run.hp)
})

test('the third win closes the gate and offers forbidden implants', () => {
  let run = chooseEventOption(atGate(), 0, C)
  run = { ...win({ ...run, screen: { kind: 'map' } }), screen: { kind: 'map' } }
  assert.equal(run.noiseLeft, 2)
  run = { ...win(run), screen: { kind: 'map' } }
  assert.equal(run.noiseLeft, 1)
  const paid = win(run)
  assert.equal(paid.noiseMutator, undefined)
  assert.equal(paid.noiseLeft, undefined)
  assert.ok(paid.screen.kind === 'reward')
  if (paid.screen.kind !== 'reward') return
  assert.equal(paid.screen.reward.noisePaid, true)
  assert.equal(paid.screen.reward.implantChoices.length, 2)
  for (const id of paid.screen.reward.implantChoices) assert.equal(C.implants[id]?.rarity, 'boss')
})

test('an open gate is not offered again', () => {
  const run = { ...chooseEventOption(atGate(), 0, C), screen: { kind: 'map' as const } }
  const node = Object.values(run.map.nodes).find((n) => n.kind === 'event')!
  node.eventId = 'noise_gate_street'
  assert.notEqual(resolveEventId(run, node, C), 'noise_gate_street')
})

test('the gate mutator is a pure function of seed and act and avoids what is already running', () => {
  const run = fresh(11)
  assert.equal(noiseMutatorFor(run).id, noiseMutatorFor(run).id)
  const first = noiseMutatorFor(run).id
  assert.notEqual(noiseMutatorFor({ ...run, mutator: first }).id, first)
  const seen = new Set<string>()
  for (let seed = 0; seed < 60; seed++) seen.add(noiseMutatorFor({ seed, act: 1 }).id)
  assert.ok(seen.size >= 4)
})

test('recent events: maps prefer others, never forbid, and an empty list changes nothing', () => {
  const rng = () => ({ rng: 12345 })
  const eventsOf = (avoid: string[]) =>
    Object.values(generateActMap(1, rng(), C, { avoid }).nodes).filter((n) => n.kind === 'event').map((n) => n.eventId)
  const base = eventsOf([])
  assert.deepEqual(base, Object.values(generateActMap(1, rng(), C).nodes).filter((n) => n.kind === 'event').map((n) => n.eventId))
  const avoid = base.filter((id): id is string => !!id)
  const after = eventsOf(avoid)
  assert.ok(after.every((id) => !avoid.includes(id as string)), 'a pool this big has others to show')
  const everything = Object.values(C.events).map((e) => e.id)
  assert.equal(eventsOf(everything).length, base.length, 'avoiding everything still fills the map')
})

test('a normal loop remembers its events, a daily does not, and the run reads them', () => {
  const profile = newProfile('T')
  const run = { ...fresh(3), seenEvents: ['a1_x', 'a1_y', 'a1_x'], screen: { kind: 'ended' as const, result: 'defeat' as const, endingId: 'ending_forced_erasure' } }
  const once = applyRunEnd(profile, run, C)
  assert.deepEqual(once.recentEvents, [['a1_x', 'a1_y']])
  const daily = applyRunEnd(once, { ...run, id: 'daily', seenEvents: ['a1_z'], daily: '2026-10-30' as never }, C)
  assert.deepEqual(daily.recentEvents, once.recentEvents)
  let many = once
  for (let i = 0; i < 5; i++) many = applyRunEnd(many, { ...run, id: `loop${i}` }, C)
  assert.equal(many.recentEvents?.length, RECENT_EVENT_LOOPS)
  assert.deepEqual(newRun(once, { archetype: 'ghost', paradox: 0, seed: 4, now: NOW }, C).staleEvents, ['a1_x', 'a1_y'])
  assert.equal(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 4, now: NOW }, C).staleEvents, undefined)
})

