// 5-stat combat integration (STR/AGI/INT/CHA/OBS), Evade & Focus/Crit, 3-DoT (burn/bleed/corrode),
// statScale cards, tactical mutators, and World Echoes.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { endTurn, moveUnit, playCard, startCombat } from './combat.ts'
import { addStatus, dealDamage, FOCUS_CRIT_THRESHOLD } from './effects.ts'
import { worldEchoFor } from './legacy.ts'
import { newProfile } from './meta.ts'
import { mutatorOffersForSeed } from './mutators.ts'
import { newRun } from './run.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import type { MetaProfile, RunRecord } from './types.ts'

const NOW = '2026-10-25T00:00:00.000Z'

test('AGI grants opening evade, +1 connector move at AGI>=8, and sprint evade on 3+ tile move', () => {
  const base = startCombat(makeRun({ stats: { str: 3, agi: 5, int: 3, cha: 3, obs: 4 } }), 'duel', FIXTURE)
  const connBase = base.units.find((u) => u.uid === 'connector')!
  assert.equal(connBase.statuses.evade ?? 0, 0)
  assert.equal(connBase.move, 3)

  const agi8 = startCombat(makeRun({ stats: { str: 3, agi: 8, int: 3, cha: 3, obs: 4 } }), 'duel', FIXTURE)
  const conn8 = agi8.units.find((u) => u.uid === 'connector')!
  assert.equal(conn8.statuses.evade, 1, 'AGI 8 grants opening evade 1')
  assert.equal(conn8.move, 4, 'AGI 8 grants +1 move range')

  const moved = moveUnit(agi8, FIXTURE, 'connector', { x: conn8.pos.x + 2, y: conn8.pos.y + 1 })
  const connAfter = moved.units.find((u) => u.uid === 'connector')!
  assert.equal(connAfter.statuses.evade, 2, 'moving 3+ tiles at AGI>=6 grants +1 sprint evade')
})

test('Evade halves incoming direct attack damage, decrements by 1, and emits evaded delta', () => {
  const c = startCombat(makeRun(), 'duel', FIXTURE)
  const conn = c.units.find((u) => u.uid === 'connector')!
  const enemy = c.units.find((u) => u.side === 'enemy')!
  conn.block = 0
  addStatus(c, conn, 'evade', 1)
  const hpBefore = conn.hp
  c.events = []
  dealDamage(c, FIXTURE, conn, 7, { source: 'enemy', attacker: enemy, attack: true })
  assert.equal(hpBefore - conn.hp, 3, 'floor(7 / 2) = 3 damage taken')
  assert.equal(conn.statuses.evade ?? 0, 0, 'evade decremented by 1')
  const dmgEv = c.events.find((e) => e.t === 'damage' && e.uid === 'connector')
  assert.ok(dmgEv && dmgEv.t === 'damage' && dmgEv.evaded === 4)
})

test('OBS builds Focus on attacks and triggers Critical Hit (1.5x + armor ignore) at Focus >= 4', () => {
  const c = startCombat(makeRun({ stats: { str: 3, agi: 5, int: 3, cha: 3, obs: 8 } }), 'duel', FIXTURE)
  const conn = c.units.find((u) => u.uid === 'connector')!
  const enemy = c.units.find((u) => u.side === 'enemy')!
  assert.equal(conn.statuses.focus, 2, 'OBS 8 grants opening focus 2')

  // First non-crit attack builds +2 focus (2 -> 4)
  dealDamage(c, FIXTURE, enemy, 4, { source: 'party', attacker: conn, attack: true })
  assert.equal(conn.statuses.focus, FOCUS_CRIT_THRESHOLD, 'attack at OBS 8 reaches focus threshold 4')

  // Next attack crits: ignores armor, multiplies by 1.5x, consumes 4 focus
  enemy.armor = 3
  enemy.hp = 30
  enemy.maxHp = 30
  c.events = []
  dealDamage(c, FIXTURE, enemy, 6, { source: 'party', attacker: conn, attack: true })
  assert.equal(enemy.hp, 21, 'ceil(6 * 1.5) = 9 damage, ignoring 3 armor')
  assert.equal(conn.statuses.focus ?? 0, 0, 'crit consumes 4 focus')
  const critEv = c.events.find((e) => e.t === 'damage' && e.uid === enemy.uid)
  assert.ok(critEv && critEv.t === 'damage' && critEv.crit === true)
})

