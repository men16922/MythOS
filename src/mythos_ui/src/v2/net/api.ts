// Mythos 2.0 — browser client for `/api/v2` (saves + AI GM + config). Backend: src/mythos_v2/api.py.
//
// Contract for callers: NOTHING here throws or blocks the game.
//  - Every call has an AbortController timeout (narrate 12 s, improvise 15 s, talk 11 s, saves 5 s) and resolves
//    to `null` / `false` on any failure (network, 4xx/5xx, timeout, malformed reply).
//  - Saves are offline-first: `saveProfile` / `saveRun` write a localStorage mirror synchronously and
//    PUT to the server debounced (800 ms, coalesced). `loadProfile` / `loadRun` return the best copy:
//    unsynced local progress wins (and is pushed), otherwise the server copy (mirrored locally); if
//    the server is unreachable the local mirror is returned. `null` only when neither exists.
//  - `narrate` / `improvise` return the server's text (LLM or the server's authored fallback); on
//    `null` the caller shows its own authored text. Never await them before rendering.
//
// Identity (contract: scratchpad/online/CONTRACT.md "Identity"): signed in (net/auth.ts installs itself with
// `setAuthSource`) → `Authorization: Bearer <Firebase ID token>`; otherwise `X-Player-Id` = a random uuid persisted
// under localStorage `mythos2.playerId`. `GET /config` says whether the server runs `auth: 'google'`: then a signed-out
// player makes NO save / history / GM / leaderboard-write requests at all (cloud = unavailable, the GM falls back to
// authored lines silently). Sign-in is an identity switch (`adoptAccount`): the account's cloud copy wins if it has
// one, else this device's progress is pushed up. Base URL: same-origin `/api` on the web, `VITE_API_BASE` in the app
// build (cross-origin; the API allows the Capacitor origins via MYTHOS_CORS_ORIGINS).

import type { Improvisation, Lang, MetaProfile, RunRecord, RunState, Stats, StatKey } from '../engine/types.ts'

/**
 * Build-time env (Vite replaces `import.meta.env`; undefined under `node --test`). The web build leaves
 * VITE_API_BASE unset → same-origin `/api`; the Android app build (`vite build --mode app`) sets it to the
 * Cloud Run origin (or `VITE_API_BASE=http://10.0.2.2:8010` for an emulator against a local server).
 */
function buildEnv(key: string): string {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env
  const value = env?.[key]
  return typeof value === 'string' ? value : ''
}

const API_V2 = `${buildEnv('VITE_API_BASE').replace(/\/+$/, '')}/api/v2`

export const SAVE_DEBOUNCE_MS = 800
const TIMEOUT_MS = { narrate: 12_000, improvise: 15_000, talk: 11_000, save: 5_000 } as const
/** Server limit (MYTHOS_V2_MAX_BLOB_BYTES). Bigger blobs stay local-only. */
const MAX_BLOB_BYTES = 512 * 1024
/** Browsers cap in-flight keepalive bodies at 64 KB. */
const KEEPALIVE_MAX_BYTES = 60_000
const MAX_ACTION_CHARS = 200

const PLAYER_ID_KEY = 'mythos2.playerId'
const CONFIG_KEY = 'mythos2.config'
/** Set while a sign-in identity switch has not finished adopting the account's saves (retried at the next boot). */
const ADOPT_KEY = 'mythos2.adopt'
const PENDING_HISTORY_KEY = 'mythos2.pendingHistory'
const RUN_TOMBSTONE_KEY = 'mythos2.run.cleared'
const PLAYER_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

type Slot = 'profile' | 'run'
const MIRROR_KEY: Record<Slot, string> = { profile: 'mythos2.profile', run: 'mythos2.run' }
const SYNCED_KEY: Record<Slot, string> = { profile: 'mythos2.profile.synced', run: 'mythos2.run.synced' }

// ---------------------------------------------------------------- storage (never throws)

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false // quota exceeded / storage disabled
  }
}

function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

// ---------------------------------------------------------------- identity

function newUuid(): string {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* insecure context (plain-http LAN) — fall through */
  }
  const bytes = new Uint8Array(16)
  try {
    crypto.getRandomValues(bytes)
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

let cachedPlayerId: string | null = null

/** Stable anonymous player id for this browser (`X-Player-Id`; the server only uses it in `auth: 'open'` mode). */
export function getPlayerId(): string {
  if (cachedPlayerId) return cachedPlayerId
  const stored = storageGet(PLAYER_ID_KEY)
  // `g_…` ids are reserved for signed-in accounts (the server answers 400); uuids never start that way.
  const id = stored && PLAYER_ID_RE.test(stored) && !stored.startsWith('g_') ? stored : newUuid()
  storageSet(PLAYER_ID_KEY, id)
  cachedPlayerId = id
  return id
}

/**
 * The signed-in session, as net/auth.ts exposes it. Kept as a seam so this module never imports the auth code
 * (and its lazily loaded Firebase SDK): auth.ts installs itself with `setAuthSource` at boot.
 */
export interface AuthSource {
  /** Resolves once a persisted session has been restored or ruled out. */
  ready(): Promise<void>
  signedIn(): boolean
  /** The current ID token (cached; refreshed ahead of expiry), or null when it cannot be had right now. */
  getIdToken(force?: boolean): Promise<string | null>
  /** The server rejected even a freshly refreshed token: end the session (local progress stays). */
  tokenRejected?(): void
}

let authSource: AuthSource | null = null
const AUTH_READY_WAIT_MS = 4000

export function setAuthSource(source: AuthSource | null): void {
  authSource = source
}

// ---------------------------------------------------------------- server config (GET /config)

export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  messagingSenderId?: string
}

