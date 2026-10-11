// Mythos 2.0 — Implants (relics). Pure data.
//
// Trigger effects resolve with the connector as owner: 'target' effects without an area land on the
// connector; area effects centre on the trigger position (e.g. where an enemy died).
// "Start of combat" block/energy/draw use `turn_start` + limit 'combat' so they land AFTER the turn-1
// block clear / energy refill / draw-to-hand. `combat_start` is used for enemy-facing statuses.
//
// Build-arounds (each archetype has 2-3):
//   push/bump chain  — erased_id, recoil_boots, impact_frame, domino_relay, momentum_core, chain_reaction
//   hack/turncoat    — feedback_loop, ix_shard, ark_coolant, afterimage
//   fortress         — thorn_weave, guardian_chip, bastion_core, salvaged_aegis
//   economy / loud   — overclocked_deck, credit_chip, bounty_board, pocket_jammer, black_ice_core
//   companion bond   — cracked_cube, med_pump, bastion_core, echo_lens

import type { ImplantDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const STARTER: ImplantDef[] = [
  {
    id: 'erased_id',
    name: t('말소된 ID', 'Erased ID'),
    text: t('충돌 피해 +1. 턴마다 첫 환경 처치 시 카드 1장을 뽑는다.', 'Bumps deal +1. First environment kill each turn: draw 1.'),
    rarity: 'starter',
    icon: 'items/access_key.png',
    passive: { bumpDamage: 1 },
    triggers: [{ on: 'environment_kill', effects: [{ kind: 'draw', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'overclocked_deck',
    name: t('오버클럭 덱', 'Overclocked Deck'),
    text: t('전투 첫 턴 에너지 +1. 크레딧 획득 +25%.', 'First turn of each combat: +1 energy. Credits gained +25%.'),
    rarity: 'starter',
    icon: 'items/overload_stim.png',
    passive: { creditMult: 0.25 },
    triggers: [{ on: 'turn_start', effects: [{ kind: 'energy', amount: 1 }], limit: 'combat' }],
  },
  {
    id: 'cracked_cube',
    name: t('금 간 데이터 큐브', 'Cracked Data Cube'),
    text: t('전투 첫 턴, 모든 아군 방어막 5. 승리하면 모든 아군 회복 2.', 'First turn of each combat: all allies gain 5 block. On victory, all allies heal 2.'),
    rarity: 'starter',
    icon: 'items/restart_core.png',
    triggers: [
      { on: 'turn_start', effects: [{ kind: 'block', amount: 5, to: 'all_allies' }], limit: 'combat' },
      { on: 'combat_won', effects: [{ kind: 'heal', amount: 2, to: 'all_allies' }] },
    ],
  },
]

const COMMON: ImplantDef[] = [
  {
    id: 'mesh_vest',
    name: t('메시 조끼', 'Mesh Vest'),
    text: t('전투 첫 턴, 방어막 8.', 'First turn of each combat: gain 8 block.'),
    rarity: 'common',
    icon: 'items/mesh_vest.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 8, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'recoil_boots',
    name: t('반동 부츠', 'Recoil Boots'),
    text: t('충돌 피해 +1.', 'Bumps deal +1.'),
    rarity: 'common',
    icon: 'skills/magnetic_repulse.png',
    passive: { bumpDamage: 1 },
  },
  {
    id: 'scrap_plating',
    name: t('고철 장갑판', 'Scrap Plating'),
    text: t('적이 쓰러질 때마다 방어막 3.', 'Whenever an enemy dies, gain 3 block.'),
    rarity: 'common',
    icon: 'items/drone_scrap.png',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'block', amount: 3, to: 'connector' }] }],
  },
  {
    id: 'credit_chip',
    name: t('크레딧 칩', 'Credit Chip'),
    text: t('크레딧 획득 +30%.', 'Credits gained +30%.'),
    rarity: 'common',
    icon: 'items/data_fragment.png',
    passive: { creditMult: 0.3 },
  },
  {
    id: 'pocket_jammer',
    name: t('휴대 교란기', 'Pocket Jammer'),
    text: t('추적 증가 −25%.', 'Trace gained −25%.'),
    rarity: 'common',
    icon: 'skills/covering_noise.png',
    passive: { traceMult: -0.25 },
  },
  {
    id: 'stim_reservoir',
    name: t('자극제 저장고', 'Stim Reservoir'),
    text: t('최대 HP +7.', 'Max HP +7.'),
    rarity: 'common',
    icon: 'items/stim_shard.png',
    passive: { maxHp: 7 },
  },
  {
    id: 'cracked_lens',
    name: t('금 간 렌즈', 'Cracked Lens'),
    text: t('전투 시작 시 무작위 적 하나에 표식 5.', 'Combat start: Mark 5 on a random enemy.'),
    rarity: 'common',
    icon: 'status/acid.png',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'mark', amount: 5, to: 'random_enemy' }] }],
  },
  {
    id: 'spare_cell',
    name: t('예비 전지', 'Spare Cell'),
    text: t('전투 첫 턴, 카드를 2장 더 뽑는다.', 'First turn of each combat: draw 2 more.'),
    rarity: 'common',
    icon: 'items/restart_core.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'draw', amount: 2 }], limit: 'combat' }],
  },
  {
    id: 'med_pump',
    name: t('나노 펌프', 'Nano Pump'),
    text: t('전투에서 이기면 모든 아군 회복 4.', 'On victory, all allies heal 4.'),
    rarity: 'common',
    icon: 'items/nanopatch.png',
    triggers: [{ on: 'combat_won', effects: [{ kind: 'heal', amount: 4, to: 'all_allies' }] }],
  },
  {
    id: 'trigger_discipline',
    name: t('사격 규율', 'Trigger Discipline'),
    text: t('턴마다 공격 카드를 처음 쓰면 방어막 4.', 'First attack card each turn: gain 4 block.'),
    rarity: 'common',
    icon: 'items/signal_blade.png',
    triggers: [{ on: 'play_attack', effects: [{ kind: 'block', amount: 4, to: 'connector' }], limit: 'turn' }],
  },
]

