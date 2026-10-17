// Party banter: content integrity and the deterministic pick (content/banter.ts, ui/shell/banterPick.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANTER, banterFor } from '../../content/banter.ts'
import { CONTENT as C } from '../../content/index.ts'
import { newCrpgState } from '../../engine/crpg.ts'
import { newProfile } from '../../engine/meta.ts'
import { newRun } from '../../engine/run.ts'
import type { RunState } from '../../engine/types.ts'
import { pickBanter } from './banterPick.ts'

test('banter: known companions, speakers from the pair, 2–4 short lines, both languages, unique ids', () => {
  const ids = new Set<string>()
  for (const b of BANTER) {
    assert.ok(!ids.has(b.id), b.id)
    ids.add(b.id)
    assert.ok(b.pair.every((id) => C.companions[id]) && b.pair[0] !== b.pair[1], b.id)
    assert.ok(b.lines.length >= 2 && b.lines.length <= 4, b.id)
    assert.equal(b.lines[0]?.who, b.pair[0], `${b.id}: the first of the pair opens`)
    for (const l of b.lines) {
      assert.ok(b.pair.includes(l.who), `${b.id}: ${l.who}`)
      assert.ok(l.text.ko.trim() && l.text.en.trim() && l.text.ko.length <= 60, `${b.id}: ${l.text.ko}`)
    }
  }
  // Se-rin starts most runs: she has an exchange with everyone.
  for (const id of Object.keys(C.companions)) if (id !== 'se_rin') assert.ok(banterFor(['se_rin', id], 1).length + banterFor(['se_rin', id], 2).length > 0, id)
})

test('pickBanter: only with the Signal+ layer and two deployed, deterministic per node, cycles before repeating', () => {
  const base = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: '2026-10-18T00:00:00.000Z' }, C)
  const two: RunState = { ...base, screen: { kind: 'map' }, party: [...base.party, { id: 'tae_o', hp: 20, maxHp: 20, bond: 0 }] }
  const at = (r: RunState, n: number): RunState => ({ ...r, visited: Array.from({ length: n }, (_, i) => `n${i}`) })
  assert.equal(pickBanter(at(two, 3)), null, 'no layer, no banter')
  const crpg = { ...two, crpg: newCrpgState(null) }
  const picks = Array.from({ length: 30 }, (_, i) => pickBanter(at(crpg, i + 1))?.id ?? null)
  assert.deepEqual(picks, Array.from({ length: 30 }, (_, i) => pickBanter(at(crpg, i + 1))?.id ?? null))
  const played = picks.filter((p): p is string => !!p)
  assert.ok(played.length > 5 && played.length < 25, `${played.length} of 30 nodes`)
  const pool = banterFor(['se_rin', 'tae_o'], 1).length
  assert.equal(new Set(played.slice(0, pool)).size, Math.min(pool, played.length), 'no repeat before the pool is used up')
  assert.equal(pickBanter({ ...at(crpg, 3), party: base.party }), null, 'one companion: nobody to talk to')
})