export interface ServerConfig {
  /** 'google': saves / GM / leaderboard writes need a signed-in player. 'open': local dev, X-Player-Id works. */
  auth: 'open' | 'google'
  /** Public Firebase web config, or null when the server has none (sign-in unavailable). */
  firebase: FirebaseWebConfig | null
  leaderboard: boolean
}

/** Validate a `/config` reply (or its cached copy). */
export function parseServerConfig(raw: unknown): ServerConfig | null {
  if (!isRecord(raw) || (raw.auth !== 'open' && raw.auth !== 'google')) return null
  let firebase: FirebaseWebConfig | null = null
  const fb = raw.firebase
  if (isRecord(fb) && ['apiKey', 'authDomain', 'projectId', 'appId'].every((k) => typeof fb[k] === 'string' && fb[k])) {
    firebase = { apiKey: String(fb.apiKey), authDomain: String(fb.authDomain), projectId: String(fb.projectId), appId: String(fb.appId) }
    if (typeof fb.messagingSenderId === 'string') firebase.messagingSenderId = fb.messagingSenderId
  }
  return { auth: raw.auth, firebase, leaderboard: raw.leaderboard !== false }
}

let config: ServerConfig | null = null
let configFetch: Promise<ServerConfig | null> | null = null
let configFailedAt = 0
const CONFIG_RETRY_MS = 30_000
const CONFIG_WAIT_MS = 3000

