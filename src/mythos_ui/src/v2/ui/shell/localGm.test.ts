// Authored GM fallback lines: no unresolved particles, right particle per name, stable per scene,
// varied across scenes, and always something to show for act intros and events.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { josa } from '../common/lang.ts'
import { localNarrate } from './localGm.ts'

const PLACEHOLDER = /\((이|가|은|는|을|를|과|와|으)\)|이\(가\)|번째 루프/

test('josa picks the particle from the last syllable', () => {
  assert.equal(josa('세린', '이', '가'), '세린이')
  assert.equal(josa('카이', '이', '가'), '카이가')
  assert.equal(josa('태오', '과', '와'), '태오와')
  assert.equal(josa('정세린', '은', '는'), '정세린은')
})

test('local GM lines: every branch resolves, in both languages, without placeholders', () => {
  const parties = [[], ['정세린'], ['카이']]
  const scenes: Record<string, unknown>[] = [
    ...[1, 2, 3].flatMap((act) => [1, 4].map((loop) => ({ kind: 'act_intro', act, loop }))),
    { kind: 'event', title: '첫 번째 갈림길' },
    { kind: 'event', title: '첫 번째 갈림길', seenBefore: 2 },
    { kind: 'event', title: '검문소', trace: 60 },
    { kind: 'event', title: '검문소', choice: '돌아간다' },
    { kind: 'event', title: '검문소', choice: '속인다', success: true },
    { kind: 'event', title: '검문소', choice: '속인다', success: false },
  ]
  for (const lang of ['ko', 'en'] as const) {
    for (const party of parties) {
      for (const s of scenes) {
        const { kind, ...ctx } = s
        const line = localNarrate(kind as 'event', lang, { ...ctx, party } as never)
        assert.ok(line && line.length > 10, `${lang} ${JSON.stringify(s)} ${party}`)
        assert.doesNotMatch(line, PLACEHOLDER, line)
        if (lang === 'ko' && party[0] === '카이') assert.doesNotMatch(line, /카이이|카이은|카이과/, line)
        if (lang === 'ko' && party[0] === '정세린') assert.doesNotMatch(line, /정세린가|정세린는|정세린와/, line)
      }
    }
  }
})

test('local GM lines: same scene reads the same, different scenes read differently', () => {
  const at = (title: string): string => localNarrate('event', 'ko', { title, party: ['정세린'] }) as string
  assert.equal(at('검문소'), at('검문소'))
  const titles = ['검문소', '야시장', '옥상 물탱크', '변전소', '지하 수로', '폐역', '세탁소', '전파상']
  assert.ok(new Set(titles.map((t) => at(t).replace(/‘[^’]*’\. /, ''))).size >= 3, 'at least three distinct lines over eight events')
})

test('local act intro: Act 3 is the ARK Spire, Deep / Sea acts name themselves instead', () => {
  for (const lang of ['ko', 'en'] as const) {
    const act3 = localNarrate('act_intro', lang, { act: 3, actName: 'ARK', loop: 1, party: [] }) ?? ''
    assert.ok(/ARK/.test(act3))
    for (const act of [4, 5, 6]) {
      for (const party of [[], ['Kai']]) {
        const line = localNarrate('act_intro', lang, { act, actName: 'Dreaming Machines', loop: 2, party }) ?? ''
        assert.ok(line.startsWith('Dreaming Machines. '), `act ${act} ${lang}: ${line}`)
        assert.ok(!/ARK|첨탑/.test(line), `act ${act} ${lang}: no Act 3 lines`)
      }
    }
  }
})

test('local event opening: a procedural event names its cast person, in both languages', () => {
  const ko = localNarrate('event', 'ko', { title: '길 잃은 신호', person: '붉은 목도리를 두른 순옥', loop: 1, party: [] }) ?? ''
  assert.ok(ko.includes('붉은 목도리를 두른 순옥이 '), ko)
  assert.equal(ko.split('순옥').length - 1, 1, `the name appears once: ${ko}`)
  const en = localNarrate('event', 'en', { title: 'A Lost Signal', person: 'old Mr. Kang under a plastic sheet instead of an umbrella', loop: 2, party: [] }) ?? ''
  assert.ok(/Mr\. Kang/.test(en), en)
  assert.ok(!/(^|\. |” )old /.test(en), `sentence-initial capital: ${en}`)
})

test('local act intro: Deep and Sea acts 4–6 get their own place lines (no "signal"), keyed by route', () => {
  for (const lang of ['ko', 'en'] as const) {
    const seen = new Set<string>()
    for (const [act, route] of [[4, ''], [5, ''], [6, ''], [4, 'sea_4'], [5, 'sea_5'], [6, 'sea_6']] as const) {
      const line = localNarrate('act_intro', lang, { act, route, actName: 'X', loop: 2, party: [] }) ?? ''
      assert.ok(line.startsWith('X. '), `${act}/${route} ${lang}: ${line}`)
      assert.ok(!/신호|signal/i.test(line), `${act}/${route} ${lang}: ${line}`)
      seen.add(line)
    }
    assert.equal(seen.size, 6, `${lang}: six different places`)
  }
})

test('local act intro: Outside the List gets back-alley lines, not the Data Spire', () => {
  for (const lang of ['ko', 'en'] as const) {
    for (const party of [[], ['Tae-o']]) {
      const line = localNarrate('act_intro', lang, { act: 2, route: 'outside', actName: 'X', loop: 2, party }) ?? ''
      assert.ok(!/스파이어|Spire/.test(line), `${lang}: ${line}`)
      assert.ok(/배식|정리반|세탁|serving|Closing Crew|laundry/.test(line), `${lang}: ${line}`)
    }
  }
})

test('event GM lines on the Sea route carry no city weather (rain, neon, street lamps)', () => {
  const city = /빗물|비가|네온|가로등|발전기|rain|puddle|neon|street lamp|generator/i
  for (const lang of ['ko', 'en'] as const) {
    for (const ctx of [
      { title: 'T', route: 'sea_5' },
      { title: 'T', route: 'sea_4', seenBefore: 2 },
      { title: 'T', route: 'sea_6', trace: 60 },
      { title: 'T', route: 'sea_5', choice: 'go' },
    ]) {
      for (let i = 0; i < 6; i++) {
        const line = localNarrate('event', lang, { ...ctx, loop: i, party: i % 2 ? ['Mujin'] : [] })
        assert.ok(line && !city.test(line), `${lang} ${JSON.stringify(ctx)}: ${line}`)
      }
    }
  }
})
