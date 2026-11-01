// Pack 4 — twelve scenes of the back alley (drafted by Astra, reviewed by Claude). Images are borrowed until the owner has played the rule.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const OUTSIDE_ROUTE_EVENTS: EventDef[] = [
  {
    id: 'outside_ev_shutter',
    acts: [2],
    route: 'outside',
    title: t('한 뼘이 남는다', 'One Handspan Short'),
    image: 'v2/events/outside_ev_shutter.webp',
    gmHints: ['막차가 끊긴 승강장 매점', '휘어진 셔터 홈', '수리공의 소켓 렌치'],
    text: t(
      '멈춘 자기부상열차 옆 매점. 셔터가 바닥 한 뼘 위에서 걸린다. 수리공이 렌치로 홈을 두드린다.\n폐점 정리반의 빛이 승강장 끝을 훑는다.\n“닫힌 가게만 지나친대요. 그래서 닫는 중입니다.” 수리공이 당신 발밑에 받침목을 밀어 놓는다.',
      'Beside a stranded maglev, a kiosk shutter stops a handspan above the floor. A repairer taps its track with a socket wrench.\nClosing Crew lights sweep the far end of the platform.\n“They pass closed shops. Working on it.” The repairer slides a wooden block to your feet.',
    ),
    options: [
      {
        label: t('받침목을 딛고 셔터를 들어 맞춘다', 'Brace yourself and lift the shutter into line'),
        hint: t('근력 5 · 성공 +25 ₵ · 실패 −4 HP', 'STR 5 · success: +25 ₵ · fail: −4 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '홈이 맞물린다. 수리공이 안쪽에서 셔터를 내리고 틈으로 공임을 건넨다. “반장은 없으니까 반씩.”',
            'The track catches. The repairer lowers the shutter from inside and passes your pay beneath it. “No foreman. Half each.”',
          ),
          effects: [{ kind: 'credits', amount: 25 }],
        },
        failure: {
          text: t(
            '셔터가 어깨를 누른다. 수리공이 받침목을 세워 무게를 받는다. “들기 전에 홈부터였네요.” 둘이 자세를 바꾼다.',
            'The shutter bears down on your shoulder. The repairer wedges the block underneath. “Should have checked the track first.” You both reposition.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('매점 뒤 수리 통로로 돌아간다', 'Take the maintenance passage behind the kiosk'),
        hint: t('비용 없음 · 추적 −4', 'No cost · −4 Trace'),
        success: {
          text: t(
            '수리공이 렌치로 뒤쪽 문을 가리킨다. 안으로 들어서자 셔터 두드리는 소리가 발소리를 덮는다.',
            'The wrench points toward a rear door. Once you are inside, hammering on the shutter covers your footsteps.',
          ),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_laundry_cart',
    acts: [2],
    route: 'outside',
    requires: { notFlag: 'outside_owed' },
    title: t('젖은 쪽이 무겁다', 'The Wet End'),
    image: 'v2/events/outside_ev_laundry_cart.webp',
    gmHints: ['나루 경사로의 세탁물 수레', '손잡이에 묶인 노란 수건', '수거원이 정하는 운반 순서'],
    text: t(
      '나루 경사로에서 세탁물 수거원이 수레 바퀴에 벽돌을 괸다. 손잡이에 노란 수건이 묶여 있다.\n“젖은 건 아래로. 마른 건 위로.” 수거원이 자루를 다시 쌓는다. “밀 거면 왼쪽을 잡아요. 오른쪽은 제가 알아요.”\n폐점 방송에도 마지막 수거표는 아직 집게에 물려 있다.',
      'On the ferry ramp, the Laundry Runner chocks a cart wheel with a brick. A yellow towel is tied around its handle.\n“Wet bags below. Dry ones above.” They rearrange the load. “If you’re pushing, take the left. I know what the right wheel does.”\nThe closing announcement has played, but the last collection slip is still clipped in place.',
    ),
    options: [
      {
        label: t('왼쪽 손잡이를 잡고 경사로를 오른다', 'Take the left handle and push uphill'),
        hint: t('−3 HP · 수거원이 도움을 기억한다', '−3 HP · the runner will return the favor'),
        success: {
          text: t(
            '손잡이가 손바닥을 벗긴다. 꼭대기에서 수거원이 노란 수건을 풀어 감아 준다. “충전 필요하면 수선집 뒤로 와요. 제 자리 있어요.”',
            'The handle scrapes your palm. At the top, the runner wraps it in the yellow towel. “Need a charge? Behind the repair shop. I have a spot.”',
          ),
          effects: [
            { kind: 'hp', amount: -3 },
            { kind: 'flag', key: 'outside_owed' },
          ],
        },
      },
      {
        label: t('빈 세탁물 통로의 위치를 묻는다', 'Ask which laundry passage is clear'),
        hint: t('비용 없음 · 추적 −4', 'No cost · −4 Trace'),
        success: {
          text: t(
            '수거원이 빈 자루를 발로 접어 길을 낸다. “저 투입구요. 발부터 넣어요. 세탁기는 아닙니다.” 미끄럼판 아래로 내려간다.',
            'The runner folds an empty sack aside with one foot. “That chute. Feet first. It’s not a washing machine.” You slide down into the passage.',
          ),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_barber',
    acts: [2],
    route: 'outside',
    title: t('귀 옆은 아직', 'Still Around the Ears'),
    image: 'v2/events/outside_ev_barber.webp',
    gmHints: ['마지막 손님의 이발', '거울에 비친 정리반', '빗으로 고개를 돌리는 이발사'],
    text: t(
      '이발사가 손님의 턱을 빗등으로 돌린다. 반쪽만 짧아진 머리 위로 폐점등이 깜빡인다.\n“완료 처리된 점포입니다.” 문밖 단말기가 말한다.\n“귀 옆은 아직인데요.” 가위가 두 번 더 움직인다. 거울에는 골목 양쪽이 한꺼번에 비친다.',
      'The barber turns a customer’s chin with the back of a comb. Closing lights blink over a haircut finished on only one side.\n“This premises has been marked complete,” says the terminal outside.\n“Not around the ears.” The scissors make two more cuts. Both ends of the alley are visible in the mirror.',
    ),
    options: [
      {
        label: t('거울로 정리반이 지나가는 간격을 잰다', 'Time the patrol through the mirror'),
        hint: t('관찰 5 · 성공 추적 −7 · 실패 −2 HP', 'OBS 5 · success: −7 Trace · fail: −2 HP'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '빗이 멈출 때마다 불빛도 멈춘다. 세 번째 간격에 뒷문을 연다. 이발사는 거울을 보며 손님 귀를 접는다.',
            'Each pause of the comb matches a pause in the lights. You take the third gap and open the back door. The barber folds an ear out of the way.',
          ),
          effects: [{ kind: 'trace', amount: -7 }],
        },
        failure: {
          text: t(
            '거울 속 왼쪽을 실제 왼쪽으로 짚는다. 문틀에 이마를 찧고 물러난다. 이발사가 찬 수건을 내민다. “거울은 반대예요.”',
            'You mistake the mirror’s left for yours and catch your forehead on the doorframe. The barber offers a cold towel. “Other way round.”',
          ),
          effects: [{ kind: 'hp', amount: -2 }],
        },
      },
      {
        label: t('머리카락을 쓸고 수건을 접는다', 'Sweep up and fold the towels'),
        hint: t('비용 없음 · +12 ₵', 'No cost · +12 ₵'),
        success: {
          text: t(
            '손님이 일어설 때 바닥도 말끔하다. 이발사가 당신 몫을 계산대 끝에 놓는다. 빗 사이에 낀 머리카락은 직접 뺀다.',
            'The floor is clean when the customer stands. The barber sets your pay at the end of the counter, then cleans the comb personally.',
          ),
          effects: [{ kind: 'credits', amount: 12 }],
        },
      },
      {
        label: t('짧게 자르고 얼굴을 닦는다', 'Get a close cut and a wash'),
        hint: t('−20 ₵ · +4 HP · 추적 −8', '−20 ₵ · +4 HP · −8 Trace'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '따뜻한 수건이 턱의 먼지를 걷어 낸다. 귀가 드러나고 앞머리가 사라진다. 이발사가 거울을 기울인다. “이쪽으로 나가요.”',
            'A warm towel takes the grit off your jaw. Your ears show; your fringe is gone. The barber tilts the mirror. “Out this way.”',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'hp', amount: 4 },
            { kind: 'trace', amount: -8 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_gas_ring',
    acts: [2],
    route: 'outside',
    title: t('불구멍 하나', 'One Burner Hole'),
    image: 'v2/events/outside_ev_gas_ring.webp',
    gmHints: ['국수 가판대의 막힌 화구', '철사와 면 건지개', '손님 그릇부터 챙기는 주인'],
    text: t(
      '국수 냄비 아래 불꽃이 한쪽으로만 솟는다. 주인이 가스를 잠그고 철사를 편다. 면 건지개에는 마지막 두 그릇 분량이 걸려 있다.\n폐점 정리반이 붙인 봉인지는 물에 젖어 말린다.\n“접으라는 건 알겠어요. 면은 건지고요.”',
      'Flame rises from only one side of the noodle pot. The cook shuts off the gas and straightens a wire. Two last portions hang in the strainer.\nThe Closing Crew’s seal curls where water has soaked it.\n“I heard. Let me drain these first.”',
    ),
    options: [
      {
        label: t('식힌 화구의 막힌 구멍을 뚫는다', 'Clear the cooled burner'),
        hint: t('지능 6 · 성공 +8 HP · 실패 −4 HP', 'INT 6 · success: +8 HP · fail: −4 HP'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '철사 끝에 굳은 국물이 묻어 나온다. 주인이 다시 불을 켠다. 당신 그릇에는 달걀까지 얹힌다.',
            'Dried broth comes out on the wire. The cook relights the burner. Your bowl gets an egg.',
          ),
          effects: [{ kind: 'hp', amount: 8 }],
        },
        failure: {
          text: t(
            '식은 줄 안 받침에 손을 댄다. 주인이 물바가지를 당겨 준다. “손은 거기 담그고 있어요. 나머지는 내가 할게.”',
            'You touch a support that is still hot. The cook pulls over a basin. “Keep your hand in there. I’ll finish this.”',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('찬 국수 한 그릇을 받는다', 'Accept a bowl of cold noodles'),
        hint: t('비용 없음 · +3 HP', 'No cost · +3 HP'),
        success: {
          text: t(
            '주인이 찬물에 면을 헹구고 간장을 친다. 뜨거운 걸 기다리던 손님도 그릇을 내민다. “저도 그렇게요.”',
            'The cook rinses the noodles cold and adds soy sauce. A customer waiting for hot soup holds out a bowl. “Same for me.”',
          ),
          effects: [{ kind: 'hp', amount: 3 }],
        },
      },
      {
        label: t('휴대용 화구를 빌려 함께 먹는다', 'Rent a portable burner and eat together'),
        hint: t('−25 ₵ · 일행 HP +5', '−25 ₵ · party heals 5 HP'),
        requires: { minCredits: 25 },
        success: {
          text: t(
            '옆 가게에서 빌린 불 위로 작은 냄비가 올라간다. 주인이 그릇들을 붙여 놓는다. 좁은 상에 팔꿈치가 차례로 닿는다.',
            'A small pot goes on the burner from next door. The cook sets the bowls close together. Elbows find room around the narrow table.',
          ),
          effects: [
            { kind: 'credits', amount: -25 },
            { kind: 'heal_party', amount: 5 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_pawn_ticket',
    acts: [2],
    route: 'outside',
    title: t('전당표 뒷면', 'The Back of the Ticket'),
    image: 'v2/events/outside_ev_pawn_ticket.webp',
    gmHints: ['gamble', '전당표 위의 닳은 주사위', '판돈 대신 금고 운반'],
    text: t(
      '전당포 주인이 빈 전당표를 깔고 주사위를 놓는다. 모서리 하나만 유난히 닳았다.\n“홀짝 맞히면 내 돈. 틀리면 저 금고를 안으로.” 주인이 장갑을 턱으로 가리킨다.\n폐점 시간이 지났어도 맡긴 물건은 선반에 반듯하다. 금고 밑에는 이미 운반용 천이 깔려 있다.',
      'The pawnbroker lays a die on a blank pawn ticket. One corner is worn much smoother than the rest.\n“Call odd or even. Win, I pay. Lose, help me move that safe.” A nod toward a pair of gloves.\nClosing time has passed, but every pledged item sits neatly on its shelf. A moving blanket is already under the safe.',
    ),
    options: [
      {
        label: t('닳은 모서리를 보고 홀짝을 건다', 'Read the worn corner and call it'),
        hint: t('관찰 6 · 성공 +35 ₵ · 실패 −4 HP', 'OBS 6 · success: +35 ₵ · fail: −4 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t(
            '주사위가 닳은 쪽으로 기운다. 주인이 돈을 세어 준다. “주사위도 갈 때가 됐네.” 금고에는 자기 어깨를 댄다.',
            'The die leans onto its worn corner. The pawnbroker counts out your winnings. “Time for a new one.” Then puts a shoulder to the safe.',
          ),
          effects: [{ kind: 'credits', amount: 35 }],
        },
        failure: {
          text: t(
            '주사위가 전당표 접힌 곳에 걸린다. 당신은 장갑을 낀다. 금고를 옮기고 나니 허리가 뻐근하다. 주인이 문턱 쪽 무게를 맡았다.',
            'The die catches on the ticket’s fold. You put on the gloves. Your back aches after the move; the pawnbroker took the heavy end over the threshold.',
          ),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('내기 대신 전당표를 정리한다', 'Sort the tickets for a fixed wage'),
        hint: t('비용 없음 · +10 ₵', 'No cost · +10 ₵'),
        success: {
          text: t(
            '번호대로 묶다가 작은 장갑 한 짝의 표를 찾는다. 주인이 그 표만 계산대 서랍에 둔다. “쌍으로 찾아가야 하니까.”',
            'Sorting by number, you find a ticket for one small glove. The pawnbroker sets it in the counter drawer. “They’ll want the pair back.”',
          ),
          effects: [{ kind: 'credits', amount: 10 }],
        },
      },
      {
        label: t('판매용 보급 주머니를 산다', 'Buy a supply pouch from the sale shelf'),
        hint: t('−20 ₵ · 무작위 소모품 1개', '−20 ₵ · 1 random consumable'),
        requires: { minCredits: 20 },
        success: {
          text: t(
            '주인이 전당품 선반 옆의 판매대에서 주머니를 꺼낸다. 봉합선을 잡아당겨 확인한 뒤 건넨다. “뜯는 건 나가서.”',
            'The pawnbroker takes a pouch from the sale rack beside the pledged goods, tests its sealed seam, and hands it over. “Open it outside.”',
          ),
          effects: [
            { kind: 'credits', amount: -20 },
            { kind: 'consumable' },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_break_schedule',
    acts: [2],
    route: 'outside',
    requires: { companions: ['se_rin', 'tae_o'] },
    title: t('휴게 시간에도 호출은 온다', 'Calls During Break'),
    image: 'v2/events/outside_ev_break_schedule.webp',
    gmHints: ['companion conflict', '정리반 직원의 도시락', '세린과 태오의 다른 철수 방법'],
    text: t(
      '정리반 직원이 도시락 옆에 도장과 순회표를 내려놓는다. 호출기는 꺼져 있다.\n“도장 찍는 사람입니다. 밥 먹을 땐 내려놔요.”\n세린이 순회표를 접는다. “표만 받고 가자. 호출은 듣지 말고.”\n태오가 호출기에 손을 뻗는다. “무응답이면 여기로 온다. 확인 보고는 하게 둬.” 직원이 젓가락을 멈춘다.',
      'A Closing Crew clerk sets a stamp and route sheet beside a lunch box. The radio is off.\n“I stamp the closures. I put it down to eat.”\nSe-rin folds the sheet. “Take the route and go. Leave the radio off.”\nTae-o reaches toward it. “Miss a check-in and they come here. Let them report.” The clerk pauses with chopsticks raised.',
    ),
    options: [
      {
        label: t('세린과 순회표를 받고 바로 떠난다', 'Take the route sheet and leave with Se-rin'),
        hint: t('세린 유대 +1 · 무작위 소모품 1개', 'Se-rin bond +1 · 1 consumable'),
        success: {
          text: t(
            '직원이 순회표와 보급품 하나를 건넨다. “제 호출은 제가 받아요.” 세린은 고개를 끄덕이고 당신과 먼저 모퉁이를 돈다.',
            'The clerk hands over the sheet and a spare supply. “I’ll handle my own calls.” Se-rin nods and takes the corner with you.',
          ),
          effects: [
            { kind: 'bond', id: 'se_rin', amount: 1 },
            { kind: 'consumable' },
          ],
        },
      },
      {
        label: t('태오와 확인 보고가 끝날 때까지 기다린다', 'Wait with Tae-o for the check-in'),
        hint: t('비용 없음 · 태오 유대 +1 · 추적 −6', 'No cost · Tae-o bond +1 · −6 Trace'),
        success: {
          text: t(
            '직원이 호출기를 켠다. “동편 확인 중입니다.” 응답은 서편 집결 지시다. 태오가 당신에게 동쪽 문을 열어 준다. 젓가락이 다시 움직인다.',
            'The clerk switches on. “Checking the east side.” The reply orders everyone west. Tae-o opens the east door for you. The chopsticks resume.',
          ),
          effects: [
            { kind: 'bond', id: 'tae_o', amount: 1 },
            { kind: 'trace', amount: -6 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_chair_door',
    acts: [2],
    route: 'outside',
    title: t('의자 한 자리', 'A Place for the Chair'),
    image: 'v2/events/outside_ev_chair_door.webp',
    gmHints: ['문틈에 끼운 식당 의자', '가족을 내보내는 문지기', '폐점 정리반의 골목 진입'],
    text: t(
      '문지기가 의자 등받이를 철문 손잡이에 걸어 둔다. 안에서는 사람들이 신발을 신고 있다.\n“앉는 건 나중에.” 문지기는 의자 다리를 발로 고쳐 민다.\n골목 양끝에서 폐점 정리반의 조명이 켜진다. 문지기가 세탁실 쪽 빗장을 뽑는다. “나가는 문은 하나 더 있어요.”',
      'The Doorkeeper hooks a dining chair under an iron door’s handle. Inside, people are putting on shoes.\n“Sitting can wait.” A foot nudges the chair leg into place.\nClosing Crew lights come on at both ends of the alley. The Doorkeeper draws the laundry-room bolt. “There’s another way out.”',
    ),
    options: [
      {
        label: t('정리반을 마주 보고 골목에 선다', 'Face the crew in the alley'),
        hint: t('폐점 정리반과 전투', 'Fight the Closing Crew'),
        success: {
          text: t(
            '문지기가 마지막 신발 끈을 확인하고 안쪽 사람들을 돌려세운다. 당신 앞에 정리반의 방패가 내려온다. 의자는 문에 단단히 걸려 있다.',
            'The Doorkeeper checks the last shoelace and sends everyone toward the rear. A crew shield lowers in front of you. The chair holds firm.',
          ),
          effects: [{ kind: 'combat', encounterId: 'outside_event_ambush' }],
        },
      },
      {
        label: t('철문을 몸으로 받치며 세탁실로 빠진다', 'Brace the door and withdraw through the laundry'),
        hint: t('−5 HP · 추적 −3', '−5 HP · −3 Trace'),
        success: {
          text: t(
            '문이 어깨를 밀어붙인다. 문지기가 의자를 돌려 틈을 막고 당신 소매를 당긴다. 뒤편 문이 닫힌 뒤에야 어깨를 편다.',
            'The door drives into your shoulder. The Doorkeeper turns the chair across the gap and pulls your sleeve. Only beyond the rear door can you straighten up.',
          ),
          effects: [
            { kind: 'hp', amount: -5 },
            { kind: 'trace', amount: -3 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_bulletin_board',
    acts: [2],
    route: 'outside',
    title: t('철거 공지 아래', 'Under the Removal Notice'),
    image: 'v2/events/outside_ev_bulletin_board.webp',
    gmHints: ['환승 통로의 동네 게시판', '풀솔을 든 관리인', '공지에 가려진 배달 약도'],
    text: t(
      '환승 통로 게시판에 철거 공지가 덧붙었다. 아래로는 우산 수선, 반찬 배달, 잃어버린 열쇠 쪽지가 삐져나온다.\n관리인이 풀솔로 공지의 들뜬 귀퉁이만 누른다.\n“떼면 또 와요. 밑에 건 옆으로 옮기면 되고.” 배달 약도에는 카메라 점검 시간도 적혀 있다.',
      'A removal notice covers the passage bulletin board. Umbrella repairs, meal deliveries, and a lost-key note peek out beneath it.\nThe caretaker brushes paste onto one curling corner.\n“Take it down, they come back. We can move ours sideways.” A delivery map includes the camera maintenance hours.',
    ),
    options: [
      {
        label: t('점검 시간과 배달 길을 맞춰 본다', 'Match the delivery route to the maintenance hours'),
        hint: t('지능 5 · 성공 추적 −8 · 실패 추적 +4', 'INT 5 · success: −8 Trace · fail: +4 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '점검표의 빈칸이 배달 약도와 이어진다. 관리인이 풀솔로 짧은 길을 짚는다. “거긴 계단이 세 개예요. 네 개면 잘못 간 거고.”',
            'A gap in the schedule lines up with the delivery route. The paste brush marks a shortcut. “Three steps there. Four means you took the wrong turn.”',
          ),
          effects: [{ kind: 'trace', amount: -8 }],
        },
        failure: {
          text: t(
            '지난주 점검표를 읽었다. 모퉁이 카메라가 당신을 따라 돈다. 관리인이 새 표를 옆에 붙인다. 당신은 걸음을 재촉한다.',
            'You read last week’s schedule. The corner camera follows you. The caretaker posts the new sheet beside the old one as you hurry on.',
          ),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('가려진 쪽지들을 옆 칸에 옮겨 붙인다', 'Move the covered notes into the next panel'),
        hint: t('비용 없음 · 인간성 +1', 'No cost · Humanity +1'),
        success: {
          text: t(
            '우산 그림 옆에 열쇠 그림을 붙인다. 관리인이 풀솔을 씻는다. 게시판 앞을 지나던 사람이 반찬 배달 번호를 적어 간다.',
            'You put the key drawing beside the umbrella. The caretaker washes the brush. A passerby stops to copy the meal-delivery number.',
          ),
          effects: [{ kind: 'axis', axis: 'humanity' }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_homework',
    acts: [2],
    route: 'outside',
    title: t('풀이도 쓰세요', 'Show Your Work'),
    image: 'v2/events/outside_ev_homework.webp',
    gmHints: ['다리 밑 가판대의 숙제', '짧아진 연필과 쇠자', '직접 답을 고치는 아이'],
    text: t(
      '다리 밑 가판대에서 아이가 쇠자로 공책을 누르고 있다. 어른은 옆에서 상자를 묶는다. 접어야 할 천막에 아이 책상등 선이 걸려 있다.\n“이 줄까지만.” 아이가 나눗셈을 적는다.\n당신이 답을 짚자 공책을 돌려 준다. “풀이도요. 선생님이 그걸 봐요.”',
      'Under the bridge, a child holds a notebook flat with a steel ruler. An adult ties boxes beside the stall. The desk-lamp cord is caught in the awning they need to fold.\n“Just this row.” The child writes out a division problem.\nWhen you point at the answer, the notebook turns toward you. “Show your work. That’s what the teacher checks.”',
    ),
    options: [
      {
        label: t('빈칸에 계산 과정을 적는다', 'Write out the steps in the margin'),
        hint: t('지능 4 · 성공 지능 +1 · 실패 추적 +2', 'INT 4 · success: INT +1 · fail: +2 Trace'),
        check: { stat: 'int', dc: 4 },
        success: {
          text: t(
            '둘이 다른 방법으로 같은 답을 낸다. 아이의 짧은 풀이를 한 번 더 읽는다. 아이는 지우개 가루를 털고 책상등을 끈다.',
            'You reach the same answer by different routes. You read the child’s shorter method once more. They brush away the eraser crumbs and switch off the lamp.',
          ),
          effects: [{ kind: 'stat', stat: 'int', amount: 1 }],
        },
        failure: {
          text: t(
            '아이 연필이 당신의 빠진 자릿수를 짚는다. 고치는 동안 정리반의 탐조등이 천막을 훑는다. 아이는 답을 마저 쓰고 공책을 덮는다.',
            'The pencil points to a place value you missed. While you correct it, a crew searchlight crosses the awning. The child finishes the answer and shuts the notebook.',
          ),
          effects: [{ kind: 'trace', amount: 2 }],
        },
      },
      {
        label: t('아이가 쓰는 동안 책상등 선을 풀어 준다', 'Untangle the lamp cord while the child writes'),
        hint: t('비용 없음 · +3 HP', 'No cost · +3 HP'),
        success: {
          text: t(
            '선을 빼자 천막이 반듯하게 접힌다. 상자를 묶던 어른이 찐빵을 반으로 가른다. 아이는 연필을 꽂고 자기 가방을 멘다.',
            'With the cord free, the awning folds neatly. The adult splits a steamed bun with you. The child stows the pencil and shoulders their own bag.',
          ),
          effects: [{ kind: 'hp', amount: 3 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_early_amp',
    acts: [2],
    route: 'outside',
    title: t('반 박자 먼저', 'Half a Beat Early'),
    image: 'v2/events/outside_ev_early_amp.webp',
    gmHints: ['uncanny', '연주보다 먼저 우는 앰프', '먼저 울린 음을 끝까지 치는 악사'],
    text: t(
      '중고 음반 가판대 앞. 악사가 줄을 누르기 전에 앰프에서 음이 난다. 손을 멈추자 다음 음도 멈춘다.\n악사는 케이블을 내려다보고 다시 손가락을 든다. 앰프가 반 박자 먼저 운다.\n“앞서는 건 좋은데, 품삯은 한 사람 몫이거든.” 악사가 발로 빈 의자를 밀어 준다.',
      'Outside a used-record stall, an amp sounds before the musician presses a string. When the hand stops, the next note stops too.\nThe musician studies the cable and lifts a finger again. The amp plays half a beat early.\n“Fine, take the lead. They’re still only paying one of us.” A foot pushes an empty chair toward you.',
    ),
    options: [
      {
        label: t('다음 음이 울릴 때 발밑 케이블을 빼낸다', 'Free the trapped cable on the next note'),
        hint: t('민첩 6 · 성공 소모품 1개 · 실패 −3 HP', 'AGI 6 · success: 1 consumable · fail: −3 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t(
            '의자 다리 밑에서 케이블이 빠진다. 전원을 끊어도 마지막 음은 끝까지 난다. 악사가 장비 가방의 예비 보급품을 건넨다.',
            'The cable slips free of the chair leg. The final note finishes after the power is cut. The musician gives you a spare supply from the equipment bag.',
          ),
          effects: [{ kind: 'consumable' }],
        },
        failure: {
          text: t(
            '먼저 난 소리에 몸이 앞선다. 의자가 기울며 손등을 찍는다. 악사가 앰프를 받치고 당신 손부터 확인한다.',
            'You move too soon at the early note. The chair tips onto your hand. The musician steadies the amp, then checks your fingers.',
          ),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('의자에 앉아 마지막 곡을 듣는다', 'Sit for the last song'),
        hint: t('추적 +2 · +5 HP', '+2 Trace · +5 HP'),
        success: {
          text: t(
            '앰프가 먼저 끝난 뒤에도 손가락은 마지막 음을 누른다. 당신은 다리를 쉬고 일어난다. 골목 카메라가 빈 의자에서 당신 쪽으로 돈다.',
            'After the amp finishes, the fingers still play the final note. You stand with your legs rested. The alley camera turns from the empty chair toward you.',
          ),
          effects: [
            { kind: 'trace', amount: 2 },
            { kind: 'hp', amount: 5 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_compensation_form',
    acts: [2],
    route: 'outside',
    title: t('해당 없음에 서명', 'Sign Under Not Applicable'),
    image: 'v2/events/outside_ev_compensation_form.webp',
    gmHints: ['IX contact', '미등록자 보상 서식', '국자로 서명 칸을 짚는 배식 담당'],
    text: t(
      '배식 담당이 국자로 종이 서식의 모서리를 누른다. 제목은 ‘미등록자 영업 종료 보상’. 첫 칸은 등록번호다.\n단말기에서 IX가 말한다. “해당 사항이 없으면 해당 없음에 서명해 주십시오.”\n“배식 담당이에요. 손은 젖었고요.” 국자 끝에서 물 한 방울이 서명 칸에 떨어진다.',
      'The Server pins a paper form with the ladle. It reads “Closure Compensation for Unlisted Persons.” The first field asks for a registration number.\nIX speaks from the terminal. “If this does not apply, please sign under Not Applicable.”\n“I serve meals. My hands are wet.” A drop falls from the ladle into the signature box.',
    ),
    options: [
      {
        label: t('등록번호 대신 배식 시간을 접수하게 한다', 'Have IX accept serving hours in place of a number'),
        hint: t('매력 6 · +30 ₵, 추적 +3 · 실패 추적 +5', 'CHA 6 · +30 ₵, +3 Trace · fail: +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '“대리 수령인의 위치를 확인했습니다.” 당신 앞으로 보상금이 나온다. 배식 담당은 서식 뒷면에 내일 배식 시간을 적는다.',
            '“The collecting representative’s location is confirmed.” The payment arrives in your account. The Server writes tomorrow’s serving hours on the back.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'trace', amount: 3 },
          ],
        },
        failure: {
          text: t(
            '“근무 시간은 등록번호로 인정되지 않습니다. 상담 위치를 저장했습니다.” 배식 담당이 종이를 뒤집는다. “그럼 장보기 목록으로 쓰죠.”',
            '“Working hours cannot serve as a registration number. Consultation location saved.” The Server turns the paper over. “Shopping list, then.”',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('서식을 세워 단말기 렌즈를 가린다', 'Prop the form over the terminal lens'),
        hint: t('비용 없음 · 추적 −4', 'No cost · −4 Trace'),
        success: {
          text: t(
            '“서명란이 보이지 않습니다.” 배식 담당이 국자 손잡이로 종이를 받친다. 당신은 배식대 뒤로 나간다. IX는 서명 안내를 다시 읽는다.',
            '“The signature field is not visible.” The ladle handle props up the paper. You leave behind the counter as IX repeats the signing instructions.',
          ),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_shared_charger',
    acts: [2],
    route: 'outside',
    requires: { flag: 'outside_owed' },
    title: t('빈 충전선', 'A Free Cable'),
    image: 'v2/events/outside_ev_shared_charger.webp',
    gmHints: ['수선집 뒤 공용 충전기', '노란 수건을 알아보는 수거원', '손수 끓인 물과 구급함'],
    text: t(
      '수선집 뒤 작업대. 전해액 유리병 옆으로 충전선들이 늘어져 있다. 세탁물 수거원이 당신 손의 노란 수건을 보고 자기 전화기를 뽑는다.\n“내 건 이만하면 돼요.” 의자도 발로 빼 준다.\n작은 전기 주전자에서 김이 난다. 수거원이 구급함을 열고 깨끗한 천을 꺼낸다.',
      'Behind the repair shop, charging cables hang beside glass electrolyte bottles. The Laundry Runner sees the yellow towel around your hand and unplugs their phone.\n“That’ll do for mine.” A foot pulls out a chair for you.\nA little electric kettle steams. The runner opens a first-aid box and takes out clean cloth.',
    ),
    options: [
      {
        label: t('충전하는 동안 손을 씻고 다시 감는다', 'Wash and dress your hand while the phone charges'),
        hint: t('비용 없음 · +6 HP', 'No cost · +6 HP'),
        success: {
          text: t(
            '미지근한 물로 손바닥을 씻는다. 수거원이 새 천의 끝을 눌러 붙인다. “수건은 빨아서 돌려줄게요.” 당신 전화기에 충전 표시가 뜬다.',
            'You wash your palm in lukewarm water. The runner secures the fresh dressing. “I’ll wash that towel for you.” Your phone’s charging light comes on.',
          ),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
      {
        label: t('의자를 붙여 일행도 쉬게 한다', 'Pull the chairs together for the group'),
        hint: t('비용 없음 · 일행 HP +3', 'No cost · party heals 3 HP'),
        success: {
          text: t(
            '수거원이 종이컵을 더 꺼낸다. 돌아가며 상처를 닦고 물을 마신다. 전화기들이 작업대에 나란히 놓인다. 누구도 충전을 재촉하지 않는다.',
            'The runner finds more paper cups. You take turns cleaning cuts and drinking water. Phones line up on the workbench. Nobody hurries the charging.',
          ),
          effects: [{ kind: 'heal_party', amount: 3 }],
        },
      },
    ],
  },
]
