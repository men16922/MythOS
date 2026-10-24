// Mythos 2.0 — in-memory telemetry of this session's AI GM calls, for the opt-in Architect HUD (`?hud=1`). Each call
// records how it ended and how long it took: `llm` (a model line), `fallback` (the server's authored line), `local`
// (no answer in time / unreachable: the client's own line), `off` (AI lines switched off). Memory only, never sent.

export type CallOutcome = 'llm' | 'fallback' | 'local' | 'off'

export interface AiCall {
  id: number
  at: number
  route: 'narrate' | 'improvise' | 'talk'
  kind: string
  outcome: CallOutcome
  ms: number
}

export const CALL_CAP = 40

let calls: AiCall[] = []
let nextId = 1
const listeners = new Set<() => void>()

export function recordAiCall(call: Omit<AiCall, 'id' | 'at'>, now: number = Date.now()): void {
  calls = [{ ...call, ms: Math.max(0, Math.round(call.ms)), id: nextId++, at: now }, ...calls].slice(0, CALL_CAP)
  for (const l of [...listeners]) l()
}

/** Newest first (a stable array between changes, for useSyncExternalStore). */
export function aiCalls(): readonly AiCall[] {
  return calls
}

export function subscribeAiCalls(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export interface AiCallSummary {
  total: number
  llm: number
  /** Median latency of the model lines (ms), or null before the first one. */
  medianLlmMs: number | null
}

export function summarize(list: readonly AiCall[]): AiCallSummary {
  const llm = list.filter((c) => c.outcome === 'llm').map((c) => c.ms).sort((a, b) => a - b)
  const mid = llm.length >> 1
  const median = llm.length === 0 ? null : llm.length % 2 ? llm[mid]! : Math.round((llm[mid - 1]! + llm[mid]!) / 2)
  return { total: list.length, llm: llm.length, medianLlmMs: median }
}

/** True when the page link asks for the HUD (`?hud=1`). */
export function hudRequested(search: string): boolean {
  return new URLSearchParams(search).get('hud') === '1'
}

/** Tests only. */
export function resetAiCalls(): void {
  calls = []
  nextId = 1
}
