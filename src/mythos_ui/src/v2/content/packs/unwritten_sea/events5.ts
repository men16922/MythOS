// Pack 5: Act 5 scenes of The Unwritten Sea.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SEA5_EVENTS: EventDef[] = [
  {
    id: 'sea5_ev_shift_knot',
    acts: [5],
    route: 'sea_5',
    title: t('둘이 묶던 매듭', 'A Knot for Two'),
    image: 'v2/events/sea5_ev_shift_knot.webp',
    gmHints: ['바지선 접안장의 계류줄', '없는 짝의 손을 기다리는 하역원 연숙', '교대표에서 빠진 이름'],
    text: t(
      '바지선 접안장에서 하역원 연숙이 계류줄을 당긴다. 매듭 절반을 묶은 손이 허공에서 멈춘다.\n회색 물이 장화를 적시자 연숙의 입에서 다른 사람의 휘파람이 나온다.\n“여기서 누가 받아 줬어요. 교대표에는 나 혼자라는데.”',
      'At the barge landing, Yeon-suk hauls a mooring line. Her hands stop halfway through the knot, waiting for another pair.\nGray water washes over her boots. She whistles a tune in a voice that startles her.\n“Someone took this end. The shift sheet says I worked alone.”',
    ),
    options: [
      {
        label: t('빈 쪽 줄을 받아 함께 당긴다', 'Take the loose end and haul'),
        hint: t('HP −3 · +40 ₵ · 회복력 +1', '−3 HP · +40 ₵ · Resilience +1'),
        check: { stat: 'str', dc: 8 },
        success: {
          text: t(
            '줄이 손바닥을 벗긴다. 매듭을 마친 연숙이 품삯을 나누고 빈 옆자리를 본다. 이번에는 손을 기다리지 않는다.',
            'The rope strips your palm. Yeon-suk finishes the knot and splits the pay. She looks at the space beside her, then lets go.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'credits', amount: 40 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '당기는 박자가 어긋나 줄에 끌려 무릎을 찧는다. 연숙이 줄을 발로 누른다. 둘이 처음부터 천천히 다시 묶는다.',
            'Your timing slips. The rope pulls you onto one knee. Yeon-suk pins it under her boot, and you start the knot again, slowly.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('구호소 자리를 사서 일행과 연숙을 들인다', 'Pay for shelter for Yeon-suk and your group'),
        hint: t('−30 ₵ · 일행 HP +6 · 인간성 +1', '−30 ₵ · party heals 6 HP · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '구호소에서 젖은 장화를 벗고 상처를 씻는다. 연숙은 마른 바닥에서도 그 휘파람을 한 번 더 불어 본다.',
            'Inside the shelter, you take off wet boots and clean your wounds. On the dry floor, Yeon-suk tries the whistle once more.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('젖은 줄을 걷어 작업대를 비운다', 'Clear the wet rope from the work platform'),
        hint: t('HP −2 · 인간성 +1 · +15 ₵', '−2 HP · Humanity +1 · +15 ₵'),
        success: {
          text: t(
            '젖은 줄을 걷다 손가락이 쓸린다. 연숙이 빈 작업대에 앉아 숨을 고른다. 휘파람이 멎자 둘이 나란히 줄을 정리한다.',
            'The wet rope scrapes your fingers. Yeon-suk sits on the cleared platform to catch her breath. When the whistle stops, you coil the line beside her.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_seam_allowance',
    acts: [5],
    route: 'sea_5',
    title: t('남겨 둔 시접', 'The Extra Seam'),
    image: 'v2/events/sea5_ev_seam_allowance.webp',
    gmHints: ['바지선 수선대의 작은 소매', '딸의 치수를 기억한 수선사', '고객 장부의 빈 가족란'],
    text: t(
      '바지선 수선대에서 미옥이 작은 소매를 뒤집는다. 가위가 난간에 부딪혀 짧게 운다.\n회색 물에 젖은 손가락이 자도 대지 않고 팔꿈치 자리를 짚는다. 고객 장부의 가족란은 비어 있다.\n“딸 팔이 여기서 굽었어요. 오늘 아침에야 생각났어요.”',
      'At a repair stall on a barge, Mi-ok turns a small sleeve inside out. Her scissors knock against the rail.\nHer fingers, wet with gray water, find the elbow without measuring. The family field in her customer ledger is blank.\n“My daughter bent her arm here. I only remembered this morning.”',
    ),
    options: [
      {
        label: t('소매를 원래 크기로 붙들어 준다', 'Hold the sleeve at its original size'),
        hint: t('HP −3 · 통찰 +2', '−3 HP · Insight +2'),
        success: {
          text: t(
            '흔들리는 수선대에 손을 짚다 바늘이 손가락을 꿴다. 미옥은 시접을 남겨 꿰맨다. 완성된 소매는 누구에게도 맞춰 보지 않는다.',
            'You brace the rocking table and catch the needle through a finger. Mi-ok sews with room left in the seam. She does not ask anyone to try it on.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'axis', axis: 'insight', amount: 2 },
          ],
        },
      },
      {
        label: t('본인 옷에 맞게 소매를 고쳐 달라고 한다', 'Ask her to fit the sleeve to your coat'),
        hint: t('추적 +4 · 카드 1장 제거 · 지배 +1', '+4 Trace · remove 1 card · Dominance +1'),
        success: {
          text: t(
            '미옥이 남는 천을 자른다. 당신은 젖어 달라붙던 장비 끈을 떼어 내고 새 소매를 입는다. 수선대 카메라가 치수를 저장한다.',
            'Mi-ok cuts away the extra cloth. You discard a sodden equipment strap and pull on the fitted sleeve. The stall camera saves your measurements.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_borrowed_name',
    acts: [5],
    route: 'sea_5',
    requires: { notFlag: 'sea_name_kept' },
    title: t('한 번만 불러 줘요', 'Say It Once'),
    image: 'v2/events/sea5_ev_borrowed_name.webp',
    gmHints: ['잠긴 버스 정류장의 잔류물', '입 모양이 먼저 생기는 이름', '도진이라는 이름을 받아 적는 손'],
    text: t(
      '잠긴 버스 정류장에 사람 모양의 잔류물이 앉아 있다. 물이 흔들릴 때마다 얼굴의 입 부분이 먼저 또렷해진다.\n당신 혀에 도진이라는 이름이 걸린다. 정류장 승객 기록에는 빈 줄 하나만 남아 있다.\n“한 번만 불러 줘요. 내 입으로는 끝이 안 나요.”',
      'A human-shaped Residue sits at the flooded bus stop. Whenever the water moves, its mouth becomes clear before the rest of its face.\nThe name Do-jin catches on your tongue. The passenger log has a single empty row.\n“Say it once. I can’t finish it myself.”',
    ),
    options: [
      {
        label: t('길 건너에서도 들리게 이름을 부른다', 'Call the name across the street'),
        hint: t('추적 +6 · 인간성 +2 · 이름 전달 기록', '+6 Trace · Humanity +2 · name kept'),
        success: {
          text: t(
            '도진이라고 부르자 윗집 창문이 열린다. 누군가 같은 이름을 되묻는다. 잔류물의 입이 닫히고 정류장 감시등이 당신을 향한다.',
            'You call Do-jin. An upstairs window opens, and someone repeats the name as a question. The Residue closes its mouth. The stop’s surveillance light turns toward you.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 2 },
            { kind: 'flag', key: 'sea_name_kept' },
          ],
        },
      },
      {
        label: t('물속에 손을 넣고 손바닥에 이름을 써 준다', 'Write the name on its palm underwater'),
        hint: t('HP −4 · 추적 −4 · 통찰 +1 · +15 ₵', '−4 HP · −4 Trace · Insight +1 · +15 ₵'),
        success: {
          text: t(
            '차가운 손을 잡자 모르는 아이에게 신발을 신기던 기억이 손목까지 밀려온다. 입을 다문 채 획을 마친다. 정류장 감시등은 빈 도로를 훑고 지나간다.',
            'Holding the cold hand brings a memory of putting shoes on a child you have never met. You finish the letters in silence. The surveillance light sweeps the empty road and moves on.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -4 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_tide_columns',
    acts: [5],
    route: 'sea_5',
    title: t('열한 번째 칸', 'The Eleventh Column'),
    image: 'v2/events/sea5_ev_tide_columns.webp',
    gmHints: ['방파제 계단의 조석표', '열 칸 밖에 적힌 열한 번째 필체', '지워진 측량원의 시간을 읽는 관리인'],
    text: t(
      '방파제 관리인이 조석표의 열 칸을 손톱으로 짚는다. 종이 바깥 여백에도 같은 간격으로 시각이 적혀 있다.\n회색 물이 계단을 때리자 관리인의 손이 여백으로 간다. 출근 기록에 없는 측량원의 서명이 손끝에서 완성된다.\n“이 사람 시계는 늘 칠 분 빨랐어요. 내가 그걸 어떻게 알지.”',
      'The breakwater attendant counts ten columns on a tide table with a fingernail. Times continue at the same intervals along the margin.\nGray water strikes the steps. His hand moves to the edge and completes the signature of a surveyor absent from the work records.\n“That one’s watch was always seven minutes fast. How do I know that?”',
    ),
    options: [
      {
        label: t('칠 분을 빼고 여백의 시각을 대조한다', 'Subtract seven minutes and compare the margin'),
        hint: t('추적 +3 · 카드 강화 1 · 통찰 +1', '+3 Trace · upgrade 1 · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '여백의 시각에만 낮은 계단이 드러난다. 당신은 이동 순서를 고쳐 적는다. 관리인이 켠 작업등 때문에 방파제 카메라도 깨어난다.',
            'The lower steps emerge only at the times in the margin. You revise your movement sequence. The attendant’s work light wakes the breakwater camera.',
          ),
          effects: [
            { kind: 'trace', amount: 3 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '칠 분을 두 번 뺀다. 내려선 계단으로 물이 들이쳐 발목을 꺾는다. 관리인이 당신을 끌어 올린 뒤 틀린 시각에 동그라미를 친다.',
            'You subtract the seven minutes twice. Water hits the step beneath you and twists your ankle. The attendant pulls you up, then circles the wrong time.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('관리인의 덮개 달린 운반차를 빌린다', 'Hire the attendant’s covered transport'),
        hint: t('−40 ₵ · 추적 −5', '−40 ₵ · −5 Trace'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '덮개 아래로 들어가자 관리인이 시동을 건다. 엔진 소리에 맞춰 처음 듣는 이름을 중얼거린다. 차는 감시대 아래 정비길로 빠진다.',
            'You get beneath the cover. As the engine starts, the attendant murmurs an unfamiliar name in time with its rattle. He takes the service road below the surveillance posts.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'trace', amount: -5 },
          ],
        },
      },
      {
        label: t('작업등을 가리고 계단을 직접 살핀다', 'Shield the work light and inspect the steps'),
        hint: t('HP −2 · 추적 −2 · +10 ₵', '−2 HP · −2 Trace · +10 ₵'),
        success: {
          text: t(
            '작업등 앞에 몸을 세우고 낮은 계단을 더듬는다. 거친 모서리에 손이 벗겨진다. 카메라가 어두워진 계단을 지나치는 동안 관리인은 여백을 접지 않는다.',
            'You shield the work light and feel along the lower steps. A rough edge skins your hand. The camera passes over the dark stairs. The attendant keeps the margin unfolded.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'trace', amount: -2 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_broken_handle',
    acts: [5],
    route: 'sea_5',
    title: t('아버지 쪽 손잡이', 'His Father’s Handle'),
    image: 'v2/events/sea5_ev_broken_handle.webp',
    gmHints: ['경사로에서 걸린 손수레', '아버지 목소리로 욕하는 하역원 현태', '가족 증명서의 빈칸'],
    text: t(
      '하역원 현태가 경사로에 걸린 손수레를 발로 막는다. 부러진 손잡이 끝이 판자를 긁는다.\n회색 물을 뒤집어쓴 현태가 늙은 목소리로 욕을 한다. 품에서 떨어진 가족 증명서에는 아버지 칸이 비어 있다.\n“욕까지 기억났는데 얼굴이 안 나와요. 저쪽 손잡이 좀 잡아 줘요.”',
      'Hyeon-tae braces a handcart on the loading ramp with his foot. Its broken handle scrapes the boards.\nAfter a splash of gray water, he swears in an old man’s voice. The family certificate that falls from his pocket has no father listed.\n“I remember how he swore. Still can’t see his face. Take that handle, will you?”',
    ),
    options: [
      {
        label: t('부러진 쪽을 어깨로 받쳐 밀어 올린다', 'Shoulder the broken side and push'),
        hint: t('HP −4 · +50 ₵ · 회복력 +1', '−4 HP · +50 ₵ · Resilience +1'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t(
            '나무 끝이 어깨를 파고든다. 꼭대기에 오른 현태가 운반료를 나눈다. 입을 열었다가 자기 목소리인지 확인하고 고맙다고 말한다.',
            'The broken wood digs into your shoulder. At the top, Hyeon-tae splits the delivery fee. He checks the sound of his own voice before thanking you.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'credits', amount: 50 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '바퀴가 판자 틈으로 빠지며 수레가 정강이를 친다. 현태가 짐을 하나씩 내린다. 욕은 멎고 숨 고르는 소리만 남는다.',
            'A wheel drops between the boards and the cart strikes your shin. Hyeon-tae unloads it piece by piece. The swearing stops; you hear him catching his breath.',
          ),
          effects: [
            { kind: 'hp', amount: -7 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('대체 수레 값을 보태고 예비 보급품을 받는다', 'Help rent another cart and take a spare supply'),
        hint: t('−30 ₵ · 소모품 1개 · 인간성 +1', '−30 ₵ · 1 consumable · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '현태가 새 수레로 짐을 옮기고 예비 보급품을 건넨다. 부러진 손잡이는 버리지 않고 짐 위에 눕힌다.',
            'Hyeon-tae transfers the load and gives you a spare supply. He lays the broken handle on top instead of throwing it away.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('짐을 나눠 들고 경사로를 여러 번 오른다', 'Carry the load up the ramp in smaller trips'),
        hint: t('HP −2 · 인간성 +1 · +15 ₵', '−2 HP · Humanity +1 · +15 ₵'),
        success: {
          text: t(
            '작은 짐도 여러 번 들면 팔이 저린다. 현태가 빈 수레를 밀어 올리고 부러진 손잡이를 챙긴다. 마지막 짐은 둘이 하나씩 나눠 든다.',
            'Even the small loads leave your arms aching after several trips. Hyeon-tae pushes up the empty cart and saves the broken handle. You split the last load between you.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_bottle_seller',
    acts: [5],
    route: 'sea_5',
    title: t('여기서 뜬 것', 'Drawn Here'),
    image: 'v2/events/sea5_ev_bottle_seller.webp',
    gmHints: ['바지선 시장의 병 파는 노인', '마개 아래에서 움직이는 회색 물', '손님 이름만 비어 있는 거래 장부'],
    text: t(
      '바지선 시장에서 낯익은 노인이 병 하나를 햇빛에 든다. 마개 아래 회색 물이 탁탁 소리를 낸다.\n노인이 병을 기울이자 당신 입에 모르는 사람의 단골 주문이 떠오른다. 거래 장부에는 금액만 있고 손님 이름은 없다.\n“그 병, 여기서 뜬 거라네. 이번에는 뚜껑 열지 말고 보게.”',
      'At the barge market, the familiar old seller holds a bottle to the light. Gray water taps beneath its stopper.\nAs he tilts it, you nearly order a stranger’s usual drink. His sales ledger records prices but no customer names.\n“That bottle came from here. Keep the stopper in this time.”',
    ),
    options: [
      {
        label: t('감별료를 내고 물이 두드리는 간격을 읽는다', 'Pay to study the rhythm of the tapping'),
        hint: t('−30 ₵ · 고급 카드 선택 · 통찰 +1', '−30 ₵ · uncommon card pick · Insight +1'),
        requires: { minCredits: 30 },
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t(
            '두 번 짧게, 한 번 길게. 당신 손이 모르는 작업장의 비상 절차를 따라 움직인다. 노인은 당신이 손을 멈출 때까지 기다린다.',
            'Two short taps, one long. Your hands follow an emergency procedure from a workshop you have never entered. The seller waits until they stop.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'card_choice', rarity: 'uncommon', count: 3 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '간격을 세다 낯선 주소를 큰 소리로 말한다. 시장 감시기가 주소와 당신 얼굴을 함께 저장한다. 노인이 천으로 물빛을 가린다.',
            'While counting, you say an unfamiliar address aloud. The market scanner saves it with your face. The seller covers the glass with a cloth.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'trace', amount: 4 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('덮개 친 휴식 자리를 빌린다', 'Rent a place beneath the awning'),
        hint: t('−20 ₵ · 일행 HP +5 · 인간성 +1', '−20 ₵ · party heals 5 HP · Humanity +1'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '노인이 물건을 안쪽으로 밀어 자리를 만든다. 일행이 상처를 말리는 동안 노인은 장부의 빈 이름 칸마다 손가락을 잠깐씩 댄다.',
            'The seller moves his stock aside. While your group dries its dressings, he rests a finger briefly on each empty name in the ledger.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 5 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('병을 옮기는 동안 마개를 붙들어 준다', 'Hold the stoppers while he moves the bottles'),
        hint: t('HP −2 · 인간성 +1', '−2 HP · Humanity +1'),
        success: {
          text: t(
            '마개를 누른 손에 병목이 파고든다. 노인이 병을 그늘로 옮긴다. 마지막 병을 내려놓을 때 당신 입에서 나오려던 주문도 잦아든다.',
            'The bottle necks dig into your hands as you hold the stoppers. The seller moves them into shade. By the last bottle, the stranger’s order has faded from your mouth.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('장부에 당신 이름을 적고 빈칸을 살핀다', 'Sign the ledger and study the empty names'),
        hint: t('추적 +3 · 통찰 +1 · +10 ₵', '+3 Trace · Insight +1 · +10 ₵'),
        success: {
          text: t(
            '당신 이름 옆에도 같은 간격의 빈칸이 생긴다. 거래 단말기가 서명을 읽는 동안 노인은 장부를 넘기지 않는다. 당신은 병을 사지 않고 손을 뗀다.',
            'An empty space of the same width appears beside your name. The sales terminal reads your signature. The seller holds the page still as you withdraw your hand without buying.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_empty_stall',
    acts: [5],
    route: 'sea_5',
    title: t('지난달의 본인', 'Last Month’s You'),
    image: 'v2/events/sea5_ev_empty_stall.webp',
    gmHints: ['시장 임대료 단말기', '남의 장사 기억이 돌아온 생선 상인', '존재하지 않는 전 임차인에게 붙은 연체료'],
    text: t(
      '생선 상인 복남이 임대료 단말기에 얼굴을 댄다. 회색 물에 젖은 앞치마에서 모르는 장사꾼의 흥정 말투가 튀어나온다.\n단말기가 같은 얼굴을 두 번 찍고 두 달 치 임대료를 띄운다. 전 임차인의 이름 칸은 비어 있다.\n“그 사람이 나였으면 보증금도 내놔야지. 월세만 나예요?”',
      'Bok-nam leans into the rent terminal’s face scanner. From his tide-soaked apron comes a patter of bargaining he has never used.\nThe terminal scans him twice and charges two months’ rent. The former tenant’s name is blank.\n“If that was me, where’s my deposit? I’m only me when rent’s due?”',
    ),
    options: [
      {
        label: t('당신 계좌로 전 임차인의 보증금을 청구한다', 'Claim the former tenant’s deposit through your account'),
        hint: t('+40 ₵ · 추적 +7 · 지배 +1', '+40 ₵ · +7 Trace · Dominance +1'),
        success: {
          text: t(
            '대리 수령을 누르자 보증금 일부가 들어온다. 단말기가 당신에게도 임차인 번호를 준다. 복남은 화면을 보고 자기 얼굴을 손으로 가린다.',
            'You select collection by proxy and receive part of the deposit. The terminal issues you a tenant number too. Bok-nam covers his face with both hands.',
          ),
          effects: [
            { kind: 'credits', amount: 40 },
            { kind: 'trace', amount: 7 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
      {
        label: t('스캐너를 떼어 안쪽으로 돌려 놓는다', 'Unbolt the scanner and turn it inward'),
        hint: t('HP −3 · 추적 −4 · 인간성 +1', '−3 HP · −4 Trace · Humanity +1'),
        success: {
          text: t(
            '뜨거운 고정쇠가 손을 데운다. 스캐너가 제 화면을 찍고 신규 임차인 심사를 시작한다. 복남이 소리 없이 웃는 동안 당신은 뒤편으로 빠진다.',
            'The hot bracket burns your hand. The scanner captures its own screen and begins assessing a new tenant. Bok-nam laughs silently as you slip out behind the stall.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -4 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_buoy_hand',
    acts: [5],
    route: 'sea_5',
    title: t('손을 펴는 순서', 'How the Hand Opens'),
    image: 'v2/events/sea5_ev_buoy_hand.webp',
    gmHints: ['방파제 아래 항로 표지 부표', '잠수 경력이 없는 정비공의 수신호', '명부에 없는 잠수사의 구조 손짓'],
    text: t(
      '정비공이 항로 표지 부표에 걸린 밧줄을 풀려 한다. 금속 외피 안에서 구조용 손가락이 차례로 펴진다.\n회색 물이 튈 때마다 정비공도 같은 손짓을 한다. 잠수사 명부에는 그 손짓을 가르친 사람이 없다.\n“나 수영도 못해요. 그런데 저게 숨 남았냐고 묻는 건 알아요.”',
      'A mechanic works at a rope caught on a navigation buoy. Rescue fingers unfold one by one from its metal casing.\nEach splash of gray water makes her repeat the gesture. No one in the diver roster is listed as having taught her.\n“I can’t even swim. But I know it’s asking how much air we have.”',
    ),
    options: [
      {
        label: t('손가락이 접히는 틈에 밧줄을 빼낸다', 'Pull the rope free between movements'),
        hint: t('HP −3 · 소모품 1 · 회복력 +1', '−3 HP · 1 consumable · Resilience +1'),
        check: { stat: 'agi', dc: 9 },
        success: {
          text: t(
            '밧줄이 빠지며 손등을 쓸어 간다. 구조함이 열리고 정비공이 안의 보급품을 건넨다. 금속 손이 이제 천천히 오므라든다.',
            'The freed rope scrapes your hand. A rescue compartment opens, and the mechanic passes you its supply. The metal fingers close slowly.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '손이 닫히는 박자를 잘못 읽어 손목이 끼인다. 정비공이 양손으로 벌려 준다. 빠져나온 당신 손가락이 저절로 구조 요청을 보낸다.',
            'You misread the closing rhythm and trap your wrist. The mechanic prises the fingers apart. Once free, your own hand makes the distress gesture.',
          ),
          effects: [
            { kind: 'hp', amount: -7 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('정비공에게 비용을 내고 낮은 점검길로 안내받는다', 'Pay the mechanic to guide you along the inspection path'),
        hint: t('−30 ₵ · 추적 −5', '−30 ₵ · −5 Trace'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '정비공은 물에 손을 대지 않고 난간만 잡는다. 감시등 아래로 지나가는 동안에도 다른 손은 남은 숨을 표시한다.',
            'The mechanic keeps to the rail, clear of the water. Below the surveillance lights, her free hand continues showing how much air remains.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'trace', amount: -5 },
          ],
        },
      },
      {
        label: t('난간을 짚고 구조 손짓을 끝까지 따라 한다', 'Hold the rail and repeat the rescue gestures'),
        hint: t('HP −2 · 통찰 +1 · +15 ₵', '−2 HP · Insight +1 · +15 ₵'),
        success: {
          text: t(
            '차가운 난간을 오래 쥐자 손마디가 쑤신다. 정비공과 당신이 남은 숨을 표시한다. 금속 손은 밧줄에 걸린 채 같은 손짓을 돌려준다.',
            'Your knuckles ache around the cold rail. You and the mechanic signal the air remaining. Still caught in the rope, the metal hand returns the gesture.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_room_203',
    acts: [5],
    route: 'sea_5',
    requires: { notFlag: 'sea_room_kept' },
    title: t('안쪽에서 여는 문', 'Opened from Inside'),
    image: 'v2/events/sea5_ev_room_203.webp',
    gmHints: ['홀로 들어간 매립지 주택 203호', '가구 자리가 남은 먼지', '존재하지 않는 거주자의 문 여는 버릇'],
    text: t(
      '당신 혼자 매립지 주택의 203호에 들어선다. 빈방에 물이 차오르고 천장에서 물방울이 떨어진다.\n젖은 문고리를 잡자 안쪽에서 문을 열던 손목의 버릇이 떠오른다. 거주 기록에는 아무도 없다.\n“한 번 더.” 당신은 눈을 감고 손목을 같은 방향으로 돌린다.',
      'You enter Room 203 alone. Water rises across the bare floor. A drop falls from the ceiling.\nThe wet handle brings back the wrist movement of someone opening this door from inside. The occupancy record names no one.\n“Once more.” You close your eyes and turn your wrist the same way.',
    ),
    options: [
      {
        label: t('물속에 서서 손목이 기억하는 동작을 끝낸다', 'Stay in the water and finish the remembered movement'),
        hint: t('HP −4 · 통찰 +2 · 방의 기억 보존', '−4 HP · Insight +2 · keep room memory'),
        success: {
          text: t(
            '남의 관절통이 팔꿈치까지 올라온다. 당신은 문을 조금 열고 문턱을 손끝으로 두 번 두드린다. 누군가 늘 하던 귀가 인사다.',
            'Someone else’s joint pain climbs to your elbow. You open the door a little and tap the threshold twice. It was someone’s way of announcing they were home.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'axis', axis: 'insight', amount: 2 },
            { kind: 'flag', key: 'sea_room_kept' },
          ],
        },
      },
      {
        label: t('건물 단말기의 세척 절차로 손의 버릇을 지운다', 'Use the building terminal’s cleansing routine'),
        hint: t('추적 +4 · 카드 1장 제거 · 지배 +1', '+4 Trace · remove 1 card · Dominance +1'),
        success: {
          text: t(
            '찬 세척액이 손을 훑는다. 낯선 동작과 함께 굳어 있던 전투 버릇 하나가 풀린다. 단말기에 방문자 얼굴이 남고 문고리는 평범하게 차갑다.',
            'Cold cleansing fluid runs over your hand. The unfamiliar movement loosens along with one ingrained combat habit. The terminal keeps your face. The handle feels only cold.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_name_called',
    acts: [5],
    route: 'sea_5',
    requires: { flag: 'sea_name_kept' },
    title: t('창문에서 내려온 사람', 'The Person at the Window'),
    image: 'v2/events/sea5_ev_name_called.webp',
    gmHints: ['도진이라는 이름을 들은 그물 수선공', '남편의 매듭을 기억하는 손', '혼인 기록의 빈 배우자 칸'],
    text: t(
      '그물 수선공이 위층에서 내려와 당신 소매를 잡는다. 손에서는 아직 그물바늘이 딸깍거린다.\n회색 물이 닿은 뒤부터 남편의 매듭이 생각났다고 한다. 내민 혼인 기록에는 배우자 칸이 비어 있다.\n“아까 도진이라고 부른 사람 맞죠. 어떻게 대답했어요?”',
      'A net mender comes down from an upstairs room and catches your sleeve. Her netting needle clicks between her fingers.\nSince touching the gray water, she has remembered her husband’s knots. The marriage record she holds has an empty spouse field.\n“You called Do-jin earlier. Did he answer?”',
    ),
    options: [
      {
        label: t('들은 말만 전하고 함께 정류장을 찾는다', 'Tell her exactly what you heard and return together'),
        hint: t('추적 +4 · 일행 HP +8 · 인간성 +1', '+4 Trace · party +8 HP · Humanity +1'),
        check: { stat: 'cha', dc: 9 },
        success: {
          text: t(
            '수선공은 당신이 흉내 내지 않은 목소리를 끝까지 듣는다. 정류장에서 돌아와 일행의 상처를 감아 준다. 함께 걸은 모습은 거리 카메라에 남는다.',
            'She listens without asking you to imitate his voice. After the visit, she dresses your group’s wounds. Street cameras retain the walk you took together.',
          ),
          effects: [
            { kind: 'trace', amount: 4 },
            { kind: 'heal_party', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '당신 설명이 끝나기 전에 수선공이 물 쪽으로 달린다. 붙잡다 계단에서 함께 넘어진다. 당신은 무릎을 누르면서도 그 손을 놓지 않는다.',
            'She runs toward the water before your explanation is finished. You catch her and fall together on the steps. Holding your knee, you keep hold of her hand.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('위치를 알려 주고 물이 닿지 않는 담길로 떠난다', 'Give her the location and leave by the dry wall'),
        hint: t('HP −3 · 추적 −5 · 회복력 +1 · +10 ₵', '−3 HP · −5 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '수선공이 위치를 되뇌며 그물바늘을 챙긴다. 당신은 거친 담을 넘어 손바닥을 긁힌다. 감시등은 정류장으로 가는 길을 비춘다.',
            'She repeats the location and puts away her needle. You scrape your palms climbing the rough wall. The surveillance lights stay on the route to the bus stop.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -5 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_salt_palms',
    acts: [5],
    route: 'sea_5',
    title: t('손금에 남은 간', 'Salt in the Creases'),
    image: 'v2/events/sea5_ev_salt_palms.webp',
    gmHints: ['바지선 식당의 소금 결정', '없어진 조리장의 간을 기억한 주방장', '덮어 둔 주방 화상'],
    text: t(
      '바지선 식당 주방장이 손금에 낀 소금 결정을 턴다. 철판에서 반죽 굽는 소리가 난다.\n회색 물에 닿은 뒤부터 주방장은 장부에 없는 조리장의 간을 맞춘다. 자기 손에는 없는 화상을 자꾸 문지른다.\n“그 사람은 이 손으로 맛을 봤어요. 어느 손이었는지 좀 봐 줘요.”',
      'The barge cook brushes salt crystals from the creases of his palm. Batter hisses on the griddle.\nSince touching the gray water, he has seasoned food like a cook absent from the payroll. He keeps rubbing a burn his own hand does not have.\n“That cook tasted from one hand. Watch me. Tell me which.”',
    ),
    options: [
      {
        label: t('재료비를 보태고 두 손의 동작을 비교한다', 'Pay for ingredients and compare his hands'),
        hint: t('−20 ₵ · 일행 HP +10 · 통찰 +1', '−20 ₵ · party +10 HP · Insight +1'),
        requires: { minCredits: 20 },
        check: { stat: 'obs', dc: 8 },
        success: {
          text: t(
            '오른손이 뜨거운 철판을 피하는 순간 왼손이 간을 본다. 주방장은 당신이 산 재료로 일행 몫까지 굽는다. 마지막 한 장은 빈 접시에 놓는다.',
            'His right hand avoids the hot griddle while the left tests the seasoning. He cooks your ingredients for the whole group. The last portion goes onto an empty plate.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'heal_party', amount: 10 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '손을 따라가다 뜨거운 기름을 팔에 맞는다. 주방장이 불을 끄고 당신 팔을 식힌다. 재료를 사기 전에 어느 손이 떨렸는지 다시 짚는다.',
            'Following his hands, you catch hot oil on your arm. He shuts off the heat and cools the burn. Before buying ingredients, you work out which hand shook.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('판매 단말기에 낯선 조리법을 대신 등록한다', 'Register the unfamiliar recipe at the sales terminal'),
        hint: t('+30 ₵ · 추적 +5 · 지배 +1', '+30 ₵ · +5 Trace · Dominance +1'),
        success: {
          text: t(
            '단말기는 원작자 칸을 비워 둔 채 대리 등록료를 지급한다. 주방장은 화면보다 자기 손을 오래 본다. 등록인의 위치가 당신 이름 아래 붙는다.',
            'The terminal pays a registration fee with the original cook’s name left blank. The cook studies his hands longer than the screen. Your location is attached to the filing.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'trace', amount: 5 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
      {
        label: t('철판을 닦으며 두 손의 움직임을 지켜본다', 'Clean the griddle and watch both hands'),
        hint: t('HP −2 · 통찰 +1', '−2 HP · Insight +1'),
        success: {
          text: t(
            '철판을 닦던 손에 열이 오른다. 주방장이 불을 줄이고 왼손을 펼친다. 당신이 같은 손을 펴 보이자 그는 없는 화상을 문지르다 멈춘다.',
            'Heat seeps into your hand as you clean the griddle. The cook lowers the flame and opens his left palm. You open yours. He stops rubbing the burn that is not there.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_doorway_line',
    acts: [5],
    route: 'sea_5',
    title: t('같이 들어갈 사람', 'One More to Admit'),
    image: 'v2/events/sea5_ev_doorway_line.webp',
    gmHints: ['매립지 대피소의 출입선', '동생 손을 기억하는 주민', '사람 수를 하나 적게 세는 문'],
    text: t(
      '대피소 문 앞에서 주민 하나가 빈손을 뒤로 뻗는다. 회색 물에서 작은 사람의 형상이 손을 따라 올라온다.\n출입 계수기는 한 명만 센다. 주민이 젖은 소매를 걷자 모르는 아이의 손자국이 남아 있다.\n“동생 손이에요. 집에는 외동이라고 적혀 있어도 이건 알아요.”',
      'At the shelter door, a resident reaches an empty hand behind her. A small human shape rises from the gray water to meet it.\nThe entry counter registers one person. She rolls back her wet sleeve, showing the prints of a child’s fingers.\n“My little brother. The household record says I’m an only child. I know his hand.”',
    ),
    options: [
      {
        label: t('당신 신원으로 둘의 입소를 보증한다', 'Use your identity to vouch for both'),
        hint: t('추적 +8 · 인간성 +2', '+8 Trace · Humanity +2'),
        success: {
          text: t(
            '계수기가 당신 얼굴을 오래 훑은 뒤 문을 연다. 주민이 빈 공간만큼 옆으로 비켜 들어간다. 안쪽 바닥에 작은 젖은 발자국이 이어진다.',
            'The counter scans your face for a long time before opening the door. She leaves room beside her as she enters. Small wet footprints continue across the floor inside.',
          ),
          effects: [
            { kind: 'trace', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 2 },
          ],
        },
      },
      {
        label: t('주민만 들이고 바깥에서 차수문을 내린다', 'Admit the resident and lower the flood door outside'),
        hint: t('HP −3 · 추적 −6 · 회복력 +1 · +10 ₵', '−3 HP · −6 Trace · Resilience +1 · +10 ₵'),
        success: {
          text: t(
            '무거운 손잡이가 손목을 비튼다. 문이 내려오며 바깥 카메라도 가린다. 철판 안쪽에서 주민이 손바닥으로 같은 높이를 두드린다.',
            'The heavy handle twists your wrist. The lowered door covers the outside camera. From within, she taps the steel at the height where she held the small hand.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_crane_hook',
    acts: [5],
    route: 'sea_5',
    title: t('내려놓는 쪽', 'The Lowering Lever'),
    image: 'v2/events/sea5_ev_crane_hook.webp',
    gmHints: ['시장 인양대의 녹슨 크레인 후크', '지워진 기사와 몸이 바뀐 듯한 정비사', '손에서 떨어지지 않는 하강 레버'],
    text: t(
      '시장 인양대에서 녹슨 크레인 후크가 턱 높이로 흔들린다. 정비사가 하강 레버를 놓지 못한다.\n회색 물을 밟은 뒤 정비사의 손은 폐기된 기종의 조작법을 따른다. 운전석 명패에는 이름을 긁어낸 자국이 있다.\n“이 손은 내려놓는 쪽을 알아요. 내 쪽이 못 따라가요.”',
      'A rusty crane hook swings at chin height over the market hoist. The mechanic cannot let go of the lowering lever.\nSince stepping in gray water, his hands have followed the controls of a retired model. A name has been scraped from the cab plate.\n“These hands know how to set it down. The rest of me can’t keep up.”',
    ),
    options: [
      {
        label: t('인양줄을 받치고 레버를 함께 내린다', 'Brace the hoist line and lower the lever with him'),
        hint: t('HP −4 · 카드 강화 1 · 회복력 +1', '−4 HP · upgrade 1 · Resilience +1'),
        check: { stat: 'str', dc: 9 },
        success: {
          text: t(
            '줄의 무게가 등을 누른다. 정비사와 당신이 같은 순간 힘을 빼자 짐이 반듯하게 내려앉는다. 당신은 그 짧은 힘 조절을 몸에 남긴다.',
            'The line bears down on your back. You and the mechanic ease off together, setting the load squarely down. You retain that brief control of force.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '서로 다른 순간에 힘을 빼서 인양줄이 당신을 옆으로 내친다. 정비사가 비상 정지를 밟는다. 멈춘 뒤에야 둘의 손이 같은 자세가 된다.',
            'You ease off at different moments, and the line throws you sideways. The mechanic stamps on the emergency stop. Only then do both sets of hands settle into the same position.',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('철거비를 내고 구형 보조 임플란트를 인수한다', 'Pay for dismantling and take the old assist implant'),
        hint: t('−50 ₵ · 고급 임플란트 1개 · 통찰 +1', '−50 ₵ · 1 uncommon implant · Insight +1'),
        requires: { minCredits: 50 },
        success: {
          text: t(
            '정비사가 전원을 끊고 좌석 아래 보조 장치를 분리한다. 당신에게 장치를 건넨 뒤에도 빈 레버를 향해 손가락을 조금씩 편다.',
            'The mechanic cuts the power and removes the assist unit beneath the seat. After handing it over, he keeps uncurling his fingers toward the empty lever.',
          ),
          effects: [
            { kind: 'credits', amount: -50 },
            { kind: 'implant', rarity: 'uncommon' },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('전원을 끊고 짐 아래 받침을 밀어 넣는다', 'Cut the power and wedge supports under the load'),
        hint: t('HP −2 · 회복력 +1 · +15 ₵', '−2 HP · Resilience +1 · +15 ₵'),
        success: {
          text: t(
            '받침을 밀던 손등이 바닥에 긁힌다. 정비사가 전원 꺼진 레버에서 손을 뗀다. 짐은 받침 위에 머물고 그는 빈손을 무릎에 올린다.',
            'The deck scrapes your knuckles as you push in the supports. The mechanic lets go of the dead lever. The load rests on the wedges. He lays his empty hands on his knees.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_wet_roll',
    acts: [5],
    route: 'sea_5',
    title: t('대답 없는 출석', 'Taking Attendance'),
    image: 'v2/events/sea5_ev_wet_roll.webp',
    gmHints: ['대피 교실의 젖은 명단', '교사가 아니었던 학교 서무', '빈 줄에서 떠오르는 학생의 목소리'],
    text: t(
      '대피 교실에서 학교 서무가 젖은 명단을 책상에 편다. 종이를 누르는 손마다 물이 배어 나온다.\n빈 줄을 짚을 때마다 서무의 입에서 서로 다른 아이 목소리가 난다. 교직 기록에는 수업을 맡은 적이 없다.\n“이름은 못 읽겠는데 누가 결석했는지는 알겠어요.”',
      'In a classroom used as a shelter, the school clerk spreads a wet attendance sheet across a desk. Water seeps out beneath each pressing hand.\nAt every blank row, a different child’s voice comes from her mouth. Her employment record says she never taught.\n“I can’t read the names. I know who was absent.”',
    ),
    options: [
      {
        label: t('목소리와 빈 줄의 순서를 맞춘다', 'Match the voices to the empty rows'),
        hint: t('추적 +5 · 카드 제거 1 · 통찰 +1', '+5 Trace · remove 1 card · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '결석한 줄에서는 목소리가 나지 않는다. 당신은 그 침묵에 맞춰 머릿속에서 겹치던 동작 하나를 내려놓는다. 켜 둔 출석 단말기가 당신 참여를 기록한다.',
            'The absent pupil’s row makes no sound. In that silence, you release one movement that kept repeating in your head. The attendance terminal logs your participation.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '두 목소리를 같은 줄에 놓자 숨 쉬는 박자까지 겹친다. 당신은 책상 모서리를 붙잡고 기침한다. 서무가 종이를 덮을 때까지 손을 떼지 않는다.',
            'You place two voices on the same row, and even their breathing overlaps. You grip the desk and cough, holding on until the clerk covers the sheet.',
          ),
          effects: [
            { kind: 'hp', amount: -6 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('신원을 남기고 교실을 일행의 회복실로 쓴다', 'Sign in and use the classroom as a recovery room'),
        hint: t('추적 +5 · 일행 HP +6 · 인간성 +1', '+5 Trace · party heals 6 HP · Humanity +1'),
        success: {
          text: t(
            '일행이 책상을 붙여 앉는다. 서무가 깨끗한 붕대를 나눠 주면서 자리마다 다른 아이 이름을 부른다. 당신은 고쳐 부르지 않는다.',
            'Your group draws the desks together. The clerk hands out clean bandages, addressing each seat by a different child’s name. You let her finish.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'heal_party', amount: 6 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_foghorn_breath',
    acts: [5],
    route: 'sea_5',
    title: t('남아 있는 숨', 'The Breath Left'),
    image: 'v2/events/sea5_ev_foghorn_breath.webp',
    gmHints: ['방파제 무적의 막힌 밸브', '가수의 숨을 기억한 야간 당직자', '당직 기록에 없는 이중창'],
    text: t(
      '야간 당직자가 무적의 밸브를 연다. 나팔에서는 바람 새는 소리만 난다.\n회색 물이 발판을 덮자 당직자의 숨이 길어진다. 노래를 배운 적 없는 입에서 당직 기록에 없는 사람의 화음이 붙는다.\n“혼자 불렀다고 적혀 있어요. 그런데 내 숨으로는 저 끝까지 못 가요.”',
      'The night attendant opens the foghorn valve. Only escaping air comes out.\nGray water covers the platform, and his breath lengthens. Though he never learned to sing, his voice takes the harmony of someone absent from the duty records.\n“It says I sounded it alone. My lungs can’t reach the end.”',
    ),
    options: [
      {
        label: t('숨을 나눠 쉬며 마지막 구절까지 받아 준다', 'Alternate breaths and carry the final phrase'),
        hint: t('추적 +5 · 고급 카드 선택 · 인간성 +1', '+5 Trace · uncommon card pick · Humanity +1'),
        check: { stat: 'cha', dc: 8 },
        success: {
          text: t(
            '당직자가 들이쉴 때 당신이 소리를 잇는다. 낯선 사람이 쓰던 호흡법이 몸에 붙는다. 방파제 감시기가 두 목소리 중 당신 것을 골라낸다.',
            'You carry the sound while the attendant inhales. A stranger’s breathing technique settles into your body. The breakwater monitor picks your voice out of the pair.',
          ),
          effects: [
            { kind: 'trace', amount: 5 },
            { kind: 'card_choice', rarity: 'uncommon', count: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '남의 긴 숨을 따라가다 가슴이 조인다. 당신은 난간을 잡고 짧게 숨을 나눈다. 당직자도 당신 박자에 맞춰 마지막 구절을 포기한다.',
            'Trying to follow the borrowed breath tightens your chest. You grip the rail and take short breaths. The attendant matches you and leaves the last phrase unfinished.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('밸브를 잠가 소리와 감시를 함께 끊는다', 'Close the valve and silence the monitoring circuit'),
        hint: t('HP −3 · 추적 −5 · 지배 +1 · +10 ₵', '−3 HP · −5 Trace · Dominance +1 · +10 ₵'),
        success: {
          text: t(
            '굳은 밸브를 돌리다 손목이 삔다. 바람 소리와 감시등이 함께 멎는다. 당직자는 소리가 사라진 뒤에도 입을 한 번 더 움직인다.',
            'The stiff valve sprains your wrist. The hiss stops with the monitoring light. The attendant’s mouth moves once more after the sound is gone.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'hp', amount: -3 },
            { kind: 'trace', amount: -5 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_other_key',
    acts: [5],
    route: 'sea_5',
    requires: { flag: 'sea_room_kept' },
    title: t('두 번 두드리면', 'Two Taps'),
    image: 'v2/events/sea5_ev_other_key.webp',
    gmHints: ['203호 인사를 알아들은 배관공', '배관을 타고 들리던 귀가 소리', '삭제된 세대의 비상 보관함'],
    text: t(
      '배관공이 당신 손목을 보고 자기 작업함을 두 번 두드린다. 203호에서 익힌 동작과 같은 간격이다.\n회색 물이 찬 배관을 고친 뒤부터 매일 듣던 귀가 소리가 생각났다고 한다. 건물 배치도에는 그 세대가 없다.\n“그렇게 두드리면 내가 열어 줬어요. 비상 보관함이 아직 있어요.”',
      'A plumber watches your wrist, then taps her tool case twice. It is the interval you learned in Room 203.\nSince repairing a pipe full of gray water, she remembers hearing that return home every day. The building plan omits the household.\n“I used to open up when I heard that. Their emergency locker’s still here.”',
    ),
    options: [
      {
        label: t('해체 비용을 내고 안에 남은 기억을 정리한다', 'Pay to open the locker and sort what remains'),
        hint: t('−40 ₵ · 카드 1장 제거 · 통찰 +1', '−40 ₵ · remove 1 card · Insight +1'),
        requires: { minCredits: 40 },
        success: {
          text: t(
            '배관공이 굳은 문짝을 떼어 낸다. 당신은 안에 남은 손자국을 짚으며 자기 동작과 남의 동작을 가른다. 필요 없는 버릇 하나가 떨어져 나간다.',
            'The plumber removes the seized door. Following the handprints inside, you distinguish your movements from the borrowed ones. One unwanted habit falls away.',
          ),
          effects: [
            { kind: 'credits', amount: -40 },
            { kind: 'remove_card', count: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
      },
      {
        label: t('젖은 점검구로 들어가 옛 거주자의 손길을 따라간다', 'Enter the wet access hatch and follow the former resident’s reach'),
        hint: t('HP −4 · 관찰 +1 · 회복력 +1', '−4 HP · OBS +1 · Resilience +1'),
        success: {
          text: t(
            '좁은 틈이 어깨를 긁는다. 벽을 보지 않아도 손이 숨은 잠금쇠를 찾는다. 돌아 나올 때는 당신 눈으로 같은 위치를 확인한다.',
            'The narrow opening scrapes your shoulder. Your hand finds the concealed latch without looking. On the way out, you locate it again with your own eyes.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'stat', stat: 'obs', amount: 1 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('당신 신원을 남기고 보관함의 존재를 증언한다', 'Sign a statement that the locker is still here'),
        hint: t('추적 +3 · 인간성 +1 · +10 ₵', '+3 Trace · Humanity +1 · +10 ₵'),
        success: {
          text: t(
            '건물 단말기에 보관함 위치와 당신 신원이 함께 남는다. 배관공은 잠긴 문을 두 번 두드린다. 이번에는 당신도 같은 간격으로 답한다.',
            'The building terminal saves the locker’s location with your identity. The plumber taps its locked door twice. This time, you answer at the same interval.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_canteen_token',
    acts: [5],
    route: 'sea_5',
    title: t('남는 한 사람 몫', 'One Meal Left'),
    image: 'v2/events/sea5_ev_canteen_token.webp',
    gmHints: ['하역조 식당의 배식 쟁반', '식판 하나를 더 놓는 취사원 순덕', '배식 장부에 없는 알레르기'],
    text: t(
      '하역조 취사원 순덕이 흔들리는 식탁에 쟁반을 놓는다. 세어 놓은 사람 수보다 식판이 하나 많다.\n회색 물이 주방에 든 뒤 순덕은 장부에 없는 사람의 알레르기를 기억한다. 마지막 식판에서만 파를 골라낸다.\n“이 사람은 파만 먹으면 숨이 찼어요. 누군지는 아직 몰라요.”',
      'Sun-deok, the Longshore Crew’s cook, sets a tray on a rocking table. There is one more plate than the head count.\nSince gray water entered the kitchen, she remembers an allergy belonging to someone absent from the meal ledger. She picks the scallions from the last plate.\n“They couldn’t breathe if they ate these. I still don’t know who.”',
    ),
    options: [
      {
        label: t('식탁을 받쳐 마지막 식판까지 옮긴다', 'Steady the table and carry every plate across'),
        hint: t('+20 ₵ · 추적 +3 · 소모품 1 · 인간성 +1', '+20 ₵ · +3 Trace · 1 consumable · Humanity +1'),
        check: { stat: 'agi', dc: 7 },
        success: {
          text: t(
            '기울어진 식탁 아래 무릎을 넣고 쟁반을 건넨다. 순덕이 예비 보급품을 챙겨 준다. 배식 단말기는 당신을 추가 수령인으로 센다.',
            'You brace the tilted table with a knee and pass the tray across. Sun-deok gives you a reserve supply. The serving terminal counts you as an extra recipient.',
          ),
          effects: [{ kind: 'credits', amount: 20 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'consumable' },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '흔들림을 잘못 받아 쟁반 모서리에 턱을 맞는다. 식판은 식탁 위에 남는다. 순덕이 당신 턱에 찬 행주를 대 준다.',
            'You misjudge the roll and catch the tray’s edge under your chin. The plates stay on the table. Sun-deok presses a cold cloth to your jaw.',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('일행 식사 값을 내고 마지막 자리를 비워 둔다', 'Buy meals for your group and leave the last seat free'),
        hint: t('−30 ₵ · 일행 HP +8 · 인간성 +1', '−30 ₵ · party heals 8 HP · Humanity +1'),
        requires: { minCredits: 30 },
        success: {
          text: t(
            '따뜻한 식사를 먹으며 젖은 옷을 말린다. 순덕은 빈자리 앞 식판의 파를 끝까지 골라낸다. 다 식기 전에 덮개를 씌운다.',
            'Your group eats hot food while wet clothes dry. Sun-deok removes every scallion from the plate at the empty seat, then covers it before it cools.',
          ),
          effects: [
            { kind: 'credits', amount: -30 },
            { kind: 'heal_party', amount: 8 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('식판을 씻으며 마지막 한 사람 몫을 남긴다', 'Wash the plates and leave the extra meal untouched'),
        hint: t('HP −2 · 인간성 +1', '−2 HP · Humanity +1'),
        success: {
          text: t(
            '뜨거운 설거지 물이 갈라진 손을 따갑게 한다. 순덕은 마지막 식판을 따로 덮는다. 당신이 빈자리를 닦는 동안에도 파가 남았는지 한 번 더 살핀다.',
            'Hot dishwater stings your cracked hands. Sun-deok covers the last plate separately. While you wipe the empty place, she checks it once more for scallions.',
          ),
          effects: [
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_drain_knocks',
    acts: [5],
    route: 'sea_5',
    title: t('안에서 세 번', 'Three from Below'),
    image: 'v2/events/sea5_ev_drain_knocks.webp',
    gmHints: ['혼자 선 방파제 배수실', '배수 덮개 밑의 세 번 두드림', '직원 기록에 없는 정비사의 탈출 순서'],
    text: t(
      '당신 혼자 방파제 배수실에 선다. 배수 덮개 아래에서 세 번 두드리는 소리가 난다.\n회색 물이 발끝에 닿자 누군가 갇힌 채 밸브를 세던 기억이 들어온다. 벽의 직원 기록에는 이름을 지운 사각형이 있다.\n“셋 다음이 뭐였지.” 당신 손이 덮개 위에서 멈춘다.',
      'You stand alone in the breakwater drainage room. Three knocks come from beneath a drain cover.\nGray water touches your toes. You remember counting valves while trapped somewhere below. A name has been rubbed from the staff record on the wall.\n“What came after three?” Your hand stops above the cover.',
    ),
    options: [
      {
        label: t('기억 속 밸브 순서를 끝까지 계산한다', 'Work through the remembered valve sequence'),
        hint: t('HP −4 · 지능 +1 · 통찰 +1', '−4 HP · INT +1 · Insight +1'),
        check: { stat: 'int', dc: 9 },
        success: {
          text: t(
            '남의 마지막 숨이 가슴을 죈다. 네 번째 밸브는 돌리지 않는다는 걸 알아내자 두드림이 멎는다. 당신은 순서를 자기 말로 다시 센다.',
            'Someone else’s final breath grips your chest. You realize the fourth valve must stay untouched, and the knocking stops. You count the sequence again in your own words.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'stat', stat: 'int', amount: 1 },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '네 번째를 돌리는 순간 기억 속 물이 목까지 찬다. 실제 물은 발목에 있는데도 숨을 못 쉰다. 벽을 짚고 마른 계단까지 기어간다.',
            'Turning the fourth valve fills your remembered throat with water. The real water is only ankle deep, but you cannot breathe. You crawl along the wall to the dry steps.',
          ),
          effects: [
            { kind: 'hp', amount: -9 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('무인 펌프 요금을 내고 배수 통로로 빠진다', 'Pay the unattended pump and leave through the drain passage'),
        hint: t('−20 ₵ · 추적 −5', '−20 ₵ · −5 Trace'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '펌프가 돌며 물을 낮춘다. 당신은 감시선 아래 통로로 몸을 낮춘다. 발이 물에서 떨어지는 순간 세 번의 두드림도 잊힐 만큼 작아진다.',
            'The pump lowers the water. You crouch into a passage below the surveillance line. As your feet leave the water, the three knocks become faint enough to lose.',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'trace', amount: -5 },
          ],
        },
      },
      {
        label: t('덮개를 붙들고 세 번씩 답한다', 'Hold the cover and answer three knocks at a time'),
        hint: t('HP −2 · 인간성 +1 · +15 ₵', '−2 HP · Humanity +1 · +15 ₵'),
        success: {
          text: t(
            '차가운 덮개를 붙든 손이 저린다. 세 번을 듣고 세 번을 돌려준다. 밸브는 그대로 둔다. 물에서 손을 뗄 때까지 두드림 사이의 간격을 함께 기다린다.',
            'Your hand goes numb on the cold cover. You hear three knocks and return three, leaving the valves alone. Until you lift your hand from the water, you wait through the pauses together.',
          ),
          effects: [{ kind: 'credits', amount: 15 }, 
            { kind: 'hp', amount: -2 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_blank_container',
    acts: [5],
    route: 'sea_5',
    title: t('집을 그리는 손', 'Drawing Home'),
    image: 'v2/events/sea5_ev_blank_container.webp',
    gmHints: ['잠긴 공터의 빈 컨테이너', '없는 집 평면도를 그리는 지도 수선공', '열린 문에서 따라 그리는 잔류물'],
    text: t(
      '잠긴 공터의 빈 컨테이너 안에서 지도 수선공이 바닥에 집을 그린다. 열린 문가의 잔류물도 같은 손을 움직인다.\n회색 물이 손끝에 닿을 때마다 방 하나가 더 생긴다. 수선공의 주소 기록에는 그 집이 없다.\n“닫으면 멈춰요. 그래도 부엌이 어디였는지는 보고 싶어요.”',
      'Inside an empty container on a flooded lot, a map repairer draws a house on the floor. A Residue at the open door moves its hand with hers.\nEach touch of gray water adds another room. No such house appears in her address history.\n“It stops if we close the door. I’d still like to know where the kitchen was.”',
    ),
    options: [
      {
        label: t('문을 열어 두고 바닥 그림을 끝까지 따라간다', 'Keep the door open and follow the drawing to the end'),
        hint: t('추적 +6 · 희귀 카드 선택 · 인간성 +1', '+6 Trace · rare card pick · Humanity +1'),
        success: {
          text: t(
            '부엌 옆에 낮은 뒷문이 그려진다. 당신 몸이 그 문을 통과하던 낯선 사람의 움직임을 익힌다. 열린 입구로 거리 감시등이 들어온다.',
            'A low back door appears beside the kitchen. Your body learns how a stranger once moved through it. Street surveillance lights enter through the open doorway.',
          ),
          effects: [
            { kind: 'trace', amount: 6 },
            { kind: 'card_choice', rarity: 'rare', count: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
      {
        label: t('문을 밀어 닫고 수선공을 마른 쪽으로 옮긴다', 'Push the door shut and move her onto dry ground'),
        hint: t('HP −5 · 추적 −6 · 지배 +1', '−5 HP · −6 Trace · Dominance +1'),
        success: {
          text: t(
            '휘어진 문을 밀다 어깨를 다친다. 금속 벽이 감시등을 가리고 수선공의 손도 멈춘다. 바닥에는 부엌이 들어갈 자리만 비어 있다.',
            'The warped door strains your shoulder. Its metal wall blocks the surveillance light, and the repairer’s hand stops. The place for the kitchen stays empty.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: -6 },
            { kind: 'axis', axis: 'dominance', amount: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'sea5_ev_surgeon_grip',
    acts: [5],
    route: 'sea_5',
    title: t('장갑 안의 손', 'The Hand in the Glove'),
    image: 'v2/events/sea5_ev_surgeon_grip.webp',
    gmHints: ['방파제 의수 수리대', '지워진 외과의의 손놀림', '등록자가 없는 수술 보조 장치'],
    text: t(
      '방파제 수리대에서 의수 제작자가 나사를 돌린다. 물방울이 손목에 닿자 공구를 잡는 손가락이 바뀐다.\n제작자는 수술한 적 없는 손으로 봉합 매듭을 만든다. 옆 보조 장치의 등록자 칸은 비어 있다.\n“장갑 벗는 순서까지 알아요. 이 손을 쓰던 사람은 어디 갔을까요.”',
      'At a repair bench on the breakwater, a prosthetics maker turns a screw. A drop hits her wrist, and her grip changes.\nHands that have never operated on anyone tie a surgical knot. The assist unit beside her has no registered owner.\n“I even know how the gloves come off. Where did the person who used these hands go?”',
    ),
    options: [
      {
        label: t('보조 장치를 맨손으로 잡고 두 손의 차이를 찾는다', 'Hold the assist unit barehanded and compare the grips'),
        hint: t('HP −4 · 희귀 임플란트 · 통찰 +1', '−4 HP · rare implant · Insight +1'),
        check: { stat: 'obs', dc: 9 },
        success: {
          text: t(
            '미세 침이 손바닥을 찌른다. 당신은 수술할 때만 펴지는 손가락을 짚어 낸다. 제작자가 장치를 당신 손에 맞추고 자기 손을 천천히 편다.',
            'Fine needles pierce your palm. You identify the finger that straightens only during surgery. The maker fits the unit to your hand, then slowly opens her own.',
          ),
          effects: [
            { kind: 'hp', amount: -4 },
            { kind: 'implant', rarity: 'rare' },
            { kind: 'axis', axis: 'insight', amount: 1 },
          ],
        },
        failure: {
          text: t(
            '두 손이 같은 순간에 움켜쥔다. 장치가 손바닥을 조이고 제작자가 전원을 뽑는다. 당신은 손가락을 하나씩 펴며 자기 감각이 돌아오기를 기다린다.',
            'Both hands clench at once. The unit crushes your palm until the maker pulls its power lead. You open your fingers one at a time and wait for your own sensation to return.',
          ),
          effects: [
            { kind: 'hp', amount: -8 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('정상 공임을 내고 당신 장비의 손잡이를 다시 맞춘다', 'Pay the full rate to have your equipment grip refitted'),
        hint: t('−60 ₵ · 카드 강화 1 · 추적 −3 · 회복력 +1', '−60 ₵ · upgrade 1 · −3 Trace · Resilience +1'),
        requires: { minCredits: 60 },
        success: {
          text: t(
            '제작자가 마른 장갑을 끼고 당신 손 치수부터 잰다. 손잡이를 맞춘 뒤 거리 인식에 걸리던 반사 부품도 떼어 낸다. 남의 매듭은 풀지 않은 채 수리대 끝에 둔다.',
            'The maker puts on dry gloves and measures your hand. After fitting the grip, she removes a reflective fitting the street scanners kept catching. The borrowed knot stays tied at the edge of her bench.',
          ),
          effects: [
            { kind: 'credits', amount: -60 },
            { kind: 'upgrade_card', count: 1 },
            { kind: 'trace', amount: -3 },
            { kind: 'axis', axis: 'resilience', amount: 1 },
          ],
        },
      },
      {
        label: t('거리 단말기에 제작자의 손놀림을 증언한다', 'Record what you saw of her hands at the street terminal'),
        hint: t('추적 +3 · 인간성 +1 · +10 ₵', '+3 Trace · Humanity +1 · +10 ₵'),
        success: {
          text: t(
            '단말기에 당신 얼굴과 봉합 매듭의 기록이 남는다. 제작자는 등록자 칸을 비워 둔다. 장갑을 벗은 뒤에도 손을 숨기지 않고 수리대 위에 둔다.',
            'The terminal saves your face and the surgical knot you describe. The maker leaves the owner field blank. After taking off her gloves, she keeps her hands in sight on the bench.',
          ),
          effects: [{ kind: 'credits', amount: 10 }, 
            { kind: 'trace', amount: 3 },
            { kind: 'axis', axis: 'humanity', amount: 1 },
          ],
        },
      },
    ],
  },
]

export const SEA5_EVENT_ART: Record<string, string> = {
  sea5_ev_shift_knot: 'Painterly cyberpunk realism, eye-level, natural proportions, one middle-aged female longshore worker as the sole subject on a flooded barge landing in Haemun, her hands paused halfway through a mooring knot, practical patched workwear, muted industrial colors, one restrained effect: a thin gray wash around her boots, no text in the image.',
  sea5_ev_seam_allowance: 'Painterly cyberpunk realism, eye-level, natural proportions, one older seamstress as the sole subject at a small barge repair stall, carefully holding an inside-out child-sized sleeve, worn scissors resting nearby, quiet concentration, one restrained effect: a faint gray wet sheen on her fingertips, no text in the image.',
  sea5_ev_borrowed_name: 'Painterly cyberpunk realism, eye-level, natural proportions, one seated human-shaped Residue as the sole subject at a flooded bus stop in Haemun, ordinary clothing and an incomplete face with a clearly formed mouth, calm pleading posture, one restrained effect: a slight watery blur at the edges of the figure, no text in the image.',
  sea5_ev_tide_columns: 'Painterly cyberpunk realism, eye-level, natural proportions, one male breakwater attendant as the sole subject studying a folded tide table beside concrete steps, one finger resting beyond the printed grid, battered work jacket, one restrained effect: a narrow gray splash at the lowest step, all paper markings indistinct, no text in the image.',
  sea5_ev_broken_handle: 'Painterly cyberpunk realism, eye-level, natural proportions, one young male longshore worker as the sole subject bracing a loaded handcart with his boot on a sloping wooden ramp, broken handle and strained shoulders, one restrained effect: gray water dripping from his trouser cuffs, no text in the image.',
  sea5_ev_bottle_seller: 'Painterly cyberpunk realism, eye-level, natural proportions, one elderly bottle seller as the sole subject beneath a weathered awning at a barge market, holding a small stoppered bottle toward daylight, familiar tired face and practical layered clothes, one restrained effect: a small gray ripple inside the glass, no text in the image.',
  sea5_ev_empty_stall: 'Painterly cyberpunk realism, eye-level, natural proportions, one fish seller as the sole subject leaning away from a rent scanner in a cramped floating market stall, damp apron and an expression of offended disbelief, one restrained effect: a small amber scanner light on his cheek, terminal display dark and unreadable, no text in the image.',
  sea5_ev_buoy_hand: 'Painterly cyberpunk realism, eye-level, natural proportions, one battered navigation buoy as the sole subject beside a concrete breakwater, a compact mechanical rescue hand unfolding from its casing, ordinary maritime engineering and frayed rope, one restrained effect: a narrow gray wake touching its base, no text in the image.',
  sea5_ev_room_203: 'Painterly cyberpunk realism, eye-level, natural proportions, one worn interior door handle as the sole subject in an otherwise bare flooded apartment, chipped paint and traces of former furniture on the wall, one restrained effect: a single gray droplet hanging beneath the handle, no people, no text in the image.',
  sea5_ev_name_called: 'Painterly cyberpunk realism, eye-level, natural proportions, one female net mender as the sole subject at the foot of a narrow exterior stairway in a flooded neighborhood, netting needle held tightly against her work apron, alert searching expression, one restrained effect: a faint water reflection on the lower wall, no text in the image.',
  sea5_ev_salt_palms: 'Painterly cyberpunk realism, eye-level, natural proportions, one male barge cook as the sole subject beside a small griddle, inspecting salt caught in the creases of his open palm, worn kitchen clothes and a puzzled expression, one restrained effect: a small wisp of steam above the griddle, no text in the image.',
  sea5_ev_doorway_line: 'Painterly cyberpunk realism, eye-level, natural proportions, one female resident as the sole subject at a metal flood shelter entrance, reaching an empty hand behind her at the height of a small child, damp sleeve rolled back to reveal faint finger marks, one restrained effect: gray water gathering around her shoes, no second figure, no text in the image.',
  sea5_ev_crane_hook: 'Painterly cyberpunk realism, eye-level, natural proportions, one rusty crane hook as the sole subject suspended at human chin height above a market hoist platform, heavy industrial weight and frayed lifting gear, one restrained effect: a single falling droplet from the hook tip, no people, no text in the image.',
  sea5_ev_wet_roll: 'Painterly cyberpunk realism, eye-level, natural proportions, one female school clerk as the sole subject pressing a soaked attendance sheet flat on a classroom desk, evacuation bedding softly out of focus behind her, one restrained effect: water seeping beneath her hand, all paper markings indistinct, no text in the image.',
  sea5_ev_foghorn_breath: 'Painterly cyberpunk realism, eye-level, natural proportions, one male night attendant as the sole subject beside an industrial foghorn valve on a breakwater platform, hand on the wheel and chest lifted for a long breath, one restrained effect: a faint curl of condensed breath, no text in the image.',
  sea5_ev_other_key: 'Painterly cyberpunk realism, eye-level, natural proportions, one female plumber as the sole subject kneeling beside an old apartment emergency locker, two fingertips poised over a battered tool case, practical waterproof workwear, one restrained effect: a thin gray trickle from an access hatch, no text in the image.',
  sea5_ev_canteen_token: 'Painterly cyberpunk realism, eye-level, natural proportions, one older female longshore canteen cook as the sole subject removing scallions from a meal at an empty seat, crowded practical kitchen and rocking barge interior, one restrained effect: a small thread of steam from the plate, no text in the image.',
  sea5_ev_drain_knocks: 'Painterly cyberpunk realism, eye-level, natural proportions, one heavy circular drain cover as the sole subject in a cramped breakwater drainage room, worn bolts and ankle-deep gray water, one restrained effect: three close ripples touching the metal edge, no people, no text in the image.',
  sea5_ev_blank_container: 'Painterly cyberpunk realism, eye-level, natural proportions, one female map repairer as the sole subject kneeling inside an empty shipping container on a flooded lot, tracing a rough house layout on the floor with one fingertip, open doorway and unfinished room outlines, one restrained effect: a shallow gray wash reaching her hand, no second figure, no lettering, no text in the image.',
  sea5_ev_surgeon_grip: 'Painterly cyberpunk realism, eye-level, natural proportions, one female prosthetics maker as the sole subject at a practical breakwater repair bench, studying her own precise surgical grip while a compact assist unit rests nearby, worn dry gloves laid aside, one restrained effect: a single gray droplet at her wrist, no text in the image.',
}