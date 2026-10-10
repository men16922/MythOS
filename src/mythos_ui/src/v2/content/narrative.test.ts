// Narrative content invariants: events, lore, endings, IX lines, acts, unlocks, paradox.
// Run: cd src/mythos_ui && node --test src/v2/content/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { EventDef, Outcome, RunEffect } from '../engine/types.ts'
import { EVENTS } from './events.ts'
import { LORE } from './lore.ts'
import { ENDINGS } from './endings.ts'
import { IX_LINES } from './ix.ts'
import { ACTS } from './acts.ts'
import { UNLOCKS } from './unlocks.ts'
import { PARADOX } from './paradox.ts'

const RES = new URL('../../../../../resources/neo-seoul/', import.meta.url)
const resExists = (rel: string): boolean => existsSync(fileURLToPath(new URL(rel, RES)))

// Ids the sibling content agent guarantees (see build contract).
const COMPANIONS = ['se_rin', 'tae_o', 'han', 'su_ah', 'kai', 'lin_yue']
const ARCHETYPES = ['ghost', 'smuggler', 'echo_collector']
const JUNK = ['static', 'trace_bug', 'corrupted_echo']
const CONSUMABLES = [
  'nanopatch',
  'emp_grenade',
  'cryo_grenade',
  'incendiary_grenade',
  'stim_shard',
  'overload_stim',
  'restart_core',
  'stealth_cloak',
]
const AMBUSH: Record<number, string> = { 1: 'a1_event_ambush', 2: 'a2_event_ambush', 3: 'a3_event_ambush' }
const CARD_PACKS = ['pack_overclock', 'pack_netrunner', 'pack_bastion']
const IMPLANT_PACKS = ['ipack_black_market', 'ipack_ark_salvage']
/** Effects that open a picker screen; an outcome may contain at most one, and never alongside combat. */
const PICKERS = new Set<RunEffect['kind']>(['card_choice', 'remove_card'])

const RECRUIT_ID = 'a2_recruit'
const OPENING_ID = 'a1_opening'
const SCRIPTED = new Set([RECRUIT_ID, OPENING_ID])

function outcomes(e: EventDef): Outcome[] {
  return e.options.flatMap((o) => (o.failure ? [o.success, o.failure] : [o.success]))
}
function effects(e: EventDef): RunEffect[] {
  return outcomes(e).flatMap((o) => o.effects)
}
function isPicker(fx: RunEffect): boolean {
  return PICKERS.has(fx.kind) || (fx.kind === 'upgrade_card' && !fx.random)
}

/** Walk any value; every object with a `ko` or `en` key must have both as non-empty strings. */
function checkTexts(value: unknown, path: string, bad: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkTexts(v, `${path}[${i}]`, bad))
    return
  }
  if (value === null || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  if ('ko' in obj || 'en' in obj) {
    for (const lang of ['ko', 'en']) {
      const s = obj[lang]
      if (typeof s !== 'string' || s.trim() === '') bad.push(`${path}.${lang}`)
    }
    return
  }
  for (const [k, v] of Object.entries(obj)) checkTexts(v, `${path}.${k}`, bad)
}

test('every Text has both ko and en', () => {
  const bad: string[] = []
  checkTexts(EVENTS, 'EVENTS', bad)
  checkTexts(LORE, 'LORE', bad)
  checkTexts(ENDINGS, 'ENDINGS', bad)
  checkTexts(IX_LINES, 'IX_LINES', bad)
  checkTexts(ACTS, 'ACTS', bad)
  checkTexts(UNLOCKS, 'UNLOCKS', bad)
  checkTexts(PARADOX, 'PARADOX', bad)
  assert.deepEqual(bad, [])
})

test('every image / icon path exists under resources/neo-seoul', () => {
  const paths = [
    ...EVENTS.map((e) => e.image),
    ...ENDINGS.map((e) => e.image),
    ...Object.values(ACTS).map((a) => a.image),
    ...UNLOCKS.flatMap((u) => (u.icon ? [u.icon] : [])),
  ]
  const missing = paths.filter((p) => !resExists(p))
  assert.deepEqual(missing, [])
})

test('act bgm keys exist as audio files', () => {
  for (const a of Object.values(ACTS)) assert.ok(resExists(`audio/bgm_${a.bgm}.wav`), `bgm ${a.bgm}`)
})

test('ids are unique', () => {
  for (const [name, ids] of [
    ['events', EVENTS.map((e) => e.id)],
    ['lore', LORE.map((l) => l.id)],
    ['endings', ENDINGS.map((e) => e.id)],
    ['unlocks', UNLOCKS.map((u) => u.id)],
  ] as const) {
    assert.equal(new Set(ids).size, ids.length, `duplicate ${name} id`)
  }
})

