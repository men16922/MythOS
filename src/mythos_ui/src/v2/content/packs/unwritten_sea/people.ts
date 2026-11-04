import type {
  ArchetypeDef,
  CardDef,
  CompanionDef,
  DuoDef,
  EventDef,
  ImplantDef,
  MetaUnlockDef,
  Stats,
  Text,
} from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

// Draft content. Balance and integration remain unverified.
// Squad roles: mujin = assault, seo_ha = support, parang = tech.

export const SEA_COMPANION_STATS: Record<string, Stats> = {
  mujin: { str: 7, agi: 2, int: 3, cha: 2, obs: 4 },
  seo_ha: { str: 2, agi: 2, int: 4, cha: 4, obs: 6 },
  parang: { str: 1, agi: 3, int: 7, cha: 2, obs: 5 },
}

export const SEA_COMPANIONS: CompanionDef[] = [
  {
    id: 'mujin',
    name: t('무진', 'Mujin'),
    alias: t('마지막 하역조장', 'The Last Foreman'),
    role: t('돌격 · 견인과 충돌', 'Assault · hooks and heavy impacts'),
    stats: SEA_COMPANION_STATS.mujin,
    sprite: 'mujin',
    portrait: 'characters/mujin.png',
    maxHp: 24,
    move: 3,
    cards: ['mujin_shoulder_in', 'mujin_hook_line'],
    bondCards: ['mujin_container_drop'],
    passiveText: t(
      '하역 수당: 획득 크레딧 +10%.',
      'Dock allowance: gain 10% more credits.',
    ),
    passive: { creditMult: 0.1 },
    combatPassive: {
      name: t('안전거리', 'Stand Clear'),
      text: t(
        '무진이 턴마다 처음 공격 카드를 쓰면 방어막 3을 얻는다.',
        'The first attack Mujin plays each turn gives him 3 block.',
      ),
      triggers: [
        {
          on: 'play_attack',
          ownerOnly: true,
          limit: 'turn',
          effects: [{ kind: 'block', amount: 3, to: 'owner' }],
        },
      ],
    },
    ultimate: {
      name: t('전량 하역', 'Unload Everything'),
      text: t(
        '모든 적에게 피해 6을 주고 무진에게서 1칸 밀어낸다. 충돌 피해 +1. 무진 방어막 6.',
        'Deal 6 to every enemy and push them 1 tile away from Mujin. Bumps deal +1. Mujin gains 6 block.',
      ),
      effects: [
        { kind: 'damage', amount: 6, to: 'all_enemies' },
        { kind: 'push', dir: 'away', distance: 1, slam: 1, to: 'all_enemies' },
        { kind: 'block', amount: 6, to: 'owner' },
      ],
    },
    bondLines: [
      t(
        '하역조는 여섯이었다. 지금은 하나.',
        'Six on the crew. One left.',
      ),
      t(
        '무거우면 말해. 떨어뜨리고 말하지 말고.',
        'Say when it gets heavy. Before you drop it.',
      ),
      t(
        '오늘은 네가 앞서. 따라갈게.',
        'You lead today. Coming with you.',
      ),
    ],
    barks: [
      t('비켜.', 'Clear.'),
      t('걸었다.', 'Hooked.'),
      t('내려놓는다.', 'Lowering.'),
      t('아직 버텨.', 'Still holding.'),
    ],
  },
  {
    id: 'seo_ha',
    name: t('서하', 'Seo-ha'),
    alias: t('배 없는 도선사', 'The Pilot Without a Ship'),
    role: t('지원 · 물길과 대피', 'Support · channels and safe passage'),
    stats: SEA_COMPANION_STATS.seo_ha,
    sprite: 'seo-ha',
    portrait: 'characters/seo-ha.png',
    maxHp: 19,
    move: 3,
    cards: ['seo_ha_pass_the_wake', 'seo_ha_read_the_tide'],
    bondCards: ['seo_ha_safe_channel'],
    passiveText: t(
      '익숙한 물길: 추적 증가 −10%.',
      'Familiar channels: gain 10% less Trace.',
    ),
    passive: { traceMult: -0.1 },
    combatPassive: {
      name: t('발밑부터', 'Watch Your Step'),
      text: t(
        '서하가 턴마다 처음 전술 카드를 쓰면 모든 아군이 방어막 2를 얻는다.',
        'The first tactic Seo-ha plays each turn gives every ally 2 block.',
      ),
      triggers: [
        {
          on: 'play_tactic',
          ownerOnly: true,
          limit: 'turn',
          effects: [{ kind: 'block', amount: 2, to: 'all_allies' }],
        },
      ],
    },
    ultimate: {
      name: t('전원 입항', 'Bring Everyone In'),
      text: t(
        '모든 아군 방어막 5, 회피 1. 모두 다시 이동할 수 있다.',
        'Every ally gains 5 block and Evade 1. All allies may move again.',
      ),
      effects: [
        { kind: 'block', amount: 5, to: 'all_allies' },
        { kind: 'status', status: 'evade', amount: 1, to: 'all_allies' },
        { kind: 'refund_move', to: 'all_allies' },
      ],
    },
    bondLines: [
      t(
        '은퇴는 했어요. 물길이 사직서를 안 받아 줘서 그렇죠.',
        'Retired, yes. The channel keeps rejecting the paperwork.',
      ),
      t(
        '길을 외우는 건 쉬워요. 두고 온 얼굴은 자꾸 달라져요.',
        'Routes are easy to remember. The faces left behind keep changing.',
      ),
      t(
        '돌아가는 길은 같이 찾아요. 이번에는 서두르지 말고요.',
        'Let’s find the way home together. No rushing this time.',
      ),
    ],
    barks: [
      t('발밑 보세요.', 'Watch your footing.'),
      t('아직 물길 있어요.', 'There’s still a channel.'),
      t('그쪽은 막혀요.', 'That way closes off.'),
      t('천천히, 도착은 해요.', 'Easy. We’ll get there.'),
    ],
  },
  {
    id: 'parang',
    name: t('파랑', 'Parang'),
    alias: t('조수가 놓고 간 아이', 'The Child Left by the Tide'),
    role: t('기술 · 떠안은 기억과 자리 바꾸기', 'Tech · borrowed burdens and exchanged places'),
    stats: SEA_COMPANION_STATS.parang,
    sprite: 'parang',
    portrait: 'characters/parang.png',
    maxHp: 20,
    move: 3,
    cards: ['parang_take_mark', 'parang_other_shore'],
    bondCards: ['parang_borrow_ache'],
    passiveText: t(
      '빌린 눈: 사건의 관찰 판정 +1.',
      'Borrowed eyes: +1 to Observation checks in events.',
    ),
    passive: { stats: { obs: 1 } },
    combatPassive: {
      name: t('남은 온기', 'Warmth Left Behind'),
      text: t(
        '파랑이 턴마다 처음 기술 카드를 쓰면 집중 2를 얻는다.',
        'The first skill Parang plays each turn grants Parang Focus 2.',
      ),
      triggers: [
        {
          on: 'play_skill',
          ownerOnly: true,
          limit: 'turn',
          effects: [{ kind: 'status', status: 'focus', amount: 2, to: 'owner' }],
        },
      ],
    },
    ultimate: {
      name: t('한꺼번에 밀려온 밤', 'The Night That Came All at Once'),
      text: t(
        '파랑에게 관통 피해 3. 모든 적에게 피해 6. 카드 2장을 뽑는다.',
        'Parang takes 3 piercing damage. Deal 6 to every enemy. Draw 2.',
      ),
      effects: [
        { kind: 'damage', amount: 3, pierce: true, to: 'owner' },
        { kind: 'damage', amount: 6, to: 'all_enemies' },
        { kind: 'draw', amount: 2 },
      ],
    },
    bondLines: [
      t(
        '비 오는 날엔 신발을 뒤집어 놨대. 작은 신발이었어.',
        'Someone used to turn shoes upside down when it rained. Little shoes.',
      ),
      t(
        '왼손은 매듭을 알아. 오른손은 풀리는 순간을 기억해.',
        'The left hand knows the knot. The right remembers when it came loose.',
      ),
      t(
        '파랑이라고 불러 줘. 오늘 생긴 이름이야.',
        'Say Parang. A name that began today.',
      ),
    ],
    barks: [
      t('왼손이 길을 알아.', 'The left hand remembers the way.'),
      t('아프던 자리가 같아.', 'The pain used to sit there too.'),
      t('먼저 건너갔댔어.', 'Someone crossed ahead.'),
      t('아침 냄새가 났어.', 'There was a smell of morning.'),
    ],
  },
]

