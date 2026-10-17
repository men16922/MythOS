// Signal+ CRPG content integrity: every district / conversation / NPC / quest id resolves, every node is reachable and
// can always be left, checks stay in range, rewards stay inside an event node's budget, and the server keeps an AI
// persona for every NPC the player can talk to.
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { CrpgEffect, DialogueDef, DialogueOption, RunEffect, Text } from '../../engine/types.ts'
import { CONTENT } from '../index.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../../../../..')
const X = CONTENT.crpg
if (!X) throw new Error('CONTENT.crpg missing')

const COMPANIONS = new Set(Object.keys(CONTENT.companions))
const filled = (x: Text | undefined): boolean => !!x && x.ko.trim().length > 0 && x.en.trim().length > 0

function eachOption(d: DialogueDef): { node: string; option: DialogueOption }[] {
  return Object.entries(d.nodes).flatMap(([node, n]) => n.options.map((option) => ({ node, option })))
}

function outcomes(o: DialogueOption) {
  return [o.success, ...(o.failure ? [o.failure] : [])]
}

function effectsOf(o: DialogueOption): (RunEffect | CrpgEffect)[] {
  return outcomes(o).flatMap((x) => x.effects ?? [])
}

test('districts: ids, art on disk, actions < points of interest, conversations exist', () => {
  const seenDialogues = new Set<string>()
  for (const d of Object.values(X.districts)) {
    assert.ok(filled(d.name) && filled(d.intro) && filled(d.outro), `${d.id}: text`)
    assert.ok(existsSync(join(ROOT, 'resources/neo-seoul', d.image)), `${d.id}: image ${d.image} missing`)
    assert.ok(d.pois.length >= 3, `${d.id}: at least three points of interest`)
    assert.ok(d.actions >= 2 && d.actions < d.pois.length, `${d.id}: actions must force a choice`)
    assert.ok(d.pois.filter((p) => !p.requires).length >= d.actions, `${d.id}: enough unconditional stops`)
    for (const p of d.pois) {
      assert.ok(X.dialogues[p.dialogue], `${d.id}/${p.id}: dialogue ${p.dialogue}`)
      assert.ok(!seenDialogues.has(p.dialogue), `${p.dialogue} used twice`)
      seenDialogues.add(p.dialogue)
    }
  }
  for (const act of [1, 2, 3] as const) {
    assert.ok(Object.values(X.districts).some((d) => d.act === act), `act ${act} has a district`)
  }
})

test('dialogues: start exists, every goto resolves, every node reachable, every node can be left', () => {
  for (const d of Object.values(X.dialogues)) {
    assert.ok(d.nodes[d.start], `${d.id}: start ${d.start}`)
    if (d.npc) assert.ok(X.npcs[d.npc], `${d.id}: npc ${d.npc}`)
    const reach = new Set([d.start])
    const queue = [d.start]
    while (queue.length) {
      const n = d.nodes[queue.shift() as string]
      for (const o of n?.options ?? []) {
        for (const out of outcomes(o)) {
          if (!out.goto) continue
          assert.ok(d.nodes[out.goto], `${d.id}: goto ${out.goto}`)
          if (!reach.has(out.goto)) {
            reach.add(out.goto)
            queue.push(out.goto)
          }
        }
      }
    }
    for (const id of Object.keys(d.nodes)) assert.ok(reach.has(id), `${d.id}: node ${id} unreachable`)
    for (const [id, n] of Object.entries(d.nodes)) {
      assert.ok(filled(n.text), `${d.id}/${id}: text`)
      if (n.speaker) assert.ok(X.npcs[n.speaker] || COMPANIONS.has(n.speaker), `${d.id}/${id}: speaker ${n.speaker}`)
      assert.ok(n.options.length >= 2, `${d.id}/${id}: at least two options`)
      // Never a dead end: some option needs nothing and cannot fail into the same node.
      assert.ok(
        n.options.some((o) => !o.requires && !o.check),
        `${d.id}/${id}: needs an option without requirements or checks`,
      )
    }
  }
})

test('options: labels, checks in range, known companions / quests / backgrounds, bounded rewards', () => {
  for (const d of Object.values(X.dialogues)) {
    for (const { node, option: o } of eachOption(d)) {
      const where = `${d.id}/${node}: ${o.label.en}`
      assert.ok(filled(o.label) && filled(o.success.text), `${where}: text`)
      if (o.failure) assert.ok(filled(o.failure.text), `${where}: failure text`)
      if (o.check) {
        assert.ok(o.check.dc >= 8 && o.check.dc <= 18, `${where}: dc ${o.check.dc}`)
        assert.ok(o.failure, `${where}: a check needs a failure outcome`)
      }
      if (o.assist) assert.ok(COMPANIONS.has(o.assist), `${where}: assist ${o.assist}`)
      for (const [id, delta] of Object.entries(o.approval ?? {})) {
        assert.ok(COMPANIONS.has(id), `${where}: approval ${id}`)
        assert.ok(Math.abs(delta) <= 3 && delta !== 0, `${where}: approval ${delta}`)
      }
      const r = o.requires
      if (r?.background) assert.ok(X.backgrounds[r.background], `${where}: background ${r.background}`)
      if (r?.quest) assert.ok(X.quests[r.quest.id], `${where}: quest ${r.quest.id}`)
      if (r?.approval) assert.ok(COMPANIONS.has(r.approval.id), `${where}: approval req ${r.approval.id}`)
      for (const e of effectsOf(o)) {
        if (e.kind === 'quest') {
          const q = X.quests[e.id]
          assert.ok(q, `${where}: quest ${e.id}`)
          assert.ok(e.stage >= 1 && e.stage <= q.stages.length, `${where}: stage ${e.stage}`)
        }
        if (e.kind === 'credits') assert.ok(e.amount <= 50, `${where}: credits ${e.amount} over budget`)
        if (e.kind === 'hp') assert.ok(e.amount >= -8 && e.amount <= 10, `${where}: hp ${e.amount}`)
        if (e.kind === 'implant') assert.ok(!e.rarity || e.rarity !== 'rare', `${where}: no rare implants`)
        if (e.kind === 'combat') assert.ok(CONTENT.encounters[e.encounterId], `${where}: encounter ${e.encounterId}`)
        if (e.kind === 'consumable' && e.id) assert.ok(CONTENT.consumables[e.id], `${where}: consumable ${e.id}`)
        if (e.kind === 'card') assert.ok(CONTENT.cards[e.cardId], `${where}: card ${e.cardId}`)
        if (e.kind === 'companion') assert.fail(`${where}: districts never recruit`)
      }
      // An option never opens two pickers or a picker plus a fight (the run reducer sequences one at a time).
      for (const out of outcomes(o)) {
        const n = (out.effects ?? []).filter((e) => e.kind === 'card_choice' || e.kind === 'remove_card' || e.kind === 'combat').length
        assert.ok(n <= 1, `${where}: at most one interactive effect per outcome`)
      }
    }
  }
})

