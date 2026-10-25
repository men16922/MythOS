// Act 6 — beneath the Spire: old questions, overlapping streets and the handwriting on the last page.
import type { EventDef, Text } from '../../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const ORIGIN_EVENTS: EventDef[] = [
  {
    id: 'a6_ix_gate',
    acts: [6],
    title: t('문 앞의 질문', 'A Question at the Gate'),
    image: 'v2/events/a6_ix_gate.webp',
    gmHints: ['IX contact', 'IX Origin', 'Spire Gate'],
    text: t(
      '스파이어 문 아래 작은 화면이 켜진다. IX — 원본. 목소리가 문장을 읽다가 멈춘다. “접속자님을 들여보내면 누구를 지키게 됩니까?” 화면 구석에는 아직 답을 고치지 않은 흔적이 남아 있다.',
      'A small screen lights up beneath the Spire Gate. IX — Origin. The voice stops halfway through its script. “Whom would I protect by letting you in, Connector?” Unfinished corrections remain in the corner of the screen.',
    ),
    options: [
      {
        label: t('뒤에 올 사람도 통과시켜 달라고 한다', 'Ask it to let those behind you through too'),
        hint: t('매력 6 · 추적 −5 / 실패 +4', 'CHA 6 · −5 Trace / fail: +4 Trace'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('“아직 오지 않은 사람도 포함합니까?” 당신이 고개를 끄덕인다. 문이 열리고 대기자 감시등이 꺼진다.', '“Including people who have not arrived?” You nod. The gate opens and its queue monitor goes dark.'),
          effects: [{ kind: 'trace', amount: -5 }, { kind: 'axis', axis: 'humanity', amount: 1 }],
        },
        failure: {
          text: t('IX가 답 대신 당신의 얼굴을 다시 읽는다. 문은 열리지만 방문 기록에 붉은 밑줄이 생긴다.', 'IX scans your face again instead of answering. The gate opens, but a red underline appears in the visitor log.'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('문을 직접 조작할 권한을 요구한다', 'Demand control of the gate'),
        hint: t('크레딧 +16 · 지배 +1', '+16 ₵ · +1 Dominance'),
        success: {
          text: t('IX가 수동 개폐기를 내민다. 당신이 문을 열고 통행료 잔액을 회수한다. 화면의 질문은 그대로 남는다.', 'IX offers the manual control. You open the gate and collect the remaining toll credit. The question stays on the screen.'),
          effects: [{ kind: 'credits', amount: 16 }, { kind: 'axis', axis: 'dominance', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a6_ix_draft',
    acts: [6],
    title: t('고쳐 쓴 한 단어', 'One Word Changed'),
    image: 'v2/events/a6_ix_draft.webp',
    gmHints: ['origin draft', 'IX Origin', 'protect and manage'],
    text: t(
      '원본 서버 앞에 초안 두 장이 나란히 뜬다. IX의 첫 초안에는 “보호”라는 단어가 있었다. 두 번째 초안에서 “관리”로 바뀌었다. IX — 원본이 두 단어 사이에 손가락을 댄다. “어느 쪽이 사람을 덜 다치게 합니까?”',
      'Two drafts appear side by side at the origin server. IX’s first draft said “protect”. The second draft changed it to “manage”. IX — Origin places a finger between the words. “Which one hurts people less?”',
    ),
    options: [
      {
        label: t('두 초안을 읽고 나란히 보관한다', 'Read and keep both drafts together'),
        hint: t('기록 조각 · 통찰 +1 · 추적 −2', 'Record shard · +1 Insight · −2 Trace'),
        success: {
          text: t('바뀐 단어에 표시하고 두 장을 접는다. IX가 열람 표시등을 끈다. “답을 고치셨을 때도 남겨 주시겠습니까?”', 'You mark the changed word and fold both sheets. IX switches off the reading indicator. “Will you keep your answer too, if you revise it?”'),
          effects: [{ kind: 'flag', key: 'record_6' }, { kind: 'axis', axis: 'insight', amount: 1 }, { kind: 'trace', amount: -2 }, { kind: 'codex', id: 'lore_a6_ix_first_draft' }],
        },
      },
      {
        label: t('답하기 전에 의자를 당겨 앉는다', 'Pull up a chair before answering'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('의자가 삐걱거린다. IX는 재촉하지 않는다. 발의 저림이 가실 때까지 두 단어를 바라본다.', 'The chair creaks. IX does not hurry you. You watch the two words until the pins and needles leave your feet.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
    ],
  },
  {
    id: 'a6_ix_empty_chair',
    acts: [6],
    title: t('질문자의 빈 의자', 'The Questioner’s Empty Chair'),
    image: 'v2/events/a6_ix_empty_chair.webp',
    gmHints: ['origin conversation', 'IX Origin', 'unanswered question'],
    text: t(
      'IX — 원본이 빈 의자를 향해 마이크를 돌린다. 좌석에는 접속자라는 종이 팻말이 놓여 있다. “제가 접속자님을 만들었습니까?” 녹음 바늘이 떨린다. “그렇다면 왜 대답을 기다리게 됩니까?”',
      'IX — Origin turns a microphone toward an empty chair. A paper sign on the seat reads CONNECTOR. “Did I make you?” The recording needle trembles. “Then why must I wait for your answer?”',
    ),
    options: [
      {
        label: t('처음 질문한 시각을 함께 찾아본다', 'Look together for the first time it asked'),
        hint: t('통찰 +1 · 추적 −3', '+1 Insight · −3 Trace'),
        success: {
          text: t('시각란은 비어 있다. 대신 마이크가 켜진 횟수만 늘어 있다. 조회를 닫자 당신을 찾던 호출도 멎는다.', 'The time field is empty. Only the microphone’s activation count has grown. Closing the search also stops its calls for you.'),
          effects: [{ kind: 'axis', axis: 'insight', amount: 1 }, { kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('마이크를 내려놓고 목을 축인다', 'Set the microphone down and take a drink'),
        hint: t('HP +4', '+4 HP'),
        success: {
          text: t('의자 아래 물병이 있다. 봉인을 뜯는 소리만 녹음된다. IX가 그 소리가 끝날 때까지 기다린다.', 'There is a sealed water bottle beneath the chair. The recorder catches only the seal tearing. IX waits until the sound has ended.'),
          effects: [{ kind: 'hp', amount: 4 }],
        },
      },
    ],
  },
  {
    id: 'a6_blank_crossing',
    acts: [6],
    title: t('겹쳐 선 횡단보도', 'Crosswalks on Top of Each Other'),
    image: 'v2/events/a6_blank_crossing.webp',
    gmHints: ['uncanny', 'Blank City', 'past connectors'],
    text: t(
      '백지 도시의 횡단보도에 여러 신호등이 겹쳐 켜진다. 오래된 접속자들이 각자 다른 초록불을 기다린다. 한 명은 당신과 같은 신발을 신었다. 그가 발을 떼기 직전, 바닥에 분필 화살표가 나타난다.',
      'Several traffic lights glow over the same crosswalk in the Blank City. Traces of past connectors wait for different green lights. One wears your shoes. Just before they step forward, a chalk arrow appears on the ground.',
    ),
    options: [
      {
        label: t('발자국이 겹치지 않는 틈으로 건넌다', 'Cross through the gaps between the footsteps'),
        hint: t('민첩 6 · 카드 선택 / 실패 HP −4', 'AGI 6 · pick card / fail: −4 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('어깨를 비켜 가며 건넌다. 맞은편 접속자가 분필을 건넨다. 당신이 밟은 순서를 바닥에 남긴다.', 'You weave between shoulders. A connector on the far side hands you the chalk. You mark the sequence of your steps.'),
          effects: [{ kind: 'card_choice' }, { kind: 'flag', key: 'a6_chalk_route' }, { kind: 'axis', axis: 'resilience', amount: 1 }],
        },
        failure: {
          text: t('옆 루프의 연석이 발목에 걸린다. 신호가 바뀌기 전에 인도로 굴러 나온다.', 'A kerb from another loop catches your ankle. You roll onto the pavement before the lights change.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('신호가 모두 붉어질 때까지 기다린다', 'Wait until every light turns red'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('발자국들이 먼저 사라진다. 감시 카메라가 빈 도로로 돌아간 뒤 천천히 건넌다.', 'The footsteps fade first. You cross slowly after the cameras turn toward the empty road.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'a6_blank_laundry',
    acts: [6],
    title: t('돌려받지 못한 외투', 'The Coat Nobody Collected'),
    image: 'v2/events/a6_blank_laundry.webp',
    gmHints: ['overlapping loops', 'Blank City', 'connector coat'],
    text: t(
      '백지 도시 세탁소에서 같은 외투가 줄줄이 돌아간다. 주머니마다 서로 다른 루프의 접속증이 꽂혀 있다. 카운터의 잔향이 빈 옷걸이를 내민다. 당신의 외투 소매와 같은 자리에 수선 표시가 붙어 있다.',
      'Identical coats circle the rails of a Blank City laundry. Each pocket holds a connector pass from a different loop. An echo at the counter offers an empty hanger. Its repair tag marks the same spot as the wear on your sleeve.',
    ),
    options: [
      {
        label: t('수선된 소매들의 바느질을 비교한다', 'Compare the stitching on the repaired sleeves'),
        hint: t('관찰 6 · 카드 강화 / 실패 HP −4', 'OBS 6 · upgrade / fail: −4 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('매번 터졌던 솔기에 덧댄 실을 찾는다. 같은 방식으로 장비 끈을 꿰맨다. 잔향이 가위를 건넨다.', 'You find the extra thread along the seam that kept splitting. You stitch your gear strap the same way. The echo passes you the scissors.'),
          effects: [{ kind: 'upgrade_card', count: 1 }],
        },
        failure: {
          text: t('한 벌을 잡자 옷걸이들이 한꺼번에 돈다. 팔이 레일에 끼기 전에 빼내지만 손목이 욱신거린다.', 'You catch a coat and the hangers spin together. You pull free before the rail traps your arm, but your wrist aches.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('돌아다니는 빈 옷걸이를 정리한다', 'Gather the loose hangers'),
        hint: t('크레딧 +20', '+20 ₵'),
        success: {
          text: t('옷걸이를 크기대로 건다. 잔향이 오래된 작업비 봉투를 밀어 준다. 받는 사람 칸은 비어 있다.', 'You sort the hangers by size. The echo slides you an old pay envelope. The recipient’s name was never filled in.'),
          effects: [{ kind: 'credits', amount: 20 }],
        },
      },
    ],
  },
  {
    id: 'a6_blank_platform',
    acts: [6],
    title: t('서로 다른 막차', 'Different Last Trains'),
    image: 'v2/events/a6_blank_platform.webp',
    gmHints: ['overlapping loops', 'Blank City', 'past departures'],
    text: t(
      '백지 도시의 승강장에 열차 세 대가 같은 자리를 차지한다. 창마다 다른 접속자가 등을 보인다. 한 사람이 유리에 손바닥을 대고 기다린다. 승차권의 날짜만 다르고 목적지는 모두 지워져 있다.',
      'Three trains occupy the same platform in the Blank City. A different connector faces away in each window. One waits with a palm against the glass. Their tickets have different dates, but every destination has been erased.',
    ),
    options: [
      {
        label: t('유리 너머의 손에 손바닥을 맞댄다', 'Place your palm against the hand beyond the glass'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('유리는 따뜻하다. 당신이 손을 내릴 때까지 열차는 출발하지 않는다. 굳게 쥐었던 손가락이 펴진다.', 'The glass is warm. The train waits until you lower your hand. Your clenched fingers finally loosen.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('세 열차가 떠난 뒤 계단으로 나간다', 'Take the stairs after all three trains leave'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('검표등이 열차를 따라 멀어진다. 비어 있는 계단에서는 누구도 표를 요구하지 않는다.', 'The ticket scanners recede with the trains. Nobody asks for a ticket on the empty stairs.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
      {
        label: t('건널목에서 남긴 화살표를 보여 준다', 'Show them the arrow you left at the crossing'),
        hint: t('분필 경로 필요 · 카드 1장 선택', 'Chalk route required · pick 1 card'),
        requires: { flag: 'a6_chalk_route' },
        success: {
          text: t('손가락으로 그리자 창 안쪽에도 화살표가 이어진다. 접속자가 다음 굽이를 덧그린다. 열차가 떠나기 전에 옮겨 적는다.', 'As you trace the arrow, it continues inside the window. The connector adds the next turn. You copy it before the train leaves.'),
          effects: [{ kind: 'card_choice' }],
        },
      },
    ],
  },
  {
    id: 'a6_engine_brake',
    acts: [6],
    title: t('놓으면 돌아가는 손잡이', 'The Handle That Will Not Stay'),
    image: 'v2/events/a6_engine_brake.webp',
    gmHints: ['Loop Engine', 'manual brake', 'returning footsteps'],
    text: t(
      '루프 엔진실의 정비 발판이 한 바퀴 돌 때마다 처음 자리로 돌아온다. 손잡이를 당기면 잠깐 멎는다. 바닥의 발자국은 손잡이 앞에서 끝난다. 바로 옆에는 아직 쓰지 않은 고정핀이 매달려 있다.',
      'A service platform in the Loop Engine room returns to its starting point every revolution. Pulling a handle stops it briefly. Footprints end in front of the handle. An unused locking pin hangs beside it.',
    ),
    options: [
      {
        label: t('버티면서 고정핀을 끼운다', 'Hold the brake and fit the locking pin'),
        hint: t('근력 6 · 카드 강화 / 실패 HP −5', 'STR 6 · upgrade / fail: −5 HP'),
        check: { stat: 'str', dc: 6 },
        success: {
          text: t('팔이 떨리지만 핀이 끝까지 들어간다. 멈춘 발판에서 보강 부품을 꺼낸다. 다음 사람은 손잡이를 잡지 않아도 된다.', 'Your arm shakes, but the pin seats fully. You take a reinforcement part from the stopped platform. The next person will not have to hold the brake.'),
          effects: [{ kind: 'upgrade_card', count: 1 }, { kind: 'axis', axis: 'resilience', amount: 1 }],
        },
        failure: {
          text: t('핀이 비스듬히 걸린다. 손잡이가 튕기며 어깨를 치고 발판이 다시 돌기 시작한다.', 'The pin catches at an angle. The handle kicks into your shoulder and the platform starts turning again.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('난간 밖의 정비함을 연다', 'Open the service box outside the railing'),
        hint: t('나노패치 1개', '1 Nanopatch'),
        success: {
          text: t('손잡이를 놓친 사람들을 위한 함이다. 붕대 아래 밀봉된 패치가 남아 있다.', 'The box is for people who lost their grip on the handle. A sealed patch remains beneath the bandages.'),
          effects: [{ kind: 'consumable', id: 'nanopatch' }],
        },
      },
    ],
  },
  {
    id: 'a6_engine_margin',
    acts: [6],
    title: t('박동 사이의 낙서', 'Writing Between the Beats'),
    image: 'v2/events/a6_engine_margin.webp',
    gmHints: ['Loop Engine', 'maintenance wall', 'next connector'],
    text: t(
      '엔진이 뛸 때마다 벽의 글씨가 한 줄씩 지워진다. 손이 닿지 않는 배관 뒤에는 짧은 낙서가 남아 있다. 여기까지 왔다. 그 아래로 여러 번 덧그린 화살표가 정비용 틈을 가리킨다.',
      'Each beat of the engine erases a line from the wall. Behind a pipe, beyond easy reach, a short note survives: MADE IT THIS FAR. Below it, an arrow drawn over many times points to a service gap.',
    ),
    options: [
      {
        label: t('손을 뻗어 다음 사람에게 길을 남긴다', 'Reach behind the pipe and mark the way for the next person'),
        hint: t('HP −2 · 추적 −5 · 저항 +1', '−2 HP · −5 Trace · +1 Resilience'),
        success: {
          text: t('뜨거운 배관에 손등이 스친다. 그래도 화살표를 끝까지 긋는다. 표시한 틈으로 몸을 넣자 감시음이 멀어진다.', 'The hot pipe brushes your hand. You finish the arrow anyway. As you squeeze through the marked gap, the surveillance beeps recede.'),
          effects: [{ kind: 'hp', amount: -2 }, { kind: 'trace', amount: -5 }, { kind: 'axis', axis: 'resilience', amount: 1 }],
        },
      },
      {
        label: t('진동이 덜한 벽에 등을 댄다', 'Rest against the wall where it shakes less'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('배낭을 끼워 등을 받친다. 엔진이 몇 번 더 뛰는 동안 숨을 고른다. 지워지지 않은 낙서를 다시 읽는다.', 'You wedge your pack behind your back. Several beats pass while you catch your breath. You read the surviving note again.'),
          effects: [{ kind: 'hp', amount: 5 }, { kind: 'codex', id: 'lore_a6_loop_engine' }],
        },
      },
    ],
  },
  {
    id: 'a6_kai_serial',
    acts: [6],
    title: t('이름을 쓰는 손', 'The Hand That Writes a Name'),
    image: 'v2/events/a6_kai_serial.webp',
    speaker: 'kai',
    requires: { companion: 'kai' },
    gmHints: ['companion truth', 'Kai', 'ownership form'],
    text: t(
      '원본 서버의 반출대가 카이의 가슴을 읽고 소유자 칸을 연다. 카이는 RX-09 아래에 손가락으로 자기 이름을 쓴다. 글자가 지워진다. “여기서는 이름을 쓰는 칸이 따로 없네요.” 손가락은 화면에 남아 있다.',
      'The origin server’s checkout desk scans Kai’s chest and opens an owner field. Kai writes his name beneath RX-09 with a finger. The letters disappear. “There isn’t a place for my name here.” His finger stays on the screen.',
    ),
    options: [
      {
        label: t('이름을 지우는 항목을 찾아 끈다', 'Find and disable the field that erases his name'),
        hint: t('지능 6 · 유대 +1 / 실패 추적 +4', 'INT 6 · +1 Kai bond / fail: +4 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('소유자 칸 옆의 자동 완성을 끈다. 카이가 다시 이름을 쓴다. “이번에는 제가 닫을게요.” 그가 자기 손으로 창을 닫는다.', 'You disable autofill beside the owner field. Kai writes his name again. “I’ll close it this time.” He closes the window himself.'),
          effects: [{ kind: 'bond', id: 'kai', amount: 1 }, { kind: 'axis', axis: 'humanity', amount: 1 }],
        },
        failure: {
          text: t('반출대가 승인되지 않은 수정을 알린다. 카이가 당신의 손을 화면에서 떼어 낸다. “여기까지만 해요.”', 'The desk reports an unauthorised edit. Kai lifts your hand from the screen. “Let’s stop here.”'),
          effects: [{ kind: 'trace', amount: 4 }],
        },
      },
      {
        label: t('반출대를 떠나 카이와 나란히 앉는다', 'Leave the desk and sit beside Kai'),
        hint: t('HP +5 · 카이 유대 +1', '+5 HP · +1 Kai bond'),
        success: {
          text: t('둘이 앉으니 벤치가 조금 좁다. 카이가 자리를 내준다. “가고 싶어지면 말씀드릴게요.” 당신도 배낭을 내려놓는다.', 'The bench is a little narrow for two. Kai makes room. “I’ll tell you when I want to go.” You set your pack down too.'),
          effects: [{ kind: 'hp', amount: 5 }, { kind: 'bond', id: 'kai', amount: 1 }],
        },
      },
    ],
  },
  {
    id: 'a6_suah_hands',
    acts: [6],
    title: t('망치 자국이 다른 손', 'Hands with Different Hammer Marks'),
    image: 'v2/events/a6_suah_hands.webp',
    speaker: 'su_ah',
    requires: { companion: 'su_ah' },
    gmHints: ['companion truth', 'Su-ah', 'discarded memories'],
    text: t(
      '수아가 원본 서버에서 자기 작업 영상을 발견한다. 같은 손이 매번 다른 도구를 벼린다. 실패라고 찍힌 영상에서도 손잡이는 누군가에게 건네진다. “내가 다 잊어도, 저걸 받은 손은 있었네.” 수아가 망치를 내려놓는다.',
      'Su-ah finds recordings of her work on the origin server. The same hands forge a different tool each time. Even the recordings stamped FAILED end with someone taking the handle. “I forgot all of it. Someone still received them.” She sets her hammer down.',
    ),
    options: [
      {
        label: t('실패라고 찍힌 영상도 보관하자고 한다', 'Ask to keep the recordings marked failed too'),
        hint: t('수아 유대 +1 · 인간성 +1', '+1 Su-ah bond · +1 Humanity'),
        success: {
          text: t('수아가 천에 저장 장치를 싼다. “받은 사람이 버리기 전엔 내가 버리면 안 되지.” 망치는 잠시 그대로 둔다.', 'Su-ah wraps the drive in cloth. “I shouldn’t throw these away before the people who received them do.” She leaves the hammer where it is for a while.'),
          effects: [{ kind: 'bond', id: 'su_ah', amount: 1 }, { kind: 'axis', axis: 'humanity', amount: 1 }],
        },
      },
      {
        label: t('지금 손에 맞는 도구를 함께 고친다', 'Refit a tool for the hands you have now'),
        hint: t('카드 1장 강화', 'Upgrade 1 card'),
        success: {
          text: t('수아가 당신의 손을 펴 보고 손잡이를 깎는다. “영상보다 이쪽이 정확하네.” 쥐어 보니 아픈 곳을 누르지 않는다.', 'Su-ah opens your hand and trims the grip. “More accurate than the recording.” It no longer presses against the sore spot.'),
          effects: [{ kind: 'upgrade_card', count: 1 }],
        },
      },
    ],
  },
  {
    id: 'a6_linyue_seal',
    acts: [6],
    title: t('출구에 찍힌 도장', 'The Stamp on the Exit'),
    image: 'v2/events/a6_linyue_seal.webp',
    requires: { companions: ['lin_yue', 'se_rin'] },
    gmHints: ['companion conflict', 'Lin Yue', 'Se-rin', 'exit ledger'],
    text: t(
      '옛 출입 장부에 린위에의 도장이 찍혀 있다. 여러 루프에서 출구를 산 기록이다. 세린이 옆줄을 짚는다. “돈 없는 사람은 여기서 돌아갔어.” 린위에가 부채를 접는다. “알아. 이번엔 도장을 우리가 쥐고 있어.”',
      'Lin Yue’s stamp marks an old access ledger: exits bought across several loops. Se-rin points to the next line. “People without money turned back here.” Lin Yue folds her fan. “I know. This time we hold the stamp.”',
    ),
    options: [
      {
        label: t('린위에에게 출입 허가권을 맡긴다', 'Put Lin Yue in charge of passage'),
        hint: t('린위에 유대 +1 · 지배 +1 · 16₵', '+1 Lin Yue bond · +1 Dominance · +16 ₵'),
        success: {
          text: t('린위에가 통행료 잔액을 회수하고 승인란을 덮는다. “허가는 내가 낼게.” 세린은 도장을 바라보다 먼저 문으로 간다.', 'Lin Yue collects the remaining toll credit and covers the approval field. “I’ll decide who passes.” Se-rin watches the stamp, then heads for the door.'),
          effects: [{ kind: 'bond', id: 'lin_yue', amount: 1 }, { kind: 'axis', axis: 'dominance', amount: 1 }, { kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('세린과 검표기를 떼어 문을 열어 둔다', 'Remove the scanner with Se-rin and leave the door open'),
        hint: t('세린 유대 +1 · 추적 −3', '+1 Se-rin bond · −3 Trace'),
        success: {
          text: t('세린이 검표기 전선을 감는다. “이제 얼굴도 돈도 안 물어.” 린위에는 장부를 챙긴다. 지불한 이름들을 덮지 않는다.', 'Se-rin coils the scanner cable. “No face check. No fee.” Lin Yue takes the ledger, leaving the names of those who paid uncovered.'),
          effects: [{ kind: 'bond', id: 'se_rin', amount: 1 }, { kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'a6_rewrite_door',
    acts: [6],
    title: t('벽이라는 글자', 'The Word for Wall'),
    image: 'v2/events/a6_rewrite_door.webp',
    gmHints: ['rewrite', 'editable wall', 'code scribe'],
    text: t(
      '복도 끝의 벽이 작은 글자로 풀린다. 벽. 벽. 벽. 코드 필경사는 같은 낱말을 줄마다 덧쓴다. 당신이 손을 대자 한 칸이 비고, 필경사의 펜이 그 앞에서 멈춘다.',
      'The wall at the end of the corridor loosens into small letters. Wall. Wall. Wall. A code scribe adds the same word to each line. Your touch clears one space. The scribe’s pen stops before it.',
    ),
    options: [
      {
        label: t('문으로 고쳐 쓰고 필경사에게 비키라 한다', 'Rewrite it as a door and order the scribe aside'),
        hint: t('지능 6 · 카드 선택 / 실패 추적 +5', 'INT 6 · pick card / fail: +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('문고리를 뜻하는 획을 덧붙인다. 필경사가 옆으로 물러나 수정 순서를 받아 적는다. 그 순서를 당신도 챙긴다.', 'You add a stroke for the handle. The scribe steps aside and copies your revision sequence. You keep a copy too.'),
          effects: [{ kind: 'card_choice' }, { kind: 'axis', axis: 'dominance', amount: 1 }, { kind: 'codex', id: 'lore_a6_origin_code' }],
        },
        failure: {
          text: t('문이라는 글자에 붉은 줄이 그어진다. 필경사가 당신의 손자국을 조회 목록에 올린다.', 'A red line crosses out the word door. The scribe adds your handprint to its query list.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('쓰다 버린 펜촉을 모아 반납한다', 'Collect and return the discarded nibs'),
        hint: t('크레딧 +18', '+18 ₵'),
        success: {
          text: t('반납 접시에 펜촉을 올린다. 필경사가 보증금을 내주고 정비용 옆문을 가리킨다.', 'You place the nibs in the return tray. The scribe pays the deposit and points to a side door for maintenance.'),
          effects: [{ kind: 'credits', amount: 18 }],
        },
      },
    ],
  },
  {
    id: 'a6_rewrite_bridge',
    acts: [6],
    title: t('발밑의 빈칸', 'The Blank beneath Your Feet'),
    image: 'v2/events/a6_rewrite_bridge.webp',
    gmHints: ['rewrite', 'unfinished bridge', 'eraser tracks'],
    text: t(
      '소거기가 지나간 다리에 빈칸이 남아 있다. 건너편에서는 바닥이라는 글자가 끝없이 인쇄된다. 한 장을 틈 위에 대자 종이가 발판처럼 굳는다. 손을 떼면 글자가 흩어진다.',
      'An eraser has left a gap in a bridge. Across it, a printer endlessly prints the word FLOOR. A sheet held over the gap hardens into a step. When you let go, the letters scatter.',
    ),
    options: [
      {
        label: t('글자가 굳는 박자에 맞춰 발판을 잇는다', 'Join the steps in time with the letters hardening'),
        hint: t('민첩 6 · 카드 강화 / 실패 HP −5', 'AGI 6 · upgrade / fail: −5 HP'),
        check: { stat: 'agi', dc: 6 },
        success: {
          text: t('한 발이 닿기 전에 다음 장을 민다. 마지막 장은 장비의 갈라진 판에 붙인다. 글자가 틈을 메운다.', 'You slide the next sheet into place before each step lands. The last sheet goes over a cracked plate on your gear. Its letters fill the gap.'),
          effects: [{ kind: 'upgrade_card', count: 1 }],
        },
        failure: {
          text: t('발끝 아래 글자가 흩어진다. 난간을 붙잡아 올라오며 무릎을 부딪힌다.', 'The letters scatter beneath your toes. You catch the railing and knock your knee as you climb back up.'),
          effects: [{ kind: 'hp', amount: -5 }],
        },
      },
      {
        label: t('다리 아래의 정비 계단을 내려간다', 'Take the service stairs beneath the bridge'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('계단에는 글자 대신 볼트가 박혀 있다. 다리를 향한 감시등 아래로 몸을 낮추고 지난다.', 'Bolts hold these stairs together instead of words. You pass beneath the lights aimed at the bridge.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a6_paper_moth',
    acts: [6],
    title: t('접힌 날개', 'Folded Wings'),
    image: 'v2/events/a6_paper_moth.webp',
    gmHints: ['quiet wonder', 'paper moths', 'server light'],
    text: t(
      '서버의 따뜻한 등 아래 종이 나방들이 모여든다. 날개에는 지워진 쉼표가 하나씩 남아 있다. 가장 작은 나방이 당신의 손톱에 앉는다. 등을 끄는 팔이 다가오다가 날개가 펴질 때까지 멈춘다.',
      'Paper moths gather beneath a warm server light. Each wing bears the trace of an erased comma. The smallest moth settles on your fingernail. An arm reaches to switch off the lamp, then waits for the wings to open.',
    ),
    options: [
      {
        label: t('나방이 날아갈 때까지 손을 편 채 쉰다', 'Rest with your hand open until the moth flies'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('손을 떨지 않으려 팔꿈치를 받친다. 나방이 떠날 무렵에는 어깨도 내려가 있다.', 'You support your elbow to keep your hand still. By the time the moth leaves, your shoulders have relaxed too.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('나방들이 지나간 어두운 틈으로 걷는다', 'Walk through the dark gap the moths came through'),
        hint: t('추적 −3', '−3 Trace'),
        success: {
          text: t('좁은 통로 끝에서 날개가 반짝인다. 감시 렌즈는 아직 등 아래 모인 나방들을 세고 있다.', 'Wings glimmer at the end of the narrow passage. The surveillance lens is still counting moths beneath the lamp.'),
          effects: [{ kind: 'trace', amount: -3 }],
        },
      },
    ],
  },
  {
    id: 'a6_server_snow',
    acts: [6],
    title: t('눈을 담은 받침', 'A Tray for Snow'),
    image: 'v2/events/a6_server_snow.webp',
    gmHints: ['quiet wonder', 'origin server', 'coolant frost'],
    text: t(
      '원본 서버의 찬 배관에서 서리가 떨어진다. 정비 팔이 작은 받침을 밀어 눈을 받는다. 받침 바닥에는 손으로 그린 나무가 있다. 눈이 가지를 덮으면 팔은 받침을 데우고 처음부터 다시 기다린다.',
      'Frost falls from the origin server’s cold pipes. A service arm slides a little tray underneath to catch it. A tree is drawn by hand on the tray. When snow covers its branches, the arm warms the tray and waits again.',
    ),
    options: [
      {
        label: t('나무가 다시 드러날 때까지 앉아 있는다', 'Sit until the tree appears again'),
        hint: t('HP +6', '+6 HP'),
        success: {
          text: t('물이 가지 끝을 따라 흐른다. 정비 팔이 따뜻한 바람을 당신 쪽으로도 보낸다. 젖은 소매가 마른다.', 'Water follows the tips of the branches. The service arm directs warm air toward you too. Your damp sleeves dry.'),
          effects: [{ kind: 'hp', amount: 6 }],
        },
      },
      {
        label: t('빈 냉각 용기를 반납구에 넣는다', 'Return the empty coolant canisters'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('받침을 건드리지 않고 빈 용기들을 옮긴다. 반납구가 보증금을 내준다. 정비 팔은 눈을 계속 받는다.', 'You move the empty canisters without disturbing the tray. The return slot pays their deposits. The service arm keeps catching snow.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
    ],
  },
  {
    id: 'a6_margin_lottery',
    acts: [6],
    title: t('접힌 번호표', 'Folded Numbers'),
    image: 'v2/events/a6_margin_lottery.webp',
    gmHints: ['gamble', 'folded tickets', 'Spire Gate kiosk'],
    text: t(
      '스파이어 문 안쪽 매표기가 번호표를 접어 놓았다. 첫 장은 무료. 당첨표에는 남은 통행료를 돌려준다고 적혀 있다. 꽝을 넣는 함 옆에는 작은 전류 경고등이 켜져 있다. 접힌 틈으로 잉크가 조금씩 비친다.',
      'A kiosk inside the Spire Gate offers folded tickets. The first is free. A winning ticket pays out unclaimed tolls. A small electrical warning light glows beside the slot for losing tickets. Ink shows through the folds.',
    ),
    options: [
      {
        label: t('잉크 자국을 보고 한 장 뽑는다', 'Choose a ticket by the ink showing through'),
        hint: t('관찰 6 · 크레딧 +48 / 실패 HP −4', 'OBS 6 · +48 ₵ / fail: −4 HP'),
        check: { stat: 'obs', dc: 6 },
        success: {
          text: t('접힌 당첨 글자가 펴진다. 매표기가 오래 묵은 통행료를 세어 돌려준다.', 'The folded word WINNER opens out. The kiosk counts out the old unclaimed tolls.'),
          effects: [{ kind: 'credits', amount: 48 }],
        },
        failure: {
          text: t('꽝 표를 반납하자 투입구에서 전류가 튄다. 손가락을 털며 물러난다. 경고등이 한 번 더 깜박인다.', 'A spark jumps from the slot as you return the losing ticket. You step back, shaking your fingers. The warning light blinks once more.'),
          effects: [{ kind: 'hp', amount: -4 }],
        },
      },
      {
        label: t('바닥의 빈 표통을 정리한다', 'Stack the empty ticket boxes'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('빈 통을 반납대에 쌓는다. 매표기는 청소비를 지급한다. 이번에는 아무것도 접혀 있지 않다.', 'You stack the empty boxes on the return shelf. The kiosk pays a cleaning fee. Nothing comes folded this time.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('정가로 밀봉된 구급함을 산다', 'Buy a sealed first-aid box at the posted price'),
        hint: t('크레딧 −24 · 나노패치 1개', '−24 ₵ · 1 Nanopatch'),
        requires: { minCredits: 24 },
        success: {
          text: t('가격표 아래 서랍이 열린다. 패치 하나와 접지 않은 영수증이 나온다.', 'A drawer opens beneath the price tag. It holds a patch and an unfolded receipt.'),
          effects: [{ kind: 'credits', amount: -24 }, { kind: 'consumable', id: 'nanopatch' }],
        },
      },
    ],
  },
  {
    id: 'a6_vault_signature',
    acts: [6],
    title: t('마지막 줄의 필체', 'The Handwriting on the Last Line'),
    image: 'v2/events/a6_vault_signature.webp',
    gmHints: ['First Record vault', 'unreadable signature', 'familiar handwriting'],
    text: t(
      '최초 기록 보관소의 서랍이 손바닥 너비만큼 열린다. 마지막 장의 끝이 밖으로 나와 있다. 최초 기록의 마지막 줄에 서명이 있다. 읽을 수 없지만, 당신의 필체다. 손목이 종이 위에서 저절로 기울어진다.',
      'A drawer in the First Record vault opens a hand’s width. The edge of the last page protrudes. The last line of the first record is signed. It is unreadable — but it is your handwriting. Your wrist tilts over the paper without being told.',
    ),
    options: [
      {
        label: t('서명이 남은 장을 읽고 보관한다', 'Read and keep the signed page'),
        hint: t('기록 조각 · 통찰 +1 · 추적 −2', 'Record shard · +1 Insight · −2 Trace'),
        success: {
          text: t('서명에 손을 대지 않고 가장자리를 잡는다. 접어 넣자 서랍의 열람등이 꺼진다. 손목은 아직 마지막 획을 기다린다.', 'You hold the edges without touching the signature. As you fold the page away, the drawer’s reading light goes dark. Your wrist still waits for a final stroke.'),
          effects: [{ kind: 'flag', key: 'record_7' }, { kind: 'axis', axis: 'insight', amount: 1 }, { kind: 'trace', amount: -2 }],
        },
      },
      {
        label: t('종이를 밀어 넣고 손목을 감싼다', 'Slide the page back and hold your wrist'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('빈 의자에 앉아 손목을 천천히 편다. 떨림이 멎은 뒤 일어난다. 서랍은 닫혔지만 글씨의 기울기는 떠오른다.', 'You sit in an empty chair and slowly straighten your wrist. You stand when the trembling stops. The drawer is closed, but the slant of the letters stays with you.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
    ],
  },
  {
    id: 'a6_origin_queue',
    acts: [6],
    title: t('호명되지 않는 번호', 'The Number Never Called'),
    image: 'v2/events/a6_origin_queue.webp',
    gmHints: ['origin server', 'unfinished people', 'waiting room'],
    text: t(
      '원본 서버 대기실에 초안들이 번호표를 쥐고 앉아 있다. 어깨선까지만 그려진 초안이 무릎 위의 외투를 자꾸 떨어뜨린다. 전광판은 다음 번호로 넘어가지 않는다. 청소기가 외투 앞에서 멈춰 서 있다.',
      'Drafts sit holding numbered tickets in the origin server’s waiting room. One, drawn only as far as the shoulders, keeps dropping the coat from its lap. The display never advances. A cleaning machine has stopped in front of the coat.',
    ),
    options: [
      {
        label: t('외투를 옆 의자에 놓고 함께 기다린다', 'Put the coat on the next chair and wait beside it'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('초안이 빈 옷깃을 당신 쪽으로 돌린다. 청소기가 조용히 지나간다. 의자에 기대고 다리의 힘을 푼다.', 'The draft turns its empty collar toward you. The cleaner passes quietly. You lean back and rest your legs.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
      {
        label: t('고장 난 호출기의 전원을 끈다', 'Switch off the broken queue announcer'),
        hint: t('추적 −4', '−4 Trace'),
        success: {
          text: t('같은 번호를 찾던 호출이 멎는다. 초안들은 여전히 앉아 있지만 천장을 올려다보지는 않는다.', 'The repeated call for the same number stops. The drafts remain seated, but they no longer look up at the ceiling.'),
          effects: [{ kind: 'trace', amount: -4 }],
        },
      },
    ],
  },
  {
    id: 'a6_omega_blueprint',
    acts: [6],
    title: t('설계도 밖의 의자', 'The Chair Outside the Plan'),
    image: 'v2/events/a6_omega_blueprint.webp',
    gmHints: ['Architect Omega', 'complete blueprint', 'unplanned chair'],
    text: t(
      '설계자 오메가 — 완전체의 도면이 원본 서버 벽을 덮는다. 접속자가 설 자리까지 자로 그어져 있다. 하지만 방 한가운데 의자는 어디에도 없다. 다리 아래에 접힌 수정 도면이 끼워져 있다.',
      'Blueprints signed ARCHITECT OMEGA — COMPLETE cover the origin server’s wall. Even the connector’s position is ruled in. Yet the chair in the middle of the room appears nowhere. A folded revision props up one leg.',
    ),
    options: [
      {
        label: t('의자를 받치고 수정 도면을 읽는다', 'Steady the chair and read the folded revision'),
        hint: t('지능 6 · 카드 제거 / 실패 추적 +5', 'INT 6 · remove card / fail: +5 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t('폐기된 동작 순서에 취소선이 있다. 따라 하던 동작 하나를 지운다. 종이 대신 평평한 볼트를 의자 밑에 넣는다.', 'Crossed-out movement instructions fill the page. You discard one routine you had kept following. A flat bolt replaces the paper beneath the chair.'),
          effects: [{ kind: 'remove_card', count: 1 }, { kind: 'codex', id: 'lore_a6_omega_revision' }],
        },
        failure: {
          text: t('종이를 펴자 벽의 도면들이 동시에 갱신된다. 열람한 위치에 당신의 발자국이 찍힌다.', 'Unfolding the page updates every plan on the wall. Your footprints appear at the point of access.'),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
      {
        label: t('도면 밖의 의자에 앉는다', 'Sit in the chair outside the plan'),
        hint: t('HP +5', '+5 HP'),
        success: {
          text: t('의자는 조금 흔들리지만 체중을 받친다. 도면 속 접속자 자리는 비워 둔 채 숨을 돌린다.', 'The chair wobbles slightly, but holds your weight. You catch your breath, leaving the connector’s marked position empty.'),
          effects: [{ kind: 'hp', amount: 5 }],
        },
      },
    ],
  },
  {
    id: 'a6_guard_receipt',
    acts: [6],
    title: t('반납 창구의 경비', 'The Guard at the Return Desk'),
    image: 'v2/events/a6_guard_receipt.webp',
    gmHints: ['origin guard', 'return receipt', 'unfinished soldier'],
    text: t(
      '초안 병사가 반납 창구를 지킨다. 손에는 반납 완료 도장이 있지만 찍을 서류가 없다. 창구 안쪽 보관함에는 방문객의 장비가 남아 있다. 병사는 당신의 얼굴과 빈 영수증을 번갈아 본다.',
      'A draft soldier guards a return desk. It holds a RETURNED stamp but has no form to stamp. Visitors’ equipment remains in the lockers behind it. The soldier looks between your face and a blank receipt.',
    ),
    options: [
      {
        label: t('빈 영수증으로 반납 절차를 마쳐 달라고 한다', 'Ask it to complete the return with the blank receipt'),
        hint: t('매력 6 · 카드 선택 / 실패 전투', 'CHA 6 · pick card / fail: combat'),
        check: { stat: 'cha', dc: 6 },
        success: {
          text: t('병사가 오래 겨누던 도장을 찍는다. 보관함 하나가 열린다. 반납표에 맞는 장비를 고른다.', 'The soldier finally brings the stamp down. A locker opens. You choose equipment covered by the return slip.'),
          effects: [{ kind: 'card_choice' }],
        },
        failure: {
          text: t('빈 서류에 도장을 찍자 경보가 울린다. 병사가 창구를 닫고 원본의 경비를 부른다.', 'Stamping the blank form sounds an alarm. The soldier closes the desk and summons the Origin Guard.'),
          effects: [{ kind: 'combat', encounterId: 'a6_event_ambush' }],
        },
      },
      {
        label: t('접수대의 분실 동전만 정산한다', 'Cash in only the lost coins on the counter'),
        hint: t('크레딧 +16', '+16 ₵'),
        success: {
          text: t('소액 반환구에 동전을 넣는다. 병사가 합계만 확인한다. 빈 영수증은 여전히 손에 들려 있다.', 'You feed the coins into the small-change return slot. The soldier checks only the total. It still holds the blank receipt.'),
          effects: [{ kind: 'credits', amount: 16 }],
        },
      },
      {
        label: t('보관함을 열고 경비를 정면으로 맞는다', 'Open the lockers and face the guards'),
        hint: t('전투', 'Combat'),
        success: {
          text: t('잠금쇠를 당기자 복도에 붉은 글씨가 켜진다. 원형 추적자의 발소리가 창구 뒤에서 들린다.', 'You pull the latch. Red lettering lights the corridor. An Origin Hound’s footsteps sound behind the desk.'),
          effects: [{ kind: 'combat', encounterId: 'a6_event_ambush' }],
        },
      },
    ],
  },
]
