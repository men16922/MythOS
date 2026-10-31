// Evolutions and duos must be something a run can find (2026-10-31: 450 standard runs saw two recipes 0 times).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { startCombat } from './combat.ts'
import { newRun, recruitCandidates, resonantCard, resonantImplant, updateCombat } from './run.ts'
import type { RunState } from './types.ts'

const run = (): RunState => newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed: 11 }, C)
const open = Object.values(C.evolutions ?? {}).find((e) => C.cards[e.card]?.rarity !== 'starter')
const starter = Object.values(C.evolutions ?? {}).find((e) => C.cards[e.card]?.rarity === 'starter')

test('a card resonates only while its recipe implant is held and the recipe is open', () => {
  assert.ok(open)
  const r = run()
  assert.equal(resonantCard(r, C, open.card), false)
  r.implants.push(open.implant)
  assert.equal(resonantCard(r, C, open.card), true)
  r.evolved = [open.id]
  assert.equal(resonantCard(r, C, open.card), false)
})

test('an implant resonates when its recipe card is in the deck; starter recipes get no pull', () => {
  assert.ok(open && starter)
  const r = run()
  assert.equal(resonantImplant(r, C, open.implant), false)
  r.deck.push({ uid: 'x', defId: open.card, upgraded: false })
  assert.equal(resonantImplant(r, C, open.implant), true)
  assert.equal(resonantImplant(r, C, starter.implant), false)
})

test('a recruit scene seats a duo partner of the crew whenever one is available', () => {
  for (let seed = 0; seed < 60; seed++) {
    const r = newRun(newProfile('t'), { archetype: 'ghost', paradox: 0, seed, companion: 'se_rin' }, C)
    r.act = 2
    r.pools.companions = Object.keys(C.companions)
    const crew = [...r.party, ...(r.bench ?? [])].map((m) => m.id)
    const partners = Object.values(C.duos ?? {}).flatMap((d) => (d.pair.some((id) => crew.includes(id)) ? d.pair : [])).filter((id) => !crew.includes(id))
    assert.ok(partners.length > 0)
    assert.ok(recruitCandidates(r, C).some((id) => partners.includes(id)), `seed ${seed}`)
  }
})

test('the reward names the neutral a met protect bonus kept alive, and nobody when it failed', () => {
  const won = (failed: boolean) => {
    const r = run()
    const combat = startCombat(r, 'a1_n2_cargo', C)
    combat.phase = 'won'
    if (combat.bonus) combat.bonus.failed = failed
    r.screen = { kind: 'combat', combat, nodeKind: 'combat' }
    const next = updateCombat(r, combat, C)
    assert.equal(next.screen.kind, 'reward')
    return next.screen.kind === 'reward' ? next.screen.reward : undefined
  }
  assert.equal(won(false)?.saved?.en, "Se-rin's Cargo Drone")
  assert.equal(won(true)?.saved, undefined)
})

test('Acts 4-6 hold protect and survive fights, and none needs new art', () => {
  const late = Object.values(C.encounters).filter((e) => e.act >= 4)
  assert.equal(late.filter((e) => e.bonus?.kind === 'protect' && e.neutral).length, 2)
  assert.equal(late.filter((e) => e.objective?.kind === 'survive').length, 2)
})
