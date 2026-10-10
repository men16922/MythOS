import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CombatState, ContentRegistry, EncounterDef } from './types.ts'
import {
  canPlay,
  cardFace,
  consumableTargets,
  endTurn,
  intentInfo,
  legalMoves,
  moveUnit,
  partyOrigins,
  playCard,
  previewPlay,
  selectableTargets,
  startCombat,
  threatMap,
  undoMove,
  useConsumable,
} from './combat.ts'
import { dealDamage, pushUnit } from './effects.ts'
import { FIXTURE, aim, makeRun, place, setHand, silence, unit } from './combat.fixture.test.ts'

const C = FIXTURE

function withEncounter(e: EncounterDef): ContentRegistry {
  return { ...C, encounters: { ...C.encounters, [e.id]: e } }
}

function fresh(encounterId = 'duel', run = makeRun()): CombatState {
  return startCombat(run, encounterId, C)
}

const has = (c: CombatState, t: string) => c.events.some((e) => e.t === t)

// ---------------------------------------------------------------- setup

test('startCombat deploys party left, enemies telegraph, hand of 5 and 3 energy', () => {
  const c = startCombat(makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }] }), 'duel', C)
  assert.deepEqual(unit(c, 'connector').pos, { x: 1, y: 2 })
  assert.deepEqual(unit(c, 'se_rin').pos, { x: 1, y: 1 })
  assert.equal(unit(c, 'e1').side, 'enemy')
  assert.ok(unit(c, 'e1').intent, 'every enemy telegraphs at combat start')
  assert.equal(c.hand.length, 5)
  assert.equal(c.energy, 3)
  assert.equal(c.turn, 1)
  assert.equal(c.phase, 'player')
})

test('downed companions (hp 0) stay out; passives raise energy, hand and move', () => {
  const run = makeRun({ party: [{ id: 'se_rin', hp: 0, maxHp: 20, bond: 0 }], implants: ['battery'] })
  const c = startCombat(run, 'duel', C)
  assert.equal(c.units.find((u) => u.uid === 'se_rin'), undefined)
  assert.equal(c.maxEnergy, 4)
  assert.equal(c.handSize, 6)
  assert.equal(c.hand.length, 6)
  assert.equal(unit(c, 'connector').move, 4)
})

test('meta thread flags add energy, hand size, move and bump damage', () => {
  const run = makeRun({ flags: { thread_energy: 1, thread_handSize: 1, thread_move: 1, thread_bumpDamage: 1 } })
  const c = startCombat(run, 'pair', C)
  assert.equal(c.maxEnergy, 4)
  assert.equal(c.handSize, 6)
  assert.equal(unit(c, 'connector').move, 4)
  silence(c)
  place(c, 'connector', { x: 2, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 4, y: 2 })
  setHand(c, ['shove'])
  const after = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(after, 'e2').hp, 8)
  assert.deepEqual(JSON.parse(JSON.stringify(after)), after)
})

test('connector never deploys onto cover', () => {
  const c = fresh('terrain')
  const p = unit(c, 'connector').pos
  assert.notDeepEqual(p, { x: 1, y: 2 })
  assert.equal(c.tiles[p.y]?.[p.x]?.kind, 'floor')
})

test('trace and paradox scale enemies; PURGE adds a purge drone', () => {
  assert.equal(unit(startCombat(makeRun({ trace: 40 }), 'duel', C), 'e1').maxHp, 12)
  const hunted = startCombat(makeRun({ trace: 70 }), 'duel', C)
  assert.equal(unit(hunted, 'e1').maxHp, 13)
  aim(hunted, 'e1', 'slash', 'left')
  assert.equal(intentInfo(hunted, C, 'e1')?.damage, 4)
  assert.equal(unit(startCombat(makeRun({ paradox: 1 }), 'elite', C), 'e1').maxHp, 17)
  const purge = startCombat(makeRun({ trace: 100 }), 'duel', C)
  const drone = purge.units.find((u) => u.defId === 'purge_drone')
  assert.ok(drone?.flying)
})

// ---------------------------------------------------------------- telegraphs

