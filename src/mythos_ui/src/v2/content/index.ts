// Mythos 2.0 — content registry. Pure data: arrays authored per file, assembled into id-keyed records here.
// Engine/UI code receives `CONTENT` (or a test double with the same shape) as `C: ContentRegistry`.

import { RESIDUE } from './residue.ts'
import { SQUAD_ROLES, SQUAD_TACTICS } from './squadTactics.ts'
import { buildAchievements } from './achievements.ts'
import { COMPANION_INTROS } from './companionIntros.ts'
import type { ActDef, ActId, ContentRegistry } from '../engine/types.ts'
import { CARDS as BASE_CARDS } from './cards.ts'
import { CONSUMABLES } from './consumables.ts'
import { ENEMIES as BASE_ENEMIES } from './enemies.ts'
import { ENCOUNTERS as BASE_ENCOUNTERS } from './encounters.ts'
import { IMPLANTS as BASE_IMPLANTS } from './implants.ts'
import { COMPANIONS as BASE_COMPANIONS } from './companions.ts'
import { COMPANION_STATS } from './companionStats.ts'
import { NEW_COMPANION_CARDS, NEW_COMPANION_EVENTS, NEW_COMPANIONS } from './packs/new_companions/index.ts'
import { ARCHETYPES as BASE_ARCHETYPES } from './archetypes.ts'
import { NEW_ARCHETYPE_CARDS, NEW_ARCHETYPE_IMPLANTS, NEW_ARCHETYPES } from './packs/new_archetypes/index.ts'
import { DUOS } from './duos.ts'
import { SEA4_ENCOUNTERS, SEA4_ENEMIES, SEA4_EVENTS, SEA5_ENCOUNTERS, SEA5_ENEMIES, SEA5_EVENTS, SEA6_ENCOUNTERS, SEA6_ENEMIES, SEA6_EVENTS, SEA_ACTS, SEA_ARCHETYPE, SEA_ARCHETYPE_CARDS, SEA_ARCHETYPE_IMPLANT, SEA_CARDS, SEA_COMPANIONS, SEA_COMPANION_CARDS, SEA_COMPANION_EVENTS, SEA_COMPANION_STATS, SEA_CONSUMABLES, SEA_DUOS, SEA_ENDINGS, SEA_GEAR, SEA_IMPLANTS, SEA_SCENES } from './packs/unwritten_sea/index.ts'
import { GEAR } from './gear.ts'
import { EVOLUTIONS, EVOLVED_CARDS } from './evolutions.ts'
import { EVENTS as BASE_EVENTS } from './events.ts'
import { OUTSIDE_ACT, OUTSIDE_CARDS, OUTSIDE_ENCOUNTERS, OUTSIDE_ENEMIES, OUTSIDE_EVENTS, OUTSIDE_ROUTE, OUTSIDE_ROUTE_EVENTS } from './packs/outside_list/index.ts'
import { LORE as BASE_LORE } from './lore.ts'
import { DEEP_LORE } from './packs/deep_lore.ts'
import { ENDINGS as BASE_ENDINGS } from './endings.ts'
import { IX_LINES } from './ix.ts'
import { ACTS as BASE_ACTS } from './acts.ts'
import { UNLOCKS } from './unlocks.ts'
import { PARADOX } from './paradox.ts'
import { CRPG } from './crpg/index.ts'
import { ECHOES } from './echoes.ts'
import { THOUGHTS } from './thoughts.ts'
import { GLASS_ACT, GLASS_ENCOUNTERS, GLASS_ENEMIES, GLASS_EVENTS } from './packs/glass_library/index.ts'
import { MACHINE_ACT, MACHINE_ENCOUNTERS, MACHINE_ENEMIES, MACHINE_EVENTS } from './packs/dreaming_machines/index.ts'
import { ORIGIN_ACT, ORIGIN_ENCOUNTERS, ORIGIN_ENDINGS, ORIGIN_ENEMIES, ORIGIN_EVENTS, REWRITE_CARDS } from './packs/first_record/index.ts'

