// Mythos 2.0 — combat screen ("Breach Protocol").
//
// Owns: selection / targeting / preview state, the local copy of the combat (so animations can
// run on the pre-action view), keyboard, layout, and the hand-off back to the shell. Rendering
// of the board lives in Board.tsx; the event timeline + game feel in animator.ts.
//
// Layouts: 'desk' (≥ 900 × 480, the original HUD), and two phone layouts picked from the root's size —
// 'port' (board under a party strip, inspector peek, hand + controls below) and 'land' (board between
// two thin columns, the hand peeking from the bottom edge). Touch (any non-mouse pointer, see touch.ts):
// taps replace hover — tap a unit / tile to pin the inspector, tap a card target once to preview and
// again to play, hold a card to read it.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Layers, Trash2, Flame, BookOpen, Undo2, FastForward, Maximize2, X } from 'lucide-react'
import {
  canPlay,
  cardFace,
  consumableTargets,
  endTurn,
  intentInfo,
  legalMoves,
  moveUnit,
  partyOrigins,
  playCard,
  previewConsumable,
  previewPlay,
  selectableTargets,
  threatMap,
  undoMove,
  useConsumable as applyConsumable,
} from '../../engine/combat.ts'
import type { CombatPreview, TargetOption } from '../../engine/combat.ts'
import { add, dirToward, inBounds, posKey, samePos } from '../../engine/grid.ts'
import type { CombatState, ContentRegistry, Dir, Lang, PlayTarget, Pos, RunState, UnitState } from '../../engine/types.ts'
import { ART, CONSUMABLE_ART } from '../common/artManifest.ts'
import { BACKDROPS, asset } from '../common/assets.ts'
import { playBgm } from '../common/audio.ts'
import type { Bgm } from '../common/audio.ts'
import { tr } from '../common/lang.ts'
import { setMusicDuck, sfx } from '../common/sfx.ts'
import { CardView } from '../components/CardView.tsx'
import { Tooltip } from '../components/Tooltip.tsx'
import { useCombatAnimator, viewFrom } from './animator.ts'
import type { FxItem, RectLike } from './animator.ts'
import { Board } from './Board.tsx'
import type { DirArrow, IntentView } from './Board.tsx'
import { Coach } from './Coach.tsx'
import { tutorialDone } from './describe.ts'
import { fitTileWidth, fitTileWidthFor, makeGeom } from './geometry.ts'
import type { GeomOpts } from './geometry.ts'
import { Hand } from './Hand.tsx'
import { DetailPanel, PartyPanel, PileModal, TopStrip } from './Panels.tsx'
import { isTouch, watchPointer } from './touch.ts'
import '../../v2.css'
import './combat.css'

export interface CombatScreenProps {
  run: RunState
  combat: CombatState
  C: ContentRegistry
  lang: Lang
  settings: { fastAnim: boolean; sfx: boolean; bgm: boolean }
  onCombatChange: (c: CombatState) => void
  onOpenDeck?: () => void
}

type Armed = { kind: 'card'; uid: string } | { kind: 'item'; index: number }

function sameMoment(a: CombatState, b: CombatState): boolean {
  return a.encounterId === b.encounterId && a.events.length === b.events.length && a.turn === b.turn && a.phase === b.phase && a.hand.length === b.hand.length
}

function targetOf(o: TargetOption): PlayTarget {
  const t: PlayTarget = {}
  if (o.pos) t.pos = o.pos
  if (o.dir) t.dir = o.dir
  return t
}

/** Identity of a target option across renders (touch aiming compares the first and second tap). */
function optKey(o: TargetOption): string {
  return `${o.dir ?? ''}|${o.pos ? posKey(o.pos) : ''}`
}

function uniq(list: Pos[]): Pos[] {
  const seen = new Set<string>()
  return list.filter((p) => (seen.has(posKey(p)) ? false : (seen.add(posKey(p)), true)))
}

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-9px) rotate(-1.5deg)' },
  { transform: 'translateX(8px) rotate(1.2deg)' },
  { transform: 'translateX(-5px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
]

/** Ignore end-turn input this long after a new player turn starts (fast-forward overshoot). */
const TURN_GRACE_MS = 700

type LayoutMode = 'desk' | 'port' | 'land'

/** Phone boards: a flatter, steeper plane than the desktop's so far-row tiles stay ~40 px to a finger, with
 *  less dead margin (the root clips anyway). Desktop keeps makeGeom's defaults. */
