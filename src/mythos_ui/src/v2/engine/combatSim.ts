// Mythos 2.0 — headless combat bots for balance measurement.
//
// greedy: each step searches (unit × reachable position × card × target) one action deep, scoring the
//         resulting board with `evaluate` (damage/kills/friendly fire now + exact next-phase incoming damage
//         from the visible telegraphs), takes the best positive action, repeats; then repositions idle
//         units out of harm's way.
// basic:  never dodges or blocks — plays the cheapest damaging card at the nearest enemy, moving only to
//         get in range. The gap between the two is the measure of how much skill the combat rewards.

import type { CardInstance, CombatState, ContentRegistry, Effect, PlayTarget, Pos, TargetMode, UnitState } from './types.ts'
import { manhattan, posKey, samePos } from './grid.ts'
import {
  canPlay,
  cardFace,
  consumableTargets,
  endTurnInPlace,
  legalMoves,
  partyOrigins,
  playCardInPlace,
  selectableTargets,
  consumeInPlace,
  type TargetOption,
} from './combat.ts'
import { getUnit, livingEnemies, livingParty, tileAt, unitAt } from './effects.ts'
import { effectiveIntentDamage, findMove, intentGeometry } from './intents.ts'

/**
 * greedy – one-ply exhaustive search (an expert who never misreads a telegraph);
 * basic  – walks in and swings (a player ignoring telegraphs);
 * mixed  – greedy on ~3/4 of turns, basic on the rest (a decent player: reads most telegraphs, blunders some).
 */
export type BotPolicy = 'greedy' | 'basic' | 'mixed'

/** Play the fight to the end (or `maxTurns`) with a bot. The event log of the result is truncated. */
export function autoPlay(c0: CombatState, C: ContentRegistry, policy: BotPolicy, maxTurns = 25): CombatState {
  const c = leanClone(c0)
  while (c.phase === 'player' && c.turn <= maxTurns) {
    if (policy === 'greedy' || (policy === 'mixed' && mixedRoll(c) < 0.75)) greedyTurn(c, C)
    else basicTurn(c, C)
    if (c.phase === 'player') endTurnInPlace(c, C)
    c.events = []
  }
  return c
}

/** Deterministic per-turn coin for the mixed policy (does not advance the combat RNG). */
function mixedRoll(c: CombatState): number {
  let h = (Math.imul(c.turn + 1, 0x9e3779b1) ^ c.rng) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0
  return (h % 1000) / 1000
}

/** Fast deep copy for search (drops the event log and undo snapshot; card instances are immutable and shared). */
export function leanClone(c: CombatState): CombatState {
  const units = c.units.map((u) => {
    const v: UnitState = { ...u, pos: { ...u.pos }, statuses: { ...u.statuses } }
    if (u.intent) v.intent = { ...u.intent, ...(u.intent.target ? { target: { ...u.intent.target } } : {}) }
    if (u.cooldowns) v.cooldowns = { ...u.cooldowns }
    return v
  })
  const out: CombatState = {
    ...c,
    tiles: c.tiles.map((row) => row.map((t) => ({ ...t }))),
    units,
    draw: c.draw.slice(),
    hand: c.hand.slice(),
    discard: c.discard.slice(),
    exhaust: c.exhaust.slice(),
    events: [],
    incoming: c.incoming.slice(),
    undo: null,
    implants: c.implants.slice(),
    consumables: c.consumables.slice(),
    triggered: { ...c.triggered },
    stats: { ...c.stats },
  }
  if (c.bonus) out.bonus = { ...c.bonus }
  return out
}

function moveInPlace(c: CombatState, uid: string, to: Pos): void {
  const u = getUnit(c, uid)
  if (!u) return
  u.pos = { ...to }
  u.moved = true
}

function toTarget(o: TargetOption): PlayTarget {
  const t: PlayTarget = {}
  if (o.pos) t.pos = o.pos
  if (o.dir) t.dir = o.dir
  return t
}

