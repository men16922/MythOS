// net/daily.ts: the submit queue rules (pure) and the submit / retry flow against a scripted server.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { DailyResult } from '../engine/types.ts'
import {
  cleanName,
  clampDailyResult,
  fetchDailyBoard,
  flushDailyQueue,
  parseBoard,
  queueAdd,
  queuePrune,
  queueRemove,
  readQueue,
  submitDaily,
  type PendingSubmit,
} from './daily.ts'
import { installFakes, type Call, type Reply } from './netFake.test-util.ts'

const TODAY = '2026-10-11'
const res = (o: Partial<DailyResult> = {}): DailyResult => ({ archetype: 'ghost', won: false, act: 1, floors: 5, echoes: 10, kills: 4, secs: 600, ...o })
const item = (o: Partial<PendingSubmit> = {}, r: Partial<DailyResult> = {}): PendingSubmit => ({ date: TODAY, name: 'Neo', result: res(r), ...o })

// ---------------------------------------------------------------- pure queue rules

test('queueAdd keeps one entry per (date, archetype): the better result, the latest name', () => {
  let q = queueAdd([], item({ name: 'A' }, { floors: 5 }))
  q = queueAdd(q, item({ name: 'B' }, { floors: 3 })) // worse
  assert.equal(q.length, 1)
  assert.equal(q[0]?.result.floors, 5)
  assert.equal(q[0]?.name, 'B')
  q = queueAdd(q, item({}, { floors: 9 }))
  assert.equal(q[0]?.result.floors, 9)
  q = queueAdd(q, item({}, { archetype: 'smuggler' }))
  q = queueAdd(q, item({ date: '2026-10-10' }))
  assert.equal(q.length, 3)
})

test('queueAdd keeps the replay log with the result it proves', () => {
  let q = queueAdd([], item({ replay: { v: 1, steps: ['good'] } }, { floors: 5 }))
  q = queueAdd(q, item({ replay: { v: 1, steps: ['worse'] } }, { floors: 3 })) // worse result: the old log stays
  assert.deepEqual(q[0]?.replay, { v: 1, steps: ['good'] })
  q = queueAdd(q, item({ replay: { v: 1, steps: ['better'] } }, { floors: 9 }))
  assert.deepEqual(q[0]?.replay, { v: 1, steps: ['better'] })
})

test('queuePrune drops what the server would refuse (outside today − 1 … today, malformed)', () => {
  const q = [item({ date: '2026-10-09' }), item({ date: '2026-10-10' }), item(), item({ date: '2026-10-12' }), item({ date: 'nope' }), item({}, { act: 7 })]
  assert.deepEqual(
    queuePrune(q, TODAY).map((x) => x.date),
    ['2026-10-10', TODAY],
  )
})

test('queueRemove keeps an entry that got better while the old one was in flight', () => {
  const sent = item({}, { floors: 5 })
  assert.equal(queueRemove([sent], sent).length, 0)
  assert.equal(queueRemove([item({}, { floors: 8 })], sent).length, 1)
  assert.equal(queueRemove([item({}, { archetype: 'smuggler' })], sent).length, 1)
})

test('cleanName / clampDailyResult match the server limits', () => {
  assert.equal(cleanName('  Neo\n  the\tOne  '), 'Neo the One')
  assert.equal(cleanName('가나다라마바사아자차카타파하가나다라'), '가나다라마바사아자차카타파하가나')
  assert.equal(cleanName('\u0000\u0007'), '')
  const c = clampDailyResult(res({ echoes: 4000, floors: -2, act: 5, secs: 0 }))
  assert.deepEqual([c.echoes, c.floors, c.act], [999, 0, 3])
  assert.equal('secs' in c, false, 'a 0 s run omits secs (the server takes 1..86400)')
  assert.equal('secs' in clampDailyResult(res({ secs: 90_000 })), false)
  assert.equal(clampDailyResult(res({ secs: 754.4 })).secs, 754)
})

test('parseBoard validates entries and the me row', () => {
  const b = parseBoard({
    date: TODAY,
    archetype: 'ghost',
    total: 2,
    entries: [{ rank: 1, name: 'A', result: res(), me: false }, { rank: 'x' }, { rank: 2, name: 'B', result: { bad: 1 } }],
    me: { rank: 40, name: 'Me', result: res() },
  })
  assert.equal(b?.entries.length, 1)
  assert.equal(b?.me?.rank, 40)
  assert.equal(parseBoard({ date: 'x' }), null)
})

// ---------------------------------------------------------------- submit + retry against a scripted server

let online = true
const puts: Call[] = []
const fakes = installFakes((call): Reply => {
  if (call.path === '/config') return { status: 200, body: { auth: 'open', firebase: null, leaderboard: true } }
  if (!online) return 'network'
  if (call.method === 'PUT' && call.path.startsWith('/daily/')) {
    puts.push(call)
    const date = call.path.slice('/daily/'.length)
    if (date < '2026-10-10') return { status: 422, body: { detail: 'date' } }
    return { status: 200, body: { rank: 3, total: 41, best: (call.body as { result: unknown }).result, improved: true } }
  }
  if (call.method === 'GET' && call.path.startsWith('/daily/')) {
    return { status: 200, body: { date: TODAY, archetype: 'ghost', total: 1, entries: [{ rank: 1, name: 'Neo', result: res(), me: true }], me: null } }
  }
  return { status: 404 }
})

test('online submit returns the rank and leaves nothing queued', async () => {
  const out = await submitDaily(item(), TODAY)
  assert.deepEqual(out, { kind: 'ranked', rank: 3, total: 41, best: res(), improved: true })
  assert.deepEqual(readQueue(), [])
  const sent = puts.at(-1)
  assert.equal(sent?.path, `/daily/${TODAY}`)
  assert.deepEqual(sent?.body, { name: 'Neo', result: res() })
  assert.ok(sent?.headers['X-Player-Id'], 'open mode: X-Player-Id identity')
})

test('offline submit is queued (persisted) and delivered by the next flush', async () => {
  online = false
  const out = await submitDaily(item({}, { floors: 12 }), TODAY)
  assert.deepEqual(out, { kind: 'queued' })
  assert.equal(readQueue().length, 1)
  assert.ok(fakes.storage.getItem('mythos2.pendingDaily'))
  online = true
  const before = puts.length
  await flushDailyQueue(TODAY)
  assert.equal(puts.length, before + 1)
  assert.deepEqual(readQueue(), [])
})

test('a submit the server refuses for good (422) is dropped, not retried forever', async () => {
  const out = await submitDaily(item({ date: '2026-10-09' }), '2026-10-09')
  assert.deepEqual(out, { kind: 'rejected' })
  assert.deepEqual(readQueue(), [])
})

test('flush prunes entries that went stale while offline', async () => {
  online = false
  await submitDaily(item({ date: '2026-10-10' }), '2026-10-10')
  assert.equal(readQueue().length, 1)
  online = true
  const before = puts.length
  await flushDailyQueue('2026-10-12') // two days later: the server would 422 it
  assert.equal(puts.length, before)
  assert.deepEqual(readQueue(), [])
})

test('the board read is public and parsed', async () => {
  const b = await fetchDailyBoard(TODAY, 'ghost')
  assert.notEqual(b, 'offline')
  if (b === 'offline') return
  assert.equal(b.entries[0]?.me, true)
  online = false
  assert.equal(await fetchDailyBoard(TODAY, 'ghost'), 'offline')
  online = true
})
