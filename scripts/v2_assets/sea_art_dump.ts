// Writes scripts/v2_assets/sea_art.json: every image DLC 3 and DLC 2 still need, with its size and prompt, read from the art
// maps that sit beside the content. Run: node --experimental-strip-types scripts/v2_assets/sea_art_dump.ts
import { readFileSync, writeFileSync } from 'node:fs'
const R = new URL('../../src/mythos_ui/src/v2/content/packs/unwritten_sea/', import.meta.url).pathname
const S = await import(R + 'index.ts')
const { CONTENT: C } = await import(new URL('../../src/mythos_ui/src/v2/content/index.ts', import.meta.url).pathname)
const here = new URL('.', import.meta.url).pathname

const out: Record<string, { prompt: string; size: string }> = {}
const SIZE: [RegExp, string][] = [
  [/^v2\/cards\//, '600x800'],
  [/^v2\/(implants|consumables|gear)\//, '512x512'],
  [/^v2\/(ending|boss|art)\//, '1920x1080'],
  [/^v2\/ult\//, '1280x720'],
  [/^v2\/map\//, '1080x1920'],
  [/^characters\//, '1024x1280'],
]
const size = (p: string): string => SIZE.find(([rx]) => rx.test(p))?.[1] ?? '1600x900'
const add = (path: string, prompt: string): void => {
  if (path && prompt) out[path] = { prompt, size: size(path) }
}
for (const m of [S.SEA4_EVENT_ART, S.SEA5_EVENT_ART, S.SEA6_EVENT_ART]) for (const [id, p] of Object.entries(m as Record<string, string>)) add(C.events[id]?.image ?? '', p)
for (const m of [S.SEA_ITEM_ART, S.SEA_ART, S.SEA_WRITING_ART]) for (const [k, p] of Object.entries(m as Record<string, string>)) if (k.includes('/')) add(k, p)

const sprites: { key: string; kind: string; subject: string; refs?: string[] }[] = []
type Foe = { id: string; sprite: string; tier: string; name: { en: string }; passive?: { en: string } }
for (const [list, art] of [[S.SEA4_ENEMIES, S.SEA4_ENEMY_ART], [S.SEA5_ENEMIES, S.SEA5_ENEMY_ART], [S.SEA6_ENEMIES, S.SEA6_ENEMY_ART]] as const) {
  for (const e of list as Foe[]) {
    const subject = (art as Record<string, string>)[e.sprite] ?? `${e.name.en}. ${e.passive?.en ?? ''} A harbor-worn machine or figure from a drowned port city.`
    sprites.push({ key: e.sprite, kind: e.tier === 'boss' ? 'boss' : e.tier === 'elite' ? 'elite' : 'enemy', subject })
  }
}
// Party sprites go through the sprite pipeline, not the plain image one.
const party: Record<string, string> = { mujin: 'characters/mujin.png', 'seo-ha': 'characters/seo-ha.png', parang: 'characters/parang.png', navigator: 'characters/navigator.png' }
for (const [key, portrait] of Object.entries(party)) {
  const idle = out[`v2/sprites/${key}-idle.webp`]?.prompt ?? out[portrait]?.prompt ?? key
  sprites.push({ key, kind: 'party', subject: idle, refs: [`resources/neo-seoul/${portrait}`] })
}
for (const k of Object.keys(out)) if (k.startsWith('v2/sprites/')) delete out[k]
const NOTEXT = ' Painterly cinematic concept art, cyberpunk harbor noir, natural proportions, no text, no letters, no logos, no UI, no frame.'
// Set pieces: everything a player sees at a turning point.
const scene: Record<string, string> = {
  sea_log_1: 'A water-warped notebook covered in layered seizure tags on the bottom shelf of a dim customs store.',
  sea_ix_warning: 'A rusted payphone at the end of a dry wharf, its cut cord trailing on salt-crusted concrete, ringing, cranes far behind.',
  sea_log_2: 'An old man at a barge stall with a magnifier pushed up on his forehead, unlabeled bottles each holding one point of light, gray water around the barge.',
  sea_drowned_roll: 'A pale human shape on flooded residential stairs holding a wet paper roll, standing exactly where the gray water ends.',
  sea_log_3: 'An arm-thick undersea cable rising through a steel station floor, a kneeling shift worker writing in a log beside it, fog beyond the railings.',
  sea_lamp_room: 'A small round room at the top of a spiral stair, two tea cups on a table, one steaming, a slow lighthouse beam crossing the window.',
}
for (const [id, p] of Object.entries(scene)) add(`v2/events/${id}.webp`, p + NOTEXT)
for (const e of S.SEA_ENDINGS as { image: string; text: { en: string } }[]) add(e.image, `Wide cinematic ending illustration. ${e.text.en}${NOTEXT}`)
for (const [route, act] of Object.entries(S.SEA_ACTS as Record<string, { image: string; name: { en: string }; subtitle: { en: string } }>)) {
  const look = `${act.name.en}: ${act.subtitle.en}. A wide establishing view of a forgotten Korean port city.`
  add(act.image, `Wide act title illustration. ${look}${NOTEXT}`)
  add(`v2/map/${route}.webp`, `Tall top-down weathered nautical survey map with no writing. ${look}${NOTEXT}`)
  add(`v2/arena/${route}.webp`, `Wide empty battlefield backdrop seen at eye level, no people. ${look}${NOTEXT}`)
}
for (const e of S.SEA4_ENCOUNTERS.concat(S.SEA5_ENCOUNTERS, S.SEA6_ENCOUNTERS) as { id: string; kind: string; enemies: { id: string }[] }[]) {
  if (e.kind !== 'boss') continue
  const boss = e.enemies.map((x) => C.enemies[x.id]).find((x: Foe) => x?.tier === 'boss')
  const subject = sprites.find((x) => x.key === boss?.sprite)?.subject ?? ''
  add(`v2/boss/${e.id}.webp`, `Wide boss reveal splash, the figure centred and imposing, calm dark space around it. ${subject}${NOTEXT}`)
}
for (const id of ['mujin', 'seo_ha', 'parang', 'navigator']) {
  const who = C.companions[id] ?? C.archetypes[id]
  const ult = who.ultimate ?? who.burst
  add(`v2/ult/${id}.webp`, `Wide cut-in illustration, head to knees, face in the centre third. ${who.name.en}: ${ult.name.en}. ${ult.text.en}${NOTEXT}`)
}
for (const d of S.SEA_DUOS as { id: string; pair: string[]; name: { en: string }; text: { en: string } }[]) add(`v2/ult/duo_${d.id}.webp`, `Wide duo cut-in, both characters in the centre third. ${d.name.en}. ${d.text.en}${NOTEXT}`)
for (const g of Object.values(C.gear) as { id: string; name: { en: string } }[]) add(`v2/gear/${g.id}.webp`, out[`v2/gear/${g.id}.webp`]?.prompt ?? `Icon of ${g.name.en}, one object on a dark plain background.${NOTEXT}`)
const ol = JSON.parse(readFileSync(process.argv[2] ?? here + 'outside_art.json', 'utf8'))
for (const [id, subject] of Object.entries(ol.sprites as Record<string, string>)) sprites.push({ key: `ol-${id.replace(/_/g, '-')}`, kind: C.enemies[id]?.tier === 'boss' ? 'boss' : C.enemies[id]?.tier === 'elite' ? 'elite' : 'enemy', subject })
for (const [id, p] of Object.entries(ol.events as Record<string, string>)) add(`v2/events/${id}.webp`, p)
for (const [id, p] of Object.entries(ol.cards as Record<string, string>)) add(`v2/cards/${id}.webp`, p)
add('v2/art/outside.webp', ol.act)
writeFileSync(here + 'sea_art.json', JSON.stringify({ images: out, sprites }, null, 1))
console.log(Object.keys(out).length, 'images', sprites.length, 'sprites')
