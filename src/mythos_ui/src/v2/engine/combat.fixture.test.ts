// Small self-contained content registry + helpers for the combat engine tests.
// (Independent of v2/content so engine tests never break on content edits.)

import type {
  CardDef,
  CombatState,
  ContentRegistry,
  EncounterDef,
  EnemyDef,
  ImplantDef,
  Pos,
  RunState,
  Text,
  UnitState,
} from './types.ts'

const t = (s: string): Text => ({ ko: s, en: s })

function card(id: string, partial: Partial<CardDef> & Pick<CardDef, 'target' | 'effects'>): CardDef {
  return { id, name: t(id), text: t(id), type: 'attack', rarity: 'starter', owner: 'any', cost: 1, upgrade: {}, ...partial }
}

function enemy(id: string, partial: Partial<EnemyDef> & Pick<EnemyDef, 'moves'>): EnemyDef {
  return { id, name: t(id), sprite: id, tier: 'normal', hp: 10, move: 3, ai: 'brawler', ...partial }
}

const cards: Record<string, CardDef> = {
  strike: card('strike', { target: { mode: 'melee' }, effects: [{ kind: 'damage', amount: 6 }], upgrade: { effects: [{ kind: 'damage', amount: 9 }] } }),
  shot: card('shot', { target: { mode: 'line', range: 4 }, effects: [{ kind: 'damage', amount: 4 }] }),
  shove: card('shove', { target: { mode: 'melee' }, effects: [{ kind: 'damage', amount: 2 }, { kind: 'push', dir: 'away' }] }),
  ram: card('ram', { target: { mode: 'line', range: 5 }, effects: [{ kind: 'push', dir: 'away', distance: 2 }] }),
  hook: card('hook', { type: 'skill', target: { mode: 'line', range: 5 }, effects: [{ kind: 'push', dir: 'toward', distance: 3 }] }),
  barrier: card('barrier', { type: 'skill', target: { mode: 'self' }, effects: [{ kind: 'block', amount: 5 }] }),
  grenade: card('grenade', {
    target: { mode: 'lob', minRange: 2, range: 4 },
    effects: [
      { kind: 'damage', amount: 2, area: 'cross' },
      { kind: 'push', dir: 'away', area: 'cross' },
    ],
  }),
  beam: card('beam', { target: { mode: 'beam', range: 6 }, effects: [{ kind: 'damage', amount: 3, pierce: true }] }),
  static_junk: card('static_junk', { type: 'junk', cost: -1, target: { mode: 'none' }, effects: [] }),
  flip: card('flip', { type: 'tactic', target: { mode: 'line', range: 6 }, effects: [{ kind: 'redirect' }] }),
  jam: card('jam', { type: 'tactic', target: { mode: 'line', range: 6 }, effects: [{ kind: 'cancel_intent' }] }),
  zap: card('zap', { type: 'skill', target: { mode: 'line', range: 6 }, effects: [{ kind: 'status', status: 'shock', amount: 1 }] }),
  ignite: card('ignite', { target: { mode: 'line', range: 6 }, effects: [{ kind: 'status', status: 'burn', amount: 3 }] }),
  paint: card('paint', { type: 'skill', cost: 0, target: { mode: 'line', range: 6 }, effects: [{ kind: 'status', status: 'mark', amount: 3 }] }),
  blink: card('blink', { type: 'skill', cost: 0, target: { mode: 'tile', range: 3, empty: true }, effects: [{ kind: 'teleport' }] }),
  bulwark: card('bulwark', { type: 'power', target: { mode: 'self' }, effects: [{ kind: 'status', status: 'guard', amount: 2 }] }),
  focus: card('focus', { type: 'skill', cost: 0, retain: true, target: { mode: 'none' }, effects: [{ kind: 'draw', amount: 1 }] }),
  uplink: card('uplink', { type: 'skill', owner: 'connector', cost: 0, target: { mode: 'none' }, effects: [{ kind: 'energy', amount: 1 }] }),
  serin_cut: card('serin_cut', { owner: 'se_rin', target: { mode: 'melee' }, effects: [{ kind: 'damage', amount: 5 }] }),
  bug: card('bug', { type: 'junk', cost: -1, target: { mode: 'none' }, effects: [], heldEffects: [{ kind: 'trace', amount: 3 }] }),
  rot: card('rot', { type: 'junk', cost: -1, target: { mode: 'none' }, effects: [], heldEffects: [{ kind: 'damage', amount: 2, to: 'connector', pierce: true }] }),
  loud: card('loud', { target: { mode: 'none' }, effects: [{ kind: 'damage', amount: 2, to: 'all_enemies' }, { kind: 'trace', amount: 3 }] }),
}

