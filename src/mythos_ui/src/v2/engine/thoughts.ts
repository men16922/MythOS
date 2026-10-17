// Mythos 2.0 — thought cabinet (plan N3): a stat that was just rolled may offer a thought; the player carries up to
// two, and each settles after THOUGHT_NODES map nodes into a small effect (content/thoughts.ts). Pure and
// deterministic like run.ts: the reducers clone → mutate → return, an illegal action returns the same object.
// run.ts calls `offerThought` after event / dialogue checks and `advanceThoughts` when a node is entered.
import type { RunEffect, RunState, StatKey, ThoughtDef, ThoughtState } from './types.ts'

export const THOUGHT_SLOTS = 2
/** Map nodes a carried thought needs to settle. */
export const THOUGHT_NODES = 3

const clone = <T>(x: T): T => structuredClone(x)

function state(run: RunState): ThoughtState {
  return run.thoughts ?? { offer: null, slots: [], done: [], declined: [], settled: null }
}

/** After a check: offer the first unseen thought of this stat and outcome (none while another is on offer). */
export function offerThought(next: RunState, stat: StatKey, success: boolean, pool: readonly ThoughtDef[]): void {
  const s = state(next)
  if (s.offer) return
  const used = new Set([...s.done, ...s.declined, ...s.slots.map((x) => x.id)])
  const th = pool.find((x) => x.stat === stat && x.on === (success ? 'success' : 'failure') && !used.has(x.id))
  if (!th) return
  next.thoughts = { ...s, offer: th.id }
}

export function acceptThought(run: RunState): RunState {
  const s = state(run)
  if (!s.offer || s.slots.length >= THOUGHT_SLOTS) return run
  const next = clone(run)
  next.thoughts = { ...s, slots: [...s.slots, { id: s.offer, progress: 0 }], offer: null }
  return next
}

export function declineThought(run: RunState): RunState {
  const s = state(run)
  if (!s.offer) return run
  const next = clone(run)
  next.thoughts = { ...s, declined: [...s.declined, s.offer], offer: null }
  return next
}

/** Let a carried thought go (frees its slot; it will not be offered again this run). */
export function forgetThought(run: RunState, id: string): RunState {
  const s = state(run)
  if (!s.slots.some((x) => x.id === id)) return run
  const next = clone(run)
  next.thoughts = { ...s, slots: s.slots.filter((x) => x.id !== id), declined: [...s.declined, id] }
  return next
}

/** A node was entered: carried thoughts progress; one that reaches THOUGHT_NODES settles and returns its effects. */
export function advanceThoughts(next: RunState, pool: readonly ThoughtDef[]): RunEffect[] {
  if (!next.thoughts) return []
  const s = next.thoughts
  const effects: RunEffect[] = []
  let settled: string | null = null
  const slots: ThoughtState['slots'] = []
  const done = [...s.done]
  for (const slot of s.slots) {
    const progress = slot.progress + 1
    const def = pool.find((x) => x.id === slot.id)
    if (progress >= THOUGHT_NODES && def) {
      effects.push(...def.effects)
      done.push(slot.id)
      settled = slot.id
    } else slots.push({ id: slot.id, progress })
  }
  next.thoughts = { ...s, slots, done, settled }
  return effects
}
