// IX bends the game at boss phases, and rebuilds what killed you last loop.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT } from '../content/index.ts'
import { REPLICA_BEATEN, REPLICA_BOUNTY, connectorOf, playCard, previewPlay, selectableTargets, startCombat } from './combat.ts'
import { FIXTURE, makeRun } from './combat.fixture.test.ts'
import { dealDamage, glitchActive } from './effects.ts'
import { newProfile } from './meta.ts'
import { newRun, startAct, updateCombat } from './run.ts'
import type { ContentRegistry } from './types.ts'

const NOW = '2026-10-31T00:00:00.000Z'

test('a glitch phase announces itself, runs through the next player turn, then ends', () => {
  const grunt = FIXTURE.enemies.grunt!
  const C: ContentRegistry = {
    ...FIXTURE,
    enemies: { ...FIXTURE.enemies, grunt: { ...grunt, hp: 100, phases: [{ hpBelow: 0.5, text: { ko: 'x', en: 'x' }, glitch: 'reverse_push' }] } },
  }
  const c = startCombat(makeRun(), 'duel', C)
  const foe = c.units.find((u) => u.side === 'enemy')!
  dealDamage(c, C, foe, foe.hp - 10, { source: 'party' })
  assert.ok(c.events.some((e) => e.t === 'glitch' && e.kind === 'reverse_push'))
  assert.equal(glitchActive(c, 'reverse_push'), true)
  assert.equal(glitchActive(c, 'scramble'), false)
  c.turn += 1
  assert.equal(glitchActive(c, 'reverse_push'), true)
  c.turn += 1
  assert.equal(glitchActive(c, 'reverse_push'), false)
})

test('the reversed push is the real rule: the card shoves the other way, and the preview agrees', () => {
  const C: ContentRegistry = {
    ...FIXTURE,
    cards: {
      ...FIXTURE.cards,
      shove: { id: 'shove', name: { ko: 's', en: 's' }, text: { ko: 's', en: 's' }, type: 'attack', rarity: 'common', owner: 'any', cost: 1, target: { mode: 'melee' }, effects: [{ kind: 'push', distance: 1 }] } as ContentRegistry['cards'][string],
    },
  }
  const setup = () => {
    const c = startCombat(makeRun({}, ['shove', 'shove', 'shove', 'shove', 'shove']), 'duel', C)
    const me = connectorOf(c)!
    const foe = c.units.find((u) => u.side === 'enemy')!
    me.pos = { x: 2, y: 2 }
    foe.pos = { x: 3, y: 2 }
    c.units = c.units.filter((u) => u === me || u === foe)
    return { c, foe, card: c.hand[0]! }
  }
  const plain = setup()
  const target = selectableTargets(plain.c, C, plain.card.uid, 'connector').find((o) => o.pos?.x === 3)!
  assert.equal(playCard(plain.c, C, plain.card.uid, 'connector', target).units.find((u) => u.uid === plain.foe.uid)!.pos.x, 4)
  const bent = setup()
  bent.c.glitch = { kind: 'reverse_push', until: bent.c.turn }
  const shown = previewPlay(bent.c, C, bent.card.uid, 'connector', target).units.find((u) => u.uid === bent.foe.uid)
  const after = playCard(bent.c, C, bent.card.uid, 'connector', target).units.find((u) => u.uid === bent.foe.uid)!
  assert.ok(after.pos.x <= 3, 'pushed back into the connector, not away')
  assert.deepEqual(shown?.to ?? { x: 3, y: 2 }, after.pos, 'the preview shows what happens')
})

test('the IX bosses carry their interference, on every phase that names one', () => {
  assert.deepEqual(CONTENT.enemies.administrator_ix!.phases!.map((p) => p.glitch), ['scramble', 'reverse_push'])
  assert.deepEqual(CONTENT.enemies.ix_origin!.phases!.map((p) => p.glitch), ['scramble', 'reverse_push'])
  assert.equal(CONTENT.enemies.omega_complete!.phases![0]!.glitch, 'reboot')
})

const eliteOf = (act: number) => Object.values(CONTENT.encounters).find((e) => e.act === act && e.kind === 'elite')!.id
const normalKiller = Object.values(CONTENT.encounters).find((e) => e.act === 1 && e.kind === 'normal')!

const loopAfterDeath = (killedBy: string) => {
  const profile = { ...newProfile('T'), lastDeath: { killedBy, act: 1, loop: 1 } }
  return startAct(newRun(profile, { archetype: 'ghost', paradox: 0, seed: 5, now: NOW }, CONTENT), CONTENT)
}

test('a replica waits at the first elite from Act 2, tougher, and pays when destroyed', () => {
  const run = loopAfterDeath(normalKiller.id)
  assert.ok(run.replica)
  const original = startCombat(run, eliteOf(2), CONTENT)
  const twin = original.units.find((u) => u.uid === original.replicaUid)!
  assert.equal(twin.defId, run.replica)
  assert.ok(twin.maxHp > CONTENT.enemies[run.replica!]!.hp)
  assert.ok(twin.name.ko.startsWith('IX 복제') && twin.name.en.startsWith('IX replica'))
  assert.equal(twin.replica, true, 'marked on the board')
  assert.equal(startCombat(run, eliteOf(1), CONTENT).replicaUid, undefined, 'not in Act 1')
  const won = updateCombat({ ...run, act: 2, screen: { kind: 'combat', combat: original, nodeKind: 'elite' } }, { ...original, phase: 'won' }, CONTENT)
  assert.equal(won.flags[REPLICA_BEATEN], 1)
  assert.ok(won.screen.kind === 'reward' && won.screen.reward.credits >= REPLICA_BOUNTY)
  assert.equal(startCombat(won, eliteOf(2), CONTENT).replicaUid, undefined, 'only once')
})

test('no replica on a first loop, a daily, or from a boss-only death', () => {
  assert.equal(newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 5, now: NOW }, CONTENT).replica, undefined)
  const daily = newRun({ ...newProfile('T'), lastDeath: { killedBy: normalKiller.id, act: 1, loop: 1 } }, { archetype: 'ghost', paradox: 0, daily: '2026-10-31', now: NOW }, CONTENT)
  assert.equal(daily.replica, undefined)
  const bossOnly = Object.values(CONTENT.encounters).find((e) => e.kind === 'boss' && e.enemies.every((f) => CONTENT.enemies[f.id]?.tier === 'boss'))
  assert.ok(bossOnly, 'a boss fight with no escort exists')
  assert.equal(loopAfterDeath(bossOnly.id).replica, undefined)
})
