// Mythos 2.0 — combat engine public API ("Breach Protocol", design doc §4).
//
// Every exported reducer is pure: it clones the incoming CombatState, mutates the clone through
// effects.ts / intents.ts and returns it. Invalid actions (unplayable card, illegal target or move)
// throw — the UI gates them with canPlay / selectableTargets / legalMoves first.
//
// Turn flow: player turn (each unit moves once, then acts — firing a targeted card roots it) → endTurn → enemy phase
//   a. enemy block clears, intents fire in uid order (shock = fizzle, windup counts down)
//   b. burn ticks, hazard damage, enemy statuses decay, reinforcements arrive
//   c. enemies without a pending windup move and telegraph (and next reinforcements are announced)
//   d. win/lose → next player turn (party block clears, guard, energy, draw, turn_start triggers)

import type { UnitStateExt } from './effects.ts'
import { implantRules } from './implantRules.ts'
import { mutatorCombat, mutatorMods } from './mutators.ts'
import { worldEchoOf } from './legacy.ts'
import type {
  DuoDef,
  CardDef,
  CardFace,
  CardInstance,
  CombatState,
  ContentRegistry,
  Dir,
  Effect,
  EncounterDef,
  EnemyMove,
  PlayTarget,
  Pos,
  BurstDef,
  RunState,
  StatusKind,
  TargetMode,
  Text,
  Tile,
  UnitState,
} from './types.ts'
import { GRID_H, GRID_W } from './types.ts'
import { DIRS, add, allTiles, dirToward, inBounds, manhattan, posKey, rayTiles, samePos } from './grid.ts'
import { pick, shuffle } from './rng.ts'
import { combatSeeds, combatStream } from './streams.ts'
import {
  BLOCKED_ARRIVAL_DAMAGE,
  COVER_HP,
  HAZARD_DAMAGE,
  type CombatScaling,
  type CombatStateExt,
  type Resolution,
  activePassive,
  addStatus,
  hazardDamage,
  MOMENTUM_MAX,
  MOMENTUM_TURN,
  gainMomentum,
  perksOf,
  sprintEvade,
  applyEffects,
  byUid,
  checkEnd,
  connectorOf,
  dealDamage,
  decayGround,
  decayStatus,
  enterGround,
  FIRE_BURN,
  igniteStanding,
  drawCards,
  effectTargets,
  effectTiles,
  emit,
  fireTrigger,
  gainBlock,
  getUnit,
  isStandable,
  livingEnemies,
  livingParty,
  nearestFreeTile,
  pruneTurnKeys,
  scopeOf,
  spawnEnemy,
  tickMoveBleed,
  tileAt,
  unitAt,
  winCombat,
} from './effects.ts'
import { effectiveIntentDamage, enemiesTelegraph, findMove, fireIntent, intentGeometry } from './intents.ts'

export { tileAt, unitAt, getUnit, livingEnemies, livingParty, connectorOf } from './effects.ts'
export { effectiveIntentDamage, intentGeometry } from './intents.ts'

export interface TargetOption {
  pos?: Pos
  dir?: Dir
  /** Everything the play affects (for highlighting). */
  tiles: Pos[]
}

export interface CombatPreview {
  units: { uid: string; hpBefore: number; hpAfter: number; blockAfter: number; dies: boolean; to?: Pos }[]
}

export interface IntentInfo {
  move: EnemyMove
  /** Tiles that take the hit, recomputed from the enemy's current position/facing. */
  tiles: Pos[]
  /** Travel lane for line/beam/charge (arrow drawing). */
  path: Pos[]
  damage: number
  windupLeft: number
  dir?: Dir
  /** Lob target tile. */
  target?: Pos
  /** Track (homing lock-on) target unit. */
  targetUid?: string
}

const T = (ko: string, en: string): Text => ({ ko, en })
const REASON = {
  over: T('전투가 끝났다', 'The fight is over'),
  cardLimit: T('이번 턴에 더 쓸 수 없다', 'No more cards this turn'),
  noCard: T('손에 없는 카드', 'Card not in hand'),
  junk: T('사용할 수 없는 카드', 'This card cannot be played'),
  noOrigin: T('행동할 수 없는 대원', 'That unit cannot act'),
  stunned: T('기절해 있다', 'Stunned'),
  connectorOnly: T('접속자만 쓸 수 있다', 'Only the Connector can use this'),
  downed: T('주인이 쓰러져 있다', 'Its owner is down'),
  wrongOwner: T('다른 대원의 카드', "Another member's card"),
  energy: T('에너지 부족', 'Not enough energy'),
  noTarget: T('대상이 없다', 'No valid target'),
}

const PREFERRED_COMPANION_TILES: Pos[] = [
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 2 },
  { x: 0, y: 1 },
  { x: 0, y: 3 },
  { x: 1, y: 0 },
  { x: 1, y: 4 },
  { x: 0, y: 0 },
  { x: 0, y: 4 },
]

function clone(c: CombatState): CombatState {
  return structuredClone(c)
}

function requirePlayer(c: CombatState): void {
  if (c.phase !== 'player') throw new Error('combat is over')
}

// ---------------------------------------------------------------- setup

/** Endless Signal escalation per lap (the expert ceiling: greedy bot measured to fall within a few laps). */
export const ENDLESS_HP_PER_LAP = 60
export const ENDLESS_DMG_PER_LAP = 3

function scalingFor(run: RunState, C: ContentRegistry): CombatScaling {
  const hunted = run.trace >= 66
  const alert = run.trace >= 33
  const mut = mutatorMods(run)
  const tune = C.tuning
  const actTune = tune?.acts?.[run.act]
  const lap = run.lap ?? 0 // Endless Signal laps: +40 % HP, +2 damage, Rage a turn earlier and +1 stronger each
  return {
    hpPct: (tune?.enemyHpPct ?? 0) + (actTune?.hpPct ?? 0) + ENDLESS_HP_PER_LAP * lap + (hunted ? 25 : alert ? 15 : 0) + (mut.enemyHpPct ?? 0),
    elitePct: (tune?.eliteHpPct ?? 0) + (run.paradox >= 1 ? 20 : 0) + (mut.eliteHpPct ?? 0),
    dmg: (implantRules(run, C).enemyAttackBonus ?? 0) + (tune && run.act >= tune.dmgFromAct ? 1 : 0) + (actTune?.dmg ?? 0) + (hunted ? 1 : 0) + (run.paradox >= 4 ? 1 : 0) + (run.paradox >= 10 ? 1 : 0) + ENDLESS_DMG_PER_LAP * lap,
    ...(tune?.eliteDmg ? { eliteDmg: tune.eliteDmg } : {}),
    ...(tune?.bossHpPct || run.paradox >= 8 ? { bossPct: (tune?.bossHpPct ?? 0) + (run.paradox >= 8 ? 20 : 0) } : {}),
    ...(run.paradox >= 6 || lap > 0 ? { rageExtra: (run.paradox >= 6 ? 1 : 0) + lap } : {}),
    ...(tune?.rage ? { rageFrom: Math.max(1, tune.rage.fromTurn - (run.paradox >= 5 ? 1 : 0) - lap) } : {}),
  }
}