const UNCOMMON: ImplantDef[] = [
  {
    id: 'echo_lens',
    name: t('잔향 렌즈', 'Echo Lens'),
    text: t('카드 보상 선택지 +1.', 'Card rewards offer +1 choice.'),
    rarity: 'uncommon',
    icon: 'skills/memory_resonance.png',
    passive: { rewardChoices: 1 },
  },
  {
    id: 'feedback_loop',
    name: t('피드백 루프', 'Feedback Loop'),
    text: t('전술 카드를 쓸 때마다 무작위 적에게 피해 2.', 'Whenever you play a tactic, deal 2 to a random enemy.'),
    rarity: 'uncommon',
    icon: 'skills/system_hack.png',
    triggers: [{ on: 'play_tactic', effects: [{ kind: 'damage', amount: 2, to: 'random_enemy' }] }],
  },
  {
    id: 'momentum_core',
    name: t('관성 코어', 'Momentum Core'),
    text: t('턴마다 첫 환경 처치 시 에너지 +1.', 'First environment kill each turn: +1 energy.'),
    rarity: 'uncommon',
    icon: 'skills/magnetic_pull.png',
    triggers: [{ on: 'environment_kill', effects: [{ kind: 'energy', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'impact_frame',
    name: t('충격 프레임', 'Impact Frame'),
    text: t('충돌 피해 +2.', 'Bumps deal +2.'),
    rarity: 'uncommon',
    icon: 'skills/overload_strike.png',
    passive: { bumpDamage: 2 },
  },
  {
    id: 'guardian_chip',
    name: t('수호 칩', 'Guardian Chip'),
    text: t('전투 첫 턴, 접속자 수호 2 (매 턴 방어막 2).', 'First turn of each combat: the connector gains Guard 2.'),
    rarity: 'uncommon',
    icon: 'skills/nanoshield_projector.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'status', status: 'guard', amount: 2, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'reflex_booster',
    name: t('반사 증폭기', 'Reflex Booster'),
    text: t('턴마다 첫 카드를 쓰면 카드 1장을 뽑는다.', 'First card each turn: draw 1.'),
    rarity: 'uncommon',
    icon: 'skills/signal_overdrive.png',
    triggers: [{ on: 'first_card', effects: [{ kind: 'draw', amount: 1 }] }],
  },
  {
    id: 'heavy_exosuit',
    name: t('중장 외골격', 'Heavy Exosuit'),
    text: t('최대 HP +10. 전투 첫 턴, 방어막 4.', 'Max HP +10. First turn of each combat: gain 4 block.'),
    rarity: 'uncommon',
    icon: 'items/heavy_exosuit.png',
    passive: { maxHp: 10 },
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 4, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'adrenal_loop',
    name: t('아드레날린 회로', 'Adrenal Loop'),
    text: t('턴마다 처음 HP를 잃으면 에너지 +1.', 'First time you lose HP each turn: +1 energy.'),
    rarity: 'uncommon',
    icon: 'items/stim_shard.png',
    triggers: [{ on: 'damage_taken', effects: [{ kind: 'energy', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'thorn_weave',
    name: t('가시 직조', 'Thorn Weave'),
    text: t('전투 첫 턴, 모든 아군 가시 2.', 'First turn of each combat: all allies gain Thorns 2.'),
    rarity: 'uncommon',
    icon: 'status/hacked.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'status', status: 'thorns', amount: 2, to: 'all_allies' }], limit: 'combat' }],
  },
  {
    id: 'afterimage',
    name: t('잔상', 'Afterimage'),
    text: t('전술 카드를 쓸 때마다 방어막 2.', 'Whenever you play a tactic, gain 2 block.'),
    rarity: 'uncommon',
    icon: 'items/stealth_cloak.png',
    triggers: [{ on: 'play_tactic', effects: [{ kind: 'block', amount: 2, to: 'connector' }] }],
  },
]

const RARE: ImplantDef[] = [
  {
    id: 'ghost_engine',
    name: t('유령 엔진', 'Ghost Engine'),
    text: t('모든 아군 이동 +1.', 'All allies move +1.'),
    rarity: 'rare',
    icon: 'skills/signal_step.png',
    passive: { move: 1 },
  },
  {
    id: 'overclock_heart',
    name: t('과부하 심장', 'Overclock Heart'),
    text: t('손패 +1.', 'Hand size +1.'),
    rarity: 'rare',
    icon: 'skills/signal_overdrive.png',
    passive: { handSize: 1 },
  },
  {
    id: 'chain_reaction',
    name: t('연쇄 반응', 'Chain Reaction'),
    text: t('적이 쓰러지면 그 주변 4칸에 피해 3. 아군도 맞는다.', 'When an enemy dies, deal 3 to its 4 neighbours. Hits allies too.'),
    rarity: 'rare',
    icon: 'items/incendiary_grenade.png',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'damage', amount: 3, area: 'adjacent' }] }],
  },
  {
    id: 'bastion_core',
    name: t('보루 코어', 'Bastion Core'),
    text: t('매 턴 시작 시 모든 아군 방어막 3.', 'Start of each turn: all allies gain 3 block.'),
    rarity: 'rare',
    icon: 'skills/shield_field.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 3, to: 'all_allies' }] }],
  },
  {
    id: 'kill_chain',
    name: t('킬 체인', 'Kill Chain'),
    text: t('턴마다 첫 처치 시 에너지 +1, 카드 1장을 뽑는다.', 'First kill each turn: +1 energy, draw 1.'),
    rarity: 'rare',
    icon: 'items/signal_blade.png',
    triggers: [
      {
        on: 'enemy_killed',
        effects: [
          { kind: 'energy', amount: 1 },
          { kind: 'draw', amount: 1 },
        ],
        limit: 'turn',
      },
    ],
  },
  {
    id: 'domino_relay',
    name: t('도미노 계전기', 'Domino Relay'),
    text: t('충돌이 일어날 때마다 무작위 적에게 피해 2.', 'Whenever a bump happens, deal 2 to a random enemy.'),
    rarity: 'rare',
    icon: 'skills/magnetic_repulse.png',
    triggers: [{ on: 'bump', effects: [{ kind: 'damage', amount: 2, to: 'random_enemy' }] }],
  },
  {
    id: 'ix_shard',
    name: t('IX 파편', 'IX Shard'),
    text: t('전투 시작 시 모든 적 감전 1 — 첫 공격이 불발된다.', "Combat start: Shock 1 on all enemies — their first attacks fizzle."),
    rarity: 'rare',
    icon: 'skills/ix_optimization_protocol.png',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'shock', amount: 1, to: 'all_enemies' }] }],
  },
]