test('telegraphed attack hits whatever stands on the tile; dodging works', () => {
  const c = fresh()
  place(c, 'e1', { x: 2, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  assert.deepEqual(intentInfo(c, C, 'e1')?.tiles, [{ x: 1, y: 2 }])
  assert.equal(threatMap(c, C)['1,2'], 3)
  const hit = endTurn(c, C)
  assert.equal(unit(hit, 'connector').hp, 31)

  const dodged = endTurn(moveUnit(c, C, 'connector', { x: 1, y: 0 }), C)
  assert.equal(unit(dodged, 'connector').hp, 34)
})

test('pushing an enemy drags its relative attack onto its own ally', () => {
  const c = fresh('pair')
  place(c, 'connector', { x: 2, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 4, y: 3 })
  silence(c)
  aim(c, 'e1', 'slash', 'down') // currently aims at the empty (3,3)
  setHand(c, ['shove'])
  const pushed = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.deepEqual(unit(pushed, 'e1').pos, { x: 4, y: 2 })
  assert.deepEqual(intentInfo(pushed, C, 'e1')?.tiles, [{ x: 4, y: 3 }])
  const after = endTurn(pushed, C)
  assert.equal(unit(after, 'e2').hp, 7)
  assert.equal(unit(after, 'e2').lastHitBy, 'enemy')
})

test('a lifesteal attack (heal → owner) only heals when it hits someone', () => {
  const grunt = C.enemies.grunt
  assert.ok(grunt)
  const leech = {
    ...grunt,
    id: 'leech',
    moves: [{ id: 'devour', name: grunt.name, pattern: 'melee' as const, damage: 6, effects: [{ kind: 'heal' as const, amount: 6, to: 'owner' as const }] }],
  }
  const C2: ContentRegistry = {
    ...withEncounter({ ...C.encounters.duel!, id: 'leech_duel', enemies: [{ id: 'leech', pos: { x: 2, y: 2 } }] }),
    enemies: { ...C.enemies, leech },
  }
  const c = startCombat(makeRun(), 'leech_duel', C2)
  place(c, 'e1', { x: 2, y: 2 })
  unit(c, 'e1').hp = 4
  aim(c, 'e1', 'devour', 'left')

  const hit = endTurn(c, C2)
  assert.equal(unit(hit, 'connector').hp, 28, 'the bite lands on the connector')
  assert.equal(unit(hit, 'e1').hp, 10, 'and heals the biter')

  const whiff = endTurn(moveUnit(c, C2, 'connector', { x: 1, y: 0 }), C2)
  assert.equal(unit(whiff, 'connector').hp, 34)
  assert.equal(unit(whiff, 'e1').hp, 4, 'a bite into an empty tile heals nothing')
})

test("an area attack's debuff skips its own caster (IX's Purge List no longer marks IX)", () => {
  const grunt = C.enemies.grunt
  assert.ok(grunt)
  const tagger = {
    ...grunt,
    id: 'tagger',
    moves: [
      {
        id: 'purge',
        name: grunt.name,
        pattern: 'lob' as const,
        damage: 2,
        area: 'square' as const,
        effects: [{ kind: 'status' as const, status: 'mark' as const, amount: 2 }],
      },
    ],
  }
  const C2: ContentRegistry = {
    ...withEncounter({ ...C.encounters.duel!, id: 'tag_duel', enemies: [{ id: 'tagger', pos: { x: 2, y: 2 } }] }),
    enemies: { ...C.enemies, tagger },
  }
  const c = startCombat(makeRun(), 'tag_duel', C2)
  place(c, 'e1', { x: 2, y: 2 })
  place(c, 'connector', { x: 4, y: 2 })
  // The 3×3 lands on (3,2): it covers the connector and — after a shove — the caster itself.
  aim(c, 'e1', 'purge', { x: 3, y: 2 })
  const after = endTurn(c, C2)
  assert.equal(unit(after, 'connector').statuses.mark, 2, 'the connector is marked')
  assert.equal(unit(after, 'e1').statuses.mark, undefined, 'the caster does not mark itself')
  assert.equal(unit(after, 'e1').hp, unit(c, 'e1').hp, 'nor damage itself')
})

test('friendly-fire kill counts as an environment kill and fires environment_kill triggers', () => {
  const c = fresh('pair', makeRun({ implants: ['bounty'] }))
  place(c, 'connector', { x: 0, y: 0 })
  place(c, 'e1', { x: 4, y: 2 })
  place(c, 'e2', { x: 4, y: 3 })
  unit(c, 'e2').hp = 2
  silence(c)
  aim(c, 'e1', 'slash', 'down')
  const after = endTurn(c, C)
  assert.equal(after.units.find((u) => u.uid === 'e2'), undefined)
  assert.equal(after.stats.environmentKills, 1)
  assert.equal(after.credits, 3)
  assert.ok(after.events.some((e) => e.t === 'trigger' && e.implantId === 'bounty'))
})

test('a line intent hits the first unit in its lane, ally or not', () => {
  const c = fresh('pair')
  silence(c)
  place(c, 'connector', { x: 0, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 5, y: 2 })
  unit(c, 'e2').defId = 'gunner'
  aim(c, 'e2', 'shoot', 'left')
  assert.deepEqual(intentInfo(c, C, 'e2')?.tiles, [{ x: 3, y: 2 }])
  const after = endTurn(c, C)
  assert.equal(unit(after, 'e1').hp, 8)
  assert.equal(unit(after, 'connector').hp, 34)
})

test('charge dashes to the blocker, hits and pushes it', () => {
  const c = fresh('duel')
  unit(c, 'e1').defId = 'bull'
  place(c, 'e1', { x: 5, y: 2 })
  aim(c, 'e1', 'gore', 'left')
  assert.deepEqual(intentInfo(c, C, 'e1')?.tiles, [{ x: 1, y: 2 }])
  const after = endTurn(c, C)
  const conn = unit(after, 'connector')
  assert.equal(conn.hp, 30)
  assert.ok(after.events.some((e) => e.t === 'push' && e.uid === 'connector' && e.to.x === 0))
})

test('lob hits the fixed tile it telegraphed even after the target leaves', () => {
  const c = fresh('pair')
  silence(c)
  unit(c, 'e1').defId = 'mortar'
  place(c, 'e1', { x: 5, y: 0 })
  aim(c, 'e1', 'shell', { x: 1, y: 2 })
  place(c, 'e2', { x: 4, y: 4 })
  const moved = moveUnit(c, C, 'connector', { x: 0, y: 4 })
  // Park the other grunt on the shelled tile: it eats its ally's shell.
  place(moved, 'e2', { x: 1, y: 2 })
  const after = endTurn(moved, C)
  assert.equal(unit(after, 'connector').hp, 34)
  assert.equal(unit(after, 'e2').hp, 7)
})

// ---------------------------------------------------------------- push / bump / void / hazard

test('bump: pushed unit and blocker each take 1 (+bumpDamage passive for enemies)', () => {
  const c = fresh('pair')
  silence(c)
  place(c, 'connector', { x: 2, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 4, y: 2 })
  setHand(c, ['shove'])
  const after = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(after, 'e1').hp, 7)
  assert.equal(unit(after, 'e2').hp, 9)
  assert.deepEqual(unit(after, 'e1').pos, { x: 3, y: 2 })
  assert.ok(after.events.some((e) => e.t === 'push' && e.bumped === 'e2'))

  const spiked = fresh('pair', makeRun({ implants: ['spikes'] }))
  silence(spiked)
  place(spiked, 'connector', { x: 2, y: 2 })
  place(spiked, 'e1', { x: 3, y: 2 })
  place(spiked, 'e2', { x: 4, y: 2 })
  setHand(spiked, ['shove'])
  const after2 = playCard(spiked, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(after2, 'e1').hp, 6)
  assert.equal(unit(after2, 'e2').hp, 8)
})

test('bump into cover chips the cover; bump into the edge hurts the pushed unit', () => {
  const c = fresh('terrain')
  silence(c)
  place(c, 'connector', { x: 5, y: 0 })
  place(c, 'e1', { x: 4, y: 0 })
  setHand(c, ['shove', 'shove'])
  const once = playCard(c, C, 'h1', 'connector', { dir: 'left' })
  assert.equal(unit(once, 'e1').hp, 7)
  assert.equal(once.tiles[0]?.[3]?.hp, 1)
  const twice = playCard(once, C, 'h2', 'connector', { dir: 'left' })
  assert.equal(twice.tiles[0]?.[3]?.kind, 'floor')
  assert.ok(twice.events.some((e) => e.t === 'tile' && e.kind === 'floor'))

  const edge = fresh('duel')
  silence(edge)
  place(edge, 'connector', { x: 5, y: 2 })
  place(edge, 'e1', { x: 6, y: 2 })
  setHand(edge, ['shove'])
  const after = playCard(edge, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(after, 'e1').hp, 7)
  assert.ok(after.events.some((e) => e.t === 'push' && e.bumped === 'wall'))
})

test('enemy pushed into void is deleted; party treats void as a wall', () => {
  const c = fresh('terrain')
  silence(c)
  place(c, 'connector', { x: 4, y: 2 })
  place(c, 'e1', { x: 4, y: 3 })
  setHand(c, ['shove'])
  const after = playCard(c, C, 'h1', 'connector', { dir: 'down' })
  assert.equal(after.units.find((u) => u.uid === 'e1'), undefined)
  assert.ok(after.events.some((e) => e.t === 'death' && e.uid === 'e1' && e.cause === 'void'))
  assert.equal(after.stats.environmentKills, 1)
  assert.equal(after.phase, 'won')

  const d = fresh('terrain')
  const conn = place(d, 'connector', { x: 4, y: 3 })
  pushUnit(d, C, conn, 'down', 1)
  assert.deepEqual(conn.pos, { x: 4, y: 3 })
  assert.equal(conn.hp, 33)
})

test('hazard: pushed onto it or ending the enemy phase on it deals 2', () => {
  const c = fresh('terrain')
  silence(c)
  place(c, 'connector', { x: 3, y: 1 })
  place(c, 'e1', { x: 3, y: 2 })
  setHand(c, ['shove'])
  const pushed = playCard(c, C, 'h1', 'connector', { dir: 'down' })
  assert.deepEqual(unit(pushed, 'e1').pos, { x: 3, y: 3 })
  assert.equal(unit(pushed, 'e1').hp, 6)
  const after = endTurn(pushed, C)
  assert.equal(unit(after, 'e1').hp, 4)
})

test('pull stops in front of the puller without bumping it', () => {
  const c = fresh('duel')
  silence(c)
  setHand(c, ['hook'])
  const after = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.deepEqual(unit(after, 'e1').pos, { x: 2, y: 2 })
  assert.equal(unit(after, 'e1').hp, 10)
  assert.equal(unit(after, 'connector').hp, 34)
})

test('area push: neighbours fly away from the impact, the centre goes along the throw', () => {
  const c = fresh('pair')
  silence(c)
  place(c, 'connector', { x: 0, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 3, y: 1 })
  setHand(c, ['grenade'])
  const after = playCard(c, C, 'h1', 'connector', { pos: { x: 3, y: 2 } })
  assert.deepEqual(unit(after, 'e1').pos, { x: 4, y: 2 })
  assert.deepEqual(unit(after, 'e2').pos, { x: 3, y: 0 })
  assert.equal(unit(after, 'e1').hp, 8)
  assert.equal(unit(after, 'e2').hp, 8)
})

test('nova pushes every hit unit outward from the enemy, not along its facing', () => {
  const c = startCombat(makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }] }), 'duel', C)
  unit(c, 'e1').defId = 'pulser'
  place(c, 'e1', { x: 2, y: 2 })
  place(c, 'connector', { x: 1, y: 2 })
  place(c, 'se_rin', { x: 2, y: 1 })
  aim(c, 'e1', 'pulse', 'down')
  const after = endTurn(c, C)
  assert.ok(after.events.some((e) => e.t === 'push' && e.uid === 'connector' && e.to.x === 0 && e.to.y === 2))
  assert.ok(after.events.some((e) => e.t === 'push' && e.uid === 'se_rin' && e.to.x === 2 && e.to.y === 0))
})

