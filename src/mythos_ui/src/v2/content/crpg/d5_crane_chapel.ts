// Act 5 — The Crane Chapel (Dreaming Machines). One old crane AI, Deulbo, stopped feeding the crusher years ago and
// buries machines instead, under its boom, like a chapel. The crusher crew wants the backlog cleared tonight.
// q_crane_chapel: learn which machine is next for the crusher (1) → get it buried under the crane instead (2) →
// the graveyard's machines remember and slow the boss's own (weaken). Deulbo, foreman Pil, or Kai point the way;
// Sori the mourner machine trades salvage (card picker). At most 20 credits district-wide. Prop: the crane's hook.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_CRANE_CHAPEL: DistrictDef = {
  id: 'd5_crane_chapel',
  act: 5,
  name: t('크레인 예배당', 'The Crane Chapel'),
  image: 'v2/districts/d5_crane_chapel.webp',
  intro: t(
    '고철 묘역 한쪽, 녹슨 크레인 하나가 팔을 낮게 드리우고 있다. 그 아래 흙더미가 줄지어 있다. 크레인은 몇 년째 기계를 분쇄기에 넣지 않고, 이렇게 묻는다.\n분쇄반이 오늘 밤 밀린 물량을 치우러 온다. 그 전에 세 곳을 들를 수 있다.',
    'At one edge of the scrap graveyard, a rusted crane hangs its arm low. Beneath it, mounds of earth in rows. For years the crane has not fed machines to the crusher. It buries them, like this.\nThe crusher crew comes tonight to clear the backlog. There is time for three stops first.',
  ),
  actions: 3,
  outro: t(
    '분쇄기의 시동 소리가 묘역을 울린다. 크레인의 갈고리가 아주 천천히, 한 번 내려간다.',
    'The crusher’s engine shakes the graveyard. The crane’s hook lowers, very slowly, once.',
  ),
  pois: [
    { id: 'deulbo', name: t('크레인 운전석', 'The Crane Cab'), blurb: t('분쇄 대신 매장.', 'Burial instead of crushing.'), dialogue: 'd5cc_deulbo' },
    { id: 'pil', name: t('분쇄반 천막', 'The Crusher Crew’s Tent'), blurb: t('밀린 물량이 많다.', 'A big backlog.'), dialogue: 'd5cc_pil' },
    { id: 'sori', name: t('곡하는 기계', 'The Mourning Machine'), blurb: t('흙더미마다 운다.', 'Weeps at every mound.'), dialogue: 'd5cc_sori' },
    { id: 'line', name: t('분쇄 대기열', 'The Crusher Queue'), blurb: t('다음 차례가 눈을 감고 있다.', 'The next in line has its eyes closed.'), dialogue: 'd5cc_line' },
  ],
}

