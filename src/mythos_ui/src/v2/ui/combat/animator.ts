// Combat event timeline → visual state + game feel.
//
// The engine applies a whole action at once and appends `CombatEvent`s. The screen keeps a
// *view* (units/tiles as currently displayed) that starts from the pre-action state and is
// stepped event by event on timers:
//   - tweens and poses are React state (CSS transitions on the unit wrapper),
//   - one-shot motion (anticipation/lunge, recoil, squash, flashes, zoom punch) is the Web
//     Animations API on registered elements,
//   - hit-stop pauses every animation inside the board for 50–110 ms,
//   - screen shake is trauma based (decaying, rotational + translational) on a rAF loop,
//   - transient effects (numbers, particles, projectiles, card ghosts) live in an FX list.
// When the timeline ends the view snaps to the committed engine state.

import { useCallback, useEffect, useRef, useState } from 'react'
import { cardFace } from '../../engine/combat.ts'
import { dirToward } from '../../engine/grid.ts'
import { GRID_H, GRID_W } from '../../engine/types.ts'
import type { CombatEvent, CombatState, ContentRegistry, Dir, Lang, Pos, Tile, UnitState } from '../../engine/types.ts'
import type { SpritePose } from '../common/assets.ts'
import { setMusicDuck, sfx } from '../common/sfx.ts'
import type { SfxName } from '../common/sfx.ts'
import { tr } from '../common/lang.ts'

export interface UnitFx {
  pose: SpritePose
  /** Transition time for position changes (0 = jump). */
  moveMs: number
  ease?: 'linear' | 'out'
  dying?: 'damage' | 'void'
  spawning?: boolean
  vanish?: boolean
}

export interface Banner {
  kind: 'enemy' | 'player' | 'phase' | 'victory' | 'defeat' | 'intro'
  title: string
  sub?: string
  key: number
}

export interface ViewState {
  /** Source of static data (intents, defs) for the displayed moment. */
  base: CombatState
  units: UnitState[]
  tiles: Tile[][]
  ufx: Record<string, UnitFx>
  /** null = every base intent is visible; otherwise only these enemies' intents. */
  pendingIntents: string[] | null
  /** Enemy whose attack is about to land (its intent is drawn hot). */
  firing: string | null
  enemyPhase: boolean
  handHidden: boolean
  banner: Banner | null
  /** Implant that just triggered (flashes in the HUD). */
  flashImplant: string | null
}

/** Board points are tile coordinates; a tile centre is (x + 0.5, y + 0.5) when projected. */
export interface BPt {
  x: number
  y: number
}

export type FxTone = 'party' | 'enemy' | 'env' | 'heal' | 'block' | 'warn' | 'neutral'
export type TextTone = 'dmg' | 'crit' | 'heal' | 'block' | 'word' | 'kill' | 'status' | 'fizzle'

export type FxItem =
  | { id: number; kind: 'text'; at: BPt; text: string; tone: TextTone; icon?: string; ms: number }
  | { id: number; kind: 'bolt' | 'beam' | 'arc'; from: BPt; to: BPt; tone: FxTone; ms: number }
  | { id: number; kind: 'slash' | 'spark' | 'nova' | 'burst' | 'shield' | 'debris' | 'dust' | 'star' | 'pixels' | 'ring'; at: BPt; tone: FxTone; ms: number; dir?: Dir }
  | { id: number; kind: 'tiles'; tiles: Pos[]; tone: FxTone | 'pre'; ms: number }
  | { id: number; kind: 'card'; cardId: string; upgraded: boolean; rect: RectLike; to: BPt; ms: number }

/** Omit distributed over a union (so each FX variant keeps its own fields). */
export type FxInput = FxItem extends unknown ? (FxItem extends infer T ? (T extends FxItem ? Omit<T, 'id'> : never) : never) : never

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface PlayOpts {
  /** Index of the first event to animate. */
  from: number
  /** Screen rect (relative to the combat root) of the card that was played. */
  card?: { rect: RectLike; upgraded: boolean }
  endTurn?: boolean
  onDone: () => void
}

interface Step {
  dur: number
  run: () => void
}

export function viewFrom(c: CombatState): ViewState {
  return {
    base: c,
    units: c.units,
    tiles: c.tiles,
    ufx: {},
    pendingIntents: null,
    firing: null,
    enemyPhase: false,
    handHidden: false,
    banner: null,
    flashImplant: null,
  }
}

/** Unit-local motion offsets (% of the figure box) for each board direction. */
const DIR_PCT: Record<Dir, [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  up: [0.35, -0.3],
  down: [-0.35, 0.3],
}

export const panOf = (x: number): number => (x / 6) * 1.6 - 0.8

const STATUS_SFX: Partial<Record<string, SfxName>> = { burn: 'status_burn', shock: 'status_shock', mark: 'status_mark', weak: 'status_mark' }

