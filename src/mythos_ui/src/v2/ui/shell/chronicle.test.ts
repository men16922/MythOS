// The authored loop chronicle tells this run's own story: route, bosses, the player's own free action, the end.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../../content/index.ts'
import { KILLED_BY_FLAG, newProfile } from '../../engine/meta.ts'
import { newRun } from '../../engine/run.ts'
import type { RunState } from '../../engine/types.ts'
import { authoredChronicle } from './chronicle.ts'

const PLACEHOLDER = /\((이|가|은|는|을|를|과|와)\)|undefined|NaN/

function played(over: (r: RunState) => void): RunState {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 7 }, C)
  run.act = 2
  run.tally = { ...run.tally, kills: 9, environmentKills: 3, bosses: 1, floors: 12 }
  run.log.push({ act: 1, row: 7, kind: 'boss', note: { ko: '해태', en: 'Haetae' } })
  run.log.push({ act: 2, row: 2, kind: 'event', note: { ko: '즉흥: 드론 배터리를 던진다', en: 'Improvised: Throw the drone battery' } })
  over(run)
  return run
}

test('chronicle: victory names the route, the boss, the player’s own move and the ending', () => {
  const run = played((r) => {
    r.act = 3
    r.screen = { kind: 'ended', result: 'victory', endingId: Object.keys(C.endings)[0] as string }
  })
  const ko = authoredChronicle(run, 'ko', C)
  assert.match(ko, /해태를 넘었다/)
  assert.match(ko, /“드론 배터리를 던진다”/)
  assert.match(ko, /적 9명을 쓰러뜨렸고, 그중 3명은/)
  assert.match(ko, /이번에는 도시가 대답했다/)
  assert.doesNotMatch(ko, PLACEHOLDER)
  const en = authoredChronicle(run, 'en', C)
  assert.match(en, /Got past Haetae/)
  assert.match(en, /“Throw the drone battery”/)
  assert.doesNotMatch(en, PLACEHOLDER)
})

test('chronicle: a defeat names what ended it; an abandoned run says so', () => {
  const enc = Object.keys(C.encounters)[0] as string
  const lost = played((r) => {
    r.flags[`${KILLED_BY_FLAG}${enc}`] = 1
    r.screen = { kind: 'ended', result: 'defeat', endingId: '' }
  })
  const ko = authoredChronicle(lost, 'ko', C)
  assert.match(ko, new RegExp(`${C.encounters[enc]?.name.ko} 앞에서 신호가 끊겼다`))
  assert.doesNotMatch(ko, PLACEHOLDER)
  const gone = played((r) => {
    r.flags.abandoned = 1
    r.screen = { kind: 'ended', result: 'defeat', endingId: '' }
  })
  assert.match(authoredChronicle(gone, 'ko', C), /스스로 접속을 끊었다/)
  assert.match(authoredChronicle(gone, 'en', C), /cut the connection yourself/)
})

test('chronicle: companions are joined with the right particle', () => {
  const run = played((r) => {
    r.screen = { kind: 'ended', result: 'defeat', endingId: '' }
  })
  const names = run.party.map((m) => C.companions[m.id]?.name.ko)
  const ko = authoredChronicle(run, 'ko', C)
  if (names[0]) assert.match(ko, new RegExp(`${names[0]}(과|와) 함께`))
})
