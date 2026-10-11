// Mythos 2.0 — browser client for `/api/v2` (saves + AI GM). Backend: src/mythos_v2/api.py.
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
// Identity: `X-Player-Id` = `player_<cyrb53(inviteKey)>` when an invite key is present (the same
// stable id the classic client derives, so saves follow the key across devices), otherwise a random
// uuid persisted under localStorage `mythos2.playerId`. The invite key is read exactly like the
// classic client (`?invite=` → localStorage `mythos_invite`) and sent as `X-Invite-Key`.

import type { Improvisation, Lang, MetaProfile, RunRecord, RunState, Stats, StatKey } from '../engine/types.ts'

const API_V2 = '/api/v2'

export const SAVE_DEBOUNCE_MS = 800
const TIMEOUT_MS = { narrate: 12_000, improvise: 15_000, talk: 11_000, save: 5_000 } as const
/** Server limit (MYTHOS_V2_MAX_BLOB_BYTES). Bigger blobs stay local-only. */
const MAX_BLOB_BYTES = 512 * 1024
/** Browsers cap in-flight keepalive bodies at 64 KB. */
const KEEPALIVE_MAX_BYTES = 60_000
const MAX_ACTION_CHARS = 200

const PLAYER_ID_KEY = 'mythos2.playerId'
const INVITE_STORAGE_KEY = 'mythos_invite' // shared with the classic client (src/api.ts)
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

/** Invite key from `?invite=` (persisted) or localStorage — same rule as the classic client. */
export function getInviteKey(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('invite')
    if (fromUrl) {
      storageSet(INVITE_STORAGE_KEY, fromUrl)
      return fromUrl
    }
  } catch {
    /* no window/location */
  }
  return storageGet(INVITE_STORAGE_KEY)
}

// cyrb53 — identical to src/api.ts and mythos_api.limits._cyrb53 (same input → same player id).
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return n.toString(16).padStart(14, '0')
}

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

/** Stable player id for this browser (invite-derived when a key is present). */
export function getPlayerId(): string {
  if (cachedPlayerId) return cachedPlayerId
  const key = getInviteKey()
  let id: string | null = key ? `player_${cyrb53(key)}` : null
  if (!id) {
    const stored = storageGet(PLAYER_ID_KEY)
    if (stored && PLAYER_ID_RE.test(stored)) id = stored
  }
  if (!id) id = newUuid()
  storageSet(PLAYER_ID_KEY, id)
  cachedPlayerId = id
  return id
}

// ---------------------------------------------------------------- transport

interface RequestOptions {
  body?: string
  timeoutMs: number
  signal?: AbortSignal
  keepalive?: boolean
}

async function request<T>(method: string, path: string, opts: RequestOptions): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  const relay = (): void => ctrl.abort()
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort()
    else opts.signal.addEventListener('abort', relay, { once: true })
  }
  try {
    const headers: Record<string, string> = { 'X-Player-Id': getPlayerId() }
    const invite = getInviteKey()
    if (invite) headers['X-Invite-Key'] = invite
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${API_V2}${path}`, {
      method,
      headers,
      body: opts.body,
      signal: ctrl.signal,
      keepalive: opts.keepalive === true,
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', relay)
  }
}

export interface V2Health {
  status: string
  store: 'postgres' | 'memory' | 'unavailable' | string
  gm: string
}

/** Server reachability + which store/GM backend is live. */
export async function checkHealth(): Promise<V2Health | null> {
  const res = await request<unknown>('GET', '/health', { timeoutMs: TIMEOUT_MS.save })
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
    const res = await request<{ ok?: boolean }>('POST', '/history', {
      body: JSON.stringify(record),
      timeoutMs: TIMEOUT_MS.save,
    })
    if (res?.ok !== true) failed.push(record)
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

export type NarrateKind = 'event' | 'ix_loop_start' | 'chronicle' | 'boss' | 'bond' | 'act_intro'

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
