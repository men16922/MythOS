// 첫 등장 용어 주석 (2026-07-10 clarity audit follow-up, deterministic half).
// directives/naming.md의 "첫 등장 주석" 규칙은 LLM 준수라 보증이 없다 — 여기는
// 그 결정적 보증: 용어집(glossary.ts) 용어가 이번 세션 서사에 처음 등장하면
// 지문 아래 한 줄 정의 칩을 렌더한다. 도감을 열지 않아도 뜻이 잡히게.
// 장면당 상한으로 오프닝 홍수를 막고, 넘친 용어는 다음 등장 장면에서 소개된다.
import { glossaryFor, type GlossaryEntry } from "./glossary";
import type { Lang } from "./i18n/lang";

/** Max gloss chips per scene — openings mention many terms at once; introduce
 *  the overflow at its next appearance instead of dumping a lexicon. */
export const MAX_GLOSS_PER_SCENE = 2;

// KO terms are matched as substrings, which is hazardous for short terms:
// a match is rejected when the PRECEDING char is Hangul (쇼핑/타이핑/매핑 → 핑),
// plus per-term compounds that share the leading syllable (핑계 → 핑).
const KO_FALSE_COMPOUNDS: Record<string, string[]> = {
  ping: ["핑계", "핑퐁"],
};

const HANGUL = /[가-힣]/;

function matchesKo(text: string, entry: GlossaryEntry): boolean {
  const term = entry.term.ko;
  let from = 0;
  for (;;) {
    const idx = text.indexOf(term, from);
    if (idx < 0) return false;
    from = idx + 1;
    if (idx > 0 && HANGUL.test(text[idx - 1])) continue; // 쇼핑, 매핑 …
    const compounds = KO_FALSE_COMPOUNDS[entry.id] ?? [];
    if (compounds.some((c) => text.startsWith(c, idx))) continue; // 핑계 …
    return true;
  }
}

function matchesEn(text: string, entry: GlossaryEntry): boolean {
  const term = entry.term.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${term}\\b`, "i").test(text);
}

/** Pure detection: glossary entries whose term appears in `text` (order = glossary order). */
export function detectGlossTerms(
  text: string,
  scenarioId: string,
  lang: Lang
): GlossaryEntry[] {
  if (!text) return [];
  const match = lang === "en" ? matchesEn : matchesKo;
  return glossaryFor(scenarioId).filter((entry) => match(text, entry));
}

// --- first-use bookkeeping -------------------------------------------------
// Seen-set is per SESSION (sessionStorage): a returning player gets a fresh
// round of first-use glosses next session, but never twice in one sitting.
// Scene cache keeps a scene's chips stable across re-renders/tab switches
// even though its terms are already marked seen.

const seenKey = (scenarioId: string, lang: Lang) =>
  `mythos.termGloss.seen.${scenarioId}.${lang}`;

function loadSeen(scenarioId: string, lang: Lang): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(seenKey(scenarioId, lang));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistSeen(scenarioId: string, lang: Lang, seen: Set<string>): void {
  try {
    window.sessionStorage.setItem(seenKey(scenarioId, lang), JSON.stringify([...seen]));
  } catch {
    // storage unavailable (private mode etc.) — glosses simply repeat per render cycle.
  }
}

const sceneCache = new Map<string, GlossaryEntry[]>();

/** First-use gloss entries for a finalized scene (cached per scene id).
 *  Computing for a NEW scene marks its terms seen for the rest of the session. */
export function firstUseTermsForScene(
  sceneId: string,
  narration: string,
  scenarioId: string,
  lang: Lang
): GlossaryEntry[] {
  if (!sceneId || !narration) return [];
  const cacheId = `${scenarioId}:${lang}:${sceneId}`;
  const cached = sceneCache.get(cacheId);
  if (cached) return cached;
  const seen = loadSeen(scenarioId, lang);
  const fresh = detectGlossTerms(narration, scenarioId, lang)
    .filter((e) => !seen.has(e.id))
    .slice(0, MAX_GLOSS_PER_SCENE);
  if (fresh.length > 0) {
    fresh.forEach((e) => seen.add(e.id));
    persistSeen(scenarioId, lang, seen);
  }
  sceneCache.set(cacheId, fresh);
  return fresh;
}

/** Test hook: reset module state (scene cache; callers clear sessionStorage). */
export function resetTermGlossForTests(): void {
  sceneCache.clear();
}
