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
]
