// Party growth: companion levels and stats, a third slot from Act 4, gear that travels with its wearer.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { startCombat } from './combat.ts'
import { MAX_COMPANION_LEVEL, companionStats, gainXp, levelOf, trainLevel, xpToNext } from './companionLevel.ts'
import { dealDamage, statBonus } from './effects.ts'
import { newProfile } from './meta.ts'
import { advanceAct, equipGear, newRun, partySlots, setDeployment, trainCompanion, updateCombat } from './run.ts'
import type { CombatState, MetaProfile, PartyMember, RunState, UnitState } from './types.ts'

const allOpen: MetaProfile = { ...newProfile('t'), wins: 1, unlocks: Object.keys(C.unlocks) }
const run = (): RunState => newRun(allOpen, { archetype: 'ghost', paradox: 0, seed: 8 }, C)
const member = (id = 'tae_o'): PartyMember => ({ id, hp: 24, maxHp: 24, bond: 0 })

test('every companion has five stats with one clear strength', () => {
  for (const def of Object.values(C.companions)) {
    assert.ok(def.stats, def.id)
    const values = Object.values(def.stats)
    assert.equal(values.reduce((a, b) => a + b, 0), 18, `${def.id} sum`)
    assert.ok(Math.max(...values) >= 6, `${def.id} has no strength`)
  }
})

test('deployed wins walk a companion up to level 5, then stop', () => {
  const m = member()
  let wins = 0
  while (levelOf(m) < MAX_COMPANION_LEVEL && wins < 100) {
    gainXp(m)
    wins++
  }
  assert.equal(wins, 18)
  assert.equal(m.maxHp, 24 + 8)
  assert.equal(gainXp(m), false)
  assert.equal(xpToNext(m), 0)
})

test('a level raises the two best stats', () => {
  const def = C.companions.tae_o!
  const l1 = companionStats(def, 1)
  const l5 = companionStats(def, 5)
  assert.equal(l5.str, l1.str + 8)
  assert.equal(l5.obs, l1.obs + 4)
  assert.equal(l5.int, l1.int)
})

test('a growth point buys a level on the map, and only there', () => {
  const r = run()
  r.party = [member()]
  r.growth = 1
  r.screen = { kind: 'map' }
  const trained = trainCompanion(r, 'tae_o', C)
  assert.equal(levelOf(trained.party[0] as PartyMember), 2)
  assert.equal(trained.growth, 0)
  assert.equal(trainCompanion(trained, 'tae_o', C), trained, 'no points left')
  const m = member()
  trainLevel(m)
  assert.equal(xpToNext(m), 4)
})

test('a stat card scales off whoever plays it', () => {
  const r = run()
  r.party = [member('tae_o')]
  r.stats.str = 3
  const c = startCombat(r, 'a1_n1_dodge', C)
  const tae = c.units.find((u) => u.uid === 'tae_o') as UnitState
  const me = c.units.find((u) => u.uid === 'connector') as UnitState
  const scale = { stat: 'str', div: 2 } as const
  assert.equal(statBonus(c, scale, me), 1)
  assert.equal(statBonus(c, scale, tae), 3)
})

test('level 3 opens a fight with block, on that companion only', () => {
  const blockOf = (level: number): number => {
    const r = run()
    r.party = [{ ...member(), level }]
    const c = startCombat(r, 'a1_n1_dodge', C)
    return c.units.find((u) => u.uid === 'tae_o')?.block ?? 0
  }
  assert.ok(blockOf(3) > blockOf(2))
})

test('a third slot opens at Act 4 and the bench fills it; an Endless lap benches it again', () => {
  const r = run()
  r.party = [member('tae_o'), member('han')]
  r.bench = [member('kai')]
  r.screen = { kind: 'map' }
  assert.equal(partySlots(r), 2)
  assert.equal(setDeployment(r, ['tae_o', 'han', 'kai']), r)
  r.act = 3
  r.mode = 'deep'
  advanceAct(r, C)
  assert.equal(partySlots(r), 3)
  assert.deepEqual(r.party.map((m) => m.id), ['tae_o', 'han', 'kai'])
  assert.equal(r.bench, undefined)
  r.act = 0
  advanceAct(r, C)
  assert.equal(r.party.length, 2)
  assert.deepEqual((r as RunState).bench?.map((m) => m.id), ['kai'])
})

