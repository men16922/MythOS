// Mythos 2.0 — the stat-check moment: odds bar, a needle that swings and settles, then a stamp.
import { useEffect, useRef, useState } from 'react'
import type { Lang } from '../../engine/types.ts'
import { sound } from './sound.ts'

export interface RollMeterProps {
  /** Success chance 0-100. */
  chance: number
  success: boolean
  /** Where the needle lands (0-100); must be < chance on success, >= chance on failure. */
  land: number
  lang: Lang
  label?: string
  fast?: boolean
  onDone: () => void
}

export function RollMeter({ chance, success, land, lang, label, fast, onDone }: RollMeterProps) {
  const [x, setX] = useState(50)
  const [stamped, setStamped] = useState(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const dur = fast ? 380 : 900
    const t0 = performance.now()
    let raf = 0
    let lastTick = 0
    let finishTimer = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const amp = (1 - k) * 46
      const wobble = Math.sin(k * Math.PI * 7) * amp
      setX(Math.max(1, Math.min(99, land + wobble)))
      if (now - lastTick > 85 && k < 0.95) {
        lastTick = now
        sound('roll_tick', { intensity: 0.7 + k * 0.6 })
      }
      if (k < 1) raf = requestAnimationFrame(step)
      else {
        setStamped(true)
        sound(success ? 'success' : 'fail')
        finishTimer = window.setTimeout(() => doneRef.current(), fast ? 450 : 1100)
      }
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(finishTimer)
    }
  }, [land, success, fast])

  const ko = lang === 'ko'
  return (
    <div className={`m2-roll${stamped ? (success ? ' is-win' : ' is-loss') : ''}`}>
      {label && <div className="m2-roll__label">{label}</div>}
      <div className="m2-roll__bar">
        <div className="m2-roll__win" style={{ width: `${chance}%` }}>
          <span className="m2-mono">{chance}%</span>
        </div>
        <div className="m2-roll__needle" style={{ left: `${x}%` }} />
      </div>
      <div className="m2-roll__scale m2-mono">
        <span>0</span>
        <span>100</span>
      </div>
      {stamped && <div className="m2-roll__stamp">{success ? (ko ? '성공' : 'SUCCESS') : ko ? '실패' : 'FAILED'}</div>}
    </div>
  )
}
