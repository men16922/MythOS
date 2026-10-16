// Mythos 2.0 — IX comms: the administrator AI cuts in on notable combat moments (ixMoments.ts) with one cold
// line in a small overlay. Never blocks play: pointer-events none, auto-dismiss, an authored line shows
// immediately and the LLM line is swapped in at most once if it lands within ~4 s.
//
// Mounted by GameShell for the whole run view (not only the combat screen) so the line for a near-flawless win,
// which arrives as the fight hands over to the reward screen, still gets its few seconds. Timing reads one
// class off the combat root (`.m2c-root.is-enemy-phase`, read-only) to stay out of the enemy phase and the
// first second of the player's turn.

import { useEffect, useRef, useState } from 'react'
import type { CombatState, ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { isHardMuted } from '../common/audio.ts'
import { asset } from '../common/assets.ts'
import { logComms, swapComms } from '../common/commsLog.ts'
import { sound } from '../components/sound.ts'
import { ixLine } from './gm.ts'
import { detectMoment, newMemo, turnAllows, type FightMemo, type IxMoment } from './ixMoments.ts'
import { pickIxLine } from './talkLines.ts'
import './voices.css'

const SHOW_MS = 5000
/** After a swap the LLM line stays at least this long (total still bounded by MAX_SHOW_MS). */
const SWAP_MIN_MS = 3200
const MAX_SHOW_MS = 7500
const FADE_MS = 380
const LLM_WAIT_MS = 4000
/** Never speak during the first second of a player turn. */
const TURN_SETTLE_MS = 1000

interface Line {
  key: number
  text: string
  llm: boolean
  leaving: boolean
  /** Shown after the fight ended (the reward screen has its top bar back). */
  after: boolean
}

interface Props {
  /** The live fight (or its final state for a moment after it ends); null outside combat. */
  combat: CombatState | null
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
}

/** Calls `ready` once `minDelay` has passed and the board has been out of the enemy phase for `settle` ms. */
function whenSettled(minDelay: number, settle: number, ready: () => void): () => void {
  const start = performance.now()
  let calmSince: number | null = null
  const id = window.setInterval(() => {
    const now = performance.now()
    if (now - start < minDelay) return
    const busy = document.querySelector('.m2c-root.is-enemy-phase') !== null
    if (busy) calmSince = null
    else if (calmSince === null) calmSince = now
    if ((calmSince !== null && now - calmSince >= settle) || now - start > 15000) {
      window.clearInterval(id)
      ready()
    }
  }, 100)
  return () => window.clearInterval(id)
}

function timingFor(m: IxMoment, ended: boolean): { minDelay: number; settle: number } {
  if (ended) return { minDelay: 450, settle: 0 }
  if (m.trigger === 'boss_start') return { minDelay: 3000, settle: TURN_SETTLE_MS } // boss splash + intro banner
  if (m.trigger === 'elite_start') return { minDelay: 1500, settle: TURN_SETTLE_MS } // intro banner
  if (m.afterEnemyPhase) return { minDelay: 400, settle: TURN_SETTLE_MS }
  return { minDelay: 900, settle: 0 } // let the hit land first
}

export function IxComms({ combat, C, lang, settings }: Props) {
  const [line, setLine] = useState<Line | null>(null)
  const seen = useRef<CombatState | null>(null)
  const memo = useRef<FightMemo | null>(null)
  const queued = useRef<{ priority: number; cancel: () => void } | null>(null)
  const timers = useRef<number[]>([])
  const shownAt = useRef(0)
  const seq = useRef(0)

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  // Dismiss with a short fade.
  const scheduleDismiss = (key: number, ms: number) => {
    clearTimers()
    later(() => setLine((l) => (l && l.key === key ? { ...l, leaving: true } : l)), Math.max(0, ms - FADE_MS))
    later(() => setLine((l) => (l && l.key === key ? null : l)), ms)
  }

  useEffect(() => {
    if (!combat || combat === seen.current) return
    const last = seen.current
    // Same encounter id twice in a row is still a new fight when its event log restarted.
    const sameFight = !!last && memo.current?.encounterId === combat.encounterId && combat.events.length >= last.events.length
    const prev = sameFight ? last : null
    if (!sameFight || !memo.current) {
      memo.current = newMemo(combat)
      queued.current?.cancel() // a line still waiting from the last fight never blocks this one
      queued.current = null
    }
    seen.current = combat
    const fight = memo.current
    const m = detectMoment(prev, combat, C, lang, fight)
    if (!m || !turnAllows(fight, combat.turn)) return
    if (queued.current && queued.current.priority >= m.priority) return
    queued.current?.cancel()
    fight.lastLineTurn = combat.turn

    const key = ++seq.current
    const authored = pickIxLine(m.trigger, lang, m.names, key + combat.turn)
    const ctrl = new AbortController()
    let llmText: string | null = null
    let shown = false
    let swapped = false
    let logId: number | null = null
    const report = { route: 'talk', kind: `ix:${m.trigger}` } as const

    void ixLine(m.trigger, lang, m.context, LLM_WAIT_MS, ctrl.signal).then((text) => {
      if (!text || ctrl.signal.aborted) return
      if (!shown) {
        llmText = text
        return
      }
      if (swapped) return
      swapped = true
      setLine((l) => (l && l.key === key && !l.leaving ? { ...l, text, llm: true } : l))
      swapComms(logId, { text, ai: true, report })
      const elapsed = performance.now() - shownAt.current
      scheduleDismiss(key, Math.min(MAX_SHOW_MS - elapsed, Math.max(SHOW_MS - elapsed, SWAP_MIN_MS)))
    })

    const ended = combat.phase !== 'player'
    const { minDelay, settle } = timingFor(m, ended)
    const stopWait = whenSettled(minDelay, settle, () => {
      queued.current = null
      shown = true
      swapped = llmText !== null // already the LLM line: no second swap
      shownAt.current = performance.now()
      setLine({ key, text: llmText ?? authored, llm: llmText !== null, leaving: false, after: ended })
      logId = logComms({ speaker: 'ix', text: llmText ?? authored, ai: llmText !== null, act: typeof m.context.act === 'number' ? m.context.act : undefined, report: llmText !== null ? report : undefined })
      if (!isHardMuted()) sound('ui_hover', { volume: 0.9 })
      scheduleDismiss(key, SHOW_MS)
    })
    queued.current = {
      priority: m.priority,
      cancel: () => {
        stopWait()
        ctrl.abort()
      },
    }
    // Detection runs once per new combat state; C/lang changes mid-fight do not re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat])

  useEffect(
    () => () => {
      queued.current?.cancel()
      for (const t of timers.current) window.clearTimeout(t)
    },
    [],
  )

  if (!line) return null
  return (
    <div className={`m2-ixcomms${line.after ? ' is-after' : ''}${line.leaving ? ' is-leaving' : ''}${settings.fastAnim ? ' is-fast' : ''}`} role="status" aria-live="polite">
      <div className="m2-ixcomms__face" aria-hidden="true">
        <img src={asset('characters/administrator-ix.png')} alt="" />
      </div>
      <div className="m2-ixcomms__body">
        <div className="m2-ixcomms__label">
          <span className="m2-ixcomms__rec" aria-hidden="true" />
          {lang === 'ko' ? '관리자 IX · 통신' : 'ADMINISTRATOR IX · COMMS'}
        </div>
        <p key={line.llm ? 'llm' : 'authored'} className="m2-ixcomms__text">
          {line.text}
        </p>
      </div>
    </div>
  )
}
