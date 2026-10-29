// Shared fixture for the run / map / meta tests: a small but complete ContentRegistry
// (independent of the real v2/content so engine tests never break on content edits).
// This module defines no tests itself.

import type {
  CardDef,
  CardType,
  CompanionDef,
  ConsumableDef,
  ContentRegistry,
  EncounterDef,
  EnemyDef,
  EventDef,
  ImplantDef,
  MetaUnlockDef,
  Rarity,
  Text,
} from './types.ts'

export const tx = (s: string): Text => ({ ko: `${s}(ko)`, en: s })

function card(id: string, rarity: Rarity, type: CardType = 'attack', extra: Partial<CardDef> = {}): CardDef {
  return {
    id,
    name: tx(id),
    type,
    rarity,
    owner: 'any',
    cost: type === 'junk' ? -1 : 1,
    text: tx(`${id} text`),
    target: type === 'attack' ? { mode: 'melee' } : { mode: 'self' },
    effects: type === 'attack' ? [{ kind: 'damage', amount: 6 }] : [{ kind: 'block', amount: 5 }],
    upgrade: type === 'junk' ? {} : { effects: [{ kind: 'damage', amount: 9 }] },
    ...extra,
  }
}

const cards: CardDef[] = [
  card('strike', 'starter'),
  card('guard', 'starter', 'skill'),
  card('shove', 'starter', 'tactic', { target: { mode: 'melee' }, effects: [{ kind: 'push', dir: 'away' }] }),
  card('c_a', 'common'),
  card('c_b', 'common', 'skill'),
  card('c_c', 'common'),
  card('c_d', 'common', 'skill'),
  card('u_a', 'uncommon'),
  card('u_b', 'uncommon', 'skill'),
  card('u_c', 'uncommon'),
  card('r_a', 'rare'),
  card('r_b', 'rare', 'skill'),
  card('r_c', 'rare'),
  card('ghost_only', 'common', 'attack', { archetype: 'ghost' }),
  card('smug_only', 'common', 'attack', { archetype: 'smuggler' }),
  card('pack_card', 'uncommon', 'attack', { pack: 'pack_x' }),
  card('connector_card', 'rare', 'skill', { owner: 'connector' }),
  card('serin_a', 'special', 'attack', { owner: 'se_rin' }),
  card('serin_b', 'special', 'skill', { owner: 'se_rin' }),
  card('serin_bond', 'special', 'attack', { owner: 'se_rin' }),
  card('taeo_a', 'special', 'attack', { owner: 'tae_o' }),
  card('taeo_bond', 'special', 'attack', { owner: 'tae_o' }),
  card('han_a', 'special', 'attack', { owner: 'han' }),
  card('han_bond', 'special', 'attack', { owner: 'han' }),
  card('static', 'special', 'junk', { target: { mode: 'none' }, effects: [] }),
  card('special_x', 'special', 'skill'),
]

const consumables: ConsumableDef[] = [
  { id: 'grenade', name: tx('grenade'), text: tx('boom'), icon: 'items/g.png', target: { mode: 'lob', minRange: 1, range: 4 }, effects: [{ kind: 'damage', amount: 6, area: 'cross' }], price: 45, rarity: 'common' },
  { id: 'patch', name: tx('patch'), text: tx('heal'), icon: 'items/p.png', target: { mode: 'self' }, effects: [{ kind: 'heal', amount: 8 }], price: 35, rarity: 'common' },
  { id: 'stim', name: tx('stim'), text: tx('energy'), icon: 'items/s.png', target: { mode: 'none' }, effects: [{ kind: 'energy', amount: 1 }], price: 50, rarity: 'uncommon' },
  { id: 'emp', name: tx('emp'), text: tx('shock'), icon: 'items/e.png', target: { mode: 'none' }, effects: [{ kind: 'status', status: 'shock', amount: 1, to: 'all_enemies' }], price: 70, rarity: 'rare' },
]

