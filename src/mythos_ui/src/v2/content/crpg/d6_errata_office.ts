// Act 6 — The Errata Office (The First Record). Every mistake found in the first record is logged in a list of
// errata, to be corrected at the next edit. One entry is a typo that became a person: Oja, who exists only because a
// letter slipped. q_errata: find Oja's entry in the list (1) → mark it "stet: let it stand" (2) → the first record
// keeps one deliberate flaw the boss cannot read past (marked). Proofreader Jeong, the comma-shaped machine Swim, or
// Io help; Oja trades. One card picker at Oja; at most 20 credits district-wide. Prop: the proof marks.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_ERRATA_OFFICE: DistrictDef = {
  id: 'd6_errata_office',
  act: 6,
  name: t('정오표실', 'The Errata Office'),
  image: 'v2/districts/d6_errata_office.webp',
  intro: t(
    '최초 기록 한켠에 좁은 사무실이 있다. 벽마다 정오표가 붙어 있다. 틀린 곳, 바른 곳, 고칠 날짜. 다음 개정 때 이 목록의 모든 줄이 고쳐진다.\n목록 중간에 사람 하나가 서 있다. 오자에서 생겨난 사람이다.\n교정 종이 울리기 전, 세 곳을 들를 수 있다.',
    'In a corner of the first record is a narrow office. Every wall is pinned with errata: where it is wrong, what is right, the date to fix it. At the next revision every line on the list gets corrected.\nIn the middle of the list stands a person, born of a typo.\nThere is time for three stops before the proof bell rings.',
  ),
  actions: 3,
  outro: t(
    '교정 종이 울린다. 정오표 한 줄 옆에 작은 교정 부호가 남는다. “그대로 둘 것.”',
    'The proof bell rings. Beside one line of the errata a small proof mark remains: “let it stand.”',
  ),
  pois: [
    { id: 'jeong', name: t('교정 책상', 'The Proof Desk'), blurb: t('빨간 펜과 정오표.', 'A red pen and the errata.'), dialogue: 'd6eo_jeong' },
    { id: 'swim', name: t('쉼표 기계', 'The Comma Machine'), blurb: t('문장 사이에서 쉰다.', 'Rests between sentences.'), dialogue: 'd6eo_swim' },
    { id: 'oja', name: t('오자', 'Oja'), blurb: t('틀린 글자로 태어났다.', 'Born of a wrong letter.'), dialogue: 'd6eo_oja' },
    { id: 'list', name: t('정오표 벽', 'The Errata Wall'), blurb: t('고칠 줄의 목록.', 'The list of lines to fix.'), dialogue: 'd6eo_list' },
  ],
}

