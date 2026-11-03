// Procedural events (W2-3): the situation, the options and every outcome are authored here; with AI lines on, the GM's
// opening line for the event (ui/shell/eventOpening.ts → gm.py) is asked to invent the specific place and person for
// `procedural.brief`. With AI off or on a failed call the authored text below plays as written. At most
// MAX_PROCEDURAL per run, never on a daily (engine/run.ts). Same rules as events.ts (enforced by narrative.test.ts).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const PROCEDURAL_EVENTS: EventDef[] = [
  {
    id: 'pc_stranger_trade',
    acts: [1, 2, 3],
    procedural: { brief: t('낯선 사람이 기억 하나를 크레딧과 바꾸자고 한다.', 'A stranger offers to trade one memory for credits.') },
    title: t('낯선 거래', 'A Stranger’s Trade'),
    image: 'v2/events/pc_stranger_trade.webp',
    text: t(
      '처음 보는 사람이 길을 막는다. 손바닥 위에 작은 기억 칩 하나. “당신 기억 하나랑 바꿉시다. 아무거나. 값은 쳐 드리죠.”\n뒤에서 누군가 이쪽을 보고 있다.',
      'A stranger blocks the way, a small memory chip on one palm. “Trade me one of your memories. Any one. I’ll pay for it.”\nSomeone behind them is watching this.',
    ),
    options: [
      {
        label: t('기억 하나를 판다', 'Sell a memory'),
        hint: t('+35 ₵ · 추적 +4', '+35 ₵ · +4 Trace'),
        success: {
          text: t('무엇을 잊었는지 모른다. 크레딧은 정확하다.', 'You do not know what you forgot. The credits are exact.'),
          effects: [
            { kind: 'credits', amount: 35 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('값을 올린다', 'Haggle'),
        hint: t('+50 ₵ · 실패 시 추적 +6', '+50 ₵ · fail +6 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('상대가 웃으며 칩을 하나 더 얹는다. “좋은 기억이었나 보군.”', 'The stranger laughs and adds another chip. “Must have been a good one.”'),
          effects: [{ kind: 'credits', amount: 50 }],
        },
        failure: {
          text: t('흥정이 길어진다. 뒤에서 보던 사람이 단말을 꺼낸다.', 'The haggling drags on. The watcher behind takes out a terminal.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('거절하고 지나간다', 'Refuse and walk on'),
        hint: t('◈ +3', '+3 ◈'),
        success: {
          text: t('기억은 그대로다. 무거운 쪽도, 가벼운 쪽도.', 'Your memories stay where they are. The heavy ones and the light.'),
          effects: [{ kind: 'echoes', amount: 3 }],
        },
      },
    ],
    gmHints: ['memory trade', 'stranger', 'someone watching'],
  },
  {
    id: 'pc_lost_signal',
    acts: [1, 2, 3],
    procedural: { brief: t('도움을 청하는 짧은 신호가 반복해서 들어온다. 누가 보냈는지는 모른다.', 'A short call for help keeps repeating. Nobody knows who sent it.') },
    title: t('길 잃은 신호', 'A Lost Signal'),
    image: 'v2/events/pc_lost_signal.webp',
    text: t(
      '통신기에 같은 신호가 세 번째로 들어온다. 짧고 다급하다. 발신 위치는 가깝다. 함정일 수도 있다.\n잡음 사이로 숨소리가 들린다.',
      'The same signal comes through the comm for the third time. Short, urgent. The source is close. It could be a trap.\nBreathing, between the static.',
    ),
    options: [
      {
        label: t('신호를 역추적한다', 'Trace the signal back'),
        hint: t('소모품 · ◈ +3 · 실패 시 추적 +6', 'Consumable · +3 ◈ · fail +6 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t('신호 끝에 사람이 있다. 고맙다는 말 대신 보급품을 내민다.', 'At the end of the signal is a person. Instead of thanks, they hand over supplies.'),
          effects: [
            { kind: 'consumable' },
            { kind: 'echoes', amount: 3 },
          ],
        },
        failure: {
          text: t('역추적이 거꾸로 걸린다. 이번엔 당신 위치가 새어 나간다.', 'The trace runs the wrong way. This time your position leaks out.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('공개 채널로 답한다', 'Answer on an open channel'),
        hint: t('파티 회복 5 · 추적 +6', 'Heal party 5 · +6 Trace'),
        success: {
          text: t('누군가 대답을 듣는다. 골목 끝에서 손전등이 세 번 깜박인다. 길을 안다는 신호다.', 'Someone hears the answer. A torch blinks three times at the end of the alley: they know the way.'),
          effects: [
            { kind: 'heal_party', amount: 5 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('통신기를 끈다', 'Switch the comm off'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('조용해진다. 그게 더 무겁다.', 'It goes quiet. That weighs more.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
    gmHints: ['distress signal', 'static', 'maybe a trap'],
  },
  {
    id: 'pc_watcher',
    acts: [1, 2, 3],
    procedural: { brief: t('몇 블록째 누군가 뒤를 밟고 있다.', 'Someone has been following you for blocks.') },
    title: t('지켜보는 눈', 'The Watcher'),
    image: 'v2/events/pc_watcher.webp',
    text: t(
      '유리창에 비친 그림자가 세 블록째 같은 거리를 둔다. 멈추면 멈추고, 걸으면 걷는다.\n다음 모퉁이가 마지막 기회다.',
      'A shadow reflected in the shop windows has kept the same distance for three blocks. You stop, it stops. You walk, it walks.\nThe next corner is the last chance.',
    ),
    options: [
      {
        label: t('모퉁이에서 붙잡는다', 'Grab them at the corner'),
        hint: t('+30 ₵ · 실패 시 −6 HP', '+30 ₵ · fail −6 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('벽에 밀어붙이자 주머니에서 현상금 전표가 떨어진다. 당신 얼굴이다. 전표는 이제 당신 것이다.', 'Pinned to the wall, they drop a bounty slip. Your face. The slip, and its advance, are yours now.'),
          effects: [{ kind: 'credits', amount: 30 }],
        },
        failure: {
          text: t('상대가 더 빠르다. 팔꿈치가 옆구리에 박힌다.', 'They are faster. An elbow lands in your ribs.'),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('인파 속으로 따돌린다', 'Lose them in the crowd'),
        hint: t('추적 −10 · 실패 시 추적 +6', '−10 Trace · fail +6 Trace'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t('세 번 방향을 바꾸자 유리창 속 그림자가 사라진다.', 'Three turns later, the shadow in the glass is gone.'),
          effects: [{ kind: 'trace', amount: -10 }],
        },
        failure: {
          text: t('인파가 갈라진다. 그림자가 한 걸음 더 가까워진다.', 'The crowd parts. The shadow is a step closer.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('돌아서서 손을 흔든다', 'Turn round and wave'),
        hint: t('◈ +4 · 추적 +3', '+4 ◈ · +3 Trace'),
        success: {
          text: t('그림자가 멈칫하더니, 아주 작게 손을 흔들어 답한다.', 'The shadow hesitates, then waves back, very slightly.'),
          effects: [
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['being followed', 'reflection in glass', 'last corner'],
  },
  {
    id: 'pc_shelter',
    acts: [1, 2, 3],
    procedural: { brief: t('누군가 하룻밤 쉬어 갈 자리를 내준다. 대가는 말하지 않는다.', 'Someone offers a place to rest for the night and names no price.') },
    title: t('하룻밤 자리', 'A Place for the Night'),
    image: 'v2/events/pc_shelter.webp',
    text: t(
      '문틈으로 따뜻한 불빛이 샌다. 안쪽에서 누군가 말한다. “쉬었다 가요. 묻는 건 없어요.”\n바닥에 이불이 두 채 깔려 있다. 하나는 이미 누가 쓴 자국이 있다.',
      'Warm light leaks through a gap in a door. Someone inside says, “Rest a while. No questions.”\nTwo bedrolls lie on the floor. One already bears the shape of a sleeper.',
    ),
    options: [
      {
        label: t('하룻밤 묵는다', 'Stay the night'),
        hint: t('+8 HP · 추적 +5', '+8 HP · +5 Trace'),
        success: {
          text: t('오랜만에 꿈 없이 잔다. 아침에 집주인은 보이지 않는다.', 'For once you sleep without dreams. In the morning the host is gone.'),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('값을 치르고 일행 모두 쉰다', 'Pay so everyone can rest'),
        hint: t('−20 ₵ · 파티 회복 8', '−20 ₵ · heal party 8'),
        requires: { minCredits: 20 },
        success: {
          text: t('집주인이 칩을 받고 이불을 한 채 더 꺼낸다.', 'The host takes the chips and brings out one more bedroll.'),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 8 },
          ],
        },
      },
      {
        label: t('불빛만 보고 지나간다', 'Take the light with you and go'),
        hint: t('추적 −3 · ◈ +2', '−3 Trace · +2 ◈'),
        success: {
          text: t('문이 천천히 닫힌다. 골목이 조금 더 어두워진다.', 'The door closes slowly. The alley gets a little darker.'),
          effects: [
            { kind: 'trace', amount: -3 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['shelter', 'unnamed host', 'warm light'],
  },
  {
    id: 'pc_wreck',
    acts: [1, 2, 3],
    procedural: { brief: t('무너진 잔해 속에서 무언가 빛난다. 누군가의 물건이다.', 'Something glints in collapsed wreckage. It belonged to someone.') },
    title: t('잔해 속 물건', 'Something in the Wreckage'),
    image: 'v2/events/pc_wreck.webp',
    text: t(
      '무너진 벽 아래에서 무언가 빛난다. 손이 닿을 듯 말 듯한 거리. 잔해가 아직 조금씩 내려앉는다.\n주변에 주인으로 보이는 사람은 없다.',
      'Something glints under a collapsed wall, just out of reach. The rubble is still settling.\nNo one nearby looks like its owner.',
    ),
    options: [
      {
        label: t('잔해를 들어 올린다', 'Lift the rubble'),
        hint: t('소모품 · 실패 시 −5 HP', 'Consumable · fail −5 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t('콘크리트가 비켜선다. 손에 쥐어진 것은 아직 쓸 만하다.', 'The concrete gives way. What you pull out still works.'),
          effects: [{ kind: 'consumable' }],
        },
        failure: {
          text: t('잔해가 다시 내려앉는다. 손등이 긁힌다.', 'The rubble settles again. It takes skin off your hand.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('스캐너로 먼저 살핀다', 'Scan it first'),
        hint: t('카드 선택 · 실패 시 추적 +5', 'Card choice · fail +5 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('빛나는 것은 전술 기록 칩이다. 주인의 싸움이 아직 남아 있다.', 'The glint is a tactics-log chip. Its owner’s fights are still on it.'),
          effects: [{ kind: 'card_choice' }],
        },
        failure: {
          text: t('스캐너 신호가 순찰망에 걸린다.', 'The scanner ping catches on a patrol net.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('그대로 둔다', 'Leave it'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('주인이 돌아올지도 모른다. 아닐지도 모르고.', 'Its owner might come back for it. Or not.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
    gmHints: ['wreckage', 'someone’s belonging', 'settling rubble'],
  },
  {
    id: 'pc_message',
    acts: [1, 2, 3],
    procedural: { brief: t('다른 사람에게 남긴 메시지를 우연히 발견한다.', 'You stumble on a message left for someone else.') },
    title: t('남겨진 메시지', 'A Message Left Behind'),
    image: 'v2/events/pc_message.webp',
    text: t(
      '벽의 공용 단말에 메시지 하나가 깜박인다. 받는 사람의 이름은 있지만 당신은 아니다. 보낸 지 오래됐다. 아직 아무도 열지 않았다.',
      'A message blinks on a public terminal in the wall. It names a recipient, and it is not you. It was sent long ago. Nobody has opened it.',
    ),
    options: [
      {
        label: t('받는 사람을 찾아 전한다', 'Find the recipient and deliver it'),
        hint: t('◈ +5 · 추적 +4', '+5 ◈ · +4 Trace'),
        success: {
          text: t('받는 사람은 한참 화면을 본다. 고맙다는 말은 하지 않는다. 대신 오래 고개를 숙인다.', 'The recipient stares at the screen for a long time. No thanks, just a long bow of the head.'),
          effects: [
            { kind: 'echoes', amount: 5 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('몰래 읽는다', 'Read it yourself'),
        hint: t('카드 강화 1 · 실패 시 추적 +5', 'Upgrade a card · fail +5 Trace'),
        check: { stat: 'int', dc: 4 },
        success: {
          text: t('메시지는 전술 조언이다. 받을 사람 대신 당신이 써먹는다.', 'The message is tactical advice. You put it to use in the recipient’s place.'),
          effects: [{ kind: 'upgrade_card', count: 1, random: true }],
        },
        failure: {
          text: t('잠금이 걸려 있다. 열람 시도가 기록된다.', 'It is locked. The attempt is logged.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('메시지를 지운다', 'Delete the message'),
        hint: t('추적 −8', '−8 Trace'),
        success: {
          text: t('단말이 빈 화면으로 돌아간다. 이제 아무도 기다리지 않는다.', 'The terminal goes blank. Now no one is waiting.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
      },
    ],
    gmHints: ['unread message', 'public terminal', 'someone else’s words'],
  },
]
