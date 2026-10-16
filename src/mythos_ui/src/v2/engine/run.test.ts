import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyRunEnd, buyUnlock, computeEchoes, newProfile } from './meta.ts'
import {
  abandonRun,
  applyImprovisation,
  availableEndings,
  checkChance,
  chooseEnding,
  chooseEventOption,
  conditionMet,
  continueEvent,
  discardConsumable,
  enterNode,
  eventOptions,
  leaveReward,
  leaveRest,
  leaveShop,
  leaveTreasure,
  newRun,
  openTreasure,
  pickCard,
  pickCardReward,
  pickableCards,
  reachableNodes,
  restBond,
  restHeal,
  restScrub,
  restUpgrade,
  setDeployment,
  shopBuyCard,
  shopBuyConsumable,
  shopBuyImplant,
  shopHeal,
  shopRemove,
  shopScrub,
  startAct,
  takeRewardCard,
  takeRewardConsumable,
  takeRewardCredits,
  takeRewardImplant,
  updateCombat,
} from './run.ts'
import { FIXTURE as C, tx } from './run.fixture.test.ts'
import type { CombatState, Improvisation, MapNode, MetaProfile, NodeKind, RunScreen, RunState } from './types.ts'

const NOW = '2026-10-10T00:00:00.000Z'
const P0 = newProfile('Tester')

function unlocked(...ids: string[]): MetaProfile {
  let p: MetaProfile = { ...P0, echoes: 999, totalEchoes: 999 }
  for (const id of ids) p = buyUnlock(p, id, C)
  return p
}

function start(seed = 1234, profile: MetaProfile = P0, paradox = 0, companion?: string): RunState {
  return newRun(profile, { archetype: 'ghost', paradox, seed, now: NOW, companion }, C)
}

function screen<K extends RunScreen['kind']>(run: RunState, kind: K): Extract<RunScreen, { kind: K }> {
  assert.equal(run.screen.kind, kind, `expected screen ${kind}, got ${run.screen.kind}`)
  return run.screen as Extract<RunScreen, { kind: K }>
}

/** Rewrite the first reachable node into `kind` (tests choose the node type they exercise). */
function forceNext(run: RunState, kind: NodeKind, extra: Partial<MapNode> = {}): { run: RunState; id: string } {
  const next = structuredClone(run)
  const id = reachableNodes(next)[0] as string
  Object.assign(next.map.nodes[id] as MapNode, { kind, ...extra })
  return { run: next, id }
}

function enter(run: RunState, kind: NodeKind, extra: Partial<MapNode> = {}): RunState {
  const f = forceNext(run, kind, extra)
  const next = enterNode(f.run, f.id, C)
  assert.notEqual(next, f.run, 'enterNode accepted')
  return next
}

function finishCombat(run: RunState, phase: 'won' | 'lost', edit: (c: CombatState) => void = () => {}): RunState {
  const c = structuredClone(screen(run, 'combat').combat)
  c.phase = phase
  edit(c)
  return updateCombat(run, c, C)
}

function atMap(seed = 1234, profile: MetaProfile = P0, paradox = 0): RunState {
  let run = start(seed, profile, paradox)
  if (run.screen.kind === 'card_pick') run = pickCard(run, run.deck[0]?.uid as string, C)
  return startAct(run, C)
}

// ---------------------------------------------------------------- newRun

test('newRun: loop 1 setup, frozen pools, Se-rin forced', () => {
  const run = start()
  assert.equal(run.loop, 1)
  assert.equal(run.act, 1)
  assert.equal(run.screen.kind, 'act_intro')
  assert.equal(run.hp, 34)
  assert.equal(run.maxHp, 34)
  assert.equal(run.credits, 50)
  assert.equal(run.trace, 0)
  assert.deepEqual(run.implants, ['starter_imp'])
  assert.deepEqual(run.party, [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 0 }])
  assert.equal(run.stats.int, 5, 'Se-rin passive +1 INT')
  assert.equal(run.deck.length, 12, '10 starter + 2 companion cards')
  assert.ok(run.deck.some((c) => c.defId === 'serin_a') && run.deck.some((c) => c.defId === 'serin_b'))
  assert.equal(new Set(run.deck.map((c) => c.uid)).size, run.deck.length, 'unique card uids')
  assert.ok(run.pools.cards.includes('ghost_only') && !run.pools.cards.includes('smug_only'))
  assert.deepEqual(run.pools.companions, ['se_rin'])
  assert.equal(run.map.act, 1)
  assert.equal(run.startedAt, NOW)
  assert.throws(() => newRun(P0, { archetype: 'nope', paradox: 0 }, C))
  assert.deepEqual(start(), run, 'same seed → same run')
  assert.notDeepEqual(start(99).map, run.map)
})

