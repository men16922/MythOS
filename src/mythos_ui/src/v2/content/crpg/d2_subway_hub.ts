// Act 2 district — Transfer Station B3 (an abandoned transfer level where refugees live in stopped train cars).
//
// Four points of interest, three actions. Quest q_last_train: stage 1 = Stationmaster Yeom believes car No. 4 can
// still run without a fuel cell (or the train's own console tells you); stage 2 = the train is awake — bring a fuel
// cell to Yeom or plug it in at the depot (cells: Boss Ma's toll sign, bought, bargained, crawled for or earned by
// squeezing a refugee family; or Pyo's flooded track, bought, dived for, vouched for, or paid for in shame), or jump
// the old third rail straight into the train. Cross-act: Pyo came down from Substation 17 — Old Oh's people vouch
// for whoever hid his wiring (q_grid stage 2) and never forget who sold it (flag sold_grid).
// Approval: Tae-o protects the train-car families, Han likes jumping IX-era rails, Kai is tender with the old train,
// Su-ah honours what the stationmaster keeps, Lin Yue likes a good deal and hates overpaying, Se-rin likes nerve.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_SUBWAY_HUB: DistrictDef = {
  id: 'd2_subway_hub',
  act: 2,
  name: t('환승역 지하 3층', 'Transfer Station B3'),
  image: 'v2/districts/d2_subway_hub.webp',
  intro: t(
    '환승 계단을 세 층 더 내려가면 시장 소리가 끊긴다. 승강장에 멈춘 전동차 여섯 량. 창문마다 빨래가 걸려 있고, 객차 안에서 사람들이 밥을 짓는다. 벽시계는 23시 58분에서 멈췄다.\n선로 쪽에서 물 떨어지는 소리. 둘러볼 수 있는 곳은 세 군데쯤.',
    'Three more flights down the transfer stairs and the market noise cuts out. Six train cars stopped at the platform. Laundry hangs in every window; people cook rice inside the carriages. The wall clock stopped at 23:58.\nWater drips somewhere down on the tracks. You have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '계단을 오르는 동안 등 뒤에서 객차 문이 하나씩 닫힌다. 23시 58분은 여전히 23시 58분이다.',
    'As you climb the stairs, the car doors close behind you one by one. It is still 23:58.',
  ),
  pois: [
    { id: 'office', name: t('역무실', 'The Station Office'), blurb: t('제복 입은 노인이 시간표를 고친다.', 'An old man in uniform corrects the timetable.'), dialogue: 'd2sh_yeom' },
    { id: 'toll', name: t('환승 통로 톨게이트', 'The Transfer Toll'), blurb: t('개찰구 셋을 용접해 붙였다.', 'Three ticket gates, welded into one.'), dialogue: 'd2sh_ma' },
    { id: 'flood', name: t('침수된 선로', 'The Flooded Track'), blurb: t('물속에서 연료 셀을 건지는 사람.', 'Someone fishing fuel cells out of the water.'), dialogue: 'd2sh_pyo' },
    { id: 'depot', name: t('차량기지 끝 4호 열차', 'Car No. 4, End of the Depot'), blurb: t('아무도 살지 않는 객차.', 'The one car nobody lives in.'), dialogue: 'd2sh_depot' },
  ],
}

