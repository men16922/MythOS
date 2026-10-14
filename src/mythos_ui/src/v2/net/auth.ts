// Mythos 2.0 — Google sign-in (Firebase Auth) for cloud saves, the AI GM and the daily leaderboard.
//
// State: `signed-out` | `signed-in {name, email, photoUrl}` | `unavailable(reason)` (this build / server cannot
// sign anyone in yet). Anonymous players keep playing fully offline; nothing here blocks the game or throws.
//
// Each entry point injects its platform (`startAuth(platform)` via App2.mountApp2), so neither bundle carries the other:
//   web     → net/authWeb.ts: `firebase/app` + `firebase/auth` (a lazy chunk, never in the initial or combat chunks),
//             `signInWithPopup(GoogleAuthProvider)`, config from `GET /api/v2/config`. Anonymous visitors never
//             download the SDK: it loads at boot only when this device remembers a signed-in session
//             (`mythos2.auth`), otherwise on the first sign-in click.
//   android → native/authNative.ts: @capacitor-firebase/authentication (native Google sign-in, skipNativeAuth false).
//
// ID tokens are cached and refreshed at least 5 minutes before they expire (`getIdToken`). Signing in is an identity
// switch: pending saves of the old identity are flushed first, then net/api.ts `adoptAccount` prefers the account's
// cloud copy (else pushes this device's progress up). Signing out keeps the local progress.
//
// `createAuth` is the pure state machine (deps injected; unit-tested in auth.test.ts). `startAuth` wires the real one.

import * as net from './api.ts'

export interface AuthUser {
  name: string
  email: string
  photoUrl: string | null
}

export type UnavailableReason = 'not-configured' | 'offline'

export type AuthStatus = { kind: 'signed-out' } | { kind: 'signed-in'; user: AuthUser } | { kind: 'unavailable'; reason: UnavailableReason }

/** Why a sign-in did not happen. 'cancelled' is silent; every other reason has a player-facing line. */
export type SignInFailure = 'cancelled' | 'not-configured' | 'offline' | 'popup-blocked' | 'no-account' | 'busy' | 'failed'

export type SignInResult = { ok: true; adopted: net.AdoptSummary | null } | { ok: false; reason: SignInFailure }

/** Account deletion outcome. `signInRecordDeleted` false = the game data is gone but the Google sign-in record is not yet. */
export type DeleteAccountOutcome = { ok: true; signInRecordDeleted: boolean | null } | { ok: false; reason: 'offline' | 'failed' | 'busy' | 'signed-out' }

/** One platform's Firebase Auth (web SDK or the native plugin). Methods may reject; the machine catches. */
export interface AuthBackend {
  /** Subscribe to the signed-in user (the first call reports the restored session, null when there is none). */
  onChange(listener: (user: AuthUser | null) => void): () => void
  signIn(): Promise<AuthUser>
  signOut(): Promise<void>
  /** An ID token for the current user; `force` asks Firebase for a fresh one. */
  getIdToken(force: boolean): Promise<string | null>
}

/** How one platform signs in (injected by the entry point). */
export interface AuthPlatform {
  /** Create the backend, or say why it cannot exist (no Firebase config, the build lacks Google sign-in, …). */
  loadBackend(): Promise<AuthBackend | UnavailableReason>
  /** Synchronous availability known before any loading (e.g. the app build has no Google client id). */
  knownUnavailable(): UnavailableReason | null
  /** Ask the backend at boot even without a remembered session (native: cheap; web: would download the SDK). */
  restoreAlways: boolean
}

export interface AuthDeps extends AuthPlatform {
  storage: { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
  now(): number
  /** Before the identity changes (sign-in or sign-out): flush pending saves under the current identity. */
  beforeSwitch(): Promise<void>
  /** After a sign-in: adopt the account's saves. */
  afterSignIn(): Promise<net.AdoptSummary | null>
  /** Erase the account's cloud data on the server (sends pending saves first). */
  deleteRemote(): Promise<net.DeleteAccountResult>
}

export interface Auth extends net.AuthSource {
  status(): AuthStatus
  subscribe(listener: () => void): () => void
  /** Restore a persisted session (non-blocking). Idempotent. */
  start(): void
  signIn(): Promise<SignInResult>
  signOut(): Promise<void>
  /** Erase the account's cloud data and sign-in record, then end the session (this device keeps its progress). */
  deleteAccount(): Promise<DeleteAccountOutcome>
  /** Re-check availability (e.g. after `/config` arrived). */
  refresh(): void
  /** net/api.ts: the server rejected a freshly refreshed token; end the session locally (no flush). */
  tokenRejected(): void
}

/** localStorage: the signed-in profile shown at boot before Firebase confirms it (and the cue to restore at all). */
export const SESSION_KEY = 'mythos2.auth'
/** Refresh tokens this long before they expire. */
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60_000
/** Give up waiting for a session restore after this long (requests then go out as signed-out / tokenless). */
const RESTORE_TIMEOUT_MS = 8000

/** Expiry (ms epoch) of a JWT, from its `exp` claim; null when unreadable. */
export function tokenExpiry(token: string): number | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    const exp = typeof payload === 'object' && payload !== null ? (payload as { exp?: unknown }).exp : undefined
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}

