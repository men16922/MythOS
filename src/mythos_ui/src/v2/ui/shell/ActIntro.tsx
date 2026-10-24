// Mythos 2.0 — act title card: full-bleed art, numeral, name, intro lines revealed one by one.
import { art } from '../components/art.ts'
import { useEffect, useState } from 'react'
import { openingLines } from '../../content/openings.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'
import { GmCard } from './GmCard.tsx'
import { narrateLine, type GmLine } from './gm.ts'
import { logComms } from '../common/commsLog.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './actintro.css'

export function ActIntro({ run, C, lang, settings, act }: ScreenProps) {
  const actDef = C.acts[run.act]
  const introLines = tr(actDef?.intro, lang).split('\n').filter(Boolean)
  // Re-entries end with how this loop's starting companion found you (content/openings.ts).
  const opening = openingLines(run).map((l) => tr(l, lang))
  const lines = [...introLines, ...opening]
  const [shown, setShown] = useState(0)
  const all = shown >= lines.length
  const [gmLine, setGmLine] = useState<GmLine | null>(null)

  useEffect(() => {
    sound('transition', { intensity: 1.6 })
  }, [])

  // The GM opens the act in its own words; it appears over the art once the authored lines have started.
  useEffect(() => {
    let alive = true
    void narrateLine('act_intro', lang, {
      act: run.act,
      actName: tr(actDef?.name, lang),
      subtitle: tr(actDef?.subtitle, lang),
      loop: run.loop,
      party: run.party.map((m) => tr(C.companions[m.id]?.name, lang)),
      archetype: tr(C.archetypes[run.archetype]?.name, lang),
    }).then((line) => {
      if (!alive || !line) return
      setGmLine(line)
      logComms({ speaker: 'gm', text: line.text, ai: line.ai, act: run.act, where: tr(actDef?.name, lang), report: line.ai ? { route: 'narrate', kind: 'act_intro' } : undefined })
    })
    return () => {
      alive = false
    }
    // Once per act card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.act])

  useEffect(() => {
    if (all) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? (settings.fastAnim ? 200 : 1300) : settings.fastAnim ? 250 : 1500)
    return () => window.clearTimeout(t)
  }, [shown, all, settings.fastAnim])

  const go = () => {
    if (!all) {
      setShown(lines.length)
      return
    }
    sound('ui_click')
    act(rx.continueActIntro(run, C))
  }

  return (
    <div className="m2-actintro" onClick={go}>
      <div className="m2-actintro__art" style={{ backgroundImage: `url(${art.act(run.act, actDef?.image)})` }} />
      <div className="m2-actintro__shade" />
      <GmCard className="m2-actintro__gm" text={shown > 0 ? (gmLine?.text ?? null) : null} ai={gmLine?.ai} lang={lang} fast={settings.fastAnim} report={{ route: 'narrate', kind: 'act_intro' }} />
      <div className="m2-actintro__inner">
        <div className="m2-actintro__num">
          {run.act}
          <small>/3</small>
        </div>
        <div className="m2-actintro__titles">
          <div className="m2-actintro__kicker">{lang === 'ko' ? `${run.act}막` : `Act ${run.act}`}</div>
          <h1 className="m2-actintro__name">{tr(actDef?.name, lang)}</h1>
          <p className="m2-actintro__sub">{tr(actDef?.subtitle, lang)}</p>
        </div>
        <div className="m2-actintro__lines">
          {lines.slice(0, shown).map((l, i) => (
            <p key={i} className={i >= introLines.length ? 'm2-actintro__opening' : undefined}>
              {l}
            </p>
          ))}
        </div>
        <button
          className={`m2-btn m2-btn--primary m2-btn--lg m2-actintro__go${all ? ' is-ready' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            go()
          }}
        >
          {all ? (lang === 'ko' ? '들어간다' : 'Go in') : lang === 'ko' ? '넘기기' : 'Skip'}
        </button>
      </div>
    </div>
  )
}
