// Mythos 2.0 — playable archetypes (the Connector's loadout). Pure data.
//
// Builds each archetype supports (cards + implants):
//   Ghost          — push/bump chains into void · blink hit-and-run · mark assassin
//   Data Smuggler  — hack/turncoat (enemies shoot each other) · credits economy · loud energy bursts
//   Echo Collector — fortress (guard + thorns) · companion bond (party-wide shields/heals) · sustain

import type { ArchetypeDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const BASICS = ['packet_shot', 'packet_shot', 'packet_shot', 'covering_noise', 'covering_noise', 'covering_noise', 'shove']

export const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'ghost',
    name: t('유령 신호', 'Ghost Signal'),
    tagline: t('보이지 않으면 맞지 않는다.', "What they can't see, they can't hit."),
    description: t(
      '관리망에서 지워진 접속자. 순간이동으로 파고들고, 밀쳐내기로 적을 저희끼리의 사선으로, 아니면 허공으로 몰아넣는다.',
      'A connector erased from the network. Blinks and shoves enemies into each other’s fire — and off the edge.',
    ),
    stats: { str: 3, agi: 6, int: 4, cha: 2, obs: 5 },
    maxHp: 34,
    startingDeck: [...BASICS, 'signal_step', 'repulse', 'magnetic_pull'],
    startingImplant: 'erased_id',
    startingCredits: 80,
    startUnlocked: true,
    sprite: 'ghost',
    burst: {
      name: t('공허 붕괴', 'Void Collapse'),
      text: t('모든 적을 1칸 밀쳐낸다. 부딪히면 충돌 피해 +2.', 'Push every enemy 1 tile away. Bumps deal +2.'),
      effects: [{ kind: 'push', dir: 'away', distance: 1, to: 'all_enemies', slam: 2 }],
    },
  },
  {
    id: 'smuggler',
    name: t('데이터 밀수꾼', 'Data Smuggler'),
    tagline: t('남의 총도 내 총이다.', "Their guns are my guns."),
    description: t(
      '암시장 해커. 적의 공격을 뒤집어 놈들끼리 쏘게 만들고, 싸우는 와중에도 크레딧을 챙긴다.',
      'A black-market hacker. Flips enemy attacks onto their own side and pockets credits mid-fight.',
    ),
    stats: { str: 3, agi: 3, int: 6, cha: 5, obs: 3 },
    maxHp: 35,
    startingDeck: [...BASICS, 'system_hack', 'skim', 'overclock'],
    startingImplant: 'overclocked_deck',
    startingCredits: 99,
    sprite: 'smuggler',
    burst: {
      name: t('총체적 탈취', 'Total Hijack'),
      text: t('모든 적의 공격 방향을 뒤집고, 모든 적에게 표식 2.', "Turn every enemy's attack around. Mark 2 on every enemy."),
      effects: [
        { kind: 'redirect', to: 'all_enemies' },
        { kind: 'status', status: 'mark', amount: 2, to: 'all_enemies' },
      ],
    },
  },
  {
    id: 'echo_collector',
    name: t('잔향 수집가', 'Echo Collector'),
    tagline: t('아무도 두고 가지 않는다.', 'Nobody gets left behind.'),
    description: t(
      '죽은 이들의 기억을 주워 모으는 사람. 방어막과 회복으로 동료를 붙들고, 끝까지 버텨서 이긴다.',
      "Keeps the memories of the dead. Holds the crew together with shields and patches, and wins by outlasting.",
    ),
    stats: { str: 2, agi: 2, int: 4, cha: 7, obs: 5 },
    maxHp: 36,
    startingDeck: [...BASICS, 'patch_protocol', 'shield_field', 'memory_resonance'],
    startingImplant: 'cracked_cube',
    startingCredits: 60,
    sprite: 'echo_collector',
    burst: {
      name: t('함께 걸은 길', 'The Road We Walked'),
      text: t('모든 아군 방어막 8, 회복 4.', 'Every ally gains 8 block and heals 4.'),
      effects: [
        { kind: 'block', amount: 8, to: 'all_allies' },
        { kind: 'heal', amount: 4, to: 'all_allies' },
      ],
    },
  },
]
