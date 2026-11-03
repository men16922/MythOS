// Companion levels, per run: deployed wins earn XP, a growth point buys a level outright. The connector grows by spending
// points; a companion grows by being taken along. Each level adds HP and raises their two best stats; 3 and 5 add a perk.
// Pure over PartyMember + CompanionDef.
import type { CompanionDef, ContentRegistry, LevelPerkDef, PartyMember, StatKey, Stats } from './types.ts'

export const MAX_COMPANION_LEVEL = 5
/** Total XP (deployed wins) that reaches level 2, 3, 4, 5. */
const XP_FOR: readonly number[] = [3, 7, 12, 18]
const HP_PER_LEVEL = 2
/** Added per level above 1: the best stat, then the second best. */
const LEAD_PER_LEVEL = 2
const SECOND_PER_LEVEL = 1
export const LEVEL3_BLOCK = 3
export const LEVEL5_MOMENTUM = 15

const NO_STATS: Stats = { str: 0, agi: 0, int: 0, cha: 0, obs: 0 }

export const levelOf = (m: Pick<PartyMember, 'level'>): number => m.level ?? 1

/** Extra damage on a companion's direct attacks: +1 at level 3, +2 at level 5. Their stats drive stat cards, not this. */
export const levelDamage = (level: number): number => Math.floor((level - 1) / 2)

/** Wins still needed for the next level; 0 at the cap. */
export function xpToNext(m: Pick<PartyMember, 'level' | 'xp'>): number {
  const need = XP_FOR[levelOf(m) - 1]
  return need === undefined ? 0 : Math.max(0, need - (m.xp ?? 0))
}

function levelUp(m: PartyMember): void {
  m.level = levelOf(m) + 1
  m.maxHp += HP_PER_LEVEL
  m.hp += HP_PER_LEVEL
}

/** One deployed win. True when it took them up a level. */
export function gainXp(m: PartyMember): boolean {
  if (levelOf(m) >= MAX_COMPANION_LEVEL) return false
  m.xp = (m.xp ?? 0) + 1
  if (xpToNext(m) > 0) return false
  levelUp(m)
  return true
}

/** A growth point spent on a companion: up one level, with the XP that level would have taken. */
export function trainLevel(m: PartyMember): boolean {
  if (levelOf(m) >= MAX_COMPANION_LEVEL) return false
  m.xp = XP_FOR[levelOf(m) - 1] as number
  levelUp(m)
  return true
}

/** A companion's stats at their level. Ties keep the order of `str, agi, int, cha, obs`. */
export function companionStats(def: Pick<CompanionDef, 'stats'>, level: number): Stats {
  const base = def.stats ?? NO_STATS
  const [lead, second] = (Object.keys(base) as StatKey[]).sort((a, b) => base[b] - base[a])
  const steps = level - 1
  const out = { ...base }
  if (lead) out[lead] += LEAD_PER_LEVEL * steps
  if (second) out[second] += SECOND_PER_LEVEL * steps
  return out
}

// ---------------------------------------------------------------- level perks (content/levelPerks.ts)

export const PERK_LEVELS = [3, 5] as const
export type PerkLevel = (typeof PERK_LEVELS)[number]

/** Option a when the content has no perk table (test doubles): the fixed bonuses every companion had before. */
const FIXED: Record<PerkLevel, LevelPerkDef> = {
  3: { id: 'l3_guard', level: 3, option: 'a', name: { ko: '', en: '' }, text: { ko: '', en: '' }, mods: { openBlock: LEVEL3_BLOCK } },
  5: { id: 'l5_momentum', level: 5, option: 'a', name: { ko: '', en: '' }, text: { ko: '', en: '' }, momentum: LEVEL5_MOMENTUM },
}

function leadStat(def: Pick<CompanionDef, 'stats'>): StatKey | undefined {
  const base = def.stats
  return base ? (Object.keys(base) as StatKey[]).sort((a, b) => base[b] - base[a])[0] : undefined
}

/** The two perks a companion is offered at a level: option a, then option b (their best stat's at level 3). */
export function perkOptions(level: PerkLevel, def: Pick<CompanionDef, 'stats'>, C: Pick<ContentRegistry, 'levelPerks'>): LevelPerkDef[] {
  const all = Object.values(C.levelPerks ?? {}).filter((p) => p.level === level)
  const a = all.find((p) => p.option === 'a') ?? FIXED[level]
  const lead = leadStat(def)
  const b = all.find((p) => p.option === 'b' && (!p.lead || p.lead === lead))
  return b ? [a, b] : [a]
}

/** The perks a companion plays with: for each perk level reached, the one chosen, else option a. */
export function activePerks(m: Pick<PartyMember, 'level' | 'perks'>, def: Pick<CompanionDef, 'stats'>, C: Pick<ContentRegistry, 'levelPerks'>): LevelPerkDef[] {
  return PERK_LEVELS.filter((l) => levelOf(m) >= l).map((l) => {
    const options = perkOptions(l, def, C)
    return options.find((p) => m.perks?.includes(p.id)) ?? (options[0] as LevelPerkDef)
  })
}

/** The lowest perk level reached with no choice made yet (null = nothing to choose). */
export function pendingPerk(m: Pick<PartyMember, 'level' | 'perks'>, def: Pick<CompanionDef, 'stats'>, C: Pick<ContentRegistry, 'levelPerks'>): PerkLevel | null {
  for (const l of PERK_LEVELS) {
    if (levelOf(m) < l) return null
    const options = perkOptions(l, def, C)
    if (options.length > 1 && !options.some((p) => m.perks?.includes(p.id))) return l
  }
  return null
}

/** Choose a perk at a reached level, once (the choice is final for the run). Mutates; true when it took. */
export function choosePerk(m: PartyMember, perkId: string, def: Pick<CompanionDef, 'stats'>, C: Pick<ContentRegistry, 'levelPerks'>): boolean {
  const level = pendingPerk(m, def, C)
  if (level === null) return false
  const options = perkOptions(level, def, C)
  if (!options.some((p) => p.id === perkId)) return false
  m.perks = [...(m.perks ?? []), perkId]
  return true
}

/** Someone in the crew has a perk to pick (the party button shows a dot). */
export function perkWaiting(members: readonly PartyMember[], C: Pick<ContentRegistry, 'levelPerks' | 'companions'>): boolean {
  return members.some((m) => {
    const def = C.companions[m.id]
    return !!def && pendingPerk(m, def, C) !== null
  })
}
