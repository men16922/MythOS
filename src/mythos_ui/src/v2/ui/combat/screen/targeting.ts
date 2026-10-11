// Selection & targeting for the combat screen: which unit acts, the armed card / consumable and its origin,
// the tiles it can target, what the pointer (or a touch aim) is resolving to, and the engine's preview of it.
// Also the selected unit's move tiles. Pure state + derivations; the input handlers live in CombatScreen.

import { useCallback, useMemo, useState } from 'react'
import { cardFace, consumableTargets, legalMoves, partyOrigins, previewConsumable, previewPlay, selectableTargets } from '../../../engine/combat.ts'
import type { CombatPreview, TargetOption } from '../../../engine/combat.ts'
import { add, dirToward, inBounds, posKey, samePos } from '../../../engine/grid.ts'
import type { CombatState, ContentRegistry, Dir, PlayTarget, Pos } from '../../../engine/types.ts'
import { sfx } from '../../common/sfx.ts'
import type { DirArrow } from '../Board.tsx'
import { isTouch } from '../touch.ts'

type Armed = { kind: 'card'; uid: string } | { kind: 'item'; index: number }

export function targetOf(o: TargetOption): PlayTarget {
  const t: PlayTarget = {}
  if (o.pos) t.pos = o.pos
  if (o.dir) t.dir = o.dir
  return t
}

/** Identity of a target option across renders (touch aiming compares the first and second tap). */
function optKey(o: TargetOption): string {
  return `${o.dir ?? ''}|${o.pos ? posKey(o.pos) : ''}`
}

function uniq(list: Pos[]): Pos[] {
  const seen = new Set<string>()
  return list.filter((p) => (seen.has(posKey(p)) ? false : (seen.add(posKey(p)), true)))
}

export type Targeting = ReturnType<typeof useTargeting>