test('newRun: later loops, companions, threads and paradox', () => {
  const p = { ...unlocked('comp_tae_o', 'thread_hp', 'thread_credits', 'thread_remove'), loops: 3 }
  const run = start(5, p, 3, 'tae_o')
  assert.equal(run.loop, 4)
  assert.deepEqual(run.party.map((m) => m.id), ['tae_o'])
  assert.equal(run.maxHp, 38)
  assert.equal(run.hp, 38)
  assert.equal(run.stats.agi, 7)
  assert.equal(run.credits, 75)
  assert.deepEqual(run.consumables, ['patch'])
  assert.equal(run.flags.thread_traceMult, -0.5)
  assert.equal(run.flags.thread_rewardChoices, 1)
  assert.equal(run.flags.thread_restHeal, 10)
  assert.equal(run.flags.thread_shopDiscount, 0.2)
  assert.equal(run.trace, 20, 'paradox 3 starts at trace 20')
  assert.ok(run.deck.some((c) => c.defId === 'static'), 'paradox ≥ 2 adds Static')
  const pick = screen(run, 'card_pick')
  assert.equal(pick.purpose, 'remove')
  assert.deepEqual(pick.returnTo, { kind: 'act_intro' })
  const staticUid = run.deck.find((c) => c.defId === 'static')?.uid as string
  const after = pickCard(run, staticUid, C)
  assert.equal(after.screen.kind, 'act_intro')
  assert.ok(!after.deck.some((c) => c.defId === 'static'))

  assert.equal(start(5, { ...P0, loops: 2 }, 0, 'tae_o').party.length, 0, 'locked companion is refused')
  assert.equal(start(5, { ...P0, loops: 2 }, 0).party.length, 0, 'no companion chosen')
  // Paradox 3 node trace: +5, scaled by the thread's −50 %.
  const m = startAct(after, C)
  const entered = enterNode(m, reachableNodes(m)[0] as string, C)
  assert.equal(entered.trace, 23)
})

// ---------------------------------------------------------------- map & combat

test('map navigation: reachability, trace, floors, echo per cleared node', () => {
  let run = atMap()
  assert.equal(screen(run, 'map').kind, 'map')
  assert.deepEqual(reachableNodes(run), run.map.startIds)
  const bad = Object.values(run.map.nodes).find((n) => n.row === 2) as MapNode
  assert.equal(enterNode(run, bad.id, C), run, 'unreachable node is a no-op')
  run = enter(run, 'combat')
  assert.equal(run.trace, 3)
  assert.equal(run.tally.floors, 1)
  assert.equal(run.echoes, 0)
  const c = screen(run, 'combat').combat
  assert.equal(c.phase, 'player')
  assert.ok(c.units.some((u) => u.uid === 'connector') && c.units.some((u) => u.uid === 'se_rin'))
  assert.equal(startAct(run, C), run, 'wrong-screen action is a no-op')

  const mid = updateCombat(run, { ...c, turn: 2 }, C)
  assert.equal(screen(mid, 'combat').combat.turn, 2, 'in-progress combat is stored')

  run = finishCombat(run, 'won', (w) => {
    w.units = w.units.filter((u) => u.uid !== 'se_rin')
    const conn = w.units.find((u) => u.uid === 'connector')
    if (conn) conn.hp = 20
    w.consumables = ['grenade']
    w.trace = 4
    w.credits = 7
    w.stats.enemiesKilled = 2
  })
  const r = screen(run, 'reward').reward
  assert.equal(run.hp, 20)
  assert.equal(run.party[0]?.hp, 1, 'downed companion returns at 1 HP')
  assert.deepEqual(run.consumables, ['grenade'])
  assert.equal(run.trace, 7)
  assert.equal(run.tally.kills, 2)
  assert.ok(r.credits >= 12 + 7 && r.credits <= 20 + 7, `credits ${r.credits}`)
  assert.equal(r.cardChoices.length, 1)
  assert.equal(r.cardChoices[0]?.length, 3)
  for (const id of r.cardChoices[0] ?? []) assert.ok(run.pools.cards.includes(id))
  assert.deepEqual(r.implantChoices, [])
  assert.equal(r.echoes, 0)

  const credits0 = run.credits
  run = takeRewardCredits(run, C)
  assert.equal(run.credits, credits0 + r.credits)
  assert.equal(takeRewardCredits(run, C), run, 'credits only once')
  const cardId = r.cardChoices[0]?.[1] as string
  assert.equal(takeRewardCard(run, 0, 'not-offered', C), run)
  run = takeRewardCard(run, 0, cardId, C)
  assert.ok(run.deck.some((d) => d.defId === cardId))
  assert.equal(takeRewardCard(run, 0, cardId, C), run, 'one card per group')
  run = leaveReward(run, C)
  assert.equal(run.screen.kind, 'map')
  run = enter(run, 'event')
  assert.equal(run.echoes, 1, 'leaving a node clears it')
  assert.equal(computeEchoes(run, C).nodes, 1)
})

