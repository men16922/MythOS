import { inStatVoiceRange, statVoiceRanges } from "./statVoice";
import type { RuntimeSnapshot, ScenarioCharacter } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Nouns that name a person's OWN speech. A possessive in front of one of these
// is the speaker, not a modifier pointing at somebody else.
const SPEECH_NOUNS_EN =
  "voice|voices|tone|tones|word|words|reply|replies|answer|answers|question|" +
  "questions|whisper|whispers|murmur|murmurs|growl|growls|laugh|laughter|hiss|" +
  "retort|response|shout|call|breath";
const SPEECH_NOUNS_KO = "목소리|음성|말|말투|대답|속삭임|웃음|외침|한숨";
const POSSESSIVE_SPEECH = new RegExp(
  `^(?:['’]s\\s+(?:${SPEECH_NOUNS_EN})\\b|의\\s*(?:${SPEECH_NOUNS_KO}))`,
  "i"
);

/** Does a possessive right after the name point at a *different* entity?
 *
 * Owner rule 2026-07-11 ("린위에의 부하가 말하는데 린위에로 표기"): a name in the
 * possessive is normally a modifier — "린위에의 부하" / "Lin-yue's henchman" is
 * somebody else, so it must not count as the speaker. But that guard was written
 * against Korean `의 + 사람` and over-generalised: both languages put the
 * *speaker* in the possessive when the following noun is that person's own
 * speech ("the Administrator's voice echoes", "세린의 목소리가 갈라진다"), which
 * is the ordinary English attribution form. Rejecting those matched nobody, so
 * the paragraph fell through to whatever other character it named — live EN
 * evidence 2026-08-08: an Administrator IX line rendered on Han's portrait.
 */
