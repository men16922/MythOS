// First-combat coach marks: 4 short, non-blocking tips anchored to the real UI.

import { useEffect, useState } from 'react'
import type { Lang } from '../../engine/types.ts'
import { sfx } from '../common/sfx.ts'
import { markTutorialDone as markDone } from './describe.ts'


interface StepDef {
  anchor: string
  fallback: string
  title: [string, string]
  text: [string, string]
  place: 'above' | 'below' | 'left' | 'right'
}

const STEPS: StepDef[] = [
  {
    anchor: '.m2c-tdmg',
    fallback: '.m2c-board',
    title: ['붉은 칸 = 적의 공격', 'Red tiles = incoming hits'],
    text: [
      '턴을 끝내면 적이 붉은 칸을 친다. 그 칸에서 빠져나오거나, 적을 그 칸으로 밀어 넣어라.',
      'When your turn ends, enemies hit the red tiles. Step out — or shove an enemy into them.',
    ],
    place: 'right',
  },
  {
    anchor: '[data-uid="connector"] .m2c-u-hit',
    fallback: '.m2c-board',
    title: ['이동은 무료', 'Moving is free'],
    text: ['대원을 누르고 파란 칸을 누르면 이동한다. 턴마다 한 번이고, Z로 되돌릴 수 있다.', 'Click a unit, then a blue tile — once per turn. Z undoes it.'],
    place: 'right',
  },
  {
    anchor: '[data-coach="hand"]',
    fallback: '.m2c-bottom',
    title: ['카드엔 에너지가 든다', 'Cards cost energy'],
    text: [
      '대상에 커서를 올리면 결과가 미리 보인다. 적을 다른 적·벽·붕괴 구역에 처박는 것이 최고의 수다.',
      'Hover a target to see the exact result first. Pushing enemies into each other, walls or the void is your strongest play.',
    ],
    place: 'above',
  },
  {
    anchor: '[data-coach="endturn"]',
    fallback: '.m2c-bottom',
    title: ['턴 종료 (E)', 'End Turn (E)'],
    text: ['적이 예고한 공격을 그대로 실행한다. 누르기 전에 붉은 칸을 한 번 더 확인하라.', 'Enemies fire exactly what they telegraphed. Check the red tiles first.'],
    place: 'above',
  },
]

export function Coach({ root, lang, onClose }: { root: HTMLElement | null; lang: Lang; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState<{ left: number; top: number; arrow: StepDef['place'] } | null>(null)
  const def = STEPS[step]

  useEffect(() => {
    if (!root || !def) return
    const place = () => {
      const el = root.querySelector(def.anchor) ?? root.querySelector(def.fallback)
      if (!el) return
      const r = el.getBoundingClientRect()
      const b = root.getBoundingClientRect()
      const W = 300
      let left = r.left - b.left + r.width / 2 - W / 2
      let top = r.top - b.top - 150
      let arrow = def.place
      if (def.place === 'right') {
        left = r.right - b.left + 16
        top = r.top - b.top + r.height / 2 - 60
        if (left + W > b.width - 8) {
          left = r.left - b.left - W - 16
          arrow = 'left'
        }
      } else if (def.place === 'below') top = r.bottom - b.top + 14
      left = Math.max(8, Math.min(b.width - W - 8, left))
      top = Math.max(56, Math.min(b.height - 170, top))
      setPos({ left, top, arrow })
    }
    place()
    const t = window.setInterval(place, 400)
    return () => window.clearInterval(t)
  }, [root, def])

  if (!def || !pos) return null
  const finish = () => {
    markDone()
    onClose()
  }
  const k = lang === 'ko'
  return (
    <div className={`m2c-coach is-${pos.arrow}`} style={{ left: pos.left, top: pos.top }} role="dialog">
      <div className="m2c-coach-step">
        {step + 1} / {STEPS.length}
      </div>
      <div className="m2c-coach-title">{k ? def.title[0] : def.title[1]}</div>
      <p>{k ? def.text[0] : def.text[1]}</p>
      <div className="m2c-coach-actions">
        <button type="button" className="m2c-coach-skip" onClick={finish}>
          {k ? '튜토리얼 건너뛰기' : 'Skip tutorial'}
        </button>
        <button
          type="button"
          className="m2c-coach-next"
          onClick={() => {
            sfx('ui_click')
            if (step + 1 >= STEPS.length) finish()
            else setStep(step + 1)
          }}
        >
          {step + 1 >= STEPS.length ? (k ? '확인' : 'Got it') : k ? '다음' : 'Next'}
        </button>
      </div>
    </div>
  )
}
