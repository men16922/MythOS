// Act 6 — The First Draft (The First Record). The city's first draft lies open; streets the editor struck out are
// still lived in. q_first_draft: find a struck-out street that still has people (1) → restore it in the draft (2) →
// the boss starts marked. Mo (a struck-out resident) or the peddler San points the way; Yeon (editor) can be argued
// with. One card picker at San; at most 25 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_FIRST_DRAFT: DistrictDef = {
  id: 'd6_first_draft',
  act: 6,
  name: t('초고', 'The First Draft'),
  image: 'v2/districts/d6_first_draft.webp',
  intro: t(
    '최초 기록 깊은 곳에 도시의 초고가 펼쳐져 있다. 거리 이름 몇 개에 두 줄이 그어져 있다. 지워진 거리에서 아직 불빛이 새어 나온다.\n편집자가 다음 교정을 시작하기 전, 세 곳을 들를 수 있다.',
    'Deep in the first record, the city’s first draft lies open. A few street names are struck through twice. Light still leaks from the struck-out streets.\nThere is time for three stops before the editor starts the next round of corrections.',
  ),
  actions: 3,
  outro: t(
    '교정 펜이 다음 장으로 넘어간다. 두 줄 그어진 이름 하나 위에 작은 동그라미가 남는다.',
    'The correcting pen moves to the next page. Over one doubly struck name, a small circle remains.',
  ),
  pois: [
    { id: 'editor', name: t('교정대', 'The Correction Desk'), blurb: t('도시를 줄이는 사람.', 'The one who trims the city.'), dialogue: 'd6fd_editor' },
    { id: 'mo', name: t('지워진 골목', 'The Struck-Out Alley'), blurb: t('아직 사는 사람이 있다.', 'Someone still lives there.'), dialogue: 'd6fd_mo' },
    { id: 'san', name: t('잉크 행상', 'The Ink Peddler'), blurb: t('지운 자리에 쓸 잉크.', 'Ink for writing over erasures.'), dialogue: 'd6fd_san' },
    { id: 'draft', name: t('초고의 여백', 'The Draft’s Gutter'), blurb: t('줄 하나를 되살릴 자리.', 'Room to bring one line back.'), dialogue: 'd6fd_draft' },
  ],
}

const EDITOR: DialogueDef = {
  id: 'd6fd_editor',
  npc: 'draft_editor_yeon',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'draft_editor_yeon',
      text: t(
        '연이 빨간 펜으로 거리 하나에 줄을 긋는다. “도시는 짧을수록 관리하기 쉽습니다. 사는 사람이 있어도요. 사는 사람이 있으면 더 그렇고요.”',
        'Yeon strikes a street through with a red pen. “The shorter the city, the easier to manage. Even if people live there. Especially if people live there.”',
      ),
      options: [
        {
          label: t('“지워진 거리에서 불빛이 새요.”', '“Light is leaking from the struck streets.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          approval: { io: 1 },
          success: {
            text: t('연의 펜이 멈춘다. “…교정 누락이군요.” 지워진 거리 목록 한 장을 내민다. 확인하라는 뜻이다.', 'Yeon’s pen stops. “…A missed correction.” Yeon hands over a list of struck streets, as if asking you to check it.'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 1 }],
          },
          failure: {
            text: t('“불빛도 교정 대상입니다.” 연이 당신 이름 옆에 물음표를 친다.', '“Light is subject to correction too.” Yeon puts a question mark beside your name.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('펜을 빼앗는다', 'Take the pen'),
          intent: 'fight',
          check: { stat: 'str', dc: 13 },
          approval: { io: -1 },
          success: {
            text: t('빨간 펜이 손에 들어온다. 연이 한 발 물러선다. 경보는 울리지 않는다. 대신 장 전체가 당신을 본다.', 'The red pen is in your hand. Yeon steps back. No alarm sounds. The whole page watches you instead.'),
            effects: [{ kind: 'trace', amount: 8 }, { kind: 'flag', key: 'fd_pen' }],
          },
          failure: {
            text: t('펜 끝이 손등을 긋는다. 빨간 줄이 하나 생긴다.', 'The pen tip draws across your hand. One red line.'),
            effects: [{ kind: 'hp', amount: -5 }],
          },
        },
        {
          label: t('교정대를 떠난다', 'Leave the desk'),
          intent: 'leave',
          success: { text: t('또 한 줄이 그어진다.', 'Another line is struck.') },
        },
      ],
    },
  },
}

