// Event balance guard. Uses the run simulator's own option scale (`outcomeValue`, the one the bot picks
// events by) at a representative mid-run state, so a new or retuned event cannot quietly become a pure
// tax (every open option net-negative) or a runaway jackpot. The scale is crude — it undervalues ◈ and
// information — so the bounds are loose and the exceptions are named, not hidden.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { checkChance, newRun } from './run.ts'
import { outcomeValue } from './runSim.ts'
import type { EventDef, RunState } from './types.ts'

/** Authored big swings the sim scale misjudges (a heavy ◈/Trace trade, or a deliberate once-per-run offer). */
const BELOW_FLOOR_OK = new Set(['a3_blank_in_list']) // identity twist: +10 ◈ for +15 Trace, or −5 max HP to erase it
const ABOVE_CEILING_OK = new Set(['a3_ix_offer']) // IX's own offer is meant to dwarf the street scenes

function midRun(stat: number): RunState {
  const run = newRun(newProfile('Bal'), { archetype: 'ghost', paradox: 0, seed: 5, now: '2026-10-11T00:00:00.000Z' }, C)
  run.credits = 120
  run.hp = Math.round(run.maxHp * 0.7)
  run.trace = 30
  for (const k of Object.keys(run.stats) as (keyof typeof run.stats)[]) run.stats[k] = stat
  return run
}

/** Expected value of an event's best option that needs nothing (no companion / flag / credits). */
function bestOpen(run: RunState, ev: EventDef): number {
  return Math.max(
    ...ev.options
      .filter((o) => !o.requires)
      .map((o) => {
        const p = o.check ? checkChance(run, o.check.stat, o.check.dc) / 100 : 1
        return p * outcomeValue(run, o.success, C) + (o.check ? (1 - p) * outcomeValue(run, o.failure, C) : 0)
      }),
  )
}

const rolled = Object.values(C.events).filter((e) => (e.weight ?? 1) > 0)

test('no rolled event is a pure tax: its best open option is worth ≥ 0.5 (stat 6)', () => {
  const run = midRun(6)
  const low = rolled
    .filter((e) => !BELOW_FLOOR_OK.has(e.id))
    .map((e) => ({ id: e.id, v: bestOpen(run, e) }))
    .filter((x) => x.v < 0.5)
  assert.deepEqual(low, [], 'events whose best open option is net-negative on the simulator scale')
})

test('no rolled event is a runaway jackpot: best open option ≤ 12 (stat 6)', () => {
  const run = midRun(6)
  const high = rolled
    .filter((e) => !ABOVE_CEILING_OK.has(e.id))
    .map((e) => ({ id: e.id, v: bestOpen(run, e) }))
    .filter((x) => x.v > 12)
  assert.deepEqual(high, [])
})

test('the named exceptions still exist (a stale exemption would hide a future regression)', () => {
  for (const id of [...BELOW_FLOOR_OK, ...ABOVE_CEILING_OK]) assert.ok(C.events[id], `${id} no longer exists — drop the exemption`)
})
