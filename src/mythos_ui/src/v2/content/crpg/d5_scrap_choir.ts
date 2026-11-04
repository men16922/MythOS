// Act 5 — The Scrap Choir (Dreaming Machines). Discarded machines in the graveyard hum one shared dream as a song that
// never reaches its last bar. q_scrap_choir: find the tuning frequency (1) → let the choir finish (2) → the boss's
// machines falter (weaken). Dal (tuner) or Kai gives the frequency; Pip wants to sing too; Bok trades parts.
// One card picker at Bok; at most 30 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_SCRAP_CHOIR: DistrictDef = {
  id: 'd5_scrap_choir',
  act: 5,
  name: t('고철 성가대', 'The Scrap Choir'),
  image: 'v2/districts/d5_scrap_choir.webp',
  intro: t(
    '고철 묘역 한가운데, 버려진 기계들이 둥글게 모여 앉아 있다. 스피커마다 같은 노래가 새어 나온다. 마지막 마디에서 늘 끊긴다. 그리고 처음부터 다시.\n수거 크레인이 다음 순회를 돌기 전, 세 곳을 들를 수 있다.',
    'In the middle of the scrap graveyard, discarded machines sit in a circle. The same song leaks from every speaker. It always breaks off at the last bar, and starts again.\nThere is time for three stops before the collection crane comes round.',
  ),
  actions: 3,
  outro: t(
    '크레인 그림자가 묘역을 훑고 지나간다. 노래가 잠깐 멈췄다가, 이번엔 한 마디 더 간다.',
    'The crane’s shadow sweeps the graveyard. The song stops for a moment, then goes one bar further.',
  ),
  pois: [
    { id: 'tuner', name: t('조율대', 'The Tuning Post'), blurb: t('음이 맞지 않는 곳을 아는 손.', 'Hands that know where the pitch slips.'), dialogue: 'd5sc_tuner' },
    { id: 'pip', name: t('작은 드론', 'The Little Drone'), blurb: t('노래에 끼고 싶어 한다.', 'Wants in on the song.'), dialogue: 'd5sc_pip' },
    { id: 'bok', name: t('부품 좌판', 'The Parts Stall'), blurb: t('죽은 기계에서 산 부품을.', 'Live parts from dead machines.'), dialogue: 'd5sc_bok' },
    { id: 'choir', name: t('성가대의 원', 'The Choir Circle'), blurb: t('마지막 마디가 비어 있다.', 'The last bar is empty.'), dialogue: 'd5sc_choir' },
  ],
}

