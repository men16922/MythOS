// Enemy intents as the combat screen shows them, and the hp each squad member stands to lose to them.

import { useMemo } from 'react'
import { intentInfo } from '../../../engine/combat.ts'
import type { CombatPreview } from '../../../engine/combat.ts'
import type { CombatState, ContentRegistry, UnitState } from '../../../engine/types.ts'
import type { ViewState } from '../animator.ts'
import { boardAfter, expectedLoss, relayHit } from '../board/marks.ts'
import type { IntentView } from '../board/marks.ts'

/** Visible intents (an enemy phase reveals them one by one; the dying drop theirs) and, while a card preview
 *  moves or kills units, the same telegraphs re-aimed on the predicted board: pushing an enemy drags its relative
 *  attack along, a kill removes it — the player sees the consequence before committing. */
export function useIntentViews(vc: CombatState, view: ViewState, C: ContentRegistry, preview: CombatPreview | null): { intents: IntentView[]; shownIntents: IntentView[] } {
  const intents: IntentView[] = useMemo(() => {
    const out: IntentView[] = []
    for (const u of vc.units) {
      if (u.side !== 'enemy' || u.hp <= 0 || !u.intent) continue
      if (view.pendingIntents && !view.pendingIntents.includes(u.uid)) continue
      if (view.ufx[u.uid]?.dying) continue
      const info = intentInfo(vc, C, u.uid)
      if (info) out.push({ uid: u.uid, unit: u, info })
    }
    return out
  }, [vc, C, view.pendingIntents, view.ufx])

  const shownIntents: IntentView[] = useMemo(() => {
    if (!preview || !preview.units.some((r) => r.to || r.dies)) return intents
    const predicted = boardAfter(vc, preview)
    const out: IntentView[] = []
    for (const iv of intents) {
      const unit = predicted.units.find((u) => u.uid === iv.uid)
      if (!unit || unit.hp <= 0) continue
      const info = intentInfo(predicted, C, iv.uid)
      if (info) out.push({ uid: iv.uid, unit, info })
    }
    return out
  }, [preview, intents, vc, C])

  return { intents, shownIntents }
}

/** Expected hp loss per squad member (party hp-bar threat segment + end-turn warning). `after` is the board once the
 *  aimed card has landed: the relay's receiver follows it, so whoever stands in takes the citizen's danger. */
export function partyDanger(units: UnitState[], shownIntents: IntentView[], after: CombatState): Record<string, number> {
  const out: Record<string, number> = {}
  const relay = relayHit(shownIntents, after)
  const neutralPos = after.units.find((u) => u.uid === relay?.neutralUid)?.pos
  for (const u of units) {
    if (u.side === 'enemy' || u.hp <= 0 || u.uid === relay?.neutralUid) continue
    const lost = expectedLoss(u, shownIntents, after, u.uid === relay?.proxyUid ? neutralPos : undefined)
    if (lost > 0) out[u.uid] = lost
  }
  return out
}
