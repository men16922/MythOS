import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aiCalls, CALL_CAP, hudRequested, recordAiCall, resetAiCalls, summarize } from './telemetry.ts'

test('telemetry: newest first, capped, median of model-line latency only', () => {
  resetAiCalls()
  recordAiCall({ route: 'narrate', kind: 'event', outcome: 'llm', ms: 900 })
  recordAiCall({ route: 'talk', kind: 'ix:boss_start', outcome: 'local', ms: 5500 })
  recordAiCall({ route: 'narrate', kind: 'act_intro', outcome: 'llm', ms: 1500.4 })
  assert.equal(aiCalls()[0]?.kind, 'act_intro')
  assert.equal(aiCalls()[0]?.ms, 1500)
  assert.deepEqual(summarize(aiCalls()), { total: 3, llm: 2, medianLlmMs: 1200 })
  for (let i = 0; i < CALL_CAP + 5; i++) recordAiCall({ route: 'talk', kind: 'x', outcome: 'off', ms: 0 })
  assert.equal(aiCalls().length, CALL_CAP)
  assert.equal(summarize([]).medianLlmMs, null)
  resetAiCalls()
})

test('hudRequested: only ?hud=1', () => {
  assert.equal(hudRequested('?hud=1&mute=1'), true)
  assert.equal(hudRequested('?hud=0'), false)
  assert.equal(hudRequested(''), false)
})
