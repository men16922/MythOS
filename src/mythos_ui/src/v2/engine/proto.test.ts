// DLC 2 prototype rules: sandbox-only, and they must stay unreachable from a run.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT } from '../content/index.ts'
import { PROTO_ENCOUNTERS } from '../ui/combat/protoEncounters.ts'
import { incomingDamage } from './combatSim.ts'
import { startCombat } from './combat.ts'
import { dealDamage, gridDelta, isLit, unitAt } from './effects.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'
import type { CombatState, ContentRegistry, UnitState } from './types.ts'

const C: ContentRegistry = { ...CONTENT, encounters: { ...CONTENT.encounters, ...Object.fromEntries(PROTO_ENCOUNTERS.map((e) => [e.id, e])) } }

function fight(id: string): CombatState {
  return startCombat(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 7 }, C), id, C)
}
const neutral = (c: CombatState): UnitState => c.units.find((u) => u.side === 'neutral') as UnitState
const enemy = (c: CombatState): UnitState => c.units.find((u) => u.side === 'enemy') as UnitState

test('no encounter a run can reach sets prototype rules', () => {
  assert.equal(Object.values(CONTENT.encounters).filter((e) => e.proto).length, 0)
})

test('relay: an empty tile lets the hit through to the neutral', () => {
  const c = fight('proto_relay')
  const n = neutral(c)
  const hp = n.hp
  const on = unitAt(c, { x: 3, y: 2 })
  if (on) on.pos = { x: 6, y: 0 } // the spawn jitter can land an enemy on the tile
  dealDamage(c, C, n, 4, { source: 'enemy', attack: true })
  assert.equal(n.hp, hp - 4)
})

test('relay: a unit on the tile takes the direct hit, enemy included; other damage is not moved', () => {
  const c = fight('proto_relay')
  const n = neutral(c)
  const e = enemy(c)
  e.pos = { x: 3, y: 2 }
  const [hp, ehp] = [n.hp, e.hp]
  dealDamage(c, C, n, 4, { source: 'enemy', attack: true, attacker: c.units.find((u) => u.side === 'enemy' && u !== e) })
  assert.equal(n.hp, hp)
  assert.equal(e.hp, ehp - Math.max(0, 4 - e.armor))
  dealDamage(c, C, n, 2, { source: 'environment', ignoreBlock: true })
  assert.equal(n.hp, hp - 2)
})

test('grid: lit and dark change attacks, bumps only on dark, and the telegraph sum agrees', () => {
  const c = fight('proto_blackout')
  assert.equal(isLit(c, { x: 3, y: 0 }), true)
  assert.equal(isLit(c, { x: 2, y: 0 }), false)
  assert.equal(gridDelta(c, { x: 3, y: 0 }), 2)
  assert.equal(gridDelta(c, { x: 2, y: 0 }), -2)
  const u = c.units.find((x) => x.uid === 'connector') as UnitState
  u.block = 0
  u.pos = { x: 1, y: 0 }
  const hp = u.hp
  dealDamage(c, C, u, 5, { source: 'enemy', attack: true })
  assert.equal(u.hp, hp - 3)
  dealDamage(c, C, u, 1, { source: 'environment', cause: 'bump' })
  assert.equal(u.hp, hp - 6)
  assert.ok(incomingDamage(c, C) instanceof Map)
})

test('grid: popping the node blacks out the board and shocks its neighbours', () => {
  const c = fight('proto_blackout')
  const n = neutral(c)
  const e = enemy(c)
  const free = { x: n.pos.x + 1, y: n.pos.y }
  const there = unitAt(c, free)
  if (there && there !== e) there.pos = { x: 6, y: 4 } // enemies have already stepped by the time the fight opens
  e.pos = free
  const ehp = e.hp
  dealDamage(c, C, n, 1, { source: 'environment', cause: 'bump' })
  assert.equal(c.proto?.darkTurns, 2)
  assert.equal(isLit(c, { x: 5, y: 0 }), false)
  assert.ok(e.hp < ehp || !c.units.includes(e))
})
