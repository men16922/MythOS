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
    icon: 'v2/implants/erased_id.webp',
    passive: { bumpDamage: 1 },
    triggers: [{ on: 'environment_kill', effects: [{ kind: 'draw', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'overclocked_deck',
    name: t('오버클럭 덱', 'Overclocked Deck'),
    text: t('매 턴 시작 시 방어막 2. 전투 첫 턴 에너지 +1. 크레딧 획득 +25%.', 'Each turn: gain 2 block. First turn of each combat: +1 energy. Credits gained +25%.'),
    rarity: 'starter',
    icon: 'v2/implants/overclocked_deck.webp',
    passive: { creditMult: 0.25 },
    triggers: [
      { on: 'turn_start', effects: [{ kind: 'energy', amount: 1 }], limit: 'combat' },
      // Balance 2026-10-25: the smuggler had no sustained defence (~30 % vs ghost ~53 %); +2 block a turn → ~46 %.
      { on: 'turn_start', effects: [{ kind: 'block', amount: 2, to: 'connector' }] },
    ],
  },
  {
    id: 'cracked_cube',
    name: t('금 간 데이터 큐브', 'Cracked Data Cube'),
    text: t('전투 첫 턴, 모든 아군 방어막 5. 승리하면 모든 아군 회복 2.', 'First turn of each combat: all allies gain 5 block. On victory, all allies heal 2.'),
    rarity: 'starter',
    icon: 'v2/implants/cracked_cube.webp',
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
    icon: 'v2/implants/mesh_vest.webp',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 8, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'recoil_boots',
    name: t('반동 부츠', 'Recoil Boots'),
    text: t('충돌 피해 +1.', 'Bumps deal +1.'),
    rarity: 'common',
    icon: 'v2/implants/recoil_boots.webp',
    passive: { bumpDamage: 1 },
  },
  {
    id: 'scrap_plating',
    name: t('고철 장갑판', 'Scrap Plating'),
    text: t('적이 쓰러질 때마다 방어막 3.', 'Whenever an enemy dies, gain 3 block.'),
    rarity: 'common',
    icon: 'v2/implants/scrap_plating.webp',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'block', amount: 3, to: 'connector' }] }],
  },
  {
    id: 'credit_chip',
    name: t('크레딧 칩', 'Credit Chip'),
    text: t('크레딧 획득 +30%.', 'Credits gained +30%.'),
    rarity: 'common',
    icon: 'v2/implants/credit_chip.webp',
    passive: { creditMult: 0.3 },
  },
  {
    id: 'pocket_jammer',
    name: t('휴대 교란기', 'Pocket Jammer'),
    text: t('추적 증가 −25%.', 'Trace gained −25%.'),
    rarity: 'common',
    icon: 'v2/implants/pocket_jammer.webp',
    passive: { traceMult: -0.25 },
  },
  {
    id: 'stim_reservoir',
    name: t('자극제 저장고', 'Stim Reservoir'),
    text: t('최대 HP +7.', 'Max HP +7.'),
    rarity: 'common',
    icon: 'v2/implants/stim_reservoir.webp',
    passive: { maxHp: 7 },
  },
  {
    id: 'cracked_lens',
    name: t('금 간 렌즈', 'Cracked Lens'),
    text: t('전투 시작 시 무작위 적 하나에 표식 5.', 'Combat start: Mark 5 on a random enemy.'),
    rarity: 'common',
    icon: 'v2/implants/cracked_lens.webp',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'mark', amount: 5, to: 'random_enemy' }] }],
  },
  {
    id: 'spare_cell',
    name: t('예비 전지', 'Spare Cell'),
    text: t('전투 첫 턴, 카드를 2장 더 뽑는다.', 'First turn of each combat: draw 2 more.'),
    rarity: 'common',
    icon: 'v2/implants/spare_cell.webp',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'draw', amount: 2 }], limit: 'combat' }],
  },
  {
    id: 'med_pump',
    name: t('나노 펌프', 'Nano Pump'),
    text: t('전투에서 이기면 모든 아군 회복 4.', 'On victory, all allies heal 4.'),
    rarity: 'common',
    icon: 'v2/implants/med_pump.webp',
    triggers: [{ on: 'combat_won', effects: [{ kind: 'heal', amount: 4, to: 'all_allies' }] }],
  },
  {
    id: 'trigger_discipline',
    name: t('사격 규율', 'Trigger Discipline'),
    text: t('턴마다 공격 카드를 처음 쓰면 방어막 4.', 'First attack card each turn: gain 4 block.'),
    rarity: 'common',
    icon: 'v2/implants/trigger_discipline.webp',
    triggers: [{ on: 'play_attack', effects: [{ kind: 'block', amount: 4, to: 'connector' }], limit: 'turn' }],
  },
  {
    id: 'serrated_wire',
    name: t('톱니 와이어', 'Serrated Wire'),
    text: t('충돌이 일어날 때마다 무작위 적 하나에 출혈 2.', 'Whenever a bump happens, apply Bleed 2 to a random enemy.'),
    rarity: 'common',
    icon: 'v2/implants/serrated_wire.webp',
    triggers: [{ on: 'bump', effects: [{ kind: 'status', status: 'bleed', amount: 2, to: 'random_enemy' }] }],
  },
]

