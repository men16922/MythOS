// Combat screen layout: the root's measured size picks a layout ('desk' ≥ 900 × 480, else a phone 'port' /
// 'land'), which sizes the HUD bands and the hand and fits the board's tile width into what is left.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { fitTileWidth, fitTileWidthFor, makeGeom } from '../geometry.ts'
import type { BoardGeom, GeomOpts } from '../geometry.ts'

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
    const short = H < 740
    const topH = short ? 54 : 62
    const partyH = short ? 42 : 46
    const peekH = short ? 46 : 54
    const fs = clamp(Math.min(W / 34, H / (short ? 76 : 72)), 8.6, 11.5)
    // hand (+ the number tabs above it) · draw / piles / items row · orb + end turn row · padding
    const row2 = short ? 32 : 36
    const row3 = short ? 44 : 50
    const bottomH = Math.round(fs * 15 + (short ? 14 : 16)) + row2 + row3 + 12 + (short ? 6 : 8)
    const bandTop = topH + partyH
    const bandH = H - bandTop - peekH - bottomH - 6
    const tw = fitTileWidthFor(W - 6, bandH, GEOM.port ?? {}, 36, 96)
    // The fan's outer cards tilt out past their slot: keep them off the screen edge.
    return { topH, fs, bottomH, sideW: W - 16, handW: W - (W < 390 ? 40 : 50), tw, bandTop, bandH, bias: 0.5, partyH, peekH, handPeek: 0 }
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

interface CombatLayout {
  rootRef: RefObject<HTMLDivElement | null>
  /** The root once mounted (the coach marks measure inside it). */
  rootEl: HTMLDivElement | null
  /** Height fitted to the viewport below the root's top (null while an ancestor pins --m2c-h). */
  autoH: number | null
  W: number
  H: number
  mode: LayoutMode
  compact: boolean
  lay: Layout
  g: BoardGeom
  boardLeft: number
  boardTop: number
}

/** Measures the combat root and derives the layout, the board geometry and the board's position. */
export function useCombatLayout(): CombatLayout {
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
  const lay = computeLayout(mode, W, H)
  const g = useMemo(() => makeGeom(lay.tw, GEOM[mode]), [lay.tw, mode])
  const boardLeft = Math.round((W - g.width) / 2)
  const boardTop = Math.round(lay.bandTop + Math.max(0, lay.bandH - g.height) * lay.bias)
  return { rootRef, rootEl, autoH, W, H, mode, compact: mode !== 'desk', lay, g, boardLeft, boardTop }
}
