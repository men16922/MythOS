// Every piece of 2.0 content has its generated art / music in the manifests (ui/common/artManifest.ts). The legacy
// `icon` / `image` / BGM fallbacks in content and audio.ts point at 1.x files that were pruned when 1.x was
// archived (branch `1.0`), so a missing manifest entry would show a broken image — regenerate with
// scripts/v2_assets (gen_images.py / gen_music.py, then build_manifest.py) instead of relying on a fallback.
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONTENT as C } from './index.ts'
import { ART, CARD_ART, CONSUMABLE_ART, IMPLANT_ART, MUSIC } from '../ui/common/artManifest.ts'

const missing = (ids: string[], have: Record<string, string>) => ids.filter((id) => !have[id])

test('every card, implant and consumable has generated art', () => {
  assert.deepEqual(missing(Object.keys(C.cards), CARD_ART), [])
  assert.deepEqual(missing(Object.keys(C.implants), IMPLANT_ART), [])
  assert.deepEqual(missing(Object.keys(C.consumables), CONSUMABLE_ART), [])
})

test('every event, act and ending has generated art', () => {
  assert.deepEqual(missing(Object.keys(C.events), ART.events), [])
  assert.deepEqual(missing(['1', '2', '3'], ART.acts), [])
  assert.deepEqual(missing(Object.keys(C.endings), ART.endings), [])
})

test('every music cue has a generated loop', () => {
  const cues = ['title', 'hub', 'map1', 'map2', 'map3', 'event', 'shop', 'rest', 'combat1', 'combat2', 'combat3', 'elite', 'boss1', 'boss2', 'boss_ix', 'victory', 'defeat', 'ending']
  assert.deepEqual(missing(cues, MUSIC), [])
})

test('screen art referenced by path is on disk (supply cache)', () => {
  const res = join(dirname(fileURLToPath(import.meta.url)), '../../../../../resources/neo-seoul')
  for (const f of ['v2/ui/cache_closed.webp', 'v2/ui/cache_open.webp']) assert.ok(existsSync(join(res, f)), `${f} missing`)
})
