// The Relay must read true before the turn ends: whoever stands on the tile, enemy included, shows the hit meant for the
// neutral, and the citizen stops showing it. A wrong receiver here is the rule's own discard condition.
import assert from 'node:assert/strict'
import test from 'node:test'
import { CONTENT } from '../../../content/index.ts'
import { endTurn, intentInfo, startCombat } from '../../../engine/combat.ts'
import type { IntentInfo } from '../../../engine/combat.ts'
import { unitAt } from '../../../engine/effects.ts'
import { samePos } from '../../../engine/grid.ts'
import { newProfile } from '../../../engine/meta.ts'
import { newRun } from '../../../engine/run.ts'
import type { CombatState, Pos, UnitState } from '../../../engine/types.ts'
import { partyDanger } from '../screen/threat.ts'
import { boardAfter, expectedLoss, relayHit } from './marks.ts'
import type { IntentView } from './marks.ts'

const unit = (uid: string, side: UnitState['side'], pos: Pos, over: Partial<UnitState> = {}): UnitState =>
  ({ uid, side, pos, hp: 20, maxHp: 20, block: 0, armor: 0, statuses: {}, ...over }) as UnitState

const aim = (shooter: UnitState, tiles: Pos[], damage: number, over: Partial<IntentInfo> = {}): IntentView => ({
  uid: shooter.uid,
  unit: shooter,
  info: { move: { pattern: 'line', effects: [] }, tiles, path: [], damage, windupLeft: 0, ...over } as unknown as IntentInfo,
})

const RELAY = { x: 3, y: 2 }
const CITIZEN = { x: 2, y: 2 }
const board = (...units: UnitState[]): CombatState => ({ relay: RELAY, units }) as unknown as CombatState

const citizen = unit('citizen', 'neutral', CITIZEN)
const shooter = unit('shooter', 'enemy', { x: 6, y: 2 })

test('nobody on the relay: the citizen keeps the danger', () => {
  const c = board(citizen, shooter)
  assert.equal(relayHit([aim(shooter, [CITIZEN], 6)], c), null)
  assert.deepEqual(partyDanger(c.units, [aim(shooter, [CITIZEN], 6)], c), { citizen: 6 })
})

test('a squad member on the relay shows the hit and the citizen does not', () => {
  const ghost = unit('ghost', 'party', RELAY, { armor: 1 })
  const c = board(citizen, ghost, shooter)
  const iv = [aim(shooter, [CITIZEN], 6)]
  assert.deepEqual(relayHit(iv, c), { neutralUid: 'citizen', proxyUid: 'ghost', hit: 5 })
  assert.deepEqual(partyDanger(c.units, iv, c), { ghost: 5 })
})

test('an enemy on the relay is shown taking the hit', () => {
  const pushed = unit('pushed', 'enemy', RELAY, { armor: 2 })
  const c = board(citizen, pushed, shooter)
  const iv = [aim(shooter, [CITIZEN], 6)]
  assert.deepEqual(relayHit(iv, c), { neutralUid: 'citizen', proxyUid: 'pushed', hit: 4 })
  assert.deepEqual(partyDanger(c.units, iv, c), {})
})

test('an attack that sweeps both tiles lands twice on the unit standing in', () => {
  const ghost = unit('ghost', 'party', RELAY)
  const c = board(citizen, ghost, shooter)
  const iv = [aim(shooter, [CITIZEN, RELAY], 4)]
  assert.equal(relayHit(iv, c)?.hit, 8)
  assert.deepEqual(partyDanger(c.units, iv, c), { ghost: 8 })
})

test('a wind-up or a stunned shooter sends nothing through the relay yet', () => {
  const ghost = unit('ghost', 'party', RELAY)
  const stunned = unit('stunned', 'enemy', { x: 6, y: 2 }, { statuses: { shock: 1 } })
  assert.equal(relayHit([aim(shooter, [CITIZEN], 6, { windupLeft: 1 })], board(citizen, ghost, shooter)), null)
  assert.equal(relayHit([aim(stunned, [CITIZEN], 6)], board(citizen, ghost, stunned)), null)
})

