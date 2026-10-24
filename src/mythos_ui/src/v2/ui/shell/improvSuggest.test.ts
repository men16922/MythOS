import assert from 'node:assert/strict'
import { test } from 'node:test'
import { improvise, setAiEnabled } from './gm.ts'
import { ALL_IDEAS, improvSuggestions } from './improvSuggest.ts'

const stats = { str: 1, agi: 3, int: 4, cha: 2, obs: 2 }

test('improv ideas: highest stats first, stable per event, three distinct stats', () => {
  const a = improvSuggestions('a1_rain_market', stats, 'ko')
  assert.equal(a.length, 3)
  assert.deepEqual(a.slice(0, 2).map((i) => i.stat), ['int', 'agi'])
  assert.equal(new Set(a.map((i) => i.stat)).size, 3)
  assert.deepEqual(improvSuggestions('a1_rain_market', stats, 'ko'), a)
  assert.ok(improvSuggestions('a1_rain_market', stats, 'en').every((i) => /^[A-Z]/.test(i.text)))
})

test('every idea reads as its own stat to the local judge (the chip never lies about the check)', async () => {
  setAiEnabled(false)
  try {
    for (const { stat, phrase } of ALL_IDEAS) {
      for (const lang of ['ko', 'en'] as const) {
        const action = phrase[lang]
        const { imp } = await improvise({ lang, event: { title: 't', text: 'x' }, action, stats, act: 1 })
        assert.equal(imp.stat, stat, `${lang}: "${action}"`)
      }
    }
  } finally {
    setAiEnabled(true)
  }
})
