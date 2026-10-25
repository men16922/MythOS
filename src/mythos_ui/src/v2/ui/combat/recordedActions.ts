// The combat actions the screen commits, tagged for daily-run replay (ui/replay/record.ts). Same signatures as
// engine/combat.ts; a call that changes nothing (an illegal action returns the same state) is not tagged.

import { endTurn as endTurnRaw, moveUnit as moveUnitRaw, playCard as playCardRaw, undoMove as undoMoveRaw, fireBurst as fireBurstRaw, useConsumable as useConsumableRaw } from '../../engine/combat.ts'
import type { CombatState } from '../../engine/types.ts'
import { markCombat } from '../replay/record.ts'

function recorded<A extends unknown[]>(name: string, fn: (c: CombatState, ...a: A) => CombatState): (c: CombatState, ...a: A) => CombatState {
  return (c, ...a) => {
    const out = fn(c, ...a)
    if (out !== c) markCombat(out, name, a)
    return out
  }
}

export const playCard = recorded('playCard', playCardRaw)
export const moveUnit = recorded('moveUnit', moveUnitRaw)
export const undoMove = recorded('undoMove', undoMoveRaw)
export const endTurn = recorded('endTurn', endTurnRaw)
export const useConsumable = recorded('useConsumable', useConsumableRaw)
export const fireBurst = recorded('fireBurst', fireBurstRaw)