test('bonus objective, elite and boss rewards, act transition and recruit event', () => {
  // Bonus objective achieved → extra card group.
  let run = enter(atMap(), 'combat', { encounterId: 'n1_2' })
  run = finishCombat(run, 'won')
  assert.equal(screen(run, 'reward').reward.cardChoices.length, 2)
  const failed = finishCombat(enter(atMap(), 'combat', { encounterId: 'n1_2' }), 'won', (c) => {
    if (c.bonus) c.bonus.failed = true
  })
  assert.equal(screen(failed, 'reward').reward.cardChoices.length, 1)

  // Elite: one implant + more credits + 4 echoes.
  run = finishCombat(enter(atMap(), 'elite', { encounterId: 'e1_1' }), 'won')
  let r = screen(run, 'reward').reward
  assert.ok(r.credits >= 30 && r.credits <= 40)
  assert.equal(r.implantChoices.length, 1)
  assert.equal(run.echoes, 4)
  assert.equal(run.tally.elites, 1)
  const imp = r.implantChoices[0] as string
  assert.equal(takeRewardImplant(run, 'imp_b1', C), run, 'only offered implants')
  run = takeRewardImplant(run, imp, C)
  assert.ok(run.implants.includes(imp))
  if (r.consumable) {
    run = takeRewardConsumable(run, C)
    assert.ok(run.consumables.includes(r.consumable))
  }

  // Boss of act 1 → 3 boss implants, act 2 with half the missing HP healed.
  const p = unlocked('comp_tae_o', 'comp_han')
  run = atMap(77, p)
  const sixth = Object.values(run.map.nodes).find((n) => n.row === 6) as MapNode
  run = { ...structuredClone(run), nodeId: sixth.id }
  run = enterNode(run, run.map.bossId, C)
  assert.equal(screen(run, 'combat').nodeKind, 'boss')
  run = finishCombat(run, 'won', (c) => {
    const conn = c.units.find((u) => u.uid === 'connector')
    if (conn) conn.hp = 10
  })
  r = screen(run, 'reward').reward
  assert.equal(r.credits, 60)
  assert.deepEqual([...r.implantChoices].sort(), ['imp_b1', 'imp_b2', 'imp_b3'])
  assert.ok(r.cardChoices[0]?.every((id) => C.cards[id]?.rarity === 'rare'), 'boss cards are rare')
  assert.equal(r.echoes, 12)
  const echoesBefore = run.echoes
  run = leaveReward(run, C)
  assert.equal(run.act, 2)
  assert.equal(run.map.act, 2)
  assert.equal(run.nodeId, null)
  assert.equal(run.hp, 10 + 12, 'heals half the missing HP')
  assert.equal(run.echoes, echoesBefore + 1, 'boss node counts as cleared')
  assert.equal(run.credits >= 60, true, 'untaken credits are pocketed on leave')
  assert.equal(run.screen.kind, 'act_intro')

  run = startAct(run, C)
  assert.equal(screen(run, 'event').eventId, 'a2_recruit')
  const opts = eventOptions(run, C)
  assert.equal(opts.length, 3, '1 authored + 2 recruit options')
  assert.ok(opts.every((o) => o.available))
  run = chooseEventOption(run, 2, C)
  assert.equal(run.party.length, 2)
  const recruit = run.party[1]?.id as string
  assert.ok(['tae_o', 'han'].includes(recruit))
  assert.ok(run.deck.some((c) => c.defId === C.companions[recruit]?.cards[0]))
  run = continueEvent(run, C)
  assert.equal(run.screen.kind, 'map')

  // A full party still meets the recruit scene (newcomers go to the bench) until nobody is left to recruit.
  const again = structuredClone(run)
  again.screen = { kind: 'act_intro' }
  again.seenEvents = []
  assert.equal(screen(startAct(again, C), 'event').eventId, 'a2_recruit', 'party full → still a candidate left')
  const full = eventOptions(startAct(again, C), C)
  assert.equal(full[0]?.option.label.en, 'Go with who you have', 'a full party gets no go-alone bonus')
  assert.deepEqual(full[0]?.option.success.effects, [])
  const everyone = structuredClone(again)
  everyone.bench = [{ id: recruit === 'han' ? 'tae_o' : 'han', hp: 20, maxHp: 20, bond: 0 }]
  assert.equal(startAct(everyone, C).screen.kind, 'map', 'roster complete → no recruit')
})

