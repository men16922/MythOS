import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOSS_ROW, MAP_COLS, MAP_ROWS, SCRIPTED_EVENTS, generateActMap, kindQuotas } from './map.ts'
import { FIXTURE as C } from './run.fixture.test.ts'
import type { ActMap, MapNode, NodeKind } from './types.ts'

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13)

function nodesOf(map: ActMap): MapNode[] {
  return Object.values(map.nodes)
}

function reachableFrom(map: ActMap, ids: string[]): Set<string> {
  const seen = new Set<string>()
  const stack = [...ids]
  while (stack.length > 0) {
    const id = stack.pop() as string
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(map.nodes[id]?.next ?? []))
  }
  return seen
}

test('map structure invariants hold over 200 seeds × 3 acts', () => {
  for (const seed of SEEDS) {
    for (const act of [1, 2, 3] as const) {
      const map = generateActMap(act, { rng: seed }, C)
      const nodes = nodesOf(map)
      const boss = map.nodes[map.bossId]
      assert.ok(boss, 'boss exists')
      assert.equal(boss.kind, 'boss')
      assert.equal(boss.row, BOSS_ROW)
      assert.equal(boss.encounterId, `b${act}`)
      assert.equal(map.rows, BOSS_ROW + 1)
      assert.ok(map.startIds.length >= 2 && map.startIds.length <= 3, `2-3 starts (got ${map.startIds.length})`)
      assert.deepEqual(
        [...map.startIds].sort(),
        nodes.filter((n) => n.row === 0).map((n) => n.id).sort(),
        'every row-0 node is a start',
      )

      for (const n of nodes) {
        assert.equal(n.id, `a${act}r${n.row}c${n.col}`)
        assert.ok(n.col >= 0 && n.col < MAP_COLS)
        if (n.kind === 'boss') continue
        assert.ok(n.next.length >= 1 && n.next.length <= 2, `${n.id} has 1-2 exits`)
        for (const id of n.next) {
          const to = map.nodes[id]
          assert.ok(to, `edge target ${id} exists`)
          assert.equal(to.row, n.row + 1)
          if (to.kind !== 'boss') assert.ok(Math.abs(to.col - n.col) <= 1, 'edges step at most one column')
        }
      }

      // No crossing edges between adjacent rows.
      for (let row = 0; row < MAP_ROWS - 1; row++) {
        const edges = nodes
          .filter((n) => n.row === row)
          .flatMap((n) => n.next.map((id) => [n.col, (map.nodes[id] as MapNode).col] as const))
        for (const [a, b] of edges)
          for (const [c, d] of edges) assert.ok(!((a < c && b > d) || (a > c && b < d)), `edges cross on row ${row}`)
      }

      // Everything reachable from the starts; everything reaches the boss.
      const fromStart = reachableFrom(map, map.startIds)
      assert.equal(fromStart.size, nodes.length, 'all nodes reachable')
      for (const n of nodes) assert.ok(reachableFrom(map, [n.id]).has(map.bossId), `${n.id} reaches boss`)
      for (let row = 1; row < MAP_ROWS; row++) assert.ok(nodes.filter((n) => n.row === row).length >= 2, `row ${row} ≥ 2 nodes`)
    }
  }
})

