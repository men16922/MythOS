// Daily-seed mode: date keys, the shared seed, the daily newRun rules, banking the day's
// best, and — the point of the mode — two very different profiles getting the same run.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { autoPlay } from './combatSim.ts'
import {
  DAILY_CAP,
  KST_OFFSET_MINUTES,
  attemptsLabel,
  dailyLabel,
  dailySeed,
  dateKeyAt,
  dateLabel,
  isBetterDaily,
  isDateKey,
  recentDateKeys,
  shiftDateKey,
} from './daily.ts'
import { applyRunEnd, buyUnlock, cardPool, implantPool, migrateProfile, newProfile, unlockedCompanions } from './meta.ts'
import { hashSeed } from './rng.ts'
import {
  FIRST_COMPANION,
  abandonRun,
  applyImprovisation,
  availableEndings,
  chooseEnding,
  chooseEventOption,
  continueEvent,
  enterNode,
  eventOptions,
  leaveReward,
  leaveRest,
  leaveShop,
  leaveTreasure,
  newRun,
  openTreasure,
  pickCard,
  pickCardReward,
  pickableCards,
  reachableNodes,
  restHeal,
  shopBuyCard,
  startAct,
  takeRewardCard,
  takeRewardCredits,
  takeRewardImplant,
  updateCombat,
} from './run.ts'
import { simulateRun } from './runSim.ts'
import type { DailyResult, MetaProfile, RunState } from './types.ts'

const DAY = '2026-10-11'
const NOW = '2026-10-11T03:00:00.000Z'
const ARCHETYPES = Object.keys(C.archetypes)

/** A fresh connector: nothing unlocked, never played. */
const FRESH = newProfile('Fresh')

/** A veteran: every unlock bought (threads, packs, companions, archetypes), many loops, high paradox. */
function veteran(): MetaProfile {
  let p: MetaProfile = { ...newProfile('Veteran'), echoes: 1e6, totalEchoes: 1e6, loops: 37, wins: 9, bestAct: 3, paradoxUnlocked: 5 }
  // Buy in passes so `requires` chains (thread_vitality_1 → 2 → 3) resolve.
  for (let pass = 0; pass < 5; pass++) for (const id of Object.keys(C.unlocks)) p = buyUnlock(p, id, C)
  return p
}
const VETERAN = veteran()

/** The parts of a run that may legitimately differ between players: identity and wall clock. */
function shape(run: RunState): Partial<RunState> {
  const rest: Partial<RunState> = { ...run }
  delete rest.id
  delete rest.loop
  delete rest.startedAt
  delete rest.endedAt
  return rest
}

/** Scripted, deterministic player: same inputs every time (real combat via the greedy bot). */
function step(run: RunState): RunState {
  const s = run.screen
  switch (s.kind) {
    case 'act_intro':
      return startAct(run, C)
    case 'map':
      return enterNode(run, reachableNodes(run)[0] as string, C)
    case 'combat': {
      let end = autoPlay(s.combat, C, 'greedy', 30)
      if (end.phase === 'player') end = { ...end, phase: 'lost' }
      return updateCombat(run, end, C)
    }
    case 'reward': {
      let r = takeRewardCredits(run, C)
      s.reward.cardChoices.forEach((g, i) => (r = takeRewardCard(r, i, g[0] ?? null, C)))
      if (s.reward.implantChoices[0]) r = takeRewardImplant(r, s.reward.implantChoices[0], C)
      return leaveReward(r, C)
    }
    case 'event': {
      if (s.resolved) return continueEvent(run, C)
      const open = eventOptions(run, C).find((o) => o.available)
      return open ? chooseEventOption(run, open.index, C) : applyImprovisation(run, IMPROV, C)
    }
    case 'shop':
      return leaveShop(shopBuyCard(run, 0, C), C)
    case 'rest':
      return leaveRest(restHeal(run, C), C)
    case 'treasure':
      return leaveTreasure(openTreasure(run, C), C)
    case 'card_pick':
      return pickCard(run, pickableCards(run, C)[0]?.uid as string, C)
    case 'card_reward':
      return pickCardReward(run, s.choices[0] ?? null, C)
    case 'final_choice':
      return chooseEnding(run, availableEndings(run, C).find((v) => v.available)?.ending.id as string, C)
    case 'ended':
      return run
  }
}

