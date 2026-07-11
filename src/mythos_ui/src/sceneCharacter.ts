import type { RuntimeSnapshot, ScenarioCharacter } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function keywordMatches(haystack: string, rawKeyword: string): boolean {
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

// Quote pairs the narration uses for spoken lines. Korean prose also uses
// single quotes for term emphasis ('최적화', '비식별 신호'), so a quoted span
// only counts as dialogue when it reads like a sentence (see SPEECH_PUNCTUATION).
const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["“", "”"], // “ ”
  ["‘", "’"], // ‘ ’
  ['"', '"'],
  ["'", "'"],
  ["「", "」"],
  ["『", "』"],
];

const SPEECH_PUNCTUATION = /[.!?…~—]/;

export interface ParagraphSpeech {
  /** Paragraph contains at least one sentence-like quoted span (spoken line). */
  hasDialogue: boolean;
  /** Paragraph text with every quoted span removed — the attribution text
   * ("세린이 속삭였다") where the speaker's name lives. Names that appear only
   * inside someone else's quote don't count as the speaker. */
  outsideQuotes: string;
}

export function analyzeParagraph(paragraph: string): ParagraphSpeech {
  let outside = "";
  let hasDialogue = false;
  let i = 0;
  while (i < paragraph.length) {
    const ch = paragraph[i];
    const pair = QUOTE_PAIRS.find(([open]) => open === ch);
    if (pair) {
      const end = paragraph.indexOf(pair[1], i + 1);
      if (end > i) {
        if (SPEECH_PUNCTUATION.test(paragraph.slice(i + 1, end))) hasDialogue = true;
        i = end + 1;
        continue;
      }
    }
    outside += ch;
    i += 1;
  }
  return { hasDialogue, outsideQuotes: outside };
}

// 한 문단의 화자를 찾는다 — 대사 인용문이 있고 지문(인용부 밖)에 이름이 있는
// 인물. StoryPanel의 대사 말풍선(썸네일+대사 분리 표시)과 CHARACTER 패널이
// 같은 판정을 공유한다 (오너 규칙 2026-07-11).
export function speakerForParagraph(
  paragraph: string,
  characters?: ScenarioCharacter[]
): ScenarioCharacter | null {
  if (!characters || characters.length === 0) return null;
  const speech = analyzeParagraph(paragraph);
  if (!speech.hasDialogue) return null;
  const haystack = speech.outsideQuotes.toLowerCase();
  for (const character of characters) {
    if (character.keywords.some((kw) => keywordMatches(haystack, kw))) {
      return character;
    }
  }
  return null;
}

// 현재 장면에서 "말하고 있는" 대화 상대를 탐지한다.
//
// DIALOGUE GATE (owner rule 2026-07-11): a character's portrait shows ONLY when
// that character has a spoken line this scene — a passing mention is not
// presence. The old any-mention match over title+location+narration+visual_brief
// produced two false-positive classes (owner screenshots 2026-07-11):
//  - absent-character mentions: "정세린의 숨겨진 과거 … 그녀의 서명" (a document
//    ABOUT her) showed her portrait though she isn't in the scene;
//  - hidden-text hits: visual_brief is an English image prompt the player never
//    sees, so "kai"/"rx-09" in it flashed Kai's portrait with zero on-screen text.
// Now we scan narration only, paragraph by paragraph: the character must be
// named in the attribution text of a paragraph that carries a spoken line.
// 시장 노드의 벤더는 예외(결정론적) — 흥정 도크가 열려 있는 동안 그 노드의
// "상대"는 벤더이므로 프롬프트가 이름을 생략해도 벤더를 보여준다.
export function detectSceneCharacter(
  snapshot: RuntimeSnapshot | null,
  characters?: ScenarioCharacter[]
): ScenarioCharacter | null {
  if (!characters || characters.length === 0) return null;
  const scene = snapshot?.active_scene;
  if (!scene) return null;

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

  const speakerHaystacks = (scene.narration || "")
    .split(/\n+/)
    .map(analyzeParagraph)
    .filter((p) => p.hasDialogue)
    .map((p) => p.outsideQuotes.toLowerCase());
  if (speakerHaystacks.length === 0) return null;

  const matches = (character: ScenarioCharacter) =>
    Boolean(character.portrait) &&
    speakerHaystacks.some((haystack) =>
      character.keywords.some((kw) => keywordMatches(haystack, kw))
    );

  for (const character of characters) {
    if (matches(character)) return character;
  }
  return null;
}
