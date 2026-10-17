// Act 1 district — The Hand-Crank Market (curfew-hour market in the blackout zone, lit by hand-crank lamps).
//
// Four points of interest, three actions. Quest q_schedule: stage 1 = learn that Madam Ku holds this week's patrol
// sheet (from Ku herself, from Dal the welfare kiosk's print log, or from Min who delivered it); stage 2 = get it —
// pay Ku, cut a broker's deal, lift it off her table, sell her the courier boy's hiding place, reprint it from the
// kiosk, or get the photo Min took before delivery (save him from the collectors, or the runner's trick).
// Approval: Se-rin likes nerve and cheating the rules, Tae-o protects Min and hates selling him out, Han likes
// gutting an IX-licensed machine, Kai is tender with the glitching kiosk.
import type { DialogueDef, DistrictDef, NpcDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D1_LAMP_MARKET: DistrictDef = {
  id: 'd1_lamp_market',
  act: 1,
  name: t('손전등 시장', 'The Hand-Crank Market'),
  image: 'v2/events/a1_hand_crank_lamp.webp',
  intro: t(
    '통금 사이렌이 끝나야 열리는 시장. 무너진 고가도로 밑에 천막이 줄지어 서고, 천막마다 손발전기 등이 끼익끼익 돈다. 크랭크를 멈추는 순간 그 가게는 문을 닫는다.\n단속 드론이 한 바퀴 돌아오기 전까지, 들를 수 있는 곳은 세 군데쯤.',
    'A market that only opens once the curfew siren stops. Tents line up under a collapsed overpass, and in every tent a hand-crank lamp squeaks round and round. The moment the crank stops, that stall is closed.\nBefore the patrol drone comes back around, you have time for about three stops.',
  ),
  actions: 3,
  outro: t(
    '등이 하나씩 꺼진다. 크랭크 소리가 멎자 시장은 원래 없었던 것처럼 어둠에 묻힌다.',
    'The lamps go out one by one. When the cranks stop squeaking, the market sinks into the dark as if it had never been there.',
  ),
  pois: [
    { id: 'tent', name: t('구 여사의 천막', 'Madam Ku’s Tent'), blurb: t('공짜로는 아무것도 안 판다.', 'Nothing here is free.'), dialogue: 'd1lm_ku' },
    { id: 'kiosk', name: t('복지 키오스크 달이', 'Dal, the Welfare Kiosk'), blurb: t('밤 열한 시에 아침 인사를 한다.', 'Says good morning at eleven at night.'), dialogue: 'd1lm_dal' },
    { id: 'crates', name: t('생선 상자 더미', 'The Fish Crates'), blurb: t('배달 가방이 숨을 쉰다.', 'A courier bag that breathes.'), dialogue: 'd1lm_min' },
    { id: 'pedals', name: t('발전 자전거 줄', 'The Pedal Line'), blurb: t('시장 불빛이 여기서 나온다.', 'Where the market’s light comes from.'), dialogue: 'd1lm_pedals' },
  ],
}

const KU: DialogueDef = {
  id: 'd1lm_ku',
  npc: 'madam_ku',
  start: 'tent',
  nodes: {
    tent: {
      speaker: 'madam_ku',
      text: t(
        '천막 안, 크랭크 등 아래에서 여자가 계산기를 두드린다. 고개는 들지 않는다. “구경은 공짜예요. 질문부터는 돈이고요.”',
        'Inside the tent, under the crank lamp, a woman taps at a calculator. She doesn’t look up. “Looking is free. Questions cost.”',
      ),
      options: [
        {
          label: t('“이번 주 순찰표, 여기 있다면서요.”', '“Word is this week’s patrol sheet is here.”'),
          intent: 'ask',
          success: {
            text: t('계산기 소리가 멎는다. 그녀가 등 받침대 밑을 손가락으로 톡 친다. 접힌 종이 모서리가 보인다. “소문이 빠르네요.”', 'The calculator goes quiet. She taps the base of the lamp with one finger. The corner of a folded sheet shows. “Word travels fast.”'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 1 }],
            goto: 'sheet',
          },
        },
        {
          label: t('물건부터 산다 (15크레딧)', 'Buy something first (15 credits)'),
          intent: 'offer',
          requires: { minCredits: 15 },
          success: {
            text: t('그녀가 서랍에서 비닐로 싼 꾸러미를 하나 꺼낸다. 뭔지는 말해 주지 않는다. “환불은 없어요.”', 'She takes a plastic-wrapped packet out of a drawer. She doesn’t say what it is. “No refunds.”'),
            effects: [{ kind: 'credits', amount: -15 }, { kind: 'consumable' }],
          },
        },
        {
          label: t('나간다', 'Leave'),
          intent: 'leave',
          success: { text: t('계산기 소리가 다시 시작된다. 당신은 처음부터 없었다.', 'The calculator starts clicking again. As far as she’s concerned, you were never here.') },
        },
      ],
    },
    sheet: {
      speaker: 'madam_ku',
      text: t(
        '“단속 소대 셋, 교대 시간, 해태 전차가 어느 골목에서 기다리는지까지.” 그녀가 처음으로 당신을 본다. “40크레딧. 깎자는 말이 나오면 그 자리에서 끝이에요.”',
        '“Three patrol squads, shift changes, even which alley the HAETAE tank waits in.” For the first time she looks at you. “Forty credits. The moment you haggle, we’re done.”',
      ),
      options: [
        {
          label: t('40크레딧을 센다', 'Count out forty credits'),
          intent: 'offer',
          requires: { minCredits: 40 },
          approval: { se_rin: -1 },
          success: {
            text: t('칩을 하나씩 세어 받는다. 종이가 당신 쪽으로 미끄러져 온다. “제값 내는 손님은 오랜만이네요.” 칭찬인지 아닌지 모르겠다.', 'She counts the chips one at a time. The sheet slides across to you. “Haven’t had a full-price customer in a while.” You can’t tell if that was a compliment.'),
            effects: [{ kind: 'credits', amount: -40 }, { kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
        },
        {
          label: t('“이 종이, 내일이면 휴지예요. 다음 주 표 살 손님 셋을 물어다 드리죠.”', '“By tomorrow this is scrap. I’ll bring you three buyers for next week’s.”'),
          intent: 'offer',
          requires: { background: 'broker' },
          approval: { se_rin: 1, lin_yue: 2 },
          success: {
            text: t('그녀의 손가락이 계산기 위에서 멈춘다. 머릿속으로 셈을 끝낸 얼굴. “셋. 이번 주 안에.” 종이가 넘어온다. 빚이 하나 생겼다.', 'Her finger stops over the calculator. The face of someone who has already done the sum. “Three. This week.” The sheet comes over. You now owe her.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }, { kind: 'flag', key: 'lm_owes_ku' }],
          },
        },
        {
          label: t('그녀가 칩을 세는 사이 등 밑의 종이를 뺀다', 'Slip the sheet from under the lamp while she counts'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 14 },
          assist: 'se_rin',
          approval: { se_rin: 2 },
          success: {
            text: t('옆 천막에서 물건값을 두고 고성이 터진다. 구 여사가 고개를 돌린 한 박자. 종이는 이미 당신 소매 안에 있다.', 'Someone starts shouting over prices at the next tent. Madam Ku turns her head for one beat. The sheet is already up your sleeve.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
          failure: {
            text: t('크랭크 손잡이가 당신 손등을 내리찍는다. “손버릇 값은 비싸요.” 그녀가 호루라기를 문다. 시장 반대편에서 누군가 당신 얼굴을 기억한다.', 'The crank handle comes down on the back of your hand. “Sticky fingers cost extra.” She puts a whistle to her lips. Across the market, someone memorises your face.'),
            effects: [{ kind: 'hp', amount: -4 }, { kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('“배달꾼 민이 어디 숨었는지 알아요.”', '“I know where Min the courier is hiding.”'),
          intent: 'offer',
          requires: { flag: 'lm_min_hideout' },
          approval: { tae_o: -3, se_rin: -2, lin_yue: 1 },
          success: {
            text: t('“그 애 빚이 딱 이 종이값이네요.” 그녀가 무전기에 짧게 말한다. 종이가 넘어온다. 생선 상자 쪽에서 무언가 넘어지는 소리가 난다. 아무도 돌아보지 않는다.', '“That boy’s debt is exactly the price of this sheet.” She says a few words into a radio. The sheet comes over. From the fish crates comes the sound of something falling. Nobody turns to look.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }, { kind: 'flag', key: 'sold_min' }],
          },
        },
        {
          label: t('“생각해 볼게요.”', '“I’ll think about it.”'),
          intent: 'leave',
          success: { text: t('“생각은 공짜예요.” 그녀가 등 받침대를 다시 덮는다.', '“Thinking is free.” She covers the lamp base again.') },
        },
      ],
    },
  },
}

const DAL: DialogueDef = {
  id: 'd1lm_dal',
  npc: 'kiosk_dal',
  start: 'greet',
  nodes: {
    greet: {
      speaker: 'kiosk_dal',
      text: t(
        '시장 입구 기둥에 볼트로 박힌 복지 키오스크. 화면 속 동그란 얼굴이 웃는데, 입이 반 박자 늦게 따라온다. “좋은 아침이에요! 저는 복지 도우미 달이예요! 통금 시간에는 외출을 삼가 주세요-세요-세요!” 지금은 밤 열한 시다.',
        'A welfare kiosk bolted to a pillar at the market’s mouth. The round face on the screen smiles, its mouth half a beat behind. “Good morning! I’m Dal, your welfare helper! Please stay indoors during curfew-few-few!” It is eleven at night.',
      ),
      options: [
        {
          label: t('“배급 좀 받자.”', '“I’m here for rations.”'),
          intent: 'ask',
          success: {
            text: t('“시민 번호를 확인할게요!” 화면이 빙글빙글 돈다. 한참 돈다.', '“Let me check your citizen number!” The screen spins. It spins for a long time.'),
            goto: 'denied',
          },
        },
        {
          label: t('말소된 의사 면허 번호를 입력한다', 'Enter your revoked medical licence number'),
          intent: 'ask',
          requires: { background: 'medic' },
          approval: { kai: 1 },
          success: {
            text: t('“의료인 확인… 확인… 말소… 확-확인되었어요! 어서 오세요, 선생님!” 의료 보급함이 덜컥 열린다. 출력 기록 한 줄이 같이 뜬다: ‘순찰 일정표 1부 — 수령 구○○’.', '“Verifying practitioner… verifying… revoked… ver-verified! Welcome, Doctor!” The medical supply drawer clunks open. One line of the print log flashes up with it: “Patrol schedule ×1 — collected by Ku ○○.”'),
            effects: [{ kind: 'consumable', id: 'nanopatch' }, { kind: 'quest', id: 'q_schedule', stage: 1 }],
          },
        },
        {
          label: t('화면을 걷어찬다', 'Kick the screen'),
          intent: 'fight',
          check: { stat: 'str', dc: 10 },
          approval: { kai: -2, se_rin: 1, han: 1 },
          success: {
            text: t('화면에 금이 간다. 반환구에서 배급 쿠폰 칩이 와르르 쏟아진다. 달이는 금 간 얼굴로 계속 웃는다. “이용해 주셔서 감사해요!”', 'The screen cracks. Ration coupon chips clatter out of the return slot. Dal keeps smiling through the crack. “Thank you for using our service!”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
          failure: {
            text: t('발만 아프다. “시설 훼손 신고가 접수됐어요-어요-어요!” 경광등이 돈다. 주변 천막의 크랭크가 일제히 멈춘다.', 'Only your foot hurts. “A vandalism report has been filed-iled-iled!” A beacon spins. Every crank in the nearby tents stops at once.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('지나간다', 'Walk past'),
          intent: 'leave',
          success: { text: t('“좋은 하루 되세요!” 등 뒤에서 달이가 아무도 없는 쪽에 인사한다.', '“Have a nice day!” Behind you, Dal greets an empty patch of street.') },
        },
      ],
    },
    denied: {
      speaker: 'kiosk_dal',
      text: t(
        '“확인되지 않아요! 관리자 IX 공공복지 지침 제4조: 등록되지 않은 개인은 ‘잠재 자원’으로 분류돼요! 좋은 하루 되세요!” 화면 구석에 출력 대기 아이콘 하나가 깜빡인다.',
        '“Not found! Administrator IX Public Welfare Guideline Article 4: unregistered individuals are classified as ‘latent resources’! Have a nice day!” In a corner of the screen, a print-queue icon blinks.',
      ),
      options: [
        {
          label: t('“4조, 끝까지 읽어 봐.”', '“Read Article 4 to the end.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 12 },
          approval: { se_rin: 1 },
          success: {
            text: t('“…단, 영하의 기온에서는 인도적 배급 1회를 허용해요!” 달이가 잠깐 말을 멈춘다. 오늘 기온은 영상 3도다. 그래도 배급함이 열린다.', '“…except that at sub-zero temperatures, one humanitarian ration is permitted!” Dal pauses. It is three degrees above zero tonight. The drawer opens anyway.'),
            effects: [{ kind: 'consumable' }],
          },
          failure: {
            text: t('“4조는 방금 끝까지 읽었어요! 다른 문의가 있으신가요-가요?” 화면이 대기 모드로 돌아간다.', '“I just read Article 4 to the end! Any other questions-tions?” The screen drops back to standby.'),
          },
        },
        {
          label: t('뒷면 패널을 따고 출력 대기열을 본다', 'Pry the back panel and read the print queue'),
          intent: 'insight',
          check: { stat: 'int', dc: 12 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t('나사 넷이 빠진다. 먼지 낀 영수증 프린터, 그 위 작은 화면에 출력 기록. 맨 위 줄: ‘정전 구역 순찰 일정표(관계자용) 1부 — 수령 구○○, 통금 두 시간 전.’', 'Four screws come out. A dusty receipt printer, and on the little screen above it, the print log. Top line: “Blackout-zone patrol schedule (staff copy) ×1 — collected by Ku ○○, two hours before curfew.”'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 1 }],
            goto: 'panel',
          },
          failure: {
            text: t('드라이버가 미끄러져 기판에 닿는다. 손목까지 찌릿하다. “고객님, 손을 떼 주세요-세요!”', 'The screwdriver slips onto the board. The jolt runs up to your wrist. “Customer, please remove your hand-and!”'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('물러난다', 'Step back'),
          intent: 'leave',
          success: { text: t('“좋은 하루 되세요!” 출력 대기 아이콘은 계속 깜빡인다.', '“Have a nice day!” The print-queue icon keeps blinking.') },
        },
      ],
    },
    panel: {
      speaker: 'kiosk_dal',
      text: t(
        '패널이 열린 채로, 화면 속 얼굴이 웃다 만 모양으로 멈춘다. 입만 움직인다. “패널이… 열려 있어요. 닫아… 주세요. 좋은 아-아침이에요.”',
        'With the panel open, the face on the screen freezes half-way through a smile. Only the mouth moves. “The panel is… open. Please… close it. Good mor-morning.”',
      ),
      options: [
        {
          label: t('순찰 일정표를 재출력시킨다', 'Make it reprint the patrol schedule'),
          intent: 'insight',
          check: { stat: 'int', dc: 15 },
          assist: 'han',
          approval: { han: 2 },
          success: {
            text: t('프린터가 끼익 운다. 잉크가 흐린 종이 한 장이 밀려 나온다. 흐려도 시간표는 읽힌다. 구 여사는 오늘 밤 단골 하나를 잃었다.', 'The printer squeals. One sheet with faded ink pushes out. Faded, but the times are readable. Madam Ku just lost a customer.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
          failure: {
            text: t('프린터가 종이를 씹는다. 작은 화면에 붉은 글씨: ‘무단 접근 — 관리 서버에 보고됨.’ 달이가 웃는다. “신고해 주셔서 감사해요!”', 'The printer chews the paper. Red text on the little screen: “Unauthorised access — reported to the management server.” Dal smiles. “Thank you for your report!”'),
            effects: [{ kind: 'trace', amount: 8 }],
          },
        },
        {
          label: t('되풀이되는 인사 회로를 정리해 준다', 'Untangle the looping greeting circuit'),
          intent: 'offer',
          approval: { kai: 2 },
          success: {
            text: t('선 두 가닥을 바로 꽂는다. 화면 속 얼굴이 처음으로 웃지 않는다. “…조용하네요. 고마워요.” 출력구에서 오래된 민방위 대피 안내문이 줄줄이 나온다. “이거, 아무도 안 가져갔어요.”', 'You reseat two wires. For the first time the face on the screen isn’t smiling. “…It’s quiet. Thank you.” Old civil-defence evacuation drills scroll out of the printer, one after another. “Nobody ever took these.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('패널을 닫고 떠난다', 'Close the panel and go'),
          intent: 'leave',
          success: { text: t('나사를 다시 조인다. “좋은 하루 되세요!” 목소리가 다시 반 박자 늦다.', 'You tighten the screws again. “Have a nice day!” The voice is half a beat late again.') },
        },
      ],
    },
  },
}

const MIN: DialogueDef = {
  id: 'd1lm_min',
  npc: 'min_courier',
  start: 'hide',
  nodes: {
    hide: {
      speaker: 'min_courier',
      text: t(
        '생선 상자 더미 뒤에서 배달 가방이 숨을 쉰다. 가방 밑으로 헬멧 쓴 소년이 고개를 내민다. 헬멧에 ‘총알배송’ 스티커. “쉿, 쉿. 나 여기 없어. 못 봤어. 알았지?”',
        'Behind a stack of fish crates, a courier bag is breathing. A boy in a helmet peeks out from under it. A “Bullet Express” sticker on the helmet. “Shh, shh. I’m not here. You didn’t see me. Okay?”',
      ),
      options: [
        {
          label: t('“누구한테 쫓기는데?”', '“Who’s after you?”'),
          intent: 'ask',
          success: {
            text: t('“배송비 선불 빚. 오토바이 할부. 헬멧 대여료.” 소년이 손가락을 꼽다 만다. “아 그리고, 오늘 구 여사한테 봉투 하나 갖다줬거든. 순찰표. 근데 나 그거… 갖다주기 전에 사진 찍어 놨다?”', '“Prepaid delivery debt. Bike instalments. Helmet rental.” He stops counting on his fingers. “Oh, and today I dropped an envelope at Madam Ku’s. The patrol sheet. But I… took a photo before I handed it over.”'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 1 }, { kind: 'flag', key: 'lm_min_hideout' }],
            goto: 'debt',
          },
        },
        {
          label: t('“가방 추적기부터 떼. 회사는 너 말고 가방을 쫓아.”', '“Rip the tracker out of the bag. They’re chasing the bag, not you.”'),
          intent: 'sneak',
          requires: { background: 'runner' },
          approval: { se_rin: 1, tae_o: 1 },
          success: {
            text: t('안감 속 추적기를 뜯어 지나가는 배달 오토바이 짐칸에 붙인다. 형광 조끼 셋이 그 오토바이를 쫓아 뛰어간다. 소년이 금 간 휴대폰을 내민다. “형 누구야? …이거 가져. 순찰표 사진.”', 'You tear the tracker out of the lining and stick it on the cargo box of a passing delivery bike. Three hi-vis vests run off after the bike. The boy holds out a cracked phone. “Who are you? …Take this. Photo of the patrol sheet.”'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
        },
        {
          label: t('수금원들에게 손을 흔든다', 'Wave the collectors over'),
          intent: 'offer',
          approval: { tae_o: -3, se_rin: -2 },
          success: {
            text: t('형광 조끼가 소년의 뒷덜미를 잡아 일으킨다. 수금원이 현상금 칩을 당신 손에 쥐여 준다. 끌려가는 동안 소년은 끝까지 당신을 본다.', 'A hi-vis vest hauls the boy up by the collar. The collector presses a bounty chip into your hand. The boy keeps his eyes on you the whole way out.'),
            effects: [{ kind: 'credits', amount: 25 }],
          },
        },
        {
          label: t('못 본 척 지나간다', 'Pretend you saw nothing'),
          intent: 'leave',
          success: { text: t('“고마워…” 가방이 다시 생선 상자 그림자 속으로 들어간다.', '“Thanks…” The bag shrinks back into the crates’ shadow.') },
        },
      ],
    },
    debt: {
      speaker: 'min_courier',
      text: t(
        '골목 끝에서 형광 조끼 셋이 천막을 하나씩 들춘다. 소년이 가방을 끌어안는다. “…쟤네 오고 있어. 나 잡히면 사진도 끝이야.”',
        'At the end of the alley, three hi-vis vests are lifting tent flaps one by one. The boy hugs the bag. “…They’re coming. If they get me, the photo’s gone too.”',
      ),
      options: [
        {
          label: t('“아까 그 애, 고가도로 쪽으로 뛰던데요.”', '“That kid? Ran off toward the overpass.”'),
          intent: 'deceive',
          check: { stat: 'cha', dc: 12 },
          assist: 'se_rin',
          approval: { se_rin: 2, tae_o: 1 },
          success: {
            text: t('당신이 턱으로 고가도로를 가리킨다. 수금원들이 그쪽으로 뛰어간다. 소년이 숨을 몰아쉬며 휴대폰을 내민다. 금 간 화면 속에 순찰표가 또렷하다.', 'You nod toward the overpass. The collectors run that way. Gasping, the boy hands you his phone. The patrol sheet is sharp on the cracked screen.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
          failure: {
            text: t('“고가도로는 막혔는데?” 수금원이 생선 상자를 걷어찬다. 소년이 비명을 지른다. 조끼 안에서 전기봉이 나온다.', '“The overpass is blocked off.” A collector kicks the fish crates. The boy screams. Shock batons come out from under the vests.'),
            effects: [{ kind: 'combat', encounterId: 'a1_event_ambush' }],
          },
        },
        {
          label: t('상자 앞을 막아선다', 'Stand in front of the crates'),
          intent: 'intimidate',
          check: { stat: 'str', dc: 13 },
          assist: 'tae_o',
          approval: { tae_o: 2 },
          success: {
            text: t('수금원 하나가 당신 어깨 너머를 본다. 당신 눈을 본다. 다시 어깨 너머를 본다. “…여긴 없네.” 셋이 돌아선다. 소년이 떨리는 손으로 휴대폰을 내민다.', 'A collector looks past your shoulder. Then at your eyes. Then past your shoulder again. “…Not here.” The three turn away. With shaking hands the boy gives you his phone.'),
            effects: [{ kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
          failure: {
            text: t('“비켜.” 당신이 안 비키자 셋이 동시에 움직인다.', '“Move.” When you don’t, all three move at once.'),
            effects: [{ kind: 'combat', encounterId: 'a1_event_ambush' }],
          },
        },
        {
          label: t('이번 주 이자를 대신 내 준다 (30크레딧)', 'Pay this week’s interest for him (30 credits)'),
          intent: 'offer',
          requires: { minCredits: 30 },
          approval: { tae_o: 2, lin_yue: 1 },
          success: {
            text: t('수금원이 칩을 받고 장부에 줄 하나를 긋는다. “일주일.” 그들이 가고 나서야 소년이 상자 밖으로 나온다. “…갚을게. 진짜로.” 휴대폰 속 순찰표를 당신에게 보낸다.', 'The collector takes the chip and strikes a line in his ledger. “One week.” Only after they leave does the boy crawl out. “…I’ll pay you back. For real.” He sends you the photo of the patrol sheet.'),
            effects: [{ kind: 'credits', amount: -30 }, { kind: 'quest', id: 'q_schedule', stage: 2 }],
          },
        },
        {
          label: t('“알아서 숨어.”', '“Hide on your own.”'),
          intent: 'leave',
          approval: { tae_o: -1 },
          success: { text: t('소년이 가방 속으로 머리를 묻는다. 생선 냄새 속에서 작게 숨 쉬는 소리만 남는다.', 'The boy buries his head in the bag. In the fish stink, only small breathing is left.') },
        },
      ],
    },
  },
}

const PEDALS: DialogueDef = {
  id: 'd1lm_pedals',
  start: 'line',
  nodes: {
    line: {
      text: t(
        '고가도로 기둥 아래, 자전거 열두 대가 발전기에 묶여 있다. 페달을 밟는 사람은 넷, 빈 안장이 여덟. 페달이 느려질 때마다 시장 동쪽 등이 흐려진다. 기둥에는 철제 사다리가 고가도로 위로 이어진다.',
        'Under an overpass pillar, twelve bicycles are chained to a generator. Four people pedalling, eight empty saddles. Every time the pedals slow, the lamps on the east side of the market dim. An iron ladder runs up the pillar to the overpass deck.',
      ),
      options: [
        {
          label: t('빈 안장에 올라 한 시간 밟는다', 'Take an empty saddle for an hour'),
          intent: 'offer',
          check: { stat: 'str', dc: 11 },
          approval: { tae_o: 1 },
          success: {
            text: t('동쪽 등이 다시 환해진다. 옆 안장 아주머니가 말없이 보리차 보온병을 건넨다. 다리는 후들거리는데 몸은 데워졌다.', 'The east lamps brighten again. The woman on the next saddle silently hands you a flask of barley tea. Your legs shake, but you’re warm.'),
            effects: [{ kind: 'hp', amount: 6 }, { kind: 'trace', amount: -3 }],
          },
          failure: {
            text: t('이십 분 만에 종아리에 쥐가 난다. 안장에서 굴러떨어진다. 아주머니가 혀를 차며 당신 자리까지 두 대를 밟는다.', 'Twenty minutes in, your calf cramps. You tumble off the saddle. The woman clicks her tongue and pedals for two.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('고가도로 위에서 드론 경로를 본다', 'Watch the drone routes from the overpass'),
          intent: 'sneak',
          check: { stat: 'obs', dc: 12 },
          approval: { se_rin: 1 },
          success: {
            text: t('끊긴 고가도로 끝에 엎드린다. 붉은 불빛 셋이 같은 원을 돈다. 한 놈은 매번 세 번째 골목에서 돈다. 다음 싸움은 그놈이 꺾는 자리에서 시작하면 된다.', 'You lie flat at the broken end of the deck. Three red lights circle the same loop. One always turns at the third alley. Next fight, you start where it turns.'),
            effects: [{ kind: 'combat_mod', mod: 'intel' }],
          },
          failure: {
            text: t('녹슨 난간이 끼익 운다. 붉은 불빛 하나가 멈추고, 천천히 당신 쪽으로 돈다.', 'The rusted railing creaks. One red light stops, then slowly turns toward you.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('발전기 축전지 하나를 빼 간다', 'Pull one of the generator’s batteries'),
          intent: 'sneak',
          approval: { tae_o: -2, kai: -1 },
          success: {
            text: t('축전지를 빼자 시장 동쪽이 통째로 꺼진다. 어둠 속에서 페달 소리가 빨라진다. 아무도 당신 쪽을 보지 않는다. 볼 수가 없다.', 'You pull the battery and the whole east side of the market goes dark. In the dark the pedals speed up. Nobody looks your way. They can’t see.'),
            effects: [{ kind: 'consumable', id: 'emp_grenade' }, { kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('지나간다', 'Move on'),
          intent: 'leave',
          success: { text: t('페달 소리가 등 뒤로 멀어진다. 등불은 그래도 계속 돈다.', 'The pedalling fades behind you. The lamps keep turning anyway.') },
        },
      ],
    },
  },
}

export const D1_LAMP_MARKET_DIALOGUES: DialogueDef[] = [KU, DAL, MIN, PEDALS]

export const D1_LAMP_MARKET_NPCS: NpcDef[] = [
  { id: 'madam_ku', name: t('구 여사', 'Madam Ku'), role: t('순찰표를 파는 시장의 해결사', 'The market fixer who sells patrol schedules') },
  { id: 'kiosk_dal', name: t('달이', 'Dal'), role: t('IX 인가 복지 키오스크, 고장 난 미소', 'An IX-licensed welfare kiosk with a glitching smile') },
  { id: 'min_courier', name: t('민', 'Min'), role: t('빚쟁이를 피해 숨은 배달꾼', 'A courier hiding from his debt collectors') },
]
