import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COMMS_CAP, commsEntries, logComms, resetComms, setCommsRun, subscribeComms, swapComms } from './commsLog.ts'

test('nothing is logged without a run; a new run id starts a fresh log', () => {
  resetComms()
  assert.equal(logComms({ speaker: 'gm', text: 'lost', ai: true }), null)
  setCommsRun('run-a')
  logComms({ speaker: 'gm', text: 'a1', ai: true, act: 1 })
  assert.deepEqual(
    commsEntries().map((e) => e.text),
    ['a1'],
  )
  setCommsRun('run-b')
  assert.equal(commsEntries().length, 0)
  resetComms()
})

test('oldest first, blank and back-to-back repeats ignored, capped', () => {
  resetComms()
  setCommsRun('run-a')
  let changes = 0
  const off = subscribeComms(() => changes++)
  const first = logComms({ speaker: 'companion', companion: 'se_rin', text: ' hi ', ai: false })
  assert.equal(logComms({ speaker: 'companion', companion: 'se_rin', text: 'hi', ai: false }), first)
  logComms({ speaker: 'player', companion: 'se_rin', text: 'hi', ai: false })
  logComms({ speaker: 'ix', text: '   ', ai: false })
  assert.deepEqual(
    commsEntries().map((e) => `${e.speaker}:${e.text}`),
    ['companion:hi', 'player:hi'],
  )
  assert.equal(changes, 2)
  const before = commsEntries()
  assert.equal(commsEntries(), before) // stable between changes
  for (let i = 0; i < COMMS_CAP + 5; i++) logComms({ speaker: 'gm', text: `l${i}`, ai: true })
  assert.equal(commsEntries().length, COMMS_CAP)
  assert.equal(commsEntries()[COMMS_CAP - 1]?.text, `l${COMMS_CAP + 4}`)
  off()
  resetComms()
})

test('an AI line swapped in replaces the authored line in place', () => {
  resetComms()
  setCommsRun('run-a')
  const id = logComms({ speaker: 'ix', text: 'authored', ai: false })
  logComms({ speaker: 'gm', text: 'next', ai: true })
  swapComms(id, { text: 'from the model', ai: true, report: { route: 'talk', kind: 'ix:boss_start' } })
  swapComms(null, { text: 'ignored', ai: true })
  const [ix, gm] = commsEntries()
  assert.equal(ix?.text, 'from the model')
  assert.equal(ix?.ai, true)
  assert.equal(ix?.report?.kind, 'ix:boss_start')
  assert.equal(gm?.text, 'next')
  resetComms()
})
