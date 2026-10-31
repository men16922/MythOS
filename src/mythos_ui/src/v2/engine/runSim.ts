// Mythos 2.0 — headless full-run simulator (design doc §9 balance harness).
//
// Plays an entire run with simple, deterministic heuristics so content balance can be
// measured in bulk: map (rest when hurt, elites when healthy, treasure/shop when
// useful), events (best expected value), shop (removals, implants, good cards),
// rest (heal under 60 % else upgrade), rewards (rarity-first, skipping weak cards once
// the deck is big). Combat is delegated to combatSim.autoPlay with the given policy,
// so 'greedy' vs 'basic' isolates combat skill — out-of-combat play is identical.

import { autoPlay } from './combatSim.ts'
import { acceptThought, declineThought } from './thoughts.ts'
import { acceptRoll, campScene, chooseDialogue, closeDialogue, dialogueOptions, districtPois, leaveDistrict, rerollDialogue, startCamp, visitPoi } from './crpg.ts'
import { computeEchoes, newProfile, runKilledBy, unlockedCompanions } from './meta.ts'
import {
  setDeployment,
  applyImprovisation,
  availableEndings,
  chooseEnding,
  chooseEventOption,
  continueEvent,
  enterNode,
  eventOptions,
  grantImplant,
  spendGrowth,
  leaveReward,
  leaveRest,
  leaveShop,
  leaveTreasure,
  newRun,
  openTreasure,
  pickCard,
  pickCardReward,
  pickableCards,
  reachableNodes,
  restBond,
  restHeal,
  restScrub,
  restUpgrade,
  shopBuyCard,
  shopBuyConsumable,
  shopBuyImplant,
  shopHeal,
  shopRemove,
  startAct,
  takeRewardCard,
  takeRewardConsumable,
  takeRewardCredits,
  takeNoiseImplant,
  takeRewardImplant,
  updateCombat,
  MAX_CONSUMABLES, canCraft, restCraft
} from './run.ts'
import type { CardInstance, ChoiceAxis, ContentRegistry, DialogueOutcome, MapNode, MetaProfile, Outcome, RunEffect, RunScreen, RunState, RunMode } from './types.ts'

export type SimPolicy = 'greedy' | 'basic' | 'mixed'

export interface RunSimResult {
  won: boolean
  act: number
  floors: number
  /** Encounter id that ended the run. */
  killedBy?: string
  hp: number
  /** Balance telemetry at the end of the run. */
  trace: number
  deckSize: number
  implants: number
  credits: number
  echoes: number
  /** Ending reached (victory or the defeat ending) and the choice axes at the end. */
  endingId: string
  axes: Partial<Record<ChoiceAxis, number>>
  /** The run's tally at the end (kills, terrain kills, damage taken, ...). */
  tally: RunState['tally']
  /** Fight-level feat flags (engine/achievements.ts FEAT_*). */
  feats: Record<string, number>
  /** Distinct duo ultimates fired this run. */
  duos: number
  /** Evolved card ids this run (reachability reports). */
  evolved: string[]
  /** Every recruited companion at the end, deployed first. */
  crew: string[]
  /** Outside the List: 0 = not entered, else 1 + citizens kept alive. */
  outside: number
}

/** Per-fight balance telemetry (see RunSimOptions.onFight). */
export interface FightTelemetry {
  encounterId: string
  nodeKind: string
  act: number
  won: boolean
  turns: number
  hpBefore: number
  hpAfter: number
  maxHp: number
  deckSize: number
}

export interface RunSimOptions {
  /** Called after every fight — used by balance reports. */
  onFight?: (f: FightTelemetry) => void
  paradox?: number
  profile?: MetaProfile
  /** Combat turn cap per fight; a fight still running after it counts as lost. */
  maxTurns?: number
  /** Play that date's daily-seed run instead (the `seed` argument is then ignored). */
  daily?: string
  /** Starting companion for a non-daily run after loop 1 (default: first unlocked companion, matching SetupScreen; pass null to go solo). */
  companion?: string | null
  /** Deep Signal run (acts 4+): the sim profile counts as having won once, which opens the mode. */
  mode?: RunMode
  /** Anomaly mixer mix (2–3 mutator ids); like `mode`, the sim profile then counts as having won once. */
  mutators?: string[]
  /** Implants to hold from the start (balance experiments, e.g. a full set). */
  startImplants?: string[]
  /** Play with the Signal+ CRPG layer (districts, dialogue, camp) and this background. */
  crpg?: { background: string | null }
}