export function useTargeting(combat: CombatState, C: ContentRegistry, interactive: boolean) {
  const [sel, setSel] = useState<string>('connector')
  const [armed, setArmed] = useState<Armed | null>(null)
  const [hoverPos, setHoverPos] = useState<Pos | null>(null)
  const [hoverDir, setHoverDir] = useState<Dir | null>(null)
  const [hoverCard, setHoverCard] = useState<string | null>(null)

  const living = (uid: string) => combat.units.find((u) => u.uid === uid && u.hp > 0)
  const selUnit = living(sel) ?? living('connector') ?? combat.units.find((u) => u.side === 'party' && u.hp > 0)
  const selUid = selUnit?.uid ?? null

  const armedCard = armed?.kind === 'card' ? combat.hand.find((c) => c.uid === armed.uid) : undefined
  const armedDef = armedCard ? C.cards[armedCard.defId] : undefined
  const armedFace = armedDef && armedCard ? cardFace(armedDef, armedCard.upgraded) : undefined
  const itemIndex = armed?.kind === 'item' ? armed.index : -1
  const itemId = itemIndex >= 0 ? combat.consumables[itemIndex] : undefined
  const itemDef = itemId ? C.consumables[itemId] : undefined
  const isArmed = !!armedCard || !!itemDef

  const originFor = useCallback(
    (cardUid: string): string | null => {
      const inst = combat.hand.find((c) => c.uid === cardUid)
      const def = inst ? C.cards[inst.defId] : undefined
      if (!def) return null
      if (def.owner === 'any') {
        const origins = partyOrigins(combat, C, cardUid)
        return selUid && origins.includes(selUid) ? selUid : (origins[0] ?? selUid)
      }
      return def.owner
    },
    [combat, C, selUid],
  )

  const origin = armedCard ? originFor(armedCard.uid) : itemDef ? selUid : null
  const originUnit = origin ? living(origin) : undefined
  const tmode = (armedFace?.target ?? itemDef?.target)?.mode
  const confirmMode = tmode === 'none' || tmode === 'self'

  const options: TargetOption[] = useMemo(() => {
    if (!origin) return []
    if (armedCard) return selectableTargets(combat, C, armedCard.uid, origin)
    if (itemDef) return consumableTargets(combat, C, itemIndex, origin)
    return []
  }, [combat, C, armedCard, itemDef, itemIndex, origin])

  const resolveAt = useCallback(
    (p: Pos): TargetOption | undefined => {
      if (confirmMode) return options[0]
      const exact = options.find((o) => samePos(o.pos, p))
      if (exact) return exact
      if (originUnit && (tmode === 'line' || tmode === 'beam' || tmode === 'melee') && (p.x === originUnit.pos.x || p.y === originUnit.pos.y)) {
        const d = dirToward(originUnit.pos, p)
        return options.find((o) => o.dir === d)
      }
      return undefined
    },
    [confirmMode, options, originUnit, tmode],
  )

  const activeOpt = !isArmed ? undefined : confirmMode ? options[0] : hoverDir ? options.find((o) => o.dir === hoverDir) : hoverPos ? resolveAt(hoverPos) : undefined

  const preview: CombatPreview | null = useMemo(() => {
    if (!activeOpt || !origin || !interactive) return null
    try {
      if (armedCard) return previewPlay(combat, C, armedCard.uid, origin, targetOf(activeOpt))
      if (itemDef) return previewConsumable(combat, C, itemIndex, origin, targetOf(activeOpt))
    } catch {
      return null
    }
    return null
  }, [activeOpt, origin, interactive, armedCard, itemDef, itemIndex, combat, C])

  const hoverCardOrigin = hoverCard && !isArmed ? originFor(hoverCard) : null
  const targets: Pos[] = useMemo(() => {
    if (isArmed) {
      if (confirmMode) return []
      return uniq(options.flatMap((o) => (tmode === 'beam' ? o.tiles : o.pos ? [o.pos] : [])))
    }
    if (hoverCard && hoverCardOrigin && interactive) {
      try {
        return uniq(selectableTargets(combat, C, hoverCard, hoverCardOrigin).flatMap((o) => (o.pos ? [o.pos] : o.tiles)))
      } catch {
        return []
      }
    }
    return []
  }, [isArmed, confirmMode, options, tmode, hoverCard, hoverCardOrigin, interactive, combat, C])

  // Touch aiming: the first tap on a card target previews it (sets hoverPos / hoverDir like a mouse hover would),
  // a second tap on the same target plays it. Keyed to the armed object + origin, so re-arming starts over.
  const [aim, setAim] = useState<{ armed: Armed; origin: string | null; key: string } | null>(null)
  const aimKey = aim && armed && aim.armed === armed && aim.origin === origin ? aim.key : null
  const aimAt: { at: Pos; dir: boolean } | null = useMemo(() => {
    if (!aimKey || confirmMode || !interactive) return null
    const o = options.find((x) => optKey(x) === aimKey)
    if (!o) return null
    // Line / beam cards are aimed by direction: the chip sits on that direction's arrow.
    const arrow = o.dir && originUnit && (tmode === 'line' || tmode === 'beam') ? add(originUnit.pos, o.dir) : null
    if (arrow && inBounds(arrow)) return { at: arrow, dir: true }
    return o.pos ? { at: o.pos, dir: false } : null
  }, [aimKey, confirmMode, interactive, options, originUnit, tmode])
  /** Touch: aim at `o` unless it is already aimed. True when this tap only aimed. */
  const aimFirst = (o: TargetOption, at: { pos?: Pos; dir?: Dir }): boolean => {
    if (!isTouch() || !armed || aimKey === optKey(o)) return false
    setAim({ armed, origin, key: optKey(o) })
    setHoverPos(at.pos ?? null)
    setHoverDir(at.dir ?? null)
    sfx('ui_click')
    return true
  }

  const active = activeOpt ? (activeOpt.tiles.length ? activeOpt.tiles : activeOpt.pos ? [activeOpt.pos] : []) : []
  const activeHostile = armedDef ? armedDef.type === 'attack' : !!itemDef?.effects.some((e) => e.kind === 'damage')

  const dirArrows: DirArrow[] = useMemo(() => {
    if (!isArmed || !originUnit || (tmode !== 'line' && tmode !== 'beam')) return []
    const out: DirArrow[] = []
    for (const o of options) {
      if (!o.dir) continue
      const at = add(originUnit.pos, o.dir)
      if (inBounds(at)) out.push({ dir: o.dir, at, active: activeOpt?.dir === o.dir })
    }
    return out
  }, [isArmed, originUnit, tmode, options, activeOpt])

  const moves = useMemo(() => {
    if (!interactive || isArmed || !selUnit || selUnit.moved) return []
    return legalMoves(combat, selUnit.uid)
  }, [interactive, isArmed, selUnit, combat])
  const moveHover = hoverPos && moves.some((m) => samePos(m, hoverPos)) ? hoverPos : null

  return {
    sel,
    setSel,
    armed,
    setArmed,
    hoverPos,
    setHoverPos,
    hoverDir,
    setHoverDir,
    hoverCard,
    setHoverCard,
    living,
    selUnit,
    selUid,
    armedCard,
    armedDef,
    armedFace,
    itemIndex,
    itemDef,
    isArmed,
    originFor,
    origin,
    originUnit,
    tmode,
    confirmMode,
    options,
    resolveAt,
    preview,
    hoverCardOrigin,
    targets,
    aimAt,
    aimFirst,
    active,
    activeHostile,
    dirArrows,
    moves,
    moveHover,
  }
}
