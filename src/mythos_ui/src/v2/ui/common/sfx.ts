// Procedural game-feel audio (WebAudio). Every cue is synthesised on the fly and, where it
// helps, layered over one of the authored samples in resources/neo-seoul/audio so hits have
// weight, UI has texture and the music can be ducked/filtered during the enemy phase.
//
//   sfx('hit_heavy', { intensity: 1.4, pan: -0.3 })
//   setMusicDuck(true)    // muffle + lower the BGM (enemy phase, modals)
//
// The context is created lazily on the first user gesture (`initSfx`, called by unlockAudio).
//
// Graph:  voices → panner → sfxBus → sfxComp (slow attack: transients punch through) ─┐
//         reverb send → convolver ──────────────────────────────────────────────────┤→ master → limiter → soft clip → out
//         music → musicFilter → musicGain → impactDuck → musicComp (the original glue) ┘
// Impacts layer a saturated sub thump (pitch-dropping sine whose harmonics survive laptop speakers), a
// transient click and a noise body. Big ones dip the music for a beat (impactDuck). The limiter + soft clip
// keep a whole AoE turn of stacked cues below full scale.

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
  | 'explosion'
  | 'shockwave'
  | 'ignite'
  | 'fire_tick'
  | 'extinguish'
  | 'zap'
  | 'wall_slam'
  | 'passive'

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
let impactDuck: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let driveCurve: Float32Array<ArrayBuffer> | null = null
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
  // Output stage: a fast limiter (≈ -1 dBFS ceiling once its automatic makeup gain is cancelled by `master`)
  // and a soft clip that is transparent below -1.4 dBFS and never reaches full scale.
  const limiter = compressor(ctx, LIMIT_THRESHOLD, 0, 20, 0.001, 0.09)
  const clipIn = ctx.createGain()
  clipIn.gain.value = 0.5
  const clip = ctx.createWaveShaper()
  clip.curve = softClipCurve()
  master = ctx.createGain()
  master.gain.value = 1 / makeupGain(LIMIT_THRESHOLD, 20)
  master.connect(limiter).connect(clipIn).connect(clip).connect(ctx.destination)

  // SFX bus: a slower-attack compressor lets each transient through before it clamps the body — punch
  // instead of the old shared glue compressor squashing every hit.
  const sfxComp = compressor(ctx, -20, 6, 3.5, 0.012, 0.14)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = SFX_LEVEL
  sfxBus.connect(sfxComp).connect(master)

  // Short synthetic room so impacts sit in a space instead of clicking dry.
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1.1, 3.2)
  reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.2
  reverbSend.connect(convolver).connect(sfxComp)

  // Music keeps the original master chain (0.9 gain → glue compressor) so it sounds exactly as before.
  musicFilter = ctx.createBiquadFilter()
  musicFilter.type = 'lowpass'
  musicFilter.frequency.value = 20000
  musicFilter.Q.value = 0.7
  musicGain = ctx.createGain()
  musicGain.gain.value = 1
  impactDuck = ctx.createGain()
  impactDuck.gain.value = 1
  const musicLevel = ctx.createGain()
  musicLevel.gain.value = 0.9
  musicFilter.connect(musicGain).connect(impactDuck).connect(musicLevel).connect(compressor(ctx, -14, 10, 4, 0.003, 0.18)).connect(master)

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