const SIM_EPOCH = '2026-01-01T00:00:00.000Z'
const MAX_STEPS = 5000
const RARITY_SCORE: Record<string, number> = { rare: 3, uncommon: 2, common: 1, starter: 0.2, special: 1 }
const IMPLANT_SCORE: Record<string, number> = { boss: 5, rare: 4, shop: 3.5, uncommon: 3, common: 2, starter: 0 }

// ---------------------------------------------------------------- scoring helpers

const hpPct = (run: RunState): number => run.hp / Math.max(1, run.maxHp)

function cardScore(id: string, C: ContentRegistry): number {
  const def = C.cards[id]
  if (!def) return -10
  if (def.type === 'junk') return -10
  return (RARITY_SCORE[def.rarity] ?? 1) + (def.cost === 0 ? 0.3 : 0) + (def.type === 'power' ? 0.2 : 0)
}

/** Best card worth taking from a choice, or null to keep the deck lean. */
function chooseCard(run: RunState, choices: readonly string[], C: ContentRegistry): string | null {
  const best = [...choices].sort((a, b) => cardScore(b, C) - cardScore(a, C))[0]
  if (!best) return null
  const score = cardScore(best, C)
  const size = run.deck.length
  if (score <= 0 || (size >= 22 && score < 2) || (size >= 28 && score < 3)) return null
  return best
}

function removalTarget(cards: readonly CardInstance[], C: ContentRegistry): CardInstance | undefined {
  const value = (c: CardInstance): number => {
    const def = C.cards[c.defId]
    if (!def || def.type === 'junk') return -100
    return (RARITY_SCORE[def.rarity] ?? 1) * 10 + (c.upgraded ? 5 : 0) + (def.type === 'attack' ? 1 : 0)
  }
  return [...cards].sort((a, b) => value(a) - value(b))[0]
}

function upgradeTarget(cards: readonly CardInstance[], C: ContentRegistry): CardInstance | undefined {
  const value = (c: CardInstance): number => {
    const def = C.cards[c.defId]
    return (RARITY_SCORE[def?.rarity ?? 'common'] ?? 1) * 10 + (def?.type === 'attack' ? 2 : 0) + (def?.type === 'power' ? 3 : 0)
  }
  return [...cards].sort((a, b) => value(b) - value(a))[0]
}

function effectValue(run: RunState, e: RunEffect, C: ContentRegistry): number {
  const hurt = hpPct(run) < 0.5
  switch (e.kind) {
    case 'hp':
      return e.amount * (hurt ? 1 : 0.5)
    case 'maxHp':
      return e.amount * 1.5
    case 'heal_party':
      return e.amount * (hurt ? 0.8 : 0.3)
    case 'credits':
      return Math.max(e.amount, -run.credits) / 8
    case 'trace':
      return -e.amount * 0.25
    case 'noise':
      return run.noiseMutator ? -20 : 6
    case 'card':
      return cardScore(e.cardId, C) > 0 ? 3 : -4
    case 'card_choice':
      return e.rarity === 'rare' ? 5 : 3
    case 'remove_card':
      return 4 * e.count
    case 'upgrade_card':
      return 2.5 * e.count
    case 'implant':
      return 8
    case 'consumable':
      return run.consumables.length < MAX_CONSUMABLES ? 2 : 0
    case 'companion':
      return 10
    case 'bond':
      return 2 * e.amount
    case 'stat':
      return 0.5 * e.amount
    case 'flag':
      return 0.2
    case 'axis':
      return 0.3
    case 'codex':
      return 1
    case 'junk':
      return -4 * (e.count ?? 1)
    case 'combat':
      return hpPct(run) > 0.6 ? 2 : -6
    case 'echoes':
      return 0.3 * e.amount
  }
}

export const outcomeValue = (run: RunState, o: Outcome | undefined, C: ContentRegistry): number =>
  (o?.effects ?? []).reduce((s, e) => s + effectValue(run, e, C), 0)

function nodeScore(run: RunState, node: MapNode | undefined): number {
  if (!node) return -99
  const hp = hpPct(run)
  switch (node.kind) {
    case 'rest':
      return hp < 0.5 ? 10 : 2
    case 'shop':
      return run.credits >= 120 ? 7 : run.credits >= 75 ? 4 : 1
    case 'treasure':
      return 8
    case 'elite':
      return hp >= 0.75 ? 6 : hp >= 0.55 ? 2 : -5
    case 'event':
    case 'district':
      return hp < 0.4 ? 6 : 4
    case 'combat':
      return hp >= 0.5 ? 5 : 3
    case 'boss':
      return 0
  }
}

