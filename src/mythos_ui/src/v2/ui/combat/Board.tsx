// The tactical board: tilted 7×5 plane (SVG), y-sorted unit sprites (DOM), intent/target
// overlays, number labels and the board FX layer. Pure view — all decisions live in CombatScreen.
// This file stacks the layers; terrain lives in board/tiles.tsx, units in board/units.tsx, intent marks in
// board/intents.tsx, preview overlays in board/preview.tsx (their data in board/marks.ts).

import type { CSSProperties } from 'react'
import { ChevronsRight, CircleDot } from 'lucide-react'
import type { CombatPreview, IntentInfo } from '../../engine/combat.ts'
import { posKey } from '../../engine/grid.ts'
import { GRID_H, GRID_W } from '../../engine/types.ts'
import type { CombatState, ContentRegistry, Dir, Lang, Pos } from '../../engine/types.ts'
import type { FxItem, UnitFx } from './animator.ts'
import { BoardFx } from './BoardFx.tsx'
import { IntentLabels, IntentShapes, LockOns } from './board/intents.tsx'
import { aggregateIntents, groundMarks } from './board/marks.ts'
import type { IntentView } from './board/marks.ts'
import { MoveChip, PreviewChips } from './board/preview.tsx'
import { BoardPlane, GroundBadges, GroundFire, TileDefs } from './board/tiles.tsx'
import { UnitSprite } from './board/units.tsx'
import type { BoardGeom } from './geometry.ts'
import { dirAngle, hash, pts, tileCenter, tileQuad, tileScale, unitScale } from './geometry.ts'
import './board.css'

export type { IntentView } from './board/marks.ts'

export interface DirArrow {
  dir: Dir
  at: Pos
  active: boolean
}

export interface BoardProps {
  g: BoardGeom
  vc: CombatState
  ufx: Record<string, UnitFx>
  C: ContentRegistry
  lang: Lang
  intents: IntentView[]
  focusEnemy: string | null
  firing: string | null
  threat: Record<string, number> | null
  moves: Pos[]
  moveHover: Pos | null
  targets: Pos[]
  active: Pos[]
  activeHostile: boolean
  dirArrows: DirArrow[]
  preview: CombatPreview | null
  selectedUid: string | null
  originUid: string | null
  hoverPos: Pos | null
  incoming: { pos: Pos; enemyId: string }[]
  fx: FxItem[]
  dimIntents: boolean
  onTileEnter: (p: Pos | null) => void
  onTileClick: (p: Pos) => void
  onTileContext: () => void
  onDirClick: (d: Dir) => void
  onDirEnter: (d: Dir | null) => void
  registerFigure: (uid: string, el: HTMLElement | null) => void
  registerBoard: (el: HTMLElement | null) => void
  /** Touch aiming: the target picked by the first tap; a second tap there plays the card. */
  aimAt?: Pos | null
  aimLabel?: string
  /** The aim is a direction arrow (the chip goes above the button instead of under the tile centre). */
  aimDir?: boolean
}

