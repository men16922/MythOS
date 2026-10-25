// Mythos 2.0 — Signal+ district: scene art, the action budget, points of interest (each opens a conversation), the
// quest journal and leaving. Rules live in engine/crpg.ts; this screen only shows them.
import { Footprints, LogOut, MapPin, ScrollText, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { asset } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { QuestLog } from './QuestLog.tsx'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './crpg.css'

export function DistrictScreen({ run, C, lang, settings, act }: ScreenProps) {
  const [journal, setJournal] = useState(false)
  if (run.screen.kind !== 'district') return null
  const visit = run.screen.district
  const def = C.crpg?.districts[visit.id]
  if (!def) return null
  const ko = lang === 'ko'
  const pois = rx.districtPois(run, C)
  const spent = visit.actionsLeft <= 0
  const quests = rx.questLog(run, C)

  return (
    <div className="m2-district">
      <div className="m2-district__art" style={{ backgroundImage: `url(${asset(def.image)})` }} />
      <div className="m2-district__panel">
        <div className="m2-district__kicker">
          <MapPin size={14} /> {ko ? '구역 탐색' : 'District'}
        </div>
        <h1 className="m2-district__title">{tr(def.name, lang)}</h1>
        <Typewriter className="m2-district__text" text={tr(spent ? def.outro : def.intro, lang)} cps={settings.fastAnim ? 400 : 110} />

        <div className="m2-district__status">
          <span className="m2-district__actions" aria-label={ko ? '남은 행동' : 'Actions left'}>
            <Footprints size={14} />
            {Array.from({ length: def.actions }, (_, i) => (
              <i key={i} className={i < visit.actionsLeft ? 'is-left' : ''} />
            ))}
            <small>{ko ? `남은 행동 ${visit.actionsLeft}` : `${visit.actionsLeft} left`}</small>
          </span>
          <span className="m2-district__inspiration" title={ko ? '영감: 실패한 판정을 한 번 다시 굴린다' : 'Inspiration: reroll a failed check'}>
            <Sparkles size={14} /> {run.crpg?.inspiration ?? 0}
          </span>
          <button className="m2-btn m2-btn--ghost" onClick={() => setJournal(true)}>
            <ScrollText size={14} /> {ko ? '임무' : 'Journal'} {quests.length > 0 && <b className="m2-mono">{quests.length}</b>}
          </button>
        </div>

        <ul className="m2-pois">
          {pois.map(({ poi, visited, available, reason }) => (
            <li key={poi.id}>
              <button
                className={`m2-poi${visited ? ' is-visited' : ''}${available ? '' : ' is-locked'}`}
                disabled={!available}
                onMouseEnter={() => available && sound('ui_hover')}
                onClick={() => {
                  sound('ui_click')
                  act(rx.visitPoi(run, poi.id, C))
                }}
              >
                <b>{tr(poi.name, lang)}</b>
                <small>{visited ? (ko ? '다녀왔다' : 'Visited') : !available && reason ? tr(reason, lang) : tr(poi.blurb, lang)}</small>
              </button>
            </li>
          ))}
        </ul>

        <button
          className={`m2-btn ${spent ? 'm2-btn--primary m2-btn--lg' : 'm2-btn--ghost'}`}
          onClick={() => {
            sound('transition')
            act(rx.leaveDistrict(run, C))
          }}
        >
          <LogOut size={16} /> {spent ? (ko ? '구역을 떠난다' : 'Leave the district') : ko ? '여기까지만 보고 떠난다' : 'Leave early'}
        </button>
      </div>
      {journal && <QuestLog run={run} C={C} lang={lang} onClose={() => setJournal(false)} />}
    </div>
  )
}
