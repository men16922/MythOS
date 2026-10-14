import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AdoptSummary, DeleteAccountResult } from './api.ts'
import {
  classifySignInError,
  createAuth,
  SESSION_KEY,
  tokenExpiry,
  TOKEN_REFRESH_MARGIN_MS,
  type AuthBackend,
  type AuthDeps,
  type AuthUser,
  type UnavailableReason,
} from './auth.ts'
import { fakeJwt, tick } from './netFake.test-util.ts'

const ALICE: AuthUser = { name: 'Alice', email: 'alice@example.com', photoUrl: null }
const MIN = 60_000

class FakeBackend implements AuthBackend {
  user: AuthUser | null = null
  listener: ((u: AuthUser | null) => void) | null = null
  /** What signIn does next. */
  nextSignIn: () => Promise<AuthUser> = async () => ALICE
  tokenCalls: boolean[] = []
  /** Tokens handed out, by `force`. */
  tokenFor: (force: boolean) => string = () => 'tok'
  signedOut = 0
  onChange(listener: (u: AuthUser | null) => void): () => void {
    this.listener = listener
    return () => (this.listener = null)
  }
  emit(u: AuthUser | null): void {
    this.user = u
    this.listener?.(u)
  }
  async signIn(): Promise<AuthUser> {
    const u = await this.nextSignIn()
    this.emit(u) // Firebase reports the new user through the listener too
    return u
  }
  async signOut(): Promise<void> {
    this.signedOut += 1
    this.emit(null)
  }
  async getIdToken(force: boolean): Promise<string | null> {
    this.tokenCalls.push(force)
    return this.tokenFor(force)
  }
}

function setup(
  opts: { remembered?: AuthUser; restoreAlways?: boolean; backend?: FakeBackend | UnavailableReason; known?: UnavailableReason | null; deleteResult?: DeleteAccountResult } = {},
) {
  const store = new Map<string, string>()
  if (opts.remembered) store.set(SESSION_KEY, JSON.stringify(opts.remembered))
  const backend = opts.backend ?? new FakeBackend()
  const log: string[] = []
  let now = 1_000_000_000_000
  let loads = 0
  const deps: AuthDeps = {
    loadBackend: async () => {
      loads += 1
      return backend
    },
    knownUnavailable: () => opts.known ?? null,
    restoreAlways: opts.restoreAlways ?? false,
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v), remove: (k) => void store.delete(k) },
    now: () => now,
    beforeSwitch: async () => void log.push('flush'),
    afterSignIn: async (): Promise<AdoptSummary> => {
      log.push('adopt')
      return { profile: 'push-local', run: 'none' }
    },
    deleteRemote: async (): Promise<DeleteAccountResult> => {
      log.push('delete')
      return opts.deleteResult ?? { kind: 'deleted', signInRecordDeleted: true }
    },
  }
  const auth = createAuth(deps)
  return {
    auth,
    backend,
    store,
    log,
    loads: () => loads,
    advance: (ms: number) => (now += ms),
    now: () => now,
  }
}

test('anonymous boot: signed out at once, ready at once, the SDK is never loaded', async () => {
  const s = setup()
  s.auth.start()
  assert.equal(s.auth.status().kind, 'signed-out')
  await s.auth.ready()
  assert.equal(s.loads(), 0)
  assert.equal(await s.auth.getIdToken(), null)
})

test('a remembered session shows at once and is confirmed by the backend', async () => {
  const s = setup({ remembered: ALICE })
  assert.deepEqual(s.auth.status(), { kind: 'signed-in', user: ALICE })
  s.auth.start()
  await tick()
  assert.equal(s.loads(), 1)
  ;(s.backend as FakeBackend).emit(ALICE)
  await s.auth.ready()
  assert.ok(s.auth.signedIn())
})

test('a remembered session the backend no longer has turns into signed-out (local progress kept)', async () => {
  const s = setup({ remembered: ALICE })
  s.auth.start()
  await tick()
  ;(s.backend as FakeBackend).emit(null)
  await s.auth.ready()
  assert.equal(s.auth.status().kind, 'signed-out')
  assert.equal(s.store.has(SESSION_KEY), false)
})

test('sign-in: flush the old identity, then switch, then adopt the account saves', async () => {
  const s = setup()
  const seen: string[] = []
  s.auth.subscribe(() => seen.push(s.auth.status().kind))
  s.auth.start()
  const res = await s.auth.signIn()
  assert.deepEqual(res, { ok: true, adopted: { profile: 'push-local', run: 'none' } })
  assert.deepEqual(s.log, ['flush', 'adopt'])
  assert.deepEqual(seen, ['signed-in'])
  assert.deepEqual(JSON.parse(s.store.get(SESSION_KEY) ?? 'null'), ALICE)
})