test('party: a full party benches the newcomer; deployment swaps on the map only; bench cards sit fights out', () => {
  let run = structuredClone(atMap(1234, unlocked('comp_tae_o', 'comp_han')))
  run.act = 2
  run.screen = { kind: 'event', eventId: 'a2_recruit', resolved: null, improvised: null }
  run.party.push({ id: 'tae_o', hp: 9, maxHp: 30, bond: 1 })
  run = chooseEventOption(run, 1, C) // the only candidate left: Han
  assert.deepEqual(run.party.map((m) => m.id), ['se_rin', 'tae_o'])
  assert.deepEqual(run.bench?.map((m) => m.id), ['han'])
  const hanCard = C.companions.han?.cards[0] as string
  assert.ok(run.deck.some((c) => c.defId === hanCard), 'a benched recruit still brings their cards')
  run = continueEvent(run, C)
  assert.equal(run.screen.kind, 'map')

  // Swap Tae-o out for Han: HP and bond travel with each companion.
  assert.equal(setDeployment(run, ['se_rin', 'han', 'tae_o']), run, 'three deployed → rejected')
  assert.equal(setDeployment(run, ['se_rin', 'kai']), run, 'not recruited → rejected')
  assert.equal(setDeployment(run, ['han', 'han']), run, 'duplicate → rejected')
  assert.equal(setDeployment(run, ['se_rin', 'tae_o']), run, 'no change → same run')
  const swapped = setDeployment(run, ['se_rin', 'han'])
  assert.deepEqual(swapped.party.map((m) => m.id), ['se_rin', 'han'])
  assert.deepEqual(swapped.bench, [{ id: 'tae_o', hp: 9, maxHp: 30, bond: 1 }])
  assert.deepEqual(run.party.map((m) => m.id), ['se_rin', 'tae_o'], 'pure: the input run is untouched')
  const offMap = { ...swapped, screen: { kind: 'rest', done: false } as RunScreen }
  assert.equal(setDeployment(offMap, ['se_rin', 'tae_o']), offMap, 'only on the map')

  // The benched companion's cards stay in the deck but are not drawn into a fight.
  const fight = enter(swapped, 'combat', { encounterId: 'n1_2' })
  const c = screen(fight, 'combat').combat
  const owners = [...c.draw, ...c.hand].map((k) => C.cards[k.defId]?.owner)
  assert.ok(!owners.includes('tae_o'), 'no benched cards in the fight')
  assert.ok(owners.includes('han'), 'the deployed recruit fights with their cards')
  assert.equal(c.units.some((u) => u.uid === 'tae_o'), false)

  // Bench members still rest, bond at the safehouse and count as recruited for event conditions.
  const rest = enter(swapped, 'rest')
  assert.equal(restBond(rest, 'tae_o', C).bench?.[0]?.bond, 2)
  assert.ok((restHeal(rest, C).bench?.[0]?.hp ?? 0) > 9, 'the safehouse heals the bench too')
  assert.equal(conditionMet(swapped, { noCompanion: 'tae_o' }, C).ok, false, 'benched still counts as recruited')
  assert.equal(conditionMet(swapped, { companion: 'tae_o' }, C).ok, false, 'arc events need them deployed')
})

test('defeat ends the run in Forced Erasure and banks a last death', () => {
  let run = enter(atMap(), 'combat', { encounterId: 'n1_3' })
  run = finishCombat(run, 'lost')
  const end = screen(run, 'ended')
  assert.equal(end.result, 'defeat')
  assert.equal(end.endingId, 'ending_forced_erasure')
  assert.equal(run.hp, 0)
  assert.ok(run.endedAt)
  assert.equal(run.log.at(-1)?.kind, 'end')
  const p = applyRunEnd(P0, run, C)
  assert.deepEqual(p.lastDeath, { killedBy: 'n1_3', act: 1, loop: 1 })
  assert.equal(p.echoes, 5, 'forced erasure bonus only')
})

test('final choice: ending gates and victory', () => {
  let run = atMap(3)
  run = structuredClone(run)
  run.act = 3
  run.screen = { kind: 'final_choice' }
  run.trace = 80
  const views = availableEndings(run, C)
  const by = (id: string) => views.find((v) => v.ending.id === id)
  assert.equal(views.length, 3, 'forced erasure is not a choice')
  assert.equal(by('ending_safe_refuge')?.available, false)
  assert.match(by('ending_safe_refuge')?.reason?.en ?? '', /Trace 50 or less/)
  assert.equal(by('ending_code_rewrite')?.available, false)
  assert.match(by('ending_code_rewrite')?.reason?.en ?? '', /bond 3/)
  assert.equal(by('ending_noble_sacrifice')?.available, true, 'noble sacrifice is always open')
  assert.equal(chooseEnding(run, 'ending_safe_refuge', C), run)
  run.party = [{ id: 'se_rin', hp: 20, maxHp: 20, bond: 3 }]
  run.codex = ['lore_1', 'lore_2']
  assert.equal(availableEndings(run, C).find((v) => v.ending.id === 'ending_code_rewrite')?.available, true)
  const done = chooseEnding(run, 'ending_code_rewrite', C)
  assert.deepEqual(done.screen, { kind: 'ended', result: 'victory', endingId: 'ending_code_rewrite' })
  const p = applyRunEnd(P0, done, C)
  assert.equal(p.wins, 1)
  assert.equal(p.paradoxUnlocked, 1)
  assert.equal(p.echoes, computeEchoes(done, C).total)
})

// ---------------------------------------------------------------- events

