// Mythos 2.0 — daily-seed leaderboard client (`GET/PUT /api/v2/daily/{date}`; contract: online/CONTRACT.md).
//
// Same rules as net/api.ts: nothing throws, nothing blocks the game. A finished daily run is submitted once
// (`submitDaily`); when the server cannot take it right now (offline, 5xx, rate limit, signed out on an
// `auth: 'google'` server) it waits in a small localStorage queue and `flushDailyQueue` retries it later (boot,
// back online, sign-in, opening the board). The server keeps the best result per (date, archetype, player), so a
// retried or worse submit is harmless. The queue logic is pure (`queueAdd` / `queuePrune`) and unit-tested.

import { isBetterDaily, isDateKey, shiftDateKey } from '../engine/daily.ts'
import type { DailyResult } from '../engine/types.ts'
import { apiSend } from './api.ts'

const QUEUE_KEY = 'mythos2.pendingDaily'
const TIMEOUT_MS = 6000
/** The server's limits (contract: name 1..16 chars, limit 1..50). */
export const NAME_MAX = 16
export const BOARD_LIMIT = 20

const ARCH_RE = /^[a-z_]{1,32}$/

export interface DailyEntry {
  rank: number
  name: string
  result: DailyResult
  /** This player's own row. */
  me: boolean
}

export interface DailyBoardData {
  date: string
  archetype: string
  total: number
  entries: DailyEntry[]
  me: { rank: number; name: string; result: DailyResult } | null
}

export type SubmitOutcome =
  | { kind: 'ranked'; rank: number; total: number; best: DailyResult; improved: boolean }
  /** Not delivered yet (offline / server trouble): queued and retried later. */
  | { kind: 'queued' }
  /** The server wants a signed-in player: queued until a sign-in. */
  | { kind: 'signed-out' }
  /** Refused for good (e.g. the date is no longer open): dropped. */
  | { kind: 'rejected' }

export interface PendingSubmit {
  date: string
  name: string
  result: DailyResult
}

// ---------------------------------------------------------------- validation (server replies are untrusted)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null)

export function parseDailyResult(raw: unknown): DailyResult | null {
  if (!isRecord(raw) || typeof raw.archetype !== 'string' || !ARCH_RE.test(raw.archetype) || typeof raw.won !== 'boolean') return null
  const act = int(raw.act, 1, 3)
  const floors = int(raw.floors, 0, 80)
  const echoes = int(raw.echoes, 0, 999)
  const kills = int(raw.kills, 0, 999)
  if (act === null || floors === null || echoes === null || kills === null) return null
  const res: DailyResult = { archetype: raw.archetype, won: raw.won, act, floors, echoes, kills }
  const secs = int(raw.secs, 1, 86_400)
  if (secs !== null) res.secs = secs
  return res
}

/** The result in the server's accepted ranges (an old save could hold e.g. 1000+ echoes; `secs` is dropped when out of range). */
export function clampDailyResult(r: DailyResult): DailyResult {
  const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)))
  const res: DailyResult = {
    archetype: r.archetype,
    won: r.won === true,
    act: clamp(r.act, 1, 3),
    floors: clamp(r.floors, 0, 80),
    echoes: clamp(r.echoes, 0, 999),
    kills: clamp(r.kills, 0, 999),
  }
  // Out of the server's 1..86400 range (e.g. a run under half a second rounds to 0): omit it (= slowest), never fake it.
  if (typeof r.secs === 'number' && Number.isFinite(r.secs) && r.secs >= 1 && r.secs <= 86_400) res.secs = Math.round(r.secs)
  return res
}

/** Trim, drop control characters, collapse spaces, cap at 16 characters (the server does the same). */
export function cleanName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const controls = /[\u0000-\u001f\u007f]/g
  const flat = name.replace(controls, ' ').replace(/\s+/g, ' ').trim()
  return Array.from(flat).slice(0, NAME_MAX).join('').trim()
}

export function parseBoard(raw: unknown): DailyBoardData | null {
  if (!isRecord(raw) || !isDateKey(raw.date) || typeof raw.archetype !== 'string' || !Array.isArray(raw.entries)) return null
  const entries: DailyEntry[] = []
  for (const e of raw.entries) {
    if (!isRecord(e)) continue
    const result = parseDailyResult(e.result)
    const rank = int(e.rank, 1, 1_000_000)
    if (!result || rank === null) continue
    entries.push({ rank, name: typeof e.name === 'string' ? e.name : '', result, me: e.me === true })
  }
  let me: DailyBoardData['me'] = null
  if (isRecord(raw.me)) {
    const result = parseDailyResult(raw.me.result)
    const rank = int(raw.me.rank, 1, 1_000_000)
    if (result && rank !== null) me = { rank, name: typeof raw.me.name === 'string' ? raw.me.name : '', result }
  }
  const total = int(raw.total, 0, 100_000_000) ?? entries.length
  return { date: raw.date, archetype: raw.archetype, total: Math.max(total, entries.length), entries, me }
}

// ---------------------------------------------------------------- the retry queue (pure)

const sameSlot = (a: PendingSubmit, b: PendingSubmit): boolean => a.date === b.date && a.result.archetype === b.result.archetype