// ---------------------------------------------------------------- evaluation

/** Damage each unit would take in the next enemy phase from the visible telegraphs, hazards and burn. */
export function incomingDamage(c: CombatState, C: ContentRegistry): Map<string, number> {
  const inc = new Map<string, number>()
  const addTo = (u: UnitState, n: number) => inc.set(u.uid, (inc.get(u.uid) ?? 0) + n)
  for (const e of livingEnemies(c)) {
    const intent = e.intent
    if (!intent || intent.windupLeft > 0 || (e.statuses.shock ?? 0) > 0) continue
    const move = findMove(C, e, intent.moveId)
    if (!move) continue
    const dmg = effectiveIntentDamage(e, move)
    const hasRider = move.pattern === 'charge' || (move.effects ?? []).some((x) => x.kind === 'push')
    for (const p of intentGeometry(c, e, move, intent).tiles) {
      const v = unitAt(c, p)
      if (!v || v === e) continue
      const n = Math.max(0, dmg - v.armor) + (dmg > 0 ? (v.statuses.mark ?? 0) : 0) + (hasRider ? 0.5 : 0)
      if (n > 0) addTo(v, n)
    }
  }
  for (const u of c.units) {
    if (u.hp <= 0) continue
    if (!u.flying && tileAt(c, u.pos)?.kind === 'hazard') addTo(u, 2)
    if (u.side !== 'enemy' && (u.statuses.burn ?? 0) > 0) addTo(u, u.statuses.burn ?? 0)
  }
  return inc
}

/** Highest damage among an enemy's moves (its threat level). */
function dangerOf(C: ContentRegistry, e: UnitState): number {
  let best = 0
  for (const m of C.enemies[e.defId]?.moves ?? []) best = Math.max(best, effectiveIntentDamage(e, m))
  return best
}

/** Static board score from the party's point of view. */
export function evaluate(c: CombatState, C: ContentRegistry): number {
  if (c.phase === 'lost') return -1e6
  let s = 0
  for (const u of livingParty(c)) {
    const conn = u.uid === 'connector'
    s += u.hp * (conn ? 1.5 : 0.8) + (conn ? 0 : 8)
    s += (u.statuses.guard ?? 0) * 3 + (u.statuses.thorns ?? 0)
  }
  for (const u of c.units) if (u.side === 'neutral' && u.hp > 0) s += u.hp * 1.2 + 10
  if (c.phase === 'won') return 1e5 + s
  const enemies = livingEnemies(c)
  for (const e of enemies) {
    // Dangerous enemies are worth more per hp: every turn they live they swing again.
    const w = 1 + 0.08 * dangerOf(C, e)
    s -= (e.hp + 8) * w
    s += (Math.min(e.statuses.burn ?? 0, e.hp) * 0.7 + (e.statuses.mark ?? 0) * 0.5) * w
  }
  const inc = incomingDamage(c, C)
  for (const u of c.units) {
    if (u.hp <= 0) continue
    const raw = inc.get(u.uid) ?? 0
    if (raw <= 0) continue
    if (u.side === 'enemy') {
      s += Math.min(raw, u.hp) * 0.8 + (raw >= u.hp ? 6 : 0)
      continue
    }
    const d = Math.max(0, raw - u.block)
    if (d <= 0) continue
    if (u.uid === 'connector') s -= d >= u.hp ? 5e4 : d * 1.5
    else if (u.side === 'party') s -= d >= u.hp ? u.hp * 0.8 + 10 : d * 0.8
    else s -= d >= u.hp ? u.hp * 1.2 + 12 : d * 1.2
  }
  // Gentle pull toward the fight so idle units close distance.
  for (const u of livingParty(c)) {
    let dmin = 99
    for (const e of enemies) dmin = Math.min(dmin, manhattan(u.pos, e.pos))
    if (dmin < 99) s -= 0.15 * Math.max(0, dmin - 2)
  }
  return s
}

// ---------------------------------------------------------------- greedy

