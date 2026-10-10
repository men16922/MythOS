// Mythos 2.0 — number that ticks toward its value (rewards, echo tally, credits).
import { useEffect, useRef, useState } from 'react'

export interface CountUpProps {
  value: number
  /** Animation duration in ms (default 700). */
  ms?: number
  /** Start from this value on first mount (default: value, i.e. no initial animation). */
  from?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function CountUp({ value, ms = 700, from, prefix = '', suffix = '', className }: CountUpProps) {
  const [shown, setShown] = useState(from ?? value)
  const shownRef = useRef(from ?? value)
  const [bump, setBump] = useState(0)
  useEffect(() => {
    const start = shownRef.current
    if (start === value) return
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - k, 3)
      const v = Math.round(start + (value - start) * eased)
      shownRef.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
      else setBump((b) => b + 1)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return (
    <span key={bump} className={`m2-countup${bump ? ' is-bump' : ''}${className ? ` ${className}` : ''}`}>
      {prefix}
      {shown}
      {suffix}
    </span>
  )
}
