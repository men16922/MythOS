// commsLog.earlierChat: a companion remembers what the player told them earlier this run, not the chat in progress.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { earlierChat, logComms, setCommsRun } from './commsLog.ts'

test('earlier lines to this companion only, minus the chat in progress, newest three', () => {
  setCommsRun('run-earlier')
  for (const text of ['one', 'two', 'three', 'four']) logComms({ speaker: 'player', companion: 'se_rin', text, ai: false })
  logComms({ speaker: 'player', companion: 'kai', text: 'to kai', ai: false })
  logComms({ speaker: 'companion', companion: 'se_rin', text: 'her reply', ai: true })
  logComms({ speaker: 'player', companion: 'se_rin', text: 'now', ai: false })
  assert.deepEqual(earlierChat('se_rin', 1), ['two', 'three', 'four'])
  assert.deepEqual(earlierChat('kai', 1), [])
  assert.deepEqual(earlierChat('se_rin', 5), [])
})
