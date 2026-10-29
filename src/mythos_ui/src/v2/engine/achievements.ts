// Mythos 2.0 — achievements: which ones a banked run earns (content/achievements.ts holds the list).
//
// Pure. Checked once per run inside applyRunEnd (engine/meta.ts) against the profile *after*
// banking, so profile totals already include the run. Earlier progress counts too: a profile
// from before achievements earns everything it already qualifies for on its next banked run.

import type { AchievementCond, AchievementDef, ContentRegistry, MetaProfile, RunState } from './types.ts'

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
    case 'ending':
      return profile.endingsSeen.includes(when.id)
    case 'archetypeWin':
      return (profile.archetypeWins?.[when.id] ?? 0) > 0
    case 'companionWin':
      return (profile.companionWins?.[when.id] ?? 0) > 0
    case 'dailyDays':
      return Object.keys(profile.daily ?? {}).length >= when.n
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