test('held junk applies its heldEffects at end of turn (trace, pierce damage to the connector)', () => {
  const c = fresh('duel')
  silence(c)
  place(c, 'e1', { x: 6, y: 4 })
  unit(c, 'connector').block = 10
  setHand(c, ['bug', 'rot'])
  const after = endTurn(c, C)
  assert.equal(after.trace, 3)
  assert.equal(unit(after, 'connector').hp, 32, 'pierce ignores block')
})

// ---------------------------------------------------------------- intent manipulation

test('redirect turns a relative intent around onto the enemy behind it', () => {
  const c = fresh('pair')
  silence(c)
  place(c, 'connector', { x: 2, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 4, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  setHand(c, ['flip'])
  const flipped = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(flipped, 'e1').intent?.dir, 'right')
  const after = endTurn(flipped, C)
  assert.equal(unit(after, 'connector').hp, 34)
  assert.equal(unit(after, 'e2').hp, 7)
})

test('cancel_intent removes the attack; shock fizzles it and pins the enemy', () => {
  const c = fresh('duel')
  place(c, 'e1', { x: 2, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  setHand(c, ['jam', 'zap'])
  const jammed = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(jammed, 'e1').intent, null)
  assert.equal(unit(endTurn(jammed, C), 'connector').hp, 34)

  const zapped = playCard(c, C, 'h2', 'connector', { dir: 'right' })
  const after = endTurn(zapped, C)
  assert.equal(unit(after, 'connector').hp, 34)
  assert.ok(after.events.some((e) => e.t === 'fizzle' && e.uid === 'e1'))
  assert.ok(unit(after, 'e1').intent, 'it telegraphs again after the fizzle')

  const pinned = structuredClone(c)
  place(pinned, 'e1', { x: 4, y: 0 })
  unit(pinned, 'e1').statuses.shock = 2
  const stuck = endTurn(pinned, C)
  assert.deepEqual(unit(stuck, 'e1').pos, { x: 4, y: 0 })
  assert.equal(unit(stuck, 'e1').statuses.shock, 1)
})

test('windup: holds position for one phase, then fires', () => {
  const c = fresh('elite')
  place(c, 'e1', { x: 2, y: 2 })
  aim(c, 'e1', 'smash', 'left', 1)
  assert.equal(threatMap(c, C)['1,2'], undefined, 'windup is not next-phase damage')
  const first = endTurn(c, C)
  assert.equal(unit(first, 'connector').hp, 34)
  assert.deepEqual(unit(first, 'e1').pos, { x: 2, y: 2 })
  assert.equal(unit(first, 'e1').intent?.windupLeft, 0)
  assert.equal(intentInfo(first, C, 'e1')?.damage, 6)
  const second = endTurn(first, C)
  assert.equal(unit(second, 'connector').hp, 28)
})

// ---------------------------------------------------------------- statuses & block

test('burn ticks at the end of the enemy phase through block, then decays', () => {
  const c = fresh('duel')
  silence(c)
  place(c, 'e1', { x: 6, y: 4 })
  const conn = unit(c, 'connector')
  conn.statuses.burn = 3
  conn.block = 5
  const t1 = endTurn(c, C)
  assert.equal(unit(t1, 'connector').hp, 31)
  assert.equal(unit(t1, 'connector').statuses.burn, 2)

  const e = fresh('duel')
  silence(e)
  setHand(e, ['ignite'])
  const lit = endTurn(playCard(e, C, 'h1', 'connector', { dir: 'right' }), C)
  assert.equal(unit(lit, 'e1').hp, 7)
  assert.equal(unit(lit, 'e1').statuses.burn, 2)
})

test('mark adds to the next hit only', () => {
  const c = fresh('duel')
  silence(c)
  setHand(c, ['paint', 'shot', 'shot'])
  c.energy = 5
  const marked = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(marked, 'e1').statuses.mark, 3)
  const hit = playCard(marked, C, 'h2', 'connector', { dir: 'right' })
  assert.equal(unit(hit, 'e1').hp, 3)
  assert.equal(unit(hit, 'e1').statuses.mark, undefined)
  const again = playCard(hit, C, 'h3', 'connector', { dir: 'right' })
  assert.equal(again.units.find((u) => u.uid === 'e1'), undefined)
})

test('party block survives the enemy phase and clears at the next player turn', () => {
  const c = fresh('duel')
  place(c, 'e1', { x: 2, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  setHand(c, ['barrier'])
  const shielded = playCard(c, C, 'h1', 'connector', {})
  assert.equal(unit(shielded, 'connector').block, 5)
  const after = endTurn(shielded, C)
  assert.equal(unit(after, 'connector').hp, 34)
  assert.equal(unit(after, 'connector').block, 0)
  assert.ok(after.events.some((e) => e.t === 'damage' && e.uid === 'connector' && e.blocked === 3))
})

test('enemy block clears at the start of the enemy phase; armor reduces hits', () => {
  const c = fresh('elite')
  silence(c)
  unit(c, 'e1').block = 4
  setHand(c, ['shot'])
  const hit = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(unit(hit, 'e1').hp, 14, 'armor 1 + block 4 eat the 4-damage shot')
  const after = endTurn(c, C)
  assert.equal(unit(after, 'e1').block, 0)
})

test('guard power grants block every player turn; powers exhaust', () => {
  const c = fresh('duel')
  silence(c)
  setHand(c, ['bulwark'])
  const powered = playCard(c, C, 'h1', 'connector', {})
  assert.equal(powered.exhaust.length, 1)
  assert.equal(unit(powered, 'connector').statuses.guard, 2)
  const next = endTurn(powered, C)
  assert.equal(unit(next, 'connector').block, 2)
})

// ---------------------------------------------------------------- movement

test('move is free, once per unit, blocked by enemies/cover, undoable until a card is played', () => {
  const c = fresh('terrain')
  silence(c)
  const conn = unit(c, 'connector')
  const moves = legalMoves(c, 'connector')
  assert.ok(moves.length > 0)
  assert.ok(!moves.some((p) => c.tiles[p.y]?.[p.x]?.kind === 'cover' || c.tiles[p.y]?.[p.x]?.kind === 'void'))
  const target = moves[0]
  assert.ok(target)
  const moved = moveUnit(c, C, 'connector', target)
  assert.deepEqual(unit(moved, 'connector').pos, target)
  assert.equal(legalMoves(moved, 'connector').length, 0)
  assert.throws(() => moveUnit(moved, C, 'connector', conn.pos))
  const undone = undoMove(moved)
  assert.deepEqual(unit(undone, 'connector').pos, conn.pos)
  assert.equal(unit(undone, 'connector').moved, false)
  assert.ok(undone.events.length > moved.events.length - 1, 'event log stays monotonic')

  setHand(moved, ['barrier'])
  const played = playCard(moved, C, 'h1', 'connector', {})
  assert.equal(played.undo, null)
  assert.equal(undoMove(played), played)
})

test('shocked party units cannot move; allies can be passed through', () => {
  const c = startCombat(makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }] }), 'duel', C)
  place(c, 'se_rin', { x: 1, y: 1 })
  place(c, 'connector', { x: 1, y: 2 })
  const moves = legalMoves(c, 'se_rin')
  assert.ok(moves.some((p) => p.x === 1 && p.y === 3), 'passes through the connector')
  unit(c, 'se_rin').statuses.shock = 1
  assert.equal(legalMoves(c, 'se_rin').length, 0)
})

