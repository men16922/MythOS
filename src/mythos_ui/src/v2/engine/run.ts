// Mythos 2.0 — run state machine (design doc §2/§3).
//
//   newRun → act_intro → map → node (combat | event | shop | rest | treasure)
//          → reward / card_reward / card_pick → map → … → boss → reward
//          → act_intro (next act) … → final_choice → ended
//
// Every reducer is pure: `(run, ...args, C) => RunState`. It clones, mutates the clone
// and returns it. An action that is not legal in the current state (wrong screen,
// unaffordable, already taken, unknown id) returns the SAME `run` object unchanged, so
// callers can detect a no-op with `===` and the UI can never corrupt a save by
// double-clicking. All randomness uses the run's named streams (`engine/streams.ts`; legacy saves: `run.rng`). A run never
// reads the profile after `newRun`: unlock-filtered pools are frozen into `run.pools`.
//
// Echo accounting: a node is "cleared" (+1 ◈) when the player moves on from it
// (entering the next node, or leaving the boss reward). Elites +4, bosses +12 on win.
// Victory/ending bonuses are added only when banking (see meta.computeEchoes).

import { noteFightFeats } from './achievements.ts'
import { noteFightBestiary } from './bestiary.ts'
import { startCombat } from './combat.ts'
import { applyCombatMods, crpgConditionMet, enterDistrict, newCrpgState, placeDistrict, repTier, takeCombatMods } from './crpg.ts'
import { advanceDirectiveOnWin } from './directives.ts'
import { AUTONOMY_ACT_SCRUB, autonomyDc, autonomyLevel, echoEffects, echoOffers, worldEchoFor } from './legacy.ts'
import { advanceThoughts, offerThought } from './thoughts.ts'
import { dailySeed, isDateKey } from './daily.ts'
import { actEventPool, generateActMap, mapEncounters } from './map.ts'
import {
  ABANDONED_FLAG,
  BOSS_ECHOES,
  ELITE_ECHOES,
  KILLED_BY_FLAG,
  NODE_ECHOES,
  NODES_CLEARED_FLAG,
  PASSIVE_NUMBERS,
  cardPool,
  implantPool,
  archMasteryTier,
  masteryFor,
  newProfile,
  threadPassive,
  unlockedCompanions,
} from './meta.ts'
import { SET_PULL, implantSetOf, newlyReached, setCounts, setPassives } from './implantSets.ts'
import { mutatorById, mutatorForDate, mutatorMods } from './mutators.ts'
import { hashSeed, pick, pickWeighted, rand, randInt, sample, shuffle } from './rng.ts'
import type { RngHolder } from './rng.ts'
import { mapRng, resetNodeStreams, runStream } from './streams.ts'
import type {
  CardDef,
  CardInstance,
  ChoiceAxis,
  CombatState,
  Condition,
  ContentRegistry,
  FirstImpression,
  Intent,
  EndingDef,
  EventDef,
  EventOption,
  ImplantDef,
  ImplantPassive,
  Improvisation,
  MapNode,
  MetaProfile,
  PartyMember,
  NodeKind,
  Outcome,
  RewardState,
  RunEffect,
  RunLogEntry,
  RunScreen,
  RunMode,
  RunState,
  ShopStock,
  StatKey,
  Stats,
  Text,
} from './types.ts'

// ---------------------------------------------------------------- constants

export const MAX_CONSUMABLES = 3
export const MAX_PARTY = 2
export const MAX_TRACE = 100
export const FORCED_ERASURE = 'ending_forced_erasure'
export const NOBLE_SACRIFICE = 'ending_noble_sacrifice'
export const RECRUIT_EVENT = 'a2_recruit'
export const OPENING_EVENT = 'a1_opening'
export const FIRST_COMPANION = 'se_rin'
export const STATIC_CARD = 'static'

const NODE_TRACE = 3
const NODE_TRACE_PARADOX = 5
const BASE_REST_HEAL = 30
const PARADOX_REST_HEAL = 20
const REST_SCRUB = 30
const SHOP_SCRUB = 25
const SHOP_HEAL_PCT = 30
const SHOP_REMOVE_BASE = 75
const SHOP_REMOVE_STEP = 25
const SHOP_SERVICE_STEP = 20
const SHOP_REMOVALS_FLAG = 'shop_removals'
const BONUS_CREDITS = 25
const STAT_MIN = 1
const STAT_MAX = 10

type PoolRarity = 'common' | 'uncommon' | 'rare'
type RarityWeights = Partial<Record<PoolRarity, number>>
type ImplantRarity = ImplantDef['rarity']

const CARD_WEIGHTS: Record<'normal' | 'elite' | 'boss' | 'bonus', RarityWeights> = {
  normal: { common: 60, uncommon: 32, rare: 8 },
  elite: { common: 45, uncommon: 40, rare: 15 },
  boss: { rare: 1 },
  bonus: { common: 30, uncommon: 50, rare: 20 },
}
const IMPLANT_WEIGHTS: Partial<Record<ImplantRarity, number>> = { common: 50, uncommon: 35, rare: 15 }
const CARD_PRICE: Record<PoolRarity, number> = { common: 50, uncommon: 75, rare: 150 }
const IMPLANT_PRICE: Record<ImplantRarity, [number, number]> = {
  starter: [140, 160],
  common: [140, 165],
  uncommon: [165, 195],
  rare: [195, 220],
  boss: [200, 220],
  shop: [150, 190],
}

// ---------------------------------------------------------------- helpers

const t = (ko: string, en: string): Text => ({ ko, en })
const clamp = (min: number, max: number, v: number): number => Math.min(max, Math.max(min, v))
const clone = <T>(x: T): T => structuredClone(x)

/** Every recruited companion: deployed first, then the bench. */
export function roster(run: Pick<RunState, 'party' | 'bench'>): PartyMember[] {
  return [...run.party, ...(run.bench ?? [])]
}
const nowIso = (): string => new Date().toISOString()

type ScreenOf<K extends RunScreen['kind']> = Extract<RunScreen, { kind: K }>

/** Reducers that need no content lookup still accept `C`, so every action has one call style. */
export type SimpleReducer = (run: RunState, C?: ContentRegistry) => RunState

/**
 * Run `fn` on a clone when the run shows screen `kind`. `fn` returns false to reject the
 * action, in which case the original run is returned untouched.
 */
function onScreen<K extends RunScreen['kind']>(
  run: RunState,
  kind: K,
  fn: (next: RunState, screen: ScreenOf<K>) => boolean | void,
): RunState {
  if (run.screen.kind !== kind) return run
  const next = clone(run)
  return fn(next, next.screen as ScreenOf<K>) === false ? run : next
}

export function log(run: RunState, kind: RunLogEntry['kind'], note: Text): void {
  const row = run.nodeId ? (run.map.nodes[run.nodeId]?.row ?? -1) : -1
  run.log.push({ act: run.act, row, kind, note })
}

function endRun(run: RunState, result: 'victory' | 'defeat', endingId: string, note: Text): void {
  run.screen = { kind: 'ended', result, endingId }
  run.endedAt = nowIso()
  log(run, 'end', note)
}

// ---------------------------------------------------------------- passives & resources

type RunNumber = 'rewardChoices' | 'creditMult' | 'traceMult' | 'restHeal' | 'shopDiscount'

/** Flag key a purchased thread passive is frozen under (e.g. `thread_traceMult`). */
export const threadFlag = (key: string): string => `thread_${key}`

/** Sum of a run-level passive over implants, party companions and frozen thread flags. */
export function runPassive(run: RunState, C: ContentRegistry, key: RunNumber): number {
  let sum = run.flags[threadFlag(key)] ?? 0
  for (const id of run.implants) sum += C.implants[id]?.passive?.[key] ?? 0
  for (const p of setPassives(run.implants)) sum += p[key] ?? 0
  for (const m of run.party) sum += C.companions[m.id]?.passive?.[key] ?? 0
  return sum
}

/** `restHeal` is authored as "extra %": accept both 10 (= 10 %) and 0.1. */
const asPercent = (v: number): number => (v > 0 && v < 1 ? v * 100 : v)

function gainTrace(run: RunState, amount: number, C: ContentRegistry): void {
  const scaled = amount > 0 ? Math.round(amount * Math.max(0, 1 + runPassive(run, C, 'traceMult'))) : amount
  run.trace = clamp(0, MAX_TRACE, run.trace + scaled)
}

function healConnector(run: RunState, amount: number): void {
  run.hp = clamp(1, run.maxHp, run.hp + Math.max(0, amount))
}

function healParty(run: RunState, amount: number): void {
  healConnector(run, amount)
  for (const m of roster(run)) m.hp = clamp(1, m.maxHp, m.hp + Math.max(0, amount))
}

function healPartyPct(run: RunState, pct: number): void {
  run.hp = clamp(1, run.maxHp, run.hp + Math.round((run.maxHp * pct) / 100))
  for (const m of roster(run)) m.hp = clamp(1, m.maxHp, m.hp + Math.round((m.maxHp * pct) / 100))
}

function addStat(stats: Stats, key: StatKey, amount: number): void {
  stats[key] = clamp(STAT_MIN, STAT_MAX, stats[key] + amount)
}

/** Concrete, permanent parts of a passive (max HP and stats) applied on acquisition. */
function applyConcretePassive(run: RunState, p: ImplantPassive | undefined): void {
  if (!p) return
  if (p.maxHp) {
    run.maxHp = Math.max(1, run.maxHp + p.maxHp)
    run.hp = clamp(1, run.maxHp, run.hp + Math.max(0, p.maxHp))
  }
  for (const [k, v] of Object.entries(p.stats ?? {}) as [StatKey, number][]) addStat(run.stats, k, v)
}

