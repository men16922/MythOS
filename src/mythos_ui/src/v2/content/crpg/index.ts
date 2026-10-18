// Signal+ CRPG content (engine/crpg.ts): districts with their conversations and NPCs, backgrounds, quests and camp
// nights, assembled into id-keyed records. crpg.test.ts guards integrity (reachability, ids, budgets, AI personas).
// Each district file owns its DistrictDef, dialogues and NPCs; add a new one to PARTS.
import type { CrpgContent, DialogueDef, DistrictDef, NpcDef } from '../../engine/types.ts'
import { BACKGROUNDS } from './backgrounds.ts'
import { CAMP_DIALOGUES } from './camp_dialogues.ts'
import { CAMPS } from './camps.ts'
import { D1_LAMP_MARKET, D1_LAMP_MARKET_DIALOGUES, D1_LAMP_MARKET_NPCS } from './d1_lamp_market.ts'
import { D1_SUBSTATION, D1_SUBSTATION_DIALOGUES, D1_SUBSTATION_NPCS } from './d1_substation.ts'
import { D2_MEMORY_AUCTION, D2_MEMORY_AUCTION_DIALOGUES, D2_MEMORY_AUCTION_NPCS } from './d2_memory_auction.ts'
import { D2_SUBWAY_HUB, D2_SUBWAY_HUB_DIALOGUES, D2_SUBWAY_HUB_NPCS } from './d2_subway_hub.ts'
import { D3_GLASS_ATRIUM, D3_GLASS_ATRIUM_DIALOGUES, D3_GLASS_ATRIUM_NPCS } from './d3_glass_atrium.ts'
import { D3_NAME_ARCHIVE, D3_NAME_ARCHIVE_DIALOGUES, D3_NAME_ARCHIVE_NPCS } from './d3_name_archive.ts'
import { QUESTS } from './quests.ts'

const PARTS: [DistrictDef | null, DialogueDef[], NpcDef[]][] = [
  [D1_SUBSTATION, D1_SUBSTATION_DIALOGUES, D1_SUBSTATION_NPCS],
  [D1_LAMP_MARKET, D1_LAMP_MARKET_DIALOGUES, D1_LAMP_MARKET_NPCS],
  [D2_SUBWAY_HUB, D2_SUBWAY_HUB_DIALOGUES, D2_SUBWAY_HUB_NPCS],
  [D2_MEMORY_AUCTION, D2_MEMORY_AUCTION_DIALOGUES, D2_MEMORY_AUCTION_NPCS],
  [D3_GLASS_ATRIUM, D3_GLASS_ATRIUM_DIALOGUES, D3_GLASS_ATRIUM_NPCS],
  [D3_NAME_ARCHIVE, D3_NAME_ARCHIVE_DIALOGUES, D3_NAME_ARCHIVE_NPCS],
]

export const DISTRICTS: DistrictDef[] = PARTS.flatMap(([d]) => (d ? [d] : []))
export const DIALOGUES: DialogueDef[] = [...PARTS.flatMap(([, ds]) => ds), ...CAMP_DIALOGUES]
// Every NPC's dialogue portrait is resources/neo-seoul/v2/npcs/<id>.webp (scripts/v2_assets/gen_npc_portraits.py)
// unless the NPC names its own.
export const NPCS: NpcDef[] = PARTS.flatMap(([, , ns]) => ns).map((n) => ({ portrait: `v2/npcs/${n.id}.webp`, ...n }))

function byId<T extends { id: string }>(xs: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const x of xs) {
    if (out[x.id]) throw new Error(`crpg content: duplicate id ${x.id}`)
    out[x.id] = x
  }
  return out
}

export const CRPG: CrpgContent = {
  districts: byId(DISTRICTS),
  dialogues: byId(DIALOGUES),
  npcs: byId(NPCS),
  backgrounds: byId(BACKGROUNDS),
  quests: byId(QUESTS),
  camps: CAMPS,
}

export { BACKGROUNDS, CAMPS, QUESTS }
