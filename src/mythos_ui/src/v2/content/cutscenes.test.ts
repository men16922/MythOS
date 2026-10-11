// Companion bond cutscenes: complete (every companion has a tier-2 and a tier-3 scene), bilingual, in each
// companion's voice, with art, and recorded idempotently in the profile.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from './index.ts'
import { CUTSCENES, cutsceneAtBond, cutsceneById, cutscenesFor } from './cutscenes.ts'
import { ART } from '../ui/common/artManifest.ts'
import { markCutsceneSeen, migrateProfile, newProfile } from '../engine/meta.ts'

test('every companion has exactly one tier-2 and one tier-3 scene, ids unique, known companions', () => {
  const ids = new Set<string>()
  for (const c of CUTSCENES) {
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`)
    ids.add(c.id)
    assert.ok(C.companions[c.companion], `${c.id}: unknown companion ${c.companion}`)
    assert.ok(c.tier === 2 || c.tier === 3)
    assert.equal(c.image, `v2/cutscenes/${c.id}.webp`)
  }
  for (const id of Object.keys(C.companions)) {
    assert.deepEqual(cutscenesFor(id).map((c) => c.tier), [2, 3], `${id}: needs tiers 2 and 3`)
    assert.equal(cutsceneAtBond(id, 2)?.tier, 2)
    assert.equal(cutsceneAtBond(id, 3)?.tier, 3)
    assert.equal(cutsceneAtBond(id, 1), undefined, 'bond 1 has no scene')
  }
  assert.equal(CUTSCENES.length, Object.keys(C.companions).length * 2)
  assert.equal(cutsceneById('kai_rain_sound')?.companion, 'kai')
})

test('texts: bilingual, a few sentences, no mechanics numbers, titles short', () => {
  for (const c of CUTSCENES) {
    for (const lang of ['ko', 'en'] as const) {
      assert.ok(c.title[lang].trim().length >= 2 && c.title[lang].length <= 40, `${c.id}/${lang} title`)
      const text = c.text[lang]
      assert.ok(text.length >= 120 && text.length <= 520, `${c.id}/${lang}: ${text.length} chars`)
    }
    // Quiet scenes: no HP / credits / game numbers (17 dead pixels and "ten years" are story, not stats).
    assert.ok(!/(HP|₵|크레딧|체력)/.test(c.text.ko), `${c.id}: mechanics words in the text`)
  }
})

test('each companion keeps their speech register in the dialogue', () => {
  const polite = /(요|니다|세요)[.”"?!]/
  const quotes = (ko: string): string[] => [...ko.matchAll(/“([^”]+)”/g)].map((m) => m[1] as string)
  for (const c of CUTSCENES) {
    const said = quotes(c.text.ko)
    assert.ok(said.length >= 1, `${c.id}: no spoken line`)
    if (c.companion === 'kai') {
      assert.ok(said.some((s) => /요|까요|니다/.test(s)), `${c.id}: Kai speaks 해요체`)
    } else {
      for (const s of said) assert.ok(!polite.test(s + '”') && !/(습니다|세요)/.test(s), `${c.id}: ${c.companion} slipped into a polite register: ${s}`)
    }
    if (c.companion === 'tae_o') for (const s of said) assert.ok(/다[.]?$|[.!]$/.test(s.trim()) || s.trim().length < 30, `${c.id}: Tae-o speaks in short declaratives: ${s}`)
  }
})

test('every scene has generated art in the manifest', () => {
  assert.deepEqual(CUTSCENES.filter((c) => !ART.cutscenes[c.id]).map((c) => c.id), [])
})

test('the profile records a seen scene once, survives migration, and old profiles have none', () => {
  const p = newProfile('T')
  assert.deepEqual(p.cutscenes, [])
  const once = markCutsceneSeen(p, 'se_rin_promise')
  assert.deepEqual(once.cutscenes, ['se_rin_promise'])
  assert.equal(markCutsceneSeen(once, 'se_rin_promise'), once, 'idempotent: the same object comes back')
  assert.deepEqual(migrateProfile(JSON.parse(JSON.stringify(once))).cutscenes, ['se_rin_promise'])
  const old = migrateProfile({ version: 2, playerName: 'Old', echoes: 5 }) // saved before cutscenes existed
  assert.deepEqual(old.cutscenes, [])
  assert.deepEqual(migrateProfile({ cutscenes: ['a', 7, '', 'a'] }).cutscenes, ['a'], 'junk is dropped, duplicates collapse')
})
