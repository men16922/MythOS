// Outside the List (DLC 2): the route must open only after an escape, stay off dailies and the map rolls, and end once.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { OUTSIDE_CARDS } from '../content/packs/outside_list/index.ts'
import { legalMoves, selectableTargets, startCombat } from './combat.ts'
import { walkNeutral, walkStep } from './effects.ts'
import { actEventPool, mapEncounters } from './map.ts'
import { newProfile } from './meta.ts'
import { actOf, advanceAct, chooseEventOption, continueEvent, enterNode, newRun, updateCombat } from './run.ts'
import type { CombatState, MetaProfile, Pos, RunState, UnitState } from './types.ts'

const won: MetaProfile = { ...newProfile('t'), wins: 1 }

function winFight(r: RunState, id: string, saved: boolean): RunState {
  const combat = startCombat(r, id, C)
  combat.phase = 'won'
  if (combat.bonus) combat.bonus.failed = !saved
  r.screen = { kind: 'combat', combat, nodeKind: 'combat' }
  return updateCombat(r, combat, C)
}

function onNode(r: RunState, kind: 'combat' | 'rest'): RunState {
  const id = 'n_test'
  r.map.nodes[id] = { id, row: 0, col: 0, kind, next: [] } as RunState['map']['nodes'][string]
  r.map.startIds = [id]
  r.visited = []
  r.nodeId = null
  r.screen = { kind: 'map' }
  return enterNode(r, id, C)
}

test('the route opens with the first escape and never on a daily', () => {
  assert.equal(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 1 }, C).flags.outside_open, undefined)
  assert.equal(newRun(won, { archetype: 'ghost', paradox: 0, seed: 1 }, C).flags.outside_open, 1)
  assert.equal(newRun(won, { archetype: 'ghost', paradox: 0, seed: 1, daily: '2026-10-31' }, C).flags.outside_open, undefined)
})

/** A run standing at the start of Act 2 on Closing Time. */
const atChoice = (seed: number, extra: Partial<Parameters<typeof newRun>[1]> = {}): RunState => {
  const r = newRun(won, { archetype: 'ghost', paradox: 0, seed, ...extra }, C)
  advanceAct(r, C)
  return r
}
const take = (r: RunState, index: number): RunState => continueEvent(chooseEventOption(r, index, C), C)

test('Closing Time comes before the title of Act 2, once, and never on a fresh profile or a daily', () => {
  const r = atChoice(5)
  assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_closing')
  assert.equal(take(r, 0).screen.kind, 'act_intro')
  assert.equal(take(atChoice(5), 1).screen.kind, 'act_intro')
  const fresh = newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 5 }, C)
  advanceAct(fresh, C)
  assert.equal(fresh.screen.kind, 'act_intro')
  const daily = newRun(won, { archetype: 'ghost', paradox: 0, seed: 5, daily: '2026-10-31' }, C)
  advanceAct(daily, C)
  assert.equal(daily.screen.kind, 'act_intro')
})

test('walking past keeps the plain Act 2 map, and a fresh run never sees the route', () => {
  for (let seed = 0; seed < 30; seed++) {
    const passed = take(atChoice(seed), 1)
    const plain = atChoice(seed)
    assert.deepEqual(passed.map, plain.map)
    assert.equal(passed.route, undefined)
    assert.equal(actOf(passed, C)?.name.en, 'Undercity Market')
    assert.ok(!passed.pools.cards.some((id) => C.cards[id]?.route), 'route cards in a plain pool')
  }
  assert.equal(mapEncounters(2, 'normal', C).some((e) => e.route), false)
  assert.equal(actEventPool(2, C).some((e) => e.route), false)
})

test('taking the route deals every fight and event on the map from it, on every map and every path', () => {
  const paths: number[] = []
  for (let seed = 0; seed < 300; seed++) {
    const r = take(atChoice(seed), 0)
    const nodes = r.map.nodes
    assert.equal(r.route, 'outside')
    assert.equal(actOf(r, C)?.name.en, 'Outside the List')
    for (const n of Object.values(nodes)) {
      if (n.encounterId) assert.equal(C.encounters[n.encounterId]?.route, 'outside', `${seed} ${n.id}`)
      if (n.eventId) assert.equal(C.events[n.eventId]?.route, 'outside', `${seed} ${n.id}`)
    }
    const walk = (id: string, fights: number): void => {
      const n = nodes[id]
      if (!n) return
      const seen = fights + (n.kind === 'combat' || n.kind === 'elite' || n.kind === 'boss' ? 1 : 0)
      if (n.next.length === 0) paths.push(seen)
      for (const nx of n.next) walk(nx, seen)
    }
    for (const id of r.map.startIds) walk(id, 0)
    assert.ok(OUTSIDE_CARDS.every((c) => r.pools.cards.includes(c.id)), 'route cards join the pool')
  }
  assert.ok(Math.min(...paths) >= 2, `a path with only ${Math.min(...paths)} fights`)
  assert.ok(paths.reduce((a, b) => a + b, 0) / paths.length >= 4, 'the route is shorter than the act it replaces')
})

test('a save caught mid-act keeps its map: the route is only dealt before the first node', () => {
  const r = atChoice(7)
  r.nodeId = r.map.startIds[0] as string
  const before = JSON.stringify(r.map)
  const next = chooseEventOption(r, 0, C)
  assert.equal(next.route, undefined)
  assert.equal(JSON.stringify(next.map), before)
})

