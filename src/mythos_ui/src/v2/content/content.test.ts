// Content integrity: ids resolve, quotas hold, boards are legal, numbers are sane, art exists, text is bilingual.
// Run: node --test src/v2/content/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { V2_SPRITES } from '../ui/common/spriteManifest.ts'
import { fileURLToPath } from 'node:url'
import { GRID_H, GRID_W } from '../engine/types.ts'
import type { Effect, EncounterDef, Pos, RunEffect, Condition } from '../engine/types.ts'
import { CONTENT, CARDS, CONSUMABLES, ENEMIES, ENCOUNTERS, IMPLANTS, COMPANIONS, ARCHETYPES } from './index.ts'
import { EVENTS, UNLOCKS, ENDINGS, ACTS, LORE } from './index.ts'
import { EVENT_FIGHTS } from './encounters.ts'

const RES = fileURLToPath(new URL('../../../../../resources/neo-seoul/', import.meta.url))
const exists = (rel: string): boolean => existsSync(RES + rel)

const C = CONTENT
const key = (p: Pos): string => `${p.x},${p.y}`
const inBounds = (p: Pos): boolean => p.x >= 0 && p.y >= 0 && p.x < GRID_W && p.y < GRID_H

// ------------------------------------------------------------------ ids

test('ids are unique per collection', () => {
  for (const [name, arr] of [
    ['cards', CARDS],
    ['consumables', CONSUMABLES],
    ['enemies', ENEMIES],
    ['encounters', ENCOUNTERS],
    ['implants', IMPLANTS],
    ['companions', COMPANIONS],
    ['archetypes', ARCHETYPES],
  ] as const) {
    const ids = arr.map((x) => x.id)
    assert.equal(new Set(ids).size, ids.length, `duplicate id in ${name}`)
  }
})

test('fixed ids other modules depend on exist', () => {
  for (const id of ['ghost', 'smuggler', 'echo_collector']) assert.ok(C.archetypes[id], id)
  assert.equal(C.archetypes.ghost?.startUnlocked, true)
  // 2.0 Connector sprites (v2/sprites/<archetype>-<pose>.webp, generated) — one per archetype.
  for (const a of ARCHETYPES) assert.ok(exists(`v2/sprites/${a.sprite}-idle.webp`), `${a.id} sprite`)
  const comps: Record<string, string> = { se_rin: 'se-rin', tae_o: 'tae-o', han: 'han', su_ah: 'su-ah', kai: 'kai', lin_yue: 'lin-yue' }
  for (const [id, sprite] of Object.entries(comps)) {
    const c = C.companions[id]
    assert.ok(c, id)
    assert.equal(c.sprite, sprite)
    assert.equal(c.portrait, `characters/${sprite}.png`)
  }
  assert.equal(C.companions.se_rin?.startUnlocked, true)
  assert.ok(C.enemies.purge_drone)
  for (const id of ['static', 'trace_bug', 'corrupted_echo']) {
    const c = C.cards[id]
    assert.ok(c, id)
    assert.equal(c.type, 'junk')
    assert.equal(c.cost, -1)
    assert.equal(c.rarity, 'special')
  }
  for (const id of ['nanopatch', 'emp_grenade', 'cryo_grenade', 'incendiary_grenade', 'stim_shard', 'overload_stim', 'restart_core', 'stealth_cloak']) {
    assert.ok(C.consumables[id], id)
    assert.equal(C.consumables[id]?.icon, `items/${id}.png`)
  }
  for (const id of ['a1_event_ambush', 'a2_event_ambush', 'a3_event_ambush', 'a1_boss_haetae', 'a2_boss_echo_eater', 'a3_boss_ix']) {
    assert.ok(C.encounters[id], id)
  }
  for (const pack of ['pack_overclock', 'pack_netrunner', 'pack_bastion']) {
    const n = CARDS.filter((c) => c.pack === pack).length
    assert.ok(n >= 5 && n <= 6, `${pack} has ${n} cards`)
  }
  for (const pack of ['ipack_black_market', 'ipack_ark_salvage']) {
    assert.equal(IMPLANTS.filter((i) => i.pack === pack).length, 4, pack)
  }
})

