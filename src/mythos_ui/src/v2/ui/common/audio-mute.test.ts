// `?mute=1` (agent/automated testing) overrides player settings: no audio graph, no sound.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installAudioFakes, log, settle } from './audioFake.test-util.ts'

installAudioFakes('?mute=1')
const audio = await import('./audio.ts')
const { sfx } = await import('./sfx.ts')

test('hard mute ignores settings and the first gesture', async () => {
  assert.equal(audio.isHardMuted(), true)
  audio.configureAudio({ bgm: true, sfx: true })
  audio.playBgm('title')
  audio.unlockAudio()
  sfx('hit_heavy')
  await settle()
  assert.deepEqual(log, [])
})
