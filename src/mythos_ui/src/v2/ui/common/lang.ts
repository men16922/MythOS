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
