// Mythos 2.0 — art lookup with fallbacks. The generated manifest (common/artManifest.ts) lists only files
// that exist; everything here falls back to the authored content paths. Returns URLs (asset() applied).
import * as M from '../common/artManifest.ts'
import { asset } from '../common/assets.ts'

type Dict = Record<string, string | undefined>
interface Loose {
  title?: string
  archive?: string
  acts?: Dict
  maps?: Dict
  arenas?: Dict
  bosses?: Dict
  endings?: Dict
  events?: Dict
}
const A = (M.ART ?? {}) as unknown as Loose
const cards = (M.CARD_ART ?? {}) as Dict
const implants = (M.IMPLANT_ART ?? {}) as Dict
const consumables = (M.CONSUMABLE_ART ?? {}) as Dict

const pick = (primary: string | undefined, fallback: string | undefined | null): string => asset(primary || fallback || '')

export const art = {
  title: () => pick(A.title, 'concept/00-project-mythos-main.png'),
  archive: () => pick(A.archive, 'concept/03-underground-echo.png'),
  act: (act: number, fallback?: string) => pick(A.acts?.[String(act)], fallback),
  /** '' when no generated map art exists (callers then use the act image). */
  map: (act: number) => (A.maps?.[String(act)] ? asset(A.maps[String(act)]) : ''),
  boss: (encounterId: string | undefined) => (encounterId && A.bosses?.[encounterId] ? asset(A.bosses[encounterId]) : ''),
  ending: (endingId: string, fallback?: string) => pick(A.endings?.[endingId], fallback),
  event: (eventId: string, fallback?: string) => pick(A.events?.[eventId], fallback),
  card: (id: string, fallback?: string) => pick(cards[id], fallback),
  implant: (id: string, fallback?: string) => pick(implants[id], fallback),
  consumable: (id: string, fallback?: string) => pick(consumables[id], fallback),
}