// ---------------------------------------------------------------- card rules

test('card owner rules, junk, energy and downed companions', () => {
  const c = startCombat(makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }] }), 'duel', C)
  silence(c)
  setHand(c, ['uplink', 'serin_cut', 'strike', 'static_junk'])
  assert.equal(canPlay(c, C, 'h1', 'se_rin').ok, false)
  assert.equal(canPlay(c, C, 'h1', 'connector').ok, true)
  assert.equal(canPlay(c, C, 'h2', 'connector').ok, false)
  assert.equal(canPlay(c, C, 'h2', 'se_rin').ok, true)
  assert.deepEqual(partyOrigins(c, C, 'h3').sort(), ['connector', 'se_rin'])
  assert.deepEqual(partyOrigins(c, C, 'h2'), ['se_rin'])
  const junk = canPlay(c, C, 'h4', 'connector')
  assert.equal(junk.ok, false)
  assert.ok(junk.reason?.ko && junk.reason.en)
  const broke = structuredClone(c)
  broke.energy = 0
  assert.equal(canPlay(broke, C, 'h3', 'connector').reason?.en, 'Not enough energy')

  const downed = structuredClone(c)
  dealDamage(downed, C, unit(downed, 'se_rin'), 99, { source: 'enemy' })
  assert.equal(downed.units.find((u) => u.uid === 'se_rin'), undefined)
  assert.equal(canPlay(downed, C, 'h2', 'connector').reason?.en, 'Its owner is down')
  assert.deepEqual(partyOrigins(downed, C, 'h2'), [])
})

