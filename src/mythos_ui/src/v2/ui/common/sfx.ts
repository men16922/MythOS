// Procedural game-feel audio (WebAudio). Every cue is synthesised on the fly and, where it
// helps, layered over one of the authored samples in resources/neo-seoul/audio so hits have
// weight, UI has texture and the music can be ducked/filtered during the enemy phase.
//
//   sfx('hit_heavy', { intensity: 1.4, pan: -0.3 })
//   setMusicDuck(true)    // muffle + lower the BGM (enemy phase, modals)
//
// The context is created lazily on the first user gesture (`initSfx`, called by unlockAudio).

import { asset } from './assets.ts'

export type SfxName =
  | 'ui_hover'
  | 'ui_click'
  | 'transition'
  | 'card_hover'
  | 'card_draw'
  | 'card_play'
  | 'energy'
  | 'error'
  | 'move'
  | 'push'
  | 'swing'
  | 'shoot'
  | 'beam'
  | 'lob'
  | 'hit_light'
  | 'hit_heavy'
  | 'kill'
  | 'bump'
  | 'void'
  | 'block'
  | 'heal'
  | 'status_burn'
  | 'status_shock'
  | 'status_mark'
  | 'telegraph'
  | 'windup'
  | 'enemy_turn'
  | 'player_turn'
  | 'phase'
  | 'victory'
  | 'defeat'
  | 'coin'
  | 'buy'
  | 'reward'
  | 'rare'
  | 'map_step'
  | 'roll_tick'
  | 'success'
  | 'fail'
  | 'alarm'
  | 'type_tick'
  | 'unlock'

export interface SfxOpts {
  /** 0.3 … 2 — scales loudness, pitch drop and body of impact sounds. Default 1. */
  intensity?: number
  /** -1 (left) … 1 (right). */
  pan?: number
  /** Overall volume multiplier. */
  volume?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxBus: GainNode | null = null
let reverbSend: GainNode | null = null
let musicFilter: BiquadFilterNode | null = null
let musicGain: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let enabled = true
const samples = new Map<string, AudioBuffer | 'loading' | 'failed'>()
const lastPlayed = new Map<string, number>()

const SAMPLE_PATHS: Record<string, string> = {
  attack: 'audio/sfx/sfx_attack.wav',
  defend: 'audio/sfx/sfx_defend.wav',
  glitch: 'audio/sfx/sfx_glitch.wav',
  move: 'audio/sfx/sfx_move.wav',
  pickup: 'audio/sfx/sfx_pickup.wav',
  sting: 'audio/sfx/sfx_sting.wav',
  victory: 'audio/sfx/sfx_victory.wav',
  defeat: 'audio/sfx/sfx_defeat.wav',
  alarm: 'audio/sfx/sfx_alarm.wav',
  drone: 'audio/sfx/sfx_drone.wav',
  overload: 'audio/sfx/skills/overload_strike.wav',
  packet: 'audio/sfx/skills/packet_shot.wav',
  shield: 'audio/sfx/skills/patch_protocol.wav',
  step: 'audio/sfx/skills/signal_step.wav',
}

export function setSfxEnabled(on: boolean): void {
  enabled = on
}

/** Create the audio graph. Safe to call repeatedly; must run inside a user gesture the first time. */
export function initSfx(): AudioContext | null {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.knee.value = 10
  comp.ratio.value = 4
  comp.attack.value = 0.003
  comp.release.value = 0.18
  master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(comp).connect(ctx.destination)

  sfxBus = ctx.createGain()
  sfxBus.gain.value = 0.85
  sfxBus.connect(master)

  // Short synthetic room so impacts sit in a space instead of clicking dry.
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1.1, 3.2)
  reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.22
  reverbSend.connect(convolver).connect(master)

  musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 20000
  musicFilter.Q.value = 0.7
  musicGain = ctx.createGain()
  musicGain.gain.value = 1
  musicFilter.connect(musicGain).connect(master)

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  for (const key of Object.keys(SAMPLE_PATHS)) void loadSample(key)
  return ctx
}

/** The duckable music bus input (null until `initSfx` ran). */
export function musicBus(): { ctx: AudioContext; input: AudioNode } | null {
  if (!ctx || !musicFilter) return null
  return { ctx, input: musicFilter }
}

/** Muffle and lower the music (enemy phase, modal moments). */
export function setMusicDuck(on: boolean): void {
  if (!ctx || !musicFilter || !musicGain) return
  const t = ctx.currentTime
  musicFilter.frequency.cancelScheduledValues(t)
  musicGain.gain.cancelScheduledValues(t)
  musicFilter.frequency.setTargetAtTime(on ? 900 : 20000, t, on ? 0.12 : 0.35)
  musicGain.gain.setTargetAtTime(on ? 0.62 : 1, t, 0.2)
}

