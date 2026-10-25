// Archive (meta) unlocks bought with Echoes ◈.
// Earnings budget: a failed run ≈ 15-35 ◈, a win ≈ 80-120 ◈ → the full tree (~900 ◈) takes
// roughly 15-25 loops; the first purchases (a companion or the first thread) land after 1-2 runs.
import type { MetaUnlockDef } from '../engine/types.ts'
import { NEW_COMPANION_UNLOCKS } from './packs/new_companions/index.ts'
import { NEW_ARCHETYPE_UNLOCKS } from './packs/new_archetypes/index.ts'

const BASE_UNLOCKS: MetaUnlockDef[] = [
  // ------------------------------------------------------------ archetypes
  {
    id: 'unlock_smuggler',
    kind: 'archetype',
    name: { ko: '데이터 밀수꾼', en: 'Data Smuggler' },
    text: {
      ko: '장비와 해킹으로 길을 뚫는 접속자. 이 아키타입으로 루프를 시작할 수 있다.',
      en: 'A connector who opens the way with gear and hacks. Start loops as this archetype.',
    },
    cost: 40,
    grants: 'smuggler',
    icon: 'items/data_fragment.png',
  },
  {
    id: 'unlock_echo_collector',
    kind: 'archetype',
    name: { ko: '잔향 수집가', en: 'Echo Collector' },
    text: {
      ko: '말과 기억으로 사람을 곁에 붙드는 접속자. 이 아키타입으로 루프를 시작할 수 있다.',
      en: 'A connector who holds on to people through words and memory. Start loops as this archetype.',
    },
    cost: 60,
    grants: 'echo_collector',
    icon: 'skills/memory_resonance.png',
  },
  // ------------------------------------------------------------ companions
  {
    id: 'unlock_su_ah',
    kind: 'companion',
    name: { ko: '수아 — 기억의 대장장이', en: 'Su-ah — The Memory Smith' },
    text: {
      ko: '지워진 기억을 두드려 장비로 벼려 내는 장인. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'A smith who forges erased memories into gear. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 35,
    grants: 'su_ah',
    icon: 'characters/su-ah.png',
  },
  {
    id: 'unlock_lin_yue',
    kind: 'companion',
    name: { ko: '린위에 — 환전상', en: 'Lin-yue — The Broker' },
    text: {
      ko: '야시장의 저울을 쥔 사람. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'The hand on the night market’s scales. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 40,
    grants: 'lin_yue',
    icon: 'characters/lin-yue.png',
  },
  {
    id: 'unlock_kai',
    kind: 'companion',
    name: { ko: '카이 — RX-09', en: 'Kai — RX-09' },
    text: {
      ko: '꿈을 꿨다는 이유로 폐기된 안드로이드. 2막 합류 후보에 들고, 시작 동료로도 고를 수 있다.',
      en: 'An android scrapped for dreaming. Joins the Act 2 recruit pool and can be your starting companion.',
    },
    cost: 45,
    grants: 'kai',
    icon: 'characters/kai.png',
  },
  // ------------------------------------------------------------ card packs
  {
    id: 'unlock_pack_overclock',
    kind: 'card_pack',
    name: { ko: '프로토콜 묶음: 오버클럭', en: 'Protocol Pack: Overclock' },
    text: {
      ko: '에너지와 화상, 시끄러운 고출력 카드가 보상과 상점에 등장한다.',
      en: 'Energy, burn and loud high-output cards appear in rewards and shops.',
    },
    cost: 35,
    grants: 'pack_overclock',
    icon: 'skills/signal_overdrive.png',
  },
  {
    id: 'unlock_pack_netrunner',
    kind: 'card_pack',
    name: { ko: '프로토콜 묶음: 넷러너', en: 'Protocol Pack: Netrunner' },
    text: {
      ko: '해킹과 표식, 카드를 뽑는 카드가 보상과 상점에 등장한다.',
      en: 'Hack, mark and draw cards appear in rewards and shops.',
    },
    cost: 45,
    grants: 'pack_netrunner',
    icon: 'skills/system_intrusion.png',
  },
  {
    id: 'unlock_pack_bastion',
    kind: 'card_pack',
    name: { ko: '프로토콜 묶음: 보루', en: 'Protocol Pack: Bastion' },
    text: {
      ko: '방어막과 밀쳐내기, 동료를 지키는 카드가 보상과 상점에 등장한다.',
      en: 'Block, push and protect-your-companions cards appear in rewards and shops.',
    },
    cost: 50,
    grants: 'pack_bastion',
    icon: 'skills/guardian_wall.png',
  },
  // ------------------------------------------------------------ implant packs
  {
    id: 'unlock_ipack_black_market',
    kind: 'implant_pack',
    name: { ko: '암시장 임플란트', en: 'Black-Market Implants' },
    text: {
      ko: '야시장 뒷골목에서 몰래 도는 불법 임플란트가 보상과 상점에 등장한다.',
      en: 'Illegal implants from the night market’s back alleys appear in rewards and shops.',
    },
    cost: 40,
    grants: 'ipack_black_market',
    icon: 'items/drone_scrap.png',
  },
  {
    id: 'unlock_ipack_ark_salvage',
    kind: 'implant_pack',
    name: { ko: 'ARK 회수품', en: 'ARK Salvage' },
    text: {
      ko: '첨탑에서 빼돌린 ARK 규격 임플란트가 보상과 상점에 등장한다.',
      en: 'ARK-grade implants smuggled out of the Spire appear in rewards and shops.',
    },
    cost: 55,
    grants: 'ipack_ark_salvage',
    icon: 'items/access_key.png',
  },
  // ------------------------------------------------------------ threads (permanent passives)
  {
    id: 'thread_vitality_1',
    kind: 'thread',
    name: { ko: '생존의 실 I', en: 'Thread of Survival I' },
    text: { ko: '루프를 시작할 때 최대 HP +4.', en: 'Start each loop with +4 max HP.' },
    cost: 20,
    passive: { maxHp: 4 },
    icon: 'items/mesh_vest.png',
  },
  {
    id: 'thread_vitality_2',
    kind: 'thread',
    name: { ko: '생존의 실 II', en: 'Thread of Survival II' },
    text: { ko: '추가로 최대 HP +4.', en: 'A further +4 max HP.' },
    cost: 35,
    passive: { maxHp: 4 },
    requires: 'thread_vitality_1',
    icon: 'items/mesh_vest.png',
  },
  {
    id: 'thread_vitality_3',
    kind: 'thread',
    name: { ko: '생존의 실 III', en: 'Thread of Survival III' },
    text: { ko: '추가로 최대 HP +4.', en: 'A further +4 max HP.' },
    cost: 55,
    passive: { maxHp: 4 },
    requires: 'thread_vitality_2',
    icon: 'items/heavy_exosuit.png',
  },
  {
    id: 'thread_emergency_fund',
    kind: 'thread',
    name: { ko: '비상금', en: 'Emergency Fund' },
    text: { ko: '루프를 시작할 때 크레딧 +30.', en: 'Start each loop with +30 credits.' },
    cost: 25,
    passive: { startCredits: 30 },
    icon: 'items/data_fragment.png',
  },
  {
    id: 'thread_first_aid',
    kind: 'thread',
    name: { ko: '구급 패치', en: 'First-Aid Patch' },
    text: { ko: '나노패치 1개를 들고 루프를 시작한다.', en: 'Start each loop holding a Nanopatch.' },
    cost: 30,
    passive: { startConsumable: 'nanopatch' },
    icon: 'items/nanopatch.png',
  },
  {
    id: 'thread_warm_meal',
    kind: 'thread',
    name: { ko: '따뜻한 밥', en: 'Warm Meal' },
    text: { ko: '은신처 휴식 회복량 +10%.', en: 'Safehouse rest heals +10% more.' },
    cost: 30,
    passive: { restHeal: 0.1 },
    icon: 'items/restart_core.png',
  },
  {
    id: 'thread_market_regular',
    kind: 'thread',
    name: { ko: '야시장 단골', en: 'Market Regular' },
    text: { ko: '상점 가격 −15%.', en: 'Shop prices are 15% lower.' },
    cost: 40,
    passive: { shopDiscount: 0.15 },
    icon: 'items/access_key.png',
  },
  {
    id: 'thread_clean_slate',
    kind: 'thread',
    name: { ko: '빈 서랍', en: 'Clean Slate' },
    text: {
      ko: '루프를 시작할 때 덱에서 카드 1장을 제거한다.',
      en: 'Remove a card from your deck at the start of each loop.',
    },
    cost: 45,
    passive: { startRemove: true },
    icon: 'skills/patch_protocol.png',
  },
  {
    id: 'thread_low_profile',
    kind: 'thread',
    name: { ko: '낮은 자세', en: 'Low Profile' },
    text: { ko: '추적 증가 −25%.', en: 'Gain 25% less Trace.' },
    cost: 50,
    passive: { traceMult: -0.25 },
    icon: 'items/stealth_cloak.png',
  },
  {
    id: 'thread_wider_choice',
    kind: 'thread',
    name: { ko: '넓은 시야', en: 'Wider Choice' },
    text: {
      ko: '카드 보상 선택지 +1.',
      en: 'Card rewards offer one extra option.',
    },
    cost: 70,
    passive: { rewardChoices: 1 },
    icon: 'skills/backdoor_route.png',
  },
]

export const UNLOCKS: MetaUnlockDef[] = [...BASE_UNLOCKS, ...NEW_ARCHETYPE_UNLOCKS, ...NEW_COMPANION_UNLOCKS]
