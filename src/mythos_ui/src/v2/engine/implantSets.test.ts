// Implant sets: members are real implants in exactly one set, tiers are computed from what is held, a tier's max-HP /
// stat part lands once (when reached), the rest is summed live in both the run and the combat readers, and reward
// rolls lean toward a set already held.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { IMPLANT_SETS, SET_PULL, activeTierKeys, implantSetOf, newlyReached, setCounts, setPassives } from './implantSets.ts'
import { activePassive } from './effects.ts'
import { startCombat } from './combat.ts'
import { newProfile } from './meta.ts'
import { enterNode, newRun, reachableNodes, runPassive, takeRewardImplant, updateCombat } from './run.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-12T00:00:00.000Z'
const fresh = (): RunState => newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: NOW }, C)

test('every member is a real implant, in exactly one set; sets are small and have both tiers', () => {
  const seen = new Map<string, string>()
  for (const set of IMPLANT_SETS) {
    assert.ok(set.members.length >= 3, `${set.id} needs at least three members to reach tier 3`)
    assert.deepEqual(set.tiers.map((t) => t.count), [2, 3], `${set.id}: tiers 2 and 3`)
    for (const id of set.members) {
      assert.ok(C.implants[id], `${set.id}: unknown implant ${id}`)
      assert.ok(!seen.has(id), `${id} is in both ${seen.get(id)} and ${set.id}`)
      seen.set(id, set.id)
    }
    for (const tier of set.tiers) {
      assert.ok(tier.text.ko.trim() && tier.text.en.trim())
      // Nothing that is not already a plain engine number: no energy / hand size from a set.
      assert.equal(tier.passive.energy, undefined, `${set.id}: no free energy from a set`)
      assert.equal(tier.passive.handSize, undefined, `${set.id}: no free cards from a set`)
    }
  }
  // Boss relics stay outside every set on purpose.
  for (const id of Object.values(C.implants).filter((i) => i.rarity === 'boss').map((i) => i.id)) assert.equal(implantSetOf(id), undefined, id)
})

test('counts, tiers and the passives they give', () => {
  assert.deepEqual(setCounts(['mesh_vest', 'scrap_plating', 'credit_chip']), { bulwark: 2, trade: 1 })
  assert.deepEqual(activeTierKeys(['mesh_vest']), [])
  assert.deepEqual(activeTierKeys(['mesh_vest', 'scrap_plating']), ['bulwark:2'])
  assert.deepEqual(activeTierKeys(['mesh_vest', 'scrap_plating', 'guardian_chip']), ['bulwark:2', 'bulwark:3'])
  assert.deepEqual(setPassives(['recoil_boots', 'impact_frame']), [{ bumpDamage: 1 }])
  assert.deepEqual(setPassives([]), [])
})

test('pickups report exactly the tiers they unlock', () => {
  assert.deepEqual(newlyReached(['mesh_vest'], 'scrap_plating').map((x) => `${x.set.id}:${x.tier.count}`), ['bulwark:2'])
  assert.deepEqual(newlyReached(['mesh_vest', 'scrap_plating'], 'guardian_chip').map((x) => `${x.set.id}:${x.tier.count}`), ['bulwark:3'])
  assert.deepEqual(newlyReached(['mesh_vest', 'scrap_plating'], 'credit_chip'), [], 'a different set unlocks nothing')
  assert.deepEqual(newlyReached([], 'mesh_vest'), [])
})

/** Receive `id` the way a player does: as the implant pick of a reward screen. */
function takeViaReward(run: RunState, id: string): RunState {
  const r = structuredClone(run)
  r.screen = { kind: 'reward', reward: { credits: 0, cardChoices: [], implantChoices: [id], echoes: 0, taken: { credits: true, cards: [], implant: false, consumable: false } } }
  const next = takeRewardImplant(r, id, C)
  assert.notEqual(next, r, `${id} was accepted`)
  return next
}

