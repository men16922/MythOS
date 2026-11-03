// The boot screen the first time a run goes below the city (Act 4 of Deep Signal or the Unwritten Sea), adapted from
// 1.0's `ui_copy.boot_lines` / `signal_lines` (branch 1.0, resources/neo-seoul/scenario.json). Machine text: one
// language for both (1.0 showed it in English too). Last line is the signal, shown apart.
import type { RunMode } from '../engine/types.ts'

export const BOOT_LINES: Partial<Record<RunMode, { lines: string[]; signal: string }>> = {
  deep: {
    lines: [
      '[00.000] MYTHOS RUNTIME // DEEP NODE',
      '[00.117] SIGNAL TYPE: UNCLASSIFIED',
      '[00.402] WORLD LAYER: NEO-SEOUL / BELOW THE ARK',
      '[01.014] CONTROL NET TRACE LOST',
      '[01.203] MESSAGE SOURCE: FIRST RECORD',
    ],
    signal: 'DO NOT TRUST THE CLEAN SIGNAL',
  },
  sea: {
    lines: [
      '[00.000] MYTHOS RUNTIME // DEEP NODE',
      '[00.117] SIGNAL TYPE: TIDAL',
      '[00.402] WORLD LAYER: UNWRITTEN SEA / NO MAP',
      '[01.014] ERASED NAMES DETECTED: 7,204,883',
      '[01.203] MESSAGE SOURCE: LIGHTHOUSE',
    ],
    signal: 'WAKE TRACE FOUND  HUMAN NOISE DETECTED',
  },
}
