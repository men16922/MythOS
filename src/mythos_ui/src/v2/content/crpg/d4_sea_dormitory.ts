// Unwritten Sea, Act 4 — The Crew Dormitory (The Dry Harbor). The longshore crew still sleep in shifts in a dormitory
// by the dry wharf; tonight Customs means to condemn it as "housing for a non-operating port". q_sea_dorm: find what
// proves the port still operates (1) → get it onto the inspector's form before the condemnation notice (2) → the
// crew turns out for the boss fight as cover (cover). Cook Yeong, the night-shift sleeper Chul, or Mujin know; the
// shift locker room holds a card picker. At most 20 credits district-wide. Prop: the tide table on the mess wall.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_SEA_DORMITORY: DistrictDef = {
  id: 'd4_sea_dormitory',
  act: 4,
  route: 'sea_4',
  name: t('하역조 숙소', 'The Crew Dormitory'),
  image: 'v2/districts/d4_sea_dormitory.webp',
  intro: t(
    '마른 부두 옆, 하역조가 교대로 자는 숙소. 이층 침대마다 작업복이 걸려 있고, 식당 벽엔 누렇게 바랜 조석표가 붙어 있다. 문에 세관 공고문이 붙었다. “비가동 항만 부속 숙소, 금일 자정 폐쇄.”\n자정 전에 세 곳을 들를 수 있다.',
    'Beside the dry wharf, the dormitory where the longshore crew sleep in shifts. Work clothes hang on every bunk, and a yellowed tide table is pinned to the mess-hall wall. A customs notice is taped to the door: “Housing attached to a non-operating port. Closed as of midnight.”\nThere is time for three stops before midnight.',
  ),
  actions: 3,
  outro: t(
    '자정 종이 울린다. 숙소 불이 하나도 꺼지지 않는다.',
    'The midnight bell rings. Not one light in the dormitory goes out.',
  ),
  pois: [
    { id: 'mess', name: t('식당', 'The Mess Hall'), blurb: t('조석표가 붙은 벽.', 'The wall with the tide table.'), dialogue: 'd4sd_yeong' },
    { id: 'bunks', name: t('야간조 침상', 'The Night-Shift Bunks'), blurb: t('자다 깬 사람.', 'Someone woken mid-sleep.'), dialogue: 'd4sd_chul' },
    { id: 'lockers', name: t('교대 탈의실', 'The Shift Locker Room'), blurb: t('이름표 붙은 사물함.', 'Lockers with name tags.'), dialogue: 'd4sd_lockers' },
    { id: 'door', name: t('공고문 붙은 문', 'The Door With the Notice'), blurb: t('자정에 닫힌다.', 'It closes at midnight.'), dialogue: 'd4sd_door' },
  ],
}