function addCard(run: RunState, defId: string, C: ContentRegistry, upgraded = false): CardInstance | null {
  if (!C.cards[defId]) return null
  run.uidCounter += 1
  const inst: CardInstance = { uid: `k${run.uidCounter}`, defId, upgraded }
  run.deck.push(inst)
  if (!run.cardsSeen?.includes(defId)) run.cardsSeen = [...(run.cardsSeen ?? []), defId]
  return inst
}

export function canUpgrade(def: CardDef | undefined): boolean {
  return !!def && Object.keys(def.upgrade ?? {}).length > 0
}

function gainImplant(run: RunState, id: string, C: ContentRegistry): boolean {
  const def = C.implants[id]
  if (!def || run.implants.includes(id)) return false
  const reached = newlyReached(run.implants, id)
  run.implants.push(id)
  applyConcretePassive(run, def.passive)
  // A set tier reached by this pickup: its max-HP / stat part applies once, now (the rest is summed live).
  for (const { tier } of reached) applyConcretePassive(run, { maxHp: tier.passive.maxHp, stats: tier.passive.stats })
  return true
}

/** Add an implant to a copy of the run through the same path a pickup uses (set tiers included) — balance tooling and tests. */
export function grantImplant(run: RunState, id: string, C: ContentRegistry): RunState {
  const next = clone(run)
  gainImplant(next, id, C)
  return next
}

function gainConsumable(run: RunState, id: string, C: ContentRegistry): boolean {
  if (!C.consumables[id] || run.consumables.length >= MAX_CONSUMABLES) return false
  run.consumables.push(id)
  return true
}

function joinCompanion(run: RunState, id: string, C: ContentRegistry): boolean {
  const def = C.companions[id]
  if (!def || roster(run).some((m) => m.id === id)) return false
  const tier = run.mastery?.[id] ?? 0
  // Mastery II: you already know each other — start at bond 1 (the bond card is one safehouse closer).
  const member: PartyMember = { id, hp: def.maxHp, maxHp: def.maxHp, bond: tier >= 2 ? 1 : 0 }
  // A full party sends the newcomer to the bench; the player swaps on the map.
  if (run.party.length < MAX_PARTY) run.party.push(member)
  else (run.bench ??= []).push(member)
  for (const card of def.cards) addCard(run, card, C)
  applyConcretePassive(run, def.passive)
  if (C.intros?.[id]) (run.introQueue ??= []).push(id)
  // Mastery I: their signature card starts upgraded (what bond 3 would otherwise earn).
  if (tier >= 1 && def.cards[0]) {
    const sig = run.deck.find((c) => c.defId === def.cards[0] && !c.upgraded)
    if (sig) sig.upgraded = true
  }
  return true
}

/** Raise a companion's bond; level 2 adds their bond card, level 3 upgrades their signature card. */
/** Lean the connector one step along a choice axis (character sheet, IX's read of you, endings). */
export function addAxis(run: RunState, axis: ChoiceAxis | undefined, n = 1): void {
  if (!axis || n <= 0) return
  run.axes = { ...(run.axes ?? {}), [axis]: (run.axes?.[axis] ?? 0) + n }
}

/** Which axis a dialogue intent leans on (none for neutral asks, sneaking and leaving). */
export function intentAxis(intent: Intent): ChoiceAxis | undefined {
  switch (intent) {
    case 'persuade':
    case 'offer':
      return 'humanity'
    case 'intimidate':
    case 'deceive':
    case 'fight':
      return 'dominance'
    case 'insight':
      return 'insight'
    default:
      return undefined
  }
}

const IMPRESSION_AXIS: Record<FirstImpression, ChoiceAxis> = { trust: 'humanity', guard: 'resilience', wit: 'insight' }

/**
 * Close the next recruit scene in the queue. `tone` is the first-impression choice (null = skipped / reunion):
 * the tone the companion likes gives +1 bond on a normal run (never on a daily — it must be the same for everyone).
 */
export function resolveIntro(run0: RunState, C: ContentRegistry, tone: FirstImpression | null): RunState {
  const id = run0.introQueue?.[0]
  if (!id) return run0
  const run = clone(run0)
  run.introQueue = (run.introQueue ?? []).slice(1)
  if (run.introQueue.length === 0) delete run.introQueue
  const intro = C.intros?.[id]
  if (tone && intro) {
    run.flags[`impress_${id}`] = ['trust', 'guard', 'wit'].indexOf(tone) + 1
    addAxis(run, IMPRESSION_AXIS[tone])
    if (!run.daily && tone === intro.likesTone) raiseBond(run, id, 1, C)
  }
  return run
}

export function raiseBond(run: RunState, id: string, amount: number, C: ContentRegistry): boolean {
  const m = roster(run).find((p) => p.id === id)
  const def = C.companions[id]
  if (!m || !def) return false
  const before = m.bond
  m.bond = clamp(0, 3, m.bond + amount)
  for (let level = before + 1; level <= m.bond; level++) {
    if (level === 2 && def.bondCards[0]) addCard(run, def.bondCards[0], C)
    if (level === 3 && def.cards[0]) {
      const sig = run.deck.find((c) => c.defId === def.cards[0] && !c.upgraded)
      if (sig) sig.upgraded = true
    }
  }
  return m.bond !== before
}

// ---------------------------------------------------------------- rolls

/** A companion's own cards are only offered while that companion travels with you. */
function offerable(run: RunState, C: ContentRegistry, id: string): boolean {
  const def = C.cards[id]
  if (!def) return false
  if (def.minAct !== undefined && run.act < def.minAct) return false
  return def.owner === 'any' || def.owner === 'connector' || run.party.some((m) => m.id === def.owner)
}

/** Character identity: party-companion cards and own-archetype cards come up more often than generic ones. */
const COMPANION_CARD_WEIGHT = 2.5
const ARCHETYPE_CARD_WEIGHT = 1.8
function cardWeight(run: RunState, C: ContentRegistry, id: string): number {
  const def = C.cards[id]
  if (!def) return 0
  if (def.owner !== 'any' && def.owner !== 'connector') return COMPANION_CARD_WEIGHT
  return def.archetype === run.archetype ? ARCHETYPE_CARD_WEIGHT : 1
}

function rollCards(h: RngHolder, run: RunState, C: ContentRegistry, count: number, weights: RarityWeights): string[] {
  const pool = run.pools.cards.filter((id) => offerable(run, C, id))
  const out: string[] = []
  const rarities: PoolRarity[] = ['common', 'uncommon', 'rare']
  for (let i = 0; i < count; i++) {
    const left = pool.filter((id) => !out.includes(id))
    if (left.length === 0) break
    const rarity = pickWeighted(h, rarities, (r) => weights[r] ?? 0)
    const exact = left.filter((id) => C.cards[id]?.rarity === rarity)
    // Fallback prefers the rarest tier still available so boss rewards stay strong.
    const fallback = ['rare', 'uncommon', 'common']
      .map((r) => left.filter((id) => C.cards[id]?.rarity === r))
      .find((l) => l.length > 0)
    out.push(pickWeighted(h, exact.length > 0 ? exact : (fallback ?? left), (id) => cardWeight(run, C, id)))
  }
  return out
}

function rollImplant(
  h: RngHolder,
  run: RunState,
  C: ContentRegistry,
  weights: Partial<Record<ImplantRarity, number>>,
  exclude: readonly string[] = [],
): string | null {
  const pool = run.pools.implants.filter((id) => C.implants[id] && !run.implants.includes(id) && !exclude.includes(id))
  const of = (r: ImplantRarity): string[] => pool.filter((id) => C.implants[id]?.rarity === r)
  const tiers = (Object.keys(weights) as ImplantRarity[]).filter((r) => (weights[r] ?? 0) > 0 && of(r).length > 0)
  // Build commitment: within the chosen rarity, a piece of a set you already hold is more likely to be offered.
  const held = setCounts(run.implants)
  const lean = (ids: string[]): string => {
    const set = (id: string): number => ((held[implantSetOf(id)?.id ?? ''] ?? 0) > 0 ? SET_PULL : 1)
    return pickWeighted(h, ids, set)
  }
  if (tiers.length > 0) return lean(of(pickWeighted(h, tiers, (r) => weights[r] ?? 0)))
  const regular = pool.filter((id) => {
    const r = C.implants[id]?.rarity
    return r === 'common' || r === 'uncommon' || r === 'rare'
  })
  return regular.length > 0 ? pick(h, regular) : null
}

const CONSUMABLE_WEIGHT: Partial<Record<string, number>> = { common: 3, uncommon: 2, rare: 1 }

function rollConsumable(h: RngHolder, C: ContentRegistry): string | null {
  const list = Object.values(C.consumables).filter((c) => c.rarity !== 'special' && c.rarity !== 'starter')
  if (list.length === 0) return null
  return pickWeighted(h, list, (c) => CONSUMABLE_WEIGHT[c.rarity] ?? 1).id
}

// ---------------------------------------------------------------- conditions & checks

/** Event stat check: clamp(5, 95, 50 + (stat − dc)·10). */
export function checkChance(run: RunState, stat: StatKey, dc: number): number {
  return clamp(5, 95, 50 + ((run.stats[stat] ?? 0) - dc) * 10)
}

const STAT_LABEL: Record<StatKey, string> = { str: 'STR', agi: 'AGI', int: 'INT', cha: 'CHA', obs: 'OBS' }

