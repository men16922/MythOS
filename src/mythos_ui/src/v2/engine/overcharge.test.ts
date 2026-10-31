// Overcharge: energy left at the end of a turn is lost unless an implant or a card keeps some of it.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { carriedEnergy, endTurn, playCard, startCombat } from './combat.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'
import type { CombatState } from './types.ts'

const fight = (implants: string[] = []): CombatState => {
  const c = startCombat(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 4 }, C), 'a1_n1_dodge', C)
  c.implants = [...c.implants, ...implants]
  return c
}
const hold = (c: CombatState, defId: string): string => {
  c.hand = [{ uid: 'probe', defId, upgraded: false }]
  return 'probe'
}

test('leftover energy is lost without help', () => {
  const c = fight()
  c.energy = 3
  assert.equal(carriedEnergy(c, C), 0)
  assert.equal(endTurn(c, C).energy, c.maxEnergy)
})

test('Surplus Capacitor keeps half, rounded down, at most 2', () => {
  for (const [left, kept] of [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [9, 2]] as const) {
    const c = fight(['surplus_capacitor'])
    c.energy = left
    assert.equal(carriedEnergy(c, C), kept, `${left} left`)
    assert.equal(endTurn(c, C).energy, c.maxEnergy + kept, `${left} left, next turn`)
  }
})

test('Bank Power keeps everything, for one turn only', () => {
  const c = fight()
  c.energy = 3
  const played = playCard(c, C, hold(c, 'bank_power'), 'connector', {})
  assert.equal(played.bankEnergy, true)
  const next = endTurn(played, C)
  assert.equal(next.energy, c.maxEnergy + 3)
  assert.equal(next.bankEnergy, undefined)
  next.energy = 2
  assert.equal(carriedEnergy(next, C), 0)
})

test('Discharge spends the rest of the energy for damage', () => {
  const c = fight()
  c.energy = 3
  const foe = c.units.find((u) => u.side === 'enemy' && u.hp > 0)!
  const me = c.units.find((u) => u.uid === 'connector')!
  me.pos = { x: foe.pos.x - 1, y: foe.pos.y }
  foe.block = 0
  foe.armor = 0
  foe.hp = 100
  const after = playCard(c, C, hold(c, 'discharge'), 'connector', { pos: foe.pos, dir: 'right' })
  assert.equal(after.energy, 0)
  const hit = after.units.find((u) => u.uid === foe.uid)!
  assert.ok(100 - hit.hp >= 3 + 2 * 4, `dealt ${100 - hit.hp}`)
})

test('Backdoor marks only the enemies it turns, never a squad member in the square', () => {
  const c = fight()
  const foes = c.units.filter((u) => u.side === 'enemy' && u.hp > 0)
  const me = c.units.find((u) => u.uid === 'connector')!
  const han = { ...me, uid: 'han', defId: 'han' }
  c.units.push(han)
  foes[0]!.pos = { x: 4, y: 2 }
  han.pos = { x: 4, y: 1 }
  me.pos = { x: 1, y: 2 }
  const after = playCard(c, C, hold(c, 'han_backdoor'), 'han', { pos: { x: 4, y: 2 } })
  assert.equal(after.units.find((u) => u.uid === foes[0]!.uid)?.statuses.mark, 2)
  assert.equal(after.units.find((u) => u.uid === 'han')?.statuses.mark, undefined)
})
