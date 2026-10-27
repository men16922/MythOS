// Stun (owner request 2026-10-27): wall-bump stuns and companion ultimates on the Momentum gauge.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { burstReady, canPlay, endTurn, fireBurst, legalMoves, startCombat, ultimatesReady } from './combat.ts'
import { FIXTURE, aim, makeRun, place, setHand, unit } from './combat.fixture.test.ts'
import { MOMENTUM_MAX, addStatus, pushUnit } from './effects.ts'
import type { ContentRegistry } from './types.ts'

const C: ContentRegistry = {
  ...FIXTURE,
  companions: {
    ...FIXTURE.companions,
    se_rin: {
      ...FIXTURE.companions.se_rin!,
      ultimate: { name: { ko: '궁', en: 'Ult' }, text: { ko: '', en: '' }, effects: [{ kind: 'status', status: 'stun', amount: 1, to: 'all_enemies' }] },
    },
  },
}

test('stun: a wall bump stuns the pushed enemy, cancels its telegraph and never stacks', () => {
  const c = startCombat(makeRun(), 'duel', C)
  const e = unit(c, 'e1')
  place(c, 'e1', { x: 6, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  pushUnit(c, C, e, 'right', 1, undefined, 0, true)
  assert.equal(e.statuses.stun, 1)
  assert.equal(e.intent, null, 'telegraph cancelled on the spot')
  assert.ok(c.events.some((x) => x.t === 'fizzle' && x.uid === 'e1'))
  addStatus(c, e, 'stun', 1)
  assert.equal(e.statuses.stun, 1, 'no stacking')
})

test('stun: a push that bumps nothing does not stun', () => {
  const c = startCombat(makeRun(), 'duel', C)
  place(c, 'e1', { x: 4, y: 2 })
  pushUnit(c, C, unit(c, 'e1'), 'right', 1, undefined, 0, true)
  assert.equal(unit(c, 'e1').statuses.stun, undefined)
})

test('stun: a normal enemy sits out a whole enemy turn; an elite re-telegraphs at its end', () => {
  let c = startCombat(makeRun(), 'duel', C)
  place(c, 'e1', { x: 5, y: 2 })
  const pos = { ...unit(c, 'e1').pos }
  addStatus(c, unit(c, 'e1'), 'stun', 1)
  c = endTurn(c, C)
  assert.deepEqual(unit(c, 'e1').pos, pos, 'did not move')
  assert.equal(unit(c, 'e1').intent, null, 'no new telegraph')
  assert.equal(unit(c, 'e1').statuses.stun, undefined, 'stun wore off')
  c = endTurn(c, C)
  assert.ok(unit(c, 'e1').intent, 'telegraphs again a turn later')

  let el = startCombat(makeRun(), 'elite', C)
  addStatus(el, unit(el, 'e1'), 'stun', 1)
  assert.equal(unit(el, 'e1').intent, null)
  el = endTurn(el, C)
  assert.ok(unit(el, 'e1').intent, 'elites shake it off at the end of the phase')
})

test('stun: a stunned party unit can neither move nor play cards', () => {
  const c = startCombat(makeRun(), 'duel', C)
  setHand(c, ['strike'])
  addStatus(c, unit(c, 'connector'), 'stun', 1)
  assert.deepEqual(legalMoves(c, 'connector'), [])
  assert.equal(canPlay(c, C, 'h1', 'connector').ok, false)
  const next = endTurn(c, C)
  assert.equal(unit(next, 'connector').statuses.stun, undefined, 'wears off at turn end')
})

test('companion ultimate: offered on a full gauge next to the Burst, fired from the companion, once per fight', () => {
  const c = startCombat(makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }] }), 'pair', C)
  assert.deepEqual(ultimatesReady(c, C), [])
  c.momentum = MOMENTUM_MAX
  const offers = ultimatesReady(c, C)
  assert.equal(offers.length, 1)
  const uid = offers[0]!.uid
  const after = fireBurst(c, C, uid)
  assert.ok(after.events.some((x) => x.t === 'burst' && x.companion === 'se_rin'))
  for (const e of after.units.filter((u) => u.side === 'enemy')) assert.equal(e.statuses.stun, 1)
  assert.equal(after.burstUsed, true)
  after.momentum = MOMENTUM_MAX
  assert.deepEqual(ultimatesReady(after, C), [])
  assert.equal(burstReady(after, C), undefined, 'the gauge is shared')
  assert.throws(() => fireBurst(after, C, uid))
})

test('content: Concussion Kick into the board edge stuns; every companion has an ultimate', async () => {
  const { CONTENT } = await import('../content/index.ts')
  const { newProfile } = await import('./meta.ts')
  const { newRun } = await import('./run.ts')
  const { playCard } = await import('./combat.ts')
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 1, now: '2026-10-27T00:00:00.000Z' }, CONTENT)
  const c = startCombat(run, 'a1_n1_cover', CONTENT)
  c.units = c.units.filter((u) => u.side !== 'enemy' || u === c.units.find((x) => x.side === 'enemy'))
  const foe = c.units.find((u) => u.side === 'enemy')!
  foe.pos = { x: 6, y: 2 }
  unit(c, 'connector').pos = { x: 5, y: 2 }
  for (const u of c.units) if (u.side === 'party' && u.uid !== 'connector') u.pos = { x: 0, y: u === c.units[1] ? 0 : 4 }
  c.hand = [{ uid: 'k1', defId: 'concussion_kick', upgraded: false }]
  c.energy = 3
  const after = playCard(c, CONTENT, 'k1', 'connector', { pos: { x: 6, y: 2 } })
  const f = after.units.find((u) => u.uid === foe.uid)
  assert.ok(f && f.hp > 0, 'survives the kick')
  assert.equal(f.statuses.stun, 1)
  for (const comp of Object.values(CONTENT.companions)) assert.ok(comp.ultimate, `${comp.id} has an ultimate`)
})
