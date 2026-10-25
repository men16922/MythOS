// Action layer (DLC plan §17.3): Chain (X1), Momentum + Signal Burst (X2), Riposte (X3).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { burstReady, endTurn, startCombat, fireBurst } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { MOMENTUM_KILL, MOMENTUM_MAX, MOMENTUM_TURN, RIPOSTE_DAMAGE, addStatus, dealDamage, killUnit } from './effects.ts'
import type { ContentRegistry } from './types.ts'

const C: ContentRegistry = {
  ...FIXTURE,
  archetypes: {
    ...FIXTURE.archetypes,
    ghost: {
      ...(FIXTURE.archetypes.ghost ?? Object.values(FIXTURE.archetypes)[0]!),
      id: 'ghost',
      burst: { name: { ko: '버스트', en: 'Burst' }, text: { ko: '', en: '' }, effects: [{ kind: 'damage', amount: 5, to: 'all_enemies' }] },
    },
  },
}

test('kills fill Momentum; 2 kills in one player turn chain into a draw, 3 into +1 energy', () => {
  const c = startCombat(makeRun({ archetype: 'ghost' }), 'pair', C)
  const [a, b] = c.units.filter((u) => u.side === 'enemy')
  const hand = c.hand.length
  const energy = c.energy
  a!.lastHitBy = 'party'
  b!.lastHitBy = 'party'
  killUnit(c, C, a!, 'damage')
  assert.equal(c.momentum, MOMENTUM_KILL)
  assert.equal(c.hand.length, hand, 'one kill is not a chain')
  killUnit(c, C, b!, 'damage')
  assert.ok(c.events.some((e) => e.t === 'chain' && e.n === 2))
  assert.equal(c.hand.length, Math.min(10, hand + 1), '2-chain draws a card')
  assert.equal(c.energy, energy)
})

test('Momentum builds each later turn, caps at the max, and the Burst fires once from the connector', () => {
  let c = startCombat(makeRun({ archetype: 'ghost' }), 'pair', C)
  assert.equal(c.archetype, 'ghost')
  c = endTurn(c, C)
  assert.equal(c.momentum, MOMENTUM_TURN, 'turn 2 starts with turn Momentum')
  assert.equal(burstReady(c, C), undefined)
  c.momentum = MOMENTUM_MAX
  assert.ok(burstReady(c, C))
  const hp = c.units.filter((u) => u.side === 'enemy').map((u) => u.hp)
  const after = fireBurst(c, C)
  assert.ok(after.events.some((e) => e.t === 'burst' && e.archetype === 'ghost'))
  assert.deepEqual(
    after.units.filter((u) => u.side === 'enemy').map((u) => u.hp),
    hp.map((h) => Math.max(0, h - 5)),
  )
  assert.equal(after.burstUsed, true)
  assert.equal(after.momentum, 0)
  after.momentum = MOMENTUM_MAX
  assert.equal(burstReady(after, C), undefined, 'once per fight')
  assert.throws(() => fireBurst(after, C))
})

test('Riposte: an Evade graze on the connector cuts a melee attacker back', () => {
  const c = startCombat(makeRun(), 'duel', C)
  const conn = c.units.find((u) => u.uid === 'connector')!
  const foe = c.units.find((u) => u.side === 'enemy')!
  conn.block = 0
  addStatus(c, conn, 'evade', 1)
  const foeHp = foe.hp
  dealDamage(c, C, conn, 6, { source: 'enemy', attacker: foe, attack: true, melee: true })
  assert.equal(foe.hp, foeHp - RIPOSTE_DAMAGE)
  // A ranged hit grazes but never ripostes.
  addStatus(c, conn, 'evade', 1)
  dealDamage(c, C, conn, 6, { source: 'enemy', attacker: foe, attack: true })
  assert.equal(foe.hp, foeHp - RIPOSTE_DAMAGE)
})

test('Ground jolt: shoved onto fire or dragged off a hazard, a unit takes that ground\'s hit once', async () => {
  const { pushUnit, FIRE_BURN, HAZARD_DAMAGE } = await import('./effects.ts')
  const c = startCombat(makeRun(), 'duel', C)
  const foe = c.units.find((u) => u.side === 'enemy')!
  foe.pos = { x: 4, y: 2 }
  foe.block = 0
  foe.armor = 0
  // onto fire: an immediate burn hit (and it catches fire)
  c.tiles[2]![5]!.fire = 2
  let hp = foe.hp
  pushUnit(c, C, foe, 'right', 1)
  assert.equal(foe.pos.x, 5)
  assert.equal(hp - foe.hp, FIRE_BURN)
  assert.ok((foe.statuses.burn ?? 0) >= FIRE_BURN)
  // off a hazard onto safe ground: the hazard hit once
  c.tiles[2]![5]!.fire = 0
  c.tiles[2]![5]!.kind = 'hazard'
  c.tiles[2]![4]!.kind = 'floor'
  hp = foe.hp
  pushUnit(c, C, foe, 'left', 1)
  assert.equal(foe.pos.x, 4)
  assert.equal(hp - foe.hp, HAZARD_DAMAGE)
})