function enemy(id: string, tier: EnemyDef['tier'], hp: number, ai: EnemyDef['ai'] = 'brawler'): EnemyDef {
  return {
    id,
    name: tx(id),
    sprite: 'enforcer-unit',
    tier,
    hp,
    move: 2,
    ai,
    moves: [{ id: `${id}_hit`, name: tx('hit'), pattern: 'melee', damage: tier === 'boss' ? 5 : 2 }],
    bounty: tier === 'minion' ? 0 : 2,
  }
}

const enemies: EnemyDef[] = [
  enemy('drone', 'minion', 6),
  enemy('thug', 'normal', 12),
  enemy('brute', 'elite', 30),
  enemy('tank', 'boss', 80, 'boss'),
]

const encounters: EncounterDef[] = ([1, 2, 3] as const).flatMap((act): EncounterDef[] => [
  { id: `n${act}_1`, act, kind: 'normal', name: tx(`n${act}_1`), backdrop: 'streets', enemies: [{ id: 'drone', pos: { x: 5, y: 2 } }] },
  { id: `n${act}_2`, act, kind: 'normal', name: tx(`n${act}_2`), backdrop: 'streets', enemies: [{ id: 'thug', pos: { x: 5, y: 1 } }, { id: 'drone', pos: { x: 5, y: 3 } }], bonus: { kind: 'untouched' } },
  { id: `n${act}_3`, act, kind: 'normal', name: tx(`n${act}_3`), backdrop: 'streets', enemies: [{ id: 'thug', pos: { x: 5, y: 1 } }, { id: 'thug', pos: { x: 5, y: 3 } }, { id: 'drone', pos: { x: 6, y: 2 } }] },
  { id: `n${act}_4`, act, kind: 'normal', name: tx(`n${act}_4`), backdrop: 'streets', enemies: [{ id: 'thug', pos: { x: 5, y: 2 } }] },
  { id: `e${act}_1`, act, kind: 'elite', name: tx(`e${act}_1`), backdrop: 'streets', enemies: [{ id: 'brute', pos: { x: 5, y: 2 } }] },
  { id: `e${act}_2`, act, kind: 'elite', name: tx(`e${act}_2`), backdrop: 'streets', enemies: [{ id: 'brute', pos: { x: 5, y: 2 } }, { id: 'drone', pos: { x: 6, y: 1 } }] },
  { id: `b${act}`, act, kind: 'boss', name: tx(`b${act}`), backdrop: 'spire', enemies: [{ id: 'tank', pos: { x: 5, y: 2 } }] },
  // Event-only fight (referenced by an event outcome → never rolled onto the map).
  { id: `ev${act}_fight`, act, kind: 'normal', name: tx(`ev${act}_fight`), backdrop: 'streets', enemies: [{ id: 'drone', pos: { x: 4, y: 2 } }] },
])

function implant(id: string, rarity: ImplantDef['rarity'], extra: Partial<ImplantDef> = {}): ImplantDef {
  return { id, name: tx(id), text: tx(`${id} text`), rarity, icon: 'items/i.png', ...extra }
}

const implants: ImplantDef[] = [
  implant('starter_imp', 'starter'),
  implant('imp_c1', 'common', { passive: { creditMult: 0.5 } }),
  implant('imp_c2', 'common', { passive: { maxHp: 5 } }),
  implant('imp_c3', 'common', { passive: { stats: { obs: 1 } } }),
  implant('imp_u1', 'uncommon', { passive: { rewardChoices: 1 } }),
  implant('imp_u2', 'uncommon', { passive: { traceMult: -0.5 } }),
  implant('imp_r1', 'rare', { passive: { restHeal: 10 } }),
  implant('imp_r2', 'rare', { passive: { shopDiscount: 0.5 } }),
  implant('imp_b1', 'boss'),
  implant('imp_b2', 'boss'),
  implant('imp_b3', 'boss'),
  implant('imp_s1', 'shop'),
  implant('imp_pack', 'common', { pack: 'ipack' }),
]

