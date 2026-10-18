// net/api.ts against an `auth: 'google'` server: no identity requests while signed out, Bearer when signed in,
// one forced-refresh retry on 401, and the sign-in identity switch (adoptAccount).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as net from './api.ts'
import { installFakes, tick, type Call, type Reply } from './netFake.test-util.ts'

const CONFIG = { auth: 'google', firebase: { apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' }, leaderboard: true }

const server: { profile: unknown; run: unknown; reply401: number } = { profile: null, run: null, reply401: 0 }

function handler(call: Call): Reply {
  if (call.path === '/config') return { status: 200, body: CONFIG }
  if (call.headers['X-Demo-Code'] === 'judge-2026' && call.path.startsWith('/gm/')) return { status: 200, body: { text: 'demo line', source: 'llm' } }
  if (!call.headers.Authorization) return { status: 401, body: { detail: 'sign-in required' } }
  if (server.reply401 > 0) {
    server.reply401 -= 1
    return { status: 401, body: { detail: 'bad token' } }
  }
  if (call.method === 'GET' && call.path === '/profile') return { status: 200, body: { data: server.profile } }
  if (call.method === 'GET' && call.path === '/run') return { status: 200, body: { data: server.run } }
  if (call.method === 'PUT' && call.path === '/profile') {
    server.profile = call.body
    return { status: 200, body: { ok: true } }
  }
  if (call.method === 'PUT' && call.path === '/run') {
    server.run = call.body
    return { status: 200, body: { ok: true } }
  }
  if (call.path.startsWith('/gm/')) return { status: 200, body: { text: 'GM line', source: 'llm' } }
  return { status: 404, body: {} }
}

const fakes = installFakes(handler)

let signedIn = false
const tokens: boolean[] = []
net.setAuthSource({
  ready: () => Promise.resolve(),
  signedIn: () => signedIn,
  getIdToken: async (force) => {
    tokens.push(force === true)
    return force ? 'fresh-token' : 'cached-token'
  },
})

const identityCalls = (): Call[] => fakes.calls.filter((c) => c.path !== '/config')
const profileOf = (loops: number) => ({ version: 1, playerName: 'P', loops })

test('config is fetched and validated', async () => {
  const cfg = await net.loadConfig()
  assert.equal(cfg?.auth, 'google')
  assert.equal(cfg?.firebase?.projectId, 'p')
  assert.equal(net.cloudAvailable(), false)
  assert.equal(net.parseServerConfig({ auth: 'weird' }), null)
  assert.equal(net.parseServerConfig({ auth: 'open', firebase: { apiKey: 'k' } })?.firebase, null)
})

test('signed out: saves, history, GM make no requests at all (no 401 spam) and fall back', async () => {
  fakes.calls.length = 0
  assert.equal(await net.narrate({ kind: 'event', lang: 'ko' }), null)
  assert.equal(await net.talk({ mode: 'ix', lang: 'ko', trigger: 'boss_start' }), null)
  assert.equal(await net.loadProfile(), null)
  const saved = net.saveProfile(profileOf(1) as never)
  await net.flushSaves()
  assert.equal(await saved, false)
  assert.equal(await net.appendHistory({ id: 'r1' } as never), false)
  assert.deepEqual(identityCalls(), [])
  // The local mirror still has the progress.
  assert.equal(net.loadProfileLocal()?.loops, 1)
})

test('signed out with a demo code: only GM calls go out, carrying the code and the device id', async () => {
  net.captureDemoCode('?demo=judge-2026')
  assert.equal(net.demoCode(), 'judge-2026')
  fakes.calls.length = 0
  const res = await net.narrate({ kind: 'event', lang: 'ko' })
  assert.equal(res?.text, 'demo line')
  await net.loadProfile() // the local mirror answers; no request may go out
  const calls = identityCalls()
  assert.deepEqual(calls.map((c) => c.path), ['/gm/narrate'])
  assert.equal(calls[0]?.headers['X-Demo-Code'], 'judge-2026')
  assert.ok(calls[0]?.headers['X-Player-Id'])
  net.captureDemoCode('?demo=off')
  assert.equal(net.demoCode(), null)
  net.captureDemoCode('?demo=x') // too short: ignored
  assert.equal(net.demoCode(), null)
})

test('signed in: Bearer token, no X-Player-Id', async () => {
  signedIn = true
  fakes.calls.length = 0
  const res = await net.narrate({ kind: 'event', lang: 'ko' })
  assert.equal(res?.text, 'GM line')
  const call = identityCalls()[0]
  assert.equal(call?.headers.Authorization, 'Bearer cached-token')
  assert.equal(call?.headers['X-Player-Id'], undefined)
  assert.equal(net.cloudAvailable(), true)
})

test('a 401 with a cached token is retried once with a force-refreshed token', async () => {
  fakes.calls.length = 0
  tokens.length = 0
  server.reply401 = 1
  const res = await net.narrate({ kind: 'event', lang: 'ko' })
  assert.equal(res?.text, 'GM line')
  assert.deepEqual(tokens, [false, true])
  assert.deepEqual(
    identityCalls().map((c) => c.headers.Authorization),
    ['Bearer cached-token', 'Bearer fresh-token'],
  )
})

test('identity switch, empty account: this device’s progress is pushed up', async () => {
  server.profile = null
  server.run = null
  fakes.calls.length = 0
  const summary = await net.adoptAccount()
  assert.deepEqual(summary, { profile: 'push-local', run: 'none' })
  await net.flushSaves()
  await tick(5)
  assert.deepEqual(server.profile, profileOf(1))
  assert.equal(net.adoptPending(), false)
})

test('identity switch, account has progress: the cloud copy wins and is handed to the store', async () => {
  server.profile = profileOf(9)
  server.run = { version: 2, screen: { kind: 'map' }, id: 'cloud-run' }
  const adopted: net.AdoptedCopies[] = []
  const off = net.onAdopt((c) => adopted.push(c))
  // This device has newer-looking local state and an unsent save of the old identity.
  void net.saveProfile(profileOf(3) as never)
  const summary = await net.adoptAccount()
  off()
  assert.deepEqual(summary, { profile: 'take-remote', run: 'take-remote' })
  assert.equal(adopted.length, 1)
  assert.equal((adopted[0]?.profile as unknown as { loops: number }).loops, 9)
  assert.equal((adopted[0]?.run as unknown as { id: string }).id, 'cloud-run')
  assert.equal(net.loadProfileLocal()?.loops, 9, 'mirror switched to the cloud copy')
  // The cancelled save of the old identity never lands on the account.
  await net.flushSaves()
  await tick(900)
  assert.equal((server.profile as { loops: number }).loops, 9)
})

test('identity switch while the server is unreachable stays pending for the next boot', async () => {
  fakes.setHandler((c) => (c.path === '/config' ? { status: 200, body: CONFIG } : 'network'))
  const summary = await net.adoptAccount()
  assert.deepEqual(summary, { profile: null, run: null })
  assert.equal(net.adoptPending(), true)
  fakes.setHandler(handler)
  await net.adoptAccount()
  assert.equal(net.adoptPending(), false)
})

test('adoptDecision: remote wins, else local is pushed', () => {
  assert.equal(net.adoptDecision(true, true), 'take-remote')
  assert.equal(net.adoptDecision(false, true), 'take-remote')
  assert.equal(net.adoptDecision(true, false), 'push-local')
  assert.equal(net.adoptDecision(false, false), 'none')
})

test('signed in but no token available: identity requests are skipped, not sent anonymously', async () => {
  net.setAuthSource({ ready: () => Promise.resolve(), signedIn: () => true, getIdToken: async () => null })
  fakes.calls.length = 0
  assert.equal(await net.narrate({ kind: 'event', lang: 'ko' }), null)
  assert.deepEqual(identityCalls(), [])
})

test('a token rejected even after a forced refresh ends the session; a public read then goes out signed-out', async () => {
  let session = true
  let ended = 0
  net.setAuthSource({
    ready: () => Promise.resolve(),
    signedIn: () => session,
    getIdToken: async () => (session ? 'bad-token' : null),
    tokenRejected: () => {
      ended += 1
      session = false
    },
  })
  fakes.setHandler((c) => {
    if (c.path === '/config') return { status: 200, body: CONFIG }
    if (c.headers.Authorization) return { status: 401, body: { detail: 'invalid token' } }
    if (c.path.startsWith('/daily/')) return { status: 200, body: { date: '2026-10-11', archetype: 'ghost', total: 0, entries: [], me: null } }
    return { status: 401, body: { detail: 'sign-in required' } }
  })
  fakes.calls.length = 0
  const res = await net.apiSend('GET', '/daily/2026-10-11?archetype=ghost', { timeoutMs: 1000, access: 'public' })
  assert.equal(ended, 1)
  assert.equal(res.kind === 'http' && res.status, 200)
  assert.deepEqual(
    identityCalls().map((c) => (c.headers.Authorization ? 'bearer' : c.headers['X-Player-Id'] ? 'anon' : 'none')),
    ['bearer', 'bearer', 'anon'],
  )
  // An identity route after that is simply not sent (google mode, signed out now).
  fakes.calls.length = 0
  assert.equal(await net.narrate({ kind: 'event', lang: 'ko' }), null)
  assert.deepEqual(identityCalls(), [])
  fakes.setHandler(handler)
})

test('503 to a signed-in request (token check unavailable) counts as offline', async () => {
  net.setAuthSource({ ready: () => Promise.resolve(), signedIn: () => true, getIdToken: async () => 'tok' })
  fakes.setHandler((c) => (c.path === '/config' ? { status: 200, body: CONFIG } : { status: 503, body: { detail: 'sign-in check unavailable' } }))
  const res = await net.apiSend('PUT', '/daily/2026-10-11', { body: '{}', timeoutMs: 1000 })
  assert.deepEqual(res, { kind: 'network' })
  fakes.setHandler(handler)
})

test('deleteAccount: pending saves go out first, then DELETE /account; the unsent history queue is dropped', async () => {
  net.setAuthSource({ ready: () => Promise.resolve(), signedIn: () => true, getIdToken: async () => 'tok' })
  const order: string[] = []
  let historyUp = false
  fakes.setHandler((c) => {
    if (c.path === '/config') return { status: 200, body: CONFIG }
    order.push(`${c.method} ${c.path}`)
    if (c.path === '/history') return historyUp ? { status: 200, body: { ok: true } } : { status: 503, body: {} }
    if (c.path === '/account') return { status: 200, body: { ok: true, removed: {}, sign_in_record_deleted: true } }
    return { status: 200, body: { ok: true } }
  })
  await net.appendHistory({ id: 'queued' } as never) // stays queued (server busy)
  void net.saveProfile(profileOf(7) as never)
  order.length = 0
  const res = await net.deleteAccount()
  assert.deepEqual(res, { kind: 'deleted', signInRecordDeleted: true })
  assert.deepEqual(order, ['PUT /profile', 'DELETE /account'])
  historyUp = true
  order.length = 0
  await net.appendHistory({ id: 'later' } as never)
  assert.deepEqual(order, ['POST /history']) // only the new record; the erased account's queue is gone
  assert.equal(net.loadProfileLocal()?.loops, 7) // this device keeps its progress

  fakes.setHandler((c) => (c.path === '/config' ? { status: 200, body: CONFIG } : { status: 500, body: {} }))
  assert.deepEqual(await net.deleteAccount(), { kind: 'failed' })
  fakes.setHandler(handler)
})