test('archetypes and companions reference real cards/implants', () => {
  for (const a of ARCHETYPES) {
    assert.equal(a.startingDeck.length, 10, a.id)
    for (const id of a.startingDeck) {
      const card = C.cards[id]
      assert.ok(card, `${a.id} deck: ${id}`)
      assert.ok(!card.archetype || card.archetype === a.id, `${a.id} deck holds another archetype's card ${id}`)
    }
    const exclusive = new Set(a.startingDeck.filter((id) => C.cards[id]?.archetype === a.id))
    assert.ok(exclusive.size >= 2 && exclusive.size <= 3, `${a.id} has ${exclusive.size} exclusive starters`)
    const imp = C.implants[a.startingImplant]
    assert.ok(imp, a.startingImplant)
    assert.equal(imp.rarity, 'starter')
    // 34/32/36 since 2026-10-24 (owner: "주인공 체력이 너무 많음"; mixed-bot win 44 → 32 %).
    assert.ok(a.maxHp >= 30 && a.maxHp <= 38, `${a.id} hp`)
    assert.ok(a.startingCredits >= 60 && a.startingCredits <= 99, `${a.id} credits`)
    const sum = Object.values(a.stats).reduce((s, v) => s + v, 0)
    assert.ok(sum >= 18 && sum <= 22, `${a.id} stat sum ${sum}`)
    for (const v of Object.values(a.stats)) assert.ok(v >= 1 && v <= 10)
  }
  for (const comp of COMPANIONS) {
    assert.equal(comp.cards.length, 2, comp.id)
    assert.equal(comp.bondCards.length, 1, comp.id)
    for (const id of [...comp.cards, ...comp.bondCards]) {
      assert.equal(C.cards[id]?.owner, comp.id, `${comp.id} card ${id}`)
    }
    assert.ok(comp.maxHp >= 18 && comp.maxHp <= 24, `${comp.id} hp`)
    assert.ok(comp.bondLines.length === 3 && comp.barks.length >= 3, comp.id)
  }
})

// ------------------------------------------------------------------ quotas

test('quotas (design doc §5)', () => {
  assert.ok(CARDS.length >= 60, `cards ${CARDS.length}`)
  const basePool = CARDS.filter((c) => !c.pack && ['common', 'uncommon', 'rare'].includes(c.rarity))
  const count = (r: string) => basePool.filter((c) => c.rarity === r).length
  assert.ok(basePool.length >= 30, `pool ${basePool.length}`)
  assert.ok(count('common') >= 14 && count('uncommon') >= 11 && count('rare') >= 7, 'pool rarity mix')
  // Each companion: 2 join cards + 1 bond card (special) and 2 reward cards (uncommon + rare) offered while they travel with you.
  for (const m of Object.values(C.companions)) {
    const own = CARDS.filter((c) => c.owner === m.id)
    assert.equal(own.filter((c) => c.rarity === 'special').length, 3, `${m.id} join/bond cards`)
    assert.ok(own.some((c) => c.rarity === 'uncommon') && own.some((c) => c.rarity === 'rare'), `${m.id} reward cards`)
    assert.ok(m.combatPassive && m.combatPassive.triggers.length > 0, `${m.id} combat passive`)
  }
  for (const a of ARCHETYPES) {
    const builds = CARDS.filter((c) => c.archetype === a.id && c.rarity !== 'starter').length
    assert.ok(builds >= 3, `${a.id} has ${builds} exclusive pool cards`)
  }

  assert.ok(ENEMIES.length >= 14, `enemies ${ENEMIES.length}`)
  assert.ok(ENEMIES.filter((e) => e.tier === 'boss').length >= 3)
  for (const act of [1, 2, 3] as const) {
    const of = (k: EncounterDef['kind']) => ENCOUNTERS.filter((e) => e.act === act && e.kind === k && !EVENT_FIGHTS.has(e.id))
    assert.ok(of('normal').length >= 6, `act ${act} normals`)
    assert.ok(of('elite').length >= 3, `act ${act} elites`)
    assert.ok(of('boss').length >= 1, `act ${act} boss`)
    const rolled = [...of('normal'), ...of('elite')]
    const withBonus = rolled.filter((e) => e.bonus).length / rolled.length
    assert.ok(withBonus >= 0.3 && withBonus <= 0.6, `act ${act} bonus share ${withBonus.toFixed(2)}`)
    assert.ok(of('normal').some((e) => e.objective?.kind === 'survive'), `act ${act} survive fight`)
    assert.ok(of('normal').some((e) => e.bonus?.kind === 'protect' && e.neutral), `act ${act} protect fight`)
  }
  const ir = (r: string) => IMPLANTS.filter((i) => !i.pack && i.rarity === r).length
  assert.ok(IMPLANTS.length >= 30)
  assert.ok(ir('starter') >= 3 && ir('common') >= 10 && ir('uncommon') >= 9 && ir('rare') >= 6 && ir('boss') >= 3 && ir('shop') >= 3, 'implant mix')
  assert.ok(CONSUMABLES.length >= 8)
  for (const c of CONSUMABLES) assert.ok(c.price >= 35 && c.price <= 70, c.id)
  assert.equal(COMPANIONS.length, 6)
  assert.equal(ARCHETYPES.length, 3)
})

