export interface ScenarioArchetype {
  id: string;
  name: string;
  attributes: string[];
  starting_item?: string;
  stats?: Record<string, number>;
  base_skills?: string[];
  unlock?: Record<string, unknown> | null;
  unlock_hint?: string;
  unlocked?: boolean;
}

export interface ScenarioSkill {
  id: string;
  name: string;
  role?: string;
  tags?: string[];
  cost?: Record<string, number | string>;
  range?: number;
  cooldown?: number;
  tier?: number;
  epiphany?: string;
  unlock_hint?: string;
}

export interface ScenarioEnding {
  id: string;
  title: string;
  condition: string;
}

export interface SkillTreeNode extends ScenarioSkill {
  status: "learned" | "unlocked" | "locked";
  rank: number;
  max_rank: number;
  learn_cost: number;
  rankup_cost: number;
  rank_bonuses: { power: number; focus_reduction: number; cooldown_reduction: number };
  next_rank_bonuses: { power: number; focus_reduction: number; cooldown_reduction: number };
  requires: string[];
  requires_met: boolean;
  is_base: boolean;
  action: "learn" | "rankup" | null;
  action_cost: number;
  can_afford: boolean;
}

export interface SkillTreeResponse {
  insight_points: number;
  skills: SkillTreeNode[];
}

export interface ScenarioCharacter {
  name: string;
  alias?: string;
  role?: string;
  keywords: string[];
  portrait?: string | null;
}

export interface ScenarioRef {
  id: string;
  name: string;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  brief: string;
  archetypes: ScenarioArchetype[];
  skills?: ScenarioSkill[];
  endings: ScenarioEnding[];
  characters?: ScenarioCharacter[];
  encounters?: ScenarioRef[];
  allies?: ScenarioRef[];
  ui_copy?: Record<string, unknown>;
  unlocked?: boolean;
  unlock_hint?: string;
}

export interface PlayerProfile {
  player_id: string;
  display_name: string;
  traits: {
    archetype?: string;
    inventory?: string[];
    stats?: Record<string, number>;
    attributes?: string[];
    autonomy_level?: number;
    [key: string]: unknown;
  };
}

export interface ChoiceCost {
  stability?: number;
  tension?: number;
}

export interface ChoiceRequires {
  stability_min?: number;
  tension_max?: number;
}

export interface SceneChoice {
  choice_id: string;
  label: string;
  intent?: string;
  cost?: ChoiceCost | null;
  requires?: ChoiceRequires | null;
  axis?: "people" | "data" | "safety" | "control" | string;
  axis_label?: string;
  stakes?: string[];
  result_preview?: string;
}

export interface ChoiceResult {
  action?: string;
  summary?: string;
  stability_delta?: number;
  tension_delta?: number;
  new_flags?: string[];
  route_from?: string | null;
  route_to?: string | null;
}

export interface ActiveScene {
  scene_id: string;
  loop_id: string;
  turn_index: number;
  title: string;
  location: string;
  narration: string;
  choices: SceneChoice[];
  visual_brief?: string;
  created_at: string;
  objective?: string;
  // Stable Golden Path goal for the current act (loop phase). Anchors the player
  // even when the per-scene `objective` is vague or missing.
  chapter_goal?: string | null;
  action_result?: string | null;
  stakes_summary?: string[];
  choice_result?: ChoiceResult | null;
  scene_type: string;
}

export interface CombatBlip {
  id: string;
  name?: string;
  faction: "player" | "ally" | "enemy";
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  hp_ratio?: number;
  alive?: boolean;
  defending?: boolean;
  portrait?: string;
  combat_images?: Record<string, string>;
  focus?: number;
  max_focus?: number;
}

export interface CombatIntent {
  enemy_id: string;
  action: "attack" | "move" | "flee";
  target_x: number;
  target_y: number;
  target_name?: string;
}

export interface CombatRadar {
  arena: {
    w: number;
    h: number;
  };
  blips: CombatBlip[];
  current?: string;
  enemy_intents?: CombatIntent[];
  round?: number;
}

export interface CombatTargetInfo {
  id: string;
  name: string;
  hp: number;
  max_hp: number;
  in_range: boolean;
}

/** Self + living allies — direction targets for heal/shield support skills. */
export interface CombatFriendlyTarget {
  id: string;
  name: string;
  distance: number;
  hp: number;
  max_hp: number;
  is_self: boolean;
}