export function conditionMet(run: RunState, cond: Condition | undefined, C: ContentRegistry): { ok: boolean; reason?: Text } {
  if (!cond) return { ok: true }
  const fail = (ko: string, en: string) => ({ ok: false, reason: t(ko, en) })
  const name = (id: string): Text => C.companions[id]?.name ?? t(id, id)
  if (cond.minCredits !== undefined && run.credits < cond.minCredits)
    return fail(`₵${cond.minCredits} 필요`, `Needs ₵${cond.minCredits}`)
  if (cond.minHp !== undefined && run.hp < cond.minHp) return fail(`HP ${cond.minHp} 필요`, `Needs ${cond.minHp} HP`)
  if (cond.companion && !run.party.some((m) => m.id === cond.companion)) {
    const n = name(cond.companion)
    return fail(`${n.ko} 동행 필요`, `Requires ${n.en}`)
  }
  for (const id of cond.companions ?? []) {
    if (run.party.some((m) => m.id === id)) continue
    const n = name(id)
    return fail(`${n.ko} 동행 필요`, `Requires ${n.en}`)
  }
  if (cond.noCompanion && roster(run).some((m) => m.id === cond.noCompanion)) {
    const n = name(cond.noCompanion)
    return fail(`${n.ko} 동행 중 불가`, `Not with ${n.en}`)
  }
  if (cond.partySizeAtMost !== undefined && run.party.length > cond.partySizeAtMost)
    return fail(`동료 ${cond.partySizeAtMost}명 이하`, `Party of ${cond.partySizeAtMost} or fewer`)
  if (cond.flag && !((run.flags[cond.flag] ?? 0) > 0)) return fail('조건 미충족', 'Condition not met')
  if (cond.notFlag && (run.flags[cond.notFlag] ?? 0) > 0) return fail('조건 미충족', 'Condition not met')
  if (cond.minTrace !== undefined && run.trace < cond.minTrace)
    return fail(`추적도 ${cond.minTrace} 이상`, `Trace ${cond.minTrace}+`)
  if (cond.maxTrace !== undefined && run.trace > cond.maxTrace)
    return fail(`추적도 ${cond.maxTrace} 이하`, `Trace ${cond.maxTrace} or less`)
  if (cond.stat && (run.stats[cond.stat.stat] ?? 0) < cond.stat.min) {
    const s = STAT_LABEL[cond.stat.stat]
    return fail(`${s} ${cond.stat.min} 필요`, `Needs ${s} ${cond.stat.min}`)
  }
  if (cond.hasImplant && !run.implants.includes(cond.hasImplant)) {
    const n = C.implants[cond.hasImplant]?.name ?? t(cond.hasImplant, cond.hasImplant)
    return fail(`${n.ko} 필요`, `Requires ${n.en}`)
  }
  if (cond.background || cond.quest || cond.approval) return crpgConditionMet(run, cond, C)
  return { ok: true }
}

// ---------------------------------------------------------------- new run

export interface NewRunOptions {
  archetype: string
  companion?: string | null
  paradox: number
  seed?: number
  /** ISO timestamp for `startedAt` (defaults to now; pass one for reproducible saves). */
  now?: string
  /**
   * Daily-seed run for this KST date key ('YYYY-MM-DD', see engine/daily.ts). The run then
   * depends only on the date, the archetype and the content: the seed comes from the date +
   * archetype (`seed` is ignored), paradox is 0, pools are the base (no-unlock) content,
   * Archive threads do not apply and Se-rin always starts with you (`companion` is ignored).
   */
  daily?: string
  /** Signal+ CRPG layer (engine/crpg.ts) with this background (null = none). `trial: true` places only the Act 1 district. Ignored on a daily. */
  crpg?: { background: string | null; trial?: boolean }
  /** Echo to inscribe (engine/legacy.ts echoOffers of this profile). Ignored on a daily or when not offered. */
  echo?: string
  /** Optional loop mutator id for a non-daily run. */
  mutator?: string
  /** Deep Signal (ignored on a daily, and until the profile may play it — see deepSignalOpen). */
  mode?: RunMode
}

/** Stand-in profile for a daily run's content: nothing unlocked, no threads. */
const DAILY_BASE: MetaProfile = newProfile('daily')

function findStaticCard(C: ContentRegistry): string | undefined {
  if (C.cards[STATIC_CARD]) return STATIC_CARD
  return Object.values(C.cards).find((c) => c.type === 'junk' && c.id.includes('static'))?.id
}

export function newRun(profile: MetaProfile, opts: NewRunOptions, C: ContentRegistry): RunState {
  const arch = C.archetypes[opts.archetype]
  if (!arch) throw new Error(`newRun: unknown archetype "${opts.archetype}"`)
  if (opts.daily !== undefined && !isDateKey(opts.daily)) throw new Error(`newRun: bad daily date "${opts.daily}"`)
  const daily = opts.daily
  // Everything below that shapes the run reads `unlockSource`, never `profile`, so a daily is
  // the same for every player. `profile` still numbers the loop (bookkeeping only, never rolled on).
  const unlockSource = daily ? DAILY_BASE : profile
  const loop = profile.loops + 1
  const paradox = daily ? 0 : clamp(0, 5, Math.floor(opts.paradox))
  const seed = daily
    ? dailySeed(daily, arch.id)
    : (opts.seed ?? hashSeed(`${profile.playerName}|${loop}|${profile.totalEchoes}|${arch.id}|${paradox}`)) >>> 0
  const run: RunState = {
    version: 2,
    id: `run-${loop}-${seed.toString(36)}`,
    seed,
    rng: seed,
    streams: {},
    loop,
    paradox,
    archetype: arch.id,
    act: 1,
    map: { act: 1, rows: 0, nodes: {}, startIds: [], bossId: '' },
    nodeId: null,
    visited: [],
    hp: arch.maxHp,
    maxHp: arch.maxHp,
    credits: arch.startingCredits,
    trace: paradox >= 3 ? 20 : 0,
    stats: { ...arch.stats },
    deck: [],
    implants: [],
    consumables: [],
    party: [],
    pools: {
      cards: cardPool(unlockSource, arch.id, C),
      implants: implantPool(unlockSource, C),
      companions: unlockedCompanions(unlockSource, C),
    },
    flags: {},
    codex: [],
    seenEvents: [],
    screen: { kind: 'act_intro' },
    log: [],
    echoes: 0,
    uidCounter: 0,
    tally: { kills: 0, elites: 0, bosses: 0, damageTaken: 0, cardsPlayed: 0, floors: 0, environmentKills: 0 },
    startedAt: opts.now ?? nowIso(),
  }
  if (daily) run.daily = daily
  // Companion mastery comes from the profile, never on a daily (it must be the same run for everybody).
  if (!daily) {
    const mastery = masteryFor(profile)
    if (Object.keys(mastery).length > 0) run.mastery = mastery
  }
  for (const id of arch.startingDeck) addCard(run, id, C)

  // Archive threads: concrete perks now, run-level multipliers frozen as flags.
  const thread = threadPassive(unlockSource, C)
  applyConcretePassive(run, thread)
  if (daily) run.mutator = mutatorForDate(daily).id
  else if (opts.mutator && mutatorById(opts.mutator)) run.mutator = opts.mutator
  if (!daily && opts.mode && deepSignalOpen(profile, C)) run.mode = opts.mode
  const mut = mutatorMods(run)
  run.maxHp = Math.max(20, run.maxHp + (mut.maxHp ?? 0))
  run.hp = run.maxHp
  run.credits += (thread.startCredits ?? 0) + (mut.startCredits ?? 0)
  if (thread.startConsumable) gainConsumable(run, thread.startConsumable, C)
  for (const k of PASSIVE_NUMBERS) {
    const v = thread[k]
    if (k !== 'maxHp' && typeof v === 'number' && v !== 0) run.flags[threadFlag(k)] = v
  }

  gainImplant(run, arch.startingImplant, C)
  const fixedCompanion = daily !== undefined || loop === 1
  const companion = fixedCompanion ? FIRST_COMPANION : opts.companion
  if (companion && (fixedCompanion || run.pools.companions.includes(companion))) joinCompanion(run, companion, C)
  if (paradox >= 2) {
    const junk = findStaticCard(C)
    if (junk) addCard(run, junk, C)
  }
  for (let i = 0; i < (mut.startStatic ?? 0); i++) {
    const junk = findStaticCard(C)
    if (junk) addCard(run, junk, C)
  }
  for (let i = 0; i < (mut.startConsumable ?? 0); i++) {
    const id = rollConsumable(runStream(run, 'reward'), C)
    if (id) gainConsumable(run, id, C)
  }

  if (opts.crpg && !daily && C.crpg) {
    const bg = opts.crpg.background
    run.crpg = newCrpgState(bg && C.crpg.backgrounds[bg] ? bg : null, opts.crpg.trial)
  }
  // What the last loop left behind: an inscribed echo and the autonomy of the lore found so far (never on a daily).
  if (!daily) {
    const echo = opts.echo ? echoOffers(profile, C).find((e) => e.id === opts.echo) : undefined
    if (echo) {
      applyImmediate(run, echoEffects(echo, profile), C)
      run.echo = echo.id
    }
    const autonomy = autonomyLevel(profile)
    if (autonomy > 0) run.autonomy = autonomy
    if (autonomy >= 3) run.growth = (run.growth ?? 0) + 1
    if (autonomy >= 5 && C.cards[AUTONOMY_REWRITE_CARD]) addCard(run, AUTONOMY_REWRITE_CARD, C)
    // Archetype mastery (R7c): I +4 max HP, II one starting card upgraded, III +1 growth.
    const archTier = archMasteryTier(profile, arch.id)
    if (archTier > 0) run.archMastery = archTier
    if (archTier >= 1) {
      run.maxHp += 4
      run.hp = run.maxHp
    }
    if (archTier >= 2) {
      const card = run.deck.find((c) => !c.upgraded && canUpgrade(C.cards[c.defId]))
      if (card) card.upgraded = true
    }
    if (archTier >= 3) run.growth = (run.growth ?? 0) + 1
    // First Record shards already found stay found (events gate on `notFlag: record_N`).
    for (const id of profile.records ?? []) if (id.startsWith(RECORD_PREFIX)) run.flags[id] = 1
    const worldEcho = worldEchoFor(profile)
    if (worldEcho) {
      run.flags[worldEcho.id] = 1
      run.credits += worldEcho.credits ?? 0
      if (worldEcho.bond) for (const m of run.party) raiseBond(run, m.id, worldEcho.bond, C)
    }
  }
  run.map = generateActMap(1, mapRng(run, 1), C, { paradox })
  placeDistrict(run, run.map, C)
  log(run, 'start', daily ? t(`오늘의 시드 ${daily} 시작`, `Daily Signal ${daily} begins`) : t(`루프 ${loop} 시작`, `Loop ${loop} begins`))
  const removes = (thread.startRemove ? 1 : 0) + (!daily && (run.autonomy ?? 0) >= 4 ? 1 : 0)
  if (removes > 0 && run.deck.length > removes) {
    run.screen = { kind: 'card_pick', purpose: 'remove', count: removes, returnTo: { kind: 'act_intro' } }
  }
  return run
}