// ------------------------------------------------------------------ cards & effects

function checkEffect(e: Effect, where: string): void {
  switch (e.kind) {
    case 'damage':
      assert.ok(e.amount > 0 && e.amount <= 20, `${where}: damage ${e.amount}`)
      break
    case 'push':
      assert.ok((e.distance ?? 1) >= 1 && (e.distance ?? 1) <= 3, `${where}: push`)
      break
    case 'block':
      assert.ok(e.amount > 0 && e.amount <= 16, `${where}: block`)
      break
    case 'heal':
      assert.ok(e.amount > 0 && e.amount <= 12, `${where}: heal`)
      break
    case 'status':
      assert.ok(e.amount > 0 && e.amount <= 6, `${where}: status`)
      break
    case 'draw':
    case 'energy':
      assert.ok(e.amount > 0 && e.amount <= 3, `${where}: ${e.kind}`)
      break
    case 'trace':
      assert.ok(e.amount !== 0 && Math.abs(e.amount) <= 10, `${where}: trace`)
      break
    case 'credits':
      assert.ok(e.amount > 0 && e.amount <= 10, `${where}: credits`)
      break
    case 'add_card':
      assert.ok(C.cards[e.cardId], `${where}: add_card ${e.cardId}`)
      break
    default:
      break
  }
}

test('cards are well-formed and upgrades matter', () => {
  const owners = new Set(['any', 'connector', ...COMPANIONS.map((c) => c.id)])
  for (const c of CARDS) {
    assert.ok(owners.has(c.owner), `${c.id} owner`)
    if (c.archetype) assert.ok(C.archetypes[c.archetype], `${c.id} archetype`)
    if (c.type === 'junk') {
      assert.equal(c.cost, -1, c.id)
      continue
    }
    assert.ok(c.cost >= 0 && c.cost <= 3, `${c.id} cost`)
    assert.ok(c.effects.length > 0, `${c.id} has effects`)
    for (const e of c.effects) checkEffect(e, c.id)
    for (const e of c.upgrade.effects ?? []) checkEffect(e, `${c.id}+`)
    const u = c.upgrade
    assert.ok(u.cost !== undefined || u.effects || u.target || u.exhaust !== undefined || u.retain !== undefined, `${c.id} upgrade is empty`)
    if (u.cost !== undefined) assert.ok(u.cost < c.cost, `${c.id} upgrade cost`)
    if (u.effects) assert.ok(u.text, `${c.id} upgrade changes effects but not text`)
    if (c.target.mode === 'none') {
      for (const e of c.effects) {
        if ('to' in e || e.kind === 'damage' || e.kind === 'status' || e.kind === 'block' || e.kind === 'heal') {
          assert.ok(e.kind === 'push' || ('to' in e && e.to !== undefined && e.to !== 'target'), `${c.id}: untargeted card needs a scope`)
        }
      }
    }
    if (c.icon) assert.ok(exists(c.icon), `${c.id} icon ${c.icon}`)
    else assert.fail(`${c.id} has no icon`)
  }
})

