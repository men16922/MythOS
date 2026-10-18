// Signal+ CRPG engine (engine/crpg.ts): district placement, points of interest, d20 dialogue, inspiration rerolls,
// approval → bond, quests → boss twists, camp nights, and a whole simulated run with the layer on. Uses the
// reference district (d1_substation) plus small fixtures so other districts' content can change freely.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT } from '../content/index.ts'
import { BACKGROUNDS } from '../content/crpg/backgrounds.ts'
import { D1_SUBSTATION, D1_SUBSTATION_DIALOGUES, D1_SUBSTATION_NPCS } from '../content/crpg/d1_substation.ts'
import { QUESTS } from '../content/crpg/quests.ts'
import {
  acceptRoll,
  applyCombatMods,
  campScene,
  chooseDialogue,
  closeDialogue,
  d20Chance,
  d20Modifier,
  dialogueOptions,
  districtPois,
  leaveDistrict,
  questLog,
  rerollDialogue,
  startCamp,
  visitPoi,
} from './crpg.ts'
import { newProfile } from './meta.ts'
import { enterNode, newRun, reachableNodes, startAct } from './run.ts'
import { simulateRun } from './runSim.ts'
import type { ContentRegistry, CrpgContent, DialogueDef, RunState } from './types.ts'

const byId = <T extends { id: string }>(xs: readonly T[]): Record<string, T> => Object.fromEntries(xs.map((x) => [x.id, x]))

const CAMP_SE_RIN: DialogueDef = {
  id: 'camp_test',
  start: 'a',
  nodes: {
    a: {
      speaker: 'se_rin',
      text: { ko: '불', en: 'fire' },
      options: [
        { label: { ko: '듣는다', en: 'listen' }, intent: 'ask', approval: { se_rin: 1 }, success: { text: { ko: '좋아', en: 'ok' }, effects: [{ kind: 'inspiration', amount: 1 }] } },
        { label: { ko: '잔다', en: 'sleep' }, intent: 'leave', success: { text: { ko: '잘 자', en: 'night' } } },
      ],
    },
  },
}

const X: CrpgContent = {
  districts: byId([D1_SUBSTATION]),
  dialogues: byId([...D1_SUBSTATION_DIALOGUES, CAMP_SE_RIN]),
  npcs: byId(D1_SUBSTATION_NPCS),
  backgrounds: byId(BACKGROUNDS),
  quests: byId(QUESTS),
  camps: [{ companion: 'se_rin', minApproval: 3, dialogue: 'camp_test' }],
}
const C: ContentRegistry = { ...CONTENT, crpg: X }
const profile = newProfile('t')

function crpgRun(seed = 7, background: string | null = null): RunState {
  return newRun(profile, { archetype: 'ghost', paradox: 0, seed, now: '2026-01-01T00:00:00.000Z', crpg: { background } }, C)
}

function inDistrict(seed = 7, background: string | null = null): RunState {
  let run = crpgRun(seed, background)
  run = { ...run, screen: { kind: 'district', district: { id: 'd1_substation', actionsLeft: 3, visited: [] } } }
  return run
}

test('archetype used by these tests exists', () => {
  assert.ok(C.archetypes.ghost)
})

test('a Signal+ run turns exactly one Act 1 event node into the district; the same seed without the layer does not', () => {
  const run = crpgRun()
  const districts = Object.values(run.map.nodes).filter((n) => n.kind === 'district')
  assert.equal(districts.length, 1)
  assert.equal(districts[0]?.districtId, 'd1_substation')
  const plain = newRun(profile, { archetype: 'ghost', paradox: 0, seed: 7, now: '2026-01-01T00:00:00.000Z' }, C)
  assert.equal(plain.crpg, undefined)
  assert.equal(Object.values(plain.map.nodes).filter((n) => n.kind === 'district').length, 0)
  // Placement uses its own hash: the run's random stream is untouched.
  assert.equal(plain.rng, run.rng)
  const daily = newRun(profile, { archetype: 'ghost', paradox: 0, daily: '2026-10-18', crpg: { background: 'medic' } }, C)
  assert.equal(daily.crpg, undefined)
})

