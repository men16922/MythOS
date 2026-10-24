// Tiny i18n helpers for Mythos 2.0. Content text is always `{ ko, en }`.

import type { Lang, Text } from '../../engine/types.ts'

export function tr(text: Text | undefined | null, lang: Lang): string {
  if (!text) return ''
  return lang === 'ko' ? text.ko || text.en : text.en || text.ko
}

/** Inline bilingual literal for UI chrome: `L('턴 종료', 'End Turn')`. */
export function L(ko: string, en: string): Text {
  return { ko, en }
}

export const STAT_LABEL: Record<string, Text> = {
  str: { ko: '근력', en: 'STR' },
  agi: { ko: '민첩', en: 'AGI' },
  int: { ko: '지능', en: 'INT' },
  cha: { ko: '매력', en: 'CHA' },
  obs: { ko: '관찰', en: 'OBS' },
}

/** True when the word's last Hangul syllable has a final consonant (받침); non-Hangul counts as yes. */
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code < 0 || code > 11171 || code % 28 !== 0
}

/** A Korean word followed by the particle that fits it: `josa('세린', '이', '가')` → '세린이'. */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  return `${word}${hasBatchim(word) ? withFinal : withoutFinal}`
}

/** "로" / "으로" after a Korean word (ㄹ 받침 takes "로"). */
export function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const plainRo = code >= 0 && code <= 11171 && (code % 28 === 0 || code % 28 === 8)
  return `${word}${plainRo ? '로' : '으로'}`
}

/** A language pinned by the page link (`?lang=en` / `?lang=ko`, e.g. a judge link), or null. */
export function langFromSearch(search: string): Lang | null {
  const v = new URLSearchParams(search).get('lang')?.trim().toLowerCase()
  return v === 'en' || v === 'ko' ? v : null
}