const MO: DialogueDef = {
  id: 'd6fd_mo',
  npc: 'struck_resident_mo',
  start: 'door',
  nodes: {
    door: {
      speaker: 'struck_resident_mo',
      text: t(
        '모가 반쯤 지워진 문간에 앉아 있다. 집 번지가 줄 아래에서 겨우 읽힌다. “우린 아직 여기 살아요. 이름이 없어졌을 뿐이지.”',
        'Mo sits in a half-erased doorway. The house number is barely legible under the line. “We still live here. Our name is all that’s gone.”',
      ),
      options: [
        {
          label: t('거리 이름을 묻는다', 'Ask the street’s name'),
          intent: 'ask',
          success: {
            text: t('모가 이름을 천천히 말한다. 줄 아래의 글자와 정확히 같다. “아무도 안 물어봤어요. 지워진 뒤로.”', 'Mo says the name slowly. It matches the letters under the line exactly. “Nobody asked. Not since.”'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 1 }],
          },
        },
        {
          label: t('문간에 같이 앉는다', 'Sit in the doorway with Mo'),
          intent: 'offer',
          approval: { se_rin: 1 },
          success: {
            text: t('한동안 둘이서 지워진 거리를 본다. 모가 주머니에서 무언가를 꺼낸다. “여기 사는 사람들이 모은 거예요.”', 'For a while you both watch the struck street. Mo takes something from a pocket. “The people here put this together.”'),
            effects: [{ kind: 'credits', amount: 15 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('거리 이름을 되찾는 거래를 제안한다', 'Offer to broker the street’s name back'),
          intent: 'offer',
          requires: { background: 'broker' },
          success: {
            text: t('모가 처음으로 웃는다. “거래라면 알아요.” 지워진 거리 이름을 또박또박 불러 준다.', 'Mo smiles for the first time. “Trades I understand.” Mo says the struck-out street’s name clearly.'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 1 }],
          },
        },
        {
          label: t('골목을 나온다', 'Leave the alley'),
          intent: 'leave',
          success: { text: t('지워진 창문 하나에 불이 켜진다.', 'A light comes on in one erased window.') },
        },
      ],
    },
  },
}

const SAN: DialogueDef = {
  id: 'd6fd_san',
  npc: 'ink_peddler_san',
  start: 'tray',
  nodes: {
    tray: {
      speaker: 'ink_peddler_san',
      text: t(
        '산이 잉크병을 흔들어 보인다. “지운 데 다시 쓰려면 아무 잉크나 안 돼. 편집자 펜보다 진해야 하거든. 비싸.”',
        'San shakes an ink bottle at you. “To write over an erasure, any ink won’t do. It has to be darker than the editor’s pen. Pricey.”',
      ),
      options: [
        {
          label: t('진한 잉크를 산다', 'Buy the dark ink'),
          intent: 'offer',
          requires: { minCredits: 20 },
          success: {
            text: t('산이 병을 건넨다. 잉크가 빛을 빨아들인다.', 'San hands over the bottle. The ink drinks the light.'),
            effects: [{ kind: 'credits', amount: -20 }, { kind: 'flag', key: 'fd_ink' }],
          },
        },
        {
          label: t('잉크로 쓴 전술 메모를 고른다', 'Pick through ink-written tactics notes'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('산의 좌판 아래 낡은 메모 셋. “덤이야. 하나만.”', 'Under San’s tray, three old notes. “On the house. One.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('메모의 잉크가 손가락에 번진다. 산이 혀를 찬다.', 'The ink smears on your fingers. San clicks his tongue.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('좌판을 지나친다', 'Pass the tray'),
          intent: 'leave',
          success: { text: t('산이 다른 병을 흔든다.', 'San shakes another bottle.') },
        },
      ],
    },
  },
}

const DRAFT: DialogueDef = {
  id: 'd6fd_draft',
  start: 'gutter',
  nodes: {
    gutter: {
      text: t(
        '초고의 접힌 자리, 두 줄 그어진 거리 이름 바로 옆에 빈칸이 있다. 여기 다시 쓰면 거리가 돌아온다. 편집자는 알아챌 것이다.',
        'In the draft’s fold, right beside a doubly struck street name, there is a blank. Write it here again and the street comes back. The editor will notice.',
      ),
      options: [
        {
          label: t('진한 잉크로 거리 이름을 다시 쓴다', 'Rewrite the street name in the dark ink'),
          intent: 'offer',
          requires: { flag: 'fd_ink', quest: { id: 'q_first_draft', stage: 1 } },
          success: {
            text: t('이름이 줄 위로 떠오른다. 편집자 펜으로는 다시 지워지지 않는다. 장 끝에서 보스의 그림자가 표시된다.', 'The name rises above the line. The editor’s pen cannot strike it again. At the page’s end, the boss’s shadow is marked.'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 2 }],
          },
        },
        {
          label: t('빼앗은 빨간 펜으로 줄을 지운다', 'Erase the strike with the red pen you took'),
          intent: 'offer',
          requires: { flag: 'fd_pen', quest: { id: 'q_first_draft', stage: 1 } },
          success: {
            text: t('편집자의 펜으로 편집자의 줄을 지운다. 거리가 돌아오고, 펜이 손에서 바스러진다.', 'You erase the editor’s line with the editor’s pen. The street comes back; the pen crumbles in your hand.'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 2 }],
          },
        },
        {
          label: t('손으로 이름을 다시 쓴다', 'Write the name back by hand'),
          intent: 'offer',
          requires: { quest: { id: 'q_first_draft', stage: 1 } },
          check: { stat: 'int', dc: 13 },
          success: {
            text: t('희미하지만 이름이 남는다. 편집자가 언젠가 다시 지우겠지만, 오늘은 아니다.', 'Faint, but the name stays. The editor will strike it again one day, but not today.'),
            effects: [{ kind: 'quest', id: 'q_first_draft', stage: 2 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('글씨가 줄 아래로 빨려 들어간다.', 'The writing sinks back under the line.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('초고를 덮는다', 'Close the draft'),
          intent: 'leave',
          success: { text: t('빈칸은 빈 채로 남는다.', 'The blank stays blank.') },
        },
      ],
    },
  },
}

export const D6_FIRST_DRAFT_DIALOGUES: DialogueDef[] = [EDITOR, MO, SAN, DRAFT]

export const D6_FIRST_DRAFT_NPCS: NpcDef[] = [
  { id: 'draft_editor_yeon', name: t('연', 'Yeon'), role: t('도시의 초고를 줄이는 편집자', 'Editor who trims the city’s first draft'), faction: 'grid', portrait: 'v2/npcs/draft_editor_yeon.webp' },
  { id: 'struck_resident_mo', name: t('모', 'Mo'), role: t('지워진 거리에 아직 사는 주민', 'A resident still living on a struck-out street'), faction: 'offgrid', portrait: 'v2/npcs/struck_resident_mo.webp' },
  { id: 'ink_peddler_san', name: t('산', 'San'), role: t('지운 자리에 쓸 잉크를 파는 행상', 'Peddler of ink dark enough to write over erasures'), faction: 'market', portrait: 'v2/npcs/ink_peddler_san.webp' },
]

export const D6_FIRST_DRAFT_QUESTS: QuestDef[] = [{
  id: 'q_first_draft',
  title: t('초고', 'The First Draft'),
  stages: [
    t('지워졌는데도 사람이 사는 거리를 찾는다.', 'Find a struck-out street that people still live on.'),
    t('그 거리를 초고에 되살린다.', 'Bring that street back into the draft.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('되살린 거리 끝에서 보스의 그림자가 먼저 표시된다.', 'From the end of the restored street, the boss’s shadow is marked first.') },
}]