/** Map a Firebase / plugin error to a sign-in failure reason. */
export function classifySignInError(err: unknown): SignInFailure {
  const rec = typeof err === 'object' && err !== null ? (err as { code?: unknown; message?: unknown }) : {}
  const code = typeof rec.code === 'string' ? rec.code : ''
  const message = typeof rec.message === 'string' ? rec.message : typeof err === 'string' ? err : ''
  const text = `${code} ${message}`.toLowerCase()
  if (/popup-closed-by-user|cancelled-popup-request|user-cancel|canceled|cancelled|sign_in_cancelled|12501/.test(text)) return 'cancelled'
  if (/popup-blocked/.test(text)) return 'popup-blocked'
  if (/network-request-failed|network error|unable to resolve host|failed to connect|timeout|timed out|offline/.test(text)) return 'offline'
  if (
    /operation-not-allowed|configuration-not-found|unauthorized-domain|invalid-api-key|api-key-not-valid|admin-restricted|invalid-oauth-client|app-not-authorized|not-configured|developer_error|developer console|\b10:|not implemented|not available|will_be_overridden/.test(
      text,
    )
  )
    return 'not-configured'
  if (/no credentials available|no_credential|nocredential|no account/.test(text)) return 'no-account'
  return 'failed'
}

function parseSession(raw: string | null): AuthUser | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return null
    const r = v as Record<string, unknown>
    if (typeof r.name !== 'string' || typeof r.email !== 'string') return null
    return { name: r.name, email: r.email, photoUrl: typeof r.photoUrl === 'string' ? r.photoUrl : null }
  } catch {
    return null
  }
}

