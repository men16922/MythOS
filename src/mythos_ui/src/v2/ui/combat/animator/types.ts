// Shapes shared by the combat animator (animator.ts) and its timeline builders: the displayed view, the
// transient FX list, the public Animator handle, and the kit / plan every event builder works with.

import type { CombatEvent, CombatState, ContentRegistry, Dir, Lang, Pos, Tile, UnitState } from '../../../engine/types.ts'
import type { SpritePose } from '../../common/assets.ts'

export interface UnitFx {
  pose: SpritePose
  /** Transition time for position changes (0 = jump). */
  moveMs: number
  /** 'in' accelerates into the end (a push about to slam into something). */
  ease?: 'linear' | 'out' | 'in'
  /** Horizontal side the sprite looks to while its facing is up/down (turned toward a target off-axis). */
  faceX?: 'left' | 'right'
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

export type FxTone = 'party' | 'enemy' | 'env' | 'heal' | 'block' | 'warn' | 'neutral' | 'fire' | 'shock' | 'gold'
export type TextTone = 'dmg' | 'crit' | 'heal' | 'block' | 'word' | 'kill' | 'status' | 'fizzle' | 'burn' | 'zap' | 'slam' | 'passive'
export type AreaElement = Extract<CombatEvent, { t: 'area' }>['element']
export type ImpactSurface = 'wall' | 'cover' | 'unit'

export type FxItem =
  | { id: number; kind: 'text'; at: BPt; text: string; tone: TextTone; icon?: string; ms: number }
  | { id: number; kind: 'bolt' | 'beam' | 'arc'; from: BPt; to: BPt; tone: FxTone; ms: number }
  | {
      id: number
      kind: 'slash' | 'spark' | 'nova' | 'burst' | 'shield' | 'debris' | 'dust' | 'star' | 'pixels' | 'ring' | 'flame' | 'zap' | 'smoke' | 'flare'
      at: BPt
      tone: FxTone
      ms: number
      dir?: Dir
    }
  | { id: number; kind: 'tiles'; tiles: Pos[]; tone: FxTone | 'pre'; ms: number }
  | { id: number; kind: 'card'; cardId: string; upgraded: boolean; rect: RectLike; to: BPt; ms: number }
  /** An area resolution erupting tile by tile, ring by ring outward from `center` (`ring` ms per ring). */
  | { id: number; kind: 'area'; tiles: Pos[]; center: Pos; element: AreaElement; side: 'party' | 'enemy'; ring: number; ms: number }
  /** Char marks left on the floor by fire / blasts (fade out). */
  | { id: number; kind: 'scorch'; tiles: Pos[]; element: 'fire' | 'blast'; ms: number }
  /** Ground shockwave ring; `radius` in tiles. */
  | { id: number; kind: 'wave'; at: BPt; radius: number; tone: FxTone; ms: number }
  /** A pushed unit slamming into the board edge / a cover block / another unit. `edge` (board coordinates, not
   *  tile-centred) is the wall segment that lights up. */
  | { id: number; kind: 'impact'; at: BPt; dir: Dir; surface: ImpactSurface; edge?: [BPt, BPt]; ms: number }

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

// ---------------------------------------------------------------- timeline building blocks

/** One engine event of kind `T`. */
export type Ev<T extends CombatEvent['t']> = Extract<CombatEvent, { t: T }>

/** One beat of a timeline: `run` fires, the next step waits `dur` (authored ms, scaled by the pace). */
export interface Step {
  dur: number
  run: () => void
}

/** Game-feel primitives on the registered board / figure elements (animator/feel.ts). */
export interface Feel {
  /** Screen shake: add trauma (0..1); decays on a rAF loop. */
  trauma: (t: number) => void
  /** Freeze every animation on the board for `ms` (hit-stop). */
  hitStop: (ms: number) => void
  figImg: (uid: string) => HTMLElement | null
  animFig: (uid: string, frames: Keyframe[], ms: number, easing?: string) => void
  lunge: (uid: string, d: Dir | undefined, strength?: number) => void
  recoil: (uid: string, d: Dir | undefined, big: boolean) => void
  whiteFlash: (uid: string, chroma: boolean) => void
  squash: (uid: string) => void
  turnTo: (uid: string, d: Dir, side: 'left' | 'right' | undefined) => void
  slam: (uid: string, d: Dir) => void
  zoomPunch: (uid: string) => void
  hurtFlash: () => void
  registerFigure: (uid: string, el: HTMLElement | null) => void
  registerStage: (el: HTMLElement | null) => void
  registerBoard: (el: HTMLElement | null) => void
  registerHurt: (el: HTMLElement | null) => void
}

/** What a timeline step can do when it runs: mutate the shown view, spawn FX, time things, move bodies. */
export interface Kit extends Feel {
  /** The view as last committed (steps read it at run time, never at planning time). */
  shadow: { readonly current: ViewState }
  commit: (v: ViewState) => void
  patch: (p: Partial<ViewState>) => void
  updUnit: (uid: string, fn: (u: UnitState) => UnitState) => void
  updFx: (uid: string, p: Partial<UnitFx>) => void
  unitOf: (uid: string) => UnitState | undefined
  pose: (uid: string, p: SpritePose, ms: number) => void
  addFx: (item: FxInput) => void
  showBanner: (b: Omit<Banner, 'key'> | null, ms?: number) => void
  /** Authored ms → ms at the current pace. */
  S: (ms: number) => number
  later: (fn: () => void, ms: number) => void
}

/** Planning state for one play(): the event list plus the context events hand to the ones after them. */
export interface Plan {
  prev: CombatState
  next: CombatState
  events: CombatEvent[]
  C: ContentRegistry
  lang: Lang
  k: boolean
  steps: Step[]
  /** The played card's screen rect; consumed by the first 'card' event. */
  cardInfo: PlayOpts['card']
  /** The first enemy move of the phase re-filters the visible intents (run time). */
  enemyMoved: boolean
  /** Context for directionless events (recoil / bump direction), set when a step runs. */
  ctxDir: Dir | undefined
  ctxFrom: Pos | undefined
  /** Who dealt each unit its last damage (kill attribution). */
  lastSource: Map<string, 'party' | 'enemy' | 'environment'>
  /** Index of the death that gets the final-kill punch (-1: none). */
  lastDeathIdx: number
  finalKill: boolean
  /** Planning time: inside an area resolution (its hits ripple). */
  inArea: boolean
  /** Planning time: burning ground as of each event. */
  planFire: Map<string, number>
}