test('quotas', () => {
  for (const act of [1, 2, 3] as const) {
    const n = EVENTS.filter((e) => !SCRIPTED.has(e.id) && e.acts.includes(act)).length
    assert.ok(n >= 8, `act ${act} has ${n} events`)
  }
  assert.ok(EVENTS.length >= 26)
  assert.ok(LORE.length >= 15)
  assert.equal(ENDINGS.length, 4)
  const ixTotal = Object.values(IX_LINES).reduce((s, xs) => s + xs.length, 0)
  assert.ok(ixTotal >= 16, `IX lines ${ixTotal}`)
  for (const [k, xs] of Object.entries(IX_LINES)) assert.ok(xs.length >= 2, `ixLines.${k}`)
  assert.ok(UNLOCKS.length >= 20)
  const kinds = (k: string) => UNLOCKS.filter((u) => u.kind === k)
  assert.equal(kinds('archetype').length, 2)
  assert.equal(kinds('companion').length, 5)
  assert.equal(kinds('card_pack').length, 3)
  assert.equal(kinds('implant_pack').length, 2)
  assert.ok(kinds('thread').length >= 8)
  assert.deepEqual(
    PARADOX.map((p) => p.level),
    [1, 2, 3, 4, 5],
  )
})

test('scripted events: present, never rolled, recruit has one authored option', () => {
  const r = EVENTS.find((e) => e.id === RECRUIT_ID)
  assert.ok(r)
  assert.equal(r.options.length, 1)
  assert.equal(r.weight, 0)
  assert.ok(r.acts.includes(2))
  const o = EVENTS.find((e) => e.id === OPENING_ID)
  assert.ok(o)
  assert.equal(o.weight, 0)
  assert.ok(o.acts.includes(1))
  assert.equal(o.speaker, undefined, 'the starting companion varies by loop')
  assert.equal(o.requires, undefined)
  for (const e of EVENTS) if (!SCRIPTED.has(e.id)) assert.notEqual(e.weight, 0, `${e.id} would never roll`)
})

test('option counts, checks and hints', () => {
  for (const e of EVENTS) {
    const min = e.id === RECRUIT_ID ? 1 : 2
    assert.ok(e.options.length >= min && e.options.length <= 4, `${e.id} has ${e.options.length} options`)
    for (const o of e.options) {
      const where = `${e.id} / ${o.label.en}`
      assert.ok(o.hint, `${where}: hint`)
      assert.ok(o.hint.ko.length <= 30 && o.hint.en.length <= 44, `${where}: hint too long`)
      assert.ok(o.success.effects.length > 0, `${where}: success has no effect (flavour-only)`)
      if (o.check) {
        assert.ok(o.check.dc >= 3 && o.check.dc <= 9, `${where}: dc ${o.check.dc}`)
        assert.ok(o.failure && o.failure.effects.length > 0, `${where}: a check needs a failure that stings`)
      } else {
        assert.equal(o.failure, undefined, `${where}: failure without a check`)
      }
    }
  }
})

test('roughly half the events (or more) use stat checks', () => {
  const rolled = EVENTS.filter((e) => !SCRIPTED.has(e.id))
  const withCheck = rolled.filter((e) => e.options.some((o) => o.check)).length
  assert.ok(withCheck >= rolled.length / 2, `${withCheck}/${rolled.length}`)
})

test('every event keeps at least two options without requirements', () => {
  for (const e of EVENTS) {
    if (e.id === RECRUIT_ID) continue
    const open = e.options.filter((o) => !o.requires).length
    assert.ok(open >= 2, `${e.id}: only ${open} unconditional options`)
  }
})

test('credit costs are gated by minCredits', () => {
  for (const e of EVENTS) {
    for (const o of e.options) {
      for (const out of [o.success]) {
        const spent = out.effects
          .filter((fx): fx is Extract<RunEffect, { kind: 'credits' }> => fx.kind === 'credits' && fx.amount < 0)
          .reduce((s, fx) => s - fx.amount, 0)
        if (spent > 0) {
          assert.ok((o.requires?.minCredits ?? 0) >= spent, `${e.id} / ${o.label.en}: spends ${spent} ₵ ungated`)
        }
      }
    }
  }
})

test('an outcome opens at most one picker and never mixes a picker with combat', () => {
  for (const e of EVENTS) {
    for (const out of outcomes(e)) {
      const pickers = out.effects.filter(isPicker).length
      const fights = out.effects.filter((fx) => fx.kind === 'combat').length
      assert.ok(pickers <= 1, `${e.id}: ${pickers} pickers in one outcome`)
      assert.ok(fights <= 1, `${e.id}: ${fights} fights in one outcome`)
      assert.ok(!(pickers && fights), `${e.id}: picker + combat in one outcome`)
      if (fights) {
        assert.equal(out.effects.at(-1)?.kind, 'combat', `${e.id}: combat must be the last effect`)
      }
    }
  }
})

