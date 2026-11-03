// Chronicle (W4, first step: save compatibility, nothing playable yet). The plan's campaign keeps one connector across
// five chapters (docs/plans/2026-10-26-dlc-expansion-plan.md §3.2): stats, background, choice axes, companion approval,
// quest stages and faction standing carry over, and three core cards survive the deck rebuild. The state lives inside
// the profile (`MetaProfile.chronicle`), so it rides the existing save, sync and 512 KB blob cap with no new slot.
import type { AgendaCond, ChoiceAxis, ChronicleAgendaDef, ChronicleState, ChronicleTwistDef, ContentRegistry, Faction, RunState, Stats } from './types.ts'

/** One chapter per act (2026-11-04: the six acts that exist; the DLC plan sketched five). */
export const CHRONICLE_CHAPTERS = 6
export const CORE_CARDS = 3

const STAT_KEYS = ['str', 'agi', 'int', 'cha', 'obs'] as const
const AXES: readonly ChoiceAxis[] = ['humanity', 'dominance', 'resilience', 'insight']
const FACTIONS: readonly Faction[] = ['offgrid', 'market', 'grid']
const RARITY_RANK: Record<string, number> = { rare: 4, uncommon: 3, special: 2, common: 1, starter: 0 }

/** The deck's strongest cards by rarity, then upgraded first, then deck order (the default core). */
export function defaultCore(run: Pick<RunState, 'deck'>, C: Pick<ContentRegistry, 'cards'>): string[] {
  return run.deck
    .map((k, i) => ({ k, i, def: C.cards[k.defId] }))
    .filter((x) => x.def && x.def.type !== 'junk')
    .sort((a, b) => (RARITY_RANK[b.def?.rarity ?? ''] ?? 0) - (RARITY_RANK[a.def?.rarity ?? ''] ?? 0) || Number(b.k.upgraded) - Number(a.k.upgraded) || a.i - b.i)
    .slice(0, CORE_CARDS)
    .map((x) => x.k.defId)
}

/** What a finished chapter hands the next one. `core` overrides the default three (unknown ids are dropped). */
export function carryOver(run: RunState, C: Pick<ContentRegistry, 'cards'>, core?: readonly string[]): ChronicleState['carried'] {
  const picked = (core ?? defaultCore(run, C)).filter((id) => C.cards[id]).slice(0, CORE_CARDS)
  return {
    archetype: run.archetype,
    stats: { ...run.stats },
    background: run.crpg?.background ?? null,
    axes: { ...(run.axes ?? {}) },
    approval: { ...(run.crpg?.approval ?? {}) },
    quests: { ...(run.crpg?.quests ?? {}) },
    rep: { ...(run.crpg?.rep ?? {}) },
    coreCards: picked,
  }
}

/** The player's pick of core cards for the next chapter: ids from this run's deck, at most CORE_CARDS. */
export function withCore(state: ChronicleState, ids: readonly string[], deck: readonly { defId: string }[]): ChronicleState {
  const inDeck = new Set(deck.map((k) => k.defId))
  const core = [...new Set(ids)].filter((id) => inDeck.has(id)).slice(0, CORE_CARDS)
  return { ...state, carried: { ...state.carried, coreCards: core } }
}

function agendaMet(when: AgendaCond, c: ChronicleState['carried']): boolean {
  if (when.rep) {
    const v = c.rep[when.rep.faction] ?? 0
    if (when.rep.min !== undefined && v < when.rep.min) return false
    if (when.rep.max !== undefined && v > when.rep.max) return false
  }
  if (when.approval && (c.approval[when.approval.id] ?? 0) < when.approval.min) return false
  if (when.axis && (c.axes[when.axis.axis] ?? 0) < when.axis.min) return false
  if (when.quest && (c.quests[when.quest.id] ?? 0) < when.quest.stage) return false
  return true
}

/** Between chapters every agenda moves at most one stage, when its next stage's condition holds. */
export function advanceAgendas(prev: Readonly<Record<string, number>> | undefined, carried: ChronicleState['carried'], defs: readonly ChronicleAgendaDef[]): Record<string, number> {
  const out: Record<string, number> = { ...(prev ?? {}) }
  for (const a of defs) {
    const at = out[a.id] ?? 0
    const next = a.stages[at]
    if (next && agendaMet(next.when, carried)) out[a.id] = at + 1
  }
  return out
}

/** Two of the twists, in reveal order, fixed per campaign (seeded by the first chapter's run seed). */
export function drawTwists(seed: number, defs: readonly ChronicleTwistDef[]): string[] {
  if (defs.length < 2) return defs.map((d) => d.id)
  const n = defs.length
  const first = Math.abs(seed) % n
  const second = (first + 1 + (Math.floor(Math.abs(seed) / n) % (n - 1))) % n
  return [defs[first]?.id ?? '', defs[second]?.id ?? '']
}

/** The beats under chapter `chapter`'s title: 2 → A1, 3 → B1, 4 → A2, 5 → B2, 6 → A3 and B3 (chapter 1 has none). */
export function twistBeats(twists: readonly string[] | undefined, chapter: number): [string, number][] {
  const [a, b] = twists ?? []
  if (!a || !b) return []
  switch (chapter) {
    case 2: return [[a, 0]]
    case 3: return [[b, 0]]
    case 4: return [[a, 1]]
    case 5: return [[b, 1]]
    case 6: return [[a, 2], [b, 2]]
    default: return []
  }
}

/** Close a chapter: mark it done and point at the next (the last chapter stays as the final one). */
export function finishChapter(state: ChronicleState | undefined, chapter: number, carried: ChronicleState['carried']): ChronicleState {
  const done = [...new Set([...(state?.chaptersDone ?? []), chapter])].sort((a, b) => a - b)
  return { chapter: Math.min(CHRONICLE_CHAPTERS, chapter + 1), chaptersDone: done, carried }
}

const num = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const numMap = (v: unknown, keys?: readonly string[]): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [k, x] of Object.entries(obj(v))) if ((!keys || keys.includes(k)) && typeof x === 'number' && Number.isFinite(x)) out[k] = Math.round(x)
  return out
}

/** A saved chronicle, validated (migrateProfile): anything malformed is dropped rather than trusted. */
export function migrateChronicle(raw: unknown): ChronicleState | undefined {
  const r = obj(raw)
  const carried = obj(r.carried)
  if (typeof carried.archetype !== 'string') return undefined
  const s = obj(carried.stats)
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, num(s[k], 0, 20, 0)])) as Stats
  return {
    chapter: num(r.chapter, 1, CHRONICLE_CHAPTERS, 1),
    chaptersDone: Array.isArray(r.chaptersDone) ? [...new Set(r.chaptersDone.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= CHRONICLE_CHAPTERS))].sort((a, b) => a - b) : [],
    ...(r.agendas !== undefined ? { agendas: numMap(r.agendas) } : {}),
    ...(Array.isArray(r.twists) ? { twists: r.twists.filter((x): x is string => typeof x === 'string').slice(0, 2) } : {}),
    carried: {
      archetype: carried.archetype,
      stats,
      background: typeof carried.background === 'string' ? carried.background : null,
      axes: numMap(carried.axes, AXES),
      approval: numMap(carried.approval),
      quests: numMap(carried.quests),
      rep: numMap(carried.rep, FACTIONS),
      coreCards: Array.isArray(carried.coreCards) ? carried.coreCards.filter((x): x is string => typeof x === 'string').slice(0, CORE_CARDS) : [],
    },
  }
}
