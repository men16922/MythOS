// Signal+ CRPG content (engine/crpg.ts): districts with their conversations and NPCs, backgrounds, quests and camp
// nights, assembled into id-keyed records. crpg.test.ts guards integrity (reachability, ids, budgets, AI personas).
// Each district file owns its DistrictDef, dialogues and NPCs; add a new one to PARTS.
import type { CrpgContent, DialogueDef, DistrictDef, NpcDef, Faction } from '../../engine/types.ts'
import { BACKGROUNDS } from './backgrounds.ts'
import { CAMP_DIALOGUES } from './camp_dialogues.ts'
import { CAMPS } from './camps.ts'
import { D1_LAMP_MARKET, D1_LAMP_MARKET_DIALOGUES, D1_LAMP_MARKET_NPCS } from './d1_lamp_market.ts'
import { D1_SUBSTATION, D1_SUBSTATION_DIALOGUES, D1_SUBSTATION_NPCS } from './d1_substation.ts'
import { D2_MEMORY_AUCTION, D2_MEMORY_AUCTION_DIALOGUES, D2_MEMORY_AUCTION_NPCS } from './d2_memory_auction.ts'
import { D2_SUBWAY_HUB, D2_SUBWAY_HUB_DIALOGUES, D2_SUBWAY_HUB_NPCS } from './d2_subway_hub.ts'
import { D3_GLASS_ATRIUM, D3_GLASS_ATRIUM_DIALOGUES, D3_GLASS_ATRIUM_NPCS } from './d3_glass_atrium.ts'
import { D3_NAME_ARCHIVE, D3_NAME_ARCHIVE_DIALOGUES, D3_NAME_ARCHIVE_NPCS } from './d3_name_archive.ts'
import { QUESTS as BASE_QUESTS } from './quests.ts'
import { D1_SPIDER_DEBT, D1_SPIDER_DEBT_DIALOGUES, D1_SPIDER_DEBT_NPCS, D1_SPIDER_DEBT_QUESTS } from './d1_spider_debt.ts'
import { D1_LIST_SHELTER, D1_LIST_SHELTER_DIALOGUES, D1_LIST_SHELTER_NPCS, D1_LIST_SHELTER_QUESTS } from './d1_list_shelter.ts'
import { D2_RUNNER_SHORTCUT, D2_RUNNER_SHORTCUT_DIALOGUES, D2_RUNNER_SHORTCUT_NPCS, D2_RUNNER_SHORTCUT_QUESTS } from './d2_runner_shortcut.ts'
import { D2_BROKER_REQUEST, D2_BROKER_REQUEST_DIALOGUES, D2_BROKER_REQUEST_NPCS, D2_BROKER_REQUEST_QUESTS } from './d2_broker_request.ts'
import { D3_VAULT_BEYOND, D3_VAULT_BEYOND_DIALOGUES, D3_VAULT_BEYOND_NPCS, D3_VAULT_BEYOND_QUESTS } from './d3_vault_beyond.ts'
import { D3_OLD_WOUND, D3_OLD_WOUND_DIALOGUES, D3_OLD_WOUND_NPCS, D3_OLD_WOUND_QUESTS } from './d3_old_wound.ts'
import { D4_DREAM_STACKS, D4_DREAM_STACKS_DIALOGUES, D4_DREAM_STACKS_NPCS, D4_DREAM_STACKS_QUESTS } from './d4_dream_stacks.ts'
import { D4_RETURN_DESK, D4_RETURN_DESK_DIALOGUES, D4_RETURN_DESK_NPCS, D4_RETURN_DESK_QUESTS } from './d4_return_desk.ts'
import { D4_FORBIDDEN_INDEX, D4_FORBIDDEN_INDEX_DIALOGUES, D4_FORBIDDEN_INDEX_NPCS, D4_FORBIDDEN_INDEX_QUESTS } from './d4_forbidden_index.ts'
import { D4_CUT_NAMES, D4_CUT_NAMES_DIALOGUES, D4_CUT_NAMES_NPCS, D4_CUT_NAMES_QUESTS } from './d4_cut_names.ts'
import { D5_SCRAP_CHOIR, D5_SCRAP_CHOIR_DIALOGUES, D5_SCRAP_CHOIR_NPCS, D5_SCRAP_CHOIR_QUESTS } from './d5_scrap_choir.ts'
import { D6_MARGIN_NOTES, D6_MARGIN_NOTES_DIALOGUES, D6_MARGIN_NOTES_NPCS, D6_MARGIN_NOTES_QUESTS } from './d6_margin_notes.ts'
import { D5_COLD_STORAGE, D5_COLD_STORAGE_DIALOGUES, D5_COLD_STORAGE_NPCS, D5_COLD_STORAGE_QUESTS } from './d5_cold_storage.ts'
import { D6_FIRST_DRAFT, D6_FIRST_DRAFT_DIALOGUES, D6_FIRST_DRAFT_NPCS, D6_FIRST_DRAFT_QUESTS } from './d6_first_draft.ts'
import { D4_SEA_SEIZURE_SHED, D4_SEA_SEIZURE_SHED_DIALOGUES, D4_SEA_SEIZURE_SHED_NPCS, D4_SEA_SEIZURE_SHED_QUESTS } from './d4_sea_seizure_shed.ts'
import { D5_SEA_BARGE_MARKET, D5_SEA_BARGE_MARKET_DIALOGUES, D5_SEA_BARGE_MARKET_NPCS, D5_SEA_BARGE_MARKET_QUESTS } from './d5_sea_barge_market.ts'
import { D6_SEA_FOGHORN_POST, D6_SEA_FOGHORN_POST_DIALOGUES, D6_SEA_FOGHORN_POST_NPCS, D6_SEA_FOGHORN_POST_QUESTS } from './d6_sea_foghorn_post.ts'
import { D2_OUTSIDE_LAUNDRY, D2_OUTSIDE_LAUNDRY_DIALOGUES, D2_OUTSIDE_LAUNDRY_NPCS, D2_OUTSIDE_LAUNDRY_QUESTS } from './d2_outside_laundry.ts'
import { D2_OUTSIDE_METERS, D2_OUTSIDE_METERS_DIALOGUES, D2_OUTSIDE_METERS_NPCS, D2_OUTSIDE_METERS_QUESTS } from './d2_outside_meters.ts'
import { D5_CRANE_CHAPEL, D5_CRANE_CHAPEL_DIALOGUES, D5_CRANE_CHAPEL_NPCS, D5_CRANE_CHAPEL_QUESTS } from './d5_crane_chapel.ts'
import { D6_ERRATA_OFFICE, D6_ERRATA_OFFICE_DIALOGUES, D6_ERRATA_OFFICE_NPCS, D6_ERRATA_OFFICE_QUESTS } from './d6_errata_office.ts'
import { D4_SEA_DORMITORY, D4_SEA_DORMITORY_DIALOGUES, D4_SEA_DORMITORY_NPCS, D4_SEA_DORMITORY_QUESTS } from './d4_sea_dormitory.ts'
import { D4_SEA_CONTAINER_ALLEY, D4_SEA_CONTAINER_ALLEY_DIALOGUES, D4_SEA_CONTAINER_ALLEY_NPCS, D4_SEA_CONTAINER_ALLEY_QUESTS } from './d4_sea_container_alley.ts'
import { D5_SEA_DROWNED_ROWS, D5_SEA_DROWNED_ROWS_DIALOGUES, D5_SEA_DROWNED_ROWS_NPCS, D5_SEA_DROWNED_ROWS_QUESTS } from './d5_sea_drowned_rows.ts'
import { D6_SEA_CABLE_STATION, D6_SEA_CABLE_STATION_DIALOGUES, D6_SEA_CABLE_STATION_NPCS, D6_SEA_CABLE_STATION_QUESTS } from './d6_sea_cable_station.ts'