const YEONG: DialogueDef = {
  id: 'd4sd_yeong',
  npc: 'mess_cook_yeong',
  start: 'mess',
  nodes: {
    mess: {
      speaker: 'mess_cook_yeong',
      text: t(
        '영 조리장이 국솥을 젓는다. 벽의 조석표를 국자로 가리킨다. “선임 할아버지가 매일 이걸 고쳐 적어요. 물이 없는데 밀물 썰물을요. 미쳤다고들 하지. 근데 그게 항만 운영 일지예요. 법적으로.”',
        'Cook Yeong stirs the soup pot and points the ladle at the tide table. “Our oldest hand updates this every day. Tides, with no water. People call it mad. But it’s the port’s operating log. Legally.”',
      ),
      options: [
        {
          label: t('조석표를 운영 증거로 쓸 수 있는지 묻는다', 'Ask if the tide table counts as proof of operation'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('영이 서랍에서 항만법 사본을 꺼낸다. 한 줄에 밑줄. “운영 일지가 매일 기록되는 항만은 비가동으로 보지 아니한다.”', 'Yeong takes a copy of the harbor act from a drawer. One line underlined. “A port whose operating log is kept daily shall not be deemed non-operating.”'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 1 }, { kind: 'flag', key: 'sea_sd_law' }],
          },
          failure: {
            text: t('국이 넘친다. 영이 행주를 던진다. “법은 나중에.”', 'The soup boils over. Yeong throws a cloth. “Law later.”'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('배식을 돕는다', 'Help serve'),
          intent: 'offer',
          approval: { mujin: 1 },
          success: {
            text: t('야간조 그릇 스무 개. 영이 남은 국을 한 그릇 더 떠 준다.', 'Twenty bowls for the night shift. Yeong ladles you an extra one.'),
            effects: [{ kind: 'hp', amount: 8 }],
          },
        },
        {
          label: t('식당을 나온다', 'Leave the mess'),
          intent: 'leave',
          success: { text: t('국솥이 계속 끓는다.', 'The pot keeps simmering.') },
        },
      ],
    },
  },
}

const CHUL: DialogueDef = {
  id: 'd4sd_chul',
  npc: 'night_shift_chul',
  start: 'bunk',
  nodes: {
    bunk: {
      speaker: 'night_shift_chul',
      text: t(
        '철이 이층 침대에서 몸을 일으킨다. 눈이 반쯤 감겨 있다. “폐쇄? 자정에? 난 자정에 일 나가는데. 그럼 일 나간 사이에 집이 없어지는 거네.”',
        'Chul sits up in a top bunk, eyes half shut. “Closed? At midnight? I go to work at midnight. So my home disappears while I’m on shift.”',
      ),
      options: [
        {
          label: t('지난 조석표를 어디 보관하는지 묻는다', 'Ask where the old tide tables are kept'),
          intent: 'ask',
          success: {
            text: t('“식당 벽에 붙은 건 오늘 거고, 지난 건 다 할아버지 사물함에.” 철이 다시 눕는다. “삼십 년치.”', '“Today’s is on the mess wall. The old ones are all in the old man’s locker.” Chul lies back down. “Thirty years’ worth.”'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 1 }],
          },
        },
        {
          label: t('무진에게 야간조를 깨우게 한다', 'Let Mujin wake the night shift'),
          intent: 'offer',
          requires: { companion: 'mujin' },
          approval: { mujin: 2 },
          success: {
            text: t('무진이 한마디 한다. “일어나.” 야간조 전원이 일어난다. 누군가 할아버지 사물함 열쇠를 꺼낸다.', 'Mujin says one word. “Up.” The whole night shift gets up. Someone produces the key to the old man’s locker.'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 1 }, { kind: 'flag', key: 'sea_sd_crew' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('철의 과로를 살펴 준다', 'Check Chul for exhaustion'),
          intent: 'offer',
          requires: { background: 'medic' },
          success: {
            text: t('맥을 짚고 물을 먹인다. 정신이 든 철이 말한다. “지난 조석표요? 할아버지 사물함에 삼십 년치.”', 'You take his pulse and get water into him. Clear-headed, Chul says, “The old tide tables? Thirty years of them in the old man’s locker.”'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 1 }],
          },
        },
        {
          label: t('철을 자게 둔다', 'Let Chul sleep'),
          intent: 'leave',
          success: { text: t('코 고는 소리가 이어진다.', 'The snoring resumes.') },
        },
      ],
    },
  },
}

const LOCKERS: DialogueDef = {
  id: 'd4sd_lockers',
  start: 'room',
  nodes: {
    room: {
      text: t(
        '교대 탈의실, 사물함마다 이름표가 붙어 있다. 떠난 사람 사물함에도 이름표가 그대로다. 한 칸은 문이 열려 있고, 안에 낡은 작업 수첩 몇 권이 보인다.',
        'The shift locker room. Every locker has a name tag, even those of people who left. One stands open, a few worn work notebooks inside.',
      ),
      options: [
        {
          label: t('작업 수첩을 넘겨 본다', 'Leaf through the work notebooks'),
          intent: 'ask',
          success: {
            text: t('하역 요령, 싸움 요령, 둘 다 손으로 적혀 있다. 셋 중 하나를 챙긴다.', 'Loading tips and fighting tips, both handwritten. You take one of three.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('떠난 사람 사물함을 정리해 준다', 'Tidy the lockers of those who left'),
          intent: 'offer',
          success: {
            text: t('먼지를 털고 이름표를 바로 붙인다. 사물함 하나에서 동전 몇 개가 굴러 나온다.', 'You dust them and straighten the name tags. A few coins roll out of one.'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('탈의실을 나온다', 'Leave the locker room'),
          intent: 'leave',
          success: { text: t('이름표들이 그대로 남는다.', 'The name tags stay where they are.') },
        },
      ],
    },
  },
}

const DOOR: DialogueDef = {
  id: 'd4sd_door',
  start: 'notice',
  nodes: {
    notice: {
      text: t(
        '공고문 아래 세관 검사관이 서류철을 들고 서 있다. “비가동 항만 확인서에 서명만 받으면 됩니다. 반대 증거가 없으면요.”',
        'A customs inspector stands under the notice with a folder. “I only need a signature on the non-operation certificate. Unless there’s evidence otherwise.”',
      ),
      options: [
        {
          label: t('항만법 조항과 오늘 조석표를 제출한다', 'Submit the harbor act clause and today’s tide table'),
          intent: 'persuade',
          requires: { flag: 'sea_sd_law', quest: { id: 'q_sea_dorm', stage: 1 } },
          success: {
            text: t('검사관이 조항을 두 번 읽는다. 조석표를 한 번 본다. 확인서에 “해당 없음”이라고 적는다. 공고문이 떼어진다.', 'The inspector reads the clause twice and the tide table once, then writes “not applicable” on the certificate. The notice comes down.'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 2 }, { kind: 'codex', id: 'lore_d_tide_table' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('야간조가 삼십 년치 조석표를 들고 나온다', 'The night shift carries out thirty years of tide tables'),
          intent: 'offer',
          requires: { flag: 'sea_sd_crew', quest: { id: 'q_sea_dorm', stage: 1 } },
          success: {
            text: t('상자가 하나씩 검사관 앞에 쌓인다. 검사관이 서류철을 닫는다. “…검토에 시간이 걸리겠군요. 몇 년.”', 'Box after box piles up in front of the inspector. The inspector closes the folder. “…Review will take some time. Years.”'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 2 }, { kind: 'codex', id: 'lore_d_tide_table' }],
          },
        },
        {
          label: t('“조석표가 운영 일지입니다.”라고 우긴다', 'Insist “The tide table is the operating log.”'),
          intent: 'persuade',
          requires: { quest: { id: 'q_sea_dorm', stage: 1 } },
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('검사관이 한숨을 쉬고 서명란을 비워 둔다. “상부에 문의하겠습니다.” 오늘 밤은 넘어간다.', 'The inspector sighs and leaves the signature box blank. “I’ll refer it upward.” Tonight passes.'),
            effects: [{ kind: 'quest', id: 'q_sea_dorm', stage: 2 }, { kind: 'codex', id: 'lore_d_tide_table' }, { kind: 'trace', amount: 5 }],
          },
          failure: {
            text: t('“증빙 없는 주장은 기록하지 않습니다.” 검사관이 당신 이름을 묻는다.', '“Unsupported claims are not recorded.” The inspector asks your name.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('문을 떠난다', 'Leave the door'),
          intent: 'leave',
          success: { text: t('공고문이 바람에 펄럭인다.', 'The notice flaps in the wind.') },
        },
      ],
    },
  },
}

export const D4_SEA_DORMITORY_DIALOGUES: DialogueDef[] = [YEONG, CHUL, LOCKERS, DOOR]

export const D4_SEA_DORMITORY_NPCS: NpcDef[] = [
  { id: 'mess_cook_yeong', name: t('영 조리장', 'Cook Yeong'), role: t('하역조 숙소 식당의 조리장', 'Cook of the longshore dormitory mess'), faction: 'offgrid', portrait: 'v2/npcs/mess_cook_yeong.webp' },
  { id: 'night_shift_chul', name: t('철', 'Chul'), role: t('자정에 일 나가는 야간조 하역꾼', 'Night-shift longshoreman who goes to work at midnight'), faction: 'offgrid', portrait: 'v2/npcs/night_shift_chul.webp' },
]

export const D4_SEA_DORMITORY_QUESTS: QuestDef[] = [{
  id: 'q_sea_dorm',
  title: t('하역조 숙소', 'The Crew Dormitory'),
  stages: [
    t('항만이 아직 운영 중이라는 증거를 찾는다.', 'Find proof the port still operates.'),
    t('자정 전에 폐쇄를 막는다.', 'Stop the closure before midnight.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('숙소를 지킨 하역조가 보스전에 컨테이너를 밀어 와 엄폐물로 세운다.', 'The crew whose dormitory you saved push containers into the boss fight as cover.') },
}]
