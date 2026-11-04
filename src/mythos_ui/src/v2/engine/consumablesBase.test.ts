// The four base consumables added 2026-11-04 work on real content: each finds a target and does what its text says.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
// Aliased: eslint's hooks rule treats any use* call in a loop as a React hook.
import { consumableTargets, startCombat, useConsumable as consume } from './combat.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'
import type { CombatState } from './types.ts'

function fight(item: string, far = false): CombatState {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 4 }, C)
  run.consumables = [item]
  // `far`: the first Act 1 fight whose enemies actually start at x ≥ 4 (some tutorial fights reposition them),
  // so a line from the party column has room to pull.
  for (const e of Object.values(C.encounters)) {
    if (e.act !== 1 || e.kind !== 'normal' || e.enemies.length < 2) continue
    const c = startCombat(run, e.id, C)
    if (!far || c.units.every((u) => u.side !== 'enemy' || u.pos.x >= 4)) return c
  }
  throw new Error('no suitable Act 1 fight')
}
const enemies = (c: CombatState) => c.units.filter((u) => u.side === 'enemy' && u.hp > 0)

test('marker flare and static net put their status on enemies in the cross', () => {
  for (const [item, status] of [['marker_flare', 'mark'], ['static_net', 'stun']] as const) {
    const c = fight(item)
    const origin = c.units.find((u) => u.side === 'party')!.uid
    const at = enemies(c)[0]!.pos
    const targets = consumableTargets(c, C, 0, origin)
    const hit = targets.find((t) => t.pos && Math.abs(t.pos.x - at.x) + Math.abs(t.pos.y - at.y) <= 1) ?? targets[0]
    assert.ok(hit, `${item}: has a target`)
    const after = consume(c, C, 0, origin, hit!)
    assert.ok(enemies(after).some((u) => (u.statuses[status] ?? 0) > 0), `${item}: some enemy has ${status}`)
    assert.deepEqual(after.consumables, [], `${item}: used up`)
  }
})

test('guard foam gives an ally 10 block', () => {
  const c = fight('guard_foam')
  const ally = c.units.find((u) => u.side === 'party')!
  const target = consumableTargets(c, C, 0, ally.uid).find((t) => t.pos && t.pos.x === ally.pos.x && t.pos.y === ally.pos.y)
  assert.ok(target, 'targets the ally')
  const after = consume(c, C, 0, ally.uid, target!)
  assert.equal(after.units.find((u) => u.uid === ally.uid)!.block, (ally.block ?? 0) + 10)
})

test('grapple line pulls an enemy toward the user', () => {
  // Search real fights for a line whose first unit is an enemy two or more tiles away (tutorial fights start adjacent).
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 4 }, C)
  run.consumables = ['grapple_line']
  for (const e of Object.values(C.encounters)) {
    if (e.kind !== 'normal') continue
    const c = startCombat(run, e.id, C)
    const origin = c.units.find((u) => u.side === 'party')!
    const d = (p: { x: number; y: number }) => Math.abs(p.x - origin.pos.x) + Math.abs(p.y - origin.pos.y)
    for (const t of consumableTargets(c, C, 0, origin.uid)) {
      const victim = enemies(c).find((v) => t.tiles.some((p) => p.x === v.pos.x && p.y === v.pos.y))
      if (!victim || d(victim.pos) < 2) continue
      const after = consume(c, C, 0, origin.uid, t)
      const v2 = after.units.find((u) => u.uid === victim.uid)!
      assert.ok(d(v2.pos) < d(victim.pos) || v2.hp < victim.hp, `${e.id}: pulled closer (${d(victim.pos)} → ${d(v2.pos)}) or bumped`)
      return
    }
  }
  assert.fail('no fight offered a line with an enemy two or more tiles away')
})
