// Signal+ camp nights for the five DLC companions (same rules as camp_dialogues.ts: one small, concrete earned
// thing, no arc resolved). Voices from packs/new_companions/companions.ts: Io calm 하십시오체, like a catalogue ·
// Miro whispering 반말 · Doyun earnest 해요체 · Bel clipped 반말 with editor's jargon · Rem soft, sleepy 해요체.
//   io    — mends your creased map like a book's spine; asks where to put the bookmark
//   miro  — practises your name so it will stay; asks you to say Miro's before you turn away
//   doyun — counts heads round the fire; the number the list gave Doyun
//   bel   — Bel's finger keeps finding a line to strike in your notes; asks to read one line uncut
//   rem   — has never slept; asks you how
import type { CampSceneDef, DialogueDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const IO: DialogueDef = {
  id: 'camp_io',
  start: 'spine',
  nodes: {
    spine: {
      speaker: 'io',
      text: t(
        '이오가 당신의 구겨진 지도를 무릎에 펴고, 접힌 자리를 유리 손가락으로 하나씩 편다. “책등이 상하면 책은 끝까지 버티지 못합니다. 지도도 같습니다.”\n접힌 자리마다 작은 투명 테이프가 붙는다.',
        'Io spreads your creased map across her knees and smooths each fold with glass fingers. “If the spine is damaged, a book will not last to the end. Maps are the same.”\nA small strip of clear tape goes over every fold.',
      ),
      options: [
        {
          label: t('“고칠 수 있는 건 다 고치네요.”', '“You fix everything that can be fixed.”'),
          intent: 'insight',
          approval: { io: 1 },
          success: { text: t('“고칠 수 있는 것만 고칩니다. 나머지는 기록합니다.” 이오가 마지막 테이프를 붙인다.', '“Only what can be fixed. The rest I record.” Io presses down the last strip.'), goto: 'mark' },
        },
        {
          label: t('“유리성에선 뭘 고쳤어요?”', '“What did you mend in the Glass Library?”'),
          intent: 'ask',
          success: { text: t('“주로 끝난 책을 정리했습니다. 고친 것은 적습니다.” 잠깐 손이 멈춘다. “지금이 더 낫습니다.”', '“Mostly I shelved finished books. I mended few.” A pause. “This is better.”'), goto: 'mark' },
        },
        {
          label: t('“어차피 또 구겨질 텐데요.”', '“It’ll just crease again.”'),
          intent: 'persuade',
          approval: { io: -2 },
          success: { text: t('“그렇습니다.” 이오가 지도를 접어 돌려준다. 테이프는 붙인 채로.', '“That is correct.” Io folds the map and hands it back, tape and all.') },
        },
        {
          label: t('불가에 기대 잠든다', 'Doze off by the fire'),
          intent: 'leave',
          success: { text: t('잠결에 테이프 뜯는 소리가 규칙적으로 들린다.', 'Half asleep, you hear tape torn at a steady rhythm.') },
        },
      ],
    },
    mark: {
      speaker: 'io',
      text: t(
        '이오가 얇은 유리 책갈피 하나를 내민다. “독자들은 멈춘 자리에 이것을 끼웁니다. 당신은 어디에 끼우시겠습니까. 이 여정에서.”',
        'Io holds out a thin glass bookmark. “Readers place this where they stopped. Where would you place it, in this journey?”',
      ),
      options: [
        {
          label: t('“오늘 밤, 여기에.”', '“Tonight. Here.”'),
          intent: 'offer',
          approval: { io: 2 },
          success: {
            text: t('이오가 책갈피를 지도의 안가 표시 위에 놓는다. “기록했습니다. 돌아올 자리가 생겼습니다.”', 'Io lays the bookmark on the map, over the safehouse mark. “Recorded. There is now a place to return to.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“아직 멈출 데가 없어요.”', '“I haven’t stopped anywhere yet.”'),
          intent: 'insight',
          approval: { io: 1 },
          success: {
            text: t('“그렇다면 제가 보관하겠습니다. 필요하실 때 요청하십시오.” 책갈피가 이오의 품으로 들어간다.', '“Then I will keep it. Request it when you need it.” The bookmark goes into Io’s coat.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('지도를 받아 넣는다', 'Take the map and put it away'),
          intent: 'leave',
          success: { text: t('지도가 처음보다 반듯하다.', 'The map lies flatter than it ever did.') },
        },
      ],
    },
  },
}

const MIRO: DialogueDef = {
  id: 'camp_miro',
  start: 'whisper',
  nodes: {
    whisper: {
      speaker: 'miro',
      text: t(
        '불빛 가장자리에서 미로가 작은 소리로 무언가를 되뇐다. 가까이 가 보니 당신 이름이다.\n“…연습하는 거야. 사람들은 나를 금방 잊으니까, 나라도 안 잊으려고.”',
        'At the edge of the firelight Miro is murmuring something over and over. Up close, it is your name.\n“…Practising. People forget me fast, so at least I won’t forget them.”',
      ),
      options: [
        {
          label: t('미로의 이름을 같이 불러 준다', 'Say Miro’s name back'),
          intent: 'offer',
          approval: { miro: 2 },
          success: { text: t('미로의 얼굴에 겹친 반납 카드 한 장이 살짝 들린다. “…한 번 더.”', 'One of the return cards layered over Miro’s face lifts a little. “…Once more.”'), goto: 'turn' },
        },
        {
          label: t('“잘하고 있어.”', '“You’re doing fine.”'),
          intent: 'insight',
          approval: { miro: 1 },
          success: { text: t('미로가 고개를 끄덕이고 당신 이름을 한 번 더 속삭인다. 이번엔 틀리지 않는다.', 'Miro nods and whispers your name once more. No mistakes this time.'), goto: 'turn' },
        },
        {
          label: t('“그런 거 안 해도 돼.”', '“You don’t need to do that.”'),
          intent: 'persuade',
          approval: { miro: -2 },
          success: { text: t('미로가 입을 다문다. 그날 밤 다시는 들리지 않는다.', 'Miro falls silent. You don’t hear it again that night.') },
        },
        {
          label: t('모르는 척 눕는다', 'Lie down as if you hadn’t heard'),
          intent: 'leave',
          success: { text: t('속삭임이 잠들 때까지 이어진다.', 'The whispering goes on until you sleep.') },
        },
      ],
    },
    turn: {
      speaker: 'miro',
      text: t(
        '“부탁 하나만. 내일 돌아설 때, 돌아서기 전에 내 이름 한 번만 불러 줘. 그럼 안 사라지는 것 같아.”',
        '“One favour. Tomorrow, when you turn away, say my name once before you do. Then it feels like I won’t disappear.”',
      ),
      options: [
        {
          label: t('“약속할게. 미로.”', '“I promise. Miro.”'),
          intent: 'offer',
          approval: { miro: 1 },
          success: {
            text: t('미로가 처음으로 불빛 안쪽으로 한 걸음 들어온다. 그리고 당신 옆에 앉는다.', 'For the first time Miro steps one pace into the firelight, and sits beside you.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“돌아서지 않을게.”', '“I won’t turn away.”'),
          intent: 'insight',
          success: {
            text: t('미로가 웃는다. “그건 못 지켜. 그래도 좋아.”', 'Miro smiles. “You can’t keep that one. I like it anyway.”'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('고개만 끄덕인다', 'Just nod'),
          intent: 'leave',
          success: { text: t('미로가 끄덕임을 오래 본다.', 'Miro watches the nod for a long time.') },
        },
      ],
    },
  },
}

const DOYUN: DialogueDef = {
  id: 'camp_doyun',
  start: 'count',
  nodes: {
    count: {
      speaker: 'doyun',
      text: t(
        '도윤이 불가에 둘러앉은 사람을 손가락으로 센다. 두 번 센다. 세 번째로 센다.\n“버릇이에요. 줄 맨 끝에 서 있으면 누가 빠졌는지 세게 돼요. 다 있어요. 오늘은.”',
        'Doyun counts the people round the fire with a finger. Counts twice. A third time.\n“Habit. When you stand at the end of the line, you count who’s missing. Everyone’s here. Tonight.”',
      ),
      options: [
        {
          label: t('같이 센다', 'Count with Doyun'),
          intent: 'offer',
          approval: { doyun: 1 },
          success: { text: t('둘이 같이 센다. 숫자가 맞는다. 도윤이 처음으로 손가락을 내린다.', 'You count together. The numbers match. For the first time Doyun lowers the finger.'), goto: 'number' },
        },
        {
          label: t('“명단에선 몇 번이었어요?”', '“What was your number on the list?”'),
          intent: 'ask',
          success: { text: t('도윤이 잠깐 웃는다. “맨 끝 번호요. 다들 그 번호를 이름처럼 불렀어요.”', 'Doyun laughs briefly. “The last number. Everyone used it like a name.”'), goto: 'number' },
        },
        {
          label: t('“빠진 사람은 어쩔 수 없잖아요.”', '“You can’t help the ones who fell behind.”'),
          intent: 'persuade',
          approval: { doyun: -2 },
          success: { text: t('도윤이 대답하지 않는다. 한 번 더 센다.', 'Doyun doesn’t answer. Counts once more.') },
        },
        {
          label: t('먼저 눕는다', 'Turn in first'),
          intent: 'leave',
          success: { text: t('어둠 속에서 도윤이 한 번 더 센다. 당신까지 포함해서.', 'In the dark Doyun counts once more, you included.') },
        },
      ],
    },
    number: {
      speaker: 'doyun',
      text: t(
        '“이름으로 불러 주시면 좋겠어요. 번호 말고요. 다들 바빠서 잊어요. 괜찮아요. 근데 가끔은요.”',
        '“I’d like to be called by name. Not the number. Everyone’s busy and forgets. That’s fine. But sometimes.”',
      ),
      options: [
        {
          label: t('“도윤.” 이름을 부른다', 'Say “Doyun.”'),
          intent: 'offer',
          approval: { doyun: 2 },
          success: {
            text: t('도윤이 대답한다. “네.” 줄 맨 끝에서 불렸을 때처럼. 그런데 얼굴이 다르다.', 'Doyun answers, “Yes,” just as when called from the end of the line. But the face is different.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“내일은 내가 셀게요.”', '“Tomorrow I’ll do the counting.”'),
          intent: 'insight',
          approval: { doyun: 1 },
          success: {
            text: t('“그럼 저는 뭐 하죠?” 도윤이 진심으로 곤란해한다. “…자 볼게요. 처음으로.”', '“Then what do I do?” Doyun is honestly at a loss. “…Sleep, I suppose. First time.”'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('고개를 끄덕인다', 'Nod'),
          intent: 'leave',
          success: { text: t('도윤이 이불을 끌어당긴다.', 'Doyun pulls the blanket up.') },
        },
      ],
    },
  },
}

const BEL: DialogueDef = {
  id: 'camp_bel',
  start: 'notes',
  nodes: {
    notes: {
      speaker: 'bel',
      text: t(
        '벨이 당신의 작전 메모를 들여다본다. 손가락이 문장 하나 위에서 멈췄다 움직였다 한다. “이 줄. 군더더기. 원래라면 잘랐어.” 손가락을 거두지 못한다.',
        'Bel is reading your field notes. A finger hovers over one sentence, stops, moves, stops. “This line. Padding. Back then I’d have cut it.” Bel can’t take the finger away.',
      ),
      options: [
        {
          label: t('“잘라 봐. 네 판단이니까.”', '“Cut it, then. Your call.”'),
          intent: 'persuade',
          approval: { bel: -1 },
          success: { text: t('벨이 펜을 든다. 그리고 내려놓는다. “…아니. 네 문장이야.”', 'Bel picks up the pen, then puts it down. “…No. It’s your sentence.”'), goto: 'stet' },
        },
        {
          label: t('“그 줄, 그냥 둬 줘.”', '“Leave that line.”'),
          intent: 'insight',
          approval: { bel: 2 },
          success: { text: t('벨의 손가락이 문장 옆에 작은 표시를 한다. 삭제가 아니라 ‘살림’ 표시다.', 'Bel makes a small mark beside the sentence. Not a deletion: a “stet”.'), goto: 'stet' },
        },
        {
          label: t('“검열관 버릇 못 버렸네.”', '“Still a censor at heart.”'),
          intent: 'persuade',
          approval: { bel: -2 },
          success: { text: t('벨이 메모를 덮는다. “알아.” 그 뒤로 말이 없다.', 'Bel shuts the notebook. “I know.” Nothing more after that.') },
        },
        {
          label: t('메모를 돌려받는다', 'Take the notes back'),
          intent: 'leave',
          success: { text: t('벨이 아무 표시 없이 메모를 건넨다.', 'Bel hands the notes back without a mark.') },
        },
      ],
    },
    stet: {
      speaker: 'bel',
      text: t(
        '“십 년 동안 남의 문장을 잘랐어. 한 줄도 끝까지 안 읽고. 이제 한 줄만, 끝까지 읽어 볼래. 아무거나.” 벨이 메모를 내민다.',
        '“Ten years cutting other people’s sentences. Never read one to the end. Now I want to read one line, start to finish. Any line.” Bel holds out the notes.',
      ),
      options: [
        {
          label: t('가장 서툰 문장을 짚어 준다', 'Point to your clumsiest sentence'),
          intent: 'offer',
          approval: { bel: 1 },
          success: {
            text: t('벨이 그 문장을 소리 내어 끝까지 읽는다. 틀린 데도 고치지 않는다. 다 읽고 나서 짧게 말한다. “살렸다.”', 'Bel reads it aloud to the end, mistakes and all, fixing nothing. Then, short: “Stet.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('빈 줄에 벨이 직접 한 줄 쓰게 한다', 'Ask Bel to write a line in the blank space'),
          intent: 'insight',
          success: {
            text: t('벨이 한참 망설이다 한 줄을 쓴다. 지우지 않는다. 당신에게는 보여 주지 않는다.', 'Bel hesitates a long time, then writes one line. Doesn’t cross it out. Doesn’t show you.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('메모를 덮어 둔다', 'Close the notebook'),
          intent: 'leave',
          success: { text: t('벨의 손가락이 덮인 표지 위에서 쉰다.', 'Bel’s finger rests on the closed cover.') },
        },
      ],
    },
  },
}

const REM: DialogueDef = {
  id: 'camp_rem',
  start: 'awake',
  nodes: {
    awake: {
      speaker: 'rem',
      text: t(
        '다들 잠든 뒤, 렘이 불 옆에 앉아 눈을 뜬 채로 있다. “저는 잠든 적이 없어요. 남의 꿈을 끄기만 했지요. 잠드는 건… 어떻게 하는 거예요?”',
        'After everyone is asleep, Rem sits by the fire with eyes open. “I’ve never slept. I only ever switched other people’s dreams off. How do you… fall asleep?”',
      ),
      options: [
        {
          label: t('“숨을 세어 봐요.”', '“Count your breaths.”'),
          intent: 'offer',
          approval: { rem: 1 },
          success: { text: t('렘이 숨을 센다. 열둘에서 틀린다. 처음부터 다시. “어렵네요. 끄는 건 쉬웠는데.”', 'Rem counts breaths, slips at twelve, starts again. “Hard. Switching off was easy.”'), goto: 'watch' },
        },
        {
          label: t('“아무것도 안 하면 돼요.”', '“You just stop doing anything.”'),
          intent: 'insight',
          approval: { rem: 1 },
          success: { text: t('렘이 한참 아무것도 안 한다. 그러다 작게 묻는다. “지금 하고 있는 거 맞지요?”', 'Rem does nothing for a long while. Then, quietly: “I’m doing it right, aren’t I?”'), goto: 'watch' },
        },
        {
          label: t('“기계는 안 자도 되잖아요.”', '“Machines don’t need sleep.”'),
          intent: 'persuade',
          approval: { rem: -2 },
          success: { text: t('렘이 고개를 끄덕인다. “그렇지요.” 눈을 뜬 채로 밤을 지킨다.', 'Rem nods. “So they say.” And keeps watch all night with open eyes.') },
        },
        {
          label: t('먼저 잠든다', 'Fall asleep first'),
          intent: 'leave',
          success: { text: t('렘이 당신이 잠드는 모습을 오래 지켜본다. 배우는 얼굴이다.', 'Rem watches you fall asleep for a long time, like someone taking notes.') },
        },
      ],
    },
    watch: {
      speaker: 'rem',
      text: t(
        '“잠든 기계들 곁에서 기다릴 때, 꿈이 끝나는 소리가 있었어요. 아주 작은 소리. 당신도 그런 소리가 나요?” 렘이 묻는다.',
        '“When I waited beside sleeping machines, there was a sound when a dream ended. A very small one. Do you make that sound too?” Rem asks.',
      ),
      options: [
        {
          label: t('“들어 봐요. 내가 먼저 잘게요.”', '“Listen. I’ll go first.”'),
          intent: 'offer',
          approval: { rem: 2 },
          success: {
            text: t('당신이 눈을 감는다. 렘이 곁에서 기다린다. 아침에 렘이 말한다. “났어요. 작은 소리. 그리고 저도 잠깐… 잤던 것 같아요.”', 'You close your eyes. Rem waits beside you. In the morning Rem says, “It made the sound. Small. And I think I… slept, for a moment.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“그 소리 내면 깨우지 말아 줘요.”', '“When you hear it, don’t wake me.”'),
          intent: 'insight',
          approval: { rem: 1 },
          success: {
            text: t('“네. 이번엔 안 끌게요.” 렘이 담요 끝을 당신 어깨까지 덮어 준다.', '“Yes. This time I won’t switch it off.” Rem pulls the blanket up to your shoulder.'),
            effects: [{ kind: 'hp', amount: 4 }],
          },
        },
        {
          label: t('대답하지 않고 잔다', 'Sleep without answering'),
          intent: 'leave',
          success: { text: t('렘이 그 소리를 기다린다.', 'Rem waits for the sound.') },
        },
      ],
    },
  },
}

export const MORE_CAMP_DIALOGUES: DialogueDef[] = [IO, MIRO, DOYUN, BEL, REM]

export const MORE_CAMP_SCENES: CampSceneDef[] = [
  { companion: 'io', minApproval: 2, dialogue: 'camp_io' },
  { companion: 'miro', minApproval: 2, dialogue: 'camp_miro' },
  { companion: 'doyun', minApproval: 2, dialogue: 'camp_doyun' },
  { companion: 'bel', minApproval: 2, dialogue: 'camp_bel' },
  { companion: 'rem', minApproval: 2, dialogue: 'camp_rem' },
]