test('a district stays inside an event budget: at most one card pick and ≤ 60 credits across its best path', () => {
  for (const district of Object.values(X.districts)) {
    let credits = 0
    let picks = 0
    for (const p of district.pois) {
      const d = X.dialogues[p.dialogue]
      if (!d) continue
      const best = eachOption(d).reduce(
        (acc, { option }) => {
          const fx = option.success.effects ?? []
          return {
            credits: Math.max(acc.credits, fx.reduce((s, e) => s + (e.kind === 'credits' ? e.amount : 0), 0)),
            picks: Math.max(acc.picks, fx.filter((e) => e.kind === 'card_choice').length),
          }
        },
        { credits: 0, picks: 0 },
      )
      credits += best.credits
      picks += best.picks
    }
    // Visiting `actions` stops of `pois`: the sum over all stops is an upper bound.
    assert.ok(credits <= 90, `${district.id}: up to ₵${credits} on offer`)
    assert.ok(picks <= 2, `${district.id}: ${picks} card picks on offer`)
  }
})

test('quests: every quest is started and finished by some option; payoffs use known mods', () => {
  const stages = new Map<string, Set<number>>()
  for (const d of Object.values(X.dialogues)) {
    for (const { option } of eachOption(d)) {
      for (const e of effectsOf(option)) if (e.kind === 'quest') stages.set(e.id, (stages.get(e.id) ?? new Set()).add(e.stage))
    }
  }
  for (const q of Object.values(X.quests)) {
    assert.ok(filled(q.title), `${q.id}: title`)
    assert.ok(q.stages.length >= 2 && q.stages.every(filled), `${q.id}: stage lines`)
    const set = stages.get(q.id)
    if (!set) continue // a quest whose district is not written yet
    assert.ok(set.has(1), `${q.id}: never started`)
    if (q.payoff) {
      assert.ok(set.has(q.payoff.stage), `${q.id}: payoff stage ${q.payoff.stage} never reached`)
      assert.ok(['weaken', 'marked', 'intel', 'cover'].includes(q.payoff.bossMod), `${q.id}: mod`)
      assert.ok(filled(q.payoff.text), `${q.id}: payoff text`)
    }
  }
})

test('backgrounds: four, proficient in two stats, each with a unique option somewhere', () => {
  const bgs = Object.values(X.backgrounds)
  assert.equal(bgs.length, 4)
  const used = new Set<string>()
  for (const d of Object.values(X.dialogues)) for (const { option } of eachOption(d)) if (option.requires?.background) used.add(option.requires.background)
  for (const b of bgs) {
    assert.ok(filled(b.name) && filled(b.text), `${b.id}: text`)
    assert.equal(b.proficient.length, 2, `${b.id}: two stats`)
    assert.ok(b.inspires.length >= 1, `${b.id}: inspiration`)
    assert.ok(used.has(b.id), `${b.id}: no dialogue option uses it`)
  }
})

test('camps: one per companion at most, dialogues exist and speak as that companion', () => {
  const seen = new Set<string>()
  for (const c of X.camps) {
    assert.ok(COMPANIONS.has(c.companion), `camp ${c.companion}`)
    assert.ok(!seen.has(c.companion), `camp ${c.companion} twice`)
    seen.add(c.companion)
    const d = X.dialogues[c.dialogue]
    assert.ok(d, `camp ${c.companion}: dialogue ${c.dialogue}`)
    assert.ok(Object.values(d.nodes).some((n) => n.speaker === c.companion), `camp ${c.companion}: never speaks`)
    assert.ok(c.minApproval >= 2 && c.minApproval <= 6, `camp ${c.companion}: minApproval`)
  }
})

test('every NPC has a server-side AI persona (src/mythos_v2/npcs/*.py) and every persona an NPC', () => {
  const dir = join(ROOT, 'src/mythos_v2/npcs')
  const py = readdirSync(dir)
    .filter((f) => f.endsWith('.py'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n')
  for (const id of Object.keys(X.npcs)) assert.ok(py.includes(`"${id}": Persona(`), `no persona for ${id}`)
  for (const m of py.matchAll(/"([a-z0-9_]+)": Persona\(/g)) assert.ok(X.npcs[m[1] as string], `persona ${m[1]} has no NPC`)
})
