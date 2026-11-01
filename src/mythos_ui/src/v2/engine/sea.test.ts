// DLC 3 rules: the tide, squad tactics, taking a turn back, and a run on the third depth.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { endTurn, moveUnit, rewindTurn, startCombat, threatMap } from './combat.ts'
import { perksOf, unitAt } from './effects.ts'
import { newProfile } from './meta.ts'
import { newRun } from './run.ts'
import { squadTacticFor } from './squad.ts'
import { floodsNext, tideLevel } from './tide.ts'
import type { CombatState, ContentRegistry, MetaProfile, RunState } from './types.ts'

const open: MetaProfile = { ...newProfile('t'), wins: 1, unlocks: Object.keys(C.unlocks) }
const run = (patch: Partial<RunState> = {}): RunState => ({ ...newRun(open, { archetype: 'ghost', paradox: 0, seed: 11 }, C), ...patch })
const tideContent = (pattern: number[]): ContentRegistry => ({
  ...C,
  encounters: { ...C.encounters, a1_n1_dodge: { ...(C.encounters.a1_n1_dodge as NonNullable<(typeof C.encounters)['a1_n1_dodge']>), tide: { pattern } } },
})

test('the tide floods from the bottom row, warns one enemy phase ahead and drains', () => {
  const reg = tideContent([0, 1, 2, 1])
  let c: CombatState = startCombat(run(), 'a1_n1_dodge', reg)
  assert.equal(tideLevel(c), 0)
  const bottom = { x: 0, y: c.tiles.length - 1 }
  assert.equal(floodsNext(c, bottom), true)
  assert.ok((threatMap(c, reg)[`${bottom.x},${bottom.y}`] ?? 0) > 0, 'the next flood reads as a threat')
  c = endTurn(c, reg)
  assert.equal(tideLevel(c), 1)
  assert.equal(c.tiles[bottom.y]?.[0]?.kind, 'hazard')
  assert.equal(c.tiles[bottom.y]?.[0]?.water, true)
  c = endTurn(endTurn(endTurn(c, reg), reg), reg)
  assert.equal(tideLevel(c), 0)
  assert.equal(c.tiles[bottom.y]?.[0]?.kind, 'floor')
  assert.equal(c.tiles[bottom.y]?.[0]?.water, undefined)
})

test('squad tactics: three companions make a role mix, an exact trio wins, two make nothing', () => {
  assert.equal(squadTacticFor(['tae_o', 'se_rin', 'han'], C)?.id, 'first_crew')
  assert.equal(squadTacticFor(['tae_o', 'doyun', 'kai'], C)?.id, 'wedge')
  assert.equal(squadTacticFor(['han', 'io', 'bel'], C)?.id, 'shared_compute')
  assert.equal(squadTacticFor(['tae_o', 'han'], C), undefined)
  const mixes = new Set<string>()
  for (const s of Object.values(C.squadTactics ?? {})) if (s.roles) mixes.add([...s.roles].sort().join('+'))
  assert.equal(mixes.size, 10, 'every mix of three roles has its own name')
})

test('a squad tactic adds to the perks every fight reads', () => {
  const crew = ['tae_o', 'doyun', 'kai'].map((id) => ({ id, hp: 20, maxHp: 20, bond: 0 }))
  const c = startCombat(run({ party: crew }), 'a1_n1_dodge', C)
  assert.equal(c.squad?.id, 'wedge')
  const alone = startCombat(run({ party: crew.slice(0, 2) }), 'a1_n1_dodge', C)
  assert.equal(alone.squad, undefined)
  assert.equal(perksOf(c).companionDamage, perksOf(alone).companionDamage + 2)
})

test('rewinding takes the whole turn back once and costs a use', () => {
  const reg: ContentRegistry = { ...C, archetypes: { ...C.archetypes, ghost: { ...(C.archetypes.ghost as NonNullable<(typeof C.archetypes)['ghost']>), rewinds: 1 } } }
  const c = startCombat(run(), 'a1_n1_dodge', reg)
  assert.equal(c.rewind?.left, 1)
  const self = c.units.find((u) => u.uid === 'connector')
  assert.ok(self)
  const to = [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }].find((p) => !unitAt(c, p))
  assert.ok(to)
  const moved = moveUnit(c, reg, 'connector', to)
  assert.notEqual(moved, c)
  const back = rewindTurn(moved)
  assert.deepEqual(back.units.find((u) => u.uid === 'connector')?.pos, self.pos)
  assert.equal(back.rewind?.left, 0)
  assert.equal(rewindTurn(back), back, 'none left')
})

test('without the sea acts in the content the third depth stays closed', () => {
  const r = newRun(open, { archetype: 'ghost', paradox: 0, seed: 11, mode: 'sea' }, { ...C, routes: {} })
  assert.equal(r.mode, undefined)
})
