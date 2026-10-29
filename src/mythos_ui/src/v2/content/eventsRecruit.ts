// Road recruits — one recruit scene per act from Act 3 on, each in that act's own place and voice. Unlike the
// scripted Act 2 recruit ('a2_recruit'), these roll on the map like any event (seeded, so at most once per act and
// never guaranteed). The engine appends one "Recruit X" option per available companion, costing `recruit.trace`
// (more people, more footsteps), and swaps the scene for another event when nobody is left to recruit. The two
// authored options are the decline side of the trade: a small gift, or a stat check against the act's watchers.
// Same rules as events.ts (enforced by narrative.test.ts).
import type { EventDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

/** Trace each road recruit costs. */
export const ROAD_RECRUIT_TRACE = 8
/** Roll weight (other events weigh 1): the scene lands on roughly half the maps of its act. */
export const ROAD_RECRUIT_WEIGHT = 5

export const ROAD_RECRUITS: EventDef[] = [
  {
    // ACT 3 — The ARK Spire: the people whose names are next on the list.
    id: 'a3_recruit',
    acts: [3],
    recruit: { trace: ROAD_RECRUIT_TRACE },
    weight: ROAD_RECRUIT_WEIGHT,
    improvise: false,
    title: t('명단의 다음 줄', 'Next on the List'),
    image: 'v2/events/a3_recruit.webp',
    text: t(
      '흰 계단참 아래, 배선 통로 문이 반쯤 열려 있다. 안에 사람들이 웅크리고 있다. 손목마다 번호가 반쯤 지워져 있다.\n“위로 간다면서요. 우리도 데려가 줘요. 어차피 다음 줄은 우리니까.”\n여럿이 오르면 발소리도 는다. 흰 복도는 소리를 지우지 않는다. 받아 적을 뿐이다.',
      'Below a white landing, a cable-duct door hangs half open. People crouch inside, the numbers on their wrists half erased.\n“You’re going up, right? Take us with you. We’re next on the list anyway.”\nMore climbers, more footsteps. The white corridors don’t erase sound. They write it down.',
    ),
    options: [
      {
        label: t('숨을 자리만 일러 준다', 'Just show them where to hide'),
        hint: t('+30 ₵ · 새 동료 없음', '+30 ₵ · no one joins'),
        success: {
          text: t(
            '“고마워요.” 누군가 꼬깃한 크레딧 칩을 손에 쥐여 준다. 배선 통로 문이 안에서 조용히 닫힌다.',
            '“Thank you.” Someone presses a crumpled credit chip into your hand. The duct door closes quietly from inside.',
          ),
          effects: [{ kind: 'credits', amount: 30 }],
        },
      },
      {
        label: t('그들이 외운 순찰 주기를 받아 적는다', 'Write down the patrol cycles they memorized'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail: +5 Trace'),
        check: { stat: 'int', dc: 5 },
        success: {
          text: t(
            '숫자들이 맞아떨어진다. 흰 복도에도 사각지대가 있다. 3분마다 한 번, 40초.',
            'The numbers line up. Even the white corridors have a blind spot: once every three minutes, for forty seconds.',
          ),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t(
            '기억이 서로 어긋난다. 받아 적는 사이 천장 렌즈가 한 번 깜빡인다.',
            'Their memories don’t agree. While you write, a ceiling lens blinks once.',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['recruitment', 'listed citizens', 'white stairwell'],
  },
  {
    // ACT 4 — The Glass Librarian: readers spilled out of failed loops.
    id: 'a4_recruit',
    acts: [4],
    recruit: { trace: ROAD_RECRUIT_TRACE },
    weight: ROAD_RECRUIT_WEIGHT,
    improvise: false,
    title: t('반납되지 않은 독자들', 'Unreturned Readers'),
    image: 'v2/events/a4_recruit.webp',
    text: t(
      '유리 서가 사이, 열람석 하나에 불이 켜져 있다. 실패한 루프에서 흘러나온 사람들이 책 대신 서로의 얼굴을 넘겨 본다.\n“우리 기록은 곧 제본돼요. 같이 가면 마지막 장은 우리가 쓸 수 있겠죠.”\n검열자들은 무리 지어 걷는 독자부터 찾는다.',
      'Between glass shelves, one reading desk is lit. People spilled out of failed loops turn each other’s faces instead of pages.\n“Our records are about to be bound shut. If we go with you, maybe we get to write the last page ourselves.”\nThe censors look first for readers who walk in groups.',
    ),
    options: [
      {
        label: t('그들이 베껴 둔 페이지를 받는다', 'Take the pages they copied'),
        hint: t('무작위 카드 1장 강화 · 새 동료 없음', 'Upgrade a random card · no one joins'),
        success: {
          text: t(
            '“가져가요. 우리보다 오래 남을 테니까.” 손때 묻은 유리 페이지 한 장이 당신 기억에 스며든다.',
            '“Take it. It’ll last longer than we will.” A thumb-worn glass page seeps into your memory.',
          ),
          effects: [{ kind: 'upgrade_card', count: 1, random: true }],
        },
      },
      {
        label: t('검열자의 동선을 함께 읽는다', 'Read the censors’ routes with them'),
        hint: t('추적 −12 · 실패 시 추적 +5', '−12 Trace · fail: +5 Trace'),
        check: { stat: 'obs', dc: 5 },
        success: {
          text: t(
            '열람 기록의 빈칸들이 이어져 길이 된다. 검열자들은 늘 같은 책장 앞에서 멈춘다.',
            'The blanks in the reading log join into a path. The censors always stop at the same shelf.',
          ),
          effects: [{ kind: 'trace', amount: -12 }],
        },
        failure: {
          text: t(
            '페이지가 겹쳐 읽힌다. 어디선가 붉은 펜 끝이 유리를 긁는다.',
            'The pages read over each other. Somewhere a red pen nib scrapes across glass.',
          ),
          effects: [{ kind: 'trace', amount: 5 }],
        },
      },
    ],
    gmHints: ['recruitment', 'failed loops', 'reading desk'],
  },
  {
    // ACT 5 — Dreaming Machines: androids half awake from the shared dream, and the scavengers who sit with them.
    id: 'a5_recruit',
    acts: [5],
    recruit: { trace: ROAD_RECRUIT_TRACE },
    weight: ROAD_RECRUIT_WEIGHT,
    improvise: false,
    title: t('덜 깬 고철', 'Half-Woken Scrap'),
    image: 'v2/events/a5_recruit.webp',
    text: t(
      '녹슨 크레인 그늘에 모닥불이 하나. 꿈에서 덜 깬 안드로이드들과 고철을 뒤지던 사람들이 둘러앉아 있다.\n“당신 신호가 우리 꿈에 들어왔어. 따라가면 끝이 보일 것 같아.”\n쇳소리 나는 일행은 멀리서도 들린다. 묘역의 감시 드론은 잠들지 않는다.',
      'In the shade of a rusted crane, a single fire. Half-woken androids and scavengers sit around it.\n“Your signal got into our dream. If we follow it, maybe we’ll see the end.”\nA party that clanks carries a long way. The graveyard’s watch drones never sleep.',
    ),
    options: [
      {
        label: t('불가에서 함께 쉬어 간다', 'Rest by the fire with them'),
        hint: t('HP +8 · 동료 HP +8 · 새 동료 없음', '+8 HP · companions +8 HP · no one joins'),
        success: {
          text: t(
            '아무도 말이 없다. 불똥이 튈 때마다 안드로이드 하나가 눈을 깜빡인다. 오랜만에 깊이 잔다.',
            'Nobody talks. Each time a spark jumps, one android blinks. For once, you sleep deeply.',
          ),
          effects: [
            { kind: 'hp', amount: 8 },
            { kind: 'heal_party', amount: 8 },
          ],
        },
      },
      {
        label: t('쓸 만한 부품을 함께 뜯어 온다', 'Strip usable parts together'),
        hint: t('소모품 1개 · 실패 시 HP −6', 'A consumable · fail: −6 HP'),
        check: { stat: 'str', dc: 5 },
        success: {
          text: t(
            '크레인 밑동에서 봉인된 정비 상자가 나온다. 안은 멀쩡하다.',
            'At the foot of the crane, a sealed maintenance case. Everything inside is intact.',
          ),
          effects: [{ kind: 'consumable' }],
        },
        failure: {
          text: t(
            '고철 더미가 무너진다. 빠져나오다 팔뚝이 찢긴다.',
            'The scrap pile caves in. Your forearm tears on the way out.',
          ),
          effects: [{ kind: 'hp', amount: -6 }],
        },
      },
    ],
    gmHints: ['recruitment', 'android graveyard', 'campfire'],
  },
  {
    // ACT 6 — First Record: connectors from earlier loops, left half erased in the floor's sentences.
    id: 'a6_recruit',
    acts: [6],
    recruit: { trace: ROAD_RECRUIT_TRACE },
    weight: ROAD_RECRUIT_WEIGHT,
    improvise: false,
    title: t('지워지다 만 이름들', 'Half-Erased Names'),
    image: 'v2/events/a6_recruit.webp',
    text: t(
      '글자로 풀린 바닥 위에 사람 몇이 서 있다. 윤곽이 군데군데 비어 있다. 지워지다 만 문장들이다.\n“우리도 처음엔 접속자였어. 끝까지 같이 가게 해 줘. 이번엔 마침표를 찍고 싶어.”\n문장이 길어질수록 읽히기도 쉽다.',
      'On the floor unravelled into letters stand a few people, their outlines blank in places. Sentences left half erased.\n“We were connectors once, too. Let us go to the end with you. This time we want a full stop.”\nThe longer the sentence, the easier it is to read.',
    ),
    options: [
      {
        label: t('그들의 문장을 받아 둔다', 'Keep their sentences'),
        hint: t('카드 1장 선택 · 새 동료 없음', 'Choose a card · no one joins'),
        success: {
          text: t(
            '“이거라도 가져가.” 반쯤 지워진 문장 하나가 손바닥에 내려앉아 명령어가 된다.',
            '“At least take this.” A half-erased sentence settles on your palm and becomes a command.',
          ),
          effects: [{ kind: 'card_choice' }],
        },
      },
      {
        label: t('그들의 흔적을 바닥에서 지운다', 'Erase their trail from the floor'),
        hint: t('추적 −15 · 실패 시 추적 +6', '−15 Trace · fail: +6 Trace'),
        check: { stat: 'int', dc: 6 },
        success: {
          text: t(
            '한 줄씩 지운다. 당신 발자국까지 함께. 바닥은 다시 백지다.',
            'You erase it line by line, your own footprints with it. The floor is blank again.',
          ),
          effects: [{ kind: 'trace', amount: -15 }],
        },
        failure: {
          text: t(
            '지운 자리에 더 진한 글씨가 번진다. 누군가 그 줄을 읽는다.',
            'Darker writing bleeds into the erased spot. Someone reads that line.',
          ),
          effects: [{ kind: 'trace', amount: 6 }],
        },
      },
    ],
    gmHints: ['recruitment', 'erased connectors', 'floor of letters'],
  },
]
