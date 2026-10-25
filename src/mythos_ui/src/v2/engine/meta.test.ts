import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_PARADOX,
  HISTORY_CAP,
  KILLED_BY_FLAG,
  applyRunEnd,
  buyUnlock,
  canBuyUnlock,
  cardPool,
  computeEchoes,
  implantPool,
  migrateProfile,
  newProfile,
  threadPassive,
  unlockedArchetypes,
  unlockedCompanions,
} from './meta.ts'
import { FIXTURE as C } from './run.fixture.test.ts'
import type { MetaProfile, RunState } from './types.ts'

function rich(unlocks: string[] = []): MetaProfile {
  return { ...newProfile('Tester'), echoes: 500, totalEchoes: 500, unlocks }
}

/** Minimal ended run for banking tests (only the fields applyRunEnd reads matter). */
function endedRun(over: Partial<RunState> = {}, result: 'victory' | 'defeat' = 'defeat', endingId = 'ending_forced_erasure'): RunState {
  return {
    version: 2,
    id: 'run-x',
    seed: 1,
    rng: 1,
    loop: 1,
    paradox: 0,
    archetype: 'ghost',
    act: 2,
    map: { act: 2, rows: 8, nodes: {}, startIds: [], bossId: '' },
    nodeId: null,
    visited: [],
    hp: 0,
    maxHp: 34,
    credits: 0,
    trace: 10,
    stats: { str: 3, agi: 6, int: 4, cha: 5, obs: 5 },
    deck: [],
    implants: [],
    consumables: [],
    party: [{ id: 'se_rin', hp: 1, maxHp: 20, bond: 1 }],
    pools: { cards: [], implants: [], companions: [] },
    flags: { nodes_cleared: 9, [`${KILLED_BY_FLAG}e2_1`]: 1 },
    codex: ['lore_1'],
    seenEvents: [],
    screen: { kind: 'ended', result, endingId },
    log: [],
    echoes: 9 + 4 + 12 + 3,
    uidCounter: 0,
    tally: { kills: 20, elites: 1, bosses: 1, environmentKills: 2, damageTaken: 40, cardsPlayed: 90, floors: 10 },
    startedAt: '2026-10-10T00:00:00.000Z',
    endedAt: '2026-10-10T00:30:00.000Z',
    ...over,
  }
}

test('newProfile and migrateProfile tolerate garbage', () => {
  const p = newProfile('  ')
  assert.equal(p.playerName, 'Connector')
  for (const raw of [null, undefined, 42, 'x', [], { echoes: 'lots', history: 'nope', settings: 7 }]) {
    const m = migrateProfile(raw)
    assert.equal(m.version, 2)
    assert.equal(m.echoes, 0)
    assert.deepEqual(m.history, [])
    assert.equal(m.settings.lang, 'ko')
  }
  const m = migrateProfile({
    playerName: 'Neo',
    echoes: 12.7,
    totalEchoes: 3,
    loops: -4,
    bestAct: 999,
    unlocks: ['a', 'a', 3, 'b'],
    paradoxUnlocked: 99,
    history: [{ id: 'r1', result: 'victory', act: 3, party: ['se_rin', 5] }, { nope: true }, ...Array.from({ length: 40 }, (_, i) => ({ id: `h${i}` }))],
    lastDeath: { killedBy: 'b1', act: 1, loop: 2 },
    settings: { lang: 'en', sfx: false },
  })
  assert.equal(m.playerName, 'Neo')
  assert.equal(m.echoes, 12)
  assert.equal(m.totalEchoes, 12, 'total never below spendable')
  assert.equal(m.loops, 0)
  assert.equal(m.bestAct, 99, 'Deep Signal acts go past 3; garbage is still capped')
  assert.deepEqual(m.unlocks, ['a', 'b'])
  assert.equal(m.paradoxUnlocked, MAX_PARADOX)
  assert.equal(m.history.length, HISTORY_CAP)
  assert.equal(m.history[0]?.result, 'victory')
  assert.deepEqual(m.history[0]?.party, ['se_rin'])
  assert.equal(m.lastDeath?.killedBy, 'b1')
  assert.deepEqual(m.settings, { lang: 'en', sfx: false, bgm: true, fastAnim: false, ai: true })
  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(m))), m, 'migrate is idempotent')
})

test('unlocks: requirements, costs, ownership', () => {
  const poor = newProfile('p')
  assert.equal(canBuyUnlock(poor, 'comp_tae_o', C).ok, false)
  assert.match(canBuyUnlock(poor, 'comp_tae_o', C).reason?.en ?? '', /Needs ◈20/)
  assert.equal(canBuyUnlock(poor, 'nope', C).ok, false)
  assert.equal(buyUnlock(poor, 'comp_tae_o', C), poor, 'unaffordable buy is a no-op')

  let p = rich()
  assert.match(canBuyUnlock(p, 'comp_han', C).reason?.en ?? '', /Requires/)
  p = buyUnlock(p, 'comp_tae_o', C)
  assert.equal(p.echoes, 480)
  assert.deepEqual(p.unlocks, ['comp_tae_o'])
  assert.equal(canBuyUnlock(p, 'comp_tae_o', C).ok, false, 'already owned')
  p = buyUnlock(p, 'comp_han', C)
  assert.deepEqual(unlockedCompanions(p, C), ['se_rin', 'tae_o', 'han'])
  assert.deepEqual(unlockedArchetypes(p, C), ['ghost'])
  assert.deepEqual(unlockedArchetypes(buyUnlock(p, 'arch_smuggler', C), C), ['ghost', 'smuggler'])
})

