// net/api.ts against an `auth: 'open'` server (local dev): X-Player-Id identity, no invite key anywhere.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as net from './api.ts'
import { installFakes } from './netFake.test-util.ts'

const fakes = installFakes((call) => {
  if (call.path === '/config') return { status: 200, body: { auth: 'open', firebase: null, leaderboard: true } }
  if (call.path === '/gm/narrate') return { status: 200, body: { text: 'line', source: 'fallback' } }
  return { status: 404 }
})

test('open mode, signed out: X-Player-Id (a persisted uuid) and nothing invite-related', async () => {
  fakes.storage.setItem('mythos_invite', 'legacy-key') // an old invite key left on the device is ignored
  const res = await net.narrate({ kind: 'event', lang: 'en' })
  assert.equal(res?.text, 'line')
  const call = fakes.calls.find((c) => c.path === '/gm/narrate')
  assert.ok(call)
  const id = call.headers['X-Player-Id'] ?? ''
  assert.match(id, /^[0-9a-f-]{36}$/)
  assert.equal(fakes.storage.getItem('mythos2.playerId'), id)
  assert.equal(call.headers['X-Invite-Key'], undefined)
  assert.equal(call.headers.Authorization, undefined)
  assert.equal(net.cloudAvailable(), true)
  assert.equal('setInviteKey' in net, false)
  assert.equal('getInviteKey' in net, false)
})

test('the config is cached on the device for offline boots', async () => {
  assert.equal(JSON.parse(fakes.storage.getItem('mythos2.config') ?? '{}').auth, 'open')
  assert.equal(net.cachedConfig()?.firebase, null)
})

test('history: a record the server refuses for good (409) is dropped; offline keeps it queued', async () => {
  let reply: 'conflict' | 'offline' = 'conflict'
  fakes.setHandler((call) => {
    if (call.path === '/config') return { status: 200, body: { auth: 'open', firebase: null, leaderboard: true } }
    if (call.path === '/history') return reply === 'offline' ? 'network' : { status: 409, body: { detail: 'record id already used' } }
    return { status: 404 }
  })
  assert.equal(await net.appendHistory({ id: 'run-1-abc' } as never), true)
  assert.equal(fakes.storage.getItem('mythos2.pendingHistory'), null)
  reply = 'offline'
  assert.equal(await net.appendHistory({ id: 'run-2-def' } as never), false)
  assert.match(fakes.storage.getItem('mythos2.pendingHistory') ?? '', /run-2-def/)
})
