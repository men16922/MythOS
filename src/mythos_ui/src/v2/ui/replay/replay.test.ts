// Daily-run replay: a run played through the recorded `rx` / combat actions replays to the very same state and
// result; an edited, truncated or tampered log does not verify.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from '../../content/index.ts'
import { computeEchoes, dailyResultOf, newProfile } from '../../engine/meta.ts'
import type { RunState } from '../../engine/types.ts'
import { rx } from '../shell/rx.ts'
import { noteCommit, replayLogFor, resetRecorder, type ReplayLog } from './record.ts'
import { replayDaily, sameResult } from './replay.ts'
import { playRecorded } from './selfPlay.ts'

const DAY = '2026-10-18'

const strip = (r: RunState): unknown => ({ ...r, id: '', loop: 0, startedAt: '', endedAt: '' })

test('a recorded daily replays to the identical run and result', () => {
  const run = playRecorded(2, DAY)
  assert.equal(run.screen.kind, 'ended')
  const log = replayLogFor(run.id)
  assert.ok(log, 'the log is complete')
  assert.ok(log.steps.some((s) => s.k === 'combat'), 'combat actions were recorded')
  const out = replayDaily(JSON.parse(JSON.stringify(log)) as ReplayLog, C)
  assert.ok(out.ok, out.ok ? '' : `${out.error} @ ${out.step}`)
  assert.deepEqual(strip(out.run), strip(run))
  const claimed = dailyResultOf(run, computeEchoes(run, C).total)
  assert.ok(sameResult(claimed, out.result))
})

test('a tampered, truncated or broken log does not verify', () => {
  const run = playRecorded(1, DAY)
  const log = replayLogFor(run.id) as ReplayLog
  const claimed = dailyResultOf(run, computeEchoes(run, C).total)
  // truncated: the run never reaches its end
  const cut = replayDaily({ ...log, steps: log.steps.slice(0, -1) }, C)
  assert.equal(cut.ok, false)
  // a claim better than what was played
  const out = replayDaily(log, C)
  assert.ok(out.ok)
  assert.equal(sameResult({ ...claimed, kills: claimed.kills + 5 }, out.result), false)
  // an action name outside the replay table
  assert.equal(replayDaily({ ...log, steps: [{ k: 'run', f: 'newRun', a: [] }, ...log.steps] }, C).ok, false)
  // an untagged edit of the same run (dev hook, bot shortcut) breaks the log
  resetRecorder()
  let prev: RunState | null = null
  const r0 = rx.newRun(newProfile('T'), { archetype: 'ghost', paradox: 0, daily: DAY }, C)
  noteCommit(prev, r0)
  prev = r0
  noteCommit(prev, { ...r0, hp: 999 })
  assert.equal(replayLogFor(r0.id), null)
})

test('only daily runs are recorded', () => {
  resetRecorder()
  const r = rx.newRun(newProfile('T'), { archetype: 'ghost', paradox: 0 }, C)
  noteCommit(null, r)
  assert.equal(replayLogFor(r.id), null)
})
