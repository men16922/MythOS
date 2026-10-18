// Mythos 2.0 — the shell's seam onto the run/meta engine. Screens call only these names.
//
// Same table as rxCore.ts, wrapped: every call that returns a new run state tags it with its name and arguments
// (ui/replay/record.ts), so the store can log a daily run's committed actions for replay. Queries and previews
// are tagged too but never logged — only a state handed to `setRun` is.

import type { RunState } from '../../engine/types.ts'
import { markRun } from '../replay/record.ts'
import { rxCore } from './rxCore.ts'

type Core = typeof rxCore

function isRunState(x: unknown): x is RunState {
  return !!x && typeof x === 'object' && 'screen' in x && 'deck' in x && 'map' in x
}

// `updateCombat` carries a whole fight: GameShell tags its result with the combat step that made the fight instead.
const UNRECORDED = new Set<keyof Core>(['updateCombat'])

function wrap(core: Core): Core {
  const out: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(core) as [keyof Core, (...a: unknown[]) => unknown][]) {
    if (UNRECORDED.has(name)) {
      out[name] = fn
      continue
    }
    out[name] = (...args: unknown[]) => {
      const res = fn(...args)
      if (isRunState(res) && res !== args[0]) {
        // newRun(profile, opts, C): the profile never shapes a daily, so only the options are kept.
        markRun(res, name, name === 'newRun' ? [args[1]] : args.slice(1))
      }
      return res
    }
  }
  return out as Core
}

export const rx: Core = wrap(rxCore)
