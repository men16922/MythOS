import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newProfile } from './meta.ts'
import { simulateRun } from './runSim.ts'
import { FIXTURE as C } from './run.fixture.test.ts'

test('runSim plays whole fixture runs headless, deterministically', () => {
  for (const policy of ['greedy', 'basic'] as const) {
    for (let seed = 1; seed <= 8; seed++) {
      const r = simulateRun(seed, 'ghost', C, policy)
      assert.ok(r.act >= 1 && r.act <= 3)
      assert.ok(r.floors >= 1)
      if (r.won) {
        assert.equal(r.act, 3)
        assert.ok(r.hp >= 1)
        assert.equal(r.killedBy, undefined)
      } else {
        assert.equal(r.hp, 0)
        assert.ok(r.killedBy && C.encounters[r.killedBy], 'defeats name the encounter')
      }
      assert.deepEqual(simulateRun(seed, 'ghost', C, policy), r, 'same seed → same result')
      assert.deepEqual(
        simulateRun(seed, 'ghost', C, policy, { profile: { ...newProfile('sim'), loops: 1 } }),
        r,
        'loops: 1 with no unlocks/deaths plays identically to loop 1 (starts with Se-rin unless companion: null)',
      )
    }
  }
})

test('runSim honours paradox and archetype options', () => {
  const r = simulateRun(3, 'smuggler', C, 'greedy', { paradox: 5 })
  assert.ok(r.floors >= 1)
})
