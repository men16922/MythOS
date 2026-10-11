// Standalone card value report (dev tool, not a test — node --test only picks up *.test.ts).
//
//   node --experimental-strip-types src/mythos_ui/src/v2/engine/card-value.report.ts [cardId ...]
//   env: ACT=2|3 (encounter set, default 3) · POLICY=greedy|mixed (default mixed) · SEEDS=24 · OFF=0 (seed offset)
//
// For every non-starter card: starter deck + the archetype's sidekick (Se-rin, or the card's own companion) with
// TWO extra copies of the card, played by the bot over six encounters, versus the same deck without them, on the
// same seeds. Score per fight = HP lost + 0.3 × turns + 30 for a loss; `delta` = baseline − with-card (higher =
// the card helped). Prints cards sorted by delta with a z-score.
//
// Read it with its limits in mind (see docs/PROGRESS_LOG.md 2026-10-11):
//  - It measures STANDALONE value in a starter deck. Setup / engine / synergy cards (draw, pull-into-collision,
//    long-fight powers) score low by construction; do not retune a card from this alone.
//  - The `greedy` bot almost never takes damage, so defence cards look worthless and its evaluation over-values
//    Guard; `mixed` (25 % careless turns, like a human) is the one that shows what block is worth.
//  - Run twice with different OFF values; independent seed sets agreed at r = 0.90–0.97, so a gap between them
//    means a bug, not noise.

import { CONTENT } from '../content/index.ts'
import { startCombat } from './combat.ts'
import { autoPlay, type BotPolicy } from './combatSim.ts'
import { makeRun } from './combat.fixture.test.ts'
import type { ContentRegistry } from './types.ts'

// The app tsconfig carries no Node types; read env/argv through a narrow, typed view of the global.
const proc = (globalThis as unknown as { process: { env: Record<string, string | undefined>; argv: string[] } }).process
const env = proc.env

const C: ContentRegistry = CONTENT
const ACT2 = ['a2_n1_furnace', 'a2_n1_checkpoint', 'a2_n2_market_raid', 'a2_n2_tunnel', 'a2_elite_captain', 'a2_elite_reaver']
const ACT3 = ['a3_n1_gate', 'a3_n1_firing_line', 'a3_n2_hunting_ground', 'a3_n2_server_room', 'a3_elite_seraph', 'a3_elite_mech']
const ENCS = env.ACT === '2' ? ACT2 : ACT3
const POLICY = (env.POLICY ?? 'mixed') as BotPolicy
const SEEDS = Number(env.SEEDS ?? 24)
const OFF = Number(env.OFF ?? 0)
const COPIES = 2
const only = proc.argv.slice(2)

function fightScore(arch: string, mateId: string, extra: string[], enc: string, s: number): number {
  const a = C.archetypes[arch]
  const mate = C.companions[mateId]
  if (!a || !mate) throw new Error(`unknown archetype/companion ${arch}/${mateId}`)
  const bonus = C.implants[a.startingImplant]?.passive?.maxHp ?? 0
  const run = makeRun(
    {
      rng: ((s + OFF) * 7919 + enc.length * 31) * 2654435761,
      archetype: arch,
      hp: a.maxHp + bonus,
      maxHp: a.maxHp + bonus,
      implants: [a.startingImplant],
      party: [{ id: mateId, hp: mate.maxHp, maxHp: mate.maxHp, bond: 0 }],
    },
    [...a.startingDeck, ...mate.cards, ...extra],
  )
  const end = autoPlay(startCombat(run, enc, C), C, POLICY)
  const hp = end.units.find((u) => u.uid === 'connector')?.hp ?? 0
  return (end.phase === 'won' ? 0 : 30) + (run.hp - hp) + 0.3 * end.turn
}

function mean(arch: string, mate: string, extra: string[]): number {
  let total = 0
  let n = 0
  for (const enc of ENCS) {
    for (let s = 1; s <= SEEDS; s++) {
      total += fightScore(arch, mate, extra, enc, s)
      n++
    }
  }
  return total / n
}

const baseline: Record<string, number> = {}
const base = (arch: string, mate: string): number => (baseline[arch + mate] ??= mean(arch, mate, []))

const rows: { id: string; rarity: string; cost: number; delta: number; where: string }[] = []
for (const c of Object.values(C.cards)) {
  if (c.type === 'junk' || c.rarity === 'starter' || (only.length > 0 && !only.includes(c.id))) continue
  const archs = c.archetype ? [c.archetype] : Object.keys(C.archetypes)
  const mates = typeof c.owner === 'string' && C.companions[c.owner] ? [c.owner] : ['se_rin']
  let d = 0
  let k = 0
  for (const arch of archs)
    for (const mate of mates) {
      d += base(arch, mate) - mean(arch, mate, Array(COPIES).fill(c.id))
      k++
    }
  rows.push({ id: c.id, rarity: c.rarity, cost: c.cost, delta: d / k, where: c.archetype ?? (mates[0] !== 'se_rin' ? (mates[0] as string) : 'any') })
}
rows.sort((a, b) => b.delta - a.delta)
const m = rows.reduce((s, r) => s + r.delta, 0) / rows.length
const sd = Math.sqrt(rows.reduce((s, r) => s + (r.delta - m) ** 2, 0) / rows.length) || 1
console.log(`cards=${rows.length} act=${ENCS === ACT2 ? 2 : 3} policy=${POLICY} seeds=${SEEDS} off=${OFF} copies=${COPIES}  delta mean=${m.toFixed(2)} sd=${sd.toFixed(2)}`)
for (const r of rows)
  console.log(`${r.id.padEnd(26)} ${r.rarity.padEnd(9)} cost=${r.cost} ${r.where.padEnd(13)} delta=${r.delta.toFixed(2).padStart(6)}  z=${((r.delta - m) / sd).toFixed(1).padStart(5)}`)
