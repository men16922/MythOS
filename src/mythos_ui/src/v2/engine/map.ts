// Mythos 2.0 — act map generation (design doc §2).
//
// A Slay-the-Spire-style map: rows 0..6 of up to 4 columns plus a boss row (7).
// The skeleton is grown by walking 4-6 random paths upward from 2-3 start nodes;
// every step moves to the column left / same / right, never crosses an existing
// edge, and never gives a node more than two exits. Because every node lies on a
// path, every node is reachable from a start node and reaches the boss.
//
// Node kinds are then dealt in rule order (fixed rows → treasure → shop → elite →
// events → combat filler) with soft adjacency rules, and encounters / events are
// pre-rolled so the map shows what is ahead before the player commits.
//
// Pure: the only randomness is the caller's RngHolder (pass the RunState itself).

import { pick, pickWeighted, randInt, sample } from './rng.ts'
import type { RngHolder } from './rng.ts'
import type { ActId, ActMap, ContentRegistry, EncounterDef, EventDef, MapNode, NodeKind } from './types.ts'

/** Regular rows (0..MAP_ROWS-1); the boss sits on row MAP_ROWS. */
export const MAP_ROWS = 7
export const MAP_COLS = 4
export const BOSS_ROW = MAP_ROWS

/** Events that are opened by the run flow itself and never pre-rolled on the map. */
export const SCRIPTED_EVENTS: ReadonlySet<string> = new Set(['a2_recruit', 'a1_opening'])

/** Target share of each kind over rows 0..6 (rest is over-served by the all-rest row 6). */
const MIX: Record<'event' | 'elite' | 'shop' | 'treasure', number> = { event: 22, elite: 10, shop: 8, treasure: 8 }
const COMBAT_SHARE = 0.45

/** Kinds that should not repeat on an edge or among siblings. */
const SPREAD_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>(['elite', 'shop', 'treasure', 'rest'])

export interface MapOptions {
  paradox?: number
  /** Event ids already seen this run — pre-rolled events avoid them when possible. */
  exclude?: readonly string[]
  /** Event ids of the last loops — preferred against, ahead of `exclude`, never forbidden. */
  avoid?: readonly string[]
}

export function mapNodeId(act: number, row: number, col: number): string {
  return `a${act}r${row}c${col}`
}

export function generateActMap(act: ActId, rng: RngHolder, C: ContentRegistry, opts: MapOptions = {}): ActMap {
  const skeleton = growSkeleton(rng)
  const nodes: Record<string, MapNode> = {}
  const bossId = mapNodeId(act, BOSS_ROW, 1)

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const outs = skeleton[row]?.[col]
      if (!outs || !isPresent(skeleton, row, col)) continue
      const next =
        row === MAP_ROWS - 1 ? [bossId] : [...outs].sort((a, b) => a - b).map((c) => mapNodeId(act, row + 1, c))
      nodes[mapNodeId(act, row, col)] = { id: mapNodeId(act, row, col), row, col, kind: 'combat', next }
    }
  }
  nodes[bossId] = { id: bossId, row: BOSS_ROW, col: 1, kind: 'boss', next: [] }

  const startIds = Object.values(nodes)
    .filter((n) => n.row === 0)
    .sort((a, b) => a.col - b.col)
    .map((n) => n.id)

  const parents = parentIndex(nodes)
  assignKinds(rng, nodes, parents)
  rollEncounters(act, rng, C, nodes, parents)
  rollEvents(act, rng, C, nodes, opts.exclude ?? [], opts.avoid ?? [])
  const bosses = mapEncounters(act, 'boss', C)
  const boss = nodes[bossId]
  if (boss && bosses.length > 0) boss.encounterId = pick(rng, bosses).id

  return { act, rows: BOSS_ROW + 1, nodes, startIds, bossId }
}

/** Ids of nodes that lead into each node (boss included). */
export function parentIndex(nodes: Record<string, MapNode>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const id of Object.keys(nodes)) out[id] = []
  for (const n of Object.values(nodes)) for (const nx of n.next) out[nx]?.push(n.id)
  return out
}

// ---------------------------------------------------------------- skeleton

/** skeleton[row][col] = set of columns in row+1 this node leads to (row 6 leads to the boss). */
type Skeleton = Set<number>[][]

function isPresent(s: Skeleton, row: number, col: number): boolean {
  if ((s[row]?.[col]?.size ?? 0) > 0) return true
  // Row 6 nodes have no outgoing columns; they exist when something leads into them.
  if (row === MAP_ROWS - 1) return (s[row - 1] ?? []).some((outs) => outs.has(col))
  return false
}

function emptySkeleton(): Skeleton {
  return Array.from({ length: MAP_ROWS }, () => Array.from({ length: MAP_COLS }, () => new Set<number>()))
}

