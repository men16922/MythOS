// Mythos 2.0 — content registry. Pure data: arrays authored per file, assembled into id-keyed records here.
// Engine/UI code receives `CONTENT` (or a test double with the same shape) as `C: ContentRegistry`.

import type { ContentRegistry } from '../engine/types.ts'
import { CARDS } from './cards.ts'
import { CONSUMABLES } from './consumables.ts'
import { ENEMIES } from './enemies.ts'
import { ENCOUNTERS } from './encounters.ts'
import { IMPLANTS } from './implants.ts'
import { COMPANIONS } from './companions.ts'
import { ARCHETYPES } from './archetypes.ts'
import { EVENTS } from './events.ts'
import { LORE } from './lore.ts'
import { ENDINGS } from './endings.ts'
import { IX_LINES } from './ix.ts'
import { ACTS } from './acts.ts'
import { UNLOCKS } from './unlocks.ts'
import { PARADOX } from './paradox.ts'
import { CRPG } from './crpg/index.ts'
import { ECHOES } from './echoes.ts'
import { THOUGHTS } from './thoughts.ts'

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
  // Balance 2026-10-25 (docs/plans/2026-10-25-argon-review-and-s-rank-plan.md): the 5-stat perks, Evade/Crit and the
  // larger card/implant pool made the party much stronger than the authored enemy numbers assumed.
  tuning: { enemyHpPct: 5, eliteHpPct: 15, dmgFromAct: 1 },
}

export { CARDS, CONSUMABLES, ENEMIES, ENCOUNTERS, IMPLANTS, COMPANIONS, ARCHETYPES }
export { EVENTS, LORE, ENDINGS, IX_LINES, ACTS, UNLOCKS, PARADOX }
export { encountersFor } from './encounters.ts'
