// Mythos 2.0 — a talking boss / elite throws one line at a turning point of the fight: when it first drops to half
// HP ("hurt") and when the connector is down to 30 % ("winning"), each at most once per fight. A speech bubble over
// the speaker, click-through and gone in a few seconds. The authored line (content/taunts.ts) shows at once; the AI
// line is swapped in once if it lands in time. Never blocks play; nothing here touches the fight.
//
// Mounted by GameShell next to IxComms; reads only the CombatState it is handed.

import { useEffect, useRef, useState } from 'react'
import type { CombatState, ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { TAUNTS } from '../../content/taunts.ts'
import { logComms, swapComms } from '../common/commsLog.ts'
import { tr } from '../common/lang.ts'
import { enemyTaunt } from './gm.ts'
import { AiMark } from '../components/AiMark.tsx'
import { detectTaunt } from './tauntMoments.ts'
import './voices.css'

const SHOW_MS = 4500
const FADE_MS = 320
const LLM_WAIT_MS = 3500

interface Bubble {
  key: number
  text: string
  name: string
  left: number
  top: number
  /** No room above the unit (phone top rows): the bubble hangs below it instead. */
  below: boolean
  /** A model wrote `text`. */
  ai: boolean
  leaving: boolean
}

interface Props {
  combat: CombatState | null
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
}

/** Bubble room needed above a unit before it flips below (the HUD strip and IX's banner live up there). */
const ROOM_ABOVE = 170

function spot(uid: string): { left: number; top: number; below: boolean } {
  const el = document.querySelector(`[data-uid="${CSS.escape(uid)}"]`)
  const r = el?.getBoundingClientRect()
  const W = window.innerWidth
  if (!r || r.width === 0) return { left: W / 2, top: 120, below: true }
  const left = Math.max(110, Math.min(W - 110, r.left + r.width / 2))
  return r.top >= ROOM_ABOVE ? { left, top: r.top, below: false } : { left, top: r.bottom, below: true }
}

/** IX's comms banner is up (it takes the same moment, e.g. low HP): wait for it rather than talk over it. */
const ixTalking = (): boolean => document.querySelector('.m2-ixcomms:not(.is-leaving)') !== null

export function EnemyTaunt({ combat, C, lang, settings }: Props) {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const fight = useRef<{ encounterId: string; events: number; said: Set<string> } | null>(null)
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const seq = useRef(0)
  const abort = useRef<AbortController | null>(null)

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  useEffect(() => {
    if (!combat) return
    const known = fight.current
    if (!known || known.encounterId !== combat.encounterId || combat.events.length < known.events) {
      fight.current = { encounterId: combat.encounterId, events: combat.events.length, said: new Set() }
      return // nothing to say on the opening board
    }
    known.events = combat.events.length
    if (busy.current || combat.phase !== 'player') return
    const hit = detectTaunt(combat, known.said)
    if (!hit) return
    known.said.add(hit.moment === 'hurt' ? `${hit.unit.uid}:hurt` : 'winning')
    const lines = TAUNTS[hit.unit.defId]?.[hit.moment] ?? []
    const key = ++seq.current
    const authored = tr(lines[(combat.turn + key) % Math.max(1, lines.length)], lang)
    if (!authored) return
    const name = tr(C.enemies[hit.unit.defId]?.name, lang)
    busy.current = true
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    let logId: number | null = null
    let shown = false
    let pending: string | null = null
    const report = { route: 'talk', kind: `enemy:${hit.unit.defId}:${hit.moment}` } as const
    void enemyTaunt(hit.unit.defId, hit.moment, lang, LLM_WAIT_MS, ctrl.signal).then((text) => {
      if (!text || ctrl.signal.aborted) return
      if (!shown) {
        pending = text
        return
      }
      setBubble((b) => (b && b.key === key && !b.leaving ? { ...b, text, ai: true } : b))
      swapComms(logId, { text, ai: true, report })
    })
    // Let the hit that caused it land first, and never speak over IX (wait up to ~8 s, then drop the line).
    const show = (waited: number) => {
      if (ctrl.signal.aborted) return
      if (ixTalking() && waited < 8000) return later(() => show(waited + 300), 300)
      if (ixTalking()) {
        busy.current = false
        return
      }
      shown = true
      const at = spot(hit.unit.uid)
      setBubble({ key, text: pending ?? authored, name, ...at, ai: pending !== null, leaving: false })
      logId = logComms({ speaker: 'enemy', text: pending ?? authored, ai: pending !== null, where: name, report: pending !== null ? report : undefined })
      later(() => setBubble((b) => (b && b.key === key ? { ...b, leaving: true } : b)), SHOW_MS - FADE_MS)
      later(() => {
        setBubble((b) => (b && b.key === key ? null : b))
        busy.current = false
      }, SHOW_MS)
    }
    later(() => show(0), 650)
    // Detection runs once per new combat state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat])

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t)
      abort.current?.abort()
    },
    [],
  )

  if (!bubble) return null
  return (
    <div
      className={`m2-taunt${bubble.ai ? ' is-ai' : ''}${bubble.below ? ' is-below' : ''}${bubble.leaving ? ' is-leaving' : ''}${settings.fastAnim ? ' is-fast' : ''}`}
      style={{ left: bubble.left, top: bubble.top }}
      role="status"
      aria-live="polite"
    >
      <b className="m2-taunt__name">
        {bubble.name}
        {bubble.ai && <AiMark lang={lang} />}
      </b>
      <p className="m2-taunt__text">{bubble.text}</p>
    </div>
  )
}
