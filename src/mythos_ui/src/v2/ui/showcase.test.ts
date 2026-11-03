import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../content/index.ts'
import { reachableNodes } from '../engine/run.ts'
import { ixHabitLine } from './common/loopMemory.ts'
import { showcaseKey, showcaseBlocks } from '../net/api.ts'
import { showcaseProfile, showcaseRun } from './showcase.ts'

test('showcase: saves live in their own namespace and never sync; identity and device prefs stay shared', () => {
  assert.equal(showcaseKey('mythos2.profile', true), 'mythos2.showcase.profile')
  assert.equal(showcaseKey('mythos2.run.cleared', true), 'mythos2.showcase.run.cleared')
  assert.equal(showcaseKey('mythos2.playerId', true), 'mythos2.playerId')
  assert.equal(showcaseKey('mythos2.mute', true), 'mythos2.mute')
  assert.equal(showcaseKey('mythos2.profile', false), 'mythos2.profile')
  for (const p of ['/profile', '/run', '/history?limit=5', '/account']) assert.ok(showcaseBlocks(p, true), p)
  for (const p of ['/gm/narrate', '/gm/talk', '/plan', '/health']) assert.ok(!showcaseBlocks(p, true), p)
  assert.ok(!showcaseBlocks('/profile', false))
})

test('showcase: IX names a habit in the Archive; the run opens at Act 3 with a read, a procedural event and a recruit', () => {
  const profile = showcaseProfile(C, 'en')
  assert.ok(ixHabitLine(profile.history, C, 'en'), 'a habit to name')
  assert.equal(profile.loops % 2, 1, 'the authored IX line names it on odd loops')
  const run = showcaseRun(profile, C)
  assert.equal(run.act, 3)
  assert.equal(run.paradox, 10)
  assert.equal(run.mode, 'deep')
  assert.equal(run.ixRead, 'read_push')
  assert.equal(run.screen.kind, 'act_intro')
  const [a, b] = reachableNodes(run)
  assert.equal(run.map.nodes[a as string]?.eventId, 'pc_watcher')
  assert.equal(run.map.nodes[b as string]?.eventId, 'a3_recruit')
})
