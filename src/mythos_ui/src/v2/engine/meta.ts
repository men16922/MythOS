// Mythos 2.0 — meta progression (the Archive): profile, unlocks, unlock-filtered pools,
// and banking a finished run (design doc §1.6, §3 "Echoes").
//
// Pure: every function returns a new profile (or a derived value) and never touches
// storage. A RunState is self-contained, so banking reads only the run + content.

import type {
  ContentRegistry,
  ImplantPassive,
  Lang,
  MetaProfile,
  MetaUnlockDef,
  MetaUnlockKind,
  RunRecord,
  RunState,
  StatKey,
  Text,
} from './types.ts'

export const HISTORY_CAP = 30
export const MAX_PARADOX = 5
export const NODE_ECHOES = 1
export const ELITE_ECHOES = 4
export const BOSS_ECHOES = 12
export const VICTORY_ECHOES = 25
/** Run flag set when a fight kills the connector: `${KILLED_BY_FLAG}${encounterId}` = 1. */
export const KILLED_BY_FLAG = 'killedBy:'
/** Run flag counting nodes the player has moved on from (each worth NODE_ECHOES). */
export const NODES_CLEARED_FLAG = 'nodes_cleared'
export const ABANDONED_FLAG = 'abandoned'

/** Thread unlocks carry a passive plus a few start-of-run perks. */
export type ThreadPassive = NonNullable<MetaUnlockDef['passive']>

const STAT_KEYS: readonly StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']
/** Numeric ImplantPassive fields that simply add up. */
export const PASSIVE_NUMBERS = [
  'maxHp',
  'energy',
  'handSize',
  'move',
  'rewardChoices',
  'creditMult',
  'traceMult',
  'restHeal',
  'shopDiscount',
  'bumpDamage',
] as const
export type PassiveNumber = (typeof PASSIVE_NUMBERS)[number]

const t = (ko: string, en: string): Text => ({ ko, en })

// ---------------------------------------------------------------- profile

export function newProfile(name: string, settings: Partial<MetaProfile['settings']> = {}): MetaProfile {
  return {
    version: 2,
    playerName: name.trim() || 'Connector',
    echoes: 0,
    totalEchoes: 0,
    loops: 0,
    wins: 0,
    bestAct: 0,
    unlocks: [],
    paradoxUnlocked: 0,
    codex: [],
    endingsSeen: [],
    companionsMet: [],
    history: [],
    settings: { lang: 'ko', sfx: true, bgm: true, fastAnim: false, ...settings },
  }
}

type Loose = Record<string, unknown>
const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v)
const int = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : min
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))] : []

function migrateRecord(raw: unknown): RunRecord | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null
  const result = raw.result === 'victory' || raw.result === 'abandoned' ? raw.result : 'defeat'
  const rec: RunRecord = {
    id: raw.id,
    loop: int(raw.loop, 0),
    archetype: str(raw.archetype),
    result,
    endingId: str(raw.endingId),
    act: int(raw.act, 1, 3),
    floors: int(raw.floors, 0),
    echoes: int(raw.echoes, 0),
    party: strList(raw.party),
    endedAt: str(raw.endedAt),
  }
  if (typeof raw.killedBy === 'string') rec.killedBy = raw.killedBy
  if (typeof raw.chronicle === 'string') rec.chronicle = raw.chronicle
  return rec
}

/** Coerce anything (old saves, garbage, partial JSON) into a valid profile. Never throws. */
export function migrateProfile(raw: unknown): MetaProfile {
  const r: Loose = isObj(raw) ? raw : {}
  const settings: Loose = isObj(r.settings) ? r.settings : {}
  const lang: Lang = settings.lang === 'en' ? 'en' : 'ko'
  const base = newProfile(str(r.playerName))
  const echoes = int(r.echoes, 0)
  const profile: MetaProfile = {
    ...base,
    echoes,
    totalEchoes: Math.max(echoes, int(r.totalEchoes, 0)),
    loops: int(r.loops, 0),
    wins: int(r.wins, 0),
    bestAct: int(r.bestAct, 0, 3),
    unlocks: strList(r.unlocks),
    paradoxUnlocked: int(r.paradoxUnlocked, 0, MAX_PARADOX),
    codex: strList(r.codex),
    endingsSeen: strList(r.endingsSeen),
    companionsMet: strList(r.companionsMet),
    history: (Array.isArray(r.history) ? r.history : [])
      .map(migrateRecord)
      .filter((x): x is RunRecord => x !== null)
      .slice(0, HISTORY_CAP),
    settings: {
      lang,
      sfx: bool(settings.sfx, base.settings.sfx),
      bgm: bool(settings.bgm, base.settings.bgm),
      fastAnim: bool(settings.fastAnim, base.settings.fastAnim),
    },
  }
  const death = r.lastDeath
  if (isObj(death) && typeof death.killedBy === 'string') {
    profile.lastDeath = { killedBy: death.killedBy, act: int(death.act, 1, 3), loop: int(death.loop, 0) }
  }
  return profile
}