test('entering the district node opens it with its action budget', () => {
  let run = startAct(crpgRun(), C)
  if (run.screen.kind === 'event') run = { ...run, screen: { kind: 'map' } }
  const node = Object.values(run.map.nodes).find((n) => n.kind === 'district')
  assert.ok(node)
  run = { ...run, nodeId: Object.values(run.map.nodes).find((n) => n.next.includes(node.id))?.id ?? null }
  if (!reachableNodes(run).includes(node.id)) run = { ...run, nodeId: null, map: { ...run.map, startIds: [node.id] } }
  const next = enterNode(run, node.id, C)
  assert.equal(next.screen.kind, 'district')
  if (next.screen.kind === 'district') assert.equal(next.screen.district.actionsLeft, D1_SUBSTATION.actions)
  assert.deepEqual(next.crpg?.districts, ['d1_substation'])
})

test('points of interest cost an action each, are visited once, and the district can always be left', () => {
  let run = inDistrict()
  assert.equal(districtPois(run, C).filter((p) => p.available).length, 4)
  run = visitPoi(run, 'tank', C)
  assert.equal(run.screen.kind, 'dialogue')
  if (run.screen.kind !== 'dialogue') return
  assert.equal(run.screen.returnTo.kind, 'district')
  // Leave the conversation without doing anything.
  const leaveIdx = dialogueOptions(run, C).findIndex((o) => o.option.intent === 'leave')
  run = chooseDialogue(run, leaveIdx, C)
  run = closeDialogue(run, C)
  assert.equal(run.screen.kind, 'district')
  const pois = districtPois(run, C)
  assert.equal(pois.find((p) => p.poi.id === 'tank')?.available, false)
  if (run.screen.kind === 'district') assert.equal(run.screen.district.actionsLeft, 2)
  assert.equal(visitPoi(run, 'tank', C), run)
  assert.equal(leaveDistrict(run, C).screen.kind, 'map')
})

test('d20 math: modifier = stat − 5 (+2 proficient); chance with advantage; naturals', () => {
  const run = crpgRun(7, 'broker')
  assert.equal(d20Modifier(run, 'cha', C), (run.stats.cha ?? 0) - 5 + 2)
  assert.equal(d20Modifier(run, 'str', C), (run.stats.str ?? 0) - 5)
  assert.equal(d20Chance(0, 11, false), 50)
  assert.equal(d20Chance(0, 11, true), 75)
  assert.equal(d20Chance(10, 5, false), 95) // a natural 1 still fails
  assert.equal(d20Chance(-10, 18, false), 5) // a natural 20 still succeeds
})

test('a check rolls first; a failed roll can be rerolled once with inspiration; accepting applies the outcome', () => {
  // Find a seed whose first d20 on the Bora persuade check fails.
  for (let seed = 1; seed < 200; seed++) {
    let run = visitPoi(inDistrict(seed), 'gate', C)
    const idx = dialogueOptions(run, C).findIndex((o) => o.option.intent === 'persuade')
    run = chooseDialogue(run, idx, C)
    if (run.screen.kind !== 'dialogue' || !run.screen.dialogue.pending) assert.fail('no pending roll')
    const pending = run.screen.dialogue.pending
    assert.equal(pending.roll.total, pending.roll.die + pending.roll.modifier)
    if (pending.roll.success) continue
    assert.equal(run.crpg?.inspiration, 1)
    const rerolled = rerollDialogue(run)
    assert.notEqual(rerolled, run)
    assert.equal(rerolled.crpg?.inspiration, 0)
    assert.equal(rerollDialogue(rerolled), rerolled) // once per check
    const done = acceptRoll(rerolled, C)
    if (done.screen.kind !== 'dialogue') assert.fail('still in the dialogue')
    assert.equal(done.screen.dialogue.pending, null)
    assert.ok(done.screen.dialogue.last?.roll?.rerolled)
    return
  }
  assert.fail('no failing seed found')
})

