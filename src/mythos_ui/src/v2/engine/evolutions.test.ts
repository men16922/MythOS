// Card evolutions (content/evolutions.ts) and the run's best turn.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { codexCardIds } from './bestiary.ts'
import { startCombat } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { dealDamage, killUnit, turnScore } from './effects.ts'
import { applyRunEnd, migrateProfile, newProfile } from './meta.ts'
import { enterNode, grantImplant, newRun, reachableNodes, startAct, updateCombat } from './run.ts'

const fresh = () => startAct(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 21, now: '2026-10-31T00:00:00.000Z' }, C), C)

test('content: twelve recipes on cards and implants that can really be held', () => {
  const list = Object.values(C.evolutions ?? {})
  assert.equal(list.length, 12)
  assert.equal(new Set(list.map((e) => e.card)).size, 12, 'one recipe per card')
  assert.equal(new Set(list.map((e) => e.implant)).size, 12, 'one recipe per implant')
  for (const e of list) {
    const base = C.cards[e.card]!
    const made = C.cards[e.id]!
    assert.ok(['starter', 'common', 'uncommon'].includes(base.rarity), e.id)
    assert.equal(base.pack, undefined, `${e.id}: base card always available`)
    assert.ok(['common', 'uncommon'].includes(C.implants[e.implant]!.rarity), e.id)
    assert.equal(C.implants[e.implant]!.pack, undefined, `${e.id}: implant always available`)
    assert.equal(made.rarity, 'special', 'never rolls on its own')
    assert.deepEqual(made.target, base.target, e.id)
    assert.equal(made.owner, base.owner, e.id)
    assert.ok(made.text.ko.trim() && made.text.en.trim(), e.id)
  }
  assert.ok(!codexCardIds(C).includes('wall_breaker'), 'evolved cards stay out of the card codex')
})

test('the implant turns a card already held, once, and the map says so until the next node', () => {
  const run = fresh()
  const copies = run.deck.filter((k) => k.defId === 'shove').length
  assert.ok(copies >= 1)
  const next = grantImplant(run, 'impact_frame', C)
  assert.equal(next.deck.filter((k) => k.defId === 'wall_breaker').length, 1)
  assert.equal(next.deck.filter((k) => k.defId === 'shove').length, copies - 1)
  assert.deepEqual(next.evolved, ['wall_breaker'])
  assert.deepEqual(next.evolvedNew, ['wall_breaker'])
  const moved = enterNode({ ...next, screen: { kind: 'map' } }, reachableNodes({ ...next, screen: { kind: 'map' } })[0]!, C)
  assert.equal(moved.evolvedNew, undefined)
})

test('a recipe needs both: an implant alone changes nothing, and one recipe fires once a run', () => {
  const run = fresh()
  const without = { ...run, deck: run.deck.filter((k) => k.defId !== 'shove') }
  const next = grantImplant(without, 'impact_frame', C)
  assert.equal(next.evolved, undefined)
  const twice = grantImplant(grantImplant(run, 'impact_frame', C), 'impact_frame', C)
  assert.equal(twice.deck.filter((k) => k.defId === 'wall_breaker').length, 1)
})

test('found evolutions reach the profile and survive a save', () => {
  const ended = { ...grantImplant(fresh(), 'impact_frame', C), screen: { kind: 'ended' as const, result: 'defeat' as const, endingId: 'ending_forced_erasure' } }
  const profile = applyRunEnd(newProfile('T'), ended, C)
  assert.deepEqual(profile.evolutions, ['wall_breaker'])
  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(profile))).evolutions, ['wall_breaker'])
})

test('best turn: damage and kills of one player turn add up, the bigger turn wins', () => {
  const c = startCombat(makeRun(), 'duel', FIXTURE)
  const foe = c.units.find((u) => u.side === 'enemy')!
  foe.hp = foe.maxHp = 100
  foe.armor = 0
  foe.block = 0
  dealDamage(c, FIXTURE, foe, 6, { source: 'party' })
  dealDamage(c, FIXTURE, foe, 4, { source: 'party' })
  assert.deepEqual(c.bestTurn, { turn: c.turn, damage: 10, kills: 0 })
  c.turn += 1
  dealDamage(c, FIXTURE, foe, 3, { source: 'party' })
  assert.equal(c.bestTurn?.damage, 10, 'a smaller later turn does not replace it')
  killUnit(c, FIXTURE, foe, 'damage')
  assert.equal(c.turnNow?.kills, 1)
  assert.equal(turnScore({ turn: 1, damage: 3, kills: 2 }), 15)
})

test('best turn: a kill during the enemy phase is not a player turn', () => {
  const c = startCombat(makeRun(), 'duel', FIXTURE) as ReturnType<typeof startCombat> & { inEnemyPhase?: boolean }
  const foe = c.units.find((u) => u.side === 'enemy')!
  c.inEnemyPhase = true
  killUnit(c, FIXTURE, foe, 'damage')
  assert.equal(c.turnNow, undefined)
})

test('the run keeps its biggest turn across fights', () => {
  const run = fresh()
  const enc = Object.values(C.encounters).find((e) => e.act === 1 && e.kind === 'normal')!.id
  const combat = startCombat(run, enc, C)
  const won = updateCombat({ ...run, screen: { kind: 'combat', combat, nodeKind: 'combat' } }, { ...combat, phase: 'won', bestTurn: { turn: 2, damage: 20, kills: 2 } }, C)
  assert.deepEqual(won.bestTurn, { turn: 2, damage: 20, kills: 2, encounterId: enc })
  const next = { ...won, screen: { kind: 'map' as const } }
  const small = startCombat(next, enc, C)
  const after = updateCombat({ ...next, screen: { kind: 'combat', combat: small, nodeKind: 'combat' } }, { ...small, phase: 'won', bestTurn: { turn: 1, damage: 5, kills: 0 } }, C)
  assert.equal(after.bestTurn?.damage, 20)
})
