// Card evolutions — holding a certain card and a certain implant together turns the card into something new, once
// per run (the Vampire Survivors idea). Recipes stay secret: the codex shows ??? until one is found. The evolved
// cards are 'special': they never roll on their own, the only way to one is its recipe.
import type { CardDef, EvolutionDef, Text } from '../engine/types.ts'
import { CARDS } from './cards.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

interface Recipe {
  id: string
  card: string
  implant: string
  name: Text
  text: Text
  effects: CardDef['effects']
  /** The face when the card was already upgraded: one number up, and its text. */
  plus: { index: number; by: number; text: Text }
  cost?: number
}

const RECIPES: Recipe[] = [
  {
    id: 'wall_breaker',
    card: 'shove',
    implant: 'impact_frame',
    name: t('벽 부수기', 'Wall Breaker'),
    text: t('피해 5. 2칸 밀어낸다. 부딪히면 충돌 피해 +3, 기절.', 'Deal 5. Push 2 tiles. A bump deals +3 and Stuns.'),
    effects: [{ kind: 'damage', amount: 5 }, { kind: 'push', dir: 'away', distance: 2, slam: 3, stun: true }],
    plus: { index: 0, by: 3, text: t('피해 8. 2칸 밀어낸다. 부딪히면 충돌 피해 +3, 기절.', 'Deal 8. Push 2 tiles. A bump deals +3 and Stuns.') },
  },
  {
    id: 'locked_shot',
    card: 'packet_shot',
    implant: 'cracked_lens',
    name: t('고정 사격', 'Locked Shot'),
    text: t('피해 7. 표식 3.', 'Deal 7. Mark 3.'),
    effects: [{ kind: 'damage', amount: 7 }, { kind: 'status', status: 'mark', amount: 3 }],
    plus: { index: 0, by: 3, text: t('피해 10. 표식 3.', 'Deal 10. Mark 3.') },
  },
  {
    id: 'noise_curtain',
    card: 'covering_noise',
    implant: 'mesh_vest',
    name: t('잡음 장막', 'Noise Curtain'),
    text: t('아군 하나 방어막 12.', 'An ally gains 12 block.'),
    effects: [{ kind: 'block', amount: 12 }],
    plus: { index: 0, by: 4, text: t('아군 하나 방어막 16.', 'An ally gains 16 block.') },
  },
  {
    id: 'triple_tap',
    card: 'double_tap',
    implant: 'reflex_booster',
    name: t('삼연사', 'Triple Tap'),
    text: t('피해 3씩 3회. 카드 1장을 뽑는다.', 'Deal 3, three times. Draw 1.'),
    effects: [{ kind: 'damage', amount: 3 }, { kind: 'damage', amount: 3 }, { kind: 'damage', amount: 3 }, { kind: 'draw', amount: 1 }],
    plus: { index: 2, by: 3, text: t('피해 3, 3, 6. 카드 1장을 뽑는다.', 'Deal 3, 3, then 6. Draw 1.') },
  },
  {
    id: 'acid_incendiary',
    card: 'incendiary_round',
    implant: 'acid_injector',
    name: t('산성 소이탄', 'Acid Incendiary'),
    text: t('피해 3, 화상 3, 부식 2. 맞은 칸에 2턴 동안 불길이 남는다.', 'Deal 3, Burn 3, Corrode 2. The tile burns for 2 turns.'),
    effects: [{ kind: 'damage', amount: 3 }, { kind: 'status', status: 'burn', amount: 3 }, { kind: 'status', status: 'corrode', amount: 2 }, { kind: 'ignite', turns: 2 }],
    plus: { index: 1, by: 2, text: t('피해 3, 화상 5, 부식 2. 맞은 칸에 2턴 동안 불길이 남는다.', 'Deal 3, Burn 5, Corrode 2. The tile burns for 2 turns.') },
  },
  {
    id: 'iron_stance',
    card: 'brace',
    implant: 'heavy_exosuit',
    name: t('철벽 자세', 'Iron Stance'),
    text: t('방어막 12. 가시 2.', 'Gain 12 block and Thorns 2.'),
    effects: [{ kind: 'block', amount: 12 }, { kind: 'status', status: 'thorns', amount: 2 }],
    plus: { index: 0, by: 4, text: t('방어막 16. 가시 2.', 'Gain 16 block and Thorns 2.') },
  },
  {
    id: 'flurry',
    card: 'jab',
    implant: 'trigger_discipline',
    name: t('난타', 'Flurry'),
    text: t('피해 4씩 2회.', 'Deal 4, twice.'),
    effects: [{ kind: 'damage', amount: 4 }, { kind: 'damage', amount: 4 }],
    plus: { index: 1, by: 2, text: t('피해 4, 6.', 'Deal 4, then 6.') },
  },
  {
    id: 'artery_open',
    card: 'artery_rip',
    implant: 'serrated_wire',
    name: t('동맥 개방', 'Open Artery'),
    text: t('피해 4. 출혈 6.', 'Deal 4. Bleed 6.'),
    effects: [{ kind: 'damage', amount: 4 }, { kind: 'status', status: 'bleed', amount: 6 }],
    plus: { index: 0, by: 4, text: t('피해 8. 출혈 6.', 'Deal 8. Bleed 6.') },
  },
  {
    id: 'overtuned_laser',
    card: 'target_laser',
    implant: 'feedback_loop',
    name: t('과조준', 'Overtuned Laser'),
    text: t('표식 5. 피해 3.', 'Mark 5. Deal 3.'),
    effects: [{ kind: 'status', status: 'mark', amount: 5 }, { kind: 'damage', amount: 3 }],
    plus: { index: 0, by: 1, text: t('표식 6. 피해 3.', 'Mark 6. Deal 3.') },
  },
  {
    id: 'phantom_step',
    card: 'smoke_step',
    implant: 'afterimage',
    name: t('잔상 보법', 'Phantom Step'),
    text: t('방어막 6. 다시 이동할 수 있다. 카드 1장을 뽑는다.', 'Gain 6 block. You may move again. Draw 1.'),
    effects: [{ kind: 'block', amount: 6 }, { kind: 'refund_move' }, { kind: 'draw', amount: 1 }],
    plus: { index: 0, by: 3, text: t('방어막 9. 다시 이동할 수 있다. 카드 1장을 뽑는다.', 'Gain 9 block. You may move again. Draw 1.') },
  },
  {
    id: 'heart_overload',
    card: 'overload_strike',
    implant: 'adrenal_loop',
    name: t('심장 과부하', 'Heart Overload'),
    text: t('피해 16. 에너지 +1.', 'Deal 16. Gain 1 energy.'),
    effects: [{ kind: 'damage', amount: 16 }, { kind: 'energy', amount: 1 }],
    plus: { index: 0, by: 4, text: t('피해 20. 에너지 +1.', 'Deal 20. Gain 1 energy.') },
  },
  {
    id: 'cover_fire',
    card: 'suppressing_fire',
    implant: 'guardian_chip',
    name: t('엄호 사격', 'Cover Fire'),
    text: t('피해 4. 약화 2. 모든 아군 방어막 3.', 'Deal 4. Weak 2. All allies gain 3 block.'),
    effects: [{ kind: 'damage', amount: 4 }, { kind: 'status', status: 'weak', amount: 2 }, { kind: 'block', amount: 3, to: 'all_allies' }],
    plus: { index: 0, by: 3, text: t('피해 7. 약화 2. 모든 아군 방어막 3.', 'Deal 7. Weak 2. All allies gain 3 block.') },
  },
]

const baseOf = (id: string): CardDef => {
  const card = CARDS.find((c) => c.id === id)
  if (!card) throw new Error(`evolution of unknown card ${id}`)
  return card
}

/** The evolved cards, built on their base (same target, type and owner). */
export const EVOLVED_CARDS: CardDef[] = RECIPES.map((r) => {
  const base = baseOf(r.card)
  return {
    ...base,
    id: r.id,
    name: r.name,
    text: r.text,
    effects: r.effects,
    cost: r.cost ?? base.cost,
    rarity: 'special',
    icon: `v2/cards/${r.id}.webp`,
    upgrade: {
      text: r.plus.text,
      effects: r.effects.map((e, i) => (i === r.plus.index && 'amount' in e ? { ...e, amount: e.amount + r.plus.by } : e)),
    },
  }
})

export const EVOLUTIONS: EvolutionDef[] = RECIPES.map((r) => ({ id: r.id, card: r.card, implant: r.implant }))
