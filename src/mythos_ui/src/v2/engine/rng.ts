// Seeded, serialisable RNG (mulberry32). The whole generator state is one uint32,
// stored on the owning state object (`run.rng`, `combat.rng`) so save/load and
// replays are exact. Never use Math.random() inside engine/content.

export interface RngHolder {
  rng: number
}

/** Advance the holder's state and return a float in [0, 1). */
export function rand(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) >>> 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Integer in [min, max] inclusive. */
export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(h) * (max - min + 1))
}

export function pick<T>(h: RngHolder, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() from empty list')
  return items[Math.floor(rand(h) * items.length)] as T
}

/** Weighted pick; weights <= 0 are never chosen. */
export function pickWeighted<T>(h: RngHolder, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, weight(it)), 0)
  if (total <= 0) return pick(h, items)
  let roll = rand(h) * total
  for (const it of items) {
    roll -= Math.max(0, weight(it))
    if (roll < 0) return it
  }
  return items[items.length - 1] as T
}

/** Fisher-Yates shuffle into a new array. */
export function shuffle<T>(h: RngHolder, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(h) * (i + 1))
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}

/** Pick `n` distinct items (fewer if the pool is smaller). */
export function sample<T>(h: RngHolder, items: readonly T[], n: number): T[] {
  return shuffle(h, items).slice(0, Math.max(0, n))
}

/** Hash a string to a uint32 seed (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
