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
// double-clicking. All randomness uses the run's own RNG (`run.rng`). A run never
// reads the profile after `newRun`: unlock-filtered pools are frozen into `run.pools`.
//
// Echo accounting: a node is "cleared" (+1 ◈) when the player moves on from it
// (entering the next node, or leaving the boss reward). Elites +4, bosses +12 on win.
// Victory/ending bonuses are added only when banking (see meta.computeEchoes).

import { startCombat } from './combat.ts'
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
  threadPassive,
  unlockedCompanions,
} from './meta.ts'
import { hashSeed, pick, pickWeighted, rand, randInt, sample, shuffle } from './rng.ts'
import type {
  CardDef,
  CardInstance,
  CombatState,
  Condition,
  ContentRegistry,
  EndingDef,
  EventDef,
  EventOption,
  ImplantDef,
  ImplantPassive,
  Improvisation,
  MapNode,
  MetaProfile,
  NodeKind,
  Outcome,
  RewardState,
  RunEffect,
  RunLogEntry,
  RunScreen,
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

function log(run: RunState, kind: RunLogEntry['kind'], note: Text): void {
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
  for (const m of run.party) m.hp = clamp(1, m.maxHp, m.hp + Math.max(0, amount))
}

function healPartyPct(run: RunState, pct: number): void {
  run.hp = clamp(1, run.maxHp, run.hp + Math.round((run.maxHp * pct) / 100))
  for (const m of run.party) m.hp = clamp(1, m.maxHp, m.hp + Math.round((m.maxHp * pct) / 100))
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
  return inst
}

export function canUpgrade(def: CardDef | undefined): boolean {
  return !!def && Object.keys(def.upgrade ?? {}).length > 0
}

function gainImplant(run: RunState, id: string, C: ContentRegistry): boolean {
  const def = C.implants[id]
  if (!def || run.implants.includes(id)) return false
  run.implants.push(id)
  applyConcretePassive(run, def.passive)
  return true
}

function gainConsumable(run: RunState, id: string, C: ContentRegistry): boolean {
  if (!C.consumables[id] || run.consumables.length >= MAX_CONSUMABLES) return false
  run.consumables.push(id)
  return true
}

function joinCompanion(run: RunState, id: string, C: ContentRegistry): boolean {
  const def = C.companions[id]
  if (!def || run.party.length >= MAX_PARTY || run.party.some((m) => m.id === id)) return false
  run.party.push({ id, hp: def.maxHp, maxHp: def.maxHp, bond: 0 })
  for (const card of def.cards) addCard(run, card, C)
  applyConcretePassive(run, def.passive)
  return true
}

/** Raise a companion's bond; level 2 adds their bond card, level 3 upgrades their signature card. */
function raiseBond(run: RunState, id: string, amount: number, C: ContentRegistry): boolean {
  const m = run.party.find((p) => p.id === id)
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

function rollCards(run: RunState, C: ContentRegistry, count: number, weights: RarityWeights): string[] {
  const pool = run.pools.cards.filter((id) => offerable(run, C, id))
  const out: string[] = []
  const rarities: PoolRarity[] = ['common', 'uncommon', 'rare']
  for (let i = 0; i < count; i++) {
    const left = pool.filter((id) => !out.includes(id))
    if (left.length === 0) break
    const rarity = pickWeighted(run, rarities, (r) => weights[r] ?? 0)
    const exact = left.filter((id) => C.cards[id]?.rarity === rarity)
    // Fallback prefers the rarest tier still available so boss rewards stay strong.
    const fallback = ['rare', 'uncommon', 'common']
      .map((r) => left.filter((id) => C.cards[id]?.rarity === r))
      .find((l) => l.length > 0)
    out.push(pickWeighted(run, exact.length > 0 ? exact : (fallback ?? left), (id) => cardWeight(run, C, id)))
  }
  return out
}

function rollImplant(
  run: RunState,
  C: ContentRegistry,
  weights: Partial<Record<ImplantRarity, number>>,
  exclude: readonly string[] = [],
): string | null {
  const pool = run.pools.implants.filter((id) => C.implants[id] && !run.implants.includes(id) && !exclude.includes(id))
  const of = (r: ImplantRarity): string[] => pool.filter((id) => C.implants[id]?.rarity === r)
  const tiers = (Object.keys(weights) as ImplantRarity[]).filter((r) => (weights[r] ?? 0) > 0 && of(r).length > 0)
  if (tiers.length > 0) return pick(run, of(pickWeighted(run, tiers, (r) => weights[r] ?? 0)))
  const regular = pool.filter((id) => {
    const r = C.implants[id]?.rarity
    return r === 'common' || r === 'uncommon' || r === 'rare'
  })
  return regular.length > 0 ? pick(run, regular) : null
}

const CONSUMABLE_WEIGHT: Partial<Record<string, number>> = { common: 3, uncommon: 2, rare: 1 }

function rollConsumable(run: RunState, C: ContentRegistry): string | null {
  const list = Object.values(C.consumables).filter((c) => c.rarity !== 'special' && c.rarity !== 'starter')
  if (list.length === 0) return null
  return pickWeighted(run, list, (c) => CONSUMABLE_WEIGHT[c.rarity] ?? 1).id
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
  if (cond.noCompanion && run.party.some((m) => m.id === cond.noCompanion)) {
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
}

function findStaticCard(C: ContentRegistry): string | undefined {
  if (C.cards[STATIC_CARD]) return STATIC_CARD
  return Object.values(C.cards).find((c) => c.type === 'junk' && c.id.includes('static'))?.id
}

export function newRun(profile: MetaProfile, opts: NewRunOptions, C: ContentRegistry): RunState {
  const arch = C.archetypes[opts.archetype]
  if (!arch) throw new Error(`newRun: unknown archetype "${opts.archetype}"`)
  const loop = profile.loops + 1
  const paradox = clamp(0, 5, Math.floor(opts.paradox))
  const seed = (opts.seed ?? hashSeed(`${profile.playerName}|${loop}|${profile.totalEchoes}|${arch.id}|${paradox}`)) >>> 0
  const run: RunState = {
    version: 2,
    id: `run-${loop}-${seed.toString(36)}`,
    seed,
    rng: seed,
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
      cards: cardPool(profile, arch.id, C),
      implants: implantPool(profile, C),
      companions: unlockedCompanions(profile, C),
    },
    flags: {},
    codex: [],
    seenEvents: [],
    screen: { kind: 'act_intro' },
    log: [],
    echoes: 0,
    uidCounter: 0,
    tally: { kills: 0, elites: 0, bosses: 0, environmentKills: 0, damageTaken: 0, cardsPlayed: 0, floors: 0 },
    startedAt: opts.now ?? nowIso(),
  }
  for (const id of arch.startingDeck) addCard(run, id, C)

  // Archive threads: concrete perks now, run-level multipliers frozen as flags.
  const thread = threadPassive(profile, C)
  applyConcretePassive(run, thread)
  run.hp = run.maxHp
  run.credits += thread.startCredits ?? 0
  if (thread.startConsumable) gainConsumable(run, thread.startConsumable, C)
  for (const k of PASSIVE_NUMBERS) {
    const v = thread[k]
    if (k !== 'maxHp' && typeof v === 'number' && v !== 0) run.flags[threadFlag(k)] = v
  }

  gainImplant(run, arch.startingImplant, C)
  const companion = loop === 1 ? FIRST_COMPANION : opts.companion
  if (companion && (loop === 1 || run.pools.companions.includes(companion))) joinCompanion(run, companion, C)
  if (paradox >= 2) {
    const junk = findStaticCard(C)
    if (junk) addCard(run, junk, C)
  }

  run.map = generateActMap(1, run, C, { paradox })
  log(run, 'start', t(`루프 ${loop} 시작`, `Loop ${loop} begins`))
  if (thread.startRemove && run.deck.length > 0) {
    run.screen = { kind: 'card_pick', purpose: 'remove', count: 1, returnTo: { kind: 'act_intro' } }
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
  return pick(run, any).id
}

function beginCombat(run: RunState, encounterId: string, C: ContentRegistry): CombatState {
  rand(run) // advance so every fight gets a fresh slice of the run's random stream
  return startCombat(run, encounterId, C)
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
  return options ? pickWeighted(run, options, (e) => e.weight ?? 1).id : null
}

const KIND_NOTE: Record<NodeKind, Text> = {
  combat: t('교전', 'Fight'),
  elite: t('정예 교전', 'Elite fight'),
  boss: t('보스', 'Boss'),
  event: t('사건', 'Event'),
  shop: t('암시장', 'Shop'),
  rest: t('은신처', 'Safehouse'),
  treasure: t('보급품', 'Cache'),
}

export function enterNode(run: RunState, nodeId: string, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'map' || !reachableNodes(run).includes(nodeId)) return run
  const node = run.map.nodes[nodeId]
  if (!node) return run
  const next = clone(run)
  clearCurrentNode(next)
  next.nodeId = nodeId
  next.visited.push(nodeId)
  next.tally.floors += 1
  gainTrace(next, next.paradox >= 3 ? NODE_TRACE_PARADOX : NODE_TRACE, C)

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
    case 'event': {
      const eventId = resolveEventId(next, node, C)
      if (eventId === null) {
        // No playable event left: the street throws a fight at you instead.
        const enc = fallbackEncounter(next, 'normal', C)
        log(next, 'combat', C.encounters[enc]?.name ?? KIND_NOTE.combat)
        next.screen = { kind: 'combat', combat: beginCombat(next, enc, C), nodeKind: 'combat' }
        break
      }
      next.seenEvents.push(eventId)
      log(next, 'event', C.events[eventId]?.title ?? KIND_NOTE.event)
      next.screen = { kind: 'event', eventId, resolved: null, improvised: null }
      break
    }
    case 'shop':
      log(next, 'shop', KIND_NOTE.shop)
      next.screen = { kind: 'shop', stock: generateShop(next, C) }
      break
    case 'rest':
      log(next, 'rest', KIND_NOTE.rest)
      next.screen = { kind: 'rest', done: false }
      break
    case 'treasure': {
      const implantId = rollImplant(next, C, { common: 60, uncommon: 40 }) ?? ''
      log(next, 'treasure', KIND_NOTE.treasure)
      next.screen = { kind: 'treasure', implantId, credits: randInt(next, 25, 45), opened: false }
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
  const base = tier === 'boss' ? 60 : tier === 'elite' ? randInt(run, 30, 40) : randInt(run, 12, 20)
  let credits = Math.round(base * Math.max(0, 1 + runPassive(run, C, 'creditMult'))) + Math.max(0, combat.credits)
  const choiceCount = 3 + Math.max(0, Math.round(runPassive(run, C, 'rewardChoices')))
  const cardChoices: string[][] = []
  const first = rollCards(run, C, choiceCount, CARD_WEIGHTS[tier])
  if (first.length > 0) cardChoices.push(first)

  let implantChoices: string[] = []
  if (tier === 'elite') {
    const id = rollImplant(run, C, IMPLANT_WEIGHTS)
    if (id) implantChoices = [id]
  } else if (tier === 'boss') {
    for (let i = 0; i < 3; i++) {
      const id =
        rollImplant(run, C, { boss: 1 }, implantChoices) ?? rollImplant(run, C, { rare: 1 }, implantChoices)
      if (id) implantChoices.push(id)
    }
  }

  const consumableChance = tier === 'normal' ? 0.25 : tier === 'elite' ? 0.5 : 0
  const consumable = consumableChance > 0 && rand(run) < consumableChance ? rollConsumable(run, C) : null

  if (bonusAchieved(combat)) {
    const extra = rollCards(run, C, choiceCount, tier === 'boss' ? CARD_WEIGHTS.boss : CARD_WEIGHTS.bonus)
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
  const name = C.encounters[combat.encounterId]?.name ?? KIND_NOTE[nodeKind]

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
  gainTrace(next, combat.trace, C)
  if (nodeKind === 'elite') {
    next.tally.elites += 1
    next.echoes += ELITE_ECHOES
  } else if (nodeKind === 'boss') {
    next.tally.bosses += 1
    next.echoes += BOSS_ECHOES
    // Surviving a boss together deepens every bond (companions still standing at the end).
    for (const m of next.party) {
      if (combat.units.some((u) => u.uid === m.id && u.side === 'party' && u.hp > 0)) raiseBond(next, m.id, 1, C)
    }
    // After the final boss nothing is left to spend loot on: straight to the ending choice.
    if (next.act >= 3) {
      clearCurrentNode(next)
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

function advanceAct(run: RunState, C: ContentRegistry): void {
  run.act = (run.act + 1) as 2 | 3
  run.map = generateActMap(run.act, run, C, { paradox: run.paradox, exclude: run.seenEvents })
  run.nodeId = null
  run.hp = clamp(1, run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) / 2))
  for (const m of run.party) m.hp = clamp(1, m.maxHp, m.hp + Math.ceil((m.maxHp - m.hp) / 2))
  log(run, 'start', C.acts[run.act]?.name ?? t(`${run.act}막`, `Act ${run.act}`))
  run.screen = { kind: 'act_intro' }
}

/** Leave the reward (untaken credits are pocketed). After a boss: next act or the final choice. */
export function leaveReward(run: RunState, C: ContentRegistry): RunState {
  return onScreen(run, 'reward', (next, s) => {
    if (!s.reward.taken.credits) next.credits += s.reward.credits
    if (next.nodeId !== null && next.nodeId === next.map.bossId) {
      clearCurrentNode(next)
      if (next.act < 3) advanceAct(next, C)
      else next.screen = { kind: 'final_choice' }
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
  if (run.party.length >= MAX_PARTY) return []
  const pool = run.pools.companions.filter((id) => C.companions[id] && !run.party.some((m) => m.id === id))
  return sample({ rng: hashSeed(`${run.seed}:recruit:${run.act}`) }, pool, 2)
}

function recruitOption(id: string, C: ContentRegistry): EventOption | null {
  const d = C.companions[id]
  if (!d) return null
  return {
    label: t(`${d.name.ko} 영입`, `Recruit ${d.name.en}`),
    hint: t(`${d.role.ko} · ${d.passiveText.ko}`, `${d.role.en} · ${d.passiveText.en}`),
    requires: { partySizeAtMost: MAX_PARTY - 1 },
    success: { text: d.bondLines[0] ?? d.alias, effects: [{ kind: 'companion', id }] },
  }
}

function optionList(run: RunState, def: EventDef, C: ContentRegistry): EventOption[] {
  if (def.id !== RECRUIT_EVENT) return def.options
  const extra = recruitCandidates(run, C)
    .map((id) => recruitOption(id, C))
    .filter((o): o is EventOption => o !== null)
  return [...def.options, ...extra]
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
  const roll = Math.floor(rand(run) * 100) + 1
  return { success: roll <= chance, roll }
}

const NOTHING_HAPPENS: Outcome = { text: t('아무 일도 일어나지 않았다.', 'Nothing comes of it.'), effects: [] }

/** Apply the non-interactive part of an outcome now (interactive effects wait for continueEvent). */
function applyImmediate(run: RunState, effects: readonly RunEffect[], C: ContentRegistry): void {
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
            run,
            run.deck.filter((c) => !c.upgraded && canUpgrade(C.cards[c.defId])),
          )
          for (const c of eligible.slice(0, e.count)) c.upgraded = true
        }
        break
      case 'implant': {
        const id = e.implantId ?? rollImplant(run, C, e.rarity ? { [e.rarity]: 1 } : IMPLANT_WEIGHTS)
        if (id) gainImplant(run, id, C)
        break
      }
      case 'consumable': {
        const id = e.id ?? rollConsumable(run, C)
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
  const rolled = rollCheck(next, checkChance(next, b.stat, b.dc))
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
        const id = rollImplant(next, C, IMPLANT_WEIGHTS)
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

/** After an event outcome: open its card rewards / pickers in order, then a fight, then the map. */
export function continueEvent(run: RunState, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'event' || !run.screen.resolved) return run
  const deferred = eventDeferred(run.screen, C)
  const next = clone(run)
  const fight = deferred.find((d): d is Extract<Deferred, { kind: 'combat' }> => d.kind === 'combat' && !!C.encounters[d.encounterId])
  let tail: RunScreen = { kind: 'map' }
  if (fight) {
    // Placeholder: showScreen restarts it with the deck as it is when the fight is reached.
    tail = { kind: 'combat', combat: startCombat(next, fight.encounterId, C), nodeKind: 'combat' }
    log(next, 'combat', C.encounters[fight.encounterId]?.name ?? KIND_NOTE.combat)
  }
  const steps = deferred.filter((d) => d.kind !== 'combat')
  for (let i = steps.length - 1; i >= 0; i--) {
    const d = steps[i] as Deferred
    if (d.kind === 'cards') tail = { kind: 'card_reward', choices: rollCards(next, C, d.count, d.weights), returnTo: tail }
    else if (d.kind === 'pick') tail = { kind: 'card_pick', purpose: d.purpose, count: d.count, returnTo: tail }
  }
  showScreen(next, tail, C)
  return next
}

// ---------------------------------------------------------------- shop

function price(base: number, discount: number): number {
  return Math.max(1, Math.round(base * (1 - clamp(0, 0.9, discount))))
}

export function generateShop(run: RunState, C: ContentRegistry): ShopStock {
  const discount = runPassive(run, C, 'shopDiscount')
  const jitter = (base: number): number => price(base * (1 + (randInt(run, -10, 10) / 100)), discount)
  const cards: ShopStock['cards'] = []
  const plan: PoolRarity[] = ['common', 'common', 'uncommon', 'uncommon', 'rare']
  const picked = new Set<string>()
  for (const r of plan) {
    const left = run.pools.cards.filter((id) => offerable(run, C, id) && !picked.has(id))
    const exact = left.filter((id) => C.cards[id]?.rarity === r)
    if (left.length === 0) break
    const id = pickWeighted(run, exact.length > 0 ? exact : left, (cid) => cardWeight(run, C, cid))
    picked.add(id)
    const rarity = C.cards[id]?.rarity
    cards.push({ cardId: id, price: jitter(CARD_PRICE[rarity === 'uncommon' || rarity === 'rare' ? rarity : 'common']), sold: false })
  }

  const implantIds: string[] = []
  for (let i = 0; i < 2; i++) {
    const id = rollImplant(run, C, IMPLANT_WEIGHTS, implantIds)
    if (id) implantIds.push(id)
  }
  const shopOnly = rollImplant(run, C, { shop: 1 }, implantIds) ?? rollImplant(run, C, IMPLANT_WEIGHTS, implantIds)
  if (shopOnly) implantIds.push(shopOnly)
  const implants = implantIds.map((id) => {
    const [lo, hi] = IMPLANT_PRICE[C.implants[id]?.rarity ?? 'common']
    return { implantId: id, price: price(randInt(run, lo, hi), discount), sold: false }
  })

  const consumables = sample(
    run,
    Object.values(C.consumables).filter((c) => c.rarity !== 'special' && c.rarity !== 'starter'),
    3,
  ).map((c) => ({ id: c.id, price: jitter(c.price > 0 ? c.price : randInt(run, 35, 70)), sold: false }))

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
  return (run.paradox >= 5 ? PARADOX_REST_HEAL : BASE_REST_HEAL) + asPercent(runPassive(run, C, 'restHeal'))
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

export interface EndingView {
  ending: EndingDef
  available: boolean
  reason?: Text
}

export function availableEndings(run: RunState, C: ContentRegistry): EndingView[] {
  const bondTotal = run.party.reduce((s, m) => s + m.bond, 0)
  return Object.values(C.endings)
    .filter((e) => e.id !== FORCED_ERASURE)
    .map((ending) => {
      const req = ending.requires
      if (ending.id === NOBLE_SACRIFICE || !req) return { ending, available: true }
      const cond = conditionMet(run, req, C)
      if (!cond.ok) return { ending, available: false, reason: cond.reason ?? t('조건 미충족', 'Condition not met') }
      if (req.minBondTotal !== undefined && bondTotal < req.minBondTotal)
        return { ending, available: false, reason: t(`유대 합계 ${req.minBondTotal} 필요`, `Needs total bond ${req.minBondTotal}`) }
      if (req.minCodex !== undefined && run.codex.length < req.minCodex)
        return { ending, available: false, reason: t(`코덱스 기록 ${req.minCodex}개 필요`, `Needs ${req.minCodex} codex entries`) }
      return { ending, available: true }
    })
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
