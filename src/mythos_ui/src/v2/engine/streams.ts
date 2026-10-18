// Named random streams: one seed, independent generators per system and per place.
//
// A run used to draw everything from one shared `run.rng`, so a single extra roll (opening a
// shop, a bonus reward) re-rolled every later act map and fight. On a daily seed that meant two
// players stopped sharing a run after their first different click. Now each roll comes from a
// stream derived from (run seed, stream name, scope):
//
//   - act maps        `map@a<act>`                  — fixed per act, whatever happened before
//   - node streams    `<name>@a<act>:<node>`        — rewards / shop / cache / events / CRPG / encounter
//                                                     fallback at a node roll the same for everyone
//   - fights          `combat@a<act>:<node>:<enc>`  — inside a fight `shuffle` (draw pile) and `ai`
//                                                     (enemy plan noise) are separate again
//
// A derived stream's seed depends only on its name, so adding a stream never changes another one.
// Node streams live in `run.streams` (one uint32 per key, reset when the run enters a node) so
// several rolls at one node keep advancing. Saves written before streams existed have no
// `run.streams` / `combat.streams`: they keep the legacy single shared stream, roll for roll.
// Never rename a stream once it ships — the name is part of its seed.

import { hashSeed } from './rng.ts'
import type { RngHolder } from './rng.ts'
import type { CombatState, RunState } from './types.ts'

export type RunStreamName = 'reward' | 'shop' | 'treasure' | 'event' | 'crpg' | 'encounter'
export type CombatStreamName = 'shuffle' | 'ai'

type StreamRun = Pick<RunState, 'seed' | 'rng' | 'act' | 'nodeId' | 'streams'>

/** The place a node stream belongs to: the current node, or the act's start before one is entered. */
export function streamScope(run: Pick<RunState, 'act' | 'nodeId'>): string {
  return `a${run.act}:${run.nodeId ?? 'start'}`
}

/** A one-shot generator for `seed` + `key` (not stored; use for rolls made in one go). */
export function derivedRng(seed: number, key: string): RngHolder {
  return { rng: hashSeed(`${seed >>> 0}:${key}`) }
}

/**
 * The run's stream `name` at the current node. Legacy runs (no `run.streams`) get the run itself,
 * i.e. the old shared stream. Every draw also ticks `run.rng`, which UI keys use to tell rolls apart.
 */
export function runStream(run: StreamRun, name: RunStreamName): RngHolder {
  const streams = run.streams
  if (!streams) return run
  const key = `${name}@${streamScope(run)}`
  return {
    get rng(): number {
      return streams[key] ?? hashSeed(`${run.seed >>> 0}:${key}`)
    },
    set rng(value: number) {
      streams[key] = value >>> 0
      run.rng = (run.rng + 1) >>> 0
    },
  }
}

/** Generator for act `act`'s map. */
export function mapRng(run: StreamRun, act: number): RngHolder {
  return run.streams ? derivedRng(run.seed, `map@a${act}`) : run
}

/** Leaving one node for another: the old node's streams are never read again. */
export function resetNodeStreams(run: Pick<RunState, 'streams'>): void {
  if (run.streams) run.streams = {}
}

/** Seed of a fight, plus its own shuffle / AI streams (legacy runs: one stream off the shared run rng). */
export function combatSeeds(run: StreamRun, encounterId: string): Pick<CombatState, 'rng' | 'streams'> {
  if (!run.streams) return { rng: hashSeed(`${run.rng}|${encounterId}`) }
  const base = `combat@${streamScope(run)}:${encounterId}`
  return {
    rng: hashSeed(`${run.seed >>> 0}:${base}`),
    streams: { shuffle: hashSeed(`${run.seed >>> 0}:${base}:shuffle`), ai: hashSeed(`${run.seed >>> 0}:${base}:ai`) },
  }
}

/** The fight's stream `name`; legacy fights (no `combat.streams`) share `combat.rng`. */
export function combatStream(c: Pick<CombatState, 'rng' | 'streams'>, name: CombatStreamName): RngHolder {
  const streams = c.streams
  if (!streams) return c
  return {
    get rng(): number {
      return streams[name]
    },
    set rng(value: number) {
      streams[name] = value >>> 0
    },
  }
}
