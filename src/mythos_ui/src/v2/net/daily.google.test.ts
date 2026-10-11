// net/daily.ts on an `auth: 'google'` server: a signed-out player's daily result waits (no request) until sign-in.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as net from './api.ts'
import { flushDailyQueue, readQueue, submitDaily } from './daily.ts'
import { installFakes } from './netFake.test-util.ts'

const TODAY = '2026-10-11'
let signedIn = false
const fakes = installFakes((call) => {
  if (call.path === '/config') return { status: 200, body: { auth: 'google', firebase: null, leaderboard: true } }
  if (!call.headers.Authorization) return { status: 401, body: { detail: 'sign-in required' } }
  return { status: 200, body: { rank: 1, total: 1, best: (call.body as { result: unknown }).result, improved: true } }
})
net.setAuthSource({ ready: () => Promise.resolve(), signedIn: () => signedIn, getIdToken: async () => (signedIn ? 'tok' : null) })

test('signed out: kept in the queue without any request; sent after sign-in', async () => {
  const result = { archetype: 'ghost', won: true, act: 3, floors: 40, echoes: 120, kills: 60, secs: 1800 }
  const out = await submitDaily({ date: TODAY, name: 'Neo', result }, TODAY)
  assert.deepEqual(out, { kind: 'signed-out' })
  assert.equal(fakes.calls.filter((c) => c.path.startsWith('/daily')).length, 0)
  assert.equal(readQueue().length, 1)
  signedIn = true
  await flushDailyQueue(TODAY)
  const put = fakes.calls.find((c) => c.path === `/daily/${TODAY}`)
  assert.equal(put?.headers.Authorization, 'Bearer tok')
  assert.deepEqual(readQueue(), [])
})