export const SEA_COMPANION_CARDS: CardDef[] = [
  {
    id: 'mujin_shoulder_in',
    name: t('어깨로 하역', 'Shoulder the Load'),
    type: 'attack',
    rarity: 'special',
    owner: 'mujin',
    cost: 1,
    target: { mode: 'melee' },
    effects: [
      { kind: 'damage', amount: 5 },
      { kind: 'push', dir: 'away', distance: 1 },
    ],
    text: t('피해 5. 1칸 밀어낸다.', 'Deal 5. Push 1 tile.'),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 7 },
        { kind: 'push', dir: 'away', distance: 1 },
      ],
      text: t('피해 7. 1칸 밀어낸다.', 'Deal 7. Push 1 tile.'),
    },
    icon: 'v2/cards/mujin_shoulder_in.webp',
    tags: ['push', 'companion'],
  },
  {
    id: 'mujin_hook_line',
    name: t('후크 걸기', 'Set the Hook'),
    type: 'attack',
    rarity: 'special',
    owner: 'mujin',
    cost: 1,
    target: { mode: 'line', range: 3 },
    effects: [
      { kind: 'damage', amount: 3 },
      { kind: 'push', dir: 'toward', distance: 2 },
    ],
    text: t(
      '사격: 피해 3. 무진 쪽으로 2칸 당긴다.',
      'Shot: deal 3. Pull 2 tiles toward Mujin.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 5 },
        { kind: 'push', dir: 'toward', distance: 2 },
      ],
      text: t(
        '사격: 피해 5. 무진 쪽으로 2칸 당긴다.',
        'Shot: deal 5. Pull 2 tiles toward Mujin.',
      ),
    },
    icon: 'v2/cards/mujin_hook_line.webp',
    tags: ['push', 'companion'],
  },
  {
    id: 'mujin_container_drop',
    name: t('컨테이너 내리기', 'Lower a Container'),
    type: 'tactic',
    rarity: 'special',
    owner: 'mujin',
    cost: 1,
    target: { mode: 'tile', range: 3, empty: true },
    effects: [
      { kind: 'create_cover' },
      { kind: 'block', amount: 4, to: 'owner' },
    ],
    text: t(
      '빈 칸에 내구도 2의 엄폐물을 만든다. 무진 방어막 4.',
      'Create cover with 2 HP on an empty tile. Mujin gains 4 block.',
    ),
    upgrade: {
      effects: [
        { kind: 'create_cover' },
        { kind: 'block', amount: 7, to: 'owner' },
      ],
      text: t(
        '빈 칸에 내구도 2의 엄폐물을 만든다. 무진 방어막 7.',
        'Create cover with 2 HP on an empty tile. Mujin gains 7 block.',
      ),
    },
    icon: 'v2/cards/mujin_container_drop.webp',
    tags: ['block', 'companion'],
  },
  {
    id: 'mujin_deadweight',
    name: t('중량물', 'Deadweight'),
    type: 'attack',
    rarity: 'uncommon',
    owner: 'mujin',
    cost: 2,
    target: { mode: 'melee' },
    effects: [{ kind: 'damage', amount: 10 }],
    text: t('피해 10.', 'Deal 10.'),
    upgrade: {
      effects: [{ kind: 'damage', amount: 13 }],
      text: t('피해 13.', 'Deal 13.'),
    },
    icon: 'v2/cards/mujin_deadweight.webp',
    tags: ['companion'],
  },
  {
    id: 'mujin_clear_the_quay',
    name: t('부두 비워', 'Clear the Quay'),
    type: 'attack',
    rarity: 'rare',
    owner: 'mujin',
    cost: 2,
    exhaust: true,
    target: { mode: 'lob', minRange: 1, range: 4 },
    effects: [
      { kind: 'damage', amount: 7, area: 'cross' },
      { kind: 'push', dir: 'away', distance: 1, area: 'cross', slam: 1 },
    ],
    text: t(
      '십자 범위의 유닛에게 피해 7. 중심에서 1칸 밀어낸다. 충돌 피해 +1. 소멸.',
      'Cross area: deal 7 to units and push them 1 tile from the center. Bumps deal +1. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 10, area: 'cross' },
        { kind: 'push', dir: 'away', distance: 1, area: 'cross', slam: 1 },
      ],
      text: t(
        '십자 범위의 유닛에게 피해 10. 중심에서 1칸 밀어낸다. 충돌 피해 +1. 소멸.',
        'Cross area: deal 10 to units and push them 1 tile from the center. Bumps deal +1. Exhaust.',
      ),
    },
    icon: 'v2/cards/mujin_clear_the_quay.webp',
    tags: ['push', 'companion'],
  },
  {
    id: 'seo_ha_pass_the_wake',
    name: t('물살 넘겨주기', 'Pass the Wake'),
    type: 'tactic',
    rarity: 'special',
    owner: 'seo_ha',
    cost: 1,
    target: { mode: 'ally', range: 3 },
    effects: [
      { kind: 'block', amount: 5 },
      { kind: 'swap' },
    ],
    text: t(
      '아군 하나에게 방어막 5를 주고 서하와 자리를 바꾼다.',
      'Give an ally 5 block, then exchange places with Seo-ha.',
    ),
    upgrade: {
      effects: [
        { kind: 'block', amount: 8 },
        { kind: 'swap' },
      ],
      text: t(
        '아군 하나에게 방어막 8을 주고 서하와 자리를 바꾼다.',
        'Give an ally 8 block, then exchange places with Seo-ha.',
      ),
    },
    icon: 'v2/cards/seo_ha_pass_the_wake.webp',
    tags: ['move', 'block', 'companion'],
  },
  {
    id: 'seo_ha_read_the_tide',
    name: t('물때 읽기', 'Read the Tide'),
    type: 'skill',
    rarity: 'special',
    owner: 'seo_ha',
    cost: 1,
    target: { mode: 'none' },
    effects: [
      { kind: 'draw', amount: 2 },
      { kind: 'status', status: 'evade', amount: 1, to: 'owner' },
    ],
    text: t(
      '카드 2장을 뽑는다. 서하 회피 1.',
      'Draw 2. Seo-ha gains Evade 1.',
    ),
    upgrade: {
      effects: [
        { kind: 'draw', amount: 3 },
        { kind: 'status', status: 'evade', amount: 1, to: 'owner' },
      ],
      text: t(
        '카드 3장을 뽑는다. 서하 회피 1.',
        'Draw 3. Seo-ha gains Evade 1.',
      ),
    },
    icon: 'v2/cards/seo_ha_read_the_tide.webp',
    tags: ['draw', 'companion'],
  },
  {
    id: 'seo_ha_safe_channel',
    name: t('남겨 둔 물길', 'A Channel Kept Open'),
    type: 'tactic',
    rarity: 'special',
    owner: 'seo_ha',
    cost: 1,
    target: { mode: 'ally', range: 4 },
    effects: [
      { kind: 'block', amount: 4 },
      { kind: 'status', status: 'evade', amount: 1 },
      { kind: 'refund_move', to: 'target' },
    ],
    text: t(
      '아군 하나에게 방어막 4, 회피 1. 대상은 다시 이동할 수 있다.',
      'An ally gains 4 block and Evade 1, and may move again.',
    ),
    upgrade: {
      effects: [
        { kind: 'block', amount: 7 },
        { kind: 'status', status: 'evade', amount: 1 },
        { kind: 'refund_move', to: 'target' },
      ],
      text: t(
        '아군 하나에게 방어막 7, 회피 1. 대상은 다시 이동할 수 있다.',
        'An ally gains 7 block and Evade 1, and may move again.',
      ),
    },
    icon: 'v2/cards/seo_ha_safe_channel.webp',
    tags: ['move', 'block', 'companion'],
  },
  {
    id: 'seo_ha_harbor_shelter',
    name: t('항내 대피', 'Harbor Shelter'),
    type: 'skill',
    rarity: 'uncommon',
    owner: 'seo_ha',
    cost: 1,
    target: { mode: 'none' },
    effects: [{ kind: 'block', amount: 5, to: 'all_allies' }],
    text: t('모든 아군 방어막 5.', 'Every ally gains 5 block.'),
    upgrade: {
      effects: [{ kind: 'block', amount: 7, to: 'all_allies' }],
      text: t('모든 아군 방어막 7.', 'Every ally gains 7 block.'),
    },
    icon: 'v2/cards/seo_ha_harbor_shelter.webp',
    tags: ['block', 'companion'],
  },
  {
    id: 'seo_ha_last_crossing',
    name: t('마지막 도선', 'The Last Crossing'),
    type: 'tactic',
    rarity: 'rare',
    owner: 'seo_ha',
    cost: 2,
    exhaust: true,
    target: { mode: 'none' },
    effects: [
      { kind: 'block', amount: 5, to: 'all_allies' },
      { kind: 'status', status: 'evade', amount: 1, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
    ],
    text: t(
      '모든 아군 방어막 5, 회피 1. 모두 다시 이동할 수 있다. 소멸.',
      'Every ally gains 5 block and Evade 1. All allies may move again. Exhaust.',
    ),
    upgrade: { cost: 1 },
    icon: 'v2/cards/seo_ha_last_crossing.webp',
    tags: ['move', 'block', 'companion'],
  },
  {
    id: 'parang_take_mark',
    name: t('빌린 흉터', 'Borrowed Scar'),
    type: 'skill',
    rarity: 'special',
    owner: 'parang',
    cost: 0,
    exhaust: true,
    target: { mode: 'tile', range: 4 },
    effects: [
      { kind: 'status', status: 'mark', amount: 2 },
      { kind: 'status', status: 'mark', amount: 2, to: 'owner' },
      { kind: 'draw', amount: 2 },
    ],
    text: t(
      '대상과 파랑에게 표식 2. 카드 2장을 뽑는다. 소멸.',
      'The target and Parang gain Mark 2. Draw 2. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'status', status: 'mark', amount: 2 },
        { kind: 'status', status: 'mark', amount: 2, to: 'owner' },
        { kind: 'draw', amount: 3 },
      ],
      text: t(
        '대상과 파랑에게 표식 2. 카드 3장을 뽑는다. 소멸.',
        'The target and Parang gain Mark 2. Draw 3. Exhaust.',
      ),
    },
    icon: 'v2/cards/parang_take_mark.webp',
    tags: ['mark', 'draw', 'companion'],
  },
  {
    id: 'parang_other_shore',
    name: t('건너편의 자리', 'A Place on the Other Shore'),
    type: 'tactic',
    rarity: 'special',
    owner: 'parang',
    cost: 1,
    target: { mode: 'tile', range: 3 },
    effects: [
      { kind: 'swap' },
      { kind: 'status', status: 'evade', amount: 1, to: 'owner' },
    ],
    text: t(
      '3칸 이내의 유닛과 자리를 바꾼다. 파랑 회피 1.',
      'Exchange places with a unit within 3 tiles. Parang gains Evade 1.',
    ),
    upgrade: { cost: 0 },
    icon: 'v2/cards/parang_other_shore.webp',
    tags: ['move', 'companion'],
  },
  {
    id: 'parang_borrow_ache',
    name: t('남의 아픔', 'Someone Else’s Ache'),
    type: 'skill',
    rarity: 'special',
    owner: 'parang',
    cost: 0,
    exhaust: true,
    target: { mode: 'tile', range: 4 },
    effects: [
      { kind: 'status', status: 'bleed', amount: 2 },
      { kind: 'status', status: 'bleed', amount: 2, to: 'owner' },
      { kind: 'energy', amount: 2 },
    ],
    text: t(
      '대상에게 출혈 2. 파랑에게 출혈 2. 에너지 +2. 소멸.',
      'The target gains Bleed 2. Parang gains Bleed 2. Gain 2 energy. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'status', status: 'bleed', amount: 2 },
        { kind: 'status', status: 'bleed', amount: 1, to: 'owner' },
        { kind: 'energy', amount: 2 },
      ],
      text: t(
        '대상에게 출혈 2. 파랑에게 출혈 1. 에너지 +2. 소멸.',
        'The target gains Bleed 2. Parang gains Bleed 1. Gain 2 energy. Exhaust.',
      ),
    },
    icon: 'v2/cards/parang_borrow_ache.webp',
    tags: ['energy', 'companion'],
  },
  {
    id: 'parang_salt_pulse',
    name: t('소금 맥박', 'Salt Pulse'),
    type: 'attack',
    rarity: 'uncommon',
    owner: 'parang',
    cost: 1,
    target: { mode: 'line', range: 4 },
    effects: [
      { kind: 'damage', amount: 2, pierce: true, to: 'owner' },
      { kind: 'damage', amount: 8 },
    ],
    text: t(
      '파랑에게 관통 피해 2. 사격: 피해 8.',
      'Parang takes 2 piercing damage. Shot: deal 8.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 2, pierce: true, to: 'owner' },
        { kind: 'damage', amount: 11 },
      ],
      text: t(
        '파랑에게 관통 피해 2. 사격: 피해 11.',
        'Parang takes 2 piercing damage. Shot: deal 11.',
      ),
    },
    icon: 'v2/cards/parang_salt_pulse.webp',
    tags: ['companion'],
  },
  {
    id: 'parang_last_borrow',
    name: t('마지막으로 빌린 밤', 'The Last Borrowed Night'),
    type: 'attack',
    rarity: 'rare',
    owner: 'parang',
    cost: 2,
    exhaust: true,
    target: { mode: 'none' },
    effects: [
      { kind: 'damage', amount: 3, pierce: true, to: 'owner' },
      { kind: 'damage', amount: 4, to: 'all_enemies' },
      { kind: 'status', status: 'weak', amount: 1, to: 'all_enemies' },
    ],
    text: t(
      '파랑에게 관통 피해 3. 모든 적에게 피해 4, 약화 1. 소멸.',
      'Parang takes 3 piercing damage. Every enemy takes 4 damage and gains Weak 1. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 2, pierce: true, to: 'owner' },
        { kind: 'damage', amount: 6, to: 'all_enemies' },
        { kind: 'status', status: 'weak', amount: 1, to: 'all_enemies' },
      ],
      text: t(
        '파랑에게 관통 피해 2. 모든 적에게 피해 6, 약화 1. 소멸.',
        'Parang takes 2 piercing damage. Every enemy takes 6 damage and gains Weak 1. Exhaust.',
      ),
    },
    icon: 'v2/cards/parang_last_borrow.webp',
    tags: ['companion'],
  },
]

