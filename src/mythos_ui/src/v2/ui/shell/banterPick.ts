// Which party banter (content/banter.ts) plays on this map arrival — deterministic per run and node.
import { banterFor, soloBanterFor, type BanterDef } from '../../content/banter.ts'
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
  // Walk the options in a per-run order, and play each exchange at most once per act: a pair with one exchange used
  // to hear it ~21 times over a six-act run (2026-11-05). Only this act's arrivals count (node ids carry the act).
  const order = [...options].sort((a, b) => hash(`${run.seed}:${a.id}`) - hash(`${run.seed}:${b.id}`))
  const firstHere = run.visited.findIndex((id) => id in run.map.nodes)
  if (firstHere < 0) return null
  let turn = -1
  for (let i = firstHere; i < run.visited.length; i++) if (hash(`${run.seed}:banter:${i + 1}`) <= BANTER_CHANCE) turn++
  return order[turn] ?? null
}

/** Companion <-> Connector map banter when only 1 companion is deployed (e.g. Act 1). Always fires after the opening node (`visited.length === 1`). */
export function pickSoloBanter(run: RunState): BanterDef | null {
  if (run.screen.kind !== 'map' || run.visited.length === 0) return null
  const alive = run.party.filter((m) => m.hp > 0)
  if (alive.length !== 1) return null
  const compId = alive[0]!.id
  const options = soloBanterFor(compId, run.act)
  if (options.length === 0) return null
  const n = run.visited.length
  const fires = (i: number): boolean => i === 1 || hash(`${run.seed}:solobanter:${i}`) <= BANTER_CHANCE
  if (!fires(n)) return null
  // Same rule as pickBanter: each exchange at most once per act, counting only this act's arrivals.
  const firstHere = run.visited.findIndex((id) => id in run.map.nodes)
  if (firstHere < 0) return null
  const order = [...options].sort((a, b) => hash(`${run.seed}:${a.id}`) - hash(`${run.seed}:${b.id}`))
  let turn = -1
  for (let i = firstHere + 1; i <= n; i++) if (fires(i)) turn++
  return order[turn] ?? null
}


