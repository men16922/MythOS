// Mythos 2.0 — after the final boss: choose an ending (some are gated by bonds / codex / trace).
import { Lock } from 'lucide-react'
import { asset } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'

export function FinalChoice({ run, C, lang, act }: ScreenProps) {
  const ko = lang === 'ko'
  const endings = rx.endings(run, C)
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
            <img src={asset(def.image)} alt="" />
            <span className="m2-ending-opt__shade" />
            <span className="m2-ending-opt__text">
              <b>{tr(def.choice ?? def.title, lang)}</b>
              <small>{tr(def.title, lang)}</small>
              {!gate.ok && gate.reason && (
                <em>
                  <Lock size={12} /> {tr(gate.reason, lang)}
                </em>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
