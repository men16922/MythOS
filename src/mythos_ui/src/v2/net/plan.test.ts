// net/api.ts Signal+ plan: GET /plan parsing and caching, the offline fallback, and redeeming a Play purchase.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as net from './api.ts'
import { installFakes } from './netFake.test-util.ts'

const PLUS = {
  tier: 'plus',
  signedIn: true,
  accountId: 'g_abc',
  features: ['ai', 'crpg'],
  budget: { limitUsd: 1.5, usedUsd: 0.3, left: 0.8 },
  subscription: { sku: 'signal_plus_monthly', state: 'active', expiresAt: '2026-11-18T03:00:00+00:00' },
  skus: ['signal_plus_monthly'],
}
let planReply: unknown = { ...PLUS, tier: 'free', features: ['ai'], subscription: null }
let offline = false

const fakes = installFakes((call) => {
  if (call.path === '/config') return { status: 200, body: { auth: 'open', firebase: null, leaderboard: true } }
  if (call.path === '/plan') return offline ? 'network' : { status: 200, body: planReply }
  if (call.path === '/plan/play') {
    const token = (call.body as { purchaseToken?: string }).purchaseToken
    return token === 'tok-good-123' ? { status: 200, body: PLUS } : { status: 422, body: { detail: 'purchase not verified' } }
  }
  return { status: 404 }
})

test('free until fetched; GET /plan is parsed, cached and announced', async () => {
  assert.equal(net.currentPlan().tier, 'free')
  assert.equal(net.hasCrpg(), false)
  const seen: string[] = []
  const off = net.onPlan((p) => seen.push(p.tier))
  const plan = await net.loadPlan()
  off()
  assert.equal(plan.tier, 'free')
  assert.deepEqual(plan.features, ['ai'])
  assert.equal(plan.budget.left, 0.8)
  assert.deepEqual(seen, ['free'])
  assert.equal(JSON.parse(fakes.storage.getItem('mythos2.plan') ?? '{}').tier, 'free')
})

test('a rejected purchase changes nothing; a verified one turns on Signal+ and the CRPG layer', async () => {
  assert.deepEqual(await net.redeemPlayPurchase('tok-bad-1234'), { kind: 'rejected' })
  assert.equal(net.hasCrpg(), false)
  const res = await net.redeemPlayPurchase('tok-good-123')
  assert.equal(res.kind, 'ok')
  assert.equal(net.currentPlan().tier, 'plus')
  assert.equal(net.hasCrpg(), true)
})

test('offline keeps the cached plan; malformed replies are ignored', async () => {
  offline = true
  assert.equal((await net.loadPlan()).tier, 'plus')
  offline = false
  planReply = { tier: 'gold' }
  assert.equal((await net.loadPlan()).tier, 'plus')
  assert.equal(net.parsePlan({ tier: 'plus', budget: { left: 7 } })?.budget.left, 1)
})
