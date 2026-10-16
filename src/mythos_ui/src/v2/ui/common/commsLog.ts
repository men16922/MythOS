// Mythos 2.0 — the run's comms log: every voice line the player actually saw this run (GM narration, IX comms, boss
// narration, the companion chat on both sides, improvised actions), in order, so a line that flashed past can be
// read again from the HUD or the pause menu. Lines a model wrote are marked (`ai`) and can be reported from the log.
//
// UI-only flavour: never part of RunState (the engine stays pure) and never sent anywhere. Kept per run in
// localStorage so it survives a reload / Continue; a different run id starts a fresh log.
import type { AiLineReport } from '../../net/api.ts'

export type CommsSpeaker = 'gm' | 'ix' | 'boss' | 'enemy' | 'companion' | 'player'

export interface CommsEntry {
  id: number
  at: number
  speaker: CommsSpeaker
  text: string
  /** A model wrote it (offer the report flag). */
  ai: boolean
  /** Companion id for companion lines (and the player's chat lines, to say who they spoke to). */
  companion?: string
  /** Act the line was said in. */
  act?: number
  /** Short place label (event title, boss name). */
  where?: string
  /** For AI lines: what the report should say about where it came from. */
  report?: Omit<AiLineReport, 'text' | 'lang'>
}

export type CommsInput = Omit<CommsEntry, 'id' | 'at'>

/** Oldest lines drop off past this. */
export const COMMS_CAP = 200
export const COMMS_KEY = 'mythos2.comms'

let runId: string | null = null
let entries: CommsEntry[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of [...listeners]) l()
}

function persist(): void {
  if (!runId) return
  try {
    window.localStorage.setItem(COMMS_KEY, JSON.stringify({ runId, entries }))
  } catch {
    /* private mode / quota: the log just lives in memory */
  }
}

function load(id: string): CommsEntry[] {
  try {
    const raw = window.localStorage.getItem(COMMS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { runId?: unknown; entries?: unknown }
    if (data.runId !== id || !Array.isArray(data.entries)) return []
    return (data.entries as CommsEntry[]).filter((e) => e && typeof e.text === 'string' && typeof e.speaker === 'string').slice(-COMMS_CAP)
  } catch {
    return []
  }
}

/** Point the log at the live run (null = no run). The same id keeps the log; a new one loads or starts its own. */
export function setCommsRun(id: string | null): void {
  if (id === runId) return
  runId = id
  entries = id ? load(id) : []
  nextId = entries.reduce((m, e) => Math.max(m, e.id), 0) + 1
  emit()
}

/** Add a line the player saw. Ignored without a run, for empty text, or when it repeats the last line verbatim.
 *  Returns the entry id (for a later swap), or null. */
export function logComms(input: CommsInput, now: number = Date.now()): number | null {
  const text = input.text.trim()
  if (!runId || !text) return null
  const last = entries[entries.length - 1]
  if (last && last.speaker === input.speaker && last.text === text) return last.id
  const entry: CommsEntry = { ...input, text, id: nextId++, at: now }
  entries = [...entries, entry].slice(-COMMS_CAP)
  persist()
  emit()
  return entry.id
}

/** Replace a shown line in place (the authored line the AI line swapped out). */
export function swapComms(id: number | null, patch: Pick<CommsEntry, 'text' | 'ai'> & { report?: CommsEntry['report'] }): void {
  if (id === null) return
  const text = patch.text.trim()
  if (!text) return
  let hit = false
  entries = entries.map((e) => (e.id === id ? ((hit = true), { ...e, ...patch, text }) : e))
  if (!hit) return
  persist()
  emit()
}

/** The player's typed Improvise actions (newest three) as "place: action → outcome" records for the chronicle. */
export function improvisedRecords(list: readonly CommsEntry[], max = 3): string[] {
  const out: string[] = []
  list.forEach((e, i) => {
    if (e.speaker !== 'player' || e.companion) return
    const next = list[i + 1]
    const outcome = next && next.report?.route === 'improvise' ? next.text.split('\n')[0]?.slice(0, 90) : ''
    out.push(`${e.where ? `${e.where}: ` : ''}${e.text}${outcome ? ` → ${outcome}` : ''}`)
  })
  return out.slice(-max)
}

/** Oldest first (a stable array between changes, for useSyncExternalStore). */
export function commsEntries(): readonly CommsEntry[] {
  return entries
}

export function subscribeComms(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Tests only. */
export function resetComms(): void {
  runId = null
  entries = []
  nextId = 1
  try {
    window.localStorage.removeItem(COMMS_KEY)
  } catch {
    /* no storage */
  }
}
