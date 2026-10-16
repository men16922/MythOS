// Mythos 2.0 — when a talking enemy speaks (EnemyTaunt.tsx): pure, so the trigger rules are testable without a DOM.
import type { CombatState, UnitState } from '../../engine/types.ts'
import { TAUNTS, type TauntMoment } from '../../content/taunts.ts'

/** The connector's HP share at or below which a talking enemy gloats ("winning"). */
export const LOW_HP = 0.3

/** Which talking enemy says what now; `said` holds what this fight already used (`<uid>:hurt`, `winning`). */
export function detectTaunt(c: CombatState, said: ReadonlySet<string>): { unit: UnitState; moment: TauntMoment } | null {
  const talkers = c.units.filter((u) => u.side === 'enemy' && u.hp > 0 && TAUNTS[u.defId])
  if (talkers.length === 0) return null
  for (const u of talkers) {
    if (u.hp <= u.maxHp / 2 && !said.has(`${u.uid}:hurt`)) return { unit: u, moment: 'hurt' }
  }
  const me = c.units.find((u) => u.uid === 'connector')
  if (me && me.hp > 0 && me.hp <= me.maxHp * LOW_HP && !said.has('winning')) {
    const lead = [...talkers].sort((a, b) => b.maxHp - a.maxHp)[0]
    if (lead) return { unit: lead, moment: 'winning' }
  }
  return null
}

