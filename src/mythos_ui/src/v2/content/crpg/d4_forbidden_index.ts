// Act 4 — The Forbidden Index (1.0 Glass Library side quest "금서 색인 해독", W1-4). The censors list banned books by
// reversed shelf marks only; decoding one entry shows what the library was told to forget.
// q_forbidden_index: get the cipher key (1) → decode one entry at the index wall (2) → the boss's blind spot is marked.
// Yun (cipher) or No (courier) gives the key; Rim (lamp) can dim the reading light so decoding leaves no trace.
// One card picker at the courier; at most 30 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_FORBIDDEN_INDEX: DistrictDef = {
  id: 'd4_forbidden_index',
  act: 4,
  name: t('금서 색인', 'The Forbidden Index'),
  image: 'v2/districts/d4_forbidden_index.webp',
  intro: t(
    '유리 도서관 가장 안쪽 벽에 책이 아니라 번호만 꽂혀 있다. 거꾸로 적힌 청구 기호 수천 개. 금서 색인이다. 무엇이 금지됐는지는 어디에도 쓰여 있지 않다.\n열람등이 다음 순회를 시작하기 전, 세 곳을 들를 수 있다.',
    'The innermost wall of the Glass Library holds numbers instead of books: thousands of shelf marks written backwards. The Forbidden Index. Nothing says what was forbidden.\nThere is time for three stops before the reading lamps begin their next round.',
  ),
  actions: 3,
  outro: t(
    '열람등이 다시 돈다. 거꾸로 된 번호들이 빛을 받아 잠깐 바로 읽힌다. 그리고 다시 거꾸로 돌아간다.',
    'The reading lamps turn again. For a moment the backwards numbers read the right way round in the light. Then they turn back.',
  ),
  pois: [
    { id: 'cipher', name: t('암호 열람석', 'The Cipher Desk'), blurb: t('번호를 거꾸로 적는 사람.', 'The one who writes the numbers backwards.'), dialogue: 'd4fi_cipher' },
    { id: 'courier', name: t('반납되지 않은 상자', 'The Unreturned Crate'), blurb: t('금서를 나르던 손.', 'Hands that used to carry banned books.'), dialogue: 'd4fi_courier' },
    { id: 'lamp', name: t('순회 열람등', 'The Patrolling Lamp'), blurb: t('읽는 사람을 비추는 빛.', 'A light that watches whoever reads.'), dialogue: 'd4fi_lamp' },
    { id: 'wall', name: t('색인 벽', 'The Index Wall'), blurb: t('거꾸로 된 번호 수천 개.', 'Thousands of backwards numbers.'), dialogue: 'd4fi_wall' },
  ],
}

