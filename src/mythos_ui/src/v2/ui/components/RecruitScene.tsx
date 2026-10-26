// Mythos 2.0 — a companion's recruit scene (RPG introduction): full-bleed meeting still, dialogue beats one at a
// time, a first-impression choice with the companion's reply, then their profile card. On later runs (they were met
// before) it plays as a one-line reunion. Content: content/companionIntros.ts; effect: engine/run.ts resolveIntro.
import { useEffect, useMemo, useState } from 'react'
import type { CompanionDef, CompanionIntro, FirstImpression, Lang } from '../../engine/types.ts'
import { asset } from '../common/assets.ts'
import { josa, tr } from '../common/lang.ts'
import { sound } from './sound.ts'
import { Typewriter } from './Typewriter.tsx'
import './cutscene.css'
import './recruit.css'

export interface RecruitSceneProps {
  def: CompanionDef
  intro: CompanionIntro
  lang: Lang
  /** Met in an earlier run: short reunion instead of the full meeting. */
  reunion: boolean
  /** Picks the reunion line (deterministic per run). */
  seed: number
  fast?: boolean
  onDone: (tone: FirstImpression | null) => void
}

const TONE_MARK: Record<FirstImpression, string> = { trust: '◆', guard: '▲', wit: '✦' }

export function RecruitScene({ def, intro, lang, reunion, seed, fast, onDone }: RecruitSceneProps) {
  const ko = lang === 'ko'
  const [beat, setBeat] = useState(0)
  const [typed, setTyped] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [tone, setTone] = useState<FirstImpression | null>(null)
  const beats = intro.beats
  const step: 'beats' | 'choice' | 'reply' = reunion ? 'reply' : tone ? 'reply' : beat >= beats.length ? 'choice' : 'beats'
  const current = beats[Math.min(beat, beats.length - 1)]
  const reunionLine = useMemo(() => intro.reunion[Math.abs(seed) % Math.max(1, intro.reunion.length)], [intro.reunion, seed])
  const name = tr(def.name, lang)

  useEffect(() => {
    sound('recruit')
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone(tone)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone, tone])

  const next = () => {
    sound('ui_click')
    if (!typed) {
      setSkipped(true)
      return
    }
    setTyped(false)
    setSkipped(false)
    setBeat((b) => b + 1)
  }

  const speaker = (who: 'companion' | 'connector' | 'narration') => (who === 'companion' ? name : who === 'connector' ? (ko ? '접속자' : 'Connector') : '')

  return (
    <div className="m2-cutscene m2-recruit" role="dialog" aria-modal="true" aria-label={name} data-testid="recruit-scene">
      <img className="m2-cutscene__art" src={asset(intro.image)} alt="" />
      <div className="m2-cutscene__veil" />
      <div className="m2-cutscene__panel m2-recruit__panel">
        <div className="m2-cutscene__kicker">
          {reunion ? (ko ? '재회 · 동료' : 'Reunion · Companion') : ko ? '첫 만남 · 동료' : 'First meeting · Companion'}
        </div>
        <h2 className="m2-cutscene__title">
          {name} <small>— {tr(def.alias, lang)}</small>
        </h2>

        {step === 'beats' && current && (
          <>
            <div className={`m2-recruit__line is-${current.who}`}>
              {speaker(current.who) && (
                <b className="m2-recruit__who">
                  {current.who === 'companion' && <img src={asset(def.portrait)} alt="" />}
                  {speaker(current.who)}
                </b>
              )}
              <Typewriter
                key={`${beat}:${skipped ? 's' : 't'}`}
                className="m2-cutscene__text"
                text={tr(current.text, lang)}
                cps={fast ? 400 : 60}
                instant={skipped}
                onDone={() => setTyped(true)}
              />
            </div>
            <div className="m2-recruit__actions">
              <span className="m2-recruit__pager">
                {beat + 1} / {beats.length}
              </span>
              <button className="m2-btn m2-btn--primary" onClick={next} autoFocus>
                {typed ? (ko ? '다음' : 'Next') : ko ? '글 넘기기' : 'Show all'}
              </button>
            </div>
          </>
        )}

        {step === 'choice' && (
          <div className="m2-recruit__choices" role="group" aria-label={ko ? '첫인상' : 'First impression'}>
            <div className="m2-recruit__ask">{ko ? '어떻게 답할까?' : 'How do you answer?'}</div>
            {intro.choices.map((c) => (
              <button
                key={c.tone}
                className={`m2-recruit__choice is-${c.tone}`}
                onClick={() => {
                  sound('ui_click')
                  setTone(c.tone)
                }}
              >
                <span className="m2-recruit__mark">{TONE_MARK[c.tone]}</span>
                {tr(c.label, lang)}
              </button>
            ))}
          </div>
        )}

        {step === 'reply' && (
          <>
            <div className="m2-recruit__line is-companion">
              <b className="m2-recruit__who">
                <img src={asset(def.portrait)} alt="" />
                {name}
              </b>
              <p className="m2-cutscene__text">
                {reunion ? tr(reunionLine, lang) : tr(intro.choices.find((c) => c.tone === tone)?.reply, lang)}
              </p>
            </div>
            {!reunion && tone && tone === intro.likesTone && (
              <div className="m2-recruit__approve" role="status">
                {ko ? `${josa(name, '이', '가')} 마음에 들어 한다 · 유대 +1` : `${name} approves · Bond +1`}
              </div>
            )}
            <div className="m2-recruit__card">
              <div className="m2-recruit__traits">
                {intro.traits.map((tr0, i) => (
                  <span key={i}>{tr(tr0, lang)}</span>
                ))}
              </div>
              {!reunion && <p className="m2-recruit__bio">{tr(intro.bio, lang)}</p>}
              <dl className="m2-recruit__likes">
                <dt>{ko ? '좋아함' : 'Likes'}</dt>
                <dd>{tr(intro.likes, lang)}</dd>
                <dt>{ko ? '싫어함' : 'Dislikes'}</dt>
                <dd>{tr(intro.dislikes, lang)}</dd>
                <dt>{ko ? '역할' : 'Role'}</dt>
                <dd>{tr(def.role, lang)}</dd>
              </dl>
              <blockquote className="m2-recruit__quote">“{tr(intro.quote, lang)}”</blockquote>
            </div>
            <div className="m2-recruit__actions">
              <span />
              <button
                className="m2-btn m2-btn--primary m2-btn--lg"
                autoFocus
                onClick={() => {
                  sound('ui_click')
                  onDone(reunion ? null : tone)
                }}
              >
                {ko ? '함께 간다' : 'Move out together'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