test('STR boosts Connector direct attacks and push bump damage; INT boosts DoTs; CHA shields & refunds companion', () => {
  const run = makeRun({
    stats: { str: 8, agi: 5, int: 8, cha: 6, obs: 4 },
    party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }],
  })
  const c = startCombat(run, 'a1_n1_cover', C)
  const conn = c.units.find((u) => u.uid === 'connector')!
  const serin = c.units.find((u) => u.defId === 'se_rin')!
  const enemy = c.units.find((u) => u.side === 'enemy')!

  // CHA 6 grants floor((6-2)/2) = 2 opening block to deployed companions
  assert.equal(serin.block, 2, 'CHA 6 grants opening block 2 to companion')
  assert.equal(c.hand.length, 6, 'INT 8 (>=7) draws +1 card on Turn 1')

  // STR 8 adds +2 direct attack damage for connector
  enemy.armor = 0
  enemy.block = 0
  const hp0 = enemy.hp
  dealDamage(c, C, enemy, 5, { source: 'party', attacker: conn, attack: true })
  assert.equal(hp0 - enemy.hp, 7, '5 base + 2 from STR 8')

  // INT 8 adds +2 to party-applied DoT via corrosive_rain
  enemy.pos = { x: conn.pos.x + 2, y: conn.pos.y }
  c.hand.push({ uid: 'test_corr', defId: 'corrosive_rain', upgraded: false })
  c.energy = 3
  const c2 = playCard(c, C, 'test_corr', 'connector', { pos: enemy.pos })
  const e2 = c2.units.find((u) => u.uid === enemy.uid)!
  assert.equal(e2.statuses.corrode, 4, 'corrosive_rain base 2 + 2 from INT 8 = 4')

  // CHA 6 refunds +1 energy on the first companion card played in combat
  c2.hand.push({ uid: 'test_comp', defId: 'serin_escape_route', upgraded: false })
  const energyBefore = c2.energy
  const c3 = playCard(c2, C, 'test_comp', serin.uid, {})
  assert.equal(c3.energy, energyBefore - 1 + 1, '1 cost - 1 refunded by CHA 6')

  // statScale cards: phantom_feint (evade + AGI/4) and vital_snipe (damage + OBS/2)
  c3.runStats = { str: 3, agi: 8, int: 3, cha: 3, obs: 8 }
  c3.hand.push({ uid: 'feint1', defId: 'phantom_feint', upgraded: false })
  c3.energy = 3
  const c4 = playCard(c3, C, 'feint1', 'connector', {})
  const conn4 = c4.units.find((u) => u.uid === 'connector')!
  assert.equal(conn4.statuses.evade, 3, 'base 1 + floor(8 / 4) = 3 evade')
  assert.equal(conn4.statuses.focus, 2, 'focus 2 gained')
})

test('Bleed ticks immediately on movement/pull and halves at end of enemy phase', () => {
  const c = startCombat(makeRun(), 'a1_n1_cover', C)
  const conn = c.units.find((u) => u.uid === 'connector')!
  const enemy = c.units.find((u) => u.side === 'enemy')!
  c.units = [conn, enemy]
  conn.pos = { x: 1, y: 2 }
  enemy.pos = { x: 4, y: 2 }
  for (let x = 0; x < 7; x++) c.tiles[2]![x] = { kind: 'floor' }
  enemy.hp = 30
  enemy.maxHp = 30
  enemy.block = 10
  c.hand = [{ uid: 'hook1', defId: 'crimson_hook', upgraded: false }]
  c.energy = 3

  // crimson_hook deals 2 (blocked), applies bleed 3, then pulls 2 tiles -> triggers bleed 3 immediately (ignoring block)!
  const afterHook = playCard(c, C, 'hook1', 'connector', { dir: 'right' })
  const eAfter = afterHook.units.find((u) => u.uid === enemy.uid)!
  assert.equal(eAfter.pos.x, 2, 'pulled 2 tiles west')
  assert.equal(eAfter.hp, 27, 'bleed 3 triggered on pull, ignoring 10 block')
  assert.equal(eAfter.statuses.bleed, 2, 'bleed decayed from 3 to 2 after move trigger')
})

