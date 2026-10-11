// Mythos 2.0 — after the final boss: choose an ending (some are gated by bonds / codex / trace).
import { Lock } from 'lucide-react'
import { art } from '../components/art.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './ending.css'

export function FinalChoice({ run, C, lang, act }: ScreenProps) {
  const ko = lang === 'ko'
  const endings = rx.endings(run, C)
  const bondTotal = run.party.reduce((sum, m) => sum + m.bond, 0)
  /** Where the player stands against a gate, so a lock reads as a goal ("2 / 4"), not a wall. */
  const progress = (req: (typeof endings)[number]['def']['requires']): string | null => {
    if (req?.minBondTotal !== undefined) return `${bondTotal} / ${req.minBondTotal}`
    if (req?.minCodex !== undefined) return `${run.codex.length} / ${req.minCodex}`
    return null
  }
  return (
    <div className="m2-final">
      <div className="m2-final__head">
        <div className="m2-final__kicker">{ko ? '관리자 IX 정지' : 'Administrator IX is down'}</div>
        <h1 className="m2-final__title">{ko ? '이 도시를 어떻게 할 것인가' : 'What happens to this city now'}</h1>
      </div>
      <div className="m2-final__row">
        {endings.map(({ def, gate }, i) => (
          <button
            key={def.id}
            className={`m2-ending-opt${gate.ok ? '' : ' is-locked'}`}
            style={{ animationDelay: `${200 + i * 140}ms` }}
            disabled={!gate.ok}
            onMouseEnter={() => gate.ok && sound('ui_hover')}
            onClick={() => {
              sound('transition', { intensity: 1.5 })
              act(rx.chooseEnding(run, def.id, C))
            }}
          >
            <img src={art.ending(def.id, def.image)} alt="" />
            <span className="m2-ending-opt__shade" />
            <span className="m2-ending-opt__text">
              <b>{tr(def.choice ?? def.title, lang)}</b>
              {def.stakes && <span className="m2-ending-opt__stakes">{tr(def.stakes, lang)}</span>}
              <small>
                {tr(def.title, lang)}
                {def.echoBonus > 0 && <span className="m2-ending-opt__echo m2-mono"> · ◈ +{def.echoBonus}</span>}
              </small>
              {!gate.ok && gate.reason && (
                <em>
                  <Lock size={13} /> {tr(gate.reason, lang)}
                  {progress(def.requires) && <span className="m2-mono"> ({ko ? '현재' : 'now'} {progress(def.requires)})</span>}
                </em>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
