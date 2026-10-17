// Which party banter (content/banter.ts) plays on this map arrival — deterministic per run and node.
import { banterFor, type BanterDef } from '../../content/banter.ts'
import { hashSeed } from '../../engine/rng.ts'
import type { RunState } from '../../engine/types.ts'

export const BANTER_CHANCE = 0.45

/** FNV alone barely moves the high bits for keys that differ in their last digit: finish with murmur3's fmix32. */
function hash(s: string): number {
  let h = hashSeed(s)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** The banter for this map arrival, or null (no Signal+ layer, fewer than two deployed, or the dice said no). */
export function pickBanter(run: RunState): BanterDef | null {
  if (!run.crpg || run.screen.kind !== 'map' || run.visited.length === 0) return null
  const options = banterFor(
    run.party.filter((m) => m.hp > 0).map((m) => m.id),
    run.act,
  )
  if (options.length === 0) return null
  const roll = hash(`${run.seed}:banter:${run.visited.length}`)
  if (roll > BANTER_CHANCE) return null
  // Walk the options in a per-run order so the same exchange does not come back until the others have played.
  const order = [...options].sort((a, b) => hash(`${run.seed}:${a.id}`) - hash(`${run.seed}:${b.id}`))
  const turn = run.visited.filter((_, i) => hash(`${run.seed}:banter:${i + 1}`) <= BANTER_CHANCE).length - 1
  return order[turn % order.length] ?? null
}

