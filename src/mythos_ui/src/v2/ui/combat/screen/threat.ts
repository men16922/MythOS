// Enemy intents as the combat screen shows them, and the hp each squad member stands to lose to them.

import { useMemo } from 'react'
import { intentInfo } from '../../../engine/combat.ts'
import type { CombatPreview } from '../../../engine/combat.ts'
import { gridDelta, relayProxy } from '../../../engine/effects.ts'
import { samePos } from '../../../engine/grid.ts'
import type { CombatState, ContentRegistry, Pos, UnitState } from '../../../engine/types.ts'
import type { ViewState } from '../animator.ts'
import type { IntentView } from '../Board.tsx'

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
    const rows = new Map(preview.units.map((r) => [r.uid, r]))
    const predicted: CombatState = {
      ...vc,
      units: vc.units.map((u) => {
        const r = rows.get(u.uid)
        return r ? { ...u, pos: r.to ? { ...r.to } : u.pos, hp: r.hpAfter } : u
      }),
    }
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

/** Expected hp loss per squad member this enemy phase (party hp-bar threat segment + end-turn warning).
 *  Walks the hits in firing order so Mark counts (+N on the next hit, and Lock On re-marks after each hit),
 *  then takes armor and current block off — the raw tile sum under-read a marked Ghost by half. */
export function partyDanger(units: UnitState[], shownIntents: IntentView[], proto?: CombatState): Record<string, number> {
  const out: Record<string, number> = {}
  // DLC 2 prototype: whoever stands on the relay takes what was aimed at the neutral, so the danger moves with it.
  const neutral = units.find((x) => x.side === 'neutral' && x.hp > 0)
  const proxy = proto && neutral ? relayProxy(proto, neutral) : undefined
  for (const u of units) {
    if (u.side === 'enemy' || u.hp <= 0 || (proxy && u === neutral)) continue
    let mark = u.statuses.mark ?? 0
    let total = 0
    const delta = proto ? gridDelta(proto, u.pos) : 0
    for (const iv of shownIntents) {
      if (iv.info.windupLeft > 0 || (iv.unit.statuses.shock ?? 0) > 0 || iv.info.damage <= 0) continue
      const covered = (p: Pos): boolean => samePos(p, u.pos) || (u === proxy && !!neutral && samePos(p, neutral.pos))
      if (!iv.info.tiles.some((p) => covered(p) && !samePos(p, iv.unit.pos))) continue
      total += Math.max(0, iv.info.damage + delta + mark - u.armor)
      mark = 0
      for (const e of iv.info.move.effects ?? []) if (e.kind === 'status' && e.status === 'mark' && !e.to) mark += e.amount
    }
    const lost = total - u.block
    if (lost > 0) out[u.uid] = lost
  }
  return out
}
