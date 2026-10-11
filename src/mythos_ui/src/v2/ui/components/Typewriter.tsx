// Mythos 2.0 — fast typewriter reveal; click to complete instantly.
import { useEffect, useState } from 'react'
import { sound } from './sound.ts'
import './typewriter.css'

export interface TypewriterProps {
  text: string
  /** Characters per second (default 90). */
  cps?: number
  /** Show instantly (fast animations setting). */
  instant?: boolean
  /** Play the soft typing tick (default true). */
  tick?: boolean
  className?: string
}

export function Typewriter({ text, cps = 90, instant, className, tick = true }: TypewriterProps) {
  const [state, setState] = useState({ text, n: instant ? text.length : 0 })
  // Reset when the text changes (derived during render, no effect needed).
  let n = state.n
  if (state.text !== text) {
    n = instant ? text.length : 0
    setState({ text, n })
  }
  const done = n >= text.length
  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      if (tick) sound('type_tick')
      setState((s) => (s.text === text ? { text, n: Math.min(text.length, s.n + Math.max(1, Math.round(cps / 30))) } : s))
    }, 1000 / 30)
    return () => window.clearInterval(id)
  }, [done, text, cps, tick])
  return (
    <div
      className={`m2-type${done ? '' : ' is-typing'}${className ? ` ${className}` : ''}`}
      onClick={() => !done && setState({ text, n: text.length })}
    >
      {text.slice(0, n)}
      {!done && <span className="m2-type__caret" />}
      {!done && <span className="m2-type__rest">{text.slice(n)}</span>}
    </div>
  )
}