// ---------------------------------------------------------------- per-screen decisions

type ScreenOf<K extends RunScreen['kind']> = Extract<RunScreen, { kind: K }>

/** First action in `tries` that the engine accepts (a no-op returns the same object). */
function firstAccepted(run: RunState, tries: ((r: RunState) => RunState)[]): RunState {
  for (const attempt of tries) {
    const next = attempt(run)
    if (next !== run) return next
  }
  return run
}

function decideMap(run: RunState, C: ContentRegistry): RunState {
  if (run.thoughts?.offer) {
    const carried = acceptThought(run)
    return carried !== run ? carried : declineThought(run)
  }
  if ((run.growth ?? 0) > 0) {
    // Specialise: the highest stat that can still grow.
    const stat = (['str', 'agi', 'int', 'cha', 'obs'] as const).filter((k) => (run.stats[k] ?? 0) < 10).sort((a, b) => (run.stats[b] ?? 0) - (run.stats[a] ?? 0))[0]
    const grown = stat ? spendGrowth(run, stat) : run
    if (grown !== run) return grown
  }
  // Deploy a duo when the crew holds one, as a player hunting it would.
  const crew = [...run.party, ...(run.bench ?? [])].map((m) => m.id)
  const duo = Object.values(C.duos ?? {}).find((d) => d.pair.every((id) => crew.includes(id)))
  if (duo && !duo.pair.every((id) => run.party.some((m) => m.id === id))) {
    const deployed = setDeployment(run, duo.pair)
    if (deployed !== run) return deployed
  }
  const options = reachableNodes(run)
  const look = (id: string): number => {
    const node = run.map.nodes[id]
    const ahead = Math.max(0, ...(node?.next ?? []).map((n) => nodeScore(run, run.map.nodes[n])))
    return nodeScore(run, node) + 0.5 * ahead
  }
  const best = [...options].sort((a, b) => look(b) - look(a))[0]
  return best ? enterNode(run, best, C) : run
}

function decideEvent(run: RunState, s: ScreenOf<'event'>, C: ContentRegistry): RunState {
  if (s.resolved) return continueEvent(run, C)
  const scored = eventOptions(run, C)
    .filter((v) => v.available)
    .map((v) => {
      const p = (v.chance ?? 100) / 100
      return { v, ev: p * outcomeValue(run, v.option.success, C) + (1 - p) * outcomeValue(run, v.option.failure, C) }
    })
    .sort((a, b) => b.ev - a.ev)
  const best = scored[0]
  if (best) return chooseEventOption(run, best.v.index, C)
  // Every option gated: talk your way out (safe, low-stakes improvisation).
  const t = { ko: '…', en: '…' }
  return applyImprovisation(run, { action: 'slip away', stat: 'agi', dc: 3, reward: 'heal', risk: 'trace', successText: t, failureText: t }, C)
}

function decideShop(run: RunState, s: ScreenOf<'shop'>, C: ContentRegistry): RunState {
  const stock = s.stock
  const hasJunk = run.deck.some((c) => C.cards[c.defId]?.type === 'junk')
  const tries: ((r: RunState) => RunState)[] = []
  if (hasJunk) tries.push((r) => shopRemove(r, C))
  if (hpPct(run) < 0.45) tries.push((r) => shopHeal(r, C))
  const implants = stock.implants
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !it.sold)
    .sort((a, b) => (IMPLANT_SCORE[C.implants[b.it.implantId]?.rarity ?? ''] ?? 0) - (IMPLANT_SCORE[C.implants[a.it.implantId]?.rarity ?? ''] ?? 0))
  for (const { i } of implants) tries.push((r) => shopBuyImplant(r, i, C))
  const cards = stock.cards
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !it.sold && cardScore(it.cardId, C) >= 2)
    .sort((a, b) => cardScore(b.it.cardId, C) - cardScore(a.it.cardId, C))
  if (run.deck.length < 25) for (const { i } of cards) tries.push((r) => shopBuyCard(r, i, C))
  if (run.deck.length > 12) tries.push((r) => shopRemove(r, C))
  if (run.consumables.length < MAX_CONSUMABLES)
    stock.consumables.forEach((it, i) => {
      if (!it.sold && run.credits - it.price >= 40) tries.push((r) => shopBuyConsumable(r, i, C))
    })
  tries.push((r) => leaveShop(r, C))
  return firstAccepted(run, tries)
}

