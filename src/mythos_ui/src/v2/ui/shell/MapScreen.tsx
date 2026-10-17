// Mythos 2.0 — act map (Slay-the-Spire style, boss at the top).
import { art } from '../components/art.ts'
import { CircleQuestionMark, Landmark, Package, Skull, Store, Swords, Tent, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapNode, NodeKind } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { STAT_LABEL, tr } from '../common/lang.ts'
import { NODE_HINT, NODE_LABEL, TRACE_EFFECT, TRACE_LABEL, traceTier } from '../components/format.ts'
import { sound } from '../components/sound.ts'
import { Tooltip } from '../components/Tooltip.tsx'
import { prefetchOpening } from './eventOpening.ts'
import { MapBanter } from './MapBanter.tsx'
import { ThoughtCabinet } from './ThoughtCabinet.tsx'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'
import './map.css'

const W = 600
const ROW_GAP = 92
const TOP = 96
const BOTTOM = 70

const ICON: Record<Exclude<NodeKind, 'boss'>, typeof Swords> = {
  combat: Swords,
  elite: Skull,
  event: CircleQuestionMark,
  shop: Store,
  rest: Tent,
  treasure: Package,
  district: Landmark,
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

export function MapScreen({ run, C, lang, act, settings, eventsSeen }: ScreenProps) {
  const [entering, setEntering] = useState<string | null>(null)
  const map = run.map
  const bossRow = Math.max(...Object.values(map.nodes).map((n) => n.row))
  const height = TOP + bossRow * ROW_GAP + BOTTOM
  const reachable = useMemo(() => new Set(rx.reachable(run)), [run])
  const visited = useMemo(() => new Set(run.visited), [run.visited])
  const scrollRef = useRef<HTMLDivElement>(null)
  const actDef = C.acts[run.act]
  const tier = traceTier(run.trace)

  const pos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {}
    for (const n of Object.values(map.nodes)) {
      if (n.kind === 'boss') {
        out[n.id] = { x: W / 2, y: TOP - 20 }
        continue
      }
      const jx = (hash(n.id) - 0.5) * 36
      const jy = (hash(n.id + 'y') - 0.5) * 22
      out[n.id] = { x: 90 + n.col * ((W - 180) / 3) + jx, y: TOP + (bossRow - n.row) * ROW_GAP + jy }
    }
    return out
  }, [map, bossRow])

  // Scroll so the current position (or the start row) sits in the lower-middle of the view.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const cur = run.nodeId ? pos[run.nodeId] : undefined
    const y = cur ? cur.y : height - BOTTOM
    el.scrollTo({ top: Math.max(0, y - el.clientHeight * 0.62), behavior: 'smooth' })
  }, [run.nodeId, pos, height])

  const bossNode = map.nodes[map.bossId]
  const bossEnc = bossNode?.encounterId ? C.encounters[bossNode.encounterId] : undefined
  const bossEnemy = bossEnc?.enemies[0] ? C.enemies[bossEnc.enemies[0].id] : undefined
  const bossImg = art.boss(bossNode?.encounterId) || art.boss(bossEnemy?.id) || (bossEnemy ? portrait(bossEnemy.sprite) : '')

  const enter = (n: MapNode) => {
    if (entering) return
    if (!reachable.has(n.id)) {
      sound('error')
      return
    }
    sound('map_step')
    setEntering(n.id)
    // Pure: compute the next state now so an event's GM opening starts during the enter animation.
    const next = rx.enterNode(run, n.id, C)
    prefetchOpening(next, C, lang, eventsSeen)
    window.setTimeout(() => act(next), settings.fastAnim ? 160 : 420)
  }
  const enterPos = entering ? pos[entering] : undefined

  const tipFor = (n: MapNode) => {
    const enc = n.encounterId ? C.encounters[n.encounterId] : undefined
    return (
      <div>
        <div className="m2-tip__title">{tr(NODE_LABEL[n.kind], lang)}</div>
        {enc && (n.kind === 'elite' || n.kind === 'boss') && (
          <div className="m2-tip__text" style={{ color: 'var(--m2-threat-2)' }}>
            {tr(enc.name, lang)}
          </div>
        )}
        <div className="m2-tip__text">{tr(NODE_HINT[n.kind], lang)}</div>
        {reachable.has(n.id) && (
          <div className="m2-tip__text" style={{ color: 'var(--m2-amber)', marginTop: 4 }}>
            {lang === 'ko' ? '이동 시 추적 +3' : 'Entering adds +3 Trace'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="m2-map">
      <MapBanter run={run} C={C} lang={lang} fast={settings.fastAnim} />
      <div className={`m2-map__bg${art.map(run.act) ? ' is-map-art' : ''}`} style={{ backgroundImage: `url(${art.map(run.act) || art.act(run.act, actDef?.image)})` }} />
      <aside className="m2-map__side">
        <div className="m2-map__actnum">{lang === 'ko' ? `${run.act}막 / 3` : `Act ${run.act} of 3`}</div>
        <h1 className="m2-map__title">{actDef ? tr(actDef.name, lang) : ''}</h1>
        <p className="m2-map__sub">{actDef ? tr(actDef.subtitle, lang) : ''}</p>

        {/* Thoughts live in the map's side panel: never over another screen's buttons. */}
        <ThoughtCabinet run={run} C={C} lang={lang} act={act} />

        {(run.growth ?? 0) > 0 && (
          <div className="m2-growth" data-testid="growth">
            <div className="m2-growth__head">
              <TrendingUp size={14} /> {lang === 'ko' ? `성장 포인트 ${run.growth}` : `${run.growth} growth point${(run.growth ?? 0) > 1 ? 's' : ''}`}
              <small>{lang === 'ko' ? '사건 판정에 쓰이는 능력치 +1' : '+1 to a stat used in event checks'}</small>
            </div>
            <div className="m2-growth__stats">
              {(['str', 'agi', 'int', 'cha', 'obs'] as const).map((k) => (
                <button
                  key={k}
                  disabled={(run.stats[k] ?? 0) >= 10}
                  onClick={() => {
                    sound('reward')
                    act(rx.spendGrowth(run, k))
                  }}
                >
                  <b>{tr(STAT_LABEL[k], lang)}</b>
                  <span className="m2-mono">{run.stats[k]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`m2-map__trace m2-map__trace--${tier}`}>
          <div className="m2-map__trace-row">
            <span>{lang === 'ko' ? '추적도' : 'Trace'}</span>
            <b className="m2-mono">{run.trace}</b>
          </div>
          <div className="m2-map__trace-bar">
            <div style={{ width: `${Math.min(100, run.trace)}%` }} />
          </div>
          <div className="m2-map__trace-tier">
            <b>{tr(TRACE_LABEL[tier], lang)}</b> {tr(TRACE_EFFECT[tier], lang)}
          </div>
        </div>

        <ul className="m2-legend">
          {(['combat', 'elite', 'event', 'shop', 'rest', 'treasure', ...(run.crpg ? (['district'] as const) : [])] as const).map((k) => {
            const Icon = ICON[k]
            return (
              <li key={k} className={`m2-legend__item m2-node--${k}`}>
                <span className="m2-legend__ico">
                  <Icon size={14} />
                </span>
                {tr(NODE_LABEL[k], lang)}
              </li>
            )
          })}
        </ul>
        <p className="m2-map__help">
          {run.nodeId === null
            ? lang === 'ko'
              ? '출발 지점을 고른다. 경로는 위로만 이어진다.'
              : 'Choose a starting point. Paths only lead upward.'
            : lang === 'ko'
              ? '빛나는 노드로 이동한다.'
              : 'Move to a glowing node.'}
        </p>
      </aside>

      <div className="m2-map__scroll" ref={scrollRef}>
        <div className={`m2-map__board${entering ? ' is-entering' : ''}`} style={{ width: W, height, transformOrigin: enterPos ? `${enterPos.x}px ${enterPos.y}px` : undefined }}>
          <svg className="m2-map__edges" width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
            {Object.values(map.nodes).flatMap((n) =>
              n.next.map((to) => {
                const a = pos[n.id]
                const b = pos[to]
                if (!a || !b) return null
                const taken = visited.has(n.id) && visited.has(to)
                const open = n.id === run.nodeId && reachable.has(to)
                return <line key={`${n.id}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={taken ? 'is-taken' : open ? 'is-open' : ''} />
              }),
            )}
          </svg>
          {Object.values(map.nodes).map((n) => {
            const p = pos[n.id]
            if (!p) return null
            const isCur = n.id === run.nodeId
            const isReach = reachable.has(n.id)
            const isVisited = visited.has(n.id)
            const cls = [
              'm2-node',
              `m2-node--${n.kind}`,
              isCur ? 'is-current' : '',
              isReach ? 'is-reach' : '',
              isVisited && !isCur ? 'is-visited' : '',
              !isReach && !isVisited && !isCur ? 'is-idle' : '',
            ]
              .filter(Boolean)
              .join(' ')
            if (n.kind === 'boss') {
              return (
                <div key={n.id} className="m2-node-wrap" style={{ left: p.x, top: p.y }}>
                  <Tooltip content={tipFor(n)} placement="bottom">
                    <button className={cls} onClick={() => enter(n)} aria-label={tr(NODE_LABEL.boss, lang)}>
                      {bossImg ? <img src={bossImg} alt="" /> : <Skull size={34} />}
                    </button>
                  </Tooltip>
                  <div className="m2-node__bossname">{bossEnemy ? tr(bossEnemy.name, lang) : tr(NODE_LABEL.boss, lang)}</div>
                </div>
              )
            }
            const Icon = ICON[n.kind]
            return (
              <div key={n.id} className="m2-node-wrap" style={{ left: p.x, top: p.y }}>
                <Tooltip content={tipFor(n)}>
                  <button
                    className={cls}
                    onClick={() => enter(n)}
                    onMouseEnter={() =>
                      isReach && sound(n.kind === 'elite' || n.kind === 'boss' ? 'telegraph' : 'ui_hover', n.kind === 'elite' || n.kind === 'boss' ? { volume: 0.5 } : undefined)
                    }
                    aria-label={tr(NODE_LABEL[n.kind], lang)}
                  >
                    <Icon size={n.kind === 'elite' ? 22 : 19} strokeWidth={2.2} />
                  </button>
                </Tooltip>
                {isCur && <div className="m2-node__you">{lang === 'ko' ? '현재 위치' : 'You'}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
