// Mythos 2.0 — loop setup: archetype, starting companion, Paradox level.
import { ChevronLeft, Heart, Lock, Play } from 'lucide-react'
import { useState } from 'react'
import type { ContentRegistry, MetaProfile, StatKey } from '../../engine/types.ts'
import { asset, portrait } from '../common/assets.ts'
import { STAT_LABEL, tr } from '../common/lang.ts'
import { CardView } from '../components/CardView.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { sound } from '../components/sound.ts'
import { Tooltip } from '../components/Tooltip.tsx'
import { rx } from './rx.ts'

const STATS: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']

export interface SetupScreenProps {
  profile: MetaProfile
  C: ContentRegistry
  onStart: (o: { archetype: string; companion: string | null; paradox: number }) => void
  onBack: () => void
}

export function SetupScreen({ profile, C, onStart, onBack }: SetupScreenProps) {
  const lang = profile.settings.lang
  const ko = lang === 'ko'
  const archs = rx.archetypes(profile, C)
  const comps = rx.companions(profile, C)
  const firstLoop = profile.loops === 0
  const [archId, setArchId] = useState<string>(() => archs.find((a) => a.unlocked)?.def.id ?? '')
  const [compId, setCompId] = useState<string | null>(() => comps.find((c) => c.unlocked)?.def.id ?? null)
  const [paradox, setParadox] = useState(0)
  const arch = C.archetypes[archId]
  const companion = firstLoop ? 'se_rin' : compId

  return (
    <div className="m2-setup">
      <div className="m2-setup__bg" style={{ backgroundImage: `url(${asset('concept/06-subway-control-hub.png')})` }} />
      <header className="m2-setup__head">
        <button className="m2-iconbtn" onClick={onBack} title={ko ? '아카이브로' : 'Back to the Archive'}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <div className="m2-setup__kicker">{ko ? `루프 ${profile.loops + 1}` : `Loop ${profile.loops + 1}`}</div>
          <h1>{ko ? '누구로 접속하는가' : 'Who connects this time'}</h1>
        </div>
      </header>

      <section className="m2-archs">
        {archs.map(({ def, unlocked, unlock }) => {
          const on = def.id === archId
          return (
            <button
              key={def.id}
              className={`m2-arch${on ? ' is-on' : ''}${unlocked ? '' : ' is-locked'}`}
              onMouseEnter={() => sound('ui_hover')}
              onClick={() => {
                if (!unlocked) {
                  sound('error')
                  return
                }
                sound('ui_click')
                setArchId(def.id)
              }}
            >
              <span className="m2-arch__art">
                <img src={portrait(def.sprite)} alt="" />
              </span>
              <span className="m2-arch__body">
                <b className="m2-arch__name">{tr(def.name, lang)}</b>
                <span className="m2-arch__tag">{tr(def.tagline, lang)}</span>
                {unlocked ? (
                  <>
                    <span className="m2-arch__hp">
                      <Heart size={13} /> <b className="m2-mono">{def.maxHp}</b>
                      <span className="m2-arch__cr m2-mono">{def.startingCredits} ₵</span>
                    </span>
                    <span className="m2-arch__stats">
                      {STATS.map((s) => (
                        <span key={s} className="m2-stat">
                          <small>{tr(STAT_LABEL[s], lang)}</small>
                          <i>
                            <i style={{ width: `${(def.stats[s] / 10) * 100}%` }} />
                          </i>
                          <b className="m2-mono">{def.stats[s]}</b>
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="m2-arch__lock">
                    <Lock size={14} /> {unlock ? (ko ? `아카이브에서 해금 · ◈${unlock.cost}` : `Unlock in the Archive · ◈${unlock.cost}`) : ko ? '잠김' : 'Locked'}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </section>

      {arch && (
        <section className="m2-setup__detail">
          <p className="m2-setup__desc">{tr(arch.description, lang)}</p>
          <div className="m2-setup__deck">
            <div className="m2-setup__label">{ko ? '시작 덱' : 'Starting deck'}</div>
            <div className="m2-minideck">
              {[...new Set(arch.startingDeck)].map((id) => {
                const def = C.cards[id]
                if (!def) return null
                const n = arch.startingDeck.filter((x) => x === id).length
                return (
                  <Tooltip key={id} content={<CardView def={def} upgraded={false} lang={lang} size="md" />} width={220}>
                    <span className={`m2-minicard m2-minicard--${def.type}`}>
                      <i className="m2-mono">{def.cost < 0 ? '–' : def.cost}</i>
                      {tr(def.name, lang)}
                      {n > 1 && <em className="m2-mono">×{n}</em>}
                    </span>
                  </Tooltip>
                )
              })}
            </div>
            {C.implants[arch.startingImplant] && (
              <div className="m2-setup__implant">
                <ImplantIcon def={C.implants[arch.startingImplant]!} lang={lang} size={34} />
                <span>{tr(C.implants[arch.startingImplant]?.name, lang)}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="m2-setup__row">
        <section className="m2-setup__comp">
          <div className="m2-setup__label">{ko ? '시작 동료' : 'Starting companion'}</div>
          {firstLoop ? (
            <div className="m2-compfixed">
              <img src={portrait('se-rin')} alt="" />
              <span>
                <b>{tr(C.companions.se_rin?.name, lang) || (ko ? '세린' : 'Se-rin')}</b>
                <small>{ko ? '첫 루프에서는 세린이 당신을 찾아낸다.' : 'On your first loop, Se-rin finds you.'}</small>
              </span>
            </div>
          ) : (
            <div className="m2-comps">
              {comps.map(({ def, unlocked }) => (
                <Tooltip
                  key={def.id}
                  content={
                    <div>
                      <div className="m2-tip__title">
                        {tr(def.name, lang)} <em>{tr(def.role, lang)}</em>
                      </div>
                      <div className="m2-tip__text">{unlocked ? tr(def.passiveText, lang) : ko ? '아카이브에서 해금' : 'Unlock in the Archive'}</div>
                    </div>
                  }
                >
                  <button
                    className={`m2-comp${companion === def.id ? ' is-on' : ''}${unlocked ? '' : ' is-locked'}`}
                    onClick={() => {
                      if (!unlocked) return sound('error')
                      sound('ui_click')
                      setCompId(companion === def.id ? null : def.id)
                    }}
                  >
                    <img src={portrait(def.sprite)} alt={tr(def.name, lang)} />
                    {!unlocked && <Lock size={14} />}
                  </button>
                </Tooltip>
              ))}
              <span className="m2-comps__name">{companion ? tr(C.companions[companion]?.name, lang) : ko ? '혼자 간다' : 'Going alone'}</span>
            </div>
          )}
        </section>

        <section className="m2-setup__paradox">
          <div className="m2-setup__label">{ko ? '패러독스' : 'Paradox'}</div>
          <div className="m2-paradox">
            {[0, 1, 2, 3, 4, 5].map((lv) => {
              const locked = lv > profile.paradoxUnlocked
              return (
                <button
                  key={lv}
                  className={`${paradox === lv ? 'is-on' : ''}${locked ? ' is-locked' : ''}`}
                  disabled={locked}
                  onClick={() => {
                    sound('ui_click')
                    setParadox(lv)
                  }}
                >
                  {lv}
                </button>
              )
            })}
          </div>
          <div className="m2-paradox__text">
            {paradox === 0 ? (
              <span>{ko ? '기본 규칙. 승리하면 다음 단계가 열린다.' : 'Standard rules. Win to unlock the next level.'}</span>
            ) : (
              C.paradox
                .filter((p) => p.level <= paradox)
                .map((p) => (
                  <span key={p.level}>
                    <b>{tr(p.name, lang)}</b> {tr(p.text, lang)}
                  </span>
                ))
            )}
          </div>
        </section>
      </div>

      <footer className="m2-setup__foot">
        <button
          className="m2-btn m2-btn--primary m2-btn--lg"
          disabled={!arch}
          onMouseEnter={() => sound('ui_hover')}
          onClick={() => {
            sound('transition', { intensity: 1.3 })
            onStart({ archetype: archId, companion: companion ?? null, paradox })
          }}
        >
          <Play size={18} /> {ko ? '접속' : 'Connect'}
        </button>
      </footer>
    </div>
  )
}
