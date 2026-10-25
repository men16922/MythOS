// Asset URL helpers. Web build: FastAPI mounts the repo `resources/` dir at `/resources`. Android app build
// (`vite build --mode app`): `resources/neo-seoul/` is copied into the APK next to index.html and
// VITE_ASSET_BASE points there (`./resources/neo-seoul/`), so art and music load offline.

import { V2_SPRITES } from './spriteManifest.ts'

/** Vite replaces `import.meta.env` at build time; it is undefined under `node --test`. */
const ENV_BASE = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_ASSET_BASE
const BASE = typeof ENV_BASE === 'string' && ENV_BASE ? ENV_BASE : '/resources/neo-seoul/'

/** Path relative to resources/neo-seoul/ → URL. */
export function asset(path: string | undefined | null): string {
  if (!path) return ''
  if (path.startsWith('/') || path.startsWith('http')) return path
  return BASE + path
}

export type SpritePose = 'idle' | 'attack' | 'hit' | 'guard' | 'skill' | 'cover'

const CHARACTER_SPRITES = new Set(['player-noise', 'se-rin', 'han', 'kai', 'lin-yue', 'su-ah', 'tae-o'])

/**
 * Combat sprite URL. Characters live in characters/combat/, enemies in enemies/combat/.
 * Enemies have no 'cover' pose (falls back to guard).
 */
export function sprite(key: string, pose: SpritePose = 'idle'): string {
  // 2.0 sprite sets (bosses, archetypes, elites) win; missing poses fall back sensibly.
  const v2 = V2_SPRITES[key]
  if (v2) {
    const path = v2[pose] ?? (pose === 'skill' ? v2.attack : pose === 'cover' ? v2.guard : undefined) ?? v2.idle
    if (path) return asset(path)
  }
  if (CHARACTER_SPRITES.has(key)) return asset(`characters/combat/${key}-${pose}.png`)
  const p = pose === 'cover' ? 'guard' : pose
  return asset(`enemies/combat/${key}-${p}.png`)
}

/** Companions have painted face art; their 2.0 sprites are full-body and read as a speck in a round portrait. */
const FACE_ART = new Set(['se-rin', 'han', 'kai', 'lin-yue', 'su-ah', 'tae-o'])

export function portrait(key: string): string {
  if (FACE_ART.has(key)) return asset(`characters/${key}.png`)
  const v2 = V2_SPRITES[key]?.idle
  if (v2) return asset(v2)
  if (CHARACTER_SPRITES.has(key)) return asset(`characters/${key}.png`)
  return asset(`enemies/${key}.png`)
}

export const BACKDROPS: Record<string, string> = {
  streets: asset('combat/backdrops/streets.png'),
  undercity: asset('combat/backdrops/undercity.png'),
  industrial: asset('combat/backdrops/industrial.png'),
  spire: asset('combat/backdrops/spire.png'),
}

export const STATUS_ICON: Record<string, string> = {
  burn: asset('status/burn.png'),
  bleed: asset('status/bleed.png'),
  corrode: asset('status/corrode.png'),
  shock: asset('status/shock.png'),
  mark: asset('status/acid.png'),
  weak: asset('status/corrode.png'),
  guard: asset('status/freeze.png'),
  thorns: asset('status/hacked.png'),
  evade: asset('status/evade.png'),
  focus: asset('status/focus.png'),
  rage: asset('status/rage.png'),
}
