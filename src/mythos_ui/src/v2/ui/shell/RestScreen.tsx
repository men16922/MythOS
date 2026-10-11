// Mythos 2.0 — safehouse: one action — heal, upgrade, scrub Trace, or bond with a companion.
import { Eraser, HeartHandshake, HeartPulse, Wrench } from 'lucide-react'
import { useState } from 'react'
import { asset, portrait } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { companionSprite } from '../components/format.ts'
import { sound } from '../components/sound.ts'
import { CompanionChat } from './CompanionChat.tsx'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './rest.css'

type Choice = { kind: 'heal' | 'upgrade' | 'scrub' } | { kind: 'bond'; id: string }

export function RestScreen({ run, C, lang, settings, act }: ScreenProps) {
  const [chosen, setChosen] = useState<Choice | null>(null)
  const [bondPick, setBondPick] = useState(false)
  if (run.screen.kind !== 'rest') return null
  const done = run.screen.done
  const ko = lang === 'ko'
  const heal = rx.restHealAmount(run, C)
  const scrub = rx.restScrubAmount()
  const canUpgrade = rx.canUpgradeAny(run, C)
  const canBond = run.party.some((m) => m.bond < 3)

  const pick = (c: Choice) => {
    if (done) return
    setChosen(c)
    if (c.kind === 'bond') {
      sound('reward')
      act(rx.restBond(run, c.id, C))
    } else if (c.kind === 'heal') {
      sound('heal')
      act(rx.restHeal(run, C))
    } else if (c.kind === 'upgrade') {
      sound('ui_click')
      act(rx.restUpgrade(run, C))
    } else {
      sound('success', { volume: 0.6 })
      act(rx.restScrub(run, C))
    }
  }

  const bonded = chosen?.kind === 'bond' ? run.party.find((m) => m.id === chosen.id) : undefined
  const bondDef = bonded ? C.companions[bonded.id] : undefined
  const bondLine = bondDef && bonded ? bondDef.bondLines[Math.max(0, Math.min(bondDef.bondLines.length - 1, bonded.bond - 1))] : undefined

  return (
    <div className="m2-rest">
      <div className="m2-rest__bg" style={{ backgroundImage: `url(${asset('scenes/abandoned_signal.png')})` }} />
      <div className="m2-rest__inner">
        <div className="m2-rest__kicker">{ko ? '은신처' : 'Safehouse'}</div>
        <h1 className="m2-rest__title">{ko ? '잠시 숨을 고른다' : 'A moment to breathe'}</h1>
        <p className="m2-rest__sub">{ko ? '여기서는 한 가지만 할 수 있다.' : 'There is time for one thing here.'}</p>

        {!done && !bondPick && (
          <div className="m2-rest__opts">
            <button className="m2-restopt m2-restopt--heal" onClick={() => pick({ kind: 'heal' })} onMouseEnter={() => sound('ui_hover')} disabled={run.hp >= run.maxHp}>
              <HeartPulse size={34} />
              <b>{ko ? '휴식' : 'Rest'}</b>
              <span>{run.hp >= run.maxHp ? (ko ? '이미 최대 체력' : 'Already at full HP') : ko ? `체력 +${heal}, 동료도 회복` : `+${heal} HP, companions recover`}</span>
            </button>
            <button className="m2-restopt m2-restopt--upgrade" onClick={() => pick({ kind: 'upgrade' })} onMouseEnter={() => sound('ui_hover')} disabled={!canUpgrade}>
              <Wrench size={34} />
              <b>{ko ? '정비' : 'Tune'}</b>
              <span>{canUpgrade ? (ko ? '카드 한 장을 강화한다' : 'Upgrade one card') : ko ? '강화할 카드가 없다' : 'Nothing left to upgrade'}</span>
            </button>
            <button className="m2-restopt m2-restopt--scrub" onClick={() => pick({ kind: 'scrub' })} onMouseEnter={() => sound('ui_hover')} disabled={run.trace <= 0}>
              <Eraser size={34} />
              <b>{ko ? '흔적 지우기' : 'Go dark'}</b>
              <span>{ko ? `추적 −${scrub}` : `−${scrub} Trace`}</span>
            </button>
            <button
              className="m2-restopt m2-restopt--bond"
              onClick={() => {
                sound('ui_click')
                setBondPick(true)
              }}
              onMouseEnter={() => sound('ui_hover')}
              disabled={!canBond}
            >
              <HeartHandshake size={34} />
              <b>{ko ? '대화' : 'Talk'}</b>
              <span>
                {run.party.length === 0
                  ? ko
                    ? '함께할 동료가 없다'
                    : 'No one to talk to'
                  : canBond
                    ? ko
                      ? '동료와의 유대 +1'
                      : 'Bond +1 with a companion'
                    : ko
                      ? '유대가 이미 최대'
                      : 'Bonds are maxed'}
              </span>
            </button>
          </div>
        )}

        {!done && bondPick && (
          <div className="m2-rest__bond">
            {run.party.map((m) => {
              const def = C.companions[m.id]
              if (!def) return null
              return (
                <button key={m.id} className="m2-bondpick" disabled={m.bond >= 3} onClick={() => pick({ kind: 'bond', id: m.id })} onMouseEnter={() => sound('ui_hover')}>
                  <img src={portrait(companionSprite(m.id, C))} alt="" />
                  <b>{tr(def.name, lang)}</b>
                  <span className="m2-bondpips">
                    {[1, 2, 3].map((i) => (
                      <i key={i} className={i <= m.bond ? 'is-on' : i === m.bond + 1 ? 'is-next' : ''} />
                    ))}
                  </span>
                  <small>{m.bond >= 3 ? (ko ? '최대 유대' : 'Max bond') : m.bond + 1 >= 2 ? (ko ? '유대 카드 해금' : 'Unlocks a bond card') : tr(def.role, lang)}</small>
                </button>
              )
            })}
            <button className="m2-btn m2-btn--ghost" onClick={() => setBondPick(false)}>
              {ko ? '뒤로' : 'Back'}
            </button>
          </div>
        )}

        {done && (
          <div className="m2-rest__done">
            {bonded && bondDef && bondLine ? (
              <CompanionChat run={run} C={C} lang={lang} settings={settings} companionId={bonded.id} opening={tr(bondLine, lang)} />
            ) : (
              <p className="m2-rest__note">
                {chosen?.kind === 'heal'
                  ? ko
                    ? '얕은 잠. 그래도 상처는 닫혔다.'
                    : 'Shallow sleep. The wounds close anyway.'
                  : chosen?.kind === 'scrub'
                    ? ko
                      ? '로그를 덮어쓰고 신호를 끊었다.'
                      : 'Logs overwritten. Signal cut.'
                    : ko
                      ? '준비는 끝났다.'
                      : 'Ready.'}
              </p>
            )}
            <button
              className="m2-btn m2-btn--primary m2-btn--lg"
              onClick={() => {
                sound('transition')
                act(rx.leaveRest(run, C))
              }}
            >
              {ko ? '출발' : 'Move on'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
