// Act 3 district — The Glass Atrium (the ARK Spire, the white summit).
//
// Four points of interest, three actions. Quest q_open_window: Yeon the window cleaner knows a hatch that never locks
// (stage 1 from her, or from Curator Baek's screen) → its location (stage 2): Yeon draws it on the fogged glass if
// talked round, threatened, shown the courier signs (runner) or met by Kai; or the smile booth's sensor list gives it
// away to a careful hacker. Approval: Han hates compliance and anything that serves IX, Tae-o protects the queued
// man, Su-ah grieves the memories shelved here, Kai is tender with machines and the replaced, Se-rin likes nerve,
// Lin Yue likes a clean trade.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D3_GLASS_ATRIUM: DistrictDef = {
  id: 'd3_glass_atrium',
  act: 3,
  name: t('유리 아트리움', 'The Glass Atrium'),
  image: 'v2/districts/d3_glass_atrium.webp',
  intro: t(
    '첨탑 120층. 바닥부터 천장까지 유리. 흰 바닥 위로 시민들이 줄을 서 있다. 줄은 어디에도 닿지 않는다. 모두 웃고 있다. 같은 각도로.\n경비 드론이 순회를 한 바퀴 마치기 전까지, 둘러볼 수 있는 곳은 세 군데쯤.',
    'Floor 120 of the Spire. Glass from floor to ceiling. On the white floor, citizens stand in line. The line leads nowhere. Everyone is smiling, at the same angle.\nBefore the warden drones finish one sweep, you have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '천장 스피커가 부드럽게 울린다. “대기 중인 시민 여러분, 감사합니다.” 줄이 한 걸음 앞으로 간다. 당신은 반대쪽으로 걷는다.',
    'The ceiling speakers chime softly. “Thank you for waiting, citizens.” The line takes one step forward. You walk the other way.',
  ),
  pois: [
    { id: 'desk', name: t('큐레이터 데스크', 'The Curator’s Desk'), blurb: t('번호표를 나눠 주는 사람.', 'Where the numbers are handed out.'), dialogue: 'd3g_baek' },
    { id: 'outer_glass', name: t('바깥 유리벽', 'The Outer Glass'), blurb: t('유리 밖에 매달린 사람.', 'Someone hanging outside the glass.'), dialogue: 'd3g_yeon' },
    { id: 'line_end', name: t('줄의 맨 끝', 'The End of the Line'), blurb: t('엄지가 쉬지 않는 남자.', 'A man whose thumb won’t keep still.'), dialogue: 'd3g_mun' },
    { id: 'booth', name: t('미소 교정실', 'The Smile Booth'), blurb: t('대기 시간 0분.', 'Waiting time: zero minutes.'), dialogue: 'd3g_booth' },
  ],
}

