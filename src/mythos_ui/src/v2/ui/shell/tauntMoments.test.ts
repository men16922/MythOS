import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CombatState, UnitState } from '../../engine/types.ts'
import { detectTaunt } from './tauntMoments.ts'

const unit = (uid: string, defId: string, side: UnitState['side'], hp: number, maxHp: number): UnitState =>
  ({ uid, defId, side, hp, maxHp, name: { ko: uid, en: uid }, sprite: '', pos: { x: 0, y: 0 }, block: 0, armor: 0, move: 0, moved: false, facing: 'left', statuses: {}, intent: null }) as UnitState
const state = (units: UnitState[]): CombatState => ({ units }) as unknown as CombatState

test('hurt once per talking enemy at half HP; silent enemies never talk', () => {
  const said = new Set<string>()
  assert.equal(detectTaunt(state([unit('connector', 'connector', 'party', 40, 40), unit('e1', 'haetae', 'enemy', 40, 66)]), said), null)
  const hit = detectTaunt(state([unit('connector', 'connector', 'party', 40, 40), unit('e1', 'haetae', 'enemy', 33, 66)]), said)
  assert.equal(hit?.moment, 'hurt')
  assert.equal(hit?.unit.uid, 'e1')
  said.add('e1:hurt')
  assert.equal(detectTaunt(state([unit('connector', 'connector', 'party', 40, 40), unit('e1', 'haetae', 'enemy', 10, 66)]), said), null)
  assert.equal(detectTaunt(state([unit('connector', 'connector', 'party', 40, 40), unit('d', 'scrap_drone', 'enemy', 1, 10)]), new Set()), null)
  assert.equal(detectTaunt(state([unit('connector', 'connector', 'party', 40, 40), unit('e1', 'haetae', 'enemy', 0, 66)]), new Set()), null, 'the dead stay quiet')
})

test('winning when the connector is at 30 % or less, spoken by the biggest talker, once', () => {
  const units = [unit('connector', 'connector', 'party', 12, 40), unit('c', 'trooper_captain', 'enemy', 40, 40), unit('b', 'haetae', 'enemy', 66, 66)]
  const hit = detectTaunt(state(units), new Set())
  assert.equal(hit?.moment, 'winning')
  assert.equal(hit?.unit.uid, 'b')
  assert.equal(detectTaunt(state(units), new Set(['winning'])), null)
})

test('every talking enemy exists and has two lines per moment in both languages', async () => {
  const { CONTENT: C } = await import('../../content/index.ts')
  const { TAUNTS } = await import('../../content/taunts.ts')
  for (const [id, moments] of Object.entries(TAUNTS)) {
    assert.ok(C.enemies[id], `unknown enemy ${id}`)
    assert.ok(['boss', 'elite'].includes(C.enemies[id]?.tier ?? ''), `${id} should be a boss or elite`)
    for (const m of ['hurt', 'winning'] as const) {
      assert.ok(moments[m].length >= 2, `${id}.${m}`)
      for (const line of moments[m]) assert.ok(line.ko.trim() && line.en.trim() && !/\d/.test(line.ko), `${id}.${m}: ${line.ko}`)
    }
  }
})