const enemies: Record<string, EnemyDef> = {
  grunt: enemy('grunt', { hp: 10, bounty: 3, moves: [{ id: 'slash', name: t('slash'), pattern: 'melee', damage: 3 }] }),
  gunner: enemy('gunner', { hp: 8, ai: 'shooter', moves: [{ id: 'shoot', name: t('shoot'), pattern: 'line', damage: 2, range: 6 }] }),
  mortar: enemy('mortar', { hp: 8, ai: 'artillery', move: 2, moves: [{ id: 'shell', name: t('shell'), pattern: 'lob', damage: 3, range: 6 }] }),
  bull: enemy('bull', { hp: 12, moves: [{ id: 'gore', name: t('gore'), pattern: 'charge', damage: 4 }] }),
  heavy: enemy('heavy', { tier: 'elite', hp: 14, armor: 1, moves: [{ id: 'smash', name: t('smash'), pattern: 'melee', damage: 6, windup: 1 }] }),
  turret: enemy('turret', { hp: 20, ai: 'static', move: 0, moves: [{ id: 'bolt', name: t('bolt'), pattern: 'line', damage: 2, range: 6 }] }),
  drone: enemy('drone', { hp: 6, flying: true, moves: [{ id: 'zap', name: t('zap'), pattern: 'melee', damage: 2 }] }),
  minion: enemy('minion', { tier: 'minion', hp: 5, moves: [{ id: 'nip', name: t('nip'), pattern: 'melee', damage: 2 }] }),
  caller: enemy('caller', {
    hp: 9,
    ai: 'support',
    moves: [{ id: 'call', name: t('call'), pattern: 'summon', summon: { enemyId: 'minion', count: 1 }, cooldown: 2 }],
  }),
  boss: enemy('boss', {
    tier: 'boss',
    hp: 40,
    ai: 'boss',
    phases: [{ hpBelow: 0.5, text: t('enraged'), heal: 5 }],
    moves: [
      { id: 'stomp', name: t('stomp'), pattern: 'nova', damage: 3 },
      { id: 'quake', name: t('quake'), pattern: 'nova', damage: 6, area: 'square', minPhase: 1, weight: 3 },
    ],
  }),
  pulser: enemy('pulser', { hp: 12, moves: [{ id: 'pulse', name: t('pulse'), pattern: 'nova', damage: 1, effects: [{ kind: 'push', dir: 'away' }] }] }),
  purge_drone: enemy('purge_drone', { hp: 7, flying: true, moves: [{ id: 'purge', name: t('purge'), pattern: 'line', damage: 2 }] }),
}