test('cardFace merges the upgrade over the base face', () => {
  const def = C.cards.strike
  assert.ok(def)
  assert.deepEqual(cardFace(def, false).effects, [{ kind: 'damage', amount: 6 }])
  assert.deepEqual(cardFace(def, true).effects, [{ kind: 'damage', amount: 9 }])
  assert.equal(cardFace(def, true).cost, 1)
})

test('selectableTargets: line stops at the first unit; lob respects min range', () => {
  const c = fresh('pair')
  place(c, 'e1', { x: 4, y: 2 })
  place(c, 'e2', { x: 5, y: 2 })
  setHand(c, ['shot', 'grenade'])
  const right = selectableTargets(c, C, 'h1', 'connector').find((o) => o.dir === 'right')
  assert.deepEqual(right?.pos, { x: 4, y: 2 })
  const lobs = selectableTargets(c, C, 'h2', 'connector')
  assert.ok(lobs.every((o) => o.pos && Math.abs(o.pos.x - 1) + Math.abs(o.pos.y - 2) >= 2))
  const cross = lobs.find((o) => o.pos?.x === 3 && o.pos.y === 2)
  assert.equal(cross?.tiles.length, 5)
})

test('retain keeps a card through end of turn; hand caps at 10; draw reshuffles the discard', () => {
  const c = fresh('duel')
  silence(c)
  setHand(c, ['focus', 'strike'])
  c.draw = Array.from({ length: 8 }, (_, i) => ({ uid: `d${i}`, defId: 'shot', upgraded: false }))
  const next = endTurn(c, C)
  assert.ok(next.hand.some((k) => k.uid === 'h1'))
  assert.ok(!next.hand.some((k) => k.uid === 'h2'))
  assert.ok(next.discard.some((k) => k.uid === 'h2'))
  assert.equal(next.hand.length, 5, 'draws up to hand size, counting the retained card')

  const d = fresh('duel')
  silence(d)
  d.draw = []
  d.discard = [{ uid: 'z1', defId: 'shot', upgraded: false }]
  setHand(d, ['focus'])
  const drew = playCard(d, C, 'h1', 'connector', {})
  assert.deepEqual(drew.hand.map((k) => k.uid), ['z1'])
  assert.equal(drew.discard.length, 1)
})

