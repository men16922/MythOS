// IX comms trigger detection (pure CombatState diffs) and the authored line pickers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CombatEvent, CombatState, ContentRegistry, UnitState } from '../../engine/types.ts'
import { detectMoment, isFreshFight, newMemo, turnAllows } from './ixMoments.ts'
import { COMPANION_REPLIES, IX_LINES, pickCompanionReply, pickIxLine } from './talkLines.ts'

const t = (ko: string, en: string) => ({ ko, en })

const C = {
  encounters: {
    street: { id: 'street', act: 1, kind: 'normal', name: t('골목', 'Alley') },
    elite: { id: 'elite', act: 2, kind: 'elite', name: t('정예 분대', 'Elite squad') },
    boss: { id: 'boss', act: 1, kind: 'boss', name: t('해태 전', 'Haetae') },
  },
  enemies: {
    grunt: { id: 'grunt', tier: 'normal' },
    captain: { id: 'captain', tier: 'elite' },
    haetae: { id: 'haetae', tier: 'boss' },
  },
} as unknown as ContentRegistry

function unit(uid: string, side: UnitState['side'], defId: string, hp: number, maxHp = 30, name = uid): UnitState {
  return { uid, defId, side, name: t(name, name), hp, maxHp } as unknown as UnitState
}

function state(encounterId: string, o: Partial<CombatState> & { kills?: number; env?: number; taken?: number } = {}): CombatState {
  const { kills = 0, env = 0, taken = 0, ...rest } = o
  return {
    encounterId,
    turn: 1,
    phase: 'player',
    units: [unit('connector', 'party', 'connector', 30), unit('se_rin', 'party', 'se_rin', 20, 20, '정세린'), unit('e1', 'enemy', 'grunt', 10), unit('e2', 'enemy', 'grunt', 10)],
    events: [{ t: 'turn', side: 'player', turn: 1 }],
    stats: { enemiesKilled: kills, environmentKills: env, damageDealt: 0, damageTaken: taken, cardsPlayed: 0 },
    ...rest,
  } as CombatState
}

function after(prev: CombatState, add: CombatEvent[], o: Partial<CombatState> & { kills?: number; env?: number; taken?: number } = {}): CombatState {
  return state(prev.encounterId, { turn: prev.turn, units: prev.units, events: [...prev.events, ...add], ...o })
}

test('elite and boss fights open with a line; normal fights and resumed fights do not', () => {
  const elite = state('elite', { units: [unit('connector', 'party', 'connector', 30), unit('e1', 'enemy', 'captain', 40, 40, '집행 대장')] })
  const m = detectMoment(null, elite, C, 'ko', newMemo(elite))
  assert.equal(m?.trigger, 'elite_start')
  assert.equal(m?.names.enemy, '집행 대장')

  const boss = state('boss', { units: [unit('connector', 'party', 'connector', 30), unit('b', 'enemy', 'haetae', 90, 90, 'HAETAE')] })
  assert.equal(detectMoment(null, boss, C, 'en', newMemo(boss))?.names.boss, 'HAETAE')

  assert.equal(detectMoment(null, state('street'), C, 'ko', newMemo(state('street'))), null)
  const resumed = state('elite', { turn: 3, events: [{ t: 'card', owner: 'connector', cardId: 'x' }] })
  assert.equal(isFreshFight(resumed), false)
  assert.equal(detectMoment(null, resumed, C, 'ko', newMemo(resumed)), null)
})

test('a companion going down outranks kills in the same enemy phase', () => {
  const prev = state('street')
  const memo = newMemo(prev)
  const next = after(prev, [
    { t: 'turn', side: 'enemy', turn: 1 },
    { t: 'death', uid: 'se_rin', cause: 'damage' },
    { t: 'death', uid: 'e1', cause: 'damage' },
    { t: 'turn', side: 'player', turn: 2 },
  ], { turn: 2, kills: 1, env: 1 })
  const m = detectMoment(prev, next, C, 'ko', memo)
  assert.equal(m?.trigger, 'companion_down')
  assert.equal(m?.names.companion, '정세린')
  assert.equal(m?.afterEnemyPhase, true)
  assert.equal(memo.envKill, true) // the first env kill is spent even when outranked
})

test('2+ kills in one player action is a multi-kill; the same in an enemy phase is not', () => {
  const prev = state('street')
  const kill2 = after(prev, [{ t: 'death', uid: 'e1', cause: 'damage' }, { t: 'death', uid: 'e2', cause: 'damage' }], { kills: 2 })
  assert.equal(detectMoment(prev, kill2, C, 'en', newMemo(prev))?.trigger, 'multi_kill')
  const enemyPhase = after(prev, [{ t: 'turn', side: 'enemy', turn: 1 }, { t: 'death', uid: 'e1', cause: 'damage' }, { t: 'death', uid: 'e2', cause: 'damage' }], { kills: 2 })
  assert.equal(detectMoment(prev, enemyPhase, C, 'en', newMemo(prev)), null)
})