const CIPHER: DialogueDef = {
  id: 'd4fi_cipher',
  npc: 'index_cipher_yun',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'index_cipher_yun',
      text: t(
        '윤이 펜을 거꾸로 쥐고 번호를 적는다. 잉크가 마르기도 전에 다음 줄로 넘어간다. “금서는 제목이 없습니다. 제목이 있으면 사람들이 찾으니까요. 번호도 거꾸로 적습니다. 바로 읽히면 누군가 반납을 요청합니다.”',
        'Yun holds the pen upside down and writes a number. The next line begins before the ink is dry. “Forbidden books have no titles. Titles get searched for. The numbers are written backwards too. Read the right way round, someone asks for a return.”',
      ),
      options: [
        {
          label: t('“거꾸로 읽는 규칙을 알려 주세요.”', '“Teach me how to read them backwards.”'),
          intent: 'ask',
          check: { stat: 'int', dc: 13 },
          assist: 'han',
          approval: { han: 1 },
          success: {
            text: t('윤이 종이 한 장에 열쇠 표를 그린다. “서가 번호는 뒤에서, 칸 번호는 앞에서. 날짜는 읽지 마십시오. 날짜가 함정입니다.”', 'Yun draws a key table on a slip. “Shelf number from the back, row from the front. Do not read the date. The date is the trap.”'),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 1 }],
          },
          failure: {
            text: t('윤이 펜을 내려놓는다. “질문이 너무 정확하군요. 정확한 질문은 기록됩니다.”', 'Yun sets down the pen. “Your question is too precise. Precise questions get recorded.”'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('“무엇이 금지됐는지 당신도 모르죠?”', '“You don’t know what was forbidden either, do you?”'),
          intent: 'insight',
          approval: { io: 1 },
          success: {
            text: t(
              '펜이 멈춘다. “모릅니다. 저는 번호만 받습니다.” 윤이 한참 있다가 덧붙인다. “모르는 채로 적는 일이 가장 오래 걸립니다.” 열쇠 표의 귀퉁이를 찢어 건넨다.',
              'The pen stops. “I do not. I receive numbers only.” After a while Yun adds: “Writing without knowing takes the longest.” Yun tears off a corner of the key table and hands it over.',
            ),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 1 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“번호 하나만 바로 적어 줘.”', '“Write one number the right way round.”'),
          intent: 'intimidate',
          approval: { io: -1 },
          success: {
            text: t('윤이 같은 번호를 거꾸로 세 번 적는다. 세 번째 줄 끝에 작은 신고 표시가 붙는다.', 'Yun writes the same number backwards three times. A small report mark appears at the end of the third line.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('소문 하나를 암호 열쇠와 바꾸자고 한다', 'Trade a rumour for the cipher key'),
          intent: 'offer',
          requires: { background: 'broker' },
          success: {
            text: t('중개인의 셈법이 통한다. 금서 소문 하나가 넘어가고 해독 열쇠가 돌아온다.', 'The broker’s arithmetic works. One rumour about a banned book goes over; the cipher key comes back.'),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 1 }],
          },
        },
        {
          label: t('열람석을 떠난다', 'Leave the desk'),
          intent: 'leave',
          success: { text: t('펜 소리가 다시 시작된다. 한 줄, 또 한 줄.', 'The pen starts again. One line, another.') },
        },
      ],
    },
  },
}

