// Preview overlays on the board: what an aimed card does to each unit (damage / heal / block chips, the
// push arrow and landing ghost) and, while hovering a move tile, the selected unit's ghost + what waits there.

import { Skull } from 'lucide-react'
import type { CombatPreview } from '../../../engine/combat.ts'
import { FIRE_BURN } from '../../../engine/effects.ts'
import { posKey } from '../../../engine/grid.ts'
import type { CombatState, ContentRegistry, Lang, Pos } from '../../../engine/types.ts'
import type { BoardGeom } from '../geometry.ts'
import { tileCenter, tileScale, unitScale } from '../geometry.ts'
import { ShieldGlyph } from './glyphs.tsx'
import type { IntentView, TileMark } from './marks.ts'
import { Ghost, PushArrow } from './units.tsx'

export function PreviewChips({ g, vc, C, preview }: { g: BoardGeom; vc: CombatState; C: ContentRegistry; preview: CombatPreview | null }) {
  return preview?.units.map((r) => {
    const u = vc.units.find((x) => x.uid === r.uid)
    if (!u) return null
    const s = tileScale(g, u.pos)
    const c = tileCenter(g, u.pos)
    const lost = r.hpBefore - r.hpAfter
    const blockGain = r.blockAfter - u.block
    const top = c.y - g.tw * 1.2 * s * unitScale(C, u)
    return (
      <div key={`pv${r.uid}`}>
        <div className={`m2c-pv${r.dies ? ' is-lethal' : ''}${u.side === 'party' ? ' is-friendly' : ''}`} style={{ left: c.x, top }}>
          {r.dies && <Skull size={16} strokeWidth={2.6} />}
          {lost > 0 && <b>-{lost}</b>}
          {lost < 0 && <b className="is-heal">+{-lost}</b>}
          {blockGain > 0 && (
            <span className="is-block">
              <ShieldGlyph />+{blockGain}
            </span>
          )}
        </div>
        {r.to && (
          <>
            <PushArrow g={g} from={u.pos} to={r.to} />
            <Ghost g={g} u={u} at={r.to} scale={unitScale(C, u)} />
          </>
        )}
      </div>
    )
  })
}

/** Move destination: the selected unit's ghost on the hovered move tile, and the damage / burn waiting there. */
export function MoveChip(p: { g: BoardGeom; vc: CombatState; at: Pos; selectedUid: string | null; tileDmg: Map<string, TileMark>; intents: IntentView[]; lang: Lang }) {
  const { g, vc, at, tileDmg, intents } = p
  const mu = vc.units.find((x) => x.uid === p.selectedUid)
  if (!mu) return null
  const c = tileCenter(g, at)
  const sc = tileScale(g, at)
  const hit = tileDmg.get(posKey(at))
  const haz = vc.tiles[at.y]?.[at.x]?.kind === 'hazard'
  const locked = intents.filter((iv) => iv.info.move.pattern === 'track' && iv.info.targetUid === mu.uid && iv.info.windupLeft === 0)
  const tileHit =
    (hit?.dmg ?? 0) -
    (hit
      ? intents
          .filter((iv) => iv.info.move.pattern === 'track' && iv.info.windupLeft === 0 && iv.info.tiles.some((q) => q.x === at.x && q.y === at.y))
          .reduce((n, iv) => n + iv.info.damage, 0)
      : 0)
  const dmg = Math.max(0, tileHit) + locked.reduce((n, iv) => n + iv.info.damage, 0) + (haz ? 2 : 0)
  // Walking into burning ground sets you on fire.
  const burn = (vc.tiles[at.y]?.[at.x]?.fire ?? 0) > 0 && !mu.flying ? FIRE_BURN : 0
  const ko = p.lang === 'ko'
  const parts = [dmg > 0 ? (ko ? `위험 -${dmg}` : `DANGER -${dmg}`) : '', burn > 0 ? (ko ? `화상 +${burn}` : `BURN +${burn}`) : ''].filter(Boolean)
  return (
    <>
      <Ghost g={g} u={mu} at={at} scale={1} move />
      <div className={parts.length ? 'm2c-movechip is-bad' : 'm2c-movechip'} style={{ left: c.x, top: c.y - g.tw * 1.25 * sc }}>
        {parts.length ? parts.join(' · ') : ko ? '안전' : 'SAFE'}
      </div>
    </>
  )
}
