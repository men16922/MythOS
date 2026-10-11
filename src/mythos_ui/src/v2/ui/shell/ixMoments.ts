// Mythos 2.0 — which combat moments IX comments on. Pure: diffs two CombatStates of the same fight (the ones
// GameShell receives through onCombatChange) and never reads or touches the combat UI.

import type { CombatEvent, CombatState, ContentRegistry, Lang, UnitState } from '../../engine/types.ts'
import type { IxTrigger } from '../../net/api.ts'
import { tr } from '../common/lang.ts'
import type { IxNames } from './talkLines.ts'

export interface IxMoment {
  trigger: IxTrigger
  /** Higher wins when several land in one action, or when a queued line is still waiting to show. */
  priority: number
  names: IxNames
  /** Extra LLM context (localised). */
  context: Record<string, string | number>
  /** The moment came out of an enemy phase: show it only once the player's next turn has settled. */
  afterEnemyPhase: boolean
}

/** Per-fight bookkeeping (one per encounter). */
export interface FightMemo {
  encounterId: string
  envKill: boolean
  lowHp: boolean
  companionDowns: number
  /** Player turn of the last line shown/queued (rate limit: one line per two player turns). */
  lastLineTurn: number | null
}

export const IX_PRIORITY: Record<IxTrigger, number> = {
  boss_phase: 6,
  companion_down: 5,
  flawless: 5,
  low_hp: 4,
  boss_start: 4,
  elite_start: 3,
  multi_kill: 2,
  env_kill: 1,
}

type DeathEvent = Extract<CombatEvent, { t: 'death' }>

export const LOW_HP = 0.3
const LOW_HP_REARM = 0.4

function connectorRatio(c: CombatState): number {
  const u = c.units.find((x) => x.uid === 'connector')
  return u ? u.hp / Math.max(1, u.maxHp) : 1
}

/** A fight that has not been played yet (fresh mount, not a mid-fight reload). */
export function isFreshFight(c: CombatState): boolean {
  return c.phase === 'player' && c.turn === 1 && !c.events.some((e) => e.t === 'card') && c.stats.cardsPlayed === 0
}

export function newMemo(c: CombatState): FightMemo {
  const r = connectorRatio(c)
  return { encounterId: c.encounterId, envKill: c.stats.environmentKills > 0, lowHp: r < LOW_HP, companionDowns: 0, lastLineTurn: null }
}

/** Rate limit: at most one IX line per two player turns within a fight. */
export function turnAllows(memo: FightMemo, turn: number): boolean {
  return memo.lastLineTurn === null || turn - memo.lastLineTurn >= 2
}

function moment(trigger: IxTrigger, names: IxNames, context: Record<string, string | number>, afterEnemyPhase = false): IxMoment {
  return { trigger, priority: IX_PRIORITY[trigger], names, context, afterEnemyPhase }
}

/**
 * The most notable IX moment in `next` (null if none). `prev` is the previous state of the same fight, or null
 * when `next` is the first one seen. Updates `memo` (first env kill, low-HP latch, companion downs).
 */
export function detectMoment(prev: CombatState | null, next: CombatState, C: ContentRegistry, lang: Lang, memo: FightMemo): IxMoment | null {
  // A lost fight hands straight over to the ending; IX has its say there.
  if (next.phase === 'lost') return null
  const enc = C.encounters[next.encounterId]
  const base: Record<string, string | number> = { act: enc?.act ?? 1 }
  const tierOf = (u: UnitState | undefined) => (u ? C.enemies[u.defId]?.tier : undefined)
  const bossUnit = (units: UnitState[]) => units.find((u) => u.side === 'enemy' && tierOf(u) === 'boss')

  if (!prev) {
    if (!isFreshFight(next) || (enc?.kind !== 'elite' && enc?.kind !== 'boss')) return null
    if (enc.kind === 'boss') {
      const boss = tr(bossUnit(next.units)?.name, lang) || tr(enc.name, lang)
      return moment('boss_start', { boss }, { ...base, boss })
    }
    const elite = next.units.find((u) => u.side === 'enemy' && tierOf(u) === 'elite')
    const enemy = tr(elite?.name, lang) || tr(enc.name, lang)
    return moment('elite_start', { enemy }, { ...base, enemy })
  }

  const fresh = next.events.slice(prev.events.length)
  const endTurn = fresh.some((e) => e.t === 'turn' && e.side === 'enemy')
  const before = new Map(prev.units.map((u) => [u.uid, u]))
  const unit = (uid: string) => before.get(uid) ?? next.units.find((u) => u.uid === uid)
  const found: IxMoment[] = []

  for (const e of fresh) {
    if (e.t === 'phase' && tierOf(unit(e.uid)) === 'boss') {
      const boss = tr(unit(e.uid)?.name, lang)
      found.push(moment('boss_phase', { boss }, { ...base, boss, phaseText: tr(e.text, lang) }, endTurn))
    }
    if (e.t === 'death') {
      const u = unit(e.uid)
      if (u && u.side === 'party' && u.uid !== 'connector') {
        memo.companionDowns += 1
        const companion = tr(u.name, lang)
        found.push(moment('companion_down', { companion }, { ...base, companion }, endTurn))
      }
    }
  }

  if (next.phase === 'won' && prev.phase === 'player') {
    const conn = next.units.find((u) => u.uid === 'connector')
    const cap = Math.max(2, Math.round((conn?.maxHp ?? 30) * 0.1))
    const hardFight = enc?.kind === 'elite' || enc?.kind === 'boss' || next.turn >= 3
    if (hardFight && next.stats.damageTaken <= cap && memo.companionDowns === 0) found.push(moment('flawless', {}, { ...base }))
  }

  const ratio = connectorRatio(next)
  if (ratio >= LOW_HP_REARM) memo.lowHp = false
  if (next.phase === 'player' && !memo.lowHp && ratio < LOW_HP && ratio > 0) {
    memo.lowHp = true
    found.push(moment('low_hp', {}, { ...base }, endTurn))
  }

  const kills = next.stats.enemiesKilled - prev.stats.enemiesKilled
  if (!endTurn && kills >= 2) found.push(moment('multi_kill', {}, { ...base }))

  if (!memo.envKill && next.stats.environmentKills > prev.stats.environmentKills) {
    memo.envKill = true
    const deaths = fresh.filter((e): e is DeathEvent => e.t === 'death' && e.cause !== 'collapse' && unit(e.uid)?.side === 'enemy')
    const victim = deaths.find((e) => e.cause === 'void') ?? deaths[0]
    const enemy = victim ? tr(unit(victim.uid)?.name, lang) : ''
    found.push(moment('env_kill', enemy ? { enemy } : {}, enemy ? { ...base, enemy } : { ...base }, endTurn))
  }

  return found.reduce<IxMoment | null>((best, m) => (!best || m.priority > best.priority ? m : best), null)
}
