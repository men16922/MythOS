import type { RuntimeSnapshot, ScenarioCharacter } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(haystack: string, rawKeyword: string): boolean {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return false;
  // Avoid false positives like the character "한" matching ordinary Korean text
  // ("한 명", "한 번", etc.). Short Korean names need another alias/keyword.
  if (keyword.length === 1 && /[가-힣]/.test(keyword)) return false;
  if (/^[a-z0-9_-]+$/i.test(keyword)) {
    return new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(keyword)}([^a-z0-9_-]|$)`).test(
      haystack
    );
  }
  return haystack.includes(keyword);
}

// 현재 장면에 명확히 등장한 대화 상대를 키워드로 탐지한다.
// 시장 노드에서는 벤더(예: 린위에)가 장면의 "상대"이므로, 서사에 등장했다면
// 레지스트리 순서(세린 우선)보다 벤더를 먼저 보여준다.
export function detectSceneCharacter(
  snapshot: RuntimeSnapshot | null,
  characters?: ScenarioCharacter[]
): ScenarioCharacter | null {
  if (!characters || characters.length === 0) return null;
  const scene = snapshot?.active_scene;
  if (!scene) return null;
  const haystack = `${scene.title} ${scene.location} ${scene.narration} ${
    scene.visual_brief || ""
  }`.toLowerCase();

  const matches = (character: ScenarioCharacter) =>
    Boolean(character.portrait) &&
    character.keywords.some((kw) => keywordMatches(haystack, kw));

  const vendorName = snapshot?.market?.vendor?.name?.toLowerCase();
  if (vendorName) {
    // Deterministic (LLM-independent): while the barter dock is open, the market's
    // vendor IS the face the player is dealing with at this node — show her even
    // when the LLM prose didn't name her this turn (live 2026-07-04: Gemini kept
    // omitting Lin-yue despite the naming directive).
    const vendor = characters.find(
      (c) => c.name?.toLowerCase() === vendorName && Boolean(c.portrait)
    );
    if (vendor) return vendor;
  }

  for (const character of characters) {
    if (matches(character)) return character;
  }
  return null;
}