export function sfx(name: SfxName, opts: SfxOpts = {}): void {
  if (!enabled || !ctx || !sfxBus || ctx.state !== 'running') return
  // Collapse identical cues fired in the same instant (e.g. an AoE hitting 4 units).
  const now = performance.now()
  const minGap = name === 'roll_tick' || name === 'type_tick' ? 25 : 38
  if (now - (lastPlayed.get(name) ?? 0) < minGap) return
  lastPlayed.set(name, now)

  const k = clamp(opts.intensity ?? 1, 0.3, 2)
  const out = ctx.createGain()
  out.gain.value = opts.volume ?? 1
  const panner = ctx.createStereoPanner()
  panner.pan.value = clamp(opts.pan ?? 0, -1, 1)
  out.connect(panner).connect(sfxBus)
  const v = new Voice(ctx, out, reverbSend)

  switch (name) {
    case 'ui_hover':
      v.tone(2600, 'sine', 0.001, 0.025, 0.035)
      break
    case 'ui_click':
      v.tone(1500, 'square', 0.001, 0.03, 0.05, 900)
      v.noise('highpass', 5000, 0.001, 0.02, 0.05)
      break
    case 'transition':
      v.noise('bandpass', 600, 0.01, 0.28, 0.16, 4000)
      v.tone(220, 'sawtooth', 0.01, 0.25, 0.05, 110)
      break
    case 'card_hover':
      v.tone(3200, 'sine', 0.001, 0.018, 0.03)
      break
    case 'card_draw':
      v.noise('bandpass', 1400, 0.004, 0.07, 0.12, 3200)
      break
    case 'card_play':
      v.noise('bandpass', 500, 0.01, 0.16, 0.28, 3000)
      v.tone(420, 'triangle', 0.005, 0.14, 0.14, 840)
      break
    case 'energy':
      v.tone(880, 'sine', 0.003, 0.12, 0.12, 1320)
      break
    case 'error':
      v.tone(170, 'square', 0.002, 0.07, 0.12)
      v.tone(150, 'square', 0.002, 0.07, 0.12, undefined, 0.09)
      break
    case 'move':
      v.noise('lowpass', 500, 0.003, 0.06, 0.25)
      v.sample('step', 0.25)
      break
    case 'push':
      v.noise('bandpass', 300, 0.01, 0.18, 0.3, 1800)
      break
    case 'swing':
      v.noise('bandpass', 900, 0.005, 0.12, 0.35, 4200)
      break
    case 'shoot':
      v.tone(1900, 'square', 0.001, 0.12, 0.13, 260)
      v.sample('packet', 0.35)
      break
    case 'beam':
      v.tone(140, 'sawtooth', 0.02, 0.42, 0.22, 90)
      v.tone(1800, 'sine', 0.01, 0.35, 0.08, 2600)
      v.noise('bandpass', 2400, 0.02, 0.4, 0.14)
      break
    case 'lob':
      v.tone(900, 'sine', 0.01, 0.4, 0.07, 300)
      v.tone(90, 'sine', 0.002, 0.12, 0.3, 50)
      break
    case 'hit_light':
      v.tone(170 * (1.1 - 0.1 * k), 'sine', 0.001, 0.11 * k, 0.55 * k, 60)
      v.noise('bandpass', 2200, 0.001, 0.06, 0.4 * k)
      v.sample('attack', 0.3 * k)
      break
    case 'hit_heavy':
      v.tone(130 * (1.1 - 0.1 * k), 'sine', 0.001, 0.24 * k, 0.9 * k, 38)
      v.noise('lowpass', 1100, 0.001, 0.18 * k, 0.55 * k)
      v.tone(2200, 'square', 0.001, 0.018, 0.12)
      v.crunch(0.16 * k, 0.35 * k)
      v.sample('attack', 0.45 * k)
      break
    case 'kill':
      v.tone(110, 'sine', 0.001, 0.32, 1, 32)
      v.tone(620, 'sawtooth', 0.004, 0.24, 0.16, 70)
      v.stutter(6, 0.03, 0.22)
      v.crunch(0.22, 0.4)
      v.sample('glitch', 0.4)
      break
    case 'bump':
      v.tone(95, 'sine', 0.001, 0.16 * k, 0.85 * k, 42)
      v.tone(420, 'triangle', 0.001, 0.035, 0.2)
      v.noise('lowpass', 700, 0.001, 0.1, 0.4 * k)
      break
    case 'void':
      v.tone(900, 'sine', 0.005, 0.7, 0.3, 45)
      v.stutter(10, 0.035, 0.25)
      v.sample('glitch', 0.6)
      break
    case 'block':
      v.tone(1400, 'triangle', 0.001, 0.28, 0.14)
      v.tone(1873, 'triangle', 0.001, 0.22, 0.1)
      v.noise('highpass', 6000, 0.001, 0.05, 0.18)
      v.sample('defend', 0.3)
      break
    case 'heal':
      v.tone(523, 'sine', 0.01, 0.2, 0.12)
      v.tone(659, 'sine', 0.01, 0.2, 0.12, undefined, 0.07)
      v.tone(784, 'sine', 0.01, 0.3, 0.12, undefined, 0.14)
      break
    case 'status_burn':
      for (let i = 0; i < 6; i++) v.noise('highpass', 2500, 0.001, 0.025, 0.18, undefined, i * 0.035 + Math.random() * 0.02)
      v.noise('lowpass', 600, 0.02, 0.3, 0.14)
      break
    case 'status_shock':
      v.zap(0.28)
      break
    case 'status_mark':
      v.tone(1200, 'sine', 0.002, 0.16, 0.12, 1800)
      v.tone(600, 'square', 0.002, 0.05, 0.05)
      break
    case 'telegraph':
      v.tone(440, 'square', 0.002, 0.05, 0.05)
      v.tone(660, 'square', 0.002, 0.05, 0.05, undefined, 0.08)
      break
    case 'windup':
      v.tone(62, 'sine', 0.004, 0.12, 0.6, 40)
      v.tone(58, 'sine', 0.004, 0.14, 0.45, 38, 0.19)
      break
    case 'enemy_turn':
      v.tone(55, 'sawtooth', 0.08, 0.7, 0.18, 48)
      v.noise('lowpass', 300, 0.1, 0.6, 0.18)
      v.sample('drone', 0.25)
      break
    case 'player_turn':
      v.tone(660, 'sine', 0.004, 0.22, 0.12)
      v.tone(990, 'sine', 0.004, 0.3, 0.1, undefined, 0.06)
      break
    case 'phase':
      v.tone(70, 'sine', 0.001, 0.9, 1, 28)
      v.noise('lowpass', 900, 0.001, 0.7, 0.5)
      v.crunch(0.5, 0.35)
      v.sample('sting', 0.7)
      break
    case 'victory':
      v.sample('victory', 0.7)
      for (const [i, f] of [523, 659, 784, 1047].entries()) v.tone(f, 'triangle', 0.005, 0.5, 0.11, undefined, i * 0.09)
      break
    case 'defeat':
      v.sample('defeat', 0.7)
      for (const [i, f] of [392, 311, 262, 196].entries()) v.tone(f, 'sawtooth', 0.01, 0.6, 0.06, undefined, i * 0.16)
      break
    case 'coin':
      v.tone(988, 'square', 0.001, 0.06, 0.06)
      v.tone(1319, 'square', 0.001, 0.22, 0.06, undefined, 0.06)
      break
    case 'buy':
      v.tone(988, 'square', 0.001, 0.06, 0.06)
      v.tone(1319, 'square', 0.001, 0.2, 0.06, undefined, 0.06)
      v.noise('highpass', 4000, 0.001, 0.04, 0.12)
      v.sample('pickup', 0.3)
      break
    case 'reward':
      v.shimmer(5, 0.1)
      v.sample('pickup', 0.35)
      break
    case 'rare':
      v.shimmer(9, 0.13)
      v.tone(1568, 'sine', 0.002, 0.9, 0.12)
      v.tone(2093, 'sine', 0.002, 1.1, 0.1, undefined, 0.12)
      v.sample('sting', 0.35)
      break
    case 'map_step':
      v.tone(120, 'sine', 0.002, 0.12, 0.35, 70)
      v.tone(1800, 'sine', 0.001, 0.04, 0.05)
      break
    case 'roll_tick':
      v.tone(2000 + Math.random() * 600, 'square', 0.001, 0.015, 0.035)
      break
    case 'success':
      v.tone(523, 'square', 0.002, 0.25, 0.08)
      v.tone(784, 'square', 0.002, 0.3, 0.07)
      v.tone(1047, 'square', 0.002, 0.4, 0.06, undefined, 0.05)
      v.noise('lowpass', 1500, 0.001, 0.1, 0.35)
      break
    case 'fail':
      v.tone(150, 'sawtooth', 0.002, 0.35, 0.18, 90)
      v.noise('lowpass', 500, 0.001, 0.16, 0.45)
      break
    case 'alarm':
      v.tone(620, 'square', 0.01, 0.22, 0.07, 900)
      v.tone(620, 'square', 0.01, 0.22, 0.07, 900, 0.26)
      break
    case 'type_tick':
      v.tone(1700 + Math.random() * 500, 'square', 0.001, 0.008, 0.018)
      break
    case 'unlock':
      v.tone(220, 'sawtooth', 0.25, 0.1, 0.12, 880)
      v.shimmer(7, 0.12, 0.32)
      v.tone(80, 'sine', 0.001, 0.4, 0.6, 40, 0.32)
      v.sample('sting', 0.4, 0.3)
      break
  }
}