const UNCOMMON: ImplantDef[] = [
  {
    id: 'echo_lens',
    name: t('잔향 렌즈', 'Echo Lens'),
    text: t('카드 보상 선택지 +1.', 'Card rewards offer +1 choice.'),
    rarity: 'uncommon',
    icon: 'v2/implants/echo_lens.webp',
    passive: { rewardChoices: 1 },
  },
  {
    id: 'feedback_loop',
    name: t('피드백 루프', 'Feedback Loop'),
    text: t('전술 카드를 쓸 때마다 무작위 적에게 피해 2.', 'Whenever you play a tactic, deal 2 to a random enemy.'),
    rarity: 'uncommon',
    icon: 'v2/implants/feedback_loop.webp',
    triggers: [{ on: 'play_tactic', effects: [{ kind: 'damage', amount: 2, to: 'random_enemy' }] }],
  },
  {
    id: 'momentum_core',
    name: t('관성 코어', 'Momentum Core'),
    text: t('턴마다 첫 환경 처치 시 에너지 +1.', 'First environment kill each turn: +1 energy.'),
    rarity: 'uncommon',
    icon: 'v2/implants/momentum_core.webp',
    triggers: [{ on: 'environment_kill', effects: [{ kind: 'energy', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'impact_frame',
    name: t('충격 프레임', 'Impact Frame'),
    text: t('충돌 피해 +2.', 'Bumps deal +2.'),
    rarity: 'uncommon',
    icon: 'v2/implants/impact_frame.webp',
    passive: { bumpDamage: 2 },
  },
  {
    id: 'guardian_chip',
    name: t('수호 칩', 'Guardian Chip'),
    text: t('전투 첫 턴, 접속자 수호 2 (매 턴 방어막 2).', 'First turn of each combat: the connector gains Guard 2.'),
    rarity: 'uncommon',
    icon: 'v2/implants/guardian_chip.webp',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'status', status: 'guard', amount: 2, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'reflex_booster',
    name: t('반사 증폭기', 'Reflex Booster'),
    text: t('턴마다 첫 카드를 쓰면 카드 1장을 뽑는다.', 'First card each turn: draw 1.'),
    rarity: 'uncommon',
    icon: 'v2/implants/reflex_booster.webp',
    triggers: [{ on: 'first_card', effects: [{ kind: 'draw', amount: 1 }] }],
  },
  {
    id: 'heavy_exosuit',
    name: t('중장 외골격', 'Heavy Exosuit'),
    text: t('최대 HP +10. 전투 첫 턴, 방어막 4.', 'Max HP +10. First turn of each combat: gain 4 block.'),
    rarity: 'uncommon',
    icon: 'v2/implants/heavy_exosuit.webp',
    passive: { maxHp: 10 },
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 4, to: 'connector' }], limit: 'combat' }],
  },
  {
    id: 'adrenal_loop',
    name: t('아드레날린 회로', 'Adrenal Loop'),
    text: t('턴마다 처음 HP를 잃으면 에너지 +1.', 'First time you lose HP each turn: +1 energy.'),
    rarity: 'uncommon',
    icon: 'v2/implants/adrenal_loop.webp',
    triggers: [{ on: 'damage_taken', effects: [{ kind: 'energy', amount: 1 }], limit: 'turn' }],
  },
  {
    id: 'thorn_weave',
    name: t('가시 직조', 'Thorn Weave'),
    text: t('전투 첫 턴, 모든 아군 가시 2.', 'First turn of each combat: all allies gain Thorns 2.'),
    rarity: 'uncommon',
    icon: 'v2/implants/thorn_weave.webp',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'status', status: 'thorns', amount: 2, to: 'all_allies' }], limit: 'combat' }],
  },
  {
    id: 'afterimage',
    name: t('잔상', 'Afterimage'),
    text: t('전술 카드를 쓸 때마다 방어막 2.', 'Whenever you play a tactic, gain 2 block.'),
    rarity: 'uncommon',
    icon: 'v2/implants/afterimage.webp',
    triggers: [{ on: 'play_tactic', effects: [{ kind: 'block', amount: 2, to: 'connector' }] }],
  },
  {
    id: 'acid_injector',
    name: t('산성 주입기', 'Acid Injector'),
    text: t('전투 시작 시 모든 적 부식 2.', 'Combat start: Corrode 2 on all enemies.'),
    rarity: 'uncommon',
    icon: 'v2/implants/acid_injector.webp',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'corrode', amount: 2, to: 'all_enemies' }] }],
  },
  {
    id: 'reflex_gyro',
    name: t('반사 자이로', 'Reflex Gyro'),
    text: t('민첩 +1. 전투 시작 시 접속자 회피 1.', 'AGI +1. Combat start: the connector gains Evade 1.'),
    rarity: 'uncommon',
    icon: 'v2/implants/reflex_gyro.webp',
    passive: { stats: { agi: 1 } },
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'evade', amount: 1, to: 'connector' }] }],
  },
]