const implants: Record<string, ImplantDef> = {
  plating: { id: 'plating', name: t('plating'), text: t('plating'), rarity: 'starter', icon: 'x', triggers: [{ on: 'combat_start', effects: [{ kind: 'block', amount: 4 }] }] },
  spikes: { id: 'spikes', name: t('spikes'), text: t('spikes'), rarity: 'common', icon: 'x', passive: { bumpDamage: 1 } },
  rhythm: {
    id: 'rhythm',
    name: t('rhythm'),
    text: t('rhythm'),
    rarity: 'common',
    icon: 'x',
    triggers: [{ on: 'play_attack', effects: [{ kind: 'block', amount: 1 }], limit: 'turn' }],
  },
  bounty: {
    id: 'bounty',
    name: t('bounty'),
    text: t('bounty'),
    rarity: 'common',
    icon: 'x',
    triggers: [{ on: 'environment_kill', effects: [{ kind: 'energy', amount: 1 }], limit: 'combat' }],
  },
  pain: { id: 'pain', name: t('pain'), text: t('pain'), rarity: 'common', icon: 'x', triggers: [{ on: 'damage_taken', effects: [{ kind: 'energy', amount: 1 }], limit: 'turn' }] },
  scavenger: { id: 'scavenger', name: t('scav'), text: t('scav'), rarity: 'common', icon: 'x', triggers: [{ on: 'environment_kill', effects: [{ kind: 'draw', amount: 1 }] }] },
  battery: { id: 'battery', name: t('battery'), text: t('battery'), rarity: 'boss', icon: 'x', passive: { energy: 1, handSize: 1, move: 1 } },
}

function enc(id: string, partial: Partial<EncounterDef> & Pick<EncounterDef, 'enemies'>): EncounterDef {
  return { id, act: 1, kind: 'normal', name: t(id), backdrop: 'streets', ...partial }
}

const encounters: Record<string, EncounterDef> = {
  duel: enc('duel', { enemies: [{ id: 'grunt', pos: { x: 5, y: 2 } }] }),
  pair: enc('pair', { enemies: [{ id: 'grunt', pos: { x: 4, y: 2 } }, { id: 'grunt', pos: { x: 5, y: 2 } }] }),
  terrain: enc('terrain', {
    enemies: [{ id: 'grunt', pos: { x: 5, y: 1 } }],
    terrain: [
      { pos: { x: 3, y: 0 }, kind: 'cover' },
      { pos: { x: 4, y: 4 }, kind: 'void' },
      { pos: { x: 3, y: 3 }, kind: 'hazard' },
      { pos: { x: 1, y: 2 }, kind: 'cover' },
    ],
  }),
  reinforce: enc('reinforce', {
    enemies: [{ id: 'turret', pos: { x: 6, y: 0 } }],
    reinforcements: [{ turn: 2, enemies: [{ id: 'grunt', pos: { x: 3, y: 2 } }] }],
  }),
  escort: enc('escort', {
    enemies: [{ id: 'grunt', pos: { x: 5, y: 2 } }],
    neutral: { name: t('civ'), sprite: 'civ', hp: 4, pos: { x: 0, y: 0 } },
    bonus: { kind: 'protect' },
  }),
  hold: enc('hold', { enemies: [{ id: 'turret', pos: { x: 6, y: 4 } }], objective: { kind: 'survive', turns: 2 } }),
  boss: enc('boss', { kind: 'boss', enemies: [{ id: 'boss', pos: { x: 4, y: 2 } }] }),
  elite: enc('elite', { kind: 'elite', enemies: [{ id: 'heavy', pos: { x: 5, y: 2 } }] }),
}

