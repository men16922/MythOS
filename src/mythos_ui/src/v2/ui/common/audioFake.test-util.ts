// Minimal WebAudio/DOM fakes so audio.ts + sfx.ts run under `node --test`.
// Every BufferSource/Oscillator start/stop is recorded in `log`: looping buffers are music,
// everything else is an SFX voice.

export const log: string[] = []

class Param {
  value = 0
  setValueAtTime(): this {
    return this
  }
  exponentialRampToValueAtTime(): this {
    return this
  }
  linearRampToValueAtTime(): this {
    return this
  }
  cancelScheduledValues(): this {
    return this
  }
  setTargetAtTime(): this {
    return this
  }
}

class Node {
  gain = new Param()
  frequency = new Param()
  Q = new Param()
  pan = new Param()
  threshold = new Param()
  knee = new Param()
  ratio = new Param()
  attack = new Param()
  release = new Param()
  type = ''
  buffer: unknown = null
  loop = false
  curve: unknown = null
  connect<T>(n: T): T {
    return n
  }
  start(): void {
    log.push(this.loop ? 'music:start' : 'sfx:start')
  }
  stop(): void {
    if (this.loop) log.push('music:stop')
  }
}

class Ctx {
  state = 'running'
  currentTime = 0
  sampleRate = 48000
  destination = new Node()
  createGain(): Node {
    return new Node()
  }
  createBiquadFilter(): Node {
    return new Node()
  }
  createDynamicsCompressor(): Node {
    return new Node()
  }
  createConvolver(): Node {
    return new Node()
  }
  createStereoPanner(): Node {
    return new Node()
  }
  createOscillator(): Node {
    return new Node()
  }
  createWaveShaper(): Node {
    return new Node()
  }
  createBufferSource(): Node {
    return new Node()
  }
  createBuffer(_ch: number, len: number): { getChannelData: () => Float32Array; duration: number } {
    return { getChannelData: () => new Float32Array(len), duration: len / 48000 }
  }
  decodeAudioData(): Promise<{ duration: number }> {
    return Promise.resolve({ duration: 30 })
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
}

/** Install the fakes on globalThis. `search` is the page query string (e.g. '?mute=1'). */
export function installAudioFakes(search = ''): void {
  const g = globalThis as Record<string, unknown>
  g.window = { AudioContext: Ctx, location: { search }, localStorage: { getItem: () => null } }
  g.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
}

/** Let pending fetch/decode promises settle. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
}
