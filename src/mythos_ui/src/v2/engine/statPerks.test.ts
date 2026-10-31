// Stats run to 20: the old steps hold, more steps sit above them, and 10 / 15 / 20 switch on named traits.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { startCombat } from './combat.ts'
import { newProfile } from './meta.ts'
import { STAT_MAX, advanceAct, newRun, spendGrowth } from './run.ts'
import { statPerks } from './statPerks.ts'
import type { CombatState, RunState, Stats } from './types.ts'

const at = (v: number): Stats => ({ str: v, agi: v, int: v, cha: v, obs: v })

test('the steps below 10 read as they always did', () => {
  const p = statPerks(at(9))
  assert.deepEqual([p.attack, p.bump, p.openEvade, p.move, p.dot, p.openDraw, p.openFocus, p.focusPerHit, p.mark], [2, 2, 1, 1, 2, 1, 2, 2, 1])
})

test('every stat keeps paying up to 20', () => {
  const low = statPerks(at(10))
  const high = statPerks(at(20))
  for (const k of ['attack', 'bump', 'openEvade', 'move', 'dot', 'openDraw', 'companionBlock', 'openFocus', 'focusPerHit', 'mark'] as const) {
    assert.ok(high[k] > low[k], k)
  }
  for (let v = 1; v < 20; v++) {
    const a = statPerks(at(v))
    const b = statPerks(at(v + 1))
    for (const k of Object.keys(a) as (keyof typeof a)[]) assert.ok(Number(b[k]) >= Number(a[k]), `${k} drops at ${v + 1}`)
  }
})

test('10, 15 and 20 each switch on a trait', () => {
  assert.deepEqual([statPerks({ str: 9 }).armorBreak, statPerks({ str: 10 }).armorBreak, statPerks({ str: 15 }).pushBonus], [0, 1, 1])
  assert.ok(statPerks({ str: 20 }).armorBreak > 10)
  assert.deepEqual([statPerks({ agi: 10 }).turnBlock, statPerks({ agi: 15 }).move, statPerks({ agi: 20 }).turnEvade], [2, 2, 1])
  assert.deepEqual([statPerks({ int: 10 }).tacticRefund, statPerks({ int: 15 }).openEnergy, statPerks({ int: 20 }).turnDraw], [true, 1, 1])
  assert.deepEqual([statPerks({ cha: 10 }).companionDamage, statPerks({ cha: 15 }).refundEachTurn, statPerks({ cha: 20 }).companionDamage], [1, true, 2])
  assert.deepEqual([statPerks({ obs: 10 }).critMark, statPerks({ obs: 15 }).critEase, statPerks({ obs: 20 }).openMark], [2, 1, 3])
})

const withStats = (v: number): CombatState => {
  const r = newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 3 }, C) as RunState
  r.stats = at(v)
  return startCombat(r, 'a1_n1_dodge', C)
}

test('the traits reach the fight: turn 1 energy and hand, block, evade and marks at 20', () => {
  const low = withStats(9)
  const high = withStats(20)
  assert.ok(high.energy > low.energy, 'INT 15 energy')
  assert.ok(high.hand.length > low.hand.length, 'INT draws')
  const self = (c: CombatState) => c.units.find((u) => u.uid === 'connector')
  assert.ok((self(high)?.block ?? 0) > (self(low)?.block ?? 0), 'AGI 10 block')
  assert.ok(high.units.filter((u) => u.side === 'enemy').every((u) => (u.statuses.mark ?? 0) >= 3), 'OBS 20 marks')
})

test('growth runs to 20 and an act pays 2', () => {
  const r = newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 3 }, C)
  r.screen = { kind: 'map' }
  r.stats.str = STAT_MAX - 1
  r.growth = 2
  const one = spendGrowth(r, 'str')
  assert.equal(one.stats.str, 20)
  assert.equal(spendGrowth(one, 'str'), one, 'stops at the cap')
  const before = r.growth
  advanceAct(r, C)
  assert.equal(r.growth, before + 2)
})