test('implants and consumables are well-formed', () => {
  for (const i of IMPLANTS) {
    assert.ok(exists(i.icon), `${i.id} icon ${i.icon}`)
    assert.ok(i.passive || i.triggers?.length, `${i.id} does nothing`)
    for (const t of i.triggers ?? []) for (const e of t.effects) checkEffect(e, i.id)
  }
  for (const c of CONSUMABLES) {
    assert.ok(exists(c.icon), `${c.id} icon`)
    for (const e of c.effects) checkEffect(e, c.id)
  }
})

// ------------------------------------------------------------------ enemies

test('enemies have sane, telegraphable moves and existing art', () => {
  const poses = ['idle', 'attack', 'hit', 'guard', 'skill']
  for (const e of ENEMIES) {
    for (const pose of poses) {
      const v2Pose = pose === 'guard' || pose === 'skill' ? 'idle' : pose
      assert.ok(exists(`enemies/combat/${e.sprite}-${pose}.png`) || exists(`v2/sprites/${e.sprite}-${v2Pose}.webp`), `${e.id} sprite ${pose}`)
    }
    assert.ok(e.hp > 0 && e.hp <= 200, `${e.id} hp`)
    assert.ok(e.moves.length > 0, `${e.id} moves`)
    const ids = e.moves.map((m) => m.id)
    assert.equal(new Set(ids).size, ids.length, `${e.id} duplicate move ids`)
    for (const m of e.moves) {
      const where = `${e.id}.${m.id}`
      if (m.pattern === 'summon') {
        assert.ok(m.summon && C.enemies[m.summon.enemyId], `${where} summon`)
        assert.ok((m.cooldown ?? 0) >= 2, `${where} summon needs a cooldown`)
      } else if (m.pattern === 'buff') {
        assert.ok(m.effects?.length, `${where} buff effects`)
      } else {
        assert.ok((m.damage ?? 0) > 0 && (m.damage ?? 0) <= 16, `${where} damage`)
      }
      assert.ok((m.windup ?? 0) >= 0 && (m.windup ?? 0) <= 2, `${where} windup`)
      assert.ok((m.cooldown ?? 0) >= 0 && (m.cooldown ?? 0) <= 6, `${where} cooldown`)
      if (m.range !== undefined) assert.ok(m.range >= 1 && m.range <= 7, `${where} range`)
      for (const eff of m.effects ?? []) checkEffect(eff, where)
      if (m.minPhase) assert.ok((e.phases?.length ?? 0) >= m.minPhase, `${where} minPhase beyond phases`)
    }
    if (e.tier === 'boss') {
      assert.ok((e.phases?.length ?? 0) >= 1 && (e.phases?.length ?? 0) <= 2, `${e.id} phases`)
      assert.ok(e.moves.some((m) => (m.windup ?? 0) > 0), `${e.id} has a signature wind-up`)
      assert.ok(e.moves.some((m) => m.pattern === 'summon'), `${e.id} summons`)
    }
    if (e.tier === 'elite' || e.tier === 'boss') assert.ok(e.passive, `${e.id} explains its gimmick`)
  }
  assert.ok(C.enemies.administrator_ix && C.enemies.administrator_ix.hp >= 100 && C.enemies.administrator_ix.phases?.length === 2)
})

// ------------------------------------------------------------------ encounters

