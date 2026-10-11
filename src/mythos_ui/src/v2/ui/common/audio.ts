// Music + legacy sample playback.
//
// Music is decoded into AudioBuffers and played through the WebAudio music bus in sfx.ts:
// sample-accurate seamless loops, equal-power crossfades between tracks, and the
// enemy-phase duck (`setMusicDuck`) all come from that graph. Browsers block audio until
// the first user gesture — `unlockAudio()` is called from the title screen's first click;
// a track requested before that starts as soon as audio unlocks.

import { MUSIC } from './artManifest.ts'
import { asset } from './assets.ts'
import { initSfx, musicBus, setSfxEnabled } from './sfx.ts'

/** Track keys. Legacy 1.x names are mapped onto the 2.0 score (see LEGACY). */
export type Bgm =
  | 'title'
  | 'hub'
  | 'map1'
  | 'map2'
  | 'map3'
  | 'event'
  | 'shop'
  | 'rest'
  | 'combat1'
  | 'combat2'
  | 'combat3'
  | 'elite'
  | 'boss1'
  | 'boss2'
  | 'boss_ix'
  | 'victory'
  | 'defeat'
  | 'ending'
  | 'calm'
  | 'main'
  | 'tense'
  | 'unstable'
  | 'combat_normal'
  | 'combat_crisis'
  | 'combat_boss'
  | null

const LEGACY: Record<string, string> = {
  calm: 'hub',
  main: 'event',
  tense: 'map1',
  unstable: 'map2',
  combat_normal: 'combat1',
  combat_crisis: 'elite',
  combat_boss: 'boss1',
}

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
const MUSIC_LEVEL = 0.55

/**
 * Hard mute for automated/agent testing: `?mute=1` in the URL or localStorage 'mythos2.mute' = '1'.
 * Overrides the player's settings entirely — no AudioContext is ever created.
 */
export function isHardMuted(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('mute') === '1') return true
    return window.localStorage.getItem('mythos2.mute') === '1'
  } catch {
    return false
  }
}

const HARD_MUTE = typeof window !== 'undefined' && isHardMuted()

let unlocked = false
let bgmOn = !HARD_MUTE
let sfxOn = !HARD_MUTE
let wanted: string | null = null
let current: { key: string; src: AudioBufferSourceNode; gain: GainNode } | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()
const cache = new Map<string, HTMLAudioElement>()

export function configureAudio(opts: { bgm: boolean; sfx: boolean }): void {
  const bgm = opts.bgm && !HARD_MUTE
  const sfx = opts.sfx && !HARD_MUTE
  const bgmChanged = bgm !== bgmOn
  bgmOn = bgm
  sfxOn = sfx
  setSfxEnabled(sfx)
  if (bgmChanged) {
    if (!bgmOn) stopCurrent(0.4)
    else if (wanted) void startTrack(wanted)
  }
}

export function unlockAudio(): void {
  if (unlocked || HARD_MUTE) return
  unlocked = true
  initSfx()
  if (wanted) void startTrack(wanted)
}

export function playBgm(key: Bgm): void {
  const resolved = key ? (LEGACY[key] ?? key) : null
  if (resolved === wanted) return
  wanted = resolved
  if (!resolved) {
    stopCurrent(0.8)
    return
  }
  void startTrack(resolved)
}

/** Fire-and-forget authored sample (prefer `sfx()` from sfx.ts for game-feel cues). */
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

function trackPath(key: string): string | null {
  // Every cue has a generated loop (content/art.test.ts guards it).
  return MUSIC[key] ?? null
}

function loadBuffer(ctx: AudioContext, path: string): Promise<AudioBuffer | null> {
  let p = buffers.get(path)
  if (!p) {
    p = fetch(asset(path))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => null)
    buffers.set(path, p)
  }
  return p
}

async function startTrack(key: string): Promise<void> {
  if (!unlocked || !bgmOn) return
  const bus = musicBus()
  const path = trackPath(key)
  if (!bus || !path) return
  if (current?.key === key) return
  const buffer = await loadBuffer(bus.ctx, path)
  // The request may have changed while decoding.
  if (!buffer || wanted !== key || !bgmOn || current?.key === key) return
  stopCurrent(1.0)
  const { ctx } = bus
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const gain = ctx.createGain()
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(MUSIC_LEVEL, t + 1.2)
  src.connect(gain).connect(bus.input)
  src.start(t)
  current = { key, src, gain }
}

function stopCurrent(fadeSeconds: number): void {
  const bus = musicBus()
  if (!current || !bus) {
    current = null
    return
  }
  const { src, gain } = current
  const t = bus.ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeSeconds)
  src.stop(t + fadeSeconds + 0.05)
  current = null
}