const YEOM: DialogueDef = {
  id: 'd2sh_yeom',
  npc: 'stationmaster_yeom',
  start: 'office',
  nodes: {
    office: {
      speaker: 'stationmaster_yeom',
      text: t(
        '역무실 벽에 운행 시간표가 빼곡하다. 줄마다 붉은 펜으로 오늘 날짜가 고쳐져 있다. 제복 입은 노인이 모자를 바로 쓰고 일어선다. “어서 오십시오. 다음 열차는 23시 58분 출발 예정입니다.”',
        'The station office wall is covered in timetables. On every line, today’s date has been corrected in red pen. An old man in uniform straightens his cap and stands. “Welcome. The next train is scheduled to depart at 23:58.”',
      ),
      options: [
        {
          label: t('“저 시계, 멈췄는데요.”', '“That clock has stopped.”'),
          intent: 'ask',
          success: {
            text: t('노인이 시계를 보지 않는다. “압니다. 시계는 멈췄습니다. 열차는 멈추지 않았습니다.”', 'He doesn’t look at the clock. “I know. The clock has stopped. The train has not.”'),
            effects: [{ kind: 'quest', id: 'q_last_train', stage: 1 }],
            goto: 'train',
          },
        },
        {
          label: t('연료 셀을 책상에 올려놓는다', 'Set the fuel cell on his desk'),
          intent: 'offer',
          requires: { flag: 'b3_fuel_cell' },
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t('노인이 흰 장갑을 낀다. 셀을 두 손으로 든다. 아무 말 없이 역무실을 나간다. 잠시 후, 차량기지 쪽에서 전조등 불빛이 승강장 끝까지 밀려온다.', 'He pulls on white gloves. Lifts the cell in both hands. Leaves the office without a word. A moment later, headlight glare from the depot floods the platform to its far end.'),
            effects: [{ kind: 'quest', id: 'q_last_train', stage: 2 }],
            goto: 'awake',
          },
        },
        {
          label: t('경례하고 나간다', 'Salute and leave'),
          intent: 'leave',
          success: { text: t('노인이 정확한 각도로 경례를 받는다. “안녕히 가십시오. 승강장과 열차 사이가 넓습니다.”', 'He returns the salute at the exact regulation angle. “Safe travels. Mind the gap between the train and the platform.”') },
        },
      ],
    },
    train: {
      speaker: 'stationmaster_yeom',
      text: t(
        '“4호 열차입니다. 폐선 통보는 받았습니다. 저는 서명하지 않았습니다.” 그가 시간표 맨 아랫줄을 짚는다. “연료 셀만 있으면 됩니다. 마 사장 간판에 하나, 침수 선로 밑에 몇 개.”',
        '“Car No. 4. I received the decommission notice. I did not sign it.” He touches the bottom line of the timetable. “All it needs is a fuel cell. There is one in Boss Ma’s sign. A few more under the flooded track.”',
      ),
      options: [
        {
          label: t('“셀 없이, 비상 급전선을 바로 물리면요?”', '“What if we skip the cell and jump the emergency feed?”'),
          intent: 'insight',
          check: { stat: 'int', dc: 16 },
          assist: 'han',
          approval: { han: 2 },
          success: {
            text: t('역무실 바닥 점검구를 연다. 굵은 선 두 가닥, 낡은 차단기 하나. 불꽃이 튀고, 차량기지 쪽에서 쇠가 길게 기지개를 켜는 소리가 난다. 노인이 모자를 벗는다.', 'You open the inspection hatch in the office floor. Two thick cables, one old breaker. Sparks, and from the depot comes the long groan of steel stretching awake. The old man takes off his cap.'),
            effects: [{ kind: 'quest', id: 'q_last_train', stage: 2 }],
            goto: 'awake',
          },
          failure: {
            text: t('차단기가 당신 손 안에서 터진다. 노인이 당신 옷깃을 잡아 끌어낸다. “규정 위반입니다.” 목소리가 떨린다. 화가 나서가 아니다.', 'The breaker blows in your hand. The old man hauls you out by the collar. “That is a violation of regulations.” His voice shakes. Not from anger.'),
            effects: [{ kind: 'hp', amount: -6 }],
          },
        },
        {
          label: t('“셀은 제가 구해 볼게요.”', '“I’ll find you a cell.”'),
          intent: 'offer',
          approval: { tae_o: 1, kai: 1 },
          success: { text: t('노인이 허리를 정확히 구십 도로 숙인다. “승객 여러분의 협조에 감사드립니다.” 당신 말고 승객은 없다.', 'He bows exactly ninety degrees. “We thank all passengers for their cooperation.” There are no passengers but you.') },
        },
        {
          label: t('“역장님, 그 열차는 끝났어요.”', '“Stationmaster, that train is finished.”'),
          intent: 'persuade',
          approval: { kai: -2, su_ah: -1, lin_yue: 1 },
          success: {
            text: t('노인이 한참 서 있다. “…압니다.” 그러고는 붉은 펜 뚜껑을 연다. 내일 날짜를 적는다. “그래도 시간표는 고쳐 둡니다.”', 'He stands still for a long time. “…I know.” Then he uncaps the red pen and writes tomorrow’s date. “I still correct the timetable.”'),
          },
        },
      ],
    },
    awake: {
      speaker: 'stationmaster_yeom',
      text: t(
        '전조등이 승강장을 가른다. 객차 창마다 얼굴이 하나씩 붙는다. 노인이 모자를 벗었다가 다시 쓴다. “4호 열차, 운행 재개합니다. …행선지는 승객께서 정해 주십시오.”',
        'Headlights split the platform. A face presses to every carriage window. The old man takes off his cap and puts it back on. “Car No. 4 resumes service. …Passengers, please name the destination.”',
      ),
      options: [
        {
          label: t('“포식자 둥지로. 전속력으로.”', '“To the Eater’s nest. Full speed.”'),
          intent: 'fight',
          approval: { han: 1, se_rin: 1 },
          success: { text: t('노인이 경적을 길게 두 번 울린다. “전속력, 알겠습니다. 승객께서는 손잡이를 꼭 잡아 주십시오.”', 'He sounds the horn twice, long. “Full speed, understood. Passengers, please hold on to the straps.”') },
        },
        {
          label: t('“그 전에 객차 사람들 짐부터 실어 줘요.”', '“First, load the families’ things on board.”'),
          intent: 'offer',
          approval: { tae_o: 2, su_ah: 1 },
          success: {
            text: t('객차 사람들이 줄을 선다. 냄비, 이불, 아이 하나. 누군가 당신 몫의 밥을 그릇째 건넨다. 열차는 그 무게를 싣고도 떠날 수 있다.', 'The carriage families line up. Pots, blankets, a child. Someone hands you a whole bowl of rice. The train can carry that weight and still go.'),
            effects: [{ kind: 'heal_party', amount: 8 }],
          },
        },
        {
          label: t('“운전은 역장님이 직접 하세요.”', '“You drive it yourself, Stationmaster.”'),
          intent: 'ask',
          approval: { kai: 2, su_ah: 1 },
          success: {
            text: t('노인이 대답하지 않는다. 대신 주머니에서 낡은 승차권 한 장을 꺼내 개찰 펀치로 딸깍 뚫어 준다. “유효합니다. 종점까지.”', 'He doesn’t answer. Instead he takes an old ticket from his pocket and clips it with his punch. “Valid. To the end of the line.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
      ],
    },
  },
}

const MA: DialogueDef = {
  id: 'd2sh_ma',
  npc: 'toll_king',
  start: 'gate',
  nodes: {
    gate: {
      speaker: 'toll_king',
      text: t(
        '환승 통로 한가운데, 개찰구 셋을 용접해 붙인 톨게이트. 위에서 ‘마 사장 환승 센터’ 네온이 지글거린다. 형광 조끼에 금목걸이를 건 남자가 컵라면을 먹다 젓가락으로 당신을 가리킨다. “어서 와! 처음 보는 얼굴이네. 처음 보는 얼굴은 20.”',
        'Mid-corridor, a toll booth made of three ticket gates welded together. Above it a “Boss Ma’s Transfer Centre” neon sizzles. A man in a hi-vis vest and a gold chain, eating cup noodles, points his chopsticks at you. “Welcome! New face. New faces pay twenty.”',
      ),
      options: [
        {
          label: t('20크레딧을 개찰구에 찍는다', 'Tap twenty credits on the gate'),
          intent: 'offer',
          requires: { minCredits: 20 },
          success: {
            text: t('개찰구가 삑 하고 열린다. “고마워! 단골 되겠네.” 그가 국물을 후루룩 마신다.', 'The gate beeps open. “Thanks! You’ll be a regular.” He slurps his broth.'),
            effects: [{ kind: 'credits', amount: -20 }],
            goto: 'inside',
          },
        },
        {
          label: t('진압 대형 수신호로 통로를 가리킨다', 'Signal a riot-line formation down the corridor'),
          intent: 'intimidate',
          requires: { background: 'enforcer' },
          approval: { tae_o: 1, se_rin: -1 },
          success: {
            text: t('마 사장의 젓가락이 멈춘다. 그의 애들이 통로 끝을 돌아본다. 아무도 없다. 그래도 그는 웃으며 개찰구를 연다. “아이고, 높으신 분이 왜 여기까지. 무료, 무료.”', 'Boss Ma’s chopsticks stop. His boys glance down the corridor. Nobody there. He still opens the gate with a grin. “Oh my, what brings an officer all the way down here? Free. Free.”'),
            goto: 'inside',
          },
        },
        {
          label: t('개찰구 밑으로 기어 간다', 'Crawl under the gates'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          assist: 'se_rin',
          approval: { se_rin: 2 },
          success: {
            text: t('개찰구 밑을 기는 동안 손이 간판 전원함에 닿는다. 나사 둘, 원통 하나. 연료 셀을 품에 안고 반대편으로 빠져나온다. 등 뒤에서 네온이 픽 꺼진다. “어? 어어?”', 'Crawling under the gates, your hand finds the sign’s power box. Two screws, one cylinder. You come out the other side with a fuel cell under your arm. Behind you the neon dies with a pop. “Huh? Hey?”'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
          failure: {
            text: t('형광 조끼 하나가 당신 발목을 밟는다. 마 사장이 컵라면을 내려놓는다. “공짜 좋아하는 손님은 몸으로 내야지.”', 'A hi-vis vest steps on your ankle. Boss Ma puts down his noodles. “Customers who like it free pay with the body.”'),
            effects: [{ kind: 'combat', encounterId: 'a2_event_ambush' }],
          },
        },
        {
          label: t('돌아간다', 'Turn back'),
          intent: 'leave',
          success: { text: t('“돈 생기면 또 와!” 그가 빈 컵을 흔든다.', '“Come back when you’re loaded!” He waves the empty cup.') },
        },
      ],
    },
    inside: {
      speaker: 'toll_king',
      text: t(
        '“자, 뭐 찾아? 마 사장한테 없는 건 없어. 값이 있을 뿐이지.” 그가 머리 위 네온을 엄지로 가리킨다. 지글거리는 소리 사이로 원통 하나가 웅웅 돈다.',
        '“So, what are you after? Boss Ma has everything. It just has a price.” He jabs a thumb at the neon overhead. Between the sizzles, a cylinder hums.',
      ),
      options: [
        {
          label: t('“그 간판 불, 연료 셀이죠?”', '“That sign runs on a fuel cell, right?”'),
          intent: 'ask',
          success: { text: t('그가 씩 웃는다. 금니 하나. “눈 좋네.”', 'He grins. One gold tooth. “Good eyes.”'), goto: 'cell' },
        },
        {
          label: t('통로 안쪽 소식을 산다 (15크레딧)', 'Buy word from down the tunnel (15 credits)'),
          intent: 'offer',
          requires: { minCredits: 15 },
          approval: { lin_yue: 1 },
          success: {
            text: t('“포식자 앞 드론들, 꼬리 번호가 다 같아. 한 놈만 찍으면 다 찍혀.” 그가 번호를 냅킨에 적어 준다. 라면 국물이 번진다.', '“The drones in front of the Eater all share one tail number. Tag one, you’ve tagged them all.” He writes the number on a napkin. The noodle broth bleeds into it.'),
            effects: [{ kind: 'credits', amount: -15 }, { kind: 'combat_mod', mod: 'marked' }],
          },
        },
        {
          label: t('지나간다', 'Move along'),
          intent: 'leave',
          success: { text: t('“또 와! 다음엔 단골 요금이야. 똑같이 20이지만.”', '“Come again! Next time it’s the regular’s rate. Same twenty, though.”') },
        },
      ],
    },
    cell: {
      speaker: 'toll_king',
      text: t(
        '“근데 저거 꺼지면 내 장사도 끝이야. 그러니까 50.” 그가 젓가락으로 승강장 쪽을 가리킨다. “아니면 일 하나 해 줘. 3호 객차에 월세 석 달 밀린 집 있어. 받아 와. 그럼 셀 줄게.”',
        '“But if that goes dark, so does my business. So, fifty.” He points his chopsticks at the platform. “Or do me a job. Family in car 3, three months behind on rent. Collect it, and the cell’s yours.”',
      ),
      options: [
        {
          label: t('50크레딧을 낸다', 'Pay fifty credits'),
          intent: 'offer',
          requires: { minCredits: 50 },
          approval: { lin_yue: -1 },
          success: {
            text: t('그가 의자에 올라가 셀을 뽑아 준다. 네온이 꺼진다. “어차피 간판 없어도 다들 내 이름 알아.”', 'He climbs on his chair and pulls the cell for you. The neon goes dark. “Everyone knows my name without the sign anyway.”'),
            effects: [{ kind: 'credits', amount: -50 }, { kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('3호 객차의 월세를 받아 온다', 'Collect the rent from car 3'),
          intent: 'intimidate',
          approval: { tae_o: -3, su_ah: -2, han: -1, lin_yue: 1 },
          success: {
            text: t('3호 객차. 노부부가 배급표 묶음을 내민다. 할머니가 그중 한 장을 다시 빼려다 그만둔다. 마 사장이 배급표를 세고, 셀을 뽑아 당신 손에 쥐여 준다. “거봐, 쉽잖아.”', 'Car 3. An old couple hands over a bundle of ration cards. The woman starts to pull one back out, then stops. Boss Ma counts the cards, pulls the cell and presses it into your hand. “See? Easy.”'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('린위에에게 흥정을 맡긴다', 'Let Lin Yue haggle'),
          intent: 'persuade',
          requires: { companion: 'lin_yue' },
          check: { stat: 'cha', dc: 12 },
          assist: 'lin_yue',
          approval: { lin_yue: 2 },
          success: {
            text: t('린위에가 그의 장부를 거꾸로 읽는다. 지난달 전기값, 이번 달 통행량, 간판이 꺼진 날 수입. 마 사장의 웃음이 조금씩 줄어든다. “…20. 대신 내 얘기 밖에서 하지 마.”', 'Lin Yue reads his ledger upside down. Last month’s power, this month’s traffic, his take on the nights the sign was dark. Boss Ma’s grin shrinks a little at a time. “…Twenty. And not a word about this outside.”'),
            effects: [{ kind: 'credits', amount: -20 }, { kind: 'flag', key: 'b3_fuel_cell' }],
          },
          failure: {
            text: t('“린 사장, 여기서까지 이러기야?” 그가 웃으며 젓가락으로 장부를 덮는다. 흥정은 끝났다. 간판은 계속 지글거린다.', '“Boss Lin, even down here?” Laughing, he closes the ledger with his chopsticks. The haggling is over. The sign keeps sizzling.'),
          },
        },
        {
          label: t('“생각해 볼게.”', '“I’ll think about it.”'),
          intent: 'leave',
          success: { text: t('“생각은 공짜! 오늘만.”', '“Thinking’s free! Today only.”') },
        },
      ],
    },
  },
}

const PYO: DialogueDef = {
  id: 'd2sh_pyo',
  npc: 'scav_pyo',
  start: 'dive',
  nodes: {
    dive: {
      speaker: 'scav_pyo',
      text: t(
        '선로가 무릎까지 물에 잠겨 있다. 반쯤 가라앉은 객차 지붕 위에 여자가 앉아 있다. 왼팔은 의수, 그것도 반쯤. 옆에 물이 뚝뚝 듣는 연료 셀 둘. “구경할 거면 물 튀기지 마요. 살 거면 말하고요.”',
        'The track is knee-deep in water. A woman sits on the roof of a half-sunk carriage. Her left arm is a prosthetic, and only half of one. Beside her, two fuel cells dripping wet. “If you’re looking, don’t splash. If you’re buying, say so.”',
      ),
      options: [
        {
          label: t('“그 셀, 얼마예요?”', '“How much for a cell?”'),
          intent: 'ask',
          requires: { notFlag: 'sold_grid' },
          success: { text: t('그녀가 셀 하나를 무릎에 올려 물기를 닦는다. 눈은 당신에게서 떼지 않는다.', 'She sets one cell on her knee and wipes it down. She never takes her eyes off you.'), goto: 'price' },
        },
        {
          label: t('“변전소 17에서 왔어요. 오 기사님 배선, 제가 숨겼어요.”', '“I came from Substation 17. I’m the one who hid Old Oh’s wiring.”'),
          intent: 'ask',
          requires: { quest: { id: 'q_grid', stage: 2 }, notFlag: 'sold_grid' },
          approval: { tae_o: 1, han: 1 },
          success: {
            text: t('그녀의 손이 멈춘다. “철판 세워 준 그 사람?” 의수로 셀 하나를 들어 당신 쪽으로 밀어 준다. “할아버지가 그랬어요. 그 사람 오면 돈 받지 말라고. 빚지고는 못 산다고.”', 'Her hand stops. “The one who put up the steel plates?” She lifts a cell with the prosthetic and pushes it toward you. “Grandpa said: if that one ever shows up, don’t take their money. Said he can’t live owing people.”'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('“…왜 그렇게 봐요?”', '“…Why are you looking at me like that?”'),
          intent: 'ask',
          requires: { flag: 'sold_grid' },
          success: {
            text: t('“변전소 17. 윤 경사 옆에서 칩 받던 얼굴.” 그녀가 셀 하나를 물속으로 다시 밀어 넣는다.', '“Substation 17. The face taking a chip next to Sergeant Yun.” She pushes one cell back under the water.'),
            goto: 'cold',
          },
        },
        {
          label: t('물을 건너 지나간다', 'Wade on past'),
          intent: 'leave',
          success: { text: t('찰박, 찰박. 등 뒤에서 그녀가 다시 물속으로 팔을 넣는 소리.', 'Splash, splash. Behind you, the sound of her reaching back into the water.') },
        },
      ],
    },
    price: {
      speaker: 'scav_pyo',
      text: t(
        '“45. 물에서 건진 거라 보증은 없어요. 그래도 셀은 셀이에요.” 그녀가 턱으로 가라앉은 객차를 가리킨다. “더 싸게 원하면 직접 들어가든가. 안에 아직 몇 개 있어요.”',
        '“Forty-five. Fished out of the water, so no warranty. Still, a cell’s a cell.” She nods at the sunken carriage. “Want it cheaper, go in yourself. There are a few more inside.”',
      ),
      options: [
        {
          label: t('45크레딧을 낸다', 'Pay forty-five credits'),
          intent: 'offer',
          requires: { minCredits: 45 },
          success: {
            text: t('그녀가 칩을 받아 방수 주머니에 넣는다. 셀이 당신 손에 넘어온다. 차갑고, 생각보다 무겁다.', 'She takes the chip and tucks it into a waterproof pouch. The cell passes to you. Cold, heavier than you expected.'),
            effects: [{ kind: 'credits', amount: -45 }, { kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('가라앉은 객차 안으로 잠수한다', 'Dive into the sunken carriage'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          assist: 'kai',
          approval: { kai: 1, se_rin: 1 },
          success: {
            text: t('검은 물, 좌석 손잡이, 떠다니는 승차권. 손끝에 원통이 걸린다. 물 밖으로 나오자 그녀가 처음으로 웃는다. “건진 사람 거예요.”', 'Black water, seat handles, floating tickets. Your fingers close on a cylinder. When you surface, she smiles for the first time. “Finders keepers.”'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
          failure: {
            text: t('객차 문이 등 뒤에서 닫힌다. 숨이 바닥날 때쯤 의수 하나가 당신 멱살을 끌어올린다. 빈손이다.', 'The carriage door swings shut behind you. Just as your breath runs out, a prosthetic hand drags you up by the collar. Empty-handed.'),
            effects: [{ kind: 'hp', amount: -6 }],
          },
        },
        {
          label: t('의수 접합부부터 봐 준다', 'Look at her prosthetic joint first'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { su_ah: 1, tae_o: 1 },
          success: {
            text: t('접합부가 곪아 있다. 물속에서 일하는 팔은 다 그렇다. 고름을 짜고 소독하고 방수 테이프로 감는다. 그녀가 셀을 당신 무릎에 올려놓는다. “진료비예요. 거스름돈은 없어요.”', 'The joint is infected. Every arm that works underwater gets this way. You drain it, clean it, wrap it in waterproof tape. She sets a cell on your knee. “For the visit. No change.”'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('“다음에요.”', '“Another time.”'),
          intent: 'leave',
          success: { text: t('“다음엔 물이 더 차 있을 거예요.”', '“Next time the water’ll be higher.”') },
        },
      ],
    },
    cold: {
      speaker: 'scav_pyo',
      text: t(
        '“그날 밤 변전소 불 꺼지고, 뒷방 할머니 산소기도 같이 꺼졌어요. 아침까지 아무도 몰랐고요.” 그녀는 목소리를 높이지 않는다. “칩은 얼마였어요?”',
        '“That night the substation went dark, and the oxygen machine in the back room went with it. Nobody noticed till morning.” She doesn’t raise her voice. “How much was the chip?”',
      ),
      options: [
        {
          label: t('50크레딧을 전부 내민다', 'Hold out fifty credits, all of it'),
          intent: 'offer',
          requires: { minCredits: 50 },
          approval: { tae_o: 1 },
          success: {
            text: t('그녀가 칩을 받는다. 당신 얼굴은 보지 않는다. 셀 하나가 물 위로 밀려온다. “돈은 받아요. 얼굴은 안 받고.”', 'She takes the chip without looking at your face. A cell drifts toward you across the water. “I’ll take the money. Not the face.”'),
            effects: [{ kind: 'credits', amount: -50 }, { kind: 'flag', key: 'b3_fuel_cell' }],
          },
        },
        {
          label: t('“그때 안 팔았으면 다 같이 잡혀갔어요.”', '“If I hadn’t sold it, they’d have taken everyone.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 15 },
          approval: { tae_o: -1, han: -1 },
          success: {
            text: t('그녀는 대답하지 않는다. 셀 하나를 물 위로 밀어 준다. 용서가 아니다. 빨리 꺼지라는 뜻이다.', 'She doesn’t answer. She pushes a cell across the water. It isn’t forgiveness. It means get out, fast.'),
            effects: [{ kind: 'flag', key: 'b3_fuel_cell' }],
          },
          failure: {
            text: t('젖은 의수가 당신 뺨을 친다. 쇳소리가 터널 끝까지 울린다. 그녀는 다시 물속으로 팔을 넣는다.', 'The wet prosthetic slaps your cheek. The clang rings to the end of the tunnel. She reaches back into the water.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('“미안해요.”', '“I’m sorry.”'),
          intent: 'ask',
          approval: { tae_o: 1, su_ah: 1 },
          success: { text: t('“그 말은 할머니한테 해요. 이제 못 듣지만.” 그녀가 등을 돌린다. 물소리만 남는다.', '“Tell that to her. She can’t hear it now.” She turns her back. Only the sound of water is left.') },
        },
      ],
    },
  },
}

const DEPOT: DialogueDef = {
  id: 'd2sh_depot',
  start: 'car',
  nodes: {
    car: {
      text: t(
        '차량기지 맨 끝, 4호 열차. 아무도 이 객차에는 살지 않는다. 먼지 앉은 운전석 유리에 손가락 글씨: ‘역장님 기다려요.’ 배터리 칸은 비어 있다. 바닥에 동전 요금함이 굴러다닌다.',
        'At the far end of the depot: car No. 4. Nobody lives in this one. Finger-written in the dust on the cab window: “Waiting for you, Stationmaster.” The battery bay is empty. An old coin fare box rolls on the floor.',
      ),
      options: [
        {
          label: t('연료 셀을 배터리 칸에 꽂는다', 'Slot the fuel cell into the battery bay'),
          intent: 'offer',
          requires: { flag: 'b3_fuel_cell' },
          approval: { kai: 1, tae_o: 1 },
          success: {
            text: t('딸깍. 계기판에 녹색 불이 차례로 들어온다. 전조등이 승강장을 가른다. 멀리서 호루라기 소리, 그리고 뛰어오는 구두 소리. 제복 입은 노인이 숨을 몰아쉬며 운전석 문을 잡는다.', 'Click. Green lights come on along the dash one by one. The headlights split the platform. Far off, a whistle, then running shoes. An old man in uniform grabs the cab door, out of breath.'),
            effects: [{ kind: 'quest', id: 'q_last_train', stage: 2 }],
          },
        },
        {
          label: t('운전석 콘솔을 깨운다', 'Wake the cab console'),
          intent: 'insight',
          check: { stat: 'int', dc: 13 },
          assist: 'kai',
          approval: { kai: 2 },
          success: {
            text: t('예비 전원으로 화면이 켜진다. 마지막 기록: ‘출발 대기 — 담당 염○○.’ 그 밑에 저장된 비상 제동 절차 하나. 열차는 아직 자기 노선을 외우고 있다.', 'The screen wakes on reserve power. Last entry: “Awaiting departure — operator Yeom ○○.” Below it, one saved emergency-braking routine. The train still knows its route by heart.'),
            effects: [{ kind: 'quest', id: 'q_last_train', stage: 1 }, { kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('예비 전원이 당신 손가락을 타고 튄다. 화면은 한 번 깜빡이고 다시 꺼진다.', 'The reserve power jumps through your fingers. The screen flickers once and goes dark.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('요금함을 비튼다', 'Wrench open the fare box'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 11 },
          approval: { tae_o: -1, lin_yue: 1 },
          success: {
            text: t('녹슨 자물쇠가 부러진다. 옛날 교통카드 충전 칩이 한 움큼. 아직 환전되는 것도 있다.', 'The rusted lock snaps. A fistful of old transit top-up chips. Some still change for credit.'),
            effects: [{ kind: 'credits', amount: 30 }],
          },
          failure: {
            text: t('쇳소리가 차량기지 전체에 울린다. 객차 창문마다 얼굴이 나타나 당신을 본다.', 'The clang rings through the whole depot. A face appears in every carriage window, watching you.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('내린다', 'Step off'),
          intent: 'leave',
          success: { text: t('운전석 유리의 손가락 글씨가 등 뒤에 남는다.', 'The finger-writing on the cab window stays behind you.') },
        },
      ],
    },
  },
}

export const D2_SUBWAY_HUB_DIALOGUES: DialogueDef[] = [YEOM, MA, PYO, DEPOT]

export const D2_SUBWAY_HUB_NPCS: NpcDef[] = [
  { id: 'stationmaster_yeom', name: t('염 역장', 'Stationmaster Yeom'), role: t('멈춘 열차의 시간표를 지키는 역장', 'Keeps the timetable for trains that no longer run') },
  { id: 'toll_king', name: t('마 사장', 'Boss Ma'), role: t('환승 통로 톨게이트의 주인', 'Runs the toll on the transfer corridor') },
  { id: 'scav_pyo', name: t('표', 'Pyo'), role: t('침수 선로에서 연료 셀을 건지는 사람', 'Fishes fuel cells out of the flooded track') },
]
