// Chronicle chapter meters (W4 step 3, prototype: only chronicle runs have them). 1.0's stability / tension, kept to
// two small numbers that each change one thing, so they read at a glance:
//  - pressure 0–10: +1 for every map node, −3 at a safehouse. At PRESSURE_RAGE or more the pursuers are close: every
//    enemy starts a fight with 1 Rage.
//  - integrity 0–10 (starts at INTEGRITY_START): −1 for every failed check (events, district talk), +1 for every
//    quest stage reached. At 0 the chapter's remaining districts close and play as plain events.
import type { RunState } from './types.ts'

export const INTEGRITY_START = 6
export const PRESSURE_RAGE = 6
const MAX = 10

const clamp = (n: number): number => Math.max(0, Math.min(MAX, n))

export function newChapterMeters(): NonNullable<RunState['chapter']> {
  return { integrity: INTEGRITY_START, pressure: 0 }
}

/** A map node was entered (a safehouse lets the pressure off instead). Mutates. */
export function chapterNode(run: RunState, kind: string): void {
  if (!run.chapter) return
  run.chapter.pressure = clamp(run.chapter.pressure + (kind === 'rest' ? -3 : 1))
}

/** A check resolved (event or district talk). Mutates. */
export function chapterCheck(run: RunState, success: boolean): void {
  if (run.chapter && !success) run.chapter.integrity = clamp(run.chapter.integrity - 1)
}

/** A quest reached a new stage. Mutates. */
export function chapterQuest(run: RunState): void {
  if (run.chapter) run.chapter.integrity = clamp(run.chapter.integrity + 1)
}

export const pursuersClose = (run: Pick<RunState, 'chapter'>): boolean => (run.chapter?.pressure ?? 0) >= PRESSURE_RAGE
export const districtsClosed = (run: Pick<RunState, 'chapter'>): boolean => !!run.chapter && run.chapter.integrity <= 0
