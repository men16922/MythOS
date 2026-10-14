import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AI_LINE_CAP, aiLineReported, markAiLineReported, noteAiLine, recentAiLines, resetAiLines, subscribeAiLines } from './aiLines.ts'

test('newest first, repeats move to the top, capped, blank ignored', () => {
  resetAiLines()
  let changes = 0
  const off = subscribeAiLines(() => changes++)
  noteAiLine({ route: 'narrate', kind: 'event', lang: 'ko', text: 'a' })
  noteAiLine({ route: 'talk', kind: 'companion:se_rin', lang: 'ko', text: ' b ' })
  noteAiLine({ route: 'narrate', kind: 'event', lang: 'ko', text: 'a' })
  noteAiLine({ route: 'narrate', kind: 'event', lang: 'ko', text: '   ' })
  assert.deepEqual(
    recentAiLines().map((l) => l.text),
    ['a', 'b'],
  )
  assert.equal(changes, 3)
  const before = recentAiLines()
  assert.equal(recentAiLines(), before) // stable between changes
  for (let i = 0; i < AI_LINE_CAP + 5; i++) noteAiLine({ route: 'talk', kind: 'ix:boss_start', lang: 'en', text: `l${i}` })
  assert.equal(recentAiLines().length, AI_LINE_CAP)
  assert.equal(recentAiLines()[0]?.text, `l${AI_LINE_CAP + 4}`)
  off()
  resetAiLines()
})

test('a reported line stays reported wherever it is shown, until reset', () => {
  resetAiLines()
  assert.equal(aiLineReported('x'), false)
  markAiLineReported(' x ')
  assert.equal(aiLineReported('x'), true)
  resetAiLines()
  assert.equal(aiLineReported('x'), false)
})