test('approval moves only for deployed companions and pays bond at 3 and 6', () => {
  let run = inDistrict()
  assert.ok(run.party.some((m) => m.id === 'se_rin'))
  const bond0 = run.party.find((m) => m.id === 'se_rin')?.bond ?? 0
  run = { ...run, crpg: run.crpg ? { ...run.crpg, approval: { se_rin: 2 } } : undefined }
  run = visitPoi(run, 'checkpoint', C)
  const lie = dialogueOptions(run, C).findIndex((o) => o.option.intent === 'deceive')
  // Force success regardless of the die by retrying seeds is overkill: resolve until the roll succeeds.
  for (let i = 0; i < 50; i++) {
    const tried = acceptRoll(chooseDialogue({ ...run, seed: run.seed + i }, lie, C), C)
    if (tried.screen.kind !== 'dialogue' || !tried.screen.dialogue.last?.roll?.success) continue
    assert.equal(tried.crpg?.approval.se_rin, 4)
    assert.deepEqual(tried.screen.dialogue.last.approvals, [{ id: 'se_rin', delta: 2 }])
    assert.equal(tried.party.find((m) => m.id === 'se_rin')?.bond, Math.min(3, bond0 + 1))
    assert.equal(tried.crpg?.approvalBonds.se_rin, 1)
    assert.equal(tried.crpg?.approval.tae_o, undefined) // not deployed
    return
  }
  assert.fail('the lie never landed')
})

test('background options show only with that background and grant inspiration when in character', () => {
  const plain = visitPoi(inDistrict(7, null), 'gate', C)
  const runner = visitPoi(inDistrict(7, 'runner'), 'gate', C)
  const sign = (r: RunState) => dialogueOptions(r, C).find((o) => o.option.requires?.background === 'runner')
  assert.equal(sign(plain)?.available, false)
  const view = sign(runner)
  assert.ok(view?.available && view.inspires)
  const after = chooseDialogue(runner, view.index, C)
  assert.equal(after.crpg?.inspiration, 2)
  assert.equal(after.crpg?.quests.q_grid, 1)
})

test('a quest payoff sets up the next boss fight; a conversation mod applies to the next fight only', () => {
  let run = crpgRun()
  run = { ...run, crpg: run.crpg ? { ...run.crpg, quests: { q_grid: 2 }, nextCombat: ['weaken'] } : undefined }
  assert.equal(questLog(run, C)[0]?.payoff?.en.includes('steel'), true)
  const boss = run.map.nodes[run.map.bossId]
  assert.ok(boss)
  const atBoss = enterNode({ ...run, screen: { kind: 'map' }, nodeId: null, map: { ...run.map, startIds: [boss.id] } }, boss.id, C)
  if (atBoss.screen.kind !== 'combat') assert.fail('boss fight expected')
  const covers = atBoss.screen.combat.tiles.flat().filter((t) => t.kind === 'cover').length
  const plain = enterNode({ ...run, crpg: undefined, screen: { kind: 'map' }, nodeId: null, map: { ...run.map, startIds: [boss.id] } }, boss.id, C)
  if (plain.screen.kind !== 'combat') assert.fail('boss fight expected')
  assert.ok(covers >= plain.screen.combat.tiles.flat().filter((t) => t.kind === 'cover').length + 1)
  const hp = (r: RunState) => (r.screen.kind === 'combat' ? r.screen.combat.units.filter((u) => u.side === 'enemy').reduce((s, u) => s + u.hp, 0) : 0)
  assert.ok(hp(atBoss) < hp(plain))
  assert.deepEqual(atBoss.crpg?.nextCombat, [])
  assert.deepEqual(atBoss.crpg?.payoffsUsed, ['q_grid'])
})

