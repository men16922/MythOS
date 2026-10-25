// Paradox (difficulty) levels 1-5. Levels are cumulative: Paradox N applies every level <= N.
// The engine implements the semantics; texts must stay exact to them.
import type { ParadoxDef } from '../engine/types.ts'

export const PARADOX: ParadoxDef[] = [
  {
    level: 1,
    name: { ko: '두꺼운 장갑', en: 'Hardened Shells' },
    text: { ko: '정예와 보스의 체력 +20%.', en: 'Elites and bosses have +20% HP.' },
  },
  {
    level: 2,
    name: { ko: '심어진 잡음', en: 'Seeded Static' },
    text: {
      ko: '루프를 시작할 때 덱에 정크 카드 ‘잡음’ 1장이 섞여 있다.',
      en: 'Start each loop with a Static junk card in your deck.',
    },
  },
  {
    level: 3,
    name: { ko: '먼저 온 시선', en: 'Watched from the Start' },
    text: {
      ko: '추적도가 20에서 시작하고, 노드에 들어설 때마다 5씩 오른다.',
      en: 'Trace starts at 20 and rises +5 per node.',
    },
  },
  {
    level: 4,
    name: { ko: '날 선 손', en: 'Sharpened Hands' },
    text: { ko: '모든 적의 피해 +1.', en: 'All enemies deal +1 damage.' },
  },
  {
    level: 5,
    name: { ko: '식은 밥', en: 'Cold Rice' },
    text: {
      ko: '은신처 휴식은 체력을 20%만 회복한다. 정예·보스의 분노가 2턴부터 쌓인다.',
      en: 'Safehouse rest heals only 20%. Elites and bosses build Rage from turn 2.',
    },
  },
  // DLC update (2026-10-26): Paradox 6–10, the expert ceiling (greedy bot target ~55 % at 10).
  {
    level: 6,
    name: { ko: '날 선 분노', en: 'Honed Fury' },
    text: { ko: '정예·보스의 분노가 매번 1씩 더 쌓인다.', en: 'Elites and bosses build 1 more Rage each time.' },
  },
  {
    level: 7,
    name: { ko: '비싼 밤', en: 'Expensive Night' },
    text: { ko: '암시장 가격 +20%.', en: 'Black-market prices +20%.' },
  },
  {
    level: 8,
    name: { ko: '두꺼운 핵', en: 'Thick Cores' },
    text: { ko: '보스의 체력 +20%.', en: 'Bosses have +20% HP.' },
  },
  {
    level: 9,
    name: { ko: '먼저 온 추적', en: 'Tracked Ahead' },
    text: { ko: '막이 바뀔 때마다 추적도 +10.', en: 'Trace +10 at the start of every act.' },
  },
  {
    level: 10,
    name: { ko: 'IX가 학습한다', en: 'IX Learns' },
    text: { ko: '모든 적의 피해가 1 더 늘어난다.', en: 'All enemies deal 1 more damage.' },
  },
]
