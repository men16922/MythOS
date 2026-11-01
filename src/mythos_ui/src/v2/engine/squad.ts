// Mythos 2.0 — squad tactics (DLC 3): three deployed companions name a formation, and that name is a small bonus for every
// fight. No menu: changing the line-up on the party screen changes the name. A tactic is a set of stat perks, so the engine
// reads it where it already reads perks, and the HUD can show it in one line.

import type { ContentRegistry, SquadTacticDef } from './types.ts'

/** The tactic three deployed companions make: an exact trio first, then the mix of their roles. Fewer than three: none. */
export function squadTacticFor(ids: readonly string[], C: Pick<ContentRegistry, 'squadTactics' | 'squadRoles'>): SquadTacticDef | undefined {
  if (ids.length !== 3 || !C.squadTactics || !C.squadRoles) return undefined
  const tactics = Object.values(C.squadTactics)
  const trio = tactics.find((s) => s.trio?.every((id) => ids.includes(id)))
  if (trio) return trio
  const roles = ids.map((id) => C.squadRoles?.[id])
  if (roles.some((r) => !r)) return undefined
  const key = [...roles].sort().join('+')
  return tactics.find((s) => s.roles && [...s.roles].sort().join('+') === key)
}
