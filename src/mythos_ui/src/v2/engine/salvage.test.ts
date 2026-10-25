// Pack 2 (Dreaming Machines): freeze status, salvage parts and the safehouse workbench.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { legalMoves, startCombat } from './combat.ts'
import { killUnit } from './effects.ts'
import { newProfile } from './meta.ts'
import { canCraft, CRAFT_RECIPES, newRun, restCraft } from './run.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-26T00:00:00.000Z'

test('freeze: a frozen party unit cannot move but the fight goes on', () => {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 1, now: NOW }, C)
  const c = startCombat(run, 'a1_n1_cover', C)
  assert.ok(legalMoves(c, 'connector').length > 0)
  c.units.find((u) => u.uid === 'connector')!.statuses.freeze = 1
  assert.deepEqual(legalMoves(c, 'connector'), [])
})

test('salvage: machines drop parts in the fight', () => {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 1, now: NOW }, C)
  const c = startCombat(run, 'a5_n1_graveyard', C)
  const hound = c.units.find((u) => u.defId === 'scrap_hound')!
  killUnit(c, C, hound, 'damage')
  assert.equal(c.parts, C.enemies.scrap_hound!.salvage)
})

test('workbench: each recipe once per rest, paid in parts, never the rest action', () => {
  const base = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: NOW }, C)
  const run: RunState = { ...structuredClone(base), parts: 9, hp: 10, screen: { kind: 'rest', done: false } }
  assert.ok(canCraft(run, 'patch'))
  const patched = restCraft(run, 'patch', C)
  assert.equal(patched.hp, 18)
  assert.equal(patched.parts, 9 - CRAFT_RECIPES.patch.cost)
  assert.equal(canCraft(patched, 'patch'), false, 'once per rest')
  assert.equal(patched.screen.kind === 'rest' && patched.screen.done, false, 'the rest action is still open')
  const refit = restCraft(patched, 'refit', C)
  assert.equal(refit.implants.length, patched.implants.length + 1)
  assert.equal(refit.parts, 9 - CRAFT_RECIPES.patch.cost - CRAFT_RECIPES.refit.cost)
  assert.equal(canCraft(refit, 'assemble'), false, 'not enough parts left')
})
