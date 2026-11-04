// Act 6 — The Margin Notes (The First Record). Every loop's connector left something in the margins of the first
// record; the erasers are wiping them. q_margin: find a note in your own handwriting (1) → write one line for the
// next connector (2) → you know where the boss looks first (intel). Ha (scribe) or the echo of an earlier connector
// shows the note; Tol (eraser) can be talked out of one page. One card picker at the echo; at most 20 credits.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_MARGIN_NOTES: DistrictDef = {
  id: 'd6_margin_notes',
  act: 6,
  name: t('여백의 주석', 'The Margin Notes'),
  image: 'v2/districts/d6_margin_notes.webp',
  intro: t(
    '최초 접속 기록의 가장자리, 본문 밖 여백에 손글씨가 빽빽하다. 루프마다 누군가 무언가를 적고 갔다. 지우개를 든 아이가 줄을 하나씩 지운다.\n지우개가 이 쪽에 닿기 전, 세 곳을 들를 수 있다.',
    'At the edge of the first connector record, the margins outside the text are crowded with handwriting. Every loop, someone wrote something and left. A child with an eraser wipes the lines one by one.\nThere is time for three stops before the eraser reaches this page.',
  ),
  actions: 3,
  outro: t(
    '지우개가 다음 장으로 넘어간다. 여백 한 귀퉁이에 아직 마르지 않은 글씨가 남는다.',
    'The eraser moves on to the next page. In one corner of the margin, handwriting that is not yet dry remains.',
  ),
  pois: [
    { id: 'scribe', name: t('필사대', 'The Copying Desk'), blurb: t('여백까지 옮겨 적는 사람.', 'One who copies even the margins.'), dialogue: 'd6mn_scribe' },
    { id: 'echo', name: t('먼저 온 접속자', 'The One Who Came Before'), blurb: t('당신보다 한 루프 앞선 사람.', 'Someone one loop ahead of you.'), dialogue: 'd6mn_echo' },
    { id: 'eraser', name: t('지우개 든 아이', 'The Child With the Eraser'), blurb: t('지우는 게 일이다.', 'Erasing is the job.'), dialogue: 'd6mn_eraser' },
    { id: 'margin', name: t('빈 여백', 'The Blank Margin'), blurb: t('아직 한 줄이 들어갈 자리.', 'Room for one more line.'), dialogue: 'd6mn_margin' },
  ],
}

