import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../../content/index.ts'
import { newProfile } from '../../engine/meta.ts'
import type { MetaProfile, RunRecord } from '../../engine/types.ts'
import { MEMORY_FACTS, habitFact, habits, ixHabitLine, loopMemory, loopsWith, timesWord } from './loopMemory.ts'

const rec = (over: Partial<RunRecord>): RunRecord => ({
  id: 'r',
  loop: 1,
  archetype: 'ghost',
  result: 'defeat',
  endingId: 'forced_erasure',
  act: 1,
  floors: 7,
  echoes: 10,
  party: ['se_rin'],
  endedAt: '2026-10-17T00:00:00.000Z',
  ...over,
})

test('no history, no memory; daily runs are not IX loops', () => {
  const p = newProfile('T')
  assert.deepEqual(loopMemory(p, C, 'ko'), [])
  assert.deepEqual(loopMemory({ ...p, history: [rec({ daily: '2026-10-16' })] }, C, 'ko'), [])
})

test('a boss that already ended loops comes first, counted in words; facts are capped and digit-free', () => {
  const boss = 'a1_boss_haetae'
  const history = [rec({ killedBy: boss }), rec({ killedBy: boss, archetype: 'smuggler' }), rec({ result: 'victory', act: 3, endingId: Object.keys(C.endings)[0] as string }), rec({ result: 'abandoned', act: 2 }), rec({ killedBy: boss })]
  const p: MetaProfile = { ...newProfile('T'), history }
  const ko = loopMemory(p, C, 'ko', boss)
  assert.ok(ko[0]?.startsWith('지난 루프들에서 이 '), ko[0])
  assert.ok(ko[0]?.includes('세 번'), ko[0])
  assert.ok(ko[1]?.includes('기록된 접속 다섯 번 중 끝까지 간 것은 한 번'), ko[1])
  assert.equal(ko.length, MEMORY_FACTS)
  // Counts are words; the only digits left belong to proper names ("C-17 블랙아웃").
  const noCount = (f: string) => !/\d/.test(f.replace(/C-17/g, ''))
  for (const f of ko) assert.ok(noCount(f), `no digits: ${f}`)
  assert.ok(ko.some((f) => f.includes('데이터 밀수꾼으로 접속해') || f.includes('유령 신호로 접속해')), ko.join(' | '))
  assert.ok(ko.every((f) => !f.includes('세린와')), 'particle follows the name')
  const en = loopMemory(p, C, 'en', boss)
  assert.ok(en[0]?.includes('three times'), en[0])
  assert.ok(en[1]?.startsWith('Recorded connections: five; reached the end: one'), en[1])
  for (const f of en) assert.ok(noCount(f), `no digits: ${f}`)
  // An encounter that never ended a loop adds no first fact.
  assert.ok(!loopMemory(p, C, 'ko', 'a2_boss_unknown')[0]?.startsWith('지난 루프들에서 이 '))
  assert.equal(timesWord(12, 'ko'), '여러 번')
})

test('loopsWith counts earlier normal loops a companion was recruited in', () => {
  const history = [rec({ party: ['se_rin', 'han'] }), rec({ party: ['han'], daily: '2026-10-16' }), rec({ party: ['tae_o'] }), rec({ party: ['han'] })]
  assert.equal(loopsWith({ history }, 'han'), 2, 'daily runs do not count')
  assert.equal(loopsWith({ history }, 'kai'), 0)
})

test('IX profiles habits: where loops end, the deck lean, the companion, the shape; they take turns; nothing under three loops', () => {
  const p = (history: RunRecord[]): MetaProfile => ({ ...newProfile('T'), history })
  const kaiWins = [rec({ party: ['kai'], result: 'victory', act: 3 }), rec({ party: ['kai', 'han'], result: 'victory', act: 3 }), rec({ party: ['se_rin'], result: 'victory', act: 3 })]
  assert.deepEqual(habits(kaiWins), [{ kind: 'mate', id: 'kai' }, { kind: 'archetype', id: 'ghost' }])
  // Three loops → index 3 % 2 = 1: the shape this time, the companion on the next count.
  assert.equal(habitFact(kaiWins, C, 'en'), `The connector nearly always connects as ${C.archetypes.ghost?.name.en}`)
  assert.equal(habitFact([...kaiWins, rec({ party: ['kai'], result: 'victory', act: 3 })], C, 'ko'), '접속자는 거의 매번 카이를 데려온다')
  const act2 = [
    rec({ act: 2, lean: 'attack', party: ['han'], archetype: 'ghost' }),
    rec({ act: 2, lean: 'attack', party: ['kai'], archetype: 'smuggler' }),
    rec({ act: 2, lean: 'attack', party: [], archetype: 'echo_collector' }),
    rec({ act: 1, lean: 'attack', party: ['tae_o'], archetype: 'smuggler' }),
  ]
  assert.deepEqual(habits(act2).map((h) => h.kind), ['act', 'lean'])
  assert.equal(habitFact(act2, C, 'en'), `The connector's loops usually end in ${C.acts[2]?.name.en}`)
  assert.equal(ixHabitLine([...act2, rec({ act: 1, lean: 'attack', party: ['io'], archetype: 'ghost' })], C, 'ko'), '당신은 늘 먼저 때립니다. 관찰 중입니다.')
  assert.ok(loopMemory(p(act2), C, 'ko').some((f) => f.includes('대개')))
  assert.equal(habitFact(kaiWins.slice(0, 2), C, 'ko'), null)
  assert.equal(ixHabitLine(kaiWins.slice(0, 2), C, 'ko'), null)
  for (const lang of ['ko', 'en'] as const) for (const r of [kaiWins, act2]) assert.ok(!/\d/.test(ixHabitLine(r, C, lang) ?? ''), 'no digits')
})
