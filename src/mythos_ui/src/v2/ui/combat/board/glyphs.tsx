// Small glyphs shared by the board and the HUD panels: an enemy move's pattern icon and the block shield.

import { ChevronsRight, Crosshair, LocateFixed, Plus, Radiation, Sparkles, Swords, Target, Zap } from 'lucide-react'
import type { EnemyMove } from '../../../engine/types.ts'

export function PatternIcon({ p, size = 14 }: { p: EnemyMove['pattern']; size?: number }) {
  switch (p) {
    case 'melee':
      return <Swords size={size} strokeWidth={2.4} />
    case 'line':
      return <Crosshair size={size} strokeWidth={2.4} />
    case 'beam':
      return <Zap size={size} strokeWidth={2.4} />
    case 'charge':
      return <ChevronsRight size={size} strokeWidth={2.6} />
    case 'nova':
      return <Radiation size={size} strokeWidth={2.4} />
    case 'lob':
      return <Target size={size} strokeWidth={2.4} />
    case 'buff':
      return <Sparkles size={size} strokeWidth={2.4} />
    case 'summon':
      return <Plus size={size} strokeWidth={2.8} />
    case 'track':
      return <LocateFixed size={size} strokeWidth={2.4} />
  }
}

export function ShieldGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
      <path d="M8 1 L14 3.4 V7.6 C14 11.2 11.4 13.8 8 15 C4.6 13.8 2 11.2 2 7.6 V3.4 Z" fill="currentColor" />
    </svg>
  )
}
