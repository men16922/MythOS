// Duo ultimates — twelve pairs with a history get a joint ultimate (the Hades duo-boon idea, on the Momentum gauge).
// When both stand and the gauge is full, the duo joins the options beside the solo ultimates and the Signal Burst;
// it spends the same gauge once per fight. Other pairs simply have none, and the codex shows the unfound ones as ???.
// `lines`: the first is spoken by pair[0], the second by pair[1]. Voices follow content/banter.ts.
import type { DuoDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const DUOS: DuoDef[] = [
  {
    id: 'collection',
    pair: ['se_rin', 'tae_o'],
    name: t('추심', 'Collection'),
    text: t('모든 적을 세린에게서 2칸 밀쳐낸다. 부딪히면 충돌 피해 +2, 기절. 모든 아군 방어막 5, 다시 이동.', 'Push every enemy 2 tiles from Se-rin. Bumps deal +2 and Stun. All allies gain 5 block and may move again.'),
    effects: [{ kind: 'push', dir: 'away', distance: 2, to: 'all_enemies', slam: 2, stun: true }, { kind: 'block', amount: 5, to: 'all_allies' }, { kind: 'refund_move', to: 'all_allies' }],
    lines: [t('빚은 내가 받아. 넌 문만 부숴.', 'I collect. You just break the door.'), t('알겠다. 문은 내 전문이다.', 'Understood. Doors are my specialty.')],
  },
  {
    id: 'unlogged_dream',
    pair: ['han', 'kai'],
    name: t('로그 없는 꿈', 'Unlogged Dream'),
    text: t('모든 적에게 표식 2. 무작위 적에게 피해 8을 세 번. 카드 1장을 뽑는다.', 'Every enemy gets Mark 2. Deal 8 to a random enemy, three times. Draw 1.'),
    effects: [{ kind: 'status', status: 'mark', amount: 2, to: 'all_enemies' }, { kind: 'damage', amount: 8, to: 'random_enemy' }, { kind: 'damage', amount: 8, to: 'random_enemy' }, { kind: 'damage', amount: 8, to: 'random_enemy' }, { kind: 'draw', amount: 1 }],
    lines: [t('좌표 깔았다. 쏴, 몽상가.', 'Coordinates are up. Fire, dreamer.'), t('네. 이건 기록에 안 남아요.', 'Yes. This one won’t be in the log.')],
  },
  {
    id: 'anvil_and_wall',
    pair: ['su_ah', 'tae_o'],
    name: t('모루와 벽', 'Anvil and Wall'),
    text: t('모든 아군 방어막 9, 가시 2. 잔향 칼날 1장을 손에 넣는다.', 'All allies gain 9 block and Thorns 2. Add 1 Echo Blade to your hand.'),
    effects: [{ kind: 'block', amount: 9, to: 'all_allies' }, { kind: 'status', status: 'thorns', amount: 2, to: 'all_allies' }, { kind: 'add_card', cardId: 'echo_blade', pile: 'hand', count: 1 }],
    lines: [t('가만있어요. 어깨부터 고칠게요.', 'Hold still. Shoulder first.'), t('맞으면서 고쳐라. 시간 없다.', 'Fix it while I take hits. No time.')],
  },
  {
    id: 'not_for_sale',
    pair: ['lin_yue', 'kai'],
    name: t('비매품', 'Not for Sale'),
    text: t('에너지 +2. 무작위 적에게 피해 9를 두 번. 15₵.', 'Gain 2 energy. Deal 9 to a random enemy, twice. Gain 15₵.'),
    effects: [{ kind: 'energy', amount: 2 }, { kind: 'damage', amount: 9, to: 'random_enemy' }, { kind: 'damage', amount: 9, to: 'random_enemy' }, { kind: 'credits', amount: 15 }],
    lines: [t('탄값은 내가 낼게. 넌 비매품이니까.', 'I’ll cover the rounds. You’re not for sale.'), t('네. 그럼 비싸게 쏠게요.', 'Then I’ll make them expensive.')],
  },
  {
    id: 'warm_circuit',
    pair: ['han', 'su_ah'],
    name: t('식지 않는 회로', 'Warm Circuit'),
    text: t('카드 3장을 뽑고 에너지 +1. 잔향 칼날 2장을 손에 넣는다.', 'Draw 3, gain 1 energy. Add 2 Echo Blades to your hand.'),
    effects: [{ kind: 'draw', amount: 3 }, { kind: 'energy', amount: 1 }, { kind: 'add_card', cardId: 'echo_blade', pile: 'hand', count: 2 }],
    lines: [t('누나, 회로 터진다, 터진다!', 'It’s gonna blow, it’s gonna blow!'), t('안 터져요. 내가 벼렸잖아요.', 'It won’t. I forged it.')],
  },
  {
    id: 'burned_ledger',
    pair: ['lin_yue', 'se_rin'],
    name: t('장부 소각', 'Burned Ledger'),
    text: t('모든 아군 방어막 6, 다시 이동. 에너지 +2.', 'All allies gain 6 block and may move again. Gain 2 energy.'),
    effects: [{ kind: 'block', amount: 6, to: 'all_allies' }, { kind: 'refund_move', to: 'all_allies' }, { kind: 'energy', amount: 2 }],
    lines: [t('이번 건은 장부에 안 적어.', 'This one stays off the books.'), t('…이자는?', '…And the interest?')],
  },
  {
    id: 'overdue_reader',
    pair: ['io', 'miro'],
    name: t('연체 독자', 'The Overdue Reader'),
    text: t('소멸한 카드 2장을 손으로 되돌린다. 모든 적에게 피해 4. 모든 아군 회피 2.', 'Return 2 exhausted cards to your hand. Deal 4 to every enemy. All allies gain Evade 2.'),
    effects: [{ kind: 'recall', count: 2 }, { kind: 'damage', amount: 4, to: 'all_enemies' }, { kind: 'status', status: 'evade', amount: 2, to: 'all_allies' }],
    lines: [t('반납 기한이 지났습니다.', 'Your return date has passed.'), t('그래도 다 읽었어요.', 'I still finished it.')],
  },
  {
    id: 'red_ink',
    pair: ['bel', 'io'],
    name: t('붉은 열람', 'Red Ink Reading'),
    text: t('모든 적에게 약화 2, 침식 3, 표식 2.', 'Every enemy gets Weak 2, Corrode 3 and Mark 2.'),
    effects: [{ kind: 'status', status: 'weak', amount: 2, to: 'all_enemies' }, { kind: 'status', status: 'corrode', amount: 3, to: 'all_enemies' }, { kind: 'status', status: 'mark', amount: 2, to: 'all_enemies' }],
    lines: [t('이 페이지는 내가 그었지.', 'I struck this page myself.'), t('복원 열람을 허가합니다.', 'Restored reading is granted.')],
  },
  {
    id: 'night_watch',
    pair: ['rem', 'se_rin'],
    name: t('불침번', 'Night Watch'),
    text: t('모든 적을 기절시킨다. 모든 아군 방어막 5.', 'Stun every enemy. All allies gain 5 block.'),
    effects: [{ kind: 'status', status: 'stun', amount: 1, to: 'all_enemies' }, { kind: 'block', amount: 5, to: 'all_allies' }],
    lines: [t('주무세요. 제가 깨어 있을게요.', 'Sleep. I’ll stay awake.'), t('…그 말 진짜 무섭다니까.', '…That’s still the scariest thing you say.')],
  },
  {
    id: 'how_to_stand',
    pair: ['doyun', 'tae_o'],
    name: t('서는 법', 'How to Stand'),
    text: t('접속자 방어막 12. 모든 아군 가시 2. 도윤 수호 3, 방어막 6.', 'The Connector gains 12 block. All allies gain Thorns 2. Doyun gains Guard 3 and 6 block.'),
    effects: [{ kind: 'block', amount: 12, to: 'connector' }, { kind: 'status', status: 'thorns', amount: 2, to: 'all_allies' }, { kind: 'status', status: 'guard', amount: 3, to: 'owner' }, { kind: 'block', amount: 6, to: 'owner' }],
    lines: [t('이렇게 서는 거 맞죠?', 'Is this how you stand?'), t('맞다. 물러서지만 마라.', 'It is. Just do not step back.')],
  },
  {
    id: 'same_dream',
    pair: ['rem', 'kai'],
    name: t('같은 꿈', 'The Same Dream'),
    text: t('모든 적을 기절시킨다. 무작위 적에게 피해 6을 두 번.', 'Stun every enemy. Deal 6 to a random enemy, twice.'),
    effects: [{ kind: 'status', status: 'stun', amount: 1, to: 'all_enemies' }, { kind: 'damage', amount: 6, to: 'random_enemy' }, { kind: 'damage', amount: 6, to: 'random_enemy' }],
    lines: [t('그 꿈, 제가 집행하던 꿈이에요.', 'I used to execute that dream.'), t('네. 저도 거기 있었어요.', 'Yes. I was in it.')],
  },
  {
    id: 'undeletable',
    pair: ['bel', 'han'],
    name: t('삭제 불가', 'Undeletable'),
    text: t('모든 적에게 침식 3. 카드 2장을 뽑고 에너지 +1.', 'Every enemy gets Corrode 3. Draw 2, gain 1 energy.'),
    effects: [{ kind: 'status', status: 'corrode', amount: 3, to: 'all_enemies' }, { kind: 'draw', amount: 2 }, { kind: 'energy', amount: 1 }],
    lines: [t('내 펜으로도 안 지워지네.', 'Even my pen can’t erase that.'), t('당연하지. 내가 짠 건데.', 'Obviously. I wrote it.')],
  },
]