const TUNER: DialogueDef = {
  id: 'd5sc_tuner',
  npc: 'choir_tuner_dal',
  start: 'post',
  nodes: {
    post: {
      speaker: 'choir_tuner_dal',
      text: t(
        '달이 녹슨 소리굽쇠를 기계마다 대 본다. “다들 같은 꿈을 꾸는데 음이 조금씩 달라요. 그래서 끝까지 못 가요. 기준음 하나만 있으면 되는데.”',
        'Dal touches a rusted tuning fork to each machine. “They all dream the same dream, but each a little off pitch. So they never reach the end. One reference note would do it.”',
      ),
      options: [
        {
          label: t('기준음을 같이 찾는다', 'Help find the reference note'),
          intent: 'ask',
          check: { stat: 'int', dc: 13 },
          assist: 'kai',
          success: {
            text: t('가장 오래된 기계의 낮은 웅웅거림. 달이 소리굽쇠를 그 음에 맞춘다. “이거예요.”', 'The low hum of the oldest machine. Dal sets the fork to it. “That’s the one.”'),
            effects: [{ kind: 'quest', id: 'q_scrap_choir', stage: 1 }],
          },
          failure: {
            text: t('잘못 짚은 음에 기계 몇 대가 경보음을 낸다. 크레인 쪽 불빛이 이쪽을 향한다.', 'A wrong note sets off alarms in a few machines. The crane’s light turns this way.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('카이에게 꿈속 노래를 불러 보게 한다', 'Ask Kai to hum the song from his dream'),
          intent: 'offer',
          requires: { companion: 'kai' },
          approval: { kai: 2 },
          success: {
            text: t('카이의 스피커에서 나온 첫 음에 기계들이 일제히 고개를 든다. 달이 받아 적는다.', 'At Kai’s first note the machines lift their heads together. Dal writes it down.'),
            effects: [{ kind: 'quest', id: 'q_scrap_choir', stage: 1 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('달의 귀를 살펴 준다', 'Examine Dal’s ears'),
          intent: 'offer',
          requires: { background: 'medic' },
          success: {
            text: t('오래 소리굽쇠를 대 온 귀가 한쪽만 먹먹하다. 처치하자 달이 놓치던 낮은 음이 들린다. “이거였네요.”', 'Years of tuning forks have dulled one ear. After you treat it, Dal hears the low note that kept slipping by. “That’s the one.”'),
            effects: [{ kind: 'quest', id: 'q_scrap_choir', stage: 1 }],
          },
        },
        {
          label: t('조율대를 떠난다', 'Leave the post'),
          intent: 'leave',
          success: { text: t('소리굽쇠가 다음 기계에 닿는다.', 'The fork touches the next machine.') },
        },
      ],
    },
  },
}

const PIP: DialogueDef = {
  id: 'd5sc_pip',
  npc: 'small_drone_pip',
  start: 'hover',
  nodes: {
    hover: {
      speaker: 'small_drone_pip',
      text: t(
        '프로펠러 하나가 부러진 작은 드론이 당신 어깨 높이에서 흔들린다. “저도 부르고 싶어요. 근데 제 스피커는 삑 소리밖에 안 나요.”',
        'A little drone with one broken propeller wobbles at your shoulder. “I want to sing too. But my speaker only beeps.”',
      ),
      options: [
        {
          label: t('삑 소리도 박자라고 말해 준다', 'Tell it a beep is a beat too'),
          intent: 'persuade',
          approval: { kai: 1, se_rin: 1 },
          success: {
            text: t('핍이 원 쪽으로 날아간다. 마지막 마디 자리에 삑, 하고 박자를 놓는다.', 'Pip flies to the circle and drops a beep where the last bar should be.'),
            effects: [{ kind: 'flag', key: 'sc_pip' }],
          },
        },
        {
          label: t('부러진 프로펠러를 고쳐 준다', 'Fix the broken propeller'),
          intent: 'offer',
          check: { stat: 'agi', dc: 12 },
          success: {
            text: t('핍이 처음으로 똑바로 난다. 고맙다며 작은 배터리 하나를 떨어뜨린다.', 'Pip flies straight for the first time and drops a small battery in thanks.'),
            effects: [{ kind: 'consumable' }, { kind: 'flag', key: 'sc_pip' }],
          },
          failure: {
            text: t('날개가 손가락을 스친다. 핍이 미안하다고 삑삑거린다.', 'A blade nicks your finger. Pip beeps an apology.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('드론을 지나친다', 'Move on'),
          intent: 'leave',
          success: { text: t('핍이 원 바깥을 맴돈다.', 'Pip circles outside the ring.') },
        },
      ],
    },
  },
}

const BOK: DialogueDef = {
  id: 'd5sc_bok',
  npc: 'parts_dealer_bok',
  start: 'stall',
  nodes: {
    stall: {
      speaker: 'parts_dealer_bok',
      text: t(
        '복 할머니가 기계 팔 하나를 무릎에 놓고 나사를 푼다. “죽은 기계는 없어. 쉬는 기계가 있지. 쉬는 동안 부품 좀 빌리는 거고.”',
        'Granny Bok has a machine arm across her knees, unscrewing it. “There are no dead machines. Only resting ones. I borrow a few parts while they rest.”',
      ),
      options: [
        {
          label: t('쓸 만한 부품을 고른다', 'Pick out a useful part'),
          intent: 'ask',
          success: {
            text: t('복이 기름때 묻은 회로판 셋을 늘어놓는다. “하나만. 나머진 돌려줘야 해.”', 'Bok lays out three greasy circuit boards. “One. The rest go back.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('부품 정리를 돕고 품삯을 받는다', 'Help sort parts for a wage'),
          intent: 'offer',
          success: {
            text: t('나사를 종류별로 나눈다. 복이 동전 한 줌을 쥐여 준다.', 'You sort the screws by kind. Bok presses a handful of coins on you.'),
            effects: [{ kind: 'credits', amount: 25 }],
          },
        },
        {
          label: t('좌판을 지나친다', 'Pass the stall'),
          intent: 'leave',
          success: { text: t('복이 다음 나사를 푼다.', 'Bok starts on the next screw.') },
        },
      ],
    },
  },
}

const CHOIR: DialogueDef = {
  id: 'd5sc_choir',
  start: 'circle',
  nodes: {
    circle: {
      text: t(
        '원의 한가운데에 서면 노래가 사방에서 들린다. 마지막 마디 직전에서 모든 스피커가 숨을 고른다. 거기서 늘 멈춘다.',
        'Stand in the middle of the circle and the song comes from everywhere. Just before the last bar, every speaker takes a breath. That is where it always stops.',
      ),
      options: [
        {
          label: t('기준음을 원 한가운데에 울린다', 'Sound the reference note in the middle'),
          intent: 'offer',
          approval: { rem: 1 },
          requires: { quest: { id: 'q_scrap_choir', stage: 1 } },
          success: {
            text: t('기계들이 한 음으로 모인다. 마지막 마디가 처음으로 끝난다. 묘역 저편 보스 구역의 기계들까지 잠깐 멈춰 듣는다.', 'The machines gather on one note. The last bar ends for the first time. Even the machines in the boss’s sector stop for a moment to listen.'),
            effects: [{ kind: 'quest', id: 'q_scrap_choir', stage: 2 }, { kind: 'codex', id: 'lore_d_off_pitch' }],
          },
        },
        {
          label: t('핍의 박자에 맞춰 마지막 마디를 부른다', 'Sing the last bar on Pip’s beat'),
          intent: 'offer',
          requires: { flag: 'sc_pip', quest: { id: 'q_scrap_choir', stage: 1 } },
          approval: { kai: 1 },
          success: {
            text: t('삑, 하는 박자 위에 노래가 끝난다. 핍이 원 위를 한 바퀴 돈다.', 'The song ends on a beep. Pip loops once above the circle.'),
            effects: [{ kind: 'quest', id: 'q_scrap_choir', stage: 2 }, { kind: 'codex', id: 'lore_d_off_pitch' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('원 밖으로 나온다', 'Step out of the circle'),
          intent: 'leave',
          success: { text: t('노래가 다시 처음으로 돌아간다.', 'The song goes back to the start.') },
        },
      ],
    },
  },
}

export const D5_SCRAP_CHOIR_DIALOGUES: DialogueDef[] = [TUNER, PIP, BOK, CHOIR]

export const D5_SCRAP_CHOIR_NPCS: NpcDef[] = [
  { id: 'choir_tuner_dal', name: t('달', 'Dal'), role: t('버려진 기계들의 음을 맞추는 조율사', 'Tuner who sets the pitch of discarded machines'), faction: 'offgrid', portrait: 'v2/npcs/choir_tuner_dal.webp' },
  { id: 'small_drone_pip', name: t('핍', 'Pip'), role: t('노래에 끼고 싶은 작은 드론', 'A little drone that wants to sing'), faction: 'offgrid', portrait: 'v2/npcs/small_drone_pip.webp' },
  { id: 'parts_dealer_bok', name: t('복 할머니', 'Granny Bok'), role: t('쉬는 기계에게서 부품을 빌리는 상인', 'Dealer who borrows parts from resting machines'), faction: 'market', portrait: 'v2/npcs/parts_dealer_bok.webp' },
]

export const D5_SCRAP_CHOIR_QUESTS: QuestDef[] = [{
  id: 'q_scrap_choir',
  title: t('고철 성가대', 'The Scrap Choir'),
  stages: [
    t('기계들이 함께 부를 기준음을 찾는다.', 'Find a reference note the machines can sing together.'),
    t('성가대가 마지막 마디를 끝까지 부르게 한다.', 'Let the choir sing the last bar to the end.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('노래를 들은 보스 구역의 기계들이 한 박자 늦게 움직인다.', 'The machines in the boss’s sector, having heard the song, move a beat late.') },
}]