export function createAuth(deps: AuthDeps): Auth {
  const remembered = parseSession(deps.storage.get(SESSION_KEY))
  const known = deps.knownUnavailable()
  let status: AuthStatus = remembered ? { kind: 'signed-in', user: remembered } : known ? { kind: 'unavailable', reason: known } : { kind: 'signed-out' }
  const listeners = new Set<() => void>()
  let backend: AuthBackend | null = null
  let backendLoad: Promise<AuthBackend | UnavailableReason> | null = null
  let started = false
  /** Set during our own sign-in / sign-out so backend change events do not race the identity switch. */
  let switching = false
  let token: { value: string; exp: number } | null = null
  let tokenFetch: Promise<string | null> | null = null
  let resolveReady: () => void = () => undefined
  let readyDone = false
  let readyTimer: ReturnType<typeof setTimeout> | null = null
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = () => {
      readyDone = true
      if (readyTimer !== null) clearTimeout(readyTimer)
      readyTimer = null
      resolve()
    }
  })

  const set = (next: AuthStatus): void => {
    status = next
    for (const l of [...listeners]) l()
  }
  const signedOutStatus = (): AuthStatus => {
    const reason = deps.knownUnavailable()
    return reason ? { kind: 'unavailable', reason } : { kind: 'signed-out' }
  }
  const remember = (user: AuthUser | null): void => {
    if (user) deps.storage.set(SESSION_KEY, JSON.stringify(user))
    else deps.storage.remove(SESSION_KEY)
  }

  const onBackendUser = (user: AuthUser | null): void => {
    if (switching) return
    token = null
    if (user) {
      remember(user)
      set({ kind: 'signed-in', user })
    } else if (status.kind === 'signed-in') {
      // Signed out elsewhere (revoked, expired session): keep the local progress, stop using the cloud.
      remember(null)
      set(signedOutStatus())
    }
    resolveReady()
  }

  const ensureBackend = (): Promise<AuthBackend | UnavailableReason> => {
    if (backend) return Promise.resolve(backend)
    if (!backendLoad) {
      backendLoad = deps
        .loadBackend()
        .catch((): UnavailableReason => 'offline')
        .then((b) => {
          if (typeof b === 'string') {
            backendLoad = null // try again on the next click (the chunk / config may come back)
            return b
          }
          backend = b
          b.onChange(onBackendUser)
          return b
        })
    }
    return backendLoad
  }

  const auth: Auth = {
    status: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    signedIn: () => status.kind === 'signed-in',
    ready: () => readyPromise,

    start() {
      if (started) return
      started = true
      if (!remembered && !deps.restoreAlways) {
        resolveReady()
        return
      }
      if (!readyDone) readyTimer = setTimeout(resolveReady, RESTORE_TIMEOUT_MS)
      void ensureBackend().then((b) => {
        if (typeof b === 'string') {
          // Cannot restore right now (offline, no config): a remembered session stays shown; requests that need
          // a token are simply not sent until the backend comes back.
          if (b === 'not-configured') {
            remember(null)
            set({ kind: 'unavailable', reason: b })
          }
          resolveReady()
        }
      })
    },

    refresh() {
      if (status.kind === 'signed-in') return
      const next = signedOutStatus()
      if (next.kind !== status.kind || (next.kind === 'unavailable' && status.kind === 'unavailable' && next.reason !== status.reason)) set(next)
    },

    async getIdToken(force = false) {
      if (status.kind !== 'signed-in') return null
      const now = deps.now()
      if (!force && token && token.exp - now > TOKEN_REFRESH_MARGIN_MS) return token.value
      if (tokenFetch && !force) return tokenFetch
      const fetchToken = async (): Promise<string | null> => {
        const b = await ensureBackend()
        if (typeof b === 'string') return null
        if (!readyDone) await readyPromise
        if (status.kind !== 'signed-in') return null
        try {
          // Firebase hands back its cached token until ~30 s before expiry; we want one with ≥ 5 min left.
          let value = await b.getIdToken(force || token !== null)
          let exp = value ? tokenExpiry(value) : null
          if (value && !force && exp !== null && exp - deps.now() <= TOKEN_REFRESH_MARGIN_MS) {
            value = await b.getIdToken(true)
            exp = value ? tokenExpiry(value) : null
          }
          token = value ? { value, exp: exp ?? deps.now() + TOKEN_REFRESH_MARGIN_MS + 60_000 } : null
          return value
        } catch {
          token = null
          return null
        }
      }
      const p = fetchToken().finally(() => {
        if (tokenFetch === p) tokenFetch = null
      })
      tokenFetch = p
      return p
    },

    async signIn() {
      if (switching) return { ok: false, reason: 'busy' }
      if (status.kind === 'signed-in') return { ok: true, adopted: null }
      switching = true
      try {
        const b = await ensureBackend()
        if (typeof b === 'string') return { ok: false, reason: b }
        let user: AuthUser
        try {
          user = await b.signIn()
        } catch (err) {
          return { ok: false, reason: classifySignInError(err) }
        }
        // The old identity's debounced saves go out before the session counts as signed in.
        await deps.beforeSwitch().catch(() => undefined)
        token = null
        remember(user)
        set({ kind: 'signed-in', user })
        resolveReady()
        const adopted = await deps.afterSignIn().catch(() => null)
        return { ok: true, adopted }
      } finally {
        switching = false
      }
    },

    tokenRejected() {
      // No flush here: the account's requests are exactly what the server refuses. Local progress stays.
      if (status.kind !== 'signed-in') return
      token = null
      remember(null)
      switching = true
      set(signedOutStatus())
      void ensureBackend()
        .then((b) => (typeof b === 'string' ? undefined : b.signOut()))
        .catch(() => undefined)
        .finally(() => {
          switching = false
        })
    },

    async deleteAccount() {
      if (switching) return { ok: false, reason: 'busy' }
      if (status.kind !== 'signed-in') return { ok: false, reason: 'signed-out' }
      switching = true
      try {
        const res = await deps.deleteRemote().catch((): net.DeleteAccountResult => ({ kind: 'failed' }))
        if (res.kind !== 'deleted') return { ok: false, reason: res.kind }
        // Signed out before the backend call: nothing more may go out under the erased account.
        token = null
        remember(null)
        set(signedOutStatus())
        const b = await ensureBackend()
        if (typeof b !== 'string') await b.signOut().catch(() => undefined)
        return { ok: true, signInRecordDeleted: res.signInRecordDeleted }
      } finally {
        switching = false
      }
    },

    async signOut() {
      if (switching || status.kind !== 'signed-in') return
      switching = true
      try {
        await deps.beforeSwitch().catch(() => undefined) // the account's pending saves land before it goes
        const b = await ensureBackend()
        if (typeof b !== 'string') await b.signOut().catch(() => undefined)
        token = null
        remember(null)
        set(signedOutStatus())
      } finally {
        switching = false
      }
    },
  }
  return auth
}

// ---------------------------------------------------------------- the real instance

const browserStorage: AuthDeps['storage'] = {
  get(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* storage unavailable */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* storage unavailable */
    }
  },
}

/** Until an entry point starts auth (and in tools that never do): nobody can sign in. */
const NO_PLATFORM: AuthPlatform = {
  loadBackend: () => Promise.resolve('not-configured'),
  knownUnavailable: () => 'not-configured',
  restoreAlways: false,
}

let instance: Auth | null = null

function create(platform: AuthPlatform): Auth {
  return createAuth({
    ...platform,
    storage: browserStorage,
    now: () => Date.now(),
    beforeSwitch: () => net.flushSaves(),
    afterSignIn: () => net.adoptAccount(),
    deleteRemote: () => net.deleteAccount(),
  })
}

/** The app-wide auth instance (`startAuth` creates it at boot). */
export function getAuth(): Auth {
  instance ??= create(NO_PLATFORM)
  return instance
}

/**
 * Boot (App2.mountApp2, before the first render so the store's first loads already carry the identity): restore the
 * session, wire the token into net/api.ts, and finish an interrupted sign-in switch.
 */
export function startAuth(platform: AuthPlatform): Auth {
  if (instance) return instance
  const auth = create(platform)
  instance = auth
  net.setAuthSource(auth)
  auth.start()
  void net.loadConfig().then(() => auth.refresh())
  void auth.ready().then(() => {
    if (auth.signedIn() && net.adoptPending()) void net.adoptAccount()
  })
  return auth
}