interface Action {
  score: number
  apply: (c: CombatState) => void
}

function damages(effects: readonly Effect[]): boolean {
  return effects.some((e) => e.kind === 'damage' && e.amount > 0)
}

/** Positions worth trying before playing a card of this targeting mode (aligned/adjacent/in-range to an enemy). */
function usefulPositions(c: CombatState, u: UnitState, mode: TargetMode, threat: Map<string, number>): Pos[] {
  if (u.moved) return []
  const moves = legalMoves(c, u.uid)
  const enemies = livingEnemies(c)
  const ok = (p: Pos): boolean => {
    switch (mode.mode) {
      case 'melee':
        return enemies.some((e) => manhattan(p, e.pos) === 1)
      case 'line':
      case 'beam':
        return enemies.some((e) => (e.pos.x === p.x || e.pos.y === p.y) && manhattan(p, e.pos) <= mode.range)
      case 'lob':
        return enemies.some((e) => {
          const d = manhattan(p, e.pos)
          return d >= mode.minRange && d <= mode.range
        })
      default:
        return false
    }
  }
  return moves
    .filter(ok)
    .sort((a, b) => (threat.get(posKey(a)) ?? 0) - (threat.get(posKey(b)) ?? 0) || manhattan(a, u.pos) - manhattan(b, u.pos))
    .slice(0, 8)
}

function threatByTile(c: CombatState, C: ContentRegistry): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of livingEnemies(c)) {
    if (!e.intent || e.intent.windupLeft > 1) continue
    const move = findMove(C, e, e.intent.moveId)
    if (!move) continue
    for (const p of intentGeometry(c, e, move, e.intent).tiles) out.set(posKey(p), (out.get(posKey(p)) ?? 0) + effectiveIntentDamage(e, move))
  }
  return out
}

function bestCardAction(c: CombatState, C: ContentRegistry, base: number): Action | undefined {
  let best: Action | undefined
  const threat = threatByTile(c, C)
  const seen = new Set<string>()
  for (const card of c.hand) {
    const def = C.cards[card.defId]
    if (!def) continue
    // Identical copies of a card produce identical outcomes; search one of them.
    const sig = `${card.defId}|${card.upgraded}`
    if (seen.has(sig)) continue
    seen.add(sig)
    const face = cardFace(def, card.upgraded)
    for (const uid of partyOrigins(c, C, card.uid)) {
      if (!canPlay(c, C, card.uid, uid).ok) continue
      const u = getUnit(c, uid)
      if (!u) continue
      const spots: (Pos | null)[] = [null, ...usefulPositions(c, u, face.target, threat)]
      for (const spot of spots) {
        let s1 = c
        if (spot) {
          s1 = leanClone(c)
          moveInPlace(s1, uid, spot)
        }
        for (const opt of selectableTargets(s1, C, card.uid, uid)) {
          const s2 = leanClone(s1)
          const tgt = toTarget(opt)
          try {
            playCardInPlace(s2, C, card.uid, uid, tgt)
          } catch {
            continue
          }
          const tempo = 2 * (s2.hand.length - c.hand.length + 1) + 2.5 * (s2.energy - c.energy + face.cost)
          const score = evaluate(s2, C) - base + tempo - 0.25 * face.cost - (spot ? 0.05 : 0)
          if (!best || score > best.score) {
            const cardUid = card.uid
            best = {
              score,
              apply: (st) => {
                if (spot) moveInPlace(st, uid, spot)
                playCardInPlace(st, C, cardUid, uid, tgt)
              },
            }
          }
        }
      }
    }
  }
  return best
}

function bestConsumableAction(c: CombatState, C: ContentRegistry, base: number): Action | undefined {
  let best: Action | undefined
  c.consumables.forEach((_, index) => {
    for (const u of livingParty(c)) {
      for (const opt of consumableTargets(c, C, index, u.uid)) {
        const s2 = leanClone(c)
        const tgt = toTarget(opt)
        try {
          consumeInPlace(s2, C, index, u.uid, tgt)
        } catch {
          continue
        }
        // Keep items for when they matter: demand a clear gain.
        const score = evaluate(s2, C) - base - 6
        if (!best || score > best.score) best = { score, apply: (st) => consumeInPlace(st, C, index, u.uid, tgt) }
      }
    }
  })
  return best
}