test('teleport moves the origin to an empty tile', () => {
  const c = fresh('duel')
  silence(c)
  setHand(c, ['blink'])
  const opts = selectableTargets(c, C, 'h1', 'connector')
  assert.ok(opts.every((o) => o.pos && !(o.pos.x === 5 && o.pos.y === 2)))
  const after = playCard(c, C, 'h1', 'connector', { pos: { x: 3, y: 3 } })
  assert.deepEqual(unit(after, 'connector').pos, { x: 3, y: 3 })
})

test('consumables are free, targeted and used up', () => {
  const c = fresh('duel', makeRun({ consumables: ['frag', 'stim'] }))
  silence(c)
  place(c, 'e1', { x: 5, y: 2 })
  assert.ok(consumableTargets(c, C, 0, 'connector').length > 0)
  const after = useConsumable(c, C, 0, 'connector', { pos: { x: 5, y: 2 } })
  assert.equal(unit(after, 'e1').hp, 6)
  assert.deepEqual(after.consumables, ['stim'])
  assert.equal(after.energy, 3)
})

test('group scopes and run-level effects: all_enemies damage + trace', () => {
  const c = fresh('pair')
  silence(c)
  setHand(c, ['loud'])
  const after = playCard(c, C, 'h1', 'connector', {})
  assert.equal(unit(after, 'e1').hp, 8)
  assert.equal(unit(after, 'e2').hp, 8)
  assert.equal(after.trace, 3)
})

// ---------------------------------------------------------------- flow: reinforcements, objectives, bonus

test('reinforcements are announced a turn early and a blocker takes 2', () => {
  const c = fresh('reinforce')
  silence(c)
  assert.deepEqual(c.incoming, [{ pos: { x: 3, y: 2 }, enemyId: 'grunt' }])
  place(c, 'connector', { x: 3, y: 2 })
  const after = endTurn(c, C)
  assert.equal(unit(after, 'connector').hp, 32)
  const grunt = after.units.find((u) => u.defId === 'grunt')
  assert.ok(grunt)
  assert.notDeepEqual(grunt.pos, { x: 3, y: 2 })
  assert.ok(has(after, 'spawn'))
  assert.deepEqual(after.incoming, [])
})

test('survive objective wins after N enemy phases', () => {
  let c = fresh('hold')
  silence(c)
  place(c, 'connector', { x: 0, y: 0 })
  c = endTurn(c, C)
  assert.equal(c.phase, 'player')
  silence(c)
  c = endTurn(c, C)
  assert.equal(c.phase, 'won')
})

test('protect bonus fails when the neutral dies; untouched and turn_limit track too', () => {
  const c = fresh('escort')
  silence(c)
  place(c, 'e1', { x: 1, y: 0 })
  aim(c, 'e1', 'slash', 'left')
  unit(c, 'neutral').hp = 3
  const after = endTurn(c, C)
  assert.equal(after.units.find((u) => u.uid === 'neutral'), undefined)
  assert.equal(after.bonus?.failed, true)

  const C2 = withEncounter({ id: 'clean', act: 1, kind: 'normal', name: { ko: 'c', en: 'c' }, backdrop: 'streets', enemies: [{ id: 'grunt', pos: { x: 2, y: 2 } }], bonus: { kind: 'untouched' } })
  const u0 = startCombat(makeRun(), 'clean', C2)
  place(u0, 'e1', { x: 2, y: 2 })
  aim(u0, 'e1', 'slash', 'left')
  assert.equal(endTurn(u0, C2).bonus?.failed, true)

  const C3 = withEncounter({ id: 'fast', act: 1, kind: 'normal', name: { ko: 'f', en: 'f' }, backdrop: 'streets', enemies: [{ id: 'grunt', pos: { x: 6, y: 4 } }], bonus: { kind: 'turn_limit', turns: 1 } })
  const f0 = startCombat(makeRun(), 'fast', C3)
  silence(f0)
  assert.equal(f0.bonus?.failed, false)
  assert.equal(endTurn(f0, C3).bonus?.failed, true)
})

test('environment bonus counts push kills', () => {
  const C2 = withEncounter({
    id: 'env',
    act: 1,
    kind: 'normal',
    name: { ko: 'e', en: 'e' },
    backdrop: 'streets',
    enemies: [{ id: 'grunt', pos: { x: 4, y: 3 } }],
    terrain: [{ pos: { x: 4, y: 4 }, kind: 'void' }],
    bonus: { kind: 'environment', count: 1 },
  })
  const c = startCombat(makeRun(), 'env', C2)
  silence(c)
  place(c, 'e1', { x: 4, y: 3 })
  place(c, 'connector', { x: 4, y: 2 })
  setHand(c, ['shove'])
  const after = playCard(c, C2, 'h1', 'connector', { dir: 'down' })
  assert.equal(after.phase, 'won')
  assert.deepEqual(after.bonus, { def: { kind: 'environment', count: 1 }, progress: 1, failed: false })
})

