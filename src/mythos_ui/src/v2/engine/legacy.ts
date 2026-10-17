// Mythos 2.0 — what a loop carries into the next one (plan: docs/plans/2026-10-18-tiers-and-ai-narrative.md N2/N5).
//
//   Echo inscription (1.x `echoes.py`): at loop start the player may inscribe one of up to three echoes offered by the
//   last normal loop (how it ended, who came along, how deep it went) for a small run-start effect.
//   Autonomy (1.x `determine_autonomy_level`): the more lore the Connector has found across loops, the more the grid
//   bends — Improvise checks get easier, each new act starts quieter, and at the top a growth point to start with.
//
// Both are frozen into the run at newRun and never apply to a daily (it must be the same run for everyone).
import type { ContentRegistry, EchoDef, EchoSource, MetaProfile, RunEffect, RunRecord, RunState } from './types.ts'

/** Lore entries (profile.codex) needed for autonomy levels 1, 2 and 3. */
export const AUTONOMY_STEPS = [6, 12, 18] as const
export const MAX_ECHO_OFFERS = 3
/** Placeholder companion id in a 'companion' echo's bond effect (newRun swaps in the last loop's companion). */
export const ECHO_COMPANION = '$last_companion'
/** Autonomy 1+: Improvise DCs are this much lower. */
export const AUTONOMY_IMPROVISE_DC = 1
/** Autonomy 2+: Trace scrubbed at the start of acts 2 and 3. */
export const AUTONOMY_ACT_SCRUB = 5

export function autonomyLevel(profile: Pick<MetaProfile, 'codex'>): number {
  return AUTONOMY_STEPS.filter((step) => profile.codex.length >= step).length
}

/** The lore needed for the next autonomy level (null at the top). */
export function nextAutonomyStep(profile: Pick<MetaProfile, 'codex'>): number | null {
  return AUTONOMY_STEPS.find((step) => profile.codex.length < step) ?? null
}

function lastLoop(profile: Pick<MetaProfile, 'history'>): RunRecord | undefined {
  return profile.history.find((r) => !r.daily)
}

function sourcesOf(r: RunRecord): Set<EchoSource> {
  const out = new Set<EchoSource>(['any'])
  if (r.result === 'defeat') out.add('fell')
  if (r.result === 'victory') out.add('won')
  if (r.result === 'abandoned') out.add('abandoned')
  if (r.party.length > 0) out.add('companion')
  if (r.act >= 2) out.add('deep')
  return out
}

/** Echoes the last normal loop offers (most specific first, at most three). Empty on a first loop. */
export function echoOffers(profile: Pick<MetaProfile, 'history'>, C: ContentRegistry): EchoDef[] {
  const last = lastLoop(profile)
  if (!last || !C.echoes) return []
  const have = sourcesOf(last)
  const specific = C.echoes.filter((e) => e.source !== 'any' && have.has(e.source))
  const general = C.echoes.filter((e) => e.source === 'any')
  return [...specific, ...general].slice(0, MAX_ECHO_OFFERS)
}

/** The companion an echo of source 'companion' speaks of: the last loop's first companion. */
export function echoCompanion(profile: Pick<MetaProfile, 'history'>): string | undefined {
  return lastLoop(profile)?.party[0]
}

/** An echo's effects with the companion placeholder resolved (dropped when the last loop had nobody). */
export function echoEffects(echo: EchoDef, profile: Pick<MetaProfile, 'history'>): RunEffect[] {
  const mate = echoCompanion(profile)
  return echo.effects.flatMap((e): RunEffect[] => (e.kind === 'bond' && e.id === ECHO_COMPANION ? (mate ? [{ ...e, id: mate }] : []) : [e]))
}

/** Improvise DC reduction from autonomy. */
export function autonomyDc(run: Pick<RunState, 'autonomy'>): number {
  return (run.autonomy ?? 0) >= 1 ? AUTONOMY_IMPROVISE_DC : 0
}
