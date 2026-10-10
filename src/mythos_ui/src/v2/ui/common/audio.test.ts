// Sound settings must take effect immediately in both directions (owner check, 2026-10-11).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installAudioFakes, log, settle } from './audioFake.test-util.ts'

installAudioFakes()
const audio = await import('./audio.ts')
const { sfx } = await import('./sfx.ts')

const count = (kind: string) => log.filter((l) => l === kind).length

test('nothing plays before the first gesture; music starts on unlock', async () => {
  audio.configureAudio({ bgm: true, sfx: true })
  audio.playBgm('hub')
  sfx('ui_click')
  await settle()
  assert.equal(log.length, 0)
  audio.unlockAudio()
  await settle()
  assert.equal(count('music:start'), 1)
})

test('music OFF stops the track and keeps it off across track changes; ON resumes the wanted track', async () => {
  log.length = 0
  audio.configureAudio({ bgm: false, sfx: true })
  assert.equal(count('music:stop'), 1)
  audio.playBgm('map1')
  await settle()
  assert.equal(count('music:start'), 0, 'no music while BGM is off')
  audio.configureAudio({ bgm: true, sfx: true })
  await settle()
  assert.equal(count('music:start'), 1, 'turning BGM back on starts the current screen track')
})

test('SFX OFF silences every cue; ON brings them back', async () => {
  log.length = 0
  audio.configureAudio({ bgm: true, sfx: false })
  sfx('hit_heavy', { intensity: 1.5 })
  sfx('card_play')
  assert.equal(count('sfx:start'), 0)
  audio.configureAudio({ bgm: true, sfx: true })
  sfx('hit_light')
  assert.ok(count('sfx:start') > 0)
})
