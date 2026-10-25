// Mythos 2.0 — content registry. Pure data: arrays authored per file, assembled into id-keyed records here.
// Engine/UI code receives `CONTENT` (or a test double with the same shape) as `C: ContentRegistry`.

import { COMPANION_INTROS } from './companionIntros.ts'
import type { ActDef, ActId, ContentRegistry } from '../engine/types.ts'
import { CARDS } from './cards.ts'
import { CONSUMABLES } from './consumables.ts'
import { ENEMIES as BASE_ENEMIES } from './enemies.ts'
import { ENCOUNTERS as BASE_ENCOUNTERS } from './encounters.ts'
import { IMPLANTS } from './implants.ts'
import { COMPANIONS } from './companions.ts'
import { ARCHETYPES } from './archetypes.ts'
import { EVENTS as BASE_EVENTS } from './events.ts'
import { LORE } from './lore.ts'
import { ENDINGS } from './endings.ts'
import { IX_LINES } from './ix.ts'
import { ACTS as BASE_ACTS } from './acts.ts'
import { UNLOCKS } from './unlocks.ts'
import { PARADOX } from './paradox.ts'
import { CRPG } from './crpg/index.ts'
import { ECHOES } from './echoes.ts'
import { THOUGHTS } from './thoughts.ts'
import { GLASS_ACT, GLASS_ENCOUNTERS, GLASS_ENEMIES, GLASS_EVENTS } from './packs/glass_library/index.ts'

// Content packs (Deep Signal acts 4+) join the base content here, so every registry, export and integrity test
// sees one merged set. Standard runs never reach a pack's act (engine/run.ts lastAct).
const ENEMIES = [...BASE_ENEMIES, ...GLASS_ENEMIES]
const ENCOUNTERS = [...BASE_ENCOUNTERS, ...GLASS_ENCOUNTERS]
const EVENTS = [...BASE_EVENTS, ...GLASS_EVENTS]
const ACTS: Record<ActId, ActDef> = { ...BASE_ACTS, 4: GLASS_ACT }

function byId<T extends { id: string }>(xs: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const x of xs) out[x.id] = x
  return out
}

export const CONTENT: ContentRegistry = {
  cards: byId(CARDS),
  consumables: byId(CONSUMABLES),
  enemies: byId(ENEMIES),
  encounters: byId(ENCOUNTERS),
  implants: byId(IMPLANTS),
  events: byId(EVENTS),
  companions: byId(COMPANIONS),
  archetypes: byId(ARCHETYPES),
  acts: ACTS,
  endings: byId(ENDINGS),
  unlocks: byId(UNLOCKS),
  paradox: PARADOX,
  lore: byId(LORE),
  ixLines: IX_LINES,
  crpg: CRPG,
  echoes: ECHOES,
  thoughts: THOUGHTS,
  intros: COMPANION_INTROS,
  // Balance 2026-10-25 (docs/plans/2026-10-25-argon-review-and-s-rank-plan.md): the 5-stat perks, Evade/Crit and the
  // larger card/implant pool made the party much stronger than the authored enemy numbers assumed.
  tuning: { enemyHpPct: 12, eliteHpPct: 20, bossHpPct: -10, dmgFromAct: 1, rage: { elite: 3, boss: 2, fromTurn: 3 }, acts: { 4: { hpPct: 45, dmg: 3 } } },
}

export { CARDS, CONSUMABLES, ENEMIES, ENCOUNTERS, IMPLANTS, COMPANIONS, ARCHETYPES }
export { EVENTS, LORE, ENDINGS, IX_LINES, ACTS, UNLOCKS, PARADOX }
export { encountersFor } from './encounters.ts'