function crosses(s: Skeleton, row: number, from: number, to: number): boolean {
  const rowOuts = s[row] ?? []
  for (let c = 0; c < MAP_COLS; c++) {
    if (c === from) continue
    for (const d of rowOuts[c] ?? []) {
      if ((c < from && d > to) || (c > from && d < to)) return true
    }
  }
  return false
}

function walkOnce(rng: RngHolder): Skeleton {
  const s = emptySkeleton()
  const startCols = sample(rng, [0, 1, 2, 3], randInt(rng, 2, 3))
  const paths = randInt(rng, 4, 6)
  for (let p = 0; p < paths; p++) {
    let col = p < startCols.length ? (startCols[p] as number) : pick(rng, startCols)
    // Row 0 entries must exist even if this path is the only one through them.
    for (let row = 0; row < MAP_ROWS - 1; row++) {
      const outs = s[row]?.[col] as Set<number>
      const options =
        outs.size >= 2
          ? [...outs]
          : [col - 1, col, col + 1].filter((c) => c >= 0 && c < MAP_COLS && !crosses(s, row, col, c))
      const to = pick(rng, options)
      outs.add(to)
      col = to
    }
  }
  return s
}

function rowCount(s: Skeleton, row: number): number {
  let n = 0
  for (let c = 0; c < MAP_COLS; c++) if (isPresent(s, row, c)) n++
  return n
}

/** Grow skeletons until one has ≥ 2 nodes on every row after the first and a healthy node count. */
function growSkeleton(rng: RngHolder): Skeleton {
  let last = walkOnce(rng)
  for (let attempt = 0; attempt < 60; attempt++) {
    if (attempt > 0) last = walkOnce(rng)
    let total = 0
    let ok = true
    for (let row = 0; row < MAP_ROWS; row++) {
      const n = rowCount(last, row)
      total += n
      if (row > 0 && n < 2) ok = false
    }
    if (ok && total >= 16) return last
  }
  return last
}

// ---------------------------------------------------------------- kinds

function assignKinds(rng: RngHolder, nodes: Record<string, MapNode>, parents: Record<string, string[]>): void {
  const regular = Object.values(nodes).filter((n) => n.row < BOSS_ROW)
  const assigned = new Set<string>()
  for (const n of regular) {
    if (n.row === 0) {
      n.kind = 'combat'
      assigned.add(n.id)
    } else if (n.row === MAP_ROWS - 1) {
      n.kind = 'rest'
      assigned.add(n.id)
    }
  }
  const middle = regular.filter((n) => !assigned.has(n.id))
  const row0 = regular.filter((n) => n.row === 0).length
  const quotas = kindQuotas(regular.length, row0, middle.length)

  const siblingsOf = (n: MapNode): string[] =>
    (parents[n.id] ?? []).flatMap((p) => nodes[p]?.next ?? []).filter((id) => id !== n.id)

  const fits = (n: MapNode, kind: NodeKind): boolean => {
    if (!SPREAD_KINDS.has(kind)) return true
    const near = [...(parents[n.id] ?? []), ...n.next, ...siblingsOf(n)]
    return near.every((id) => nodes[id]?.kind !== kind || !assigned.has(id))
  }

  const place = (kind: NodeKind, count: number, minRow: number, maxRow: number): void => {
    for (let i = 0; i < count; i++) {
      const open = middle.filter((n) => !assigned.has(n.id) && n.row >= minRow && n.row <= maxRow)
      if (open.length === 0) return
      const good = open.filter((n) => fits(n, kind))
      const chosen = pick(rng, good.length > 0 ? good : open)
      chosen.kind = kind
      assigned.add(chosen.id)
    }
  }

  const maxMid = MAP_ROWS - 2
  // Mandatory: a treasure on row 3 and a shop somewhere in rows 2..maxMid.
  place('treasure', 1, 3, 3)
  place('shop', quotas.shop, 2, maxMid)
  place('elite', quotas.elite, 2, maxMid)
  place('treasure', quotas.treasure - 1, 1, maxMid)
  place('event', quotas.event, 1, maxMid)
  for (const n of middle) if (!assigned.has(n.id)) n.kind = 'combat'
}

/** Largest-remainder split of the middle rows into special kinds, keeping ≈45 % combat overall. */
export function kindQuotas(total: number, row0: number, middle: number): Record<keyof typeof MIX, number> {
  const combatMid = Math.max(0, Math.round(total * COMBAT_SHARE) - row0)
  const specials = Math.max(3, middle - combatMid)
  const keys = Object.keys(MIX) as (keyof typeof MIX)[]
  const weightSum = keys.reduce((s, k) => s + MIX[k], 0)
  const raw = keys.map((k) => ({ k, v: (specials * MIX[k]) / weightSum }))
  const out = { event: 0, elite: 0, shop: 0, treasure: 0 }
  for (const r of raw) out[r.k] = Math.floor(r.v)
  let left = specials - keys.reduce((s, k) => s + out[k], 0)
  for (const r of raw.slice().sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left <= 0) break
    out[r.k] += 1
    left--
  }
  out.shop = Math.max(1, out.shop)
  out.treasure = Math.max(1, out.treasure)
  out.elite = Math.max(1, out.elite)
  return out
}

