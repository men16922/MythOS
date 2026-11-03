// Mythos 2.0 — the judge showcase (`?showcase=1`, W2-4): a prepared profile and run, in their own storage namespace
// (net/api.ts showcaseKey, never synced), that show the "IX learns" features within a few minutes:
//  - the Archive: three recorded loops, so IX names a habit (ui/common/loopMemory.ts ixHabitLine, every other loop);
//  - the run: Paradox 10, Deep Signal, at the Act 3 intro with a shove-heavy deck, so IX's read shows under the title;
//  - the map: the first nodes hold a procedural event (the GM casts a named person) and a marked road recruit.
// Built from the real engine, so everything after the first screen plays as normal.
import { newProfile } from '../engine/meta.ts'
import { advanceAct, newRun, reachableNodes } from '../engine/run.ts'
import type { ContentRegistry, Lang, MetaProfile, RunRecord, RunState } from '../engine/types.ts'

const SEED = 20261104
const AT = '2026-11-01T12:00:00.000Z'

const rec = (i: number, archetype: string, party: string[]): RunRecord => ({
  id: `showcase_${i}`,
  loop: i,
  archetype,
  result: 'defeat',
  endingId: 'ending_forced_erasure',
  act: 2,
  floors: 9 + i,
  echoes: 40,
  party,
  killedBy: 'a2_elite_executioner',
  endedAt: AT,
  lean: 'attack',
})

export function showcaseProfile(C: ContentRegistry, lang: Lang): MetaProfile {
  return {
    ...newProfile('Showcase', { lang }),
    // An odd loop count: the Archive's authored IX line adds a habit every other loop.
    loops: 3,
    wins: 1,
    paradoxUnlocked: 10,
    unlocks: Object.keys(C.unlocks),
    history: [rec(3, 'ghost', ['se_rin']), rec(2, 'smuggler', ['han']), rec(1, 'echo_collector', ['tae_o'])],
  }
}

export function showcaseRun(profile: MetaProfile, C: ContentRegistry): RunState {
  const run = newRun(profile, { archetype: 'ghost', paradox: 10, seed: SEED, mode: 'deep', companion: 'se_rin' }, C)
  // A shove-heavy deck, so IX's Paradox 10 read at the next act start is "shoves".
  const shoves = Object.values(C.cards).filter((c) => c.rarity === 'common' && (c.tags ?? []).length === 1 && c.tags?.[0] === 'push').slice(0, 4)
  for (const c of shoves) run.deck.push({ uid: `showcase_${c.id}`, defId: c.id, upgraded: false })
  run.act = 2
  advanceAct(run, C)
  const [first, second] = reachableNodes(run)
  if (first && run.map.nodes[first]) run.map.nodes[first] = { ...run.map.nodes[first], kind: 'event', eventId: 'pc_watcher', encounterId: undefined }
  if (second && run.map.nodes[second]) run.map.nodes[second] = { ...run.map.nodes[second], kind: 'event', eventId: 'a3_recruit', encounterId: undefined }
  return run
}