export interface Animator {
  view: ViewState
  fx: FxItem[]
  busy: boolean
  play: (prev: CombatState, next: CombatState, opts: PlayOpts) => void
  snap: (c: CombatState) => void
  /** Fast-forward the running timeline (enemy phase skip); the next play() restores the pace. */
  hurry: () => void
  /** Show a banner outside a timeline (intro / victory). */
  banner: (b: Omit<Banner, 'key'> | null, ms?: number) => void
  setBusy: (b: boolean) => void
  /** One-shot screen trauma (0..1) — used by UI feedback outside timelines. */
  trauma: (t: number) => void
  registerFigure: (uid: string, el: HTMLElement | null) => void
  registerStage: (el: HTMLElement | null) => void
  registerBoard: (el: HTMLElement | null) => void
  registerHurt: (el: HTMLElement | null) => void
}

export function useCombatAnimator(C: ContentRegistry, initial: CombatState, fast: boolean, lang: Lang): Animator {
  const [view, setView] = useState<ViewState>(() => viewFrom(initial))
  const [fx, setFx] = useState<FxItem[]>([])
  const [busy, setBusyState] = useState(false)
  const shadow = useRef<ViewState>(view)
  const timers = useRef(new Set<number>())
  const figures = useRef(new Map<string, HTMLElement>())
  const stage = useRef<HTMLElement | null>(null)
  const board = useRef<HTMLElement | null>(null)
  const hurt = useRef<HTMLElement | null>(null)
  const ids = useRef(1)
  // Default pacing is 0.8× the authored timings (playtest: enemy phases dragged at 1×); fast mode ≈ 0.45×.
  const speed = useRef(fast ? 0.45 : 0.8)
  const langRef = useRef(lang)
  const CRef = useRef(C)
  const traumaV = useRef(0)
  const raf = useRef(0)

  const baseSpeed = useRef(fast ? 0.45 : 0.8)
  useEffect(() => {
    baseSpeed.current = fast ? 0.45 : 0.8
    speed.current = baseSpeed.current
    langRef.current = lang
    CRef.current = C
  }, [fast, lang, C])

  useEffect(() => {
    const set = timers.current
    return () => {
      for (const t of set) window.clearTimeout(t)
      set.clear()
      cancelAnimationFrame(raf.current)
    }
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }, [])

  const S = useCallback((ms: number) => Math.round(ms * speed.current), [])

  // ------------------------------------------------------------ view mutation (shadow → state)

  const commit = useCallback((v: ViewState) => {
    shadow.current = v
    setView(v)
  }, [])
  const patch = useCallback((p: Partial<ViewState>) => commit({ ...shadow.current, ...p }), [commit])
  const updUnit = useCallback(
    (uid: string, fn: (u: UnitState) => UnitState) => {
      const v = shadow.current
      commit({ ...v, units: v.units.map((u) => (u.uid === uid ? fn(u) : u)) })
    },
    [commit],
  )
  const updFx = useCallback(
    (uid: string, p: Partial<UnitFx>) => {
      const v = shadow.current
      const cur = v.ufx[uid] ?? { pose: 'idle', moveMs: 0 }
      commit({ ...v, ufx: { ...v.ufx, [uid]: { ...cur, ...p } } })
    },
    [commit],
  )
  const unitOf = useCallback((uid: string): UnitState | undefined => shadow.current.units.find((u) => u.uid === uid), [])

  const poseKeys = useRef(new Map<string, number>())
  const pose = useCallback(
    (uid: string, p: SpritePose, ms: number) => {
      const k = (poseKeys.current.get(uid) ?? 0) + 1
      poseKeys.current.set(uid, k)
      updFx(uid, { pose: p })
      later(() => {
        if (poseKeys.current.get(uid) === k) updFx(uid, { pose: 'idle' })
      }, ms)
    },
    [later, updFx],
  )

  const addFx = useCallback(
    (item: FxInput) => {
      const id = ids.current++
      const full = { ...item, id } as FxItem
      setFx((list) => [...list, full])
      later(() => setFx((list) => list.filter((f) => f.id !== id)), item.ms + 80)
    },
    [later],
  )

  // ------------------------------------------------------------ game-feel primitives

  const trauma = useCallback((t: number) => {
    traumaV.current = Math.min(1, traumaV.current + t)
    if (raf.current) return
    let last = performance.now()
    const seed = Math.random() * 100
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      traumaV.current = Math.max(0, traumaV.current - dt * (speed.current < 1 ? 2.6 : 1.7))
      const el = stage.current
      const s = traumaV.current * traumaV.current
      if (el) {
        if (s <= 0.0001) el.style.transform = ''
        else {
          const tt = now / 1000
          const n1 = Math.sin(tt * 47 + seed) * 0.6 + Math.sin(tt * 83 + seed * 2) * 0.4
          const n2 = Math.sin(tt * 53 + seed * 3) * 0.6 + Math.sin(tt * 71 + seed * 5) * 0.4
          const n3 = Math.sin(tt * 37 + seed * 7)
          el.style.transform = `translate(${(n1 * 18 * s).toFixed(2)}px, ${(n2 * 13 * s).toFixed(2)}px) rotate(${(n3 * 1.5 * s).toFixed(3)}deg)`
        }
      }
      if (traumaV.current > 0) raf.current = requestAnimationFrame(loop)
      else {
        raf.current = 0
        if (el) el.style.transform = ''
      }
    }
    raf.current = requestAnimationFrame(loop)
  }, [])

  /** Freeze every animation on the board for `ms` (hit-stop). */
  const hitStop = useCallback(
    (ms: number) => {
      const el = board.current
      if (!el || ms <= 0) return
      const anims = el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running')
      for (const a of anims) a.pause()
      later(() => {
        for (const a of anims) if (a.playState === 'paused') a.play()
      }, ms)
    },
    [later],
  )

  const figImg = useCallback((uid: string): HTMLElement | null => figures.current.get(uid)?.querySelector('img') ?? null, [])

  const animFig = useCallback((uid: string, frames: Keyframe[], ms: number, easing = 'cubic-bezier(.2,.8,.2,1)') => {
    figures.current.get(uid)?.animate(frames, { duration: ms, easing })
  }, [])

  /** Anticipation (lean back ~80 ms) then lunge toward `d`. */
  const lunge = useCallback(
    (uid: string, d: Dir | undefined, strength = 1) => {
      if (!d) return
      const [vx, vy] = DIR_PCT[d]
      const a = 26 * strength
      animFig(
        uid,
        [
          { transform: 'translate(0,0) rotate(0deg)' },
          { transform: `translate(${-vx * 7}%, ${-vy * 7}%) rotate(${-vx * 4}deg) scale(1.02, 0.97)`, offset: 0.25 },
          { transform: `translate(${vx * a}%, ${vy * a}%) rotate(${vx * 6}deg) scale(0.97, 1.03)`, offset: 0.48 },
          { transform: 'translate(0,0) rotate(0deg)' },
        ],
        S(340),
      )
    },
    [S, animFig],
  )

  const recoil = useCallback(
    (uid: string, d: Dir | undefined, big: boolean) => {
      const [vx, vy] = d ? DIR_PCT[d] : [0, 0]
      const m = big ? 16 : 9
      animFig(
        uid,
        [
          { transform: 'translate(0,0) rotate(0)' },
          { transform: `translate(${vx * m}%, ${vy * m}%) rotate(${vx * (big ? 8 : 4)}deg) scale(1.05, 0.93)`, offset: 0.22 },
          { transform: `translate(${-vx * 2}%, 0) rotate(${-vx * 1.5}deg)`, offset: 0.6 },
          { transform: 'translate(0,0) rotate(0)' },
        ],
        S(big ? 420 : 300),
        'cubic-bezier(.15,.9,.25,1)',
      )
    },
    [S, animFig],
  )

  const whiteFlash = useCallback(
    (uid: string, chroma: boolean) => {
      const img = figImg(uid)
      if (!img) return
      const frames: Keyframe[] = chroma
        ? [
            { filter: 'brightness(4) saturate(0)' },
            { filter: 'drop-shadow(6px 0 0 rgba(255,30,80,.95)) drop-shadow(-6px 0 0 rgba(40,255,240,.8)) brightness(1.4)', offset: 0.25 },
            { filter: 'drop-shadow(3px 0 0 rgba(255,30,80,.7)) drop-shadow(-3px 0 0 rgba(40,255,240,.5))', offset: 0.6 },
            { filter: 'none' },
          ]
        : [{ filter: 'brightness(4) saturate(0)' }, { filter: 'brightness(1.8) sepia(1) hue-rotate(-40deg) saturate(5)', offset: 0.3 }, { filter: 'none' }]
      img.animate(frames, { duration: S(chroma ? 420 : 280), easing: 'ease-out' })
    },
    [S, figImg],
  )

  const squash = useCallback(
    (uid: string) => {
      animFig(
        uid,
        [{ transform: 'scale(1,1)' }, { transform: 'scale(1.12, 0.86)', offset: 0.3 }, { transform: 'scale(0.95, 1.06)', offset: 0.65 }, { transform: 'scale(1,1)' }],
        S(260),
      )
    },
    [S, animFig],
  )

  const zoomPunch = useCallback(
    (uid: string) => {
      const el = board.current
      const fig = figures.current.get(uid)
      if (!el) return
      let origin = '50% 50%'
      if (fig) {
        const a = el.getBoundingClientRect()
        const b = fig.getBoundingClientRect()
        origin = `${b.left + b.width / 2 - a.left}px ${b.top + b.height * 0.6 - a.top}px`
      }
      el.animate([{ transform: 'scale(1)', transformOrigin: origin }, { transform: 'scale(1.09)', transformOrigin: origin, offset: 0.35 }, { transform: 'scale(1)', transformOrigin: origin }], {
        duration: 900,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      })
      // Slow motion: every running board animation plays at 35 % for 300 ms.
      const anims = el.getAnimations({ subtree: true })
      for (const a of anims) a.playbackRate = 0.35
      later(() => {
        for (const a of anims) a.playbackRate = 1
      }, 420)
    },
    [later],
  )

  const hurtFlash = useCallback(() => {
    hurt.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: S(620), easing: 'ease-out' })
  }, [S])

  const bannerKey = useRef(0)
  const showBanner = useCallback(
    (b: Omit<Banner, 'key'> | null, ms = 900) => {
      if (!b) {
        patch({ banner: null })
        return
      }
      const key = ++bannerKey.current
      patch({ banner: { ...b, key } })
      later(() => {
        if (shadow.current.banner?.key === key) patch({ banner: null })
      }, ms)
    },
    [later, patch],
  )

  const snap = useCallback(
    (c: CombatState) => {
      for (const t of timers.current) window.clearTimeout(t)
      timers.current.clear()
      commit(viewFrom(c))
      setFx([])
      setBusyState(false)
    },
    [commit],
  )

  // ------------------------------------------------------------ timeline

  const play = useCallback(
    (prev: CombatState, next: CombatState, opts: PlayOpts) => {
      const Cn = CRef.current
      const lg = langRef.current
      const k = lg === 'ko'
      const events: CombatEvent[] = next.events.slice(Math.max(0, opts.from))
      const steps: Step[] = []
      let cardInfo = opts.card
      let enemyMoved = false
      // Context for directionless events (recoil / bump direction, kill attribution).
      let ctxDir: Dir | undefined
      let ctxFrom: Pos | undefined
      const lastSource = new Map<string, 'party' | 'enemy' | 'environment'>()
      const lastDeathIdx = (() => {
        let idx = -1
        events.forEach((e, i) => {
          if (e.t === 'death') idx = i
        })
        return idx
      })()
      const finalKill = next.phase === 'won'

      const start: ViewState = { ...viewFrom(prev), handHidden: !!opts.endTurn, enemyPhase: !!opts.endTurn }
      if (opts.endTurn) start.pendingIntents = prev.units.filter((u) => u.side === 'enemy' && u.intent && u.hp > 0).map((u) => u.uid)

      const travel = (kind: 'bolt' | 'beam' | 'arc' | 'slash' | 'nova' | 'burst') =>
        kind === 'bolt' ? 150 : kind === 'beam' ? 190 : kind === 'arc' ? 360 : kind === 'nova' ? 160 : 110

      events.forEach((ev, evIdx) => {
        switch (ev.t) {
          case 'turn':
            if (ev.side === 'enemy') {
              steps.push({
                dur: 720,
                run: () => {
                  patch({ enemyPhase: true, handHidden: true })
                  showBanner({ kind: 'enemy', title: k ? '적 페이즈' : 'ENEMY PHASE', sub: k ? '예고된 공격이 실행된다' : 'Telegraphed attacks resolve' }, S(1000))
                  setMusicDuck(true)
                  sfx('enemy_turn')
                },
              })
            } else {
              steps.push({
                dur: 380,
                run: () => {
                  patch({ enemyPhase: false, pendingIntents: [], firing: null })
                  showBanner({ kind: 'player', title: k ? '당신의 턴' : 'YOUR TURN', sub: k ? `${ev.turn}턴` : `Turn ${ev.turn}` }, S(950))
                  setMusicDuck(false)
                  sfx('player_turn')
                },
              })
            }
            break

          case 'card': {
            const cardDef = Cn.cards[ev.cardId]
            const item = cardDef ? undefined : Cn.consumables[ev.cardId]
            const info = cardInfo
            cardInfo = undefined
            const face = cardDef ? cardFace(cardDef, info?.upgraded ?? false) : item ? { target: item.target, effects: item.effects } : null
            const def = cardDef ?? (item ? { id: item.id, type: item.effects.some((e) => e.kind === 'damage') ? 'attack' : 'skill', icon: item.icon } : undefined)
            const mode = face?.target.mode ?? 'none'
            const kind = mode === 'line' ? 'bolt' : mode === 'beam' ? 'beam' : mode === 'lob' ? 'arc' : mode === 'melee' ? 'slash' : 'burst'
            steps.push({
              dur: 170 + travel(kind),
              run: () => {
                const u = unitOf(ev.owner)
                const tgt = ev.target ?? u?.pos
                if (cardDef && info && tgt) addFx({ kind: 'card', cardId: cardDef.id, upgraded: info.upgraded, rect: info.rect, to: tgt, ms: S(620) })
                sfx('card_play', { pan: u ? panOf(u.pos.x) : 0 })
                if (!def || !u || !face) return
                const hasBlock = face.effects.some((e) => e.kind === 'block')
                const isAttack = def.type === 'attack'
                const d = ev.dir ?? (ev.target ? dirToward(u.pos, ev.target) : undefined)
                ctxDir = d
                ctxFrom = u.pos
                later(() => {
                  pose(ev.owner, isAttack ? 'attack' : hasBlock ? 'guard' : 'skill', S(560))
                  if (isAttack && d) lunge(ev.owner, d)
                  else squash(ev.owner)
                  const from = { x: u.pos.x, y: u.pos.y }
                  const pan = panOf(u.pos.x)
                  if (kind === 'bolt' && ev.target) {
                    addFx({ kind: 'bolt', from, to: ev.target, tone: 'party', ms: S(240) })
                    sfx('shoot', { pan })
                  } else if (kind === 'beam' && d) {
                    const r = face.target.mode === 'beam' ? face.target.range : 3
                    const v = DIR_VEC[d]
                    const ex = Math.max(-0.4, Math.min(GRID_W - 0.6, u.pos.x + v.x * r))
                    const ey = Math.max(-0.4, Math.min(GRID_H - 0.6, u.pos.y + v.y * r))
                    addFx({ kind: 'beam', from, to: { x: ex, y: ey }, tone: 'party', ms: S(460) })
                    sfx('beam', { pan })
                  } else if (kind === 'arc' && ev.target) {
                    addFx({ kind: 'arc', from, to: ev.target, tone: 'party', ms: S(380) })
                    sfx('lob', { pan })
                  } else if (kind === 'slash' && ev.target) {
                    addFx({ kind: 'slash', at: ev.target, tone: 'party', ms: S(360), dir: d })
                    sfx('swing', { pan })
                  } else {
                    addFx({ kind: 'burst', at: ev.target ?? u.pos, tone: hasBlock ? 'block' : 'party', ms: S(480) })
                    if (!hasBlock) sfx('energy', { pan, volume: 0.6 })
                  }
                }, S(150))
              },
            })
            break
          }

          case 'attack': {
            const uid = ev.uid
            const u0 = prev.units.find((u) => u.uid === uid) ?? next.units.find((u) => u.uid === uid)
            const mv = u0 ? Cn.enemies[u0.defId]?.moves.find((m) => m.id === ev.moveId) : undefined
            const pattern = mv?.pattern ?? 'melee'
            const support = pattern === 'buff' || pattern === 'summon'
            const kind = pattern === 'line' || pattern === 'track' ? 'bolt' : pattern === 'beam' ? 'beam' : pattern === 'lob' ? 'arc' : pattern === 'nova' ? 'nova' : support ? 'burst' : 'slash'
            if (u0?.side !== 'enemy') break
            // Wind-up: the doomed tiles flash hot, the enemy leans back.
            steps.push({
              dur: 240,
              run: () => {
                const u = unitOf(uid)
                patch({ firing: uid })
                if (!u) return
                if (ev.tiles.length) addFx({ kind: 'tiles', tiles: ev.tiles, tone: 'pre', ms: S(560) })
                const [vx] = DIR_PCT[u.facing]
                animFig(uid, [{ transform: 'translate(0,0)' }, { transform: `translate(${-vx * 8}%, 0) scale(1.03, 0.96)` }], S(280), 'ease-out')
                sfx('telegraph', { pan: panOf(u.pos.x), volume: 0.7 })
              },
            })
            steps.push({
              dur: travel(kind) + 40,
              run: () => {
                const u = unitOf(uid)
                const v = shadow.current
                patch({ firing: null, pendingIntents: v.pendingIntents ? v.pendingIntents.filter((x) => x !== uid) : v.pendingIntents })
                if (!u) return
                pose(uid, support ? 'skill' : 'attack', S(600))
                const from = { x: u.pos.x, y: u.pos.y }
                ctxFrom = u.pos
                ctxDir = u.facing
                const last = ev.tiles[ev.tiles.length - 1]
                const pan = panOf(u.pos.x)
                if (ev.tiles.length) addFx({ kind: 'tiles', tiles: ev.tiles, tone: 'enemy', ms: S(520) })
                if (kind === 'bolt' && last) {
                  addFx({ kind: 'bolt', from, to: last, tone: 'enemy', ms: S(240) })
                  sfx('shoot', { pan })
                } else if (kind === 'beam' && last) {
                  addFx({ kind: 'beam', from, to: last, tone: 'enemy', ms: S(480) })
                  sfx('beam', { pan })
                } else if (kind === 'arc' && last) {
                  const mid = ev.tiles[Math.floor(ev.tiles.length / 2)] ?? last
                  addFx({ kind: 'arc', from, to: mid, tone: 'enemy', ms: S(400) })
                  later(() => addFx({ kind: 'ring', at: mid, tone: 'enemy', ms: S(520) }), S(360))
                  sfx('lob', { pan })
                } else if (kind === 'nova') {
                  addFx({ kind: 'nova', at: from, tone: 'enemy', ms: S(520) })
                  sfx('swing', { pan, intensity: 1.4 })
                } else if (support) {
                  addFx({ kind: 'burst', at: from, tone: 'warn', ms: S(560) })
                  sfx('telegraph', { pan })
                } else if (last) {
                  addFx({ kind: 'slash', at: last, tone: 'enemy', ms: S(360), dir: u.facing })
                  sfx('swing', { pan })
                }
                if (!support) lunge(uid, u.facing, pattern === 'melee' || pattern === 'charge' ? 1 : 0.45)
                else squash(uid)
              },
            })
            break
          }

          case 'move': {
            const uid = ev.uid
            const prevEv = events[evIdx - 1]
            const dash = prevEv?.t === 'attack' && prevEv.uid === uid
            const per = dash ? 60 : 105
            steps.push({
              dur: 0,
              run: () => {
                const u = unitOf(uid)
                if (!dash && u?.side === 'enemy' && shadow.current.enemyPhase && !enemyMoved) {
                  enemyMoved = true
                  patch({ pendingIntents: shadow.current.units.filter((x) => x.side === 'enemy' && (x.intent?.windupLeft ?? 0) > 0).map((x) => x.uid) })
                }
                if (u) sfx(dash ? 'push' : 'move', { pan: panOf(u.pos.x), volume: 0.7 })
              },
            })
            let any = false
            // The engine's path starts at the unit's own tile.
            for (const p of ev.path.length > 1 ? ev.path.slice(1) : ev.path) {
              const to = p
              steps.push({
                dur: per,
                run: () => {
                  const u = unitOf(uid)
                  if (!u || (u.pos.x === to.x && u.pos.y === to.y)) return
                  const face = dirToward(u.pos, to) ?? u.facing
                  updFx(uid, { moveMs: S(per), ease: 'linear' })
                  updUnit(uid, (x) => ({ ...x, pos: to, facing: face }))
                  if (!dash) animFig(uid, [{ transform: 'translateY(0)' }, { transform: 'translateY(-7%)', offset: 0.45 }, { transform: 'translateY(0)' }], S(per), 'ease-in-out')
                },
              })
              any = true
            }
            if (any)
              steps.push({
                dur: dash ? 0 : 60,
                run: () => {
                  updFx(uid, { moveMs: 0 })
                  if (!dash) squash(uid)
                },
              })
            break
          }

          case 'teleport': {
            const uid = ev.uid
            steps.push({
              dur: 170,
              run: () => {
                updFx(uid, { vanish: true })
                addFx({ kind: 'pixels', at: ev.from, tone: 'party', ms: S(520) })
                sfx('void', { pan: panOf(ev.from.x), volume: 0.5, intensity: 0.6 })
              },
            })
            steps.push({
              dur: 40,
              run: () => {
                updFx(uid, { moveMs: 0 })
                updUnit(uid, (x) => ({ ...x, pos: ev.to }))
              },
            })
            steps.push({
              dur: 220,
              run: () => {
                updFx(uid, { vanish: false })
                addFx({ kind: 'burst', at: ev.to, tone: 'party', ms: S(420) })
                squash(uid)
              },
            })
            break
          }

          case 'damage': {
            const uid = ev.uid
            lastSource.set(uid, ev.source)
            const amt = ev.amount
            const big = amt >= 6
            const pre = unitOf(uid) ?? prev.units.find((u) => u.uid === uid)
            const lethal = !!pre && amt > 0 && pre.hp - amt <= 0
            const stop = amt <= 0 ? 0 : lethal ? 110 : Math.min(90, 50 + amt * 7)
            steps.push({
              dur: stop + (big || lethal ? 250 : 170),
              run: () => {
                const u = unitOf(uid)
                if (!u) return
                const at = { x: u.pos.x, y: u.pos.y }
                const pan = panOf(u.pos.x)
                if (amt > 0) {
                  const img = figImg(uid)
                  if (img) img.style.filter = 'brightness(5) saturate(0)'
                  hitStop(S(stop))
                  later(() => {
                    if (img) img.style.filter = ''
                    updUnit(uid, (x) => ({ ...x, hp: Math.max(0, x.hp - amt), block: Math.max(0, x.block - ev.blocked) }))
                    const isConnector = u.uid === 'connector'
                    whiteFlash(uid, isConnector || u.side === 'party')
                    pose(uid, 'hit', S(420))
                    const d = ctxFrom ? dirToward(ctxFrom, u.pos) : ctxDir
                    recoil(uid, d, big || lethal)
                    addFx({ kind: 'text', at, text: `${amt}`, tone: big ? 'crit' : 'dmg', ms: S(big ? 1250 : 1000) })
                    const tone: FxTone = ev.source === 'environment' ? 'env' : ev.source === 'party' ? 'party' : 'enemy'
                    addFx({ kind: 'spark', at, tone, ms: S(big ? 560 : 440) })
                    trauma(Math.min(0.75, (big ? 0.38 : 0.18) + amt * 0.025 + (lethal ? 0.15 : 0)))
                    sfx(big || lethal ? 'hit_heavy' : 'hit_light', { pan, intensity: Math.min(2, 0.5 + amt / 6) })
                    if (u.side === 'party') hurtFlash()
                    if (ev.blocked > 0) addFx({ kind: 'text', at: { x: at.x + 0.3, y: at.y - 0.15 }, text: `⛨${ev.blocked}`, tone: 'block', ms: S(900) })
                  }, S(stop))
                } else if (ev.blocked > 0) {
                  updUnit(uid, (x) => ({ ...x, block: Math.max(0, x.block - ev.blocked) }))
                  addFx({ kind: 'text', at, text: `⛨${ev.blocked}`, tone: 'block', ms: S(950) })
                  addFx({ kind: 'shield', at, tone: 'block', ms: S(480) })
                  recoil(uid, ctxFrom ? dirToward(ctxFrom, u.pos) : ctxDir, false)
                  trauma(0.12)
                  sfx('block', { pan })
                }
              },
            })
            break
          }

          case 'heal':
            steps.push({
              dur: 220,
              run: () => {
                const u = unitOf(ev.uid)
                if (!u) return
                updUnit(ev.uid, (x) => ({ ...x, hp: Math.min(x.maxHp, x.hp + ev.amount) }))
                addFx({ kind: 'text', at: u.pos, text: `+${ev.amount}`, tone: 'heal', ms: S(1000) })
                addFx({ kind: 'burst', at: u.pos, tone: 'heal', ms: S(520) })
                sfx('heal', { pan: panOf(u.pos.x) })
              },
            })
            break

          case 'block':
            steps.push({
              dur: 220,
              run: () => {
                const u = unitOf(ev.uid)
                if (!u) return
                updUnit(ev.uid, (x) => ({ ...x, block: x.block + ev.amount }))
                addFx({ kind: 'text', at: u.pos, text: `⛨+${ev.amount}`, tone: 'block', ms: S(950) })
                addFx({ kind: 'shield', at: u.pos, tone: 'block', ms: S(520) })
                if (!shadow.current.enemyPhase) pose(ev.uid, 'guard', S(560))
                sfx('block', { pan: panOf(u.pos.x) })
              },
            })
            break

          case 'push': {
            const uid = ev.uid
            const moved = ev.from.x !== ev.to.x || ev.from.y !== ev.to.y
            const voidDrop = moved && events[evIdx + 1]?.t === 'death' && (events[evIdx + 1] as { uid: string }).uid === uid
            if (moved)
              steps.push({
                dur: 190,
                run: () => {
                  updFx(uid, { moveMs: S(190), ease: 'out' })
                  updUnit(uid, (x) => ({ ...x, pos: ev.to }))
                  addFx({ kind: 'dust', at: ev.from, tone: 'neutral', ms: S(500) })
                  sfx('push', { pan: panOf(ev.to.x) })
                },
              })
            if (ev.bumped) {
              const bumped = ev.bumped
              steps.push({
                dur: 250,
                run: () => {
                  updFx(uid, { moveMs: 0 })
                  const other = bumped !== 'wall' && bumped !== 'cover' ? unitOf(bumped) : undefined
                  const d = (moved ? dirToward(ev.from, ev.to) : undefined) ?? (other ? dirToward(ev.to, other.pos) : ctxDir)
                  const v = d ? DIR_VEC[d] : { x: 0, y: 0 }
                  const at = { x: ev.to.x + v.x * 0.5, y: ev.to.y + v.y * 0.5 }
                  addFx({ kind: 'star', at, tone: 'warn', ms: S(520) })
                  addFx({ kind: 'dust', at, tone: 'neutral', ms: S(560) })
                  addFx({ kind: 'text', at: { x: at.x, y: at.y - 0.25 }, text: k ? '쾅!' : 'BUMP!', tone: 'word', ms: S(950) })
                  lunge(uid, d, 0.5)
                  if (other) recoil(other.uid, d, false)
                  trauma(bumped === 'wall' || bumped === 'cover' ? 0.5 : 0.42)
                  hitStop(S(70))
                  sfx('bump', { pan: panOf(ev.to.x), intensity: 1.3 })
                },
              })
            } else if (moved && !voidDrop) steps.push({ dur: 20, run: () => updFx(uid, { moveMs: 0 }) })
            break
          }

          case 'status':
            if (ev.amount > 0)
              steps.push({
                dur: 170,
                run: () => {
                  const u = unitOf(ev.uid)
                  if (!u) return
                  updUnit(ev.uid, (x) => ({ ...x, statuses: { ...x.statuses, [ev.status]: (x.statuses[ev.status] ?? 0) + ev.amount } }))
                  addFx({ kind: 'text', at: { x: u.pos.x - 0.2, y: u.pos.y - 0.25 }, text: `+${ev.amount}`, tone: 'status', icon: ev.status, ms: S(1050) })
                  const s = STATUS_SFX[ev.status]
                  if (s) sfx(s, { pan: panOf(u.pos.x) })
                },
              })
            break

          case 'death': {
            const uid = ev.uid
            const isFinal = finalKill && evIdx === lastDeathIdx
            const isVoid = ev.cause === 'void'
            steps.push({
              dur: (isVoid ? 720 : 560) + (isFinal ? 520 : 0),
              run: () => {
                const u = unitOf(uid)
                if (!u) return
                updFx(uid, { dying: ev.cause, pose: 'hit', moveMs: 0 })
                const src = lastSource.get(uid)
                const friendly = u.side === 'enemy' && src === 'enemy'
                const word = isVoid
                  ? k
                    ? '삭제!'
                    : 'VOID!'
                  : u.side !== 'enemy'
                    ? k
                      ? '쓰러짐'
                      : 'DOWN'
                    : friendly
                      ? k
                        ? '아군 사격!'
                        : 'FRIENDLY FIRE!'
                      : src === 'environment'
                        ? k
                          ? '환경 처치!'
                          : 'ENV KILL!'
                        : k
                          ? '처치!'
                          : 'KILL!'
                addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.45 }, text: word, tone: 'kill', ms: S(1300) })
                if (isVoid) {
                  addFx({ kind: 'pixels', at: u.pos, tone: 'enemy', ms: S(900) })
                  sfx('void', { pan: panOf(u.pos.x), intensity: 1.4 })
                  trauma(0.55)
                } else {
                  addFx({ kind: 'pixels', at: u.pos, tone: u.side === 'enemy' ? 'enemy' : 'party', ms: S(700) })
                  sfx('kill', { pan: panOf(u.pos.x), intensity: u.side === 'enemy' ? 1.2 : 0.8 })
                  trauma(0.35)
                }
                if (isFinal) zoomPunch(uid)
              },
            })
            steps.push({
              dur: 0,
              run: () => {
                const u = unitOf(uid)
                if (!u) return
                if (u.uid === 'connector') {
                  updFx(uid, { dying: undefined })
                  updUnit(uid, (x) => ({ ...x, hp: 0 }))
                } else {
                  const v = shadow.current
                  commit({ ...v, units: v.units.filter((x) => x.uid !== uid) })
                }
              },
            })
            break
          }

          case 'spawn': {
            const uid = ev.uid
            steps.push({
              dur: 400,
              run: () => {
                const nu = next.units.find((u) => u.uid === uid)
                if (!nu) return
                const v = shadow.current
                const units = v.units.some((u) => u.uid === uid) ? v.units : [...v.units, { ...nu, intent: null }]
                commit({ ...v, units, ufx: { ...v.ufx, [uid]: { pose: 'idle', moveMs: 0, spawning: true } } })
                addFx({ kind: 'ring', at: nu.pos, tone: 'enemy', ms: S(560) })
                sfx('telegraph', { pan: panOf(nu.pos.x) })
              },
            })
            break
          }

          case 'tile':
            steps.push({
              dur: 150,
              run: () => {
                const v = shadow.current
                const prevKind = v.tiles[ev.pos.y]?.[ev.pos.x]?.kind
                const nt = next.tiles[ev.pos.y]?.[ev.pos.x]
                const tile: Tile = nt && nt.kind === ev.kind ? nt : { kind: ev.kind }
                const tiles = v.tiles.map((row, y) => (y === ev.pos.y ? row.map((t, x) => (x === ev.pos.x ? tile : t)) : row))
                commit({ ...v, tiles })
                if (prevKind === 'cover' && ev.kind !== 'cover') {
                  addFx({ kind: 'debris', at: ev.pos, tone: 'neutral', ms: S(700) })
                  trauma(0.25)
                  sfx('bump', { pan: panOf(ev.pos.x), intensity: 0.8 })
                }
                if (ev.kind === 'cover') {
                  addFx({ kind: 'ring', at: ev.pos, tone: 'block', ms: S(460) })
                  sfx('block', { pan: panOf(ev.pos.x) })
                }
              },
            })
            break

          case 'fizzle':
            steps.push({
              dur: 380,
              run: () => {
                const u = unitOf(ev.uid)
                const v = shadow.current
                patch({ pendingIntents: v.pendingIntents ? v.pendingIntents.filter((x) => x !== ev.uid) : v.pendingIntents })
                if (!u) return
                addFx({ kind: 'text', at: { x: u.pos.x, y: u.pos.y - 0.3 }, text: k ? '불발' : 'FIZZLE', tone: 'fizzle', ms: S(950) })
                addFx({ kind: 'spark', at: u.pos, tone: 'warn', ms: S(420) })
                sfx('status_shock', { pan: panOf(u.pos.x) })
              },
            })
            break

          case 'phase':
            steps.push({
              dur: 1600,
              run: () => {
                const u = unitOf(ev.uid)
                showBanner({ kind: 'phase', title: u ? tr(u.name, lg) : k ? '페이즈 전환' : 'PHASE SHIFT', sub: tr(ev.text, lg) }, S(1750))
                if (u) {
                  addFx({ kind: 'nova', at: u.pos, tone: 'enemy', ms: S(760) })
                  pose(ev.uid, 'skill', S(1000))
                  squash(ev.uid)
                }
                trauma(0.8)
                sfx('phase')
              },
            })
            break

          case 'trigger':
            steps.push({
              dur: 240,
              run: () => {
                patch({ flashImplant: ev.implantId })
                later(() => {
                  if (shadow.current.flashImplant === ev.implantId) patch({ flashImplant: null })
                }, S(1000))
                sfx('energy', { volume: 0.6 })
              },
            })
            break

          case 'energy':
          case 'draw':
            break
        }
      })

      speed.current = baseSpeed.current
      commit(start)
      setBusyState(true)
      if (opts.endTurn && !events.some((e) => e.t === 'turn' && e.side === 'enemy')) setMusicDuck(true)
      let i = 0
      const tick = () => {
        const s = steps[i++]
        if (!s) {
          later(() => {
            const keep = shadow.current
            commit({ ...viewFrom(next), banner: keep.banner, flashImplant: keep.flashImplant })
            setBusyState(false)
            if (opts.endTurn) setMusicDuck(false)
            opts.onDone()
          }, S(140))
          return
        }
        s.run()
        if (s.dur <= 0) tick()
        else later(tick, S(s.dur))
      }
      tick()
    },
    [S, addFx, animFig, commit, figImg, hitStop, hurtFlash, later, lunge, patch, pose, recoil, showBanner, squash, trauma, unitOf, updFx, updUnit, whiteFlash, zoomPunch],
  )

  const registerFigure = useCallback((uid: string, el: HTMLElement | null) => {
    if (el) figures.current.set(uid, el)
    else figures.current.delete(uid)
  }, [])
  const registerStage = useCallback((el: HTMLElement | null) => {
    stage.current = el
  }, [])
  const registerBoard = useCallback((el: HTMLElement | null) => {
    board.current = el
  }, [])
  const registerHurt = useCallback((el: HTMLElement | null) => {
    hurt.current = el
  }, [])

  /** Fast-forward the rest of the running timeline (the next play() restores the normal pace). */
  const hurry = useCallback(() => {
    speed.current = Math.min(speed.current, HURRY_SPEED)
  }, [])

  return { view, fx, busy, play, snap, hurry, banner: showBanner, setBusy: setBusyState, trauma, registerFigure, registerStage, registerBoard, registerHurt }
}

/** Timeline pace while the player fast-forwards an enemy phase. */
const HURRY_SPEED = 0.3

const DIR_VEC: Record<Dir, Pos> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
