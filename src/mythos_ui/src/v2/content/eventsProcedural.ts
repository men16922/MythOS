// Procedural events (W2-3, six in Acts 1–3 and two in Deep Signal Acts 4–6): the situation, the options and every outcome are authored here; with AI lines on, the GM's
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
  // Deep Signal (Acts 4–6, no route: the Sea's acts have their own pools).
  {
    id: 'pc_deep_keeper',
    acts: [4, 5, 6],
    procedural: { brief: t('도시 아래층에서 무언가를 혼자 지키는 사람이 길을 막는다.', 'Below the city, someone guarding something alone blocks the way.') },
    title: t('혼자 지키는 사람', 'The Lone Keeper'),
    image: 'v2/events/pc_deep_keeper.webp',
    text: t(
      '길 한가운데 누군가 앉아 있다. 등 뒤에 무언가를 두고, 그 앞을 떠나지 않는다.\n“지나가도 돼요. 이건 건드리지만 마요.”\n등 뒤의 것이 작게 빛난다.',
      'Someone sits in the middle of the way, something set behind them that they will not leave.\n“You can pass. Just don’t touch this.”\nThe thing behind them glows faintly.',
    ),
    options: [
      {
        label: t('무엇을 지키는지 묻는다', 'Ask what they are guarding'),
        hint: t('◈ +6 · 실패 시 추적 +6', '+6 ◈ · fail +6 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('대답 대신 덮개를 조금 들어 보여 준다. 누군가의 이름이 새겨진 작은 판이다.', 'Instead of answering, they lift the cover a little: a small plate engraved with someone’s name.'),
          effects: [{ kind: 'echoes', amount: 6 }],
        },
        failure: {
          text: t('“묻는 사람이 제일 위험해요.” 그 말이 끝나기도 전에 경보가 울린다.', '“The ones who ask are the dangerous ones.” An alarm goes off before they finish.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('보급품 일부를 나눠 준다', 'Share some supplies'),
        hint: t('−15 ₵ · 파티 회복 6 · 추적 −6', '−15 ₵ · heal party 6 · −6 Trace'),
        requires: { minCredits: 15 },
        success: {
          text: t('그가 지름길을 알려 준다. 쉬어 갈 자리도.', 'They point out a shortcut, and a place to rest on the way.'),
          effects: [
            { kind: 'credits', amount: -15 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'trace', amount: -6 },
          ],
        },
      },
      {
        label: t('조용히 지나간다', 'Pass quietly'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('지나가는 동안 그는 한 번도 고개를 돌리지 않는다.', 'They never once turn their head as you pass.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('그것을 빼앗는다', 'Take it from them'),
        hint: t('고급 임플란트 · −6 HP · 추적 +10', 'Uncommon implant · −6 HP · +10 Trace'),
        success: {
          text: t('손에 쥔 것은 따뜻하다. 뒤에서 아무 소리도 나지 않는다. 그게 더 무겁다.', 'What you hold is warm. Behind you, not a sound. That weighs more.'),
          effects: [
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 10 },
          ],
        },
      },
    ],
    gmHints: ['lone guardian', 'something glowing', 'below the city'],
  },
  {
    id: 'pc_deep_echo',
    acts: [4, 5, 6],
    procedural: { brief: t('지난 루프의 당신을 기억한다는 사람이 말을 건다.', 'Someone who says they remember you from an earlier loop speaks to you.') },
    title: t('지난번의 당신', 'You, Last Time'),
    image: 'v2/events/pc_deep_echo.webp',
    text: t(
      '낯선 사람이 반갑게 손을 든다. “또 왔네요. 지난번엔 왼쪽으로 갔죠.”\n당신은 그 사람을 모른다. 그런데 왼쪽 통로가 정말 낯익다.',
      'A stranger raises a hand in greeting. “Back again. Last time you went left.”\nYou do not know them. But the left passage does look familiar.',
    ),
    options: [
      {
        label: t('지난번 이야기를 듣는다', 'Hear about last time'),
        hint: t('통찰 +1 · 실패 시 −5 HP', '+1 Insight · fail −5 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('그가 말하는 당신은 당신과 조금 다르다. 그 차이에서 길이 보인다.', 'The you they describe is a little different from you. In the difference, a way through shows.'),
          effects: [
            { kind: 'axis', axis: 'insight' },
            { kind: 'echoes', amount: 4 },
          ],
        },
        failure: {
          text: t('두 개의 기억이 겹친다. 머리가 울린다.', 'Two memories overlap. Your head rings.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('이번엔 오른쪽으로 간다', 'Go right this time'),
        hint: t('카드 선택 · 추적 +5', 'Card choice · +5 Trace'),
        success: {
          text: t('오른쪽 통로는 아무도 걷지 않은 길이다. 처음 보는 것이 손에 들어온다.', 'The right-hand passage has never been walked. Something new comes to hand.'),
          effects: [
            { kind: 'card_choice' },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
      {
        label: t('“사람 잘못 봤어요.”', '“You have me confused with someone.”'),
        hint: t('추적 −6', '−6 Trace'),
        success: {
          text: t('그가 웃는다. “지난번에도 그렇게 말했어요.”', 'They laugh. “That’s what you said last time, too.”'),
          effects: [{ kind: 'trace', amount: -6 }],
        },
      },
    ],
    gmHints: ['someone from an earlier loop', 'familiar passage', 'déjà vu'],
  },
  // 2026-11-04: the route maps (Unwritten Sea, Outside the List) roll only their own route's events, so they had none.
  {
    id: 'pc_sea_tag',
    acts: [4],
    route: 'sea_4',
    procedural: { brief: t('마른 항구에서 압류 딱지가 붙은 물건을 품에 안은 사람을 만난다.', 'On the dry harbor, you meet someone clutching a thing with a seizure tag on it.') },
    title: t('딱지 붙은 물건', 'The Tagged Thing'),
    image: 'v2/events/pc_sea_tag.webp',
    text: t(
      '컨테이너 그늘에 누군가 웅크리고 있다. 품에 안은 것에 노란 압류 딱지가 붙어 있다.\n“세관이 가져가기 전에 빼 왔어요. 근데 딱지가 안 떨어져요. 이거 붙어 있으면 어디서든 잡혀요.”',
      'Someone crouches in a container’s shadow, hugging something with a yellow seizure tag on it.\n“Got it out before Customs took it. But the tag won’t come off. With it on, they catch you anywhere.”',
    ),
    options: [
      {
        label: t('딱지를 떼어 준다', 'Peel the tag off for them'),
        hint: t('코덱스 · ◈ +5 · 실패 시 추적 +6', 'Codex · +5 ◈ · fail +6 Trace'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('딱지가 한 번에 떨어진다. 그가 물건을 더 꼭 안는다.', 'The tag comes off in one go. They hold the thing tighter.'),
          effects: [{ kind: 'echoes', amount: 5 }, { kind: 'codex', id: 'lore_sea_customs' }],
        },
        failure: {
          text: t('딱지가 찢어지며 경보 칩이 울린다.', 'The tag tears and its alarm chip goes off.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('세관 순찰을 다른 쪽으로 돌린다', 'Draw the customs patrol the other way'),
        hint: t('추적 +4 · 소모품', '+4 Trace · consumable'),
        success: {
          text: t('순찰이 당신을 쫓는 사이 그가 사라진다. 자리에 보급품 하나를 두고.', 'While the patrol chases you, they vanish, leaving a supply pack behind.'),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('못 본 척 지나간다', 'Walk past as if you saw nothing'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('뒤에서 딱지가 바람에 파닥거리는 소리가 난다.', 'Behind you, the tag flutters in the wind.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('무진이 딱지를 하역조 방식으로 떼 준다', 'Mujin peels the tag the crew’s way'),
        hint: t('◈ +4 · 무진 유대 +1', '+4 ◈ · Mujin bond +1'),
        requires: { companion: 'mujin' },
        success: {
          text: t('무진이 손톱으로 딱지 귀퉁이를 들고 단번에 뗀다. “이건 기술이야.” 경보 칩은 울리지 않는다.', 'Mujin lifts a corner with a thumbnail and peels it in one go. “There’s a knack.” The alarm chip stays silent.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'bond', id: 'mujin', amount: 1 }],
        },
      },
    ],
    gmHints: ['seizure tag', 'dry harbor', 'stranger hiding'],
  },
  {
    id: 'pc_sea_wader',
    acts: [5],
    route: 'sea_5',
    procedural: { brief: t('밀물선에서 남의 기억을 떠안은 채 물속을 걷는 사람을 만난다.', 'On the tide line, you meet someone wading with a stranger’s memory on them.') },
    title: t('젖은 발목', 'Wet to the Ankle'),
    image: 'v2/events/pc_sea_wader.webp',
    text: t(
      '회색 물속을 누군가 천천히 걸어온다. 발목까지 젖었다. 눈빛이 두 사람 것처럼 흔들린다.\n“방금 남의 생일이 생각났어요. 케이크 촛불이 몇 개였는지까지. 이거, 누구한테 돌려줘야 하죠?”',
      'Someone wades slowly through the gray water, soaked to the ankle, eyes wavering as if they belonged to two people.\n“I just remembered a stranger’s birthday. Down to how many candles. Who do I give this back to?”',
    ),
    options: [
      {
        label: t('물 밖으로 끌어낸다', 'Pull them out of the water'),
        hint: t('파티 회복 6 · ◈ +3', 'heal party 6 · +3 ◈'),
        success: {
          text: t('뭍에 앉자 그의 눈빛이 하나로 돌아온다. “고마워요. 내 생일은 겨울이에요.”', 'On dry ground their eyes settle back into one. “Thank you. My birthday’s in winter.”'),
          effects: [
            { kind: 'heal_party', amount: 6 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
      {
        label: t('그 기억을 대신 받아 준다', 'Take the memory from them'),
        hint: t('◈ +8 · −5 HP', '+8 ◈ · −5 HP'),
        success: {
          text: t('촛불 여섯 개가 당신 머릿속에 켜진다. 남의 기억이 이렇게 무겁다.', 'Six candles light in your head. Someone else’s memory weighs this much.'),
          effects: [
            { kind: 'echoes', amount: 8 },
            { kind: 'hp', amount: -5 },
          ],
        },
      },
      {
        label: t('물을 피해 돌아간다', 'Go around the water'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('뒤에서 그가 촛불 개수를 다시 센다.', 'Behind you they count the candles again.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('파랑이 그 기억의 주인을 알아본다', 'Parang knows whose memory it is'),
        hint: t('추적 −5 · ◈ +3 · 파랑 유대 +1', '−5 Trace · +3 ◈ · Parang bond +1'),
        requires: { companion: 'parang' },
        success: {
          text: t('파랑이 물에 젖은 사람의 손을 잡는다. “그 생일, 바지선 시장 할머니 아들 거야.” 주인이 정해지자 눈빛이 하나로 돌아온다.', 'Parang takes the wet stranger’s hand. “That birthday is the barge-market woman’s son’s.” Once it has an owner, their eyes settle back into one.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'echoes', amount: 3 }, { kind: 'bond', id: 'parang', amount: 1 }],
        },
      },
    ],
    gmHints: ['gray tide', 'borrowed memory', 'wading stranger'],
  },
  {
    id: 'pc_sea_watch',
    acts: [6],
    route: 'sea_6',
    procedural: { brief: t('등대로 가는 철탑 길에서 혼자 불침번을 서는 등대단원을 만난다.', 'On the causeway to the lighthouse, you meet a Keeper standing a lonely night watch.') },
    title: t('혼자 서는 불침번', 'The Lone Watch'),
    image: 'v2/events/pc_sea_watch.webp',
    text: t(
      '안개 속 철탑 길에 등대단원 하나가 등불을 들고 서 있다. 교대자가 오지 않았다고 한다.\n“여기서 졸면 조수가 넘어와요. 그런데 사흘째 혼자예요.” 그가 당신을 본다. 교대자인지 침입자인지 가늠하는 눈이다.',
      'A Keeper stands on the fogbound causeway holding a lamp. Their relief never came, they say.\n“Doze off here and the tide comes over. But I’ve been alone three days.” They study you, deciding: relief or intruder.',
    ),
    options: [
      {
        label: t('한 시간 대신 서 준다', 'Stand an hour for them'),
        hint: t('코덱스 · 추적 −10 · ◈ +3', 'Codex · −10 Trace · +3 ◈'),
        success: {
          text: t('등대단원이 난간에 기대 잠든다. 깨어나서 초소 순찰표를 건넨다.', 'The Keeper sleeps against the rail. Waking, they hand you the posts’ patrol table.'),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'echoes', amount: 3 },
            { kind: 'codex', id: 'lore_sea_keepers' },
          ],
        },
      },
      {
        label: t('교대자인 척한다', 'Pretend to be the relief'),
        hint: t('소모품 · 실패 시 추적 +8', 'consumable · fail +8 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('그가 등불과 보급 꾸러미를 넘기고 떠난다. 등불은 놓고 간다.', 'They hand over the lamp and a supply bundle and leave. You set the lamp down.'),
          effects: [{ kind: 'consumable' }],
        },
        failure: {
          text: t('“교대 암구호는요?” 대답이 없자 그가 무적을 분다.', '“The relief password?” When you have none, they blow the foghorn.'),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('안개를 따라 비켜 간다', 'Slip past in the fog'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('등불 빛이 안개 속에서 점점 작아진다.', 'The lamplight shrinks in the fog.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('서하가 옛 교대 암구호를 댄다', 'Seo-ha gives the old relief password'),
        hint: t('소모품 · 서하 유대 +1', 'consumable · Seo-ha bond +1'),
        requires: { companion: 'seo_ha' },
        success: {
          text: t('서하가 한 단어를 말한다. 등대단원이 눈을 크게 뜬다. “그건 우리 할머니 때 암구호인데.” 보급 꾸러미를 건넨다.', 'Seo-ha says one word. The Keeper’s eyes widen. “That was the password in my grandmother’s day.” A supply bundle is handed over.'),
          effects: [{ kind: 'consumable' }, { kind: 'bond', id: 'seo_ha', amount: 1 }],
        },
      },
    ],
    gmHints: ['lonely keeper', 'night watch', 'causeway fog'],
  },
  {
    id: 'pc_outside_shift',
    acts: [2],
    route: 'outside',
    procedural: { brief: t('폐점 뒤 뒷골목에서 명단에 없는 사람이 마지막 일을 끝내려 하고 있다.', 'In a back alley after closing, someone off the list is trying to finish one last job.') },
    title: t('마지막 한 건', 'One Last Job'),
    image: 'v2/events/pc_outside_shift.webp',
    text: t(
      '골목 끝에서 누군가 일을 서두른다. 손수레에 짐이 반쯤 실렸다. 정리반 경광등이 두 골목 건너에서 돈다.\n“이것만 갖다주면 오늘 끝이에요. 근데 손이 모자라요.”',
      'At the end of the alley someone is rushing a job, a handcart half loaded. The Closing Crew’s beacon turns two alleys over.\n“Deliver this and I’m done for today. But I’m short of hands.”',
    ),
    options: [
      {
        label: t('짐 싣는 걸 돕는다', 'Help load the cart'),
        hint: t('+20 ₵ · 실패 시 추적 +6', '+20 ₵ · fail +6 Trace'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('마지막 상자가 올라간다. 그가 품삯을 반 나눈다.', 'The last box goes on. They split the pay with you.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
        failure: {
          text: t('상자가 떨어져 요란한 소리가 난다. 경광등이 이쪽으로 돈다.', 'A box crashes down. The beacon swings this way.'),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
      {
        label: t('정리반 쪽을 망봐 준다', 'Keep watch toward the Crew'),
        hint: t('코덱스 · 추적 −8 · ◈ +3', 'Codex · −8 Trace · +3 ◈'),
        success: {
          text: t('경광등이 다가올 때마다 신호를 준다. 둘 다 무사히 골목을 빠져나간다.', 'Each time the beacon nears you signal. You both get out of the alley clean.'),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 3 },
            { kind: 'codex', id: 'lore_outside_closing_crew' },
          ],
        },
      },
      {
        label: t('갈 길을 간다', 'Go on your way'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('뒤에서 손수레 바퀴가 덜컹거린다.', 'Behind you a handcart wheel rattles.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
    gmHints: ['off-list worker', 'last delivery', 'closing crew beacon'],
  },
]

/**
 * People the GM can cast in a procedural event (W2-3): a name and one telling detail. The opening line is asked to
 * bring this person in by name; picked per run and event (ui/shell/eventOpening.ts), never by the model.
 */
export const PROCEDURAL_PEOPLE: Text[] = [
  t('붉은 목도리를 두른 순옥', 'Sun-ok in a red scarf'),
  t('한쪽 렌즈가 깨진 안경의 덕배', 'Deok-bae with one cracked lens'),
  t('손등에 바코드 문신이 있는 미나', 'Mina with a barcode tattoo on her hand'),
  t('우산 대신 비닐을 쓴 노인 강씨', 'old Mr. Kang under a plastic sheet instead of an umbrella'),
  t('배달 헬멧을 벗지 않는 지호', 'Ji-ho, who never takes off his delivery helmet'),
  t('의족에서 작은 소리가 나는 은비', 'Eun-bi, whose prosthetic leg ticks softly'),
  t('정비복 소매를 걷어붙인 춘자', 'Chun-ja with her coverall sleeves rolled up'),
  t('목소리가 유난히 낮은 소년 태양', 'Tae-yang, a boy with an unusually low voice'),
  t('모자챙에 꽃을 꽂은 경비원 말순', 'Mal-sun, a guard with a flower tucked in her cap'),
  t('손가락 마디마다 반지를 낀 브로커 칠성', 'Chil-seong, a broker with a ring on every knuckle'),
  t('기침을 숨기는 간호사 혜원', 'Hye-won, a nurse hiding a cough'),
  t('낡은 카메라를 목에 건 영두', 'Yeong-du with an old camera round his neck'),
]