// ---------------------------------------------------------------- voice helpers

class Voice {
  private readonly ac: AudioContext
  private readonly out: AudioNode
  private readonly send: AudioNode | null

  constructor(ac: AudioContext, out: AudioNode, send: AudioNode | null) {
    this.ac = ac
    this.out = out
    this.send = send
  }

  private env(g: GainNode, start: number, attack: number, decay: number, peak: number): void {
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
  }

  private route(node: AudioNode, wet = false): void {
    node.connect(this.out)
    if (wet && this.send) node.connect(this.send)
  }

  tone(freq: number, type: OscillatorType, attack: number, decay: number, peak: number, glideTo?: number, delay = 0): void {
    const t = this.ac.currentTime + delay
    const osc = this.ac.createOscillator()
    const g = this.ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + attack + decay)
    this.env(g, t, attack, decay, peak)
    osc.connect(g)
    this.route(g, decay > 0.15)
    osc.start(t)
    osc.stop(t + attack + decay + 0.05)
  }

  noise(type: BiquadFilterType, freq: number, attack: number, decay: number, peak: number, sweepTo?: number, delay = 0): void {
    if (!noiseBuf) return
    const t = this.ac.currentTime + delay
    const src = this.ac.createBufferSource()
    src.buffer = noiseBuf
    const f = this.ac.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, t)
    f.Q.value = type === 'bandpass' ? 1.4 : 0.8
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay)
    const g = this.ac.createGain()
    this.env(g, t, attack, decay, peak)
    src.connect(f).connect(g)
    this.route(g, decay > 0.12)
    src.start(t, Math.random() * 0.5)
    src.stop(t + attack + decay + 0.05)
  }

  /** Distorted low-mid burst — the "crunch" that sells a heavy hit. */
  crunch(decay: number, peak: number): void {
    if (!noiseBuf) return
    const t = this.ac.currentTime
    const src = this.ac.createBufferSource()
    src.buffer = noiseBuf
    const shaper = this.ac.createWaveShaper()
    shaper.curve = distortionCurve(60)
    const f = this.ac.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 1800
    const g = this.ac.createGain()
    this.env(g, t, 0.001, decay, peak)
    src.connect(shaper).connect(f).connect(g)
    this.route(g, true)
    src.start(t)
    src.stop(t + decay + 0.05)
  }

  /** Gated digital stutter (glitch / deletion). */
  stutter(count: number, step: number, peak: number): void {
    for (let i = 0; i < count; i++) {
      const f = 400 + Math.random() * 3000
      this.tone(f, 'square', 0.001, step * 0.6, peak * (1 - i / (count + 2)), undefined, i * step)
    }
  }

  zap(dur: number): void {
    const t = this.ac.currentTime
    const osc = this.ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 220
    const lfo = this.ac.createOscillator()
    lfo.frequency.value = 38
    const lfoGain = this.ac.createGain()
    lfoGain.gain.value = 900
    lfo.connect(lfoGain).connect(osc.frequency)
    const g = this.ac.createGain()
    this.env(g, t, 0.003, dur, 0.16)
    const f = this.ac.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 500
    osc.connect(f).connect(g)
    this.route(g)
    osc.start(t)
    lfo.start(t)
    osc.stop(t + dur + 0.05)
    lfo.stop(t + dur + 0.05)
    this.noise('highpass', 3000, 0.001, dur * 0.8, 0.12)
  }

  shimmer(partials: number, peak: number, delay = 0): void {
    for (let i = 0; i < partials; i++) {
      const f = 1800 + Math.random() * 3200
      this.tone(f, 'sine', 0.003, 0.35 + Math.random() * 0.4, peak * (0.5 + Math.random() * 0.5), undefined, delay + i * 0.035)
    }
  }

  sample(key: string, gain: number, delay = 0): void {
    const buf = samples.get(key)
    if (!buf || buf === 'loading' || buf === 'failed') return
    const t = this.ac.currentTime + delay
    const src = this.ac.createBufferSource()
    src.buffer = buf
    const g = this.ac.createGain()
    g.gain.value = gain
    src.connect(g)
    this.route(g)
    src.start(t)
  }
}

async function loadSample(key: string): Promise<void> {
  if (!ctx || samples.has(key)) return
  const path = SAMPLE_PATHS[key]
  if (!path) return
  samples.set(key, 'loading')
  try {
    const res = await fetch(asset(path))
    const arr = await res.arrayBuffer()
    samples.set(key, await ctx.decodeAudioData(arr))
  } catch {
    samples.set(key, 'failed')
  }
}

function makeImpulse(ac: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