test('events: requirements, checks and immediate effects', () => {
  let run = enter(atMap(), 'event', { eventId: 'ev_costly' })
  let opts = eventOptions(run, C)
  assert.equal(opts[0]?.available, true)
  const poor = structuredClone(run)
  poor.credits = 10
  opts = eventOptions(poor, C)
  assert.equal(opts[0]?.available, false)
  assert.deepEqual(opts[0]?.reason, { ko: '₵30 필요', en: 'Needs ₵30' })
  assert.equal(chooseEventOption(poor, 0, C), poor, 'unavailable option is a no-op')

  // Pay: −30 credits now, then a rare card choice.
  run = chooseEventOption(run, 0, C)
  assert.equal(run.credits, 20)
  assert.equal(chooseEventOption(run, 1, C), run, 'resolved events ignore further options')
  run = continueEvent(run, C)
  const cr = screen(run, 'card_reward')
  assert.ok(cr.choices.length > 0 && cr.choices.every((id) => C.cards[id]?.rarity === 'rare'))
  assert.deepEqual(cr.returnTo, { kind: 'map' })
  run = pickCardReward(run, null, C)
  assert.equal(run.screen.kind, 'map')

  // Gamble check chance and both outcomes.
  run = enter(atMap(), 'event', { eventId: 'ev_gamble' })
  assert.equal(eventOptions(run, C)[0]?.chance, checkChance(run, 'cha', 5))
  assert.equal(checkChance(run, 'cha', 5), 50)
  assert.equal(checkChance(run, 'cha', 20), 5)
  assert.equal(checkChance(run, 'cha', -20), 95)
  const outcomes = new Set<boolean>()
  for (let s = 0; s < 40 && outcomes.size < 2; s++) {
    const r0 = structuredClone(run)
    r0.rng = s * 101 + 7
    const r1 = chooseEventOption(r0, 0, C)
    const res = screen(r1, 'event').resolved
    assert.ok(res)
    outcomes.add(res.success)
    if (res.success) assert.equal(r1.credits, run.credits + 50)
    else assert.equal(r1.hp, run.hp - 5)
  }
  assert.equal(outcomes.size, 2, 'both outcomes occur')

  // Every immediate RunEffect kind.
  run = enter(atMap(), 'event', { eventId: 'ev_misc' })
  const before = run
  run = chooseEventOption(run, 0, C)
  assert.equal(run.maxHp, before.maxHp + 3)
  assert.equal(run.trace, before.trace + 10)
  assert.ok(run.deck.some((c) => c.defId === 'r_a'))
  assert.ok(run.implants.includes('imp_c3'))
  assert.equal(run.stats.obs, 6, 'implant stat passive applied')
  assert.equal(run.stats.str, 10, 'stats clamp at 10')
  assert.deepEqual(run.consumables, ['grenade'])
  assert.equal(run.party[0]?.bond, 2)
  assert.ok(run.deck.some((c) => c.defId === 'serin_bond'), 'bond 2 adds the bond card')
  assert.equal(run.flags.met_misc, 2)
  assert.deepEqual(run.codex, ['lore_1'])
  assert.equal(run.deck.filter((c) => c.defId === 'static').length, 2)
  assert.equal(run.echoes, before.echoes + 5)
  assert.equal(run.deck.filter((c) => c.upgraded).length, 2, 'random upgrades')
  assert.equal(continueEvent(run, C).screen.kind, 'map')
})

test('events: deferred screens chain in order and a queued fight starts last', () => {
  let run = enter(atMap(), 'event', { eventId: 'ev_costly' })
  run = chooseEventOption(run, 2, C) // upgrade pick → 2-card choice → ambush fight
  run = continueEvent(run, C)
  const pick = screen(run, 'card_pick')
  assert.equal(pick.purpose, 'upgrade')
  const uid = pickableCards(run, C)[0]?.uid as string
  assert.equal(pickCard(run, 'nope', C), run)
  run = pickCard(run, uid, C)
  assert.ok(run.deck.find((c) => c.uid === uid)?.upgraded)
  const cr = screen(run, 'card_reward')
  assert.equal(cr.choices.length, 2)
  run = pickCardReward(run, cr.choices[0] as string, C)
  const fight = screen(run, 'combat')
  assert.equal(fight.combat.encounterId, 'ev1_fight')
  assert.equal(fight.nodeKind, 'combat')
  const drawn = [...fight.combat.draw, ...fight.combat.hand].map((c) => c.uid)
  assert.ok(drawn.includes(run.deck.at(-1)?.uid as string), 'fight uses the deck as it is when reached')
  run = leaveReward(finishCombat(run, 'won'), C)
  assert.equal(run.screen.kind, 'map')

  // Bleed: HP loss never kills, then removal picker.
  run = enter(atMap(), 'event', { eventId: 'ev_costly' })
  run = continueEvent(chooseEventOption(run, 1, C), C)
  assert.equal(run.hp, 1)
  assert.equal(screen(run, 'card_pick').purpose, 'remove')
  const size = run.deck.length
  run = pickCard(run, run.deck[0]?.uid as string, C)
  assert.equal(run.deck.length, size - 1)
  assert.equal(run.screen.kind, 'map')
})

