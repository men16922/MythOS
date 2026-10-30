// Forbidden implants (engine/implantRules.ts): every rule fires, shows in the preview path, and costs what it says.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT } from '../content/index.ts'
import { canPlay, connectorOf, endTurn, playCard, previewPlay, startCombat, selectableTargets } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { gainMomentum, killUnit, pushUnit } from './effects.ts'
import { effectiveIntentDamage } from './intents.ts'
import { implantRules } from './implantRules.ts'
import type { ContentRegistry, ImplantDef, ImplantRules } from './types.ts'

const implant = (id: string, rules: ImplantRules, extra: Partial<ImplantDef> = {}): ImplantDef => ({
  id,
  name: { ko: id, en: id },
  text: { ko: id, en: id },
  rarity: 'boss',
  icon: '',
  rules,
  ...extra,
})

const withRule = (rules: ImplantRules, extra: Partial<ImplantDef> = {}): ContentRegistry => ({
  ...FIXTURE,
  implants: { ...FIXTURE.implants, rule: implant('rule', rules, extra) },
})

const fight = (C: ContentRegistry, deck?: string[], enc = 'duel') => startCombat(makeRun({ implants: ['rule'] }, deck), enc, C)

test('rules of several implants add up, and none is the empty rule set', () => {
  const C: ContentRegistry = {
    ...FIXTURE,
    implants: { ...FIXTURE.implants, a: implant('a', { pushBonus: 1, keepBlock: true }), b: implant('b', { pushBonus: 2 }) },
  }
  assert.deepEqual(implantRules({ implants: ['a', 'b'] }, C), { pushBonus: 3, keepBlock: true })
  assert.deepEqual(implantRules({ implants: [] }, C), {})
})

test('Chain Reactor: a bump pushes the unit it hit on, allies included', () => {
  const C = withRule({ pushChain: true })
  const c = fight(C)
  const foe = c.units.find((u) => u.side === 'enemy')!
  const ally = connectorOf(c)!
  foe.pos = { x: 2, y: 2 }
  ally.pos = { x: 3, y: 2 }
  pushUnit(c, C, foe, 'right', 1)
  assert.equal(ally.pos.x, 4, 'the connector was shoved along')
})

test('Weightless Rig: pushes go further and throw the pusher back', () => {
  const C: ContentRegistry = {
    ...withRule({ pushBonus: 1, pushRecoil: 1 }),
    cards: {
      ...FIXTURE.cards,
      shove: {
        id: 'shove', name: { ko: 's', en: 's' }, text: { ko: 's', en: 's' }, type: 'attack', rarity: 'common', owner: 'any', cost: 1,
        target: { mode: 'melee' }, effects: [{ kind: 'push', distance: 1 }],
      } as ContentRegistry['cards'][string],
    },
  }
  const c = fight(C, ['shove', 'shove', 'shove', 'shove', 'shove'])
  const foe = c.units.find((u) => u.side === 'enemy')!
  const me = connectorOf(c)!
  me.pos = { x: 3, y: 2 }
  foe.pos = { x: 4, y: 2 }
  c.units = c.units.filter((u) => u.side === 'enemy' ? u === foe : u === me)
  const card = c.hand[0]!
  const target = selectableTargets(c, C, card.uid, 'connector').find((o) => o.pos?.x === 4)!
  const after = playCard(c, C, card.uid, 'connector', target)
  assert.equal(after.units.find((u) => u.uid === foe.uid)!.pos.x, 6, 'pushed 2 tiles')
  assert.equal(after.units.find((u) => u.uid === me.uid)!.pos.x, 2, 'thrown back 1 tile')
})

test('Black Pact: double Momentum, and the HP cost at the start of a fight is never lethal', () => {
  const C = withRule({ momentumBonus: 1, openLoseHp: 3 })
  const c = fight(C)
  gainMomentum(c, C, 10)
  assert.equal(c.momentum, 20)
  const plain = startCombat(makeRun(), 'duel', FIXTURE)
  assert.equal(connectorOf(c)!.hp, connectorOf(plain)!.hp - 3)
  const low = startCombat(makeRun({ implants: ['rule'], hp: 2 }), 'duel', C)
  assert.equal(connectorOf(low)!.hp, 1)
})

test('Overload Buffer: each card held beyond 3 costs the Connector 1, through block', () => {
  const C = withRule({ handBurn: 1 })
  const c = fight(C)
  const me = connectorOf(c)!
  me.block = 50
  const hand = c.hand.length - 3
  assert.ok(hand > 0)
  const hp = me.hp
  const after = endTurn(c, C)
  const lost = after.events.filter((e) => e.t === 'damage' && e.uid === 'connector' && e.source === 'environment')
  assert.equal(lost[0]?.t === 'damage' ? lost[0].amount : 0, hand)
  assert.ok(connectorOf(after)!.hp <= hp - hand)
})

test('Glass Circuit: the enemy bonus reaches the telegraphed number', () => {
  const C = withRule({ enemyAttackBonus: 1, attackBonus: 2 })
  const plain = startCombat(makeRun(), 'duel', FIXTURE)
  const c = fight(C)
  const foe = (s: typeof c) => s.units.find((u) => u.side === 'enemy')!
  const move = { damage: 3 } as Parameters<typeof effectiveIntentDamage>[1]
  assert.equal(effectiveIntentDamage(foe(c), move), effectiveIntentDamage(foe(plain), move) + 1)
})