export interface CombatSkillInfo {
  id: string;
  cooldown: number;
  // Presentation/animation metadata (Phase 0). role/tags drive icon + skill
  // animation selection on the client; absent for legacy payloads.
  name?: string;
  role?: string;
  tags?: string[];
  cost?: Record<string, number | string>;
  range?: number;
}

export interface CombatAvailableActions {
  can_act: boolean;
  focus?: number;
  max_focus?: number;
  targets?: CombatTargetInfo[];
  friendly_targets?: CombatFriendlyTarget[];
  skills?: CombatSkillInfo[];
  reachable?: [number, number][];
  // Whose turn it is — the player or a controllable party member.
  active_actor_id?: string;
  active_actor_name?: string;
  is_player?: boolean;
}

export interface CombatLogDetail {
  target?: string;
  target_id?: string;
  damage?: number;
  crit?: boolean;
  skill_name?: string;
  skill_id?: string;
  skill?: string;
  [key: string]: unknown;
}

export interface CombatLogEntry {
  round: number;
  actor: string;
  actor_name: string;
  action: string;
  text: string;
  detail: CombatLogDetail;
}

export interface CombatState {
  finished: boolean;
  outcome?: "player_victory" | "player_fled" | "player_defeat" | string;
  defeat_soft?: boolean;
  radar: CombatRadar;
  available?: CombatAvailableActions;
  elevations?: Record<string, number>;
  covers?: Record<string, string>;
  hazards?: Record<string, string>;
  log?: CombatLogEntry[];
  rewards?: {
    items?: string[];
    encounter_reward?: Record<string, number | string>;
    [key: string]: unknown;
  };
  encounter?: {
    id?: string;
    name?: string;
    narrative_trigger?: string;
    learning_goal?: string;
    reward_intent?: string;
  };
  consumables?: CombatConsumable[];
}

export interface CombatConsumable {
  item_id: string;
  name: string;
  effect?: string | null;
  count: number;
}

export interface CombatAction {
  type: "attack" | "defend" | "wait" | "flee" | "skill" | "item";
  target_id?: string;
  skill_id?: string;
  item_id?: string;
  x?: number;
  y?: number;
}

export interface AssetInfo {
  status: "succeeded" | "pending" | "processing" | "failed";
  storage_uri: string;
}

export interface GameStateRaw {
  flags: string[];
  scenario_id?: string;
  // Companion affection tally (snake_case companion id -> signed int; negative =
  // distrust/rejection path). Accumulated server-side onto loop.state.relationships
  // by route_runtime + session choose; values are intentionally unbounded.
  relationships?: Record<string, number>;
  _active_cutscene?: {
    id: string;
    companion: string;
    title: string;
    image: string;
  };
  _seen_cutscenes?: string[];
  ending_id?: string;
  ending_label?: string;
  ending_narration?: string;
  ending_image?: string;
  _map?: {
    current?: string;
    tiles?: Record<string, {
      x: number;
      y: number;
      kind: string;
      name: string;
    }>;
  };
  _encounter_map?: {
    contacts?: Record<string, {
      x: number;
      y: number;
      glyph: string;
      name: string;
      state: string;
    }>;
  };
  _route_map?: RouteMap;
  [key: string]: unknown;
}

export interface RoutePerspective {
  id: string;
  lens?: string;
  axis?: string;
  when?: string[];
  summary?: string;
  crosses?: string[];
  effect?: Record<string, unknown>;
  ending_influence?: string[];
}

export interface RouteNode {
  id: string;
  type: string;
  layer: number;
  arc?: string;
  title?: string;
  label?: string;
  glyph?: string;
  risk?: number;
  reward?: Record<string, number>;
  combat?: boolean;
  anchor?: boolean;
  origin?: "anchor" | "dynamic";
  mandatory?: boolean;
  gate?: string[];
  col?: number;
  beat?: string;
  image?: string;
  image_pre?: string;
  image_sequence?: string[];
  event?: string;
  default_perspective?: string;
  perspectives?: RoutePerspective[];
}

export interface RouteMap {
  version?: number;
  mode?: "dynamic" | string;
  horizon?: number;
  current?: string;
  visited?: string[];
  nodes?: Record<string, RouteNode>;
  edges?: Record<string, string[]>;
  layers?: string[][];
  active_perspectives?: Record<string, string>;
  ending_tally?: Record<string, number>;
  ending_leaderboard?: [string, number][];
}

