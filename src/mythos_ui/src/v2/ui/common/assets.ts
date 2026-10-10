// Asset URL helpers. FastAPI mounts the repo `resources/` dir at `/resources`.

const BASE = '/resources/neo-seoul/'

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
  if (CHARACTER_SPRITES.has(key)) return asset(`characters/combat/${key}-${pose}.png`)
  const p = pose === 'cover' ? 'guard' : pose
  return asset(`enemies/combat/${key}-${p}.png`)
}

export function portrait(key: string): string {
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
  shock: asset('status/shock.png'),
  mark: asset('status/acid.png'),
  weak: asset('status/corrode.png'),
  guard: asset('status/freeze.png'),
  thorns: asset('status/hacked.png'),
}
