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
  for (const character of characters) {
    if (!character.portrait) continue;
    if (character.keywords.some((kw) => keywordMatches(haystack, kw))) {
      return character;
    }
  }
  return null;
}