/** Dip the music under a big impact for a beat (independent of the enemy-phase duck). */
function duckForImpact(db: number, hold: number): void {
  if (!ctx || !impactDuck) return
  const t = ctx.currentTime
  const g = impactDuck.gain
  g.cancelScheduledValues(t)
  g.setValueAtTime(Math.min(1, Math.max(0.05, g.value || 1)), t)
  g.linearRampToValueAtTime(Math.pow(10, -db / 20), t + 0.012)
  g.setTargetAtTime(1, t + hold, 0.14)
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
      // Shove: a rising whoosh over a short scrape and a soft shoulder thump.
      v.noise('bandpass', 380, 0.012, 0.2, 1.1, 2400)
      v.noise('lowpass', 700, 0.004, 0.13, 0.45)
      v.thump(150, 62, 0.04, 0.1, 0.45, 0, true)
      break
    case 'swing':
      v.noise('bandpass', 900, 0.004, 0.13, 0.58, 4200)
      v.tone(260, 'sine', 0.008, 0.11, 0.16, 110)
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
      // Mortar "thoomp" + a falling whistle.
      v.thump(230, 95, 0.05, 0.12, 0.5, 0, true)
      v.noise('bandpass', 900, 0.003, 0.08, 0.35)
      v.tone(1500, 'sine', 0.02, 0.38, 0.07, 500, 0.05)
      break
    case 'hit_light':
      v.thump(230 * (1.1 - 0.1 * k), 88, 0.035, 0.09 + 0.03 * k, 0.65 * k, 0, true)
      v.click(0.45 * k, 3400)
      v.noise('bandpass', 2200, 0.001, 0.065, 0.55 * k)
      v.sample('attack', 0.34 * k)
      break
    case 'hit_heavy':
      v.thump(170 * (1.1 - 0.1 * k), 44, 0.07, 0.22 + 0.11 * k, 0.95, 0, true)
      v.click(0.55 * k, 2800)
      v.noise('lowpass', 1500, 0.001, 0.2 * k, 0.6 * k, 300)
      v.tone(2200, 'square', 0.001, 0.018, 0.12)
      v.crunch(0.16 * k, 0.4 * k)
      v.sample('attack', 0.48 * k)
      duckForImpact(2.5 * k, 0.12)
      break
    case 'kill':
      v.thump(160, 32, 0.09, 0.42, 1, 0, true)
      v.click(0.55, 2600)
      v.tone(620, 'sawtooth', 0.004, 0.24, 0.18, 70)
      v.noise('bandpass', 1100, 0.002, 0.26, 0.4, 180)
      v.stutter(6, 0.03, 0.24)
      v.crunch(0.26, 0.45)
      v.sample('glitch', 0.48)
      duckForImpact(4, 0.2)
      break
    case 'bump':
      // Body into body: a hollow armored knock with low-mid resonance.
      v.thump(155 * (1.1 - 0.1 * k), 44, 0.07, 0.16 + 0.06 * k, 0.92, 0, true)
      v.tone(185, 'triangle', 0.002, 0.09, 0.34, 95)
      v.tone(360, 'sine', 0.001, 0.055, 0.24, 180)
      v.noise('lowpass', 720, 0.002, 0.14, 0.5 * k, 220)
      duckForImpact(2.5, 0.12)
      break
    case 'wall_slam':
      // Into the board edge / a cover block: the heaviest single impact in the game.
      v.thump(180, 36, 0.085, 0.3 + 0.08 * k, 1, 0, true)
      v.click(0.65 * k, 2300)
      v.noise('lowpass', 1600, 0.001, 0.2 * k, 0.75 * k, 220)
      v.crunch(0.2 * k, 0.55 * k)
      // Inharmonic panel ring + scattered debris.
      v.tone(523, 'sine', 0.001, 0.32, 0.1)
      v.tone(1187, 'sine', 0.001, 0.22, 0.07)
      v.tone(1843, 'sine', 0.001, 0.16, 0.05)
      v.crackle(7, 0.3, 0.2, 0.04)
      v.sample('attack', 0.42 * k)
      duckForImpact(4.5, 0.18)
      break
    case 'void':
      // Pit / chasm fall: deep descending gravity sweep + hollow sub drone.
      v.thump(135, 24, 0.28, 0.58, 0.9, 0, true)
      v.tone(540, 'sawtooth', 0.015, 0.68, 0.26, 36)
      v.tone(1100, 'sine', 0.01, 0.62, 0.22, 52, 0.04)
      v.noise('bandpass', 1400, 0.02, 0.65, 0.42, 95)
      v.sample('drone', 0.48)
      duckForImpact(4, 0.3)
      break
    case 'explosion':
      // Boom: sub drop + crack + a low-passed noise body that closes down, crunch, a rumble tail and debris.
      v.thump(130, 26, 0.12, 0.44 + 0.12 * k, 1, 0, true)
      v.click(0.65, 1400)
      v.noise('lowpass', 3200, 0.003, 0.38 + 0.2 * k, 0.7 + 0.2 * k, 130)
      v.crunch(0.28 + 0.08 * k, 0.44 + 0.12 * k)
      v.noise('bandpass', 240, 0.03, 0.72 + 0.25 * k, 0.55, 110, 0.04)
      v.crackle(6 + Math.round(3 * k), 0.48, 0.22, 0.08)
      v.sample('overload', 0.38)
      duckForImpact(3.5 + 2 * k, 0.3)
      break
    case 'shockwave':
      // Force wave: a pressure thump under a broad whoosh.
      v.thump(140, 40, 0.1, 0.25 + 0.1 * k, 0.9, 0, true)
      v.noise('bandpass', 240, 0.012, 0.32, 1.2, 1900)
      v.click(0.35, 2400)
      duckForImpact(2.5 + k, 0.18)
      break
    case 'ignite':
      // Flare: a rising whoosh into a roar with crackle.
      v.noise('bandpass', 280, 0.04, 0.32, 1.1, 2600)
      v.noise('lowpass', 1000, 0.015, 0.5, 0.45, 400)
      v.thump(120, 55, 0.08, 0.18, 0.5, 0.02, true)
      v.crackle(9, 0.5, 0.22, 0.06)
      break
    case 'fire_tick':
      // Burn damage: a hissing pop and crackle.
      v.thump(170, 70, 0.04, 0.1, 0.55, 0, true)
      v.noise('bandpass', 1300, 0.004, 0.14, 0.6, 500)
      v.crackle(6, 0.2, 0.3, 0.01)
      break
    case 'extinguish':
      v.noise('bandpass', 3000, 0.03, 0.45, 0.22, 900)
      v.crackle(3, 0.2, 0.1)
      break
    case 'zap':
      // Electric discharge: snap, buzz, sparks.
      v.click(0.55, 4200)
      v.tone(2600, 'square', 0.001, 0.05, 0.13, 500)
      v.zap(0.16 + 0.08 * k, 0.24)
      v.thump(190, 60, 0.04, 0.1 + 0.04 * k, 0.55 * k, 0, true)
      v.crackle(5, 0.22, 0.2, 0.02, 5200)
      break
    case 'passive':
      v.tone(784, 'sine', 0.004, 0.32, 0.12)
      v.tone(1175, 'sine', 0.004, 0.4, 0.1, undefined, 0.06)
      v.tone(1568, 'sine', 0.004, 0.5, 0.08, undefined, 0.12)
      v.shimmer(3, 0.05, 0.1)
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
      v.crackle(6, 0.2, 0.28)
      v.noise('lowpass', 800, 0.02, 0.3, 0.3)
      break
    case 'status_shock':
      v.zap(0.28, 0.22)
      v.click(0.3, 4500)
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
      v.tone(620, 'square', 0.01, 0.22, 0.16, 900)
      v.tone(620, 'square', 0.01, 0.22, 0.16, 900, 0.26)
      v.sample('alarm', 0.38)
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

  /**
   * Kick-style thump: a sine that drops from `f0` to `f1` in `drop` s, then decays. `drive` saturates it so the
   * body has harmonics above ~150 Hz (laptop speakers cannot play the fundamental).
   */
  thump(f0: number, f1: number, drop: number, decay: number, peak: number, delay = 0, drive = false): void {
    const t = this.ac.currentTime + delay
    const osc = this.ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f0, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + drop)
    const g = this.ac.createGain()
    this.env(g, t, 0.0015, decay, peak)
    if (drive) {
      const shaper = this.ac.createWaveShaper()
      driveCurve ??= saturationCurve()
      shaper.curve = driveCurve
      osc.connect(shaper).connect(g)
    } else osc.connect(g)
    this.route(g, decay > 0.2)
    osc.start(t)
    osc.stop(t + decay + 0.06)
  }

  /** Transient: a few ms of bright noise — the crack at the front of an impact. */
  click(peak: number, freq = 3000, delay = 0): void {
    this.noise('highpass', freq, 0.0006, 0.014, peak, undefined, delay)
  }

  /** Scattered crackle: short bright ticks spread over `spread` s (fire, debris, sparks). */
  crackle(count: number, spread: number, peak: number, delay = 0, freq = 2600): void {
    for (let i = 0; i < count; i++) {
      const at = delay + Math.random() * spread
      this.noise('highpass', freq + Math.random() * 2000, 0.0008, 0.012 + Math.random() * 0.02, peak * (0.45 + Math.random() * 0.55), undefined, at)
    }
  }

  zap(dur: number, peak = 0.16): void {
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
    this.env(g, t, 0.003, dur, peak)
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

/** SFX bus level into its compressor (measured offline: single hits ≈ -12…-7 LUFS-M, stacked AoE peaks < 1). */
const SFX_LEVEL = 0.95
/** Output limiter threshold, dBFS. */
const LIMIT_THRESHOLD = -2.5

function compressor(ac: AudioContext, threshold: number, knee: number, ratio: number, attack: number, release: number): DynamicsCompressorNode {
  const c = ac.createDynamicsCompressor()
  c.threshold.value = threshold
  c.knee.value = knee
  c.ratio.value = ratio
  c.attack.value = attack
  c.release.value = release
  return c
}

/** The automatic makeup gain WebAudio applies to a hard-knee compressor: (1 / gain at 0 dBFS)^0.6. */
function makeupGain(thresholdDb: number, ratio: number): number {
  const fullRangeDb = thresholdDb - thresholdDb / ratio
  return Math.pow(Math.pow(10, -fullRangeDb / 20), 0.6)
}

/** Output soft clip. Fed at half gain, so the curve spans ±2 (+6 dBFS): linear up to 0.85, then a tanh knee
 *  toward 0.985 — anything the limiter lets through never reaches full scale. */
function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 4096
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const knee = 0.85
  const room = 0.985 - knee
  for (let i = 0; i < n; i++) {
    const x = ((i * 2) / (n - 1) - 1) * 2
    const a = Math.abs(x)
    curve[i] = a <= knee ? x : Math.sign(x) * (knee + room * Math.tanh((a - knee) / room))
  }
  return curve
}

/** Gentle tanh saturation for thumps (adds 2nd/3rd harmonics, keeps the level). */
function saturationCurve(): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  const drive = 1.8
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive)
  }
  return curve
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
