// A fourth wave of narrative events — 4 per act, so an act now rolls from 16 instead of 12 (a veteran meets
// fewer repeats). Same rules as events.ts (enforced by narrative.test.ts): every option is a real decision,
// every check has a failure that stings, credit costs are gated, ≥ 2 options need nothing, and Korean is the
// authored voice (screenplay action lines, concrete, short).
//
// These are deliberately "street level" scenes with no companion conflict and no new flags, so they can roll
// in any order without needing context from earlier acts.
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

// ================================================================== ACT 1 — C-17 Blackout

export const A1_MORE: EventDef[] = [
  {
    id: 'a1_last_noodle_stand',
    acts: [1],
    title: t('불 켜진 국숫집', 'The Last Lit Stall'),
    image: 'v2/events/a1_last_noodle_stand.webp',
    text: t(
      '정전된 거리에서 유일하게 불이 켜진 포장마차. 발전기 소리가 빗소리를 눌러 먹는다. 주인은 국자를 든 채 당신을 위아래로 훑는다.\n“국수는 15크레딧. 이야기는 값을 쳐주고. 순찰 도는 시간은, 한 그릇 먹으면 공짜로 알려 주지.”',
      'The only lit stall on a blacked-out street. A generator drowns the rain. The vendor looks you up and down, ladle in hand.\n“Noodles, fifteen credits. Stories, I pay for. Patrol times — free, if you eat a bowl.”',
    ),
    options: [
      {
        label: t('국수 한 그릇', 'A bowl of noodles'),
        hint: t('−15 ₵ · HP +8 · 추적 −4', '−15 ₵ · +8 HP · −4 Trace'),
        requires: { minCredits: 15 },
        success: {
          text: t(
            '뜨거운 국물이 식도를 타고 내려간다. 주인이 젓가락 끝으로 골목 하나를 가리킨다. “저쪽은 오늘 비었어.”',
            'Hot broth burns its way down. The vendor points a chopstick at one alley. “That one is empty tonight.”',
          ),
          effects: [
            { kind: 'credits', amount: -15 },
            { kind: 'hp', amount: 8 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
      {
        label: t('이야기를 판다', 'Sell a story'),
        hint: t('+30 ₵ · 실패 시 추적 +5', '+30 ₵ · fail +5 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t(
            '주인이 웃음을 터뜨리다 국자를 놓친다. “그건 거짓말이어도 값어치가 있네.” 지폐 몇 장이 카운터에 놓인다.',
            'The vendor bursts out laughing and drops the ladle. “Even as a lie, that’s worth something.” Bills land on the counter.',
          ),
          effects: [{ kind: 'credits', amount: 30 }],
        },
        failure: {
          text: t(
            '이야기가 어색하게 끊긴다. 주인의 눈이 가늘어진다. “너… 명단에서 본 얼굴 같은데.”',
            'The story stalls. The vendor’s eyes narrow. “You… look like a face from the lists.”',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('손님들 대화를 엿듣는다', 'Listen in on the regulars'),
        hint: t('추적 −8 · 실패 시 −6 HP', '−8 Trace · fail −6 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '젓가락 소리 사이로 순찰 교대 시간이 들린다. 두 시간 뒤. 그 전에 이 구역을 빠져나가면 된다.',
            'Between the clacking chopsticks you catch the patrol change. Two hours out. Be gone by then.',
          ),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '옆자리 남자가 당신 손목을 낚아챈다. 뿌리치는 사이 국솥이 엎어진다. 뜨겁다.',
            'The man beside you grabs your wrist. In the scuffle the soup pot tips over. Scalding.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['noodle stall', 'blackout', 'street vendor'],
  },
  {
    id: 'a1_hand_crank_lamp',
    acts: [1],
    title: t('손으로 돌리는 등', 'The Hand-Crank Lamp'),
    image: 'v2/events/a1_hand_crank_lamp.webp',
    text: t(
      '계단참마다 사람이 앉아 있다. 가운데 손발전기 등 하나가 간신히 계단통을 밝힌다. 크랭크를 돌리던 소녀가 팔을 떨며 고개를 든다.\n“교대해 줄 사람 없어요? 불이 꺼지면 위층 할머니가 ‘그것’을 또 보거든요.”',
      'Someone sits on every landing. One hand-crank lamp barely lights the stairwell. The girl turning the crank looks up, arm shaking.\n“Anyone to take over? If the light dies, the old woman upstairs sees ‘it’ again.”',
    ),
    options: [
      {
        label: t('크랭크를 대신 돌린다', 'Take over the crank'),
        hint: t('◈ +3 · HP +4 · 실패 시 −4 HP', '+3 ◈ · +4 HP · fail −4 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '한참 돌리자 계단통에 낮은 웅성거림이 돌아온다. 누군가 당신 어깨에 담요를 얹고 간다.',
            'After a long while a low murmur returns to the stairwell. Someone leaves a blanket on your shoulders.',
          ),
          effects: [
            { kind: 'echoes', amount: 3 },
            { kind: 'trace', amount: -3 },
            { kind: 'hp', amount: 4 },
          ],
        },
        failure: {
          text: t(
            '크랭크가 손에서 튄다. 손목이 꺾이고 등이 깜빡 꺼진다. 어둠 속에서 누군가 흐느낀다.',
            'The crank jerks out of your grip. Your wrist bends back and the lamp gutters out. Someone sobs in the dark.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('등의 배터리를 챙긴다', 'Pocket the lamp’s battery'),
        hint: t('소모품 · 추적 +8', 'Consumable · +8 Trace'),
        success: {
          text: t(
            '배터리를 뽑자 계단통이 통째로 어두워진다. 등 뒤에서 아무도 말하지 않는다. 그게 더 오래 남는다.',
            'You pull the battery and the whole stairwell goes dark. Nobody behind you says a word. That lingers longer.',
          ),
          effects: [
            { kind: 'consumable' },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('위층 노인을 살피러 간다', 'Check on the old woman upstairs'),
        hint: t('코덱스 · ◈ +2 · 추적 +2', 'Codex · +2 ◈ · +2 Trace'),
        success: {
          text: t(
            '노인은 벽의 한 점만 본다. “사람들이 한 줄로 걸어가. 이름이 하나씩 지워지면서.” 그리고 당신 얼굴을 알아본다.',
            'She stares at one spot on the wall. “People walk in a line. Their names are erased one by one.” Then she recognizes your face.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_c17_blackout' },
            { kind: 'echoes', amount: 2 },
            { kind: 'trace', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['hand-crank lamp', 'stairwell', 'blackout', 'neighbours'],
  },
  {
    id: 'a1_courier_lockbox',
    acts: [1],
    title: t('배달원의 잠금함', 'The Courier’s Lockbox'),
    image: 'v2/events/a1_courier_lockbox.webp',
    text: t(
      '빗물받이 밑에 오토바이 한 대가 엎어져 있다. 배달 가방 속 잠금함에 붙은 라벨. ‘수령인: 관악 3-12 / 오늘 중.’\n운전자는 보이지 않는다. 가방은 아직 따뜻하다.',
      'A scooter lies on its side under a drainpipe. A label on the lockbox in the delivery bag: ‘Recipient: Gwanak 3-12 / today.’\nNo rider in sight. The bag is still warm.',
    ),
    options: [
      {
        label: t('잠금함을 연다', 'Crack the lockbox'),
        hint: t('고급 카드 · 실패 시 정크', 'Uncommon card · fail: junk'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '딸깍. 안에는 손바닥만 한 코어 하나. 발신처는 지워져 있고 프로토콜만 선명하다.',
            'Click. Inside, a palm-sized core. The sender is scrubbed; the protocol is crystal clear.',
          ),
          effects: [{ kind: 'card_choice', rarity: 'uncommon' }],
        },
        failure: {
          text: t(
            '잠금함이 비명 같은 경보를 토한다. 신호가 번지고 머릿속에 지직거리는 소음이 달라붙는다.',
            'The lockbox shrieks an alarm. The signal smears and static clings inside your head.',
          ),
          effects: [
            { kind: 'junk', cardId: 'trace_bug' },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('주소까지 배달해 준다', 'Deliver it to the address'),
        hint: t('+25 ₵ · −4 HP', '+25 ₵ · −4 HP'),
        success: {
          text: t(
            '관악 3-12는 문이 없는 문이다. 안에서 손만 나와 가방을 낚아채고 지폐 몇 장을 밀어낸다. 이름은 묻지 않는다.',
            'Gwanak 3-12 is a doorway with no door. A hand reaches out, snatches the bag, pushes out some bills. Nobody asks your name.',
          ),
          effects: [
            { kind: 'credits', amount: 25 },
            { kind: 'hp', amount: -4 },
          ],
        },
      },
      {
        label: t('값나가는 것만 챙긴다', 'Take only what sells'),
        hint: t('+35 ₵ · 추적 +7', '+35 ₵ · +7 Trace'),
        success: {
          text: t(
            '가방 속 포장재를 걷어내자 신품 센서 모듈이 두 개 나온다. 번호는 줄칼로 긁어 낸다.',
            'Under the packing foam: two brand-new sensor modules. You file the serial numbers off.',
          ),
          effects: [
            { kind: 'credits', amount: 35 },
            { kind: 'trace', amount: 7 },
          ],
        },
      },
    ],
    gmHints: ['courier', 'lockbox', 'delivery', 'temptation'],
  },
  {
    id: 'a1_bus_stop_scan',
    acts: [1],
    title: t('정류장의 스캔빔', 'Scan Beam at the Bus Stop'),
    image: 'v2/events/a1_bus_stop_scan.webp',
    text: t(
      '빈 정류장 지붕 아래 사람 셋이 서로 눈을 피한다. 길 건너 가로등 위, 스캔빔이 천천히 거리를 쓸며 이쪽으로 온다. 열을 센다.\n한 명이 속삭인다. “끝에 서 있던 사람은 이미 명단에 올랐어요.”',
      'Three people avoid each other’s eyes under an empty bus shelter. Across the street a scan beam sweeps toward you from a lamp post. Ten seconds.\nOne whispers. “The one standing at the end is already on the list.”',
    ),
    options: [
      {
        label: t('끝자리에 선다', 'Take the end spot'),
        hint: t('◈ +5 · 추적 +8', '+5 ◈ · +8 Trace'),
        success: {
          text: t(
            '빔이 당신 얼굴에서 한 박자 멈춘다. 세 사람이 숨을 죽인다. 빔이 지나가자 누군가 당신 소매를 한 번 쥐었다 놓는다.',
            'The beam pauses on your face for a beat. The three hold their breath. When it moves on, someone squeezes your sleeve once and lets go.',
          ),
          effects: [
            { kind: 'echoes', amount: 5 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('가운데로 파고든다', 'Wedge into the middle'),
        hint: t('추적 −4 · +20 ₵ · 실패 −4 HP', '−4 Trace · +20 ₵ · fail −4 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '몸을 접어 두 사람 사이로 미끄러진다. 빔이 셋을 하나로 읽고 넘어간다. 옆 사람이 지폐를 쥐여 준다.',
            'You fold yourself between two bodies. The beam reads three as one and moves on. The man beside you presses some bills into your hand.',
          ),
          effects: [
            { kind: 'trace', amount: -4 },
            { kind: 'echoes', amount: 1 },
            { kind: 'credits', amount: 20 },
          ],
        },
        failure: {
          text: t(
            '어깨를 부딪힌 남자가 당신을 밀어낸다. 빔 가장자리에 걸린다. 팔뚝이 따끔하다.',
            'The man you bump shoves you out. You catch the beam’s edge. Your forearm stings.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('빔의 주기를 계산한다', 'Work out the beam’s cycle'),
        hint: t('코덱스 · ◈ +2 · 실패 시 추적 +8', 'Codex · +2 ◈ · fail +8 Trace'),
        check: { stat: 'obs', dc: 7 },
        success: {
          text: t(
            '일정하지 않다. 사람이 많은 쪽에 더 오래 머문다. 점수가 높은 얼굴 쪽으로 기울어 있다.',
            'It isn’t even. It lingers where the crowd is thickest. It leans toward the highest-scored faces.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_citizen_score' },
            { kind: 'trace', amount: -4 },
            { kind: 'echoes', amount: 2 },
          ],
        },
        failure: {
          text: t(
            '숫자를 세다 한 박자를 놓친다. 몸이 빔 한복판에 서 있다.',
            'You lose count by one beat. Your body is standing dead center in the beam.',
          ),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
    ],
    gmHints: ['scan beam', 'bus stop', 'bystanders', 'citizen score'],
  },
]

// ================================================================== ACT 2 — Night Market (Undercity)

export const A2_MORE: EventDef[] = [
  {
    id: 'a2_lantern_ferry',
    acts: [2],
    title: t('등불 나룻배', 'The Lantern Ferry'),
    image: 'v2/events/a2_lantern_ferry.webp',
    text: t(
      '침수된 환승 터널. 천장에서 물이 떨어지고, 건너편 승강장은 등불 하나로만 보인다. 사공이 장대를 짚은 채 말한다.\n“건너편까지 25. 헤엄쳐도 되고. 다들 한 번은 그러더군.”',
      'A flooded transfer tunnel. Water drips from the ceiling; the far platform is only a single lantern. The ferryman leans on his pole.\n“Twenty-five to the other side. Or swim. Everybody tries once.”',
    ),
    options: [
      {
        label: t('뱃삯을 낸다', 'Pay the fare'),
        hint: t('−25 ₵ · HP +10', '−25 ₵ · +10 HP'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '배는 놀랄 만큼 조용하다. 반쯤 건너왔을 때 사공이 등불 심지를 낮춘다. “여기서부터는 눈 좀 붙여.” 정말로 잠깐 잔다.',
            'The boat is startlingly quiet. Halfway across, the ferryman lowers the wick. “Rest your eyes from here.” You actually sleep.',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'hp', amount: 10 },
          ],
        },
      },
      {
        label: t('장대를 빼앗아 직접 젓는다', 'Take the pole and punt yourself'),
        hint: t('+30 ₵ · 실패 시 −5 HP', '+30 ₵ · fail −5 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t(
            '사공이 어이없다는 듯 웃고는 노를 놓는다. 반대편에서 짐을 지던 이가 삯의 절반을 돌려준다. 솜씨 값이란다.',
            'The ferryman laughs in disbelief and lets go. On the far side, a porter hands back half the fare as a skill bonus.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'echoes', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '장대가 바닥에 박혀 빠지지 않는다. 배가 돌면서 당신만 물에 빠진다. 물이 얼음 같다.',
            'The pole jams in the bottom. The boat spins and only you go in. The water is ice.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('반대편 사정을 캐묻는다', 'Press him about the far shore'),
        hint: t('코덱스 · ◈ +2 · +10 ₵ · 실패 추적 +4', 'Codex · +2 ◈ · +10 ₵ · fail +4 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '“건너편에 피난처가 있다는 소문? 반은 맞아. 문이 열리는 건 한 사람씩이고, 닫히는 건 한꺼번에야.”',
            '“A refuge on the far side? Half true. The door opens one at a time, and shuts all at once.”',
          ),
          effects: [
            { kind: 'codex', id: 'lore_refuge' },
            { kind: 'echoes', amount: 2 },
            { kind: 'credits', amount: 10 },
          ],
        },
        failure: {
          text: t(
            '사공의 표정이 굳는다. “누가 보냈나.” 그의 등불이 당신 얼굴을 오래 비춘다.',
            'His face closes. “Who sent you?” His lantern lingers on your face.',
          ),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
    ],
    gmHints: ['ferry', 'flooded tunnel', 'lantern', 'crossing'],
  },
  {
    id: 'a2_face_stall',
    acts: [2],
    title: t('얼굴 가게', 'The Face Stall'),
    image: 'v2/events/a2_face_stall.webp',
    text: t(
      '천막 아래 마네킹 머리마다 얼굴 가면이 씌워져 있다. 한 번이라도 누군가의 얼굴이었던 것들. 가게 주인이 이를 드러내며 웃는다.\n“ARK의 눈을 속이는 데는 남의 얼굴이 제일이지. 값은 정직하게.”',
      'Under a canvas, every mannequin head wears a face mask — each once somebody’s face. The shopkeeper grins.\n“Nothing fools ARK’s eyes like someone else’s face. Honest prices.”',
    ),
    options: [
      {
        label: t('얼굴 하나를 산다', 'Buy a face'),
        hint: t('−35 ₵ · 추적 −15 · ◈ +2', '−35 ₵ · −15 Trace · +2 ◈'),
        requires: { minCredits: 35 },
        success: {
          text: t(
            '가면이 피부에 달라붙는다. 거울 속 얼굴은 낯설고 평범하다. 이름이 없어도 되는 얼굴이다.',
            'The mask clings to your skin. The mirror shows a plain stranger — a face that needs no name.',
          ),
          effects: [
            { kind: 'credits', amount: -35 },
            { kind: 'trace', amount: -15 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
      {
        label: t('가면의 접합 패턴을 베낀다', 'Copy the mask’s seam pattern'),
        hint: t('임플란트 · 실패 시 추적 +10', 'Implant · fail +10 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '이음새마다 미세 회로가 숨어 있다. 도안을 외워 두자 주인이 눈치채고 인상을 쓴다. 이미 늦었다.',
            'Micro-circuits hide in every seam. You memorize the layout; the shopkeeper notices and scowls. Too late.',
          ),
          effects: [{ kind: 'implant', rarity: 'common' }],
        },
        failure: {
          text: t(
            '주인이 손목을 꺾어 쥔다. “구경은 공짜가 아냐.” 소란이 번지고 시장의 눈이 이쪽을 본다.',
            'The shopkeeper twists your wrist. “Browsing isn’t free.” The commotion spreads; the market’s eyes turn.',
          ),
          effects: [
            { kind: 'trace', amount: 10 },
            { kind: 'hp', amount: -3 },
          ],
        },
      },
      {
        label: t('죽은 이의 얼굴을 쓴다', 'Wear a dead man’s face'),
        hint: t('추적 −8 · 최대 HP −2', '−8 Trace · −2 max HP'),
        success: {
          text: t(
            '“공짜다. 임자가 안 찾아가서.” 가면에서 희미하게 소독약 냄새가 난다. 숨 쉴 때마다 누군가의 호흡을 빌려 쓰는 기분이다.',
            '“Free. Its owner never came back for it.” The mask smells faintly of antiseptic. Every breath feels borrowed.',
          ),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'maxHp', amount: -2 },
          ],
        },
      },
    ],
    gmHints: ['face masks', 'identity', 'night market stall', 'anonymity'],
  },
  {
    id: 'a2_toll_bridge_kids',
    acts: [2],
    title: t('다리 위의 꼬마 징수원', 'The Toll Kids'),
    image: 'v2/events/a2_toll_bridge_kids.webp',
    text: t(
      '고가 보행로 한가운데, 아이 넷이 뺏은 진압봉으로 길을 막았다. 제일 작은 아이가 장부를 든다.\n“통행료 12크레딧! 안 내면… 안 내면 우리 형이 와요.” 뒤에서 누가 킬킬거린다. 형은 없다.',
      'In the middle of an overpass walkway, four kids block the path with a stolen riot baton. The smallest holds a ledger.\n“Toll, twelve credits! Or… or my big brother comes.” Someone behind her snickers. There is no brother.',
    ),
    options: [
      {
        label: t('통행료를 낸다', 'Pay the toll'),
        hint: t('−10 ₵ · 추적 −6 · ◈ +1', '−10 ₵ · −6 Trace · +1 ◈'),
        requires: { minCredits: 10 },
        success: {
          text: t(
            '장부에 줄이 하나 그어진다. 제일 큰 아이가 귓속말한다. “아래 노점 순찰은 오늘 둘이야. 오른쪽으로 가.”',
            'A tally mark goes in the ledger. The oldest kid whispers, “Two patrols on the stalls below today. Go right.”',
          ),
          effects: [
            { kind: 'credits', amount: -10 },
            { kind: 'trace', amount: -6 },
            { kind: 'echoes', amount: 1 },
          ],
        },
      },
      {
        label: t('허세로 밀어붙인다', 'Bluff your way through'),
        hint: t('◈ +2 · +10 ₵ · 실패 −4 HP', '+2 ◈ · +10 ₵ · fail −4 HP'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '“형한테 전해라, 내가 왔다고.” 아이들이 서로를 본다. 봉이 내려가고 길이 열린다. 제일 작은 아이가 엄지를 든다.',
            '“Tell your big brother I said hi.” The kids look at one another. The baton drops and the path opens. The smallest gives a thumbs-up.',
          ),
          effects: [
            { kind: 'echoes', amount: 2 },
            { kind: 'credits', amount: 10 },
          ],
        },
        failure: {
          text: t(
            '허세가 안 먹힌다. 봉이 정강이를 후려친다. 생각보다 세다. 아이들이 도망치며 깔깔거린다.',
            'The bluff fails. The baton cracks your shin — harder than expected. The kids scatter laughing.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
      {
        label: t('봉을 빼앗아 압수한다', 'Confiscate the baton'),
        hint: t('소모품 · +10 ₵ · 추적 +7', 'Consumable · +10 ₵ · +7 Trace'),
        success: {
          text: t(
            '아이들은 순순히 물러서지만, 눈빛이 식는다. 봉의 손잡이 안에 진압용 스턴 셀이 남아 있다.',
            'The kids back off without a fight, but their eyes go cold. A stun cell is still wedged in the baton’s grip.',
          ),
          effects: [
            { kind: 'consumable' },
            { kind: 'credits', amount: 10 },
            { kind: 'trace', amount: 7 },
          ],
        },
      },
    ],
    gmHints: ['overpass', 'street kids', 'toll', 'riot baton'],
  },
  {
    id: 'a2_stalled_maglev',
    acts: [2],
    title: t('멈춰 선 자기부상 열차', 'The Stalled Maglev'),
    image: 'v2/events/a2_stalled_maglev.webp',
    text: t(
      '선로 위에 열차가 한 량 멈춰 있다. 문이 반쯤 열렸고 승객들은 손잡이를 쥔 채 굳어 있다. 대기 모드. 눈동자만 아주 느리게 당신을 따라온다.\n안내 방송이 갈라진다. “다음 역은… 다음 역은…”',
      'A single maglev car sits dead on the track, doors half open. The passengers stand frozen, hands on straps — standby mode. Only their eyes track you, very slowly.\nThe announcement cracks. “The next station is… the next station is…”',
    ),
    options: [
      {
        label: t('객차를 뒤진다', 'Search the car'),
        hint: t('+30 ₵ · 실패 시 −6 HP', '+30 ₵ · fail −6 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '굳은 승객들 사이를 미끄러져 지나간다. 가방에서 지폐 몇 장과 충전식 배터리가 나온다. 아무도 눈을 깜빡이지 않는다.',
            'You slip between frozen passengers. Their bags yield bills and a spare cell. Nobody blinks.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'consumable' },
          ],
        },
        failure: {
          text: t(
            '승객 하나가 갑자기 손잡이를 놓는다. 강제 재기동. 팔꿈치가 명치에 박힌다.',
            'A passenger suddenly lets go of the strap — forced reboot. An elbow slams into your solar plexus.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('승객 한 명을 깨운다', 'Wake a passenger'),
        hint: t('코덱스 · 실패 시 추적 +8', 'Codex · fail +8 Trace'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '목 뒤 포트에 신호를 흘려 넣자 여자의 입술이 움직인다. “매일… 같은 역에서… 내려야 하는데… 내릴 수가…”',
            'You feed a signal into the port at her neck and her lips move. “Every day… the same stop… I need to get off… I can’t…”',
          ),
          effects: [{ kind: 'codex', id: 'lore_echoes' }],
        },
        failure: {
          text: t(
            '신호가 거꾸로 흐른다. 객차 전체가 일제히 당신 쪽으로 고개를 돌린다.',
            'The signal runs backward. Every head in the car turns toward you at once.',
          ),
          effects: [{ kind: 'trace', amount: 8 }],
        },
      },
      {
        label: t('빈 좌석에서 쉰다', 'Rest in an empty seat'),
        hint: t('HP +12 · 추적 +6', '+12 HP · +6 Trace'),
        success: {
          text: t(
            '딱딱한 좌석이 이상하게 편하다. 눈을 감고 안내 방송을 세다 보니 잠깐 졸았다. 깨어나 보니 승객들의 시선이 아까보다 가깝다.',
            'The hard seat is oddly comfortable. Counting announcements with your eyes shut, you doze. When you wake, the stares are closer than before.',
          ),
          effects: [
            { kind: 'hp', amount: 12 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
    ],
    gmHints: ['stalled maglev', 'standby passengers', 'commute loop', 'uncanny calm'],
  },
]

// ================================================================== ACT 3 — ARK Spire

export const A3_MORE: EventDef[] = [
  {
    id: 'a3_glass_atrium',
    acts: [3],
    title: t('유리 온실', 'The Glass Atrium'),
    image: 'v2/events/a3_glass_atrium.webp',
    text: t(
      '첨탑 중간층의 온실. 진짜 흙, 진짜 햇빛 램프. 정원사 로봇이 작은 분재 하나를 끝없이 다듬는다. 가지가 한 번 잘리면 다음 순간 같은 자리에서 다시 자라난다.\n향이 난다. 이 높이에서는 있을 수 없는 향.',
      'A greenhouse on a mid-level of the spire. Real soil, real sun lamps. A gardener bot trims one small bonsai without end. Each branch cut regrows in the same place a moment later.\nThere’s a scent. At this height, there shouldn’t be.',
    ),
    options: [
      {
        label: t('가지 하나를 꺾어 간다', 'Take a cutting'),
        hint: t('최대 HP +4 · 추적 +6', '+4 max HP · +6 Trace'),
        success: {
          text: t(
            '꺾인 자리가 손바닥에서 따뜻하다. 정원사 로봇이 고개를 돌린다. 한 박자 뒤, 다시 분재로 돌아간다.',
            'The cutting is warm in your palm. The gardener bot turns its head. A beat later, it goes back to the bonsai.',
          ),
          effects: [
            { kind: 'maxHp', amount: 4 },
            { kind: 'hp', amount: 4 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('정원사의 제어 루프를 해킹한다', 'Hack the gardener’s loop'),
        hint: t('고급 임플란트 · 실패 시 정크', 'Uncommon implant · fail: junk'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '루프에 빈틈이 하나 있다. 분재가 다시 자라나기 전, 0.3초. 그 틈에 손을 넣자 로봇 가슴판 안에서 모듈이 빠진다.',
            'There’s one gap in the loop: 0.3 seconds before the bonsai regrows. You reach into it and a module slides out of the bot’s chest plate.',
          ),
          effects: [{ kind: 'implant', rarity: 'uncommon' }],
        },
        failure: {
          text: t(
            '정원사가 가지치기 가위를 쥔 채 이쪽으로 돈다. 가위 끝이 소매를 가른다. 기억 하나가 씹혀 나간다.',
            'The gardener swings toward you, shears raised. The tip rips your sleeve. A memory gets chewed away with it.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'junk', cardId: 'corrupted_echo' },
          ],
        },
      },
      {
        label: t('흙 위에 앉아 숨을 고른다', 'Sit in the soil and breathe'),
        hint: t('HP +15 · 추적 +5', '+15 HP · +5 Trace'),
        success: {
          text: t(
            '흙이 젖어 있다. 오랜만에 맨손으로 만지는 진짜 흙. 숨이 깊어지고 심박이 가라앉는다. 천장 스피커가 조용히 당신 체온을 기록한다.',
            'The soil is damp — real soil on bare hands, for the first time in ages. Your breath deepens and your pulse settles. A ceiling speaker quietly logs your body heat.',
          ),
          effects: [
            { kind: 'hp', amount: 15 },
            { kind: 'trace', amount: 5 },
          ],
        },
      },
    ],
    gmHints: ['greenhouse', 'gardener bot', 'real soil', 'regrowing branch'],
  },
  {
    id: 'a3_name_archive',
    acts: [3],
    title: t('이름표 보관소', 'The Name-Tag Archive'),
    image: 'v2/events/a3_name_archive.webp',
    text: t(
      '천장까지 닿는 서가마다 금속 이름표가 줄지어 걸려 있다. 최적화된 사람들의 이름. 누군가 하나하나 닦아 왔는지 광이 난다.\n안내 데스크는 비어 있고, 방문 기록 장부만 펼쳐져 있다. 마지막 줄의 잉크가 아직 마르지 않았다.',
      'Shelves to the ceiling, each hung with rows of metal name tags — the names of the optimized. Someone has polished them one by one; they gleam.\nThe front desk is empty, a visitor’s log open on it. The ink on the last line is still wet.',
    ),
    options: [
      {
        label: t('내 이름을 찾는다', 'Search for your own name'),
        hint: t('코덱스 · 카드 강화 · 실패 시 −5 HP', 'Codex · upgrade · fail −5 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '이름표 하나가 서가 맨 아래, 당신 손이 닿는 높이에 걸려 있다. 새것 같다. 뒷면에 날짜가 새겨져 있다. 아직 오지 않은 날짜.',
            'One tag hangs on the lowest shelf, at exactly your hand’s height. It looks new. A date is stamped on the back — a date that hasn’t come yet.',
          ),
          effects: [
            { kind: 'codex', id: 'lore_previous_self' },
            { kind: 'echoes', amount: 3 },
            { kind: 'upgrade_card', count: 1, random: true },
          ],
        },
        failure: {
          text: t(
            '수천 개의 이름이 한꺼번에 눈에 들어온다. 읽을수록 이름이 뒤섞이고 두통이 번진다.',
            'Thousands of names flood in at once. The more you read, the more they blur — and the headache spreads.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 2 },
          ],
        },
      },
      {
        label: t('낯선 이름표 하나를 챙긴다', 'Pocket a stranger’s tag'),
        hint: t('매력 +1 · ◈ +1 · 추적 +6', '+1 CHA · +1 ◈ · +6 Trace'),
        success: {
          text: t(
            '이름표가 주머니에서 달그락거린다. 이 이름을 가진 사람이 어떻게 말했을지 상상하면, 말투가 조금 바뀐다.',
            'The tag clinks in your pocket. Imagining how its owner spoke, your own voice shifts a little.',
          ),
          effects: [
            { kind: 'stat', stat: 'cha', amount: 1 },
            { kind: 'echoes', amount: 1 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('서가 한 줄을 불태운다', 'Burn a whole shelf'),
        hint: t('◈ +6 · 추적 +12', '+6 ◈ · +12 Trace'),
        success: {
          text: t(
            '금속은 타지 않는다. 대신 이름표들이 열을 받아 하나씩 울린다. 종소리 같다. 경보가 울릴 때까지 오래 걸리지 않는다.',
            'Metal doesn’t burn. The tags heat up and ring one by one, like bells. It won’t be long before the alarms answer.',
          ),
          effects: [
            { kind: 'echoes', amount: 6 },
            { kind: 'trace', amount: 12 },
          ],
        },
      },
    ],
    gmHints: ['name tags', 'archive', 'optimized people', 'wet ink'],
  },
  {
    id: 'a3_maintenance_priest',
    acts: [3],
    title: t('점검 사제', 'The Maintenance Priest'),
    image: 'v2/events/a3_maintenance_priest.webp',
    text: t(
      '점검 해치 앞에 작업복 차림의 남자가 무릎을 꿇고 있다. 이마를 바닥에 대고 낮게 중얼거린다. “첨탑이시여, 오늘도 꺼지지 마시고…” 허리에 출입 카드가 흔들린다.\n그가 고개를 든다. “기도는 공짜요. 통과도 공짜일 수 있고.”',
      'A man in coveralls kneels before a service hatch, forehead to the floor, muttering. “Spire, do not go out today…” An access card swings at his belt.\nHe looks up. “Prayer is free. Passage might be too.”',
    ),
    options: [
      {
        label: t('함께 무릎을 꿇는다', 'Kneel beside him'),
        hint: t('추적 −12 · ◈ +2 · 실패 −5 HP', '−12 Trace · +2 ◈ · fail −5 HP'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t(
            '남자가 당신 어깨를 짚고 해치를 열어 준다. “믿는 사람은 센서가 못 읽어요. 믿을 때만.” 그 말이 이상하게 들어맞는다.',
            'He grips your shoulder and opens the hatch. “Sensors can’t read believers. Only while you believe.” Strangely, it holds.',
          ),
          effects: [
            { kind: 'trace', amount: -12 },
            { kind: 'echoes', amount: 2 },
          ],
        },
        failure: {
          text: t(
            '진심이 아닌 걸 그가 알아본다. 해치 뚜껑이 손등을 내려친다. “거짓말하는 사람은 들이지 않아요.”',
            'He senses the insincerity. The hatch lid slams down on your hand. “I don’t let liars in.”',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: 4 },
          ],
        },
      },
      {
        label: t('출입 카드를 슬쩍한다', 'Lift his access card'),
        hint: t('고급 임플란트 · 실패 시 −8 HP', 'Uncommon implant · fail −8 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t(
            '기도가 이어지는 동안 카드가 손으로 옮겨 온다. 카드 뒷면에 정비용 모듈이 붙어 있다. 사제는 끝까지 눈을 뜨지 않는다.',
            'The card changes hands while the prayer goes on. A maintenance module is clipped to its back. The priest never opens his eyes.',
          ),
          effects: [
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'trace', amount: 5 },
          ],
        },
        failure: {
          text: t(
            '손이 닿기 전에 그가 팔꿈치로 당신 갈비뼈를 친다. “역시.” 숨이 막힌다.',
            'Before you touch it he drives an elbow into your ribs. “Thought so.” You can’t breathe.',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('무엇을 비는지 묻는다', 'Ask what he prays for'),
        hint: t('코덱스 · 추적 +3', 'Codex · +3 Trace'),
        success: {
          text: t(
            '“첨탑이 꺼지면 위에 사는 사람들이 내려와요. 그게 무서워서요.” 그가 웃는다. “무서운 건 위에 사는 쪽인데.”',
            '“If the spire goes out, the people who live above come down. That scares me.” He smiles. “Though it’s the ones above who should be scared.”',
          ),
          effects: [
            { kind: 'codex', id: 'lore_spire' },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['maintenance priest', 'service hatch', 'faith in the spire', 'access card'],
  },
  {
    id: 'a3_window_cleaner',
    acts: [3],
    title: t('창문 청소부', 'The Window Cleaner'),
    image: 'v2/events/a3_window_cleaner.webp',
    text: t(
      '유리 벽 너머, 곤돌라에 매달린 청소부가 창을 두드린다. 구름 아래로 도시의 불빛이 번진다. 입이 “열어 줘”를 말한다. 소리는 유리에 막혀 안 들린다.\n곤돌라 바닥에는 공구함 하나가 매달려 있다.',
      'Beyond the glass wall a cleaner dangles from a gondola, tapping the window. City lights smear beneath the clouds. His lips form “let me in.” The glass swallows the sound.\nA toolbox hangs from the gondola floor.',
    ),
    options: [
      {
        label: t('창을 열어 들인다', 'Open the window'),
        hint: t('◈ +3 · 소모품 · 추적 +6', '+3 ◈ · consumable · +6 Trace'),
        success: {
          text: t(
            '바람이 한꺼번에 밀려든다. 청소부가 숨을 몰아쉬며 공구함을 건넨다. “사흘째 매달려 있었어. 위에서 아무도 안 열어 주더라.”',
            'Wind roars in. The cleaner gasps and hands over the toolbox. “Three days hanging there. Nobody upstairs would open up.”',
          ),
          effects: [
            { kind: 'echoes', amount: 3 },
            { kind: 'consumable' },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('곤돌라를 타고 층을 건너뛴다', 'Ride the gondola past floors'),
        hint: t('추적 −10 · 실패 시 −10 HP', '−10 Trace · fail −10 HP'),
        check: { stat: 'agi', dc: 7 },
        success: {
          text: t(
            '창틀을 넘어 곤돌라로 뛰어내린다. 케이블이 울고 발밑에 바람뿐이다. 세 층을 건너뛰고 비상구 앞에 내린다.',
            'You vault the frame onto the gondola. The cable whines; only wind beneath your feet. You skip three floors and land at a fire exit.',
          ),
          effects: [{ kind: 'trace', amount: -10 }],
        },
        failure: {
          text: t(
            '곤돌라가 크게 흔들려 난간에 옆구리를 찧는다. 청소부가 욕설을 퍼붓는다. 경비 센서가 흔들림을 잡는다.',
            'The gondola lurches and your ribs hit the rail. The cleaner swears. Security sensors catch the sway.',
          ),
          effects: [
            { kind: 'hp', amount: -10 },
            { kind: 'trace', amount: 6 },
          ],
        },
      },
      {
        label: t('못 본 척 돌아선다', 'Pretend not to see'),
        hint: t('추적 −4 · 최대 HP −2', '−4 Trace · −2 max HP'),
        success: {
          text: t(
            '등 뒤에서 유리를 두드리는 소리가 한참 이어진다. 복도 끝에 닿을 때쯤 소리가 멎는다. 어느 쪽인지는 돌아보지 않는다.',
            'The tapping on the glass follows you for a long while. By the end of the corridor it stops. You don’t look back to see which way.',
          ),
          effects: [
            { kind: 'trace', amount: -4 },
            { kind: 'maxHp', amount: -2 },
          ],
        },
      },
    ],
    gmHints: ['window cleaner', 'gondola', 'glass wall', 'mercy or ignoring'],
  },
]

// ================================================================== Su-ah arc — the voice in the drawer
//
// The Memory Forge (a2_memory_forge) shows Su-ah's workbench drawer with her mother's voice she "has not been
// able to forge yet". This three-part arc finishes that thread. All three only roll while Su-ah is in the party
// (event-level `requires`); the later parts are gated by the flags the earlier ones set:
//   suah_voice (a2 first pour) → a3 voice archive reads it → suah_voice_heard → a3 last pour.
// Flags are read as option/event requirements only; nothing outside this arc depends on them.

export const SUAH_ARC: EventDef[] = [
  {
    id: 'a2_suah_first_pour',
    acts: [2],
    title: t('식은 거푸집', 'The Cold Mould'),
    image: 'v2/events/a2_suah_first_pour.webp',
    speaker: 'su_ah',
    requires: { companion: 'su_ah' },
    text: t(
      '잔향 구역 뒷골목. 수아가 작은 거푸집에 쇳물을 붓는다. 쇳물은 목소리의 모양으로 굳다가 번번이 금이 간다. 세 번째 균열에서 그녀가 망치를 내려놓는다.\n“재료가 모자라. 이 목소리는 쇠로는 안 돼. 누군가의 기억이 한 줌 섞여야 해.”\n서랍이 열려 있다.',
      'A back alley of the refuge. Su-ah pours molten slag into a small mould. It sets in the shape of a voice and cracks every time. At the third crack she puts the hammer down.\n“Not enough material. This voice won’t take iron alone. It needs a handful of someone’s memory.”\nThe drawer is open.',
    ),
    options: [
      {
        label: t('내 기억을 한 줌 보탠다', 'Add a handful of your memory'),
        hint: t('카드 제거 · 유대 +1', 'Remove a card · bond +1'),
        success: {
          text: t(
            '쇳물이 한 번 밝아진다. 균열이 아물고, 거푸집 속에서 희미한 숨소리가 난다. 수아는 눈을 맞추지 않고 작게 말한다. “고마워.”',
            'The melt brightens once. The crack closes and a faint breath sounds inside the mould. Su-ah avoids your eyes. “Thanks,” she says quietly.',
          ),
          effects: [
            { kind: 'remove_card', count: 1 },
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'flag', key: 'suah_voice' },
          ],
        },
      },
      {
        label: t('재료값을 댄다', 'Pay for the material'),
        hint: t('−45 ₵ · ◈ +2', '−45 ₵ · +2 ◈'),
        requires: { minCredits: 45 },
        success: {
          text: t(
            '수아가 시장에서 순도 높은 잔향 찌꺼기를 사 온다. 거푸집이 완전히 식기까지 둘은 말없이 기다린다. 이번에는 금이 가지 않았다.',
            'Su-ah buys high-purity echo slag from the market. You wait, silent, until the mould is fully cold. This time it doesn’t crack.',
          ),
          effects: [
            { kind: 'credits', amount: -45 },
            { kind: 'echoes', amount: 2 },
            { kind: 'flag', key: 'suah_voice' },
          ],
        },
      },
      {
        label: t('그만두자고 말한다', 'Tell her to stop'),
        hint: t('무작위 강화 · 실패 시 −4 HP', 'Random upgrade · fail −4 HP'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '“이건 네가 벼리는 게 아니야. 네가 듣는 거야.” 수아가 한참 거푸집을 내려다보다 끄덕인다. 대신 장갑판 한 장을 당신 쪽으로 밀어 준다.',
            '“You’re not forging this. You’re listening to it.” Su-ah stares at the mould for a long time, then nods. She slides a plate of armour toward you instead.',
          ),
          effects: [{ kind: 'upgrade_card', count: 1, random: true }],
        },
        failure: {
          text: t(
            '수아의 눈이 차갑게 식는다. “네가 뭘 알아.” 망치 자루가 당신 팔뚝을 후려친다. 사과는 없다.',
            'Su-ah’s eyes go cold. “What would you know?” The hammer haft cracks across your forearm. No apology.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['su_ah', 'mother’s voice', 'forge mould', 'echo slag'],
  },
  {
    id: 'a3_suah_voice_archive',
    acts: [3],
    title: t('음성 보관소', 'The Voice Archive'),
    image: 'v2/events/a3_suah_voice_archive.webp',
    speaker: 'su_ah',
    requires: { companion: 'su_ah' },
    text: t(
      '첨탑 지하 서버실. 최적화된 사람들의 마지막 음성이 스피커 수천 개에 걸려 속삭인다. 수아가 한 스피커 앞에서 멈춘다. 숨이 멎은 사람처럼.\n“…엄마 목소리야.”\n스피커는 같은 문장을 되풀이한다. “오늘은 일찍 들어와.”',
      'A server hall beneath the spire. The last recorded voices of the optimized whisper from thousands of speakers. Su-ah stops at one, like someone who has forgotten to breathe.\n“…That’s my mother’s voice.”\nThe speaker repeats one sentence. “Come home early today.”',
    ),
    options: [
      {
        label: t('수아 곁에서 끝까지 듣는다', 'Stay and listen with Su-ah'),
        hint: t('유대 +1 · HP +10', 'Bond +1 · +10 HP'),
        requires: { flag: 'suah_voice' },
        success: {
          text: t(
            '수아가 거푸집 속 목소리와 스피커의 목소리를 나란히 듣는다. 같은 억양, 같은 끝맺음. 어깨의 힘이 서서히 빠진다. 둘 다 오래 서 있는다.',
            'Su-ah listens to the voice in her mould and the voice in the speaker side by side. Same lilt, same ending. Her shoulders slowly let go. Neither of you moves for a while.',
          ),
          effects: [
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'hp', amount: 10 },
            { kind: 'flag', key: 'suah_voice_heard' },
          ],
        },
      },
      {
        label: t('음성을 복사해 수아에게 준다', 'Copy the recording for Su-ah'),
        hint: t('코덱스 · 유대 +1 · 실패 시 정크', 'Codex · bond +1 · fail: junk'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '서버 한 칸을 열어 파일 하나를 복사한다. 수아에게 건네자 그녀는 손바닥만 한 칩을 오래 쥐고 있다. “지우지 않았네, 다들.”',
            'You open one server rack and copy a single file. Su-ah holds the palm-sized chip for a long time. “They never deleted her. Any of them.”',
          ),
          effects: [
            { kind: 'codex', id: 'lore_su_ah' },
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'flag', key: 'suah_voice_heard' },
          ],
        },
        failure: {
          text: t(
            '복사 도중 서버가 비명을 지른다. 수천 개의 음성이 한꺼번에 이쪽으로 쏟아진다. 머릿속이 웅웅거린다.',
            'Mid-copy the rack screams. Thousands of voices pour at you at once. Your head hums.',
          ),
          effects: [
            { kind: 'junk', cardId: 'static' },
            { kind: 'trace', amount: 8 },
          ],
        },
      },
      {
        label: t('스피커 전원을 뽑는다', 'Pull the speaker’s plug'),
        hint: t('추적 −8 · ◈ +1', '−8 Trace · +1 ◈'),
        success: {
          text: t(
            '목소리가 끊긴다. 수아의 입술이 말을 하려다 닫힌다. 그녀는 아무 말도 하지 않고 앞서 걷는다. 한참 뒤에야 “…그래, 지금은 그게 맞아.”',
            'The voice cuts out. Su-ah’s lips start to speak and close. She walks ahead without a word. Much later: “…Yes. For now, that’s right.”',
          ),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 1 },
          ],
        },
      },
    ],
    gmHints: ['su_ah', 'voice archive', 'mother’s voice', 'server hall'],
  },
  {
    id: 'a3_suah_last_pour',
    acts: [3],
    title: t('마지막 쇳물', 'The Last Pour'),
    image: 'v2/events/a3_suah_last_pour.webp',
    speaker: 'su_ah',
    requires: { companion: 'su_ah', flag: 'suah_voice_heard' },
    text: t(
      '비상 계단참. 수아가 휴대용 화로에 불을 붙인다. 손에는 손바닥만 한 칩. 그녀가 숨을 한 번 고르고 칩을 쇳물에 담근다.\n“엄마 목소리는 벼리지 않을 거야. 대신 이 목소리로 벼릴 거야. 네 거야, 뭐가 필요해?”',
      'An emergency stairwell landing. Su-ah lights a portable furnace. A palm-sized chip in her hand. She takes one breath and lowers it into the melt.\n“I won’t forge her voice. I’ll forge with it. It’s for you — what do you need?”',
    ),
    options: [
      {
        label: t('방어를 벼린다', 'Forge defence'),
        hint: t('최대 HP +5 · HP +5', '+5 max HP · +5 HP'),
        success: {
          text: t(
            '망치질 소리가 계단통을 울린다. 한 번, 또 한 번. 장갑판이 식으며 낮은 숨소리를 낸다. 입으면 이상하게 따뜻하다.',
            'The hammering rings through the stairwell. Once, again. The plate cools with a low breath. Worn, it is strangely warm.',
          ),
          effects: [
            { kind: 'maxHp', amount: 5 },
            { kind: 'hp', amount: 5 },
          ],
        },
      },
      {
        label: t('날을 벼린다', 'Forge an edge'),
        hint: t('카드 2장 강화', 'Upgrade 2 cards'),
        success: {
          text: t(
            '칼날이 쇳물에서 올라오자 희미한 소리가 난다. 노래도 말도 아닌 무엇. 손에 익은 기술이 두 겹 더 날이 선다.',
            'The blade rises out of the melt with a faint sound — not song, not speech. Two of your techniques come out a notch sharper.',
          ),
          effects: [{ kind: 'upgrade_card', count: 2 }],
        },
      },
      {
        label: t('그냥 곁에 있어 달라고 한다', 'Ask her to simply stay'),
        hint: t('유대 +1 · 파티 HP +8', 'Bond +1 · party +8 HP'),
        success: {
          text: t(
            '수아가 망치를 내려놓고 불을 낮춘다. 둘이 계단에 나란히 앉는다. 화로 불빛이 벽에 두 그림자를 겹쳐 놓는다.',
            'Su-ah sets the hammer down and lowers the flame. You sit side by side on the stairs. The furnace light lays two shadows on the wall, overlapping.',
          ),
          effects: [
            { kind: 'bond', id: 'su_ah', amount: 1 },
            { kind: 'heal_party', amount: 8 },
          ],
        },
      },
    ],
    gmHints: ['su_ah', 'last pour', 'portable furnace', 'memory chip'],
  },
  // ------------------------------------------------------------------ Volume Expansion: 9 tactical / stat / DoT events
  {
    id: 'a1_red_clinic',
    acts: [1],
    title: t('무허가 봉합소', 'Back-Alley Stitchery'),
    image: 'v2/events/a1_red_clinic.webp',
    text: t(
      '정전된 상가 지하에서 붉은 십자 네온 하나가 깜빡인다. 낡은 수술대 옆에서 무면허 외과의가 피 묻은 장갑을 벗으며 묻는다.\n“봉합할 건가, 아니면 남는 신경 가속제를 가져갈 건가?”',
      'Beneath a dark arcade, a single red neon cross flickers. Beside a rusted operating table, an unlicensed surgeon peels off bloodstained gloves.\n“Here for stitches, or taking the spare neural accelerant?”',
    ),
    options: [
      {
        label: t('신경 반사 가속 시술을 받는다', 'Take the reflex acceleration graft'),
        hint: t('민첩 +1 · 카드 1장 선택 · 실패 시 HP −4', '+1 AGI · pick a card · fail: −4 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t(
            '차가운 바늘이 목덜미를 스치자 시야가 한 박자 빨라진다. 외과의가 남은 전술 칩 하나를 덤으로 던져 준다.',
            'A cold needle grazes your neck and the world slows a beat. The surgeon tosses you a spare tactical chip.',
          ),
          effects: [
            { kind: 'stat', stat: 'agi', amount: 1 },
            { kind: 'card_choice' },
          ],
        },
        failure: {
          text: t(
            '전류가 과하게 튀며 근육이 경련한다. 급히 단자를 뽑아냈지만 욱신거림이 남는다.',
            'Current spikes too hard and your muscles spasm. You yank the lead out, aching.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('상처를 응급 봉합한다', 'Get emergency stitches'),
        hint: t('HP +8 · 추적 +2', '+8 HP · +2 Trace'),
        success: {
          text: t(
            '거친 봉합사가 살갗을 당기며 지혈제가 스며든다. 통증은 가라앉았지만 진료 기록이 암시장 망에 남았다.',
            'Rough sutures pull tight as coagulant sinks in. The pain fades, though a trace lingers on the clinic net.',
          ),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'trace', amount: 2 },
          ],
        },
      },
      {
        label: t('수술대 밑 의료품을 챙겨 나온다', 'Pocket the surgical supplies'),
        hint: t('소모품 1개 · 크레딧 +15', '+1 consumable · +15 ₵'),
        success: {
          text: t(
            '외과의가 등 돌린 틈에 밀봉된 패치와 현금 뭉치를 챙겨 계단을 빠져나온다.',
            'While the surgeon turns away, you pocket a sealed patch and a roll of bills.',
          ),
          effects: [
            { kind: 'consumable' },
            { kind: 'credits', amount: 15 },
          ],
        },
      },
    ],
    gmHints: ['back-alley clinic', 'neural graft', 'bloodstained gloves'],
  },
  {
    id: 'a1_rust_cistern',
    acts: [1],
    title: t('부식된 폐수 저장조', 'Corroded Cistern'),
    image: 'v2/events/a1_rust_cistern.webp',
    text: t(
      '산업 구역 바닥 아래로 노란 산성 증기가 피어오른다. 반쯤 녹아내린 정비 드론 한 기가 저장조 난간에 걸린 채 고농축 부식제 탄창을 품고 있다.',
      'Yellow acid vapour curls up from beneath the industrial grating. A half-melted maintenance drone hangs on the cistern rail, clutching a canister of concentrated corrosive.',
    ),
    options: [
      {
        label: t('부식제 탄창을 정밀 분해해 회수한다', 'Carefully extract the corrosive canister'),
        hint: t('지능 +1 · 카드 1장 선택 · 실패 시 HP −4', '+1 INT · pick a card · fail: −4 HP'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '압력 밸브를 잠그고 탄창을 깔끔하게 분리한다. 장갑을 녹이는 산성 배합 데이터가 고스란히 담겨 있다.',
            'You seal the valve and detach the canister cleanly, securing its armor-melting formula.',
          ),
          effects: [
            { kind: 'stat', stat: 'int', amount: 1 },
            { kind: 'card_choice' },
          ],
        },
        failure: {
          text: t(
            '밸브가 터지며 산성 물방울이 소매 위로 튄다. 살갗이 타들어 가는 듯 쓰라리다.',
            'The valve hisses open and acid droplets splash your sleeve, searing skin.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('난간째로 힘껏 뜯어낸다', 'Rip the whole assembly loose'),
        hint: t('근력 +1 · 크레딧 +25 · 실패 시 HP −5', '+1 STR · +25 ₵ · fail: −5 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '녹슨 철골이 비명을 지르며 뜯겨 나온다. 드론 동체 안쪽의 고가 부품까지 통째로 건졌다.',
            'Rusted steel shrieks and gives way. You salvage both the canister and the drone core.',
          ),
          effects: [
            { kind: 'stat', stat: 'str', amount: 1 },
            { kind: 'credits', amount: 25 },
          ],
        },
        failure: {
          text: t(
            '발판이 미끄러지며 정강이를 철골에 강하게 부딪힌다.',
            'Your footing slips on the slick grate and your shin slams into the beam.',
          ),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('안전하게 바닥에 떨어진 부품만 줍는다', 'Gather only the safe scrap on the floor'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t(
            '증기가 닿지 않는 가장자리에서 쓸 만한 합금 조각들을 챙긴다.',
            'From the dry edge of the grate, you collect intact alloy plates.',
          ),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
    ],
    gmHints: ['acid cistern', 'melted drone', 'corrosive canister'],
  },
  {
    id: 'a1_blind_spot_relay',
    acts: [1],
    title: t('사각지대 중계기', 'Blind-Spot Relay'),
    image: 'v2/events/a1_blind_spot_relay.webp',
    text: t(
      '고가도로 교각 뒤에 감시 드론들의 주파수를 중계하는 무인 안테나 함이 열려 있다. 표적 조준 로그가 실시간으로 흘러간다.',
      'Behind an overpass pillar sits an open relay box routing sentinel drone frequencies. Live targeting telemetry scrolls across its screen.',
    ),
    options: [
      {
        label: t('조준 알고리즘을 역추적해 흡수한다', 'Reverse-engineer the targeting feed'),
        hint: t('관찰 +1 · 카드 1장 강화 · 실패 시 추적 +5', '+1 OBS · upgrade 1 card · fail: +5 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '드론들이 사각지대를 메우는 방식을 읽었다. 이제 놈들의 빈틈이 손바닥 보듯 선명하다.',
            'You read how the drones cover their blind spots. Their openings now stand out in sharp relief.',
          ),
          effects: [
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'upgrade_card', count: 1, random: true },
          ],
        },
        failure: {
          text: t(
            '보안 핑이 되돌아오며 경보등이 짧게 깜빡인다. 서둘러 자리를 뜬다.',
            'A security ping bounces back and the warning LED flashes. You slip away quickly.',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('더미 신호를 흘려 추적망을 교란한다', 'Inject a dummy signal to scrub Trace'),
        hint: t('추적 −8 · ◈ +2', '−8 Trace · +2 ◈'),
        success: {
          text: t(
            '유령 좌표를 수십 개 복제해 중계기에 흘려보낸다. 당신을 뒤쫓던 감시 시선이 엉뚱한 골목으로 쏠린다.',
            'You flood the relay with phantom coordinates, pulling the grid’s gaze toward an empty alley.',
          ),
          effects: [
            { kind: 'trace', amount: -8 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
    gmHints: ['overpass relay', 'targeting feed', 'blind spot'],
  },
  {
    id: 'a2_crimson_pit',
    acts: [2],
    title: t('하층 철창 투기장', 'The Crimson Cage'),
    image: 'v2/events/a2_crimson_pit.webp',
    text: t(
      '배수 터널 끝 공터에 녹슨 철망이 쳐져 있고 구경꾼들이 크레딧 칩을 흔들며 함성을 지른다. 진행자가 마이크를 내민다.\n“단 한 합! 피를 먼저 보는 쪽이 판돈을 다 가져간다!”',
      'At the end of a drain tunnel, a rusted cage ring roars with spectators waving credit chips. The announcer thrusts out a mic.\n“One exchange! First blood takes the whole pot!”',
    ),
    options: [
      {
        label: t('링에 올라 정면으로 격파한다', 'Step into the cage and strike first'),
        hint: t('크레딧 +45 · 근력 +1 · 실패 시 HP −6', '+45 ₵ · +1 STR · fail: −6 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t(
            '상대가 칼을 뽑기도 전에 어깨를 들이받아 철망에 꽂아 넣는다. 구경꾼들이 환호하며 칩을 던진다.',
            'Before your opponent clears their blade, you slam them into the chain-link. Chips rain into the ring.',
          ),
          effects: [
            { kind: 'credits', amount: 45 },
            { kind: 'stat', stat: 'str', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '톱날 단검이 옆구리를 스치고 지나간다. 판돈은 놓쳤지만 목숨은 건졌다.',
            'A serrated blade grazes your ribs. You lose the pot, but walk out on your own feet.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('승부 조작의 틈을 노려 배당금을 챙긴다', 'Spot the rigged tell and bet smart'),
        hint: t('관찰 +1 · 크레딧 +30 · 실패 시 크레딧 −10', '+1 OBS · +30 ₵ · fail: −10 ₵'),
        requires: { minCredits: 10 },
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '왼쪽 투사의 발목에 채워진 전류 족쇄를 간파했다. 정확히 반대쪽에 걸어 쏠쏠한 배당을 챙긴다.',
            'You spot the shock cuff on the left fighter’s ankle and bet the other way for an easy payout.',
          ),
          effects: [
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'credits', amount: 30 },
          ],
        },
        failure: {
          text: t(
            '진행자가 눈치를 채고 배당판을 뒤집어 버린다. 판돈 일부만 날렸다.',
            'The house catches your eye and flips the odds board. You lose your stake.',
          ),
          effects: [{ kind: 'credits', amount: -10 }],
        },
      },
      {
        label: t('구경꾼들의 전술을 눈여겨본 뒤 자리를 뜬다', 'Study the fighters’ footwork and leave'),
        hint: t('카드 1장 선택', 'Pick a card'),
        success: {
          text: t(
            '철창 안에서 오가는 잔혹한 발놀림과 출혈 연계를 눈에 새기고 조용히 발길을 돌린다.',
            'You commit the cage fighters’ vicious footwork and bleed combos to memory before moving on.',
          ),
          effects: [{ kind: 'card_choice' }],
        },
      },
    ],
    gmHints: ['cage fight', 'blood sport', 'undercity bets'],
  },
  {
    id: 'a2_alchemist_vial',
    acts: [2],
    title: t('연금술사의 시약 가판대', "The Alchemist's Stall"),
    image: 'v2/events/a2_alchemist_vial.webp',
    text: t(
      '야시장 구석, 방독면을 쓴 노인이 형광 녹색 액체가 끓는 유리병들을 늘어놓고 있다.\n“ARK 중장갑도 한 방울이면 종이장처럼 삭아 내리지. 대신 다룰 줄 아는 손이어야 해.”',
      'In a corner of the night market, an old chemist in a respirator lines up flasks of boiling green fluid.\n“One drop turns ARK plate to wet paper. Provided your hands don’t shake.”',
    ),
    options: [
      {
        label: t('고농축 산성 촉매를 직접 배합한다', 'Synthesize a concentrated acid catalyst'),
        hint: t('지능 +1 · 임플란트 1개 · 실패 시 HP −5', '+1 INT · +1 implant · fail: −5 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '정확한 비율로 중화제를 섞어 안정화에 성공한다. 노인이 감탄하며 특제 주입기를 건넨다.',
            'You balance the stabilizer to the drop. Impressed, the chemist hands over a custom injector.',
          ),
          effects: [
            { kind: 'stat', stat: 'int', amount: 1 },
            { kind: 'implant' },
          ],
        },
        failure: {
          text: t(
            '플라스크가 과열되며 매캐한 산성 연기가 뿜어져 나온다. 기침을 하며 물러선다.',
            'The flask overheats in a burst of acrid fumes, forcing you back coughing.',
          ),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('말솜씨로 시제품 탄약을 흥정한다', 'Bargain for prototype corrosive rounds'),
        hint: t('매력 +1 · 카드 1장 선택 · 실패 시 추적 +4', '+1 CHA · pick a card · fail: +4 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '상층 순찰대의 이동 경로 정보를 넘기는 조건으로 부식 전술 데이터와 시약을 받아낸다.',
            'Trading patrol route intel, you walk away with corrosive combat schematics and vials.',
          ),
          effects: [
            { kind: 'stat', stat: 'cha', amount: 1 },
            { kind: 'card_choice' },
          ],
        },
        failure: {
          text: t(
            '노인이 의심스러운 눈초리로 경비 드론 호출기를 만지작거린다. 빈손으로 물러난다.',
            'The chemist eyes you suspiciously and reaches for a guard buzzer. You back off.',
          ),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('표준 소이 수류탄 하나를 챙긴다', 'Take a standard incendiary grenade'),
        hint: t('소이 수류탄 1개', '+1 Incendiary Grenade'),
        success: {
          text: t(
            '가장 안전한 기성품 수류탄 하나를 집어 벨트에 채운다.',
            'You clip a reliable off-the-shelf incendiary grenade to your belt.',
          ),
          effects: [{ kind: 'consumable', id: 'incendiary_grenade' }],
        },
      },
    ],
    gmHints: ['acid chemist', 'green vials', 'armor corrosion'],
  },
  {
    id: 'a2_shadow_broker',
    acts: [2],
    title: t('그림자 사격장', 'Shadow Firing Range'),
    image: 'v2/events/a2_shadow_broker.webp',
    text: t(
      '버려진 지하철 역사 안쪽에서 홀로그램 표적지들이 빠르게 점멸한다. 전직 저격수 브로커가 총열을 닦으며 말한다.\n“움직이는 표적의 급소를 한 발에 꿰뚫어 봐. 합격하면 내 비기를 넘기지.”',
      'Inside an abandoned subway platform, holographic targets flicker at high speed. An ex-sniper broker wipes down a barrel.\n“Put one through the vital point of a moving target. Pass, and my technique is yours.”',
    ),
    options: [
      {
        label: t('호흡을 멈추고 급소를 정밀 저격한다', 'Hold your breath and snipe the vital core'),
        hint: t('관찰 +1 · 카드 1장 강화 · 실패 시 HP −4', '+1 OBS · upgrade 1 card · fail: −4 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '표적이 꺾이는 찰나 방아쇠를 당겨 정중앙을 꿰뚫는다. 브로커가 고개를 끄덕이며 조준 보정 칩을 건넨다.',
            'You fire at the exact inflection point and pierce dead center. The broker nods and hands over a calibration chip.',
          ),
          effects: [
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'upgrade_card', count: 1, random: true },
          ],
        },
        failure: {
          text: t(
            '반동 제어에 실패해 총구 열기가 손등을 스친다.',
            'Recoil kicks harder than expected, scorching the back of your hand.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('도약하며 연속 사격으로 표적을 부순다', 'Vault and shatter the targets on the move'),
        hint: t('민첩 +1 · 카드 1장 선택 · 실패 시 추적 +5', '+1 AGI · pick a card · fail: +5 Trace'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t(
            '엄폐물을 뛰어넘으며 연타로 홀로그램 세 개를 동시에 지운다. 기동 사격의 감각이 손끝에 남는다.',
            'Vaulting cover, you clear three holograms in a single fluid burst.',
          ),
          effects: [
            { kind: 'stat', stat: 'agi', amount: 1 },
            { kind: 'card_choice' },
          ],
        },
        failure: {
          text: t(
            '유탄 소음이 통로를 타고 울려 퍼져 순찰망의 주의를 끈다.',
            'The gunfire echoes down the tunnel, drawing patrol attention.',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('남은 탄약 상자만 수거한다', 'Collect the spare ammo crate'),
        hint: t('크레딧 +25 · 추적 −4', '+25 ₵ · −4 Trace'),
        success: {
          text: t(
            '사격장 구석의 미개봉 탄약과 교란 핀을 챙겨 조용히 플랫폼을 떠난다.',
            'You pack up an unopened ammo case and jammer pins before slipping out.',
          ),
          effects: [
            { kind: 'credits', amount: 25 },
            { kind: 'trace', amount: -4 },
          ],
        },
      },
    ],
    gmHints: ['subway firing range', 'ex-sniper broker', 'vital point'],
  },
  {
    id: 'a3_valkyrie_hangar',
    acts: [3],
    title: t('발키리 주기장', 'Valkyrie Hangar'),
    image: 'v2/events/a3_valkyrie_hangar.webp',
    text: t(
      '첨탑 외벽 격납고에 출격 대기 중인 이클립스 발키리 기체들이 매달려 있다. 위상 회피 모듈의 푸른 코어가 충전 중이다.',
      'Along the outer Spire hangar, Eclipse Valkyrie frames hang on launch rails, their blue phase-evasion cores humming at full charge.',
    ),
    options: [
      {
        label: t('위상 회피 코어를 해킹해 추출한다', 'Hack and extract a phase-evasion core'),
        hint: t('민첩 +1 · 임플란트 1개 · 실패 시 HP −6', '+1 AGI · +1 implant · fail: −6 HP'),
        check: { stat: 'int', dc: 7 },
        success: {
          text: t(
            '안전 잠금을 우회해 따뜻한 위상 코어를 뽑아낸다. 몸이 반 박자 먼저 허공을 미끄러진다.',
            'Bypassing the interlock, you pull a warm phase core free. Your steps immediately feel weightless.',
          ),
          effects: [
            { kind: 'stat', stat: 'agi', amount: 1 },
            { kind: 'implant' },
          ],
        },
        failure: {
          text: t(
            '방전 스파크가 손목을 때리며 격납고 크레인이 덜컹거린다.',
            'An arc discharge lashes your wrist as the hangar crane shudders.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('발키리 무장창에서 전술 데이터를 다운로드한다', 'Download weapon bay tactical data'),
        hint: t('카드 1장 선택 · 카드 1장 강화', 'Pick a card · upgrade 1 card'),
        success: {
          text: t(
            '출격 직전 기체의 급습 기동 로그와 정밀 타격 프로토콜을 덱에 동기화한다.',
            'You sync the Valkyrie dive-assault logs and precision strike protocols into your deck.',
          ),
          effects: [
            { kind: 'card_choice' },
            { kind: 'upgrade_card', count: 1, random: true },
          ],
        },
      },
    ],
    gmHints: ['valkyrie hangar', 'phase core', 'launch rail'],
  },
  {
    id: 'a3_bio_disposal',
    acts: [3],
    title: t('생체 폐기 수로', 'Bio-Disposal Chute'),
    image: 'v2/events/a3_bio_disposal.webp',
    text: t(
      '첨탑 중층의 무균 복도 아래로 불량 생체 부품과 산성 정화액이 흐르는 폐기 수로가 지나간다. 유리 격벽 너머에 미개봉 전술 슈트 보관함이 보인다.',
      'Beneath a sterile mid-Spire corridor runs a chute of rejected bio-parts and acid purge fluid. Beyond the glass sits an unopened tactical suit locker.',
    ),
    options: [
      {
        label: t('격벽을 부수고 보관함을 통째로 끌어낸다', 'Smash the partition and haul the locker out'),
        hint: t('근력 +1 · 최대 HP +6 · 실패 시 HP −6', '+1 STR · +6 max HP · fail: −6 HP'),
        check: { stat: 'str', dc: 7 },
        success: {
          text: t(
            '강화 유리를 단숨에 깨뜨리고 방호 장갑판과 고출력 액추에이터를 장착한다.',
            'You shatter the reinforced glass and fit the heavy hazard plating and actuators.',
          ),
          effects: [
            { kind: 'stat', stat: 'str', amount: 1 },
            { kind: 'maxHp', amount: 6 },
            { kind: 'hp', amount: 6 },
          ],
        },
        failure: {
          text: t(
            '깨진 유리 파편과 산성 김이 팔뚝을 스친다.',
            'Jagged glass and acid mist nick your forearm as you pull back.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
      {
        label: t('정화 밸브를 역류시켜 경비망을 마비시킨다', 'Reverse the purge valve to blind security'),
        hint: t('추적 −10 · 카드 1장 선택', '−10 Trace · pick a card'),
        success: {
          text: t(
            '복도 끝 감시 센서들이 산성 증기에 가려 먹통이 된다. 여유롭게 전술 모듈을 챙겨 지나간다.',
            'Acid steam fogs the corridor sensors blind, letting you claim a tactical module in peace.',
          ),
          effects: [
            { kind: 'trace', amount: -10 },
            { kind: 'card_choice' },
          ],
        },
      },
    ],
    gmHints: ['bio-disposal chute', 'acid steam', 'sterile corridor'],
  },
  {
    id: 'a3_omega_terminal',
    acts: [3],
    title: t('오메가 백업 터미널', 'Omega Backup Terminal'),
    image: 'v2/events/a3_omega_terminal.webp',
    text: t(
      '최상층 직전, 관리자 IX의 무력 집행 서브루틴인 ‘설계자 오메가’의 백업 콘솔이 고요히 맥동하고 있다. 당신이 거쳐 온 모든 전투 기록이 화면에 떠 있다.',
      'Just below the apex, a backup console for Architect Omega — IX’s executive combat subroutine — pulses quietly. Every fight of your run is indexed on its glass.',
    ),
    options: [
      {
        label: t('오메가의 전술 예측 모델을 역이용한다', 'Turn Omega’s predictive model inside out'),
        hint: t('관찰 +1 · 매력 +1 · 실패 시 정크 1장', '+1 OBS · +1 CHA · fail: +1 junk'),
        check: { stat: 'obs', dc: 7 },
        success: {
          text: t(
            '집행 코어가 당신의 다음 수를 읽는 공식을 역산했다. 이제 치명타를 꽂아 넣을 각도가 선명히 보인다.',
            'You invert the executive core’s prediction matrix. Every critical angle now gleams in plain sight.',
          ),
          effects: [
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'stat', stat: 'cha', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '역산 도중 방어 논리가 신경망에 역류해 추적 버그를 남긴다.',
            'Counter-logic surges back through the link, planting a trace bug in your deck.',
          ),
          effects: [{ kind: 'junk', cardId: 'trace_bug' }],
        },
      },
      {
        label: t('콘솔의 예비 에너지를 파티 전원에 주입한다', 'Channel reserve power into the party'),
        hint: t('파티 HP +10 · ◈ +3', 'Party +10 HP · +3 ◈'),
        success: {
          text: t(
            '백업 커패시터의 순수한 전력을 끌어와 당신과 동료들의 장비를 완충한다.',
            'You drain the backup capacitor into your party’s rigs, restoring everyone for the final ascent.',
          ),
          effects: [
            { kind: 'heal_party', amount: 10 },
            { kind: 'echoes', amount: 3 },
          ],
        },
      },
    ],
    gmHints: ['omega terminal', 'prediction matrix', 'final ascent'],
  },
]