test('the identity switches only after the flush (the Firebase listener cannot jump ahead)', async () => {
  let statusAtFlush = ''
  const store = new Map<string, string>()
  const backend = new FakeBackend()
  const auth = createAuth({
    loadBackend: async () => backend,
    knownUnavailable: () => null,
    restoreAlways: false,
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v), remove: (k) => void store.delete(k) },
    now: () => 0,
    beforeSwitch: async () => {
      statusAtFlush = auth.status().kind
    },
    afterSignIn: async () => null,
    deleteRemote: async () => ({ kind: 'failed' }),
  })
  await auth.signIn()
  assert.equal(statusAtFlush, 'signed-out')
  assert.equal(auth.status().kind, 'signed-in')
})

test('cancelled / failed sign-ins leave the player signed out with a reason', async () => {
  const s = setup()
  const b = s.backend as FakeBackend
  b.nextSignIn = () => Promise.reject({ code: 'auth/popup-closed-by-user' })
  assert.deepEqual(await s.auth.signIn(), { ok: false, reason: 'cancelled' })
  b.nextSignIn = () => Promise.reject({ code: 'auth/operation-not-allowed', message: 'The given sign-in provider is disabled' })
  assert.deepEqual(await s.auth.signIn(), { ok: false, reason: 'not-configured' })
  assert.equal(s.auth.status().kind, 'signed-out')
  assert.deepEqual(s.log, [], 'no flush / adopt without a sign-in')
})

test('no backend (server has no Firebase config): sign-in fails gracefully as not-configured', async () => {
  const s = setup({ backend: 'not-configured' })
  assert.deepEqual(await s.auth.signIn(), { ok: false, reason: 'not-configured' })
  assert.equal(s.auth.status().kind, 'signed-out')
})

test('a build without Google sign-in starts as unavailable and stays so after a failed attempt', async () => {
  const s = setup({ known: 'not-configured', backend: 'not-configured' })
  assert.deepEqual(s.auth.status(), { kind: 'unavailable', reason: 'not-configured' })
  assert.deepEqual(await s.auth.signIn(), { ok: false, reason: 'not-configured' })
  assert.deepEqual(s.auth.status(), { kind: 'unavailable', reason: 'not-configured' })
})

test('restoreAlways (native) asks the backend at boot even without a remembered session', async () => {
  const s = setup({ restoreAlways: true })
  s.auth.start()
  await tick()
  assert.equal(s.loads(), 1)
  ;(s.backend as FakeBackend).emit(ALICE)
  await s.auth.ready()
  assert.deepEqual(s.auth.status(), { kind: 'signed-in', user: ALICE })
})

test('sign-out flushes the account first, keeps going signed-out, and forgets the session', async () => {
  const s = setup()
  await s.auth.signIn()
  s.log.length = 0
  await s.auth.signOut()
  assert.deepEqual(s.log, ['flush'])
  assert.equal(s.auth.status().kind, 'signed-out')
  assert.equal((s.backend as FakeBackend).signedOut, 1)
  assert.equal(s.store.has(SESSION_KEY), false)
  assert.equal(await s.auth.getIdToken(), null)
})

test('token cache: reused while > 5 min remain, refreshed (forced) inside the margin', async () => {
  const s = setup()
  const b = s.backend as FakeBackend
  let serial = 0
  b.tokenFor = () => fakeJwt(s.now() + 60 * MIN, `t${++serial}`)
  await s.auth.signIn()
  const t1 = await s.auth.getIdToken()
  assert.equal(b.tokenCalls.length, 1)
  assert.equal(b.tokenCalls[0], false)
  s.advance(50 * MIN) // 10 min left: still cached
  assert.equal(await s.auth.getIdToken(), t1)
  assert.equal(b.tokenCalls.length, 1)
  s.advance(6 * MIN) // 4 min left: inside the 5 min margin → forced refresh
  const t2 = await s.auth.getIdToken()
  assert.notEqual(t2, t1)
  assert.deepEqual(b.tokenCalls, [false, true])
})