const PARTS: [DistrictDef | null, DialogueDef[], NpcDef[]][] = [
  [D1_SUBSTATION, D1_SUBSTATION_DIALOGUES, D1_SUBSTATION_NPCS],
  [D1_LAMP_MARKET, D1_LAMP_MARKET_DIALOGUES, D1_LAMP_MARKET_NPCS],
  [D2_SUBWAY_HUB, D2_SUBWAY_HUB_DIALOGUES, D2_SUBWAY_HUB_NPCS],
  [D2_MEMORY_AUCTION, D2_MEMORY_AUCTION_DIALOGUES, D2_MEMORY_AUCTION_NPCS],
  [D3_GLASS_ATRIUM, D3_GLASS_ATRIUM_DIALOGUES, D3_GLASS_ATRIUM_NPCS],
  [D3_NAME_ARCHIVE, D3_NAME_ARCHIVE_DIALOGUES, D3_NAME_ARCHIVE_NPCS],
  // DLC update (2026-10-26, CRPG C+7): 1.0 side arcs as districts, two per act 1–3 and two for Act 4 (Glass Library).
  [D1_SPIDER_DEBT, D1_SPIDER_DEBT_DIALOGUES, D1_SPIDER_DEBT_NPCS],
  [D1_LIST_SHELTER, D1_LIST_SHELTER_DIALOGUES, D1_LIST_SHELTER_NPCS],
  [D2_RUNNER_SHORTCUT, D2_RUNNER_SHORTCUT_DIALOGUES, D2_RUNNER_SHORTCUT_NPCS],
  [D2_BROKER_REQUEST, D2_BROKER_REQUEST_DIALOGUES, D2_BROKER_REQUEST_NPCS],
  [D3_VAULT_BEYOND, D3_VAULT_BEYOND_DIALOGUES, D3_VAULT_BEYOND_NPCS],
  [D3_OLD_WOUND, D3_OLD_WOUND_DIALOGUES, D3_OLD_WOUND_NPCS],
  [D4_DREAM_STACKS, D4_DREAM_STACKS_DIALOGUES, D4_DREAM_STACKS_NPCS],
  [D4_RETURN_DESK, D4_RETURN_DESK_DIALOGUES, D4_RETURN_DESK_NPCS],
  // W1-4 (2026-11-04): the last two 1.0 Glass Library side quests.
  [D4_FORBIDDEN_INDEX, D4_FORBIDDEN_INDEX_DIALOGUES, D4_FORBIDDEN_INDEX_NPCS],
  [D4_CUT_NAMES, D4_CUT_NAMES_DIALOGUES, D4_CUT_NAMES_NPCS],
  // 2026-11-04: Acts 5 and 6 had no district (chronicle chapters 5–6 need one).
  [D5_SCRAP_CHOIR, D5_SCRAP_CHOIR_DIALOGUES, D5_SCRAP_CHOIR_NPCS],
  [D6_MARGIN_NOTES, D6_MARGIN_NOTES_DIALOGUES, D6_MARGIN_NOTES_NPCS],
  [D5_COLD_STORAGE, D5_COLD_STORAGE_DIALOGUES, D5_COLD_STORAGE_NPCS],
  [D6_FIRST_DRAFT, D6_FIRST_DRAFT_DIALOGUES, D6_FIRST_DRAFT_NPCS],
  // 2026-11-04: the Unwritten Sea's acts had no district (its route map replaced the base one).
  [D4_SEA_SEIZURE_SHED, D4_SEA_SEIZURE_SHED_DIALOGUES, D4_SEA_SEIZURE_SHED_NPCS],
  [D5_SEA_BARGE_MARKET, D5_SEA_BARGE_MARKET_DIALOGUES, D5_SEA_BARGE_MARKET_NPCS],
  [D6_SEA_FOGHORN_POST, D6_SEA_FOGHORN_POST_DIALOGUES, D6_SEA_FOGHORN_POST_NPCS],
  // Outside the List (DLC 2) replaces the Act 2 map, so it needs its own district.
  [D2_OUTSIDE_LAUNDRY, D2_OUTSIDE_LAUNDRY_DIALOGUES, D2_OUTSIDE_LAUNDRY_NPCS],
  [D2_OUTSIDE_METERS, D2_OUTSIDE_METERS_DIALOGUES, D2_OUTSIDE_METERS_NPCS],
  // Third districts for Acts 5 and 6 so their pairs vary between runs like Acts 1–4.
  [D5_CRANE_CHAPEL, D5_CRANE_CHAPEL_DIALOGUES, D5_CRANE_CHAPEL_NPCS],
  [D6_ERRATA_OFFICE, D6_ERRATA_OFFICE_DIALOGUES, D6_ERRATA_OFFICE_NPCS],
  [D4_SEA_DORMITORY, D4_SEA_DORMITORY_DIALOGUES, D4_SEA_DORMITORY_NPCS],
  [D4_SEA_CONTAINER_ALLEY, D4_SEA_CONTAINER_ALLEY_DIALOGUES, D4_SEA_CONTAINER_ALLEY_NPCS],
  [D5_SEA_DROWNED_ROWS, D5_SEA_DROWNED_ROWS_DIALOGUES, D5_SEA_DROWNED_ROWS_NPCS],
  [D6_SEA_CABLE_STATION, D6_SEA_CABLE_STATION_DIALOGUES, D6_SEA_CABLE_STATION_NPCS],
]

