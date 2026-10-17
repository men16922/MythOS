// Mythos 2.0 — Signal+ CRPG layer: districts, d20 dialogue, backgrounds, companion approval, quests, camp nights and
// the combat twists a conversation can set up (plan: docs/plans/2026-10-18-tiers-and-ai-narrative.md §4).
//
//   map → district (points of interest, an action budget) → dialogue (d20 checks, approval, quests) → district … → map
//   rest → camp night (a companion with enough approval talks once per run) → rest
//
// The layer exists only when `run.crpg` is set (a Signal+ normal run; never a daily). Same rules as run.ts: pure
// reducers (clone → mutate → return), an illegal action returns the same object, randomness only from `run.rng`.
// District placement uses its own hash so the rest of the run's random stream is identical with or without it.
// Outcome rewards stay inside an event node's budget: a district replaces one event node per act.

import { COVER_HP, tileAt, unitAt } from './effects.ts'
import { applyImmediate, conditionMet, log, openFollowUps, raiseBond, roster } from './run.ts'
import { hashSeed, rand } from './rng.ts'
import { offerThought } from './thoughts.ts'
import type {
  ActMap,
  CampSceneDef,
  CombatModId,
  CombatState,
  Condition,
  ContentRegistry,
  CrpgEffect,
  CrpgRunState,
  D20Roll,
  DialogueDef,
  DialogueOption,
  DialogueState,
  DistrictDef,
  PoiDef,
  RunEffect,
  RunScreen,
  RunState,
  StatKey,
  Text,
} from './types.ts'

export const MAX_INSPIRATION = 2
/** Approval at which a companion's bond rises (each threshold pays once per run). */
export const APPROVAL_BOND_STEPS = [3, 6] as const
export const COMBAT_MODS: readonly CombatModId[] = ['weaken', 'marked', 'intel', 'cover']

const t = (ko: string, en: string): Text => ({ ko, en })
const clone = <T>(x: T): T => structuredClone(x)
const clamp = (min: number, max: number, v: number): number => Math.min(max, Math.max(min, v))

export function newCrpgState(background: string | null): CrpgRunState {
  return {
    background,
    inspiration: 1,
    approval: {},
    approvalBonds: {},
    quests: {},
    districts: [],
    camps: [],
    nextCombat: [],
    payoffsUsed: [],
  }
}

// ---------------------------------------------------------------- conditions