const RARE: ImplantDef[] = [
  {
    id: 'ghost_engine',
    name: t('유령 엔진', 'Ghost Engine'),
    text: t('모든 아군 이동 +1.', 'All allies move +1.'),
    rarity: 'rare',
    icon: 'v2/implants/ghost_engine.webp',
    passive: { move: 1 },
  },
  {
    id: 'overclock_heart',
    name: t('과부하 심장', 'Overclock Heart'),
    text: t('손패 +1.', 'Hand size +1.'),
    rarity: 'rare',
    icon: 'v2/implants/overclock_heart.webp',
    passive: { handSize: 1 },
  },
  {
    id: 'chain_reaction',
    name: t('연쇄 반응', 'Chain Reaction'),
    text: t('적이 쓰러지면 그 주변 4칸에 피해 3. 아군도 맞는다.', 'When an enemy dies, deal 3 to its 4 neighbours. Hits allies too.'),
    rarity: 'rare',
    icon: 'v2/implants/chain_reaction.webp',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'damage', amount: 3, area: 'adjacent' }] }],
  },
  {
    id: 'bastion_core',
    name: t('보루 코어', 'Bastion Core'),
    text: t('매 턴 시작 시 모든 아군 방어막 3.', 'Start of each turn: all allies gain 3 block.'),
    rarity: 'rare',
    icon: 'v2/implants/bastion_core.webp',
    triggers: [{ on: 'turn_start', effects: [{ kind: 'block', amount: 3, to: 'all_allies' }] }],
  },
  {
    id: 'kill_chain',
    name: t('킬 체인', 'Kill Chain'),
    text: t('턴마다 첫 처치 시 에너지 +1, 카드 1장을 뽑는다.', 'First kill each turn: +1 energy, draw 1.'),
    rarity: 'rare',
    icon: 'v2/implants/kill_chain.webp',
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
    icon: 'v2/implants/domino_relay.webp',
    triggers: [{ on: 'bump', effects: [{ kind: 'damage', amount: 2, to: 'random_enemy' }] }],
  },
  {
    id: 'ix_shard',
    name: t('IX 파편', 'IX Shard'),
    text: t('전투 시작 시 모든 적 감전 1 — 첫 공격이 불발된다.', "Combat start: Shock 1 on all enemies — their first attacks fizzle."),
    rarity: 'rare',
    icon: 'v2/implants/ix_shard.webp',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'shock', amount: 1, to: 'all_enemies' }] }],
  },
  {
    id: 'hawkeye_lens',
    name: t('호크아이 렌즈', 'Hawkeye Lens'),
    text: t('관찰 +1. 치명타 배율 +25% (1.5× → 1.75×). 전투 시작 시 접속자 집중 2.', 'OBS +1. Critical hit multiplier +25% (1.5× → 1.75×). Combat start: the connector gains Focus 2.'),
    rarity: 'rare',
    icon: 'v2/implants/hawkeye_lens.webp',
    passive: { stats: { obs: 1 }, critMult: 0.25 },
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'focus', amount: 2, to: 'connector' }] }],
  },
]

