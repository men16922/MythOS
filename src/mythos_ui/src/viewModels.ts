import type {
  MemoryOverview,
  NarrativeShard,
  EchoItem,
  RunSummary,
  RuntimeSnapshot,
  ScenarioEnding,
  ScenarioInfo,
  ScenarioSkill,
} from "./types";

interface LoreItem {
  title: string;
  desc: string;
}

export interface SkillTreeItem extends ScenarioSkill {
  status: "learned" | "unlocked" | "locked";
  rank: number;
}

export interface CodexLists {
  clues: NarrativeShard[];
  allLore: LoreItem[];
  inventory: string[];
  characters: NarrativeShard[];
  echoes: EchoItem[];
  insightPoints: number;
  skills: SkillTreeItem[];
}

export interface DevConsoleData {
  scores: Record<"Humanity" | "Insight" | "Resilience" | "Dominance", number>;
  flags: string[];
  endings: ScenarioEnding[];
  activeEndingId: unknown;
  narrativeMetrics: MemoryOverview["narrative_metrics"] | null;
}

export interface EpiphanyNotice {
  loopId: string;
  skills: { name: string; hint: string }[];
}

const UNLOCKED_SKILL_PREFIX = "unlocked_skills:";

/**
 * Surface the skills newly unlocked ("깨달음") by the most recent archived run,
 * resolving readable names + hints from the run's scenario skill definitions.
 */
export function buildEpiphanyNotice(
  runs: RunSummary[],
  scenarios: ScenarioInfo[]
): EpiphanyNotice | null {
  const latest = runs[0];
  if (!latest) return null;
  const skillIds = (latest.unlocks_granted || [])
    .filter((g) => g.startsWith(UNLOCKED_SKILL_PREFIX))
    .map((g) => g.slice(UNLOCKED_SKILL_PREFIX.length));
  if (skillIds.length === 0) return null;
  const skillDefs = scenarios.find((s) => s.id === latest.scenario_id)?.skills || [];
  const skills = skillIds.map((id) => {
    const def = skillDefs.find((s) => s.id === id);
    return { name: def?.name || id, hint: def?.unlock_hint || "" };
  });
  return { loopId: latest.loop_id, skills };
}

function echoItems(value: unknown): EchoItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      item &&
      typeof item === "object" &&
      "symbol" in item &&
      "text" in item &&
      typeof item.symbol === "string" &&
      typeof item.text === "string"
    ) {
      return [{ symbol: item.symbol, text: item.text }];
    }
    return [];
  });
}

export function buildCodexLists(
  memoryOverview: MemoryOverview | null,
  snapshot: RuntimeSnapshot | null,
  scenario?: ScenarioInfo
): CodexLists | null {
  if (!memoryOverview) return null;

  const shards = memoryOverview.narrative_shards || [];
  const unlockedLore = memoryOverview.unlocked_lore || [];
  const clues = shards.filter((s) => s.kind === "clue");
  const lore = shards.filter((s) => s.kind === "lore");
  const characters = shards.filter((s) => s.kind === "character");
  const allLore = [
    ...lore.map((entry) => ({ title: entry.symbol, desc: entry.text })),
    ...unlockedLore.map((entry) => ({ title: entry.title, desc: entry.summary })),
  ];

  const meta = snapshot?.state?.meta_progression;
  const metaObj = meta && typeof meta === "object" ? meta as Record<string, unknown> : {};
  const learned = new Set(stringList(metaObj.learned_skills));
  const unlockedSkills = new Set(stringList(metaObj.unlocked_skills));
  const ranks = skillRanks(metaObj.skill_ranks);
  const archetypeName = snapshot?.player?.traits?.archetype;
  const baseSkills = new Set(
    (scenario?.archetypes || [])
      .find((archetype) => archetype.name === archetypeName)
      ?.base_skills || []
  );
  const skills = (scenario?.skills || []).map((skill) => {
    const isLearned = learned.has(skill.id) || baseSkills.has(skill.id);
    const status: SkillTreeItem["status"] = isLearned
      ? "learned"
      : unlockedSkills.has(skill.id)
        ? "unlocked"
        : "locked";
    return {
      ...skill,
      status,
      rank: ranks[skill.id] || (isLearned ? 1 : 0),
    };
  });

  return {
    clues,
    allLore,
    inventory: snapshot?.player?.traits?.inventory || [],
    characters,
    echoes: echoItems(snapshot?.active_echoes),
    insightPoints: numberValue(metaObj.insight_points),
    skills,
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => item == null ? [] : [String(item)]);
}

function skillRanks(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const rank = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(rank)) out[key] = Math.max(1, rank);
  });
  return out;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseMetric(flags: string[], name: string): number {
  let score = 0;
  const lowerName = name.toLowerCase();
  flags.forEach((flag) => {
    if (flag.toLowerCase().includes(lowerName)) {
      const match = flag
        .toLowerCase()
        .match(new RegExp(lowerName + "\\w*[\\-_\\+]?(\\d+)"));
      score += match ? parseInt(match[1], 10) || 1 : 1;
    }
  });
  return score;
}

export function buildDevConsoleData(
  snapshot: RuntimeSnapshot | null,
  memoryOverview: MemoryOverview | null,
  scenarios: ScenarioInfo[],
  selectedScenarioId: string
): DevConsoleData | null {
  if (!snapshot) return null;

  const stateObj = snapshot.state || { flags: [] };
  const flags = stateObj.flags || [];
  const clueCount = snapshot.clues_collected || 0;
  const scenario = scenarios.find((s) => s.id === selectedScenarioId);

  return {
    scores: {
      Humanity: parseMetric(flags, "humanity"),
      Insight: parseMetric(flags, "insight") + clueCount,
      Resilience: parseMetric(flags, "resilience"),
      Dominance: parseMetric(flags, "dominance"),
    },
    flags,
    endings: scenario?.endings || [],
    activeEndingId: stateObj.ending_id || null,
    narrativeMetrics: memoryOverview?.narrative_metrics || null,
  };
}
