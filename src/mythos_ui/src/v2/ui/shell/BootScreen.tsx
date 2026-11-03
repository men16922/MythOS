// Mythos 2.0 — the one-time boot screen when a run first goes below the city (content/bootLines.ts). Lines type in,
// the signal line follows; a click closes it, and it closes by itself shortly after the last line. Once per device.
import { useEffect, useState } from 'react'
import { BOOT_LINES } from '../../content/bootLines.ts'
import type { RunState } from '../../engine/types.ts'
import './bootscreen.css'

const SEEN_KEY = 'mythos2.bootSeen'

function seen(mode: string): boolean {
  try {
    return (window.localStorage.getItem(SEEN_KEY) ?? '').split(',').includes(mode)
  } catch {
    return true
  }
}

function markSeen(mode: string): void {
  try {
    const now = (window.localStorage.getItem(SEEN_KEY) ?? '').split(',').filter(Boolean)
    if (!now.includes(mode)) window.localStorage.setItem(SEEN_KEY, [...now, mode].join(','))
  } catch {
    // private mode: show it again next time, nothing breaks
  }
}

/** Shown over the Act 4 intro of a Deep Signal / Sea run, the first time on this device. */
export function BootScreen({ run, fast }: { run: RunState; fast: boolean }) {
  const boot = run.mode ? BOOT_LINES[run.mode] : undefined
  const [open, setOpen] = useState(() => !!boot && run.act === 4 && (run.lap ?? 0) === 0 && !seen(run.mode ?? ''))
  const [shown, setShown] = useState(0)
  const total = (boot?.lines.length ?? 0) + 1
  const close = (): void => {
    markSeen(run.mode ?? '')
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => (shown < total ? setShown((n) => n + 1) : close()), shown < total ? (fast ? 90 : 320) : 1600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shown, total, fast])
  if (!open || !boot) return null
  return (
    <div
      className="m2-boot"
      role="dialog"
      aria-label="boot"
      data-testid="boot-screen"
      onClick={(e) => {
        e.stopPropagation()
        close()
      }}
    >
      <pre className="m2-boot__log">
        {boot.lines.slice(0, shown).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </pre>
      {shown >= total && <p className="m2-boot__signal">{boot.signal}</p>}
    </div>
  )
}