test('Glass Circuit: the attack bonus is in the card preview and in the real hit', () => {
  const C = withRule({ attackBonus: 2 })
  const c = fight(C)
  const me = connectorOf(c)!
  const foe = c.units.find((u) => u.side === 'enemy')!
  foe.pos = { x: me.pos.x + 1, y: me.pos.y }
  foe.armor = 0
  const card = c.hand.find((k) => C.cards[k.defId]?.type === 'attack')!
  const target = selectableTargets(c, C, card.uid, 'connector').find((o) => o.pos?.x === foe.pos.x && o.pos?.y === foe.pos.y)!
  const hp = foe.hp
  const shown = previewPlay(c, C, card.uid, 'connector', target).units.find((u) => u.uid === foe.uid)!
  const after = playCard(c, C, card.uid, 'connector', target)
  assert.equal(hp - after.units.find((u) => u.uid === foe.uid)!.hp, hp - shown.hpAfter)
})

test('Empty-Handed: the last card refills the hand, twice a turn at most', () => {
  const C = withRule({ emptyHandDraw: 4 })
  let c = fight(C, ['barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier'])
  c.energy = 20
  let refills = 0
  for (let guard = 0; c.hand.length > 0 && guard < 30; guard++) {
    const card = c.hand[0]!
    const before = c.hand.length
    const options = selectableTargets(c, C, card.uid, 'connector')
    c = playCard(c, C, card.uid, 'connector', options[0] ?? {})
    if (before === 1 && c.hand.length === 4) refills += 1
  }
  assert.equal(refills, 2)
  assert.equal(c.hand.length, 0)
})

test('Pyre Protocol: a dead enemy leaves its tile burning', () => {
  const C = withRule({ killFire: 2 })
  const c = fight(C)
  const foe = c.units.find((u) => u.side === 'enemy')!
  foe.pos = { x: 4, y: 2 }
  killUnit(c, C, foe, 'damage')
  assert.equal(c.tiles[2]![4]!.fire, 2)
})

test('Hollow World: cover starts the fight as void', () => {
  const C = withRule({ coverToVoid: true })
  const enc = { ...FIXTURE.encounters.duel!, id: 'hollow', terrain: [{ pos: { x: 3, y: 2 }, kind: 'cover' as const }] }
  const X: ContentRegistry = { ...C, encounters: { ...C.encounters, hollow: enc } }
  assert.equal(startCombat(makeRun({ implants: ['rule'] }), 'hollow', X).tiles[2]![3]!.kind, 'void')
  assert.equal(startCombat(makeRun(), 'hollow', X).tiles[2]![3]!.kind, 'cover')
})

test('Standing Wall: block survives the turn', () => {
  const C = withRule({ keepBlock: true })
  const c = fight(C)
  connectorOf(c)!.block = 40
  c.units = c.units.map((u) => (u.side === 'enemy' ? { ...u, intent: undefined } : u))
  assert.ok(connectorOf(endTurn(c, C))!.block > 0)
})

test('Echo Wedge: the first card resolves twice, the fourth is refused', () => {
  const C = withRule({ echoFirstCard: true, cardLimit: 3 })
  let c = fight(C, ['barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier', 'barrier'])
  c.energy = 20
  const once = C.cards.barrier!.effects.find((e) => e.kind === 'block')
  const amount = once?.kind === 'block' ? once.amount : 0
  const play = () => {
    const card = c.hand[0]!
    c = playCard(c, C, card.uid, 'connector', selectableTargets(c, C, card.uid, 'connector')[0] ?? {})
  }
  play()
  assert.equal(connectorOf(c)!.block, amount * 2)
  play()
  assert.equal(connectorOf(c)!.block, amount * 3, 'only the first card echoes')
  play()
  assert.equal(canPlay(c, C, c.hand[0]!.uid, 'connector').ok, false)
})

test('Debt Clock: every third turn gives no energy', () => {
  const C = withRule({ drainTurn: 3 })
  let c = fight(C)
  const energies: number[] = [c.energy]
  for (let i = 0; i < 3 && c.phase === 'player'; i++) {
    c.units = c.units.map((u) => (u.side === 'enemy' ? { ...u, hp: 999 } : u))
    c = endTurn(c, C)
    energies.push(c.energy)
  }
  assert.equal(energies[2], 0, 'turn 3 has no energy')
  assert.equal(energies[3], c.maxEnergy)
})

test('content: twelve forbidden implants, each with a rule or a real cost, bilingual, offered by bosses', () => {
  const forbidden = ['chain_reactor', 'overload_buffer', 'black_pact', 'weightless_rig', 'glass_circuit', 'corpse_fuel', 'empty_handed', 'pyre_protocol', 'hollow_world', 'standing_wall', 'echo_wedge', 'debt_clock']
  for (const id of forbidden) {
    const def = CONTENT.implants[id]
    assert.ok(def, id)
    assert.equal(def.rarity, 'boss', id)
    assert.ok(def.text.ko.trim() && def.text.en.trim(), id)
    assert.ok(def.rules || def.passive, id)
  }
})
