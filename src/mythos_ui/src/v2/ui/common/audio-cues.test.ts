// Combat-feel cues (explosions, fire, zaps, slams): each builds a voice through the graph (limiter + soft clip
// included) and every one of them respects the SFX switch.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installAudioFakes, log } from './audioFake.test-util.ts'
import type { SfxName } from './sfx.ts'

installAudioFakes()
const audio = await import('./audio.ts')
const { sfx } = await import('./sfx.ts')

const CUES: SfxName[] = ['explosion', 'shockwave', 'ignite', 'fire_tick', 'extinguish', 'zap', 'wall_slam', 'passive', 'bump', 'push', 'hit_light', 'hit_heavy', 'kill', 'void']

test('every combat cue starts voices when SFX is on', () => {
  audio.configureAudio({ bgm: false, sfx: true })
  audio.unlockAudio()
  for (const name of CUES) {
    log.length = 0
    sfx(name, { intensity: 1.6, pan: 0.4 })
    assert.ok(log.filter((l) => l === 'sfx:start').length > 0, `${name} played nothing`)
  }
})

test('SFX OFF silences the combat cues too', () => {
  audio.configureAudio({ bgm: false, sfx: false })
  log.length = 0
  for (const name of CUES) sfx(name, { intensity: 2 })
  assert.equal(log.filter((l) => l === 'sfx:start').length, 0)
})