function possessiveShadows(rest: string): boolean {
  if (!/^(?:의|['’]s)/.test(rest)) return false;
  return !POSSESSIVE_SPEECH.test(rest);
}

/** Offsets just past every mention of `rawKeyword` that counts as the character:
 * word-bounded, and not shadowed by a possessive pointing at something else.
 * Returned as end offsets because every caller needs to read what FOLLOWS the
 * name — the possessive, or a speech cue. */
export function keywordHits(haystack: string, rawKeyword: string): number[] {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return [];
  // Avoid false positives like the character "한" matching ordinary Korean text
  // ("한 명", "한 번", etc.). Short Korean names need another alias/keyword.
  if (keyword.length === 1 && /[가-힣]/.test(keyword)) return [];
  // The right-hand boundary stays zero-width so the text after the name is
  // readable. One shadowed mention does not disqualify the name — a later plain
  // mention still counts.
  const pattern = /^[a-z0-9_-]+$/i.test(keyword)
    ? `(?:^|[^a-z0-9_-])${escapeRegExp(keyword)}(?![a-z0-9_-])`
    : escapeRegExp(keyword);
  const scan = new RegExp(pattern, "g");
  const ends: number[] = [];
  for (let hit = scan.exec(haystack); hit; hit = scan.exec(haystack)) {
    const end = hit.index + hit[0].length;
    if (!possessiveShadows(haystack.slice(end))) ends.push(end);
  }
  return ends;
}

export function keywordMatches(haystack: string, rawKeyword: string): boolean {
  return keywordHits(haystack, rawKeyword).length > 0;
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
// English attribution puts the comma INSIDE the quote and the stop after the
// attribution — `"We should go," Se-rin says.` — so the spoken line carries no
// sentence punctuation of its own and failed the test above. Measured on the
// 2026-08-08 banked arm: 5 of 15 quoted spans (33%) end this way and rendered as
// plain prose instead of a dialogue callout. A trailing comma is punctuation the
// term-emphasis spans this test exists to exclude ('최적화') never carry.
const ATTRIBUTION_COMMA = /,\s*$/;

function isSpokenLine(body: string): boolean {
  return SPEECH_PUNCTUATION.test(body) || ATTRIBUTION_COMMA.test(body);
}

// English narration writes contractions and possessives with the same character
// the Korean prose uses to delimit speech ("You're", "sector's" vs '이 구역은 …').
// A word-internal apostrophe is never a quote mark, so it must not open or close
// a span — otherwise the segmenter opens at "You'" and closes at "sector'",
// splitting both words across a dialogue callout (live EN evidence 2026-08-08:
// narration `"You` + bubble `'re cutting it close, ghost," …`).
const APOSTROPHE_LIKE = new Set(["'", "’"]);
const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD_CHAR.test(ch);
}

function isIntraWordApostrophe(text: string, index: number): boolean {
  if (!APOSTROPHE_LIKE.has(text[index])) return false;
  return isWordChar(text[index - 1]) && isWordChar(text[index + 1]);
}

/** A quote opens at a word boundary; an apostrophe glued to the end of a word is
 * a contraction or possessive ("don't", "riders'"), not an opening quote. */
function opensQuote(text: string, index: number): boolean {
  if (!APOSTROPHE_LIKE.has(text[index])) return true;
  return !isWordChar(text[index - 1]);
}

/** Matching closer, skipping contraction apostrophes ("sector's") so a span ends
 * at a real closing quote instead of mid-word. */
function findClosingQuote(text: string, closer: string, from: number): number {
  let at = text.indexOf(closer, from);
  while (at > -1 && isIntraWordApostrophe(text, at)) {
    at = text.indexOf(closer, at + 1);
  }
  return at;
}

export interface ParagraphSpeech {
  /** Paragraph contains at least one sentence-like quoted span (spoken line). */
  hasDialogue: boolean;
  /** Paragraph text with every quoted span removed — the attribution text
   * ("세린이 속삭였다") where the speaker's name lives. Names that appear only
   * inside someone else's quote don't count as the speaker. */
  outsideQuotes: string;
}

export function analyzeParagraph(paragraph: string): ParagraphSpeech {
  // Stat-voice monologue quotes — (관측: "…") — are NOT dialogue: skip them so a
  // stat check never counts as a spoken line or gets attributed to a character.
  const statRanges = statVoiceRanges(paragraph);
  let outside = "";
  let hasDialogue = false;
  let i = 0;
  while (i < paragraph.length) {
    const ch = paragraph[i];
    const pair = QUOTE_PAIRS.find(([open]) => open === ch);
    if (pair && opensQuote(paragraph, i) && !inStatVoiceRange(i, statRanges)) {
      const end = findClosingQuote(paragraph, pair[1], i + 1);
      if (end > i) {
        if (isSpokenLine(paragraph.slice(i + 1, end))) hasDialogue = true;
        i = end + 1;
        continue;
      }
    }
    outside += ch;
    i += 1;
  }
  return { hasDialogue, outsideQuotes: outside };
}

export type ParagraphSegment =
  | { kind: "speech"; text: string }
  | { kind: "narration"; text: string };

// Split a paragraph into ordered segments so the dialogue callout shows ONLY the
// spoken line (owner 2026-07-11: the bubble was rendering the whole paragraph —
// action lines + attribution mixed in). Sentence-like quoted spans become
// `speech`; everything else (attribution prose, action beats, single-quote term
// emphasis like '최적화') stays `narration`. Order is preserved so a
// quote / action / quote paragraph renders bubble, prose, bubble.
export function segmentParagraph(paragraph: string): ParagraphSegment[] {
  // Stat-voice monologue quotes — (관측: "…") — stay in narration so the renderer
  // styles them as inner monologue; only NON-stat quotes segment as speech.
  const statRanges = statVoiceRanges(paragraph);
  const segments: ParagraphSegment[] = [];
  let narration = "";
  const flush = () => {
    if (narration.trim()) segments.push({ kind: "narration", text: narration.trim() });
    narration = "";
  };
  let i = 0;
  while (i < paragraph.length) {
    const ch = paragraph[i];
    const pair = QUOTE_PAIRS.find(([open]) => open === ch);
    if (pair && opensQuote(paragraph, i) && !inStatVoiceRange(i, statRanges)) {
      const end = findClosingQuote(paragraph, pair[1], i + 1);
      if (end > i) {
        if (isSpokenLine(paragraph.slice(i + 1, end))) {
          flush();
          segments.push({ kind: "speech", text: paragraph.slice(i, end + 1) });
        } else {
          // Not sentence-like (Korean term emphasis such as '최적화'): keep it as
          // narration, but consume the WHOLE span. Resuming inside it would let
          // the span's closing mark be read as the next opening mark, so the
          // following attribution prose became the bubble while the real spoken
          // line stayed narration (live EN evidence 2026-08-08).
          narration += paragraph.slice(i, end + 1);
        }
        i = end + 1;
        continue;
      }
    }
    narration += ch;
    i += 1;
  }
  flush();
  return segments;
}

// Words that mark a name as the one *speaking*, rather than merely present.
// Both languages put the cue right after the name — English as a verb or a
// possessive speech noun ("Se-rin says", "the Administrator's voice echoes"),
// Korean clause-final ("세린이 속삭였다", "관리자의 목소리가 울린다").
const SPEECH_CUE_EN =
  "said|says|say|spoke|speaks|echoes|echoed|mutters|muttered|whispers|" +
  "whispered|replies|replied|answers|answered|asks|asked|adds|added|" +
  "continues|continued|calls|called|murmurs|murmured|growls|growled|snaps|" +
  "snapped|hisses|hissed|shouts|shouted|breathes|breathed|offers|offered|" +
  "voice|tone|words|reply|question|whisper|murmur|laugh";
const SPEECH_CUE_KO =
  "말했|말한|말하|속삭|중얼|외쳤|외친|덧붙|물었|답했|대답|울린|울렸|목소리|음성|되뇌|내뱉";
const SPEECH_CUE = new RegExp(`(?:\\b(?:${SPEECH_CUE_EN})\\b|${SPEECH_CUE_KO})`, "i");
// How far past the name the cue may sit. Long enough for "the Administrator's
// voice echoes, devoid of anger…", short enough that the next sentence's verb
// does not attach to the previous sentence's name.
const SPEECH_CUE_WINDOW = 60;

/** Is this character named *and* carrying a speech cue in `text`? */
function isAttributed(text: string, character: ScenarioCharacter): boolean {
  return character.keywords.some((keyword) =>
    keywordHits(text, keyword).some((end) =>
      SPEECH_CUE.test(text.slice(end, end + SPEECH_CUE_WINDOW))
    )
  );
}

function firstNamed(text: string, characters: ScenarioCharacter[]): ScenarioCharacter | null {
  for (const character of characters) {
    if (character.keywords.some((kw) => keywordMatches(text, kw))) return character;
  }
  return null;
}

// 한 문단의 화자를 찾는다 — 대사 인용문이 있고 지문(인용부 밖)에 이름이 있는
// 인물. StoryPanel의 대사 말풍선(썸네일+대사 분리 표시)과 CHARACTER 패널이
// 같은 판정을 공유한다 (오너 규칙 2026-07-11).
//
// A paragraph routinely names a second character who only *reacts* to the line
// ("Han grips his weapon tighter"). Scanning the whole attribution text and
// taking the first hit let the scenario's character array order decide the
// speaker, so a boss line rendered on an ally's portrait (live EN evidence
// 2026-08-08, turn 50). Prefer the name that carries a speech cue; fall back to
// the previous any-name behaviour when nothing is attributed, which keeps simple
// single-character paragraphs rendering exactly as before.
export function speakerForParagraph(
  paragraph: string,
  characters?: ScenarioCharacter[]
): ScenarioCharacter | null {
  if (!characters || characters.length === 0) return null;
  const speech = analyzeParagraph(paragraph);
  if (!speech.hasDialogue) return null;
  const haystack = speech.outsideQuotes.toLowerCase();
  for (const character of characters) {
    if (isAttributed(haystack, character)) return character;
  }
  return firstNamed(haystack, characters);
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

  // Same judgment as the dialogue callout, paragraph by paragraph (owner rule
  // 2026-07-11: the bubble and the CHARACTER panel must not disagree). Taking
  // the first paragraph that yields a speaker means the scene partner is the
  // first character to actually say something, instead of whoever happened to
  // sit earliest in the scenario's character array.
  const portrayed = characters.filter((c) => Boolean(c.portrait));
  if (portrayed.length === 0) return null;
  for (const paragraph of (scene.narration || "").split(/\n+/)) {
    const speaker = speakerForParagraph(paragraph, portrayed);
    if (speaker) return speaker;
  }
  return null;
}