test('encounter boards are legal', () => {
  for (const enc of ENCOUNTERS) {
    const terrain = new Map<string, string>()
    for (const tl of enc.terrain ?? []) {
      assert.ok(inBounds(tl.pos), `${enc.id} terrain out of bounds`)
      assert.ok(!terrain.has(key(tl.pos)), `${enc.id} terrain overlap ${key(tl.pos)}`)
      terrain.set(key(tl.pos), tl.kind)
      assert.ok(tl.pos.x >= 2 || tl.kind === 'floor', `${enc.id} blocks the party deploy zone at ${key(tl.pos)}`)
    }
    const occupied = new Set<string>()
    const place = (p: Pos, what: string) => {
      assert.ok(inBounds(p), `${enc.id} ${what} out of bounds`)
      assert.ok(!occupied.has(key(p)), `${enc.id} ${what} overlaps at ${key(p)}`)
      const k = terrain.get(key(p))
      assert.ok(k !== 'cover' && k !== 'void', `${enc.id} ${what} on ${k} at ${key(p)}`)
      occupied.add(key(p))
    }
    assert.ok(enc.enemies.length >= 1)
    for (const e of enc.enemies) {
      assert.ok(C.enemies[e.id], `${enc.id} enemy ${e.id}`)
      assert.ok(e.pos.x >= 4, `${enc.id} enemy ${e.id} too close (x ${e.pos.x})`)
      place(e.pos, e.id)
    }
    if (enc.neutral) {
      place(enc.neutral.pos, 'neutral')
      assert.ok(
        exists(`characters/combat/${enc.neutral.sprite}-idle.png`) ||
          exists(`enemies/combat/${enc.neutral.sprite}-idle.png`) ||
          !!V2_SPRITES[enc.neutral.sprite]?.idle,
        `${enc.id} neutral sprite`,
      )
    }
    if (enc.bonus?.kind === 'protect') assert.ok(enc.neutral, `${enc.id} protect without neutral`)
    for (const wave of enc.reinforcements ?? []) {
      assert.ok(wave.turn >= 1 && wave.turn <= 6)
      const waveTiles = new Set<string>()
      for (const e of wave.enemies) {
        assert.ok(C.enemies[e.id], `${enc.id} reinforcement ${e.id}`)
        assert.ok(e.pos.x >= 4 && inBounds(e.pos), `${enc.id} reinforcement position`)
        const k = terrain.get(key(e.pos))
        assert.ok(k !== 'cover' && k !== 'void', `${enc.id} reinforcement on ${k}`)
        assert.ok(!waveTiles.has(key(e.pos)), `${enc.id} reinforcement overlap`)
        waveTiles.add(key(e.pos))
      }
    }
    if (enc.kind === 'boss') {
      assert.ok(enc.enemies.some((e) => C.enemies[e.id]?.tier === 'boss'), `${enc.id} has no boss`)
      assert.ok(![...terrain.values()].includes('void'), `${enc.id}: no void in boss arenas`)
    }
    if (enc.kind === 'elite') assert.ok(enc.enemies.some((e) => C.enemies[e.id]?.tier === 'elite'), `${enc.id} has no elite`)
    // The party needs at least 4 free deploy tiles on x 0-1.
    let free = 0
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x <= 1; x++) if (!terrain.has(`${x},${y}`) && !occupied.has(`${x},${y}`)) free++
    assert.ok(free >= 4, `${enc.id} deploy room`)
    assert.ok(enc.intro, `${enc.id} intro`)
  }
})

test('first Act 1 fights are the gentlest', () => {
  // Same yardstick as map.ts encounterDifficulty: enemy hp + 0.8 × reinforcement hp.
  const hp = (enc: EncounterDef) =>
    enc.enemies.reduce((s, e) => s + (C.enemies[e.id]?.hp ?? 0), 0) +
    (enc.reinforcements ?? []).reduce((s, w) => s + w.enemies.reduce((a, e) => a + (C.enemies[e.id]?.hp ?? 0) * 0.8, 0), 0)
  const a1 = ENCOUNTERS.filter((e) => e.act === 1 && e.kind === 'normal' && !EVENT_FIGHTS.has(e.id))
  const tier1 = a1.filter((e) => e.id.startsWith('a1_n1_'))
  const rest = a1.filter((e) => !e.id.startsWith('a1_n1_'))
  assert.ok(tier1.length >= 4)
  assert.ok(Math.max(...tier1.map(hp)) <= Math.min(...rest.map(hp)), 'tier-1 fights must be the lowest total hp')
})

// ------------------------------------------------------------------ art & text

test('companion and archetype art exists', () => {
  // Combat sprites come from the 2.0 sprite sets (spriteManifest.ts); portraits are painted face art.
  for (const comp of COMPANIONS) {
    assert.ok(exists(comp.portrait), comp.portrait)
    const set = V2_SPRITES[comp.sprite]
    assert.ok(set?.idle && exists(set.idle), `${comp.id} idle sprite`)
    for (const pose of ['attack', 'hit', 'guard'] as const) assert.ok(set?.[pose] && exists(set[pose]), `${comp.id} ${pose}`)
  }
  for (const a of ARCHETYPES) assert.ok(V2_SPRITES[a.sprite]?.idle, `${a.id} sprite`)
})

