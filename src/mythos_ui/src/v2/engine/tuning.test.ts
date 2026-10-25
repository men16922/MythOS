// CONTENT.tuning (global enemy toughness) and Rage: data-driven, visible in the telegraph, Paradox 5 starts it early.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { endTurn, startCombat } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { effectiveIntentDamage } from './intents.ts'
import { MUTATORS, mutatorCombat } from './mutators.ts'
import type { ContentRegistry, EnemyTuning } from './types.ts'

const tuned = (tuning: EnemyTuning): ContentRegistry => ({ ...FIXTURE, tuning })
const RAGE: EnemyTuning = { enemyHpPct: 0, eliteHpPct: 0, dmgFromAct: 9, rage: { elite: 3, boss: 1, fromTurn: 2 } }

test('no tuning = authored numbers (test doubles stay exact)', () => {
  const c = startCombat(makeRun(), 'elite', FIXTURE)
  const heavy = c.units.find((u) => u.defId === 'heavy')!
  assert.equal(heavy.maxHp, 14)
})

test('tuning scales HP by tier and adds telegraphed damage from its act', () => {
  const C = tuned({ enemyHpPct: 10, eliteHpPct: 20, bossHpPct: -20, dmgFromAct: 1 })
  const elite = startCombat(makeRun(), 'elite', C).units.find((u) => u.defId === 'heavy')!
  assert.equal(elite.maxHp, Math.round(14 * 1.3), 'elite: +10 % + 20 %')
  const boss = startCombat(makeRun(), 'boss', C).units.find((u) => C.enemies[u.defId]?.tier === 'boss')!
  assert.equal(boss.maxHp, Math.round(C.enemies[boss.defId]!.hp * 1.1), 'boss: +10 % + 20 % − 20 %')
  const grunt = startCombat(makeRun(), 'duel', C).units.find((u) => u.side === 'enemy')!
  const move = C.enemies.grunt!.moves[0]!
  assert.equal(effectiveIntentDamage(grunt, move), move.damage! + 1, 'act 1 >= dmgFromAct 1: +1 in the telegraph')
})

test('Rage: elites and bosses only, from the set turn, and the telegraph shows it', () => {
  const C = tuned(RAGE)
  let c = startCombat(makeRun(), 'elite', C)
  c = endTurn(c, C) // enemy phase of turn 1: too early
  const heavy = () => c.units.find((u) => u.defId === 'heavy')!
  assert.equal(heavy().statuses.rage ?? 0, 0)
  c = endTurn(c, C) // turn 2: +3
  assert.equal(heavy().statuses.rage, 3)
  const smash = C.enemies.heavy!.moves.find((m) => m.id === 'smash')!
  assert.equal(effectiveIntentDamage(heavy(), smash), smash.damage! + 3)

  let d = startCombat(makeRun(), 'duel', C)
  d = endTurn(endTurn(endTurn(d, C), C), C)
  assert.equal(d.units.find((u) => u.side === 'enemy')!.statuses.rage ?? 0, 0, 'normal enemies never rage')
})

test('Paradox 5 starts Rage one turn earlier', () => {
  const C = tuned(RAGE)
  const p0 = endTurn(startCombat(makeRun(), 'elite', C), C)
  const p5 = endTurn(startCombat(makeRun({ paradox: 5 }), 'elite', C), C)
  assert.equal(p0.units.find((u) => u.defId === 'heavy')!.statuses.rage ?? 0, 0)
  assert.equal(p5.units.find((u) => u.defId === 'heavy')!.statuses.rage, 3)
})

test('every in-combat mutator rule is a real dial and the opening statuses land on every enemy', () => {
  for (const m of MUTATORS) {
    const combat = mutatorCombat(m.id)
    for (const v of Object.values(combat)) assert.ok(v !== undefined && v !== null, `${m.id}: empty combat rule`)
  }
  const acid = startCombat(makeRun({ mutator: 'acid_rain' }), 'pair', FIXTURE)
  for (const e of acid.units.filter((u) => u.side === 'enemy')) assert.equal(e.statuses.corrode, 2, 'acid rain corrodes every enemy')
  assert.equal(acid.units.find((u) => u.uid === 'connector')!.statuses.corrode, 1)
})