function deployTile(c: CombatState, preferred: Pos[]): Pos | undefined {
  for (const p of preferred) if (tileAt(c, p)?.kind === 'floor' && !unitAt(c, p)) return { ...p }
  for (let x = 0; x <= 1; x++) for (let y = 0; y < GRID_H; y++) if (tileAt(c, { x, y })?.kind === 'floor' && !unitAt(c, { x, y })) return { x, y }
  return nearestFreeTile(c, { x: 0, y: 2 })
}

function partyUnit(uid: string, defId: string, name: Text, sprite: string, pos: Pos, hp: number, maxHp: number, move: number): UnitState {
  return { uid, defId, side: 'party', name, sprite, pos, hp, maxHp, block: 0, armor: 0, move, moved: false, facing: 'right', statuses: {}, intent: null }
}

function arriveReinforcements(c: CombatState, C: ContentRegistry, list: { id: string; pos: Pos }[]): void {
  for (const r of list) {
    let at: Pos | undefined = { ...r.pos }
    const occ = unitAt(c, at)
    if (occ) {
      dealDamage(c, C, occ, BLOCKED_ARRIVAL_DAMAGE, { source: 'environment' })
      at = nearestFreeTile(c, at)
    } else if (!isStandable(tileAt(c, at))) {
      at = nearestFreeTile(c, at)
    }
    if (!at) continue
    const u = spawnEnemy(c, C, r.id, at)
    if (u) emit(c, { t: 'spawn', uid: u.uid })
  }
}

/** Reinforcement waves with `turn` N arrive in the enemy phase that ends player turn N-1. */
function wavesArrivingAfter(enc: EncounterDef, playerTurn: number): { id: string; pos: Pos }[] {
  return (enc.reinforcements ?? []).filter((w) => w.turn - 1 === playerTurn).flatMap((w) => w.enemies)
}

function announceIncoming(c: CombatState, enc: EncounterDef): void {
  c.incoming = wavesArrivingAfter(enc, c.turn).map((e) => ({ pos: { ...e.pos }, enemyId: e.id }))
}

/** Elites and bosses grow Rage each enemy phase once the fight drags on (CONTENT.tuning.rage). */
function growRage(c: CombatState, C: ContentRegistry): void {
  const rage = C.tuning?.rage
  const from = (c as CombatStateExt).scaling?.rageFrom ?? rage?.fromTurn ?? Infinity
  if (!rage || c.turn < from) return
  for (const e of livingEnemies(c).sort(byUid)) {
    const tier = C.enemies[e.defId]?.tier
    const extra = (c as CombatStateExt).scaling?.rageExtra ?? 0
    const n = tier === 'boss' ? rage.boss + extra : tier === 'elite' ? rage.elite + extra : 0
    if (n > 0) addStatus(c, e, 'rage', n)
  }
}

/** Block every party unit gets on turn 1 (a world echo); stored as a combat-scoped trigger key. */
const OPENING_BLOCK_KEY = 'c:opening_block'

/**
 * Fight-start effects of the run's stats, mutator and world echo (all frozen on the run, so a fight is a
 * pure function of the run state). The opening board is already placed.
 */
function applyOpeningPerks(c: CombatState, run: RunState, enc: EncounterDef, C: ContentRegistry): void {
  const conn = connectorOf(c)
  const perks = perksOf(c)
  if (conn) {
    conn.move += perks.move
    if (perks.openEvade > 0) addStatus(c, conn, 'evade', perks.openEvade)
    if (perks.openFocus > 0) addStatus(c, conn, 'focus', perks.openFocus)
  }
  const x = c as CombatStateExt
  if (perks.openDraw > 0) x.pendingDraw = (x.pendingDraw ?? 0) + perks.openDraw
  const rules = implantRules(run, C)
  if (conn && rules.openLoseHp) conn.hp = Math.max(1, conn.hp - rules.openLoseHp)
  const mut = mutatorCombat(run)
  for (const [k, n] of Object.entries(mut.openEnemies ?? {}) as [StatusKind, number][]) {
    for (const e of livingEnemies(c)) addStatus(c, e, k, n)
  }
  if (conn) for (const [k, n] of Object.entries(mut.openConnector ?? {}) as [StatusKind, number][]) addStatus(c, conn, k, n)
  const echo = worldEchoOf(run)
  if (echo?.combat?.openingBlock) c.triggered[OPENING_BLOCK_KEY] = echo.combat.openingBlock
  const finalBoss = echo?.combat?.finalBoss
  if (finalBoss && enc.act === 3) {
    for (const e of livingEnemies(c)) {
      if (C.enemies[e.defId]?.tier !== 'boss') continue
      e.armor += finalBoss.armor ?? 0
      if (finalBoss.thorns) addStatus(c, e, 'thorns', finalBoss.thorns)
    }
  }
}

