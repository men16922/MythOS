// Outside the List (DLC 2): the route must open only after an escape, stay off dailies and the map rolls, and end once.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { startCombat } from './combat.ts'
import { mapEncounters } from './map.ts'
import { newProfile } from './meta.ts'
import { enterNode, newRun, updateCombat } from './run.ts'
import type { MetaProfile, RunState } from './types.ts'

const won: MetaProfile = { ...newProfile('t'), wins: 1 }

function winFight(r: RunState, id: string, saved: boolean): RunState {
  const combat = startCombat(r, id, C)
  combat.phase = 'won'
  if (combat.bonus) combat.bonus.failed = !saved
  r.screen = { kind: 'combat', combat, nodeKind: 'combat' }
  return updateCombat(r, combat, C)
}

function onNode(r: RunState, kind: 'combat' | 'rest'): RunState {
  const id = 'n_test'
  r.map.nodes[id] = { id, row: 0, col: 0, kind, next: [] } as RunState['map']['nodes'][string]
  r.map.startIds = [id]
  r.visited = []
  r.nodeId = null
  r.screen = { kind: 'map' }
  return enterNode(r, id, C)
}

test('the route opens with the first escape and never on a daily', () => {
  assert.equal(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 1 }, C).flags.outside_open, undefined)
  assert.equal(newRun(won, { archetype: 'ghost', paradox: 0, seed: 1 }, C).flags.outside_open, 1)
  assert.equal(newRun(won, { archetype: 'ghost', paradox: 0, seed: 1, daily: '2026-10-31' }, C).flags.outside_open, undefined)
})

test('its fights are never rolled onto a map', () => {
  assert.equal(mapEncounters(2, 'normal', C).some((e) => e.id.startsWith('outside_')), false)
})

test('winning chains the next plain fight; the last safehouse closes the route once', () => {
  let r = newRun(won, { archetype: 'ghost', paradox: 0, seed: 3 }, C)
  r.act = 2
  r.flags.outside = 1
  r = winFight(r, 'outside_serving', true)
  assert.equal(r.relayNext, 'outside_pickup')
  r = onNode(r, 'combat')
  assert.equal(r.screen.kind === 'combat' && r.screen.combat.encounterId, 'outside_pickup')
  assert.equal(r.relayNext, undefined)
  r = winFight(r, 'outside_pickup', true)
  assert.equal(r.flags.outside_saved, 2)
  r = onNode(r, 'rest')
  assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_last_meal_kept')
  assert.equal(r.relayNext, undefined)
  assert.equal(onNode(r, 'rest').screen.kind, 'rest')
})

test('losing the citizens changes the ending, not the pay', () => {
  let r = newRun(won, { archetype: 'ghost', paradox: 0, seed: 3 }, C)
  r.act = 2
  r.flags.outside = 1
  r = winFight(r, 'outside_serving', false)
  r = onNode(r, 'rest')
  assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_last_meal_lost')
  const heal = (id: string) => C.events[id]?.options[0]?.success.effects
  assert.deepEqual(heal('outside_last_meal_kept'), heal('outside_last_meal_lost'))
})
