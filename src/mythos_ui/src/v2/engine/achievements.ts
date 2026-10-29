// Mythos 2.0 — achievements: which ones a banked run earns (content/achievements.ts holds the list).
//
// Pure. Checked once per run inside applyRunEnd (engine/meta.ts) against the profile *after*
// banking, so profile totals already include the run. Earlier progress counts too: a profile
// from before achievements earns everything it already qualifies for on its next banked run.

import { bestiaryIds, codexCardIds } from './bestiary.ts'
import type { AchievementCond, AchievementDef, CombatState, ContentRegistry, MetaProfile, NodeKind, RunState } from './types.ts'

/** Run flags for fight-level feats (set by run.updateCombat on a win; read by `runFlag` conditions). */
export const FEAT_BOSS_FLAWLESS = 'feat_boss_flawless' // bosses beaten without the connector losing HP
export const FEAT_FIGHT_TERRAIN = 'feat_fight_terrain' // most terrain kills in one fight
export const FEAT_BURSTS = 'feat_bursts' // fights won with a Signal Burst or companion ultimate fired

/** Record a won fight's feats into run flags. Mutates `run`. */
export function noteFightFeats(run: RunState, combat: CombatState, nodeKind: NodeKind): void {
  const f = run.flags
  if (nodeKind === 'boss' && combat.stats.damageTaken === 0) f[FEAT_BOSS_FLAWLESS] = (f[FEAT_BOSS_FLAWLESS] ?? 0) + 1
  if (combat.stats.environmentKills > (f[FEAT_FIGHT_TERRAIN] ?? 0)) f[FEAT_FIGHT_TERRAIN] = combat.stats.environmentKills
  if (combat.burstUsed) f[FEAT_BURSTS] = (f[FEAT_BURSTS] ?? 0) + 1
}

function won(run: RunState): boolean {
  return run.screen.kind === 'ended' && run.screen.result === 'victory'
}

function atLeast(have: number, n: number | 'all', all: number): boolean {
  return have >= (n === 'all' ? all : n)
}

/** Does `profile` (already banked) plus the ended `run` meet `when`? */
export function meets(when: AchievementCond, profile: MetaProfile, run: RunState, C: ContentRegistry): boolean {
  switch (when.kind) {
    case 'loops':
      return profile.loops >= when.n
    case 'wins':
      return profile.wins >= when.n
    case 'bestAct':
      return profile.bestAct >= when.n
    case 'records':
      return (profile.records ?? []).length >= when.n
    case 'memories':
      return (profile.cutscenes ?? []).length >= when.n
    case 'codex':
      return atLeast(profile.codex.filter((id) => C.lore[id]).length, when.n, Object.keys(C.lore).length)
    case 'endings':
      return atLeast(profile.endingsSeen.filter((id) => C.endings[id]).length, when.n, Object.keys(C.endings).length)
    case 'companionsMet':
      return atLeast(profile.companionsMet.filter((id) => C.companions[id]).length, when.n, Object.keys(C.companions).length)
    case 'bestiary': {
      const ids = bestiaryIds(C)
      return atLeast(ids.filter((id) => profile.bestiary?.[id] !== undefined).length, when.n, ids.length)
    }
    case 'cardCodex': {
      const ids = codexCardIds(C)
      const seen = new Set(profile.cardsSeen ?? [])
      return atLeast(ids.filter((id) => seen.has(id)).length, when.n, ids.length)
    }
    case 'ending':
      return profile.endingsSeen.includes(when.id)
    case 'archetypeWin':
      return (profile.archetypeWins?.[when.id] ?? 0) > 0
    case 'companionWin':
      return (profile.companionWins?.[when.id] ?? 0) > 0
    case 'dailyDays':
      return Object.keys(profile.daily ?? {}).length >= when.n
    case 'archMastery':
      return Object.values(profile.archetypeWins ?? {}).some((w) => w >= when.wins)
    case 'companionMastery':
      return Object.values(profile.companionWins ?? {}).some((w) => w >= when.wins)
    case 'paradoxWin':
      return won(run) && run.paradox >= when.n
    case 'deepWin':
      return won(run) && run.mode === 'deep'
    case 'dailyWin':
      return won(run) && !!run.daily
    case 'endlessLap':
      return run.mode === 'endless' && (run.lap ?? 0) >= when.n
    case 'runTally':
      return run.tally[when.stat] >= when.min
    case 'flawless':
      return won(run) && run.tally.damageTaken <= when.maxDamage
    case 'leanDeck':
      return won(run) && run.deck.length <= when.maxCards
    case 'runFlag':
      return (run.flags[when.flag] ?? 0) >= when.min
    case 'richWin':
      return won(run) && run.credits >= when.credits
    case 'implantWin':
      return won(run) && run.implants.length >= when.n
    case 'quietWin':
      return won(run) && run.trace <= when.maxTrace
    case 'soloWin':
      return won(run) && run.party.length === 0 && (run.bench ?? []).length === 0
  }
}

/** Achievement ids `run` earns that `profile` does not have yet, in content order. */
export function newAchievements(profile: MetaProfile, run: RunState, C: ContentRegistry): string[] {
  if (run.screen.kind !== 'ended') return []
  const have = new Set(profile.achievements ?? [])
  return Object.values(C.achievements ?? {})
    .filter((a: AchievementDef) => !have.has(a.id) && meets(a.when, profile, run, C))
    .map((a) => a.id)
}