test('Corrode strips permanent armor at end of turn and spreads to adjacent enemies on death', () => {
  const c = startCombat(makeRun(), 'pair', FIXTURE)
  const enemies = c.units.filter((u) => u.side === 'enemy')
  assert.ok(enemies.length >= 2)
  const [e1, e2] = enemies as [typeof enemies[0], typeof enemies[0]]
  e1.pos = { x: 4, y: 2 }
  e2.pos = { x: 4, y: 3 }
  e1.armor = 2
  e1.hp = 6
  addStatus(c, e1, 'corrode', 3)

  // End turn: corrode ticks for 3 damage and strips 1 armor (2 -> 1), corrode decays 3 -> 2
  const afterTurn = endTurn(c, FIXTURE)
  const e1Turn = afterTurn.units.find((u) => u.uid === e1.uid)!
  assert.equal(e1Turn.armor, 1, 'corrode stripped 1 permanent armor')
  assert.equal(e1Turn.statuses.corrode, 2, 'corrode decayed by 1')

  // Position e2Turn orthogonally adjacent to e1Turn and kill e1Turn -> spreads remaining corrode 2
  const e2Turn = afterTurn.units.find((u) => u.uid === e2.uid)!
  e2Turn.pos = { x: e1Turn.pos.x, y: e1Turn.pos.y === 0 ? 1 : e1Turn.pos.y - 1 }
  dealDamage(afterTurn, FIXTURE, e1Turn, 20, { source: 'party', pierce: true })
  assert.equal(e1Turn.hp, 0)
  assert.equal(e2Turn.statuses.corrode, 2, 'remaining corrode 2 spread to adjacent enemy on death')
})

test('World Echoes carry over from victorious endings and Tactical Mutators apply in combat', () => {
  const victoryRec = (endingId: string): RunRecord => ({
    id: 'r1',
    loop: 1,
    archetype: 'ghost',
    result: 'victory',
    endingId,
    act: 3,
    floors: 18,
    echoes: 80,
    party: ['se_rin'],
    endedAt: NOW,
  })
  const profRewrite: MetaProfile = { ...newProfile('T'), loops: 1, history: [victoryRec('ending_code_rewrite')] }
  assert.equal(worldEchoFor(profRewrite), 'world_echo_rewrite')
  const runRewrite = newRun(profRewrite, { archetype: 'ghost', paradox: 0, seed: 42, now: NOW }, C)
  assert.equal(runRewrite.flags.world_echo_rewrite, 1)
  const bossCombat = startCombat(runRewrite, 'a3_boss_ix', C)
  const boss = bossCombat.units.find((u) => u.defId === 'administrator_ix')!
  assert.equal(boss.statuses.thorns, 2, 'world_echo_rewrite adds thorns 2 & +1 armor to Administrator IX')

  const profNoble: MetaProfile = { ...newProfile('T'), loops: 1, history: [victoryRec('ending_noble_sacrifice')] }
  const runNoble = newRun(profNoble, { archetype: 'ghost', paradox: 0, seed: 42, now: NOW }, C)
  assert.equal(runNoble.flags.world_echo_noble, 1)
  const nobleCombat = startCombat(runNoble, 'a1_n1_cover', C)
  const nobleConn = nobleCombat.units.find((u) => u.uid === 'connector')!
  assert.ok(nobleConn.block >= 4, 'world_echo_noble grants +4 opening block to all party units')

  // Optional mutator on non-daily run
  const offers = mutatorOffersForSeed(42, 2)
  assert.equal(offers.length, 2)
  const acidRun = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 42, now: NOW, mutator: 'acid_rain' }, C)
  assert.equal(acidRun.mutator, 'acid_rain')
  const acidCombat = startCombat(acidRun, 'a1_n1_cover', C)
  const acidEnemy = acidCombat.units.find((u) => u.side === 'enemy')!
  assert.equal(acidEnemy.statuses.corrode, 2, 'acid_rain applies corrode 2 to enemies at combat start')
})
