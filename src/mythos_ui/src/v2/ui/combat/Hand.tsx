// The hand: a fanned, overlapping arc of CardViews. Hover lifts + enlarges with a cursor tilt,
// new cards are dealt from the draw pile, the armed card stays raised. Touch: tap arms (no hover, no tilt),
// a long press shows the card large (`onZoom`) without arming it, and sliding a finger along the fan lifts
// the card under it (the fan opens around the finger) and arms that card on release — how a crowded phone
// hand (9-10 cards, ~28 px slices) stays easy to pick from.

import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { CardInstance, ContentRegistry, Lang } from '../../engine/types.ts'
import { sfx } from '../common/sfx.ts'
import { CardView } from '../components/CardView.tsx'
import { isTouch } from './touch.ts'

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
  /** Touch UI: wording of the confirm chip ("tap" instead of "click"). */
  touch?: boolean
  /** Touch long press: show this card large (null = release). */
  onZoom?: (uid: string | null) => void
}

/** Hold this long (ms) on a card to zoom it; moving the finger further than LONG_SLOP px cancels. */
const LONG_MS = 380
const LONG_SLOP = 10

function tilt(e: ReactMouseEvent<HTMLDivElement>) {
  if (isTouch()) return
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
  // Touch slide: the card under the sliding finger plays the role of the hovered card.
  const [slideUid, setSlideUid] = useState<string | null>(null)
  const focusUid = p.hoverUid ?? slideUid
  const hoverIdx = p.cards.findIndex((c) => c.uid === focusUid)

  // Touch long press → zoom. The click that may follow the release must not arm the card.
  const press = useRef<{ uid: string; timer: number; x: number; y: number; long: boolean } | null>(null)
  const longEndedAt = useRef(0)
  /** Set while a touch slide is in progress (it started on a card and moved past LONG_SLOP). */
  const sliding = useRef(false)
  const slideEndedAt = useRef(0)
  const cardAt = (x: number, y: number): HTMLElement | null =>
    (document.elementFromPoint(x, y)?.closest('[data-card-uid]') as HTMLElement | null) ?? null
  const pressStart = (uid: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return
    sliding.current = false
    if (!p.onZoom) {
      press.current = { uid, timer: 0, x: e.clientX, y: e.clientY, long: false }
      return
    }
    const timer = window.setTimeout(() => {
      const cur = press.current
      if (cur && cur.uid === uid) {
        cur.long = true
        p.onZoom?.(uid)
      }
    }, LONG_MS)
    press.current = { uid, timer, x: e.clientX, y: e.clientY, long: false }
  }
  const pressMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cur = press.current
    if (!cur || cur.long || e.pointerType === 'mouse') return
    if (!sliding.current && Math.hypot(e.clientX - cur.x, e.clientY - cur.y) > LONG_SLOP) {
      window.clearTimeout(cur.timer)
      sliding.current = true
    }
    if (sliding.current) {
      const uid = cardAt(e.clientX, e.clientY)?.dataset.cardUid ?? null
      if (uid) setSlideUid(uid)
    }
  }
  const pressEnd = (e?: ReactPointerEvent<HTMLDivElement>) => {
    const cur = press.current
    if (!cur) return
    window.clearTimeout(cur.timer)
    if (cur.long) {
      longEndedAt.current = performance.now()
      p.onZoom?.(null)
    } else if (sliding.current && e) {
      // Release over a card: arm it (the click that follows lands on the card the slide started from — ignore it).
      const el = cardAt(e.clientX, e.clientY)
      const uid = el?.dataset.cardUid
      slideEndedAt.current = performance.now()
      if (el && uid) p.onCard(uid, el)
    }
    sliding.current = false
    setSlideUid(null)
    press.current = null
  }

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
    <div className={`m2c-hand${p.hidden ? ' is-hidden' : ''}${slideUid ? ' is-sliding' : ''}`} style={{ '--cw': `${cw}px`, '--ch': `${ch}px`, '--fs': `${p.fs}px` } as CSSProperties} data-coach="hand">
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
                onPointerDown={(e) => pressStart(card.uid, e)}
                onPointerMove={pressMove}
                onPointerUp={pressEnd}
                onPointerCancel={() => pressEnd()}
                onClick={(e) => {
                  if (performance.now() - longEndedAt.current < 450 || performance.now() - slideEndedAt.current < 450) return
                  p.onCard(card.uid, e.currentTarget)
                }}
              >
                <CardView def={def} upgraded={card.upgraded} lang={p.lang} playable={pl.ok} selected={armed} reason={pl.reason} />
                <span className="m2c-key">{i < 9 ? i + 1 : ''}</span>
                {armed && p.confirmUid === card.uid && <span className="m2c-confirm">{p.lang === 'ko' ? '한 번 더 눌러 사용' : p.touch ? 'Tap again to play' : 'Click again to play'}</span>}
              </div>
            </div>
          </div>
        )
      })}
      <div className="m2c-hand-h" style={{ height: ch }} />
    </div>
  )
})