test('node kinds follow the row rules', () => {
  for (const seed of SEEDS) {
    const map = generateActMap(1, { rng: seed }, C)
    const nodes = nodesOf(map)
    for (const n of nodes) {
      if (n.row === 0) assert.equal(n.kind, 'combat', 'row 0 is all combat')
      if (n.row === MAP_ROWS - 1) assert.equal(n.kind, 'rest', 'row 6 is all rest')
      if (n.kind === 'elite') {
        assert.ok(n.row >= 2 && n.row <= 5, 'elites only on rows 2-5')
        for (const id of n.next) assert.notEqual(map.nodes[id]?.kind, 'elite', 'no elite → elite')
      }
      if (n.kind === 'rest') assert.equal(n.row, MAP_ROWS - 1, 'no mid-map rests')
      if (n.kind === 'combat' || n.kind === 'elite') {
        const enc = C.encounters[n.encounterId ?? '']
        assert.ok(enc, `${n.id} has an encounter`)
        assert.notEqual(enc.id, 'ev1_fight', 'event-only fights stay off the map')
        assert.equal(enc.act, 1)
        assert.equal(enc.kind, n.kind === 'elite' ? 'elite' : 'normal')
      }
      if (n.kind === 'event') {
        const ev = C.events[n.eventId ?? '']
        assert.ok(ev, `${n.id} has an event`)
        assert.ok(ev.acts.includes(1))
        assert.ok(!SCRIPTED_EVENTS.has(ev.id))
      }
    }
    assert.ok(nodes.some((n) => n.row === 3 && n.kind === 'treasure'), 'row 3 has a treasure')
    assert.ok(nodes.some((n) => n.kind === 'shop' && n.row >= 2 && n.row <= 5), 'a shop on rows 2-5')
    const events = nodes.filter((n) => n.kind === 'event').map((n) => n.eventId)
    assert.equal(new Set(events).size, events.length, 'pre-rolled events are unique within the act')
  }
})

test('kind mix is close to the design targets', () => {
  const counts: Partial<Record<NodeKind, number>> = {}
  let total = 0
  for (const seed of SEEDS) {
    for (const n of nodesOf(generateActMap(2, { rng: seed }, C))) {
      if (n.kind === 'boss') continue
      counts[n.kind] = (counts[n.kind] ?? 0) + 1
      total++
    }
  }
  const share = (k: NodeKind): number => ((counts[k] ?? 0) / total) * 100
  const mix = Object.fromEntries((['combat', 'event', 'elite', 'shop', 'rest', 'treasure'] as const).map((k) => [k, Math.round(share(k))]))
  console.log(`map mix % over ${SEEDS.length} maps (avg ${(total / SEEDS.length).toFixed(1)} nodes):`, mix)
  assert.ok(share('combat') >= 37 && share('combat') <= 53, 'combat ≈ 45 %')
  assert.ok(share('event') >= 15 && share('event') <= 27, 'event ≈ 22 %')
  assert.ok(share('elite') >= 6 && share('elite') <= 14, 'elite ≈ 10 %')
  assert.ok(share('shop') >= 4 && share('shop') <= 12, 'shop ≈ 8 %')
  assert.ok(share('treasure') >= 4 && share('treasure') <= 12, 'treasure ≈ 8 %')
})

test('early rows prefer easier encounters; paths avoid repeating fights', () => {
  let easyStarts = 0
  let starts = 0
  let repeats = 0
  let edges = 0
  for (const seed of SEEDS) {
    const map = generateActMap(1, { rng: seed }, C)
    for (const n of nodesOf(map)) {
      if (n.row === 0) {
        starts++
        if (n.encounterId === 'n1_1' || n.encounterId === 'n1_4') easyStarts++
      }
      for (const id of n.next) {
        const to = map.nodes[id] as MapNode
        if (n.encounterId && to.encounterId) {
          edges++
          if (n.encounterId === to.encounterId) repeats++
        }
      }
    }
  }
  assert.ok(easyStarts / starts > 0.75, `row 0 mostly easy fights (${easyStarts}/${starts})`)
  assert.ok(repeats / edges < 0.05, `fights rarely repeat back-to-back (${repeats}/${edges})`)
})

test('maps are deterministic per seed and avoid excluded events', () => {
  const a = generateActMap(1, { rng: 42 }, C)
  const b = generateActMap(1, { rng: 42 }, C)
  assert.deepEqual(a, b)
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a)
  const exclude = ['ev_gamble', 'ev_misc', 'ev_costly']
  for (const seed of SEEDS.slice(0, 50)) {
    const m = generateActMap(1, { rng: seed }, C, { exclude })
    const ids = nodesOf(m).flatMap((n) => (n.eventId ? [n.eventId] : []))
    if (ids.length <= 5) for (const id of ids) assert.ok(!exclude.includes(id), 'excluded events are skipped while others remain')
  }
})

test('kindQuotas keeps minimum specials', () => {
  const q = kindQuotas(10, 3, 5)
  assert.ok(q.shop >= 1 && q.treasure >= 1 && q.elite >= 1)
})
