// Mythos 2.0 — the AI lines shown this session, so any of them can be reported from Settings (Google Play AI-generated
// content policy: in-app flagging). IX comms and the boss card are click-through and gone in seconds, so the list in
// Settings is the one place every AI line can be flagged; chat and the GM cards also carry an inline flag.
// Memory only: nothing here is stored or sent until the player presses "report".
import type { AiLineReport } from '../../net/api.ts'

export interface AiLine extends AiLineReport {
  id: number
  at: number
}

/** Newest lines kept for the Settings list. */
export const AI_LINE_CAP = 20

let lines: AiLine[] = []
let nextId = 1
/** Texts already reported this session (so the inline flag and the Settings list agree). */
const reported = new Set<string>()
const listeners = new Set<() => void>()

/** Remember a line the model wrote (the same text again only moves it to the top). */
export function noteAiLine(line: AiLineReport, now: number = Date.now()): void {
  const text = line.text.trim()
  if (!text) return
  lines = [{ ...line, text, id: nextId++, at: now }, ...lines.filter((l) => l.text !== text)].slice(0, AI_LINE_CAP)
  for (const l of [...listeners]) l()
}

/** Newest first (a stable array between changes, for useSyncExternalStore). */
export function recentAiLines(): readonly AiLine[] {
  return lines
}

export function subscribeAiLines(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function markAiLineReported(text: string): void {
  reported.add(text.trim())
}

export function aiLineReported(text: string): boolean {
  return reported.has(text.trim())
}

/** Tests only. */
export function resetAiLines(): void {
  lines = []
  nextId = 1
  reported.clear()
}
