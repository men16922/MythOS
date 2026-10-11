// Mythos 2.0 — hover/focus tooltip rendered in a portal (never clipped by overflow containers).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './tooltip.css'

export interface TooltipProps {
  /** Tooltip body. Falsy = no tooltip. */
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom' | 'right' | 'left'
  /** Extra class on the inline wrapper. */
  className?: string
  /** Max width of the bubble in px (default 280). */
  width?: number
}

interface Anchor {
  x: number
  y: number
  w: number
  h: number
}

export function Tooltip({ content, children, placement = 'top', className, width = 280 }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const show = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setAnchor({ x: r.left, y: r.top, w: r.width, h: r.height })
  }
  const hide = () => {
    setAnchor(null)
    setPos(null)
  }

  useLayoutEffect(() => {
    if (!anchor || !bubble.current) return
    const b = bubble.current.getBoundingClientRect()
    const gap = 10
    let left = anchor.x + anchor.w / 2 - b.width / 2
    let top = anchor.y - b.height - gap
    if (placement === 'bottom' || (placement === 'top' && top < 8)) top = anchor.y + anchor.h + gap
    if (placement === 'right') {
      left = anchor.x + anchor.w + gap
      top = anchor.y + anchor.h / 2 - b.height / 2
    }
    if (placement === 'left') {
      left = anchor.x - b.width - gap
      top = anchor.y + anchor.h / 2 - b.height / 2
    }
    left = Math.max(8, Math.min(window.innerWidth - b.width - 8, left))
    top = Math.max(8, Math.min(window.innerHeight - b.height - 8, top))
    // Measuring the rendered bubble is the only way to place it; one extra commit is intended.
    setPos({ left, top })
  }, [anchor, placement])

  return (
    <span
      ref={ref}
      className={className ? `m2-tip-anchor ${className}` : 'm2-tip-anchor'}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {anchor && content
        ? createPortal(
            <div
              ref={bubble}
              className="m2-tip"
              role="tooltip"
              style={{ maxWidth: width, left: pos?.left ?? -9999, top: pos?.top ?? -9999, opacity: pos ? 1 : 0 }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
