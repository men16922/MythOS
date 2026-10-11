// Ground effects: burning ground (ignite), temporary hazards (electrify), area events and damage causes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AreaShape, CombatState, Pos } from './types.ts'
import { endTurn, legalMoves, moveUnit, startCombat, threatMap } from './combat.ts'
import { FIRE_BURN, applyEffects, pushUnit } from './effects.ts'
import { FIXTURE as C, makeRun, place, silence, unit } from './combat.fixture.test.ts'

const fresh = (id = 'duel'): CombatState => startCombat(makeRun(), id, C)

function ignite(c: CombatState, at: Pos, turns = 2, area?: AreaShape): void {
  applyEffects(c, C, [area ? { kind: 'ignite', turns, area } : { kind: 'ignite', turns }], { side: 'party', impact: at, tiles: [at], source: 'party' })
}

test('ignite burns the footprint (never cover or void) and emits one fire area event', () => {
  // terrain: cover (3,0) (1,2), void (4,4), hazard (3,3)
  const c = fresh('terrain')
  c.events = []
  ignite(c, { x: 3, y: 1 }, 2, 'cross')
  assert.equal(c.tiles[0]?.[3]?.fire, undefined, 'cover does not burn')
  for (const p of [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 4, y: 1 }]) assert.equal(c.tiles[p.y]?.[p.x]?.fire, 2)
  const areas = c.events.filter((e) => e.t === 'area')
  assert.equal(areas.length, 1)
  assert.equal(areas[0]?.t === 'area' && areas[0].element, 'fire')
  assert.equal(c.events.filter((e) => e.t === 'fire').length, 4)

  ignite(c, { x: 4, y: 4 })
  assert.equal(c.tiles[4]?.[4]?.fire, undefined, 'void does not burn')
})

test('a unit pushed or moved into fire catches fire', () => {
  const c = fresh()
  silence(c)
  place(c, 'e1', { x: 4, y: 2 })
  ignite(c, { x: 5, y: 2 })
  pushUnit(c, C, unit(c, 'e1'), 'right', 1)
  assert.deepEqual(unit(c, 'e1').pos, { x: 5, y: 2 })
  assert.equal(unit(c, 'e1').statuses.burn, FIRE_BURN)

  const target = legalMoves(c, 'connector')[0]
  assert.ok(target)
  ignite(c, target)
  const moved = moveUnit(c, C, 'connector', target)
  assert.equal(unit(moved, 'connector').statuses.burn, FIRE_BURN)
})

test('standing in fire at the end of the enemy phase burns right away; the fire burns down', () => {
  const c = fresh()
  silence(c)
  const conn = unit(c, 'connector')
  ignite(c, conn.pos, 1)
  const hp = conn.hp
  const after = endTurn(c, C)
  assert.equal(unit(after, 'connector').hp, hp - FIRE_BURN, 'Burn 2 gained and ticked the same phase')
  assert.equal(unit(after, 'connector').statuses.burn, FIRE_BURN - 1)
  assert.equal(after.tiles[conn.pos.y]?.[conn.pos.x]?.fire, undefined, 'a 1-turn fire is out')
  assert.ok(after.events.some((e) => e.t === 'fire' && e.turns === 0))
  assert.ok(after.events.some((e) => e.t === 'damage' && e.uid === 'connector' && e.cause === 'burn'))
})

test('fire shows on the threat map and grounded enemies path around it', () => {
  const c = fresh()
  const conn = unit(c, 'connector')
  ignite(c, conn.pos, 2, 'square')
  assert.ok((threatMap(c, C)[`${conn.pos.x},${conn.pos.y}`] ?? 0) >= FIRE_BURN)
  silence(c)
  const after = endTurn(c, C)
  const e = unit(after, 'e1')
  assert.equal((after.tiles[e.pos.y]?.[e.pos.x]?.fire ?? 0) > 0, false, 'the grunt does not stop in the fire')
})

test('electrify turns floor into a temporary hazard that reverts; authored hazards stay', () => {
  const c = fresh('terrain')
  silence(c)
  applyEffects(c, C, [{ kind: 'electrify', turns: 1, area: 'cross' }], { side: 'party', impact: { x: 3, y: 2 }, tiles: [{ x: 3, y: 2 }], source: 'party' })
  assert.equal(c.tiles[2]?.[3]?.kind, 'hazard')
  assert.equal(c.tiles[2]?.[3]?.ttl, 1)
  assert.equal(c.tiles[3]?.[3]?.ttl, undefined, 'the authored hazard is untouched')
  assert.ok(c.events.some((e) => e.t === 'area' && e.element === 'shock'))
  const after = endTurn(c, C)
  assert.equal(after.tiles[2]?.[3]?.kind, 'floor')
  assert.equal(after.tiles[3]?.[3]?.kind, 'hazard')
})

test('bump damage is tagged so the board can show the slam', () => {
  const c = fresh()
  silence(c)
  place(c, 'e1', { x: 6, y: 2 })
  c.events = []
  pushUnit(c, C, unit(c, 'e1'), 'right', 1)
  const hit = c.events.find((e) => e.t === 'damage' && e.uid === 'e1')
  assert.ok(hit && hit.t === 'damage' && hit.cause === 'bump')
  assert.ok(c.events.some((e) => e.t === 'push' && e.bumped === 'wall'))
})

test('a live wire announces its countdown; chipped cover announces its hp', () => {
  const c = fresh('terrain')
  silence(c)
  applyEffects(c, C, [{ kind: 'electrify', turns: 2 }], { side: 'party', impact: { x: 2, y: 2 }, tiles: [{ x: 2, y: 2 }], source: 'party' })
  const after = endTurn(c, C)
  assert.ok(after.events.some((e) => e.t === 'ttl' && e.pos.x === 2 && e.pos.y === 2 && e.turns === 1))
  assert.equal(after.tiles[2]?.[2]?.ttl, 1)

  c.events = []
  applyEffects(c, C, [{ kind: 'damage', amount: 3 }], { side: 'party', impact: { x: 3, y: 0 }, tiles: [{ x: 3, y: 0 }], source: 'party' })
  assert.ok(c.events.some((e) => e.t === 'cover' && e.hp === 1), 'cover (2 hp) chipped to 1')
})
