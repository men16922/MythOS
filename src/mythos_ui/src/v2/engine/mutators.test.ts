// Daily mutators: one per KST day (same for everybody), frozen on the run, every dial wired to a real effect,
// never present on a normal loop.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { MUTATORS, mutatorById, mutatorForDate, mutatorMods } from './mutators.ts'
import { newProfile } from './meta.ts'
import { startCombat } from './combat.ts'
import { enterNode, generateShop, newRun, reachableNodes, restHealPercent, startAct, updateCombat } from './run.ts'
import { dateKeyAt } from './daily.ts'

const NOW = '2026-10-13T00:00:00.000Z'

/** The first date (from a fixed epoch) on which a mutator comes up. */
function dateFor(id: string): string {
  for (let i = 0; i < 400; i++) {
    const day = dateKeyAt(Date.UTC(2026, 9, 13 + i))
    if (mutatorForDate(day).id === id) return day
  }
  throw new Error(`no date for ${id}`)
}

const dailyRun = (id: string, archetype = 'ghost') => newRun(newProfile('T'), { archetype, paradox: 0, daily: dateFor(id), now: NOW }, C)
const plainRun = () => newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 7, now: NOW }, C)

test('table: ids unique, a visible boon AND burden each, bilingual, mods are sane integers', () => {
  const ids = new Set<string>()
  for (const m of MUTATORS) {
    assert.ok(!ids.has(m.id), `duplicate ${m.id}`)
    ids.add(m.id)
    for (const text of [m.name, m.blurb, m.boon, m.burden]) assert.ok(text.ko.trim() && text.en.trim(), `${m.id}: empty text`)
    assert.ok(Object.keys(m.mods).length + Object.keys(m.combat ?? {}).length >= 2, `${m.id}: a trade has at least two dials`)
    for (const [k, v] of Object.entries(m.mods)) assert.ok(Number.isInteger(v) && Math.abs(v) <= 100, `${m.id}.${k}=${v}`)
  }
  assert.ok(MUTATORS.length >= 8)
})

test('the mutator is a pure function of the date and spreads over the whole table', () => {
  assert.equal(mutatorForDate('2026-10-13').id, mutatorForDate('2026-10-13').id)
  const seen = new Set<string>()
  for (let i = 0; i < 90; i++) seen.add(mutatorForDate(dateKeyAt(Date.UTC(2026, 9, 13 + i))).id)
  assert.equal(seen.size, MUTATORS.length, 'every mutator comes up within 90 days')
  assert.equal(mutatorById('nope'), undefined)
  assert.deepEqual(mutatorMods({ mutator: undefined }), {})
  assert.deepEqual(mutatorMods({ mutator: 'retired_mutator' }), {}, 'an unknown (retired) id is harmless')
})

test('daily runs freeze their mutator; normal loops never have one', () => {
  for (const m of MUTATORS) assert.equal(dailyRun(m.id).mutator, m.id)
  assert.equal(plainRun().mutator, undefined)
  // Two players on the same day share it, on any profile.
  const day = dateFor('iron_week')
  const a = newRun(newProfile('A'), { archetype: 'ghost', paradox: 0, daily: day, now: NOW }, C)
  const b = newRun(Object.assign(newProfile('B'), { totalEchoes: 999, wins: 4 }), { archetype: 'ghost', paradox: 0, daily: day, now: NOW }, C)
  assert.equal(a.mutator, b.mutator)
})

test('start dials: max HP, credits, static card, extra consumable', () => {
  const base = plainRun()
  const baseDeck = dailyRun('market_boom').deck.length // a daily with no start dial: the reference deck size
  const iron = dailyRun('iron_week')
  assert.equal(iron.maxHp, base.maxHp + 10)
  assert.equal(iron.hp, iron.maxHp, 'starts at full')
  const glass = dailyRun('glass_loop')
  assert.equal(glass.maxHp, base.maxHp - 8)
  assert.equal(glass.credits, base.credits + 80)
  const cold = dailyRun('cold_boot')
  assert.equal(cold.deck.length, baseDeck + 1, 'one Static added')
  assert.ok(cold.deck.some((c) => C.cards[c.defId]?.type === 'junk'))
  assert.equal(cold.credits, base.credits + 30)
  assert.equal(cold.consumables.length, plainRun().consumables.length + 1)
})

