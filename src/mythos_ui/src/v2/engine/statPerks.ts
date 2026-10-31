// Mythos 2.0 — what the five run stats (STR/AGI/INT/CHA/OBS) do inside a fight.
//
// One table, read by the combat engine (effects.ts / combat.ts) and by the HUD tooltip, so the numbers a
// player is shown are the numbers the engine uses. Pure in the stats: no CombatState, no content.
//
// Thresholds sit just above the archetypes' starting stats (2–7): a perk is mostly earned by growing a stat
// during the run, not handed out at birth (balance 2026-10-25, docs/plans/2026-10-25-argon-review-and-s-rank-plan.md).
// Stats run to 20 (owner 2026-11-01): the old steps stand, more steps sit above them, and 10 / 15 / 20 each switch on a
// named trait with no menu to open.

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
  /** STR 10 / 20: armor the connector's direct attacks ignore. */
  armorBreak: number
  /** STR 15: extra tiles on every push the party causes. */
  pushBonus: number
  /** AGI 10: block on the connector at the start of each turn. */
  turnBlock: number
  /** AGI 20: Evade on the connector at the start of each turn. */
  turnEvade: number
  /** INT 10: the first tactic card each fight refunds 1 energy. */
  tacticRefund: boolean
  /** INT 15: extra energy on turn 1. */
  openEnergy: number
  /** INT 20: extra card drawn every turn. */
  turnDraw: number
  /** CHA 10 / 20: extra damage on companions' direct attacks. */
  companionDamage: number
  /** CHA 15: the companion refund comes every turn, not once a fight. */
  refundEachTurn: boolean
  /** OBS 10: a critical hit marks its victim for this much. */
  critMark: number
  /** OBS 15: Focus needed for a critical hit drops by this much. */
  critEase: number
  /** OBS 20: Mark on every enemy at the start of a fight. */
  openMark: number
}

const tier = (v: number, ...at: number[]): number => at.filter((n) => v >= n).length

export function statPerks(s: Partial<Stats> | undefined): StatPerks {
  const str = s?.str ?? 0
  const agi = s?.agi ?? 0
  const int = s?.int ?? 0
  const cha = s?.cha ?? 0
  const obs = s?.obs ?? 0
  return {
    attack: tier(str, 6, 9, 12, 15, 18),
    bump: tier(str, 5, 8, 11, 14, 17),
    openEvade: tier(agi, 8, 10, 13, 16, 19),
    sprintEvade: agi >= 8,
    move: tier(agi, 9, 15),
    dot: tier(int, 6, 9, 12, 15, 18),
    openDraw: tier(int, 8, 14),
    companionBlock: Math.max(0, Math.floor((cha - 3) / 2)),
    companionRefund: cha >= 7,
    openFocus: tier(obs, 6, 9, 12, 15, 18),
    focusPerHit: tier(obs, 6, 9, 14, 19),
    mark: tier(obs, 7, 10, 13, 16, 19),
    armorBreak: str >= 20 ? 99 : str >= 10 ? 1 : 0,
    pushBonus: str >= 15 ? 1 : 0,
    turnBlock: agi >= 10 ? 2 : 0,
    turnEvade: agi >= 20 ? 1 : 0,
    tacticRefund: int >= 10,
    openEnergy: int >= 15 ? 1 : 0,
    turnDraw: int >= 20 ? 1 : 0,
    companionDamage: tier(cha, 10, 20),
    refundEachTurn: cha >= 15,
    critMark: obs >= 10 ? 2 : 0,
    critEase: obs >= 15 ? 1 : 0,
    openMark: obs >= 20 ? 3 : 0,
  }
}
