// Minimal audio manager: one looping BGM channel + fire-and-forget SFX.
// Browsers block audio until the first user gesture; `unlockAudio()` is called from
// the title screen's first click.

import { asset } from './assets.ts'

export type Bgm = 'calm' | 'main' | 'tense' | 'unstable' | 'combat_normal' | 'combat_crisis' | 'combat_boss' | null
export type Sfx =
  | 'alarm'
  | 'attack'
  | 'defeat'
  | 'defend'
  | 'drone'
  | 'glitch'
  | 'move'
  | 'pickup'
  | 'sting'
  | 'victory'
  | 'covering_noise'
  | 'overload_strike'
  | 'packet_shot'
  | 'patch_protocol'
  | 'signal_step'

const SKILL_SFX = new Set(['covering_noise', 'overload_strike', 'packet_shot', 'patch_protocol', 'signal_step'])

let bgmEl: HTMLAudioElement | null = null
let bgmKey: Bgm = null
let unlocked = false
let bgmOn = true
let sfxOn = true
const cache = new Map<string, HTMLAudioElement>()

export function configureAudio(opts: { bgm: boolean; sfx: boolean }): void {
  bgmOn = opts.bgm
  sfxOn = opts.sfx
  if (!bgmOn && bgmEl) bgmEl.pause()
  if (bgmOn && bgmEl && unlocked) void bgmEl.play().catch(() => undefined)
}

export function unlockAudio(): void {
  unlocked = true
  if (bgmOn && bgmEl) void bgmEl.play().catch(() => undefined)
}

export function playBgm(key: Bgm): void {
  if (key === bgmKey) return
  bgmKey = key
  if (bgmEl) {
    const old = bgmEl
    fade(old, old.volume, 0, 600, () => old.pause())
    bgmEl = null
  }
  if (!key) return
  const el = new Audio(asset(`audio/bgm_${key}.wav`))
  el.loop = true
  el.volume = 0
  bgmEl = el
  if (bgmOn && unlocked) {
    void el.play().catch(() => undefined)
    fade(el, 0, 0.35, 900)
  } else {
    el.volume = 0.35
  }
}

export function playSfx(key: Sfx, volume = 0.6): void {
  if (!sfxOn || !unlocked) return
  const path = SKILL_SFX.has(key) ? `audio/sfx/skills/${key}.wav` : `audio/sfx/sfx_${key}.wav`
  let base = cache.get(path)
  if (!base) {
    base = new Audio(asset(path))
    base.preload = 'auto'
    cache.set(path, base)
  }
  const el = base.cloneNode(true) as HTMLAudioElement
  el.volume = volume
  void el.play().catch(() => undefined)
}

function fade(el: HTMLAudioElement, from: number, to: number, ms: number, done?: () => void): void {
  const start = performance.now()
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / ms)
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(step)
    else done?.()
  }
  requestAnimationFrame(step)
}
