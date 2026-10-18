// Combat input: what a card / consumable / tile click, undo, unit cycling and the keyboard do. The screen keeps
// the state; these handlers read this render's state (they are rebuilt every render, like the inline handlers
// they replace) and act through the screen's commitAction / targeting setters.

import type { RefObject } from 'react'
import { consumableTargets, partyOrigins } from '../../../engine/combat.ts'
import { moveUnit, playCard, undoMove, useConsumable as applyConsumable } from '../recordedActions.ts'
import type { TargetOption } from '../../../engine/combat.ts'
import { samePos } from '../../../engine/grid.ts'
import type { CombatState, ContentRegistry, Pos } from '../../../engine/types.ts'
import { sfx } from '../../common/sfx.ts'
import type { RectLike } from '../animator.ts'
import { isTouch } from '../touch.ts'
import { targetOf } from './targeting.ts'
import type { Targeting } from './targeting.ts'
import { useCombatKeys } from './useCombatKeys.ts'
import type { EndTurnQueue } from './useEndTurnQueue.ts'

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-9px) rotate(-1.5deg)' },
  { transform: 'translateX(8px) rotate(1.2deg)' },
  { transform: 'translateX(-5px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
]

interface CombatInputDeps {
  combat: CombatState
  C: ContentRegistry
  k: boolean
  interactive: boolean
  /** One of this turn's actions is animating (cards can be armed, never played; end turn queues). */
  canQueueEnd: boolean
  /** The enemy phase is playing (Space / Enter / E fast-forward it). */
  canHurry: boolean
  tg: Targeting
  playable: Record<string, { ok: boolean; reason?: string }>
  rootRef: RefObject<HTMLDivElement | null>
  commitAction: (next: CombatState, opts?: { card?: { rect: RectLike; upgraded: boolean } }) => void
  showToast: (text: string) => void
  endTurnQueue: EndTurnQueue
  hurry: () => void
  /** A pile viewer is open (the keyboard is ignored). */
  pileOpen: boolean
  pinned: string | null
  setPinned: (uid: string | null) => void
  setThreatOn: (fn: (v: boolean) => boolean) => void
  setAltHeld: (held: boolean) => void
}