export function startCombat(run: RunState, encounterId: string, C: ContentRegistry): CombatState {
  const enc = C.encounters[encounterId]
  if (!enc) throw new Error(`unknown encounter ${encounterId}`)
  const tiles: Tile[][] = []
  for (let y = 0; y < GRID_H; y++) {
    const row: Tile[] = []
    for (let x = 0; x < GRID_W; x++) row.push({ kind: 'floor' })
    tiles.push(row)
  }
  const hollow = implantRules(run, C).coverToVoid
  for (const t of enc.terrain ?? []) {
    const row = tiles[t.pos.y]
    if (!row || !inBounds(t.pos)) continue
    if (t.kind === 'cover' && hollow) row[t.pos.x] = { kind: 'void' }
    else row[t.pos.x] = t.kind === 'cover' ? { kind: 'cover', hp: COVER_HP } : { kind: t.kind }
  }
  const c: CombatStateExt = {
    encounterId,
    turn: 1,
    phase: 'player',
    tiles,
    units: [],
    draw: [],
    hand: [],
    discard: [],
    exhaust: [],
    energy: 0,
    maxEnergy: 3,
    handSize: 5,
    ...combatSeeds(run, encounterId),
    events: [],
    incoming: [],
    undo: null,
    credits: 0,
    trace: 0,
    implants: run.implants.slice(),
    consumables: run.consumables.slice(),
    uidCounter: 0,
    triggered: {},
    stats: { enemiesKilled: 0, environmentKills: 0, damageDealt: 0, damageTaken: 0, cardsPlayed: 0 },
    scaling: scalingFor(run, C),
    runStats: { ...run.stats },
    archetype: run.archetype,
    ...(run.mutator ? { mutator: run.mutator } : {}),
    ...(run.mutators?.length ? { mutators: [...run.mutators] } : {}),
    ...(run.noiseMutator ? { noiseMutator: run.noiseMutator } : {}),
  }
  if (enc.bonus) c.bonus = { def: enc.bonus, progress: 0, failed: false }

  // Enemies first so the party never deploys onto them (a blocked authored tile falls back to the nearest free one).
  for (const e of enc.enemies) {
    const pos = isStandable(tileAt(c, e.pos)) && !unitAt(c, e.pos) ? e.pos : nearestFreeTile(c, e.pos)
    if (pos) spawnEnemy(c, C, e.id, pos)
  }

  const companions = run.party.filter((m) => m.hp >= 1 && C.companions[m.id])
  const arche = C.archetypes[run.archetype]
  const connPos = deployTile(c, [{ x: 1, y: 2 }, ...PREFERRED_COMPANION_TILES]) ?? { x: 1, y: 2 }
  c.units.push(partyUnit('connector', 'connector', arche?.name ?? T('접속자', 'Connector'), arche?.sprite ?? 'player-noise', connPos, run.hp, run.maxHp, 3))
  for (const m of companions) {
    const def = C.companions[m.id]
    if (!def) continue
    const pos = deployTile(c, PREFERRED_COMPANION_TILES)
    if (!pos) continue
    c.units.push(partyUnit(m.id, m.id, def.name, def.sprite, pos, Math.min(m.hp, m.maxHp), m.maxHp, def.move))
  }
  if (enc.proto) c.proto = { ...enc.proto }
  if (enc.relay) c.relay = { ...enc.relay }
  if (enc.neutral) {
    const n = enc.neutral
    const pos = unitAt(c, n.pos) || !isStandable(tileAt(c, n.pos)) ? nearestFreeTile(c, n.pos) : { ...n.pos }
    if (pos) c.units.push({ uid: 'neutral', defId: 'neutral', side: 'neutral', name: n.name, sprite: n.sprite, pos, hp: n.hp, maxHp: n.hp, block: 0, armor: 0, move: 0, moved: true, facing: 'right', statuses: {}, intent: null })
  }
  if (run.trace >= 100 && C.enemies.purge_drone) {
    const free = allTiles().filter((p) => p.x >= 4 && tileAt(c, p)?.kind === 'floor' && !unitAt(c, p))
    if (free.length > 0) spawnEnemy(c, C, 'purge_drone', pick(c, free))
  }
  if (run.replica && !run.flags[REPLICA_BEATEN] && enc.kind === 'elite' && enc.act >= REPLICA_FROM_ACT && C.enemies[run.replica]) {
    const free = allTiles().filter((p) => p.x >= 4 && tileAt(c, p)?.kind === 'floor' && !unitAt(c, p))
    if (free.length > 0) spawnReplica(c, C, run.replica, pick(c, free))
  }
  // Waves due "on turn 1" are simply part of the opening board.
  const opening = (enc.reinforcements ?? []).filter((w) => w.turn <= 1).flatMap((w) => w.enemies)
  if (opening.length > 0) arriveReinforcements(c, C, opening)

  // Meta threads are frozen into run.flags as `thread_<passive>` by the run module.
  const thread = (key: string): number => run.flags[`thread_${key}`] ?? 0
  const extraMove = activePassive(c, C, 'move') + thread('move')
  for (const u of livingParty(c)) u.move += extraMove
  applyOpeningPerks(c, run, enc, C)
  c.maxEnergy = 3 + activePassive(c, C, 'energy') + thread('energy')
  c.handSize = 5 + activePassive(c, C, 'handSize') + thread('handSize')
  if (thread('bumpDamage')) c.threadBump = thread('bumpDamage')

  // A benched companion's cards stay in the deck but sit this fight out (their owner is not on the board).
  const benched = new Set((run.bench ?? []).map((m) => m.id))
  c.draw = shuffle(combatStream(c, 'shuffle'), run.deck.filter((card) => !benched.has(C.cards[card.defId]?.owner ?? '')).map((card) => ({ ...card })))
  // ITB opening: enemies advance and telegraph before the first player turn.
  enemiesTelegraph(c, C, true)
  announceIncoming(c, enc)
  beginPlayerTurn(c, C, true)
  return c
}

/** IX's rebuild of what killed you last loop: a tougher copy, announced on the opening board. */
function spawnReplica(c: CombatState, C: ContentRegistry, enemyId: string, pos: Pos): void {
  const u = spawnEnemy(c, C, enemyId, pos) as UnitStateExt | undefined
  if (!u) return
  u.maxHp = Math.ceil(u.maxHp * REPLICA_HP)
  u.hp = u.maxHp
  u.dmgBonus = (u.dmgBonus ?? 0) + 1
  c.replicaUid = u.uid
  u.replica = true
  const name = C.enemies[enemyId]?.name
  u.name = T(`IX 복제 ${name?.ko ?? ''}`, `IX replica: ${name?.en ?? ''}`)
}

/** Cards the Overload Buffer lets you hold over the end of a turn for free. */
const HAND_BURN_FREE = 3

function beginPlayerTurn(c: CombatState, C: ContentRegistry, first: boolean): void {
  emit(c, { t: 'turn', side: 'player', turn: c.turn })
  pruneTurnKeys(c)
  const rules = implantRules(c, C)
  for (const u of livingParty(c)) {
    if (!rules.keepBlock) u.block = 0
    u.moved = false
    const guard = u.statuses.guard ?? 0
    if (guard > 0) gainBlock(c, u, guard)
  }
  if (first) {
    const chaBlock = perksOf(c).companionBlock
    if (chaBlock > 0) {
      for (const u of livingParty(c)) if (u.uid !== 'connector') gainBlock(c, u, chaBlock)
    }
    const echoBlock = c.triggered[OPENING_BLOCK_KEY] ?? 0
    if (echoBlock > 0) for (const u of livingParty(c)) gainBlock(c, u, echoBlock)
  }
  if (!first) gainMomentum(c, C, MOMENTUM_TURN)
  // Unspent energy was dropped at end of turn; anything gained off-turn (e.g. on damage taken) carries over.
  const drain = rules.drainTurn ?? 0
  const energy = drain > 0 && c.turn % drain === 0 ? 0 : c.maxEnergy
  c.energy += energy
  emit(c, { t: 'energy', amount: energy })
  const x = c as CombatStateExt
  const bonusDraw = x.pendingDraw ?? 0
  delete x.pendingDraw
  drawCards(c, Math.max(0, c.handSize - c.hand.length) + bonusDraw)
  if (c.bonus?.def.kind === 'turn_limit' && c.turn > c.bonus.def.turns) c.bonus.failed = true
  c.undo = null
  if (first) fireTrigger(c, C, 'combat_start')
  fireTrigger(c, C, 'turn_start')
  checkEnd(c, C)
}