test('a later quest stage (the betrayal) does not pay the boss twist', () => {
  let run = crpgRun()
  run = { ...run, crpg: run.crpg ? { ...run.crpg, quests: { q_grid: 3 } } : undefined }
  const boss = run.map.nodes[run.map.bossId]
  assert.ok(boss)
  const atBoss = enterNode({ ...run, screen: { kind: 'map' }, nodeId: null, map: { ...run.map, startIds: [boss.id] } }, boss.id, C)
  assert.deepEqual(atBoss.crpg?.payoffsUsed, [])
  assert.equal(questLog(run, C)[0]?.payoff, undefined)
})

test('applyCombatMods: marked and intel', () => {
  const run = crpgRun()
  const boss = run.map.nodes[run.map.bossId]
  assert.ok(boss)
  const r = enterNode({ ...run, crpg: undefined, screen: { kind: 'map' }, nodeId: null, map: { ...run.map, startIds: [boss.id] } }, boss.id, C)
  if (r.screen.kind !== 'combat') assert.fail('combat')
  const c = structuredClone(r.screen.combat)
  const energy = c.energy
  applyCombatMods(c, ['marked', 'intel'])
  assert.equal(c.energy, energy + 1)
  assert.deepEqual(c.mods, ['marked', 'intel'])
  assert.ok(c.units.filter((u) => u.side === 'enemy').every((u) => (u.statuses.mark ?? 0) >= 1))
})

test('a free-tier CRPG trial places the Act 1 district as a taste, but skips Act 2–3 districts and camp nights', () => {
  const trial = newRun(profile, { archetype: 'ghost', paradox: 0, seed: 7, now: '2026-01-01T00:00:00.000Z', crpg: { background: null, trial: true } }, C)
  assert.equal(trial.crpg?.trial, true)
  assert.equal(Object.values(trial.map.nodes).filter((n) => n.kind === 'district').length, 1)
  const restRun: RunState = { ...trial, screen: { kind: 'rest', done: false }, crpg: trial.crpg ? { ...trial.crpg, approval: { se_rin: 5 } } : undefined }
  assert.equal(campScene(restRun, C), null)
})

test('a failed lie at the checkpoint queues a fight that ends the district visit', () => {
  for (let seed = 1; seed < 200; seed++) {
    let run = visitPoi(inDistrict(seed), 'checkpoint', C)
    const lie = dialogueOptions(run, C).findIndex((o) => o.option.intent === 'deceive')
    run = acceptRoll(chooseDialogue(run, lie, C), C)
    if (run.screen.kind !== 'dialogue' || run.screen.dialogue.last?.roll?.success !== false) continue
    assert.ok(run.screen.dialogue.ended)
    run = closeDialogue(run, C)
    assert.equal(run.screen.kind, 'combat')
    return
  }
  assert.fail('no failing seed')
})

test('camp night: a deployed companion with enough approval talks once per run', () => {
  let run = crpgRun()
  run = { ...run, screen: { kind: 'rest', done: false } }
  assert.equal(campScene(run, C), null)
  run = { ...run, crpg: run.crpg ? { ...run.crpg, approval: { se_rin: 3 } } : undefined }
  assert.equal(campScene(run, C)?.companion, 'se_rin')
  run = startCamp(run, C)
  assert.equal(run.screen.kind, 'dialogue')
  run = closeDialogue(chooseDialogue(run, 0, C), C)
  assert.equal(run.screen.kind, 'rest')
  assert.equal(run.crpg?.inspiration, 2)
  assert.equal(campScene(run, C), null)
})

test('whole simulated runs with the layer on never get stuck', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const res = simulateRun(seed, 'ghost', C, 'mixed', { crpg: { background: BACKGROUNDS[seed % 4]?.id ?? null } })
    assert.ok(res.floors > 0)
  }
})