function walkText(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((x, i) => walkText(x, `${path}[${i}]`, out))
    return
  }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    const keys = Object.keys(o)
    if (keys.length === 2 && 'ko' in o && 'en' in o) {
      if (typeof o.ko !== 'string' || !o.ko.trim() || typeof o.en !== 'string' || !o.en.trim()) out.push(path)
      return
    }
    for (const k of keys) walkText(o[k], `${path}.${k}`, out)
  }
}

test('every Text has non-empty ko and en', () => {
  const bad: string[] = []
  walkText(CONTENT, 'CONTENT', bad)
  assert.deepEqual(bad, [])
})

// ------------------------------------------------------------------ sibling (narrative) references

function checkCondition(r: Condition | undefined, where: string): void {
  if (!r) return
  if (r.companion) assert.ok(C.companions[r.companion], `${where}: companion ${r.companion}`)
  if (r.noCompanion) assert.ok(C.companions[r.noCompanion], `${where}: companion ${r.noCompanion}`)
  if (r.hasImplant) assert.ok(C.implants[r.hasImplant], `${where}: implant ${r.hasImplant}`)
}

function checkRunEffect(e: RunEffect, where: string): void {
  switch (e.kind) {
    case 'card':
    case 'junk':
      assert.ok(C.cards[e.cardId], `${where}: card ${e.cardId}`)
      break
    case 'implant':
      if (e.implantId) assert.ok(C.implants[e.implantId], `${where}: implant ${e.implantId}`)
      break
    case 'consumable':
      if (e.id) assert.ok(C.consumables[e.id], `${where}: consumable ${e.id}`)
      break
    case 'companion':
    case 'bond':
      assert.ok(C.companions[e.id], `${where}: companion ${e.id}`)
      break
    case 'combat':
      assert.ok(C.encounters[e.encounterId], `${where}: encounter ${e.encounterId}`)
      break
    default:
      break
  }
}

test('narrative content references resolve', () => {
  for (const ev of EVENTS) {
    checkCondition(ev.requires, ev.id)
    if (ev.speaker) assert.ok(C.companions[ev.speaker] || ev.speaker === 'administrator_ix' || ev.speaker.length > 0, `${ev.id} speaker`)
    if (ev.image) assert.ok(exists(ev.image), `${ev.id} image ${ev.image}`)
    ev.options.forEach((o, i) => {
      const where = `${ev.id}#${i}`
      checkCondition(o.requires, where)
      for (const e of o.success.effects) checkRunEffect(e, where)
      for (const e of o.failure?.effects ?? []) checkRunEffect(e, where)
    })
  }
  const packs = new Set([...CARDS.map((c) => c.pack), ...IMPLANTS.map((i) => i.pack)].filter((p): p is string => !!p))
  for (const u of UNLOCKS) {
    if (u.kind === 'archetype' && u.grants) assert.ok(C.archetypes[u.grants], `${u.id} grants ${u.grants}`)
    if (u.kind === 'companion' && u.grants) assert.ok(C.companions[u.grants], `${u.id} grants ${u.grants}`)
    if ((u.kind === 'card_pack' || u.kind === 'implant_pack') && u.grants) assert.ok(packs.has(u.grants), `${u.id} grants ${u.grants}`)
    if (u.passive?.startConsumable) assert.ok(C.consumables[u.passive.startConsumable], `${u.id} consumable`)
    if (u.requires) assert.ok(C.unlocks[u.requires], `${u.id} requires ${u.requires}`)
    if (u.icon) assert.ok(exists(u.icon), `${u.id} icon ${u.icon}`)
  }
  for (const e of ENDINGS) {
    if (e.image) assert.ok(exists(e.image), `${e.id} image ${e.image}`)
    checkCondition(e.requires, e.id)
  }
  for (const a of Object.values(ACTS)) if (a.image) assert.ok(exists(a.image), `act ${a.act} image ${a.image}`)
  assert.ok(Array.isArray(LORE))
})