test('only the first environment kill of a fight speaks, and names the void victim', () => {
  const prev = state('street')
  const memo = newMemo(prev)
  const first = after(prev, [{ t: 'death', uid: 'e2', cause: 'void' }], { kills: 1, env: 1 })
  const m = detectMoment(prev, first, C, 'ko', memo)
  assert.equal(m?.trigger, 'env_kill')
  assert.equal(m?.names.enemy, 'e2')
  const second = after(first, [{ t: 'death', uid: 'e1', cause: 'void' }], { kills: 2, env: 2 })
  assert.equal(detectMoment(first, second, C, 'ko', memo), null)
})

test('low HP fires once below 30% and re-arms after recovering past 40%', () => {
  const prev = state('street')
  const memo = newMemo(prev)
  const hurt = (hp: number, from: CombatState) => after(from, [{ t: 'damage', uid: 'connector', amount: 1, blocked: 0, source: 'enemy' }], { units: [unit('connector', 'party', 'connector', hp), ...from.units.slice(1)] })
  const low = hurt(8, prev)
  assert.equal(detectMoment(prev, low, C, 'ko', memo)?.trigger, 'low_hp')
  const lower = hurt(5, low)
  assert.equal(detectMoment(low, lower, C, 'ko', memo), null)
  const healed = hurt(15, lower)
  assert.equal(detectMoment(lower, healed, C, 'ko', memo), null)
  assert.equal(detectMoment(healed, hurt(6, healed), C, 'ko', memo)?.trigger, 'low_hp')
})

test('boss phase change and near-flawless wins; nothing after a loss', () => {
  const units = [unit('connector', 'party', 'connector', 30), unit('b', 'enemy', 'haetae', 40, 90, 'HAETAE')]
  const prev = state('boss', { units })
  const phase = after(prev, [{ t: 'phase', uid: 'b', phase: 1, text: t('껍질이 갈라진다.', 'The shell splits.') }, { t: 'death', uid: 'e1', cause: 'damage' }])
  const m = detectMoment(prev, phase, C, 'en', newMemo(prev))
  assert.equal(m?.trigger, 'boss_phase')
  assert.equal(m?.context.phaseText, 'The shell splits.')

  const won = after(prev, [{ t: 'death', uid: 'b', cause: 'damage' }], { phase: 'won', taken: 2 })
  assert.equal(detectMoment(prev, won, C, 'ko', newMemo(prev))?.trigger, 'flawless')
  const bloody = after(prev, [{ t: 'death', uid: 'b', cause: 'damage' }], { phase: 'won', taken: 12 })
  assert.equal(detectMoment(prev, bloody, C, 'ko', newMemo(prev)), null)
  const quick = state('street')
  const quickWin = after(quick, [{ t: 'death', uid: 'e1', cause: 'damage' }], { phase: 'won' })
  assert.equal(detectMoment(quick, quickWin, C, 'ko', newMemo(quick)), null, 'a one-turn normal fight is not notable')
  const lost = after(prev, [{ t: 'death', uid: 'se_rin', cause: 'damage' }], { phase: 'lost' })
  assert.equal(detectMoment(prev, lost, C, 'ko', newMemo(prev)), null)
})

test('rate limit: one line per two player turns', () => {
  const memo = newMemo(state('street'))
  assert.equal(turnAllows(memo, 1), true)
  memo.lastLineTurn = 1
  assert.equal(turnAllows(memo, 2), false)
  assert.equal(turnAllows(memo, 3), true)
})

test('authored pickers fill names, skip unnamed variants and avoid repeats', () => {
  for (const [trigger, pool] of Object.entries(IX_LINES)) {
    for (const lang of ['ko', 'en'] as const) {
      for (let seed = 0; seed < 6; seed++) {
        const bare = pickIxLine(trigger as keyof typeof IX_LINES, lang, {}, seed)
        assert.ok(bare && !bare.includes('{'), `${trigger} ${lang}`)
        assert.ok(pool[lang].includes(bare))
      }
    }
  }
  assert.match(pickIxLine('companion_down', 'ko', { companion: '태오' }, 0), /^태오/)
  const said = COMPANION_REPLIES.kai?.ko.slice(0, 5) ?? []
  assert.equal(pickCompanionReply('kai', 'ko', said, 0), COMPANION_REPLIES.kai?.ko[5])
  assert.ok(pickCompanionReply('unknown', 'en', [], 3))
})
