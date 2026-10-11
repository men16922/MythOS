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
//
// This file owns the view state, the timers and the step runner; animator/feel.ts the game-feel
// primitives; animator/timeline.ts turns an event list into steps (per-kind builders in animator/*.ts).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CombatState, ContentRegistry, Lang, UnitState } from '../../engine/types.ts'
import type { SpritePose } from '../common/assets.ts'
import { setMusicDuck } from '../common/sfx.ts'
import { useFeel } from './animator/feel.ts'
import { HURRY_SPEED, fxLife, viewFrom } from './animator/helpers.ts'
import { planTimeline } from './animator/timeline.ts'
import type { Animator, Banner, FxInput, FxItem, Kit, PlayOpts, UnitFx, ViewState } from './animator/types.ts'

export { viewFrom } from './animator/helpers.ts'
export type { AreaElement, BPt, Banner, FxItem, RectLike, UnitFx, ViewState } from './animator/types.ts'

export function useCombatAnimator(C: ContentRegistry, initial: CombatState, fast: boolean, lang: Lang): Animator {
  const [view, setView] = useState<ViewState>(() => viewFrom(initial))
  const [fx, setFx] = useState<FxItem[]>([])
  const [busy, setBusyState] = useState(false)
  const shadow = useRef<ViewState>(view)
  const timers = useRef(new Set<number>())
  const ids = useRef(1)
  // Default pacing is 0.8× the authored timings (playtest: enemy phases dragged at 1×); fast mode ≈ 0.45×.
  const speed = useRef(fast ? 0.45 : 0.8)
  const langRef = useRef(lang)
  const CRef = useRef(C)

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
      later(() => setFx((list) => list.filter((f) => f.id !== id)), fxLife(full) + 80)
    },
    [later],
  )

  // ------------------------------------------------------------ game-feel primitives

  const feel = useFeel({ speed, S, later, updFx, updUnit })

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

  const kit: Kit = useMemo(
    () => ({ ...feel, shadow, commit, patch, updUnit, updFx, unitOf, pose, addFx, showBanner, S, later }),
    [feel, commit, patch, updUnit, updFx, unitOf, pose, addFx, showBanner, S, later],
  )

  const play = useCallback(
    (prev: CombatState, next: CombatState, opts: PlayOpts) => {
      const { start, steps, events } = planTimeline(kit, CRef.current, langRef.current, prev, next, opts)

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
    [S, commit, kit, later],
  )

  /** Fast-forward the rest of the running timeline (the next play() restores the normal pace). */
  const hurry = useCallback(() => {
    speed.current = Math.min(speed.current, HURRY_SPEED)
  }, [])

  return {
    view,
    fx,
    busy,
    play,
    snap,
    hurry,
    banner: showBanner,
    setBusy: setBusyState,
    trauma: feel.trauma,
    registerFigure: feel.registerFigure,
    registerStage: feel.registerStage,
    registerBoard: feel.registerBoard,
    registerHurt: feel.registerHurt,
  }
}
