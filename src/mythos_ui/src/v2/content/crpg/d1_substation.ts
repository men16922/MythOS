// Act 1 district — Substation 17 (reference district: every later district follows this shape).
//
// Four points of interest, three actions: the player cannot see everything. Quest q_grid runs through three of them
// (Oh explains the stolen power → hide it, by hand or by misdirecting the patrol → payoff at the Act 1 boss; or sell
// it to Sergeant Yun for credits). Approval: Se-rin likes nerve and dislikes cops, Tae-o protects the weak and hates
// betrayal, Han backs anything that keeps power out of IX's hands, Kai is tender with machines.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D1_SUBSTATION: DistrictDef = {
  id: 'd1_substation',
  act: 1,
  name: t('변전소 17', 'Substation 17'),
  image: 'v2/events/a1_dead_substation.webp',
  intro: t(
    '정전 구역 한가운데, 변전소 하나만 불이 켜져 있다. 철문 틈으로 새어 나오는 노란 빛. 그 빛을 따라 사람들이 모여 산다.\n순찰대가 오기 전까지, 둘러볼 수 있는 곳은 세 군데쯤.',
    'In the middle of the blackout zone, one substation still has its lights on. Yellow light leaks through the iron gate, and people live clustered along it.\nBefore the patrol arrives, you have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '멀리서 사이렌이 한 번 운다. 변전소의 불빛을 등지고 골목으로 빠진다.',
    'A siren wails once in the distance. You turn your back on the substation’s light and slip into the alleys.',
  ),
  pois: [
    { id: 'gate', name: t('철문 앞 꼬마', 'The Kid at the Gate'), blurb: t('통행료를 받는 망꾼.', 'A lookout charging a toll.'), dialogue: 'd1s_bora' },
    { id: 'workshop', name: t('오 기사의 배전반', 'Old Oh’s Switchboard'), blurb: t('불을 켜 둔 사람.', 'The man keeping the lights on.'), dialogue: 'd1s_oh' },
    { id: 'checkpoint', name: t('검문 바리케이드', 'The Checkpoint'), blurb: t('순찰대가 먼저 와 있다.', 'The patrol got here first.'), dialogue: 'd1s_yun' },
    { id: 'tank', name: t('옥상 물탱크', 'The Rooftop Tank'), blurb: t('아무도 올라가지 않는 곳.', 'Where nobody climbs.'), dialogue: 'd1s_tank' },
  ],
}

