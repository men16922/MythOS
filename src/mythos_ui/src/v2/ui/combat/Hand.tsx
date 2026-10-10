// The hand: a fanned, overlapping arc of CardViews. Hover lifts + enlarges with a cursor tilt,
// new cards are dealt from the draw pile, the armed card stays raised.

import { memo, useEffect, useRef } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import type { CardInstance, ContentRegistry, Lang } from '../../engine/types.ts'
import { sfx } from '../common/sfx.ts'
import { CardView } from '../components/CardView.tsx'

export interface HandProps {
  cards: CardInstance[]
  C: ContentRegistry
  lang: Lang
  /** CardView font size (card = 10.6em × 15em). */
  fs: number
  width: number
  hidden: boolean
  armedUid: string | null
  confirmUid: string | null
  hoverUid: string | null
  playable: Record<string, { ok: boolean; reason?: string }>
  /** Draw pile position relative to the hand's centre-bottom anchor. */
  drawFrom: { x: number; y: number }
  onCard: (uid: string, el: HTMLElement) => void
  onHover: (uid: string | null) => void
}

function tilt(e: ReactMouseEvent<HTMLDivElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const nx = (e.clientX - r.left) / r.width - 0.5
  const ny = (e.clientY - r.top) / r.height - 0.5
  el.style.setProperty('--ry', `${(nx * 16).toFixed(2)}deg`)
  el.style.setProperty('--rx', `${(-ny * 12).toFixed(2)}deg`)
  el.style.setProperty('--gx', `${((nx + 0.5) * 100).toFixed(1)}%`)
  el.style.setProperty('--gy', `${((ny + 0.5) * 100).toFixed(1)}%`)
}

function untilt(e: ReactMouseEvent<HTMLDivElement>) {
  const el = e.currentTarget
  el.style.setProperty('--ry', '0deg')
  el.style.setProperty('--rx', '0deg')
}

export const Hand = memo(function Hand(p: HandProps) {
  const n = p.cards.length
  const cw = p.fs * 10.6
  const ch = p.fs * 15
  const spacing = n <= 1 ? 0 : Math.min(cw * 0.9, (p.width - cw) / (n - 1))
  const total = spacing * (n - 1)
  const mid = (n - 1) / 2
  const hoverIdx = p.cards.findIndex((c) => c.uid === p.hoverUid)

  // Draw sound for every newly dealt card.
  const seen = useRef<Set<string>>(new Set())
  useEffect(() => {
    let k = 0
    const timers: number[] = []
    for (const c of p.cards) {
      if (!seen.current.has(c.uid)) {
        timers.push(window.setTimeout(() => sfx('card_draw', { pan: -0.4 + Math.random() * 0.3 }), 60 + k * 70))
        k++
      }
    }
    seen.current = new Set(p.cards.map((c) => c.uid))
    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
  }, [p.cards])

  return (
    <div className={`m2c-hand${p.hidden ? ' is-hidden' : ''}`} style={{ '--cw': `${cw}px`, '--ch': `${ch}px`, '--fs': `${p.fs}px` } as CSSProperties} data-coach="hand">
      {p.cards.map((card, i) => {
        const def = p.C.cards[card.defId]
        if (!def) return null
        const off = i - mid
        let x = -total / 2 + i * spacing
        const rot = n <= 1 ? 0 : off * Math.min(2.6, 16 / n)
        const y = Math.abs(off) ** 2 * Math.min(1.6, 10 / n)
        if (hoverIdx >= 0 && i !== hoverIdx) {
          const d = i - hoverIdx
          x += Math.sign(d) * Math.max(0, cw * 0.36 - Math.abs(d) * cw * 0.07) * (spacing < cw * 0.8 ? 1 : 0.4)
        }
        const hovered = i === hoverIdx
        const armed = card.uid === p.armedUid
        const pl = p.playable[card.uid] ?? { ok: false }
        const slotStyle = {
          transform: `translate(${(x - cw / 2).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${hovered || armed ? 0 : rot}deg)`,
          zIndex: hovered ? 60 : armed ? 50 : 10 + i,
          '--fx': `${(p.drawFrom.x - x).toFixed(0)}px`,
          '--fy': `${(p.drawFrom.y - y).toFixed(0)}px`,
          animationDelay: `${i * 70}ms`,
        } as CSSProperties
        return (
          <div key={card.uid} className={`m2c-slot${hovered ? ' is-hover' : ''}${armed ? ' is-armed' : ''}${pl.ok ? '' : ' is-off'}`} style={slotStyle}>
            <div className="m2c-deal" style={{ animationDelay: `${i * 70}ms` }}>
              <div
                className="m2c-lift"
                data-card-uid={card.uid}
                onMouseEnter={() => p.onHover(card.uid)}
                onMouseLeave={(e) => {
                  untilt(e)
                  p.onHover(null)
                }}
                onMouseMove={tilt}
                onClick={(e) => p.onCard(card.uid, e.currentTarget)}
              >
                <CardView def={def} upgraded={card.upgraded} lang={p.lang} playable={pl.ok} selected={armed} reason={pl.reason} />
                <span className="m2c-key">{i < 9 ? i + 1 : ''}</span>
                {armed && p.confirmUid === card.uid && <span className="m2c-confirm">{p.lang === 'ko' ? '한 번 더 눌러 사용' : 'Click again to play'}</span>}
              </div>
            </div>
          </div>
        )
      })}
      <div className="m2c-hand-h" style={{ height: ch }} />
    </div>
  )
})
