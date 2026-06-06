import type {
  MemoryOverview,
  NarrativeShard,
  RuntimeSnapshot,
  ScenarioEnding,
  ScenarioInfo,
} from "./types";

interface LoreItem {
  title: string;
  desc: string;
}

interface EchoItem {
  symbol: string;
  text: string;
}

export interface CodexLists {
  clues: NarrativeShard[];
  allLore: LoreItem[];
  inventory: string[];
  characters: NarrativeShard[];
  echoes: EchoItem[];
}

export interface DevConsoleData {
  scores: Record<"Humanity" | "Insight" | "Resilience" | "Dominance", number>;
  flags: string[];
  endings: ScenarioEnding[];
  activeEndingId: unknown;
  narrativeMetrics: MemoryOverview["narrative_metrics"] | null;
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
  snapshot: RuntimeSnapshot | null
): CodexLists | null {
  if (!memoryOverview) return null;

  const shards = memoryOverview.narrative_shards || [];
  const unlocked = memoryOverview.unlocked_lore || [];
  const clues = shards.filter((s) => s.kind === "clue");
  const lore = shards.filter((s) => s.kind === "lore");
  const characters = shards.filter((s) => s.kind === "character");
  const allLore = [
    ...lore.map((entry) => ({ title: entry.symbol, desc: entry.text })),
    ...unlocked.map((entry) => ({ title: entry.title, desc: entry.summary })),
  ];

  return {
    clues,
    allLore,
    inventory: snapshot?.player?.traits?.inventory || [],
    characters,
    echoes: echoItems(snapshot?.state?.active_echoes),
  };
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