test('events: invalid or seen pre-rolls are re-rolled on enter', () => {
  const run = enter(atMap(), 'event', { eventId: 'ev_never' })
  const id = screen(run, 'event').eventId
  assert.notEqual(id, 'ev_never')
  assert.ok(conditionMet(run, C.events[id]?.requires, C).ok)
  assert.ok(run.seenEvents.includes(id))
  const again = structuredClone(run)
  again.screen = { kind: 'map' }
  again.nodeId = null
  const second = enter(again, 'event', { eventId: id })
  assert.notEqual(screen(second, 'event').eventId, id, 'seen events are not repeated while others remain')
})

test('improvisation: bounded rewards and risks', () => {
  const base = enter(atMap(), 'event', { eventId: 'ev_gamble' })
  const imp = (over: Partial<Improvisation>): Improvisation => ({
    action: 'hack the lock',
    stat: 'int',
    dc: 5,
    reward: 'credits',
    risk: 'hp',
    successText: tx('ok'),
    failureText: tx('bad'),
    ...over,
  })
  const roll = (over: Partial<Improvisation>, want: boolean): RunState => {
    for (let s = 0; s < 200; s++) {
      const r0 = structuredClone(base)
      r0.rng = s * 7919 + 1
      const r1 = applyImprovisation(r0, imp(over), C)
      if (screen(r1, 'event').improvised?.rolled?.success === want) return r1
    }
    throw new Error('outcome not found')
  }
  let r = roll({ dc: 12 }, true)
  assert.equal(screen(r, 'event').improvised?.dc, 9, 'dc clamps to 9')
  assert.equal(r.credits, base.credits + 20 + 9 * 5)
  assert.equal(screen(r, 'event').resolved?.optionIndex, -1)
  assert.equal(applyImprovisation(r, imp({}), C), r, 'one improvisation per event')

  r = roll({ reward: 'heal', dc: 4 }, true)
  assert.equal(r.hp, Math.min(base.maxHp, base.hp + 10))
  r = roll({ reward: 'trace_down', dc: 3 }, true)
  assert.equal(r.trace, Math.max(0, base.trace - 11))
  r = roll({ reward: 'implant', dc: 6 }, true)
  assert.equal(screen(r, 'event').improvised?.reward, 'card', 'implant needs dc ≥ 7')
  r = continueEvent(r, C)
  const cr = screen(r, 'card_reward')
  assert.ok(cr.choices.every((id) => C.cards[id]?.rarity !== 'rare'), 'no rares below dc 8')
  r = roll({ reward: 'implant', dc: 8 }, true)
  assert.equal(r.implants.length, base.implants.length + 1)

  r = roll({ risk: 'hp', dc: 9 }, false)
  assert.equal(r.hp, base.hp - 10)
  r = roll({ risk: 'trace', dc: 3 }, false)
  assert.equal(r.trace, base.trace + 6)
  r = roll({ risk: 'credits', dc: 9 }, false)
  assert.equal(r.credits, Math.max(0, base.credits - 36))
  assert.equal(continueEvent(r, C).screen.kind, 'map')

  const recruit = structuredClone(base)
  recruit.screen = { kind: 'event', eventId: 'a2_recruit', resolved: null, improvised: null }
  assert.equal(applyImprovisation(recruit, imp({}), C), recruit, 'events can opt out of improvisation')
})

// ---------------------------------------------------------------- shop / rest / treasure

test('shop: stock, purchases, removal, services', () => {
  let run = structuredClone(atMap())
  run.credits = 1000
  run = enter(run, 'shop')
  const stock = screen(run, 'shop').stock
  assert.equal(stock.cards.length, 5)
  assert.deepEqual(stock.cards.map((c) => C.cards[c.cardId]?.rarity), ['common', 'common', 'uncommon', 'uncommon', 'rare'])
  const band = { common: [45, 55], uncommon: [67, 83], rare: [135, 165] } as const
  for (const c of stock.cards) {
    const [lo, hi] = band[C.cards[c.cardId]?.rarity as keyof typeof band]
    assert.ok(c.price >= lo && c.price <= hi, `${c.cardId} price ${c.price}`)
  }
  assert.equal(stock.implants.length, 3)
  assert.ok(stock.implants.some((i) => C.implants[i.implantId]?.rarity === 'shop'))
  for (const i of stock.implants) assert.ok(i.price >= 140 && i.price <= 220)
  assert.equal(stock.consumables.length, 3)
  assert.equal(stock.removePrice, 75)

  const c0 = stock.cards[0]
  run = shopBuyCard(run, 0, C)
  assert.equal(run.credits, 1000 - (c0?.price ?? 0))
  assert.ok(run.deck.some((d) => d.defId === c0?.cardId))
  assert.equal(shopBuyCard(run, 0, C), run, 'sold out')
  run = shopBuyImplant(run, 0, C)
  assert.ok(run.implants.includes(stock.implants[0]?.implantId as string))
  for (let i = 0; i < 3; i++) run = shopBuyConsumable(run, i, C)
  assert.equal(run.consumables.length, 3)
  const full = discardConsumable(run, 0, C)
  assert.equal(full.consumables.length, 2)

  run.hp = 10
  const healed = shopHeal(run, C)
  assert.equal(healed.hp, 10 + Math.round(run.maxHp * 0.3))
  assert.equal(screen(healed, 'shop').stock.healPrice, 60, 'service price rises')
  run = structuredClone(healed)
  run.trace = 30
  run = shopScrub(run, C)
  assert.equal(run.trace, 5)

  const size = run.deck.length
  run = shopRemove(run, C)
  assert.equal(screen(run, 'card_pick').purpose, 'remove')
  run = pickCard(run, run.deck[0]?.uid as string, C)
  assert.equal(run.deck.length, size - 1)
  assert.equal(screen(run, 'shop').stock.removeUsed, true)
  assert.equal(shopRemove(run, C), run, 'one removal per visit')
  run = leaveShop(run, C)
  assert.equal(run.screen.kind, 'map')
  run.credits = 1000
  run = enter(run, 'shop')
  assert.equal(screen(run, 'shop').stock.removePrice, 100, 'removal price grows per use')

  const broke = structuredClone(run)
  broke.credits = 0
  assert.equal(shopBuyCard(broke, 1, C), broke, 'cannot afford')

  // 20 % thread discount.
  const cheap = enter(atMap(1234, unlocked('thread_remove')), 'shop')
  assert.equal(screen(cheap, 'shop').stock.removePrice, 60)
})

