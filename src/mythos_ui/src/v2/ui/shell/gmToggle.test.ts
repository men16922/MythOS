import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companionReply, improvise, ixLine, narrate, setAiEnabled } from './gm.ts'

test('AI lines off: no model call is made and every caller gets its authored path', async () => {
  let calls = 0
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    calls++
    throw new Error('network must not be touched')
  }) as typeof fetch
  try {
    setAiEnabled(false)
    assert.equal(await narrate('event', 'ko', { title: 'x' }), null)
    assert.equal(await ixLine('boss_start', 'ko', {}), null)
    const reply = await companionReply({ lang: 'ko', companion: 'se_rin', message: '괜찮아?', history: [], context: {} })
    assert.equal(reply.source, 'local')
    assert.ok(reply.text.length > 0)
    const judged = await improvise({ lang: 'ko', event: { title: 't', text: 'x' }, action: '단말기를 해킹한다', stats: { str: 1, agi: 1, int: 3, cha: 1, obs: 1 }, act: 1 })
    assert.equal(judged.ai, false)
    assert.equal(judged.imp.stat, 'int', 'the local keyword judge still reads the action')
    assert.equal(calls, 0)
  } finally {
    setAiEnabled(true)
    globalThis.fetch = realFetch
  }
})
