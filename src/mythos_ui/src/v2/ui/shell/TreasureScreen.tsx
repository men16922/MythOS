// Mythos 2.0 — supply cache: click to crack it open (light burst), implant + credits inside.
import { useState } from 'react'
import { tr } from '../common/lang.ts'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { sound } from '../components/sound.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './treasure.css'

export function TreasureScreen({ run, C, lang, settings, act }: ScreenProps) {
  const [cracking, setCracking] = useState(false)
  if (run.screen.kind !== 'treasure') return null
  const t = run.screen
  const ko = lang === 'ko'
  const def = C.implants[t.implantId]

  const open = () => {
    if (t.opened || cracking) return
    setCracking(true)
    sound('roll_tick')
    window.setTimeout(
      () => {
        sound(def && (def.rarity === 'rare' || def.rarity === 'boss') ? 'rare' : 'reward')
        sound('coin', { volume: 0.7 })
        act(rx.openTreasure(run, C))
        setCracking(false)
      },
      settings.fastAnim ? 150 : 650,
    )
  }

  return (
    <div className={`m2-treasure${t.opened ? ' is-open' : ''}${cracking ? ' is-cracking' : ''}`}>
      <div className="m2-treasure__kicker">{ko ? '보급 상자' : 'Supply cache'}</div>
      <h1 className="m2-treasure__title">{t.opened ? (ko ? '봉인 해제' : 'Unsealed') : ko ? '잠긴 보급 상자' : 'A sealed cache'}</h1>
      <div className="m2-cache" onClick={open} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open()} onMouseEnter={() => !t.opened && sound('ui_hover')}>
        <div className="m2-cache__burst" />
        <div className="m2-cache__lid" />
        <div className="m2-cache__body">
          <span className="m2-cache__lock" />
        </div>
        {t.opened && def && (
          <div className="m2-cache__loot">
            <ImplantIcon def={def} lang={lang} size={92} flash />
          </div>
        )}
      </div>
      {!t.opened && <p className="m2-treasure__hint">{ko ? '클릭해서 연다' : 'Click to open'}</p>}
      {t.opened && def && (
        <div className="m2-treasure__loot">
          <b>{tr(def.name, lang)}</b>
          <p>{tr(def.text, lang)}</p>
          {t.credits > 0 && <span className="m2-chip m2-chip--gold m2-mono">+{t.credits} ₵</span>}
          <button
            className="m2-btn m2-btn--primary m2-btn--lg"
            onClick={() => {
              sound('transition')
              act(rx.leaveTreasure(run, C))
            }}
          >
            {ko ? '계속' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}