export interface RuntimeSnapshot {
  loop_id: string;
  phase: string;
  location: string;
  stability: number;
  tension: number;
  decay_percent: number;
  zone_risk: string;
  clues_collected: number;
  inventory?: InventoryItem[];
  active_scene?: ActiveScene;
  combat?: CombatState | null;
  assets?: AssetInfo[];
  bgm_path?: string;
  active_echoes?: EchoItem[];
  echo?: EchoItem | null;
  state?: GameStateRaw;
  player?: PlayerProfile;
  epiphanies_unlocked?: string[];
  boons?: BoonsView | null;
  market?: MarketView | null;
  companions?: CompanionSheet[];
}

// Met companion with growth-folded combat sheet (CHARACTER tab focus card).
export interface CompanionSheet {
  id: string;
  name: string;
  alias?: string | null;
  image?: string | null;
  hp: number;
  max_hp: number;
  stats: Record<string, number>;
  stat_bonus: Record<string, number>;
  skills: { id: string; name: string }[];
  bond_tier: number;
  affection: number;
  in_party?: boolean;
  upgrades: { id: string; name: string; name_en: string }[];
}

export interface MarketOffer {
  give: string;
  give_name: string;
  count: number;
  get: string;
  get_name: string;
  get_kind: string;
  affordable: boolean;
}

export interface MarketView {
  offers: MarketOffer[];
  held: Record<string, number>;
  vendor?: { id: string; name: string };
}

export interface BoonCard {
  id: string;
  name: string;
  desc: string;
  stats: Record<string, number>;
}

export interface EchoInscription {
  id: string;
  symbol: string;
  text: string;
  effect?: string;
  desc?: string;
  stats: Record<string, number>;
}

export interface BoonsView {
  offer: BoonCard[] | null;
  active: BoonCard[];
  echoOffer?: EchoInscription[] | null;
  echoInscribed?: EchoInscription[];
  statBonus?: Record<string, number>;
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: string;
  rarity?: string | null;
  effect?: string | null;
  count: number;
  slot?: string | null;
  stats?: Record<string, number> | null;
  equipped?: boolean;
}

export interface SaveSlot {
  loop_id: string;
  slot_id?: string;
  label?: string;
  saved_at: string;
  scenario_id?: string;
  scene_title?: string;
  phase?: string;
  turn_index?: number;
  stability?: number;
  tension?: number;
  in_combat?: boolean;
  display_name?: string;
  archetype?: string;
  thumb_url?: string;
}

export interface RunSummary {
  loop_id: string;
  ending_label?: string;
  final_title?: string;
  final_location?: string;
  turns: number;
  ended_at: string;
  unlocks_granted?: string[];
  scenario_id?: string;
  clues_collected?: string[];
  combats_won?: number;
  combats_lost?: number;
  summary?: string;
}

export interface NarrativeShard {
  kind: "clue" | "lore" | "character" | string;
  symbol: string;
  text: string;
}

export interface EchoItem {
  echo_id?: string;
  source_loop_id?: string;
  source_event_id?: string;
  symbol: string;
  text: string;
  weight?: number;
}

export interface UnlockedLore {
  title: string;
  summary: string;
}

export interface CutsceneGalleryEntry {
  id: string;
  companion: string;
  title: string;
  affection_required: number;
  flags_required: string[];
  unlocked: boolean;
  image: string | null;
  body: string | null;
}

export interface MemoryOverview {
  world_archives?: unknown[];
  narrative_shards: NarrativeShard[];
  novelty_notes?: string[];
  run_summaries?: RunSummary[];
  latest_adjustment?: Record<string, unknown> | null;
  rollup?: Record<string, unknown> | null;
  meta_progression?: {
    insight_points?: number;
    runs_completed?: number;
    total_clues?: number;
    total_combats_won?: number;
    total_combats_lost?: number;
    unlocked_skills?: string[];
    learned_skills?: string[];
    [key: string]: unknown;
  } | null;
  unlocked_lore: UnlockedLore[];
  cutscene_gallery?: CutsceneGalleryEntry[];
  narrative_metrics?: {
    counts?: Record<string, number>;
    total?: number;
    degraded?: number;
    success_ratio?: number;
    degraded_ratio?: number;
    last_outcome?: string;
  } | null;
}

export interface WebSocketMessage {
  type: "token" | "snapshot" | "visual_status" | "error";
  content?: string;
  data?: RuntimeSnapshot;
  detail?: string;
  status?: "pending" | "processing" | "succeeded" | string;
  url?: string;
}

export interface CombatCinemaContext {
  attacker: CombatBlip;
  defender: CombatBlip;
  damage: number;
  kind: "attack" | "skill" | "defend";
  crit: boolean;
  skillName?: string;
  miss?: boolean;
}

export type CombatCinemaCue = "enter" | "windup" | "impact" | "exit";
