// Pack 3 (First Record): Rewrite tiles, Act 6 endings, First Record shards and the secret First Connector fight.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { startCombat } from './combat.ts'
import { applyEffects } from './effects.ts'
import { applyRunEnd, newProfile } from './meta.ts'
import { availableEndings, newRun, RECORDS_NEEDED, SECRET_ENCOUNTER, SECRET_WON_FLAG, secretBossGate, updateCombat } from './run.ts'
import { mapEncounters } from './map.ts'
import type { RunState } from './types.ts'

const NOW = '2026-10-26T00:00:00.000Z'
const won = { ...newProfile('T'), wins: 1 }

function deepRun(seed = 1): RunState {
  return newRun(won, { archetype: 'ghost', paradox: 0, seed, now: NOW, mode: 'deep' }, C)
}

function withRecords(run: RunState, n: number): RunState {
  const r = structuredClone(run)
  for (let i = 1; i <= n; i++) r.flags[`record_${i}`] = 1
  return r
}

test('rewrite: tiles become floor/hazard freely, cover and void only where nobody stands', () => {
  const c = startCombat(deepRun(), 'a6_n1_gate', C)
  const me = c.units.find((u) => u.uid === 'connector')!
  const tile = (p: { x: number; y: number }) => c.tiles[p.y]![p.x]!
  const empty = [0, 1, 2, 3, 4].flatMap((y) => [0, 1, 2].map((x) => ({ x, y }))).find((p) => tile(p).kind === 'floor' && !c.units.some((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y))!
  applyEffects(c, C, [{ kind: 'rewrite', tile: 'cover' }], { origin: me, side: 'party', tiles: [empty, me.pos], source: 'party' })
  assert.equal(tile(empty).kind, 'cover')
  assert.notEqual(tile(me.pos).kind, 'cover', 'never writes a wall under a unit')
  applyEffects(c, C, [{ kind: 'rewrite', tile: 'hazard' }], { origin: me, side: 'party', tiles: [me.pos], source: 'party' })
  assert.equal(tile(me.pos).kind, 'hazard')
  applyEffects(c, C, [{ kind: 'rewrite', tile: 'floor' }], { origin: me, side: 'party', tiles: [empty, me.pos], source: 'party' })
  assert.equal(tile(empty).kind, 'floor')
  assert.equal(tile(me.pos).kind, 'floor')
})

test('Act 6: Rewrite cards are a gift and only offered from Act 6; the secret boss never rolls onto a map', () => {
  assert.deepEqual(C.acts[6]!.gift, ['rewrite_erase', 'rewrite_wall'])
  for (const id of ['rewrite_erase', 'rewrite_wall', 'rewrite_fault', 'rewrite_abyss']) assert.equal(C.cards[id]!.minAct, 6)
  assert.ok(!mapEncounters(6, 'boss', C).some((e) => e.id === SECRET_ENCOUNTER))
  assert.equal(mapEncounters(6, 'boss', C).length, 3)
})

test('endings: Act 3 shows the standard set, Act 6 its own (plus the sacrifice); the true ending stays hidden', () => {
  const std = newRun(won, { archetype: 'ghost', paradox: 0, seed: 2, now: NOW }, C)
  const stdIds = availableEndings({ ...std, act: 3 }, C).map((v) => v.ending.id)
  assert.ok(stdIds.includes('ending_safe_refuge') && !stdIds.includes('ending_the_reader'))
  const deep = { ...deepRun(), act: 6, axes: { insight: 5 } }
  const views = availableEndings(deep, C)
  const ids = views.map((v) => v.ending.id)
  assert.ok(ids.includes('ending_the_reader') && ids.includes('ending_noble_sacrifice') && !ids.includes('ending_safe_refuge'))
  assert.equal(views.find((v) => v.ending.id === 'ending_the_reader')!.available, true)
  assert.equal(views.find((v) => v.ending.id === 'ending_new_administrator')!.available, false)
  assert.ok(!ids.includes('ending_first_record'), 'secret until earned')
  const earned = { ...deep, flags: { ...deep.flags, [SECRET_WON_FLAG]: 1 } }
  assert.ok(availableEndings(earned, C).some((v) => v.ending.id === 'ending_first_record' && v.available))
})

test('First Record: all shards + enough insight opens the secret fight after the last boss', () => {
  const base = { ...deepRun(3), act: 6, axes: { insight: 5, humanity: 2 } }
  assert.equal(secretBossGate(withRecords(base, RECORDS_NEEDED - 1), C), false)
  assert.equal(secretBossGate({ ...withRecords(base, RECORDS_NEEDED), axes: { insight: 4, resilience: 9 } }, C), false)
  const ready = withRecords(base, RECORDS_NEEDED)
  assert.equal(secretBossGate(ready, C), true)

  // Win the Act 6 boss: the run goes into the secret fight instead of the final choice.
  const boss = startCombat(ready, 'a6_boss_ix_origin', C)
  const inFight: RunState = { ...ready, screen: { kind: 'combat', combat: boss, nodeKind: 'boss' } }
  const after = updateCombat(inFight, { ...boss, phase: 'won' }, C)
  assert.equal(after.screen.kind, 'combat')
  assert.equal(after.screen.kind === 'combat' && after.screen.combat.encounterId, SECRET_ENCOUNTER)
  // Losing it still leaves the ending choice; winning it unlocks the true ending.
  const secret = after.screen.kind === 'combat' ? after.screen.combat : boss
  assert.equal(updateCombat(after, { ...secret, phase: 'lost' }, C).screen.kind, 'final_choice')
  const beat = updateCombat(after, { ...secret, phase: 'won' }, C)
  assert.equal(beat.screen.kind, 'final_choice')
  assert.equal(beat.flags[SECRET_WON_FLAG], 1)
})

test('First Record shards persist on the profile and carry into the next loop', () => {
  const run = withRecords(deepRun(5), 2)
  const ended = { ...run, screen: { kind: 'ended', result: 'defeat', endingId: 'ending_forced_erasure' } } as unknown as RunState
  const profile = applyRunEnd(won, ended, C)
  assert.deepEqual([...(profile.records ?? [])].sort(), ['record_1', 'record_2'])
  const next = newRun(profile, { archetype: 'ghost', paradox: 0, seed: 6, now: NOW }, C)
  assert.equal(next.flags.record_1, 1)
  assert.equal(next.flags.record_2, 1)
})

test('R7c: archetype mastery and autonomy 4–5 apply at run start (never on a daily)', async () => {
  const { ARCH_MASTERY_WINS } = await import('./meta.ts')
  const base = newRun(won, { archetype: 'ghost', paradox: 0, seed: 9, now: NOW }, C)
  const master = { ...won, archetypeWins: { ghost: ARCH_MASTERY_WINS[2] } }
  const run = newRun(master, { archetype: 'ghost', paradox: 0, seed: 9, now: NOW }, C)
  assert.equal(run.archMastery, 3)
  assert.equal(run.maxHp, base.maxHp + 4)
  assert.equal(run.deck.filter((c) => c.upgraded).length, base.deck.filter((c) => c.upgraded).length + 1)
  assert.equal(run.growth ?? 0, (base.growth ?? 0) + 1)
  const daily = newRun(master, { archetype: 'ghost', paradox: 0, seed: 9, now: NOW, daily: '2026-10-26' }, C)
  assert.equal(daily.archMastery, undefined)

  const lore = Array.from({ length: 30 }, (_, i) => `lore_${i}`)
  const wise = newRun({ ...won, codex: lore }, { archetype: 'ghost', paradox: 0, seed: 9, now: NOW }, C)
  assert.equal(wise.autonomy, 5)
  assert.ok(wise.deck.some((c) => c.defId === 'rewrite_erase'), 'autonomy 5: Erase from Act 1')
  assert.equal(wise.screen.kind === 'card_pick' && wise.screen.count, 1, 'autonomy 4: one removal at the start')
})

test('archetype wins are counted on victories only', () => {
  const run = deepRun(11)
  const win = { ...run, screen: { kind: 'ended', result: 'victory', endingId: 'ending_noble_sacrifice' } } as unknown as RunState
  assert.equal(applyRunEnd(won, win, C).archetypeWins?.ghost, 1)
  const loss = { ...run, id: 'x2', screen: { kind: 'ended', result: 'defeat', endingId: 'ending_forced_erasure' } } as unknown as RunState
  assert.equal(applyRunEnd(won, loss, C).archetypeWins?.ghost ?? 0, 0)
})

test('R7e: Archivist recalls exhausted cards (never junk, never itself); both new connectors start right', () => {
  const run = newRun(won, { archetype: 'archivist', paradox: 0, seed: 12, now: NOW }, C)
  assert.ok(run.implants.includes('returned_slip') && run.deck.some((c) => c.defId === 'archivist_recall'))
  const c = startCombat(run, 'a1_n1_cover', C)
  const me = c.units.find((u) => u.uid === 'connector')!
  c.exhaust.push({ uid: 'e1', defId: 'archivist_footnote', upgraded: false }, { uid: 'e2', defId: 'trace_bug', upgraded: false })
  const hand = c.hand.length
  applyEffects(c, C, [{ kind: 'recall', count: 2 }], { origin: me, side: 'party', tiles: [], source: 'party' })
  assert.equal(c.hand.length, hand + 1, 'junk stays exhausted')
  assert.ok(c.hand.some((x) => x.uid === 'e1'))
  const scrap = newRun(won, { archetype: 'scrapborn', paradox: 0, seed: 12, now: NOW }, C)
  assert.ok(scrap.implants.includes('self_repair') && scrap.deck.some((x) => x.defId === 'scrapborn_wire_trap'))
})