test('the route ends with Act 2 and its cards stay for the rest of the run', () => {
  const r = take(atChoice(9), 0)
  advanceAct(r, C)
  assert.equal(r.act, 3)
  assert.equal(r.route, undefined)
  assert.equal(actOf(r, C)?.name.en, C.acts[3]?.name.en)
  assert.ok(r.pools.cards.includes('ol_hold_this'))
})

test('the safehouse closes the route once, on the tally of who was kept', () => {
  let r = take(atChoice(3), 0)
  r = winFight(r, 'outside_serving', true)
  r = winFight(r, 'outside_pickup', false)
  r = winFight(r, 'outside_door', true)
  assert.deepEqual([r.flags.outside_saved, r.flags.outside_lost], [2, 1])
  r = onNode(r, 'rest')
  assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_last_meal_kept')
  assert.equal(onNode(r, 'rest').screen.kind, 'rest')
})

test('losing the citizens changes the ending, not the pay', () => {
  let r = take(atChoice(3), 0)
  r = winFight(r, 'outside_serving', false)
  r = onNode(r, 'rest')
  assert.equal(r.screen.kind === 'event' && r.screen.eventId, 'outside_last_meal_lost')
  // Same pay either way; only the flag that Act 3 reads (outside_kept / outside_gone) differs.
  const heal = (id: string) => C.events[id]?.options[0]?.success.effects.filter((e) => e.kind !== 'flag')
  assert.deepEqual(heal('outside_last_meal_kept'), heal('outside_last_meal_lost'))
})

const fightOf = (id: string): CombatState => startCombat(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 11 }, C), id, C)

test('an escort walks one tile after each enemy phase, the relay beside it, and leaves safe', () => {
  for (const id of ['outside_queue', 'outside_stairs']) {
    const c = fightOf(id)
    c.units = c.units.filter((u) => u.side !== 'enemy')
    const n = c.units.find((u) => u.side === 'neutral') as UnitState
    for (let i = 0; i < 12 && c.walkTo; i++) {
      const was = { ...n.pos }
      const step = walkStep(c)
      assert.ok(step, `${id}: the walk is blocked on an empty board at ${was.x},${was.y}`)
      walkNeutral(c)
      assert.equal(Math.abs(n.pos.x - was.x) + Math.abs(n.pos.y - was.y), 1)
      if (c.relay) assert.notEqual(c.tiles[c.relay.y]?.[c.relay.x]?.kind, 'void', 'relay over a pit')
    }
    assert.equal(c.neutralSafe, true, id)
    assert.equal(c.relay, undefined)
    assert.equal(c.units.some((u) => u.side === 'neutral'), false)
    assert.equal(c.bonus?.failed ?? false, false)
  }
})

test('a body on the next tile makes the citizen wait, it never swaps through', () => {
  const c = fightOf('outside_queue')
  const step = walkStep(c) as Pos
  const n = c.units.find((u) => u.side === 'neutral') as UnitState
  const was = { ...n.pos }
  const blocker = c.units.find((u) => u.side === 'party') as UnitState
  blocker.pos = { ...step }
  const next = walkStep(c)
  assert.notDeepEqual(next, step)
  walkNeutral(c)
  if (next === null) assert.deepEqual(n.pos, was)
})

test('a card that names a citizen can reach one, and a plain ally card still cannot', () => {
  const c = fightOf('outside_serving')
  const n = c.units.find((u) => u.side === 'neutral') as UnitState
  const conn = c.units.find((u) => u.uid === 'connector') as UnitState
  conn.pos = { x: n.pos.x - 1, y: n.pos.y }
  const reaches = (defId: string): boolean => {
    c.hand = [{ uid: 'probe', defId, upgraded: false }]
    return selectableTargets(c, C, 'probe', conn.uid).some((o) => o.pos?.x === n.pos.x && o.pos?.y === n.pos.y)
  }
  assert.equal(reaches('ol_hold_this'), true)
  const plain = Object.values(C.cards).find((d) => d.target.mode === 'ally' && !d.target.neutral && d.owner === 'any')
  if (plain) assert.equal(reaches(plain.id), false)
})

test('every Relay fight leaves a way onto the tile: a walk by turn 2, or a push set up on turn 1', () => {
  const key = (p: Pos): string => `${p.x},${p.y}`
  for (const id of ['outside_serving', 'outside_pickup', 'outside_door']) {
    for (const archetype of ['ghost', 'smuggler', 'echo_collector']) {
      for (let seed = 1; seed <= 20; seed++) {
        const c = startCombat(newRun(newProfile('t'), { archetype, paradox: 0, seed }, C), id, C)
        const relay = c.relay as Pos
        const party = c.units.filter((u) => u.side === 'party' && u.hp > 0)
        const turnOne = new Set(party.flatMap((u) => [key(u.pos), ...legalMoves(c, u.uid).map(key)]))
        const walks = party.some((u) => {
          const from = u.pos
          const reached = [from, ...legalMoves(c, u.uid)].some((p) => {
            u.pos = p
            return legalMoves(c, u.uid).some((q) => key(q) === key(relay))
          })
          u.pos = from
          return reached
        })
        const pushes = c.units.some((e) => {
          const [dx, dy] = [e.pos.x - relay.x, e.pos.y - relay.y]
          return e.side === 'enemy' && e.hp > 0 && Math.abs(dx) + Math.abs(dy) === 1 && turnOne.has(key({ x: e.pos.x + dx, y: e.pos.y + dy }))
        })
        assert.ok(walks || pushes, `${id} ${archetype} seed ${seed}: the Relay is out of reach`)
      }
    }
  }
})
