import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companionReply, improvise, ixLine, narrate, narrateLine, setAiEnabled } from './gm.ts'

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

test('narrateLine keeps provenance: a model line is ai, a server fallback / no backend is not', async () => {
  const g = globalThis as unknown as { window?: unknown }
  const hadWindow = 'window' in g
  if (!hadWindow) g.window = globalThis
  const realFetch = globalThis.fetch
  const reply = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch
  try {
    setAiEnabled(true)
    globalThis.fetch = reply({ text: '네온이 젖은 골목을 핥는다.', source: 'llm' })
    assert.deepEqual(await narrateLine('act_intro', 'ko', { act: 1, loop: 1 }, 300), { text: '네온이 젖은 골목을 핥는다.', ai: true })
    globalThis.fetch = reply({ text: '서버 기본 문장.', source: 'fallback' })
    const local = await narrateLine('act_intro', 'ko', { act: 1, loop: 1 }, 300)
    assert.equal(local?.ai, false, 'server fallback → local narration, not marked AI')
    assert.notEqual(local?.text, '서버 기본 문장.')
    globalThis.fetch = (async () => {
      throw new Error('offline')
    }) as typeof fetch
    assert.equal((await narrateLine('act_intro', 'ko', { act: 1, loop: 1 }, 300))?.ai, false)
    assert.equal(typeof (await narrate('act_intro', 'ko', { act: 1, loop: 1 }, 300)), 'string', 'narrate still returns the text')
  } finally {
    globalThis.fetch = realFetch
    if (!hadWindow) delete g.window
  }
})