const BOSS: ImplantDef[] = [
  {
    id: 'black_ice_core',
    name: t('블랙 아이스 코어', 'Black ICE Core'),
    text: t('에너지 +1. 전투마다 추적 +6.', '+1 energy. Each combat: Trace +6.'),
    rarity: 'boss',
    icon: 'v2/implants/black_ice_core.webp',
    passive: { energy: 1 },
    triggers: [{ on: 'combat_start', effects: [{ kind: 'trace', amount: 6 }] }],
  },
  {
    id: 'eater_maw',
    name: t('포식자의 턱', "Eater's Maw"),
    text: t('에너지 +1. 손패 −1.', '+1 energy. Hand size −1.'),
    rarity: 'boss',
    icon: 'v2/implants/eater_maw.webp',
    passive: { energy: 1, handSize: -1 },
  },
  {
    id: 'haetae_treads',
    name: t('해태 궤도', 'HAETAE Treads'),
    text: t('에너지 +1. 모든 아군 이동 −1.', '+1 energy. All allies move −1.'),
    rarity: 'boss',
    icon: 'v2/implants/haetae_treads.webp',
    passive: { energy: 1, move: -1 },
  },
]

const SHOP: ImplantDef[] = [
  {
    id: 'merchant_ledger',
    name: t('상인의 장부', "Merchant's Ledger"),
    text: t('상점 가격 −20%. 크레딧 획득 +10%.', 'Shop prices −20%. Credits gained +10%.'),
    rarity: 'shop',
    icon: 'v2/implants/merchant_ledger.webp',
    passive: { shopDiscount: 0.2, creditMult: 0.1 },
  },
  {
    id: 'chameleon_cloak',
    name: t('카멜레온 망토', 'Chameleon Cloak'),
    text: t('추적 증가 −40%.', 'Trace gained −40%.'),
    rarity: 'shop',
    icon: 'v2/implants/chameleon_cloak.webp',
    passive: { traceMult: -0.4 },
  },
  {
    id: 'field_medic_kit',
    name: t('야전 의무 키트', 'Field Medic Kit'),
    text: t('은신처 회복량 +20%. 전투에서 이기면 회복 3.', 'Safehouse heals 20% more. On victory, heal 3.'),
    rarity: 'shop',
    icon: 'v2/implants/field_medic_kit.webp',
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
    icon: 'v2/implants/forged_permit.webp',
    passive: { shopDiscount: 0.25 },
    pack: 'ipack_black_market',
  },
  {
    id: 'loaded_dice',
    name: t('조작된 주사위', 'Loaded Dice'),
    text: t('매력 +2, 관찰 +1.', 'CHA +2, OBS +1.'),
    rarity: 'common',
    icon: 'v2/implants/loaded_dice.webp',
    passive: { stats: { cha: 2, obs: 1 } },
    pack: 'ipack_black_market',
  },
  {
    id: 'bounty_board',
    name: t('현상금 게시판', 'Bounty Board'),
    text: t('적이 쓰러질 때마다 3₵ 획득.', 'Whenever an enemy dies, gain 3₵.'),
    rarity: 'uncommon',
    icon: 'v2/implants/bounty_board.webp',
    triggers: [{ on: 'enemy_killed', effects: [{ kind: 'credits', amount: 3 }] }],
    pack: 'ipack_black_market',
  },
  {
    id: 'smugglers_pocket',
    name: t('밀수 주머니', "Smuggler's Pocket"),
    text: t('전투 첫 턴 에너지 +2.', 'First turn of each combat: +2 energy.'),
    rarity: 'rare',
    icon: 'v2/implants/smugglers_pocket.webp',
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
    icon: 'v2/implants/ark_coolant.webp',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'shock', amount: 1, to: 'random_enemy' }] }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'sentinel_eye',
    name: t('감시자의 눈', 'Sentinel Eye'),
    text: t('전투 시작 시 모든 적 표식 3.', 'Combat start: Mark 3 on all enemies.'),
    rarity: 'uncommon',
    icon: 'v2/implants/sentinel_eye.webp',
    triggers: [{ on: 'combat_start', effects: [{ kind: 'status', status: 'mark', amount: 3, to: 'all_enemies' }] }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'purge_igniter',
    name: t('소각 점화기', 'Purge Igniter'),
    text: t('턴마다 공격 카드를 처음 쓰면 무작위 적 하나에 화상 3.', 'First attack card each turn: Burn 3 on a random enemy.'),
    rarity: 'uncommon',
    icon: 'v2/implants/purge_igniter.webp',
    triggers: [{ on: 'play_attack', effects: [{ kind: 'status', status: 'burn', amount: 3, to: 'random_enemy' }], limit: 'turn' }],
    pack: 'ipack_ark_salvage',
  },
  {
    id: 'salvaged_aegis',
    name: t('회수한 이지스', 'Salvaged Aegis'),
    text: t('전투 첫 턴, 모든 아군 수호 2 (매 턴 방어막 2).', 'First turn of each combat: all allies gain Guard 2.'),
    rarity: 'rare',
    icon: 'v2/implants/salvaged_aegis.webp',
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