const BASICS = [
  'packet_shot',
  'packet_shot',
  'packet_shot',
  'covering_noise',
  'covering_noise',
  'covering_noise',
  'shove',
]

export const SEA_ARCHETYPE: ArchetypeDef = {
  id: 'navigator',
  name: t('항해사', 'Navigator'),
  tagline: t(
    '잘못 든 물길에서 한 번은 돌아올 수 있다.',
    'One wrong channel still leaves a way back.',
  ),
  description: t(
    '지워진 항로를 따라 해문항으로 향하는 접속자. 자리를 바꾸고 힘을 남겨 다음 턴을 준비한다. 전투마다 한 번, 이번 턴 시작으로 되돌아갈 수 있다. 다시 뽑는 카드는 같다.',
    'A connector following an erased route to Haemun. Exchanges positions and saves energy for the next turn. Once per fight, return to the start of the current turn. The cards drawn remain the same.',
  ),
  stats: { str: 2, agi: 4, int: 4, cha: 3, obs: 7 },
  maxHp: 33,
  startingCredits: 70,
  startingImplant: 'tide_table',
  startingDeck: [
    ...BASICS,
    'navigator_sound_depth',
    'navigator_chart_course',
    'navigator_slack_water',
  ],
  rewinds: 1,
  sprite: 'navigator',
  burst: {
    name: t('돌아올 물길', 'The Channel Home'),
    text: t(
      '모든 아군 방어막 6. 모두 다시 이동할 수 있다. 에너지 +1. 턴 종료 시 남은 에너지를 다음 턴으로 넘긴다.',
      'Every ally gains 6 block and may move again. Gain 1 energy. Carry all energy left at turn end into the next turn.',
    ),
    effects: [
      { kind: 'block', amount: 6, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
      { kind: 'energy', amount: 1 },
      { kind: 'bank_energy' },
    ],
  },
}

export const SEA_ARCHETYPE_CARDS: CardDef[] = [
  {
    id: 'navigator_sound_depth',
    name: t('수심 재기', 'Sound the Depth'),
    type: 'tactic',
    rarity: 'starter',
    owner: 'connector',
    archetype: 'navigator',
    cost: 0,
    exhaust: true,
    target: { mode: 'line', range: 4 },
    effects: [
      { kind: 'status', status: 'mark', amount: 1 },
      { kind: 'draw', amount: 1 },
    ],
    text: t(
      '사격: 표식 1. 카드 1장을 뽑는다. 소멸.',
      'Shot: Mark 1. Draw 1. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'status', status: 'mark', amount: 1 },
        { kind: 'draw', amount: 2 },
      ],
      text: t(
        '사격: 표식 1. 카드 2장을 뽑는다. 소멸.',
        'Shot: Mark 1. Draw 2. Exhaust.',
      ),
    },
    icon: 'v2/cards/navigator_sound_depth.webp',
    tags: ['mark', 'draw'],
  },
  {
    id: 'navigator_chart_course',
    name: t('항로 잡기', 'Chart a Course'),
    type: 'tactic',
    rarity: 'starter',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    retain: true,
    target: { mode: 'ally', range: 3 },
    effects: [
      { kind: 'block', amount: 5 },
      { kind: 'refund_move', to: 'target' },
      { kind: 'swap' },
    ],
    text: t(
      '보존. 아군 하나에게 방어막 5. 대상은 다시 이동할 수 있다. 접속자와 대상의 자리를 바꾼다.',
      'Retain. Give an ally 5 block and another move, then exchange places with that ally.',
    ),
    upgrade: {
      effects: [
        { kind: 'block', amount: 8 },
        { kind: 'refund_move', to: 'target' },
        { kind: 'swap' },
      ],
      text: t(
        '보존. 아군 하나에게 방어막 8. 대상은 다시 이동할 수 있다. 접속자와 대상의 자리를 바꾼다.',
        'Retain. Give an ally 8 block and another move, then exchange places with that ally.',
      ),
    },
    icon: 'v2/cards/navigator_chart_course.webp',
    tags: ['move', 'block'],
  },
  {
    id: 'navigator_slack_water',
    name: t('정조', 'Slack Water'),
    type: 'skill',
    rarity: 'starter',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    retain: true,
    target: { mode: 'none' },
    effects: [
      { kind: 'block', amount: 4, to: 'owner' },
      { kind: 'bank_energy' },
    ],
    text: t(
      '보존. 방어막 4. 턴 종료 시 남은 에너지를 다음 턴으로 넘긴다.',
      'Retain. Gain 4 block. Carry all energy left at turn end into the next turn.',
    ),
    upgrade: { cost: 0 },
    icon: 'v2/cards/navigator_slack_water.webp',
    tags: ['block', 'energy'],
  },
  {
    id: 'navigator_tow_line',
    name: t('예인줄', 'Towline'),
    type: 'attack',
    rarity: 'common',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    target: { mode: 'line', range: 4 },
    effects: [
      { kind: 'damage', amount: 4 },
      { kind: 'push', dir: 'toward', distance: 2 },
    ],
    text: t(
      '사격: 피해 4. 접속자 쪽으로 2칸 당긴다.',
      'Shot: deal 4. Pull 2 tiles toward the connector.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 6 },
        { kind: 'push', dir: 'toward', distance: 2 },
      ],
      text: t(
        '사격: 피해 6. 접속자 쪽으로 2칸 당긴다.',
        'Shot: deal 6. Pull 2 tiles toward the connector.',
      ),
    },
    icon: 'v2/cards/navigator_tow_line.webp',
    tags: ['push'],
  },
  {
    id: 'navigator_give_way',
    name: t('진로 양보', 'Give Way'),
    type: 'tactic',
    rarity: 'common',
    owner: 'connector',
    archetype: 'navigator',
    cost: 0,
    target: { mode: 'ally', range: 3 },
    effects: [
      { kind: 'block', amount: 3 },
      { kind: 'refund_move', to: 'target' },
    ],
    text: t(
      '아군 하나에게 방어막 3. 대상은 다시 이동할 수 있다.',
      'An ally gains 3 block and may move again.',
    ),
    upgrade: {
      effects: [
        { kind: 'block', amount: 5 },
        { kind: 'refund_move', to: 'target' },
      ],
      text: t(
        '아군 하나에게 방어막 5. 대상은 다시 이동할 수 있다.',
        'An ally gains 5 block and may move again.',
      ),
    },
    icon: 'v2/cards/navigator_give_way.webp',
    tags: ['move', 'block'],
  },
  {
    id: 'navigator_bearing_shot',
    name: t('방위 사격', 'Bearing Shot'),
    type: 'attack',
    rarity: 'common',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    retain: true,
    target: { mode: 'line', range: 5 },
    effects: [{ kind: 'damage', amount: 6, bonusVsMarked: 2 }],
    text: t(
      '보존. 사격: 피해 6. 표식된 대상에게 추가 피해 2.',
      'Retain. Shot: deal 6, with 2 extra damage against a marked target.',
    ),
    upgrade: {
      effects: [{ kind: 'damage', amount: 8, bonusVsMarked: 3 }],
      text: t(
        '보존. 사격: 피해 8. 표식된 대상에게 추가 피해 3.',
        'Retain. Shot: deal 8, with 3 extra damage against a marked target.',
      ),
    },
    icon: 'v2/cards/navigator_bearing_shot.webp',
    tags: ['mark'],
  },
  {
    id: 'navigator_night_watch',
    name: t('정박 당직', 'Anchor Watch'),
    type: 'skill',
    rarity: 'uncommon',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    retain: true,
    exhaust: true,
    target: { mode: 'none' },
    effects: [{ kind: 'block', amount: 5, to: 'all_allies' }],
    heldEffects: [{ kind: 'block', amount: 2, to: 'connector' }],
    text: t(
      '보존. 손에 든 채 턴을 끝내면 접속자 방어막 2. 사용 시 모든 아군 방어막 5. 소멸.',
      'Retain. At turn end, if held, the connector gains 2 block. Play: every ally gains 5 block. Exhaust.',
    ),
    upgrade: {
      effects: [{ kind: 'block', amount: 7, to: 'all_allies' }],
      text: t(
        '보존. 손에 든 채 턴을 끝내면 접속자 방어막 2. 사용 시 모든 아군 방어막 7. 소멸.',
        'Retain. At turn end, if held, the connector gains 2 block. Play: every ally gains 7 block. Exhaust.',
      ),
    },
    icon: 'v2/cards/navigator_night_watch.webp',
    tags: ['block'],
  },
  {
    id: 'navigator_reserve_wind',
    name: t('남겨 둔 바람', 'Wind in Reserve'),
    type: 'skill',
    rarity: 'uncommon',
    owner: 'connector',
    archetype: 'navigator',
    cost: 0,
    retain: true,
    exhaust: true,
    target: { mode: 'none' },
    effects: [
      { kind: 'energy', amount: 1 },
      { kind: 'bank_energy' },
    ],
    text: t(
      '보존. 에너지 +1. 턴 종료 시 남은 에너지를 다음 턴으로 넘긴다. 소멸.',
      'Retain. Gain 1 energy. Carry all energy left at turn end into the next turn. Exhaust.',
    ),
    upgrade: {
      effects: [
        { kind: 'energy', amount: 2 },
        { kind: 'bank_energy' },
      ],
      text: t(
        '보존. 에너지 +2. 턴 종료 시 남은 에너지를 다음 턴으로 넘긴다. 소멸.',
        'Retain. Gain 2 energy. Carry all energy left at turn end into the next turn. Exhaust.',
      ),
    },
    icon: 'v2/cards/navigator_reserve_wind.webp',
    tags: ['energy'],
  },
  {
    id: 'navigator_cross_current',
    name: t('엇물살', 'Crosscurrent'),
    type: 'tactic',
    rarity: 'uncommon',
    owner: 'connector',
    archetype: 'navigator',
    cost: 1,
    target: { mode: 'lob', minRange: 1, range: 4 },
    effects: [
      { kind: 'damage', amount: 3, area: 'cross' },
      { kind: 'push', dir: 'away', distance: 1, area: 'cross' },
    ],
    text: t(
      '십자 범위의 유닛에게 피해 3. 중심에서 1칸 밀어낸다.',
      'Cross area: deal 3 to units and push them 1 tile from the center.',
    ),
    upgrade: {
      effects: [
        { kind: 'damage', amount: 5, area: 'cross' },
        { kind: 'push', dir: 'away', distance: 1, area: 'cross' },
      ],
      text: t(
        '십자 범위의 유닛에게 피해 5. 중심에서 1칸 밀어낸다.',
        'Cross area: deal 5 to units and push them 1 tile from the center.',
      ),
    },
    icon: 'v2/cards/navigator_cross_current.webp',
    tags: ['push'],
  },
  {
    id: 'navigator_safe_harbor',
    name: t('피항', 'Safe Harbor'),
    type: 'tactic',
    rarity: 'rare',
    owner: 'connector',
    archetype: 'navigator',
    cost: 2,
    exhaust: true,
    target: { mode: 'none' },
    effects: [
      { kind: 'block', amount: 6, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
      { kind: 'bank_energy' },
    ],
    text: t(
      '모든 아군 방어막 6. 모두 다시 이동할 수 있다. 턴 종료 시 남은 에너지를 다음 턴으로 넘긴다. 소멸.',
      'Every ally gains 6 block and may move again. Carry all energy left at turn end into the next turn. Exhaust.',
    ),
    upgrade: { cost: 1 },
    icon: 'v2/cards/navigator_safe_harbor.webp',
    tags: ['move', 'block', 'energy'],
  },
]