const SCRIBE: DialogueDef = {
  id: 'd6mn_scribe',
  npc: 'margin_scribe_ha',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'margin_scribe_ha',
      text: t(
        '하가 펜을 멈추지 않고 말한다. “본문은 IX가 썼습니다. 여백은 당신들이 썼고요. 저는 둘 다 옮깁니다. 지워지기 전에.”',
        'Ha speaks without lifting the pen. “IX wrote the text. You people wrote the margins. I copy both, before they are erased.”',
      ),
      options: [
        {
          label: t('“제 글씨도 있나요?”', '“Is my handwriting here?”'),
          intent: 'ask',
          check: { stat: 'obs', dc: 13 },
          success: {
            text: t('하가 한 줄을 짚는다. 당신 필체다. “다음엔 왼쪽 계단.” 당신은 그걸 쓴 기억이 없다.', 'Ha points to one line. Your handwriting. “Next time, the left stairs.” You have no memory of writing it.'),
            effects: [{ kind: 'quest', id: 'q_margin', stage: 1 }],
          },
          failure: {
            text: t('하가 고개를 젓는다. “찾는 동안 지우개가 두 장을 넘겼어요.”', 'Ha shakes his head. “While you looked, the eraser turned two pages.”'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('필사를 거든다', 'Help with the copying'),
          intent: 'offer',
          approval: { io: 1 },
          success: {
            text: t('한 장을 옮겨 적는다. 하가 사본 한 쪽을 찢어 건넨다. “보관료입니다.”', 'You copy one page. Ha tears off a corner of the copy and hands it over. “Your storage fee.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('필사대를 떠난다', 'Leave the desk'),
          intent: 'leave',
          success: { text: t('펜 소리가 계속된다.', 'The pen keeps going.') },
        },
      ],
    },
  },
}

const ECHO: DialogueDef = {
  id: 'd6mn_echo',
  npc: 'earlier_connector',
  start: 'meet',
  nodes: {
    meet: {
      speaker: 'earlier_connector',
      text: t(
        '당신과 같은 코트를 입은 사람이 여백에 기대 서 있다. 얼굴이 흐릿하다. “나도 여기까지 왔었어. 그 다음은 안 적혀 있지.”',
        'Someone in your coat leans against the margin, face blurred. “I got this far too. What came next isn’t written.”',
      ),
      options: [
        {
          label: t('그가 남긴 줄을 보여 달라고 한다', 'Ask to see the line they left'),
          intent: 'ask',
          success: {
            text: t('그가 한 줄을 가리킨다. 그 아래, 더 작은 글씨로 당신의 필체. 둘은 같은 손이다.', 'They point to a line. Below it, smaller, your handwriting. The two are the same hand.'),
            effects: [{ kind: 'quest', id: 'q_margin', stage: 1 }],
          },
        },
        {
          label: t('그가 쓰던 싸움법을 배운다', 'Learn how they used to fight'),
          intent: 'offer',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('그가 손짓으로 세 수를 보여 준다. 당신 손이 이미 아는 동작이다.', 'They show you three moves with their hands. Your hands already know them.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('동작이 겹친다. 누가 먼저였는지 헷갈린다.', 'The moves overlap. You lose track of whose came first.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('그를 그대로 둔다', 'Leave them be'),
          intent: 'leave',
          success: { text: t('그가 여백 속으로 조금 더 기댄다.', 'They lean a little further into the margin.') },
        },
      ],
    },
  },
}

const ERASER: DialogueDef = {
  id: 'd6mn_eraser',
  npc: 'eraser_child_tol',
  start: 'rub',
  nodes: {
    rub: {
      speaker: 'eraser_child_tol',
      text: t(
        '톨이 지우개를 쥔 손을 멈추지 않는다. “다 지워야 깨끗해져. 깨끗해야 다음 루프가 잘 써진대.”',
        'Tol never stops the eraser. “It all has to go so it’s clean. Clean pages write better next loop, they said.”',
      ),
      options: [
        {
          label: t('“한 장만 남겨 줄래?”', '“Could you leave just one page?”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { se_rin: 1 },
          success: {
            text: t('톨이 한 장을 건너뛴다. “이건 안 보인 걸로 할게.”', 'Tol skips a page. “I’ll pretend I didn’t see this one.”'),
            effects: [{ kind: 'flag', key: 'mn_page' }],
          },
          failure: {
            text: t('“규칙이야.” 톨이 더 세게 문지른다. 종이가 얇아진다.', '“Rules.” Tol rubs harder. The paper wears thin.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('지우개 가루를 털어 준다', 'Brush the eraser dust away for them'),
          intent: 'offer',
          success: {
            text: t('톨이 처음으로 손을 쉰다. “고마워. 근데 그래도 지워야 해.”', 'Tol rests for the first time. “Thanks. I still have to erase it, though.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('아이를 지나친다', 'Walk past'),
          intent: 'leave',
          success: { text: t('지우개 소리가 등 뒤로 멀어진다.', 'The sound of the eraser fades behind you.') },
        },
      ],
    },
  },
}

const MARGIN: DialogueDef = {
  id: 'd6mn_margin',
  start: 'blank',
  nodes: {
    blank: {
      text: t(
        '여백 끝, 아직 아무것도 적히지 않은 한 줄. 손에 펜이 있다. 다음 루프의 누군가가 이걸 읽을 것이다. 아니면 지워질 것이다.',
        'At the end of the margin, one line with nothing on it yet. There is a pen in your hand. Someone next loop will read this. Or it will be erased.',
      ),
      options: [
        {
          label: t('다음 접속자에게 보스가 먼저 보는 곳을 적는다', 'Write where the boss looks first, for the next connector'),
          intent: 'offer',
          requires: { quest: { id: 'q_margin', stage: 1 } },
          success: {
            text: t('적는 동안 알게 된다. 당신도 이 줄을 읽고 여기까지 왔다.', 'As you write, you realise: you read this line too, and that is how you got here.'),
            effects: [{ kind: 'quest', id: 'q_margin', stage: 2 }],
          },
        },
        {
          label: t('남겨 둔 쪽에 길게 적는다', 'Write at length on the page Tol skipped'),
          intent: 'offer',
          requires: { flag: 'mn_page', quest: { id: 'q_margin', stage: 1 } },
          success: {
            text: t('지워지지 않을 쪽에 한 문단을 남긴다. 다음 루프는 조금 더 빨리 여기에 닿을 것이다.', 'You leave a whole paragraph on the page that will not be erased. Next loop will get here a little sooner.'),
            effects: [{ kind: 'quest', id: 'q_margin', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('펜을 내려놓는다', 'Put the pen down'),
          intent: 'leave',
          success: { text: t('빈 줄은 빈 채로 남는다.', 'The blank line stays blank.') },
        },
      ],
    },
  },
}

export const D6_MARGIN_NOTES_DIALOGUES: DialogueDef[] = [SCRIBE, ECHO, ERASER, MARGIN]

export const D6_MARGIN_NOTES_NPCS: NpcDef[] = [
  { id: 'margin_scribe_ha', name: t('하', 'Ha'), role: t('본문과 여백을 함께 옮겨 적는 필사가', 'Scribe who copies the text and the margins alike'), faction: 'grid', portrait: 'v2/npcs/margin_scribe_ha.webp' },
  { id: 'earlier_connector', name: t('먼저 온 접속자', 'The Earlier Connector'), role: t('한 루프 앞서 여기까지 왔던 사람의 흔적', 'The trace of someone who got this far one loop earlier'), faction: 'offgrid', portrait: 'v2/npcs/earlier_connector.webp' },
  { id: 'eraser_child_tol', name: t('톨', 'Tol'), role: t('여백을 지우는 일을 맡은 아이', 'A child whose job is erasing the margins'), faction: 'grid', portrait: 'v2/npcs/eraser_child_tol.webp' },
]

export const D6_MARGIN_NOTES_QUESTS: QuestDef[] = [{
  id: 'q_margin',
  title: t('여백의 주석', 'The Margin Notes'),
  stages: [
    t('여백에서 당신 필체로 적힌 줄을 찾는다.', 'Find a line in the margins written in your own hand.'),
    t('다음 접속자를 위해 한 줄을 남긴다.', 'Leave one line for the next connector.'),
  ],
  payoff: { stage: 2, bossMod: 'intel', text: t('여백에 적은 대로, 보스가 먼저 보는 곳을 알고 들어간다.', 'As written in the margin, you go in knowing where the boss looks first.') },
}]