// Content packs (Deep Signal acts 4+) join the base content here, so every registry, export and integrity test
// sees one merged set. Standard runs never reach a pack's act (engine/run.ts lastAct).
const CARDS = [...BASE_CARDS, ...REWRITE_CARDS, ...NEW_COMPANION_CARDS, ...NEW_ARCHETYPE_CARDS, ...EVOLVED_CARDS, ...OUTSIDE_CARDS, ...SEA_CARDS, ...SEA_COMPANION_CARDS, ...SEA_ARCHETYPE_CARDS]
const IMPLANTS = [...BASE_IMPLANTS, ...NEW_ARCHETYPE_IMPLANTS, ...SEA_IMPLANTS.map((i) => ({ ...i, route: 'sea_4' })), SEA_ARCHETYPE_IMPLANT]
const ARCHETYPES = [...BASE_ARCHETYPES, ...NEW_ARCHETYPES, SEA_ARCHETYPE]
const COMPANIONS = [...BASE_COMPANIONS, ...NEW_COMPANIONS, ...SEA_COMPANIONS].map((c) => ({ ...c, stats: { ...COMPANION_STATS, ...SEA_COMPANION_STATS }[c.id] }))
const ENEMIES = [...BASE_ENEMIES, ...GLASS_ENEMIES, ...MACHINE_ENEMIES, ...ORIGIN_ENEMIES, ...OUTSIDE_ENEMIES, ...SEA4_ENEMIES, ...SEA5_ENEMIES, ...SEA6_ENEMIES]
const ENCOUNTERS = [...BASE_ENCOUNTERS, ...OUTSIDE_ENCOUNTERS, ...GLASS_ENCOUNTERS, ...MACHINE_ENCOUNTERS, ...ORIGIN_ENCOUNTERS, ...SEA4_ENCOUNTERS, ...SEA5_ENCOUNTERS, ...SEA6_ENCOUNTERS]
const EVENTS = [...BASE_EVENTS, ...OUTSIDE_EVENTS, ...OUTSIDE_ROUTE_EVENTS, ...GLASS_EVENTS, ...MACHINE_EVENTS, ...ORIGIN_EVENTS, ...NEW_COMPANION_EVENTS, ...SEA_SCENES, ...SEA_COMPANION_EVENTS, ...SEA4_EVENTS, ...SEA5_EVENTS, ...SEA6_EVENTS]
const ENDINGS = [...BASE_ENDINGS, ...ORIGIN_ENDINGS, ...SEA_ENDINGS]
const LORE = [...BASE_LORE, ...DEEP_LORE]
const ACTS: Record<ActId, ActDef> = { ...BASE_ACTS, 4: GLASS_ACT, 5: MACHINE_ACT, 6: ORIGIN_ACT }

function byId<T extends { id: string }>(xs: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const x of xs) out[x.id] = x
  return out
}

export const CONTENT: ContentRegistry = {
  cards: byId(CARDS),
  duos: byId([...DUOS, ...SEA_DUOS]),
  evolutions: byId(EVOLUTIONS),
  consumables: byId([...CONSUMABLES, ...SEA_CONSUMABLES.map((c) => ({ ...c, route: 'sea_4' }))]),
  enemies: byId(ENEMIES),
  encounters: byId(ENCOUNTERS),
  implants: byId(IMPLANTS),
  events: byId(EVENTS),
  companions: byId(COMPANIONS),
  archetypes: byId(ARCHETYPES),
  acts: ACTS,
  routes: { [OUTSIDE_ROUTE]: OUTSIDE_ACT, ...SEA_ACTS },
  squadTactics: Object.fromEntries(SQUAD_TACTICS.map((s) => [s.id, s])),
  squadRoles: SQUAD_ROLES,
  residue: RESIDUE,
  gear: byId([...GEAR, ...SEA_GEAR.map((g) => ({ ...g, route: 'sea_4' }))]),
  endings: byId(ENDINGS),
  unlocks: byId(UNLOCKS),
  paradox: PARADOX,
  lore: byId(LORE),
  ixLines: IX_LINES,
  crpg: CRPG,
  echoes: ECHOES,
  thoughts: THOUGHTS,
  intros: COMPANION_INTROS,
  achievements: byId(buildAchievements(ARCHETYPES, COMPANIONS)),
  // Balance 2026-10-25 (docs/plans/2026-10-25-argon-review-and-s-rank-plan.md): the 5-stat perks, Evade/Crit and the
  // larger card/implant pool made the party much stronger than the authored enemy numbers assumed.
  tuning: { enemyHpPct: 13, eliteHpPct: 20, bossHpPct: -10, dmgFromAct: 1, rage: { elite: 3, boss: 2, fromTurn: 3 }, acts: { 2: { hpPct: 22, dmg: 1 }, 3: { hpPct: 46, dmg: 3, bossHpPct: -30 }, 4: { hpPct: 130, dmg: 9 }, 5: { hpPct: 190, dmg: 14, bossHpPct: -20 }, 6: { hpPct: 240, dmg: 17, bossHpPct: -70 } }, routes: { [OUTSIDE_ROUTE]: { hpPct: 8 }, sea_4: { bossHpPct: -5, dmg: 5, hpPct: 5 }, sea_5: { bossHpPct: -50, dmg: 9, hpPct: 15 }, sea_6: { bossHpPct: -70, dmg: 12, hpPct: 15 } } },
}

export { CARDS, CONSUMABLES, ENEMIES, ENCOUNTERS, IMPLANTS, COMPANIONS, ARCHETYPES }
export { EVENTS, LORE, ENDINGS, IX_LINES, ACTS, UNLOCKS, PARADOX }
export { encountersFor } from './encounters.ts'
