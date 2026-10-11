// Mythos 2.0 — compact HP bar.

import './hpbar.css'

export function HpBar({ hp, max, small, label }: { hp: number; max: number; small?: boolean; label?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0
  const tone = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : 'ok'
  return (
    <div className={`m2-hp m2-hp--${tone}${small ? ' m2-hp--sm' : ''}`}>
      <div className="m2-hp__fill" style={{ width: `${pct}%` }} />
      {label !== false && (
        <span className="m2-hp__txt m2-mono">
          {hp}/{max}
        </span>
      )}
    </div>
  )
}