// ---------------------------------------------------------------- acts & map

/** Act intro → map (or the scripted opening / Act 2 recruit event first). */
export function startAct(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'act_intro', (next) => {
    const scripted = next.act === 1 ? OPENING_EVENT : next.act === 2 ? RECRUIT_EVENT : null
    const def = scripted ? C.events[scripted] : undefined
    const wanted =
      def &&
      !next.seenEvents.includes(def.id) &&
      conditionMet(next, def.requires, C).ok &&
      (def.id !== RECRUIT_EVENT || recruitCandidates(next, C).length > 0)
    if (def && wanted) {
      next.seenEvents.push(def.id)
      next.screen = { kind: 'event', eventId: def.id, resolved: null, improvised: null }
    } else {
      next.screen = { kind: 'map' }
    }
  })
}

/** Node ids the player may enter next. */
export function reachableNodes(run: RunState): string[] {
  if (run.nodeId === null) return run.map.startIds.slice()
  return run.map.nodes[run.nodeId]?.next.slice() ?? []
}

function clearCurrentNode(run: RunState): void {
  if (run.nodeId === null) return
  run.echoes += NODE_ECHOES
  run.flags[NODES_CLEARED_FLAG] = (run.flags[NODES_CLEARED_FLAG] ?? 0) + 1
}

function fallbackEncounter(run: RunState, kind: 'normal' | 'elite' | 'boss', C: ContentRegistry): string {
  const list = mapEncounters(run.act, kind, C)
  const any = list.length > 0 ? list : Object.values(C.encounters).filter((e) => e.kind === kind)
  if (any.length === 0) throw new Error(`run: no ${kind} encounter for act ${run.act}`)
  return pick(runStream(run, 'encounter'), any).id
}

function beginCombat(run: RunState, encounterId: string, C: ContentRegistry): CombatState {
  if (!run.streams) rand(run) // legacy shared stream: advance so every fight gets a fresh slice of it
  const combat = startCombat(run, encounterId, C)
  // Signal+ CRPG: twists a conversation set up (and quest payoffs on a boss) apply to the fight as it starts.
  const mods = takeCombatMods(run, C.encounters[encounterId]?.kind === 'boss', C, C.encounters[encounterId]?.kind === 'elite')
  if (mods.length > 0) applyCombatMods(combat, mods)
  return combat
}

/** Pre-rolled event if still valid, else a fresh act event (unseen + requirements met first). */
function resolveEventId(run: RunState, node: MapNode, C: ContentRegistry): string | null {
  const usable = (e: EventDef | undefined): e is EventDef => !!e && conditionMet(run, e.requires, C).ok
  const pre = node.eventId ? C.events[node.eventId] : undefined
  if (usable(pre) && !run.seenEvents.includes(pre.id)) return pre.id
  const onMap = new Set(Object.values(run.map.nodes).map((n) => n.eventId))
  const pool = actEventPool(run.act, C).filter(usable)
  const tiers = [
    pool.filter((e) => !run.seenEvents.includes(e.id) && !onMap.has(e.id)),
    pool.filter((e) => !run.seenEvents.includes(e.id)),
    pool,
  ]
  const options = tiers.find((tier) => tier.length > 0)
  return options ? pickWeighted(runStream(run, 'event'), options, (e) => e.weight ?? 1).id : null
}

const KIND_NOTE: Record<NodeKind, Text> = {
  combat: t('교전', 'Fight'),
  elite: t('정예 교전', 'Elite fight'),
  boss: t('보스', 'Boss'),
  event: t('사건', 'Event'),
  shop: t('암시장', 'Shop'),
  rest: t('은신처', 'Safehouse'),
  treasure: t('보급품', 'Cache'),
  district: t('구역', 'District'),
}

function enterAsEvent(next: RunState, node: MapNode, C: ContentRegistry): void {
  const eventId = resolveEventId(next, node, C)
  if (eventId === null) {
    // No playable event left: the street throws a fight at you instead.
    const enc = fallbackEncounter(next, 'normal', C)
    log(next, 'combat', C.encounters[enc]?.name ?? KIND_NOTE.combat)
    next.screen = { kind: 'combat', combat: beginCombat(next, enc, C), nodeKind: 'combat' }
    return
  }
  next.seenEvents.push(eventId)
  log(next, 'event', C.events[eventId]?.title ?? KIND_NOTE.event)
  next.screen = { kind: 'event', eventId, resolved: null, improvised: null }
}

export function enterNode(run: RunState, nodeId: string, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'map' || !reachableNodes(run).includes(nodeId)) return run
  const node = run.map.nodes[nodeId]
  if (!node) return run
  const next = clone(run)
  clearCurrentNode(next)
  resetNodeStreams(next)
  next.nodeId = nodeId
  next.visited.push(nodeId)
  next.tally.floors += 1
  // The grid's reputation (C+4): on good terms the patrols look away a little; on bad terms they look harder.
  gainTrace(next, Math.max(0, (mutatorMods(next).traceStep ?? (next.paradox >= 3 ? NODE_TRACE_PARADOX : NODE_TRACE)) - repTier(next, 'grid')), C)
  if (next.thoughts) applyImmediate(next, advanceThoughts(next, C.thoughts ?? []), C)

  switch (node.kind) {
    case 'combat':
    case 'elite':
    case 'boss': {
      const enc =
        node.encounterId && C.encounters[node.encounterId]
          ? node.encounterId
          : fallbackEncounter(next, node.kind === 'combat' ? 'normal' : node.kind, C)
      log(next, node.kind, C.encounters[enc]?.name ?? KIND_NOTE[node.kind])
      next.screen = { kind: 'combat', combat: beginCombat(next, enc, C), nodeKind: node.kind }
      break
    }
    case 'event':
      enterAsEvent(next, node, C)
      break
    case 'district':
      // A district this content does not know (an old save, a run without the layer): play it as an event node.
      if (!node.districtId || !enterDistrict(next, node.districtId, C)) enterAsEvent(next, node, C)
      break
    case 'shop':
      log(next, 'shop', KIND_NOTE.shop)
      next.screen = { kind: 'shop', stock: generateShop(next, C) }
      break
    case 'rest':
      log(next, 'rest', KIND_NOTE.rest)
      next.screen = { kind: 'rest', done: false }
      break
    case 'treasure': {
      const cache = runStream(next, 'treasure')
      const implantId = rollImplant(cache, next, C, { common: 60, uncommon: 40 }) ?? ''
      log(next, 'treasure', KIND_NOTE.treasure)
      next.screen = { kind: 'treasure', implantId, credits: randInt(cache, 25, 45), opened: false }
      break
    }
  }
  return next
}

// ---------------------------------------------------------------- combat → reward

function bonusAchieved(c: CombatState): boolean {
  const b = c.bonus
  if (!b || b.failed) return false
  switch (b.def.kind) {
    case 'environment':
      return b.progress >= b.def.count
    case 'turn_limit':
      return c.turn <= b.def.turns
    default:
      return true
  }
}

function buildReward(run: RunState, combat: CombatState, nodeKind: NodeKind, C: ContentRegistry): RewardState {
  const tier = nodeKind === 'boss' ? 'boss' : nodeKind === 'elite' ? 'elite' : 'normal'
  const h = runStream(run, 'reward')
  const base = tier === 'boss' ? 60 : tier === 'elite' ? randInt(h, 30, 40) : randInt(h, 12, 20)
  const creditScale = Math.max(0, 1 + runPassive(run, C, 'creditMult')) * (1 + (mutatorMods(run).rewardCreditsPct ?? 0) / 100)
  let credits = Math.round(base * creditScale) + Math.max(0, combat.credits)
  const choiceCount = 3 + Math.max(0, Math.round(runPassive(run, C, 'rewardChoices')))
  const cardChoices: string[][] = []
  const first = rollCards(h, run, C, choiceCount, CARD_WEIGHTS[tier])
  if (first.length > 0) cardChoices.push(first)

  let implantChoices: string[] = []
  if (tier === 'elite') {
    const id = rollImplant(h, run, C, IMPLANT_WEIGHTS)
    if (id) implantChoices = [id]
  } else if (tier === 'boss') {
    for (let i = 0; i < 3; i++) {
      const id =
        rollImplant(h, run, C, { boss: 1 }, implantChoices) ?? rollImplant(h, run, C, { rare: 1 }, implantChoices)
      if (id) implantChoices.push(id)
    }
  }

  const consumableChance = tier === 'normal' ? 0.25 : tier === 'elite' ? 0.5 : 0
  const consumable = consumableChance > 0 && rand(h) < consumableChance ? rollConsumable(h, C) : null

  if (bonusAchieved(combat)) {
    const extra = rollCards(h, run, C, choiceCount, tier === 'boss' ? CARD_WEIGHTS.boss : CARD_WEIGHTS.bonus)
    if (cardChoices.length > 0 && extra.length > 0) cardChoices.push(extra)
    else credits += BONUS_CREDITS
  }

  const reward: RewardState = {
    credits,
    cardChoices,
    implantChoices,
    echoes: tier === 'boss' ? BOSS_ECHOES : tier === 'elite' ? ELITE_ECHOES : 0,
    taken: { credits: false, cards: cardChoices.map(() => false), implant: false, consumable: false },
  }
  if (consumable) reward.consumable = consumable
  return reward
}