export function useCombatInput(d: CombatInputDeps) {
  const { combat, C, k, interactive, canQueueEnd, canHurry, tg, playable, rootRef, commitAction, showToast, endTurnQueue, pinned, setPinned, setThreatOn, setAltHeld } = d
  const {
    setSel,
    armed,
    setArmed,
    hoverPos,
    setHoverPos,
    setHoverDir,
    living,
    selUnit,
    selUid,
    armedCard,
    armedDef,
    itemIndex,
    itemDef,
    isArmed,
    origin,
    originUnit,
    confirmMode,
    options,
  } = tg
  const doEndTurn = endTurnQueue.endTurn

  const relRect = (el: Element): RectLike | undefined => {
    const root = rootRef.current
    if (!root) return undefined
    const a = root.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return { left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height }
  }

  const playOpt = (opt: TargetOption) => {
    if (!origin || !interactive) return
    try {
      if (armedCard) {
        const el = rootRef.current?.querySelector(`[data-card-uid="${armedCard.uid}"] .m2-card`)
        const rect = el ? relRect(el) : undefined
        const next = playCard(combat, C, armedCard.uid, origin, targetOf(opt))
        commitAction(next, rect ? { card: { rect, upgraded: armedCard.upgraded } } : {})
      } else if (itemDef) {
        commitAction(applyConsumable(combat, C, itemIndex, origin, targetOf(opt)))
      }
    } catch {
      sfx('error')
    }
  }

  const onCard = (uid: string, el: HTMLElement) => {
    // While the previous card is still animating a card can be armed (never played), so quick
    // players don't lose the click.
    if (!interactive && !canQueueEnd) return
    endTurnQueue.cancel()
    const pl = playable[uid]
    if (!pl?.ok) {
      el.animate(SHAKE, { duration: 320, easing: 'ease-out' })
      sfx('error')
      if (pl?.reason) showToast(pl.reason)
      return
    }
    if (armed?.kind === 'card' && armed.uid === uid) {
      if (!interactive) return
      if (confirmMode && options[0]) playOpt(options[0])
      else {
        setArmed(null)
        sfx('ui_click')
      }
      return
    }
    const inst = combat.hand.find((c) => c.uid === uid)
    const def = inst ? C.cards[inst.defId] : undefined
    if (def && def.owner !== 'any') setSel(def.owner)
    setArmed({ kind: 'card', uid })
    setHoverDir(null)
    if (isTouch()) setHoverPos(null)
    sfx('ui_click')
  }

  const onItem = (index: number) => {
    if (!interactive || !selUid) return
    const id = combat.consumables[index]
    const def = id ? C.consumables[id] : undefined
    if (!def) return
    if (armed?.kind === 'item' && armed.index === index) {
      const m = def.target.mode
      if (m === 'none' || m === 'self') {
        const opts = consumableTargets(combat, C, index, selUid)
        if (opts[0]) playOpt(opts[0])
      } else setArmed(null)
      return
    }
    if (consumableTargets(combat, C, index, selUid).length === 0) {
      sfx('error')
      showToast(k ? '사용할 대상이 없다' : 'No valid target')
      return
    }
    setArmed({ kind: 'item', index })
    if (isTouch()) {
      setHoverPos(null)
      setHoverDir(null)
    }
    sfx('ui_click')
  }

  const onTileClick = (p: Pos) => {
    if (!interactive) {
      // Mid-animation: still let the player pick which unit acts next (no state change).
      const mate = canQueueEnd && !isArmed ? combat.units.find((x) => samePos(x.pos, p) && x.hp > 0 && x.side === 'party') : undefined
      if (mate) {
        setSel(mate.uid)
        setPinned(null)
      }
      return
    }
    if (isArmed) {
      if (confirmMode) {
        // Self/untargeted cards: clicking the origin or anything the card touches plays it; elsewhere cancels.
        const o = options[0]
        if (o && ((originUnit && samePos(originUnit.pos, p)) || o.tiles.some((t) => samePos(t, p)))) return playOpt(o)
        setArmed(null)
        return
      }
      const opt = tg.resolveAt(p)
      if (opt) {
        if (tg.aimFirst(opt, { pos: p })) return
        return playOpt(opt)
      }
      const u = living(combat.units.find((x) => samePos(x.pos, p) && x.hp > 0)?.uid ?? '')
      if (u && u.side === 'party' && ((armedDef?.owner === 'any' && armedCard && partyOrigins(combat, C, armedCard.uid).includes(u.uid)) || itemDef)) {
        setSel(u.uid)
        if (isTouch()) setHoverPos(null)
        sfx('ui_click')
        return
      }
      setArmed(null)
      if (isTouch()) setHoverPos(null)
      return
    }
    const u = combat.units.find((x) => samePos(x.pos, p) && x.hp > 0)
    if (u?.side === 'party') {
      setSel(u.uid)
      setPinned(null)
      if (isTouch()) setHoverPos(null)
      sfx('ui_click')
      return
    }
    if (selUnit && tg.moves.some((m) => samePos(m, p))) {
      try {
        commitAction(moveUnit(combat, C, selUnit.uid, p))
      } catch {
        sfx('error')
      }
      return
    }
    if (u?.side === 'enemy') {
      setPinned(pinned === u.uid ? null : u.uid)
      if (isTouch()) setHoverPos(null)
      return
    }
    setPinned(null)
    // Touch: a tap on terrain pins it in the inspector (tap again to clear) — the hover of a mouse.
    if (isTouch()) setHoverPos(hoverPos && samePos(hoverPos, p) ? null : p)
  }

  const doUndo = () => {
    if (!interactive || !combat.undo) return
    commitAction(undoMove(combat))
  }

  const cycleUnit = () => {
    const party = combat.units.filter((u) => u.side === 'party' && u.hp > 0)
    if (party.length === 0) return
    const i = party.findIndex((u) => u.uid === selUid)
    const next = party[(i + 1) % party.length]
    if (next) {
      setSel(next.uid)
      sfx('ui_click')
    }
  }

  // ------------------------------------------------------------ keyboard
  useCombatKeys((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (d.pileOpen) return
    // The combat screen owns Space / Enter: never let them "click" whatever button happens to have focus
    // (a focused end-turn button would otherwise end the next turn on a fast-forward press).
    if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) e.preventDefault()
    if (canHurry && (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e')) {
      e.preventDefault()
      d.hurry()
      return
    }
    if (canQueueEnd && endTurnQueue.isQueued() && (e.key === ' ' || e.key === 'Enter')) {
      endTurnQueue.queueHurry()
      return
    }
    if (e.key === 'Alt') {
      e.preventDefault()
      setAltHeld(true)
      return
    }
    const digit = /^Digit([1-9])$/.exec(e.code)
    if (digit) {
      const n = Number(digit[1]) - 1
      if (e.shiftKey) {
        if (n < 3) onItem(n)
        return
      }
      const card = combat.hand[n]
      if (card) {
        const el = rootRef.current?.querySelector(`[data-card-uid="${card.uid}"]`)
        if (el instanceof HTMLElement) onCard(card.uid, el)
      }
      return
    }
    switch (e.key.toLowerCase()) {
      case 'e':
        doEndTurn()
        break
      case 'z':
        doUndo()
        break
      case 't':
        setThreatOn((v) => !v)
        break
      case 'tab':
        e.preventDefault()
        cycleUnit()
        break
      case 'escape':
        if (isArmed) setArmed(null)
        else setPinned(null)
        break
      case 'enter':
      case ' ':
        if (isArmed && confirmMode && options[0]) {
          e.preventDefault()
          playOpt(options[0])
        }
        break
    }
  }, setAltHeld)

  return { playOpt, onCard, onItem, onTileClick, doUndo }
}
