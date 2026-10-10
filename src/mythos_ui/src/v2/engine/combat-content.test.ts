// Content-level smoke + balance report: every encounter in CONTENT played by the bots with each
// archetype's starter deck (+ Se-rin). Balance numbers are printed, not asserted (content owns them).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { CombatState, ContentRegistry, EncounterDef, RunState } from './types.ts'
import { startCombat } from './combat.ts'
import { autoPlay, type BotPolicy } from './combatSim.ts'
import { makeRun } from './combat.fixture.test.ts'
import { CONTENT } from '../content/index.ts'

const C: ContentRegistry = CONTENT
const SIDEKICK = 'se_rin'

function starterRun(archetypeId: string, seed: number, over: Partial<RunState> = {}): RunState {
  const arch = C.archetypes[archetypeId]
  if (!arch) throw new Error(`no archetype ${archetypeId}`)
  const mate = C.companions[SIDEKICK]
  const deckIds = [...arch.startingDeck, ...(mate?.cards ?? [])]
  const bonusHp = C.implants[arch.startingImplant]?.passive?.maxHp ?? 0
  return makeRun(
    {
      rng: seed * 2654435761,
      archetype: archetypeId,
      hp: arch.maxHp + bonusHp,
      maxHp: arch.maxHp + bonusHp,
      implants: [arch.startingImplant],
      party: mate ? [{ id: mate.id, hp: mate.maxHp, maxHp: mate.maxHp, bond: 0 }] : [],
      ...over,
    },
    deckIds,
  )
}

function connectorHp(c: CombatState): number {
  return c.units.find((u) => u.uid === 'connector')?.hp ?? 0
}

interface Row {
  fights: number
  wins: number
  turns: number
  hpLost: number
}

function measure(encs: EncounterDef[], policy: BotPolicy, seeds: number): Row {
  const row: Row = { fights: 0, wins: 0, turns: 0, hpLost: 0 }
  for (const enc of encs) {
    for (const arch of Object.keys(C.archetypes)) {
      for (let s = 1; s <= seeds; s++) {
        const run = starterRun(arch, s * 31 + enc.id.length)
        const end = autoPlay(startCombat(run, enc.id, C), C, policy)
        row.fights += 1
        row.hpLost += run.hp - connectorHp(end)
        if (end.phase === 'won') {
          row.wins += 1
          row.turns += end.turn
        }
      }
    }
  }
  return row
}

test('encounter data is placeable: enemies/neutral/reinforcements on in-bounds free floor, ids resolve', () => {
  for (const enc of Object.values(C.encounters)) {
    const blocked = new Set((enc.terrain ?? []).filter((t) => t.kind === 'cover' || t.kind === 'void').map((t) => `${t.pos.x},${t.pos.y}`))
    const spots = [...enc.enemies, ...(enc.reinforcements ?? []).flatMap((w) => w.enemies)]
    for (const e of spots) {
      assert.ok(C.enemies[e.id], `${enc.id}: unknown enemy ${e.id}`)
      assert.ok(e.pos.x >= 0 && e.pos.x < 7 && e.pos.y >= 0 && e.pos.y < 5, `${enc.id}: ${e.id} off the board`)
      assert.ok(!blocked.has(`${e.pos.x},${e.pos.y}`), `${enc.id}: ${e.id} placed on cover/void`)
    }
    const starts = enc.enemies.map((e) => `${e.pos.x},${e.pos.y}`)
    assert.equal(new Set(starts).size, starts.length, `${enc.id}: two enemies share a tile`)
  }
})

test('every encounter starts and resolves under the greedy bot for every archetype', () => {
  const encounters = Object.values(C.encounters)
  assert.ok(encounters.length > 0)
  for (const enc of encounters) {
    for (const arch of Object.keys(C.archetypes)) {
      for (let s = 1; s <= 5; s++) {
        const start = startCombat(starterRun(arch, s), enc.id, C)
        assert.ok(start.units.some((u) => u.side === 'enemy'), `${enc.id} has no enemies`)
        for (const e of start.units.filter((u) => u.side === 'enemy')) assert.ok(e.intent, `${enc.id}/${e.defId} starts without a telegraph`)
        const end = autoPlay(start, C, 'greedy')
        assert.ok(end.turn >= 1)
      }
    }
  }
})

test('balance report: act 1 greedy vs basic', () => {
  const kinds: EncounterDef['kind'][] = ['normal', 'elite', 'boss']
  const lines: string[] = ['kind    policy  fights  win%   turns  hpLost']
  for (const act of [1] as const) {
    for (const kind of kinds) {
      const encs = Object.values(C.encounters).filter((e) => e.act === act && e.kind === kind)
      if (encs.length === 0) continue
      for (const policy of ['greedy', 'basic'] as const) {
        const r = measure(encs, policy, act === 1 ? 8 : 4)
        lines.push(
          `a${act} ${kind.padEnd(6)} ${policy.padEnd(7)} ${String(r.fights).padStart(6)}  ${((100 * r.wins) / r.fights).toFixed(0).padStart(4)}  ${(r.turns / Math.max(1, r.wins)).toFixed(1).padStart(5)}  ${(r.hpLost / r.fights).toFixed(1).padStart(6)}`,
        )
      }
    }
  }
  console.log(lines.join('\n'))
})