// ---------------------------------------------------------------- movement

function partyMovePaths(c: CombatState, u: UnitState): Map<string, Pos[]> {
  const paths = new Map<string, Pos[]>([[posKey(u.pos), [{ ...u.pos }]]])
  const queue: Pos[] = [u.pos]
  while (queue.length > 0) {
    const p = queue.shift() as Pos
    const path = paths.get(posKey(p)) ?? []
    if (path.length - 1 >= u.move) continue
    for (const d of DIRS) {
      const n = add(p, d)
      if (!inBounds(n) || paths.has(posKey(n))) continue
      const t = tileAt(c, n)
      if (!isStandable(t)) continue
      const occ = unitAt(c, n)
      if (occ && occ.side !== 'party') continue
      paths.set(posKey(n), [...path, n])
      queue.push(n)
    }
  }
  return paths
}

/** Tiles the unit may move to this turn (excluding where it stands). */
export function legalMoves(c: CombatState, uid: string): Pos[] {
  const u = getUnit(c, uid)
  if (!u || c.phase !== 'player' || u.side !== 'party' || u.moved || (u.statuses.shock ?? 0) > 0 || (u.statuses.freeze ?? 0) > 0 || (u.statuses.stun ?? 0) > 0) return []
  const out: Pos[] = []
  for (const path of partyMovePaths(c, u).values()) {
    const end = path[path.length - 1]
    if (end && !samePos(end, u.pos) && !unitAt(c, end)) out.push(end)
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

export function moveUnit(c0: CombatState, C: ContentRegistry, uid: string, to: Pos): CombatState {
  requirePlayer(c0)
  if (!legalMoves(c0, uid).some((p) => samePos(p, to))) throw new Error(`illegal move for ${uid}`)
  const c = clone(c0)
  const u = getUnit(c, uid) as UnitState
  const path = partyMovePaths(c, u).get(posKey(to)) ?? [{ ...u.pos }, { ...to }]
  c.undo = JSON.stringify({ ...c, events: [] })
  u.pos = { ...to }
  u.moved = true
  const dir = dirToward(path[path.length - 2] ?? path[0] ?? to, to)
  if (dir) u.facing = dir
  emit(c, { t: 'move', uid, path })
  sprintEvade(c, u, path.length - 1)
  tickMoveBleed(c, C, u)
  if (u.hp > 0) enterGround(c, u)
  return c
}

/** Undo the last move (possible until a card or consumable is played). */
export function undoMove(c: CombatState): CombatState {
  if (!c.undo) return c
  const prev = JSON.parse(c.undo) as CombatState
  const events = c.events.slice()
  for (const u of c.units) {
    const before = prev.units.find((p) => p.uid === u.uid)
    if (before && !samePos(before.pos, u.pos)) events.push({ t: 'move', uid: u.uid, path: [{ ...u.pos }, { ...before.pos }] })
  }
  prev.events = events
  return prev
}

// ---------------------------------------------------------------- cards

export function cardFace(def: CardDef, upgraded: boolean): CardFace & { name: Text } {
  const face: CardFace & { name: Text } = { name: def.name, cost: def.cost, text: def.text, target: def.target, effects: def.effects }
  if (def.exhaust) face.exhaust = def.exhaust
  if (def.retain) face.retain = def.retain
  if (!upgraded) return face
  const up = def.upgrade
  if (up.cost !== undefined) face.cost = up.cost
  if (up.text) face.text = up.text
  if (up.target) face.target = up.target
  if (up.effects) face.effects = up.effects
  if (up.exhaust !== undefined) face.exhaust = up.exhaust
  if (up.retain !== undefined) face.retain = up.retain
  return face
}

interface ResolvedOption extends TargetOption {
  /** 'target'-scope tiles for effects without an area. */
  base: Pos[]
  impact?: Pos
}

function hitsFirst(c: CombatState, origin: Pos, dir: Dir, range: number): Pos | undefined {
  const ray = rayTiles(origin, dir, range)
  for (const p of ray) if (unitAt(c, p) || tileAt(c, p)?.kind === 'cover') return p
  return ray[ray.length - 1]
}

function uniq(list: Pos[]): Pos[] {
  const seen = new Set<string>()
  return list.filter((p) => {
    const k = posKey(p)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function resolutionFor(origin: UnitState, mode: TargetMode, opt: ResolvedOption): Resolution {
  const dir = opt.dir ?? (opt.impact && !samePos(opt.impact, origin.pos) ? dirToward(origin.pos, opt.impact) : undefined)
  const res: Resolution = {
    origin,
    side: 'party',
    tiles: opt.base,
    source: 'party',
    melee: mode.mode === 'melee',
    attack: mode.mode !== 'none' && mode.mode !== 'self' && mode.mode !== 'ally',
  }
  if (opt.impact) res.impact = opt.impact
  if (dir) res.dir = dir
  return res
}

/** Highlight tiles: every tile the effects touch through 'target' plus the units hit by group scopes. */
function highlightTiles(c: CombatState, origin: UnitState, mode: TargetMode, effects: readonly Effect[], opt: ResolvedOption): Pos[] {
  const res = resolutionFor(origin, mode, opt)
  const out: Pos[] = []
  for (const eff of effects) {
    const scope = scopeOf(eff)
    if (scope === 'target') out.push(...effectTiles(eff, res))
    else if (scope !== 'random_enemy') out.push(...effectTargets(c, eff, res).map((u) => u.pos))
  }
  return uniq(out.length > 0 ? out : opt.base).map((p) => ({ ...p }))
}

function rawOptions(c: CombatState, origin: UnitState, mode: TargetMode): ResolvedOption[] {
  const o = origin.pos
  switch (mode.mode) {
    case 'none':
      return [{ tiles: [], base: [{ ...o }] }]
    case 'self':
      return [{ pos: { ...o }, tiles: [], base: [{ ...o }], impact: { ...o } }]
    case 'ally':
      return livingParty(c)
        .filter((u) => manhattan(u.pos, o) <= mode.range)
        .map((u) => ({ pos: { ...u.pos }, tiles: [], base: [{ ...u.pos }], impact: { ...u.pos } }))
    case 'melee':
      return DIRS.map((dir) => ({ dir, p: add(o, dir) }))
        .filter(({ p }) => inBounds(p))
        .map(({ dir, p }) => ({ pos: p, dir, tiles: [], base: [p], impact: p }))
    case 'line': {
      const out: ResolvedOption[] = []
      for (const dir of DIRS) {
        const hit = hitsFirst(c, o, dir, mode.range)
        if (hit) out.push({ pos: hit, dir, tiles: [], base: [hit], impact: hit })
      }
      return out
    }
    case 'beam': {
      const out: ResolvedOption[] = []
      for (const dir of DIRS) {
        const ray = rayTiles(o, dir, mode.range)
        const first = ray[0]
        if (first) out.push({ pos: first, dir, tiles: [], base: ray })
      }
      return out
    }
    case 'lob':
      return allTiles()
        .filter((p) => {
          const d = manhattan(o, p)
          return d >= mode.minRange && d <= mode.range
        })
        .map((p) => ({ pos: p, tiles: [], base: [p], impact: p }))
    case 'tile':
      return allTiles()
        .filter((p) => manhattan(o, p) <= mode.range && !samePos(p, o))
        .filter((p) => !mode.empty || (isStandable(tileAt(c, p)) && !unitAt(c, p)))
        .map((p) => ({ pos: p, tiles: [], base: [p], impact: p }))
  }
}

function optionsFor(c: CombatState, origin: UnitState, mode: TargetMode, effects: readonly Effect[]): ResolvedOption[] {
  return rawOptions(c, origin, mode).map((opt) => ({ ...opt, tiles: highlightTiles(c, origin, mode, effects, opt) }))
}

function publicOption(opt: ResolvedOption): TargetOption {
  const out: TargetOption = { tiles: opt.tiles }
  if (opt.pos) out.pos = opt.pos
  if (opt.dir) out.dir = opt.dir
  return out
}

function matchOption(origin: UnitState, mode: TargetMode, opts: ResolvedOption[], target: PlayTarget): ResolvedOption | undefined {
  if (mode.mode === 'none' || mode.mode === 'self') return opts[0]
  if (target.dir) {
    const byDir = opts.find((o) => o.dir === target.dir)
    if (byDir) return byDir
  }
  const pos = target.pos
  if (!pos) return undefined
  const exact = opts.find((o) => samePos(o.pos, pos))
  if (exact) return exact
  if (mode.mode === 'line' || mode.mode === 'beam' || mode.mode === 'melee') {
    if (pos.x !== origin.pos.x && pos.y !== origin.pos.y) return undefined
    const dir = dirToward(origin.pos, pos)
    return opts.find((o) => o.dir === dir)
  }
  return undefined
}

function findCard(c: CombatState, cardUid: string): CardInstance | undefined {
  return c.hand.find((k) => k.uid === cardUid)
}

function ownerCheck(c: CombatState, def: CardDef, originUid: string): Text | undefined {
  const origin = getUnit(c, originUid)
  if (def.owner !== 'any' && def.owner !== 'connector' && !getUnit(c, def.owner)) return REASON.downed
  if (!origin || origin.side !== 'party') return REASON.noOrigin
  if ((origin.statuses.stun ?? 0) > 0) return REASON.stunned
  if (def.owner === 'connector' && origin.uid !== 'connector') return REASON.connectorOnly
  if (def.owner !== 'any' && def.owner !== 'connector' && origin.uid !== def.owner) return REASON.wrongOwner
  return undefined
}

/** Redact (Glass Library censors): a redacted unit's next card costs +1. */
export function redactTax(c: CombatState, originUid: string): number {
  return (getUnit(c, originUid)?.statuses.redact ?? 0) > 0 ? 1 : 0
}

export function canPlay(c: CombatState, C: ContentRegistry, cardUid: string, originUid: string): { ok: boolean; reason?: Text } {
  if (c.phase !== 'player') return { ok: false, reason: REASON.over }
  const card = findCard(c, cardUid)
  const def = card ? C.cards[card.defId] : undefined
  if (!card || !def) return { ok: false, reason: REASON.noCard }
  const face = cardFace(def, card.upgraded)
  if (face.cost < 0 || def.type === 'junk') return { ok: false, reason: REASON.junk }
  const bad = ownerCheck(c, def, originUid)
  if (bad) return { ok: false, reason: bad }
  if (face.cost + redactTax(c, originUid) > c.energy) return { ok: false, reason: REASON.energy }
  const limit = implantRules(c, C).cardLimit ?? 0
  if (limit > 0 && cardsPlayedThisTurn(c) >= limit) return { ok: false, reason: REASON.cardLimit }
  const origin = getUnit(c, originUid) as UnitState
  if (rawOptions(c, origin, face.target).length === 0) return { ok: false, reason: REASON.noTarget }
  return { ok: true }
}

export function selectableTargets(c: CombatState, C: ContentRegistry, cardUid: string, originUid: string): TargetOption[] {
  const card = findCard(c, cardUid)
  const def = card ? C.cards[card.defId] : undefined
  const origin = getUnit(c, originUid)
  if (!card || !def || !origin || origin.side !== 'party') return []
  const face = cardFace(def, card.upgraded)
  return optionsFor(c, origin, face.target, face.effects).map(publicOption)
}

/** Party uids that may play this card (owner rules; ignores energy). */
export function partyOrigins(c: CombatState, C: ContentRegistry, cardUid: string): string[] {
  const card = findCard(c, cardUid)
  const def = card ? C.cards[card.defId] : undefined
  if (!card || !def || c.phase !== 'player') return []
  const face = cardFace(def, card.upgraded)
  if (face.cost < 0 || def.type === 'junk') return []
  return livingParty(c)
    .filter((u) => !ownerCheck(c, def, u.uid) && rawOptions(c, u, face.target).length > 0)
    .map((u) => u.uid)
}

/**
 * Firing roots the shooter (Into the Breach rule): a unit that plays a card aimed from its position
 * (melee/line/beam/lob/tile/ally) cannot move afterwards this turn — move first, then act. Untargeted
 * cards (none/self) and movement cards (teleport/swap/refund_move) leave the move available.
 */
export function rootsOrigin(face: CardFace): boolean {
  const mode = face.target.mode
  if (mode === 'none' || mode === 'self') return false
  return !face.effects.some((e) => e.kind === 'teleport' || e.kind === 'swap' || e.kind === 'refund_move')
}

/** The caster turns toward what it aims at (kept after the play — the board shows it facing that way). */
function faceTarget(origin: UnitState, dir: Dir | undefined, at: Pos | undefined): void {
  if (dir) origin.facing = dir
  else if (at && !samePos(at, origin.pos)) origin.facing = dirToward(origin.pos, at) ?? origin.facing
}

function cardsPlayedThisTurn(c: CombatState): number {
  return c.triggered[`t${c.turn}:__cards`] ?? 0
}

/** Mutating core of playCard (the bots call it on their own scratch copies). */
export function playCardInPlace(c: CombatState, C: ContentRegistry, cardUid: string, originUid: string, target: PlayTarget): void {
  const check = canPlay(c, C, cardUid, originUid)
  if (!check.ok) throw new Error(`cannot play ${cardUid}: ${check.reason?.en ?? ''}`)
  const card = findCard(c, cardUid) as CardInstance
  const def = C.cards[card.defId] as CardDef
  const face = cardFace(def, card.upgraded)
  const origin = getUnit(c, originUid) as UnitState
  const opt = matchOption(origin, face.target, rawOptions(c, origin, face.target), target)
  if (!opt) throw new Error(`illegal target for ${def.id}`)

  c.undo = null
  const tax = redactTax(c, originUid)
  c.energy -= face.cost + tax
  if (tax > 0) decayStatus(origin, 'redact')
  c.hand = c.hand.filter((k) => k !== card)
  const res = resolutionFor(origin, face.target, opt)
  faceTarget(origin, res.dir, opt.impact ?? opt.pos)
  const ev: { t: 'card'; owner: string; cardId: string; target?: Pos; dir?: Dir } = { t: 'card', owner: origin.uid, cardId: def.id }
  if (opt.impact ?? opt.pos) ev.target = { ...((opt.impact ?? opt.pos) as Pos) }
  if (opt.dir) ev.dir = opt.dir
  emit(c, ev)
  if (rootsOrigin(face)) origin.moved = true

  const rules = implantRules(c, C)
  applyEffects(c, C, face.effects, res)
  if (rules.echoFirstCard && def.type !== 'power' && cardsPlayedThisTurn(c) === 0 && c.phase === 'player' && origin.hp > 0) {
    applyEffects(c, C, face.effects, res)
  }

  if (face.exhaust || def.type === 'power') c.exhaust.push(card)
  else c.discard.push(card)
  c.stats.cardsPlayed += 1
  const key = `t${c.turn}:__cards`
  c.triggered[key] = (c.triggered[key] ?? 0) + 1
  if (c.phase === 'lost') return
  const refill = rules.emptyHandDraw ?? 0
  if (refill > 0 && c.hand.length === 0 && (c.triggered[`t${c.turn}:empty_hand`] ?? 0) < 2) {
    c.triggered[`t${c.turn}:empty_hand`] = (c.triggered[`t${c.turn}:empty_hand`] ?? 0) + 1
    drawCards(c, refill)
    c.energy += 1
    emit(c, { t: 'energy', amount: 1 })
  }
  if (def.owner !== 'any' && def.owner !== 'connector' && perksOf(c).companionRefund && !c.triggered['c:cha_refund']) {
    c.triggered['c:cha_refund'] = 1
    c.energy += 1
    emit(c, { t: 'energy', amount: 1 })
  }
  const refund = mutatorCombat(c).tacticRefund ?? 0
  if (refund > 0 && def.type === 'tactic' && face.cost > 0 && !c.triggered[`t${c.turn}:oc_tactic`]) {
    c.triggered[`t${c.turn}:oc_tactic`] = 1
    c.energy += refund
    emit(c, { t: 'energy', amount: refund })
  }
  if (cardsPlayedThisTurn(c) === 1) fireTrigger(c, C, 'first_card', undefined, origin.uid)
  if (def.type === 'attack') fireTrigger(c, C, 'play_attack', undefined, origin.uid)
  else if (def.type === 'skill') fireTrigger(c, C, 'play_skill', undefined, origin.uid)
  else if (def.type === 'tactic') fireTrigger(c, C, 'play_tactic', undefined, origin.uid)
  checkEnd(c, C)
}

export function playCard(c: CombatState, C: ContentRegistry, cardUid: string, originUid: string, target: PlayTarget): CombatState {
  requirePlayer(c)
  const next = clone(c)
  playCardInPlace(next, C, cardUid, originUid, target)
  return next
}

/** Exact outcome of a play (runs playCard on a copy and diffs every unit that changed). */
export function previewPlay(c: CombatState, C: ContentRegistry, cardUid: string, originUid: string, target: PlayTarget): CombatPreview {
  const before = c.units
  const after = playCard(c, C, cardUid, originUid, target)
  return diffUnits(before, after.units)
}

export function diffUnits(before: UnitState[], after: UnitState[]): CombatPreview {
  const units: CombatPreview['units'] = []
  for (const b of before) {
    if (b.hp <= 0) continue
    const a = after.find((u) => u.uid === b.uid)
    const hpAfter = a ? a.hp : 0
    const blockAfter = a ? a.block : 0
    const moved = a && !samePos(a.pos, b.pos)
    if (hpAfter === b.hp && blockAfter === b.block && !moved) continue
    const row: CombatPreview['units'][number] = { uid: b.uid, hpBefore: b.hp, hpAfter, blockAfter, dies: hpAfter <= 0 }
    if (moved && a) row.to = { ...a.pos }
    units.push(row)
  }
  return { units }
}

// ---------------------------------------------------------------- consumables

export function consumableTargets(c: CombatState, C: ContentRegistry, index: number, originUid: string): TargetOption[] {
  const def = C.consumables[c.consumables[index] ?? '']
  const origin = getUnit(c, originUid)
  if (!def || !origin || origin.side !== 'party') return []
  return optionsFor(c, origin, def.target, def.effects).map(publicOption)
}

export function consumeInPlace(c: CombatState, C: ContentRegistry, index: number, originUid: string, target: PlayTarget): void {
  requirePlayer(c)
  const id = c.consumables[index]
  const def = id ? C.consumables[id] : undefined
  const origin = getUnit(c, originUid)
  if (!def || !origin || origin.side !== 'party') throw new Error('cannot use consumable')
  const opt = matchOption(origin, def.target, rawOptions(c, origin, def.target), target)
  if (!opt) throw new Error(`illegal target for ${def.id}`)
  c.undo = null
  c.consumables = c.consumables.filter((_, i) => i !== index)
  const res = resolutionFor(origin, def.target, opt)
  faceTarget(origin, res.dir, opt.impact ?? opt.pos)
  const ev: { t: 'card'; owner: string; cardId: string; target?: Pos; dir?: Dir } = { t: 'card', owner: origin.uid, cardId: def.id }
  if (opt.impact ?? opt.pos) ev.target = { ...((opt.impact ?? opt.pos) as Pos) }
  if (opt.dir) ev.dir = opt.dir
  emit(c, ev)
  applyEffects(c, C, def.effects, res)
  checkEnd(c, C)
}

export function useConsumable(c: CombatState, C: ContentRegistry, index: number, originUid: string, target: PlayTarget): CombatState {
  const next = clone(c)
  consumeInPlace(next, C, index, originUid, target)
  return next
}

/** Exact outcome of using a consumable (same diff shape as previewPlay). */
export function previewConsumable(c: CombatState, C: ContentRegistry, index: number, originUid: string, target: PlayTarget): CombatPreview {
  const next = clone(c)
  consumeInPlace(next, C, index, originUid, target)
  return diffUnits(c.units, next.units)
}

// ---------------------------------------------------------------- end turn / enemy phase

function enemyPhase(c: CombatState, C: ContentRegistry): void {
  const enc = C.encounters[c.encounterId]
  emit(c, { t: 'turn', side: 'enemy', turn: c.turn })
  for (const e of livingEnemies(c)) e.block = 0

  // a. intents fire in uid order
  for (const e of livingEnemies(c).sort(byUid)) {
    if (c.phase !== 'player') return
    if (e.hp > 0 && c.units.includes(e)) fireIntent(c, C, e)
  }
  if (c.phase !== 'player') return

  // b. fire catches, burn/bleed/corrode ticks, hazards, ground decays, statuses decay, reinforcements
  igniteStanding(c)
  for (const u of c.units.slice().sort(byUid)) {
    const burn = u.statuses.burn ?? 0
    if (burn <= 0 || u.hp <= 0) continue
    dealDamage(c, C, u, burn, { source: u.side === 'enemy' ? 'party' : 'enemy', ignoreBlock: true, cause: 'burn' })
    decayStatus(u, 'burn')
    if (c.phase !== 'player') return
  }
  for (const u of c.units.slice().sort(byUid)) {
    // Bleed only hurts on movement (tickMoveBleed); standing still lets it clot to half each enemy phase.
    const bleed = u.statuses.bleed ?? 0
    if (bleed <= 0 || u.hp <= 0) continue
    const nextBleed = Math.floor(bleed / 2)
    if (nextBleed > 0) u.statuses.bleed = nextBleed
    else delete u.statuses.bleed
  }
  for (const u of c.units.slice().sort(byUid)) {
    const corrode = u.statuses.corrode ?? 0
    if (corrode <= 0 || u.hp <= 0) continue
    if (u.armor > 0) u.armor = Math.max(0, u.armor - 1)
    dealDamage(c, C, u, corrode, { source: u.side === 'enemy' ? 'party' : 'enemy', ignoreBlock: true, cause: 'corrode' })
    if (u.hp > 0) decayStatus(u, 'corrode')
    if (c.phase !== 'player') return
  }
  const hazDmg = hazardDamage(c)
  for (const u of c.units.slice().sort(byUid)) {
    if (u.hp > 0 && !u.flying && tileAt(c, u.pos)?.kind === 'hazard') dealDamage(c, C, u, hazDmg, { source: 'environment', cause: 'hazard' })
    if (c.phase !== 'player') return
  }
  decayGround(c)
  for (const e of livingEnemies(c)) {
    decayStatus(e, 'shock')
    decayStatus(e, 'weak')
    decayStatus(e, 'freeze')
    if (isStrong(C, e)) decayStatus(e, 'stun')
  }
  growRage(c, C)
  if (enc) {
    const arriving = wavesArrivingAfter(enc, c.turn)
    c.incoming = []
    if (arriving.length > 0) arriveReinforcements(c, C, arriving)
  }
  checkEnd(c, C)
  if (c.phase !== 'player') return
  if (enc?.objective?.kind === 'survive' && c.turn >= enc.objective.turns) {
    winCombat(c, C)
    return
  }

  // c. move + telegraph; enemy guard refreshes block for the coming player turn
  enemiesTelegraph(c, C, true)
  for (const e of livingEnemies(c)) {
    decayStatus(e, 'stun')
    const guard = e.statuses.guard ?? 0
    if (guard > 0) gainBlock(c, e, guard)
  }
  if (c.phase !== 'player') return

  // d. next player turn
  c.turn += 1
  if (c.proto?.darkTurns) c.proto.darkTurns -= 1
  if (enc) announceIncoming(c, enc)
  beginPlayerTurn(c, C, false)
}

/** Junk with teeth: every card still in hand at end of turn applies its heldEffects (owner = connector). */
function applyHeldEffects(c: CombatState, C: ContentRegistry): void {
  for (const card of c.hand.slice()) {
    const held = C.cards[card.defId]?.heldEffects
    if (!held?.length) continue
    const conn = connectorOf(c)
    if (!conn) return
    applyEffects(c, C, held, { origin: conn, side: 'party', impact: { ...conn.pos }, tiles: [{ ...conn.pos }], source: 'environment' })
    if (c.phase !== 'player') return
  }
}

// ---------------------------------------------------------------- Signal Burst (X2)

/** Elites and bosses shake off stun faster (they re-telegraph at the end of the phase they sat out). */
function isStrong(C: ContentRegistry, u: UnitState): boolean {
  const tier = C.enemies[u.defId]?.tier
  return tier === 'elite' || tier === 'boss'
}

/** First act IX's replica can wait in. */
const REPLICA_FROM_ACT = 2
/** The replica's HP against the original. */
const REPLICA_HP = 1.3
/** Set on the run once the replica is destroyed. */
export const REPLICA_BEATEN = 'replica_beaten'
/** Extra credits for destroying it. */
export const REPLICA_BOUNTY = 80

/** Key of a duo in the `ultimatesReady` list and `fireBurst` (plain ids there are companion uids). */
export const DUO_PREFIX = 'duo:'

function momentumFull(c: CombatState): boolean {
  return c.phase === 'player' && !c.burstUsed && (c.momentum ?? 0) >= MOMENTUM_MAX
}

/** The archetype's Signal Burst, if Momentum is full and it was not used this fight. */
export function burstReady(c: CombatState, C: ContentRegistry): BurstDef | undefined {
  if (!momentumFull(c)) return undefined
  const conn = connectorOf(c)
  if (!conn || conn.hp <= 0) return undefined
  return c.archetype ? C.archetypes[c.archetype]?.burst : undefined
}

/** Companion ultimates on offer right now (same gauge as the Signal Burst; the companion must stand). */
export function ultimatesReady(c: CombatState, C: ContentRegistry): { uid: string; def: BurstDef; duo?: DuoDef }[] {
  if (!momentumFull(c)) return []
  const out: { uid: string; def: BurstDef; duo?: DuoDef }[] = []
  const party = livingParty(c)
  for (const u of party) {
    const def = u.uid === 'connector' ? undefined : C.companions[u.defId]?.ultimate
    if (def) out.push({ uid: u.uid, def })
  }
  // A duo needs both standing; it joins the list under its own key.
  for (const duo of Object.values(C.duos ?? {})) {
    if (duo.pair.every((id) => party.some((u) => u.defId === id))) out.push({ uid: `${DUO_PREFIX}${duo.id}`, def: duo, duo })
  }
  return out
}

/**
 * Spend the full Momentum gauge (no energy, no target; once per fight): the archetype's Signal Burst from the
 * connector, or — with `companionUid` — that companion's ultimate fired from the companion. Mutates.
 */
export function burstInPlace(c: CombatState, C: ContentRegistry, companionUid?: string): void {
  requirePlayer(c)
  const ult = companionUid ? ultimatesReady(c, C).find((o) => o.uid === companionUid) : undefined
  const def = companionUid ? ult?.def : burstReady(c, C)
  const lead = ult?.duo?.pair[0]
  const origin = lead ? livingParty(c).find((u) => u.defId === lead) : companionUid ? getUnit(c, companionUid) : connectorOf(c)
  if (!def || !origin) throw new Error('signal burst not ready')
  c.undo = null
  c.burstUsed = true
  c.momentum = 0
  if (ult?.duo) c.duoFired = ult.duo.id
  emit(
    c,
    ult?.duo
      ? { t: 'burst', archetype: c.archetype ?? '', companion: origin.defId, duo: ult.duo.id }
      : companionUid
        ? { t: 'burst', archetype: c.archetype ?? '', companion: origin.defId }
        : { t: 'burst', archetype: c.archetype ?? '' },
  )
  applyEffects(c, C, def.effects, { origin, side: 'party', tiles: [], source: 'party' })
  checkEnd(c, C)
}

export function fireBurst(c: CombatState, C: ContentRegistry, companionUid?: string): CombatState {
  const next = clone(c)
  burstInPlace(next, C, companionUid)
  return next
}

export function endTurnInPlace(c: CombatState, C: ContentRegistry): void {
  requirePlayer(c)
  c.undo = null
  fireTrigger(c, C, 'turn_end')
  if (c.phase !== 'player') return
  applyHeldEffects(c, C)
  if (c.phase !== 'player') return
  const burn = (implantRules(c, C).handBurn ?? 0) * Math.max(0, c.hand.length - HAND_BURN_FREE)
  const self = connectorOf(c)
  if (burn > 0 && self) {
    dealDamage(c, C, self, burn, { source: 'environment', ignoreBlock: true })
    checkEnd(c, C)
    if (c.phase !== 'player') return
  }
  const kept: CardInstance[] = []
  for (const card of c.hand) {
    const def = C.cards[card.defId]
    const retain = def ? cardFace(def, card.upgraded).retain : false
    if (retain) kept.push(card)
    else c.discard.push(card)
  }
  c.hand = kept
  c.energy = 0
  for (const u of livingParty(c)) {
    decayStatus(u, 'shock')
    decayStatus(u, 'weak')
    decayStatus(u, 'freeze')
    decayStatus(u, 'stun')
  }
  const x = c as CombatStateExt
  x.inEnemyPhase = true
  try {
    enemyPhase(c, C)
  } finally {
    delete x.inEnemyPhase
  }
}

export function endTurn(c: CombatState, C: ContentRegistry): CombatState {
  const next = clone(c)
  endTurnInPlace(next, C)
  return next
}

// ---------------------------------------------------------------- read models for the UI / bots

export function intentInfo(c: CombatState, C: ContentRegistry, uid: string): IntentInfo | null {
  const u = getUnit(c, uid)
  if (!u || !u.intent) return null
  const move = findMove(C, u, u.intent.moveId)
  if (!move) return null
  const geo = intentGeometry(c, u, move, u.intent)
  const info: IntentInfo = {
    move,
    tiles: geo.tiles,
    path: geo.path,
    damage: effectiveIntentDamage(u, move),
    windupLeft: u.intent.windupLeft,
  }
  const dir = u.intent.dir ?? (move.pattern === 'lob' ? undefined : u.facing)
  if (dir) info.dir = dir
  if (u.intent.target) info.target = { ...u.intent.target }
  if (u.intent.targetUid) info.targetUid = u.intent.targetUid
  return info
}

/**
 * posKey → total damage a unit standing there would take in the next enemy phase (intents that will
 * fire — not shocked, no windup left — plus hazard tiles). Block/armor are not subtracted.
 */
export function threatMap(c: CombatState, C: ContentRegistry): Record<string, number> {
  const out: Record<string, number> = {}
  const addAt = (p: Pos, n: number) => {
    out[posKey(p)] = (out[posKey(p)] ?? 0) + n
  }
  for (const e of livingEnemies(c)) {
    const intent = e.intent
    if (!intent || intent.windupLeft > 0 || (e.statuses.shock ?? 0) > 0) continue
    const move = findMove(C, e, intent.moveId)
    if (!move) continue
    const dmg = effectiveIntentDamage(e, move)
    if (dmg <= 0) continue
    for (const p of intentGeometry(c, e, move, intent).tiles) if (!samePos(p, e.pos)) addAt(p, dmg)
  }
  for (const p of allTiles()) {
    const t = tileAt(c, p)
    if (t?.kind === 'hazard') addAt(p, HAZARD_DAMAGE)
    // Standing in fire at the end of the enemy phase: Burn 2 that ticks right away.
    if ((t?.fire ?? 0) > 0) addAt(p, FIRE_BURN)
  }
  return out
}

/** Every enemy uid whose intent currently threatens `pos` (for tooltips). */
export function threatsOn(c: CombatState, C: ContentRegistry, pos: Pos): string[] {
  return livingEnemies(c)
    .filter((e) => {
      const info = intentInfo(c, C, e.uid)
      return !!info && info.tiles.some((p) => samePos(p, pos))
    })
    .map((e) => e.uid)
}