function reposition(c: CombatState, C: ContentRegistry): void {
  for (const u of livingParty(c)) {
    if (u.moved || c.phase !== 'player') continue
    let bestPos: Pos | null = null
    let bestScore = evaluate(c, C)
    for (const p of legalMoves(c, u.uid)) {
      const s = leanClone(c)
      moveInPlace(s, u.uid, p)
      const v = evaluate(s, C)
      if (v > bestScore + 0.01) {
        bestScore = v
        bestPos = p
      }
    }
    if (bestPos) moveInPlace(c, u.uid, bestPos)
  }
}

export function greedyTurn(c: CombatState, C: ContentRegistry): void {
  for (let step = 0; step < 20 && c.phase === 'player'; step++) {
    const base = evaluate(c, C)
    const card = bestCardAction(c, C, base)
    const item = bestConsumableAction(c, C, base)
    const pick = card && (!item || card.score >= item.score) ? card : item
    if (!pick || pick.score <= 0.1) break
    pick.apply(c)
  }
  if (c.phase === 'player') reposition(c, C)
}

// ---------------------------------------------------------------- basic

function nearestEnemy(c: CombatState, from: Pos): UnitState | undefined {
  let best: UnitState | undefined
  for (const e of livingEnemies(c)) if (!best || manhattan(from, e.pos) < manhattan(from, best.pos)) best = e
  return best
}

function basicPlay(c: CombatState, C: ContentRegistry, card: CardInstance): boolean {
  for (const uid of partyOrigins(c, C, card.uid)) {
    if (!canPlay(c, C, card.uid, uid).ok) continue
    const u = getUnit(c, uid)
    if (!u) continue
    const target = nearestEnemy(c, u.pos)
    if (!target) return false
    const hits = (st: CombatState) => selectableTargets(st, C, card.uid, uid).find((o) => o.tiles.some((p) => samePos(p, target.pos)))
    let opt = hits(c)
    if (!opt && !u.moved) {
      const spots = legalMoves(c, uid).sort((a, b) => manhattan(a, target.pos) - manhattan(b, target.pos))
      for (const p of spots) {
        const s = leanClone(c)
        moveInPlace(s, uid, p)
        const o = hits(s)
        if (o) {
          moveInPlace(c, uid, p)
          opt = o
          break
        }
      }
    }
    if (opt) {
      playCardInPlace(c, C, card.uid, uid, toTarget(opt))
      return true
    }
  }
  return false
}

export function basicTurn(c: CombatState, C: ContentRegistry): void {
  for (let step = 0; step < 20 && c.phase === 'player'; step++) {
    const options = c.hand
      .flatMap((card) => {
        const def = C.cards[card.defId]
        if (!def) return []
        const face = cardFace(def, card.upgraded)
        return face.cost >= 0 && face.cost <= c.energy && damages(face.effects) ? [{ card, cost: face.cost }] : []
      })
      .sort((a, b) => a.cost - b.cost)
    let played = false
    for (const { card } of options) {
      if (basicPlay(c, C, card)) {
        played = true
        break
      }
    }
    if (!played) break
  }
  // Walk toward the nearest enemy if nobody is in range (no dodging).
  for (const u of livingParty(c)) {
    if (u.moved) continue
    const target = nearestEnemy(c, u.pos)
    if (!target || manhattan(u.pos, target.pos) <= 1) continue
    const spots = legalMoves(c, u.uid).sort((a, b) => manhattan(a, target.pos) - manhattan(b, target.pos))
    const p = spots[0]
    if (p && manhattan(p, target.pos) < manhattan(u.pos, target.pos)) moveInPlace(c, u.uid, p)
  }
}