function companion(id: string, maxHp: number, cardIds: string[], bond: string, extra: Partial<CompanionDef> = {}): CompanionDef {
  return {
    id,
    name: tx(id),
    alias: tx(`${id} alias`),
    role: tx(`${id} role`),
    sprite: id,
    portrait: `characters/${id}.png`,
    maxHp,
    move: 3,
    cards: cardIds,
    bondCards: [bond],
    passiveText: tx(`${id} passive`),
    bondLines: [tx(`${id} b1`), tx(`${id} b2`), tx(`${id} b3`)],
    barks: [tx('!')],
    ...extra,
  }
}

const companions: CompanionDef[] = [
  companion('se_rin', 20, ['serin_a', 'serin_b'], 'serin_bond', { startUnlocked: true, passive: { stats: { int: 1 } } }),
  companion('tae_o', 24, ['taeo_a'], 'taeo_bond'),
  companion('han', 18, ['han_a'], 'han_bond', { passive: { creditMult: 0.25 } }),
]

const opt = (label: string, effects: EventDef['options'][number]['success']['effects'], extra: Partial<EventDef['options'][number]> = {}) => ({
  label: tx(label),
  success: { text: tx(`${label} ok`), effects },
  ...extra,
})

function event(id: string, acts: EventDef['acts'], options: EventDef['options'], extra: Partial<EventDef> = {}): EventDef {
  return { id, acts, title: tx(id), image: 'scenes/x.png', text: tx(`${id} text`), options, ...extra }
}

const events: EventDef[] = [
  event('ev_gamble', [1, 2, 3], [
    opt('bet', [{ kind: 'credits', amount: 50 }], {
      check: { stat: 'cha', dc: 5 },
      failure: { text: tx('lost'), effects: [{ kind: 'hp', amount: -5 }] },
    }),
    opt('leave', []),
  ]),
  event('ev_costly', [1], [
    opt('pay', [{ kind: 'credits', amount: -30 }, { kind: 'card_choice', rarity: 'rare' }], { requires: { minCredits: 30 } }),
    opt('bleed', [{ kind: 'hp', amount: -999 }, { kind: 'remove_card', count: 1 }]),
    opt('ambush', [{ kind: 'upgrade_card', count: 1 }, { kind: 'combat', encounterId: 'ev1_fight' }, { kind: 'card_choice', count: 2 }]),
  ]),
  event('ev_never', [1, 2, 3], [opt('x', [])], { requires: { flag: 'never_set' } }),
  event('ev_misc', [1, 2, 3], [
    opt('everything', [
      { kind: 'maxHp', amount: 3 },
      { kind: 'heal_party', amount: 2 },
      { kind: 'trace', amount: 10 },
      { kind: 'card', cardId: 'r_a' },
      { kind: 'implant', implantId: 'imp_c3' },
      { kind: 'consumable', id: 'grenade' },
      { kind: 'bond', id: 'se_rin', amount: 2 },
      { kind: 'stat', stat: 'str', amount: 20 },
      { kind: 'flag', key: 'met_misc', value: 2 },
      { kind: 'codex', id: 'lore_1' },
      { kind: 'junk', cardId: 'static', count: 2 },
      { kind: 'echoes', amount: 5 },
      { kind: 'upgrade_card', count: 2, random: true },
    ]),
  ]),
  ...([1, 2, 3] as const).flatMap((act) =>
    ['a', 'b', 'c', 'd'].map((s) => event(`ev_${act}${s}`, [act], [opt('take', [{ kind: 'credits', amount: 10 }]), opt('skip', [])])),
  ),
  event('a2_recruit', [2], [opt('alone', [{ kind: 'credits', amount: 30 }])], { improvise: false }),
  // A road recruit (content/eventsRecruit.ts); weight 0 so it never changes the fixture's map rolls.
  event('ev_road', [3], [opt('hide', [{ kind: 'credits', amount: 30 }]), opt('scout', [{ kind: 'trace', amount: -5 }])], {
    recruit: { trace: 8 },
    improvise: false,
    weight: 0,
  }),
]

