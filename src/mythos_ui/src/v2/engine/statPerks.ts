// Mythos 2.0 — what the five run stats (STR/AGI/INT/CHA/OBS) do inside a fight.
//
// One table, read by the combat engine (effects.ts / combat.ts) and by the HUD tooltip, so the numbers a
// player is shown are the numbers the engine uses. Pure in the stats: no CombatState, no content.
//
// Thresholds sit just above the archetypes' starting stats (2–7): a perk is mostly earned by growing a stat
// during the run, not handed out at birth (balance 2026-10-25, docs/plans/2026-10-25-argon-review-and-s-rank-plan.md).

import type { Stats } from './types.ts'

export interface StatPerks {
  /** STR: extra damage on the connector's direct attacks. */
  attack: number
  /** STR: extra bump damage when the party slams an enemy. */
  bump: number
  /** AGI: Evade on the connector at the start of a fight. */
  openEvade: number
  /** AGI: +1 Evade (once per turn) after the connector moves 3+ tiles. */
  sprintEvade: boolean
  /** AGI: extra connector move. */
  move: number
  /** INT: extra stacks on every burn / bleed / corrode the party applies. */
  dot: number
  /** INT: extra cards drawn on turn 1. */
  openDraw: number
  /** CHA: block on each companion at the start of a fight. */
  companionBlock: number
  /** CHA: the first companion card each fight refunds 1 energy. */
  companionRefund: boolean
  /** OBS: Focus on the connector at the start of a fight. */
  openFocus: number
  /** OBS: Focus gained per party direct attack that deals damage. */
  focusPerHit: number
  /** OBS: extra damage when a party attack consumes a mark. */
  mark: number
}

const step = (v: number, lo: number, hi: number): number => (v >= hi ? 2 : v >= lo ? 1 : 0)

export function statPerks(s: Partial<Stats> | undefined): StatPerks {
  const str = s?.str ?? 0
  const agi = s?.agi ?? 0
  const int = s?.int ?? 0
  const cha = s?.cha ?? 0
  const obs = s?.obs ?? 0
  return {
    attack: step(str, 6, 9),
    bump: step(str, 5, 8),
    openEvade: step(agi, 8, 10),
    sprintEvade: agi >= 8,
    move: agi >= 9 ? 1 : 0,
    dot: step(int, 6, 9),
    openDraw: int >= 8 ? 1 : 0,
    companionBlock: Math.max(0, Math.floor((cha - 3) / 2)),
    companionRefund: cha >= 7,
    openFocus: step(obs, 6, 9),
    focusPerHit: step(obs, 6, 9),
    mark: step(obs, 7, 10),
  }
}