export const FIXTURE: ContentRegistry = {
  cards,
  consumables: {
    stim: { id: 'stim', name: t('stim'), text: t('stim'), icon: 'x', target: { mode: 'ally', range: 3 }, effects: [{ kind: 'heal', amount: 5 }], price: 10, rarity: 'common' },
    frag: {
      id: 'frag',
      name: t('frag'),
      text: t('frag'),
      icon: 'x',
      target: { mode: 'lob', minRange: 1, range: 5 },
      effects: [{ kind: 'damage', amount: 4, area: 'cross' }],
      price: 10,
      rarity: 'common',
    },
  },
  enemies,
  encounters,
  implants,
  events: {},
  companions: {
    se_rin: {
      id: 'se_rin',
      name: t('Se-rin'),
      alias: t('Se-rin'),
      role: t('hacker'),
      sprite: 'se-rin',
      portrait: 'characters/se-rin.png',
      maxHp: 20,
      move: 3,
      cards: ['serin_cut'],
      bondCards: [],
      passiveText: t('none'),
      bondLines: [],
      barks: [],
      startUnlocked: true,
    },
  },
  archetypes: {
    ghost: {
      id: 'ghost',
      name: t('Ghost'),
      tagline: t('g'),
      description: t('g'),
      stats: { str: 3, agi: 5, int: 3, cha: 3, obs: 4 },
      maxHp: 34,
      startingDeck: ['strike', 'strike', 'shot', 'barrier', 'shove'],
      startingImplant: 'plating',
      startingCredits: 50,
      sprite: 'player-noise',
    },
  },
  acts: {
    1: { act: 1, name: t('a1'), subtitle: t('a1'), intro: t('a1'), backdrop: 'streets', image: '' },
    2: { act: 2, name: t('a2'), subtitle: t('a2'), intro: t('a2'), backdrop: 'undercity', image: '' },
    3: { act: 3, name: t('a3'), subtitle: t('a3'), intro: t('a3'), backdrop: 'spire', image: '' },
  },
  endings: {},
  unlocks: {},
  paradox: [],
  lore: {},
  ixLines: { first: [], afterDeath: [], afterWin: [], generic: [] },
}

export function makeRun(over: Partial<RunState> = {}, deck: string[] = ['strike', 'strike', 'shot', 'barrier', 'shove', 'strike', 'shot']): RunState {
  return {
    version: 2,
    id: 'run1',
    seed: 1,
    rng: 12345,
    loop: 1,
    paradox: 0,
    archetype: 'ghost',
    act: 1,
    map: { act: 1, rows: 8, nodes: {}, startIds: [], bossId: '' },
    nodeId: null,
    visited: [],
    hp: 34,
    maxHp: 34,
    credits: 0,
    trace: 0,
    stats: { str: 3, agi: 5, int: 3, cha: 3, obs: 4 },
    deck: deck.map((defId, i) => ({ uid: `c${i + 1}`, defId, upgraded: false })),
    implants: [],
    consumables: [],
    party: [],
    pools: { cards: [], implants: [], companions: [] },
    flags: {},
    codex: [],
    seenEvents: [],
    screen: { kind: 'map' },
    log: [],
    echoes: 0,
    uidCounter: 100,
    tally: { kills: 0, elites: 0, bosses: 0, environmentKills: 0, damageTaken: 0, cardsPlayed: 0, floors: 0 },
    startedAt: '2026-10-10T00:00:00Z',
    ...over,
  }
}

export function unit(c: CombatState, uid: string): UnitState {
  const u = c.units.find((x) => x.uid === uid)
  if (!u) throw new Error(`no unit ${uid}`)
  return u
}

export function place(c: CombatState, uid: string, pos: Pos): UnitState {
  const u = unit(c, uid)
  u.pos = { ...pos }
  return u
}

/** Replace the hand with fresh instances of the given card ids (uids h1, h2, ...). */
export function setHand(c: CombatState, ids: string[]): void {
  c.hand = ids.map((defId, i) => ({ uid: `h${i + 1}`, defId, upgraded: false }))
}

/** Force an enemy's intent. */
export function aim(c: CombatState, uid: string, moveId: string, dir?: Pos | 'up' | 'down' | 'left' | 'right', windupLeft = 0): void {
  const u = unit(c, uid)
  if (dir && typeof dir === 'object') u.intent = { moveId, target: { ...dir }, windupLeft }
  else if (dir) {
    u.intent = { moveId, dir, windupLeft }
    u.facing = dir
  } else u.intent = { moveId, windupLeft }
}

/** Remove every enemy intent (so a test controls exactly what fires). */
export function silence(c: CombatState): void {
  for (const u of c.units) if (u.side === 'enemy') u.intent = null
}

/** Empty the board of enemies except the given uids. */
export function onlyEnemies(c: CombatState, keep: string[]): void {
  c.units = c.units.filter((u) => u.side !== 'enemy' || keep.includes(u.uid))
}
