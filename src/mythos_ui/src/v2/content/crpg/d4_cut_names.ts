// Act 4 — The Drawer of Cut Names (1.0 Glass Library side quest "잘린 이름의 서랍", W1-4). A censor trims names out of
// the records with scissors; the slips go into one drawer, and nobody has opened it since.
// q_cut_names: get the drawer opened (1) → paste one name back where it was cut from (2) → those names stand as cover.
// Sae (cutter) or the unnamed clerk opens the drawer; Mun (paste) can make the restoration hold without a trace.
// One card picker at Mun; at most 25 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_CUT_NAMES: DistrictDef = {
  id: 'd4_cut_names',
  act: 4,
  name: t('잘린 이름의 서랍', 'The Drawer of Cut Names'),
  image: 'v2/districts/d4_cut_names.webp',
  intro: t(
    '열람실 구석, 재단대 위에서 가위 소리가 일정하게 난다. 기록에서 이름만 오려 낸다. 오린 조각은 바닥 서랍으로 떨어진다. 서랍은 한 번도 열린 적이 없다.\n재단사가 다음 묶음을 받기 전, 세 곳을 들를 수 있다.',
    'In a corner of the reading room, scissors snip at a steady pace on a cutting table, trimming only the names from the records. The slips fall into a drawer below. The drawer has never been opened.\nThere is time for three stops before the cutter takes the next bundle.',
  ),
  actions: 3,
  outro: t(
    '가위 소리가 다시 시작된다. 그래도 서랍 안의 조각 몇 개는 이제 제자리를 기억한다.',
    'The snipping starts again. Still, a few slips in the drawer now remember where they belong.',
  ),
  pois: [
    { id: 'cutter', name: t('재단대', 'The Cutting Table'), blurb: t('이름만 오리는 가위.', 'Scissors that cut only names.'), dialogue: 'd4cn_cutter' },
    { id: 'clerk', name: t('이름 없는 사무원', 'The Clerk Without a Name'), blurb: t('자기 이름표만 비어 있다.', 'Only their own name tag is blank.'), dialogue: 'd4cn_clerk' },
    { id: 'paste', name: t('풀 단지', 'The Paste Pot'), blurb: t('붙이는 일을 아직 기억하는 손.', 'Hands that still remember mending.'), dialogue: 'd4cn_paste' },
    { id: 'drawer', name: t('잘린 이름의 서랍', 'The Drawer'), blurb: t('오린 조각이 쌓인 곳.', 'Where the cut slips pile up.'), dialogue: 'd4cn_drawer' },
  ],
}