/**
 * Store a combat step. On a win: sync HP (downed companions return at 1), consumables,
 * trace and tallies, then open the reward. On a loss: the run ends in Forced Erasure.
 */
export function updateCombat(run: RunState, combat: CombatState, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'combat') return run
  const nodeKind = run.screen.nodeKind
  if (combat.phase === 'player') return { ...run, screen: { kind: 'combat', combat, nodeKind } }

  const next = clone({ ...run, screen: { kind: 'map' } as RunScreen })
  next.tally.kills += combat.stats.enemiesKilled
  next.tally.environmentKills += combat.stats.environmentKills
  next.tally.damageTaken += combat.stats.damageTaken
  next.tally.cardsPlayed += combat.stats.cardsPlayed
  noteFightBestiary(next, combat, C)
  const name = C.encounters[combat.encounterId]?.name ?? KIND_NOTE[nodeKind]

  if (combat.phase === 'lost' && combat.encounterId === SECRET_ENCOUNTER) {
    // Losing to the First Connector does not undo the win: the record stays closed, the ending choice remains.
    next.hp = 1
    next.screen = { kind: 'final_choice' }
    return next
  }
  if (combat.phase === 'lost') {
    next.hp = 0
    next.flags[`${KILLED_BY_FLAG}${combat.encounterId}`] = 1
    endRun(next, 'defeat', FORCED_ERASURE, name)
    return next
  }

  const connector = combat.units.find((u) => u.uid === 'connector')
  next.hp = clamp(1, next.maxHp, connector?.hp ?? next.hp)
  for (const m of next.party) {
    const u = combat.units.find((x) => x.uid === m.id && x.side === 'party')
    m.hp = u && u.hp > 0 ? clamp(1, m.maxHp, u.hp) : 1
  }
  next.consumables = combat.consumables.filter((id) => C.consumables[id]).slice(0, MAX_CONSUMABLES)
  if ((combat.parts ?? 0) > 0) next.parts = (next.parts ?? 0) + (combat.parts ?? 0)
  gainTrace(next, combat.trace, C)
  advanceDirectiveOnWin(next, combat, nodeKind)
  noteFightFeats(next, combat, nodeKind)
  if (nodeKind === 'elite' || nodeKind === 'boss') addAxis(next, 'resilience')
  if (nodeKind === 'elite') {
    next.tally.elites += 1
    next.growth = (next.growth ?? 0) + 1
    next.echoes += ELITE_ECHOES
  } else if (nodeKind === 'boss') {
    next.tally.bosses += 1
    next.echoes += BOSS_ECHOES
    // Surviving a boss together deepens every bond (companions still standing at the end).
    for (const m of next.party) {
      if (combat.units.some((u) => u.uid === m.id && u.side === 'party' && u.hp > 0)) raiseBond(next, m.id, 1, C)
    }
    // After the final boss nothing is left to spend loot on: straight to the ending choice.
    if (next.act >= lastAct(next, C) && next.mode !== 'endless') {
      if (combat.encounterId === SECRET_ENCOUNTER) next.flags[SECRET_WON_FLAG] = 1
      else clearCurrentNode(next)
      if (secretBossGate(next, C)) {
        // The signal does not cut out: someone is still connected. Half the missing HP back, then the last fight.
        next.flags[SECRET_MET_FLAG] = 1
        next.hp = clamp(1, next.maxHp, next.hp + Math.ceil((next.maxHp - next.hp) / 2))
        log(next, 'combat', C.encounters[SECRET_ENCOUNTER]!.name)
        next.screen = { kind: 'combat', combat: beginCombat(next, SECRET_ENCOUNTER, C), nodeKind: 'boss' }
        return next
      }
      next.screen = { kind: 'final_choice' }
      return next
    }
  }
  next.screen = { kind: 'reward', reward: buildReward(next, combat, nodeKind, C) }
  return next
}

// ---------------------------------------------------------------- reward reducers

export const takeRewardCredits: SimpleReducer = (run) =>
  onScreen(run, 'reward', (next, s) => {
    if (s.reward.taken.credits) return false
    next.credits += s.reward.credits
    s.reward.taken.credits = true
  })

/** Take `cardId` from choice group `groupIndex`, or skip the group with `null`. */
export function takeRewardCard(run: RunState, groupIndex: number, cardId: string | null, C: ContentRegistry): RunState {
  return onScreen(run, 'reward', (next, s) => {
    const group = s.reward.cardChoices[groupIndex]
    if (!group || s.reward.taken.cards[groupIndex]) return false
    if (cardId !== null && (!group.includes(cardId) || !addCard(next, cardId, C))) return false
    s.reward.taken.cards[groupIndex] = true
  })
}

export function takeRewardImplant(run: RunState, implantId: string, C: ContentRegistry): RunState {
  return onScreen(run, 'reward', (next, s) => {
    if (s.reward.taken.implant || !s.reward.implantChoices.includes(implantId)) return false
    if (!gainImplant(next, implantId, C)) return false
    s.reward.taken.implant = true
  })
}

/** Fails (no-op) when the belt is full — discard first. */
export function takeRewardConsumable(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'reward', (next, s) => {
    const id = s.reward.consumable
    if (!id || s.reward.taken.consumable || !gainConsumable(next, id, C)) return false
    s.reward.taken.consumable = true
  })
}

/** Acts a standard run plays. */
export const STANDARD_ACTS = 3

/** The run's final act: 3 on a standard run; a Deep Signal run continues through every act the content holds. */
export function lastAct(run: Pick<RunState, 'mode'>, C: Pick<ContentRegistry, 'acts'>): number {
  if (!run.mode) return STANDARD_ACTS
  return Math.max(STANDARD_ACTS, ...Object.keys(C.acts).map(Number))
}

/** Endless Signal depth reached: laps × acts + the current act (the record the profile keeps). */
export function endlessDepth(run: Pick<RunState, 'mode' | 'lap' | 'act'>, C: Pick<ContentRegistry, 'acts'>): number {
  return (run.lap ?? 0) * lastAct({ mode: 'endless' }, C) + run.act
}

/** Deep Signal is open once the profile has won a run and the content holds acts beyond the third. */
export function deepSignalOpen(profile: Pick<MetaProfile, 'wins'>, C: Pick<ContentRegistry, 'acts'>): boolean {
  return profile.wins > 0 && Object.keys(C.acts).some((k) => Number(k) > STANDARD_ACTS)
}

function advanceAct(run: RunState, C: ContentRegistry): void {
  run.growth = (run.growth ?? 0) + 1
  if ((run.autonomy ?? 0) >= 2) gainTrace(run, -AUTONOMY_ACT_SCRUB, C)
  run.act = run.act + 1
  if (run.paradox >= 9) gainTrace(run, 10, C) // Paradox 9: tracked ahead
  run.map = generateActMap(run.act, mapRng(run, run.act), C, { paradox: run.paradox, exclude: run.seenEvents })
  placeDistrict(run, run.map, C)
  run.nodeId = null
  resetNodeStreams(run)
  run.hp = clamp(1, run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) / 2))
  for (const m of roster(run)) m.hp = clamp(1, m.maxHp, m.hp + Math.ceil((m.maxHp - m.hp) / 2))
  log(run, 'start', C.acts[run.act]?.name ?? t(`${run.act}막`, `Act ${run.act}`))
  if ((run.lap ?? 0) === 0) for (const id of C.acts[run.act]?.gift ?? []) addCard(run, id, C)
  run.screen = { kind: 'act_intro' }
}

/** Leave the reward (untaken credits are pocketed). After a boss: next act or the final choice. */
export function leaveReward(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'reward', (next, s) => {
    if (!s.reward.taken.credits) next.credits += s.reward.credits
    if (next.nodeId !== null && next.nodeId === next.map.bossId) {
      clearCurrentNode(next)
      if (next.act < lastAct(next, C)) advanceAct(next, C)
      else if (next.mode === 'endless') {
        // Endless Signal: one lap deeper, back to Act 1.
        next.lap = (next.lap ?? 0) + 1
        next.act = 0
        advanceAct(next, C)
      } else next.screen = { kind: 'final_choice' }
    } else {
      next.screen = { kind: 'map' }
    }
  })
}

// ---------------------------------------------------------------- events

export interface EventOptionView {
  option: EventOption
  index: number
  available: boolean
  reason?: Text
  /** Success chance in % when the option has a stat check. */
  chance?: number
}

/** Companions the Act 2 recruit event offers (≤ 2, deterministic per run + act). */
export function recruitCandidates(run: RunState, C: ContentRegistry): string[] {
  const pool = run.pools.companions.filter((id) => C.companions[id] && !roster(run).some((m) => m.id === id))
  return sample({ rng: hashSeed(`${run.seed}:recruit:${run.act}`) }, pool, 2)
}

function recruitOption(id: string, C: ContentRegistry): EventOption | null {
  const d = C.companions[id]
  if (!d) return null
  return {
    label: t(`${d.name.ko} 영입`, `Recruit ${d.name.en}`),
    hint: t(`${d.role.ko} · ${d.passiveText.ko}`, `${d.role.en} · ${d.passiveText.en}`),
    success: { text: d.bondLines[0] ?? d.alias, effects: [{ kind: 'companion', id }] },
  }
}

