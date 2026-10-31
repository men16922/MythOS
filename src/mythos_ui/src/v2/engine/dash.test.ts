// A card that says it charges has to move: Bloodhound Rush ends beside its target, never through anything.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { playCard, startCombat } from './combat.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'
import type { CombatState, UnitState } from './types.ts'

function lane(): { c: CombatState; me: UnitState; foe: UnitState } {
  const c = startCombat(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 2 }, C), 'a1_n1_dodge', C)
  const me = c.units.find((u) => u.uid === 'connector') as UnitState
  const foe = c.units.find((u) => u.side === 'enemy' && u.hp > 0) as UnitState
  c.units = c.units.filter((u) => u === me || u === foe)
  c.tiles = c.tiles.map((row) => row.map((t) => ({ ...t, kind: 'floor' })))
  me.pos = { x: 1, y: 2 }
  foe.pos = { x: 4, y: 2 }
  foe.hp = 40
  c.energy = 3
  c.hand = [{ uid: 'probe', defId: 'bloodhound_rush', upgraded: false }]
  return { c, me, foe }
}
const rush = (c: CombatState, foe: UnitState): CombatState => playCard(c, C, 'probe', 'connector', { pos: foe.pos, dir: 'right' })

test('Bloodhound Rush runs to the tile beside its target, then hits', () => {
  const { c, foe } = lane()
  const after = rush(c, foe)
  assert.deepEqual(after.units.find((u) => u.uid === 'connector')?.pos, { x: 3, y: 2 })
  assert.ok((after.units.find((u) => u.uid === foe.uid)?.hp ?? 40) < 40)
})

test('adjacent to the target it stays put, and a pit stops the run short', () => {
  const near = lane()
  near.me.pos = { x: 3, y: 2 }
  assert.deepEqual(rush(near.c, near.foe).units.find((u) => u.uid === 'connector')?.pos, { x: 3, y: 2 })
  const pit = lane()
  ;(pit.c.tiles[2] as { kind: string }[])[3] = { kind: 'void' }
  assert.deepEqual(rush(pit.c, pit.foe).units.find((u) => u.uid === 'connector')?.pos, { x: 2, y: 2 })
})