test('rest: heal / upgrade / scrub / bond, one action', () => {
  let run = structuredClone(atMap())
  run.hp = 4
  const serin = run.party[0]
  if (serin) serin.hp = 2
  run = enter(run, 'rest')
  const healed = restHeal(run, C)
  assert.equal(healed.hp, 4 + Math.round(34 * 0.3))
  assert.equal(healed.party[0]?.hp, 2 + 6)
  assert.equal(restHeal(healed, C), healed, 'one action per rest')
  assert.equal(restScrub(healed, C), healed)
  assert.equal(leaveRest(healed, C).screen.kind, 'map')

  const up = restUpgrade(run, C)
  assert.equal(screen(up, 'card_pick').purpose, 'upgrade')
  const target = pickableCards(up, C)[0]?.uid as string
  const done = pickCard(up, target, C)
  assert.deepEqual(done.screen, { kind: 'rest', done: true })
  assert.ok(done.deck.find((c) => c.uid === target)?.upgraded)

  const traced = structuredClone(run)
  traced.trace = 50
  assert.equal(restScrub(traced, C).trace, 20)

  let bonded = run
  for (let i = 0; i < 3; i++) {
    bonded = restBond(bonded, 'se_rin', C)
    assert.equal(bonded.party[0]?.bond, i + 1)
    bonded = structuredClone(bonded)
    bonded.screen = { kind: 'rest', done: false }
  }
  assert.ok(bonded.deck.some((c) => c.defId === 'serin_bond'))
  assert.ok(bonded.deck.find((c) => c.defId === 'serin_a')?.upgraded, 'bond 3 upgrades the signature card')
  assert.equal(restBond(bonded, 'se_rin', C), bonded, 'bond caps at 3')
  assert.equal(restBond(run, 'han', C), run, 'not in party')

  // Paradox 5 and restHeal passives.
  let p5 = structuredClone(atMap(1234, P0, 5))
  p5.hp = 1
  p5 = restHeal(enter(p5, 'rest'), C)
  assert.equal(p5.hp, 1 + Math.round(34 * 0.2))
  let bonus = structuredClone(atMap(1234, unlocked('thread_remove')))
  bonus.hp = 1
  bonus = restHeal(enter(bonus, 'rest'), C)
  assert.equal(bonus.hp, 1 + Math.round(bonus.maxHp * 0.4))
})

test('treasure: implant + credits', () => {
  let run = enter(atMap(), 'treasure')
  const t = screen(run, 'treasure')
  assert.ok(['common', 'uncommon'].includes(C.implants[t.implantId]?.rarity ?? ''))
  assert.ok(t.credits >= 25 && t.credits <= 45)
  const credits = run.credits
  run = openTreasure(run, C)
  assert.ok(run.implants.includes(t.implantId))
  assert.equal(run.credits, credits + t.credits)
  assert.equal(openTreasure(run, C), run)
  assert.equal(leaveTreasure(run, C).screen.kind, 'map')
})

// ---------------------------------------------------------------- whole run