// ---------------------------------------------------------------- unlocks

function ownsGrant(profile: MetaProfile, C: ContentRegistry, kinds: readonly MetaUnlockKind[], target: string): boolean {
  return profile.unlocks.some((id) => {
    const def = C.unlocks[id]
    return !!def && kinds.includes(def.kind) && (def.grants === target || def.id === target)
  })
}

export function unlockedArchetypes(profile: MetaProfile, C: ContentRegistry): string[] {
  const all = Object.values(C.archetypes)
  const open = all.filter((a) => a.startUnlocked || ownsGrant(profile, C, ['archetype'], a.id)).map((a) => a.id)
  // Content safety net: there is always at least one playable archetype.
  return open.length > 0 || all.length === 0 ? open : [(all[0] as (typeof all)[number]).id]
}

export function unlockedCompanions(profile: MetaProfile, C: ContentRegistry): string[] {
  return Object.values(C.companions)
    .filter((c) => c.startUnlocked || ownsGrant(profile, C, ['companion'], c.id))
    .map((c) => c.id)
}

function packOpen(profile: MetaProfile, C: ContentRegistry, pack: string | undefined, kind: MetaUnlockKind): boolean {
  return pack === undefined || ownsGrant(profile, C, [kind], pack)
}

/** Cards a reward/shop may offer this archetype: pool rarities, connector-playable, unlocked packs. */
export function cardPool(profile: MetaProfile, archetype: string, C: ContentRegistry): string[] {
  return Object.values(C.cards)
    .filter(
      (c) =>
        (c.rarity === 'common' || c.rarity === 'uncommon' || c.rarity === 'rare') &&
        c.type !== 'junk' &&
        (c.owner === 'any' || c.owner === 'connector') &&
        (c.archetype === undefined || c.archetype === archetype) &&
        packOpen(profile, C, c.pack, 'card_pack'),
    )
    .map((c) => c.id)
}

/** Implants that can drop this run (every rarity but starter; packs only once unlocked). */
export function implantPool(profile: MetaProfile, C: ContentRegistry): string[] {
  return Object.values(C.implants)
    .filter((i) => i.rarity !== 'starter' && packOpen(profile, C, i.pack, 'implant_pack'))
    .map((i) => i.id)
}

export function canBuyUnlock(profile: MetaProfile, id: string, C: ContentRegistry): { ok: boolean; reason?: Text } {
  const def = C.unlocks[id]
  if (!def) return { ok: false, reason: t('알 수 없는 항목', 'Unknown unlock') }
  if (profile.unlocks.includes(id)) return { ok: false, reason: t('이미 보유', 'Already owned') }
  if (def.requires && !profile.unlocks.includes(def.requires)) {
    const req = C.unlocks[def.requires]?.name ?? t(def.requires, def.requires)
    return { ok: false, reason: t(`${req.ko} 먼저 필요`, `Requires ${req.en}`) }
  }
  if (profile.echoes < def.cost) return { ok: false, reason: t(`◈${def.cost} 필요`, `Needs ◈${def.cost}`) }
  return { ok: true }
}

/** Spend echoes on an unlock. Returns the profile unchanged if it cannot be bought. */
export function buyUnlock(profile: MetaProfile, id: string, C: ContentRegistry): MetaProfile {
  if (!canBuyUnlock(profile, id, C).ok) return profile
  const def = C.unlocks[id] as MetaUnlockDef
  return { ...profile, echoes: profile.echoes - def.cost, unlocks: [...profile.unlocks, id] }
}

/** Add up passives (numbers sum, stats sum per key). */
export function sumPassives(list: readonly (ImplantPassive | undefined)[]): ImplantPassive {
  const out: ImplantPassive = {}
  for (const p of list) {
    if (!p) continue
    for (const k of PASSIVE_NUMBERS) {
      const v = p[k]
      if (typeof v === 'number') out[k] = (out[k] ?? 0) + v
    }
    if (p.stats) {
      const stats = { ...(out.stats ?? {}) }
      for (const s of STAT_KEYS) {
        const v = p.stats[s]
        if (typeof v === 'number') stats[s] = (stats[s] ?? 0) + v
      }
      out.stats = stats
    }
  }
  return out
}

