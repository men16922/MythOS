import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPushConsent } from './pushConsent.ts'

function fixture(on = false, granted = true) {
  const calls: string[] = []
  const state = { on, registered: false, failDelete: false, failSubscribe: false }
  const d = {
    read: () => state.on,
    write: (v: boolean) => { state.on = v },
    permission: async (request: boolean) => { calls.push(`permission:${request}`); return granted },
    registration: async (v: boolean) => {
      calls.push(`registration:${v}`)
      state.registered = v
      if (!v && state.failDelete) throw Error('offline deletion')
    },
    channel: async (lang: string) => { calls.push(`channel:${lang}`) },
    subscribe: async (topic: string) => { calls.push(`subscribe:${topic}`); if (state.failSubscribe) throw Error('offline subscribe') },
    unsubscribe: async (topic: string) => { calls.push(`unsubscribe:${topic}`) },
  }
  return { calls, state, d, control: createPushConsent(d) }
}

test('fresh launch reconciles off without permission prompt or topic/token creation', async () => {
  const f = fixture()
  await f.control.syncLang('ko')
  assert.deepEqual(f.calls, ['registration:false'])
  assert.equal(f.control.enabled(), false)
})
test('denied permission never enables registration', async () => {
  const f = fixture(false, false)
  assert.equal(await f.control.set(true, 'ko'), 'denied')
  assert.deepEqual(f.calls, ['permission:true', 'registration:false'])
  assert.equal(f.state.registered, false)
})
test('enable orders permission before registration, then off deletes without new topic requests', async () => {
  const f = fixture()
  assert.equal(await f.control.set(true, 'en'), 'on')
  assert.deepEqual(f.calls, ['permission:true', 'channel:en', 'registration:true', 'subscribe:daily-en', 'unsubscribe:daily-ko'])
  f.calls.length = 0
  assert.equal(await f.control.set(false, 'en'), 'off')
  assert.deepEqual(f.calls, ['registration:false'])
  assert.equal(f.control.enabled(), false)
})
test('restart/language sync checks existing permission without prompting and restores the chosen topic', async () => {
  const f = fixture(true)
  await f.control.syncLang('ko')
  assert.deepEqual(f.calls, ['permission:false', 'channel:ko', 'registration:true', 'subscribe:daily-ko', 'unsubscribe:daily-en'])
  assert.equal(f.control.enabled(), true)
})
test('revoked OS permission reconciles a previously enabled preference to off', async () => {
  const f = fixture(true, false)
  await f.control.syncLang('ko')
  assert.deepEqual(f.calls, ['permission:false', 'registration:false'])
  assert.equal(f.control.enabled(), false)
})
test('failed subscription removes registration instead of leaving half-enabled consent', async () => {
  const f = fixture()
  f.state.failSubscribe = true
  assert.equal(await f.control.set(true, 'ko'), 'unavailable')
  assert.equal(f.calls.at(-1), 'registration:false')
  assert.equal(f.control.enabled(), false)
  assert.equal(f.state.registered, false)
})
test('failed deletion preserves off and retries on next launch without claiming success', async () => {
  const f = fixture(true)
  f.state.failDelete = true
  assert.equal(await f.control.set(false, 'ko'), 'unavailable')
  assert.equal(f.control.enabled(), false)
  f.state.failDelete = false
  await f.control.syncLang('ko')
  assert.equal(f.calls.at(-1), 'registration:false')
})
test('late permission grant cannot enable after the player turns alerts off', async () => {
  const f = fixture()
  let release!: (granted: boolean) => void
  f.d.permission = () => new Promise<boolean>((resolve) => { release = resolve })
  const enabling = f.control.set(true, 'en')
  while (!release) await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(await f.control.set(false, 'en'), 'off')
  release(true)
  await enabling
  assert.ok(!f.calls.includes('registration:true'))
  assert.equal(f.control.enabled(), false)
})

test('off disables registration even while a language subscription is waiting for the network', async () => {
  const f = fixture(true)
  let release!: () => void
  f.d.subscribe = () => new Promise<void>((resolve) => { release = resolve })
  const change = f.control.syncLang('en')
  while (!release) await new Promise<void>((resolve) => setImmediate(resolve))
  const off = f.control.set(false, 'en')
  await new Promise<void>((resolve) => setImmediate(resolve))
  try {
    assert.equal(f.state.registered, false)
    assert.equal(f.control.enabled(), false)
  } finally {
    release()
    await change
    await off
  }
  assert.equal(f.state.registered, false)
  assert.ok(!f.calls.includes('unsubscribe:daily-ko'), 'stale work must not enqueue more topics')
})

test('a new enable waits for cleanup from an older topic request', async () => {
  const f = fixture(true)
  let finishTopic!: () => void
  let finishCleanup!: () => void
  let deletes = 0
  f.d.subscribe = () => new Promise<void>((resolve) => { finishTopic = resolve })
  const registration = f.d.registration
  f.d.registration = async (on) => {
    await registration(on)
    if (!on && ++deletes === 2) await new Promise<void>((resolve) => { finishCleanup = resolve })
  }
  const old = f.control.syncLang('en')
  while (!finishTopic) await new Promise<void>((resolve) => setImmediate(resolve))
  await f.control.set(false, 'en')
  finishTopic()
  while (!finishCleanup) await new Promise<void>((resolve) => setImmediate(resolve))
  f.d.subscribe = async () => undefined
  const enabling = f.control.set(true, 'ko')
  await new Promise<void>((resolve) => setImmediate(resolve))
  try {
    assert.equal(f.state.registered, false, 'new registration must wait for old deletion')
  } finally {
    finishCleanup()
    await old
    await enabling
  }
  assert.equal(f.state.registered, true)
  assert.equal(f.control.enabled(), true)
})