const JEONG: DialogueDef = {
  id: 'd6eo_jeong',
  npc: 'proofreader_jeong',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'proofreader_jeong',
      text: t(
        '정 교정자가 돋보기를 내려놓는다. “정오표에 오른 줄은 다음 개정 때 모두 바르게 됩니다. 예외는 하나뿐이에요. 교정자가 ‘그대로 둘 것’이라고 표시한 줄.”',
        'Proofreader Jeong sets down the magnifier. “Every line on the errata becomes correct at the next revision. With one exception: a line the proofreader marks ‘stet’, let it stand.”',
      ),
      options: [
        {
          label: t('오자의 줄이 어디 있는지 묻는다', 'Ask where Oja’s line is'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('정이 정오표 셋째 장을 짚는다. “틀린 곳: ‘오자’. 바른 곳: 공란. 고칠 날짜: 다음 개정.” 공란은 삭제라는 뜻이다.', 'Jeong points to the third page. “Wrong: ‘Oja’. Right: blank. Fix by: next revision.” Blank means deletion.'),
            effects: [{ kind: 'quest', id: 'q_errata', stage: 1 }],
          },
          failure: {
            text: t('정오표가 너무 길다. 찾는 사이 교정 종이 한 번 울린다.', 'The errata are too long. While you search, the proof bell rings once.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('‘그대로 둘 것’ 부호 쓰는 법을 배운다', 'Learn how to write the ‘stet’ mark'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { io: 1 },
          success: {
            text: t('정이 망설이다 빨간 펜으로 부호를 그려 보인다. 점 세 개와 짧은 선. “제가 가르쳐 준 건 아닙니다.”', 'Jeong hesitates, then draws the mark in red: three dots and a short line. “I did not teach you this.”'),
            effects: [{ kind: 'flag', key: 'eo_stet' }],
          },
          failure: {
            text: t('“교정 부호는 교정자의 것입니다.” 정이 펜 뚜껑을 닫는다.', '“Proof marks belong to proofreaders.” Jeong caps the pen.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('책상을 떠난다', 'Leave the desk'),
          intent: 'leave',
          success: { text: t('돋보기가 다음 줄로 옮겨 간다.', 'The magnifier moves to the next line.') },
        },
      ],
    },
  },
}

const SWIM: DialogueDef = {
  id: 'd6eo_swim',
  npc: 'comma_swim',
  start: 'pause',
  nodes: {
    pause: {
      speaker: 'comma_swim',
      text: t(
        '쉼표 모양의 작은 기계가 문장과 문장 사이에 끼어 쉬고 있다. “나는 숨 쉴 자리. 내가 빠지면 문장이 숨이 막혀. 오자도 그래. 빠지면 그 줄 전체가 숨이 막혀.”',
        'A small comma-shaped machine rests wedged between two sentences. “I am a place to breathe. Take me out and a sentence chokes. Oja too. Take Oja out and the whole line chokes.”',
      ),
      options: [
        {
          label: t('오자가 빠지면 무엇이 무너지는지 묻는다', 'Ask what collapses if Oja is removed'),
          intent: 'ask',
          success: {
            text: t('쉼표가 정오표 셋째 장 쪽으로 몸을 기울인다. “그 줄 뒤에 열두 줄이 기대 있어. 다 같이 고쳐질 거야.”', 'Swim leans toward the third page. “Twelve lines lean on that one. They’d all get fixed with it.”'),
            effects: [{ kind: 'quest', id: 'q_errata', stage: 1 }],
          },
        },
        {
          label: t('이오에게 문장 구조를 읽게 한다', 'Let Io read the sentence structure'),
          intent: 'ask',
          requires: { companion: 'io' },
          approval: { io: 2 },
          success: {
            text: t('이오가 문장 사이를 손가락으로 짚는다. “쉼표 말이 맞아. 그 오자는 하중을 받치고 있어. 정오표에서 지우면 안 돼.”', 'Io runs a finger between the sentences. “The comma’s right. That typo is load-bearing. It can’t come off the errata.”'),
            effects: [{ kind: 'quest', id: 'q_errata', stage: 1 }, { kind: 'flag', key: 'eo_stet' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('쉼표를 쉬게 둔다', 'Let the comma rest'),
          intent: 'leave',
          success: { text: t('쉼표가 문장 사이에서 숨을 쉰다.', 'The comma breathes between sentences.') },
        },
      ],
    },
  },
}

const OJA: DialogueDef = {
  id: 'd6eo_oja',
  npc: 'typo_oja',
  start: 'meet',
  nodes: {
    meet: {
      speaker: 'typo_oja',
      text: t(
        '정오표 벽 앞에 사람 하나가 서 있다. 윤곽이 조금 어긋나 있다. 글자 하나가 미끄러진 것처럼. “난 원래 ‘오자’가 아니라 다른 말이었어야 했대. 근데 난 여기 있잖아. 다음 개정이면 없어지겠지만.”',
        'A person stands before the errata wall, outline slightly off, like a letter that slipped. “I was supposed to be some other word, not ‘Oja’. But here I am. Until the next revision, anyway.”',
      ),
      options: [
        {
          label: t('오자가 모은 것을 본다', 'Look at what Oja has collected'),
          intent: 'ask',
          success: {
            text: t('오자가 주머니에서 잘못 인쇄된 카드 셋을 꺼낸다. “틀린 것끼리는 잘 맞아. 하나 가져.”', 'Oja takes three misprinted cards from a pocket. “Mistakes fit each other. Take one.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('“틀려서 생긴 것도 있는 거야.”', '“Something born of a mistake still exists.”'),
          intent: 'persuade',
          approval: { se_rin: 1, kai: 1 },
          success: {
            text: t('오자가 어긋난 윤곽을 손으로 쓸어 본다. “그 말, 정오표에 적어 줄래?”', 'Oja runs a hand along the slipped outline. “Would you write that on the errata?”'),
            effects: [{ kind: 'hp', amount: 6 }],
          },
        },
        {
          label: t('오자를 지나친다', 'Walk past Oja'),
          intent: 'leave',
          success: { text: t('오자가 정오표의 자기 줄을 다시 읽는다.', 'Oja reads their own line on the errata again.') },
        },
      ],
    },
  },
}

const LIST: DialogueDef = {
  id: 'd6eo_list',
  start: 'wall',
  nodes: {
    wall: {
      text: t(
        '정오표 셋째 장. “틀린 곳: 오자. 바른 곳: 공란.” 그 옆 여백이 비어 있다. 교정 부호 하나가 들어갈 만큼.',
        'The third page of the errata. “Wrong: Oja. Right: blank.” The margin beside it is empty, just room for one proof mark.',
      ),
      options: [
        {
          label: t('‘그대로 둘 것’ 부호를 그린다', 'Draw the ‘stet’ mark'),
          intent: 'offer',
          requires: { flag: 'eo_stet', quest: { id: 'q_errata', stage: 1 } },
          success: {
            text: t('점 세 개와 짧은 선. 정오표의 그 줄이 고칠 목록에서 빠진다. 오자의 윤곽이 처음으로 또렷해진다.', 'Three dots and a short line. That line leaves the list to fix. For the first time, Oja’s outline is sharp.'),
            effects: [{ kind: 'quest', id: 'q_errata', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('‘바른 곳’ 칸에 ‘오자’라고 쓴다', 'Write ‘Oja’ in the ‘right’ column'),
          intent: 'offer',
          requires: { quest: { id: 'q_errata', stage: 1 } },
          check: { stat: 'agi', dc: 13 },
          success: {
            text: t('틀린 곳과 바른 곳이 같아진다. 고칠 것이 없는 줄이 된다. 교정 종이 한 번, 헛되이 울린다.', 'Wrong and right become the same. Nothing left to fix. The proof bell rings once, for nothing.'),
            effects: [{ kind: 'quest', id: 'q_errata', stage: 2 }, { kind: 'trace', amount: 5 }],
          },
          failure: {
            text: t('펜이 미끄러진다. 새 오자가 하나 생긴다. 이번엔 아무도 생겨나지 않는다.', 'The pen slips. A new typo appears. This time no one is born of it.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('정오표를 그대로 둔다', 'Leave the errata as they are'),
          intent: 'leave',
          success: { text: t('셋째 장이 다음 개정을 기다린다.', 'The third page waits for the next revision.') },
        },
      ],
    },
  },
}

export const D6_ERRATA_OFFICE_DIALOGUES: DialogueDef[] = [JEONG, SWIM, OJA, LIST]

export const D6_ERRATA_OFFICE_NPCS: NpcDef[] = [
  { id: 'proofreader_jeong', name: t('정 교정자', 'Proofreader Jeong'), role: t('최초 기록의 정오표를 관리하는 교정자', 'Proofreader who keeps the first record’s errata'), faction: 'grid', portrait: 'v2/npcs/proofreader_jeong.webp' },
  { id: 'comma_swim', name: t('쉼표', 'Swim'), role: t('문장 사이에서 쉬는 쉼표 모양의 기계', 'A comma-shaped machine that rests between sentences'), faction: 'offgrid', portrait: 'v2/npcs/comma_swim.webp' },
  { id: 'typo_oja', name: t('오자', 'Oja'), role: t('오자에서 생겨난 사람', 'A person born of a typo'), faction: 'offgrid', portrait: 'v2/npcs/typo_oja.webp' },
]

export const D6_ERRATA_OFFICE_QUESTS: QuestDef[] = [{
  id: 'q_errata',
  title: t('정오표실', 'The Errata Office'),
  stages: [
    t('정오표에서 오자의 줄을 찾는다.', 'Find Oja’s line in the errata.'),
    t('그 줄을 고칠 목록에서 빼낸다.', 'Take that line off the list of fixes.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('최초 기록에 일부러 남긴 오자 하나. 보스는 그 줄을 읽어 넘기지 못한다.', 'One typo left in the first record on purpose. The boss cannot read past that line.') },
}]