/** The recruit scene's decline when both slots are already filled: no "go alone" bonus, nobody joins. */
const KEEP_LINEUP: EventOption = {
  label: t('지금 인원으로 간다', 'Go with who you have'),
  hint: t('새 동료 없음', 'No one new'),
  success: {
    text: t('“자리가 없어.” 기다리던 사람들이 고개를 끄덕이고 어둠 속으로 흩어진다.', '“We’re full.” The ones who waited nod and scatter back into the dark.'),
    effects: [],
  },
}

function optionList(run: RunState, def: EventDef, C: ContentRegistry): EventOption[] {
  if (def.id !== RECRUIT_EVENT) return def.options
  const extra = recruitCandidates(run, C)
    .map((id) => recruitOption(id, C))
    .filter((o): o is EventOption => o !== null)
  // A full party is not "alone": the authored go-alone bonus only applies with a free slot.
  return [...(run.party.length >= MAX_PARTY ? [KEEP_LINEUP] : def.options), ...extra]
}

export function eventOptions(run: RunState, C: ContentRegistry): EventOptionView[] {
  if (run.screen.kind !== 'event') return []
  const def = C.events[run.screen.eventId]
  if (!def) return []
  return optionList(run, def, C).map((option, index) => {
    const cond = conditionMet(run, option.requires, C)
    const view: EventOptionView = { option, index, available: cond.ok }
    if (cond.reason) view.reason = cond.reason
    if (option.check) view.chance = checkChance(run, option.check.stat, option.check.dc)
    return view
  })
}

/** d100 roll: success when roll ≤ chance. */
function rollCheck(run: RunState, chance: number): { success: boolean; roll: number } {
  const roll = Math.floor(rand(runStream(run, 'event')) * 100) + 1
  return { success: roll <= chance, roll }
}

const NOTHING_HAPPENS: Outcome = { text: t('아무 일도 일어나지 않았다.', 'Nothing comes of it.'), effects: [] }

/** Apply the non-interactive part of an outcome now (interactive effects wait for continueEvent). */
export function applyImmediate(run: RunState, effects: readonly RunEffect[], C: ContentRegistry): void {
  for (const e of effects) {
    switch (e.kind) {
      case 'hp':
        run.hp = clamp(1, run.maxHp, run.hp + e.amount)
        break
      case 'maxHp': // raises/lowers the cap only; content pairs it with an `hp` effect to fill it
        run.maxHp = Math.max(1, run.maxHp + e.amount)
        run.hp = clamp(1, run.maxHp, run.hp)
        break
      case 'heal_party':
        healParty(run, e.amount)
        break
      case 'credits':
        run.credits = Math.max(0, run.credits + e.amount)
        break
      case 'trace':
        gainTrace(run, e.amount, C)
        break
      case 'card':
        addCard(run, e.cardId, C)
        break
      case 'upgrade_card':
        if (e.random) {
          const eligible = shuffle(
            runStream(run, 'event'),
            run.deck.filter((c) => !c.upgraded && canUpgrade(C.cards[c.defId])),
          )
          for (const c of eligible.slice(0, e.count)) c.upgraded = true
        }
        break
      case 'implant': {
        const id = e.implantId ?? rollImplant(runStream(run, 'event'), run, C, e.rarity ? { [e.rarity]: 1 } : IMPLANT_WEIGHTS)
        if (id) gainImplant(run, id, C)
        break
      }
      case 'consumable': {
        const id = e.id ?? rollConsumable(runStream(run, 'event'), C)
        if (id) gainConsumable(run, id, C)
        break
      }
      case 'companion':
        if (run.pools.companions.includes(e.id)) joinCompanion(run, e.id, C)
        break
      case 'bond':
        raiseBond(run, e.id, e.amount, C)
        break
      case 'stat':
        addStat(run.stats, e.stat, e.amount)
        break
      case 'flag':
        run.flags[e.key] = e.value ?? 1
        break
      case 'axis':
        addAxis(run, e.axis, e.amount ?? 1)
        break
      case 'codex':
        if (!run.codex.includes(e.id)) run.codex.push(e.id)
        break
      case 'junk':
        for (let i = 0; i < (e.count ?? 1); i++) addCard(run, e.cardId, C)
        break
      case 'echoes':
        run.echoes += e.amount
        break
      case 'card_choice':
      case 'remove_card':
      case 'combat':
        break // interactive: handled by continueEvent
    }
  }
}

/** Interactive follow-ups, in screen order. */
type Deferred =
  | { kind: 'cards'; count: number; weights: RarityWeights }
  | { kind: 'pick'; purpose: 'remove' | 'upgrade'; count: number }
  | { kind: 'combat'; encounterId: string }

function deferredOf(effects: readonly RunEffect[]): Deferred[] {
  const out: Deferred[] = []
  for (const e of effects) {
    if (e.kind === 'card_choice') {
      const r = e.rarity
      const weights = r === 'common' || r === 'uncommon' || r === 'rare' ? { [r]: 1 } : CARD_WEIGHTS.normal
      out.push({ kind: 'cards', count: e.count ?? 3, weights })
    } else if (e.kind === 'remove_card') out.push({ kind: 'pick', purpose: 'remove', count: e.count })
    else if (e.kind === 'upgrade_card' && !e.random) out.push({ kind: 'pick', purpose: 'upgrade', count: e.count })
    else if (e.kind === 'combat') out.push({ kind: 'combat', encounterId: e.encounterId })
  }
  return out
}

export function chooseEventOption(run: RunState, index: number, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'event' || run.screen.resolved) return run
  const view = eventOptions(run, C)[index]
  if (!view?.available) return run
  const eventId = run.screen.eventId
  const next = clone(run)
  const check = view.option.check
  const success = check ? rollCheck(next, checkChance(next, check.stat, check.dc)).success : true
  const outcome = success ? view.option.success : (view.option.failure ?? NOTHING_HAPPENS)
  applyImmediate(next, outcome.effects, C)
  if (check) offerThought(next, check.stat, success, C.thoughts ?? [])
  next.screen = { kind: 'event', eventId, resolved: { optionIndex: index, success, text: outcome.text }, improvised: null }
  log(next, 'event', view.option.label)
  return next
}

/** Clamp an AI-GM improvisation into the engine's whitelist. */
export function boundImprovisation(imp: Improvisation): Improvisation {
  const stats: StatKey[] = ['str', 'agi', 'int', 'cha', 'obs']
  const rewards: Improvisation['reward'][] = ['credits', 'heal', 'card', 'trace_down', 'implant']
  const risks: Improvisation['risk'][] = ['hp', 'trace', 'credits']
  const isText = (x: unknown): x is Text =>
    typeof x === 'object' && x !== null && typeof (x as Text).ko === 'string' && typeof (x as Text).en === 'string'
  const dc = clamp(3, 9, Math.round(Number.isFinite(imp.dc) ? imp.dc : 5))
  let reward = rewards.includes(imp.reward) ? imp.reward : 'credits'
  if (reward === 'implant' && dc < 7) reward = 'card'
  return {
    action: String(imp.action ?? '').slice(0, 200),
    stat: stats.includes(imp.stat) ? imp.stat : 'obs',
    dc,
    reward,
    risk: risks.includes(imp.risk) ? imp.risk : 'hp',
    successText: isText(imp.successText) ? imp.successText : t('통했다.', 'It works.'),
    failureText: isText(imp.failureText) ? imp.failureText : t('어긋났다.', 'It goes wrong.'),
  }
}

/** Resolve a free-text "Improvise" action inside hard bounds (design doc §7). */
export function applyImprovisation(run: RunState, imp: Improvisation, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'event' || run.screen.resolved) return run
  const eventId = run.screen.eventId
  if (C.events[eventId]?.improvise === false) return run
  const next = clone(run)
  const b = boundImprovisation(imp)
  const rolled = rollCheck(next, checkChance(next, b.stat, Math.max(3, b.dc - autonomyDc(next))))
  if (rolled.success) {
    switch (b.reward) {
      case 'credits':
        next.credits += 20 + b.dc * 5
        break
      case 'heal':
        healConnector(next, 6 + b.dc)
        break
      case 'trace_down':
        gainTrace(next, -(5 + 2 * b.dc), C)
        break
      case 'implant': {
        const id = rollImplant(runStream(next, 'event'), next, C, IMPLANT_WEIGHTS)
        if (id) gainImplant(next, id, C)
        else b.reward = 'card'
        break
      }
      case 'card':
        break // card_reward opens on continueEvent
    }
  } else if (b.risk === 'hp') next.hp = clamp(1, next.maxHp, next.hp - (b.dc + 1))
  else if (b.risk === 'trace') gainTrace(next, 2 * b.dc, C)
  else next.credits = Math.max(0, next.credits - 4 * b.dc)
  offerThought(next, b.stat, rolled.success, C.thoughts ?? [])

  next.screen = {
    kind: 'event',
    eventId,
    resolved: { optionIndex: -1, success: rolled.success, text: rolled.success ? b.successText : b.failureText },
    improvised: { ...b, rolled },
  }
  log(next, 'event', t(`즉흥: ${b.action}`, `Improvised: ${b.action}`))
  return next
}

function eventDeferred(screen: ScreenOf<'event'>, C: ContentRegistry): Deferred[] {
  const r = screen.resolved
  if (!r) return []
  const imp = screen.improvised
  if (r.optionIndex < 0) {
    if (!imp?.rolled?.success || imp.reward !== 'card') return []
    const weights: RarityWeights = imp.dc >= 8 ? { common: 40, uncommon: 40, rare: 20 } : { common: 60, uncommon: 40 }
    return [{ kind: 'cards', count: 3, weights }]
  }
  const opt = C.events[screen.eventId]?.options[r.optionIndex]
  if (!opt) return [] // recruit options have no follow-ups
  const outcome = r.success ? opt.success : opt.failure
  return outcome ? deferredOf(outcome.effects) : []
}