export const SEA_ARCHETYPE_IMPLANT: ImplantDef = {
  id: 'tide_table',
  name: t('조석표', 'Tide Table'),
  text: t('손패 크기 +1.', 'Hand size +1.'),
  rarity: 'starter',
  icon: 'v2/implants/tide_table.webp',
  passive: { handSize: 1 },
}

export const SEA_DUOS: DuoDef[] = [
  {
    id: 'sea_load_bearing',
    pair: ['mujin', 'tae_o'],
    name: t('받치는 사람들', 'Those Who Hold'),
    text: t(
      '모든 적에게 피해 5를 주고 무진에게서 2칸 밀어낸다. 충돌 피해 +2. 모든 아군 방어막 6.',
      'Deal 5 to every enemy and push them 2 tiles away from Mujin. Bumps deal +2. Every ally gains 6 block.',
    ),
    effects: [
      { kind: 'damage', amount: 5, to: 'all_enemies' },
      { kind: 'push', dir: 'away', distance: 2, slam: 2, to: 'all_enemies' },
      { kind: 'block', amount: 6, to: 'all_allies' },
    ],
    lines: [
      t('받아. 무겁다.', 'Catch. Heavy.'),
      t('들고 있어라. 내가 밑을 받친다.', 'Keep it raised. I will brace underneath.'),
    ],
  },
  {
    id: 'sea_unlisted_channel',
    pair: ['seo_ha', 'se_rin'],
    name: t('장부에 없는 물길', 'The Unlisted Channel'),
    text: t(
      '모든 아군 방어막 6, 회피 1. 모두 다시 이동할 수 있다. 카드 2장을 뽑는다.',
      'Every ally gains 6 block and Evade 1, and may move again. Draw 2.',
    ),
    effects: [
      { kind: 'block', amount: 6, to: 'all_allies' },
      { kind: 'status', status: 'evade', amount: 1, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
      { kind: 'draw', amount: 2 },
    ],
    lines: [
      t('세관에 없는 길이에요. 도선료는 나중에 받아요.', 'Customs missed this channel. The pilot fee can wait.'),
      t('좋아. 돌아갈 땐 내가 안내할게.', 'Deal. I’ll guide us on the way back.'),
    ],
  },
  {
    id: 'sea_sleep_until_morning',
    pair: ['parang', 'rem'],
    name: t('아침까지 남은 잠', 'Sleep Until Morning'),
    text: t(
      '모든 적에게 약화 2, 빙결 1. 모든 아군 방어막 5. 카드 1장을 뽑는다.',
      'Every enemy gains Weak 2 and Freeze 1. Every ally gains 5 block. Draw 1.',
    ),
    effects: [
      { kind: 'status', status: 'weak', amount: 2, to: 'all_enemies' },
      { kind: 'status', status: 'freeze', amount: 1, to: 'all_enemies' },
      { kind: 'block', amount: 5, to: 'all_allies' },
      { kind: 'draw', amount: 1 },
    ],
    lines: [
      t('문 열리는 소리가 나면 아침이랬어.', 'Someone said morning comes when the door opens.'),
      t('그럼 아직 닫아 둘게요. 조금 더 자도 돼요.', 'Then I’ll keep it closed a little longer. There’s time to sleep.'),
    ],
  },
  // 2026-11-04: duos between two Sea companions (a Sea party is often two of them). Same power band as the others.
  {
    id: 'sea_tide_shift',
    pair: ['seo_ha', 'mujin'],
    name: t('물때 교대', 'Tide Shift'),
    text: t(
      '모든 적을 1칸 밀어낸다. 충돌 피해 +2. 모든 아군 방어막 6. 모두 다시 이동할 수 있다.',
      'Push every enemy 1 tile away. Bumps deal +2. Every ally gains 6 block and may move again.',
    ),
    effects: [
      { kind: 'push', dir: 'away', distance: 1, slam: 2, to: 'all_enemies' },
      { kind: 'block', amount: 6, to: 'all_allies' },
      { kind: 'refund_move', to: 'all_allies' },
    ],
    lines: [
      t('지금이에요. 왼쪽으로.', 'Now. To port.'),
      t('들어. 하나, 둘, 셋.', 'Lift. One, two, three.'),
    ],
  },
  {
    id: 'sea_no_fifth',
    pair: ['mujin', 'parang'],
    name: t('다섯은 없다', 'There Is No Five'),
    text: t(
      '모든 적에게 피해 4, 표식 2. 모든 아군 방어막 5.',
      'Deal 4 to every enemy and Mark 2. Every ally gains 5 block.',
    ),
    effects: [
      { kind: 'damage', amount: 4, to: 'all_enemies' },
      { kind: 'status', status: 'mark', amount: 2, to: 'all_enemies' },
      { kind: 'block', amount: 5, to: 'all_allies' },
    ],
    lines: [
      t('넷에서 멈춰.', 'Stop on four.'),
      t('파랑이 넷이야.', 'Parang is four.'),
    ],
  },
  {
    id: 'sea_returned_voices',
    pair: ['parang', 'seo_ha'],
    name: t('돌려준 목소리', 'Returned Voices'),
    text: t(
      '버린 카드 2장을 손으로 되돌린다. 카드 2장을 뽑는다. 모든 아군 회피 1.',
      'Return 2 discarded cards to your hand. Draw 2. Every ally gains Evade 1.',
    ),
    effects: [
      { kind: 'recall', count: 2 },
      { kind: 'draw', amount: 2 },
      { kind: 'status', status: 'evade', amount: 1, to: 'all_allies' },
    ],
    lines: [
      t('이건 주인한테 돌려줄게.', 'Parang will give this one back.'),
      t('그래요. 길은 내가 알려 줄게요.', 'All right. I’ll show the way.'),
    ],
  },
]

export const SEA_UNLOCKS: MetaUnlockDef[] = [
  {
    id: 'unlock_mujin',
    kind: 'companion',
    name: t('무진 · 마지막 하역조장', 'Mujin · The Last Foreman'),
    text: t(
      '배가 오지 않는 항구를 지키던 크레인 기사. 합류 후보에 들고 시작 동료로도 고를 수 있다.',
      'A crane operator who kept watch over a harbor without ships. Adds Mujin to the recruit pool and starting companion selection.',
    ),
    cost: 55,
    grants: 'mujin',
    icon: 'characters/mujin.png',
  },
  {
    id: 'unlock_seo_ha',
    kind: 'companion',
    name: t('서하 · 배 없는 도선사', 'Seo-ha · The Pilot Without a Ship'),
    text: t(
      '사라진 물길을 외우는 은퇴 도선사. 합류 후보에 들고 시작 동료로도 고를 수 있다.',
      'A retired pilot who remembers vanished channels. Adds Seo-ha to the recruit pool and starting companion selection.',
    ),
    cost: 55,
    grants: 'seo_ha',
    icon: 'characters/seo-ha.png',
  },
  {
    id: 'unlock_parang',
    kind: 'companion',
    name: t('파랑 · 조수가 놓고 간 아이', 'Parang · The Child Left by the Tide'),
    text: t(
      '남의 기억을 품고 물에서 올라온 아이. 합류 후보에 들고 시작 동료로도 고를 수 있다.',
      'A child brought ashore carrying other people’s memories. Adds Parang to the recruit pool and starting companion selection.',
    ),
    cost: 65,
    grants: 'parang',
    icon: 'characters/parang.png',
  },
  {
    id: 'unlock_navigator',
    kind: 'archetype',
    name: t('항해사', 'Navigator'),
    text: t(
      '자리를 바꾸고 다음 턴을 준비하는 접속자. 전투마다 한 번 이번 턴을 되감는다. 이 직업으로 루프를 시작할 수 있다.',
      'A connector who exchanges positions and prepares the next turn, with one turn rewind per fight. Start loops as the Navigator.',
    ),
    cost: 70,
    grants: 'navigator',
    icon: 'v2/implants/tide_table.webp',
  },
]

export const SEA_COMPANION_EVENTS: EventDef[] = [
  {
    id: 'sea_arc_mujin_1',
    acts: [4],
    route: 'sea_4',
    title: t('아직 걸린 후크', 'The Hook Still Hanging'),
    speaker: 'mujin',
    image: 'v2/events/sea_arc_mujin_1.webp',
    requires: { noCompanion: 'mujin', notFlag: 'sea_mujin_1' },
    improvise: false,
    gmHints: ['미끄러지는 와이어', '아래를 두 번 확인', '짧게 끊는 하역 구령'],
    text: t(
      '마른 항구 바닥으로 후크 하나가 내려온다. 그 밑에 깔린 사람이 없는지, 회색 머리의 기사가 두 번 확인한다. “무진. 하역조장.” 돌아갈 교대조를 묻자 손이 멎는다. “안 돌아왔어. 찾으러 가야 해. 이거부터 내려놓고.” 고장 난 제동기가 와이어를 조금씩 놓친다.',
      'A hook descends toward the dry harbor bed. The gray-haired operator checks twice for anyone underneath. “Mujin. Foreman.” Asked about the returning shift, his hand stops. “Never came back. Need to look. Put this down first.” A failing brake lets the wire slip a little at a time.',
    ),
    options: [
      {
        label: t('수동 제동기를 함께 잡는다', 'Help hold the manual brake'),
        hint: t('HP −4 · 무진 합류', '−4 HP · recruit Mujin'),
        success: {
          text: t(
            '손바닥이 벗겨질 때까지 당긴다. 후크가 바닥에 닿은 뒤에도 무진은 한동안 손을 놓지 않는다. 당신 손을 보고서야 고개를 끄덕인다. “됐어. 같이 가지.”',
            'You pull until the skin lifts from your palms. Mujin keeps holding even after the hook reaches the ground. He sees your hands and finally nods. “Done. Coming with you.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'companion', id: 'mujin' },
            { kind: 'flag', key: 'sea_mujin_1', value: 1 },
          ],
        },
      },
      {
        label: t('예비 제동 장치를 사서 연결한다', 'Buy and fit a spare brake'),
        hint: t('25₵ · 무진 합류', '25₵ · recruit Mujin'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '예비 장치가 와이어를 물자 낮은 떨림이 멎는다. 무진은 새 부품의 결합부를 손끝으로 확인한다. “값은 기억해 둘게. 사람부터 찾자.”',
            'The spare brake bites into the wire and the low vibration stops. Mujin checks the fitting with his fingertips. “Remember what it cost. Find the crew first.”',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'companion', id: 'mujin' },
            { kind: 'flag', key: 'sea_mujin_1', value: 2 },
          ],
        },
      },
      {
        label: t('후크 아래를 비우고 먼저 떠난다', 'Clear the space below the hook and leave'),
        hint: t('HP −1 · 추적 −2 · 무진은 남는다', '−1 HP · −2 Trace · leave Mujin'),
        success: {
          text: t(
            '잔해를 밀어내다 손이 긁힌다. 후크 아래가 비자 무진이 고개를 끄덕인다. “됐어. 먼저 가.” 당신은 기계 소리에 발소리를 묻고 떠난다. 무진은 제동기를 잡은 채 남는다.',
            'Debris scrapes your hand as you clear the hook’s path. Mujin nods. “Clear. Go ahead.” You leave with your footsteps hidden by the machinery. He stays at the brake.',
          ),
          effects: [
            { kind: 'hp', amount: -1 },
            { kind: 'trace', amount: -2 },
            { kind: 'flag', key: 'sea_mujin_1', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_mujin_2',
    acts: [5],
    route: 'sea_5',
    title: t('젖은 교대 명단', 'The Wet Shift List'),
    speaker: 'mujin',
    image: 'v2/events/sea_arc_mujin_2.webp',
    requires: { companion: 'mujin', notFlag: 'sea_mujin_2' },
    improvise: false,
    gmHints: ['젖은 여섯 이름', '벽 안의 퇴근 인사', '마지막 줄을 누르는 손'],
    text: t(
      '잠긴 숙소의 벽에 젖은 명단이 붙어 있다. 여섯 이름 중 다섯은 번졌는데, 마지막 줄의 무진만 또렷하다. 물이 오를 때마다 벽 안에서 누군가 퇴근 인사를 한다. 무진이 마지막 줄을 손가락으로 누른다. “반장 먼저 나왔어.” 명단을 떼면 벽이 무너질 듯 울린다.',
      'A wet shift list clings to the wall of a flooded dormitory. Five of the six names have blurred. Only Mujin remains clear on the last line. Each rise of water brings a farewell from inside the wall. He presses the last line. “Foreman left first.” The wall groans when he tries to lift the list.',
    ),
    options: [
      {
        label: t('벽을 받치고 원본을 떼어 낸다', 'Brace the wall and recover the original'),
        hint: t('HP −4 · 무진 유대 +1', '−4 HP · Mujin bond +1'),
        success: {
          text: t(
            '당신이 벽을 받치는 동안 무진이 종이를 밀어 올린다. 번진 이름 아래로 눌러 쓴 자국이 남아 있다. 무진은 다섯 이름을 천천히 읽는다. 마지막 이름에서 숨을 한 번 고른다. “기억났다.”',
            'You brace the wall while Mujin eases the paper free. Pressed strokes survive beneath the blurred names. He reads all five slowly, stopping for breath before the last. “Remember now.”',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'bond', id: 'mujin', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'flag', key: 'sea_mujin_2', value: 1 },
          ],
        },
      },
      {
        label: t('방수 복사를 맡겨 숙소마다 돌린다', 'Pay for waterproof copies for the shelters'),
        hint: t('20₵ · 무진 유대 +1', '20₵ · Mujin bond +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '복사된 종이를 받은 숙소 사람들이 빈 이름을 하나씩 채운다. 무진은 정정하지 않고 끝까지 듣는다. “막내, 노래도 했어.” 물이 벽을 두드리지만 이번에는 다른 사람이 말을 잇는다.',
            'People from the shelters fill in the missing names on the copies. Mujin listens without correcting anyone. “Youngest used to sing.” Water knocks against the wall, but this time someone else continues the story.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'bond', id: 'mujin', amount: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_mujin_2', value: 2 },
          ],
        },
      },
      {
        label: t('원본은 두고 이름을 소리 내어 읽는다', 'Leave the list and read the names aloud'),
        hint: t('추적 +3 · 무진 유대 +1', '+3 Trace · Mujin bond +1'),
        success: {
          text: t(
            '무진이 번진 자국을 짚으면 당신이 이름을 읽는다. 벽 너머로 목소리가 퍼지고 순찰의 불빛이 멈춘다. 무진은 마지막 이름까지 듣는다. “종이는 두고 가. 이름은 들었어.”',
            'Mujin traces each blurred name as you read it aloud. Your voice carries beyond the wall and a patrol light pauses. He hears the last name. “Leave the paper. Heard their names.”',
          ),
          effects: [
            { kind: 'trace', amount: 3 },
            { kind: 'bond', id: 'mujin', amount: 1 },
            { kind: 'flag', key: 'sea_mujin_2', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_mujin_3',
    acts: [6],
    route: 'sea_6',
    title: t('빈 채로 돌아온 것', 'What Came Back Empty'),
    speaker: 'mujin',
    image: 'v2/events/sea_arc_mujin_3.webp',
    requires: { companion: 'mujin', notFlag: 'sea_mujin_3' },
    improvise: false,
    gmHints: ['빈 컨테이너', '다섯 사람의 구령', '처음 놓는 손'],
    text: t(
      '등대 아래로 빈 컨테이너가 떠밀려 온다. 안에서는 다섯 사람이 하역 구령을 맞춘다. 무진이 문턱에 앉자 목소리가 멎는다. 지워진 사람들이 돌아온 것은 목소리뿐이다. “살아서 내린 줄 알았어.” 무진이 빈 바닥을 한 번 짚는다. “다섯 번이나 셌는데.” 멀리서 등대단의 발소리가 가까워진다.',
      'An empty container washes beneath the lighthouse. Five voices count a lift inside. They stop when Mujin sits on the threshold. Only the voices of the erased have returned. “Thought they got off alive.” He touches the bare floor. “Counted five times.” Keeper footsteps approach in the distance.',
    ),
    options: [
      {
        label: t('문을 열어 두고 마지막 구령에 답한다', 'Leave the doors open and answer the last call'),
        hint: t('추적 +6 · 무진 유대 +1 · 잔향 +10', '+6 Trace · Mujin bond +1 · +10 Echoes'),
        success: {
          text: t(
            '다섯 목소리가 무진의 이름을 부른다. 무진은 일어나지 않고 대답한다. “들었어. 전원 하역.” 메아리가 빠져나갈 때까지 당신도 문턱에 앉아 있는다. 무진의 손이 처음으로 바닥에서 떨어진다.',
            'Five voices call Mujin’s name. He answers without standing. “Heard. All unloaded.” You sit beside him until the echo leaves. For the first time, his hand lifts from the floor.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'bond', id: 'mujin', amount: 1 },
            { kind: 'echoes', amount: 10 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_mujin_3', value: 1 },
          ],
        },
      },
      {
        label: t('문을 닫고 무진과 낮은 물길로 돌아간다', 'Close the doors and take the low channel with Mujin'),
        hint: t('HP −3 · 모두 회복 5 · 무진 유대 +1', '−3 HP · party heals 5 · Mujin bond +1'),
        success: {
          text: t(
            '차가운 물길이 순찰 아래로 이어진다. 상처가 따갑지만 막힌 숨은 풀린다. 무진이 당신 팔꿈치를 받친다. “그만 세자.” 뒤를 돌아보던 발이 앞으로 향한다. “남은 사람 데려가야지.”',
            'The cold channel passes beneath the patrol. Your wounds sting, but your breathing eases. Mujin supports your elbow. “Enough counting.” His backward glance gives way to a step forward. “Get the living home.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'heal_party', amount: 5 },
            { kind: 'bond', id: 'mujin', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
            { kind: 'flag', key: 'sea_mujin_3', value: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_seo_ha_1',
    acts: [4],
    route: 'sea_4',
    title: t('물이 없는 조석표', 'A Tide Table Without Water'),
    speaker: 'seo_ha',
    image: 'v2/events/sea_arc_seo_ha_1.webp',
    requires: { noCompanion: 'seo_ha', notFlag: 'sea_seo_ha_1' },
    improvise: false,
    gmHints: ['마른 바닥의 물때', '접어 둔 조석표', '마지막 사람까지 확인'],
    text: t(
      '하역조 숙소 앞에서 한 여자가 조석표를 펴 놓고 사람들을 기다린다. 머리는 희고, 손등은 오래 햇볕에 그을렸다. “서하예요. 도선은 그만뒀고요.” 마른 바닥을 가리키며 한 걸음 물러선다. “여긴 곧 잠겨요. 빈 항구라고 바닥까지 믿으면 곤란해요.” 세관 순찰이 당신들의 퇴로를 닫고 있다.',
      'A woman waits outside the crew dormitory with a tide table spread before her. Her hair is white, her hands weathered by years of sun. “Seo-ha. Retired from piloting.” She points at the dry ground and steps back. “This floods soon. An empty harbor doesn’t make the ground trustworthy.” A Customs patrol is closing your way out.',
    ),
    options: [
      {
        label: t('서하가 짚는 물길로 일행을 이끈다', 'Lead the party along Seo-ha’s channel'),
        hint: t('추적 +4 · 서하 합류', '+4 Trace · recruit Seo-ha'),
        success: {
          text: t(
            '순찰의 시선 앞을 가로지르자 발뒤꿈치까지 물이 차오른다. 서하는 마지막 사람이 건넌 뒤에야 움직인다. “아슬아슬했죠. 그래서 안내가 필요해요.” 조석표를 접어 품에 넣는다.',
            'You cross in full view of the patrol as water reaches your heels. Seo-ha waits for the last person before following. “Close, wasn’t it? That’s why a guide helps.” She folds the table into her coat.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'companion', id: 'seo_ha' },
            { kind: 'flag', key: 'sea_seo_ha_1', value: 1 },
          ],
        },
      },
      {
        label: t('통행료를 내고 높은 통로로 돌아간다', 'Pay for passage along the raised walkway'),
        hint: t('25₵ · 서하 합류', '25₵ · recruit Seo-ha'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '높은 통로 아래로 물이 찬다. 서하가 물가에 남은 발자국을 세다가 당신을 따라온다. “비싼 길은 대체로 마른 길이죠. 다음에는 싼 쪽도 알려 드릴게요.”',
            'Water fills the ground beneath the raised walkway. Seo-ha counts the footprints left at its edge, then follows. “Expensive routes do tend to stay dry. Next time I’ll show you the cheaper one.”',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'companion', id: 'seo_ha' },
            { kind: 'flag', key: 'sea_seo_ha_1', value: 2 },
          ],
        },
      },
      {
        label: t('길을 물어 낮은 담을 넘어 떠난다', 'Ask the way and leave over the low wall'),
        hint: t('HP −2 · 추적 −2 · 서하는 남는다', '−2 HP · −2 Trace · leave Seo-ha'),
        success: {
          text: t(
            '서하가 순찰에서 가려진 담을 짚는다. 넘다가 무릎이 까지지만 불빛은 멀어진다. “전 남은 분들과 갈게요. 발밑 보세요.” 서하는 조석표를 다시 펴고 숙소 앞에 남는다.',
            'Seo-ha points out a wall hidden from the patrol. The climb scrapes your knees, but the searchlights recede. “I’ll go with those still here. Watch your footing.” She opens her tide table and stays.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'trace', amount: -2 },
            { kind: 'flag', key: 'sea_seo_ha_1', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_seo_ha_2',
    acts: [5],
    route: 'sea_5',
    title: t('옮겨진 부표', 'The Shifted Buoy'),
    speaker: 'seo_ha',
    image: 'v2/events/sea_arc_seo_ha_2.webp',
    requires: { companion: 'seo_ha', notFlag: 'sea_seo_ha_2' },
    improvise: false,
    gmHints: ['옮겨진 항로 부표', '빈 창문의 식사 소리', '늦게 여는 물길'],
    text: t(
      '항로 표지 부표가 잠긴 동네의 입구를 막고 있다. 뒤편에서 식사하는 소리가 들리지만 창문은 모두 비었다. 서하가 부표를 붙잡는다. “이건 제가 옮겼어요. 저쪽으로 배를 들이지 말라는 명령이었죠.” 손에 힘이 들어간다. “배가 돌아갔는지는 끝내 안 물었어요.” 부표를 되돌리면 길이 열리지만 물살도 함께 들어온다.',
      'A channel buoy blocks the entrance to a submerged neighborhood. Supper sounds come from behind it, though every window is empty. Seo-ha grips the buoy. “I moved this. Orders were to keep ships out.” Her hands tighten. “Never asked whether the ship turned back.” Returning the buoy would open the channel, and let the current in.',
    ),
    options: [
      {
        label: t('물살을 버티며 부표를 원래 자리로 옮긴다', 'Brace against the current and restore the buoy'),
        hint: t('HP −5 · 서하 유대 +1', '−5 HP · Seo-ha bond +1'),
        success: {
          text: t(
            '차가운 물이 가슴을 친다. 서하가 당신과 보조를 맞춰 부표를 민다. 빈 창문 너머에서 식기 놓는 소리가 멎는다. “길은 열렸어요.” 서하는 한 번 더 뒤를 본다. “늦었다고 안 열 수는 없죠.”',
            'Cold water strikes your chest. Seo-ha matches your steps as you push the buoy back. Beyond the empty windows, the supper sounds stop. “The channel’s open.” She looks back once more. “Being late isn’t a reason to leave it shut.”',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_seo_ha_2', value: 1 },
          ],
        },
      },
      {
        label: t('지금 지나는 사람을 위해 안전한 새 길을 표시한다', 'Mark a safe new channel for people crossing now'),
        hint: t('추적 +5 · 서하 유대 +1', '+5 Trace · Seo-ha bond +1'),
        success: {
          text: t(
            '서하가 부표의 불빛을 살아 있는 사람들 쪽으로 돌린다. 순찰도 그 불을 보게 된다. “옛 항로는 기억할게요. 오늘 건너는 분들부터 안내하고요.” 물가에서 기다리던 사람들이 움직인다.',
            'Seo-ha turns the buoy’s light toward the living. The patrol sees it too. “I’ll remember the old channel. First, the people crossing today.” Those waiting at the water’s edge begin to move.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
            { kind: 'flag', key: 'sea_seo_ha_2', value: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_seo_ha_3',
    acts: [6],
    route: 'sea_6',
    title: t('답하지 않은 무적', 'The Unanswered Foghorn'),
    speaker: 'seo_ha',
    image: 'v2/events/sea_arc_seo_ha_3.webp',
    requires: { companion: 'seo_ha', notFlag: 'sea_seo_ha_3' },
    improvise: false,
    gmHints: ['짧은 무적 세 번', '주름진 손과 손잡이', '안개 속 돌아온 호출'],
    text: t(
      '등대 바깥의 무적이 짧게 세 번 운다. 서하의 입술이 소리 없이 같은 간격을 따라간다. “도선사를 부르는 소리예요.” 지워진 항로에서 돌아온 호출이 안개를 떤다. 서하는 오래 듣고 나서야 말한다. “그날도 들었어요. 대답하면 명령을 어기는 거였죠.” 무적의 손잡이 옆에 주름진 손이 놓인다. “오늘은 어떻게 돌아가면 좋을까요.”',
      'Outside the lighthouse, a foghorn gives three short calls. Seo-ha’s lips silently follow the intervals. “Calling for a pilot.” A summons from an erased route trembles through the fog. After listening a long time, she speaks. “Heard it that day too. Answering would have broken orders.” Her weathered hand rests beside the horn’s lever. “How shall we find the way home today?”',
    ),
    options: [
      {
        label: t('무적을 울려 돌아온 호출에 답한다', 'Sound the horn and answer the returning call'),
        hint: t('추적 +6 · 서하 유대 +1 · 잔향 +10', '+6 Trace · Seo-ha bond +1 · +10 Echoes'),
        success: {
          text: t(
            '서하가 손잡이를 당긴다. 소리가 안개를 밀고 나가자 멀리서 짧은 답이 온다. 배는 나타나지 않는다. 서하는 끝까지 기다린 뒤 손을 놓는다. “들었어요. 이번에는 분명히 대답했어요.” 당신 쪽으로 돌아선 얼굴이 젖어 있다.',
            'Seo-ha pulls the lever. The sound presses into the fog, and a brief reply comes back. No ship appears. She waits until the end before letting go. “Heard it. This time the answer went through.” Her face is wet when she turns toward you.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
            { kind: 'echoes', amount: 10 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_seo_ha_3', value: 1 },
          ],
        },
      },
      {
        label: t('손을 잡고 소리 없이 일행의 귀로를 찾는다', 'Take her hand and guide the party home in silence'),
        hint: t('HP −4 · 모두 회복 6 · 서하 유대 +1', '−4 HP · party heals 6 · Seo-ha bond +1'),
        success: {
          text: t(
            '서하가 손잡이에서 손을 뗀다. 허리까지 차는 물길은 아프도록 차갑지만, 등대단의 길에서는 멀어진다. 마른 곳에 도착해 모두가 숨을 고른다. “오늘은 마지막 사람까지 같이 왔어요.” 서하는 당신 손을 조금 늦게 놓는다.',
            'Seo-ha lifts her hand from the lever. The waist-deep channel is painfully cold, but it leads away from the Keepers. On dry ground, everyone catches their breath. “Stayed with the last person today.” She lets go of your hand a little later.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'bond', id: 'seo_ha', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
            { kind: 'flag', key: 'sea_seo_ha_3', value: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_parang_1',
    acts: [4],
    route: 'sea_4',
    title: t('이름 없는 압류품', 'Seized Without a Name'),
    speaker: 'parang',
    image: 'v2/events/sea_arc_parang_1.webp',
    requires: { noCompanion: 'parang', notFlag: 'sea_parang_1' },
    improvise: false,
    gmHints: ['이름 칸이 빈 압류 딱지', '남의 손에 남은 버릇', '젖은 파란 소매'],
    text: t(
      '세관 창고 밖에 젖은 아이가 앉아 있다. 소매의 압류 딱지는 이름 칸만 비어 있다. 아이가 두 손으로 무언가를 뜨는 시늉을 한다. “식으면 위에 막이 생겼어. 아침마다 걷어 냈댔어.” 무엇을 먹었느냐고 묻자 손이 멎는다. “그릇 잡던 손은 훨씬 컸어.” 창고 안에서 회수 담당자가 걸어 나온다.',
      'A wet child sits outside the Customs warehouse. The seizure sticker on one sleeve has an empty name field. Small hands mime skimming a surface. “A skin formed when it cooled. Someone skimmed it every morning.” Asked about the food, the hands stop. “The hands holding the bowl were much bigger.” A retrieval officer steps out of the warehouse.',
    ),
    options: [
      {
        label: t('압류 딱지를 떼고 아이와 함께 떠난다', 'Remove the seizure sticker and leave with the child'),
        hint: t('추적 +5 · 파랑 합류', '+5 Trace · recruit Parang'),
        success: {
          text: t(
            '회수 담당자가 정중하게 정지를 요청한다. 당신은 걸음을 멈추지 않는다. 무슨 이름으로 부를까 묻자 아이가 물기 어린 소매를 본다. “파랑. 젖기 전엔 파랬대.” 작은 발이 당신 보폭을 따라온다.',
            'The officer politely requests that you stop. You keep walking. Asked for a name, the child looks at the wet sleeve. “Parang. Blue before the soaking, someone said.” Small feet match your pace.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'companion', id: 'parang' },
            { kind: 'flag', key: 'sea_parang_1', value: 1 },
          ],
        },
      },
      {
        label: t('보관료를 내고 아이의 인계를 받는다', 'Pay the storage charge and take the child out'),
        hint: t('25₵ · 파랑 합류', '25₵ · recruit Parang'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '담당자는 소매에서 딱지를 떼어 간다. 당신은 아이에게 물건을 산 것이 아니라 나갈 길을 샀다고 말한다. 아이가 빈 소매를 만진다. “파랑이라고 불렀어. 누가 불렀는지는 안 남았어.” 이번에는 당신이 그 이름을 부른다.',
            'The officer peels the sticker from the sleeve. You explain that the payment bought a way out, not a person. The child touches the bare cloth. “The name was Parang. No memory of the voice calling.” This time, you say the name.',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'companion', id: 'parang' },
            { kind: 'flag', key: 'sea_parang_1', value: 2 },
          ],
        },
      },
      {
        label: t('아이에게 외투를 건네고 물러난다', 'Give the child your coat and slip away'),
        hint: t('HP −2 · 추적 −2 · 파랑은 남는다', '−2 HP · −2 Trace · leave Parang'),
        success: {
          text: t(
            '외투를 덮어 주자 작은 손이 마른 옷깃을 만진다. “이건 따뜻했던 손이 알아.” 담당자의 시선이 아이에게 머무는 동안 당신은 골목으로 빠진다. 외투 없는 어깨에 찬바람이 파고든다.',
            'Small hands touch the dry collar of your coat. “Hands that knew warmth remember this.” While the officer watches the child, you slip into an alley. Cold wind bites your uncovered shoulders.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'trace', amount: -2 },
            { kind: 'flag', key: 'sea_parang_1', value: 3 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_parang_2',
    acts: [5],
    route: 'sea_5',
    title: t('혀끝의 저녁', 'An Evening on the Tongue'),
    speaker: 'parang',
    image: 'v2/events/sea_arc_parang_2.webp',
    requires: { companion: 'parang', notFlag: 'sea_parang_2' },
    improvise: false,
    gmHints: ['혀끝의 낯선 저녁', '손에 닿는 소금 결정', '식탁 끝의 빈자리'],
    text: t(
      '바지선 시장의 노인이 소금 결정 하나를 내민다. 파랑이 손을 가까이 대자 아이답지 않게 굽은 손짓이 나온다. “문 닫아. 국 식는다.” 목소리가 돌아온 뒤 파랑이 입술을 다문다. “한 번도 먹은 적 없는 저녁이야.” 노인은 결정을 물에 돌려주면 저녁도 잊힌다고 말한다. 파랑의 손이 당신 앞에서 멈춘다.',
      'An elder in the barge market offers a salt crystal. As Parang reaches toward it, the small hand curls with an old person’s habit. “Shut the door. Supper’s getting cold.” The child falls quiet when the voice passes. “An evening without a single bite ever tasted.” The elder says returning the crystal to the water would take the supper with it. Parang’s hand stops in front of you.',
    ),
    options: [
      {
        label: t('결정을 맡아 들고 저녁 이야기를 끝까지 듣는다', 'Hold the crystal and hear the evening through'),
        hint: t('HP −4 · 파랑 유대 +1', '−4 HP · Parang bond +1'),
        success: {
          text: t(
            '소금이 손금을 파고들자 낯선 허기가 몰려온다. 당신은 손을 펴지 않고 다섯 사람의 저녁을 듣는다. 파랑의 어깨가 조금 내려간다. “식탁 끝에 자리가 남았어. 아직 따뜻해.” 이야기가 끝나자 허기도 천천히 가신다.',
            'Salt bites into your palm and an unfamiliar hunger rises. You keep your hand closed and listen to an evening shared by five people. Parang’s shoulders ease. “A place left at the end of the table. Still warm.” When the story ends, the hunger slowly fades.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'bond', id: 'parang', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
            { kind: 'flag', key: 'sea_parang_2', value: 1 },
          ],
        },
      },
      {
        label: t('아이에게 물에 돌려줘도 된다고 말한다', 'Tell Parang the crystal may go back into the water'),
        hint: t('추적 +4 · 파랑 유대 +1 · 기억 놓기', '+4 Trace · Parang bond +1 · release memory'),
        success: {
          text: t(
            '파랑이 손을 펴자 결정이 물에 녹는다. 잊힌 식구를 찾던 등대단의 탐지등이 당신들 쪽으로 돈다. 파랑은 식탁의 모양을 잊고도 손을 펴 둔다. “배고픈 목소리가 멎었어. 이제 걸어도 돼.”',
            'Parang opens a hand and the crystal dissolves. A Keeper searchlight following the forgotten family turns toward you. The child forgets the shape of the table but leaves the hand open. “The hungry voice has gone quiet. Time to walk.”',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'bond', id: 'parang', amount: 1 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_parang_2', value: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea_arc_parang_3',
    acts: [6],
    route: 'sea_6',
    title: t('오늘 생긴 이름', 'A Name That Began Today'),
    speaker: 'parang',
    image: 'v2/events/sea_arc_parang_3.webp',
    requires: { companion: 'parang', notFlag: 'sea_parang_3' },
    improvise: false,
    gmHints: ['렌즈 속 빌린 얼굴', '오늘 생긴 이름', '끝에 남은 작은 손'],
    text: t(
      '등대 렌즈 앞에서 파랑이 멈춘다. 유리 속에는 아이 대신 서로 다른 나이의 얼굴들이 지나간다. IX가 지운 사람들의 기억이 아이의 손과 목소리를 빌려 온 것이다. 마지막 얼굴까지 사라지자 파랑이 당신을 본다. “빌린 얼굴이 다 돌아가면, 파랑도 없어질까.” 작은 손이 렌즈에 닿기 직전 멈춘다. “오늘 걸어온 길은 남았으면 좋겠어.”',
      'Parang stops before the lighthouse lens. Faces of different ages pass through the glass where the child’s reflection should be. The memories of people erased by IX have borrowed these hands and this voice. When the last face fades, Parang looks up. “When the borrowed faces go home, will Parang disappear too?” A small hand stops just short of the lens. “Let today’s walk stay.”',
    ),
    options: [
      {
        label: t('곁에서 이름을 부르며 기억을 돌려보낸다', 'Stay close, say Parang’s name, and let the memories go'),
        hint: t('HP −5 · 파랑 유대 +1 · 잔향 +10', '−5 HP · Parang bond +1 · +10 Echoes'),
        success: {
          text: t(
            '당신도 렌즈에 손을 대고 파랑의 이름을 부른다. 낯선 이별이 가슴을 통과할 때마다 숨이 아프다. 끝내 작은 손 하나만 당신 손 옆에 남는다. “파랑.” 아이가 천천히 발음한다. “오늘 들은 목소리는 기억나.”',
            'You touch the lens beside Parang and say the name. Every unfamiliar farewell hurts as it passes through your chest. At last, only one small hand remains beside yours. “Parang.” The child forms the sound slowly. “The voice from today stayed.”',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'bond', id: 'parang', amount: 1 },
            { kind: 'echoes', amount: 10 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
            { kind: 'flag', key: 'sea_parang_3', value: 1 },
          ],
        },
      },
      {
        label: t('오늘은 돌려보내지 않아도 된다고 말한다', 'Tell Parang the memories do not have to leave today'),
        hint: t('추적 +6 · 파랑 유대 +1 · 관찰 +1', '+6 Trace · Parang bond +1 · OBS +1'),
        success: {
          text: t(
            '파랑이 렌즈에서 손을 거둔다. 돌아가지 않은 얼굴들을 찾아 등대의 빛이 좁아진다. 아이는 놀라지 않고 당신 옆에 선다. “아직 같이 걷고 싶어.” 남의 기억에서 빌리지 않은 말이 처음으로 또렷하다.',
            'Parang draws the hand away. The lighthouse beam narrows, searching for the faces that have not returned. The child stands beside you without flinching. “Another walk together. Not finished yet.” For once, the words are clear without being borrowed.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'bond', id: 'parang', amount: 1 },
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
            { kind: 'flag', key: 'sea_parang_3', value: 2 },
          ],
        },
      },
    ],
  },
]

const art = (subject: string, effect: string): string =>
  `${subject}. Painterly cyberpunk realism set in the erased Korean port of Haemun, eye-level composition, natural human proportions and believable materials, restrained rust, slate and faded teal palette. Exactly one restrained effect: ${effect}. No text, lettering, numbers, logos, watermarks or interface elements.`

export const SEA_ART: Record<string, string> = {
  'characters/mujin.png': art(
    'Portrait of Mujin, a Korean crane operator and dock foreman in his fifties, broad weathered face, short iron-gray hair, faded orange work jacket, reinforced gloves resting below the frame, tired attentive eyes, dry industrial harbor background',
    'a faint warm reflection along one cheek',
  ),
  'characters/seo-ha.png': art(
    'Portrait of Seo-ha, a Korean retired harbor pilot in her sixties, silver hair tied low, sun-weathered face, dark teal waterproof coat with a high collar, practical layered clothes, a small dry smile, empty dock passage behind her',
    'one soft reflected glint in her eyes',
  ),
  'characters/parang.png': art(
    'Portrait of Parang, an androgynous Korean child about eleven, ordinary child proportions, uneven dark hair, oversized faded blue raincoat, bare unadorned face, salt-damp cuffs, quiet watchful expression, gray harbor wall behind',
    'a single faint pale reflection along one wet sleeve',
  ),
  'characters/navigator.png': art(
    'Portrait of the Navigator, an androgynous Korean adult connector in a weathered navy expedition coat, short dark hair, practical flotation harness, compact wrist instrument without visible markings, observant composed expression, erased harbor behind',
    'a faint amber glow from the wrist instrument',
  ),
  'v2/implants/tide_table.webp': art(
    'Square inventory illustration of a palm-sized weathered brass tide-table implant, layered concentric mechanical rings and a blank ceramic inset, no labels or readable markings, resting on dark waterproof fabric',
    'one small amber indicator glow',
  ),
  'v2/cards/mujin_shoulder_in.webp': art(
    'Square card illustration of Mujin in a faded orange dock jacket driving his shoulder into an armored Customs unit on a narrow quay, grounded stance and visible weight',
    'a small puff of concrete dust at contact',
  ),
  'v2/cards/mujin_hook_line.webp': art(
    'Square card illustration of Mujin pulling a taut crane-hook line caught around a Customs machine, the worn steel hook and gloved hands clearly readable',
    'one brief spark where the hook catches metal',
  ),
  'v2/cards/mujin_container_drop.webp': art(
    'Square card illustration of Mujin guiding a lowered empty freight container into a gap between dock lanes, the container forming solid cover, clear believable suspension cables',
    'a narrow cloud of dust beneath the settling container',
  ),
  'v2/cards/mujin_deadweight.webp': art(
    'Square card illustration of Mujin bringing a compact industrial counterweight down onto a Customs machine at arm’s reach, heavy controlled motion and solid footing',
    'one small spray of rust flakes at impact',
  ),
  'v2/cards/mujin_clear_the_quay.webp': art(
    'Square card illustration of Mujin releasing a suspended steel cargo beam across a crowded dock lane, nearby machines losing their footing, clearly readable lateral force',
    'a single low ribbon of dust along the beam’s path',
  ),
  'v2/cards/seo_ha_pass_the_wake.webp': art(
    'Square card illustration of silver-haired Seo-ha stepping into a threatened ally’s place while guiding the ally behind her, faded teal coat, practical movement on a wet quay',
    'one small wake curling around their boots',
  ),
  'v2/cards/seo_ha_read_the_tide.webp': art(
    'Square card illustration of Seo-ha crouching to study the waterline against a corroded dock wall, silver hair tied low, calm attention rather than a magical pose',
    'a faint reflected ripple of light beneath her eyes',
  ),
  'v2/cards/seo_ha_safe_channel.webp': art(
    'Square card illustration of Seo-ha pointing an ally through a narrow dry passage between flooded dock foundations, protective body position and clear destination',
    'one thin ripple crossing the abandoned route',
  ),
  'v2/cards/seo_ha_harbor_shelter.webp': art(
    'Square card illustration of Seo-ha gathering exhausted travelers behind a heavy harbor windbreak, readable faces and practical layered clothing, enclosing solid shapes',
    'a small sheet of spray breaking against the outside wall',
  ),
  'v2/cards/seo_ha_last_crossing.webp': art(
    'Square card illustration of Seo-ha staying behind the last traveler at a narrow harbor crossing, one hand extended to guide the group, dangerous gray water close below',
    'a single soft lamp reflection along the safe passage',
  ),
  'v2/cards/parang_take_mark.webp': art(
    'Square card illustration of Parang in an oversized blue raincoat reaching toward a marked Customs machine, one small hand extended, ordinary child anatomy and a serious expression',
    'one dim red mark mirrored between the machine and the child’s sleeve',
  ),
  'v2/cards/parang_other_shore.webp': art(
    'Square card illustration of Parang and a Customs unit exchanging places across a short wet dock passage, opposing footprints make the change legible, no duplicate bodies',
    'one narrow distortion in the puddle between their positions',
  ),
  'v2/cards/parang_borrow_ache.webp': art(
    'Square card illustration of Parang touching a wounded machine’s casing and then holding a small hand against a blue sleeve, tenderness and burden, no visible gore',
    'one fine red thread of light between the casing and the sleeve',
  ),
  'v2/cards/parang_salt_pulse.webp': art(
    'Square card illustration of Parang bracing a trembling wrist and extending the other palm toward a Customs machine, oversized faded raincoat, pain conveyed through posture, no gore',
    'a single compact pale pulse leaving the open palm',
  ),
  'v2/cards/parang_last_borrow.webp': art(
    'Square card illustration of Parang standing small and steady before several hostile machines in a dark harbor lane, eyes open, raincoat held close, the burden visible in the posture',
    'one translucent band of overlapping remembered faces passing behind the child',
  ),
  'v2/cards/navigator_sound_depth.webp': art(
    'Square card illustration of the Navigator lowering a weighted sounding line beside an industrial quay, navy coat and compact wrist instrument, careful practical inspection',
    'one small ring spreading where the weight touches water',
  ),
  'v2/cards/navigator_chart_course.webp': art(
    'Square card illustration of the Navigator and an ally changing places at a narrow dock junction, the Navigator indicating a safe route with an open hand',
    'one faint amber reflection from the wrist instrument',
  ),
  'v2/cards/navigator_slack_water.webp': art(
    'Square card illustration of the Navigator waiting beside a motionless stretch of harbor water, grounded patient posture, navy expedition coat and practical harness',
    'one lingering ripple settling against the quay',
  ),
  'v2/cards/navigator_tow_line.webp': art(
    'Square card illustration of the Navigator hauling a taut industrial towline attached to a Customs machine, the machine pulled off its firing position, readable tension',
    'one brief spark beneath a dragging metal foot',
  ),
  'v2/cards/navigator_give_way.webp': art(
    'Square card illustration of the Navigator stepping aside to open a narrow passage for an ally, protective hand against the quay wall, practical coordinated movement',
    'one small splash under the ally’s advancing boot',
  ),
  'v2/cards/navigator_bearing_shot.webp': art(
    'Square card illustration of the Navigator aiming a compact practical sidearm down a long empty dock lane, steady stance, visible alignment between arm and target',
    'one restrained amber aiming point on distant armor',
  ),
  'v2/cards/navigator_night_watch.webp': art(
    'Square card illustration of the Navigator keeping anchor watch while companions rest behind a solid dock barrier, navy coat, tired alert eyes, compact composition',
    'one warm pool of light from a sheltered lamp',
  ),
  'v2/cards/navigator_reserve_wind.webp': art(
    'Square card illustration of the Navigator closing a compact mechanical charge reservoir at the wrist, deliberate preparation, scuffed navy sleeve and brass fittings',
    'one soft amber glow under the reservoir’s seam',
  ),
  'v2/cards/navigator_cross_current.webp': art(
    'Square card illustration of a crosswise harbor current forcing machines away from a dock intersection while the Navigator directs the timing from stable footing',
    'one restrained band of disturbed water through the center',
  ),
  'v2/cards/navigator_safe_harbor.webp': art(
    'Square card illustration of the Navigator ushering the whole party behind a thick breakwater while leaving space for the last companion, grounded protective composition',
    'one low sheet of spray against the seaward wall',
  ),
  'v2/events/sea_arc_mujin_1.webp': art(
    'Wide narrative still at the dry harbor floor, Mujin in a faded orange work jacket and an adult traveler straining at a manual crane brake, a single rusted hook suspended low between them, eye-level view of their effort',
    'a faint trickle of rust dust from the brake housing',
  ),
  'v2/events/sea_arc_mujin_2.webp': art(
    'Wide narrative still inside a flooded workers’ dormitory, Mujin touching a wet shift list on a failing wall while an adult companion stands close, the list has only indistinct unreadable strokes, water below their knees',
    'one small ripple against the wall',
  ),
  'v2/events/sea_arc_mujin_3.webp': art(
    'Wide narrative still beneath the last lighthouse, Mujin sitting on the threshold of an empty freight container beside an adult companion, the bare interior plainly visible, weathered hands finally relaxed',
    'a thin veil of sea mist passing through the open doorway',
  ),
  'v2/events/sea_arc_seo_ha_1.webp': art(
    'Wide narrative still at the dry harbor dormitories, silver-haired Seo-ha in a faded teal coat showing a tide table to travelers, the paper contains abstract unreadable markings only, practical concern on her face',
    'one shallow tongue of water reaching the ground behind them',
  ),
  'v2/events/sea_arc_seo_ha_2.webp': art(
    'Wide narrative still at a flooded residential entrance, Seo-ha and an adult traveler bracing a displaced channel buoy, empty dark windows beyond, the buoy is the scene’s sole prominent prop',
    'one small reflected buoy light trembling on the water',
  ),
  'v2/events/sea_arc_seo_ha_3.webp': art(
    'Wide narrative still outside the last lighthouse, Seo-ha’s weathered hand resting beside a foghorn lever, an adult companion close enough to offer a hand, her face wet and composed, no vessel visible',
    'a single soft bank of fog beyond the railing',
  ),
  'v2/events/sea_arc_parang_1.webp': art(
    'Wide narrative still outside a Customs warehouse, a wet child in an oversized faded blue raincoat sitting at adult eye level on a low loading ledge, an unmarked seizure sticker on one sleeve, a traveler kneeling nearby',
    'one small droplet falling from the sleeve',
  ),
  'v2/events/sea_arc_parang_2.webp': art(
    'Wide narrative still in a barge market, Parang offering a single salt crystal to an adult traveler’s open hand, ordinary child proportions, quiet uncertainty, blurred stalls without signs',
    'one faint warm reflection inside the salt crystal',
  ),
  'v2/events/sea_arc_parang_3.webp': art(
    'Wide narrative still at the lighthouse lens, Parang and an adult traveler holding their hands near the glass at the child’s eye level, the blue raincoat and small fingers distinct, restrained intimate composition',
    'one faint sequence of remembered human faces reflected within the lens',
  ),
}

const spriteSubjects: Record<string, string> = {
  mujin:
    'Mujin, a broad Korean dock foreman in his fifties with short iron-gray hair, faded orange work jacket, reinforced gloves, sturdy work trousers and heavy boots',
  'seo-ha':
    'Seo-ha, a Korean retired harbor pilot in her sixties with silver hair tied low, a weathered kind face, faded teal waterproof coat, practical trousers and nonslip boots',
  parang:
    'Parang, an androgynous Korean child about eleven with ordinary child proportions, uneven dark hair, an oversized faded blue raincoat and simple scuffed shoes',
  navigator:
    'The Navigator, an androgynous Korean adult with short dark hair, a weathered navy expedition coat, practical flotation harness, compact wrist instrument and nonslip boots',
}

const spritePoses: Record<string, string> = {
  idle: 'standing at ease but attentive, hands naturally lowered',
  attack: 'making a compact controlled strike toward the right, balanced stance',
  hit: 'recoiling slightly toward the left, pain visible without gore',
  guard: 'bracing defensively toward the right, feet firmly planted',
  skill: 'extending one hand toward the right in a deliberate practical gesture',
  cover: 'lowering into a protective crouch facing right, both feet visible',
}

for (const [key, subject] of Object.entries(spriteSubjects)) {
  for (const [pose, action] of Object.entries(spritePoses)) {
    SEA_ART[`v2/sprites/${key}-${pose}.webp`] = art(
      `Full-body tactical game sprite of ${subject}, ${action}, facing right, eye-level camera, transparent background, 512 by 768 canvas, whole body within frame, feet aligned 18 pixels above the bottom edge, consistent identity and clothing across all poses`,
      'a faint reflected teal rim light along one edge of the clothing',
    )
  }
}