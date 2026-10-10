// First-loop opening: four cinematic shots over the authored opening art.
// Click / Space / Enter advances, Esc skips. Shown once before the Act 1 intro on loop 1.

import { useCallback, useEffect, useState } from 'react'
import type { Lang, Text } from '../../engine/types.ts'
import { asset } from '../common/assets.ts'
import { playSfx } from '../common/audio.ts'
import { tr } from '../common/lang.ts'
import './prologue.css'

interface Shot {
  image: string
  kicker: Text
  line: Text
}

const SHOTS: Shot[] = [
  {
    image: 'concept/00-project-mythos-main.png',
    kicker: { ko: 'NEO-SEOUL // 재건 37년', en: 'NEO-SEOUL // YEAR 37 OF RECONSTRUCTION' },
    line: {
      ko: '이 도시에서 사람은 이름보다 점수로 먼저 불린다. 기준을 벗어난 기억은, 조용히 지워진다.',
      en: 'In this city you are a score before you are a name. Memories outside the baseline are quietly erased.',
    },
  },
  {
    image: 'opening/opening-01-serin-arrival.png',
    kicker: { ko: 'C-17 정전 구역 // 02:14', en: 'C-17 BLACKOUT ZONE // 02:14' },
    line: {
      ko: '젖은 아스팔트 위에서 눈을 뜬다. 어떤 명단에도 없는 몸. 오토바이 한 대가 빗속에서 멈춘다.',
      en: 'You wake on wet asphalt, a body on no roster. A motorbike stops in the rain.',
    },
  },
  {
    image: 'opening/opening-02-first-contact.png',
    kicker: { ko: '정세린 // "물거미"', en: 'JUNG SE-RIN // "WATER SPIDER"' },
    line: {
      ko: '"아직 지워지진 않았네." 장갑 낀 손이 내밀어진다. "일어나. 드론이 오기 전에."',
      en: '"Not erased yet." A gloved hand reaches down. "Get up. Before the drones come."',
    },
  },
  {
    image: 'opening/opening-03-drone-chase.png',
    kicker: { ko: '관리자 IX // 최적화 대기열', en: 'ADMINISTRATOR IX // OPTIMIZATION QUEUE' },
    line: {
      ko: '붉은 빛이 골목을 훑는다. 정중한 목소리가 빗소리를 가른다. "비식별 신호를 확인했습니다. 곧 편안해지실 겁니다."',
      en: 'Red light sweeps the alley. A polite voice cuts the rain: "Unregistered signal confirmed. You will be comfortable soon."',
    },
  },
]

export function Prologue(props: { lang: Lang; onDone: () => void }) {
  const { lang, onDone } = props
  const [index, setIndex] = useState(0)

  const next = useCallback(() => {
    playSfx('glitch', 0.35)
    if (index >= SHOTS.length - 1) onDone()
    else setIndex(index + 1)
  }, [index, onDone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, onDone])

  const shot = SHOTS[index] ?? SHOTS[0]
  if (!shot) return null

  return (
    <div className="m2p-root" onClick={next} role="presentation">
      {SHOTS.map((s, i) => (
        <div
          key={s.image}
          className={`m2p-shot${i === index ? ' is-active' : ''}`}
          style={{ backgroundImage: `url(${asset(s.image)})` }}
        />
      ))}
      <div className="m2p-vignette" />
      <div className="m2p-caption" key={index}>
        <div className="m2p-kicker">{tr(shot.kicker, lang)}</div>
        <p className="m2p-line">{tr(shot.line, lang)}</p>
      </div>
      <div className="m2p-progress">
        {SHOTS.map((s, i) => (
          <span key={s.image} className={i <= index ? 'is-on' : ''} />
        ))}
      </div>
      <button
        type="button"
        className="m2p-skip"
        onClick={(e) => {
          e.stopPropagation()
          onDone()
        }}
      >
        {lang === 'ko' ? '건너뛰기 ⏭' : 'Skip ⏭'}
      </button>
      <div className="m2p-hint">{lang === 'ko' ? '클릭하여 계속' : 'Click to continue'}</div>
    </div>
  )
}
