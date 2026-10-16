// Mythos 2.0 — a fresh seed for each normal run, so maps, encounters and rewards differ between players and between
// loops (the engine's own fallback seed is a hash of the profile, which made every new player's first map the same).
// The engine stays pure: randomness is drawn here, in the UI, and passed in. Daily runs ignore it (date seed).
export function freshRunSeed(): number {
  try {
    return (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) >>> 0
  } catch {
    return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0
  }
}