/** Cards eligible for a card_pick purpose. */
function eligibleCards(run: RunState, purpose: 'remove' | 'upgrade', C: ContentRegistry): CardInstance[] {
  return purpose === 'remove' ? run.deck : run.deck.filter((c) => !c.upgraded && canUpgrade(C.cards[c.defId]))
}

/** Show `screen`, skipping empty pickers and (re)starting a queued fight with the current deck. */
function showScreen(run: RunState, screen: RunScreen, C: ContentRegistry): void {
  let s = screen
  for (;;) {
    if (s.kind === 'card_reward' && s.choices.length === 0) s = s.returnTo
    else if (s.kind === 'card_pick' && (s.count <= 0 || eligibleCards(run, s.purpose, C).length === 0)) s = s.returnTo
    else break
  }
  run.screen = s.kind === 'combat' ? { kind: 'combat', combat: beginCombat(run, s.combat.encounterId, C), nodeKind: s.nodeKind } : s
}

/** Open `deferred` follow-ups in order (card rewards, pickers), then a fight if one is queued, then `tail`. */
function queueDeferred(next: RunState, deferred: Deferred[], tail: RunScreen, C: ContentRegistry): void {
  const fight = deferred.find((d): d is Extract<Deferred, { kind: 'combat' }> => d.kind === 'combat' && !!C.encounters[d.encounterId])
  let end: RunScreen = tail
  if (fight) {
    // Placeholder: showScreen restarts it with the deck as it is when the fight is reached.
    end = { kind: 'combat', combat: startCombat(next, fight.encounterId, C), nodeKind: 'combat' }
    log(next, 'combat', C.encounters[fight.encounterId]?.name ?? KIND_NOTE.combat)
  }
  const steps = deferred.filter((d) => d.kind !== 'combat')
  for (let i = steps.length - 1; i >= 0; i--) {
    const d = steps[i] as Deferred
    if (d.kind === 'cards') end = { kind: 'card_reward', choices: rollCards(runStream(next, 'event'), next, C, d.count, d.weights), returnTo: end }
    else if (d.kind === 'pick') end = { kind: 'card_pick', purpose: d.purpose, count: d.count, returnTo: end }
  }
  showScreen(next, end, C)
}

/** Interactive effects (card rewards, removal/upgrade pickers, a fight) opened in order before `tail`. */
export function openFollowUps(next: RunState, effects: readonly RunEffect[], tail: RunScreen, C: ContentRegistry): void {
  queueDeferred(next, deferredOf(effects), tail, C)
}

/** After an event outcome: open its card rewards / pickers in order, then a fight, then the map. */
export function continueEvent(run: RunState, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'event' || !run.screen.resolved) return run
  const deferred = eventDeferred(run.screen, C)
  const next = clone(run)
  queueDeferred(next, deferred, { kind: 'map' }, C)
  return next
}

// ---------------------------------------------------------------- shop

function priceBase(base: number, discount: number): number {
  return Math.max(1, Math.round(base * (1 - clamp(0, 0.9, discount))))
}

export function generateShop(run: RunState, C: ContentRegistry): ShopStock {
  const h = runStream(run, 'shop')
  const discount = runPassive(run, C, 'shopDiscount')
  const mult = 1 + ((mutatorMods(run).shopPct ?? 0) - 10 * repTier(run, 'market') + (run.paradox >= 7 ? 20 : 0)) / 100
  const price = (base: number, off: number): number => priceBase(base * mult, off)
  const jitter = (base: number): number => price(base * (1 + (randInt(h, -10, 10) / 100)), discount)
  const cards: ShopStock['cards'] = []
  const plan: PoolRarity[] = ['common', 'common', 'uncommon', 'uncommon', 'rare']
  const picked = new Set<string>()
  for (const r of plan) {
    const left = run.pools.cards.filter((id) => offerable(run, C, id) && !picked.has(id))
    const exact = left.filter((id) => C.cards[id]?.rarity === r)
    if (left.length === 0) break
    const id = pickWeighted(h, exact.length > 0 ? exact : left, (cid) => cardWeight(run, C, cid))
    picked.add(id)
    const rarity = C.cards[id]?.rarity
    cards.push({ cardId: id, price: jitter(CARD_PRICE[rarity === 'uncommon' || rarity === 'rare' ? rarity : 'common']), sold: false })
  }

  const implantIds: string[] = []
  for (let i = 0; i < 2; i++) {
    const id = rollImplant(h, run, C, IMPLANT_WEIGHTS, implantIds)
    if (id) implantIds.push(id)
  }
  const shopOnly = rollImplant(h, run, C, { shop: 1 }, implantIds) ?? rollImplant(h, run, C, IMPLANT_WEIGHTS, implantIds)
  if (shopOnly) implantIds.push(shopOnly)
  const implants = implantIds.map((id) => {
    const [lo, hi] = IMPLANT_PRICE[C.implants[id]?.rarity ?? 'common']
    return { implantId: id, price: price(randInt(h, lo, hi), discount), sold: false }
  })

  const consumables = sample(
    h,
    Object.values(C.consumables).filter((c) => c.rarity !== 'special' && c.rarity !== 'starter'),
    3,
  ).map((c) => ({ id: c.id, price: jitter(c.price > 0 ? c.price : randInt(h, 35, 70)), sold: false }))

  return {
    cards,
    implants,
    consumables,
    removePrice: price(SHOP_REMOVE_BASE + SHOP_REMOVE_STEP * (run.flags[SHOP_REMOVALS_FLAG] ?? 0), discount),
    removeUsed: false,
    healPrice: price(40, discount),
    scrubPrice: price(60, discount),
  }
}

export function shopBuyCard(run: RunState, index: number, C: ContentRegistry): RunState {
  return onScreen(run, 'shop', (next, s) => {
    const item = s.stock.cards[index]
    if (!item || item.sold || next.credits < item.price || !addCard(next, item.cardId, C)) return false
    next.credits -= item.price
    item.sold = true
  })
}

export function shopBuyImplant(run: RunState, index: number, C: ContentRegistry): RunState {
  return onScreen(run, 'shop', (next, s) => {
    const item = s.stock.implants[index]
    if (!item || item.sold || next.credits < item.price || !gainImplant(next, item.implantId, C)) return false
    next.credits -= item.price
    item.sold = true
  })
}

export function shopBuyConsumable(run: RunState, index: number, C: ContentRegistry): RunState {
  return onScreen(run, 'shop', (next, s) => {
    const item = s.stock.consumables[index]
    if (!item || item.sold || next.credits < item.price || !gainConsumable(next, item.id, C)) return false
    next.credits -= item.price
    item.sold = true
  })
}

/** Pay for the removal service, then pick the card (returns to the shop). */
export const shopRemove: SimpleReducer = (run) =>
  onScreen(run, 'shop', (next, s) => {
    if (s.stock.removeUsed || next.credits < s.stock.removePrice || next.deck.length === 0) return false
    next.credits -= s.stock.removePrice
    s.stock.removeUsed = true
    next.flags[SHOP_REMOVALS_FLAG] = (next.flags[SHOP_REMOVALS_FLAG] ?? 0) + 1
    next.screen = { kind: 'card_pick', purpose: 'remove', count: 1, returnTo: s }
  })

/** Patch up: heals 30 % max HP (party too). Price rises by ₵20 per use. */
export const shopHeal: SimpleReducer = (run) =>
  onScreen(run, 'shop', (next, s) => {
    const hurt = next.hp < next.maxHp || next.party.some((m) => m.hp < m.maxHp)
    if (!hurt || next.credits < s.stock.healPrice) return false
    next.credits -= s.stock.healPrice
    healPartyPct(next, SHOP_HEAL_PCT)
    s.stock.healPrice += SHOP_SERVICE_STEP
  })

/** Scrub −25 trace. Price rises by ₵20 per use. */
export const shopScrub: SimpleReducer = (run) =>
  onScreen(run, 'shop', (next, s) => {
    if (next.trace <= 0 || next.credits < s.stock.scrubPrice) return false
    next.credits -= s.stock.scrubPrice
    next.trace = clamp(0, MAX_TRACE, next.trace - SHOP_SCRUB)
    s.stock.scrubPrice += SHOP_SERVICE_STEP
  })

export const leaveShop: SimpleReducer = (run) =>
  onScreen(run, 'shop', (next) => {
    next.screen = { kind: 'map' }
  })

// ---------------------------------------------------------------- rest (safehouse)

/** Heal % at the safehouse: 30 (paradox 5: 20) + restHeal passives. */
export function restHealPercent(run: RunState, C: ContentRegistry): number {
  return (run.paradox >= 5 ? PARADOX_REST_HEAL : BASE_REST_HEAL) + asPercent(runPassive(run, C, 'restHeal')) + (mutatorMods(run).restHeal ?? 0) + 10 * repTier(run, 'offgrid')
}

export function restHeal(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'rest', (next, s) => {
    if (s.done) return false
    healPartyPct(next, restHealPercent(next, C))
    s.done = true
  })
}

export function restUpgrade(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'rest', (next, s) => {
    if (s.done || eligibleCards(next, 'upgrade', C).length === 0) return false
    next.screen = { kind: 'card_pick', purpose: 'upgrade', count: 1, returnTo: { kind: 'rest', done: true } }
  })
}

/** Safehouse workbench (Pack 2 salvage): each recipe once per rest, free (does not use the rest action). */
export const CRAFT_RECIPES = {
  patch: { cost: 2, name: t('응급 패치', 'Field Patch'), text: t('HP +8', '+8 HP') },
  assemble: { cost: 3, name: t('소모품 조립', 'Assemble'), text: t('무작위 소모품 1개', 'A random consumable') },
  refit: { cost: 6, name: t('임플란트 개조', 'Refit'), text: t('무작위 임플란트 1개', 'A random implant') },
} as const
export type CraftRecipe = keyof typeof CRAFT_RECIPES