test('pools filter rarity, owner, archetype and packs', () => {
  const base = cardPool(newProfile('p'), 'ghost', C)
  for (const id of ['c_a', 'u_a', 'r_a', 'ghost_only', 'connector_card']) assert.ok(base.includes(id), id)
  for (const id of ['strike', 'static', 'special_x', 'serin_a', 'smug_only', 'pack_card']) assert.ok(!base.includes(id), id)
  assert.ok(cardPool(newProfile('p'), 'smuggler', C).includes('smug_only'))
  assert.ok(cardPool(rich(['pack_x']), 'ghost', C).includes('pack_card'))

  const imps = implantPool(newProfile('p'), C)
  assert.ok(!imps.includes('starter_imp') && !imps.includes('imp_pack'))
  assert.ok(imps.includes('imp_b1') && imps.includes('imp_s1'))
  assert.ok(implantPool(rich(['ipack']), C).includes('imp_pack'))
})

test('threadPassive merges purchased threads', () => {
  const tp = threadPassive(rich(['thread_hp', 'thread_credits', 'thread_remove', 'comp_tae_o']), C)
  assert.equal(tp.maxHp, 4)
  assert.equal(tp.startCredits, 25)
  assert.equal(tp.traceMult, -0.5)
  assert.equal(tp.startRemove, true)
  assert.equal(tp.startConsumable, 'patch')
  assert.deepEqual(tp.stats, { agi: 1 })
  assert.deepEqual(threadPassive(newProfile('p'), C), {})
})

test('applyRunEnd banks a defeat with history, last death and merges', () => {
  const run = endedRun()
  const echoes = computeEchoes(run, C)
  assert.deepEqual(echoes, { nodes: 9, elites: 4, bosses: 12, other: 3, victory: 0, ending: 5, total: 33 })
  const before = { ...newProfile('p'), codex: ['lore_2'], companionsMet: ['se_rin'] }
  const p = applyRunEnd(before, run, C, 'IX remembers.')
  assert.equal(p.echoes, 33)
  assert.equal(p.totalEchoes, 33)
  assert.equal(p.loops, 1)
  assert.equal(p.wins, 0)
  assert.equal(p.bestAct, 2)
  assert.equal(p.paradoxUnlocked, 0)
  assert.deepEqual(p.codex.sort(), ['lore_1', 'lore_2'])
  assert.deepEqual(p.companionsMet, ['se_rin'])
  assert.deepEqual(p.endingsSeen, ['ending_forced_erasure'])
  assert.deepEqual(p.lastDeath, { killedBy: 'e2_1', act: 2, loop: 1 })
  assert.equal(p.history[0]?.result, 'defeat')
  assert.equal(p.history[0]?.killedBy, 'e2_1')
  assert.equal(p.history[0]?.chronicle, 'IX remembers.')
  assert.equal(p.history[0]?.echoes, 33)
  assert.equal(applyRunEnd(p, run, C), p, 'banking the same run twice is a no-op')
  // Events met this run count once each toward the déjà-vu opening of later loops.
  const seen = applyRunEnd({ ...before, eventsSeen: { ev_a: 2 } }, endedRun({ seenEvents: ['ev_a', 'ev_b', 'ev_a'] }), C)
  assert.deepEqual(seen.eventsSeen, { ev_a: 3, ev_b: 1 })
  assert.deepEqual(migrateProfile({ ...seen, eventsSeen: { ev_a: 3, bad: -1, junk: 'x' } }).eventsSeen, { ev_a: 3 })
  const live = endedRun({ screen: { kind: 'map' } })
  assert.equal(applyRunEnd(before, live, C), before, 'unfinished runs are not banked')
})

test('applyRunEnd banks a victory: bonuses, wins, paradox unlock (capped), history cap', () => {
  const run = endedRun({ act: 3, paradox: 4, flags: { nodes_cleared: 24 }, echoes: 24 + 8 + 36 }, 'victory', 'ending_code_rewrite')
  const start: MetaProfile = {
    ...newProfile('p'),
    loops: 6,
    paradoxUnlocked: 2,
    history: Array.from({ length: HISTORY_CAP }, (_, i) => ({
      id: `old${i}`, loop: i, archetype: 'ghost', result: 'defeat' as const, endingId: 'x', act: 1, floors: 3, echoes: 1, party: [], endedAt: '',
    })),
  }
  const p = applyRunEnd(start, run, C)
  assert.equal(p.echoes, 24 + 8 + 36 + 25 + 30)
  assert.equal(p.wins, 1)
  assert.equal(p.loops, 7)
  assert.equal(p.bestAct, 3)
  assert.equal(p.paradoxUnlocked, 5)
  assert.equal(p.lastDeath, undefined)
  assert.equal(p.history.length, HISTORY_CAP)
  assert.equal(p.history[0]?.id, 'run-x')
  assert.equal(applyRunEnd({ ...start, paradoxUnlocked: MAX_PARADOX }, { ...run, id: 'r2', paradox: MAX_PARADOX }, C).paradoxUnlocked, MAX_PARADOX)

  const abandoned = endedRun({ id: 'ab', flags: { abandoned: 1 } })
  const q = applyRunEnd(newProfile('p'), abandoned, C)
  assert.equal(q.history[0]?.result, 'abandoned')
  assert.equal(q.lastDeath, undefined)
})
