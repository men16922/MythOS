// Party banter: content integrity and the deterministic pick (content/banter.ts, ui/shell/banterPick.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BANTER, banterFor, SOLO_BANTER } from '../../content/banter.ts'
import { CONTENT as C } from '../../content/index.ts'
import { newCrpgState } from '../../engine/crpg.ts'
import { newProfile } from '../../engine/meta.ts'
import { newRun } from '../../engine/run.ts'
import type { RunState } from '../../engine/types.ts'
import { pickBanter, pickSoloBanter } from './banterPick.ts'

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

test('pickBanter: only with the Signal+ layer and two deployed, deterministic per node, each exchange once per act', () => {
  const base = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: '2026-10-18T00:00:00.000Z' }, C)
  const two: RunState = { ...base, screen: { kind: 'map' }, party: [...base.party, { id: 'tae_o', hp: 20, maxHp: 20, bond: 0 }] }
  // Arrivals on this act's map (node ids from the map; the picker only counts the current act).
  const ids = Object.keys(base.map.nodes)
  const at = (r: RunState, n: number): RunState => ({ ...r, visited: Array.from({ length: n }, (_, i) => ids[i % ids.length] as string) })
  assert.equal(pickBanter(at(two, 3)), null, 'no layer, no banter')
  const crpg = { ...two, crpg: newCrpgState(null) }
  const picks = Array.from({ length: 30 }, (_, i) => pickBanter(at(crpg, i + 1))?.id ?? null)
  assert.deepEqual(picks, Array.from({ length: 30 }, (_, i) => pickBanter(at(crpg, i + 1))?.id ?? null))
  const played = picks.filter((p): p is string => !!p)
  const pool = banterFor(['se_rin', 'tae_o'], 1).length
  assert.ok(played.length >= 1 && played.length <= pool, `${played.length} plays for a pool of ${pool}`)
  assert.equal(new Set(played).size, played.length, 'an exchange never repeats within an act')
  // Earlier acts' arrivals do not use up this act's turns.
  const later = { ...crpg, visited: ['a0old1', 'a0old2', 'a0old3', ...ids.slice(0, 12)] }
  const laterPicks = Array.from({ length: 12 }, (_, i) => pickBanter({ ...later, visited: later.visited.slice(0, 4 + i) })?.id ?? null).filter(Boolean)
  assert.equal(new Set(laterPicks).size, laterPicks.length)
  assert.equal(pickBanter({ ...at(crpg, 3), party: base.party }), null, 'one companion: nobody to talk to')
})

test('pickSoloBanter: Companion <-> Connector banter fires on node 1 in Act 1 when 1 companion is deployed', () => {
  assert.ok(SOLO_BANTER.length >= 6)
  const base = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: '2026-10-18T00:00:00.000Z' }, C)
  const ids = Object.keys(base.map.nodes)
  const onMap: RunState = { ...base, screen: { kind: 'map' }, visited: [ids[0] as string] }
  const solo = pickSoloBanter(onMap)
  assert.ok(solo, 'first map arrival with 1 companion guarantees solo banter')
  assert.equal(solo.pair[0], 'se_rin')
  assert.equal(solo.pair[1], 'connector')
  // Once per act: over a whole act's arrivals, no solo exchange repeats.
  const picks = ids.slice(0, 20).map((_, i) => pickSoloBanter({ ...onMap, visited: ids.slice(0, i + 1) })?.id).filter(Boolean)
  assert.ok(picks.length >= 1 && picks.length <= 2, `${picks.length}`)
  assert.equal(new Set(picks).size, picks.length)
})


test('banter: every pair of Sea companions has an exchange in each Sea act (a Sea party is often two of them)', () => {
  const sea = ['mujin', 'seo_ha', 'parang']
  for (const a of sea) for (const b of sea) if (a < b) for (const act of [4, 5, 6] as const) assert.ok(banterFor([a, b], act).length > 0, `${a}+${b} act ${act}`)
})

test('banter: every pair of companions who can share a party has at least one exchange', () => {
  const ids = Object.keys(C.companions)
  const have = new Set(BANTER.map((b) => [...b.pair].sort().join('+')))
  const silent: string[] = []
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const key = [ids[i], ids[j]].sort().join('+')
    if (!have.has(key)) silent.push(key)
  }
  assert.deepEqual(silent, [])
})

test('solo banter: every companion has a line for when they are the only one left', () => {
  const missing = Object.keys(C.companions).filter((id) => !SOLO_BANTER.some((b) => b.pair[0] === id))
  assert.deepEqual(missing, [])
})
