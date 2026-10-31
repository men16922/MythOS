// Mythos 2.0 — "pick 1 of N" card reveal: cards fan in one by one, rares shimmer gold.
import { useEffect, useState } from 'react'
import type { ContentRegistry, Lang } from '../../engine/types.ts'
import { CardView } from './CardView.tsx'
import { sound } from './sound.ts'
import './cardchoice.css'

export interface CardChoiceProps {
  choices: string[]
  C: ContentRegistry
  lang: Lang
  onPick: (cardId: string) => void
  onSkip?: () => void
  skipLabel?: string
  title?: string
  fast?: boolean
  /** Marks a card that completes something held. Quiet: the result stays secret. */
  resonant?: (cardId: string) => boolean
}

export function CardChoice({ choices, C, lang, onPick, onSkip, skipLabel, title, fast, resonant }: CardChoiceProps) {
  const [shown, setShown] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => {
    if (shown >= choices.length) return
    const t = window.setTimeout(
      () => {
        const id = choices[shown]
        const def = id ? C.cards[id] : undefined
        sound(def?.rarity === 'rare' ? 'rare' : 'card_draw', { pan: (shown - (choices.length - 1) / 2) * 0.4 })
        setShown((n) => n + 1)
      },
      shown === 0 ? 120 : fast ? 60 : 170,
    )
    return () => window.clearTimeout(t)
  }, [shown, choices, C, fast])

  const pick = (id: string) => {
    if (picked) return
    setPicked(id)
    sound('reward')
    window.setTimeout(() => onPick(id), fast ? 120 : 380)
  }

  return (
    <div className="m2-choice">
      {title && <div className="m2-choice__title">{title}</div>}
      <div className="m2-choice__fan">
        {choices.map((id, i) => {
          const def = C.cards[id]
          if (!def) return null
          const visible = i < shown
          return (
            <div
              key={`${id}-${i}`}
              className={`m2-choice__slot${visible ? ' is-in' : ''}${def.rarity === 'rare' ? ' is-rare' : ''}${picked === id ? ' is-picked' : picked ? ' is-dropped' : ''}`}
              style={{ ['--i' as string]: i - (choices.length - 1) / 2 }}
            >
              <CardView def={def} upgraded={false} lang={lang} size="lg" onClick={() => pick(id)} onMouseEnter={() => sound('card_hover')} />
              {resonant?.(id) && (
                <span className="m2-resonant" title={lang === 'ko' ? '지닌 것과 공명한다' : 'Resonates with something you hold'}>
                  ✦
                </span>
              )}
            </div>
          )
        })}
      </div>
      {onSkip && (
        <button className="m2-btn m2-btn--ghost" onClick={onSkip} disabled={!!picked}>
          {skipLabel ?? (lang === 'ko' ? '건너뛰기' : 'Skip')}
        </button>
      )}
    </div>
  )
}