/** Combined passive of every purchased thread unlock. */
export function threadPassive(profile: MetaProfile, C: ContentRegistry): ThreadPassive {
  const threads = profile.unlocks.map((id) => C.unlocks[id]).filter((u): u is MetaUnlockDef => u?.kind === 'thread')
  const out: ThreadPassive = sumPassives(threads.map((u) => u.passive))
  for (const u of threads) {
    const p = u.passive
    if (!p) continue
    if (typeof p.startCredits === 'number') out.startCredits = (out.startCredits ?? 0) + p.startCredits
    if (p.startConsumable) out.startConsumable = p.startConsumable
    if (p.startRemove) out.startRemove = true
  }
  return out
}

// ---------------------------------------------------------------- banking a run

export interface EchoBreakdown {
  nodes: number
  elites: number
  bosses: number
  /** Events and other in-run sources (may be negative). */
  other: number
  victory: number
  ending: number
  total: number
}

/** Echoes this run is worth right now (ending + victory bonuses only once it has ended). */
export function computeEchoes(run: RunState, C?: ContentRegistry): EchoBreakdown {
  const nodes = (run.flags[NODES_CLEARED_FLAG] ?? 0) * NODE_ECHOES
  const elites = run.tally.elites * ELITE_ECHOES
  const bosses = run.tally.bosses * BOSS_ECHOES
  const ended = run.screen.kind === 'ended' ? run.screen : null
  const victory = ended?.result === 'victory' ? VICTORY_ECHOES : 0
  const ending = ended && C ? (C.endings[ended.endingId]?.echoBonus ?? 0) : 0
  return {
    nodes,
    elites,
    bosses,
    other: run.echoes - nodes - elites - bosses,
    victory,
    ending,
    total: Math.max(0, run.echoes + victory + ending),
  }
}

/** Encounter id that killed the connector, if the run ended in combat. */
export function runKilledBy(run: RunState): string | undefined {
  const key = Object.keys(run.flags).find((k) => k.startsWith(KILLED_BY_FLAG) && (run.flags[k] ?? 0) > 0)
  return key ? key.slice(KILLED_BY_FLAG.length) : undefined
}

const union = (a: readonly string[], b: readonly string[]): string[] => [...new Set([...a, ...b])]

/**
 * Bank a finished run into the profile: echoes (+ending bonus, +victory), history (capped),
 * totals, paradox unlock, codex/endings/companions met, last death, loops + 1.
 * Idempotent per run id; a run that has not ended returns the profile unchanged.
 */
export function applyRunEnd(profile: MetaProfile, run: RunState, C: ContentRegistry, chronicle?: string): MetaProfile {
  const end = run.screen
  if (end.kind !== 'ended') return profile
  if (profile.history.some((h) => h.id === run.id)) return profile
  const victory = end.result === 'victory'
  const abandoned = (run.flags[ABANDONED_FLAG] ?? 0) > 0
  const earned = computeEchoes(run, C).total
  const killedBy = runKilledBy(run)
  const record: RunRecord = {
    id: run.id,
    loop: run.loop,
    archetype: run.archetype,
    result: victory ? 'victory' : abandoned ? 'abandoned' : 'defeat',
    endingId: end.endingId,
    act: run.act,
    floors: run.tally.floors,
    echoes: earned,
    party: run.party.map((m) => m.id),
    endedAt: run.endedAt ?? run.startedAt,
  }
  if (killedBy) record.killedBy = killedBy
  if (chronicle) record.chronicle = chronicle

  const next: MetaProfile = {
    ...profile,
    echoes: profile.echoes + earned,
    totalEchoes: profile.totalEchoes + earned,
    loops: Math.max(profile.loops + 1, run.loop),
    wins: profile.wins + (victory ? 1 : 0),
    bestAct: Math.max(profile.bestAct, run.act),
    paradoxUnlocked: victory
      ? Math.max(profile.paradoxUnlocked, Math.min(MAX_PARADOX, run.paradox + 1))
      : profile.paradoxUnlocked,
    codex: union(profile.codex, run.codex),
    endingsSeen: union(profile.endingsSeen, [end.endingId]),
    companionsMet: union(profile.companionsMet, run.party.map((m) => m.id)),
    history: [record, ...profile.history].slice(0, HISTORY_CAP),
    settings: { ...profile.settings },
  }
  if (!victory && !abandoned && killedBy) next.lastDeath = { killedBy, act: run.act, loop: run.loop }
  return next
}