/** The last known server config (this session's fetch, else the copy cached on this device), or null. */
export function cachedConfig(): ServerConfig | null {
  if (config) return config
  const raw = storageGet(CONFIG_KEY)
  if (!raw) return null
  try {
    return parseServerConfig(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * `GET /config` once per session (retried at most every 30 s after a failure). Resolves to the fresh config, or the
 * cached copy when the server is unreachable, or null when neither exists. Never rejects.
 */
export function loadConfig(): Promise<ServerConfig | null> {
  if (config) return Promise.resolve(config)
  if (configFetch) return configFetch
  if (configFailedAt && Date.now() - configFailedAt < CONFIG_RETRY_MS) return Promise.resolve(cachedConfig())
  configFetch = (async () => {
    const res = await send('GET', '/config', { timeoutMs: TIMEOUT_MS.save, headers: {} })
    const fresh = res.kind === 'http' && res.status === 200 ? parseServerConfig(res.body) : null
    if (fresh) {
      config = fresh
      storageSet(CONFIG_KEY, JSON.stringify(fresh))
      return fresh
    }
    configFailedAt = Date.now()
    return cachedConfig()
  })().finally(() => {
    configFetch = null
  })
  return configFetch
}

function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

/** Can this player use the server's saves / GM / leaderboard writes right now? (Sync; for the UI.) */
export function cloudAvailable(): boolean {
  if (authSource?.signedIn()) return true
  return cachedConfig()?.auth !== 'google'
}

type Access = 'public' | 'identity'

/**
 * Identity headers for one request, or null when the request must not be sent: a signed-in player whose token
 * cannot be had (never fall back to another identity), or a signed-out player on an `auth: 'google'` server.
 */
async function identityHeaders(access: Access, forceToken = false): Promise<Record<string, string> | null> {
  const source = authSource
  if (source) await within(source.ready(), AUTH_READY_WAIT_MS, undefined)
  if (source?.signedIn()) {
    const token = await source.getIdToken(forceToken).catch(() => null)
    if (token) return { Authorization: `Bearer ${token}` }
    return access === 'identity' ? null : {}
  }
  if (access === 'identity') {
    const cfg = config ?? (await within(loadConfig(), CONFIG_WAIT_MS, cachedConfig()))
    if (cfg?.auth === 'google') return null
  }
  return { 'X-Player-Id': getPlayerId() }
}

// ---------------------------------------------------------------- transport

interface RequestOptions {
  body?: string
  timeoutMs: number
  signal?: AbortSignal
  keepalive?: boolean
  /** 'identity' (default): saves, GM, leaderboard writes. 'public': config, health, leaderboard reads. */
  access?: Access
}

/** Outcome of one HTTP exchange: `skipped` = not sent (no usable identity), `network` = no reply (offline/timeout). */
export type SendResult = { kind: 'skipped' } | { kind: 'network' } | { kind: 'http'; status: number; body: unknown }

async function send(method: string, path: string, opts: RequestOptions & { headers: Record<string, string> }): Promise<SendResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  const relay = (): void => ctrl.abort()
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort()
    else opts.signal.addEventListener('abort', relay, { once: true })
  }
  try {
    const headers = { ...opts.headers }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${API_V2}${path}`, {
      method,
      headers,
      body: opts.body,
      signal: ctrl.signal,
      keepalive: opts.keepalive === true,
      cache: 'no-store',
    })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    return { kind: 'http', status: res.status, body }
  } catch {
    return { kind: 'network' }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', relay)
  }
}

/**
 * One `/api/v2` call with this player's identity. The server answers 401 to any request carrying a token it cannot
 * verify (even the public reads), so a signed-in 401 is retried once with a force-refreshed token; if that is
 * rejected too, the session ends (`tokenRejected`: shown as signed out, local progress kept) and the request is
 * re-evaluated as the signed-out player it now is — never by quietly dropping the header while still "signed in".
 * A 503 to a signed-in request means the server cannot check tokens right now: treated as offline.
 */
export async function apiSend(method: string, path: string, opts: RequestOptions): Promise<SendResult> {
  const access = opts.access ?? 'identity'
  let headers = await identityHeaders(access)
  if (!headers) return { kind: 'skipped' }
  let res = await send(method, path, { ...opts, headers })
  const rejected = (r: SendResult, h: Record<string, string>): boolean => r.kind === 'http' && r.status === 401 && !!h.Authorization && !opts.signal?.aborted
  if (rejected(res, headers)) {
    headers = await identityHeaders(access, true)
    if (!headers) return { kind: 'skipped' }
    res = await send(method, path, { ...opts, headers })
    if (rejected(res, headers)) {
      authSource?.tokenRejected?.()
      headers = authSource?.signedIn() ? null : await identityHeaders(access)
      if (!headers) return { kind: 'skipped' }
      res = await send(method, path, { ...opts, headers })
    }
  }
  if (res.kind === 'http' && res.status === 503 && headers.Authorization) return { kind: 'network' }
  return res
}

async function request<T>(method: string, path: string, opts: RequestOptions): Promise<T | null> {
  const res = await apiSend(method, path, opts)
  if (res.kind !== 'http' || res.status < 200 || res.status >= 300) return null
  return res.body as T
}

export interface V2Health {
  status: string
  store: 'postgres' | 'memory' | 'unavailable' | string
  gm: string
}

/** Server reachability + which store/GM backend is live. */
export async function checkHealth(): Promise<V2Health | null> {
  const res = await request<unknown>('GET', '/health', { timeoutMs: TIMEOUT_MS.save, access: 'public' })
  if (!isRecord(res) || typeof res.status !== 'string') return null
  return { status: res.status, store: String(res.store ?? ''), gm: String(res.gm ?? '') }
}

// ---------------------------------------------------------------- local mirror

interface Mirror {
  rev: number
  savedAt: number
  data: unknown
}

let lastRev = 0
function nextRev(): number {
  lastRev = Math.max(Date.now(), lastRev + 1)
  return lastRev
}

function writeMirror(slot: Slot, json: string, rev: number): void {
  storageSet(MIRROR_KEY[slot], `{"rev":${rev},"savedAt":${Date.now()},"data":${json}}`)
}

function readMirror(slot: Slot): Mirror | null {
  const raw = storageGet(MIRROR_KEY[slot])
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || typeof parsed.rev !== 'number') return null
    lastRev = Math.max(lastRev, parsed.rev)
    return { rev: parsed.rev, savedAt: Number(parsed.savedAt) || 0, data: parsed.data }
  } catch {
    return null
  }
}

function markSynced(slot: Slot, rev: number): void {
  const mirror = readMirror(slot)
  if (mirror && mirror.rev === rev) storageSet(SYNCED_KEY[slot], String(rev))
}

function isSynced(slot: Slot, rev: number): boolean {
  return storageGet(SYNCED_KEY[slot]) === String(rev)
}

function isSave(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.version === 'number'
}

// ---------------------------------------------------------------- debounced saves

interface PendingSave {
  json: string
  rev: number
  timer: ReturnType<typeof setTimeout> | null
  waiters: ((ok: boolean) => void)[]
}

const pending: Record<Slot, PendingSave | null> = { profile: null, run: null }
// Writes per slot are serialised so a stale PUT can never land after a newer PUT/DELETE.
const chain: Record<Slot, Promise<void>> = { profile: Promise.resolve(), run: Promise.resolve() }

function scheduleSave(slot: Slot, value: unknown, delayMs: number = SAVE_DEBOUNCE_MS): Promise<boolean> {
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    return Promise.resolve(false)
  }
  const rev = nextRev()
  writeMirror(slot, json, rev)
  if (slot === 'run') storageRemove(RUN_TOMBSTONE_KEY)
  return new Promise<boolean>((resolve) => {
    const prev = pending[slot]
    if (prev?.timer) clearTimeout(prev.timer)
    const entry: PendingSave = { json, rev, timer: null, waiters: [...(prev?.waiters ?? []), resolve] }
    entry.timer = setTimeout(() => void flushSlot(slot), delayMs)
    pending[slot] = entry
  })
}

function flushSlot(slot: Slot, keepalive = false): Promise<void> {
  const entry = pending[slot]
  if (!entry) return chain[slot]
  if (entry.timer) clearTimeout(entry.timer)
  pending[slot] = null
  const run = async (): Promise<void> => {
    let ok = false
    const bytes = utf8Bytes(entry.json)
    if (bytes <= MAX_BLOB_BYTES) {
      const res = await request<{ ok?: boolean }>('PUT', `/${slot}`, {
        body: entry.json,
        timeoutMs: TIMEOUT_MS.save,
        keepalive: keepalive && bytes <= KEEPALIVE_MAX_BYTES,
      })
      ok = res?.ok === true
    }
    if (ok) markSynced(slot, entry.rev)
    for (const resolve of entry.waiters) resolve(ok)
  }
  const next = chain[slot].then(run, run)
  chain[slot] = next
  return next
}

/** Send any debounced saves now (e.g. before navigating away). */
export async function flushSaves(keepalive = false): Promise<void> {
  await Promise.all([flushSlot('profile', keepalive), flushSlot('run', keepalive)])
}

async function loadSlot(slot: Slot): Promise<Record<string, unknown> | null> {
  const local = readMirror(slot)
  const localData = local && isSave(local.data) ? local.data : null
  if (pending[slot]) return localData // this session has newer unsent state
  const remote = await request<{ data?: unknown }>('GET', `/${slot}`, { timeoutMs: TIMEOUT_MS.save })
  if (remote === null) return localData // offline / server down → local mirror
  const remoteData = isSave(remote.data) ? remote.data : null
  if (localData && local && (!isSynced(slot, local.rev) || remoteData === null)) {
    // Unsynced offline progress, or the server lost it (in-memory fallback restart): push it back.
    void scheduleSave(slot, localData, 0)
    return localData
  }
  if (remoteData) {
    try {
      const rev = nextRev()
      writeMirror(slot, JSON.stringify(remoteData), rev)
      storageSet(SYNCED_KEY[slot], String(rev))
    } catch {
      /* mirror is best effort */
    }
    return remoteData
  }
  return localData
}

// ---------------------------------------------------------------- sign-in identity switch

/** What a sign-in does with one save slot: take the account's cloud copy, push this device's copy, or nothing. */
export type AdoptAction = 'take-remote' | 'push-local' | 'none'

/** The identity-switch rule: the account's cloud copy wins when it has one; otherwise this device's copy goes up. */
export function adoptDecision(hasLocal: boolean, hasRemote: boolean): AdoptAction {
  if (hasRemote) return 'take-remote'
  return hasLocal ? 'push-local' : 'none'
}

/** Result of `adoptAccount`: what happened per slot (null = the server could not be reached; retried later). */
export interface AdoptSummary {
  profile: AdoptAction | null
  run: AdoptAction | null
}

/** Cloud copies the store must switch to after a sign-in (the store subscribes with `onAdopt`). */
export interface AdoptedCopies {
  profile?: MetaProfile
  run?: RunState
}

const adoptListeners = new Set<(copies: AdoptedCopies) => void>()

/** Subscribe to account switches (sign-in adoption). Returns the unsubscribe function. */
export function onAdopt(listener: (copies: AdoptedCopies) => void): () => void {
  adoptListeners.add(listener)
  return () => adoptListeners.delete(listener)
}

/** True when a sign-in has not finished adopting the account's saves (an offline sign-in; retried at boot). */
export function adoptPending(): boolean {
  return storageGet(ADOPT_KEY) === '1'
}

async function adoptSlot(slot: Slot): Promise<{ action: AdoptAction | null; data: Record<string, unknown> | null }> {
  const remote = await request<{ data?: unknown }>('GET', `/${slot}`, { timeoutMs: TIMEOUT_MS.save })
  if (remote === null) return { action: null, data: null }
  const remoteData = isSave(remote.data) ? remote.data : null
  const local = readMirror(slot)
  const localData = local && isSave(local.data) && !(slot === 'run' && storageGet(RUN_TOMBSTONE_KEY)) ? local.data : null
  const action = adoptDecision(localData !== null, remoteData !== null)
  if (action === 'take-remote' && remoteData) {
    const entry = pending[slot]
    if (entry) {
      // A debounced save of the old identity's state must not land on the account after this.
      if (entry.timer) clearTimeout(entry.timer)
      pending[slot] = null
      for (const resolve of entry.waiters) resolve(false)
    }
    const rev = nextRev()
    writeMirror(slot, JSON.stringify(remoteData), rev)
    storageSet(SYNCED_KEY[slot], String(rev))
    if (slot === 'run') storageRemove(RUN_TOMBSTONE_KEY)
    return { action, data: remoteData }
  }
  if (action === 'push-local' && localData) void scheduleSave(slot, localData, 0)
  return { action, data: null }
}

/**
 * Sign-in identity switch, after the account became active (net/auth.ts calls it; pending saves of the old identity
 * were flushed before the switch). Per slot: the account's cloud copy wins if it exists (mirrored locally and handed
 * to the `onAdopt` listeners), else this device's progress is pushed up. Until both slots succeed the switch stays
 * pending (`adoptPending`) and is retried at the next boot.
 */
export async function adoptAccount(): Promise<AdoptSummary> {
  storageSet(ADOPT_KEY, '1')
  const [profile, run] = await Promise.all([adoptSlot('profile'), adoptSlot('run')])
  const copies: AdoptedCopies = {}
  if (profile.data) copies.profile = profile.data as unknown as MetaProfile
  if (run.data) copies.run = run.data as unknown as RunState
  if (copies.profile || copies.run) for (const listener of adoptListeners) listener(copies)
  if (profile.action !== null && run.action !== null) storageRemove(ADOPT_KEY)
  return { profile: profile.action, run: run.action }
}

/** Meta profile: best available copy (see header), or null for a first-time player. */
export async function loadProfile(): Promise<MetaProfile | null> {
  return (await loadSlot('profile')) as MetaProfile | null
}

/** Synchronous local mirror (instant boot before the network answers). */
export function loadProfileLocal(): MetaProfile | null {
  const local = readMirror('profile')
  return local && isSave(local.data) ? (local.data as unknown as MetaProfile) : null
}

/** Mirror now, PUT debounced. Resolves true once the server stored this (or a newer) version. */
export function saveProfile(profile: MetaProfile): Promise<boolean> {
  return scheduleSave('profile', profile)
}

/** In-progress run, or null when there is none (or it was cleared). */
export async function loadRun(): Promise<RunState | null> {
  if (storageGet(RUN_TOMBSTONE_KEY)) {
    void deleteRunRemote()
    return null
  }
  return (await loadSlot('run')) as RunState | null
}

export function loadRunLocal(): RunState | null {
  if (storageGet(RUN_TOMBSTONE_KEY)) return null
  const local = readMirror('run')
  return local && isSave(local.data) ? (local.data as unknown as RunState) : null
}

/** When the in-progress run was last written to this device (ms epoch), or null. */
export function runSavedAt(): number | null {
  if (storageGet(RUN_TOMBSTONE_KEY)) return null
  const local = readMirror('run')
  return local && local.savedAt > 0 ? local.savedAt : null
}

export function saveRun(run: RunState): Promise<boolean> {
  return scheduleSave('run', run)
}

function deleteRunRemote(): Promise<boolean> {
  let ok = false
  const run = async (): Promise<void> => {
    const res = await request<{ ok?: boolean }>('DELETE', '/run', { timeoutMs: TIMEOUT_MS.save })
    ok = res?.ok === true
    if (ok && !readMirror('run')) storageRemove(RUN_TOMBSTONE_KEY)
  }
  const next = chain.run.then(run, run)
  chain.run = next
  return next.then(() => ok)
}

/** Drop the run (death/victory/abandon): cancels a pending save, clears the mirror, DELETEs. */
export function clearRun(): Promise<boolean> {
  const entry = pending.run
  if (entry) {
    if (entry.timer) clearTimeout(entry.timer)
    pending.run = null
    for (const resolve of entry.waiters) resolve(false)
  }
  storageRemove(MIRROR_KEY.run)
  storageRemove(SYNCED_KEY.run)
  storageSet(RUN_TOMBSTONE_KEY, '1') // survives offline; retried by the next loadRun
  return deleteRunRemote()
}

// ---------------------------------------------------------------- account deletion

export type DeleteAccountResult = { kind: 'deleted'; signInRecordDeleted: boolean | null } | { kind: 'offline' } | { kind: 'failed' }

/**
 * Erase this player's cloud data (`DELETE /account`): both save slots, run history, daily-board rows and, when signed
 * in, the sign-in record. Debounced saves go out first and the DELETE is chained behind both slots' writes, so no
 * earlier PUT can land after it. On success the unsent history queue and pending saves are dropped (they belong to the
 * erased account); the local mirror stays, so this device keeps playing offline as it does after a sign-out.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  await flushSaves()
  let res: SendResult = { kind: 'skipped' }
  const run = async (): Promise<void> => {
    res = await apiSend('DELETE', '/account', { timeoutMs: TIMEOUT_MS.save })
  }
  const next = Promise.all([chain.profile, chain.run]).then(run, run)
  chain.profile = next
  chain.run = next
  await next
  const done = res as SendResult
  // `skipped`: signed in but no token can be had right now (offline token refresh) — nothing was sent.
  if (done.kind === 'network' || done.kind === 'skipped') return { kind: 'offline' }
  if (done.kind !== 'http' || done.status < 200 || done.status >= 300) return { kind: 'failed' }
  for (const slot of ['profile', 'run'] as const) {
    const entry = pending[slot]
    if (entry?.timer) clearTimeout(entry.timer)
    pending[slot] = null
    for (const resolve of entry?.waiters ?? []) resolve(false)
    storageRemove(SYNCED_KEY[slot])
  }
  storageRemove(PENDING_HISTORY_KEY)
  const flag = isRecord(done.body) ? done.body.sign_in_record_deleted : undefined
  return { kind: 'deleted', signInRecordDeleted: typeof flag === 'boolean' ? flag : null }
}

// ---------------------------------------------------------------- run history

function readPendingHistory(): RunRecord[] {
  try {
    const parsed: unknown = JSON.parse(storageGet(PENDING_HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed.filter(isRecord) as unknown as RunRecord[]) : []
  } catch {
    return []
  }
}

let historyFlush: Promise<boolean> | null = null

async function flushHistory(): Promise<boolean> {
  const queue = readPendingHistory()
  const failed: RunRecord[] = []
  for (const record of queue) {
    const res = await apiSend('POST', '/history', { body: JSON.stringify(record), timeoutMs: TIMEOUT_MS.save })
    const ok = res.kind === 'http' && res.status >= 200 && res.status < 300
    // A refusal that can never change (e.g. 409: that record id belongs to another player) is dropped, not retried
    // forever; offline, signed out (401), throttled (429) and server errors stay queued.
    const permanent = res.kind === 'http' && res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status)
    if (!ok && !permanent) failed.push(record)
  }
  // Keep records queued after this flush started, plus the ones that failed.
  const sent = new Set(queue.filter((r) => !failed.includes(r)).map((r) => r.id))
  const remaining = readPendingHistory().filter((r) => !sent.has(r.id))
  if (remaining.length) storageSet(PENDING_HISTORY_KEY, JSON.stringify(remaining.slice(-20)))
  else storageRemove(PENDING_HISTORY_KEY)
  return failed.length === 0
}

/** Append a finished run (queued locally and retried until the server has it). */
export async function appendHistory(record: RunRecord): Promise<boolean> {
  const queue = readPendingHistory().filter((r) => r.id !== record.id)
  queue.push(record)
  storageSet(PENDING_HISTORY_KEY, JSON.stringify(queue.slice(-20)))
  while (historyFlush) await historyFlush
  historyFlush = flushHistory().finally(() => {
    historyFlush = null
  })
  return historyFlush
}

/** Server-side run records, newest first (null when offline). */
export async function loadHistory(limit = 30): Promise<RunRecord[] | null> {
  const res = await request<{ records?: unknown }>('GET', `/history?limit=${Math.max(1, Math.min(100, limit))}`, {
    timeoutMs: TIMEOUT_MS.save,
  })
  if (!res || !Array.isArray(res.records)) return null
  return res.records.filter(isRecord) as unknown as RunRecord[]
}

// ---------------------------------------------------------------- AI GM

export type NarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro' | 'echo'

/**
 * Context the GM (and its server-side authored fallback) understands. All optional; send plain,
 * already-localised strings (names in the request language). Extra keys are passed to the LLM.
 */
export interface NarrateContext {
  loop?: number
  act?: number
  archetype?: string
  playerName?: string
  party?: string[]
  // event
  title?: string
  choice?: string
  outcome?: string
  success?: boolean
  // ix_loop_start
  killedBy?: string
  lastAct?: number
  lastResult?: 'victory' | 'defeat' | 'abandoned'
  wins?: number
  // chronicle
  result?: 'victory' | 'defeat' | 'abandoned'
  ending?: string
  actName?: string
  highlights?: string[]
  // boss
  boss?: string
  phase?: number
  phaseText?: string
  // bond
  companion?: string
  bond?: number
  line?: string
  // act_intro
  subtitle?: string
  [extra: string]: string | number | boolean | string[] | null | undefined
}

export interface NarrateRequest {
  kind: NarrateKind
  lang: Lang
  context?: NarrateContext
}

export interface NarrateResult {
  text: string
  source: 'llm' | 'fallback'
}

/** GM line for a moment; null → show the client's authored text. Pass `signal` to cancel on unmount. */
export async function narrate(req: NarrateRequest, signal?: AbortSignal): Promise<NarrateResult | null> {
  const res = await request<unknown>('POST', '/gm/narrate', {
    body: JSON.stringify({ kind: req.kind, lang: req.lang, context: req.context ?? {} }),
    timeoutMs: TIMEOUT_MS.narrate,
    signal,
  })
  if (!isRecord(res) || typeof res.text !== 'string' || !res.text.trim()) return null
  return { text: res.text, source: res.source === 'llm' ? 'llm' : 'fallback' }
}

export interface ImproviseRequest {
  lang: Lang
  event: { title: string; text: string; options?: string[] }
  action: string
  stats: Stats
  act: number
}

export type ImproviseResult = Omit<Improvisation, 'rolled'> & { source: 'llm' | 'fallback' }

const STAT_KEYS: readonly StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']
const REWARDS: readonly Improvisation['reward'][] = ['credits', 'heal', 'card', 'trace_down', 'implant']
const RISKS: readonly Improvisation['risk'][] = ['hp', 'trace', 'credits']

function asText(value: unknown): { ko: string; en: string } | null {
  if (!isRecord(value) || typeof value.ko !== 'string' || typeof value.en !== 'string') return null
  return { ko: value.ko, en: value.en }
}

/** Adjudicate a free-text action (server-clamped). null → use the client's own fallback. */
export async function improvise(req: ImproviseRequest, signal?: AbortSignal): Promise<ImproviseResult | null> {
  const action = req.action.trim().slice(0, MAX_ACTION_CHARS)
  const res = await request<unknown>('POST', '/gm/improvise', {
    body: JSON.stringify({ ...req, action }),
    timeoutMs: TIMEOUT_MS.improvise,
    signal,
  })
  if (!isRecord(res)) return null
  const stat = STAT_KEYS.find((s) => s === res.stat)
  const reward = REWARDS.find((r) => r === res.reward)
  const risk = RISKS.find((r) => r === res.risk)
  const dc = typeof res.dc === 'number' ? Math.round(res.dc) : NaN
  const successText = asText(res.successText)
  const failureText = asText(res.failureText)
  if (!stat || !reward || !risk || !(dc >= 3 && dc <= 9) || !successText || !failureText) return null
  return {
    action: typeof res.action === 'string' ? res.action : action,
    stat,
    dc,
    reward: reward === 'implant' && dc < 7 ? 'card' : reward,
    risk,
    successText,
    failureText,
    source: res.source === 'llm' ? 'llm' : 'fallback',
  }
}

// ---------------------------------------------------------------- companion chat + IX comms

/** Server caps (src/mythos_v2/talk.py); the client trims to them so a request is never rejected. */
export const TALK_LIMITS = { message: 200, historyTurns: 8, turnChars: 300, playerMessages: 4 } as const

/** Notable combat moments IX comments on (must match `talk.IX_TRIGGERS`). */
export type IxTrigger = 'elite_start' | 'boss_start' | 'env_kill' | 'multi_kill' | 'companion_down' | 'low_hp' | 'boss_phase' | 'flawless'

export interface TalkTurn {
  role: 'player' | 'companion'
  text: string
}

export type TalkRequest =
  | {
      mode: 'companion'
      lang: Lang
      /** Companion id (`se_rin`, `kai`, …): picks the server-side persona voice. */
      companion: string
      message: string
      /** Earlier turns, oldest first (the authored opening line is the first companion turn). */
      history?: TalkTurn[]
      /** name, alias, role, bondLines, bond, act, actName, log, archetype. */
      context?: NarrateContext
    }
  | {
      mode: 'ix'
      lang: Lang
      trigger: IxTrigger
      /** act, actName, enemy, boss, companion, phaseText, loop. */
      context?: NarrateContext
    }
  | {
      mode: 'enemy'
      lang: Lang
      /** Talking enemy id (content/taunts.ts ↔ src/mythos_v2/taunt.py personas). */
      enemy: string
      moment: 'hurt' | 'winning'
      context?: NarrateContext
    }

export type TalkResult = NarrateResult

/** One companion reply or IX comms line (LLM or the server's authored fallback); null on any failure. */
export async function talk(req: TalkRequest, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<TalkResult | null> {
  const body =
    req.mode === 'companion'
      ? {
          ...req,
          message: req.message.trim().slice(0, TALK_LIMITS.message),
          history: (req.history ?? [])
            .map((t) => ({ role: t.role, text: t.text.trim().slice(0, TALK_LIMITS.turnChars) }))
            .filter((t) => t.text)
            .slice(-TALK_LIMITS.historyTurns),
          context: req.context ?? {},
        }
      : { ...req, context: req.context ?? {} }
  const res = await request<unknown>('POST', '/gm/talk', {
    body: JSON.stringify(body),
    timeoutMs: opts.timeoutMs ?? TIMEOUT_MS.talk,
    signal: opts.signal,
  })
  if (!isRecord(res) || typeof res.text !== 'string' || !res.text.trim()) return null
  return { text: res.text, source: res.source === 'llm' ? 'llm' : 'fallback' }
}

// ---------------------------------------------------------------- AI line reports

export type ReportRoute = 'narrate' | 'improvise' | 'talk'
export interface AiLineReport {
  route: ReportRoute
  /** What produced it: 'event', 'boss', 'companion:se_rin', 'ix:boss_start', … (`^[a-z][a-z0-9_:-]{0,39}$`). */
  kind: string
  lang: Lang
  text: string
}

/** Flag an AI-written line as offensive (Google Play AI-generated content policy). Only the line is sent on; the server
 *  keeps no player id with it. True when the server took it. */
export async function reportAiLine(report: AiLineReport): Promise<boolean> {
  const text = report.text.trim().slice(0, 2000)
  const kind = report.kind.toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 40)
  if (!text || !/^[a-z]/.test(kind)) return false
  const res = await request<{ ok?: boolean }>('POST', '/gm/report', {
    body: JSON.stringify({ route: report.route, kind, lang: report.lang, text }),
    timeoutMs: TIMEOUT_MS.save,
  })
  return res?.ok === true
}

// ---------------------------------------------------------------- lifecycle

// Push debounced saves when the tab is hidden/closed (keepalive for small bodies; the localStorage
// mirror already holds the data, so anything that does not make it is re-pushed on the next load).
if (typeof window !== 'undefined') {
  const flushOnHide = (): void => void flushSaves(true)
  window.addEventListener('pagehide', flushOnHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnHide()
  })
}

// ---------------------------------------------------------------- Signal+ plan and AI budget (GET /plan)

export type Tier = 'free' | 'plus'

export interface Plan {
  tier: Tier
  signedIn: boolean
  /** Signed-in player id = Play's obfuscatedAccountId for a Signal+ purchase. */
  accountId: string | null
  /** 'ai' = GM lines within the monthly budget; 'crpg' = the Signal+ CRPG layer (districts, d20 dialogue, …). */
  features: string[]
  /** `unlimited`: an admin account (no monthly allowance; the global daily ceiling still applies). */
  budget: { limitUsd: number; usedUsd: number; left: number; unlimited?: boolean }
  /** Allow-listed admin account (MYTHOS_ADMIN_EMAILS). */
  admin?: boolean
  subscription: { sku: string; state: string; expiresAt: string | null } | null
  skus: string[]
}

const PLAN_KEY = 'mythos2.plan'
const FREE_PLAN: Plan = {
  tier: 'free',
  signedIn: false,
  accountId: null,
  features: [],
  budget: { limitUsd: 0, usedUsd: 0, left: 0 },
  subscription: null,
  skus: [],
}

export function parsePlan(raw: unknown): Plan | null {
  if (!isRecord(raw) || (raw.tier !== 'free' && raw.tier !== 'plus')) return null
  const b = isRecord(raw.budget) ? raw.budget : {}
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const sub = isRecord(raw.subscription) ? raw.subscription : null
  return {
    tier: raw.tier,
    signedIn: raw.signedIn === true,
    accountId: typeof raw.accountId === 'string' ? raw.accountId : null,
    features: Array.isArray(raw.features) ? raw.features.filter((f): f is string => typeof f === 'string') : [],
    budget: { limitUsd: num(b.limitUsd), usedUsd: num(b.usedUsd), left: Math.max(0, Math.min(1, num(b.left))), unlimited: b.unlimited === true },
    admin: raw.admin === true,
    subscription: sub
      ? { sku: String(sub.sku ?? ''), state: String(sub.state ?? ''), expiresAt: typeof sub.expiresAt === 'string' ? sub.expiresAt : null }
      : null,
    skus: Array.isArray(raw.skus) ? raw.skus.filter((s): s is string => typeof s === 'string') : [],
  }
}

let plan: Plan | null = null
const planListeners = new Set<(p: Plan) => void>()

function setPlan(next: Plan): Plan {
  plan = next
  storageSet(PLAN_KEY, JSON.stringify(next))
  for (const listener of planListeners) listener(next)
  return next
}

/** The last known plan (cached across launches; free when never fetched). Signal+ survives offline play. */
export function currentPlan(): Plan {
  if (plan) return plan
  try {
    plan = parsePlan(JSON.parse(storageGet(PLAN_KEY) ?? 'null'))
  } catch {
    plan = null
  }
  return plan ?? FREE_PLAN
}

export function onPlan(listener: (p: Plan) => void): () => void {
  planListeners.add(listener)
  return () => planListeners.delete(listener)
}

/** Refresh the plan from the server (also re-checks an expired subscription there). Offline → the cached plan. */
export async function loadPlan(): Promise<Plan> {
  const res = await apiSend('GET', '/plan', { timeoutMs: TIMEOUT_MS.save })
  if (res.kind === 'skipped' || (res.kind === 'http' && res.status === 401)) return setPlan(FREE_PLAN)
  const parsed = res.kind === 'http' && res.status === 200 ? parsePlan(res.body) : null
  return parsed ? setPlan(parsed) : currentPlan()
}

export type RedeemResult = { kind: 'ok'; plan: Plan } | { kind: 'rejected' } | { kind: 'offline' }

/** Hand a Google Play purchase token to the server (`POST /plan/play`), which verifies and acknowledges it. */
export async function redeemPlayPurchase(purchaseToken: string): Promise<RedeemResult> {
  const res = await apiSend('POST', '/plan/play', { body: JSON.stringify({ purchaseToken }), timeoutMs: 15_000 })
  if (res.kind !== 'http' || res.status >= 500) return { kind: 'offline' }
  const parsed = res.status === 200 ? parsePlan(res.body) : null
  return parsed ? { kind: 'ok', plan: setPlan(parsed) } : { kind: 'rejected' }
}

/** True when this player has the Signal+ CRPG layer (cached plan; daily runs never use it). */
export function hasCrpg(): boolean {
  return currentPlan().features.includes('crpg')
}

// ---------------------------------------------------------------- Signal+ NPC talk (POST /gm/talk mode npc)

export interface NpcTalkRequest {
  lang: Lang
  /** NPC id (content/crpg ↔ src/mythos_v2/npcs personas). */
  npc: string
  message: string
  /** Earlier free-text turns at this NPC, oldest first ('companion' = the NPC's lines). */
  history?: TalkTurn[]
  /** The intents open at the current node, with their authored labels. */
  options: { intent: string; label: string }[]
  /** district, node (the node's text), act. */
  context?: NarrateContext
}

export interface NpcTalkResult {
  /** The NPC's line ('' when no model answered). */
  text: string
  source: 'llm' | 'fallback'
  /** Which open intent the player's line attempts (null = none of them). */
  intent: string | null
}

/** An NPC's answer to free text and the intent it reads in it; null when the server cannot be reached. */
export async function talkNpc(req: NpcTalkRequest, opts: { signal?: AbortSignal } = {}): Promise<NpcTalkResult | null> {
  const body = {
    mode: 'npc',
    lang: req.lang,
    npc: req.npc,
    message: req.message.trim().slice(0, TALK_LIMITS.message),
    history: (req.history ?? [])
      .map((t) => ({ role: t.role, text: t.text.trim().slice(0, TALK_LIMITS.turnChars) }))
      .filter((t) => t.text)
      .slice(-TALK_LIMITS.historyTurns),
    options: req.options.slice(0, 8),
    context: req.context ?? {},
  }
  const res = await request<unknown>('POST', '/gm/talk', { body: JSON.stringify(body), timeoutMs: TIMEOUT_MS.talk, signal: opts.signal })
  if (!isRecord(res) || typeof res.text !== 'string') return null
  return {
    text: res.text.trim(),
    source: res.source === 'llm' ? 'llm' : 'fallback',
    intent: typeof res.intent === 'string' ? res.intent : null,
  }
}