const GEOM: Record<LayoutMode, GeomOpts | undefined> = {
  desk: undefined,
  port: { farScale: 0.88, rowRatio: 0.88, topPad: 1.15, bottomPad: 0.42, sidePad: 0.06 },
  land: { farScale: 0.9, rowRatio: 0.74, topPad: 1.15, bottomPad: 0.3, sidePad: 0.1 },
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface Layout {
  topH: number
  /** CardView font size in the hand (card = 10.6em × 15em). */
  fs: number
  bottomH: number
  sideW: number
  handW: number
  tw: number
  /** The board is placed inside this vertical band, `bias` of the spare height above it. */
  bandTop: number
  bandH: number
  bias: number
  /** port: party strip and inspector peek heights; land: visible part of the hand. */
  partyH: number
  peekH: number
  handPeek: number
}

function computeLayout(mode: LayoutMode, W: number, H: number): Layout {
  if (mode === 'port') {
    const topH = 62
    const partyH = 46
    const peekH = 54
    const fs = clamp(Math.min(W / 34, H / 72), 9, 11.5)
    // hand (+ the number tabs above it) · draw / piles / items row · orb + end turn row · padding
    const bottomH = Math.round(fs * 15 + 16) + 36 + 50 + 12 + 8
    const bandTop = topH + partyH
    const bandH = H - bandTop - peekH - bottomH - 6
    const tw = fitTileWidthFor(W - 6, bandH, GEOM.port ?? {}, 36, 96)
    // The fan's outer cards tilt out past their slot: keep them off the screen edge.
    return { topH, fs, bottomH, sideW: W - 16, handW: W - 50, tw, bandTop, bandH, bias: 0.5, partyH, peekH, handPeek: 0 }
  }
  if (mode === 'land') {
    // The top strip only uses the side columns, so the board gets the full height above the hand.
    const topH = 30
    const fs = clamp(H / 42, 8, 10.5)
    const handPeek = Math.round(fs * 15 * 0.6)
    const sideW = Math.round(clamp(W * 0.2, 150, 220))
    const bottomH = Math.max(handPeek + 8, 122)
    const bandH = H - handPeek - 6
    const tw = fitTileWidthFor(W - 2 * (sideW + 8), bandH, GEOM.land ?? {}, 36, 120)
    return { topH, fs, bottomH, sideW, handW: W - 2 * sideW - 24, tw, bandTop: 0, bandH, bias: 0.5, partyH: 0, peekH: 0, handPeek }
  }
  const topH = 40
  const fs = Math.max(9.4, Math.min(13, H * 0.0152))
  const ch = fs * 15
  const bottomH = Math.round(ch + 24)
  const sideW = Math.round(Math.max(188, Math.min(252, W * 0.165)))
  const availW = W - 2 * (sideW + 12)
  const availH = H - topH - bottomH - 6
  const tw = fitTileWidth(availW, availH)
  return { topH, fs, bottomH, sideW, handW: W - 2 * sideW - 24, tw, bandTop: topH + 2, bandH: availH, bias: 0.62, partyH: 0, peekH: 0, handPeek: 0 }
}

export function CombatScreen(props: CombatScreenProps) {
  const { C, lang, settings } = props
  const k = lang === 'ko'

  // ------------------------------------------------------------ local combat copy
  const [combat, setCombat] = useState(props.combat)
  const [echo, setEcho] = useState(props.combat)
  if (props.combat !== echo) {
    setEcho(props.combat)
    if (!sameMoment(props.combat, combat)) setCombat(props.combat)
  }

  const anim = useCombatAnimator(C, props.combat, settings.fastAnim, lang)
  const { registerStage, registerHurt, registerBoard, registerFigure } = anim
  const derived = useMemo(() => viewFrom(combat), [combat])
  const view = anim.busy || anim.view.base === combat ? anim.view : { ...derived, banner: anim.view.banner, flashImplant: anim.view.flashImplant }
  const vc: CombatState = useMemo(() => ({ ...view.base, units: view.units, tiles: view.tiles }), [view.base, view.units, view.tiles])

  const [ending, setEnding] = useState(false)
  /** `encounter#turn` of the last move/card the player committed — see canQueueEnd. */
  const [actedTurn, setActedTurn] = useState('')
  const turnKey = `${combat.encounterId}#${combat.turn}`
  const interactive = !anim.busy && combat.phase === 'player' && !ending
  /** The enemy phase is playing: the end-turn button / Space fast-forward it. */
  const canHurry = anim.busy && view.enemyPhase && !ending
  /** One of *this turn's* player actions is animating: an end-turn press is queued until it settles. Never during
   *  the turn-start sequence after an enemy phase — mashing E to fast-forward would otherwise skip the new turn. */
  const canQueueEnd = anim.busy && !view.enemyPhase && combat.phase === 'player' && !ending && actedTurn === turnKey
  const endQueued = useRef(false)
  const hurryQueued = useRef(false)
  /** When the current player turn became playable (after an enemy phase). */
  const turnReadyAt = useRef(0)
  const wasEnemyPhase = useRef(false)
  useEffect(() => {
    if (view.enemyPhase) wasEnemyPhase.current = true
    else if (wasEnemyPhase.current) {
      wasEnemyPhase.current = false
      turnReadyAt.current = performance.now()
    }
  }, [view.enemyPhase])
  const enc = C.encounters[combat.encounterId]

  // ------------------------------------------------------------ layout
  const rootRef = useRef<HTMLDivElement>(null)
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 1280, h: 720 })
  // Height: an ancestor may pin it with --m2c-h; otherwise fill the viewport below wherever we start
  // (the shell's fixed top bar pads the stage), so the fight never scrolls.
  const [autoH, setAutoH] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setRootEl(el)
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r && r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    const fit = () => {
      if (getComputedStyle(el).getPropertyValue('--m2c-h').trim()) {
        setAutoH(null)
        return
      }
      const top = el.getBoundingClientRect().top + window.scrollY
      // Phones (narrow, or a short landscape screen) fit whatever height they have.
      const floor = window.innerWidth >= 900 && window.innerHeight >= 560 ? 520 : 280
      setAutoH(Math.max(floor, Math.round(window.innerHeight - top)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])
  const W = size.w
  const H = size.h
  const mode: LayoutMode = W >= 900 && H >= 480 ? 'desk' : W >= H * 1.2 ? 'land' : 'port'
  const compact = mode !== 'desk'
  const lay = computeLayout(mode, W, H)
  const { topH, fs, bottomH, sideW, tw, handW } = lay
  const g = useMemo(() => makeGeom(tw, GEOM[mode]), [tw, mode])
  const boardLeft = Math.round((W - g.width) / 2)
  const boardTop = Math.round(lay.bandTop + Math.max(0, lay.bandH - g.height) * lay.bias)

  // Touch UI (wording, key hints) follows the last real pointer; hover handlers ask isTouch() directly.
  const [touchUI, setTouchUI] = useState(isTouch)
  useEffect(() => watchPointer(setTouchUI), [])
  /** Phone layouts: the inspector sheet is expanded. */
  const [sheet, setSheet] = useState(false)
  /** Phone layouts: the help popover (the desktop's key legend has no room). */
  const [help, setHelp] = useState(false)
  /** Touch long press on a card: show it large. */
  const [zoom, setZoom] = useState<string | null>(null)

  // ------------------------------------------------------------ selection & targeting
  const [sel, setSel] = useState<string>('connector')
  const [armed, setArmed] = useState<Armed | null>(null)
  const [hoverPos, setHoverPos] = useState<Pos | null>(null)
  const [hoverDir, setHoverDir] = useState<Dir | null>(null)
  const [hoverCard, setHoverCard] = useState<string | null>(null)
  const [panelHover, setPanelHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [threatOn, setThreatOn] = useState(false)
  const [altHeld, setAltHeld] = useState(false)
  const [pile, setPile] = useState<'draw' | 'discard' | 'exhaust' | null>(null)
  const [legend, setLegend] = useState(true)
  const [coach, setCoach] = useState(() => !tutorialDone())
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)

  const living = (uid: string) => combat.units.find((u) => u.uid === uid && u.hp > 0)
  const selUnit = living(sel) ?? living('connector') ?? combat.units.find((u) => u.side === 'party' && u.hp > 0)
  const selUid = selUnit?.uid ?? null

  const armedCard = armed?.kind === 'card' ? combat.hand.find((c) => c.uid === armed.uid) : undefined
  const armedDef = armedCard ? C.cards[armedCard.defId] : undefined
  const armedFace = armedDef && armedCard ? cardFace(armedDef, armedCard.upgraded) : undefined
  const itemIndex = armed?.kind === 'item' ? armed.index : -1
  const itemId = itemIndex >= 0 ? combat.consumables[itemIndex] : undefined
  const itemDef = itemId ? C.consumables[itemId] : undefined
  const isArmed = !!armedCard || !!itemDef

  const originFor = useCallback(
    (cardUid: string): string | null => {
      const inst = combat.hand.find((c) => c.uid === cardUid)
      const def = inst ? C.cards[inst.defId] : undefined
      if (!def) return null
      if (def.owner === 'any') {
        const origins = partyOrigins(combat, C, cardUid)
        return selUid && origins.includes(selUid) ? selUid : (origins[0] ?? selUid)
      }
      return def.owner
    },
    [combat, C, selUid],
  )

  const origin = armedCard ? originFor(armedCard.uid) : itemDef ? selUid : null
  const originUnit = origin ? living(origin) : undefined
  const tmode = (armedFace?.target ?? itemDef?.target)?.mode
  const confirmMode = tmode === 'none' || tmode === 'self'

  const options: TargetOption[] = useMemo(() => {
    if (!origin) return []
    if (armedCard) return selectableTargets(combat, C, armedCard.uid, origin)
    if (itemDef) return consumableTargets(combat, C, itemIndex, origin)
    return []
  }, [combat, C, armedCard, itemDef, itemIndex, origin])

  const resolveAt = useCallback(
    (p: Pos): TargetOption | undefined => {
      if (confirmMode) return options[0]
      const exact = options.find((o) => samePos(o.pos, p))
      if (exact) return exact
      if (originUnit && (tmode === 'line' || tmode === 'beam' || tmode === 'melee') && (p.x === originUnit.pos.x || p.y === originUnit.pos.y)) {
        const d = dirToward(originUnit.pos, p)
        return options.find((o) => o.dir === d)
      }
      return undefined
    },
    [confirmMode, options, originUnit, tmode],
  )

  const activeOpt = !isArmed ? undefined : confirmMode ? options[0] : hoverDir ? options.find((o) => o.dir === hoverDir) : hoverPos ? resolveAt(hoverPos) : undefined

  const preview: CombatPreview | null = useMemo(() => {
    if (!activeOpt || !origin || !interactive) return null
    try {
      if (armedCard) return previewPlay(combat, C, armedCard.uid, origin, targetOf(activeOpt))
      if (itemDef) return previewConsumable(combat, C, itemIndex, origin, targetOf(activeOpt))
    } catch {
      return null
    }
    return null
  }, [activeOpt, origin, interactive, armedCard, itemDef, itemIndex, combat, C])

  const hoverCardOrigin = hoverCard && !isArmed ? originFor(hoverCard) : null
  const targets: Pos[] = useMemo(() => {
    if (isArmed) {
      if (confirmMode) return []
      return uniq(options.flatMap((o) => (tmode === 'beam' ? o.tiles : o.pos ? [o.pos] : [])))
    }
    if (hoverCard && hoverCardOrigin && interactive) {
      try {
        return uniq(selectableTargets(combat, C, hoverCard, hoverCardOrigin).flatMap((o) => (o.pos ? [o.pos] : o.tiles)))
      } catch {
        return []
      }
    }
    return []
  }, [isArmed, confirmMode, options, tmode, hoverCard, hoverCardOrigin, interactive, combat, C])

  // Touch aiming: the first tap on a card target previews it (sets hoverPos / hoverDir like a mouse hover would),
  // a second tap on the same target plays it. Keyed to the armed object + origin, so re-arming starts over.
  const [aim, setAim] = useState<{ armed: Armed; origin: string | null; key: string } | null>(null)
  const aimKey = aim && armed && aim.armed === armed && aim.origin === origin ? aim.key : null
  const aimAt: { at: Pos; dir: boolean } | null = useMemo(() => {
    if (!aimKey || confirmMode || !interactive) return null
    const o = options.find((x) => optKey(x) === aimKey)
    if (!o) return null
    // Line / beam cards are aimed by direction: the chip sits on that direction's arrow.
    const arrow = o.dir && originUnit && (tmode === 'line' || tmode === 'beam') ? add(originUnit.pos, o.dir) : null
    if (arrow && inBounds(arrow)) return { at: arrow, dir: true }
    return o.pos ? { at: o.pos, dir: false } : null
  }, [aimKey, confirmMode, interactive, options, originUnit, tmode])
  /** Touch: aim at `o` unless it is already aimed. True when this tap only aimed. */
  const aimFirst = (o: TargetOption, at: { pos?: Pos; dir?: Dir }): boolean => {
    if (!isTouch() || !armed || aimKey === optKey(o)) return false
    setAim({ armed, origin, key: optKey(o) })
    setHoverPos(at.pos ?? null)
    setHoverDir(at.dir ?? null)
    sfx('ui_click')
    return true
  }

  const active = activeOpt ? (activeOpt.tiles.length ? activeOpt.tiles : activeOpt.pos ? [activeOpt.pos] : []) : []
  const activeHostile = armedDef ? armedDef.type === 'attack' : !!itemDef?.effects.some((e) => e.kind === 'damage')

  const dirArrows: DirArrow[] = useMemo(() => {
    if (!isArmed || !originUnit || (tmode !== 'line' && tmode !== 'beam')) return []
    const out: DirArrow[] = []
    for (const o of options) {
      if (!o.dir) continue
      const at = add(originUnit.pos, o.dir)
      if (inBounds(at)) out.push({ dir: o.dir, at, active: activeOpt?.dir === o.dir })
    }
    return out
  }, [isArmed, originUnit, tmode, options, activeOpt])

  const moves = useMemo(() => {
    if (!interactive || isArmed || !selUnit || selUnit.moved) return []
    return legalMoves(combat, selUnit.uid)
  }, [interactive, isArmed, selUnit, combat])
  const moveHover = hoverPos && moves.some((m) => samePos(m, hoverPos)) ? hoverPos : null

  // ------------------------------------------------------------ intents / threat
  const intents: IntentView[] = useMemo(() => {
    const out: IntentView[] = []
    for (const u of vc.units) {
      if (u.side !== 'enemy' || u.hp <= 0 || !u.intent) continue
      if (view.pendingIntents && !view.pendingIntents.includes(u.uid)) continue
      if (view.ufx[u.uid]?.dying) continue
      const info = intentInfo(vc, C, u.uid)
      if (info) out.push({ uid: u.uid, unit: u, info })
    }
    return out
  }, [vc, C, view.pendingIntents, view.ufx])

  // While a card preview moves or kills units, re-aim the telegraphs on the predicted board: pushing an enemy
  // drags its relative attack along, a kill removes it — the player sees the consequence before committing.
  const shownIntents: IntentView[] = useMemo(() => {
    if (!preview || !preview.units.some((r) => r.to || r.dies)) return intents
    const rows = new Map(preview.units.map((r) => [r.uid, r]))
    const predicted: CombatState = {
      ...vc,
      units: vc.units.map((u) => {
        const r = rows.get(u.uid)
        return r ? { ...u, pos: r.to ? { ...r.to } : u.pos, hp: r.hpAfter } : u
      }),
    }
    const out: IntentView[] = []
    for (const iv of intents) {
      const unit = predicted.units.find((u) => u.uid === iv.uid)
      if (!unit || unit.hp <= 0) continue
      const info = intentInfo(predicted, C, iv.uid)
      if (info) out.push({ uid: iv.uid, unit, info })
    }
    return out
  }, [preview, intents, vc, C])

  const showThreat = (threatOn || altHeld) && !view.enemyPhase
  const threat = useMemo(() => (showThreat ? threatMap(vc, C) : null), [showThreat, vc, C])

  const hoverUnit = hoverPos ? vc.units.find((u) => u.hp > 0 && samePos(u.pos, hoverPos)) : undefined
  const panelUnit = panelHover ? vc.units.find((u) => u.uid === panelHover) : undefined
  const pinnedUnit = pinned ? vc.units.find((u) => u.uid === pinned && u.hp > 0) : undefined
  const focusEnemy = isArmed ? null : (hoverUnit?.side === 'enemy' ? hoverUnit.uid : panelUnit?.side === 'enemy' ? panelUnit.uid : (pinnedUnit?.uid ?? null))
  const detailUnit = panelUnit ?? hoverUnit ?? pinnedUnit ?? (isArmed ? originUnit : undefined) ?? (hoverPos ? undefined : selUnit) ?? null
  const detailIntent = detailUnit && detailUnit.side === 'enemy' ? (intents.find((i) => i.uid === detailUnit.uid)?.info ?? null) : null
  const hoverTile = hoverPos && !hoverUnit ? (vc.tiles[hoverPos.y]?.[hoverPos.x] ?? null) : null
  const hoverThreat = hoverPos ? (threatMap(vc, C)[posKey(hoverPos)] ?? 0) : 0

  // Expected hp loss per squad member this enemy phase (party hp-bar threat segment + end-turn warning).
  // Walks the hits in firing order so Mark counts (+N on the next hit, and Lock On re-marks after each hit),
  // then takes armor and current block off — the raw tile sum under-read a marked Ghost by half.
  const danger = useMemo(() => {
    const out: Record<string, number> = {}
    for (const u of vc.units) {
      if (u.side === 'enemy' || u.hp <= 0) continue
      let mark = u.statuses.mark ?? 0
      let total = 0
      for (const iv of shownIntents) {
        if (iv.info.windupLeft > 0 || (iv.unit.statuses.shock ?? 0) > 0 || iv.info.damage <= 0) continue
        if (!iv.info.tiles.some((p) => samePos(p, u.pos) && !samePos(p, iv.unit.pos))) continue
        total += Math.max(0, iv.info.damage + mark - u.armor)
        mark = 0
        for (const e of iv.info.move.effects ?? []) if (e.kind === 'status' && e.status === 'mark' && !e.to) mark += e.amount
      }
      const lost = total - u.block
      if (lost > 0) out[u.uid] = lost
    }
    return out
  }, [shownIntents, vc.units])

  // ------------------------------------------------------------ playable cards
  const playable = useMemo(() => {
    const out: Record<string, { ok: boolean; reason?: string }> = {}
    for (const card of combat.hand) {
      const o = originFor(card.uid) ?? 'connector'
      const r = canPlay(combat, C, card.uid, o)
      out[card.uid] = r.ok ? { ok: true } : r.reason ? { ok: false, reason: tr(r.reason, lang) } : { ok: false }
    }
    return out
  }, [combat, C, originFor, lang])
  const anyPlayable = Object.values(playable).some((p) => p.ok)

  // ------------------------------------------------------------ actions
  const timers = useRef<number[]>([])
  useEffect(() => {
    const list = timers.current
    return () => {
      for (const t of list) window.clearTimeout(t)
    }
  }, [])

  const showToast = useCallback((text: string) => {
    setToast({ text, key: Date.now() })
    const t = window.setTimeout(() => setToast((cur) => (cur && cur.text === text ? null : cur)), 1600)
    timers.current.push(t)
  }, [])

  const finishCombat = useCallback(
    (next: CombatState) => {
      setEnding(true)
      const won = next.phase === 'won'
      const st = next.stats
      const bonusOk = next.bonus && !next.bonus.failed
      const sub = won
        ? k
          ? `처치 ${st.enemiesKilled} · 환경 처치 ${st.environmentKills} · 받은 피해 ${st.damageTaken}${bonusOk ? ' · ★ 보너스 달성' : ''}`
          : `${st.enemiesKilled} kills · ${st.environmentKills} environment · ${st.damageTaken} damage taken${bonusOk ? ' · ★ bonus met' : ''}`
        : k
          ? '접속자의 신호가 끊겼다'
          : 'The Connector has gone dark'
      // A boss fight ends on the boss: name it ("관리자 IX 정지") instead of a generic VICTORY.
      const boss = (enc?.enemies ?? []).map((e) => C.enemies[e.id]).find((d) => d?.tier === 'boss')
      const winTitle = boss ? (k ? `${tr(boss.name, lang)} 정지` : `${tr(boss.name, lang).toUpperCase()} DOWN`) : k ? '승리' : 'VICTORY'
      anim.banner({ kind: won ? 'victory' : 'defeat', title: won ? winTitle : k ? '신호 소실' : 'SIGNAL LOST', sub }, 4000)
      sfx(won ? 'victory' : 'defeat')
      setMusicDuck(true)
      const t = window.setTimeout(
        () => {
          setMusicDuck(false)
          props.onCombatChange(next)
        },
        won ? 1500 : 1900,
      )
      timers.current.push(t)
    },
    [anim, k, props, enc, C, lang],
  )

  const commitAction = useCallback(
    (next: CombatState, opts: { card?: { rect: RectLike; upgraded: boolean }; endTurn?: boolean } = {}) => {
      const prev = combat
      if (!opts.endTurn) setActedTurn(`${prev.encounterId}#${prev.turn}`)
      setCombat(next)
      setArmed(null)
      setHoverDir(null)
      // Touch "hover" is a tap focus: the action consumed it.
      if (isTouch()) setHoverPos(null)
      const ended = next.phase !== 'player'
      if (!ended) {
        setEcho(next)
        props.onCombatChange(next)
      }
      const playOpts: Parameters<typeof anim.play>[2] = {
        from: prev.events.length,
        onDone: () => {
          if (ended) finishCombat(next)
        },
      }
      if (opts.card) playOpts.card = opts.card
      if (opts.endTurn) playOpts.endTurn = true
      anim.play(prev, next, playOpts)
    },
    [combat, props, anim, finishCombat],
  )

  const relRect = (el: Element): RectLike | undefined => {
    const root = rootRef.current
    if (!root) return undefined
    const a = root.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    return { left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height }
  }

  const playOpt = (opt: TargetOption) => {
    if (!origin || !interactive) return
    try {
      if (armedCard) {
        const el = rootRef.current?.querySelector(`[data-card-uid="${armedCard.uid}"] .m2-card`)
        const rect = el ? relRect(el) : undefined
        const next = playCard(combat, C, armedCard.uid, origin, targetOf(opt))
        commitAction(next, rect ? { card: { rect, upgraded: armedCard.upgraded } } : {})
      } else if (itemDef) {
        commitAction(applyConsumable(combat, C, itemIndex, origin, targetOf(opt)))
      }
    } catch {
      sfx('error')
    }
  }

  const onCard = (uid: string, el: HTMLElement) => {
    // While the previous card is still animating a card can be armed (never played), so quick
    // players don't lose the click.
    if (!interactive && !canQueueEnd) return
    endQueued.current = false
    const pl = playable[uid]
    if (!pl?.ok) {
      el.animate(SHAKE, { duration: 320, easing: 'ease-out' })
      sfx('error')
      if (pl?.reason) showToast(pl.reason)
      return
    }
    if (armed?.kind === 'card' && armed.uid === uid) {
      if (!interactive) return
      if (confirmMode && options[0]) playOpt(options[0])
      else {
        setArmed(null)
        sfx('ui_click')
      }
      return
    }
    const inst = combat.hand.find((c) => c.uid === uid)
    const def = inst ? C.cards[inst.defId] : undefined
    if (def && def.owner !== 'any') setSel(def.owner)
    setArmed({ kind: 'card', uid })
    setHoverDir(null)
    if (isTouch()) setHoverPos(null)
    sfx('ui_click')
  }

  const onItem = (index: number) => {
    if (!interactive || !selUid) return
    const id = combat.consumables[index]
    const def = id ? C.consumables[id] : undefined
    if (!def) return
    if (armed?.kind === 'item' && armed.index === index) {
      const m = def.target.mode
      if (m === 'none' || m === 'self') {
        const opts = consumableTargets(combat, C, index, selUid)
        if (opts[0]) playOpt(opts[0])
      } else setArmed(null)
      return
    }
    if (consumableTargets(combat, C, index, selUid).length === 0) {
      sfx('error')
      showToast(k ? '사용할 대상이 없다' : 'No valid target')
      return
    }
    setArmed({ kind: 'item', index })
    if (isTouch()) {
      setHoverPos(null)
      setHoverDir(null)
    }
    sfx('ui_click')
  }

  const onTileClick = (p: Pos) => {
    if (!interactive) {
      // Mid-animation: still let the player pick which unit acts next (no state change).
      const mate = canQueueEnd && !isArmed ? combat.units.find((x) => samePos(x.pos, p) && x.hp > 0 && x.side === 'party') : undefined
      if (mate) {
        setSel(mate.uid)
        setPinned(null)
      }
      return
    }
    if (isArmed) {
      if (confirmMode) {
        // Self/untargeted cards: clicking the origin or anything the card touches plays it; elsewhere cancels.
        const o = options[0]
        if (o && ((originUnit && samePos(originUnit.pos, p)) || o.tiles.some((t) => samePos(t, p)))) return playOpt(o)
        setArmed(null)
        return
      }
      const opt = resolveAt(p)
      if (opt) {
        if (aimFirst(opt, { pos: p })) return
        return playOpt(opt)
      }
      const u = living(combat.units.find((x) => samePos(x.pos, p) && x.hp > 0)?.uid ?? '')
      if (u && u.side === 'party' && ((armedDef?.owner === 'any' && armedCard && partyOrigins(combat, C, armedCard.uid).includes(u.uid)) || itemDef)) {
        setSel(u.uid)
        if (isTouch()) setHoverPos(null)
        sfx('ui_click')
        return
      }
      setArmed(null)
      if (isTouch()) setHoverPos(null)
      return
    }
    const u = combat.units.find((x) => samePos(x.pos, p) && x.hp > 0)
    if (u?.side === 'party') {
      setSel(u.uid)
      setPinned(null)
      if (isTouch()) setHoverPos(null)
      sfx('ui_click')
      return
    }
    if (selUnit && moves.some((m) => samePos(m, p))) {
      try {
        commitAction(moveUnit(combat, C, selUnit.uid, p))
      } catch {
        sfx('error')
      }
      return
    }
    if (u?.side === 'enemy') {
      setPinned(pinned === u.uid ? null : u.uid)
      if (isTouch()) setHoverPos(null)
      return
    }
    setPinned(null)
    // Touch: a tap on terrain pins it in the inspector (tap again to clear) — the hover of a mouse.
    if (isTouch()) setHoverPos(hoverPos && samePos(hoverPos, p) ? null : p)
  }

  const doEndTurn = () => {
    if (!interactive) {
      // Pressed while the last card is still animating: end the turn as soon as the board settles
      // instead of silently dropping the input.
      if (canQueueEnd) endQueued.current = true
      return
    }
    // A fast-forward click / key that lands just as the new turn starts must not end that turn.
    if (!endQueued.current && performance.now() - turnReadyAt.current < TURN_GRACE_MS) return
    endQueued.current = false
    setArmed(null)
    setHoverCard(null)
    try {
      commitAction(endTurn(combat, C), { endTurn: true })
      // Fast-forward pressed while the end turn was still queued: play this enemy phase fast.
      if (hurryQueued.current) anim.hurry()
    } catch {
      sfx('error')
    }
    hurryQueued.current = false
  }

  const doUndo = () => {
    if (!interactive || !combat.undo) return
    commitAction(undoMove(combat))
  }

  const cycleUnit = () => {
    const party = combat.units.filter((u) => u.side === 'party' && u.hp > 0)
    if (party.length === 0) return
    const i = party.findIndex((u) => u.uid === selUid)
    const next = party[(i + 1) % party.length]
    if (next) {
      setSel(next.uid)
      sfx('ui_click')
    }
  }

  // ------------------------------------------------------------ keyboard (latest-handler ref)
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (pile) return
    // The combat screen owns Space / Enter: never let them "click" whatever button happens to have focus
    // (a focused end-turn button would otherwise end the next turn on a fast-forward press).
    if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) e.preventDefault()
    if (canHurry && (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e')) {
      e.preventDefault()
      anim.hurry()
      return
    }
    if (canQueueEnd && endQueued.current && (e.key === ' ' || e.key === 'Enter')) {
      hurryQueued.current = true
      return
    }
    if (e.key === 'Alt') {
      e.preventDefault()
      setAltHeld(true)
      return
    }
    const digit = /^Digit([1-9])$/.exec(e.code)
    if (digit) {
      const n = Number(digit[1]) - 1
      if (e.shiftKey) {
        if (n < 3) onItem(n)
        return
      }
      const card = combat.hand[n]
      if (card) {
        const el = rootRef.current?.querySelector(`[data-card-uid="${card.uid}"]`)
        if (el instanceof HTMLElement) onCard(card.uid, el)
      }
      return
    }
    switch (e.key.toLowerCase()) {
      case 'e':
        doEndTurn()
        break
      case 'z':
        doUndo()
        break
      case 't':
        setThreatOn((v) => !v)
        break
      case 'tab':
        e.preventDefault()
        cycleUnit()
        break
      case 'escape':
        if (isArmed) setArmed(null)
        else setPinned(null)
        break
      case 'enter':
      case ' ':
        if (isArmed && confirmMode && options[0]) {
          e.preventDefault()
          playOpt(options[0])
        }
        break
    }
  }
  const endTurnRef = useRef(doEndTurn)
  useEffect(() => {
    endTurnRef.current = doEndTurn
  })
  useEffect(() => {
    if (interactive && endQueued.current) endTurnRef.current()
  }, [interactive])

  const keyRef = useRef(onKey)
  useEffect(() => {
    keyRef.current = onKey
  })
  useEffect(() => {
    const down = (e: KeyboardEvent) => keyRef.current(e)
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(false)
    }
    const blur = () => setAltHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // ------------------------------------------------------------ music, intro, boss splash
  const conn = combat.units.find((u) => u.uid === 'connector')
  const crisis = !!conn && conn.hp / Math.max(1, conn.maxHp) < 0.35
  const act = enc?.act ?? props.run.act ?? 1
  const bgm: Bgm =
    enc?.kind === 'boss' ? (act === 1 ? 'boss1' : act === 2 ? 'boss2' : 'boss_ix') : enc?.kind === 'elite' || crisis ? 'elite' : act === 2 ? 'combat2' : act === 3 ? 'combat3' : 'combat1'
  useEffect(() => {
    playBgm(bgm)
  }, [bgm])

  const bossArt = enc?.kind === 'boss' ? ART.bosses[combat.encounterId] : undefined
  const [splash, setSplash] = useState(enc?.kind === 'boss')
  useEffect(() => {
    const intro = () => {
      const title = enc ? tr(enc.name, lang) : ''
      const sub = enc?.intro ? tr(enc.intro, lang) : undefined
      anim.banner(sub ? { kind: 'intro', title, sub } : { kind: 'intro', title }, 1900)
      sfx('player_turn')
    }
    if (enc?.kind === 'boss') {
      sfx('phase')
      const t = window.setTimeout(() => {
        setSplash(false)
        intro()
      }, 1700)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(intro, 120)
    return () => window.clearTimeout(t)
    // Intro runs once per mounted fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A fresh lock-on (or a lock that moved) gets a targeting chirp.
  const lockKey = intents
    .filter((i) => i.info.move.pattern === 'track' && i.info.targetUid)
    .map((i) => `${i.uid}>${i.info.targetUid ?? ''}`)
    .join('|')
  useEffect(() => {
    if (lockKey) sfx('telegraph', { volume: 0.8 })
  }, [lockKey])

  // Windup heartbeat at the start of each player turn.
  const windups = intents.filter((i) => i.info.windupLeft > 0).length
  useEffect(() => {
    if (windups > 0 && interactive) sfx('windup', { volume: 0.7 })
  }, [windups, interactive, combat.turn])

  // Energy orb drain/refill pulse.
  const orbRef = useRef<HTMLDivElement>(null)
  const shownEnergy = view.handHidden ? 0 : combat.energy
  const lastEnergy = useRef(shownEnergy)
  useEffect(() => {
    const el = orbRef.current
    if (el && shownEnergy !== lastEnergy.current) {
      if (shownEnergy < lastEnergy.current) el.animate([{ transform: 'scale(1)', filter: 'brightness(2.2)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 380, easing: 'ease-out' })
      else {
        el.animate([{ transform: 'scale(0.8)', filter: 'brightness(2.6)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' })
        sfx('energy', { volume: 0.6 })
      }
    }
    lastEnergy.current = shownEnergy
  }, [shownEnergy])

  // ------------------------------------------------------------ render helpers
  const backdrop = enc ? (ART.arenas[enc.backdrop] ? asset(ART.arenas[enc.backdrop]) : BACKDROPS[enc.backdrop]) : BACKDROPS.streets
  const newArt = !!(enc && ART.arenas[enc.backdrop])
  const partyUnits: UnitState[] = vc.units.filter((u) => u.side === 'party' || u.side === 'neutral').filter((u) => u.hp > 0 || u.uid === 'connector')
  // Companions knocked out this fight leave the board; keep them on the roster as "down".
  for (const m of props.run.party) {
    if (partyUnits.some((u) => u.uid === m.id)) continue
    const cd = C.companions[m.id]
    if (!cd) continue
    partyUnits.push({ uid: m.id, defId: m.id, side: 'party', name: cd.name, sprite: cd.sprite, pos: { x: -1, y: -1 }, hp: 0, maxHp: m.maxHp, block: 0, armor: 0, move: 0, moved: true, facing: 'right', statuses: {} })
  }
  const handCards = view.handHidden ? view.base.hand : combat.hand
  const piles = view.handHidden ? view.base : combat
  const glowEnd = interactive && combat.energy > 0 && anyPlayable
  const inDanger = Object.keys(danger).length > 0
  const banner = view.banner
  const drawFrom = { x: -(W / 2) + 40, y: 0 }

  const cardFx = anim.fx.filter((f): f is Extract<FxItem, { kind: 'card' }> => f.kind === 'card')

  // Hover handlers: a tap's emulated mouseenter must not stick as hover (touch drives these from taps instead).
  const onTileEnter = (p: Pos | null) => {
    if (!isTouch()) setHoverPos(p)
  }

  const [armedName, armedText] = useMemo(
    () => [armedDef ? tr(armedDef.name, lang) : itemDef ? tr(itemDef.name, lang) : '', armedFace ? tr(armedFace.text, lang) : itemDef ? tr(itemDef.text, lang) : ''],
    [armedDef, armedFace, itemDef, lang],
  )
  const zoomInst = zoom ? combat.hand.find((c) => c.uid === zoom) : undefined
  const zoomDef = zoomInst ? C.cards[zoomInst.defId] : undefined
  const zoomFs = Math.min((W * 0.62) / 10.6, (H * 0.62) / 15, 20)
  const compactVars = (compact ? { '--party': `${lay.partyH}px`, '--peek': `${lay.peekH}px`, '--hpeek': `${lay.handPeek}px`, '--ch': `${fs * 15}px` } : {}) as CSSProperties

  return (
    <div
      ref={rootRef}
      className={`m2c-root${settings.fastAnim ? ' is-fast' : ''}${view.enemyPhase ? ' is-enemy-phase' : ''}${isArmed ? ' is-targeting' : ''}${crisis ? ' is-crisis' : ''}${compact ? ` is-compact is-${mode}` : ''}${touchUI ? ' is-touch' : ''}`}
      style={{ '--side': `${sideW}px`, '--top': `${topH}px`, '--bottom': `${bottomH}px`, '--tw': `${tw}px`, ...compactVars, ...(autoH ? { height: autoH } : {}) } as CSSProperties}
      onContextMenu={(e) => {
        // Touch long press: no browser menu, and it must not cancel the armed card.
        if (isTouch()) {
          e.preventDefault()
          return
        }
        if (isArmed) {
          e.preventDefault()
          setArmed(null)
        }
      }}
    >
      <div className={`m2c-bg${newArt ? ' is-new' : ''}`} style={{ backgroundImage: `url(${backdrop})` }} />
      <div className="m2c-bg-fx" />
      <div className="m2c-hurt" ref={registerHurt} />

      <div className="m2c-stage" ref={registerStage}>
        <div className="m2c-board-wrap" style={{ left: boardLeft, top: boardTop }}>
          <Board
            g={g}
            vc={vc}
            ufx={view.ufx}
            C={C}
            lang={lang}
            intents={shownIntents}
            focusEnemy={focusEnemy}
            firing={view.firing}
            threat={threat}
            moves={moves}
            moveHover={moveHover}
            targets={targets}
            active={active}
            activeHostile={activeHostile}
            dirArrows={dirArrows}
            preview={preview}
            selectedUid={isArmed ? null : selUid}
            originUid={isArmed ? origin : interactive ? hoverCardOrigin : null}
            hoverPos={hoverPos}
            incoming={view.enemyPhase ? [] : vc.incoming}
            fx={anim.fx}
            dimIntents={showThreat}
            onTileEnter={onTileEnter}
            onTileClick={onTileClick}
            onTileContext={() => {
              if (!isTouch()) setArmed(null)
            }}
            onDirClick={(d) => {
              const o = options.find((x) => x.dir === d)
              if (o && !aimFirst(o, { dir: d })) playOpt(o)
            }}
            onDirEnter={(d) => {
              if (!isTouch()) setHoverDir(d)
            }}
            registerFigure={registerFigure}
            registerBoard={registerBoard}
            {...(touchUI && aimAt ? { aimAt: aimAt.at, aimDir: aimAt.dir, aimLabel: k ? '한 번 더 누르면 사용' : 'Tap again to play' } : {})}
          />
        </div>
      </div>

      <TopStrip
        c={vc}
        enc={enc}
        C={C}
        lang={lang}
        enemyPhase={view.enemyPhase}
        flashImplant={view.flashImplant}
        threatOn={threatOn}
        onThreat={() => setThreatOn((v) => !v)}
        onLegend={() => (compact ? setHelp((v) => !v) : setLegend((v) => !v))}
        {...(compact ? { implantSize: 22 } : {})}
      />

      <aside className="m2c-left">
        <PartyPanel
          units={partyUnits}
          C={C}
          lang={lang}
          selected={selUid}
          danger={danger}
          onSelect={(uid) => (setSel(uid), sfx('ui_click'))}
          onHover={(uid) => {
            if (!isTouch()) setPanelHover(uid)
          }}
        />
      </aside>
      <aside
        className={compact ? `m2c-right is-sheet${sheet ? ' is-open' : ''}` : 'm2c-right'}
        // Phone layouts: the collapsed inspector is one big "expand" button.
        onClick={compact && !sheet ? () => setSheet(true) : undefined}
      >
        {compact && (
          <button
            type="button"
            className="m2c-sheet-tab"
            aria-label={sheet ? (k ? '정보 접기' : 'Collapse intel') : k ? '정보 펼치기' : 'Expand intel'}
            onClick={(e) => {
              e.stopPropagation()
              setSheet((v) => !v)
            }}
          >
            {sheet ? <X size={16} strokeWidth={2.6} /> : <Maximize2 size={13} strokeWidth={2.6} />}
          </button>
        )}
        {(!compact || sheet || !isArmed) && <DetailPanel unit={detailUnit} intent={detailIntent} tile={hoverTile} C={C} lang={lang} threats={hoverThreat} touch={touchUI} />}
        {isArmed && (
          <div className="m2c-armed">
            <div className="m2c-panel-h">{k ? '조준 중' : 'TARGETING'}</div>
            {compact && armedName && (
              <p className="m2c-armed-card">
                <b>{armedName}</b> {armedText}
              </p>
            )}
            <p>
              {touchUI
                ? confirmMode
                  ? k
                    ? '카드를 한 번 더 누르면 사용'
                    : 'Tap the card again to play'
                  : tmode === 'line' || tmode === 'beam'
                    ? k
                      ? '화살표나 그 방향의 칸을 눌러 조준, 한 번 더 누르면 사용'
                      : 'Tap an arrow or a tile in line to aim, tap again to play'
                    : k
                      ? '빛나는 칸을 눌러 조준, 한 번 더 누르면 사용'
                      : 'Tap a lit tile to aim, tap again to play'
                : confirmMode
                  ? k
                    ? '카드를 다시 누르거나 Enter로 사용'
                    : 'Click the card again or press Enter'
                  : tmode === 'line' || tmode === 'beam'
                    ? k
                      ? '방향 화살표나 그 방향의 칸을 선택'
                      : 'Pick a direction arrow or a tile in line'
                    : k
                      ? '빛나는 칸을 선택'
                      : 'Pick a highlighted tile'}
            </p>
            <p className="m2c-armed-sub">
              {touchUI
                ? confirmMode
                  ? k
                    ? '다른 곳을 누르면 취소'
                    : 'Tap elsewhere to cancel'
                  : k
                    ? '카드를 다시 누르거나 빈 칸을 누르면 취소'
                    : 'Tap the card again or an empty tile to cancel'
                : k
                  ? 'Esc · 우클릭 = 취소'
                  : 'Esc · right-click = cancel'}
            </p>
          </div>
        )}
      </aside>

      {compact && help && (
        <div className="m2c-help" onClick={() => setHelp(false)}>
          {touchUI ? (
            <ul>
              <li>{k ? '대원 누르기 · 선택, 파란 칸 · 이동' : 'Tap a unit to select it, a blue tile to move'}</li>
              <li>{k ? '적이나 칸 누르기 · 정보 고정 (다시 누르면 해제)' : 'Tap an enemy or tile to inspect it (again to clear)'}</li>
              <li>{k ? '카드 누르기 · 조준 → 대상 한 번 · 미리보기 → 한 번 더 · 사용' : 'Tap a card to aim, a target once to preview, again to play'}</li>
              <li>{k ? '카드 길게 누르기 · 크게 보기' : 'Hold a card to read it'}</li>
              <li>{k ? '아래 정보 패널 누르기 · 자세히' : 'Tap the intel panel for the full details'}</li>
              <li>{k ? '위협 · 모든 적 공격 범위와 피해 합계' : 'Threat: every enemy hit and its total damage'}</li>
            </ul>
          ) : (
            <ul>
              <li>
                <kbd>1-9</kbd> {k ? '카드' : 'card'} · <kbd>⇧1-3</kbd> {k ? '소모품' : 'item'}
              </li>
              <li>
                <kbd>E</kbd> {k ? '턴 종료' : 'end turn'} · <kbd>Z</kbd> {k ? '이동 취소' : 'undo move'}
              </li>
              <li>
                <kbd>Tab</kbd> {k ? '대원 전환' : 'cycle unit'} · <kbd>T</kbd> {k ? '위협' : 'threat'} · <kbd>Esc</kbd> {k ? '취소' : 'cancel'}
              </li>
            </ul>
          )}
        </div>
      )}

      <div className="m2c-bottom">
        <div className="m2c-bl">
          <button type="button" className="m2c-pilebtn is-draw" onClick={() => setPile('draw')} title={k ? '뽑을 카드' : 'Draw pile'}>
            <Layers size={16} />
            <b>{piles.draw.length}</b>
          </button>
          <div ref={orbRef} className={`m2c-orb${shownEnergy > 0 && interactive ? ' is-live' : ''}${shownEnergy === 0 ? ' is-empty' : ''}`}>
            <b>{shownEnergy}</b>
            <span>/{combat.maxEnergy}</span>
            <i>{k ? '에너지' : 'ENERGY'}</i>
          </div>
          {legend && !compact && (
            <div className="m2c-legend">
              <span>
                <kbd>1-9</kbd>
                {k ? '카드' : 'card'}
              </span>
              <span>
                <kbd>E</kbd>
                {k ? '턴 종료' : 'end turn'}
              </span>
              <span>
                <kbd>Z</kbd>
                {k ? '이동 취소' : 'undo move'}
              </span>
              <span>
                <kbd>Tab</kbd>
                {k ? '대원 전환' : 'cycle unit'}
              </span>
              <span>
                <kbd>T</kbd>
                {k ? '위협' : 'threat'}
              </span>
              <span>
                <kbd>⇧1-3</kbd>
                {k ? '소모품' : 'item'}
              </span>
              <span>
                <kbd>Esc</kbd>
                {k ? '취소' : 'cancel'}
              </span>
            </div>
          )}
        </div>

        <div className="m2c-bc" style={{ width: handW }}>
          <Hand
            cards={handCards}
            C={C}
            lang={lang}
            fs={fs}
            width={handW}
            hidden={view.handHidden || ending}
            armedUid={armedCard?.uid ?? null}
            confirmUid={confirmMode && armedCard ? armedCard.uid : null}
            hoverUid={interactive ? hoverCard : null}
            playable={playable}
            drawFrom={drawFrom}
            onCard={onCard}
            onHover={(uid) => {
              if (isTouch()) return
              setHoverCard(uid)
              if (uid && interactive) sfx('card_hover', { volume: 0.5 })
            }}
            touch={touchUI}
            onZoom={setZoom}
          />
        </div>

        <div className="m2c-br">
          <div className="m2c-items">
            {[0, 1, 2].map((i) => {
              const id = combat.consumables[i]
              const def = id ? C.consumables[id] : undefined
              const icon = def ? asset(CONSUMABLE_ART[def.id] ?? def.icon) : ''
              return def ? (
                <Tooltip
                  key={i}
                  content={
                    <div>
                      <b>{tr(def.name, lang)}</b>
                      <div>{tr(def.text, lang)}</div>
                      <small>{k ? `무료 사용 · ⇧${i + 1}` : `Free to use · ⇧${i + 1}`}</small>
                    </div>
                  }
                >
                  <button type="button" className={`m2c-item${armed?.kind === 'item' && armed.index === i ? ' is-armed' : ''}`} onClick={() => onItem(i)}>
                    <img src={icon} alt={tr(def.name, lang)} draggable={false} />
                    <kbd>⇧{i + 1}</kbd>
                  </button>
                </Tooltip>
              ) : (
                <span key={i} className="m2c-item is-empty" />
              )
            })}
            {props.onOpenDeck && (
              <button type="button" className="m2c-pilebtn" onClick={props.onOpenDeck} title={k ? '덱 보기' : 'Deck'}>
                <BookOpen size={15} />
              </button>
            )}
          </div>
          <div className="m2c-piles">
            <button type="button" className="m2c-pilebtn" onClick={() => setPile('discard')} title={k ? '버린 카드' : 'Discard'}>
              <Trash2 size={14} />
              <b>{piles.discard.length}</b>
            </button>
            <button type="button" className="m2c-pilebtn" onClick={() => setPile('exhaust')} title={k ? '소멸' : 'Exhausted'}>
              <Flame size={14} />
              <b>{piles.exhaust.length}</b>
            </button>
            <button type="button" className="m2c-pilebtn" disabled={!combat.undo || !interactive} onClick={doUndo} title={k ? '이동 되돌리기 (Z)' : 'Undo move (Z)'}>
              <Undo2 size={14} />
              <kbd>Z</kbd>
            </button>
          </div>
          <button
            type="button"
            data-coach="endturn"
            className={`m2c-end${glowEnd ? ' is-glow' : ''}${inDanger && interactive ? ' is-danger' : ''}${!interactive ? ' is-off' : ''}${canHurry ? ' is-hurry' : ''}`}
            onClick={canHurry ? anim.hurry : doEndTurn}
            // Never keep focus: a later Space (fast-forward) must not "click" the focused button and end a turn.
            onMouseDown={(e) => e.preventDefault()}
            disabled={!interactive && !canHurry && !canQueueEnd}
            title={canHurry ? (k ? '클릭 또는 Space: 빨리 감기' : 'Click or Space: fast-forward') : undefined}
          >
            <span>{view.enemyPhase ? (k ? '적 행동 중' : 'ENEMY ACTING') : k ? '턴 종료' : 'END TURN'}</span>
            {canHurry ? <FastForward size={16} strokeWidth={2.6} /> : <kbd>E</kbd>}
          </button>
        </div>
      </div>

      {/* card ghosts: snap to target, burn away */}
      {cardFx.map((f) => {
        const def = C.cards[f.cardId]
        if (!def) return null
        const tp = g.project(f.to.x + 0.5, f.to.y + 0.5)
        const tx = boardLeft + tp.x - (f.rect.left + f.rect.width / 2)
        const ty = boardTop + tp.y - g.tw * 0.6 - (f.rect.top + f.rect.height / 2)
        return (
          <div
            key={f.id}
            className="m2c-ghostcard"
            style={{ left: f.rect.left, top: f.rect.top, width: f.rect.width, height: f.rect.height, '--tx': `${tx}px`, '--ty': `${ty}px`, animationDuration: `${f.ms}ms`, '--fs': `${fs}px` } as CSSProperties}
          >
            <CardView def={def} upgraded={f.upgraded} lang={lang} />
          </div>
        )
      })}

      {banner && (
        <div key={banner.key} className={`m2c-banner is-${banner.kind}`}>
          <div className="m2c-banner-bar" />
          <div className="m2c-banner-title">{banner.title}</div>
          {banner.sub && <div className="m2c-banner-sub">{banner.sub}</div>}
        </div>
      )}

      {splash && enc && (
        <div className="m2c-splash">
          {bossArt ? <img src={asset(bossArt)} alt="" /> : <div className="m2c-splash-noart" />}
          <div className="m2c-splash-name">
            <em>{k ? '위협 등급: 보스' : 'THREAT CLASS: BOSS'}</em>
            <b>{tr(enc.name, lang)}</b>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.key} className="m2c-toast">
          {toast.text}
        </div>
      )}

      {zoomInst && zoomDef && (
        <div className="m2c-zoom" style={{ '--fs': `${zoomFs}px` } as CSSProperties}>
          <CardView def={zoomDef} upgraded={zoomInst.upgraded} lang={lang} playable={playable[zoomInst.uid]?.ok ?? false} {...(playable[zoomInst.uid]?.reason ? { reason: playable[zoomInst.uid]?.reason } : {})} />
        </div>
      )}

      {coach && interactive && !splash && <Coach root={rootEl} lang={lang} onClose={() => setCoach(false)} touch={touchUI} />}

      {pile && <PileModal kind={pile} cards={piles[pile]} C={C} lang={lang} onClose={() => setPile(null)} />}
    </div>
  )
}
