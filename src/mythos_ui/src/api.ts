import type {
  ScenarioInfo,
  PlayerProfile,
  RuntimeSnapshot,
  MemoryOverview,
  SaveSlot,
  RunSummary,
  CombatState,
  CombatAction,
  SkillTreeResponse,
} from "./types";

const API_BASE = ""; // Relative to host (served on same port)

// Closed-beta invite key: taken from the page URL (?invite=KEY) on first load, then
// persisted to localStorage and forwarded on every API call + the WebSocket. When the
// backend has no MYTHOS_INVITE_KEYS set the gate is open, so this is a harmless no-op.
const INVITE_STORAGE_KEY = "mythos_invite";

export function getInviteKey(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("invite");
    if (fromUrl) {
      localStorage.setItem(INVITE_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(INVITE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function inviteHeaders(): Record<string, string> {
  const key = getInviteKey();
  return key ? { "X-Invite-Key": key } : {};
}

// Active UI language (mirrors i18n/lang.ts's storage). Forwarded on combat/snapshot
// calls so the backend localizes DATA (skill/enemy/encounter names, route labels,
// zone_risk) via the serving-boundary glossary. Backend default "ko" → no-op.
export function getLang(): string {
  try {
    const url = new URLSearchParams(window.location.search).get("lang");
    if (url === "en" || url === "ko") return url;
    return window.localStorage.getItem("mythos_lang") || "ko";
  } catch {
    return "ko";
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...inviteHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: inviteHeaders() });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGetScenarios(
  playerId?: string | null,
  lang?: string,
): Promise<{ scenarios: ScenarioInfo[] }> {
  const params = new URLSearchParams();
  if (playerId) params.set("player_id", playerId);
  if (lang) params.set("lang", lang);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiGet<{ scenarios: ScenarioInfo[] }>(`/api/v1/scenarios${query}`);
}

export async function apiConnect(params: {
  display_name: string;
  archetype?: string | null;
  scenario_id: string;
}): Promise<PlayerProfile> {
  return apiPost<PlayerProfile>("/api/v1/auth/connect", params);
}

export async function apiBegin(params: {
  player_id: string;
  scenario_id: string;
  fallback: boolean;
}): Promise<RuntimeSnapshot> {
  return apiPost<RuntimeSnapshot>("/api/v1/loops/begin", { ...params, lang: getLang() });
}

export async function apiActive(params: {
  player_id: string;
  loop_id?: string;
  scenario_id: string;
}): Promise<RuntimeSnapshot> {
  const { player_id, loop_id, scenario_id } = params;
  let url = `/api/v1/loops/active?player_id=${encodeURIComponent(player_id)}&scenario_id=${encodeURIComponent(scenario_id)}&lang=${encodeURIComponent(getLang())}`;
  if (loop_id) {
    url += `&loop_id=${encodeURIComponent(loop_id)}`;
  }
  return apiGet<RuntimeSnapshot>(url);
}

export async function apiChoose(params: {
  loop_id: string;
  scenario_id: string;
  choice_id?: string;
  action?: string;
  fallback: boolean;
}): Promise<RuntimeSnapshot> {
  return apiPost<RuntimeSnapshot>("/api/v1/loops/choose", { ...params, lang: getLang() });
}

export async function apiCombatAction(params: {
  loop_id: string;
  scenario_id: string;
  action: CombatAction;
}): Promise<{ prose?: string; combat: CombatState }> {
  return apiPost<{ prose?: string; combat: CombatState }>("/api/v1/combat/action", {
    ...params,
    lang: getLang(),
  });
}

export async function apiCombatBegin(params: {
  loop_id: string;
  scenario_id: string;
  encounter_id: string;
  party_members?: { id: string }[];
}): Promise<{ combat: CombatState }> {
  return apiPost<{ combat: CombatState }>("/api/v1/combat/begin", { ...params, lang: getLang() });
}

export async function apiEquip(params: {
  loop_id: string;
  item_id: string;
  equipped: boolean;
}): Promise<RuntimeSnapshot> {
  return apiPost<RuntimeSnapshot>(
    `/api/v1/loops/${encodeURIComponent(params.loop_id)}/equip`,
    params
  );
}

export async function apiResolveAsset(storageUri: string): Promise<{ url: string }> {
  return apiPost<{ url: string }>("/api/v1/assets/resolve", { storage_uri: storageUri });
}

export async function apiGetMemory(playerId: string): Promise<MemoryOverview> {
  return apiGet<MemoryOverview>(`/api/v1/memory?player_id=${encodeURIComponent(playerId)}`);
}

export async function apiGetSlots(playerId: string): Promise<{ slots: SaveSlot[] }> {
  return apiGet<{ slots: SaveSlot[] }>(`/api/v1/save-slots?player_id=${encodeURIComponent(playerId)}`);
}

export async function apiSaveSlot(params: {
  loop_id: string;
  label?: string | null;
}): Promise<SaveSlot> {
  return apiPost<SaveSlot>("/api/v1/save-slots", params);
}

export async function apiGetRuns(playerId: string): Promise<{ runs: RunSummary[] }> {
  return apiGet<{ runs: RunSummary[] }>(`/api/v1/runs?player_id=${encodeURIComponent(playerId)}`);
}

export async function apiGetSkillTree(
  playerId: string,
  scenarioId: string
): Promise<SkillTreeResponse> {
  return apiGet<SkillTreeResponse>(
    `/api/v1/players/${encodeURIComponent(playerId)}/skills?scenario_id=${encodeURIComponent(scenarioId)}`
  );
}

export async function apiLearnSkill(params: {
  player_id: string;
  scenario_id: string;
  skill_id: string;
}): Promise<SkillTreeResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/players/${encodeURIComponent(params.player_id)}/skills/learn`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...inviteHeaders() },
      body: JSON.stringify({
        scenario_id: params.scenario_id,
        skill_id: params.skill_id,
      }),
    }
  );
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.detail === "string") detail = data.detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }
  return res.json() as Promise<SkillTreeResponse>;
}

export interface LoopSceneRecord {
  sceneId: string;
  title: string;
  text: string;
  turnIndex: number;
  sceneType: string;
  action?: string | null;
}

export async function apiGetLoopScenes(loopId: string): Promise<{ scenes: LoopSceneRecord[] }> {
  return apiGet<{ scenes: LoopSceneRecord[] }>(`/api/v1/loops/${encodeURIComponent(loopId)}/scenes`);
}

export function getWebSocketUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const key = getInviteKey();
  const query = key ? `?invite=${encodeURIComponent(key)}` : "";
  return `${proto}://${window.location.host}/api/v1/loops/stream${query}`;
}