test('the max-HP part of a tier lands once, when it is reached (real reward path)', () => {
  let run = fresh()
  const base = run.maxHp
  run = takeViaReward(run, 'mesh_vest') // bulwark 1: only its own passive (none)
  assert.equal(run.maxHp, base)
  run = takeViaReward(run, 'scrap_plating') // bulwark 2: +4
  assert.equal(run.maxHp, base + 4)
  run = takeViaReward(run, 'guardian_chip') // bulwark 3: +4 more
  assert.equal(run.maxHp, base + 8)
  run = takeViaReward(run, 'heavy_exosuit') // a 4th piece: its own +10 but no new tier
  assert.equal(run.maxHp, base + 18)
  // The vitality set mixes a concrete part (max HP) and a live part (safehouse heal).
  let v = fresh()
  const vBase = v.maxHp
  v = takeViaReward(v, 'med_pump')
  v = takeViaReward(v, 'field_medic_kit') // tier 2: restHeal +10 (live), no max HP yet
  assert.equal(v.maxHp, vBase)
  v = takeViaReward(v, 'stim_reservoir') // tier 3: +6 max HP once, plus stim_reservoir's own +7
  assert.equal(v.maxHp, vBase + 7 + 6)
  assert.equal(runPassive(v, C, 'restHeal'), 20 + 10 + 10, 'field_medic_kit 20 + tier 2 10 + tier 3 10')
})

test('tempo tier 2 raises the stats once; tier 3 moves everyone one tile further (read in combat)', () => {
  let run = fresh()
  const agi = run.stats.agi
  const obs = run.stats.obs
  const move = (r: RunState): number => activePassive(startCombat(r, 'a1_n1_cover', C), C, 'move')
  const base = move(run)
  run = takeViaReward(run, 'spare_cell')
  run = takeViaReward(run, 'reflex_booster')
  assert.equal(run.stats.agi, agi + 1)
  assert.equal(run.stats.obs, obs + 1)
  assert.equal(move(run), base, 'tier 2 does not move anyone')
  run = takeViaReward(run, 'kill_chain')
  assert.equal(run.stats.agi, agi + 1, 'tier 3 does not raise stats again')
  assert.equal(move(run), base + 1)
})

test('combat reads the set bonus too: impact tier 2 adds one bump damage on top of the pieces', () => {
  const withSet = fresh()
  withSet.implants = ['recoil_boots', 'impact_frame'] // +1 and +2, and the Impact pair gives +1 more
  const without = fresh()
  without.implants = ['recoil_boots', 'credit_chip'] // +1 and nothing
  const a = activePassive(startCombat(withSet, 'a1_n1_cover', C), C, 'bumpDamage')
  const b = activePassive(startCombat(without, 'a1_n1_cover', C), C, 'bumpDamage')
  assert.equal(a, 1 + 2 + 1, 'pieces 1 + 2, set pair +1')
  assert.equal(b, 1)
})

test('reward rolls lean toward a held set (elite reward, 600 rolls each way)', () => {
  assert.ok(SET_PULL > 1)
  const offeredBulwark = (held: string[]): number => {
    let hits = 0
    for (let n = 1; n <= 600; n++) {
      const run = structuredClone(fresh())
      run.implants = [...held]
      run.seed = n * 7919
      run.screen = { kind: 'map' }
      const first = reachableNodes(run)[0] as string
      Object.assign(run.map.nodes[first] as object, { kind: 'elite', encounterId: 'a1_elite_overseer' })
      const fight = enterNode(run, first, C)
      const combat = structuredClone((fight.screen as Extract<typeof fight.screen, { kind: 'combat' }>).combat)
      combat.phase = 'won'
      const done = updateCombat(fight, combat, C)
      const offer = (done.screen as Extract<typeof done.screen, { kind: 'reward' }>).reward.implantChoices
      if (offer.some((id) => implantSetOf(id)?.id === 'bulwark')) hits++
    }
    return hits
  }
  const holdingBulwark = offeredBulwark(['mesh_vest'])
  const holdingTrade = offeredBulwark(['credit_chip'])
  assert.ok(holdingBulwark > holdingTrade * 1.15, `holding a Bulwark piece should offer more Bulwark: ${holdingBulwark} vs ${holdingTrade}`)
})
