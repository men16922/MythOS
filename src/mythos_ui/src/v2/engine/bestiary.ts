// Mythos 2.0 — the codex of things met (DLC plan §11 "도감"): enemies seen / killed and cards ever owned.
//
// Pure helpers. A run collects into `run.bestiary` (enemy id → kills, 0 = seen only) and `run.cardsSeen`;
// applyRunEnd (engine/meta.ts) folds both into the profile. Only enemies that some encounter can field
// count toward the bestiary, so completing it is always possible.

import type { CombatState, ContentRegistry, EncounterDef, RunState } from './types.ts'

/** Card rarities the card codex lists (special = companion / archetype / act gifts, not collectible). */
export const CODEX_RARITIES: ReadonlySet<string> = new Set(['starter', 'common', 'uncommon', 'rare'])

function encounterEnemies(e: EncounterDef): string[] {
  return [...e.enemies.map((x) => x.id), ...(e.reinforcements ?? []).flatMap((r) => r.enemies.map((x) => x.id))]
}

/** Every enemy an encounter can field (directly, as reinforcements or summoned), in content order. */
export function bestiaryIds(C: ContentRegistry): string[] {
  const found = new Set<string>()
  const queue = Object.values(C.encounters).flatMap(encounterEnemies)
  while (queue.length > 0) {
    const id = queue.pop() as string
    const def = C.enemies[id]
    if (!def || found.has(id)) continue
    found.add(id)
    for (const m of def.moves) if (m.summon) queue.push(m.summon.enemyId)
  }
  return Object.keys(C.enemies).filter((id) => found.has(id))
}

/** Cards the card codex lists, in content order. */
export function codexCardIds(C: ContentRegistry): string[] {
  return Object.values(C.cards)
    .filter((c) => CODEX_RARITIES.has(c.rarity))
    .map((c) => c.id)
}

/** After a fight (any outcome): mark its enemies seen and add its kills. Mutates `run`. */
export function noteFightBestiary(run: RunState, combat: CombatState, C: ContentRegistry): void {
  const seen = { ...(run.bestiary ?? {}) }
  const enc = C.encounters[combat.encounterId]
  const met = [...(enc ? encounterEnemies(enc) : []), ...combat.units.filter((u) => u.side === 'enemy').map((u) => u.defId)]
  for (const id of met) if (C.enemies[id]) seen[id] = seen[id] ?? 0
  for (const [id, n] of Object.entries(combat.killed ?? {})) seen[id] = (seen[id] ?? 0) + n
  run.bestiary = seen
}

/** Profile merge: kill counts add up, seen-only entries stay at 0. */
export function mergeBestiary(prev: Record<string, number> | undefined, run: Record<string, number> | undefined): Record<string, number> {
  const out = { ...(prev ?? {}) }
  for (const [id, n] of Object.entries(run ?? {})) out[id] = (out[id] ?? 0) + n
  return out
}