/** Base quests plus each new district's own quest. */
const QUESTS = [...BASE_QUESTS, ...D1_SPIDER_DEBT_QUESTS, ...D1_LIST_SHELTER_QUESTS, ...D2_RUNNER_SHORTCUT_QUESTS, ...D2_BROKER_REQUEST_QUESTS, ...D3_VAULT_BEYOND_QUESTS, ...D3_OLD_WOUND_QUESTS, ...D4_DREAM_STACKS_QUESTS, ...D4_RETURN_DESK_QUESTS, ...D4_FORBIDDEN_INDEX_QUESTS, ...D4_CUT_NAMES_QUESTS, ...D5_SCRAP_CHOIR_QUESTS, ...D6_MARGIN_NOTES_QUESTS, ...D5_COLD_STORAGE_QUESTS, ...D6_FIRST_DRAFT_QUESTS, ...D4_SEA_SEIZURE_SHED_QUESTS, ...D5_SEA_BARGE_MARKET_QUESTS, ...D6_SEA_FOGHORN_POST_QUESTS, ...D2_OUTSIDE_LAUNDRY_QUESTS, ...D2_OUTSIDE_METERS_QUESTS, ...D5_CRANE_CHAPEL_QUESTS, ...D6_ERRATA_OFFICE_QUESTS, ...D4_SEA_DORMITORY_QUESTS, ...D4_SEA_CONTAINER_ALLEY_QUESTS, ...D5_SEA_DROWNED_ROWS_QUESTS, ...D6_SEA_CABLE_STATION_QUESTS]

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

/** Who each NPC speaks for (reputation). Unlisted NPCs move no faction. */
const NPC_FACTION: Record<string, Faction> = {
  oh_gisa: 'offgrid',
  bora: 'offgrid',
  min_courier: 'offgrid',
  scav_pyo: 'offgrid',
  iseul: 'offgrid',
  yeon_cleaner: 'offgrid',
  mother_so: 'offgrid',
  citizen_mun: 'offgrid',
  madam_ku: 'market',
  toll_king: 'market',
  auctioneer_palle: 'market',
  collector_do: 'market',
  sgt_yun: 'grid',
  kiosk_dal: 'grid',
  stationmaster_yeom: 'grid',
  curator_baek: 'grid',
  archivist_07: 'grid',
  auditor_pyo: 'grid',
}

export const CRPG: CrpgContent = {
  districts: byId(DISTRICTS),
  dialogues: byId(DIALOGUES),
  npcs: byId(NPCS.map((n) => (NPC_FACTION[n.id] ? { ...n, faction: NPC_FACTION[n.id] } : n))),
  backgrounds: byId(BACKGROUNDS),
  quests: byId(QUESTS),
  camps: CAMPS,
}

export { BACKGROUNDS, CAMPS, QUESTS }