const IMPROV = { action: 'x', stat: 'agi', dc: 5, reward: 'heal', risk: 'trace', successText: { ko: 'a', en: 'a' }, failureText: { ko: 'b', en: 'b' } } as const

const daily = (profile: MetaProfile, archetype: string, date = DAY, extra: { companion?: string | null; paradox?: number } = {}): RunState =>
  newRun(profile, { archetype, paradox: extra.paradox ?? 0, companion: extra.companion, now: NOW, daily: date }, C)

// ---------------------------------------------------------------- date keys + seed

test('dateKeyAt turns an instant into the KST calendar date (midnight is 15:00 UTC)', () => {
  assert.equal(KST_OFFSET_MINUTES, 540)
  assert.equal(dateKeyAt(Date.parse('2026-10-10T14:59:59.999Z')), '2026-10-10')
  assert.equal(dateKeyAt(Date.parse('2026-10-10T15:00:00.000Z')), '2026-10-11')
  assert.equal(dateKeyAt(Date.parse('2026-12-31T15:00:00.000Z')), '2027-01-01')
  assert.equal(dateKeyAt(Date.parse('2028-02-28T15:00:00.000Z')), '2028-02-29', 'leap day')
  assert.equal(dateKeyAt(Date.parse('2026-10-10T15:00:00.000Z'), 0), '2026-10-10', 'UTC offset')
  // Integer calendar math agrees with the platform's for a spread of instants.
  for (let i = 0; i < 500; i++) {
    const ms = Date.UTC(1999, 0, 1) + i * 7_919_993_331
    assert.equal(dateKeyAt(ms), new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10))
  }
})

