import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { CUTSCENES } from '../content/cutscenes.ts'
import { FEAT_BOSS_FLAWLESS, FEAT_BURSTS, FEAT_FIGHT_TERRAIN, newAchievements, noteFightFeats } from './achievements.ts'
import { applyRunEnd, migrateProfile, newProfile } from './meta.ts'
import type { CombatState, MetaProfile, RunState } from './types.ts'

const deckOf = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `c${i}`, defId: 'strike', upgraded: false }))

/** Minimal ended run (only the fields applyRunEnd and the achievement checks read matter). */
function endedRun(over: Partial<RunState> = {}, result: 'victory' | 'defeat' = 'defeat', endingId = 'ending_forced_erasure'): RunState {
  return {
    version: 2,
    id: 'run-a',
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
    deck: deckOf(25),
    implants: [],
    consumables: [],
    party: [{ id: 'se_rin', hp: 1, maxHp: 20, bond: 1 }],
    pools: { cards: [], implants: [], companions: [] },
    flags: {},
    codex: [],
    seenEvents: [],
    screen: { kind: 'ended', result, endingId },
    log: [],
    echoes: 0,
    uidCounter: 0,
    tally: { kills: 20, elites: 1, bosses: 1, environmentKills: 2, damageTaken: 90, cardsPlayed: 90, floors: 10 },
    startedAt: '2026-10-10T00:00:00.000Z',
    endedAt: '2026-10-10T00:30:00.000Z',
    ...over,
  }
}

const ids = (p: MetaProfile) => p.achievements ?? []

test('content: every achievement is well formed and points at real content', () => {
  const all = Object.values(C.achievements ?? {})
  assert.equal(all.length, 60, 'DLC plan §11: 60 achievements')
  for (const a of all) {
    assert.ok(a.id.startsWith('ach_'), a.id)
    assert.ok(a.name.ko && a.name.en && a.text.ko && a.text.en, `${a.id} text`)
    const w = a.when
    if (w.kind === 'ending') assert.ok(C.endings[w.id], `${a.id} ending ${w.id}`)
    if (w.kind === 'archetypeWin') assert.ok(C.archetypes[w.id], `${a.id} archetype ${w.id}`)
    if (w.kind === 'companionWin') assert.ok(C.companions[w.id], `${a.id} companion ${w.id}`)
    if (w.kind === 'memories') assert.ok(w.n <= CUTSCENES.length, `${a.id} asks for more memories than exist`)
  }
  for (const id of Object.keys(C.archetypes)) assert.ok(C.achievements?.[`ach_arch_${id}`], `archetype ${id} has one`)
  for (const id of Object.keys(C.companions)) assert.ok(C.achievements?.[`ach_comp_${id}`], `companion ${id} has one`)
})

test('a first defeat earns only the first-loop achievement and records it on the history row', () => {
  const p = applyRunEnd(newProfile('T'), endedRun(), C)
  assert.deepEqual(ids(p), ['ach_first_loop'])
  assert.deepEqual(p.history[0]?.achievements, ['ach_first_loop'])
  // Idempotent per run, and never earned twice.
  assert.equal(applyRunEnd(p, endedRun(), C), p)
  const p2 = applyRunEnd(p, endedRun({ id: 'run-b' }), C)
  assert.deepEqual(ids(p2), ['ach_first_loop'])
  assert.equal(p2.history[0]?.achievements, undefined)
})

test('a victory earns the win, archetype and companion achievements', () => {
  const p = applyRunEnd(newProfile('T'), endedRun({ act: 3 }, 'victory', 'ending_code_rewrite'), C)
  for (const id of ['ach_first_loop', 'ach_first_win', 'ach_act_3', 'ach_arch_ghost', 'ach_comp_se_rin']) assert.ok(ids(p).includes(id), id)
  assert.ok(!ids(p).includes('ach_flawless'), '90 damage taken is not flawless')
  assert.ok(!ids(p).includes('ach_lean_deck'), 'a 25-card deck is not lean')
})

test('a daily victory counts for the daily achievement but not for archetype or companion wins', () => {
  const p = applyRunEnd(newProfile('T'), endedRun({ daily: '2026-10-10' }, 'victory', 'ending_code_rewrite'), C)
  assert.ok(ids(p).includes('ach_daily_win'))
  assert.ok(!ids(p).includes('ach_arch_ghost'))
  assert.ok(!ids(p).includes('ach_comp_se_rin'))
})