function decideRest(run: RunState, s: ScreenOf<'rest'>, C: ContentRegistry): RunState {
  if (campScene(run, C)) return startCamp(run, C)
  // The workbench is free (does not use the rest): craft what fits first, biggest recipe first.
  for (const recipe of ['refit', 'assemble', 'patch'] as const) {
    if (recipe === 'patch' && hpPct(run) >= 0.8) continue
    if (canCraft(run, recipe)) {
      const next = restCraft(run, recipe, C)
      if (next !== run) return next
    }
  }
  if (s.done) return leaveRest(run, C)
  const tries: ((r: RunState) => RunState)[] = []
  if (hpPct(run) < 0.6) tries.push((r) => restHeal(r, C))
  if (run.trace >= 60 && hpPct(run) >= 0.75) tries.push((r) => restScrub(r, C))
  tries.push((r) => restUpgrade(r, C))
  for (const m of run.party) tries.push((r) => restBond(r, m.id, C))
  tries.push((r) => restHeal(r, C), (r) => leaveRest(r, C))
  return firstAccepted(run, tries)
}

function decideReward(run: RunState, s: ScreenOf<'reward'>, C: ContentRegistry): RunState {
  const r = s.reward
  if (!r.taken.credits) return takeRewardCredits(run, C)
  if (!r.taken.implant && r.implantChoices.length > 0) {
    const best = [...r.implantChoices].sort(
      (a, b) => (IMPLANT_SCORE[C.implants[b]?.rarity ?? ''] ?? 0) - (IMPLANT_SCORE[C.implants[a]?.rarity ?? ''] ?? 0),
    )[0] as string
    const next = takeRewardImplant(run, best, C)
    if (next !== run) return next
  }
  const forbidden = r.noiseChoices?.[0]
  if (forbidden && !r.taken.noise) {
    const next = takeNoiseImplant(run, forbidden, C)
    if (next !== run) return next
  }
  if (r.consumable && !r.taken.consumable && run.consumables.length < MAX_CONSUMABLES) {
    const next = takeRewardConsumable(run, C)
    if (next !== run) return next
  }
  const group = r.cardChoices.findIndex((_, i) => !r.taken.cards[i])
  if (group >= 0) return takeRewardCard(run, group, chooseCard(run, r.cardChoices[group] ?? [], C), C)
  return leaveReward(run, C)
}

function decideCardPick(run: RunState, s: ScreenOf<'card_pick'>, C: ContentRegistry): RunState {
  const cards = pickableCards(run, C)
  const target = s.purpose === 'remove' ? removalTarget(cards, C) : upgradeTarget(cards, C)
  return target ? pickCard(run, target.uid, C) : run
}

function decideCombat(
  run: RunState,
  s: ScreenOf<'combat'>,
  C: ContentRegistry,
  policy: SimPolicy,
  maxTurns: number,
  onFight?: (f: FightTelemetry) => void,
): RunState {
  let end = autoPlay(s.combat, C, policy, maxTurns)
  if (end.phase === 'player') end = { ...end, phase: 'lost' } // stalled fights count as losses
  if (onFight) {
    const connector = end.units.find((u) => u.uid === 'connector')
    onFight({
      encounterId: s.combat.encounterId,
      nodeKind: s.nodeKind,
      act: run.act,
      won: end.phase === 'won',
      turns: end.turn,
      hpBefore: run.hp,
      hpAfter: connector?.hp ?? 0,
      maxHp: run.maxHp,
      deckSize: run.deck.length,
    })
  }
  return updateCombat(run, end, C)
}

/** Visit points of interest in order while actions last, then leave. */
function decideDistrict(run: RunState, C: ContentRegistry): RunState {
  const open = districtPois(run, C).find((v) => v.available)
  return open ? visitPoi(run, open.poi.id, C) : leaveDistrict(run, C)
}