const BOSS: ImplantDef[] = [
  {
    id: 'black_ice_core',
    name: t('블랙 아이스 코어', 'Black ICE Core'),
    text: t('에너지 +1. 전투마다 추적 +6.', '+1 energy. Each combat: Trace +6.'),
    rarity: 'boss',
    icon: 'skills/ix_purge_field.png',
    passive: { energy: 1 },
    triggers: [{ on: 'combat_start', effects: [{ kind: 'trace', amount: 6 }] }],
  },
  {
    id: 'eater_maw',
    name: t('포식자의 턱', "Eater's Maw"),
    text: t('에너지 +1. 손패 −1.', '+1 energy. Hand size −1.'),
    rarity: 'boss',
    icon: 'status/corrode.png',
    passive: { energy: 1, handSize: -1 },
  },
  {
    id: 'haetae_treads',
    name: t('해태 궤도', 'HAETAE Treads'),
    text: t('에너지 +1. 모든 아군 이동 −1.', '+1 energy. All allies move −1.'),
    rarity: 'boss',
    icon: 'items/heavy_exosuit.png',
    passive: { energy: 1, move: -1 },
  },
]

const SHOP: ImplantDef[] = [
  {
    id: 'merchant_ledger',
    name: t('상인의 장부', "Merchant's Ledger"),
    text: t('상점 가격 −20%. 크레딧 획득 +10%.', 'Shop prices −20%. Credits gained +10%.'),
    rarity: 'shop',
    icon: 'items/data_fragment.png',
    passive: { shopDiscount: 0.2, creditMult: 0.1 },
  },
  {
    id: 'chameleon_cloak',
    name: t('카멜레온 망토', 'Chameleon Cloak'),
    text: t('추적 증가 −40%.', 'Trace gained −40%.'),
    rarity: 'shop',
    icon: 'items/stealth_cloak.png',
    passive: { traceMult: -0.4 },
  },
  {
    id: 'field_medic_kit',
    name: t('야전 의무 키트', 'Field Medic Kit'),
    text: t('은신처 회복량 +20%. 전투에서 이기면 회복 3.', 'Safehouse heals 20% more. On victory, heal 3.'),
    rarity: 'shop',
    icon: 'items/nanopatch.png',
    passive: { restHeal: 20 },
    triggers: [{ on: 'combat_won', effects: [{ kind: 'heal', amount: 3, to: 'connector' }] }],
  },
]

