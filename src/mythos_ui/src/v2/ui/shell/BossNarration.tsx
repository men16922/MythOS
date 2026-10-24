// Mythos 2.0 — the GM narrates a boss's entrance and each of its phase shifts. A click-through GM card over the
// combat screen (left edge, clear of the board and of IX's comms strip at the top). The authored line (the
// encounter's intro / the boss's phase text) shows at once; the LLM line ('boss' narration) is swapped in at
// most once if it lands within a few seconds. Never blocks play.
//
// Mounted by GameShell for the run view; reads only the CombatState it is handed.

import { useEffect, useRef, useState } from 'react'
import type { CombatState, ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { logComms, swapComms } from '../common/commsLog.ts'
import { josa, tr } from '../common/lang.ts'
import { GmCard } from './GmCard.tsx'
import { narrateLine, type Ctx } from './gm.ts'
import './voices.css'

const SHOW_MS = 9000
const LLM_WAIT_MS = 6000
/** The boss splash + intro banner own the first beat of the fight. */
const INTRO_DELAY_MS = 2600

interface Shown {
  key: number
  text: string
  /** A model wrote `text` (the swapped-in GM line). */
  ai: boolean
  leaving: boolean
}

interface Props {
  combat: CombatState | null
  C: ContentRegistry
  lang: Lang
  settings: MetaProfile['settings']
}

export function BossNarration({ combat, C, lang, settings }: Props) {
  const [shown, setShown] = useState<Shown | null>(null)
  const fight = useRef<{ encounterId: string; events: number } | null>(null)
  const timers = useRef<number[]>([])
  const seq = useRef(0)
  const abort = useRef<AbortController | null>(null)

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  /** Show `authored` after `delay`, ask the GM for its own take, swap once. */
  const speak = (authored: string, context: Ctx, delay: number) => {
    clear()
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const key = ++seq.current
    let up = false
    let pending: string | null = null
    let logId: number | null = null
    const report = { route: 'narrate', kind: 'boss' } as const
    const swapIn = (text: string) => {
      setShown((s) => (s && s.key === key && !s.leaving ? { ...s, text, ai: true } : s))
      swapComms(logId, { text, ai: true, report })
    }
    void narrateLine('boss', lang, context, LLM_WAIT_MS + delay).then((line) => {
      // Only a model line replaces the authored one (a local line would be a downgrade, not news).
      if (!line?.ai || ctrl.signal.aborted) return
      if (up) swapIn(line.text)
      else pending = line.text
    })
    later(() => {
      up = true
      setShown({ key, text: pending ?? authored, ai: pending !== null, leaving: false })
      logId = logComms({
        speaker: 'boss',
        text: pending ?? authored,
        ai: pending !== null,
        act: typeof context.act === 'number' ? context.act : undefined,
        where: typeof context.boss === 'string' ? context.boss : undefined,
        report: pending !== null ? report : undefined,
      })
    }, delay)
    later(() => setShown((s) => (s && s.key === key ? { ...s, leaving: true } : s)), delay + SHOW_MS - 400)
    later(() => setShown((s) => (s && s.key === key ? null : s)), delay + SHOW_MS)
  }

  useEffect(() => {
    if (!combat) return
    const enc = C.encounters[combat.encounterId]
    if (!enc || enc.kind !== 'boss') {
      fight.current = null
      return
    }
    const boss = enc.enemies.map((e) => C.enemies[e.id]).find((d) => d?.tier === 'boss')
    const name = boss ? tr(boss.name, lang) : ''
    const act = C.acts[enc.act]
    const known = fight.current
    const fresh = !known || known.encounterId !== combat.encounterId || combat.events.length < known.events
    const from = fresh ? 0 : known.events
    fight.current = { encounterId: combat.encounterId, events: combat.events.length }
    if (fresh) {
      const intro = tr(enc.intro, lang) || (lang === 'ko' ? `${josa(name, '이', '가')} 길을 막는다.` : `${name} blocks the way.`)
      speak(intro, { boss: name, act: enc.act, actName: tr(act?.name, lang), phase: 0, intro }, INTRO_DELAY_MS)
      return
    }
    // Phase shifts that happened since the last state we saw (the boss's own phase events only).
    const bossUids = new Set(combat.units.filter((u) => C.enemies[u.defId]?.tier === 'boss').map((u) => u.uid))
    for (let i = combat.events.length - 1; i >= from; i--) {
      const ev = combat.events[i]
      if (ev?.t === 'phase' && bossUids.has(ev.uid)) {
        const phaseText = tr(ev.text, lang)
        // Let the phase banner and the hit that caused it land first.
        speak(phaseText, { boss: name, act: enc.act, actName: tr(act?.name, lang), phase: ev.phase, phaseText }, 1400)
        break
      }
    }
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

  if (!shown) return null
  return <GmCard text={shown.text} ai={shown.ai} lang={lang} fast={settings.fastAnim} className={`m2-bossgm${shown.leaving ? ' is-leaving' : ''}`} />
}
