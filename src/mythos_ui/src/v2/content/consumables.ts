// Mythos 2.0 — consumables (free to use in combat, max 3 carried). Pure data.

import type { ConsumableDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'nanopatch',
    name: t('나노 패치', 'Nanopatch'),
    text: t('아군 하나 회복 8.', 'An ally heals 8.'),
    icon: 'items/nanopatch.png',
    target: { mode: 'ally', range: 3 },
    effects: [{ kind: 'heal', amount: 8 }],
    price: 40,
    rarity: 'common',
  },
  {
    id: 'emp_grenade',
    name: t('EMP 수류탄', 'EMP Grenade'),
    text: t('십자 범위: 피해 2, 감전 1.', 'Cross area: deal 2, Shock 1.'),
    icon: 'items/emp_grenade.png',
    target: { mode: 'lob', minRange: 1, range: 4 },
    effects: [
      { kind: 'damage', amount: 2, area: 'cross' },
      { kind: 'status', status: 'shock', amount: 1, area: 'cross' },
    ],
    price: 55,
    rarity: 'uncommon',
  },
  {
    id: 'cryo_grenade',
    name: t('냉각 수류탄', 'Cryo Grenade'),
    text: t('십자 범위: 피해 3, 약화 2.', 'Cross area: deal 3, Weak 2.'),
    icon: 'items/cryo_grenade.png',
    target: { mode: 'lob', minRange: 1, range: 4 },
    effects: [
      { kind: 'damage', amount: 3, area: 'cross' },
      { kind: 'status', status: 'weak', amount: 2, area: 'cross' },
    ],
    price: 45,
    rarity: 'common',
  },
  {
    id: 'incendiary_grenade',
    name: t('소이 수류탄', 'Incendiary Grenade'),
    text: t('십자 범위 화상 4.', 'Cross area: Burn 4.'),
    icon: 'items/incendiary_grenade.png',
    target: { mode: 'lob', minRange: 1, range: 4 },
    effects: [{ kind: 'status', status: 'burn', amount: 4, area: 'cross' }],
    price: 50,
    rarity: 'common',
  },
  {
    id: 'stim_shard',
    name: t('자극제 조각', 'Stim Shard'),
    text: t('에너지 +2.', 'Gain 2 energy.'),
    icon: 'items/stim_shard.png',
    target: { mode: 'none' },
    effects: [{ kind: 'energy', amount: 2 }],
    price: 45,
    rarity: 'common',
  },
  {
    id: 'overload_stim',
    name: t('과부하 자극제', 'Overload Stim'),
    text: t('카드 3장 뽑기. 에너지 +1.', 'Draw 3. Gain 1 energy.'),
    icon: 'items/overload_stim.png',
    target: { mode: 'none' },
    effects: [
      { kind: 'draw', amount: 3 },
      { kind: 'energy', amount: 1 },
    ],
    price: 60,
    rarity: 'uncommon',
  },
  {
    id: 'restart_core',
    name: t('재시동 코어', 'Restart Core'),
    text: t('모든 아군 회복 10.', 'All allies heal 10.'),
    icon: 'items/restart_core.png',
    target: { mode: 'none' },
    effects: [{ kind: 'heal', amount: 10, to: 'all_allies' }],
    price: 70,
    rarity: 'rare',
  },
  {
    id: 'stealth_cloak',
    name: t('은신 망토', 'Stealth Cloak'),
    text: t('모든 아군 방어막 6. 모두 다시 이동 가능.', 'All allies gain 6 block and may move again.'),
    icon: 'items/stealth_cloak.png',
    target: { mode: 'none' },
    effects: [
      { kind: 'block', amount: 6, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
    ],
    price: 55,
    rarity: 'uncommon',
  },
]
