// Mythos 2.0 — daily mutators (ported from 1.x `loop_modifiers`: patrol surge, market boom, signal jam).
//
// Each calendar day (KST) has ONE mutator, the same for everybody, so the daily leaderboard stays comparable —
// it just stops being the same run every day. A mutator is a small, readable trade (a boon and a burden) made
// only of dials the engine already has (trace per node, shop prices, fight credits, enemy HP, start resources,
// safehouse heal), so there is no new rule to learn and nothing hidden: the setup screen and the HUD show the
// two clauses in plain words.
//
// Picked by `mutatorForDate(dateKey)`; frozen on the run as `run.mutator` at `newRun` (so a run in progress
// never changes if the table is retuned). Non-daily runs never have one.

import { hashSeed } from './rng.ts'
import type { RunState, Text } from './types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export interface MutatorMods {
  /** Trace gained per map node (base 3; Paradox 3+ uses 5). */
  traceStep?: number
  /** Shop price change in percent (−30 = 30 % cheaper). */
  shopPct?: number
  /** Credits from fights change in percent. */
  rewardCreditsPct?: number
  /** Every enemy's HP change in percent (stacks with the Trace scaling). */
  enemyHpPct?: number
  /** Extra HP change in percent for elites and bosses. */
  eliteHpPct?: number
  /** Connector max HP change at the start. */
  maxHp?: number
  /** Credits at the start. */
  startCredits?: number
  /** Safehouse heal change in percentage points (base 30). */
  restHeal?: number
  /** Static junk cards added to the starting deck. */
  startStatic?: number
  /** Extra random consumable at the start. */
  startConsumable?: number
}

export interface MutatorDef {
  id: string
  name: Text
  /** One flavour line. */
  blurb: Text
  /** What helps. */
  boon: Text
  /** What costs. */
  burden: Text
  mods: MutatorMods
}

export const MUTATORS: MutatorDef[] = [
  {
    id: 'patrol_surge',
    name: t('순찰 급증', 'Patrol Surge'),
    blurb: t('드론이 평소보다 촘촘히 돈다. 대신 상금이 걸렸다.', 'Drones sweep tighter than usual — but there is a bounty on you.'),
    boon: t('전투 크레딧 +35%', 'Fight credits +35 %'),
    burden: t('노드마다 추적도 +5', 'Trace +5 per node'),
    mods: { traceStep: 5, rewardCreditsPct: 35 },
  },
  {
    id: 'market_boom',
    name: t('야시장 호황', 'Market Boom'),
    blurb: t('시장이 들끓는다. 물건은 싸고 일감은 박하다.', 'The market is boiling. Goods are cheap, work pays thin.'),
    boon: t('상점 가격 −30%', 'Shop prices −30 %'),
    burden: t('전투 크레딧 −30%', 'Fight credits −30 %'),
    mods: { shopPct: -30, rewardCreditsPct: -30 },
  },
  {
    id: 'iron_week',
    name: t('강철의 주', 'Iron Week'),
    blurb: t('모두가 한 겹씩 더 두껍다. 당신도, 그들도.', 'Everyone is one layer thicker. You and they.'),
    boon: t('최대 HP +10', 'Max HP +10'),
    burden: t('적 체력 +20%', 'Enemy HP +20 %'),
    mods: { maxHp: 10, enemyHpPct: 20 },
  },
  {
    id: 'glass_loop',
    name: t('유리 루프', 'Glass Loop'),
    blurb: t('깨지기 쉬운 몸으로 큰돈을 만진다.', 'A fragile body, a fat purse.'),
    boon: t('시작 크레딧 +80', 'Start with +80 ₵'),
    burden: t('최대 HP −8', 'Max HP −8'),
    mods: { startCredits: 80, maxHp: -8 },
  },
  {
    id: 'long_night',
    name: t('긴 밤', 'Long Night'),
    blurb: t('밤이 길어서 쉴 틈은 많다. 그만큼 들키기도 쉽다.', 'The night is long, so there is time to rest — and to be seen.'),
    boon: t('휴식 회복 +15%p', 'Safehouse heal +15 pts'),
    burden: t('노드마다 추적도 +4', 'Trace +4 per node'),
    mods: { restHeal: 15, traceStep: 4 },
  },
  {
    id: 'cold_boot',
    name: t('콜드 부트', 'Cold Boot'),
    blurb: t('시스템이 덜 깨어난 채로 시작한다. 주머니에는 쓸 만한 게 하나 더 있다.', 'You boot half-awake, with one useful thing extra in your pockets.'),
    boon: t('시작 소모품 +1 · 크레딧 +30', 'Start with +1 consumable and +30 ₵'),
    burden: t('시작 덱에 잡음 1장', 'A Static card in the starting deck'),
    mods: { startConsumable: 1, startCredits: 30, startStatic: 1 },
  },
  {
    id: 'tight_wire',
    name: t('팽팽한 선', 'Tight Wire'),
    blurb: t('추적은 느슨하지만, 적은 무엇이 올지 안다.', 'The trace is slack, but they know what is coming.'),
    boon: t('노드마다 추적도 +2 (−1)', 'Trace +2 per node (−1)'),
    burden: t('엘리트·보스 체력 +35%', 'Elite and boss HP +35 %'),
    mods: { traceStep: 2, eliteHpPct: 35 },
  },
  {
    id: 'scrap_season',
    name: t('고철 시즌', 'Scrap Season'),
    blurb: t('빈 손으로는 아무도 상대해 주지 않는다.', 'Nobody deals with an empty hand.'),
    boon: t('전투 크레딧 +25% · 휴식 회복 +10%p', 'Fight credits +25 % · safehouse heal +10 pts'),
    burden: t('상점 가격 +25%', 'Shop prices +25 %'),
    mods: { rewardCreditsPct: 25, restHeal: 10, shopPct: 25 },
  },
]

const BY_ID: Record<string, MutatorDef> = Object.fromEntries(MUTATORS.map((m) => [m.id, m]))

export function mutatorById(id: string | undefined): MutatorDef | undefined {
  return id ? BY_ID[id] : undefined
}

/** The day's mutator — pure in the date key, so every player sees the same one. */
export function mutatorForDate(dateKey: string): MutatorDef {
  const list = MUTATORS
  return list[hashSeed(`mutator|${dateKey}`) % list.length] as MutatorDef
}

const NONE: MutatorMods = {}

/** The run's mutator mods (empty when the run has none or the id is unknown, e.g. a retired mutator). */
export function mutatorMods(run: Pick<RunState, 'mutator'>): MutatorMods {
  return mutatorById(run.mutator)?.mods ?? NONE
}