const BORA: DialogueDef = {
  id: 'd1s_bora',
  npc: 'bora',
  start: 'toll',
  nodes: {
    toll: {
      speaker: 'bora',
      text: t(
        '철문 위에 걸터앉은 꼬마가 손전등을 당신 얼굴에 들이댄다. “통행료 10크레딧. 깎아 주는 거 없어. 밤엔 15.”',
        'A kid perched on the gate shines a flashlight in your face. “Toll’s ten credits. No haggling. Fifteen after dark.”',
      ),
      options: [
        {
          label: t('10크레딧을 건넨다', 'Hand over ten credits'),
          intent: 'offer',
          requires: { minCredits: 10 },
          approval: { tae_o: 1 },
          success: {
            text: t('꼬마가 칩을 이로 깨물어 본다. “진짜네. 들어가. 근데 오 할아버지한테 순찰 얘긴 하지 마. 내가 할 거야.”', 'The kid bites the chip to test it. “Real. Go on in. But don’t tell Grandpa Oh about the patrol. That’s my job.”'),
            effects: [{ kind: 'credits', amount: -10 }, { kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'inside',
          },
        },
        {
          label: t('“밤엔 15라며. 아직 해 있잖아.”', '“Fifteen after dark, you said. The sun’s still up.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 12 },
          approval: { se_rin: 1 },
          success: {
            text: t('꼬마가 하늘을 올려다본다. 회색 구름 뒤 어딘가에 해가 있긴 하다. “…말은 되네. 공짜로 해 줄게. 이번만.”', 'The kid looks up. Somewhere behind the grey clouds there is a sun. “…Fair. Free, then. Just this once.”'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'inside',
          },
          failure: {
            text: t('“지금 나랑 말장난해?” 손전등 불빛이 더 가까워진다. 값이 15로 올랐다.', '“You playing word games with me?” The flashlight comes closer. The price just went up to fifteen.'),
            goto: 'toll15',
          },
        },
        {
          label: t('철문을 흔들어 겁을 준다', 'Rattle the gate to scare the kid'),
          intent: 'intimidate',
          check: { stat: 'str', dc: 10 },
          approval: { tae_o: -2, se_rin: -1 },
          success: {
            text: t('꼬마가 철문에서 뛰어내려 어둠 속으로 사라진다. 길은 열렸다. 뒤에서 누군가 혀를 찬다.', 'The kid drops off the gate and vanishes into the dark. The way is open. Someone behind you clicks their tongue.'),
          },
          failure: {
            text: t('꼬마가 호루라기를 분다. 변전소 안의 불이 일제히 꺼진다. 이 문은 오늘 다시 열리지 않는다.', 'The kid blows a whistle. Every light in the substation goes dark at once. This gate won’t open again today.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('배달꾼 수신호를 보낸다', 'Flash the couriers’ hand sign'),
          intent: 'sneak',
          requires: { background: 'runner' },
          success: {
            text: t('꼬마의 눈이 커진다. 같은 수신호가 돌아온다. “선배네. 들어가요. 이거 가져가요, 순찰대 사이렌 주파수예요.”', 'The kid’s eyes go wide. The same sign comes back. “You’re one of us. Go in. Take this — it’s the patrol siren’s frequency.”'),
            effects: [{ kind: 'consumable' }, { kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'inside',
          },
        },
        {
          label: t('돌아선다', 'Walk away'),
          intent: 'leave',
          success: { text: t('“구경만 할 거면 저리 가.” 손전등이 다음 사람을 찾는다.', '“Just looking? Then move along.” The flashlight swings to the next person.') },
        },
      ],
    },
    toll15: {
      speaker: 'bora',
      text: t('“15. 마지막 가격이야.” 꼬마가 손바닥을 내민다.', '“Fifteen. Final price.” The kid holds out a palm.'),
      options: [
        {
          label: t('15크레딧을 건넨다', 'Hand over fifteen credits'),
          intent: 'offer',
          requires: { minCredits: 15 },
          success: {
            text: t('“진작 그러지.” 꼬마가 칩을 주머니에 넣고 철문을 연다.', '“Should’ve done that first.” The kid pockets the chip and opens the gate.'),
            effects: [{ kind: 'credits', amount: -15 }, { kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'inside',
          },
        },
        {
          label: t('돌아선다', 'Walk away'),
          intent: 'leave',
          success: { text: t('등 뒤에서 손전등이 꺼진다.', 'Behind you, the flashlight clicks off.') },
        },
      ],
    },
    inside: {
      speaker: 'bora',
      text: t(
        '“순찰대가 오늘 밤에 와. 윤 경사가 직접. 할아버지 배선 찾으러.” 꼬마가 이를 악문다. “찾으면 여기 이백 명이 얼어 죽어.”',
        '“The patrol’s coming tonight. Sergeant Yun himself. For Grandpa’s wiring.” The kid clenches their jaw. “If they find it, two hundred people freeze in here.”',
      ),
      options: [
        {
          label: t('“윤 경사는 어떤 사람이야?”', '“What’s Sergeant Yun like?”'),
          intent: 'ask',
          success: {
            text: t('“규칙대로 하는 사람. 근데 규칙 안에 구멍이 있으면, 그 구멍도 규칙대로 지나가.” 꼬마가 씩 웃는다.', '“Goes by the rules. But if there’s a hole in the rules, he goes through the hole by the rules too.” The kid grins.'),
          },
        },
        {
          label: t('“내가 도울게.”', '“I’ll help.”'),
          intent: 'offer',
          approval: { tae_o: 1, han: 1 },
          success: {
            text: t('꼬마가 당신을 위아래로 훑어본다. “말은 쉽지.” 그래도 철문 빗장을 직접 풀어 준다.', 'The kid looks you up and down. “Talk’s cheap.” But they slide the bolt open themselves.'),
          },
        },
      ],
    },
  },
}

const OH: DialogueDef = {
  id: 'd1s_oh',
  npc: 'oh_gisa',
  start: 'start',
  nodes: {
    start: {
      speaker: 'oh_gisa',
      text: t(
        '배전반 앞의 노인이 돌아보지도 않고 말한다. 손끝에서 파란 불꽃이 튄다. “누구 보냈어. 구청이야, 단속국이야.”',
        'The old man at the switchboard speaks without turning around. Blue sparks jump from his fingertips. “Who sent you. The district office or Enforcement.”',
      ),
      options: [
        {
          label: t('“전기를 어디서 끌어와요?”', '“Where’s the power coming from?”'),
          intent: 'ask',
          success: { text: t('노인이 처음으로 고개를 돌린다. 한쪽 눈이 하얗게 탔다.', 'For the first time he turns. One of his eyes is burned white.'), goto: 'explain' },
        },
        {
          label: t('배전반 배선을 읽는다', 'Read the switchboard wiring'),
          intent: 'insight',
          check: { stat: 'int', dc: 12 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t('세 갈래. 하나는 ARK 송전선에서, 하나는 폐지하철 비상 전원에서, 하나는… 가로등이다. “기가 막히네요.” 노인이 코웃음 친다. “알아보는 놈은 처음이야.”', 'Three branches. One off the ARK transmission line, one off the dead subway’s emergency supply, and one… from the streetlights. “That’s brilliant.” He snorts. “First one who’s noticed.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
            goto: 'explain',
          },
          failure: {
            text: t('손을 뻗은 순간 배선이 튄다. 손가락 끝이 하얗게 저린다. “만지지 마, 이 멍청아.”', 'You reach in and the wire snaps at you. Your fingertips go numb and white. “Don’t touch, you idiot.”'),
            effects: [{ kind: 'hp', amount: -3 }],
            goto: 'explain',
          },
        },
        {
          label: t('화상 입은 손을 봐 준다', 'Look at his burned hands'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { tae_o: 1, su_ah: 2 },
          success: {
            text: t('물집 위로 소독약을 붓는다. 노인은 신음 한 번 없다. 붕대를 다 감자 그가 주머니에서 무언가를 꺼내 준다. “빚지고는 못 살아.”', 'You pour antiseptic over the blisters. He doesn’t make a sound. When you finish he digs something out of his pocket. “I can’t live owing people.”'),
            effects: [{ kind: 'consumable', id: 'nanopatch' }, { kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'explain',
          },
        },
        {
          label: t('물러난다', 'Back off'),
          intent: 'leave',
          success: { text: t('파란 불꽃이 다시 튄다. 노인은 당신이 있었다는 것도 잊은 것 같다.', 'Blue sparks again. He seems to have already forgotten you were here.') },
        },
      ],
    },
    explain: {
      speaker: 'oh_gisa',
      text: t(
        '“여기 이백 명이 살아. 노인, 애들, 등록 말소된 놈들. IX 계산으로는 전기 줄 가치가 없는 사람들이지.” 그가 배전반을 툭 친다. “오늘 밤 윤 경사가 이걸 찾으러 와.”',
        '“Two hundred people live here. Old folks, kids, the deregistered. By IX’s math, not worth the power.” He taps the switchboard. “Tonight Sergeant Yun comes looking for this.”',
      ),
      options: [
        {
          label: t('“숨기는 걸 도울게요.”', '“Let me help you hide it.”'),
          intent: 'offer',
          approval: { han: 2, tae_o: 1, se_rin: 1 },
          success: {
            text: t('노인이 한참 당신을 본다. “공짜는 없다.” 그러고는 공구 가방을 당신 쪽으로 밀어 준다.', 'He looks at you a long time. “Nothing’s free.” Then he slides his tool bag over to you.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 1 }],
            goto: 'plan',
          },
        },
        {
          label: t('“단속국에 넘기면 얼마나 받죠?”', '“How much would Enforcement pay for this?”'),
          intent: 'intimidate',
          approval: { han: -2, tae_o: -1 },
          success: {
            text: t('노인이 바닥에 침을 뱉는다. “물어보는 놈은 다 그 값을 알아.” 그는 다시 배전반으로 돌아선다. 등이 굳어 있다.', 'He spits on the floor. “Anyone who asks already knows the price.” He turns back to the board. His back is rigid.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 1 }],
          },
        },
        {
          label: t('나간다', 'Leave'),
          intent: 'leave',
          success: { text: t('“그래. 다들 그렇지.”', '“Sure. Everyone does.”') },
        },
      ],
    },
    plan: {
      speaker: 'oh_gisa',
      text: t(
        '“방법은 둘. 굵은 선을 땅에 묻든가, 신호를 가로등 회로로 위장하든가. 아니면 윤 경사를 딴 데로 보내든가. 그건 네 입으로 해야겠지.”',
        '“Two ways. Bury the main line, or disguise the signal as the streetlight circuit. Or send Yun somewhere else. That one would take your mouth, not your hands.”',
      ),
      options: [
        {
          label: t('굵은 선을 직접 땅에 묻는다', 'Bury the main line yourself'),
          intent: 'fight',
          check: { stat: 'str', dc: 13 },
          approval: { tae_o: 1 },
          success: {
            text: t('콘크리트를 깨고, 케이블을 끌고, 다시 덮는다. 손바닥이 다 까졌다. 노인이 처음으로 웃는다. 이가 세 개 없다.', 'You break the concrete, drag the cable, cover it again. Your palms are raw. For the first time the old man laughs. He’s missing three teeth.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 2 }],
          },
          failure: {
            text: t('케이블이 미끄러지며 손바닥을 태운다. 반쯤 묻은 선이 그대로 드러나 있다. “됐어. 나머진 내가 해.”', 'The cable slips and burns your palm. The half-buried line lies exposed. “Enough. I’ll do the rest.”'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('신호를 가로등 회로로 위장한다', 'Disguise the signal as the streetlight circuit'),
          intent: 'insight',
          check: { stat: 'int', dc: 12 },
          assist: 'han',
          approval: { han: 2 },
          success: {
            text: t('주파수를 하나 틀고, 이름표를 하나 바꾼다. 단속국 스캐너에는 이제 고장 난 가로등 열두 개가 보일 것이다.', 'One frequency shifted, one label swapped. Enforcement’s scanners will now see twelve broken streetlights.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 2 }],
          },
          failure: {
            text: t('배전반에서 경보음이 짧게 울린다. 어딘가의 감시망이 이 주파수를 기억했다.', 'The board chirps a short alarm. Somewhere, a watch-net has remembered this frequency.'),
            effects: [{ kind: 'trace', amount: 8 }],
          },
        },
        {
          label: t('“윤 경사는 제가 상대할게요.”', '“I’ll deal with Yun.”'),
          intent: 'leave',
          success: { text: t('“입담 좋은 놈이길 빈다.” 노인이 공구를 다시 집어 든다.', '“Hope you’ve got the tongue for it.” He picks his tools back up.') },
        },
      ],
    },
  },
}

const YUN: DialogueDef = {
  id: 'd1s_yun',
  npc: 'sgt_yun',
  start: 'stop',
  nodes: {
    stop: {
      speaker: 'sgt_yun',
      text: t(
        '바리케이드 너머 단속관 넷. 가운데 남자가 장갑 낀 손을 든다. “정지. 이 구역은 전력 감사 중입니다. 용무를 말씀하십시오.”',
        'Four enforcers behind the barricade. The man in the middle raises a gloved hand. “Halt. This zone is under power audit. State your business.”',
      ),
      options: [
        {
          label: t('“전력공사 검침원입니다.”', '“Meter reader. Power authority.”'),
          intent: 'deceive',
          check: { stat: 'cha', dc: 13 },
          approval: { se_rin: 2 },
          success: {
            text: t('윤 경사가 당신의 빈손을 오래 본다. “…검침 장비는 차에 두고 오셨군요.” 그가 길을 비킨다. 믿은 건지, 믿어 준 건지 모르겠다.', 'Yun looks at your empty hands for a long time. “…Left the meter in the car, I see.” He steps aside. You can’t tell if he believed you or chose to.'),
            goto: 'talk',
          },
          failure: {
            text: t('“검침원은 3년 전에 전원 IX 원격 검침으로 대체됐습니다.” 단속관 둘이 곤봉을 뽑는다.', '“Meter readers were all replaced by IX remote metering three years ago.” Two enforcers draw their batons.'),
            effects: [{ kind: 'combat', encounterId: 'a1_n2_patrol' }],
          },
        },
        {
          label: t('옛 소속 번호를 댄다', 'Give your old service number'),
          intent: 'intimidate',
          requires: { background: 'enforcer' },
          approval: { tae_o: 1, se_rin: -1 },
          success: {
            text: t('윤 경사의 자세가 미묘하게 바뀐다. “…선배님이셨습니까.” 목소리가 낮아진다. “여기서는 아무것도 못 보신 겁니다.”', 'Yun’s stance shifts, just slightly. “…You were one of ours, sir.” His voice drops. “You haven’t seen anything here.”'),
            goto: 'talk',
          },
        },
        {
          label: t('바리케이드를 피해 돌아간다', 'Slip around the barricade'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 12 },
          success: { text: t('배수로를 따라 몸을 낮춘다. 탐조등이 머리 위를 두 번 지나간다. 들키지 않았다. 아무것도 얻지도 못했다.', 'You keep low along the drainage ditch. The searchlight passes overhead twice. Not seen. Nothing gained either.') },
          failure: {
            text: t('물웅덩이를 밟는다. 탐조등이 당신에게 멈춘다. “거기!”', 'You step in a puddle. The searchlight stops on you. “You there!”'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('돌아선다', 'Turn back'),
          intent: 'leave',
          success: { text: t('“현명하십니다.” 윤 경사가 손을 내린다.', '“Wise choice.” Yun lowers his hand.') },
        },
      ],
    },
    talk: {
      speaker: 'sgt_yun',
      text: t(
        '“무허가 배선 신고가 들어왔습니다. 오늘 밤 안에 찾아야 합니다.” 그가 지도를 펼친다. 변전소 블록에 빨간 동그라미가 있다. “혹시 아시는 게 있다면.”',
        '“We had a report of unlicensed wiring. It has to be found tonight.” He unfolds a map. A red circle on the substation block. “If you happen to know anything.”',
      ),
      options: [
        {
          label: t('“북쪽 블록에서 불꽃 튀는 걸 봤어요.”', '“I saw sparks over on the north block.”'),
          intent: 'deceive',
          requires: { quest: { id: 'q_grid', stage: 1 } },
          check: { stat: 'cha', dc: 14 },
          approval: { se_rin: 2, han: 1 },
          success: {
            text: t('윤 경사가 빨간 동그라미 위로 새 동그라미를 그린다. 북쪽으로. “협조 감사합니다.” 순찰대가 몸을 돌린다.', 'Yun draws a new circle over the red one. North. “Thank you for your cooperation.” The patrol turns.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 2 }],
          },
          failure: {
            text: t('“북쪽 블록은 어제 감사가 끝났습니다.” 그가 지도를 접는다. 이제 당신 이름도 그의 수첩에 있다.', '“The north block was audited yesterday.” He folds the map. Now your name is in his notebook too.'),
            effects: [{ kind: 'trace', amount: 8 }],
          },
        },
        {
          label: t('배선 위치를 넘긴다', 'Give up the wiring’s location'),
          intent: 'offer',
          requires: { quest: { id: 'q_grid', stage: 1 } },
          approval: { han: -3, tae_o: -2, se_rin: -1, lin_yue: 1 },
          success: {
            text: t('윤 경사가 고개를 끄덕이고 보상 칩을 내민다. 추적 기록에서 당신 줄이 몇 개 지워진다. 등 뒤에서 변전소의 노란 불빛이, 하나씩 꺼진다.', 'Yun nods and holds out a reward chip. A few lines of your trace record vanish. Behind you the substation’s yellow lights go out, one by one.'),
            effects: [{ kind: 'quest', id: 'q_grid', stage: 3 }, { kind: 'credits', amount: 40 }, { kind: 'trace', amount: -10 }, { kind: 'flag', key: 'sold_grid' }],
          },
        },
        {
          label: t('“모르겠는데요.”', '“No idea.”'),
          intent: 'leave',
          success: { text: t('“그렇겠지요.” 그가 지도를 접는다. 순찰대는 변전소 쪽으로 걷기 시작한다.', '“Of course.” He folds the map. The patrol starts walking toward the substation.') },
        },
      ],
    },
  },
}

const TANK: DialogueDef = {
  id: 'd1s_tank',
  start: 'climb',
  nodes: {
    climb: {
      text: t(
        '녹슨 사다리가 옥상까지 이어진다. 물탱크 아래, 비닐로 싼 무언가가 보인다. 그 옆에 꺼진 정비 드론 하나가 웅크리고 있다.',
        'A rusted ladder runs up to the roof. Under the water tank, something wrapped in plastic. Next to it, a dead maintenance drone curled up on itself.',
      ),
      options: [
        {
          label: t('비닐 꾸러미를 꺼낸다', 'Pull out the plastic bundle'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 11 },
          success: {
            text: t('누군가의 비상금이다. 쪽지 하나: “다시 불 들어오면 국수 사 먹자.” 주인은 돌아오지 않은 것 같다.', 'Someone’s emergency stash. A note: “When the lights come back, let’s go for noodles.” Whoever left it never came back.'),
            effects: [{ kind: 'credits', amount: 30 }],
          },
          failure: {
            text: t('사다리 가로대 하나가 부러진다. 꾸러미는 물탱크 뒤로 굴러 사라진다.', 'A rung snaps. The bundle rolls behind the tank and is gone.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('드론을 다시 켜 본다', 'Try to wake the drone'),
          intent: 'insight',
          check: { stat: 'int', dc: 13 },
          assist: 'kai',
          approval: { kai: 2, han: 1 },
          success: {
            text: t('드론의 눈에 빛이 들어온다. 저장된 마지막 순찰 경로 하나, 그리고 전투 보조 프로토콜 하나. 드론이 그것을 당신에게 넘기고 다시 잠든다.', 'Light comes into the drone’s eye. One last saved patrol route, and one combat-assist protocol. It hands both over and goes back to sleep.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('드론이 한 번 경련하고 연기를 뿜는다. 다시는 켜지지 않을 것이다.', 'The drone twitches once and puffs smoke. It will never turn on again.'),
          },
        },
        {
          label: t('내려간다', 'Climb back down'),
          intent: 'leave',
          success: { text: t('바람이 물탱크를 울린다. 텅 빈 소리.', 'The wind drums the tank. A hollow sound.') },
        },
      ],
    },
  },
}

export const D1_SUBSTATION_DIALOGUES: DialogueDef[] = [BORA, OH, YUN, TANK]

export const D1_SUBSTATION_NPCS: NpcDef[] = [
  { id: 'oh_gisa', name: t('오 기사', 'Old Oh'), role: t('변전소 17의 무허가 전기 기사', 'Substation 17’s unlicensed electrician') },
  { id: 'bora', name: t('보라', 'Bora'), role: t('통행료를 받는 꼬마 망꾼', 'A kid lookout who charges a toll') },
  { id: 'sgt_yun', name: t('윤 경사', 'Sergeant Yun'), role: t('정전 구역 순찰 소대장', 'Blackout-zone patrol sergeant') },
]
