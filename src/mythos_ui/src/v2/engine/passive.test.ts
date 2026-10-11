// Companion combat passives (content/companions.ts combatPassive) on the real content.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import type { CombatState, RunState } from './types.ts'
import { startCombat } from './combat.ts'
import { dealDamage, fireTrigger } from './effects.ts'
import { makeRun, unit } from './combat.fixture.test.ts'
import { newProfile } from './meta.ts'
import { generateShop, newRun } from './run.ts'

const DECK = ['packet_shot', 'packet_shot', 'packet_shot', 'covering_noise', 'covering_noise', 'shove', 'signal_step', 'repulse']

function withMate(id: string, over: Partial<RunState> = {}): CombatState {
  const def = C.companions[id]
  assert.ok(def)
  return startCombat(makeRun({ party: [{ id, hp: def.maxHp, maxHp: def.maxHp, bond: 0 }], ...over }, DECK), 'a1_n1_cover', C)
}

const passives = (c: CombatState, uid: string) => c.events.filter((e) => e.t === 'passive' && e.uid === uid).length

test('Tae-o starts every fight with Thorns 2 (and the board is told)', () => {
  const c = withMate('tae_o')
  assert.equal(unit(c, 'tae_o').statuses.thorns, 2)
  assert.ok(passives(c, 'tae_o') >= 1)
})

test('Kai marks a random enemy at the start of each player turn', () => {
  const c = withMate('kai')
  const marked = c.units.filter((u) => u.side === 'enemy' && (u.statuses.mark ?? 0) >= 2)
  assert.equal(marked.length, 1)
})

test('Su-ah forges an Echo Blade into the opening hand', () => {
  const c = withMate('su_ah')
  assert.ok(c.hand.some((k) => k.defId === 'echo_blade'))
})

test('owner-only passives fire for that companion only, once per turn', () => {
  const c = withMate('han')
  const hand = c.hand.length
  fireTrigger(c, C, 'play_tactic', undefined, 'connector')
  assert.equal(c.hand.length, hand, "the connector's tactic does not trigger Han")
  fireTrigger(c, C, 'play_tactic', undefined, 'han')
  assert.equal(c.hand.length, hand + 1, "Han's tactic draws 1")
  fireTrigger(c, C, 'play_tactic', undefined, 'han')
  assert.equal(c.hand.length, hand + 1, 'once per turn')
})

test('Lin Yue: every kill pays 3 credits, the first each turn also 1 energy', () => {
  const c = withMate('lin_yue')
  const credits = c.credits
  const energy = c.energy
  const foes = c.units.filter((u) => u.side === 'enemy')
  assert.ok(foes.length >= 2)
  for (const f of foes.slice(0, 2)) dealDamage(c, C, unit(c, f.uid), 999, { source: 'party' })
  const bounty = foes.slice(0, 2).reduce((s, f) => s + (C.enemies[f.defId]?.bounty ?? 0), 0)
  assert.equal(c.credits - credits, bounty + 6)
  assert.equal(c.energy - energy, 1)
})

test('a downed companion stops firing its passive', () => {
  const c = withMate('han')
  unit(c, 'han').hp = 0
  const hand = c.hand.length
  fireTrigger(c, C, 'play_tactic', undefined, 'han')
  assert.equal(c.hand.length, hand)
})

test('companion reward cards are offered only while that companion is in the party', () => {
  const base = newRun(newProfile('t'), { archetype: 'ghost', companion: null, paradox: 0 }, C)
  const offered = (party: RunState['party']) => {
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) {
      const r: RunState = { ...base, rng: 1000 + i * 7919, party }
      for (const s of generateShop(r, C).cards) seen.add(s.cardId)
    }
    return [...seen].filter((id) => C.cards[id]?.owner !== 'any' && C.cards[id]?.owner !== 'connector')
  }
  assert.deepEqual(offered([]), [], 'no companion cards without companions')
  const withKai = offered([{ id: 'kai', hp: 22, maxHp: 22, bond: 0 }])
  assert.ok(withKai.length > 0 && withKai.every((id) => C.cards[id]?.owner === 'kai'), `kai only: ${withKai.join(',')}`)
})