test('three companions take the board together', () => {
  const r = run()
  r.act = 4
  r.party = [member('tae_o'), member('han'), member('kai')]
  const c = startCombat(r, 'a4_n1_catalog', C)
  assert.equal(c.units.filter((u) => u.side === 'party').length, 4)
})

const fight = (r: RunState): CombatState => startCombat(r, 'a1_n1_dodge', C)

test('gear works on its wearer: damage, armor, opening block, move', () => {
  const r = run()
  r.party = [member()]
  r.gear = ['wp_rail', 'ar_mesh']
  r.screen = { kind: 'map' }
  const on = equipGear(equipGear(r, 'tae_o', 'weapon', 'wp_rail', C), 'tae_o', 'armor', 'ar_mesh', C)
  const bare = fight(r).units.find((u) => u.uid === 'tae_o') as UnitState
  const c = fight(on)
  const geared = c.units.find((u) => u.uid === 'tae_o') as UnitState
  assert.equal(geared.gearDamage, 2)
  assert.equal(geared.armor, bare.armor + 1)
  assert.ok(geared.block > bare.block, 'the opening block survives into turn 1')
  assert.equal(c.units.find((u) => u.uid === 'connector')?.gearDamage, undefined)
  const foe = c.units.find((u) => u.side === 'enemy') as UnitState
  foe.armor = 0
  foe.block = 0
  const before = foe.hp
  dealDamage(c, C, foe, 2, { source: 'party', attacker: geared, attack: true })
  assert.ok(before - foe.hp >= 4, 'the weapon adds to a direct hit')
})

test('one piece sits on one person, the slot must match, and only owned gear goes on', () => {
  const r = run()
  r.party = [member('tae_o')]
  r.gear = ['wp_pipe']
  r.screen = { kind: 'map' }
  assert.equal(equipGear(r, 'connector', 'armor', 'wp_pipe', C), r, 'wrong slot')
  assert.equal(equipGear(r, 'connector', 'weapon', 'wp_rail', C), r, 'not owned')
  assert.equal(equipGear(r, 'stranger', 'weapon', 'wp_pipe', C), r, 'not in the crew')
  const a = equipGear(r, 'connector', 'weapon', 'wp_pipe', C)
  const b = equipGear(a, 'tae_o', 'weapon', 'wp_pipe', C)
  assert.equal(b.worn?.connector?.weapon, undefined)
  assert.equal(b.worn?.tae_o?.weapon, 'wp_pipe')
  const off = equipGear(b, 'tae_o', 'weapon', null, C)
  assert.equal(off.worn?.tae_o?.weapon, undefined)
  assert.ok(off.gear?.includes('wp_pipe'))
})

test('an elite or boss leaves gear, a plain fight does not, and nothing drops twice', () => {
  const win = (nodeKind: 'combat' | 'elite' | 'boss', enc: string, gear?: string[]): RunState => {
    const r = run()
    if (gear) r.gear = gear
    const combat = startCombat(r, enc, C)
    combat.phase = 'won'
    r.screen = { kind: 'combat', combat, nodeKind }
    return updateCombat(r, combat, C)
  }
  const plain = win('combat', 'a1_n1_dodge')
  assert.equal(plain.screen.kind === 'reward' && plain.screen.reward.gear, undefined)
  const elite = win('elite', 'a1_elite_rust_hulk')
  const got = elite.screen.kind === 'reward' ? elite.screen.reward.gear : undefined
  assert.ok(got && C.gear?.[got])
  assert.ok(elite.gear?.includes(got))
  const all = Object.keys(C.gear ?? {})
  const full = win('elite', 'a1_elite_rust_hulk', all)
  assert.equal(full.screen.kind === 'reward' && full.screen.reward.gear, undefined)
})
