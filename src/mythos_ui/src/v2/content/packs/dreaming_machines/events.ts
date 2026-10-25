// Act 5 — salvage, sleeping machines and the past ARK could not erase from their dreams.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const MACHINE_EVENTS: EventDef[] = [
  {
    id: 'a5_rain_receiver',
    acts: [5],
    title: t('비를 받는 안테나', 'An Antenna for Rain'),
    image: 'v2/events/a5_rain_receiver.webp',
    gmHints: ['machine dream', 'rain recording', 'Kai'],
    text: t(
      '안드로이드 한 대가 마른 하늘을 향해 안테나를 펴고 잠들어 있다. 가슴의 스피커에서 빗소리가 난다. 빗방울 사이로 아이가 역 이름을 부르지만, 마지막 음절마다 열차가 지나간다.',
      'An android sleeps with its antenna open to a dry sky. Rain sounds from the speaker in its chest. Between the drops, a child calls out a station name, but a passing train swallows the last syllable each time.',
    ),
    options: [
      {
        label: t('열차가 지나갈 때까지 녹음한다', 'Record until the train has passed'),
        hint: t('추적 −3 · 빗소리 보관', '−3 Trace · keep the rain recording'),
        success: {
          text: t('빗소리에 수신기의 잡음이 묻힌다. 이름은 끝내 들리지 않지만, 열차가 떠난 뒤의 침묵까지 담는다.', 'The rain masks your receiver’s static. The name remains incomplete, but you keep the silence after the train as well.'),
          effects: [{ kind: 'trace', amount: -3 }, { kind: 'flag', key: 'a5_rain_kept' }, { kind: 'flag', key: 'record_1' }],
        },
      },
      {
        label: t('안테나 그늘에서 잠시 쉰다', 'Rest in the antenna’s shade'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('배낭을 베고 눕는다. 마른 먼지 위에서 비를 듣는 동안 굳었던 등이 풀린다.', 'You lie down with your pack under your head. Your back loosens as you listen to rain over dry dust.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('카이에게 익숙한 소리인지 묻는다', 'Ask Kai whether he knows the sound'),
        hint: t('카이 필요 · 유대 +1 · 빗소리 보관', 'Requires Kai · +1 bond · keep recording'),
        requires: { companion: 'kai' },
        success: {
          text: t('“꿈에서 저 아이를 기다렸어요. 얼굴은… 조금 더 들어 봐도 될까요?” 카이가 녹음이 끝나도 자리를 지킨다.', '“I waited for that child in a dream. Their face… May I listen a little longer?” Kai stays after the recording ends.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'flag', key: 'a5_rain_kept' }, { kind: 'flag', key: 'record_1' }],
        },
      },
    ],
  },
  {
    id: 'a5_magnetic_lottery',
    acts: [5],
    title: t('자석 뽑기', 'The Magnetic Lottery'),
    image: 'v2/events/a5_magnetic_lottery.webp',
    gmHints: ['gamble', 'salvage crane', 'sealed tins'],
    text: t(
      '작은 수거 크레인이 밀봉된 깡통들 위로 자석을 흔든다. 간판에는 첫 시도 무료. 옆으로 밀려난 빈 깡통에는 눌린 손잡이 자국이 있다. 집게가 멈출 때마다 안쪽에서 동전 같은 소리가 난다.',
      'A little salvage crane swings a magnet over sealed tins. FIRST TRY FREE, says the sign. The empty tins pushed aside bear dents shaped like the handle. Each time the claw stops, something inside jingles like coins.',
    ),
    options: [
      {
        label: t('흔들림이 작은 깡통을 골라 당긴다', 'Pull the tin that swings the least'),
        hint: t('관찰 6 · 성공 크레딧 +48 · 실패 HP −4', 'OBS 6 · success: +48 ₵ · fail: −4 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('무거운 깡통에서 회수 보증금이 쏟아진다. 크레인이 빈 집게로 한 번 박수를 친다.', 'Salvage deposits spill from the heavy tin. The crane claps its empty claw once.'),
          effects: [{ kind: 'credits', amount: 48 }],
        },
        failure: {
          text: t('깡통이 자석에 달라붙으며 손잡이가 손목을 친다. 소리의 정체는 낡은 와셔였다.', 'The tin snaps onto the magnet and the handle strikes your wrist. The jingling came from old washers.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('주변의 빈 깡통을 반납한다', 'Return the empty tins nearby'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('반납구가 찌그러진 깡통도 받아 준다. 계수기가 작게 울리며 잔돈을 내준다.', 'The return slot accepts even the dented tins. Its counter chimes and pays out some change.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('봉인된 정비 상자를 산다', 'Buy a sealed maintenance box'),
        hint: t('크레딧 −24 · 나노패치 1개', '−24 ₵ · 1 Nanopatch'),
        requires: { minCredits: 24 },
        success: {
          text: t('크레인이 뽑기통 아래 서랍을 연다. 상자 안의 패치는 아직 밀봉돼 있다.', 'The crane opens a drawer beneath the lottery bin. The patch inside the box is still sealed.'),
          effects: [{ kind: 'credits', amount: -24 }, { kind: 'consumable', id: 'nanopatch' }],
        },
      },
    ],
  },
  {
    id: 'a5_copper_nest',
    acts: [5],
    title: t('구리선 둥지', 'A Nest of Copper Wire'),
    image: 'v2/events/a5_copper_nest.webp',
    gmHints: ['salvage', 'scrap mites', 'Su-ah'],
    text: t(
      '고철 진드기들이 폐차의 계기판 뒤에 구리선을 감아 놓았다. 둥지 한가운데에는 아직 불이 들어오는 축전지가 있다. 진드기들은 일정한 간격으로 충전하러 나왔다가 다시 틈 속으로 숨는다.',
      'Scrap mites have wound copper wire behind a wreck’s dashboard. A capacitor still glows at the centre of the nest. At regular intervals the mites emerge to charge, then slip back into the gaps.',
    ),
    options: [
      {
        label: t('진드기가 숨은 틈에 축전지를 뺀다', 'Lift the capacitor while the mites are hidden'),
        hint: t('민첩 5 · 성공 EMP 1개 · 실패 HP −4', 'AGI 5 · success: 1 EMP · fail: −4 HP'),
        check: { stat: 'agi', dc: 5 },
        success: {
          text: t('전극을 맞대자 불빛이 한 점으로 모인다. 빈 수류탄 껍질에 넣고 안전핀을 잠근다.', 'Touching the electrodes gathers the light into a point. You fit it into an empty grenade shell and secure the pin.'),
          effects: [{ kind: 'consumable', id: 'emp_grenade' }],
        },
        failure: {
          text: t('충전이 끝난 진드기가 손등 위로 튄다. 급히 손을 빼지만 전류가 팔을 타고 오른다.', 'A charged mite springs onto your hand. You pull away, but the current runs up your arm.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('차 밖에 떨어진 전선만 판다', 'Sell only the loose wire outside the wreck'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('둥지 밖의 전선을 감아 무인 매입기에 넣는다. 무게만큼 크레딧이 찍힌다.', 'You coil the loose wire and feed it into an automated buyer. It credits you by weight.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
      {
        label: t('수아와 끊어진 배선을 잇는다', 'Repair the broken wiring with Su-ah'),
        hint: t('수아 필요 · 카드 1장 강화', 'Requires Su-ah · upgrade 1 card'),
        requires: { companion: 'su_ah' },
        success: {
          text: t('“이 꼬임 봐. 빠지지 않게 감았네.” 수아가 진드기의 매듭을 따라 장비 배선을 보강한다.', '“Look at this twist. It won’t pull loose.” Su-ah copies the mites’ knots to reinforce your equipment’s wiring.'),
          effects: [{ kind: 'upgrade_card', count: 1 }, { kind: 'codex', id: 'lore_a5_salvage_economy' }],
        },
      },
    ],
  },
  {
    id: 'a5_cold_cache',
    acts: [5],
    title: t('서리 낀 공구함', 'The Frosted Toolbox'),
    image: 'v2/events/a5_cold_cache.webp',
    gmHints: ['salvage', 'cryo drone', 'frozen tools'],
    text: t(
      '냉각 드론의 날개가 열린 공구함에 걸려 있다. 드론은 꺼졌지만 배관에는 서리가 계속 자란다. 집게 손잡이는 자유롭게 움직이고, 바닥에 닿은 바퀴만 단단히 얼어 있다.',
      'A cryo drone’s wing is caught in an open toolbox. The drone is off, but frost keeps growing along its pipes. Its claw handle moves freely; only the wheels touching the floor are frozen solid.',
    ),
    options: [
      {
        label: t('냉각 순환을 끊고 용기를 빼낸다', 'Isolate the cooling loop and remove the canister'),
        hint: t('지능 5 · 성공 냉각탄 1개 · 실패 HP −5', 'INT 5 · success: 1 Cryo · fail: −5 HP'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t('되돌아오는 관부터 잠근다. 밀봉한 냉각 용기를 수류탄 손잡이에 끼운다.', 'You close the return pipe first. The sealed coolant canister fits onto a grenade handle.'),
          effects: [{ kind: 'consumable', id: 'cryo_grenade' }],
        },
        failure: {
          text: t('압력이 남은 관에서 찬 김이 뿜어진다. 얼어붙은 소매를 녹이는 동안 손끝이 욱신거린다.', 'Cold vapour jets from a pressurised pipe. Your fingers ache while you thaw the frozen sleeve.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('서리가 닿지 않은 공구를 회수한다', 'Salvage the tools beyond the frost'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('뚜껑 안쪽의 스패너 두 개를 꺼낸다. 근처 정비기가 공구를 받고 보증금을 돌려준다.', 'You take two spanners from inside the lid. A nearby service machine accepts them and returns their deposit.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
    ],
  },
  {
    id: 'a5_furnace_receipt',
    acts: [5],
    title: t('어머니의 반납증', 'The Mother’s Return Slip'),
    image: 'v2/events/a5_furnace_receipt.webp',
    gmHints: ['salvage', 'Furnace Mother', 'unmelted stamp'],
    text: t(
      '용광로 어머니의 투입구 아래로 반납증이 쌓여 있다. 모두 같은 문장으로 끝난다. 다시 쓸 수 있음. 식은 슬래그 속에는 그 문장을 찍던 금속 도장이 박혀 있다.',
      'Return slips pile up beneath the Furnace Mother’s intake. Each ends with the same words: CAN BE USED AGAIN. The metal stamp that printed them is lodged in cold slag.',
    ),
    options: [
      {
        label: t('슬래그를 벌려 도장을 꺼낸다', 'Pry the slag apart and free the stamp'),
        hint: t('근력 6 · 성공 카드 강화 · 실패 HP −5', 'STR 6 · success: upgrade · fail: −5 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('도장 밑에 정밀 금형이 붙어 나온다. 닳은 장비 부속을 금형에 대고 다시 맞춘다.', 'A precision mould comes free beneath the stamp. You use it to refit a worn component of your gear.'),
          effects: [{ kind: 'upgrade_card', count: 1 }],
        },
        failure: {
          text: t('받침이 무너지며 무릎이 바닥에 부딪힌다. 도장은 슬래그 속으로 더 깊이 들어간다.', 'The support gives way and your knee hits the floor. The stamp sinks deeper into the slag.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('미정산 반납증을 정산기에 넣는다', 'Feed the unpaid slips into the payment terminal'),
        hint: t('크레딧 +24', '+24 ₵'),
        success: {
          text: t('정산기는 물건이 이미 녹았는지 묻지 않는다. 오래 밀린 회수비를 지급한다.', 'The terminal does not ask whether the items have already melted. It pays the overdue salvage fees.'),
          effects: [{ kind: 'credits', amount: 24 }],
        },
      },
    ],
  },
  {
    id: 'a5_shared_dream',
    acts: [5],
    title: t('함께 잠드는 시간', 'The Hour They Sleep Together'),
    image: 'v2/events/a5_shared_dream.webp',
    gmHints: ['machine dream', 'synchronised sleep', 'prewar kitchen'],
    text: t(
      '줄지어 앉은 안드로이드들의 눈꺼풀이 동시에 내려간다. 가슴 화면에 같은 부엌이 나타난다. 전쟁 전 달력, 끓는 주전자, 아이 몫의 빈 의자. 한 대의 화면만 의자를 문 쪽으로 돌려 놓았다.',
      'The eyelids of a row of seated androids close together. Their chest screens show the same kitchen: a prewar calendar, a boiling kettle, an empty child’s chair. On one screen, the chair faces the door.',
    ),
    options: [
      {
        label: t('서로 다른 장면의 신호를 분리한다', 'Separate the signals of the differing scenes'),
        hint: t('지능 6 · 성공 카드 선택 · 실패 추적 +5', 'INT 6 · success: pick card · fail: +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('의자를 돌린 쪽에서 다른 동작 기록이 열린다. 같은 순간에도 각자 고른 길이 전술 페이지로 남아 있다.', 'The turned chair opens a separate movement record. Even in the same moment, each machine chose a different path; you copy one into your tactics.'),
          effects: [{ kind: 'card_choice' }, { kind: 'codex', id: 'lore_a5_shared_dream' }],
        },
        failure: {
          text: t('화면들이 한꺼번에 당신 쪽으로 돌아선다. 수면 감시기가 새 접속을 기록한다.', 'Every screen turns toward you at once. The sleep monitor logs a new connection.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('주전자가 멎을 때까지 옆에 앉는다', 'Sit beside them until the kettle falls silent'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('누군가의 꿈속 물이 다 끓는다. 화면의 김이 걷힐 때쯤 당신의 호흡도 고르게 돌아온다.', 'The water finishes boiling in someone’s dream. By the time the steam clears from the screens, your breathing has steadied.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
    ],
  },
  {
    id: 'a5_child_platform',
    acts: [5],
    title: t('아이의 높이에서', 'At a Child’s Height'),
    image: 'v2/events/a5_child_platform.webp',
    speaker: 'kai',
    requires: { companion: 'kai' },
    gmHints: ['machine dream', 'Kai', 'rain child'],
    text: t(
      '폐승강장의 광고판이 빗물 무늬를 비춘다. 카이가 무릎을 굽혀 작은 손자국에 손을 댄다. “꿈에서는 늘 내려다봤어요. 저 아이가 어디를 보는지는 한 번도…” 눈높이를 낮추자 맞은편 창에 집 한 채가 비친다.',
      'A disused platform’s billboard projects patterns of rain. Kai kneels and touches a small handprint. “I always looked down in the dream. I never thought to see where the child…” From this height, a house appears in the opposite window.',
    ),
    options: [
      {
        label: t('카이가 창을 다 볼 때까지 기다린다', 'Wait until Kai has finished looking'),
        hint: t('카이 유대 +1 · 추적 −2', '+1 Kai bond · −2 Trace'),
        success: {
          text: t('“집으로 가는 길을 보고 있었네요.” 카이가 먼저 일어난다. 몸을 낮춘 사이 승강장 감시등도 지나갔다.', '“They were looking at the way home.” Kai stands first. While you crouched, the platform’s searchlight passed overhead.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'trace', amount: -2 }, { kind: 'flag', key: 'record_4' }],
        },
      },
      {
        label: t('창에 비친 길을 지도로 옮긴다', 'Map the path reflected in the window'),
        hint: t('카드 1장 선택', 'Pick 1 card'),
        success: {
          text: t('낮은 담장과 계단을 그린다. 카이가 막힌 구간에 우회선을 긋는다. 아이가 걷던 길이 이동 전술이 된다.', 'You sketch the low walls and steps. Kai adds a detour around a blocked passage. The child’s route becomes a movement tactic.'),
          effects: [{ kind: 'card_choice' }],
        },
      },
    ],
  },
  {
    id: 'a5_erased_rollcall',
    acts: [5],
    title: t('지워진 출석부', 'The Erased Roll Call'),
    image: 'v2/events/a5_erased_rollcall.webp',
    gmHints: ['erased past', 'ARK', 'school transport'],
    text: t(
      '통학 차량의 운행 기록에 ARK 삭제 도장이 겹겹이 찍혀 있다. 이름 칸은 하얗지만 좌석 감지등은 아직 켜져 있다. 빈 운전석에서 출석을 부르는 입 모양만 반복된다.',
      'ARK erasure stamps cover a school transport’s log. The name fields are white, but the seat sensors still glow. At the empty driver’s seat, a silent mouth repeats the roll call.',
    ),
    options: [
      {
        label: t('삭제 도장 아래 눌린 글자를 읽는다', 'Read the impressions beneath the erasure stamps'),
        hint: t('관찰 5 · 성공 기록·추적 −4 · 실패 +4', 'OBS 5 · record, −4 Trace / fail: +4 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('옆빛을 비추자 MythOS와 전쟁 전 날짜가 드러난다. 사본을 챙기고 외부 조회선을 끊는다.', 'Sidelight reveals MythOS and a prewar date. You take a copy, then disconnect the external query line.'),
          effects: [{ kind: 'flag', key: 'a5_ark_imprint' }, { kind: 'trace', amount: -4 }, { kind: 'codex', id: 'lore_a5_erased_history' }],
        },
        failure: {
          text: t('빛을 받은 도장이 검게 변한다. 삭제 기록의 열람 시도가 ARK 주소로 전송된다.', 'The stamps darken under the light. A notice that someone tried to read the erased record goes to an ARK address.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('남은 좌석등을 끄고 차에서 내린다', 'Switch off the seat lights and leave the vehicle'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('불빛이 하나씩 꺼진다. 차량이 빈 좌석을 확인하느라 보내던 신호가 멎는다.', 'The lights go out one by one. The vehicle stops broadcasting checks for its empty seats.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('한에게 삭제층을 복사해 달라고 한다', 'Ask Han to copy the erasure layer'),
        hint: t('한 필요 · 기록 보관 · 유대 +1', 'Requires Han · keep record · +1 bond'),
        requires: { companion: 'han' },
        success: {
          text: t('“지운 자리도 기록이지.” 한이 MythOS라는 글자와 날짜를 옮긴다. 빈 이름 칸은 그대로 둔다.', '“The erasure leaves a record too.” Han copies the word MythOS and the date. He leaves the empty name fields untouched.'),
          effects: [{ kind: 'flag', key: 'a5_ark_imprint' }, { kind: 'bond', id: 'han', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a5_ix_inventory',
    acts: [5],
    title: t('재고에 없는 꿈', 'A Dream Outside the Inventory'),
    image: 'v2/events/a5_ix_inventory.webp',
    gmHints: ['IX contact', 'inventory terminal', 'unclassified dream'],
    text: t(
      '재고 단말기에 IX의 접속 표시가 켜진다. 부품 수량 아래에 꿈이라는 항목이 생겼다 사라진다. “폐기 자산의 잔여 활동을 확인 중입니다. 소유자를 지정하시겠습니까?” 소유자 칸은 비어 있다.',
      'IX’s connection indicator lights up on an inventory terminal. Beneath the parts count, a field labelled DREAM appears and disappears. “Checking residual activity in discarded assets. Would you like to assign an owner?” The owner field is empty.',
    ),
    options: [
      {
        label: t('꿈꾸는 당사자에게 물으라고 답한다', 'Tell IX to ask the dreamer'),
        hint: t('매력 6 · 성공 추적 −6 · 실패 추적 +5', 'CHA 6 · success: −6 Trace · fail: +5 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('“확인 주체를 재검토하겠습니다.” 소유자 칸이 닫힌다. 당신에게 붙었던 임시 관리 번호도 지워진다.', '“I will reconsider who should confirm this.” The owner field closes. The temporary custodian number assigned to you disappears.'),
          effects: [{ kind: 'trace', amount: -6 }],
        },
        failure: {
          text: t('“응답자를 확인하지 못했습니다.” IX가 당신의 접속을 미해결 항목 아래 보관한다.', '“I could not identify a respondent.” IX files your connection under unresolved items.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('소유권 신청 없이 정비 작업만 마친다', 'Finish the maintenance without claiming ownership'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('헐거운 단말기 받침을 조인다. IX가 작업비를 지급하고, 비어 있는 칸에 커서만 남긴다.', 'You tighten the terminal’s loose stand. IX pays the service fee, leaving a cursor in the empty field.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('카이가 직접 대답할 자리를 내준다', 'Give Kai room to answer for himself'),
        hint: t('카이 필요 · 유대 +1', 'Requires Kai · +1 bond'),
        requires: { companion: 'kai' },
        success: {
          text: t('“주인을 고르러 온 게 아니에요. 여길 다시 보고 싶었어요.” 카이가 빈 칸을 그대로 두고 접속을 닫는다.', '“I didn’t come to choose an owner. I wanted to see this place again.” Kai leaves the field empty and closes the connection.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a5_spare_heart',
    acts: [5],
    title: t('아직 따뜻한 부품', 'The Part That Is Still Warm'),
    image: 'v2/events/a5_spare_heart.webp',
    requires: { companions: ['su_ah', 'kai'] },
    gmHints: ['companion conflict', 'Su-ah', 'Kai', 'sleeping core'],
    text: t(
      '잠든 기계 옆에 예비 동력핵이 놓여 있다. 수아가 집게를 펼친다. “이걸로 장갑판을 살릴 수 있어.” 카이가 핵 위의 불빛을 가린다. “저쪽 꿈이 여기에도 보여요. 먼저 깨워 보면 안 될까요?”',
      'A spare power core rests beside a sleeping machine. Su-ah opens her tongs. “This could restore the plating.” Kai shades the light on the core. “Its dream is showing here too. Could we wake it and ask first?”',
    ),
    options: [
      {
        label: t('수아와 꿈 저장부를 분리해 두고 가공한다', 'Help Su-ah separate the dream storage before forging'),
        hint: t('수아 유대 +1 · 카드 1장 강화', '+1 Su-ah bond · upgrade 1 card'),
        success: {
          text: t('“여기는 열 안 닿게.” 수아가 저장부를 천으로 싼다. 장갑이 맞춰지는 동안 카이는 꺼진 화면 곁에 남는다.', '“Keep the heat away from this.” Su-ah wraps the storage unit in cloth. As she fits the plating, Kai stays by the dark screen.'),
          effects: [{ kind: 'bond', id: 'su_ah', amount: 1 }, { kind: 'upgrade_card', count: 1 }],
        },
      },
      {
        label: t('카이와 기계가 깨어날 때까지 기다린다', 'Wait with Kai until the machine wakes'),
        hint: t('카이 유대 +1 · HP +4', '+1 Kai bond · +4 HP'),
        success: {
          text: t('기계가 눈을 뜨고 핵을 품으로 당긴다. 수아는 집게를 접는다. 오래 앉아 있던 덕에 당신의 다리도 덜 아프다.', 'The machine opens its eyes and draws the core close. Su-ah folds her tongs. After the long sit, your legs ache less too.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'hp', amount: 4 }],
        },
      },
    ],
  },
  {
    id: 'a5_tin_garden',
    acts: [5],
    title: t('깡통 화단', 'The Tin Garden'),
    image: 'v2/events/a5_tin_garden.webp',
    gmHints: ['quiet wonder', 'seedlings', 'maintenance arm'],
    text: t(
      '정비용 팔 하나가 깡통 화단에 물을 준다. 손가락 사이로 떨어지는 물은 한 방울씩 정확하지만, 싹들은 제각각 기울어 자랐다. 팔은 삐뚤어진 싹을 바로 세우지 않고 햇빛 가리던 철판을 옮긴다.',
      'A maintenance arm waters a garden of tins. Drops fall precisely between its fingers, but the seedlings lean every which way. Instead of straightening them, the arm moves a sheet of metal that blocks the sun.',
    ),
    options: [
      {
        label: t('철판 그늘에 앉아 물 떨어지는 소리를 듣는다', 'Sit in the sheet’s shade and listen to the drops'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('팔이 당신 쪽으로도 작은 그늘을 남긴다. 물방울을 세다 그만두고 눈을 감는다.', 'The arm leaves a little shade for you too. You count the drops, then stop counting and close your eyes.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
      {
        label: t('꽃잎에 가려진 감시 렌즈에 덮개를 씌운다', 'Cover the surveillance lens behind the petals'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('덮개에 꽃 그림이 있다. 렌즈가 닫혀도 정비 팔은 물 주던 속도를 바꾸지 않는다.', 'A flower is painted on the cover. The lens closes; the maintenance arm keeps watering at the same pace.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a5_crane_constellation',
    acts: [5],
    title: t('크레인이 고른 별자리', 'The Cranes’ Constellation'),
    image: 'v2/events/a5_crane_constellation.webp',
    gmHints: ['quiet wonder', 'crane lights', 'night sky'],
    text: t(
      '밤이 오자 멈춰 있던 크레인들이 끝등만 켠다. 고철 위에 길고 느린 선이 이어진다. 별자리처럼 보이지만 하늘에는 같은 모양이 없다. 가장 작은 크레인이 한참 늦게 불을 켜자 나머지가 조금씩 자리를 비킨다.',
      'At night the idle cranes switch on only their tip lights. Long, slow lines join above the scrap. They resemble a constellation, though none in the sky matches. The smallest crane lights up late; the others shift to make room.',
    ),
    options: [
      {
        label: t('마지막 등이 자리 잡을 때까지 바라본다', 'Watch until the last light finds its place'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('배낭을 내려놓는다. 누구도 서두르라는 신호를 보내지 않는다. 마지막 등이 멎을 때 어깨의 통증도 가라앉는다.', 'You set down your pack. No one signals you to hurry. When the final light settles, the ache in your shoulders has eased.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('불빛이 비워 둔 길을 따라 걷는다', 'Follow the path the lights leave dark'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('발밑은 어둡고 머리 위에서만 빛이 움직인다. 순찰 렌즈가 크레인을 좇는 동안 묘역을 지난다.', 'The ground stays dark while light moves overhead. You cross the graveyard as the patrol lenses follow the cranes.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a5_prototype_cradle',
    acts: [5],
    title: t('원형이 누웠던 자리', 'Where the Prototype Lay'),
    image: 'v2/events/a5_prototype_cradle.webp',
    gmHints: ['prototype', 'KAI-0', 'Kai'],
    text: t(
      'KAI-0가 새겨진 조립대에 빈 고정구가 벌어져 있다. 그 아래 작은 글씨로 RX-09 이관. 눕는 자리에는 몸을 묶는 띠 대신 바깥에서만 열리는 덮개가 달려 있다. 덮개 안쪽에 손바닥 자국이 겹쳐 있다.',
      'Empty clamps stand open on an assembly bed marked KAI-0. Below it, smaller lettering reads TRANSFER TO RX-09. Instead of straps, the bed has a cover that opens only from outside. Overlapping palm marks line its inner face.',
    ),
    options: [
      {
        label: t('덮개를 벌려 안에서도 열리게 만든다', 'Bend the cover so it opens from within'),
        hint: t('근력 6 · 성공 카드 강화 · 실패 HP −5', 'STR 6 · success: upgrade · fail: −5 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('잠금쇠를 역으로 끼운다. 남은 경첩으로 당신의 장비에도 손이 닿는 해제 손잡이를 단다.', 'You reverse the latch. With the spare hinge, you fit an accessible release handle to your own gear.'),
          effects: [{ kind: 'upgrade_card', count: 1 }, { kind: 'flag', key: 'record_5' }],
        },
        failure: {
          text: t('굳은 경첩이 튕겨 어깨를 친다. 덮개는 겨우 손 하나 들어갈 만큼만 열린다.', 'A seized hinge kicks back into your shoulder. The cover opens only wide enough for a hand.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('조립대의 위치 송신기를 끈다', 'Switch off the assembly bed’s locator'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('빈 고정구에서 대기등이 꺼진다. 조립대는 더 이상 근처의 몸을 대체 부품으로 검색하지 않는다.', 'The standby light on the empty clamps goes out. The bed stops scanning nearby bodies for replacement parts.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('카이가 이관 기록을 읽을지 고르게 한다', 'Let Kai decide whether to read the transfer record'),
        hint: t('카이 필요 · 유대 +1', 'Requires Kai · +1 bond'),
        requires: { companion: 'kai' },
        success: {
          text: t('“읽어 볼게요. 같은 틀에서 나왔어도, 다음에 할 일까지 같지는 않겠죠.” 카이가 자기 손으로 기록을 연다.', '“I’d like to read it. Even if we came from the same mould, we needn’t do the same thing next.” Kai opens the record himself.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'codex', id: 'lore_a5_kai_zero' }],
        },
      },
    ],
  },
  {
    id: 'a5_rem_lullaby',
    acts: [5],
    title: t('입보다 먼저 들리는 자장가', 'The Lullaby Before the Lips'),
    image: 'v2/events/a5_rem_lullaby.webp',
    gmHints: ['uncanny', 'REM', 'borrowed sleep'],
    text: t(
      '렘의 수면 방송이 끊긴 안테나에서 흘러나온다. 안드로이드들의 입술이 노래보다 한 박자 늦게 움직인다. 방송이 멎어도 다음 음은 당신 입 안에 남아 있다. 아직 부른 적 없는 노래다.',
      'REM’s sleep broadcast flows from a severed antenna. The androids’ lips move a beat behind the song. When the broadcast stops, its next note remains in your mouth. You have never sung this song.',
    ),
    options: [
      {
        label: t('입 안에 남은 음을 끝까지 흥얼거린다', 'Hum the note in your mouth through to the end'),
        hint: t('카드 1장 제거 · 추적 +4', 'Remove 1 card · +4 Trace'),
        success: {
          text: t('반복되던 동작 하나가 음을 따라 빠져나간다. 수면 방송은 새 목소리를 받아 짧게 되울린다.', 'One habitual movement slips away with the note. The sleep broadcast takes in your voice and briefly echoes it back.'),
          effects: [{ kind: 'remove_card', count: 1 }, { kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('입을 다물고 안테나의 접지를 잇는다', 'Keep silent and ground the antenna'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('잡음이 땅속으로 잦아든다. 마지막 입술이 멎을 때까지 누구도 새 음을 보태지 않는다.', 'The static fades into the ground. No one adds another note before the last pair of lips comes to rest.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a5_nameless_shift',
    acts: [5],
    title: t('이름 없는 교대조', 'The Nameless Shift'),
    image: 'v2/events/a5_nameless_shift.webp',
    gmHints: ['erased past', 'ARK', 'factory photograph'],
    text: t(
      '휴게실 사진 속 사람들이 각자의 안드로이드 옆에 서 있다. ARK의 역사 정리 통지가 사진 절반을 덮었다. 통지 아래로 작업복 소매와 맞잡은 금속 손이 보인다. 벽시계는 교대 시간에서 멈춰 있다.',
      'In a break-room photograph, people stand beside their android partners. An ARK notice of historical revision covers half the picture. Work sleeves and clasped metal hands show beneath it. The wall clock has stopped at shift change.',
    ),
    options: [
      {
        label: t('사진 뒷면에 남은 필압을 살핀다', 'Examine the writing impressed on the photograph’s back'),
        hint: t('관찰 5 · 성공 카드 선택 · 실패 추적 +4', 'OBS 5 · success: pick card · fail: +4 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t('삭제된 이름 아래 둘씩 움직이던 작업 순서가 남았다. 한쪽이 잡고 다른 쪽이 건너는 동작을 옮겨 적는다.', 'Beneath the erased names, instructions for working in pairs remain. You copy the move where one holds fast while the other crosses.'),
          effects: [{ kind: 'card_choice' }],
        },
        failure: {
          text: t('통지 뒤의 열람 감지선이 끊어진다. 벽시계가 깨어나 현재 시각과 당신의 신호를 함께 찍는다.', 'A reading sensor behind the notice breaks. The wall clock wakes and stamps the current time alongside your signal.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('휴게실 문을 닫고 식은 의자에 앉는다', 'Close the break-room door and sit in a cold chair'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('문 하나를 닫자 압착장 소리가 멀어진다. 사진 속 빈자리와 마주 앉아 손의 떨림이 멎기를 기다린다.', 'One closed door muffles the compactor yard. Facing a gap in the photograph, you wait for your hands to stop shaking.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
    ],
  },
  {
    id: 'a5_legion_toll',
    acts: [5],
    title: t('고철 군단의 통행세', 'The Scrap Legion’s Toll'),
    image: 'v2/events/a5_legion_toll.webp',
    gmHints: ['bargain', 'Scrap Legion', 'repair toll'],
    text: t(
      '고철 군단의 검문기가 차단봉을 내린다. 통행세 표에는 크레딧과 교체용 관절이 나란히 그려져 있다. 검문기의 오른쪽 다리는 짧은 나무토막 위에 놓여 있다. 움직일 때마다 표가 한쪽으로 기운다.',
      'A Scrap Legion checkpoint machine lowers its barrier. Its toll sign shows credits beside a replacement joint. The machine’s right leg rests on a short block of wood. Each time it moves, the sign tilts.',
    ),
    options: [
      {
        label: t('차단봉을 고정해 주는 값으로 흥정한다', 'Offer to brace the barrier in exchange for passage'),
        hint: t('매력 5 · 성공 크레딧 +24 · 실패 추적 +4', 'CHA 5 · success: +24 ₵ · fail: +4 Trace'),
        check: { stat: 'cha', dc: 5 },
        success: {
          text: t('받침을 옮기자 차단봉이 수평을 찾는다. 검문기가 통행세를 지우고 남은 수리비를 건넨다.', 'You shift the support and level the barrier. The machine waives the toll and gives you its remaining repair money.'),
          effects: [{ kind: 'credits', amount: 24 }],
        },
        failure: {
          text: t('검문기가 당신의 손을 밀어낸다. 통행세 표 옆에 미납자 신호가 올라간다.', 'The machine pushes your hand away. An unpaid-traveller signal appears beside the toll sign.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('낮은 배수로로 돌아간다', 'Take the low drainage passage around it'),
        hint: t('HP −2 · 추적 −6', '−2 HP · −6 Trace'),
        success: {
          text: t('무릎을 긁히며 배수로를 지난다. 두꺼운 철벽이 검문기의 추적 신호를 가린다.', 'You scrape your knees in the drain. Thick iron walls block the checkpoint’s tracking signal.'),
          effects: [{ kind: 'hp', amount: -2 }, { kind: 'trace', amount: -6 }],
        },
      },
      {
        label: t('수리비를 내고 정비 통로를 쓴다', 'Pay for the repair and use the service passage'),
        hint: t('크레딧 −20 · 추적 −8', '−20 ₵ · −8 Trace'),
        requires: { minCredits: 20 },
        success: {
          text: t('검문기가 돈을 관절 주문함에 넣고 옆문을 연다. 통로 안의 감시등도 순서대로 꺼 준다.', 'The machine puts the money into its joint-order box and opens a side door. It switches off the passage lights in sequence.'),
          effects: [{ kind: 'credits', amount: -20 }, { kind: 'trace', amount: -8 }],
        },
      },
    ],
  },
  {
    id: 'a5_sleeping_convoy',
    acts: [5],
    title: t('잠든 수송대', 'The Sleeping Convoy'),
    image: 'v2/events/a5_sleeping_convoy.webp',
    gmHints: ['ambush', 'Scrap Legion', 'sleepwalking machines'],
    text: t(
      '수송대가 눈을 감은 채 고철 더미 사이를 걷는다. 앞선 기계가 멈추면 뒤의 기계도 같은 거리에서 멎는다. 그 사이 운반함에 회수권 묶음이 흔들린다. 머리 위 냉각 드론의 렌즈만 깨어 있다.',
      'A convoy walks between scrap heaps with its eyes closed. When the first machine stops, the others halt at equal intervals. Salvage vouchers swing in a crate between them. Only the cryo drone’s lens overhead is awake.',
    ),
    options: [
      {
        label: t('걸음의 빈틈으로 들어가 회수권을 꺼낸다', 'Slip between their steps and take the vouchers'),
        hint: t('민첩 6 · 성공 크레딧 +32 · 실패 전투', 'AGI 6 · success: +32 ₵ · fail: combat'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('다음 발이 내려오기 전에 운반함을 닫는다. 회수권은 출구 정산기에서 바로 크레딧으로 바뀐다.', 'You close the crate before the next foot lands. The exit terminal converts the vouchers straight into credits.'),
          effects: [{ kind: 'credits', amount: 32 }],
        },
        failure: {
          text: t('드론의 렌즈가 당신에게 멎는다. 고철 사냥개가 더미를 박차고 나오고, 용접 기계의 불꽃이 켜진다.', 'The drone’s lens fixes on you. A scrap hound leaps from the heap as a welding machine lights its torch.'),
          effects: [{ kind: 'combat', encounterId: 'a5_event_ambush' }],
        },
      },
      {
        label: t('수송대의 그림자를 따라 조용히 지난다', 'Pass quietly in the convoy’s shadow'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('기계들의 발소리에 당신의 발소리를 맞춘다. 드론은 끝까지 일정한 간격만 센다.', 'You match your footsteps to theirs. The drone keeps counting the same even intervals.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
      {
        label: t('세린에게 적재장 샛길을 맡긴다', 'Let Se-rin lead through the loading-yard shortcut'),
        hint: t('세린 필요 · 추적 −5 · 유대 +1', 'Requires Se-rin · −5 Trace · +1 bond'),
        requires: { companion: 'se_rin' },
        success: {
          text: t('“저쪽 보고 있을 때, 왼쪽.” 세린이 철망을 잡아 벌린다. 당신이 빠져나온 뒤에야 손을 놓는다.', '“Left, while it’s looking away.” Se-rin pulls the fence apart and holds it until you are through.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'bond', id: 'se_rin', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a5_rain_address',
    acts: [5],
    title: t('빗소리의 주소', 'The Address in the Rain'),
    image: 'v2/events/a5_rain_address.webp',
    gmHints: ['memory echo', 'rain recording', 'station name'],
    text: t(
      '폐역 안내기가 같은 역 이름의 마지막 음절만 되풀이한다. 고장 표시 대신 비가 그치면 출발이라는 문장이 떠 있다. 안내기 밑에는 녹음 장치를 올릴 만한 작은 선반이 달려 있다.',
      'A disused station announcer repeats only the last syllable of a name. In place of a fault message, it displays DEPARTURE WHEN THE RAIN STOPS. Beneath it is a small shelf just wide enough for a recorder.',
    ),
    options: [
      {
        label: t('안내기의 외부 방송선을 뽑는다', 'Disconnect the announcer’s external broadcast line'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('역 이름은 작은 스피커 안에만 남는다. 먼 순찰기에 당신의 위치를 되울리던 방송이 끊긴다.', 'The name remains only in the little speaker. The broadcast that echoed your location to distant patrols goes quiet.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('출발을 기다리듯 대합실에 앉는다', 'Sit in the waiting room as if expecting a departure'),
        hint: t('HP +4', '+4 HP'),
        success: {
          text: t('등받이에 기대 신발 끈을 푼다. 열차는 오지 않지만 발의 열기는 가라앉는다.', 'You lean back and loosen your laces. No train arrives, but the heat in your feet subsides.'),
          effects: [{ kind: 'hp', amount: 4 }],
        },
      },
      {
        label: t('보관한 빗소리를 마지막 음절 앞에 잇는다', 'Play the saved rain before the final syllable'),
        hint: t('빗소리 기록 필요 · 카드 1장 선택', 'Requires rain recording · pick 1 card'),
        requires: { flag: 'a5_rain_kept' },
        success: {
          text: t('아이의 목소리와 안내가 이어져 역 이름이 완성된다. 선반에서 펼쳐진 오래된 출구도가 새 이동 경로를 보여 준다.', 'The child’s voice joins the announcement, completing the station name. An old exit map unfolds from the shelf, revealing another route.'),
          effects: [{ kind: 'card_choice' }],
        },
      },
    ],
  },
  {
    id: 'a5_dream_threshold',
    acts: [5],
    title: t('꿈의 문턱', 'The Threshold of the Dream'),
    image: 'v2/events/a5_dream_threshold.webp',
    speaker: 'kai',
    requires: { companion: 'kai', flag: 'a5_ark_imprint' },
    gmHints: ['erased past', 'Kai', 'MythOS fragment'],
    text: t(
      '카이가 통학 차량에서 얻은 기록을 꿈 저장고 문에 댄다. 지워진 MythOS 글자가 문 안쪽에서 다시 빛난다. “이건 제 정비 기록이 아니에요. 바깥세상의 기록이에요.” 잠금창이 소유자 대신 목격자의 이름을 묻는다.',
      'Kai holds the school transport record against a dream vault’s door. The erased word MythOS lights up again from inside. “This isn’t my maintenance history. It’s a record of the world outside.” The lock asks for a witness’s name instead of an owner’s.',
    ),
    options: [
      {
        label: t('카이가 자기 이름을 쓰는 동안 곁에 선다', 'Stand beside Kai while he enters his own name'),
        hint: t('카이 유대 +1 · 관찰 +1', '+1 Kai bond · +1 OBS'),
        success: {
          text: t('카이가 RX-09 대신 카이라고 쓴다. 문틈 너머 전쟁 전 거리가 열린다. ARK가 지운 자리에 무엇이 있었는지 보인다.', 'Kai writes Kai instead of RX-09. Through the opening, a prewar street appears. You see what stood where ARK left a blank.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'stat', stat: 'obs', amount: 1 }],
        },
      },
      {
        label: t('기록을 보존하고 문을 천천히 열자고 한다', 'Preserve the record and suggest opening the door slowly'),
        hint: t('추적 −5 · 카드 1장 선택', '−5 Trace · pick 1 card'),
        success: {
          text: t('카이가 먼저 외부 조회선을 끊는다. 문을 조금 열자 삭제 이전의 거리 지도가 나온다. 둘이 나란히 펼쳐 든다.', 'Kai first cuts the external query line. Opening the door a little releases a street map from before the erasure. You unfold it together.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'card_choice' }],
        },
      },
    ],
  },
  {
    id: 'a5_unclaimed_name',
    acts: [5],
    title: t('인수자 없는 이름표', 'A Name Tag with No Claimant'),
    image: 'v2/events/a5_unclaimed_name.webp',
    speaker: 'kai',
    requires: { companion: 'kai' },
    gmHints: ['identity', 'Kai', 'unclaimed belongings'],
    text: t(
      '분실물 보관대에 RX-09라고 적힌 끈이 걸려 있다. 인수자 서명란은 비어 있고, 이름표 뒤에는 아이가 그린 우산이 있다. 카이가 끈을 집었다가 내려놓는다. “제 것이면 꼭 가져가야 하나요?”',
      'A strap marked RX-09 hangs on a lost-property rack. Its claimant field is blank; a child has drawn an umbrella on the back of the tag. Kai picks it up, then sets it down. “If it’s mine, do I have to take it?”',
    ),
    options: [
      {
        label: t('가져갈지는 카이가 정하라고 말한다', 'Tell Kai he can decide whether to take it'),
        hint: t('카이 유대 +1 · HP +4', '+1 Kai bond · +4 HP'),
        success: {
          text: t('카이가 끈 대신 그림만 접어 넣는다. “이건 갖고 싶어요.” 보관대 옆에 함께 앉아 가방을 다시 꾸린다.', 'Kai folds away only the drawing. “I want to keep this.” You sit together beside the rack and repack your bag.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'hp', amount: 4 }],
        },
      },
      {
        label: t('이름표의 회수 신호를 함께 지운다', 'Erase the tag’s collection signal together'),
        hint: t('추적 −5', '−5 Trace'),
        success: {
          text: t('당신이 덮개를 잡고 카이가 송신선을 끊는다. “찾으러 오는 사람이 없어도, 갈 곳은 고를 수 있겠죠.”', 'You hold the cover while Kai cuts the transmitter wire. “Even if no one comes for me, I can still choose where to go.”'),
          effects: [{ kind: 'trace', amount: -5 }],
        },
      },
    ],
  },
]
