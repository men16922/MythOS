// End-turn input around animations. A press while this turn's own action is still animating is queued and fires
// once the board settles (quick players don't lose it); a fast-forward press that lands just as a new player turn
// starts (after an enemy phase) is ignored for a short grace window instead of ending that turn.

import { useEffect, useRef } from 'react'
import { sfx } from '../../common/sfx.ts'

/** Ignore end-turn input this long after a new player turn starts (fast-forward overshoot). */
const TURN_GRACE_MS = 700

export interface EndTurnQueue {
  /** End the turn now, queue it (busy with this turn's action), or drop it (grace window). */
  endTurn: () => void
  /** An end turn is waiting for the board to settle. */
  isQueued: () => boolean
  /** Forget a queued end turn (the player started another action). */
  cancel: () => void
  /** Fast-forward pressed while the end turn is still queued: play that enemy phase fast. */
  queueHurry: () => void
}

export function useEndTurnQueue(p: {
  enemyPhase: boolean
  interactive: boolean
  /** One of this turn's player actions is animating (see CombatScreen). */
  canQueueEnd: boolean
  /** Commit the engine's end turn (throws when the engine refuses). */
  commitEnd: () => void
  hurry: () => void
}): EndTurnQueue {
  const endQueued = useRef(false)
  const hurryQueued = useRef(false)
  /** When the current player turn became playable (after an enemy phase). */
  const turnReadyAt = useRef(0)
  const wasEnemyPhase = useRef(false)
  useEffect(() => {
    if (p.enemyPhase) wasEnemyPhase.current = true
    else if (wasEnemyPhase.current) {
      wasEnemyPhase.current = false
      turnReadyAt.current = performance.now()
    }
  }, [p.enemyPhase])

  const endTurn = () => {
    if (!p.interactive) {
      // Pressed while the last card is still animating: end the turn as soon as the board settles
      // instead of silently dropping the input.
      if (p.canQueueEnd) endQueued.current = true
      return
    }
    // A fast-forward click / key that lands just as the new turn starts must not end that turn.
    if (!endQueued.current && performance.now() - turnReadyAt.current < TURN_GRACE_MS) return
    endQueued.current = false
    try {
      p.commitEnd()
      // Fast-forward pressed while the end turn was still queued: play this enemy phase fast.
      if (hurryQueued.current) p.hurry()
    } catch {
      sfx('error')
    }
    hurryQueued.current = false
  }

  // Latest-handler ref: the queued end fires with this render's state once the board turns interactive.
  const endTurnRef = useRef(endTurn)
  useEffect(() => {
    endTurnRef.current = endTurn
  })
  useEffect(() => {
    if (p.interactive && endQueued.current) endTurnRef.current()
  }, [p.interactive])

  return {
    endTurn,
    isQueued: () => endQueued.current,
    cancel: () => {
      endQueued.current = false
    },
    queueHurry: () => {
      hurryQueued.current = true
    },
  }
}