const CUTTER: DialogueDef = {
  id: 'd4cn_cutter',
  npc: 'name_cutter_sae',
  start: 'table',
  nodes: {
    table: {
      speaker: 'name_cutter_sae',
      text: t(
        '새가 가위를 내려놓지 않고 말한다. “이름은 기록에서 가장 무거운 부분입니다. 무거운 것부터 덜어 내야 서가가 버팁니다.” 가위 끝에서 또 한 조각이 떨어진다.',
        'Sae speaks without setting the scissors down. “Names are the heaviest part of a record. Remove the heavy parts first and the shelves hold.” Another slip falls from the blade.',
      ),
      options: [
        {
          label: t('“서랍이 넘치면 서가가 버틸까요?”', '“Will the shelves hold when the drawer overflows?”'),
          intent: 'persuade',
          check: { stat: 'int', dc: 13 },
          approval: { io: 1 },
          success: {
            text: t('가위가 처음으로 멈춘다. 새가 서랍을 내려다본다. “계산에 없던 무게군요.” 서랍 열쇠가 재단대 위에 놓인다. “점검입니다. 수리는 아닙니다.”', 'For the first time the scissors stop. Sae looks down at the drawer. “A weight not in the calculation.” The drawer key is set on the table. “For inspection. Not repair.”'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 1 }],
          },
          failure: {
            text: t('“서랍은 계산 밖입니다.” 가위가 더 빨라진다. 당신 이름이 적힌 열람표가 묶음 맨 위에 올라간다.', '“The drawer is outside the calculation.” The scissors speed up. A reading slip with your name goes to the top of the bundle.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('가위를 붙잡는다', 'Grab the scissors'),
          intent: 'fight',
          check: { stat: 'str', dc: 14 },
          approval: { io: -1 },
          success: {
            text: t('가위가 손아귀에서 버둥댄다. 새가 놓는다. 그 사이 서랍 고리가 풀린다. 재단대 경보가 짧게 운다.', 'The scissors thrash in your grip. Sae lets go. In the struggle the drawer’s catch comes loose. The table alarm gives one short cry.'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 1 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('가위 날이 손바닥을 스친다. 새가 아무 일 없다는 듯 다음 이름을 자른다.', 'The blade grazes your palm. Sae cuts the next name as if nothing happened.'),
            effects: [{ kind: 'hp', amount: -5 }],
          },
        },
        {
          label: t('기록 보존 명령 조항을 들이댄다', 'Cite the records-retention order'),
          intent: 'ask',
          requires: { background: 'enforcer' },
          success: {
            text: t('단속관 시절 외운 조항이다. 재단사가 가위를 내려놓고 서랍 열쇠를 꺼낸다.', 'A clause you memorised as an enforcer. The cutter sets down the scissors and takes out the drawer key.'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 1 }],
          },
        },
        {
          label: t('재단대를 지나친다', 'Pass the table'),
          intent: 'leave',
          success: { text: t('사각, 사각. 이름이 한 줄씩 가벼워진다.', 'Snip, snip. Line by line, the names grow lighter.') },
        },
      ],
    },
  },
}

const CLERK: DialogueDef = {
  id: 'd4cn_clerk',
  npc: 'unnamed_clerk',
  start: 'tag',
  nodes: {
    tag: {
      speaker: 'unnamed_clerk',
      text: t(
        '사무원 하나가 열람실 서류를 정리한다. 가슴의 이름표만 비어 있다. “제 이름이요? 저 서랍 어딘가에 있겠죠. 찾을 시간이 없어요. 서류가 밀려서.” 손이 잠깐 서랍 쪽을 향했다가 돌아온다.',
        'A clerk sorts the reading-room papers. Only the name tag on their chest is blank. “My name? Somewhere in that drawer. No time to look. The papers pile up.” Their hand drifts toward the drawer and comes back.',
      ),
      options: [
        {
          label: t('서류 정리를 대신 맡는다', 'Take over the sorting for a while'),
          intent: 'offer',
          approval: { se_rin: 1, io: 1 },
          success: {
            text: t('사무원이 처음으로 손을 쉰다. 서랍 앞에 쪼그려 앉아 고리를 연다. “잠깐만요. 잠깐만.” 서랍이 열린다.', 'For the first time the clerk’s hands rest. They crouch at the drawer and open the catch. “Just a moment. Just a moment.” The drawer opens.'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 1 }],
          },
        },
        {
          label: t('“이름이 기억나요?”', '“Do you remember your name?”'),
          intent: 'ask',
          check: { stat: 'cha', dc: 12 },
          success: {
            text: t('사무원이 오래 생각한다. “첫 글자가… 둥글었어요.” 그 말을 하는 동안만 이름표가 조금 따뜻해진다. 그 온기가 영감처럼 손에 남는다.', 'The clerk thinks a long time. “The first letter was… round.” For as long as they speak, the tag grows a little warm. The warmth stays in your hand like an idea.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t('“모르겠어요.” 사무원이 다시 서류를 집는다. 질문 기록이 서류 더미에 섞인다.', '“I don’t know.” The clerk picks the papers up again. Your question slips into the pile as a record.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('일을 방해하지 않는다', 'Don’t interrupt the work'),
          intent: 'leave',
          success: { text: t('서류가 한 장씩 넘어간다. 이름표는 그대로 비어 있다.', 'Papers turn one by one. The tag stays blank.') },
        },
      ],
    },
  },
}

const PASTE: DialogueDef = {
  id: 'd4cn_paste',
  npc: 'paste_mender_mun',
  start: 'pot',
  nodes: {
    pot: {
      speaker: 'paste_mender_mun',
      text: t(
        '야시장에서 흘러든 수선공 문이 풀 단지를 젓고 있다. “찢긴 건 붙이면 돼. 문제는 붙인 자리야. 검열관은 거기만 봐.” 붓 끝에서 투명한 풀이 실처럼 늘어진다.',
        'Mun, a mender drifted in from the night market, stirs a paste pot. “Torn things can be stuck back. The trouble is the seam. That’s all the censors look at.” Clear paste stretches like thread from the brush.',
      ),
      options: [
        {
          label: t('티 나지 않는 풀을 부탁한다', 'Ask for a paste that leaves no seam'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          assist: 'lin_yue',
          success: {
            text: t('문이 작은 병을 건넨다. “말라도 반짝이지 않아. 대신 두 번은 못 써.”', 'Mun hands over a small jar. “Won’t shine when it dries. Only good for once, though.”'),
            effects: [{ kind: 'flag', key: 'cn_paste' }],
          },
          failure: {
            text: t('“시장 값을 모르는구나.” 문이 단지 뚜껑을 닫는다. 근처 열람등이 이쪽으로 고개를 돌린다.', '“Don’t know market prices, do you.” Mun lids the pot. A nearby reading lamp turns this way.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('수선 기술 한 가지를 배운다', 'Learn one mending trick'),
          intent: 'ask',
          success: {
            text: t('문이 찢긴 종이 두 장을 겹쳐 보인다. “잘린 데서 다시 시작하는 거야. 싸움도 그래.” 손에 남는 요령이 하나 있다.', 'Mun overlaps two torn sheets. “You start again from the cut. Fighting’s the same.” One knack stays in your hands.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('풀 단지를 대신 저어 주고 품삯을 받는다', 'Stir the pot for a while for a wage'),
          intent: 'offer',
          success: {
            text: t('팔이 저릴 때쯤 문이 동전을 내민다. “야시장 시세보다 후해.”', 'By the time your arm aches, Mun holds out coins. “Better than the night-market rate.”'),
            effects: [{ kind: 'credits', amount: 25 }],
          },
        },
        {
          label: t('풀 냄새를 뒤로하고 간다', 'Leave the smell of paste behind'),
          intent: 'leave',
          success: { text: t('붓이 다시 단지 속을 돈다.', 'The brush circles the pot again.') },
        },
      ],
    },
  },
}

const DRAWER: DialogueDef = {
  id: 'd4cn_drawer',
  start: 'slips',
  nodes: {
    slips: {
      text: t(
        '서랍 안에 오린 이름 조각이 눈처럼 쌓여 있다. 가장 위의 조각은 아직 잉크가 젖어 있다. 조각 뒷면마다 원래 있던 기록 번호가 작게 적혀 있다.',
        'Cut name slips lie heaped in the drawer like snow. The top one is still wet with ink. On the back of each slip, small and faint, is the number of the record it came from.',
      ),
      options: [
        {
          label: t('티 나지 않는 풀로 이름 하나를 제자리에 붙인다', 'Paste one name back with the seamless paste'),
          intent: 'offer',
          approval: { miro: 1 },
          requires: { flag: 'cn_paste', quest: { id: 'q_cut_names', stage: 1 } },
          success: {
            text: t(
              '기록 번호를 따라 조각을 돌려놓는다. 풀이 마르자 이음매가 사라진다. 기록 속 사람이 다시 서류에 선다. 아무도 그 자리가 잘렸던 걸 모른다.',
              'You follow the record number and put the slip back. As the paste dries, the seam disappears. The person in the record stands on the page again. No one can tell it was ever cut.',
            ),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 2 }],
          },
        },
        {
          label: t('침으로라도 이름 하나를 붙인다', 'Stick one name back with whatever you have'),
          intent: 'offer',
          requires: { quest: { id: 'q_cut_names', stage: 1 } },
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('이음매가 울퉁불퉁하다. 그래도 이름은 붙는다. 검열관이 언젠가 그 자국을 찾을 것이다.', 'The seam is lumpy, but the name holds. One day a censor will find the mark.'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 2 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('조각이 엉뚱한 기록에 붙는다. 서류 속 사람이 남의 이름으로 선다. 얼른 떼어 낸다.', 'The slip lands on the wrong record; a person on the page stands under someone else’s name. You peel it off fast.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('사무원의 이름을 찾는다', 'Look for the clerk’s name'),
          intent: 'insight',
          requires: { quest: { id: 'q_cut_names', stage: 1 }, companion: 'io' },
          approval: { io: 2 },
          success: {
            text: t('이오가 둥근 첫 글자로 시작하는 조각을 골라낸다. “이 사람이에요.” 사무원의 이름표에 이름이 돌아온다. 사무원이 그 자리에서 서류를 내려놓는다.', 'Io picks out a slip beginning with a round first letter. “This one.” The name returns to the clerk’s tag. The clerk sets the papers down where they stand.'),
            effects: [{ kind: 'quest', id: 'q_cut_names', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('서랍을 닫는다', 'Close the drawer'),
          intent: 'leave',
          success: { text: t('조각들이 어둠 속으로 다시 가라앉는다.', 'The slips sink back into the dark.') },
        },
      ],
    },
  },
}

export const D4_CUT_NAMES_DIALOGUES: DialogueDef[] = [CUTTER, CLERK, PASTE, DRAWER]

export const D4_CUT_NAMES_NPCS: NpcDef[] = [
  {
    id: 'name_cutter_sae',
    name: t('새', 'Sae'),
    role: t('기록에서 이름만 오려 내는 재단 검열관', 'Censor who trims only the names from records'),
    faction: 'grid',
    portrait: 'v2/npcs/name_cutter_sae.webp',
  },
  {
    id: 'unnamed_clerk',
    name: t('이름 없는 사무원', 'The Unnamed Clerk'),
    role: t('자기 이름표만 비어 있는 열람실 사무원', 'Reading-room clerk whose own name tag is blank'),
    faction: 'offgrid',
    portrait: 'v2/npcs/unnamed_clerk.webp',
  },
  {
    id: 'paste_mender_mun',
    name: t('문', 'Mun'),
    role: t('찢긴 것을 붙이는 야시장 수선공', 'Night-market mender who sticks torn things back'),
    faction: 'market',
    portrait: 'v2/npcs/paste_mender_mun.webp',
  },
]

export const D4_CUT_NAMES_QUESTS: QuestDef[] = [{
  id: 'q_cut_names',
  title: t('잘린 이름', 'The Cut Names'),
  stages: [
    t('잘린 이름이 쌓인 서랍을 연다.', 'Get the drawer of cut names open.'),
    t('이름 하나를 원래 기록에 다시 붙인다.', 'Paste one name back into the record it was cut from.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('되찾은 이름들이 앞에 선다. 보스전이 엄폐물 두 개와 함께 시작된다.', 'The restored names stand in front of you: the boss fight starts with two pieces of cover.') },
}]
