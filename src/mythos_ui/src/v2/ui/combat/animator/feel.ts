// Game-feel primitives for the combat animator: trauma screen shake (rAF), hit-stop, and one-shot Web
// Animations on the registered unit figures / board / hurt overlay (anticipation + lunge, recoil, white
// flash, squash, turn-to-face, slam, final-kill zoom punch).

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { Dir, UnitState } from '../../../engine/types.ts'
import { DIR_PCT, TURN_MS } from './helpers.ts'
import type { Feel, UnitFx } from './types.ts'

interface FeelDeps {
  /** Current timeline pace (shake decays faster while it runs fast). */
  speed: RefObject<number>
  S: (ms: number) => number
  later: (fn: () => void, ms: number) => void
  updFx: (uid: string, p: Partial<UnitFx>) => void
  updUnit: (uid: string, fn: (u: UnitState) => UnitState) => void
}

export function useFeel({ speed, S, later, updFx, updUnit }: FeelDeps): Feel {
  const figures = useRef(new Map<string, HTMLElement>())
  const stage = useRef<HTMLElement | null>(null)
  const board = useRef<HTMLElement | null>(null)
  const hurt = useRef<HTMLElement | null>(null)
  const traumaV = useRef(0)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const trauma = useCallback(
    (t: number) => {
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
    },
    [speed],
  )

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

  /** Turn to face `d` (sprite flips; `side` keeps the look left/right when `d` is up/down), with a quick pivot
   *  squash that doubles as the anticipation beat before the action. */
  const turnTo = useCallback(
    (uid: string, d: Dir, side: 'left' | 'right' | undefined) => {
      updUnit(uid, (x) => ({ ...x, facing: d }))
      if (side) updFx(uid, { faceX: side })
      animFig(
        uid,
        [{ transform: 'scale(0.25, 1.04)' }, { transform: 'scale(1.08, 0.9)', offset: 0.55 }, { transform: 'scale(0.98, 1.03)', offset: 0.8 }, { transform: 'scale(1, 1)' }],
        S(TURN_MS + 50),
        'cubic-bezier(.2,.8,.3,1)',
      )
    },
    [S, animFig, updFx, updUnit],
  )

  /** Pushed into something: drive into it, squash flat against it, bounce back. */
  const slam = useCallback(
    (uid: string, d: Dir) => {
      const [vx, vy] = DIR_PCT[d]
      animFig(
        uid,
        [
          { transform: 'translate(0,0) rotate(0) scale(1,1)' },
          { transform: `translate(${vx * 24}%, ${vy * 24}%) rotate(${vx * 7}deg) scale(${vx ? 0.8 : 1.12}, ${vx ? 1.1 : 0.84})`, offset: 0.16 },
          { transform: `translate(${-vx * 9}%, ${-vy * 9}%) rotate(${-vx * 4}deg) scale(1.04, 0.97)`, offset: 0.48 },
          { transform: `translate(${vx * 2}%, ${vy * 2}%) rotate(0) scale(1,1)`, offset: 0.75 },
          { transform: 'translate(0,0) rotate(0) scale(1,1)' },
        ],
        S(460),
        'cubic-bezier(.2,.7,.3,1)',
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
      el.animate(
        [
          { transform: 'scale(1)', transformOrigin: origin },
          { transform: 'scale(1.09)', transformOrigin: origin, offset: 0.35 },
          { transform: 'scale(1)', transformOrigin: origin },
        ],
        {
          duration: 900,
          easing: 'cubic-bezier(.2,.8,.2,1)',
        },
      )
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

  return useMemo(
    () => ({ trauma, hitStop, figImg, animFig, lunge, recoil, whiteFlash, squash, turnTo, slam, zoomPunch, hurtFlash, registerFigure, registerStage, registerBoard, registerHurt }),
    [trauma, hitStop, figImg, animFig, lunge, recoil, whiteFlash, squash, turnTo, slam, zoomPunch, hurtFlash, registerFigure, registerStage, registerBoard, registerHurt],
  )
}
