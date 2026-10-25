// Companion recruit scenes (CRPG C+10) and the choice axes (C+5).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONTENT as C } from '../content/index.ts'
import { newProfile } from './meta.ts'
import { addAxis, intentAxis, newRun, resolveIntro } from './run.ts'
import type { FirstImpression } from './types.ts'

const NOW = '2026-10-26T00:00:00.000Z'
const RES = join(dirname(fileURLToPath(import.meta.url)), '../../../../../resources/neo-seoul')

test('every companion has a recruit scene: bio, 3 traits, 4–6 beats, one choice per tone, reunion lines, art on disk', () => {
  const tones = new Set<FirstImpression>()
  for (const id of Object.keys(C.companions)) {
    const intro = C.intros?.[id]
    assert.ok(intro, `${id}: no intro`)
    assert.ok(intro.bio.ko && intro.bio.en, `${id}: bio`)
    assert.equal(intro.traits.length, 3, `${id}: traits`)
    assert.ok(intro.beats.length >= 4 && intro.beats.length <= 6, `${id}: beats`)
    assert.ok(intro.beats.some((b) => b.who === 'connector'), `${id}: the connector speaks`)
    assert.deepEqual(intro.choices.map((c) => c.tone).sort(), ['guard', 'trust', 'wit'], `${id}: one choice per tone`)
    for (const c of intro.choices) assert.ok(c.label.ko && c.label.en && c.reply.ko && c.reply.en, `${id}: choice text`)
    assert.ok(intro.reunion.length >= 2, `${id}: reunion lines`)
    assert.ok(existsSync(join(RES, intro.image)), `${id}: ${intro.image} missing`)
    tones.add(intro.likesTone)
  }
  assert.equal(tones.size, 3, 'companions warm to different tones')
})

test('joining queues the recruit scene; the liked tone gives +1 bond (normal runs only) and leans an axis', () => {
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 7, now: NOW }, C)
  const id = run.introQueue?.[0]
  assert.ok(id, 'the first companion is queued at run start')
  const liked = C.intros![id]!.likesTone
  const bond0 = run.party.find((m) => m.id === id)!.bond
  const after = resolveIntro(run, C, liked)
  assert.equal(after.introQueue, undefined)
  assert.equal(after.party.find((m) => m.id === id)!.bond, bond0 + 1)
  assert.ok(Object.values(after.axes ?? {}).some((v) => v > 0))
  const other = (['trust', 'guard', 'wit'] as const).find((t) => t !== liked)!
  assert.equal(resolveIntro(run, C, other).party.find((m) => m.id === id)!.bond, bond0)
  assert.equal(resolveIntro(run, C, null).party.find((m) => m.id === id)!.bond, bond0, 'a reunion changes nothing')

  const daily = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 7, now: NOW, daily: '2026-10-26' }, C)
  const did = daily.introQueue?.[0]
  if (did) {
    const b = daily.party.find((m) => m.id === did)!.bond
    assert.equal(resolveIntro(daily, C, C.intros![did]!.likesTone).party.find((m) => m.id === did)!.bond, b, 'no bond on a daily')
  }
})

test('axes: dialogue intents map to axes and accumulate', () => {
  assert.equal(intentAxis('persuade'), 'humanity')
  assert.equal(intentAxis('intimidate'), 'dominance')
  assert.equal(intentAxis('insight'), 'insight')
  assert.equal(intentAxis('leave'), undefined)
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 1, now: NOW }, C)
  addAxis(run, 'humanity')
  addAxis(run, 'humanity', 2)
  assert.equal(run.axes?.humanity, 3)
})

test('reputation (C+4): warm intents raise a faction, threats lower it; ±3 is a tier', async () => {
  const { repTier } = await import('./crpg.ts')
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 3, now: NOW, crpg: { background: null } }, C)
  assert.ok(run.crpg)
  assert.equal(repTier(run, 'market'), 0)
  run.crpg!.rep = { market: 3, grid: -3 }
  assert.equal(repTier(run, 'market'), 1)
  assert.equal(repTier(run, 'grid'), -1)
  for (const n of Object.values(C.crpg!.npcs)) assert.ok(n.faction, `${n.id} speaks for a faction`)
})

test('C+8: reputation reacts in fights — off-grid backup at bosses, grid patrols look away at elites', async () => {
  const { takeCombatMods, applyCombatMods } = await import('./crpg.ts')
  const run = newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, seed: 5, now: NOW, crpg: { background: null } }, C)
  run.crpg!.rep = { offgrid: 3, grid: 3 }
  assert.deepEqual(takeCombatMods(run, true, C), ['backup'])
  assert.deepEqual(takeCombatMods(run, false, C, true), ['surprise'])
  assert.deepEqual(takeCombatMods(run, false, C, false), [])
  const { startCombat } = await import('./combat.ts')
  const c = startCombat(run, 'a1_n1_cover', C)
  applyCombatMods(c, ['surprise', 'backup'])
  assert.ok(c.units.filter((u) => u.side === 'enemy').every((u) => (u.statuses.shock ?? 0) >= 1))
  assert.ok(c.units.filter((u) => u.side === 'party').every((u) => (u.statuses.guard ?? 0) >= 2))
})