/** Scripted bot that wins every fight instantly: walks the full state machine. */
function autoStep(run: RunState): RunState {
  const s = run.screen
  switch (s.kind) {
    case 'act_intro':
      return startAct(run, C)
    case 'map':
      return enterNode(run, reachableNodes(run)[0] as string, C)
    case 'combat':
      return finishCombat(run, 'won')
    case 'reward': {
      let r = takeRewardCredits(run, C)
      s.reward.cardChoices.forEach((g, i) => (r = takeRewardCard(r, i, g[0] ?? null, C)))
      if (s.reward.implantChoices[0]) r = takeRewardImplant(r, s.reward.implantChoices[0], C)
      return leaveReward(takeRewardConsumable(r, C), C)
    }
    case 'event': {
      if (s.resolved) return continueEvent(run, C)
      const open = eventOptions(run, C).find((o) => o.available)
      return open ? chooseEventOption(run, open.index, C) : applyImprovisation(run, { action: 'x', stat: 'agi', dc: 5, reward: 'heal', risk: 'trace', successText: tx('a'), failureText: tx('b') }, C)
    }
    case 'shop':
      return leaveShop(shopBuyCard(run, 0, C), C)
    case 'rest':
      return leaveRest(restHeal(run, C), C)
    case 'treasure':
      return leaveTreasure(openTreasure(run, C), C)
    case 'card_pick':
      return pickCard(run, pickableCards(run, C)[0]?.uid as string, C)
    case 'card_reward':
      return pickCardReward(run, s.choices[0] ?? null, C)
    case 'final_choice':
      return chooseEnding(run, availableEndings(run, C).find((v) => v.available)?.ending.id as string, C)
    case 'ended':
      return run
  }
}

function playOut(run: RunState, limit = 600): { run: RunState; screens: Set<string>; steps: number } {
  const screens = new Set<string>()
  let steps = 0
  while (run.screen.kind !== 'ended' && steps < limit) {
    screens.add(run.screen.kind)
    const next = autoStep(run)
    assert.notEqual(next, run, `stuck on ${run.screen.kind}`)
    run = next
    steps++
  }
  return { run, screens, steps }
}

test('full run: newRun → three acts → final choice → ended, deterministic and JSON-safe', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { run, screens } = playOut(start(seed, unlocked('comp_tae_o', 'thread_remove')))
    assert.equal(run.screen.kind, 'ended')
    assert.equal((run.screen as Extract<RunScreen, { kind: 'ended' }>).result, 'victory')
    assert.equal(run.act, 3)
    assert.equal(run.tally.bosses, 3)
    for (const k of ['act_intro', 'map', 'combat', 'reward', 'final_choice']) assert.ok(screens.has(k), `visited ${k}`)
    assert.ok(run.tally.floors >= 24, `floors ${run.tally.floors}`)
    assert.equal(computeEchoes(run).nodes, run.tally.floors, 'every entered node was cleared')
    assert.ok(run.trace >= 0 && run.trace <= 100)
  }

  // Determinism + save/load: replaying from a JSON copy mid-run gives the identical result.
  let a = start(42)
  for (let i = 0; i < 40; i++) a = autoStep(a)
  const saved = JSON.parse(JSON.stringify(a)) as RunState
  assert.deepEqual(saved, a)
  let b = saved
  for (let i = 0; i < 40; i++) {
    a = autoStep(a)
    b = autoStep(b)
  }
  // endedAt is wall-clock (the two copies can end a millisecond apart); everything else must match.
  assert.deepEqual({ ...b, endedAt: a.endedAt }, a)
})

test('abandonRun ends the run; ended runs ignore actions', () => {
  const run = abandonRun(atMap())
  assert.deepEqual(run.screen, { kind: 'ended', result: 'defeat', endingId: 'ending_forced_erasure' })
  assert.equal(abandonRun(run), run)
  assert.equal(discardConsumable(run, 0, C), run)
  const p = applyRunEnd(P0, run, C)
  assert.equal(p.history[0]?.result, 'abandoned')
})

test('final boss goes straight to the ending choice; boss wins raise surviving bonds', () => {
  let run = start(7, unlocked('comp_tae_o'))
  let finalBossSeen = false
  for (let steps = 0; run.screen.kind !== 'ended' && steps < 600; steps++) {
    const before = run.screen
    const bondsBefore = run.party.map((m) => m.bond)
    const next = autoStep(run)
    if (before.kind === 'combat' && before.nodeKind === 'boss' && next.screen.kind !== 'combat') {
      if (run.act === 3) {
        finalBossSeen = true
        assert.equal(next.screen.kind, 'final_choice', 'no loot screen after the final boss')
      } else {
        assert.equal(next.screen.kind, 'reward')
      }
      const survivors = before.combat.units.filter((u) => u.side === 'party' && u.uid !== 'connector' && u.hp > 0)
      // autoStep may resolve the fight itself; compare against the party as it stood before the step.
      for (const [i, m] of run.party.entries()) {
        const after = next.party.find((p) => p.id === m.id)
        if (after && survivors.some((u) => u.uid === m.id)) assert.ok(after.bond >= Math.min(3, (bondsBefore[i] ?? 0) + 1), `${m.id} bond`)
      }
    }
    run = next
  }
  assert.ok(finalBossSeen)
})

test('Condition.companions requires every listed companion', () => {
  const run = start(3)
  const has = run.party.map((m) => m.id)
  assert.ok(conditionMet(run, { companions: has }, C).ok)
  const missing = conditionMet(run, { companions: [...has, 'comp_missing'] }, C)
  assert.equal(missing.ok, false)
})