export function canCraft(run: RunState, recipe: CraftRecipe): boolean {
  if (run.screen.kind !== 'rest' || run.screen.crafted?.includes(recipe)) return false
  if ((run.parts ?? 0) < CRAFT_RECIPES[recipe].cost) return false
  if (recipe === 'assemble' && run.consumables.length >= MAX_CONSUMABLES) return false
  if (recipe === 'patch' && run.hp >= run.maxHp) return false
  return true
}

export function restCraft(run: RunState, recipe: CraftRecipe, C: ContentRegistry): RunState {
  if (!canCraft(run, recipe)) return run
  return onScreen(run, 'rest', (next, s) => {
    const h = runStream(next, 'reward')
    if (recipe === 'patch') next.hp = Math.min(next.maxHp, next.hp + 8)
    else if (recipe === 'assemble') {
      const id = rollConsumable(h, C)
      if (!id || !gainConsumable(next, id, C)) return false
    } else {
      const id = rollImplant(h, next, C, { common: 3, uncommon: 2, rare: 1 })
      if (!id || !gainImplant(next, id, C)) return false
    }
    next.parts = (next.parts ?? 0) - CRAFT_RECIPES[recipe].cost
    s.crafted = [...(s.crafted ?? []), recipe]
  })
}

export const restScrub: SimpleReducer = (run) =>
  onScreen(run, 'rest', (next, s) => {
    if (s.done) return false
    next.trace = clamp(0, MAX_TRACE, next.trace - REST_SCRUB)
    s.done = true
  })

export function restBond(run: RunState, companionId: string, C: ContentRegistry): RunState {
  return onScreen(run, 'rest', (next, s) => {
    if (s.done || !raiseBond(next, companionId, 1, C)) return false
    s.done = true
  })
}

export const leaveRest: SimpleReducer = (run) =>
  onScreen(run, 'rest', (next) => {
    next.screen = { kind: 'map' }
  })

// ---------------------------------------------------------------- party (deployment)

/**
 * Choose who is deployed (on the map only): `ids` are recruited companions, at most MAX_PARTY, in slot order;
 * everyone else goes to the bench. HP and bond travel with each companion. Rejected (run unchanged) for an
 * unknown, duplicate or over-full list.
 */
export function setDeployment(run: RunState, ids: readonly string[]): RunState {
  const all = roster(run)
  if (ids.length > MAX_PARTY || new Set(ids).size !== ids.length || ids.some((id) => !all.some((m) => m.id === id))) return run
  return onScreen(run, 'map', (next) => {
    const crew = roster(next)
    const same = next.party.length === ids.length && next.party.every((m, i) => m.id === ids[i])
    if (same) return false
    next.party = ids.map((id) => crew.find((m) => m.id === id) as PartyMember)
    next.bench = crew.filter((m) => !ids.includes(m.id))
  })
}

// ---------------------------------------------------------------- growth

/** Spend one growth point (earned per elite won and per act cleared) on +1 to a stat. Map only. */
export function spendGrowth(run: RunState, stat: StatKey): RunState {
  if ((run.growth ?? 0) <= 0 || (run.stats[stat] ?? 0) >= STAT_MAX) return run
  return onScreen(run, 'map', (next) => {
    next.growth = (next.growth ?? 0) - 1
    addStat(next.stats, stat, 1)
    log(next, 'start', t(`성장: ${STAT_LABEL[stat]} +1`, `Growth: ${STAT_LABEL[stat]} +1`))
  })
}

// ---------------------------------------------------------------- treasure

export function openTreasure(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'treasure', (next, s) => {
    if (s.opened) return false
    if (s.implantId) gainImplant(next, s.implantId, C)
    next.credits += s.credits
    s.opened = true
  })
}

export const leaveTreasure: SimpleReducer = (run) =>
  onScreen(run, 'treasure', (next) => {
    next.screen = { kind: 'map' }
  })

// ---------------------------------------------------------------- card pick / card reward / belt

/** Cards the current card_pick screen accepts (empty on other screens). */
export function pickableCards(run: RunState, C: ContentRegistry): CardInstance[] {
  return run.screen.kind === 'card_pick' ? eligibleCards(run, run.screen.purpose, C) : []
}

export function pickCard(run: RunState, cardUid: string, C: ContentRegistry): RunState {
  return onScreen(run, 'card_pick', (next, s) => {
    const card = eligibleCards(next, s.purpose, C).find((c) => c.uid === cardUid)
    if (!card) return false
    if (s.purpose === 'remove') next.deck = next.deck.filter((c) => c.uid !== cardUid)
    else card.upgraded = true
    s.count -= 1
    showScreen(next, s, C)
  })
}

/** Take one of the offered cards, or skip with `null`. */
export function pickCardReward(run: RunState, cardId: string | null, C: ContentRegistry): RunState {
  return onScreen(run, 'card_reward', (next, s) => {
    if (cardId !== null && (!s.choices.includes(cardId) || !addCard(next, cardId, C))) return false
    showScreen(next, s.returnTo, C)
  })
}

/** Drop a consumable from the belt (not during combat — the fight owns the belt then). */
export const discardConsumable: (run: RunState, index: number, C?: ContentRegistry) => RunState = (run, index) => {
  if (run.screen.kind === 'combat' || run.screen.kind === 'ended' || !run.consumables[index]) return run
  const next = clone(run)
  next.consumables.splice(index, 1)
  return next
}

// ---------------------------------------------------------------- endings

export const AXIS_NAME: Record<ChoiceAxis, Text> = {
  humanity: t('인간성', 'Humanity'),
  dominance: t('지배', 'Dominance'),
  resilience: t('회복력', 'Resilience'),
  insight: t('통찰', 'Insight'),
}

// ---------------------------------------------------------------- First Record (Pack 3 true ending)

export const RECORD_PREFIX = 'record_'
/** Autonomy 5 ("rewrite"): the Erase card from the first act. */
const AUTONOMY_REWRITE_CARD = 'rewrite_erase'
export const RECORDS_NEEDED = 7
export const SECRET_ENCOUNTER = 'a6_secret_first_connector'
export const SECRET_MET_FLAG = 'first_connector_met'
export const SECRET_WON_FLAG = 'first_connector_won'
/** Insight needed for the secret fight (bosses and elites feed resilience, so "leading" would be out of reach). */
export const SECRET_INSIGHT = 5

export function recordCount(run: Pick<RunState, 'flags'>): number {
  return Object.keys(run.flags).filter((k) => k.startsWith(RECORD_PREFIX) && run.flags[k]).length
}

/** The First Connector waits after the last Deep Signal boss: all First Record shards and insight ≥ SECRET_INSIGHT. */
export function secretBossGate(run: RunState, C: ContentRegistry): boolean {
  if (run.mode !== 'deep' || !C.encounters[SECRET_ENCOUNTER] || run.flags[SECRET_MET_FLAG]) return false
  if (recordCount(run) < RECORDS_NEEDED) return false
  return (run.axes?.insight ?? 0) >= SECRET_INSIGHT
}

export interface EndingView {
  ending: EndingDef
  available: boolean
  reason?: Text
}

export function availableEndings(run: RunState, C: ContentRegistry): EndingView[] {
  const bondTotal = run.party.reduce((s, m) => s + m.bond, 0)
  // Deep Signal's Act 6 has its own endings; the standard ones stay with Act 3. The sacrifice is always there.
  const deepEnd = run.act > STANDARD_ACTS
  return Object.values(C.endings)
    .filter((e) => e.id !== FORCED_ERASURE)
    .filter((e) => e.id === NOBLE_SACRIFICE || ((e.requires?.minAct ?? 0) > STANDARD_ACTS) === deepEnd)
    .map((ending) => {
      const req = ending.requires
      if (ending.id === NOBLE_SACRIFICE || !req) return { ending, available: true }
      const cond = conditionMet(run, req, C)
      if (!cond.ok) return { ending, available: false, reason: cond.reason ?? t('조건 미충족', 'Condition not met') }
      if (req.minBondTotal !== undefined && bondTotal < req.minBondTotal)
        return { ending, available: false, reason: t(`유대 합계 ${req.minBondTotal} 필요`, `Needs total bond ${req.minBondTotal}`) }
      if (req.minCodex !== undefined && run.codex.length < req.minCodex)
        return { ending, available: false, reason: t(`코덱스 기록 ${req.minCodex}개 필요`, `Needs ${req.minCodex} codex entries`) }
      if (req.minAct !== undefined && run.act < req.minAct)
        return { ending, available: false, reason: t(`딥 시그널 ${req.minAct}막 이후`, `Deep Signal, Act ${req.minAct} or later`) }
      if (req.axis && (run.axes?.[req.axis.axis] ?? 0) < req.axis.min)
        return { ending, available: false, reason: t(`${AXIS_NAME[req.axis.axis].ko} ${req.axis.min} 이상`, `${AXIS_NAME[req.axis.axis].en} ${req.axis.min}+`) }
      return { ending, available: true }
    })
    .filter((v) => v.available || !v.ending.secret)
}

export function chooseEnding(run: RunState, endingId: string, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'final_choice') return run
  const view = availableEndings(run, C).find((v) => v.ending.id === endingId)
  if (!view?.available) return run
  const next = clone(run)
  endRun(next, 'victory', endingId, view.ending.title)
  return next
}

/** Give up the current run (banks as 'abandoned'). */
export function abandonRun(run: RunState): RunState {
  if (run.screen.kind === 'ended') return run
  const next = clone({ ...run, screen: { kind: 'map' } as RunScreen })
  next.flags[ABANDONED_FLAG] = 1
  endRun(next, 'defeat', FORCED_ERASURE, t('접속 포기', 'Disconnected'))
  return next
}