test('shop prices follow shopPct (boom −30 %, scrap +25 %)', () => {
  const total = (id: string): number => {
    const run = dailyRun(id)
    run.seed = 12345 // same jitter for every comparison (the shop stream derives from the seed)
    const s = generateShop(run, C)
    return s.cards.reduce((n, c) => n + c.price, 0) + s.implants.reduce((n, c) => n + c.price, 0) + s.removePrice + s.healPrice + s.scrubPrice
  }
  const ref = total('iron_week') // no shop dial
  assert.ok(total('market_boom') < ref * 0.78, 'boom is clearly cheaper')
  assert.ok(total('scrap_season') > ref * 1.15, 'scrap season is clearly dearer')
})

test('the trace dial changes what entering a node costs (patrol surge 5, tight wire 2, default 3)', () => {
  const traceAfterFirstNode = (id: string): number => {
    const started = structuredClone(startAct(dailyRun(id), C))
    started.screen = { kind: 'map' } // skip the scripted opening event; the dial is read at node entry
    const first = reachableNodes(started)[0] as string
    assert.ok(first, 'a reachable first node')
    const before = started.trace
    const next = enterNode(started, first, C)
    assert.notEqual(next, started, 'enterNode accepted the node')
    return next.trace - before
  }
  assert.equal(traceAfterFirstNode('patrol_surge'), 5)
  assert.equal(traceAfterFirstNode('tight_wire'), 2)
  assert.equal(traceAfterFirstNode('long_night'), 4)
  assert.equal(traceAfterFirstNode('iron_week'), 3, 'no trace dial → the base step')
})

test('enemy HP dials reach the fight (iron week +20 %, tight wire +35 % for elites only)', () => {
  const hp = (id: string, enc: string): number[] => {
    const c = startCombat(dailyRun(id), enc, C)
    return c.units.filter((u) => u.side === 'enemy').map((u) => u.maxHp)
  }
  const plainNormal = hp('market_boom', 'a1_n1_cover') // no HP dial
  const ironNormal = hp('iron_week', 'a1_n1_cover')
  assert.equal(ironNormal.length, plainNormal.length)
  ironNormal.forEach((v, i) => assert.ok(v > (plainNormal[i] as number), 'iron week thickens normal enemies'))
  const wireNormal = hp('tight_wire', 'a1_n1_cover')
  assert.deepEqual(wireNormal, plainNormal, 'tight wire leaves normal enemies alone')
  const plainElite = hp('market_boom', 'a1_elite_overseer')
  const wireElite = hp('tight_wire', 'a1_elite_overseer')
  assert.ok(Math.max(...wireElite) > Math.max(...plainElite), 'tight wire thickens elites')
})

test('safehouse heal follows restHeal (long night +15 points)', () => {
  const base = restHealPercent(dailyRun('iron_week'), C)
  assert.equal(restHealPercent(dailyRun('long_night'), C), base + 15)
  assert.equal(restHealPercent(dailyRun('scrap_season'), C), base + 10)
})

test('fight credits follow rewardCreditsPct (patrol surge +35 %, market boom −30 %)', () => {
  const rewardCredits = (id: string): number => {
    const run = structuredClone(startAct(dailyRun(id), C))
    run.screen = { kind: 'map' }
    const first = reachableNodes(run)[0] as string
    Object.assign(run.map.nodes[first] as object, { kind: 'combat', encounterId: 'a1_n1_cover' })
    // Identical reward rolls for every comparison: the maps (and so the node, i.e. the stream scope) differ
    // per daily, so use the legacy shared stream pinned to one value.
    delete run.streams
    run.rng = 987654
    const fight = enterNode(run, first, C)
    assert.equal(fight.screen.kind, 'combat')
    const combat = structuredClone((fight.screen as Extract<typeof fight.screen, { kind: 'combat' }>).combat)
    combat.phase = 'won'
    const done = updateCombat(fight, combat, C)
    assert.equal(done.screen.kind, 'reward')
    return (done.screen as Extract<typeof done.screen, { kind: 'reward' }>).reward.credits
  }
  const base = rewardCredits('iron_week') // no credit dial
  assert.ok(rewardCredits('patrol_surge') >= Math.round(base * 1.25), `surge ${rewardCredits('patrol_surge')} vs base ${base}`)
  assert.ok(rewardCredits('market_boom') <= Math.round(base * 0.8), `boom ${rewardCredits('market_boom')} vs base ${base}`)
})
