// Districts follow the act map's route: the Unwritten Sea's route maps used to replace the base map after its
// districts were placed, so Sea acts 4–6 had none; base acts never take a route district.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { advanceAct, chooseEventOption, continueEvent, newRun } from './run.ts'
import type { RunMode } from './types.ts'

const profile = { ...newProfile('T'), wins: 1, unlocks: Object.keys(C.unlocks) }
function placedByAct(mode: RunMode, seed: number): Map<number, (string | undefined)[]> {
  const run = newRun(profile, { archetype: 'ghost', paradox: 0, seed, mode, crpg: { background: null } }, C)
  const out = new Map<number, (string | undefined)[]>()
  for (;;) {
    out.set(run.act, Object.values(run.map.nodes).filter((n) => n.kind === 'district').map((n) => n.districtId))
    if (run.act >= 6) return out
    advanceAct(run, C)
  }
}

test('Sea acts 4–6 place that act’s Sea district; Deep acts never place a route district', () => {
  for (const seed of [3, 17]) {
    const sea = placedByAct('sea', seed)
    const deep = placedByAct('deep', seed)
    for (const act of [4, 5, 6]) {
      const s = sea.get(act) ?? []
      assert.ok(s.length > 0, `sea act ${act}: no district`)
      for (const id of s) assert.equal(C.crpg?.districts[id ?? '']?.route, `sea_${act}`, `sea act ${act}: ${id}`)
      for (const id of deep.get(act) ?? []) assert.equal(C.crpg?.districts[id ?? '']?.route, undefined, `deep act ${act}: ${id}`)
    }
    // Acts 1–3 are shared: same base districts on either mode.
    for (const act of [1, 2, 3]) assert.deepEqual(sea.get(act), deep.get(act), `act ${act}`)
  }
})

test('Outside the List places its own Act 2 district instead of losing the base ones', () => {
  for (const seed of [2, 11]) {
    const r = newRun(profile, { archetype: 'ghost', paradox: 0, seed, crpg: { background: null } }, C)
    advanceAct(r, C)
    assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_closing')
    const taken = continueEvent(chooseEventOption(r, 0, C), C)
    assert.equal(taken.route, 'outside')
    const placed = Object.values(taken.map.nodes).filter((n) => n.kind === 'district').map((n) => n.districtId)
    assert.deepEqual(placed, ['d2_outside_laundry'], `seed ${seed}`)
  }
})