const BAEK: DialogueDef = {
  id: 'd3g_baek',
  npc: 'curator_baek',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'curator_baek',
      text: t(
        '흰 데스크 뒤에서 여자가 일어나 정확히 삼십 도로 허리를 굽힌다. 명찰에는 백 큐레이터, 그 아래 시민 점수 998. 입꼬리는 한 번도 내려오지 않는다. “유리 아트리움에 오신 것을 환영합니다. 대기 번호를 발급해 드리겠습니다. 기다림은 IX께서 주시는 휴식입니다.”',
        'Behind a white desk, a woman stands and bows at exactly thirty degrees. Her name tag reads Curator Baek; below it, citizen score 998. The corners of her mouth never come down. “Welcome to the Glass Atrium. Allow me to issue you a waiting number. Waiting is a rest that IX gives us.”',
      ),
      options: [
        {
          label: t('“다들 뭘 기다리는 겁니까?”', '“What is everyone waiting for?”'),
          intent: 'ask',
          success: { text: t('백 큐레이터가 줄을 돌아본다. 자랑스러운 얼굴로.', 'Curator Baek turns to look at the line, with pride.'), goto: 'queue' },
        },
        {
          label: t('대기 번호를 받는다', 'Take a number'),
          intent: 'deceive',
          approval: { han: -2, se_rin: 1 },
          success: {
            text: t(
              '손목에 흰 띠가 감긴다. 0452. 천장의 렌즈들이 당신에게서 시선을 거둔다. 줄 선 사람은 아무도 쳐다보지 않는다. 입꼬리가 저절로 조금 올라간다. 그게 제일 무섭다.',
              'A white band closes around your wrist: 0452. The lenses in the ceiling look away from you. Nobody watches a person in line. The corners of your mouth lift a little on their own. That is the frightening part.',
            ),
            effects: [{ kind: 'trace', amount: -8 }],
          },
        },
        {
          label: t('데스크 화면을 거꾸로 읽는다', 'Read her screen upside down'),
          intent: 'insight',
          check: { stat: 'obs', dc: 13 },
          success: {
            text: t(
              '‘외벽 점검 창 7-C: 잠금 상태 확인 불가. 담당: 연(외벽 청소, 비최적화).’ 맨 아래 붉은 줄. ‘청소 드론 도입: 다음 주.’ 백 큐레이터가 고개를 들기 전에 시선을 돌린다.',
              '‘Exterior inspection hatch 7-C: lock status unverifiable. Assigned: Yeon (exterior cleaning, unoptimised).’ At the bottom, a red line: ‘Cleaning drones arrive: next week.’ You look away before Curator Baek raises her head.',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 1 }],
            goto: 'queue',
          },
          failure: {
            text: t(
              '백 큐레이터가 화면을 부드럽게 돌려놓는다. “열람 권한이 없으십니다.” 미소. 천장 렌즈 하나가 당신 쪽으로 돈다.',
              'Curator Baek gently turns the screen away. “You do not have viewing permission.” A smile. One of the ceiling lenses swivels toward you.',
            ),
            effects: [{ kind: 'trace', amount: 6 }],
            goto: 'queue',
          },
        },
        {
          label: t('“저 진열장의 칩들, 어디서 온 겁니까?”', '“The chips in that display case. Where are they from?”'),
          intent: 'ask',
          requires: { quest: { id: 'q_sold_summer', stage: 1 } },
          approval: { su_ah: 1 },
          success: {
            text: t(
              '“기증품입니다. 하층의 여러 경매장에서 일괄 기증되었습니다.” 유리 진열장 안에 같은 라벨이 수십 개. ‘여름, 열두 살.’ ‘여름, 열한 살.’ ‘여름, 아홉 살.’ 아래에서 팔린 기억은 결국 여기로 올라온다.',
              '“Donations. Received in bulk from various auction houses in the Undercity.” Inside the case, dozens of the same label. ‘Summer, age twelve.’ ‘Summer, age eleven.’ ‘Summer, age nine.’ Every memory sold down there ends up here.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }, { kind: 'codex', id: 'lore_data_incinerator' }],
            goto: 'queue',
          },
        },
        {
          label: t('고개만 숙이고 지나간다', 'Nod and walk past'),
          intent: 'leave',
          success: { text: t('“좋은 하루 되십시오.” 인사 각도는 아까와 똑같다.', '“Have a pleasant day.” The bow is the same angle as before.') },
        },
      ],
    },
    queue: {
      speaker: 'curator_baek',
      text: t(
        '“최적화를 기다립니다.” 그녀가 두 손을 모은다. “차례가 오면 걱정이 사라집니다. 어제의 걱정도, 내일의 걱정도. IX께서는 친절하십니다. 아무도 서두르게 하지 않으십니다.” 줄이 반 걸음 앞으로 간다. 맨 앞 사람은 어디로도 가지 않는다.',
        '“For optimisation.” She folds her hands. “When your turn comes, worry goes away. Yesterday’s worries, and tomorrow’s. IX is kind. IX never hurries anyone.” The line shuffles half a step forward. The person at the front goes nowhere.',
      ),
      options: [
        {
          label: t('“당신 차례는 언제였습니까?”', '“When was your turn?”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 15 },
          approval: { han: 1, su_ah: 1 },
          success: {
            text: t(
              '미소가 0.5초 멈춘다. 그녀가 자기 손목을 만진다. 번호표가 있던 자리에 하얗게 바랜 띠 자국. “…제 차례는 이미 지났습니다.” 아주 작은 목소리. 그녀가 방문객 출입증 하나를 당신 손에 쥐여 준다. “서두르지 않으셔도 됩니다. …서두르셔야 한다면, 이걸.”',
              'The smile stops for half a second. She touches her own wrist, where a pale band mark shows where a number used to be. “…My turn has already passed.” A very small voice. She presses a visitor’s pass into your hand. “There is no need to hurry. …If you must hurry, take this.”',
            ),
            effects: [{ kind: 'consumable', id: 'stealth_cloak' }],
          },
          failure: {
            text: t('“저는 행복합니다.” 확신에 찬 목소리. 흔들림이 없다. 그게 대답의 전부다.', '“I am happy.” A voice full of certainty, without a tremor. That is the whole answer.'),
          },
        },
        {
          label: t('“자리 하나에 얼마입니까? 여기도 값은 있잖아요.”', '“What does a place in line cost? Everything has a price.”'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { lin_yue: 2 },
          success: {
            text: t(
              '“모든 것은 무료입니다. 대가는 이미 지불하셨으니까요.” 브로커의 귀에는 그 말이 영수증처럼 들린다. 장단을 맞춰 준다. 기증서에 시시한 기억 하나를 적어 내고, 그 대가로 오늘의 대기 명단을 받는다. 귀퉁이에 경비 드론의 순회 시각이 인쇄돼 있다.',
              '“Everything is free. You have already paid.” To a broker’s ear it sounds like a receipt. You play along: you write a worthless memory on a donation form and get today’s waiting list in return. The warden drones’ sweep times are printed in the margin.',
            ),
            effects: [{ kind: 'combat_mod', mod: 'intel' }],
          },
        },
        {
          label: t('“저 사람들 얼굴 좀 봐요. 이게 친절입니까?”', '“Look at their faces. You call this kind?”'),
          intent: 'intimidate',
          approval: { han: 2, tae_o: 1 },
          success: {
            text: t(
              '“목소리를 조금만 낮춰 주시겠습니까? 다른 분들의 휴식을 위해서.” 그녀의 목소리는 끝까지 올라가지 않는다. 대신 줄 선 사람 전원이 동시에 고개를 돌려 당신을 본다. 같은 각도로. 천장의 렌즈들도.',
              '“Might I ask you to lower your voice a little? For the others’ rest.” Her voice never rises. Instead, everyone in the line turns their head to look at you at once. At the same angle. The ceiling lenses too.',
            ),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('“방해해서 미안합니다.”', '“Sorry to bother you.”'),
          intent: 'leave',
          success: { text: t('“방해라니요. 이곳에는 방해라는 것이 존재하지 않습니다.”', '“Bother? There is no such thing as a bother here.”') },
        },
      ],
    },
  },
}

const YEON: DialogueDef = {
  id: 'd3g_yeon',
  npc: 'yeon_cleaner',
  start: 'glass',
  nodes: {
    glass: {
      text: t(
        '아트리움 끝, 유리벽 바깥에서 곤돌라 하나가 바람에 흔들린다. 고무 밀대를 든 여자가 유리를 닦다 멈춘다. 당신을 본다. 안쪽 사람이 자기를 마주 본 건 처음이라는 얼굴이다. 그녀가 유리에 입김을 불고 손가락으로 쓴다. ‘뭘 봐.’ 발치에 손바닥만 한 환기 그릴이 있다.',
        'At the far end of the atrium, a gondola sways in the wind outside the glass. A woman with a rubber squeegee stops mid-stroke and looks at you, like nobody inside has ever looked back before. She breathes on the glass and writes with a finger: ‘What.’ At your feet is a ventilation grille the size of a palm.',
      ),
      options: [
        {
          label: t('환기 그릴에 대고 말을 건다', 'Talk into the vent'),
          intent: 'ask',
          success: { text: t('그릴 너머로 바람 소리. 그리고 웃음 반, 기침 반.', 'Through the grille, wind. Then half a laugh, half a cough.'), goto: 'grille' },
        },
        {
          label: t('외벽 배송 수신호를 보낸다', 'Flash the wall-courier hand signs'),
          intent: 'sneak',
          requires: { background: 'runner' },
          approval: { se_rin: 1 },
          success: {
            text: t(
              '두 손가락으로 매듭, 주먹으로 하강. 외벽 배송을 뛰던 시절의 신호다. 여자의 눈이 커진다. 같은 신호가 돌아온다. “너 그거 뛰었어? 미친놈이네.” 그녀가 입김 위에 그린다. 7번 기둥, 위에서 셋째 칸, 작은 네모. 그러고는 소매로 지운다.',
              'Two fingers for the knot, a fist for the drop: the signs from your wall-courier days. Her eyes go wide. The same signs come back. “You ran the walls? You’re insane.” She draws on the fog: pillar seven, third pane from the top, a small square. Then she wipes it away with her sleeve.',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 2 }],
          },
        },
        {
          label: t('손을 들어 보이고 돌아선다', 'Raise a hand and turn away'),
          intent: 'leave',
          success: { text: t('그녀가 밀대를 다시 유리에 댄다. 입김 글자가 지워진다.', 'She puts the squeegee back to the glass. The breath-writing disappears.') },
        },
      ],
    },
    grille: {
      speaker: 'yeon_cleaner',
      text: t(
        '“안쪽 사람이 말을 거네. 웃지도 않고.” 바람에 목소리가 반쯤 찢겨 들어온다. “여기 육 년째 매달려 있어. 안에 들어가는 사람들 다 봤지. 들어갈 땐 울고, 일주일 지나면 웃더라.” 밀대가 아래를 가리킨다. “난 아래가 보여서 안 웃어. 저기 불 꺼진 데, 우리 동네야.”',
        '“Someone inside’s talking to me. Not even smiling.” The wind tears half her voice away. “Six years I’ve hung off this thing. Seen everyone who goes in there. Crying on the way in, smiling a week later.” Her squeegee points down. “I can see the bottom, so I don’t smile. That dark patch down there. That’s my neighbourhood.”',
      ),
      options: [
        {
          label: t('“밖에서 안으로 들어오는 길, 알아?”', '“Do you know a way in from outside?”'),
          intent: 'ask',
          success: {
            text: t(
              '그녀가 눈을 가늘게 뜬다. “…알지. 점검 창 하나가 칠 년째 안 잠겨. 잠금 센서가 고장인데 아무도 안 고쳐. 고장 보고가 안 올라가거든. 센서가 고장이라서.” 그녀가 킥킥댄다. “어딘지는 아직 안 알려 줘.”',
              'She narrows her eyes. “…I do. One inspection hatch hasn’t locked in seven years. The lock sensor’s broken and nobody fixes it, because nobody gets a fault report. Because the sensor’s broken.” She snickers. “Not telling you where. Not yet.”',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 1 }],
            goto: 'hatch',
          },
        },
        {
          label: t('“거기서 보면 아래가 어때?”', '“What does it look like down there, from where you are?”'),
          intent: 'ask',
          approval: { kai: 1, su_ah: 1 },
          success: {
            text: t(
              '그녀가 한참 말한다. 장마철엔 강이 두 줄로 보인다고. 야시장 등불은 여기서 보면 깨진 유리 같다고. 정전 구역에 불 하나가 켜지면 그게 누구 집인지 다 안다고. “안에선 그런 거 못 보지?” 곤돌라가 갑자기 위로 끌려 올라간다. 교대 시간이다.',
              'She talks for a long time. In monsoon season the river looks like two rivers. From up here the night-market lanterns look like broken glass. When one light comes on in the blackout zone, she knows whose home it is. “You can’t see any of that in there, can you?” Then the gondola is winched upward. Shift change.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('그릴에서 물러난다', 'Step back from the vent'),
          intent: 'leave',
          success: { text: t('“그래, 가. 다들 가더라.”', '“Sure, go. Everyone does.”') },
        },
      ],
    },
    hatch: {
      speaker: 'yeon_cleaner',
      text: t(
        '“위치 알려 주면 넌 뭐 해 줄 건데.” 곤돌라가 바람에 크게 한 번 흔들린다. 그녀는 로프를 잡지도 않는다. “다음 주에 청소 드론 들어온대. 나 같은 건 정리 대상이고. 그러니까 이게 내가 쥔 마지막 패야.”',
        '“And if I tell you where, what do I get?” The gondola swings hard in the wind. She doesn’t even grab the rope. “Cleaning drones arrive next week. People like me get tidied away. So this is the last card I’m holding.”',
      ),
      options: [
        {
          label: t('“여기서 아래를 보는 사람은 너 하나야. 그 아래 사람들 몫으로.”', '“You’re the only one up here who still looks down. Do it for them.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          approval: { tae_o: 1, han: 1 },
          success: {
            text: t(
              '그녀가 오래 아래를 본다. 그러다 유리에 입김을 불고 손가락으로 그린다. 7번 기둥, 위에서 셋째 칸, 작은 네모. 그리고 소매로 지운다. “우리 동네 지나가면, 불 하나 켜 줘.”',
              'She looks down for a long time. Then she breathes on the glass and draws with a finger: pillar seven, third pane from the top, a small square. She wipes it away with her sleeve. “If you pass through my neighbourhood, turn a light on for me.”',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 2 }],
          },
          failure: {
            text: t('“말은 다 잘하더라, 안쪽 사람들.” 곤돌라가 위로 올라가 버린다. 유리에 입김 자국만 남는다.', '“You inside people all talk pretty.” The gondola rises out of sight. Only the fog of her breath is left on the glass.'),
          },
        },
        {
          label: t('카이가 유리에 손바닥을 댄다', 'Kai puts his palm to the glass'),
          intent: 'persuade',
          requires: { companion: 'kai' },
          approval: { kai: 2 },
          success: {
            text: t(
              '“저도 대체됐어요. 더 새 모델로.” 카이가 말한다. 그녀가 카이를 오래 본다. 그러고는 유리 너머에서 자기 손바닥을 카이의 손바닥에 맞댄다. “…7번 기둥. 위에서 셋째 칸.” 입김 위에 작은 네모가 그려진다. “기계한테 알려 주는 건 처음이다.”',
              '“I was replaced too. By a newer model,” Kai says. She looks at him for a long time. Then, through the glass, she lays her palm against his. “…Pillar seven. Third pane from the top.” A small square appears in the fog. “First time I’ve told a machine anything.”',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 2 }],
          },
        },
        {
          label: t('“말 안 하면 관리실에 네 얘기 할 거야.”', '“Tell me, or I tell the office about you.”'),
          intent: 'intimidate',
          check: { stat: 'cha', dc: 13 },
          approval: { tae_o: -2, han: -1, se_rin: -1 },
          success: {
            text: t(
              '그녀의 얼굴이 굳는다. 손가락이 유리를 긁듯이 네모 하나를 그린다. 7번 기둥, 위에서 셋째 칸. “너도 결국 안쪽 사람이네.” 곤돌라가 올라간다. 다시 내려오지 않는다.',
              'Her face sets hard. Her finger scrapes a square into the fog: pillar seven, third pane from the top. “So you’re an inside person after all.” The gondola goes up. It doesn’t come back down.',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 2 }],
          },
          failure: {
            text: t('“해 봐. 다음 주면 어차피 없을 사람이야.” 그녀가 곤돌라의 비상벨을 누른다. 아트리움 전체에 차임이 울린다.', '“Go ahead. I won’t be here next week anyway.” She hits the gondola’s emergency bell. A chime rings through the whole atrium.'),
            effects: [{ kind: 'trace', amount: 8 }],
          },
        },
        {
          label: t('“됐어. 그 패는 네가 쥐고 있어.”', '“Forget it. Keep your card.”'),
          intent: 'leave',
          success: { text: t('“…이상한 놈.” 그녀가 다시 유리를 닦는다. 당신 얼굴 높이를 조금 더 오래.', '“…Weirdo.” She goes back to cleaning the glass, lingering a little longer at the height of your face.') },
        },
      ],
    },
  },
}

