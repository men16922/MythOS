// Run engine × real content: every reference the run reducers resolve exists, real maps
// satisfy the act rules, and 30 seeded headless runs per archetype finish without throwing.
// Prints the outcome distribution (greedy vs basic combat bot) for balance tracking.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { EVENT_FIGHTS } from '../content/encounters.ts'
import { MAP_ROWS, SCRIPTED_EVENTS, actEventPool, eventFightIds, generateActMap, mapEncounters } from './map.ts'
import { newProfile } from './meta.ts'
import { FIRST_COMPANION, FORCED_ERASURE, NOBLE_SACRIFICE, OPENING_EVENT, RECRUIT_EVENT, STATIC_CARD, newRun, startAct } from './run.ts'
import { simulateRun } from './runSim.ts'
import type { RunSimResult } from './runSim.ts'
import type { RunEffect } from './types.ts'

const RUNS = 30

test('content references the run engine resolves all exist', () => {
  const missing: string[] = []
  const need = (ok: unknown, what: string) => {
    if (!ok) missing.push(what)
  }
  for (const a of Object.values(C.archetypes)) {
    for (const id of a.startingDeck) need(C.cards[id], `archetype ${a.id} card ${id}`)
    need(C.implants[a.startingImplant], `archetype ${a.id} implant ${a.startingImplant}`)
  }
  for (const m of Object.values(C.companions))
    for (const id of [...m.cards, ...m.bondCards]) need(C.cards[id], `companion ${m.id} card ${id}`)
  need(C.companions[FIRST_COMPANION], 'first companion se_rin')
  need(C.cards[STATIC_CARD]?.type === 'junk', 'junk card static')
  need(C.events[RECRUIT_EVENT], 'recruit event')
  need(C.endings[FORCED_ERASURE], 'forced erasure ending')
  need(C.endings[NOBLE_SACRIFICE], 'noble sacrifice ending')
  for (const u of Object.values(C.unlocks)) {
    if (u.kind === 'archetype') need(C.archetypes[u.grants ?? ''], `unlock ${u.id} archetype`)
    if (u.kind === 'companion') need(C.companions[u.grants ?? ''], `unlock ${u.id} companion`)
    if (u.requires) need(C.unlocks[u.requires], `unlock ${u.id} requires ${u.requires}`)
    if (u.passive?.startConsumable) need(C.consumables[u.passive.startConsumable], `unlock ${u.id} consumable`)
  }
  const checkEffect = (where: string, e: RunEffect) => {
    if (e.kind === 'card' || e.kind === 'junk') need(C.cards[e.cardId], `${where} card ${e.cardId}`)
    if (e.kind === 'implant' && e.implantId) need(C.implants[e.implantId], `${where} implant ${e.implantId}`)
    if (e.kind === 'consumable' && e.id) need(C.consumables[e.id], `${where} consumable ${e.id}`)
    if (e.kind === 'companion' || e.kind === 'bond') need(C.companions[e.id], `${where} companion ${e.id}`)
    if (e.kind === 'combat') need(C.encounters[e.encounterId], `${where} encounter ${e.encounterId}`)
    if (e.kind === 'codex') need(C.lore[e.id], `${where} lore ${e.id}`)
  }
  for (const ev of Object.values(C.events))
    ev.options.forEach((o, i) => {
      for (const e of [...o.success.effects, ...(o.failure?.effects ?? [])]) checkEffect(`event ${ev.id}#${i}`, e)
      if (o.requires?.companion) need(C.companions[o.requires.companion], `event ${ev.id}#${i} requires companion`)
      if (o.requires?.hasImplant) need(C.implants[o.requires.hasImplant], `event ${ev.id}#${i} requires implant`)
    })
  for (const act of [1, 2, 3] as const) {
    need(mapEncounters(act, 'normal', C).length >= 3, `act ${act} normal encounters`)
    need(mapEncounters(act, 'elite', C).length >= 1, `act ${act} elite encounters`)
    need(mapEncounters(act, 'boss', C).length >= 1, `act ${act} boss`)
    need(actEventPool(act, C).length >= 4, `act ${act} events`)
  }
  assert.deepEqual(missing, [])
})

