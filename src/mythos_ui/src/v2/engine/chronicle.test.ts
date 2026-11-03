import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { CORE_CARDS, carryOver, defaultCore, finishChapter, migrateChronicle } from './chronicle.ts'
import { migrateProfile, newProfile } from './meta.ts'
import { newRun } from './run.ts'

const run = () => newRun({ ...newProfile('T'), wins: 1 }, { archetype: 'ghost', paradox: 0, seed: 11, crpg: { background: null } }, C)

test('chronicle save: an old profile loads exactly as before (no chronicle field appears)', () => {
  const old = JSON.parse(JSON.stringify(newProfile('T')))
  const back = migrateProfile(JSON.parse(JSON.stringify(old)))
  assert.equal(back.chronicle, undefined)
  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(back))), back, 'migration is stable')
})

test('chronicle save: a finished chapter round-trips through JSON and the profile migration', () => {
  const r = run()
  r.stats = { str: 7, agi: 5, int: 3, cha: 2, obs: 9 }
  r.axes = { humanity: 3, insight: 1 }
  if (r.crpg) r.crpg = { ...r.crpg, approval: { se_rin: 4 }, quests: { q_cut_names: 2 }, rep: { offgrid: 2 } }
  const rare = Object.values(C.cards).find((c) => c.rarity === 'rare')
  if (rare) r.deck.push({ uid: 'rare1', defId: rare.id, upgraded: true })
  const carried = carryOver(r, C)
  assert.equal(carried.coreCards.length, CORE_CARDS)
  if (rare) assert.equal(carried.coreCards[0], rare.id, 'the strongest card leads the default core')
  const state = finishChapter(undefined, 1, carried)
  assert.equal(state.chapter, 2)
  assert.deepEqual(state.chaptersDone, [1])
  const profile = { ...newProfile('T'), chronicle: state }
  const back = migrateProfile(JSON.parse(JSON.stringify(profile)))
  assert.deepEqual(back.chronicle, state)
  assert.ok(JSON.stringify(state).length < 4096, 'tiny next to the 512 KB save cap')
})

test('chronicle save: malformed data is dropped or clamped, never trusted', () => {
  assert.equal(migrateChronicle(null), undefined)
  assert.equal(migrateChronicle({ chapter: 2, carried: {} }), undefined, 'no archetype: no chronicle')
  const m = migrateChronicle({ chapter: 99, chaptersDone: [1, 1, 7, 'x'], carried: { archetype: 'ghost', stats: { str: 400 }, axes: { humanity: 2, evil: 9 }, rep: { grid: 1, moon: 3 }, coreCards: ['a', 'b', 'c', 'd', 5] } })
  assert.equal(m?.chapter, 5)
  assert.deepEqual(m?.chaptersDone, [1])
  assert.equal(m?.carried.stats.str, 20)
  assert.deepEqual(m?.carried.axes, { humanity: 2 })
  assert.deepEqual(m?.carried.rep, { grid: 1 })
  assert.deepEqual(m?.carried.coreCards, ['a', 'b', 'c'])
  assert.deepEqual(defaultCore({ deck: [] }, C), [])
})

test('chronicle prototype: a chapter is Act 1 with districts, ends at its boss, banks the connector, and the next chapter starts with it', async () => {
  const { simulateRun } = await import('./runSim.ts')
  const { applyRunEnd } = await import('./meta.ts')
  const { lastAct, CHRONICLE_CHAPTER_ENDING } = await import('./run.ts')
  assert.equal(lastAct({ mode: 'chronicle' }, C), 1)
  let won: ReturnType<typeof simulateRun> | undefined
  let seed = 1
  for (; seed < 40 && !won; seed++) {
    const r = simulateRun(seed, 'ghost', C, 'greedy', { profile: newProfile('T'), mode: 'chronicle', crpg: { background: null } })
    if (r.won) won = r
  }
  assert.ok(won, 'the greedy bot clears a chapter')
  assert.equal(won.act, 1)
  // Bank it: rebuild the ended run the way the shell does and run applyRunEnd.
  const start = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: seed - 1, mode: 'chronicle' }, C)
  assert.equal(start.mode, 'chronicle')
  assert.ok(start.crpg, 'chronicle chapters always play with districts')
  start.stats = { str: 9, agi: 4, int: 4, cha: 4, obs: 4 }
  const ended = { ...start, screen: { kind: 'ended', result: 'victory', endingId: CHRONICLE_CHAPTER_ENDING } } as typeof start
  const profile = applyRunEnd(newProfile('T'), ended, C)
  assert.equal(profile.chronicle?.chapter, 2)
  assert.equal(profile.wins, 0, 'a chapter clear is not a loop victory')
  assert.equal(profile.paradoxUnlocked, 0)
  assert.deepEqual(profile.chronicle?.chaptersDone, [1])
  const next = newRun(profile, { archetype: 'ghost', paradox: 0, seed: 5, mode: 'chronicle' }, C)
  assert.equal(next.stats.str, 9, 'stats carried over')
  for (const id of profile.chronicle?.carried.coreCards ?? []) assert.ok(next.deck.some((k) => k.defId === id), `core card ${id} in the new deck`)
  const plain = newRun(profile, { archetype: 'ghost', paradox: 0, seed: 5 }, C)
  assert.notEqual(plain.mode, 'chronicle')
  assert.notEqual(plain.stats.str, 9, 'a normal run ignores the chronicle')
})

test('chronicle: the core pick keeps only cards from the run deck, three at most', async () => {
  const { withCore } = await import('./chronicle.ts')
  const state = finishChapter(undefined, 1, carryOver(run(), C))
  const deck = [{ defId: 'packet_shot' }, { defId: 'shove' }, { defId: 'covering_noise' }, { defId: 'repulse' }]
  assert.deepEqual(withCore(state, ['shove', 'not_in_deck', 'shove', 'packet_shot', 'repulse', 'covering_noise'], deck).carried.coreCards, ['shove', 'packet_shot', 'repulse'])
})