test('win when the last enemy dies; lose when the connector drops (connector stays at 0 hp)', () => {
  const c = fresh('duel', makeRun({ implants: ['plating'] }))
  silence(c)
  unit(c, 'e1').hp = 4
  setHand(c, ['shot'])
  const won = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(won.phase, 'won')
  assert.throws(() => endTurn(won, C))

  const d = fresh('duel')
  place(d, 'e1', { x: 2, y: 2 })
  aim(d, 'e1', 'slash', 'left')
  unit(d, 'connector').hp = 2
  const lost = endTurn(d, C)
  assert.equal(lost.phase, 'lost')
  assert.equal(unit(lost, 'connector').hp, 0)
})

// ---------------------------------------------------------------- triggers

test('implant triggers fire with per-turn and per-combat limits', () => {
  const c = fresh('duel', makeRun({ implants: ['plating', 'rhythm'] }))
  assert.equal(unit(c, 'connector').block, 4, 'combat_start block')
  silence(c)
  place(c, 'e1', { x: 2, y: 2 })
  unit(c, 'e1').hp = 99
  unit(c, 'e1').maxHp = 99
  setHand(c, ['strike', 'strike'])
  const one = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  const two = playCard(one, C, 'h2', 'connector', { dir: 'right' })
  assert.equal(unit(two, 'connector').block, 5)
  assert.equal(two.events.filter((e) => e.t === 'trigger' && e.implantId === 'rhythm').length, 1)
  silence(two)
  const next = endTurn(two, C)
  setHand(next, ['strike'])
  place(next, 'e1', { x: 2, y: 2 })
  const three = playCard(next, C, 'h1', 'connector', { dir: 'right' })
  assert.equal(three.events.filter((e) => e.t === 'trigger' && e.implantId === 'rhythm').length, 2)
})

test('energy and draws gained during the enemy phase carry into the next turn', () => {
  const c = fresh('pair', makeRun({ implants: ['pain', 'scavenger'] }))
  silence(c)
  place(c, 'connector', { x: 1, y: 2 })
  // e1 slashes the connector (pain: +1 energy), then e2's shot kills e1 (scavenger: +1 draw).
  place(c, 'e1', { x: 2, y: 2 })
  aim(c, 'e1', 'slash', 'left')
  unit(c, 'e1').hp = 1
  place(c, 'e2', { x: 2, y: 3 })
  unit(c, 'e2').defId = 'gunner'
  aim(c, 'e2', 'shoot', 'up')
  c.draw = Array.from({ length: 10 }, (_, i) => ({ uid: `d${i}`, defId: 'shot', upgraded: false }))
  const after = endTurn(c, C)
  assert.ok(after.events.some((e) => e.t === 'death' && e.uid === 'e1'))
  assert.equal(after.energy, 4, '3 + 1 from taking damage')
  assert.equal(after.hand.length, 6, '5 + 1 from the environment kill')
})

// ---------------------------------------------------------------- boss

test('boss enters its phase below the threshold and unlocks phase moves', () => {
  const c = fresh('boss')
  silence(c)
  dealDamage(c, C, unit(c, 'e1'), 21, { source: 'party' })
  const boss = unit(c, 'e1')
  assert.equal(boss.phase, 1)
  assert.equal(boss.hp, 24)
  assert.ok(c.events.some((e) => e.t === 'phase' && e.uid === 'e1'))
  place(c, 'connector', { x: 0, y: 2 })
  const after = endTurn(c, C)
  assert.ok(unit(after, 'e1').intent)
})

test('killing the boss shuts down its remaining minions and wins the fight', () => {
  const C2 = withEncounter({ ...C.encounters.boss!, id: 'boss_court', enemies: [{ id: 'boss', pos: { x: 4, y: 2 } }, { id: 'minion', pos: { x: 6, y: 0 } }, { id: 'drone', pos: { x: 6, y: 4 } }] })
  const c = startCombat(makeRun(), 'boss_court', C2)
  const credits = c.credits
  dealDamage(c, C2, unit(c, 'e1'), 999, { source: 'party' })
  assert.equal(c.phase, 'won')
  assert.equal(c.units.filter((u) => u.side === 'enemy').length, 0)
  assert.equal(c.events.filter((e) => e.t === 'death' && e.cause === 'collapse').length, 2)
  assert.equal(c.stats.enemiesKilled, 1, 'only the boss counts as a kill')
  assert.equal(c.credits - credits, C2.enemies.boss!.bounty ?? 0, 'collapsed minions pay no bounty')
})

test('killing a minion in a boss fight does not collapse anything', () => {
  const C2 = withEncounter({ ...C.encounters.boss!, id: 'boss_court', enemies: [{ id: 'boss', pos: { x: 4, y: 2 } }, { id: 'minion', pos: { x: 6, y: 0 } }] })
  const c = startCombat(makeRun(), 'boss_court', C2)
  dealDamage(c, C2, unit(c, 'e2'), 999, { source: 'party' })
  assert.equal(c.phase, 'player')
  assert.ok(unit(c, 'e1').hp > 0)
})

// ---------------------------------------------------------------- AI

