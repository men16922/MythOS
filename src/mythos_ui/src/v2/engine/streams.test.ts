// Named random streams: a daily stays the same run for every player, systems never re-roll each
// other, a reshuffle ignores play order, and pre-stream saves keep their old single stream.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { startCombat } from './combat.ts'
import { drawCards } from './effects.ts'
import { generateActMap } from './map.ts'
import { planIntent } from './intents.ts'
import { hashSeed, rand } from './rng.ts'
import { enterNode, generateShop, newRun, reachableNodes, startAct } from './run.ts'
import { combatSeeds, combatStream, mapRng, runStream } from './streams.ts'
import type { CardInstance, CombatState, RunState } from './types.ts'

const NOW = '2026-10-18T00:00:00.000Z'
const daily = (): RunState => {
  const run = startAct(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, daily: '2026-10-18', now: NOW }, C), C)
  run.screen = { kind: 'map' }
  return run
}
const fightAt = (run: RunState, encounterId: string): CombatState => {
  const first = reachableNodes(run)[0] as string
  Object.assign(run.map.nodes[first] as object, { kind: 'combat', encounterId })
  const next = enterNode(run, first, C)
  assert.equal(next.screen.kind, 'combat')
  return (next.screen as Extract<RunState['screen'], { kind: 'combat' }>).combat
}
const ids = (cards: readonly CardInstance[]): string => cards.map((c) => c.uid).join(' ')

test('streams: a new run carries named streams; every act map and fight derive from the seed alone', () => {
  const a = daily()
  const b = daily()
  assert.deepEqual(a.streams, {})
  generateShop(b, C) // B opens a shop (and rolls its stock) before anything else
  for (const act of [2, 3] as const) {
    assert.deepEqual(generateActMap(act, mapRng(b, act), C), generateActMap(act, mapRng(a, act), C), `act ${act} map`)
  }
  const ca = fightAt(a, 'a1_n1_cover')
  const cb = fightAt(b, 'a1_n1_cover')
  assert.equal(ids(cb.hand), ids(ca.hand), 'same node + encounter → same opening hand')
  assert.equal(ids(cb.draw), ids(ca.draw))
  assert.deepEqual(cb.units.map((u) => u.intent), ca.units.map((u) => u.intent), 'same telegraphs')
})

test('streams: one system rolling never moves another system’s stream', () => {
  const base = daily()
  const reward = (run: RunState): number[] => {
    const h = runStream(run, 'reward')
    return [rand(h), rand(h), rand(h)]
  }
  const touched = structuredClone(base)
  const shop = runStream(touched, 'shop')
  for (let i = 0; i < 25; i++) rand(shop)
  assert.deepEqual(reward(touched), reward(structuredClone(base)))
  // …but a stream does advance across rolls at one node, and ticks the UI change key.
  const run = structuredClone(base)
  const tick = run.rng
  const h = runStream(run, 'event')
  assert.notEqual(rand(h), rand(h))
  assert.equal(run.rng, (tick + 2) >>> 0)
})

test('streams: a save mid-node resumes the same rolls; entering a node starts fresh streams', () => {
  const run = daily()
  const h = runStream(run, 'crpg')
  rand(h)
  rand(h)
  const restored = JSON.parse(JSON.stringify(run)) as RunState
  assert.equal(rand(runStream(restored, 'crpg')), rand(runStream(run, 'crpg')))
  const first = reachableNodes(run)[0] as string
  Object.assign(run.map.nodes[first] as object, { kind: 'rest' })
  const moved = enterNode(run, first, C)
  assert.deepEqual(moved.streams, {})
})

test('streams: draw pile and enemy AI are separate inside a fight', () => {
  const c = fightAt(daily(), 'a1_n1_cover')
  assert.ok(c.streams)
  const shuffleBefore = c.streams.shuffle
  const enemy = c.units.find((u) => u.side === 'enemy')
  assert.ok(enemy)
  for (let i = 0; i < 5; i++) planIntent(c, C, enemy, true) // enemy planning burns AI noise only
  assert.equal(c.streams.shuffle, shuffleBefore)
})

test('streams: a reshuffle depends on what the discard holds, not the order it was played in', () => {
  const c = fightAt(daily(), 'a1_n1_cover')
  const pile = [...c.hand, ...c.draw]
  const reshuffled = (order: CardInstance[]): string => {
    const x = structuredClone(c)
    x.hand = []
    x.draw = []
    x.discard = structuredClone(order)
    drawCards(x, pile.length)
    return ids(x.hand)
  }
  assert.equal(reshuffled([...pile].reverse()), reshuffled(pile))
})

test('streams: saves from before streams keep the single shared stream, roll for roll', () => {
  const legacy = daily()
  delete legacy.streams
  assert.equal(runStream(legacy, 'reward'), legacy, 'node streams fall back to the run itself')
  assert.equal(mapRng(legacy, 2), legacy)
  const seeds = combatSeeds(legacy, 'a1_n1_cover')
  assert.equal(seeds.rng, hashSeed(`${legacy.rng}|a1_n1_cover`))
  assert.equal(seeds.streams, undefined)
  const c = startCombat(legacy, 'a1_n1_cover', C)
  assert.equal(c.streams, undefined)
  assert.equal(combatStream(c, 'shuffle'), c)
  // A legacy reshuffle keeps discard order: a reversed discard gives a different pile.
  const pile = [...c.hand, ...c.draw]
  const reshuffled = (order: CardInstance[]): string => {
    const x = structuredClone(c)
    x.hand = []
    x.draw = []
    x.discard = structuredClone(order)
    drawCards(x, pile.length)
    return ids(x.hand)
  }
  assert.notEqual(reshuffled([...pile].reverse()), reshuffled(pile))
})