const MUN: DialogueDef = {
  id: 'd3g_mun',
  npc: 'citizen_mun',
  start: 'line',
  nodes: {
    line: {
      speaker: 'citizen_mun',
      text: t(
        '줄 맨 끝의 남자. 흰 대기복, 손목 띠에 0451. 웃고 있다. 그런데 오른손 엄지가 쉬지 않고 허공의 무언가를 앞으로 민다. 천천히, 끝까지. 다시 처음부터. “안녕하십니까. 0451번입니다. 새치기는 허용되지 않습니다.”',
        'The man at the end of the line. White waiting gown, 0451 on his wristband. He is smiling. But his right thumb keeps pushing something forward in the air. Slowly, all the way. Then from the start again. “Good day. I am number 0451. Cutting in line is not permitted.”',
      ),
      options: [
        {
          label: t('“그 손, 뭘 미는 겁니까?”', '“What’s your hand pushing?”'),
          intent: 'ask',
          success: { text: t('남자가 자기 손을 내려다본다. 처음 보는 물건처럼.', 'The man looks down at his own hand, as if he has never seen it before.'), goto: 'hand' },
        },
        {
          label: t('손목 패치와 동공을 살핀다', 'Check the patch on his wrist and his pupils'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { tae_o: 1, su_ah: 1 },
          success: {
            text: t(
              '진정 패치. 한 시간마다 용량이 오른다. 입꼬리는 근육 이완제로 고정돼 있다. 패치를 떼어 내자 남자가 눈을 두 번 깜빡인다. 미소가 한쪽으로 기운다. 패치 묶음 옆에 꽂혀 있던 각성제 한 대가 당신 주머니로 들어간다.',
              'A sedative patch, the dose stepping up every hour. The smile is held in place with a muscle relaxant. You peel the patch off and he blinks twice. The smile slides to one side. The stimulant tucked beside the patch bundle goes into your pocket.',
            ),
            effects: [{ kind: 'consumable', id: 'stim_shard' }],
            goto: 'hand',
          },
        },
        {
          label: t('그를 줄에 두고 지나간다', 'Leave him in line'),
          intent: 'leave',
          success: { text: t('“좋은 하루 되십시오.” 엄지는 계속 허공을 민다.', '“Have a pleasant day.” The thumb keeps pushing at the air.') },
        },
      ],
    },
    hand: {
      speaker: 'citizen_mun',
      text: t(
        '“이 손 말씀입니까.” 엄지가 멈추지 않는다. 앞으로. 끝까지. “모르겠습니다. 최적화 이전의 습관은 곧 정리됩니다. 정리되면 편해진다고 합니다.”',
        '“This hand?” The thumb doesn’t stop. Forward. All the way. “I do not know. Habits from before optimisation will be tidied away soon. They say it is easier, once tidied.”',
      ),
      options: [
        {
          label: t('“가속 레버를 미는 손이네요. 기관사였죠?”', '“That’s a hand on a throttle. You drove trains, didn’t you?”'),
          intent: 'insight',
          check: { stat: 'obs', dc: 14 },
          approval: { su_ah: 1 },
          success: {
            text: t('미소가 한 번 떨린다. “…2호선. 성수 방향.” 반말이다. 그가 놀라서 자기 입을 만진다.', 'The smile twitches once. “…Line 2. Toward Seongsu.” Plain speech, not the polite drone. Startled, he touches his own mouth.'),
            goto: 'remember',
          },
          failure: {
            text: t('“기관사 직군은 자동 운행 도입과 함께 폐지되었습니다.” 미소가 더 단단해진다. 엄지가 멈춘다. 그게 더 나쁘다.', '“The train-driver occupation was abolished with automated operation.” The smile sets harder. The thumb stops. That is worse.'),
          },
        },
        {
          label: t('“하층에서 그 열차가 다시 달려요. 마지막 열차가.”', '“Down below, that train runs again. The last train.”'),
          intent: 'persuade',
          requires: { quest: { id: 'q_last_train', stage: 2 } },
          approval: { tae_o: 1, kai: 1 },
          success: {
            text: t('남자의 엄지가 허공에서 멈춘다. “…그건 내 열차야.” 미소가 내려온다. 천천히, 끝까지.', 'The man’s thumb stops in mid-air. “…That’s my train.” The smile comes down. Slowly, all the way.'),
            goto: 'remember',
          },
        },
        {
          label: t('팔을 잡고 줄 밖으로 끌어낸다', 'Take his arm and pull him out of line'),
          intent: 'fight',
          check: { stat: 'str', dc: 14 },
          approval: { han: 1, se_rin: 1 },
          success: {
            text: t(
              '잡아당기자 그가 비틀거리며 줄 밖으로 나온다. 앞사람들은 돌아보지 않는다. 빈자리를 메우며 반 걸음 당길 뿐이다. 남자의 미소가 그제야 흔들린다.',
              'You pull and he stumbles out of the line. Nobody ahead turns around; they just shuffle half a step to close the gap. Only then does his smile waver.',
            ),
            goto: 'remember',
          },
          failure: {
            text: t('남자의 발이 바닥에 붙은 듯 움직이지 않는다. 그가 비명 대신 차임 같은 소리를 낸다. 천장에서 경비 드론이 내려온다.', 'His feet won’t move, as if glued to the floor. Instead of a scream he makes a sound like a chime. Warden drones drop from the ceiling.'),
            effects: [{ kind: 'combat', encounterId: 'a3_event_ambush' }],
          },
        },
        {
          label: t('“편해지면 좋겠네요.”', '“I hope it gets easier.”'),
          intent: 'leave',
          success: { text: t('“감사합니다.” 엄지가 다시 앞으로 간다. 끝까지. 다시 처음부터.', '“Thank you.” The thumb moves forward again. All the way. Then from the start.') },
        },
      ],
    },
    remember: {
      speaker: 'citizen_mun',
      text: t(
        '남자의 입꼬리가 내려온다. 얼굴이 열 살은 더 늙어 보인다. “…막차는 늘 내가 몰았어. 비 오는 날엔 승강장에 아무도 없어도 문을 한 번 더 열어 줬고.” 그가 주위를 둘러본다. 줄. 미소. 유리. “여기가 어디야.”',
        'The corners of his mouth come down. His face looks ten years older. “…I always drove the last train. On rainy nights I opened the doors one more time, even when the platform was empty.” He looks around. The line. The smiles. The glass. “Where am I.”',
      ),
      options: [
        {
          label: t('“나가요. 지금.”', '“Get out. Now.”'),
          intent: 'offer',
          approval: { tae_o: 2, han: 1 },
          success: {
            text: t(
              '그가 손목 띠를 뜯어 바닥에 놓는다. “경비 드론은 승강기 시간표대로 돌아. 열차처럼. 3분 간격, 1분 정차.” 그는 비상계단 쪽으로 걸어간다. 줄의 반대 방향으로.',
              'He tears off the wristband and sets it on the floor. “The warden drones run on the elevator timetable. Like trains. Three-minute headway, one-minute dwell.” He walks toward the emergency stairs. Away from the line.',
            ),
            effects: [{ kind: 'combat_mod', mod: 'intel' }],
          },
        },
        {
          label: t('“편하면… 다시 줄 서도 돼요.”', '“If it’s easier… you can get back in line.”'),
          intent: 'ask',
          approval: { su_ah: -2, han: -1 },
          success: {
            text: t(
              '그가 오래 망설인다. 그러다 손목 띠를 다시 여민다. 미소가 돌아온다. 한 칸씩. “감사합니다.” 줄로 돌아가기 전, 그가 당신 손에 낡은 기관사 호루라기를 쥐여 준다. 아직 따뜻하다.',
              'He hesitates for a long time. Then he fastens the wristband again. The smile returns, one notch at a time. “Thank you.” Before he steps back into line, he presses an old driver’s whistle into your hand. It is still warm.',
            ),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
      ],
    },
  },
}

const BOOTH: DialogueDef = {
  id: 'd3g_booth',
  start: 'booth',
  nodes: {
    booth: {
      text: t(
        '기둥 뒤에 전화 부스만 한 흰 캡슐. 문 위 안내등: ‘미소 교정 — 대기 시간 0분.’ 안에는 턱받침 하나, 입꼬리 높이에 은색 핀 두 개. 안쪽 벽의 정비 패널이 손가락 한 마디만큼 열려 있다.',
        'Behind a pillar, a white capsule the size of a phone booth. The sign over the door: ‘Smile calibration. Waiting time: 0 min.’ Inside, a chin rest and two silver pins at the height of the corners of a mouth. The maintenance panel on the inner wall is open by a finger’s width.',
      ),
      options: [
        {
          label: t('앉아 본다', 'Sit down'),
          intent: 'offer',
          approval: { han: -2, su_ah: -1 },
          success: {
            text: t(
              '핀이 입꼬리에 닿는다. 따뜻하다. 어깨의 통증이 녹아 없어진다. 다른 무언가도 같이. 부스에서 나왔을 때 당신은 웃고 있고, 왜 웃는지 모른다.',
              'The pins touch the corners of your mouth. Warm. The ache in your shoulders melts away, and something else with it. When you step out you are smiling, and you don’t know why.',
            ),
            effects: [{ kind: 'hp', amount: 8 }, { kind: 'junk', cardId: 'corrupted_echo' }],
          },
        },
        {
          label: t('정비 패널에서 외벽 센서 목록을 연다', 'Open the exterior sensor list in the panel'),
          intent: 'insight',
          check: { stat: 'int', dc: 15 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t(
              '센서 수천 개, 모두 초록. 그중 하나만 타임스탬프가 칠 년째 그대로다. ‘외벽 점검 창 7-C: 잠김.’ 칠 년 동안 1초도 빠짐없이 잠겨 있다고 보고하는 창. 그런 창은 잠겨 있지 않다.',
              'Thousands of sensors, all green. Only one has a timestamp that hasn’t changed in seven years. ‘Exterior inspection hatch 7-C: locked.’ A hatch that has reported itself locked every second for seven years. A hatch like that is not locked.',
            ),
            effects: [{ kind: 'quest', id: 'q_open_window', stage: 2 }],
          },
          failure: {
            text: t('패널이 탁 닫힌다. 안내 음성: “교정을 시작하겠습니다.” 핀이 튀어나와 뺨을 긁는다.', 'The panel snaps shut. A voice: “Beginning calibration.” The pins jab out and rake your cheek.'),
            effects: [{ kind: 'hp', amount: -5 }, { kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('부스를 부순다', 'Smash the booth'),
          intent: 'fight',
          check: { stat: 'str', dc: 13 },
          approval: { han: 2, kai: -1 },
          success: {
            text: t(
              '세 번째 발길질에 캡슐 벽이 갈라진다. 줄 선 사람 몇이 동시에 재채기를 한다. 한 사람이 울기 시작한다. 깨진 케이스 안에서 쓸 만한 부품이 굴러 나온다.',
              'On the third kick the capsule wall splits. A few people in the line sneeze at the same moment. One of them starts to cry. Something usable rolls out of the broken casing.',
            ),
            effects: [{ kind: 'card_choice', count: 3 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('캡슐 벽은 생각보다 단단하다. 발목이 꺾인다. 안내 음성이 사과한다. “불편을 드려 죄송합니다.”', 'The capsule wall is harder than it looks. Your ankle buckles. The voice apologises. “We are sorry for the inconvenience.”'),
            effects: [{ kind: 'hp', amount: -4 }, { kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('지나친다', 'Walk on'),
          intent: 'leave',
          success: { text: t('안내등이 깜빡인다. ‘대기 시간 0분.’ 언제나 0분.', 'The sign blinks. ‘Waiting time: 0 min.’ Always zero.') },
        },
      ],
    },
  },
}

export const D3_GLASS_ATRIUM_DIALOGUES: DialogueDef[] = [BAEK, YEON, MUN, BOOTH]

export const D3_GLASS_ATRIUM_NPCS: NpcDef[] = [
  { id: 'curator_baek', name: t('백 큐레이터', 'Curator Baek'), role: t('유리 아트리움의 최적화 시민 큐레이터', 'An optimised citizen who curates the Glass Atrium') },
  { id: 'yeon_cleaner', name: t('연', 'Yeon'), role: t('첨탑 외벽에 매달린 창문 청소부', 'A window cleaner on a rope outside the Spire') },
  { id: 'citizen_mun', name: t('0451번', 'Number 0451'), role: t('줄 맨 끝에 선 최적화 대기 시민', 'An optimisation-queued citizen at the end of the line') },
]