/** The CRPG-only parts of a Condition (run.ts `conditionMet` checks the rest and calls this). */
export function crpgConditionMet(run: RunState, cond: Condition, C: ContentRegistry): { ok: boolean; reason?: Text } {
  const fail = (ko: string, en: string) => ({ ok: false, reason: t(ko, en) })
  const s = run.crpg
  if (cond.background && s?.background !== cond.background) {
    const bg = C.crpg?.backgrounds[cond.background]?.name ?? t(cond.background, cond.background)
    return fail(`출신: ${bg.ko}`, `Background: ${bg.en}`)
  }
  if (cond.quest && (s?.quests[cond.quest.id] ?? 0) < cond.quest.stage) return fail('조건 미충족', 'Condition not met')
  if (cond.approval) {
    const deployed = run.party.some((m) => m.id === cond.approval?.id)
    if (!deployed || (s?.approval[cond.approval.id] ?? 0) < cond.approval.min) {
      const n = C.companions[cond.approval.id]?.name ?? t(cond.approval.id, cond.approval.id)
      return fail(`${n.ko}의 신뢰 필요`, `Needs ${n.en}'s trust`)
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------- d20

export function d20Modifier(run: RunState, stat: StatKey, C: ContentRegistry): number {
  const bg = run.crpg?.background ? C.crpg?.backgrounds[run.crpg.background] : undefined
  return (run.stats[stat] ?? 0) - 5 + (bg?.proficient.includes(stat) ? 2 : 0)
}

/** Success chance in percent of d20 + modifier ≥ dc (natural 20 always succeeds, natural 1 always fails). */
export function d20Chance(modifier: number, dc: number, advantage: boolean): number {
  const need = clamp(2, 20, dc - modifier) // faces 2..20 can succeed; 1 never does
  const single = (21 - need) / 20
  const p = advantage ? 1 - (1 - single) ** 2 : single
  return Math.round(p * 100)
}

function rollD20(run: RunState, modifier: number, dc: number, advantage: boolean): D20Roll {
  const a = 1 + Math.floor(rand(run) * 20)
  const b = advantage ? 1 + Math.floor(rand(run) * 20) : undefined
  const die = b !== undefined ? Math.max(a, b) : a
  const roll: D20Roll = { die, modifier, dc, total: die + modifier, success: die === 20 || (die !== 1 && die + modifier >= dc), advantage }
  if (b !== undefined) roll.other = Math.min(a, b)
  return roll
}

function hasAdvantage(run: RunState, option: DialogueOption): boolean {
  return !!option.assist && run.party.some((m) => m.id === option.assist && m.hp > 0)
}

// ---------------------------------------------------------------- district placement

/** Signal+ normal runs: one event node of this act's map becomes a district (deterministic, own hash). */
export function placeDistrict(run: RunState, map: ActMap, C: ContentRegistry): void {
  if (!run.crpg || run.daily || !C.crpg) return
  const seen = new Set(run.crpg.districts)
  const pool = Object.values(C.crpg.districts)
    .filter((d) => d.act === map.act && !seen.has(d.id))
    .sort((a, b) => a.id.localeCompare(b.id))
  const nodes = Object.values(map.nodes)
    .filter((n) => n.kind === 'event' && n.row > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
  if (pool.length === 0 || nodes.length === 0) return
  const h = hashSeed(`${run.seed}:district:${map.act}`)
  const node = nodes[h % nodes.length]
  const district = pool[Math.floor(h / 7) % pool.length]
  if (!node || !district) return
  node.kind = 'district'
  node.districtId = district.id
  delete node.eventId
}

// ---------------------------------------------------------------- districts

export interface PoiView {
  poi: PoiDef
  visited: boolean
  available: boolean
  reason?: Text
}

export function districtDef(run: RunState, C: ContentRegistry): DistrictDef | undefined {
  return run.screen.kind === 'district' ? C.crpg?.districts[run.screen.district.id] : undefined
}

/** Enter a district node (called by run.enterNode). */
export function enterDistrict(next: RunState, districtId: string, C: ContentRegistry): boolean {
  const def = C.crpg?.districts[districtId]
  if (!def || !next.crpg) return false
  if (!next.crpg.districts.includes(def.id)) next.crpg.districts.push(def.id)
  next.screen = { kind: 'district', district: { id: def.id, actionsLeft: def.actions, visited: [] } }
  log(next, 'district', def.name)
  return true
}

export function districtPois(run: RunState, C: ContentRegistry): PoiView[] {
  if (run.screen.kind !== 'district') return []
  const visit = run.screen.district
  const def = C.crpg?.districts[visit.id]
  if (!def) return []
  return def.pois.map((poi) => {
    const visited = visit.visited.includes(poi.id)
    const cond = conditionMet(run, poi.requires, C)
    const view: PoiView = { poi, visited, available: !visited && cond.ok && visit.actionsLeft > 0 && !!C.crpg?.dialogues[poi.dialogue] }
    if (cond.reason) view.reason = cond.reason
    return view
  })
}

function openDialogue(next: RunState, def: DialogueDef, returnTo: RunScreen): void {
  next.screen = {
    kind: 'dialogue',
    dialogue: { id: def.id, node: def.start, pending: null, last: null, ended: false, queued: [] },
    returnTo,
  }
}

/** Spend one action to visit a point of interest (opens its conversation). */
export function visitPoi(run: RunState, poiId: string, C: ContentRegistry): RunState {
  const view = districtPois(run, C).find((v) => v.poi.id === poiId)
  if (!view?.available || run.screen.kind !== 'district') return run
  const def = C.crpg?.dialogues[view.poi.dialogue]
  if (!def) return run
  const next = clone(run)
  if (next.screen.kind !== 'district') return run
  const visit = next.screen.district
  const back: RunScreen = { kind: 'district', district: { id: visit.id, actionsLeft: visit.actionsLeft - 1, visited: [...visit.visited, poiId] } }
  openDialogue(next, def, back)
  return next
}

export function leaveDistrict(run: RunState, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'district') return run
  const def = C.crpg?.districts[run.screen.district.id]
  const next = clone(run)
  next.screen = { kind: 'map' }
  if (def) log(next, 'district', t(`${def.name.ko}을(를) 떠났다`, `Left ${def.name.en}`))
  return next
}

// ---------------------------------------------------------------- dialogue

export interface DialogueOptionView {
  option: DialogueOption
  index: number
  available: boolean
  reason?: Text
  /** d20 success chance in percent (checks only). */
  chance?: number
  modifier?: number
  advantage?: boolean
  /** Would earn inspiration (background-appropriate). */
  inspires: boolean
}

export function currentDialogue(run: RunState, C: ContentRegistry): { def: DialogueDef; state: DialogueState } | null {
  if (run.screen.kind !== 'dialogue') return null
  const def = C.crpg?.dialogues[run.screen.dialogue.id]
  return def ? { def, state: run.screen.dialogue } : null
}

export function dialogueOptions(run: RunState, C: ContentRegistry): DialogueOptionView[] {
  const cur = currentDialogue(run, C)
  if (!cur || cur.state.ended || cur.state.pending) return []
  const node = cur.def.nodes[cur.state.node]
  if (!node) return []
  const bg = run.crpg?.background ? C.crpg?.backgrounds[run.crpg.background] : undefined
  return node.options.map((option, index) => {
    const cond = conditionMet(run, option.requires, C)
    const view: DialogueOptionView = { option, index, available: cond.ok, inspires: !!bg?.inspires.includes(option.intent) }
    if (cond.reason) view.reason = cond.reason
    if (option.check) {
      const modifier = d20Modifier(run, option.check.stat, C)
      const advantage = hasAdvantage(run, option)
      view.modifier = modifier
      view.advantage = advantage
      view.chance = d20Chance(modifier, option.check.dc, advantage)
    }
    return view
  })
}

function applyApproval(next: RunState, option: DialogueOption, C: ContentRegistry): { id: string; delta: number }[] {
  const s = next.crpg
  if (!s || !option.approval) return []
  const out: { id: string; delta: number }[] = []
  for (const [id, delta] of Object.entries(option.approval)) {
    if (!delta || !next.party.some((m) => m.id === id)) continue
    const value = (s.approval[id] ?? 0) + delta
    s.approval[id] = value
    out.push({ id, delta })
    const paid = s.approvalBonds[id] ?? 0
    const due = APPROVAL_BOND_STEPS.filter((step) => value >= step).length
    if (due > paid) {
      s.approvalBonds[id] = due
      raiseBond(next, id, due - paid, C)
    }
  }
  return out
}

const INTERACTIVE = new Set<RunEffect['kind']>(['card_choice', 'remove_card', 'combat'])

function isCrpgEffect(e: RunEffect | CrpgEffect): e is CrpgEffect {
  return e.kind === 'quest' || e.kind === 'combat_mod' || e.kind === 'inspiration'
}

function applyCrpgEffect(s: CrpgRunState, e: CrpgEffect): void {
  switch (e.kind) {
    case 'quest':
      s.quests[e.id] = Math.max(s.quests[e.id] ?? 0, e.stage)
      break
    case 'combat_mod':
      if (COMBAT_MODS.includes(e.mod) && !s.nextCombat.includes(e.mod)) s.nextCombat.push(e.mod)
      break
    case 'inspiration':
      s.inspiration = clamp(0, MAX_INSPIRATION, s.inspiration + e.amount)
      break
  }
}

function resolve(next: RunState, option: DialogueOption, success: boolean, roll: D20Roll | undefined, C: ContentRegistry): void {
  if (next.screen.kind !== 'dialogue') return
  const state = next.screen.dialogue
  const outcome = success ? option.success : (option.failure ?? { text: t('통하지 않았다.', 'It doesn’t land.') })
  const now: RunEffect[] = []
  for (const e of outcome.effects ?? []) {
    if (isCrpgEffect(e)) {
      if (next.crpg) applyCrpgEffect(next.crpg, e)
    } else if (INTERACTIVE.has(e.kind) || (e.kind === 'upgrade_card' && !e.random)) state.queued.push(e)
    else now.push(e)
  }
  applyImmediate(next, now, C)
  if (option.check && roll) offerThought(next, option.check.stat, success, C.thoughts ?? [])
  const approvals = applyApproval(next, option, C)
  const bg = next.crpg?.background ? C.crpg?.backgrounds[next.crpg.background] : undefined
  const inspired = !!next.crpg && !!bg?.inspires.includes(option.intent) && next.crpg.inspiration < MAX_INSPIRATION
  if (inspired && next.crpg) next.crpg.inspiration += 1
  state.last = { label: option.label, text: outcome.text, approvals, inspired, effects: outcome.effects ?? [] }
  if (roll) state.last.roll = roll
  state.pending = null
  if (outcome.goto && C.crpg?.dialogues[state.id]?.nodes[outcome.goto]) state.node = outcome.goto
  else state.ended = true
  log(next, 'district', option.label)
}

export function chooseDialogue(run: RunState, index: number, C: ContentRegistry): RunState {
  const view = dialogueOptions(run, C)[index]
  if (!view?.available) return run
  const next = clone(run)
  if (next.screen.kind !== 'dialogue') return run
  const check = view.option.check
  if (!check) {
    resolve(next, view.option, true, undefined, C)
    return next
  }
  const roll = rollD20(next, view.modifier ?? 0, check.dc, view.advantage ?? false)
  next.screen.dialogue.pending = { optionIndex: index, roll }
  return next
}

/** Spend inspiration to reroll a failed check (once per check). */
export function rerollDialogue(run: RunState): RunState {
  if (run.screen.kind !== 'dialogue') return run
  const p = run.screen.dialogue.pending
  if (!p || p.roll.success || p.roll.rerolled || (run.crpg?.inspiration ?? 0) <= 0) return run
  const next = clone(run)
  if (next.screen.kind !== 'dialogue' || !next.crpg) return run
  next.crpg.inspiration -= 1
  const roll = rollD20(next, p.roll.modifier, p.roll.dc, p.roll.advantage)
  roll.rerolled = true
  next.screen.dialogue.pending = { optionIndex: p.optionIndex, roll }
  return next
}

/** Accept the rolled check: its outcome applies. */
export function acceptRoll(run: RunState, C: ContentRegistry): RunState {
  const cur = currentDialogue(run, C)
  const p = cur?.state.pending
  if (!cur || !p) return run
  const option = cur.def.nodes[cur.state.node]?.options[p.optionIndex]
  if (!option) return run
  const next = clone(run)
  resolve(next, option, p.roll.success, p.roll, C)
  return next
}

/** Leave a finished conversation: queued card rewards / pickers / a fight open first, then where it came from. */
export function closeDialogue(run: RunState, C: ContentRegistry): RunState {
  if (run.screen.kind !== 'dialogue' || !run.screen.dialogue.ended) return run
  const next = clone(run)
  if (next.screen.kind !== 'dialogue') return run
  const { queued } = next.screen.dialogue
  // A fight ends a district visit: after it (and its reward) the run goes back to the map.
  const back = next.screen.returnTo
  const tail: RunScreen = queued.some((e) => e.kind === 'combat') && back.kind === 'district' ? { kind: 'map' } : back
  openFollowUps(next, queued, tail, C)
  return next
}

// ---------------------------------------------------------------- camp nights

export function campScene(run: RunState, C: ContentRegistry): CampSceneDef | null {
  const s = run.crpg
  if (!s || run.screen.kind !== 'rest' || !C.crpg) return null
  for (const scene of C.crpg.camps) {
    if (s.camps.includes(scene.companion)) continue
    if (!run.party.some((m) => m.id === scene.companion && m.hp > 0)) continue
    if ((s.approval[scene.companion] ?? 0) < scene.minApproval) continue
    if (!C.crpg.dialogues[scene.dialogue]) continue
    return scene
  }
  return null
}

export function startCamp(run: RunState, C: ContentRegistry): RunState {
  const scene = campScene(run, C)
  const def = scene ? C.crpg?.dialogues[scene.dialogue] : undefined
  if (!scene || !def) return run
  const next = clone(run)
  next.crpg?.camps.push(scene.companion)
  openDialogue(next, def, run.screen)
  return next
}

// ---------------------------------------------------------------- combat twists

/** Mods for the fight about to start: the pending ones, plus quest payoffs on a boss fight. Consumes them. */
export function takeCombatMods(next: RunState, boss: boolean, C: ContentRegistry): CombatModId[] {
  const s = next.crpg
  if (!s) return []
  const mods = s.nextCombat.slice()
  s.nextCombat = []
  if (boss) {
    for (const q of Object.values(C.crpg?.quests ?? {})) {
      // Exactly the payoff stage: a later stage can be a different ending of the quest (e.g. a betrayal).
      if (!q.payoff || s.payoffsUsed.includes(q.id) || (s.quests[q.id] ?? 0) !== q.payoff.stage) continue
      s.payoffsUsed.push(q.id)
      if (!mods.includes(q.payoff.bossMod)) mods.push(q.payoff.bossMod)
    }
  }
  return mods
}

/** Apply combat twists to a freshly started fight (before the first player input). */
export function applyCombatMods(c: CombatState, mods: readonly CombatModId[]): void {
  const enemies = c.units.filter((u) => u.side === 'enemy' && u.hp > 0)
  for (const mod of mods) {
    switch (mod) {
      case 'weaken':
        for (const u of enemies) u.hp = Math.max(1, Math.ceil(u.hp * 0.75))
        break
      case 'marked':
        for (const u of enemies) u.statuses.mark = (u.statuses.mark ?? 0) + 1
        break
      case 'intel':
        c.energy += 1
        break
      case 'cover': {
        let placed = 0
        for (const p of [{ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 4 }]) {
          const tile = tileAt(c, p)
          if (placed >= 2 || !tile || tile.kind !== 'floor' || unitAt(c, p)) continue
          const row = c.tiles[p.y]
          if (row) row[p.x] = { kind: 'cover', hp: COVER_HP }
          placed += 1
        }
        break
      }
    }
  }
}

// ---------------------------------------------------------------- views for the UI

export const COMBAT_MOD_TEXT: Record<CombatModId, Text> = {
  weaken: t('적이 약해진 채로 시작한다 (체력 -25%)', 'Enemies start worn down (-25% HP)'),
  marked: t('적이 표식을 단 채로 시작한다', 'Enemies start Marked'),
  intel: t('첫 턴 에너지 +1', '+1 energy on the first turn'),
  cover: t('아군 앞에 엄폐물 2개', 'Two pieces of cover in front of you'),
}

export function approvalOf(run: RunState, companionId: string): number {
  return run.crpg?.approval[companionId] ?? 0
}

/** Journal: started quests with their current line. */
export function questLog(run: RunState, C: ContentRegistry): { id: string; title: Text; line: Text; payoff?: Text }[] {
  const s = run.crpg
  if (!s || !C.crpg) return []
  const out: { id: string; title: Text; line: Text; payoff?: Text }[] = []
  for (const [id, stage] of Object.entries(s.quests)) {
    const q = C.crpg.quests[id]
    const line = q?.stages[clamp(0, q.stages.length - 1, stage - 1)]
    if (!q || !line || stage <= 0) continue
    const entry: { id: string; title: Text; line: Text; payoff?: Text } = { id, title: q.title, line }
    if (q.payoff && stage === q.payoff.stage && !s.payoffsUsed.includes(id)) entry.payoff = q.payoff.text
    out.push(entry)
  }
  return out
}

/** Companions in the whole roster (deployed + bench) with their approval, for the party panel. */
export function approvals(run: RunState): { id: string; value: number }[] {
  return roster(run).map((m) => ({ id: m.id, value: approvalOf(run, m.id) }))
}
