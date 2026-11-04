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
        hint: t('코덱스 · +30 ₵, 추적 +3 · 실패 추적 +5', 'Codex · +30 ₵, +3 Trace · fail +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t(
            '“대리 수령인의 위치를 확인했습니다.” 당신 앞으로 보상금이 나온다. 배식 담당은 서식 뒷면에 내일 배식 시간을 적는다.',
            '“The collecting representative’s location is confirmed.” The payment arrives in your account. The Server writes tomorrow’s serving hours on the back.',
          ),
          effects: [
            { kind: 'credits', amount: 30 },
            { kind: 'trace', amount: 3 },
            { kind: 'codex', id: 'lore_outside_list' },
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
  // 2026-11-04: four more back-alley scenes (the route rolled from 14 events, against 37 in the base Act 2).
  {
    id: 'outside_ev_dumplings',
    acts: [2],
    route: 'outside',
    title: t('마지막 한 판', 'The Last Tray'),
    image: 'v2/events/outside_ev_dumplings.webp',
    gmHints: ['만두 가게의 마지막 찜기', '김이 오르는 대나무 뚜껑', '남은 만두를 세는 주인'],
    text: t(
      '셔터를 반쯤 내린 만두 가게에서 마지막 찜기가 김을 뿜는다. 주인이 대나무 뚜껑을 들고 남은 개수를 센다.\n“버리긴 아깝고, 들고 갈 손이 없네.” 골목 끝 쉼터 쪽으로 턱짓한다.',
      'In a dumpling shop with its shutter half down, the last steamer breathes out. The owner lifts the bamboo lid and counts what’s left.\n“Too good to throw out, and no hands to carry it.” A nod toward the shelter at the end of the alley.',
    ),
    options: [
      {
        label: t('찜기를 통째로 쉼터까지 나른다', 'Carry the whole steamer to the shelter'),
        hint: t('근력 5 · 성공 파티 회복 8 · 실패 −3 HP', 'STR 5 · success: heal party 8 · fail: −3 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t('쉼터 사람들이 줄을 선다. 마지막 몇 개가 당신 몫으로 남는다. 아직 뜨겁다.', 'The shelter lines up. The last few are left for you. Still hot.'),
          effects: [{ kind: 'heal_party', amount: 8 }],
        },
        failure: {
          text: t('찜기 손잡이가 손바닥을 데운다. 주인이 행주를 감아 다시 쥐여 준다.', 'The steamer handle scalds your palm. The owner wraps it in a cloth and hands it back.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('남은 만두를 산다', 'Buy what’s left'),
        hint: t('−10 ₵ · +10 HP', '−10 ₵ · +10 HP'),
        requires: { minCredits: 10 },
        success: {
          text: t('주인이 종이봉투에 담아 준다. 하나 더 넣는다. “덤.”', 'The owner bags them in paper and adds one more. “On the house.”'),
          effects: [
            { kind: 'credits', amount: -10 },
            { kind: 'hp', amount: 10 },
          ],
        },
      },
      {
        label: t('김을 지나 골목을 건넌다', 'Walk on through the steam'),
        hint: t('비용 없음 · 추적 −3', 'No cost · −3 Trace'),
        success: {
          text: t('김이 골목을 덮는다. 정리반 경광등이 그 속에서 흐려진다.', 'Steam fills the alley. The Crew’s beacon blurs inside it.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('도윤이 쉼터 줄을 센다', 'Doyun counts the shelter line'),
        hint: t('파티 회복 6 · 도윤 유대 +1', 'heal party 6 · Doyun bond +1'),
        requires: { companion: 'doyun' },
        success: {
          text: t('도윤이 줄을 세 번 센다. 만두 개수와 맞는다. 맨 끝 사람까지 하나씩 돌아간다.', 'Doyun counts the line three times. It matches the dumplings. Everyone, to the last person, gets one.'),
          effects: [{ kind: 'heal_party', amount: 6 }, { kind: 'bond', id: 'doyun', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_umbrellas',
    acts: [2],
    route: 'outside',
    title: t('주인 없는 우산', 'Umbrellas No One Claimed'),
    image: 'v2/events/outside_ev_umbrellas.webp',
    gmHints: ['역 앞 우산 보관대', '시간이 적힌 꼬리표', '찾아가지 않은 우산을 나눠 주는 관리인'],
    text: t(
      '역 앞 우산 보관대. 우산마다 맡긴 시간이 적힌 꼬리표가 달려 있다. 오늘 밤 안 찾아가면 정리반이 수거한다.\n관리인이 꼬리표를 넘겨 본다. “다들 내일 찾으러 온다고 했는데.”',
      'An umbrella stand in front of the station, each umbrella tagged with the time it was left. Anything unclaimed tonight, the Crew collects.\nThe attendant leafs through the tags. “They all said they’d be back tomorrow.”',
    ),
    options: [
      {
        label: t('꼬리표 주소로 우산을 돌려준다', 'Return the umbrellas to the addresses on the tags'),
        hint: t('관찰 6 · 성공 ◈ +5 · 실패 추적 +5', 'OBS 6 · success: +5 ◈ · fail: +5 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('주소 셋은 같은 골목이다. 문 앞에 우산을 세워 둔다. 창 하나에 불이 켜진다.', 'Three addresses share one alley. You lean the umbrellas by the doors. One window lights up.'),
          effects: [{ kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('꼬리표 글씨가 번져 읽히지 않는다. 우산을 든 채 헤매다 정리반 눈에 띈다.', 'The ink on the tags has run. Wandering with an armful of umbrellas, you catch the Crew’s eye.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('하나를 빌려 쓰고 간다', 'Borrow one for the road'),
        hint: t('소모품 · 추적 +2', 'Consumable · +2 Trace'),
        success: {
          text: t('관리인이 가장 낡은 우산을 고른다. 손잡이 안쪽에 누군가 넣어 둔 보급품이 있다.', 'The attendant picks the oldest umbrella. Inside the handle, someone had tucked a supply pack.'),
          effects: [
            { kind: 'consumable' },
            { kind: 'trace', amount: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_payphone',
    acts: [2],
    route: 'outside',
    title: t('폐점 전 한 통화', 'One Call Before Closing'),
    image: 'v2/events/outside_ev_payphone.webp',
    gmHints: ['골목 끝 공중전화', '동전 하나가 모자란 노인', '끊기기 직전의 신호음'],
    text: t(
      '골목 끝 공중전화 앞에 노인이 동전을 세고 있다. 하나가 모자란다. 폐점 방송이 끝나면 이 전화도 끊긴다.\n“딸한테 한 마디만 하면 되는데.”',
      'At the payphone at the end of the alley an old man is counting coins. One short. When the closing broadcast ends, this phone goes dead too.\n“I only need to say one thing to my daughter.”',
    ),
    options: [
      {
        label: t('동전을 보태 준다', 'Add a coin'),
        hint: t('−5 ₵ · ◈ +4 · 추적 −3', '−5 ₵ · +4 ◈ · −3 Trace'),
        requires: { minCredits: 5 },
        success: {
          text: t('노인이 짧게 말한다. “잘 지내라.” 수화기를 내려놓고 고개를 숙인다. 골목이 조용해진다.', 'The old man says it short: “Take care.” He hangs up and bows his head. The alley goes quiet.'),
          effects: [
            { kind: 'credits', amount: -5 },
            { kind: 'echoes', amount: 4 },
            { kind: 'trace', amount: -3 },
          ],
        },
      },
      {
        label: t('전화기 동전 투입구를 손본다', 'Fix the phone’s coin slot'),
        hint: t('지능 6 · 성공 +15 ₵ · 실패 추적 +5', 'INT 6 · success: +15 ₵ · fail: +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('걸린 동전들이 쏟아진다. 노인의 몫을 빼고 나머지를 나눈다. 통화는 공짜가 된다.', 'Jammed coins pour out. You set aside the old man’s share and split the rest. The call is free.'),
          effects: [{ kind: 'credits', amount: 15 }],
        },
        failure: {
          text: t('투입구가 경보음을 낸다. 노인이 수화기를 꽉 쥔다.', 'The coin slot sounds an alarm. The old man grips the receiver.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('통화하는 동안 골목을 지켜 준다', 'Keep watch on the alley while he calls'),
        hint: t('추적 −6 · ◈ +2', '−6 Trace · +2 ◈'),
        success: {
          text: t('정리반 경광등이 골목 입구에서 멈췄다가 지나간다. 노인이 수화기를 내려놓고 당신에게 고개를 숙인다.', 'The Crew’s beacon pauses at the alley mouth, then moves on. The old man hangs up and bows to you.'),
          effects: [
            { kind: 'trace', amount: -6 },
            { kind: 'echoes', amount: 2 },
          ],
        },
      },
    ],
  },
  {
    id: 'outside_ev_shoeshine',
    acts: [2],
    route: 'outside',
    title: t('정리반의 구두', 'The Crew’s Boots'),
    image: 'v2/events/outside_ev_shoeshine.webp',
    gmHints: ['지하도 구두닦이 의자', '구두약 냄새', '발소리로 정리반을 아는 구두닦이'],
    text: t(
      '지하도 계단 밑에서 구두닦이가 마지막 손님의 구두를 닦는다. 손을 멈추지 않고 말한다.\n“정리반 구두는 밑창에 쇠를 박아요. 계단에서 소리가 달라. 열 걸음 밖에서도 알지.”',
      'Under the underpass stairs, a shoeshiner works on the last customer’s shoes and talks without stopping.\n“The Crew put iron in their soles. They sound different on stairs. I know them from ten steps off.”',
    ),
    options: [
      {
        label: t('정리반 순찰 소리를 배운다', 'Learn the sound of the Crew’s patrol'),
        hint: t('추적 −8', '−8 Trace'),
        success: {
          text: t('구두닦이가 솔로 계단을 두드려 박자를 들려준다. 다음 계단에서 당신은 먼저 숨는다.', 'The shoeshiner taps the stairs with a brush to show the rhythm. On the next stairway, you hide first.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
      },
      {
        label: t('구두를 맡긴다', 'Have your boots shined'),
        hint: t('−8 ₵ · 파티 회복 5', '−8 ₵ · heal party 5'),
        requires: { minCredits: 8 },
        success: {
          text: t('닦는 동안 발을 쉰다. 다 닦은 구두는 소리가 안 난다. 구두닦이가 웃는다. “이건 서비스.”', 'Your feet rest while he works. The finished boots make no sound. He grins. “That part’s free.”'),
          effects: [
            { kind: 'credits', amount: -8 },
            { kind: 'heal_party', amount: 5 },
          ],
        },
      },
      {
        label: t('계단에 앉아 쇠 밑창 소리를 기다린다', 'Sit on the stairs and wait for the iron soles'),
        hint: t('관찰 6 · 성공 ◈ +4 · 실패 추적 +4', 'OBS 6 · success: +4 ◈ · fail: +4 Trace'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('딸깍, 딸깍. 정리반이 위층 통로를 지나간다. 몇 명인지까지 들린다.', 'Clack, clack. The Crew pass along the walkway above. You can hear how many.'),
          effects: [{ kind: 'echoes', amount: 4 }],
        },
        failure: {
          text: t('졸다가 고개를 든다. 쇠 밑창이 바로 위에서 멈춰 있다.', 'You nod off and look up. Iron soles have stopped right above you.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
    ],
  },
  // 2026-11-04 (2): four more, toward the base Act 2's variety.
  {
    id: 'outside_ev_keys',
    acts: [2],
    route: 'outside',
    title: t('복사한 열쇠', 'Copied Keys'),
    image: 'v2/events/outside_ev_keys.webp',
    gmHints: ['열쇠 복사집의 마지막 손님', '쇠 냄새 나는 연마기', '이사 가는 가족의 열쇠 꾸러미'],
    text: t(
      '열쇠 복사집 연마기가 아직 돈다. 이사 가는 가족이 열쇠 꾸러미를 맡겼다. 새집 열쇠가 아니라 옛집 열쇠를 복사해 달란다.\n“돌아올 수도 있잖아요.” 주인이 쇳가루를 턴다.',
      'The key cutter’s grinder is still turning. A family moving out left a ring of keys: copies of the old home’s keys, not the new one.\n“We might come back.” The owner brushes off the iron filings.',
    ),
    options: [
      {
        label: t('복사를 돕는다', 'Help cut the copies'),
        hint: t('민첩 5 · 성공 +20 ₵ · 실패 −3 HP', 'AGI 5 · success: +20 ₵ · fail: −3 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t('열쇠 열두 개. 주인이 공임을 반 나눈다. 가족은 옛집 열쇠를 목걸이에 꿴다.', 'Twelve keys. The owner splits the fee. The family threads the old keys on a cord.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
        failure: {
          text: t('연마기에 손끝이 스친다. 주인이 반창고를 붙여 준다.', 'The grinder nicks a fingertip. The owner puts a plaster on it.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('옛집 주소를 기록에 남기지 말라고 부탁한다', 'Ask them to keep the old address off the record'),
        hint: t('추적 −6 · ◈ +2', '−6 Trace · +2 ◈'),
        success: {
          text: t('주인이 장부의 주소 칸을 비워 둔다. “열쇠만 기억하면 되죠.”', 'The owner leaves the address blank in the ledger. “The keys remember enough.”'),
          effects: [{ kind: 'trace', amount: -6 }, { kind: 'echoes', amount: 2 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_bakery',
    acts: [2],
    route: 'outside',
    title: t('마지막 반죽', 'The Last Dough'),
    image: 'v2/events/outside_ev_bakery.webp',
    gmHints: ['밤 빵집의 남은 반죽', '꺼져 가는 오븐', '반죽을 나누는 제빵사'],
    text: t(
      '빵집 오븐이 식어 간다. 반죽 한 덩이가 남았다. 제빵사가 밀대를 든다. “지금 구우면 정리반 오기 전에 나와요. 오븐 문 좀 잡아 줄래요?”',
      'The bakery oven is cooling. One lump of dough is left. The baker picks up a rolling pin. “Bake it now and it’s out before the Crew comes. Hold the oven door?”',
    ),
    options: [
      {
        label: t('오븐 문을 잡는다', 'Hold the oven door'),
        hint: t('근력 5 · 성공 파티 회복 8 · 실패 −3 HP', 'STR 5 · success: heal party 8 · fail: −3 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t('빵이 부푼다. 제빵사가 반을 갈라 당신 몫을 싸 준다.', 'The bread rises. The baker splits it and wraps your half.'),
          effects: [{ kind: 'heal_party', amount: 8 }],
        },
        failure: {
          text: t('열기에 팔뚝을 덴다. 빵은 조금 탔지만 먹을 만하다.', 'The heat catches your forearm. The bread is a little burnt but edible.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('반죽을 이웃들에게 나눠 준다', 'Hand the dough out to the neighbours'),
        hint: t('◈ +4 · 추적 −3', '+4 ◈ · −3 Trace'),
        success: {
          text: t('집집마다 작은 반죽이 들어간다. 골목 오븐 몇 개가 다시 켜진다.', 'A small piece goes into every home. A few ovens along the alley light up again.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_bike',
    acts: [2],
    route: 'outside',
    title: t('빠진 체인', 'The Slipped Chain'),
    image: 'v2/events/outside_ev_bike.webp',
    gmHints: ['배달 자전거의 빠진 체인', '기름 묻은 장갑', '마지막 배달 상자'],
    text: t(
      '배달원이 자전거 옆에 쪼그려 앉아 있다. 체인이 빠졌다. 짐받이에 마지막 배달 상자.\n“이거 하나 남았어요. 명단 밖 할머니 약이에요.”',
      'A courier crouches by a bicycle. The chain has slipped. On the rack, the last delivery box.\n“Just this one left. Medicine for an old lady off the list.”',
    ),
    options: [
      {
        label: t('체인을 다시 건다', 'Put the chain back on'),
        hint: t('지능 5 · 성공 ◈ +5 · 실패 추적 +4', 'INT 5 · success: +5 ◈ · fail: +4 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t('체인이 맞물린다. 배달원이 페달을 밟으며 손을 흔든다. 약은 제시간에 간다.', 'The chain catches. The courier waves and pedals off. The medicine arrives on time.'),
          effects: [{ kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('체인이 다시 빠진다. 배달원이 결국 상자를 들고 뛴다. 정리반이 뛰는 사람을 본다.', 'The chain slips again. The courier ends up running with the box. The Crew notice a runner.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('상자를 대신 배달한다', 'Deliver the box yourself'),
        hint: t('추적 −5 · 소모품', '−5 Trace · consumable'),
        success: {
          text: t('할머니가 문틈으로 약을 받고 사탕 한 봉지를 내민다. 봉지 안에 보급품이 섞여 있다.', 'The old lady takes the medicine through the door gap and hands over a bag of sweets with a supply pack inside.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'consumable' }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_karaoke',
    acts: [2],
    route: 'outside',
    title: t('마지막 곡', 'The Last Song'),
    image: 'v2/events/outside_ev_karaoke.webp',
    gmHints: ['폐점 직전 노래방 부스', '점수가 안 나오는 마이크', '혼자 남은 손님'],
    text: t(
      '노래방 부스 하나에만 불이 켜져 있다. 혼자 남은 손님이 마지막 곡을 고른다. 폐점 방송이 노래를 끊기 전에 끝내고 싶어 한다.\n“점수는 안 나와도 돼요. 끝까지만.”',
      'Only one karaoke booth is still lit. The last customer picks a final song and wants to finish it before the closing broadcast cuts it off.\n“I don’t care about the score. Just to the end.”',
    ),
    options: [
      {
        label: t('같이 부른다', 'Sing along'),
        hint: t('매력 5 · 성공 ◈ +5 · 실패 추적 +4', 'CHA 5 · success: +5 ◈ · fail: +4 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('마지막 소절에서 방송이 시작된다. 둘의 목소리가 방송보다 조금 더 크다.', 'The broadcast starts on the last line. Your two voices are a little louder.'),
          effects: [{ kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('음이 엇나간다. 웃음소리가 복도까지 새어 정리반이 문을 두드린다.', 'You miss the note. Laughter leaks down the hall and the Crew knock on the door.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('방송 스피커 앞을 막아 준다', 'Stand in front of the broadcast speaker'),
        hint: t('추적 −4 · +4 HP', '−4 Trace · +4 HP'),
        success: {
          text: t('스피커가 당신 등에 막혀 웅얼거린다. 노래가 끝까지 간다. 손님이 고개를 숙인다.', 'Muffled by your back, the speaker mumbles. The song goes to the end. The customer bows.'),
          effects: [{ kind: 'trace', amount: -4 }, { kind: 'hp', amount: 4 }],
        },
      },
    ],
  },
  // 2026-11-04 (3): four more (26 route events).
  {
    id: 'outside_ev_cat',
    acts: [2],
    route: 'outside',
    title: t('명단에 없는 고양이', 'The Cat Off the List'),
    image: 'v2/events/outside_ev_cat.webp',
    gmHints: ['골목 고양이', '이름표 없는 목걸이', '밥그릇을 놓는 사람들'],
    text: t(
      '골목 고양이 한 마리가 셔터 밑을 들락거린다. 목걸이에 이름표가 없다. 가게마다 밥그릇이 하나씩 나와 있다. 정리반은 고양이를 세지 않는다.\n“쟤가 제일 자유로워.” 배식 담당이 웃는다.',
      'An alley cat slips in and out under the shutters. Its collar has no tag. Every shop has put out a bowl. The Crew don’t count cats.\n“That one’s the freest of us,” the Server laughs.',
    ),
    options: [
      {
        label: t('고양이를 따라간다', 'Follow the cat'),
        hint: t('관찰 5 · 성공 추적 −8 · 실패 추적 +3', 'OBS 5 · success: −8 Trace · fail: +3 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('고양이는 정리반이 안 다니는 길만 안다. 담 틈을 지나 다음 골목으로.', 'The cat knows only the routes the Crew never take. Through a gap in a wall, into the next alley.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
        failure: {
          text: t('고양이가 지붕으로 사라진다. 당신은 막다른 골목에 남는다.', 'The cat vanishes onto a roof. You’re left in a dead end.'),
          effects: [{ kind: 'trace', amount: 3 }],
        },
      },
      {
        label: t('밥그릇에 먹을 것을 보탠다', 'Add something to a bowl'),
        hint: t('◈ +4 · +3 HP', '+4 ◈ · +3 HP'),
        success: {
          text: t('고양이가 당신 발목에 몸을 한 번 비빈다. 가게 주인이 차 한 잔을 내준다.', 'The cat rubs once against your ankle. The shopkeeper hands you a cup of tea.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'hp', amount: 3 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_bathhouse',
    acts: [2],
    route: 'outside',
    title: t('마지막 탕', 'The Last Bath'),
    image: 'v2/events/outside_ev_bathhouse.webp',
    gmHints: ['문 닫는 동네 목욕탕', '꺼지지 않은 보일러', '명단 밖 손님을 기다리는 세신사'],
    text: t(
      '동네 목욕탕 간판이 꺼졌다. 그런데 보일러는 아직 돈다. 세신사가 문 앞에 수건을 쌓아 두었다.\n“일 끝난 사람들은 이 시간에 와요. 명단에 없어도 때는 밀어야지.”',
      'The neighbourhood bathhouse sign is off, but the boiler is still running. The bath attendant has stacked towels by the door.\n“People who finish work come at this hour. List or no list, you still need a scrub.”',
    ),
    options: [
      {
        label: t('뜨거운 탕에 들어간다', 'Get into the hot bath'),
        hint: t('+12 HP', '+12 HP'),
        success: {
          text: t('물이 어깨까지 올라온다. 하루치 피로가 수증기로 빠져나간다.', 'The water comes up to your shoulders. A day’s ache steams out of you.'),
          effects: [{ kind: 'hp', amount: 12 }],
        },
      },
      {
        label: t('보일러 땔감을 날라 준다', 'Carry fuel for the boiler'),
        hint: t('근력 5 · ◈ +4, +10 ₵ · 실패 −3 HP', 'STR 5 · +4 ◈, +10 ₵ · fail −3 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t('보일러가 한 시간 더 돈다. 세신사가 수고비와 우유 한 병을 준다.', 'The boiler runs another hour. The attendant pays you and adds a bottle of milk.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'credits', amount: 10 }],
        },
        failure: {
          text: t('땔감 더미가 무너진다. 정강이에 멍이 든다.', 'The fuel stack topples. Your shin bruises.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_seal',
    acts: [2],
    route: 'outside',
    title: t('이름 도장', 'Name Seals'),
    image: 'v2/events/outside_ev_seal.webp',
    gmHints: ['골목 끝 도장집', '번호 대신 새기는 이름', '돋보기 쓴 각인사'],
    text: t(
      '도장집 각인사가 돋보기를 끼고 나무 도장에 이름을 새긴다. 손님들은 모두 등록번호가 없는 사람들이다.\n“서류에 번호 칸은 비워 두고, 여기다 이걸 찍으라고 해요. 이름은 있으니까.”',
      'The seal carver, loupe on, carves a name into a wooden stamp. Every customer is someone without a registration number.\n“Leave the number box empty and stamp this there instead. They still have a name.”',
    ),
    options: [
      {
        label: t('당신 이름도 새겨 달라고 한다', 'Ask for a seal with your name'),
        hint: t('◈ +5 · −10 ₵', '+5 ◈ · −10 ₵'),
        requires: { minCredits: 10 },
        success: {
          text: t('각인사가 당신 이름을 천천히 새긴다. 찍어 보니 획 하나가 조금 삐뚤다. 그게 더 당신 같다.', 'The carver cuts your name slowly. The test print has one stroke slightly crooked, which suits you better.'),
          effects: [{ kind: 'echoes', amount: 5 }, { kind: 'credits', amount: -10 }],
        },
      },
      {
        label: t('밀린 주문을 같이 새긴다', 'Help carve the backlog'),
        hint: t('민첩 5 · 성공 +20 ₵ · 실패 −3 HP', 'AGI 5 · success: +20 ₵ · fail: −3 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t('도장 다섯 개. 각인사가 공임을 반 나눈다. 다섯 이름이 내일 서류에 찍힐 것이다.', 'Five seals. The carver splits the fee. Five names will be stamped on forms tomorrow.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
        failure: {
          text: t('조각칼이 미끄러진다. 엄지에 피가 맺힌다.', 'The chisel slips. Blood beads on your thumb.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('도장 찍는 법을 구경한다', 'Watch how the seals are used'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('번호 칸에 이름 도장이 찍힌 서류는 정리반 단말이 읽지 못한다. 쓸모 있는 요령이다.', 'A form with a name seal in the number box can’t be read by the Crew’s terminals. A useful trick.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_vending',
    acts: [2],
    route: 'outside',
    title: t('두드리면 나오는 자판기', 'The Knock-Knock Machine'),
    image: 'v2/events/outside_ev_vending.webp',
    gmHints: ['고장 난 척하는 자판기', '정해진 박자로 두드리기', '골목 사람들만 아는 요령'],
    text: t(
      '골목 끝 낡은 자판기. 화면은 꺼져 있다. 그런데 지나가던 아이가 옆구리를 세 번, 한 번 두드리자 캔 하나가 굴러 나온다.\n“명단 밖 사람만 아는 거예요. 기계도 우리 편이에요.”',
      'An old vending machine at the end of the alley, screen dark. A passing kid knocks its side three times, then once, and a can rolls out.\n“Only people off the list know. Even machines are on our side.”',
    ),
    options: [
      {
        label: t('박자대로 두드려 본다', 'Knock the rhythm'),
        hint: t('관찰 5 · 성공 소모품 · 실패 추적 +4', 'OBS 5 · success: consumable · fail: +4 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('세 번, 한 번. 캔 대신 보급 팩이 떨어진다. 아이가 박수를 친다.', 'Three, then one. A supply pack drops instead of a can. The kid claps.'),
          effects: [{ kind: 'consumable' }],
        },
        failure: {
          text: t('박자가 틀렸다. 자판기가 경보음을 낸다. 아이가 먼저 달아난다.', 'Wrong rhythm. The machine sounds an alarm. The kid runs first.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('아이에게 박자를 배워 둔다', 'Have the kid teach you the rhythm'),
        hint: t('◈ +3 · 추적 −3', '+3 ◈ · −3 Trace'),
        success: {
          text: t('아이가 당신 손등에 박자를 두드려 준다. 다른 골목의 기계들도 같은 박자를 안다고 한다.', 'The kid taps the rhythm on the back of your hand. Machines in other alleys know it too, apparently.'),
          effects: [{ kind: 'echoes', amount: 3 }, { kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  // 2026-11-04 (4): four more (30 route events).
  {
    id: 'outside_ev_water_tank',
    acts: [2],
    route: 'outside',
    title: t('옥상 물탱크', 'The Rooftop Tank'),
    image: 'v2/events/outside_ev_water_tank.webp',
    gmHints: ['옥상 물탱크', '단수된 골목', '물을 나르는 이웃들'],
    text: t(
      '단수된 골목 건물 옥상에 물탱크 하나가 아직 차 있다. 이웃들이 양동이를 들고 계단에 줄을 섰다. 밸브가 녹슬어 안 돌아간다.',
      'On a rooftop over the alley where the water was cut, one tank is still full. Neighbours queue on the stairs with buckets. The valve has rusted shut.',
    ),
    options: [
      {
        label: t('밸브를 비틀어 연다', 'Wrench the valve open'),
        hint: t('근력 5 · 성공 파티 회복 8 · 실패 −3 HP', 'STR 5 · success: heal party 8 · fail: −3 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t('밸브가 끽 소리를 내며 돈다. 물줄기가 양동이마다 떨어진다. 맨 끝 사람까지.', 'The valve shrieks and turns. Water falls into every bucket, to the last person in line.'),
          effects: [{ kind: 'heal_party', amount: 8 }],
        },
        failure: {
          text: t('렌치가 미끄러져 손등을 긁는다.', 'The wrench slips and scrapes your knuckles.'),
          effects: [{ kind: 'hp', amount: -3 }],
        },
      },
      {
        label: t('양동이 나르는 걸 돕는다', 'Help carry the buckets down'),
        hint: t('◈ +3 · 추적 −3', '+3 ◈ · −3 Trace'),
        success: {
          text: t('계단 네 층. 한 집에서 고맙다며 창문 너머로 사탕을 건넨다.', 'Four flights of stairs. One family hands sweets through a window in thanks.'),
          effects: [{ kind: 'echoes', amount: 3 }, { kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_newspapers',
    acts: [2],
    route: 'outside',
    title: t('내일 자 신문', 'Tomorrow’s Paper'),
    image: 'v2/events/outside_ev_newspapers.webp',
    gmHints: ['새벽 신문 묶음', '명단 밖 사람이 빠진 부고란', '신문을 접는 배달원'],
    text: t(
      '신문 배달원이 내일 자 신문 묶음을 푼다. 부고란을 펼쳐 보인다. “명단 밖 사람은 안 실어요. 죽어도요.” 빈칸이 하나 있다.',
      'A paper carrier unbundles tomorrow’s papers and opens the obituaries. “People off the list don’t get printed. Not even when they die.” There is one blank.',
    ),
    options: [
      {
        label: t('빈칸에 이름 하나를 적어 넣는다', 'Write a name into the blank'),
        hint: t('매력 5 · 성공 ◈ +5 · 실패 추적 +4', 'CHA 5 · success: +5 ◈ · fail: +4 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('배달원이 그 장을 맨 위에 올린다. “이 집에는 이걸로 넣을게요.”', 'The carrier puts that copy on top. “This house gets this one.”'),
          effects: [{ kind: 'echoes', amount: 5 }],
        },
        failure: {
          text: t('잉크가 번진다. 배달원이 다른 장으로 바꾼다. 인쇄소 단말이 오류를 기록한다.', 'The ink runs. The carrier swaps the page. The print shop terminal logs an error.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('묶음 나르는 걸 돕는다', 'Help carry the bundles'),
        hint: t('+15 ₵', '+15 ₵'),
        success: {
          text: t('새벽 첫 골목까지. 배달원이 품삯과 함께 남는 신문 한 부를 준다.', 'As far as the first alley at dawn. The carrier pays you and gives you a spare copy.'),
          effects: [{ kind: 'credits', amount: 15 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_florist',
    acts: [2],
    route: 'outside',
    title: t('마지막 꽃다발', 'The Last Bouquet'),
    image: 'v2/events/outside_ev_florist.webp',
    gmHints: ['문 닫는 꽃집', '시들기 직전의 꽃', '받을 사람이 지워진 주문서'],
    text: t(
      '꽃집 주인이 시들기 직전의 꽃으로 마지막 다발을 묶는다. 주문서의 받는 사람 칸이 지워져 있다. “주문은 들어왔는데, 받을 사람이 없대요.”',
      'The florist ties a last bouquet from flowers about to wilt. The recipient field on the order is blank. “The order came in, but they say there’s no one to receive it.”',
    ),
    options: [
      {
        label: t('그 꽃을 배식대에 갖다 놓는다', 'Take the bouquet to the serving counter'),
        hint: t('◈ +4 · 추적 −3', '+4 ◈ · −3 Trace'),
        success: {
          text: t('국자를 든 사람이 꽃을 보고 한참 서 있다. 배식대 위에 빈 병을 세워 꽂는다.', 'The one with the ladle looks at the flowers a long while, then stands them in an empty bottle on the counter.'),
          effects: [{ kind: 'echoes', amount: 4 }, { kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('남은 꽃을 정리하는 걸 돕는다', 'Help clear the leftover flowers'),
        hint: t('+4 HP · +10 ₵', '+4 HP · +10 ₵'),
        success: {
          text: t('꽃잎 냄새가 손에 밴다. 주인이 수고비를 주며 웃는다. “내일도 피어요, 다른 게.”', 'The scent stays on your hands. The florist pays you, smiling. “Something else blooms tomorrow.”'),
          effects: [{ kind: 'hp', amount: 4 }, { kind: 'credits', amount: 10 }],
        },
      },
    ],
  },
  {
    id: 'outside_ev_radio',
    acts: [2],
    route: 'outside',
    title: t('경비실 라디오', 'The Guardhouse Radio'),
    image: 'v2/events/outside_ev_radio.webp',
    gmHints: ['경비실 낡은 라디오', '정리반 무전이 섞이는 주파수', '졸고 있는 경비원'],
    text: t(
      '아파트 경비실 라디오에서 노래 사이로 무전이 섞인다. 정리반 순찰 무전이다. 경비원은 졸고 있다. 라디오만 혼자 정리반의 다음 골목을 말한다.',
      'In an apartment guardhouse, a radio mixes Crew patrol chatter in between songs. The guard dozes. Only the radio speaks, naming the Crew’s next alley.',
    ),
    options: [
      {
        label: t('주파수를 맞춰 순찰 순서를 듣는다', 'Tune in and listen to the patrol order'),
        hint: t('지능 5 · 성공 추적 −8 · 실패 추적 +4', 'INT 5 · success: −8 Trace · fail: +4 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t('다음, 그다음, 그다음. 정리반이 어디로 갈지 다 들린다.', 'Next, then next, then next. You hear everywhere the Crew will go.'),
          effects: [{ kind: 'trace', amount: -8 }],
        },
        failure: {
          text: t('잡음이 커져 경비원이 깬다. 누구냐고 묻는다.', 'The static gets loud and wakes the guard, who asks who you are.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('노래 채널로 돌려 둔다', 'Switch it back to the music'),
        hint: t('+6 HP', '+6 HP'),
        success: {
          text: t('경비원이 잠결에 노래를 따라 흥얼거린다. 당신도 잠깐 앉아 쉰다.', 'The guard hums along in his sleep. You sit and rest a moment.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
    ],
  },
]
