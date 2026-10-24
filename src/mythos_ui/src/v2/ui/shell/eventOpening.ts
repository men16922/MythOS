// Mythos 2.0 — the GM's opening line for an event, started as early as possible (plan N1, prefetch): the map asks for
// it the moment a node is clicked (the enter animation would otherwise be dead time), and the event screen picks up
// that same request instead of starting its own. Cost-neutral: one call per event either way, never a speculative one.
import type { ContentRegistry, EventDef, Lang, RunState } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import { narrateLine, type GmLine } from './gm.ts'

const inflight = new Map<string, Promise<GmLine | null>>()

const keyOf = (run: RunState, eventId: string): string => `${run.id}:${run.act}:${eventId}:${run.seenEvents.length}`

function request(run: RunState, ev: EventDef, C: ContentRegistry, lang: Lang, seenBefore: number): Promise<GmLine | null> {
  return narrateLine('event', lang, {
    eventId: ev.id,
    title: tr(ev.title, lang),
    text: tr(ev.text, lang),
    act: run.act,
    loop: run.loop,
    party: run.party.map((m) => tr(C.companions[m.id]?.name, lang)),
    trace: run.trace,
    hints: ev.gmHints ?? [],
    // Lived through in earlier loops: the GM may open on déjà vu (the server phrases the count).
    seenBefore,
  })
}

/** Start the opening line for the event `run` is now on (call with the run right after enterNode). */
export function prefetchOpening(run: RunState, C: ContentRegistry, lang: Lang, eventsSeen?: Readonly<Record<string, number>>): void {
  if (run.screen.kind !== 'event') return
  const ev = C.events[run.screen.eventId]
  if (!ev) return
  const key = keyOf(run, ev.id)
  if (inflight.has(key)) return
  inflight.set(key, request(run, ev, C, lang, eventsSeen?.[ev.id] ?? 0))
  if (inflight.size > 8) inflight.delete(inflight.keys().next().value as string)
}

/** The opening line: the prefetched request when there is one (taken once), else a fresh one. */
export function openingLine(run: RunState, ev: EventDef, C: ContentRegistry, lang: Lang, eventsSeen?: Readonly<Record<string, number>>): Promise<GmLine | null> {
  const key = keyOf(run, ev.id)
  const early = inflight.get(key)
  inflight.delete(key)
  return early ?? request(run, ev, C, lang, eventsSeen?.[ev.id] ?? 0)
}