// ---------------------------------------------------------------- pre-rolls

/** Rough difficulty: total enemy hp including reinforcements. */
export function encounterDifficulty(enc: EncounterDef, C: ContentRegistry): number {
  const hp = (id: string): number => C.enemies[id]?.hp ?? 10
  let sum = enc.enemies.reduce((s, e) => s + hp(e.id), 0)
  for (const wave of enc.reinforcements ?? []) sum += wave.enemies.reduce((s, e) => s + hp(e.id) * 0.8, 0)
  return sum
}

/** Encounters started by an event outcome (`{kind:'combat'}`); they are never rolled onto the map. */
export function eventFightIds(C: ContentRegistry): Set<string> {
  const out = new Set<string>()
  for (const ev of Object.values(C.events))
    for (const o of ev.options)
      for (const e of [...o.success.effects, ...(o.failure?.effects ?? [])]) if (e.kind === 'combat') out.add(e.encounterId)
  return out
}

/** Map-eligible encounters of an act and kind (event-only fights excluded). */
export function mapEncounters(act: number, kind: EncounterDef['kind'], C: ContentRegistry): EncounterDef[] {
  const eventOnly = eventFightIds(C)
  return Object.values(C.encounters).filter((e) => e.act === act && e.kind === kind && !e.secret && !eventOnly.has(e.id))
}

function rollEncounters(
  act: number,
  rng: RngHolder,
  C: ContentRegistry,
  nodes: Record<string, MapNode>,
  parents: Record<string, string[]>,
): void {
  const byKind = (kind: 'normal' | 'elite'): string[] =>
    mapEncounters(act, kind, C)
      .sort((a, b) => encounterDifficulty(a, C) - encounterDifficulty(b, C))
      .map((e) => e.id)
  const pools = { combat: byKind('normal'), elite: byKind('elite') }
  const uses: Record<string, number> = {}
  /** Encounter ids on any path leading into a node (so a path never repeats a fight when avoidable). */
  const ancestry: Record<string, Set<string>> = {}

  const ordered = Object.values(nodes).sort((a, b) => a.row - b.row || a.col - b.col)
  for (const n of ordered) {
    const seen = new Set<string>()
    for (const p of parents[n.id] ?? []) {
      for (const id of ancestry[p] ?? []) seen.add(id)
      const pe = nodes[p]?.encounterId
      if (pe) seen.add(pe)
    }
    ancestry[n.id] = seen
    if (n.kind !== 'combat' && n.kind !== 'elite') continue
    const pool = pools[n.kind]
    if (pool.length === 0) continue
    const half = Math.ceil(pool.length / 2)
    const band = n.kind === 'elite' ? pool : n.row <= 1 ? pool.slice(0, half) : n.row >= 4 ? pool.slice(-half) : pool
    const fresh = (ids: string[]): string[] => ids.filter((id) => !uses[id] && !seen.has(id))
    const offPath = pool.filter((id) => !seen.has(id))
    const leastUsed = (ids: string[]): string[] => {
      const min = Math.min(...ids.map((id) => uses[id] ?? 0))
      return ids.filter((id) => (uses[id] ?? 0) === min)
    }
    const tiers = [fresh(band), fresh(pool), offPath.length > 0 ? leastUsed(offPath) : [], leastUsed(pool)]
    const choice = pick(rng, tiers.find((t) => t.length > 0) ?? pool)
    n.encounterId = choice
    uses[choice] = (uses[choice] ?? 0) + 1
  }
}

/** Events that may be pre-rolled for this act (scripted and zero-weight events excluded). */
export function actEventPool(act: number, C: ContentRegistry): EventDef[] {
  return Object.values(C.events).filter(
    (e) => e.acts.includes(act) && !SCRIPTED_EVENTS.has(e.id) && (e.weight ?? 1) > 0,
  )
}

function rollEvents(act: number, rng: RngHolder, C: ContentRegistry, nodes: Record<string, MapNode>, exclude: readonly string[], avoid: readonly string[]): void {
  const pool = actEventPool(act, C)
  if (pool.length === 0) return
  const used = new Set<string>()
  const excluded = new Set(exclude)
  const stale = new Set(avoid)
  const ordered = Object.values(nodes)
    .filter((n) => n.kind === 'event')
    .sort((a, b) => a.row - b.row || a.col - b.col)
  for (const n of ordered) {
    const tiers = [
      pool.filter((e) => !used.has(e.id) && !excluded.has(e.id) && !stale.has(e.id)),
      pool.filter((e) => !used.has(e.id) && !excluded.has(e.id)),
      pool.filter((e) => !used.has(e.id)),
      pool,
    ]
    const options = tiers.find((t) => t.length > 0) ?? pool
    const ev = pickWeighted(rng, options, (e) => e.weight ?? 1)
    n.eventId = ev.id
    used.add(ev.id)
  }
}
