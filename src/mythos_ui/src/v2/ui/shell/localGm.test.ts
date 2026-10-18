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