const COURIER: DialogueDef = {
  id: 'd4fi_courier',
  npc: 'banned_courier_no',
  start: 'crate',
  nodes: {
    crate: {
      speaker: 'banned_courier_no',
      text: t(
        '반납되지 않은 상자 위에 노인이 앉아 있다. 상자에는 금서 반출 도장이 세 번 찍혀 있다. “나는 책을 날랐어. 읽지는 않았고. 읽었으면 여기 앉아 있지 못했겠지.” 노인이 상자 뚜껑을 손바닥으로 두드린다.',
        'An old man sits on an unreturned crate stamped three times with the banned-removal seal. “I carried the books. Never read them. If I had, I wouldn’t be sitting here.” He pats the lid.',
      ),
      options: [
        {
          label: t('“나르던 길에 붙은 번호표가 남아 있나요?”', '“Do you still have the tags from the route?”'),
          intent: 'ask',
          success: {
            text: t('노 선생이 주머니에서 낡은 운반 꼬리표를 꺼낸다. 앞면은 거꾸로, 뒷면은 바로 적혀 있다. “반출할 때만 바로 적었지. 길을 잃으면 안 되니까.”', 'Old No pulls a worn carrying tag from his pocket. Backwards on the front, the right way round on the back. “Only written straight for removal. Couldn’t have us getting lost.”'),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 1 }],
          },
        },
        {
          label: t('상자 안의 낱장 하나를 사겠다고 한다', 'Offer to buy a loose page from the crate'),
          intent: 'offer',
          check: { stat: 'cha', dc: 12 },
          success: {
            text: t('노 선생이 뚜껑을 손가락 하나만큼 연다. “한 장. 읽지 말고 써. 읽으면 무거워져.” 종이에서 오래된 전술 기록의 냄새가 난다.', 'Old No lifts the lid a finger’s width. “One page. Use it, don’t read it. Reading makes it heavy.” The paper smells of an old tactics log.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('뚜껑이 닫힌다. “값을 묻는 사람은 꼭 다시 와. 그땐 검열관이랑 같이 오지.”', 'The lid shuts. “People who ask the price always come back. With a censor, next time.”'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('상자 운반을 거들고 수고비를 받는다', 'Help shift the crate and take the fee'),
          intent: 'offer',
          approval: { se_rin: 1 },
          success: {
            text: t('둘이서 상자를 서가 그림자 밑으로 옮긴다. 노 선생이 동전을 세어 준다. “반출 수당. 마지막 거야.”', 'Together you move the crate into a shelf’s shadow. Old No counts out coins. “Removal allowance. The last one.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('노인을 쉬게 두고 간다', 'Let him rest'),
          intent: 'leave',
          success: { text: t('노 선생이 상자에 등을 기대고 눈을 감는다.', 'Old No leans back on the crate and closes his eyes.') },
        },
      ],
    },
  },
}

const LAMP: DialogueDef = {
  id: 'd4fi_lamp',
  npc: 'reading_lamp_rim',
  start: 'light',
  nodes: {
    light: {
      speaker: 'reading_lamp_rim',
      text: t(
        '천장에서 내려온 열람등 림이 당신 손을 비춘다. 빛이 손금을 따라 천천히 움직인다. “열람자 확인. 읽는 사람은 비춥니다. 비추면 기록됩니다. 기록되면 지울 수 있습니다.”',
        'Rim, a reading lamp lowered from the ceiling, shines on your hands. The light follows the lines of your palm. “Reader confirmed. Readers are lit. What is lit is recorded. What is recorded can be erased.”',
      ),
      options: [
        {
          label: t('“잠깐만 어두워져 줄 수 있어?”', '“Could you go dark for a moment?”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'io',
          approval: { io: 1 },
          success: {
            text: t('림의 빛이 한 단계 낮아진다. “전구 교체 주기라고 기록하겠습니다. 다음 순회까지.” 색인 벽 앞이 어둑해진다.', 'Rim dims by one step. “I will log a bulb change. Until the next round.” The space before the index wall goes dusky.'),
            effects: [{ kind: 'flag', key: 'fi_dark' }],
          },
          failure: {
            text: t('빛이 더 밝아진다. “요청 기록. 요청자도 기록.”', 'The light grows brighter. “Request logged. Requester logged.”'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('갓의 전선을 슬쩍 느슨하게 한다', 'Quietly loosen the shade’s wire'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          success: {
            text: t('빛이 깜박이다 반쯤 꺼진다. 림이 고장 보고서를 쓰느라 바쁘다.', 'The light flickers and half dies. Rim is busy writing a fault report.'),
            effects: [{ kind: 'flag', key: 'fi_dark' }],
          },
          failure: {
            text: t('불꽃이 튄다. 림이 당신 손을 끝까지 따라 비춘다.', 'A spark jumps. Rim follows your hand with its light all the way back.'),
            effects: [{ kind: 'hp', amount: -4 }, { kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('빛 아래서 손을 거둔다', 'Draw your hands out of the light'),
          intent: 'leave',
          success: { text: t('림이 다음 열람자를 찾아 천장으로 올라간다.', 'Rim rises toward the ceiling to look for the next reader.') },
        },
      ],
    },
  },
}

const WALL: DialogueDef = {
  id: 'd4fi_wall',
  start: 'numbers',
  nodes: {
    numbers: {
      text: t(
        '색인 벽 앞에 서면 번호들이 눈높이로 내려온다. 모두 거꾸로다. 한 줄은 다른 줄보다 잉크가 진하다. 최근에 추가된 금서다.',
        'Stand before the wall and the numbers drop to eye level. All backwards. One line’s ink is darker than the rest: a recent addition to the forbidden list.',
      ),
      options: [
        {
          label: t('어두운 틈에 열쇠 표를 대고 읽는다', 'Hold the key table to it in the dark'),
          intent: 'insight',
          requires: { flag: 'fi_dark', quest: { id: 'q_forbidden_index', stage: 1 } },
          success: {
            text: t(
              '거꾸로 된 번호가 바로 선다. 금서 제목은 없다. 대신 분류 이유가 있다. ‘열람자에게 사서의 사각을 알려 줌.’ 사서가 보지 못하는 자리가 적힌 책이다.',
              'The backwards number stands upright. There is no title, only a reason for the ban: ‘Tells readers where the librarian cannot see.’ A book that lists the librarian’s blind spots.',
            ),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 2 }, { kind: 'codex', id: 'lore_d_reversed_marks' }],
          },
        },
        {
          label: t('불빛 아래서 그대로 읽어 낸다', 'Decode it under the light'),
          intent: 'insight',
          requires: { quest: { id: 'q_forbidden_index', stage: 1 } },
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('읽는 손이 비친다. 그래도 끝까지 읽는다. ‘사서의 사각.’ 열람등이 그 줄과 당신 이름을 나란히 적는다.', 'Your reading hand is lit. You read on anyway: ‘the librarian’s blind spots.’ The lamp writes that line and your name side by side.'),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 2 }, { kind: 'codex', id: 'lore_d_reversed_marks' }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('날짜부터 읽고 말았다. 번호가 다시 뒤집힌다. 열람 기록만 남는다.', 'You read the date first. The number flips back. Only your reading record remains.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('이오에게 진한 줄을 보여 준다', 'Show Io the dark line'),
          intent: 'ask',
          requires: { companion: 'io', quest: { id: 'q_forbidden_index', stage: 1 } },
          approval: { io: 2 },
          success: {
            text: t('이오가 한참 줄을 본다. “이건 제가 쓴 책이에요. 금지된 줄은 몰랐어요.” 이오가 직접 번호를 바로 읽어 준다.', 'Io studies the line a long time. “I wrote this book. I didn’t know it was banned.” Io reads the number the right way round for you.'),
            effects: [{ kind: 'quest', id: 'q_forbidden_index', stage: 2 }, { kind: 'codex', id: 'lore_d_reversed_marks' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('번호들에서 눈을 뗀다', 'Look away from the numbers'),
          intent: 'leave',
          success: { text: t('번호들이 다시 천장 쪽으로 올라간다.', 'The numbers drift back up toward the ceiling.') },
        },
      ],
    },
  },
}

export const D4_FORBIDDEN_INDEX_DIALOGUES: DialogueDef[] = [CIPHER, COURIER, LAMP, WALL]

export const D4_FORBIDDEN_INDEX_NPCS: NpcDef[] = [
  {
    id: 'index_cipher_yun',
    name: t('윤', 'Yun'),
    role: t('금서 번호를 거꾸로 적는 색인 담당', 'Index keeper who writes banned numbers backwards'),
    faction: 'grid',
    portrait: 'v2/npcs/index_cipher_yun.webp',
  },
  {
    id: 'banned_courier_no',
    name: t('노 선생', 'Old No'),
    role: t('금서를 나르기만 하고 읽지 않은 운반인', 'Courier who carried banned books and never read them'),
    faction: 'market',
    portrait: 'v2/npcs/banned_courier_no.webp',
  },
  {
    id: 'reading_lamp_rim',
    name: t('림', 'Rim'),
    role: t('읽는 사람을 비추고 기록하는 열람등', 'Reading lamp that lights and logs every reader'),
    faction: 'grid',
    portrait: 'v2/npcs/reading_lamp_rim.webp',
  },
]

export const D4_FORBIDDEN_INDEX_QUESTS: QuestDef[] = [{
  id: 'q_forbidden_index',
  title: t('금서 색인', 'The Forbidden Index'),
  stages: [
    t('거꾸로 적힌 금서 번호를 읽을 열쇠를 얻는다.', 'Get the key to read the backwards banned numbers.'),
    t('최근에 금지된 책 한 권을 해독한다. 사서의 사각이 적힌 책이다.', 'Decode one recently banned book: a list of the librarian’s blind spots.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('금서에 적힌 사각으로 사서의 약점을 미리 표시한다.', 'The blind spots from the banned book mark the librarian’s weak point in advance.') },
}]
