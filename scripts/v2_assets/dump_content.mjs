// Dump the v2 content registry (cards / implants / consumables / events / companions / endings) as JSON
// for the asset generators. Node >= 23 strips TS types natively, so the authored .ts files import as-is.
// Each module is imported on its own so a half-written sibling file never blocks the others.
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../src/mythos_ui/src/v2/content')
const wanted = {
  cards: ['cards.ts', 'CARDS'],
  implants: ['implants.ts', 'IMPLANTS'],
  consumables: ['consumables.ts', 'CONSUMABLES'],
  events: ['events.ts', 'EVENTS'],
  companions: ['companions.ts', 'COMPANIONS'],
  endings: ['endings.ts', 'ENDINGS'],
}
const out = {}
const errors = {}
for (const [key, [file, name]] of Object.entries(wanted)) {
  try {
    const mod = await import(pathToFileURL(path.join(root, file)).href)
    out[key] = mod[name] ?? []
  } catch (e) {
    out[key] = []
    errors[key] = String(e && e.message ? e.message : e).slice(0, 300)
  }
}
out._errors = errors
process.stdout.write(JSON.stringify(out))