test('effect references point at known ids', () => {
  const loreIds = new Set(LORE.map((l) => l.id))
  for (const e of EVENTS) {
    if (e.speaker) assert.ok(COMPANIONS.includes(e.speaker), `${e.id}: speaker ${e.speaker}`)
    const conds = [e.requires, ...e.options.map((o) => o.requires)]
    for (const c of conds) {
      if (c?.companion) assert.ok(COMPANIONS.includes(c.companion), `${e.id}: requires ${c.companion}`)
      if (c?.noCompanion) assert.ok(COMPANIONS.includes(c.noCompanion), `${e.id}: noCompanion ${c.noCompanion}`)
    }
    for (const fx of effects(e)) {
      switch (fx.kind) {
        case 'codex':
          assert.ok(loreIds.has(fx.id), `${e.id}: unknown lore ${fx.id}`)
          break
        case 'bond':
        case 'companion':
          assert.ok(COMPANIONS.includes(fx.id), `${e.id}: unknown companion ${fx.id}`)
          break
        case 'junk':
          assert.ok(JUNK.includes(fx.cardId), `${e.id}: unknown junk ${fx.cardId}`)
          break
        case 'consumable':
          if (fx.id) assert.ok(CONSUMABLES.includes(fx.id), `${e.id}: unknown consumable ${fx.id}`)
          break
        case 'combat': {
          const act = e.acts[0]
          assert.ok(act !== undefined && e.acts.length === 1, `${e.id}: combat events belong to one act`)
          assert.equal(fx.encounterId, AMBUSH[act], `${e.id}: wrong ambush for act ${act}`)
          break
        }
        case 'card':
          assert.fail(`${e.id}: events must not reference specific card ids (${fx.cardId})`)
          break
        case 'implant':
          assert.equal(fx.implantId, undefined, `${e.id}: events must not reference specific implant ids`)
          break
        default:
          break
      }
    }
  }
})

test('companion-gated bond options only bond the gating companion', () => {
  for (const e of EVENTS) {
    for (const o of e.options) {
      const gate = o.requires?.companion ?? e.requires?.companion
      const bonds = [o.success, ...(o.failure ? [o.failure] : [])].flatMap((out) =>
        out.effects.filter((fx): fx is Extract<RunEffect, { kind: 'bond' }> => fx.kind === 'bond'),
      )
      for (const b of bonds) assert.equal(b.id, gate, `${e.id} / ${o.label.en}: bond ${b.id} without gating on it`)
    }
  }
})

test('every lore entry is awarded by at least one event', () => {
  const awarded = new Set(
    EVENTS.flatMap(effects).flatMap((fx) => (fx.kind === 'codex' ? [fx.id] : [])),
  )
  const orphans = LORE.map((l) => l.id).filter((id) => !awarded.has(id))
  assert.deepEqual(orphans, [])
})

test('flags read by conditions are set by some event', () => {
  const set = new Set(EVENTS.flatMap(effects).flatMap((fx) => (fx.kind === 'flag' ? [fx.key] : [])))
  for (const e of EVENTS) {
    for (const c of [e.requires, ...e.options.map((o) => o.requires)]) {
      if (c?.flag) assert.ok(set.has(c.flag), `${e.id}: flag ${c.flag} is never set`)
    }
  }
})

test('writing budget: event text ≤ 320 chars (ko), act intro ≤ 400, outcomes short', () => {
  for (const e of EVENTS) {
    assert.ok(e.text.ko.length <= 320, `${e.id}: ${e.text.ko.length} chars`)
    assert.ok(e.gmHints && e.gmHints.length >= 2 && e.gmHints.length <= 4, `${e.id}: gmHints`)
    for (const out of outcomes(e)) assert.ok(out.text.ko.length <= 140, `${e.id}: outcome too long`)
  }
  for (const a of Object.values(ACTS)) assert.ok(a.intro.ko.length <= 400, `act ${a.act} intro`)
})

test('acts are keyed correctly with the planned backdrops', () => {
  assert.equal(ACTS[1].backdrop, 'streets')
  assert.equal(ACTS[2].backdrop, 'undercity')
  assert.equal(ACTS[3].backdrop, 'spire')
  for (const k of [1, 2, 3] as const) assert.equal(ACTS[k].act, k)
})