/** Add a submit: one entry per (date, archetype) holding the better result and the latest name. */
export function queueAdd(queue: readonly PendingSubmit[], item: PendingSubmit): PendingSubmit[] {
  const prev = queue.find((q) => sameSlot(q, item))
  const rest = queue.filter((q) => !sameSlot(q, item))
  const result = prev && !isBetterDaily(item.result, prev.result) ? prev.result : item.result
  return [...rest, { date: item.date, name: item.name, result }]
}

/** Drop entries the server would refuse: dates outside [today − 1, today] (KST) or malformed. */
export function queuePrune(queue: readonly PendingSubmit[], today: string): PendingSubmit[] {
  const oldest = shiftDateKey(today, -1)
  return queue.filter((q) => isDateKey(q.date) && q.date >= oldest && q.date <= today && parseDailyResult(q.result) !== null)
}

/** Remove the entry for this submit's (date, archetype) — but only if it is not better than what was sent. */
export function queueRemove(queue: readonly PendingSubmit[], sent: PendingSubmit): PendingSubmit[] {
  return queue.filter((q) => !(sameSlot(q, sent) && !isBetterDaily(q.result, sent.result)))
}

interface QueueStorage {
  get(): string | null
  set(value: string | null): void
}

const localQueue: QueueStorage = {
  get() {
    try {
      return window.localStorage.getItem(QUEUE_KEY)
    } catch {
      return null
    }
  },
  set(value) {
    try {
      if (value === null) window.localStorage.removeItem(QUEUE_KEY)
      else window.localStorage.setItem(QUEUE_KEY, value)
    } catch {
      /* storage unavailable: the submit is simply not retried */
    }
  },
}

let storage: QueueStorage = localQueue

/** Tests: swap the queue's storage. */
export function setQueueStorage(next: QueueStorage | null): void {
  storage = next ?? localQueue
}

export function readQueue(): PendingSubmit[] {
  try {
    const parsed: unknown = JSON.parse(storage.get() ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((q): q is PendingSubmit => isRecord(q) && typeof q.date === 'string' && typeof q.name === 'string' && parseDailyResult(q.result) !== null)
  } catch {
    return []
  }
}

function writeQueue(queue: readonly PendingSubmit[]): void {
  storage.set(queue.length ? JSON.stringify(queue.slice(-12)) : null)
}

// ---------------------------------------------------------------- network

function parseSubmitReply(body: unknown): SubmitOutcome | null {
  if (!isRecord(body)) return null
  const rank = int(body.rank, 1, 100_000_000)
  const total = int(body.total, 1, 100_000_000)
  const best = parseDailyResult(body.best)
  if (rank === null || total === null || !best) return null
  return { kind: 'ranked', rank, total: Math.max(total, rank), best, improved: body.improved === true }
}

async function put(item: PendingSubmit): Promise<SubmitOutcome> {
  const res = await apiSend('PUT', `/daily/${item.date}`, {
    body: JSON.stringify({ name: cleanName(item.name), result: clampDailyResult(item.result) }),
    timeoutMs: TIMEOUT_MS,
  })
  if (res.kind === 'skipped') return { kind: 'signed-out' }
  if (res.kind === 'network') return { kind: 'queued' }
  if (res.status === 401) return { kind: 'signed-out' }
  if (res.status >= 200 && res.status < 300) return parseSubmitReply(res.body) ?? { kind: 'queued' }
  if (res.status === 408 || res.status === 429 || res.status >= 500) return { kind: 'queued' }
  return { kind: 'rejected' } // 400 / 404 / 422: this submit will never be accepted
}

let flushing: Promise<void> | null = null

/** Retry everything queued (oldest first). Safe to call often; concurrent calls share one pass. */
export function flushDailyQueue(today: string): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    const queue = queuePrune(readQueue(), today)
    writeQueue(queue)
    for (const item of queue) {
      const out = await put(item)
      if (out.kind === 'queued' || out.kind === 'signed-out') {
        if (out.kind === 'queued') break // offline: the rest would fail the same way
        continue
      }
      writeQueue(queueRemove(readQueue(), item))
    }
  })().finally(() => {
    flushing = null
  })
  return flushing
}

/**
 * Submit a finished daily run's result. Queued first (so a closed tab or a crash cannot lose it), then sent; the
 * reply's rank comes back, or how it is waiting.
 */
export async function submitDaily(item: PendingSubmit, today: string): Promise<SubmitOutcome> {
  if (!isDateKey(item.date) || parseDailyResult(clampDailyResult(item.result)) === null) return { kind: 'rejected' }
  const entry: PendingSubmit = { date: item.date, name: item.name, result: clampDailyResult(item.result) }
  writeQueue(queuePrune(queueAdd(readQueue(), entry), today))
  if (flushing) await flushing
  const out = await put(entry)
  if (out.kind === 'ranked' || out.kind === 'rejected') writeQueue(queueRemove(readQueue(), entry))
  return out
}

/** One archetype's board for a date ('offline' when the server cannot be reached / answers badly). */
export async function fetchDailyBoard(date: string, archetype: string, limit = BOARD_LIMIT): Promise<DailyBoardData | 'offline'> {
  const n = Math.max(1, Math.min(50, Math.floor(limit)))
  const res = await apiSend('GET', `/daily/${date}?archetype=${encodeURIComponent(archetype)}&limit=${n}`, { timeoutMs: TIMEOUT_MS, access: 'public' })
  if (res.kind !== 'http' || res.status !== 200) return 'offline'
  return parseBoard(res.body) ?? 'offline'
}
