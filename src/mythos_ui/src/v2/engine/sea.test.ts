// DLC 3 rules: the tide, squad tactics, taking a turn back, and a run on the third depth.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { endTurn, moveUnit, partyOrigins, playCard, rewindTurn, selectableTargets, startCombat, threatMap } from './combat.ts'
import { perksOf, unitAt } from './effects.ts'
import { newProfile } from './meta.ts'
import { availableEndings, newRun, SEA_FINAL, SEA_FINAL_MET, SEA_LOGS, SEA_SECRET, SEA_SECRET_WON, seaOpen, secretBossGate, updateCombat } from './run.ts'
import { squadTacticFor } from './squad.ts'
import { floodsNext, tideLevel } from './tide.ts'
import { mapEncounters } from './map.ts'
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

test('the third depth runs on its own acts from Act 4 and ends on its own endings', () => {
  assert.equal(seaOpen(open, C), true)
  const r = newRun(open, { archetype: 'ghost', paradox: 0, seed: 11, mode: 'sea' }, C)
  assert.equal(r.mode, 'sea')
  for (const act of [4, 5, 6] as const) {
    const route = `sea_${act}`
    for (const kind of ['normal', 'elite', 'boss'] as const) assert.ok(mapEncounters(act, kind, C, route).length >= (kind === 'normal' ? 10 : act === 6 && kind === 'boss' ? 2 : 3), `${route} ${kind}`)
  }
  const end: RunState = { ...r, act: 6, route: 'sea_6', axes: { humanity: 4 } as RunState['axes'] }
  const ids = availableEndings(end, C).map((v) => v.ending.id)
  assert.ok(ids.includes('ending_sea_return'))
  assert.ok(!ids.includes('ending_city_of_memory'), 'Deep Signal endings stay on the Deep Signal')
  assert.ok(!availableEndings({ ...end, mode: 'deep' }, C).some((v) => v.ending.id === 'ending_sea_return'))
})

test('a companion who goes down is remembered as words, never power', () => {
  const r = run()
  const fallen = { ...open, fallen: [r.party[0]?.id ?? ''] }
  const next = newRun(fallen, { archetype: 'ghost', paradox: 0, seed: 11, companion: r.party[0]?.id ?? '' }, C)
  assert.equal(next.residue, r.party[0]?.id)
  const same = newRun(open, { archetype: 'ghost', paradox: 0, seed: 11, companion: r.party[0]?.id ?? '' }, C)
  assert.deepEqual({ ...next, residue: undefined }.stats, same.stats)
  for (const id of Object.keys(C.companions)) assert.ok(C.residue?.[id], `${id} residue line`)
})

test('a standard run never sees the sea: no card, implant, gear or consumable leaks into its pools', () => {
  const r = run()
  const sea = (id: string): boolean => id.startsWith('sea_')
  assert.ok(!r.pools.cards.some(sea))
  assert.ok(!r.pools.implants.some(sea))
  const seaGear = Object.values(C.gear ?? {}).filter((g) => g.route)
  assert.equal(seaGear.length, 20)
  assert.ok(Object.values(C.implants).filter((i) => i.route).length >= 12)
  assert.equal(Object.values(C.consumables).filter((c) => c.route).length, 4)
})

test('rewinding undoes a played card: same hand, same energy, and the same draw afterwards', () => {
  const profile = open
  const r = newRun(profile, { archetype: 'navigator', paradox: 0, seed: 7 }, C)
  const c = startCombat(r, 'a1_n1_dodge', C)
  assert.equal(c.rewind?.left, 1)
  let played = c
  for (const card of c.hand) {
    const origin = partyOrigins(c, C, card.uid)[0]
    const opt = origin ? selectableTargets(c, C, card.uid, origin)[0] : undefined
    if (!origin || !opt) continue
    const next = playCard(c, C, card.uid, origin, opt)
    if (next !== c) {
      played = next
      break
    }
  }
  assert.notEqual(played, c)
  assert.ok(played.energy < c.energy || played.hand.length < c.hand.length)
  const back = rewindTurn(played)
  assert.deepEqual(back.hand, c.hand)
  assert.equal(back.energy, c.energy)
  assert.deepEqual(back.draw, c.draw)
  assert.equal(back.rewind?.left, 0)
  const again = endTurn(back, C)
  assert.equal(again.turn, endTurn({ ...c, rewind: { left: 0 } }, C).turn)
})

test('the three logs open the secret fight, and winning it opens the hidden ending', () => {
  const base: RunState = { ...newRun(open, { archetype: 'ghost', paradox: 0, seed: 11, mode: 'sea' }, C), act: 6, route: 'sea_6' }
  assert.equal(secretBossGate(base, C), false)
  const flags = Object.fromEntries(SEA_LOGS.map((k) => [k, 1]))
  const carrying = { ...base, flags: { ...base.flags, ...flags } }
  assert.equal(secretBossGate(carrying, C), true)
  assert.ok(C.encounters[SEA_SECRET]?.secret)
  const hidden = (run: RunState) => availableEndings(run, C).find((v) => v.ending.id === 'ending_sea_unwritten')
  assert.equal(hidden(carrying)?.available ?? false, false)
  assert.equal(hidden({ ...carrying, flags: { ...carrying.flags, [SEA_SECRET_WON]: 1 } })?.available, true)
})

test('the sea always ends with the Lightkeeper, then the secret fight for whoever holds the logs', () => {
  assert.ok(C.encounters[SEA_FINAL]?.secret, 'never rolled onto a map')
  assert.ok(!mapEncounters(6, 'boss', C, 'sea_6').some((e) => e.id === SEA_FINAL))
  const start: RunState = { ...newRun(open, { archetype: 'ghost', paradox: 0, seed: 11, mode: 'sea' }, C), act: 6, route: 'sea_6' }
  const logs = Object.fromEntries(SEA_LOGS.map((k) => [k, 1]))
  const win = (r: RunState, id: string): RunState => {
    const fight: CombatState = { ...startCombat(r, id, C), phase: 'won' }
    return updateCombat({ ...r, screen: { kind: 'combat', combat: fight, nodeKind: 'boss' } }, fight, C)
  }
  const road = mapEncounters(6, 'boss', C, 'sea_6')[0]?.id ?? ''
  const keeper = win({ ...start, flags: { ...start.flags, ...logs } }, road)
  assert.equal(keeper.screen.kind === 'combat' && keeper.screen.combat.encounterId, SEA_FINAL)
  assert.equal(keeper.flags[SEA_FINAL_MET], 1)
  const secret = win(keeper, SEA_FINAL)
  assert.equal(secret.screen.kind === 'combat' && secret.screen.combat.encounterId, SEA_SECRET)
  const plain = win(win(start, road), SEA_FINAL)
  assert.equal(plain.screen.kind, 'final_choice')
})