test('endings: ids, gates and echo bonuses', () => {
  const byId = Object.fromEntries(ENDINGS.map((e) => [e.id, e]))
  const erasure = byId['ending_forced_erasure']
  const sacrifice = byId['ending_noble_sacrifice']
  const refuge = byId['ending_safe_refuge']
  const rewrite = byId['ending_code_rewrite']
  assert.ok(erasure && sacrifice && refuge && rewrite)
  assert.equal(erasure.echoBonus, 0)
  assert.equal(erasure.choice, undefined)
  assert.equal(sacrifice.requires, undefined, 'noble sacrifice is always available')
  for (const v of [sacrifice, refuge, rewrite]) {
    assert.ok(v.choice, `${v.id}: choice label`)
    assert.ok(v.echoBonus >= 30 && v.echoBonus <= 60, `${v.id}: echoBonus`)
    assert.ok(v.echoBonus <= sacrifice.echoBonus, 'noble sacrifice has the biggest bonus')
  }
  assert.ok((refuge.requires?.minBondTotal ?? 0) >= 4)
  assert.ok((rewrite.requires?.minCodex ?? 0) >= 4)
  // A knowledge run must be able to reach the codex gate within one act's events or so.
  const codexEvents = EVENTS.filter((e) => effects(e).some((fx) => fx.kind === 'codex')).length
  assert.ok(codexEvents >= (rewrite.requires?.minCodex ?? 0) * 3)
})

test('unlocks: requires resolve, grants are known, threads have passives, costs in budget', () => {
  const ids = new Set(UNLOCKS.map((u) => u.id))
  for (const u of UNLOCKS) {
    if (u.requires) assert.ok(ids.has(u.requires), `${u.id}: requires ${u.requires}`)
    assert.ok(u.cost >= 15 && u.cost <= 80, `${u.id}: cost ${u.cost}`)
    switch (u.kind) {
      case 'archetype':
        assert.ok(u.grants && ARCHETYPES.includes(u.grants) && u.grants !== 'ghost', u.id)
        break
      case 'companion':
        assert.ok(u.grants && COMPANIONS.includes(u.grants) && u.grants !== 'se_rin', u.id)
        break
      case 'card_pack':
        assert.ok(u.grants && CARD_PACKS.includes(u.grants), u.id)
        break
      case 'implant_pack':
        assert.ok(u.grants && IMPLANT_PACKS.includes(u.grants), u.id)
        break
      case 'thread':
        assert.ok(u.passive && Object.keys(u.passive).length > 0, `${u.id}: thread without passive`)
        if (u.passive.startConsumable) assert.ok(CONSUMABLES.includes(u.passive.startConsumable))
        break
    }
  }
  // Chains terminate (no cycles).
  for (const u of UNLOCKS) {
    const seen = new Set<string>()
    let cur: string | undefined = u.id
    while (cur) {
      assert.ok(!seen.has(cur), `cycle at ${cur}`)
      seen.add(cur)
      cur = UNLOCKS.find((x) => x.id === cur)?.requires
    }
  }
  // Every granted pack / companion / archetype is unlockable exactly once.
  const grants = UNLOCKS.flatMap((u) => (u.grants ? [u.grants] : []))
  assert.equal(new Set(grants).size, grants.length)
})

test('cross-check against the assembled registry (when it loads)', async (t) => {
  let C: import('../engine/types.ts').ContentRegistry
  try {
    C = (await import('./index.ts')).CONTENT
  } catch (err) {
    t.skip(`registry not loadable yet: ${String(err)}`)
    return
  }
  for (const e of EVENTS) {
    for (const fx of effects(e)) {
      if (fx.kind === 'combat') assert.ok(C.encounters[fx.encounterId], `${e.id}: encounter ${fx.encounterId}`)
      if (fx.kind === 'junk') assert.ok(C.cards[fx.cardId], `${e.id}: card ${fx.cardId}`)
      if (fx.kind === 'consumable' && fx.id) assert.ok(C.consumables[fx.id], `${e.id}: consumable ${fx.id}`)
      if (fx.kind === 'bond') assert.ok(C.companions[fx.id], `${e.id}: companion ${fx.id}`)
    }
    if (e.speaker) assert.ok(C.companions[e.speaker], `${e.id}: speaker ${e.speaker}`)
  }
  for (const u of UNLOCKS) {
    if (u.kind === 'archetype' && u.grants) assert.ok(C.archetypes[u.grants], `${u.id}: archetype ${u.grants}`)
    if (u.kind === 'companion' && u.grants) assert.ok(C.companions[u.grants], `${u.id}: companion ${u.grants}`)
    if (u.kind === 'card_pack' && u.grants) {
      const pack = u.grants
      assert.ok(Object.values(C.cards).some((c) => c.pack === pack), `${u.id}: no cards in ${pack}`)
    }
    if (u.kind === 'implant_pack' && u.grants) {
      const pack = u.grants
      assert.ok(Object.values(C.implants).some((i) => i.pack === pack), `${u.id}: no implants in ${pack}`)
    }
  }
})