test('token: a cached SDK token that is already near expiry is force-refreshed at once', async () => {
  const s = setup()
  const b = s.backend as FakeBackend
  b.tokenFor = (force) => fakeJwt(s.now() + (force ? 60 : 2) * MIN)
  await s.auth.signIn()
  const t = await s.auth.getIdToken()
  assert.deepEqual(b.tokenCalls, [false, true])
  assert.ok((tokenExpiry(t ?? '') ?? 0) - s.now() > TOKEN_REFRESH_MARGIN_MS)
})

test('token: concurrent callers share one fetch; force bypasses the cache', async () => {
  const s = setup()
  const b = s.backend as FakeBackend
  b.tokenFor = () => fakeJwt(s.now() + 60 * MIN)
  await s.auth.signIn()
  await Promise.all([s.auth.getIdToken(), s.auth.getIdToken(), s.auth.getIdToken()])
  assert.equal(b.tokenCalls.length, 1)
  await s.auth.getIdToken(true)
  assert.deepEqual(b.tokenCalls, [false, true])
})

test('token: a backend failure yields null (the request is skipped), not a throw', async () => {
  const s = setup()
  const b = s.backend as FakeBackend
  await s.auth.signIn()
  b.getIdToken = () => Promise.reject(new Error('network'))
  assert.equal(await s.auth.getIdToken(), null)
})

test('tokenExpiry reads exp from a JWT and rejects junk', () => {
  assert.equal(tokenExpiry(fakeJwt(1_700_000_000_000)), 1_700_000_000_000)
  assert.equal(tokenExpiry('not-a-jwt'), null)
  assert.equal(tokenExpiry('a.b.c'), null)
})

test('classifySignInError maps web and native errors', () => {
  assert.equal(classifySignInError({ code: 'auth/popup-closed-by-user' }), 'cancelled')
  assert.equal(classifySignInError({ code: 'auth/cancelled-popup-request' }), 'cancelled')
  assert.equal(classifySignInError({ code: 'auth/popup-blocked' }), 'popup-blocked')
  assert.equal(classifySignInError({ code: 'auth/network-request-failed' }), 'offline')
  assert.equal(classifySignInError({ code: 'auth/operation-not-allowed' }), 'not-configured')
  assert.equal(classifySignInError({ code: 'auth/configuration-not-found' }), 'not-configured')
  assert.equal(classifySignInError({ code: 'auth/unauthorized-domain' }), 'not-configured')
  assert.equal(classifySignInError(new Error('[28444] Developer console is not set up correctly.')), 'not-configured')
  assert.equal(classifySignInError(new Error('activity is cancelled by the user.')), 'cancelled')
  assert.equal(classifySignInError(new Error('No credentials available')), 'no-account')
  assert.equal(classifySignInError(new Error('"FirebaseAuthentication" plugin is not implemented on android')), 'not-configured')
  assert.equal(classifySignInError(new Error('something odd')), 'failed')
  assert.equal(classifySignInError(undefined), 'failed')
})

test('tokenRejected ends the session locally without a flush and signs the backend out', async () => {
  const s = setup()
  await s.auth.signIn()
  s.log.length = 0
  s.auth.tokenRejected()
  assert.equal(s.auth.status().kind, 'signed-out')
  assert.equal(s.store.has(SESSION_KEY), false)
  await tick()
  assert.equal((s.backend as FakeBackend).signedOut, 1)
  assert.deepEqual(s.log, [], 'no flush: the server refuses this account’s requests')
})

test('deleteAccount: the server erases first, then the session ends and the backend signs out', async () => {
  const s = setup()
  await s.auth.signIn()
  s.log.length = 0
  const res = await s.auth.deleteAccount()
  assert.deepEqual(res, { ok: true, signInRecordDeleted: true })
  assert.deepEqual(s.log, ['delete'])
  assert.equal(s.auth.status().kind, 'signed-out')
  assert.equal((s.backend as FakeBackend).signedOut, 1)
  assert.equal(s.store.has(SESSION_KEY), false)
  assert.equal(await s.auth.getIdToken(), null)
})

test('deleteAccount: offline / refused keeps the player signed in; signed out has nothing to delete', async () => {
  for (const kind of ['offline', 'failed'] as const) {
    const s = setup({ deleteResult: { kind } })
    await s.auth.signIn()
    assert.deepEqual(await s.auth.deleteAccount(), { ok: false, reason: kind })
    assert.equal(s.auth.status().kind, 'signed-in')
    assert.equal((s.backend as FakeBackend).signedOut, 0)
  }
  const anon = setup()
  assert.deepEqual(await anon.auth.deleteAccount(), { ok: false, reason: 'signed-out' })
  assert.deepEqual(anon.log, [])
})