test('real-content maps follow the act rules; event-only fights and scripted events stay off the map', () => {
  const eventOnly = eventFightIds(C)
  for (const id of EVENT_FIGHTS) assert.ok(eventOnly.has(id), `${id} detected as event-only`)
  for (let seed = 1; seed <= 100; seed++) {
    for (const act of [1, 2, 3] as const) {
      const map = generateActMap(act, { rng: seed }, C)
      const nodes = Object.values(map.nodes)
      assert.ok(nodes.filter((n) => n.row === 0).every((n) => n.kind === 'combat'))
      assert.ok(nodes.filter((n) => n.row === MAP_ROWS - 1).every((n) => n.kind === 'rest'))
      assert.ok(nodes.some((n) => n.row === 3 && n.kind === 'treasure'))
      for (const n of nodes) {
        if (n.kind === 'combat' || n.kind === 'elite' || n.kind === 'boss') {
          const enc = C.encounters[n.encounterId ?? '']
          assert.ok(enc && enc.act === act, `${n.id} encounter ${n.encounterId}`)
          assert.ok(!EVENT_FIGHTS.has(enc.id), `${n.id} rolled event-only fight ${enc.id}`)
        }
        if (n.kind === 'event') {
          assert.ok(C.events[n.eventId ?? '']?.acts.includes(act), `${n.id} event ${n.eventId}`)
          assert.ok(!SCRIPTED_EVENTS.has(n.eventId ?? ''), `${n.id} rolled scripted event ${n.eventId}`)
        }
      }
    }
  }
})

test('act 1 opens with the scripted opening event', () => {
  const run = startAct(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 7 }, C), C)
  assert.deepEqual(run.screen, { kind: 'event', eventId: OPENING_EVENT, resolved: null, improvised: null })
})

function summarize(label: string, res: RunSimResult[]): string {
  const wins = res.filter((r) => r.won).length
  const deaths = [1, 2, 3].map((a) => res.filter((r) => !r.won && r.act === a).length)
  const avg = (f: (r: RunSimResult) => number) => (res.reduce((s, r) => s + f(r), 0) / res.length).toFixed(1)
  const killers: Record<string, number> = {}
  for (const r of res) if (r.killedBy) killers[r.killedBy] = (killers[r.killedBy] ?? 0) + 1
  const top = Object.entries(killers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => `${k}×${n}`)
    .join(', ')
  return `${label.padEnd(24)} win ${String(Math.round((wins / res.length) * 100)).padStart(3)}%  deaths act1/2/3 ${deaths.join('/')}  floors ${avg((r) => r.floors)}  deck ${avg((r) => r.deckSize)}  trace ${avg((r) => r.trace)}  echoes ${avg((r) => r.echoes)}${top ? `  killers: ${top}` : ''}`
}

test(`runSim: ${RUNS} seeded runs per archetype complete (greedy vs basic)`, { timeout: 600_000 }, () => {
  const lines: string[] = []
  const winRate: Record<string, number> = {}
  for (const archetype of Object.keys(C.archetypes)) {
    for (const policy of ['greedy', 'basic'] as const) {
      const res: RunSimResult[] = []
      for (let seed = 1; seed <= RUNS; seed++) res.push(simulateRun(seed * 977, archetype, C, policy))
      for (const r of res) {
        assert.ok(r.floors >= 1 && r.act >= 1 && r.act <= 3)
        if (!r.won) assert.ok(r.killedBy, 'every defeat names its encounter')
      }
      winRate[`${archetype}/${policy}`] = res.filter((r) => r.won).length / res.length
      lines.push(summarize(`${archetype}/${policy}`, res))
    }
  }
  console.log(`\nrunSim outcome distribution (paradox 0, ${RUNS} runs each)\n${lines.join('\n')}`)
  for (const archetype of Object.keys(C.archetypes))
    assert.ok((winRate[`${archetype}/greedy`] ?? 0) >= (winRate[`${archetype}/basic`] ?? 0), `${archetype}: greedy ≥ basic`)
})
