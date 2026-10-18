// Replay recording for daily-seed runs: which call produced each state the player actually committed.
//
// `rx` (shell/rx.ts) and the recorded combat actions (combat/recordedActions.ts) tag every state they return with
// the step that made it (a WeakMap, so previews that are never committed cost nothing). The store's `setRun` then
// calls `noteCommit(prev, next)`: a tagged daily state appends its step to the run's log; an untagged change of
// the same run (a dev-hook edit, a bot shortcut) marks the log as broken, so that run is simply unverifiable.
// The log lives in localStorage (one daily run at a time), so a reload mid-run keeps recording.

import type { CombatState, ContentRegistry, RunState } from '../../engine/types.ts'

/** Stands in for the content registry inside recorded arguments (the replayer passes its own). */
export const CONTENT_ARG = '$C'

export type ReplayStep = { k: 'run'; f: string; a: unknown[] } | { k: 'combat'; f: string; a: unknown[] }

export interface ReplayLog {
  v: 1
  runId: string
  daily: string
  /** The options `newRun` got (archetype, paradox, daily…). */
  start: Record<string, unknown>
  steps: ReplayStep[]
  /** An untagged change happened: the log no longer reproduces the run. */
  broken?: boolean
}

const producedBy = new WeakMap<object, ReplayStep>()
const STORAGE_KEY = 'mythos2.replay'

function isContent(x: unknown): x is ContentRegistry {
  return !!x && typeof x === 'object' && 'cards' in x && 'enemies' in x && 'encounters' in x
}

/** Arguments as plain JSON, the content registry replaced by a token. */
function freeze(args: readonly unknown[]): unknown[] {
  return args.map((a) => (isContent(a) ? CONTENT_ARG : a === undefined ? null : (JSON.parse(JSON.stringify(a)) as unknown)))
}

export function markRun(out: RunState, f: string, args: readonly unknown[]): void {
  producedBy.set(out, { k: 'run', f, a: freeze(args) })
}

export function markCombat(out: CombatState, f: string, args: readonly unknown[]): void {
  producedBy.set(out, { k: 'combat', f, a: freeze(args) })
}

/** The step that produced `state`, if a recorded call did. */
export function stepOf(state: object): ReplayStep | undefined {
  return producedBy.get(state)
}

/** Tag a run state with a step made elsewhere (a combat action committed through `updateCombat`). */
export function tag(out: RunState, step: ReplayStep): void {
  producedBy.set(out, step)
}

interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The browser's localStorage, or null (Node: tests, the server-side verifier). */
function storage(): KeyValue | null {
  try {
    const g = globalThis as { window?: unknown; localStorage?: KeyValue }
    return g.window ? (g.localStorage ?? null) : null
  } catch {
    return null
  }
}

let current: ReplayLog | null = null
let loaded = false

function load(): ReplayLog | null {
  if (!loaded) {
    loaded = true
    try {
      const raw = storage()?.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as ReplayLog) : null
      current = parsed && parsed.v === 1 && Array.isArray(parsed.steps) ? parsed : null
    } catch {
      current = null
    }
  }
  return current
}

function save(): void {
  try {
    const s = storage()
    if (!s) return
    if (current) s.setItem(STORAGE_KEY, JSON.stringify(current))
    else s.removeItem(STORAGE_KEY)
  } catch {
    /* storage full or blocked: the run just goes unverified */
  }
}

/** Record a committed state change. Only daily runs are recorded. */
export function noteCommit(prev: RunState | null, next: RunState | null): void {
  if (!next || next === prev || typeof next.daily !== 'string') return
  const log = load()
  const step = stepOf(next)
  if (step?.k === 'run' && step.f === 'newRun') {
    const opts = (step.a[0] ?? {}) as Record<string, unknown>
    current = { v: 1, runId: next.id, daily: next.daily, start: opts, steps: [] }
    save()
    return
  }
  if (!log || log.runId !== next.id) return // a run this device did not start here: nothing to verify
  if (!step) {
    // Same run, changed without a recorded call. A reload (prev null / another run) re-adopts the saved state.
    if (prev && prev.id === next.id && !log.broken) {
      log.broken = true
      save()
    }
    return
  }
  log.steps.push(step)
  save()
}

/** The finished log for `runId` (null when this device did not record all of it). */
export function replayLogFor(runId: string): ReplayLog | null {
  const log = load()
  return log && log.runId === runId && !log.broken ? log : null
}

/** Test seam: forget the in-memory copy (the next call re-reads storage). */
export function resetRecorder(): void {
  current = null
  loaded = false
}