export function Board({ registerBoard, ...props }: BoardProps) {
  const { g, vc, C, intents, preview } = props
  // The animator removes the dead after their death beat; never drop a unit just because hp hit 0 mid-hit.
  const units = vc.units
  const { tileDmg, danger } = aggregateIntents(intents, vc)
  const intentByUid: Record<string, IntentInfo> = {}
  for (const iv of intents) intentByUid[iv.uid] = iv.info
  const previewByUid: Record<string, CombatPreview['units'][number]> = {}
  for (const r of preview?.units ?? []) previewByUid[r.uid] = r

  const ground = groundMarks(vc.tiles)

  const hover = props.hoverPos
  const moveSet = new Set(props.moves.map(posKey))
  const targetSet = new Set(props.targets.map(posKey))

  const renderUnits = (layer: 'body' | 'hud') =>
    units.map((u) => {
      // X-ray (fade units in front of the hovered tile) is for inspecting/moving. While aiming a card it would
      // fade the very unit you are aiming at (the hover tile goes stale under the direction arrows), so it is off.
      const xray = !props.originUid && !!hover && hover.y < u.pos.y && u.pos.y - hover.y <= 2 && Math.abs(hover.x - u.pos.x) <= 1 && !(hover.x === u.pos.x && hover.y === u.pos.y)
      const reach = unitScale(C, u) > 1.2 ? 1 : 0
      // Fade the upper sprite when it would hide a unit or terrain (cover / hazard / void) right behind it.
      const terrainBehind = (dx: number) => {
        const t = vc.tiles[u.pos.y - 1]?.[u.pos.x + dx]
        return !!t && t.kind !== 'floor'
      }
      // Any unit behind counts, same side included: the party column (default formation) otherwise hides the
      // back-row companion, and a tall executor hides the spider standing behind it.
      // A boss-size sprite is two tiles tall, so it also hides the unit two rows back in its own column.
      // Terrain only fades normal-size units: a boss washed out by a cover block behind it reads as a ghost.
      const occluding =
        units.some(
          (v) =>
            v.uid !== u.uid && v.hp > 0 && ((v.pos.y === u.pos.y - 1 && Math.abs(v.pos.x - u.pos.x) <= reach) || (reach > 0 && v.pos.y === u.pos.y - 2 && v.pos.x === u.pos.x)),
        ) ||
        (reach === 0 && terrainBehind(0))
      const behind = posKey({ x: u.pos.x, y: u.pos.y - 1 })
      const hitShort =
        u.pos.y > 0 && (moveSet.has(behind) || targetSet.has(behind) || units.some((v) => v.uid !== u.uid && v.hp > 0 && v.pos.x === u.pos.x && v.pos.y === u.pos.y - 1))
      return (
        <UnitSprite
          key={u.uid}
          layer={layer}
          u={u}
          fx={props.ufx[u.uid]}
          g={g}
          scale={unitScale(C, u)}
          selected={props.selectedUid === u.uid}
          origin={props.originUid === u.uid}
          hovered={!!hover && hover.x === u.pos.x && hover.y === u.pos.y}
          xray={xray}
          occluding={occluding}
          hitShort={hitShort}
          danger={danger[u.uid] ?? 0}
          preview={previewByUid[u.uid]}
          intent={intentByUid[u.uid] ?? null}
          intentDim={!!props.focusEnemy && props.focusEnemy !== u.uid}
          bobSeed={hash(u.uid)}
          inFire={(vc.tiles[u.pos.y]?.[u.pos.x]?.fire ?? 0) > 0 && !u.flying}
          registerFigure={props.registerFigure}
          onEnter={props.onTileEnter}
          onClick={props.onTileClick}
        />
      )
    })

  return (
    <div className="m2c-board" ref={registerBoard} style={{ width: g.width, height: g.height }} onMouseLeave={() => props.onTileEnter(null)}>
      <svg className="m2c-plane" width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`}>
        <TileDefs />
        <BoardPlane g={g} tiles={vc.tiles} part="floor" />
        {/* threat heat (T / Alt) */}
        {props.threat &&
          Object.entries(props.threat).map(([k, v]) => {
            const [x, y] = k.split(',').map(Number) as [number, number]
            return <polygon key={`th${k}`} points={pts(tileQuad(g, { x, y }, 0.04))} className="m2c-heat" style={{ '--heat': Math.min(1, v / 8) } as CSSProperties} />
          })}
        {/* move range */}
        {props.moves.map((p) => (
          <polygon
            key={`mv${posKey(p)}`}
            points={pts(tileQuad(g, p, 0.06))}
            className={props.moveHover && props.moveHover.x === p.x && props.moveHover.y === p.y ? 'm2c-move is-hover' : 'm2c-move'}
          />
        ))}
        {/* intents */}
        <g className={props.dimIntents ? 'm2c-intents is-faded' : 'm2c-intents'}>
          {intents.map((iv) => (
            <IntentShapes key={iv.uid} g={g} iv={iv} dim={!!props.focusEnemy && props.focusEnemy !== iv.uid} hot={props.firing === iv.uid || props.focusEnemy === iv.uid} />
          ))}
        </g>
        {/* reinforcement drop zones */}
        {props.incoming.map((r, i) => (
          <polygon key={`in${i}`} points={pts(tileQuad(g, r.pos, 0.1))} className="m2c-incoming" />
        ))}
        {/* card targets */}
        {props.targets.map((p) => (
          <polygon key={`tg${posKey(p)}`} points={pts(tileQuad(g, p, 0.08))} className="m2c-target" />
        ))}
        {props.active.map((p) => (
          <polygon key={`ac${posKey(p)}`} points={pts(tileQuad(g, p, 0.04))} className={props.activeHostile ? 'm2c-active is-hostile' : 'm2c-active'} />
        ))}
        <BoardPlane g={g} tiles={vc.tiles} part="covers" />
        {hover && <polygon points={pts(tileQuad(g, hover, 0.02))} className={moveSet.has(posKey(hover)) ? 'm2c-hover is-move' : 'm2c-hover'} />}
        {/* hit areas */}
        <g className="m2c-hitgrid">
          {Array.from({ length: GRID_H * GRID_W }, (_, i) => {
            const p = { x: i % GRID_W, y: Math.floor(i / GRID_W) }
            return (
              <polygon
                key={`h${i}`}
                points={pts(tileQuad(g, p))}
                onMouseEnter={() => props.onTileEnter(p)}
                onClick={() => props.onTileClick(p)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  props.onTileContext()
                }}
              />
            )
          })}
        </g>
      </svg>

      {ground.length > 0 && (
        <div className="m2c-ground">
          {ground
            .filter((t) => t.fire > 0)
            .map((t) => {
              const hasF = (tx: number, ty: number) => (vc.tiles[ty]?.[tx]?.fire ?? 0) > 0
              const cluster = hasF(t.p.x, t.p.y - 1) || hasF(t.p.x + 1, t.p.y) || hasF(t.p.x, t.p.y + 1) || hasF(t.p.x - 1, t.p.y)
              return <GroundFire key={posKey(t.p)} g={g} p={t.p} turns={t.fire} cluster={cluster} />
            })}
        </div>
      )}

      <div className="m2c-units" onContextMenu={(e) => (e.preventDefault(), props.onTileContext())}>
        {renderUnits('body')}
      </div>
      <div className="m2c-huds">{renderUnits('hud')}</div>

      <div className="m2c-labels">
        <GroundBadges g={g} ground={ground} />
        <IntentLabels g={g} tileDmg={tileDmg} focusEnemy={props.focusEnemy} dimIntents={props.dimIntents} />
        {/* threat numbers */}
        {props.threat &&
          Object.entries(props.threat).map(([k, v]) => {
            const [x, y] = k.split(',').map(Number) as [number, number]
            const c = tileCenter(g, { x, y })
            return (
              <div key={`tn${k}`} className="m2c-heatnum" style={{ left: c.x, top: c.y }}>
                {v}
              </div>
            )
          })}
        {/* incoming reinforcements */}
        {props.incoming.map((r, i) => {
          const c = tileCenter(g, r.pos)
          return (
            <div key={`ir${i}`} className="m2c-inc" style={{ left: c.x, top: c.y }}>
              <CircleDot size={14} strokeWidth={2.6} />
              <span>{props.lang === 'ko' ? '증원' : 'INBOUND'}</span>
            </div>
          )
        })}
        <LockOns g={g} intents={intents} vc={vc} C={C} focusEnemy={props.focusEnemy} dimIntents={props.dimIntents} firing={props.firing} />
        <PreviewChips g={g} vc={vc} C={C} preview={preview} />
        {/* move destination: ghost + what waits there */}
        {props.moveHover && <MoveChip g={g} vc={vc} at={props.moveHover} selectedUid={props.selectedUid} tileDmg={tileDmg} intents={intents} lang={props.lang} />}
        {/* direction picker */}
        {props.dirArrows.map((a) => {
          const c = tileCenter(g, a.at)
          const ang = dirAngle(g, a.at, a.dir)
          return (
            <button
              key={`da${a.dir}`}
              type="button"
              className={a.active ? 'm2c-dir is-active' : 'm2c-dir'}
              style={{ left: c.x, top: c.y }}
              onMouseEnter={() => props.onDirEnter(a.dir)}
              onMouseLeave={() => props.onDirEnter(null)}
              onClick={() => props.onDirClick(a.dir)}
            >
              <span style={{ transform: `rotate(${ang}deg)` }}>
                <ChevronsRight size={20} strokeWidth={3} />
              </span>
            </button>
          )
        })}
        {/* touch: the aimed target waits for a second tap */}
        {props.aimAt &&
          props.aimLabel &&
          (() => {
            const c = tileCenter(g, props.aimAt)
            const top = props.aimDir ? c.y - 24 : c.y + g.tw * 0.34 * tileScale(g, props.aimAt)
            return (
              <div className={props.aimDir ? 'm2c-aimchip is-dir' : 'm2c-aimchip'} style={{ left: c.x, top }}>
                {props.aimLabel}
              </div>
            )
          })()}
      </div>

      <BoardFx g={g} fx={props.fx} />
    </div>
  )
}