const unlocks: MetaUnlockDef[] = [
  { id: 'arch_smuggler', kind: 'archetype', name: tx('smuggler'), text: tx('t'), cost: 30, grants: 'smuggler' },
  { id: 'comp_tae_o', kind: 'companion', name: tx('tae_o'), text: tx('t'), cost: 20, grants: 'tae_o' },
  { id: 'comp_han', kind: 'companion', name: tx('han'), text: tx('t'), cost: 20, grants: 'han', requires: 'comp_tae_o' },
  { id: 'pack_x', kind: 'card_pack', name: tx('pack'), text: tx('t'), cost: 15, grants: 'pack_x' },
  { id: 'ipack', kind: 'implant_pack', name: tx('ipack'), text: tx('t'), cost: 15, grants: 'ipack' },
  { id: 'thread_hp', kind: 'thread', name: tx('hp'), text: tx('t'), cost: 10, passive: { maxHp: 4, stats: { agi: 1 } } },
  { id: 'thread_credits', kind: 'thread', name: tx('cr'), text: tx('t'), cost: 10, passive: { startCredits: 25, traceMult: -0.5 } },
  {
    id: 'thread_remove',
    kind: 'thread',
    name: tx('rm'),
    text: tx('t'),
    cost: 10,
    passive: { startRemove: true, startConsumable: 'patch', rewardChoices: 1, restHeal: 10, shopDiscount: 0.2 },
  },
]

const starterDeck = ['strike', 'strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'guard', 'shove', 'ghost_only']

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]))

export const FIXTURE: ContentRegistry = {
  cards: byId(cards),
  consumables: byId(consumables),
  enemies: byId(enemies),
  encounters: byId(encounters),
  implants: byId(implants),
  events: byId(events),
  companions: byId(companions),
  archetypes: {
    ghost: {
      id: 'ghost',
      name: tx('ghost'),
      tagline: tx('t'),
      description: tx('d'),
      stats: { str: 3, agi: 6, int: 4, cha: 5, obs: 5 },
      maxHp: 34,
      startingDeck: starterDeck,
      startingImplant: 'starter_imp',
      startingCredits: 50,
      startUnlocked: true,
      sprite: 'player-noise',
    },
    smuggler: {
      id: 'smuggler',
      name: tx('smuggler'),
      tagline: tx('t'),
      description: tx('d'),
      stats: { str: 5, agi: 4, int: 4, cha: 6, obs: 3 },
      maxHp: 32,
      startingDeck: starterDeck.slice(0, 9).concat('smug_only'),
      startingImplant: 'starter_imp',
      startingCredits: 80,
      sprite: 'player-noise',
    },
  },
  acts: {
    1: { act: 1, name: tx('Act 1'), subtitle: tx('s'), intro: tx('i'), backdrop: 'streets', image: 'x' },
    2: { act: 2, name: tx('Act 2'), subtitle: tx('s'), intro: tx('i'), backdrop: 'undercity', image: 'x' },
    3: { act: 3, name: tx('Act 3'), subtitle: tx('s'), intro: tx('i'), backdrop: 'spire', image: 'x' },
  },
  endings: byId([
    { id: 'ending_forced_erasure', title: tx('erasure'), image: 'x', text: tx('t'), echoBonus: 5 },
    { id: 'ending_safe_refuge', title: tx('refuge'), image: 'x', text: tx('t'), requires: { maxTrace: 50 }, echoBonus: 20 },
    { id: 'ending_code_rewrite', title: tx('rewrite'), image: 'x', text: tx('t'), requires: { minBondTotal: 3, minCodex: 2 }, echoBonus: 30 },
    { id: 'ending_noble_sacrifice', title: tx('noble'), image: 'x', text: tx('t'), requires: { minTrace: 101 }, echoBonus: 15 },
  ]),
  unlocks: byId(unlocks),
  paradox: [0, 1, 2, 3, 4, 5].map((level) => ({ level, name: tx(`p${level}`), text: tx('t') })),
  lore: byId([1, 2, 3].map((i) => ({ id: `lore_${i}`, title: tx(`lore ${i}`), text: tx('t') }))),
  ixLines: { first: [tx('hi')], afterDeath: [tx('again')], afterWin: [tx('how')], generic: [tx('...')] },
}