test('brawler closes in and telegraphs onto the connector', () => {
  const c = fresh('duel')
  silence(c)
  const after = endTurn(c, C)
  const info = intentInfo(after, C, 'e1')
  assert.ok(info)
  assert.ok(info.tiles.some((p) => p.x === 1 && p.y === 2), 'aims at the connector')
  assert.ok(Math.abs(unit(after, 'e1').pos.x - 1) + Math.abs(unit(after, 'e1').pos.y - 2) === 1)
})

test('shooter keeps its distance and takes a clear line', () => {
  const c = fresh('duel')
  unit(c, 'e1').defId = 'gunner'
  silence(c)
  const after = endTurn(c, C)
  const g = unit(after, 'e1')
  assert.ok(Math.abs(g.pos.x - 1) + Math.abs(g.pos.y - 2) >= 2)
  assert.ok(intentInfo(after, C, 'e1')?.tiles.some((p) => p.x === 1 && p.y === 2))
})

test('enemies do not walk onto hazards or void and avoid friendly fire', () => {
  for (let seed = 1; seed <= 6; seed++) {
    let c = startCombat(makeRun({ rng: seed * 7919 }), 'terrain', C)
    for (let i = 0; i < 3 && c.phase === 'player'; i++) {
      c = endTurn(c, C)
      for (const e of c.units.filter((u) => u.side === 'enemy')) {
        const kind = c.tiles[e.pos.y]?.[e.pos.x]?.kind
        assert.ok(kind === 'floor', `enemy on ${kind}`)
      }
    }
  }
})

test('summoner calls minions, then recharges for its cooldown', () => {
  let c = fresh('duel')
  unit(c, 'e1').defId = 'caller'
  unit(c, 'e1').intent = null
  place(c, 'connector', { x: 0, y: 0 })
  c = endTurn(c, C) // phase 1: nothing to fire; plans 'call'
  assert.equal(unit(c, 'e1').intent?.moveId, 'call')
  c = endTurn(c, C) // phase 2: summons, then recharges
  assert.equal(c.units.filter((u) => u.defId === 'minion').length, 1)
  assert.equal(unit(c, 'e1').intent, null)
  c = endTurn(c, C) // phase 3: still recharging
  assert.equal(unit(c, 'e1').intent, null)
  c = endTurn(c, C) // phase 4: telegraphs again
  assert.equal(unit(c, 'e1').intent?.moveId, 'call')
})

// ---------------------------------------------------------------- purity, preview, determinism

test('reducers never mutate their input', () => {
  const c = fresh('pair')
  const snap = JSON.stringify(c)
  setHand(c, ['shove'])
  const snap2 = JSON.stringify(c)
  playCard(c, C, 'h1', 'connector', { dir: 'right' })
  endTurn(c, C)
  moveUnit(c, C, 'connector', { x: 0, y: 0 })
  assert.equal(JSON.stringify(c), snap2)
  assert.notEqual(snap, snap2)
})

test('previewPlay matches the real play exactly', () => {
  const c = fresh('pair')
  silence(c)
  place(c, 'connector', { x: 2, y: 2 })
  place(c, 'e1', { x: 3, y: 2 })
  place(c, 'e2', { x: 4, y: 2 })
  setHand(c, ['shove'])
  const preview = previewPlay(c, C, 'h1', 'connector', { dir: 'right' })
  const real = playCard(c, C, 'h1', 'connector', { dir: 'right' })
  assert.deepEqual(
    preview.units.map((u) => [u.uid, u.hpAfter]),
    [
      ['e1', unit(real, 'e1').hp],
      ['e2', unit(real, 'e2').hp],
    ],
  )
  const kill = fresh('duel')
  silence(kill)
  unit(kill, 'e1').hp = 3
  setHand(kill, ['shot'])
  const p2 = previewPlay(kill, C, 'h1', 'connector', { dir: 'right' })
  assert.deepEqual(p2.units, [{ uid: 'e1', hpBefore: 3, hpAfter: 0, blockAfter: 0, dies: true }])
})

test('deterministic and JSON round-trippable through a whole fight', () => {
  const run = makeRun({ party: [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }], implants: ['plating', 'rhythm'] })
  const a = startCombat(run, 'pair', C)
  const b = startCombat(run, 'pair', C)
  assert.equal(JSON.stringify(a), JSON.stringify(b))
  const script = (c0: CombatState): CombatState => {
    let c = c0
    for (let turn = 0; turn < 4 && c.phase === 'player'; turn++) {
      const moves = legalMoves(c, 'connector')
      if (moves[0]) c = moveUnit(c, C, 'connector', moves[0])
      for (const card of c.hand.slice()) {
        const origin = partyOrigins(c, C, card.uid)[0]
        if (!origin || !canPlay(c, C, card.uid, origin).ok) continue
        const opt = selectableTargets(c, C, card.uid, origin)[0]
        if (!opt) continue
        const tgt: { pos?: { x: number; y: number }; dir?: 'up' | 'down' | 'left' | 'right' } = {}
        if (opt.pos) tgt.pos = opt.pos
        if (opt.dir) tgt.dir = opt.dir
        c = playCard(c, C, card.uid, origin, tgt)
        if (c.phase !== 'player') break
      }
      if (c.phase === 'player') c = endTurn(c, C)
    }
    return c
  }
  const viaJson = JSON.parse(JSON.stringify(a)) as CombatState
  assert.deepEqual(viaJson, a)
  const r1 = script(a)
  const r2 = script(viaJson)
  assert.equal(JSON.stringify(r1), JSON.stringify(r2))
  assert.deepEqual(JSON.parse(JSON.stringify(r1)), r1)
})