/** Reroll a failed check when inspired; otherwise the option with the best expected value (no check = sure). */
function decideDialogue(run: RunState, s: ScreenOf<'dialogue'>, C: ContentRegistry): RunState {
  const d = s.dialogue
  if (d.ended) return closeDialogue(run, C)
  if (d.pending) {
    if (!d.pending.roll.success) {
      const again = rerollDialogue(run)
      if (again !== run) return again
    }
    return acceptRoll(run, C)
  }
  const value = (o: DialogueOutcome | undefined): number => {
    const effects = o?.effects ?? []
    const plain = effects.filter((e): e is RunEffect => e.kind !== 'quest' && e.kind !== 'combat_mod' && e.kind !== 'inspiration')
    return outcomeValue(run, { text: o?.text ?? { ko: '', en: '' }, effects: plain }, C) + (effects.length - plain.length)
  }
  const scored = dialogueOptions(run, C)
    .filter((v) => v.available)
    .map((v) => {
      const p = (v.chance ?? 100) / 100
      return { v, score: p * (value(v.option.success) + 1) + (1 - p) * value(v.option.failure) }
    })
    .sort((a, b) => b.score - a.score)
  const best = scored[0]
  return best ? chooseDialogue(run, best.v.index, C) : run
}

function decide(
  run: RunState,
  C: ContentRegistry,
  policy: SimPolicy,
  maxTurns: number,
  onFight?: (f: FightTelemetry) => void,
): RunState {
  const s = run.screen
  switch (s.kind) {
    case 'act_intro':
      return startAct(run, C)
    case 'map':
      return decideMap(run, C)
    case 'combat':
      return decideCombat(run, s, C, policy, maxTurns, onFight)
    case 'reward':
      return decideReward(run, s, C)
    case 'event':
      return decideEvent(run, s, C)
    case 'shop':
      return decideShop(run, s, C)
    case 'rest':
      return decideRest(run, s, C)
    case 'treasure':
      return s.opened ? leaveTreasure(run, C) : openTreasure(run, C)
    case 'card_pick':
      return decideCardPick(run, s, C)
    case 'card_reward':
      return pickCardReward(run, chooseCard(run, s.choices, C), C)
    case 'final_choice': {
      const open = availableEndings(run, C)
        .filter((v) => v.available)
        .sort((a, b) => b.ending.echoBonus - a.ending.echoBonus)[0]
      return open ? chooseEnding(run, open.ending.id, C) : run
    }
    case 'district':
      return decideDistrict(run, C)
    case 'dialogue':
      return decideDialogue(run, s, C)
    case 'ended':
      return run
  }
}

// ---------------------------------------------------------------- entry point

/** Play one whole run headless. Throws if the state machine gets stuck (an engine/content bug). */
export function simulateRun(
  seed: number,
  archetype: string,
  C: ContentRegistry,
  policy: SimPolicy,
  opts: RunSimOptions = {},
): RunSimResult {
  const profile = opts.profile ?? (opts.mode || opts.mutators ? { ...newProfile('sim'), wins: 1 } : newProfile('sim'))
  const companion = opts.companion === undefined ? (unlockedCompanions(profile, C)[0] ?? null) : opts.companion
  const maxTurns = opts.maxTurns ?? 30
  let run = newRun(profile, { archetype, paradox: opts.paradox ?? 0, seed, now: SIM_EPOCH, daily: opts.daily, companion, crpg: opts.crpg, mode: opts.mode, mutators: opts.mutators }, C)
  for (const id of opts.startImplants ?? []) run = grantImplant(run, id, C)
  for (let step = 0; run.screen.kind !== 'ended'; step++) {
    if (step >= MAX_STEPS) throw new Error(`runSim: step limit on ${run.screen.kind} (seed ${seed})`)
    const next = decide(run, C, policy, maxTurns, opts.onFight)
    if (next === run) throw new Error(`runSim: stuck on ${run.screen.kind} (seed ${seed}, act ${run.act})`)
    run = next
  }
  const end = run.screen as ScreenOf<'ended'>
  const result: RunSimResult = {
    won: end.result === 'victory',
    act: run.act,
    floors: run.tally.floors,
    hp: run.hp,
    trace: run.trace,
    deckSize: run.deck.length,
    implants: run.implants.length,
    credits: run.credits,
    echoes: computeEchoes(run, C).total,
    endingId: end.endingId,
    axes: { ...(run.axes ?? {}) },
    tally: { ...run.tally },
    feats: Object.fromEntries(Object.entries(run.flags).filter(([k]) => k.startsWith('feat_'))),
    duos: run.duosFired?.length ?? 0,
    evolved: [...(run.evolved ?? [])],
    crew: [...run.party, ...(run.bench ?? [])].map((m) => m.id),
    outside: run.flags.outside ? 1 + (run.flags.outside_saved ?? 0) : 0,
  }
  const killedBy = runKilledBy(run)
  if (killedBy) result.killedBy = killedBy
  return result
}
