import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyResult } from '../../engine/types.ts'
import type { DailyBoardData } from '../../net/daily.ts'
import { boardView, dayOf, firstTab, rankText, resultLabel, submitLine, timeLabel } from './dailyBoard.ts'

const r = (o: Partial<DailyResult> = {}): DailyResult => ({ archetype: 'ghost', won: false, act: 2, floors: 12, echoes: 40, kills: 20, ...o })
const board = (o: Partial<DailyBoardData>): DailyBoardData => ({ date: '2026-10-11', archetype: 'ghost', total: 0, entries: [], me: null, ...o })

test('my row in the top list is flagged in place, nothing appended', () => {
  const v = boardView(
    board({
      total: 3,
      entries: [
        { rank: 2, name: 'B', result: r(), me: true },
        { rank: 1, name: 'A', result: r({ won: true }), me: false },
        { rank: 3, name: '  ', result: r(), me: false },
      ],
      me: { rank: 2, name: 'B', result: r() },
    }),
  )
  assert.deepEqual(
    v.rows.map((x) => [x.rank, x.name, x.me]),
    [
      [1, 'A', false],
      [2, 'B', true],
      [3, '익명', false],
    ],
  )
  assert.equal(v.myRow, null)
  assert.equal(v.total, 3)
})

test('my place outside the top 20 is appended separately with its rank', () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, name: `P${i + 1}`, result: r(), me: false }))
  const v = boardView(board({ total: 57, entries, me: { rank: 42, name: 'Me', result: r({ floors: 3 }) } }))
  assert.equal(v.rows.length, 20)
  assert.equal(v.myRow?.rank, 42)
  assert.equal(v.myRow?.me, true)
  assert.equal(v.total, 57)
})

test('empty board vs. an empty top list with my row', () => {
  assert.equal(boardView(board({})).empty, true)
  assert.equal(boardView(board({ me: { rank: 1, name: 'Me', result: r() } })).empty, false)
})

test('rank text, improved flag and waiting states', () => {
  assert.deepEqual(rankText(3, 41), { ko: '오늘 3위 / 총 41명', en: 'Today: #3 of 41' })
  assert.deepEqual(rankText(5, 2, 'yesterday'), { ko: '어제 5위 / 총 5명', en: 'Yesterday: #5 of 5' })
  const ranked = submitLine({ kind: 'ranked', rank: 1, total: 9, best: r(), improved: true })
  assert.equal(ranked.text.ko, '오늘 1위 / 총 9명')
  assert.equal(ranked.improved, true)
  assert.equal(submitLine(null).tone, 'wait')
  assert.equal(submitLine({ kind: 'queued' }).tone, 'wait')
  assert.equal(submitLine({ kind: 'signed-out' }).text.ko, '로그인하면 기록이 올라간다.')
  assert.equal(submitLine({ kind: 'rejected' }).tone, 'warn')
})

test('labels: result, time, day, first tab', () => {
  assert.equal(resultLabel(r({ won: true })).ko, '승리')
  assert.equal(resultLabel(r()).ko, '2막 · 12구역')
  assert.equal(timeLabel(754), '12:34')
  assert.equal(timeLabel(3723), '1:02:03')
  assert.equal(timeLabel(undefined), '')
  assert.equal(dayOf('2026-10-11', '2026-10-11', '2026-10-10'), 'today')
  assert.equal(dayOf('2026-10-10', '2026-10-11', '2026-10-10'), 'yesterday')
  assert.equal(firstTab(['ghost', 'smuggler'], 'smuggler'), 'smuggler')
  assert.equal(firstTab(['ghost', 'smuggler'], 'nope'), 'ghost')
})