test('date keys validate, shift across month/year ends and list the last N days', () => {
  for (const ok of ['2026-10-11', '2028-02-29', '2000-02-29']) assert.ok(isDateKey(ok), ok)
  for (const bad of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-1', '26-10-11', '', 42, null]) assert.equal(isDateKey(bad), false, String(bad))
  assert.equal(shiftDateKey('2026-10-11', -11), '2026-09-30')
  assert.equal(shiftDateKey('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDateKey('2028-03-01', -1), '2028-02-29')
  assert.deepEqual(recentDateKeys('2026-10-02', 4), ['2026-10-02', '2026-10-01', '2026-09-30', '2026-09-29'])
  assert.throws(() => shiftDateKey('nope', 1))
  assert.deepEqual(dateLabel('2026-10-11'), { ko: '10월 11일 (일)', en: 'Sun, Oct 11' })
  assert.deepEqual(dateLabel('2028-02-29'), { ko: '2월 29일 (화)', en: 'Tue, Feb 29' })
  assert.deepEqual(dateLabel('1969-12-31'), { ko: '12월 31일 (수)', en: 'Wed, Dec 31' })
  assert.deepEqual(dateLabel('junk'), { ko: 'junk', en: 'junk' })
})

test('dailySeed depends on the date and the archetype only', () => {
  assert.equal(dailySeed(DAY, 'ghost'), hashSeed('daily:2026-10-11|ghost'))
  assert.equal(dailySeed(DAY, 'ghost'), dailySeed(DAY, 'ghost'))
  assert.notEqual(dailySeed(DAY, 'ghost'), dailySeed(DAY, 'smuggler'))
  assert.notEqual(dailySeed(DAY, 'ghost'), dailySeed('2026-10-12', 'ghost'))
  assert.throws(() => dailySeed('2026-02-30', 'ghost'))
})

// ---------------------------------------------------------------- the daily run rules

test('a daily run: date seed, paradox 0, Se-rin, base pools, no threads, flagged with its date', () => {
  const run = daily(VETERAN, 'ghost', DAY, { companion: 'kai', paradox: 5 })
  assert.equal(run.daily, DAY)
  assert.equal(run.seed, dailySeed(DAY, 'ghost'))
  assert.equal(run.paradox, 0, 'paradox is fixed at 0')
  assert.equal(run.trace, 0)
  assert.deepEqual(
    run.party.map((m) => m.id),
    [FIRST_COMPANION],
    'Se-rin starts every daily; the requested companion is ignored',
  )
  const base = newProfile('anyone')
  assert.deepEqual(run.pools, { cards: cardPool(base, 'ghost', C), implants: implantPool(base, C), companions: unlockedCompanions(base, C) })
  assert.ok(cardPool(VETERAN, 'ghost', C).length > run.pools.cards.length, 'the veteran owns packs the daily leaves out')
  assert.deepEqual(
    Object.keys(run.flags).filter((k) => k.startsWith('thread_')),
    [],
    'no Archive thread multipliers',
  )
  assert.equal(run.maxHp, C.archetypes.ghost?.maxHp, 'no vitality threads')
  assert.equal(run.loop, VETERAN.loops + 1, 'the loop number is still the profile’s (bookkeeping only)')
  assert.match(run.log[0]?.note.ko ?? '', /오늘의 시드 2026-10-11/)
  assert.throws(() => daily(FRESH, 'ghost', '2026-02-30'))
  assert.equal(newRun(FRESH, { archetype: 'ghost', paradox: 0, now: NOW }, C).daily, undefined, 'normal runs carry no daily flag')
})

test('determinism: a fresh and a veteran profile get the identical daily (map, first event, every step)', () => {
  for (const arch of ARCHETYPES) {
    const a0 = daily(FRESH, arch)
    const b0 = daily(VETERAN, arch)
    assert.notEqual(a0.id, b0.id, 'ids stay per-profile (each attempt banks once)')
    assert.deepEqual(b0.map, a0.map, `${arch}: same act 1 map`)
    assert.deepEqual(shape(b0), shape(a0), `${arch}: same starting state`)

    const a1 = startAct(a0, C)
    const b1 = startAct(b0, C)
    assert.equal(a1.screen.kind, 'event', `${arch}: the run opens on an event`)
    assert.deepEqual(b1.screen, a1.screen, `${arch}: same first event`)

    // Same scripted inputs → the same run, step for step, to the very end.
    let a = a1
    let b = b1
    const events: string[] = []
    for (let i = 0; a.screen.kind !== 'ended' && i < 3000; i++) {
      if (a.screen.kind === 'event' && !a.screen.resolved) events.push(a.screen.eventId)
      a = step(a)
      b = step(b)
      assert.deepEqual(shape(b), shape(a), `${arch}: diverged at step ${i} (${a.screen.kind})`)
    }
    assert.equal(a.screen.kind, 'ended', `${arch}: scripted run finishes`)
    assert.ok(events.length >= 2, `${arch}: saw several events (${events.join(', ')})`)

    // And both profiles bank the same day result.
    const pa = applyRunEnd(FRESH, a, C).daily?.[DAY]
    const pb = applyRunEnd(VETERAN, b, C).daily?.[DAY]
    assert.ok(pa && pb)
    assert.deepEqual({ ...pb.best, secs: 0 }, { ...pa.best, secs: 0 }, `${arch}: same banked result (wall-clock time aside)`)
  }
})

test('determinism via runSim: whole simulated dailies match across profiles; other days differ', () => {
  for (const arch of ARCHETYPES) {
    for (const policy of ['greedy', 'basic'] as const) {
      const fresh = simulateRun(1, arch, C, policy, { daily: DAY, profile: FRESH })
      const vet = simulateRun(999, arch, C, policy, { daily: DAY, profile: VETERAN, paradox: 5 })
      assert.deepEqual(vet, fresh, `${arch}/${policy}: same outcome`)
    }
    const maps = new Set(['2026-10-11', '2026-10-12', '2026-10-13'].map((d) => JSON.stringify(daily(FRESH, arch, d).map)))
    assert.equal(maps.size, 3, `${arch}: each day has its own map`)
  }
  const perArch = new Set(ARCHETYPES.map((a) => JSON.stringify(daily(FRESH, a).map)))
  assert.equal(perArch.size, ARCHETYPES.length, 'each archetype has its own daily')
})

// ---------------------------------------------------------------- records

const result = (over: Partial<DailyResult> = {}): DailyResult => ({ archetype: 'ghost', won: false, act: 1, floors: 3, echoes: 5, kills: 4, ...over })

test('isBetterDaily ranks won > act > sectors > echoes > kills > faster', () => {
  assert.ok(isBetterDaily(result(), undefined))
  assert.ok(isBetterDaily(result({ won: true, act: 3 }), result({ act: 3, floors: 30 })))
  assert.ok(isBetterDaily(result({ act: 2, floors: 9 }), result({ act: 1, floors: 9 })))
  assert.ok(isBetterDaily(result({ floors: 4 }), result()))
  assert.ok(isBetterDaily(result({ echoes: 6 }), result()))
  assert.ok(isBetterDaily(result({ kills: 5 }), result()))
  assert.ok(isBetterDaily(result({ secs: 100 }), result({ secs: 200 })))
  assert.ok(isBetterDaily(result({ secs: 100 }), result()), 'a known time beats an unknown one')
  assert.equal(isBetterDaily(result(), result()), false, 'a tie keeps the old best')
  assert.equal(isBetterDaily(result({ act: 1, floors: 20 }), result({ act: 2, floors: 9 })), false)
})

test('applyRunEnd records the day: attempts count up, the best result stays', () => {
  const first = abandonRun(daily(FRESH, 'ghost')) // abandoned at once
  let p = applyRunEnd(FRESH, first, C)
  assert.equal(p.daily?.[DAY]?.attempts, 1)
  assert.equal(p.daily?.[DAY]?.best.won, false)
  assert.equal(p.loops, 1, 'a daily is still a loop: banked like any other')
  assert.equal(applyRunEnd(p, first, C), p, 'idempotent per run id')

  // A real attempt that goes further replaces the best; a worse later one only counts.
  let deep = daily(p, 'ghost')
  for (let i = 0; deep.screen.kind !== 'ended' && i < 3000; i++) deep = step(deep)
  p = applyRunEnd(p, deep, C)
  const best = p.daily?.[DAY]?.best
  assert.equal(p.daily?.[DAY]?.attempts, 2)
  assert.ok(best && best.floors === deep.tally.floors && best.act === deep.act && best.kills === deep.tally.kills)
  const worse = abandonRun(daily(p, 'smuggler'))
  p = applyRunEnd(p, worse, C)
  assert.equal(p.daily?.[DAY]?.attempts, 3)
  assert.deepEqual(p.daily?.[DAY]?.best, best)

  // Normal loops never touch the daily records.
  const normal = abandonRun(newRun(p, { archetype: 'ghost', paradox: 0, now: NOW }, C))
  const afterNormal = applyRunEnd(p, normal, C)
  assert.deepEqual(afterNormal.daily, p.daily)
  // The history row says which loops were dailies (and the flag survives migration).
  assert.equal(p.history.find((h) => h.id === worse.id)?.daily, DAY)
  assert.equal(afterNormal.history.find((h) => h.id === normal.id)?.daily, undefined)
  assert.equal(migrateProfile(JSON.parse(JSON.stringify(p))).history.find((h) => h.id === worse.id)?.daily, DAY)
})

test('daily records are capped to the newest days and survive migration', () => {
  let p = FRESH
  for (let i = 0; i < DAILY_CAP + 5; i++) {
    const date = shiftDateKey(DAY, -i)
    p = applyRunEnd(p, abandonRun(daily(p, 'ghost', date)), C)
  }
  const keys = Object.keys(p.daily ?? {}).sort()
  assert.equal(keys.length, DAILY_CAP)
  assert.equal(keys[keys.length - 1], DAY)
  assert.equal(keys[0], shiftDateKey(DAY, -(DAILY_CAP - 1)))

  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(p))), p, 'round-trips through JSON + migrate')
  // Old profiles (no field) and garbage both default to an empty record book.
  const old = { ...FRESH } as Record<string, unknown>
  delete old.daily
  assert.deepEqual(migrateProfile(old).daily, {})
  const m = migrateProfile({
    daily: {
      'not-a-date': { attempts: 2, best: result() },
      '2026-02-30': { attempts: 1, best: result() },
      '2026-10-10': { attempts: -3, best: { won: 'yes', act: 9, floors: 'x', secs: -1 } },
      '2026-10-09': { attempts: 1 },
      '2026-10-08': 'nope',
    },
  })
  assert.deepEqual(m.daily, { '2026-10-10': { attempts: 1, best: { archetype: '', won: false, act: 3, floors: 0, echoes: 0, kills: 0 } } })
})

test('dailyLabel: not tried / act + sectors / won', () => {
  assert.deepEqual(dailyLabel(undefined), { ko: '미도전', en: 'Not tried' })
  assert.deepEqual(dailyLabel({ attempts: 2, best: result({ act: 2, floors: 12 }) }), { ko: '2막 · 12구역', en: 'Act 2 · 12 floors' })
  assert.equal(dailyLabel({ attempts: 1, best: result({ won: true, act: 3 }) }).ko, '승리')
  assert.deepEqual(attemptsLabel(1), { ko: '1회 도전', en: '1 try' })
  assert.equal(attemptsLabel(3).en, '3 tries')
})