test('nothing aimed at the citizen: no redirect, the unit keeps its own danger', () => {
  const ghost = unit('ghost', 'party', RELAY)
  const c = board(citizen, ghost, shooter)
  const iv = [aim(shooter, [RELAY], 3)]
  assert.equal(relayHit(iv, c), null)
  assert.deepEqual(partyDanger(c.units, iv, c), { ghost: 3 })
})

test('a card preview that pushes an enemy onto the relay moves the receiver before it is played', () => {
  const foe = unit('foe', 'enemy', { x: 4, y: 2 })
  const c = board(citizen, foe, shooter)
  const after = boardAfter(c, { units: [{ uid: 'foe', hpBefore: 20, hpAfter: 18, blockAfter: 0, dies: false, to: RELAY }] })
  const iv = [aim(shooter, [CITIZEN], 6)]
  assert.equal(relayHit(iv, c), null)
  assert.deepEqual(relayHit(iv, after), { neutralUid: 'citizen', proxyUid: 'foe', hit: 6 })
  assert.deepEqual(partyDanger(c.units, iv, after), {})
})

test('a card preview that kills the unit on the relay hands the hit back to the citizen', () => {
  const foe = unit('foe', 'enemy', RELAY)
  const c = board(citizen, foe, shooter)
  const after = boardAfter(c, { units: [{ uid: 'foe', hpBefore: 20, hpAfter: 0, blockAfter: 0, dies: true }] })
  const iv = [aim(shooter, [CITIZEN], 6)]
  assert.equal(relayHit(iv, after), null)
  assert.deepEqual(partyDanger(c.units, iv, after), { citizen: 6 })
})

test('fights without a relay read exactly as before', () => {
  const ghost = unit('ghost', 'party', { x: 1, y: 1 }, { statuses: { mark: 2 }, block: 1 })
  const c = { units: [ghost, shooter] } as unknown as CombatState
  const iv = [aim(shooter, [ghost.pos], 5)]
  assert.equal(expectedLoss(ghost, iv, c), 6)
  assert.deepEqual(partyDanger(c.units, iv, c), { ghost: 6 })
  assert.equal(boardAfter(c, null), c)
})

test('the forecast is the hit that lands: real Relay fights through a real enemy phase', () => {
  let checked = 0
  for (let seed = 1; seed <= 60; seed++) {
    for (const id of ['outside_serving', 'outside_pickup', 'outside_door']) {
      for (const side of ['party', 'enemy'] as const) {
        const c = startCombat(newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed }, CONTENT), id, CONTENT)
        const at = c.relay as Pos
        const n = c.units.find((u) => u.side === 'neutral') as UnitState
        const stander = c.units.find((u) => u.side === side && u.hp > 0 && !samePos(u.pos, at)) as UnitState
        if (unitAt(c, at)) continue
        stander.pos = { ...at }
        const views: IntentView[] = c.units.flatMap((u) => {
          const info = u.side === 'enemy' && u.hp > 0 ? intentInfo(c, CONTENT, u.uid) : null
          return info ? [{ uid: u.uid, unit: u, info }] : []
        })
        const forecast = relayHit(views, c)
        if (!forecast) continue
        assert.equal(forecast.proxyUid, stander.uid)
        // Direct hits only: burn ticks are a separate step the telegraph has never summed.
        const events = endTurn(c, CONTENT).events
        const direct = (uid: string): number => events.reduce((sum, e) => sum + (e.t === 'damage' && e.uid === uid && e.source === 'enemy' && !e.cause ? e.amount : 0), 0)
        assert.equal(direct(stander.uid), forecast.hit, `${id} seed ${seed} ${side}`)
        assert.equal(direct(n.uid), 0, `${id} seed ${seed}: the citizen takes no direct hit`)
        checked++
      }
    }
  }
  assert.ok(checked > 10, `only ${checked} fights aimed at the citizen`)
})
