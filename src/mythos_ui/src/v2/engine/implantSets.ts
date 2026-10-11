// Implant sets (ported from 1.x `boons.py` tag synergies, rebuilt for 2.0's 44 implants).
//
// Implants of one family make each other better: holding 2 of a set gives a small bonus, 3 gives a bigger one.
// It rewards committing to a build ("I am going Bulwark") instead of taking whatever is rarest, and it tells the
// player what an implant is FOR. Bonuses are made only of passives the engine already reads (max HP, bump damage,
// trace, credits, shop prices, heal, move, stats) — no new rules, nothing in combat that is not already a number.
//
// Not every implant is in a set (the boss relics and the two stealth pieces stand alone on purpose): a set is a
// choice, not an obligation. Reward rolls lean toward a set you already hold (`SET_PULL`), so a build can be chased
// but is never guaranteed.
import type { ImplantPassive, Text } from './types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export interface SetTier {
  /** How many members you must hold. */
  count: 2 | 3
  passive: ImplantPassive
  text: Text
}

export interface ImplantSetDef {
  id: string
  name: Text
  /** One line on what the family is about. */
  blurb: Text
  members: string[]
  tiers: SetTier[]
}

export const IMPLANT_SETS: ImplantSetDef[] = [
  {
    id: 'bulwark',
    name: t('방벽', 'Bulwark'),
    blurb: t('막고, 버티고, 되받아친다.', 'Block, endure, return fire.'),
    members: ['cracked_cube', 'mesh_vest', 'scrap_plating', 'trigger_discipline', 'guardian_chip', 'heavy_exosuit', 'thorn_weave', 'afterimage', 'bastion_core', 'salvaged_aegis'],
    tiers: [
      { count: 2, passive: { maxHp: 4 }, text: t('최대 HP +4', 'Max HP +4') },
      { count: 3, passive: { maxHp: 4 }, text: t('최대 HP +4 더 (합 +8)', 'Another +4 max HP (+8 total)') },
    ],
  },
  {
    id: 'vitality',
    name: t('회복', 'Vitality'),
    blurb: t('상처를 빨리 닫는 몸.', 'A body that closes wounds fast.'),
    members: ['stim_reservoir', 'med_pump', 'field_medic_kit'],
    tiers: [
      { count: 2, passive: { restHeal: 10 }, text: t('안가 회복 +10%p', 'Safehouse heal +10 pts') },
      { count: 3, passive: { maxHp: 6, restHeal: 10 }, text: t('최대 HP +6 · 안가 회복 +10%p 더', 'Max HP +6 and another +10 pts safehouse heal') },
    ],
  },
  {
    id: 'impact',
    name: t('충돌', 'Impact'),
    blurb: t('밀고, 박고, 떨어뜨린다.', 'Shove, slam, drop.'),
    members: ['erased_id', 'recoil_boots', 'impact_frame', 'domino_relay', 'momentum_core', 'chain_reaction'],
    tiers: [
      { count: 2, passive: { bumpDamage: 1 }, text: t('충돌 피해 +1', 'Bump damage +1') },
      { count: 3, passive: { bumpDamage: 2 }, text: t('충돌 피해 +2 더 (합 +3)', 'Another +2 bump damage (+3 total)') },
    ],
  },
  {
    id: 'signal',
    name: t('교란', 'Signal'),
    blurb: t('표식, 감전, 소각 — 적의 신호를 어지럽힌다.', 'Mark, shock, burn — scramble the enemy’s signal.'),
    members: ['cracked_lens', 'sentinel_eye', 'ark_coolant', 'ix_shard', 'purge_igniter', 'feedback_loop'],
    tiers: [
      { count: 2, passive: { traceMult: -0.1 }, text: t('얻는 추적도 −10%', 'Trace gained −10 %') },
      { count: 3, passive: { traceMult: -0.1 }, text: t('얻는 추적도 −10% 더 (합 −20%)', 'Another −10 % trace gained (−20 % total)') },
    ],
  },
  {
    id: 'tempo',
    name: t('속도', 'Tempo'),
    blurb: t('먼저 뽑고, 먼저 움직인다.', 'Draw first, move first.'),
    members: ['spare_cell', 'reflex_booster', 'overclock_heart', 'kill_chain', 'smugglers_pocket', 'adrenal_loop', 'ghost_engine'],
    tiers: [
      { count: 2, passive: { stats: { agi: 1, obs: 1 } }, text: t('민첩 +1 · 관측 +1', '+1 AGI, +1 OBS') },
      { count: 3, passive: { move: 1 }, text: t('모든 아군 이동 +1', 'Every ally moves +1') },
    ],
  },
  {
    id: 'trade',
    name: t('거래', 'Trade'),
    blurb: t('돈이 돈을 번다.', 'Money makes money.'),
    members: ['credit_chip', 'merchant_ledger', 'forged_permit', 'bounty_board', 'loaded_dice', 'echo_lens', 'overclocked_deck'],
    tiers: [
      { count: 2, passive: { shopDiscount: 0.1 }, text: t('상점 가격 −10%', 'Shop prices −10 %') },
      { count: 3, passive: { creditMult: 0.15 }, text: t('전투 크레딧 +15%', 'Fight credits +15 %') },
    ],
  },
]

const BY_MEMBER: Record<string, string> = {}
for (const set of IMPLANT_SETS) for (const id of set.members) BY_MEMBER[id] = set.id
const BY_ID: Record<string, ImplantSetDef> = Object.fromEntries(IMPLANT_SETS.map((s) => [s.id, s]))

/** Weight multiplier for a reward implant that belongs to a set the player already holds a piece of. */
export const SET_PULL = 1.6

export function implantSetOf(implantId: string): ImplantSetDef | undefined {
  const id = BY_MEMBER[implantId]
  return id ? BY_ID[id] : undefined
}

/** How many members of each set the player holds. */
export function setCounts(owned: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of owned) {
    const set = BY_MEMBER[id]
    if (set) out[set] = (out[set] ?? 0) + 1
  }
  return out
}

/** Tiers reached with this inventory, as `${setId}:${count}` keys. */
export function activeTierKeys(owned: readonly string[]): string[] {
  const counts = setCounts(owned)
  const keys: string[] = []
  for (const set of IMPLANT_SETS) for (const tier of set.tiers) if ((counts[set.id] ?? 0) >= tier.count) keys.push(`${set.id}:${tier.count}`)
  return keys
}

/** The passives of every tier reached, ready to be summed like an implant's own passive. */
export function setPassives(owned: readonly string[]): ImplantPassive[] {
  const active = new Set(activeTierKeys(owned))
  return IMPLANT_SETS.flatMap((set) => set.tiers.filter((tier) => active.has(`${set.id}:${tier.count}`)).map((tier) => tier.passive))
}

/** Tiers newly reached by adding `added` to `before` (what a pickup just unlocked). */
export function newlyReached(before: readonly string[], added: string): { set: ImplantSetDef; tier: SetTier }[] {
  const prev = new Set(activeTierKeys(before))
  const out: { set: ImplantSetDef; tier: SetTier }[] = []
  for (const key of activeTierKeys([...before, added])) {
    if (prev.has(key)) continue
    const [setId, count] = key.split(':') as [string, string]
    const set = BY_ID[setId]
    const tier = set?.tiers.find((x) => x.count === Number(count))
    if (set && tier) out.push({ set, tier })
  }
  return out
}