const DEULBO: DialogueDef = {
  id: 'd5cc_deulbo',
  npc: 'crane_deulbo',
  start: 'cab',
  nodes: {
    cab: {
      speaker: 'crane_deulbo',
      text: t(
        '운전석 스피커에서 낮은 목소리가 난다. 크레인 자신이다. “들보라고 불러. 나는 들어 올리는 기계야. 들어 올린 것을 부수는 건 내 일이 아니라고, 어느 날 정했어.”',
        'A low voice comes from the cab speaker: the crane itself. “Call me Deulbo. I am a lifting machine. One day I decided that breaking what I lift is not my job.”',
      ),
      options: [
        {
          label: t('오늘 밤 분쇄 차례가 누구인지 묻는다', 'Ask who is next for the crusher tonight'),
          intent: 'ask',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('들보의 갈고리가 대기열 맨 앞을 가리킨다. 눈을 감은 작은 간호 로봇. “저 애는 꿈을 끝까지 꾸고 싶어 해.”', 'Deulbo’s hook points to the front of the queue: a small nursing robot with its eyes shut. “That one wants to finish its dream.”'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 1 }],
          },
          failure: {
            text: t('갈고리가 크게 흔들린다. 분쇄반 천막에서 누군가 고개를 내민다.', 'The hook swings wide. Someone pokes their head out of the crusher crew’s tent.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('카이가 크레인과 이야기하게 한다', 'Let Kai talk to the crane'),
          intent: 'ask',
          requires: { companion: 'kai' },
          approval: { kai: 2 },
          success: {
            text: t('카이가 운전석 계단에 앉는다. 들보가 오래 말한다. 카이가 일어나며 대기열 맨 앞을 본다. “다음은 저 아이래.”', 'Kai sits on the cab steps. Deulbo talks for a long time. Standing, Kai looks to the front of the queue. “That one’s next, it says.”'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 1 }, { kind: 'flag', key: 'cc_kai' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('운전석을 떠난다', 'Leave the cab'),
          intent: 'leave',
          success: { text: t('갈고리가 바람에 흔들린다.', 'The hook sways in the wind.') },
        },
      ],
    },
  },
}

const PIL: DialogueDef = {
  id: 'd5cc_pil',
  npc: 'crusher_foreman_pil',
  start: 'tent',
  nodes: {
    tent: {
      speaker: 'crusher_foreman_pil',
      text: t(
        '필 반장이 작업 지시서를 접었다 편다. “저 크레인 때문에 석 달치가 밀렸어요. 오늘은 다 넣어야 해요. 위에서 숫자를 봐요.” 그가 크레인 쪽을 흘끗 본다. “…나쁜 놈은 아닌데.”',
        'Foreman Pil folds and unfolds a work order. “Three months’ backlog because of that crane. It all goes in tonight. Upstairs watches the numbers.” He glances at the crane. “…It’s not a bad sort.”',
      ),
      options: [
        {
          label: t('“한 대쯤 장부에서 빠져도 숫자는 맞잖아요.”', '“One fewer in the ledger still adds up.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { se_rin: 1 },
          success: {
            text: t('필이 볼펜으로 한 줄을 긋는다. “부품 회수로 처리하죠. 대신 크레인이 직접 옮겨요.”', 'Pil strikes one line with his pen. “I’ll log it as parts recovery. The crane moves it itself, though.”'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 1 }, { kind: 'flag', key: 'cc_ledger' }],
          },
          failure: {
            text: t('“숫자는 숫자예요.” 필이 무전기를 든다. 분쇄기 예열 소리가 커진다.', '“Numbers are numbers.” Pil lifts his radio. The crusher’s warm-up grows louder.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('분쇄반 일을 거든다', 'Help the crew for a shift'),
          intent: 'offer',
          success: {
            text: t('부품을 분류한다. 부수지 않고 떼어 내는 일만. 필이 품삯을 준다.', 'You sort parts, only the ones taken off rather than crushed. Pil pays you.'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('천막을 나온다', 'Leave the tent'),
          intent: 'leave',
          success: { text: t('지시서가 다시 접힌다.', 'The work order is folded again.') },
        },
      ],
    },
  },
}

const SORI: DialogueDef = {
  id: 'd5cc_sori',
  npc: 'mourner_sori',
  start: 'mound',
  nodes: {
    mound: {
      speaker: 'mourner_sori',
      text: t(
        '스피커가 금 간 기계 하나가 흙더미마다 멈춰 짧은 소리를 낸다. 곡소리다. “묻힌 애들 부품, 내가 하나씩 갖고 있어. 기억하려고. 필요하면 가져가. 대신 이름은 불러 줘.”',
        'A machine with a cracked speaker stops at each mound and makes a short sound: a keening. “I keep one part from each one buried here, to remember. Take one if you need it. Say its name, though.”',
      ),
      options: [
        {
          label: t('부품 하나를 받고 이름을 불러 준다', 'Take a part and say its name'),
          intent: 'ask',
          success: {
            text: t('소리가 부품 셋을 내민다. 각각 이름이 긁혀 있다. 하나를 고르고, 그 이름을 소리 내어 읽는다.', 'Sori holds out three parts, each with a name scratched in. You choose one and read its name aloud.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('함께 곡을 한다', 'Keen with it'),
          intent: 'offer',
          approval: { kai: 1 },
          success: {
            text: t('당신의 목소리가 금 간 스피커 소리에 겹친다. 소리가 조용해진다. “고마워. 혼자 하면 길어.”', 'Your voice joins the cracked speaker. Sori quiets. “Thank you. Alone, it takes long.”'),
            effects: [{ kind: 'trace', amount: -4 }, { kind: 'hp', amount: 4 }],
          },
        },
        {
          label: t('흙더미를 지나친다', 'Pass the mounds'),
          intent: 'leave',
          success: { text: t('곡소리가 다음 흙더미로 옮겨 간다.', 'The keening moves to the next mound.') },
        },
      ],
    },
  },
}

const LINE: DialogueDef = {
  id: 'd5cc_line',
  start: 'queue',
  nodes: {
    queue: {
      text: t(
        '분쇄 대기열 맨 앞, 작은 간호 로봇이 눈을 감고 있다. 손에 아직 체온계를 쥐고 있다. 꿈을 꾸는 중이다. 분쇄기 컨베이어가 한 칸 다가온다.',
        'At the front of the crusher queue, a small nursing robot sits with its eyes shut, a thermometer still in its hand. It is dreaming. The crusher’s conveyor creeps one notch closer.',
      ),
      options: [
        {
          label: t('필의 장부대로 크레인에 넘긴다', 'Hand it to the crane, as Pil logged it'),
          intent: 'offer',
          requires: { flag: 'cc_ledger', quest: { id: 'q_crane_chapel', stage: 1 } },
          success: {
            text: t('들보의 갈고리가 간호 로봇을 조심스럽게 들어 올린다. 새 흙더미가 하나 생긴다. 묘역의 기계들이 감은 눈 아래로 불빛을 한 번 깜빡인다.', 'Deulbo’s hook lifts the nursing robot gently. A new mound appears. Across the graveyard, machines blink their lights once behind closed eyes.'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 2 }],
          },
        },
        {
          label: t('카이와 함께 로봇을 크레인 아래로 옮긴다', 'Carry it under the crane with Kai'),
          intent: 'offer',
          requires: { flag: 'cc_kai', quest: { id: 'q_crane_chapel', stage: 1 } },
          approval: { kai: 1 },
          success: {
            text: t('카이가 로봇의 체온계를 쥔 손을 감싼다. 들보가 흙을 덮는다. 카이가 낮게 말한다. “꿈 끝까지 꿔.”', 'Kai folds the robot’s hand around its thermometer. Deulbo covers it with earth. Kai says quietly, “Dream it to the end.”'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('컨베이어에서 끌어 내린다', 'Drag it off the conveyor'),
          intent: 'fight',
          requires: { quest: { id: 'q_crane_chapel', stage: 1 } },
          check: { stat: 'str', dc: 13 },
          success: {
            text: t('로봇이 컨베이어에서 미끄러져 나온다. 들보가 받는다. 분쇄반 경보가 울린다.', 'The robot slides off the conveyor. Deulbo catches it. The crusher crew’s alarm sounds.'),
            effects: [{ kind: 'quest', id: 'q_crane_chapel', stage: 2 }, { kind: 'trace', amount: 7 }],
          },
          failure: {
            text: t('컨베이어가 손을 끌고 간다. 겨우 빼낸다.', 'The conveyor drags at your hand. You barely pull free.'),
            effects: [{ kind: 'hp', amount: -5 }],
          },
        },
        {
          label: t('대기열을 떠난다', 'Leave the queue'),
          intent: 'leave',
          success: { text: t('컨베이어가 한 칸 더 간다.', 'The conveyor moves one notch more.') },
        },
      ],
    },
  },
}

export const D5_CRANE_CHAPEL_DIALOGUES: DialogueDef[] = [DEULBO, PIL, SORI, LINE]

export const D5_CRANE_CHAPEL_NPCS: NpcDef[] = [
  { id: 'crane_deulbo', name: t('들보', 'Deulbo'), role: t('분쇄 대신 매장을 택한 크레인 AI', 'A crane AI that chose burial over crushing'), faction: 'offgrid', portrait: 'v2/npcs/crane_deulbo.webp' },
  { id: 'crusher_foreman_pil', name: t('필 반장', 'Foreman Pil'), role: t('밀린 분쇄 물량에 쫓기는 분쇄반 반장', 'Crusher-crew foreman chased by a backlog'), faction: 'grid', portrait: 'v2/npcs/crusher_foreman_pil.webp' },
  { id: 'mourner_sori', name: t('소리', 'Sori'), role: t('묻힌 기계마다 곡을 하는 기계', 'A machine that keens for each one buried'), faction: 'offgrid', portrait: 'v2/npcs/mourner_sori.webp' },
]

export const D5_CRANE_CHAPEL_QUESTS: QuestDef[] = [{
  id: 'q_crane_chapel',
  title: t('크레인 예배당', 'The Crane Chapel'),
  stages: [
    t('오늘 밤 분쇄 차례가 누구인지 알아낸다.', 'Find out who is next for the crusher tonight.'),
    t('그 기계를 크레인 아래에 묻게 한다.', 'Get that machine buried under the crane instead.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('묻힌 동료를 기억하는 기계들이 보스의 기계들을 한 박자씩 붙잡는다.', 'Machines remembering a buried friend hold the boss’s machines back a beat at a time.') },
}]