test('run challenges read the run that just ended', () => {
  const run = endedRun(
    {
      paradox: 10,
      mode: 'deep',
      act: 6,
      deck: deckOf(15),
      tally: { kills: 60, elites: 5, bosses: 6, environmentKills: 21, damageTaken: 35, cardsPlayed: 300, floors: 50 },
    },
    'victory',
    'ending_the_reader',
  )
  const got = newAchievements(applyRunEnd(newProfile('T'), run, C), run, C)
  assert.deepEqual(got, [], 'already banked: nothing new')
  const p = applyRunEnd(newProfile('T'), run, C)
  for (const id of ['ach_paradox_5', 'ach_paradox_10', 'ach_deep_win', 'ach_act_6', 'ach_terrain_20', 'ach_elites_5', 'ach_flawless', 'ach_lean_deck']) {
    assert.ok(ids(p).includes(id), id)
  }
  // A defeat with the same tally keeps the any-result challenges only.
  const lost = applyRunEnd(newProfile('T'), { ...run, screen: { kind: 'ended', result: 'defeat', endingId: 'ending_forced_erasure' } }, C)
  assert.ok(ids(lost).includes('ach_terrain_20'))
  assert.ok(!ids(lost).includes('ach_flawless') && !ids(lost).includes('ach_deep_win') && !ids(lost).includes('ach_paradox_5'))
})

test('the secret ending achievement and an existing veteran profile', () => {
  const veteran: MetaProfile = {
    ...newProfile('V'),
    loops: 40,
    wins: 20,
    bestAct: 6,
    codex: Object.keys(C.lore),
    endingsSeen: Object.keys(C.endings).filter((id) => id !== 'ending_first_record'),
    companionsMet: Object.keys(C.companions),
    cutscenes: CUTSCENES.map((c) => c.id),
    records: ['record_1', 'record_2', 'record_3', 'record_4', 'record_5', 'record_6', 'record_7'],
  }
  const p = applyRunEnd(veteran, endedRun({ mode: 'deep', act: 6 }, 'victory', 'ending_first_record'), C)
  for (const id of ['ach_loops_30', 'ach_wins_15', 'ach_codex_all', 'ach_memories_all', 'ach_met_all', 'ach_records_7', 'ach_endings_all', 'ach_first_record']) {
    assert.ok(ids(p).includes(id), id)
  }
  assert.equal(C.achievements?.ach_first_record?.secret, true)
})

test('migrateProfile keeps achievements and Deep Signal acts on history rows', () => {
  const m = migrateProfile({
    achievements: ['ach_first_loop', 'ach_first_loop', 7],
    history: [{ id: 'r1', act: 6, achievements: ['ach_act_6'] }],
    lastDeath: { killedBy: 'x', act: 5, loop: 3 },
  })
  assert.deepEqual(m.achievements, ['ach_first_loop'])
  assert.equal(m.history[0]?.act, 6)
  assert.deepEqual(m.history[0]?.achievements, ['ach_act_6'])
  assert.equal(m.lastDeath?.act, 5)
  assert.deepEqual(migrateProfile({}).achievements, [])
})

test('fight feats: flawless bosses, best terrain fight and burst fights go into run flags', () => {
  const run = endedRun({ flags: {} })
  const fight = (damageTaken: number, environmentKills: number, burstUsed: boolean) =>
    ({ stats: { enemiesKilled: 3, environmentKills, damageDealt: 20, damageTaken, cardsPlayed: 8 }, burstUsed }) as unknown as CombatState
  noteFightFeats(run, fight(0, 2, true), 'boss')
  noteFightFeats(run, fight(3, 5, false), 'combat')
  noteFightFeats(run, fight(0, 1, true), 'elite')
  noteFightFeats(run, fight(4, 0, false), 'boss')
  assert.equal(run.flags[FEAT_BOSS_FLAWLESS], 1, 'only the boss fought without losing HP')
  assert.equal(run.flags[FEAT_FIGHT_TERRAIN], 5, 'best single fight, not the sum')
  assert.equal(run.flags[FEAT_BURSTS], 2)
})

test('pass 2 conditions: feats, rich / implant / quiet / solo wins, mastery', () => {
  const run = endedRun(
    {
      party: [],
      bench: [],
      credits: 650,
      trace: 25,
      implants: Array.from({ length: 13 }, (_, i) => `imp${i}`),
      flags: { [FEAT_BOSS_FLAWLESS]: 1, [FEAT_FIGHT_TERRAIN]: 5, [FEAT_BURSTS]: 10 },
    },
    'victory',
    'ending_code_rewrite',
  )
  const p = applyRunEnd({ ...newProfile('T'), archetypeWins: { ghost: 5 }, companionWins: { se_rin: 5 } }, run, C)
  for (const id of ['ach_boss_flawless', 'ach_fight_terrain', 'ach_bursts_10', 'ach_rich', 'ach_implants_13', 'ach_quiet', 'ach_solo', 'ach_arch_mastery', 'ach_comp_mastery']) {
    assert.ok(ids(p).includes(id), id)
  }
  // With a companion along and a loud, poor run, none of the win-shape feats fire.
  const plain = applyRunEnd(newProfile('T'), endedRun({ credits: 10, trace: 80 }, 'victory', 'ending_code_rewrite'), C)
  for (const id of ['ach_rich', 'ach_quiet', 'ach_solo', 'ach_boss_flawless', 'ach_arch_mastery']) assert.ok(!ids(plain).includes(id), id)
})