const PACK_BLACK_MARKET: ImplantDef[] = [
  {
    id: 'forged_permit',
    name: t('위조 허가증', 'Forged Permit'),
    text: t('상점 가격 −25%.', 'Shop prices −25%.'),
    rarity: 'common',
    icon: 'items/access_key.png',
    passive: { shopDiscount: 0.25 },
    pack: 'ipack_black_market',
  },
  {
    id: 'loaded_dice',
    name: t('조작된 주사위', 'Loaded Dice'),
    text: t('매력 +2, 관찰 +1.', 'CHA +2, OBS +1.'),
    rarity: 'common',
    icon: 'items/data_fragment.png',
    passive: { stats: { cha: 2, obs: 1 } },
    pack: 'ipack_black_market',
  },
  {
    id: 'bounty_board',
    name: t('현상금 게시판', 'Bounty Board'),
    text: t('적이 쓰러질 때마다 3₵ 획득.', 'Whenever an enemy dies, gain 3₵.'),
    rarity: 'uncommon',
    icon: 'items/drone_scrap.png',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'credits', amount: 3 }] }],
    pack: 'ipack_black_market',
  },
  {
    id: 'smugglers_pocket',
    name: t('밀수 주머니', "Smuggler's Pocket"),
    text: t('전투 첫 턴 에너지 +2.', 'First turn of each combat: +2 energy.'),
    rarity: 'rare',
    icon: 'items/stealth_cloak.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'energy', amount: 2 }], limit: 'combat' }],
    pack: 'ipack_black_market',
  },
]

const PACK_ARK_SALVAGE: ImplantDef[] = [
  {
    id: 'ark_coolant',
    name: t('ARK 냉각제', 'ARK Coolant'),
    text: t('전투 시작 시 무작위 적 하나 감전 1.', 'Combat start: Shock 1 on a random enemy.'),
    rarity: 'common',
    icon: 'items/cryo_grenade.png',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'shock', amount: 1, to: 'random_enemy' }] }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'sentinel_eye',
    name: t('감시자의 눈', 'Sentinel Eye'),
    text: t('전투 시작 시 모든 적 표식 3.', 'Combat start: Mark 3 on all enemies.'),
    rarity: 'uncommon',
    icon: 'skills/precision_emp.png',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'mark', amount: 3, to: 'all_enemies' }] }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'purge_igniter',
    name: t('소각 점화기', 'Purge Igniter'),
    text: t('턴마다 공격 카드를 처음 쓰면 무작위 적 하나에 화상 3.', 'First attack card each turn: Burn 3 on a random enemy.'),
    rarity: 'uncommon',
    icon: 'status/burn.png',
    triggers: [{ on: 'play_attack', effects: [{ kind: 'status', status: 'burn', amount: 3, to: 'random_enemy' }], limit: 'turn' }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'salvaged_aegis',
    name: t('회수한 이지스', 'Salvaged Aegis'),
    text: t('전투 첫 턴, 모든 아군 수호 2 (매 턴 방어막 2).', 'First turn of each combat: all allies gain Guard 2.'),
    rarity: 'rare',
    icon: 'status/freeze.png',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'status', status: 'guard', amount: 2, to: 'all_allies' }], limit: 'combat' }],
    pack: 'ipack_ark_salvage',
  },
]

export const IMPLANTS: ImplantDef[] = [
  ...STARTER,
  ...COMMON,
  ...UNCOMMON,
  ...RARE,
  ...BOSS,
  ...SHOP,
  ...PACK_BLACK_MARKET,
  ...PACK_ARK_SALVAGE,
]

export const IMPLANT_PACKS = ['ipack_black_market', 'ipack_ark_salvage'] as const
