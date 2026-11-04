// Signal+ camp nights for the Unwritten Sea companions (same rules as camp_dialogues.ts: one small, concrete thing
// earned, never an arc beat; nothing resolved). Their approval comes from the Sea districts (d4–d6_sea_*).
// Voices (packs/unwritten_sea/people.ts): Mujin clipped 반말, few words · Seo-ha calm 해요체 · Parang short 반말,
// sometimes says its own name, never takes a pronoun.
//   mujin  — oils the hook he still carries; teaches you the crew's count for a lift
//   seo_ha — draws the old harbor channels in the ash; asks you to name one
//   parang — tries to remember one thing that is Parang's own
import type { CampSceneDef, DialogueDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const MUJIN: DialogueDef = {
  id: 'camp_mujin',
  start: 'hook',
  nodes: {
    hook: {
      speaker: 'mujin',
      text: t(
        '안가 구석, 무진이 작은 크레인 후크를 무릎에 놓고 기름을 먹인다. 항구에서 떼어 온 것이다. 천으로 세 번 닦고, 불빛에 비춰 보고, 다시 닦는다.\n“녹슬면 안 돼. 이건.”',
        'In a corner of the safehouse, Mujin has a small crane hook across his knees, working oil into it. He brought it from the harbor. Wipes it three times with a rag, holds it to the light, wipes it again.\n“Can’t let this one rust.”',
      ),
      options: [
        {
          label: t('“그거 왜 들고 다녀요?”', '“Why do you carry that?”'),
          intent: 'ask',
          success: {
            text: t('무진이 한참 대답하지 않는다. “교대조 다섯. 이걸로 내렸어. 마지막으로.” 후크를 다시 닦는다.', 'Mujin doesn’t answer for a long while. “Five on the shift. Lowered them with this. Last time.” He wipes the hook again.'),
            goto: 'count',
          },
        },
        {
          label: t('천을 받아 같이 닦는다', 'Take a rag and help'),
          intent: 'offer',
          approval: { mujin: 1 },
          success: {
            text: t('무진이 천 하나를 던져 준다. 둘이 말없이 닦는다. 그가 당신 손놀림을 한 번 보고 고개를 끄덕인다.', 'Mujin tosses you a rag. You polish in silence. He glances at your hands once and nods.'),
            goto: 'count',
          },
        },
        {
          label: t('“그거 그냥 고철이잖아요.”', '“That’s just scrap.”'),
          intent: 'persuade',
          approval: { mujin: -2 },
          success: {
            text: t('무진의 손이 멈춘다. 대답 대신 후크를 품에 넣는다. 그날 밤 그는 더 말하지 않는다.', 'Mujin’s hands stop. Instead of answering, he tucks the hook into his coat. He says nothing more that night.'),
          },
        },
        {
          label: t('먼저 눕는다', 'Turn in first'),
          intent: 'leave',
          success: { text: t('천 쓰는 소리가 늦게까지 이어진다.', 'The sound of the rag goes on late into the night.') },
        },
      ],
    },
    count: {
      speaker: 'mujin',
      text: t(
        '무진이 후크를 내려놓고 손가락을 편다. “하역조 박자. 하나, 둘, 셋, 들어. 넷에 멈춰. 다섯은 없어.”\n그가 당신을 본다. “다섯까지 세면 사람이 다쳐. 해 봐.”',
        'Mujin sets the hook down and opens his hand. “Crew count. One, two, three, lift. Stop on four. There’s no five.”\nHe looks at you. “Count to five and someone gets hurt. Try it.”',
      ),
      options: [
        {
          label: t('넷에 멈춰 센다', 'Count, and stop on four'),
          intent: 'offer',
          check: { stat: 'obs', dc: 11 },
          approval: { mujin: 1 },
          success: {
            text: t('하나, 둘, 셋, 들어, 넷. 무진이 짧게 말한다. “됐어. 내 조에 들어와도 돼.” 처음 듣는 칭찬이다.', 'One, two, three, lift, four. Mujin says, short: “Good. You could work my shift.” The first praise you’ve heard from him.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t('입이 먼저 다섯을 센다. 무진이 손을 들어 막는다. “다섯은 없다고.” 한 번 더 시킨다. 이번엔 맞는다.', 'Your mouth gets to five first. Mujin raises a hand to stop you. “No five, I said.” He makes you do it again. This time it’s right.'),
            effects: [{ kind: 'hp', amount: 2 }],
          },
        },
        {
          label: t('“다섯 번째 사람은요?”', '“And the fifth person?”'),
          intent: 'insight',
          approval: { mujin: 1 },
          success: {
            text: t('무진이 불을 본다. “그래서 세는 거야. 다섯이 안 나오게.” 후크를 다시 집는다.', 'Mujin watches the fire. “That’s why you count. So there’s never a five.” He picks the hook up again.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('고개를 끄덕이고 잔다', 'Nod and get some sleep'),
          intent: 'leave',
          success: { text: t('어둠 속에서 무진이 작게 센다. 넷에서 멈춘다.', 'In the dark Mujin counts under his breath. He stops at four.') },
        },
      ],
    },
  },
}

const SEO_HA: DialogueDef = {
  id: 'camp_seo_ha',
  start: 'ash',
  nodes: {
    ash: {
      speaker: 'seo_ha',
      text: t(
        '서하가 꺼져 가는 불 옆 재 위에 손가락으로 선을 긋는다. 굽은 선, 갈라지는 선, 다시 만나는 선.\n“해문항 옛 물길이에요. 배가 없어도 다 외워요. 하나 이름 붙여 볼래요? 이름 없는 물길이 하나 있어서.”',
        'Beside the dying fire, Seo-ha draws lines in the ash with a finger: a curve, a fork, two lines meeting again.\n“The old channels of Haemun. No ships, but I still know them all. Want to name one? There’s one that never had a name.”',
      ),
      options: [
        {
          label: t('물길에 이름을 붙인다', 'Name the channel'),
          intent: 'offer',
          approval: { seo_ha: 1 },
          success: {
            text: t('당신이 말한 이름을 서하가 재 위에 따라 쓴다. “좋네요. 배가 다시 다니면 이 이름으로 부를게요.”', 'Seo-ha writes the name you give in the ash. “That’s good. If ships ever run again, I’ll call it that.”'),
            goto: 'pilot',
          },
        },
        {
          label: t('“배를 몰던 때가 그리워요?”', '“Do you miss piloting?”'),
          intent: 'ask',
          success: {
            text: t('서하가 웃는다. “그리운 건 배가 아니라 물이에요. 물을 읽는 일.” 손가락이 선 하나를 따라간다.', 'Seo-ha smiles. “It’s not the ships I miss. It’s the water. Reading it.” Her finger follows one line.'),
            goto: 'pilot',
          },
        },
        {
          label: t('“어차피 물도 없는데요.”', '“There’s no water anyway.”'),
          intent: 'persuade',
          approval: { seo_ha: -2 },
          success: {
            text: t('서하가 손바닥으로 재를 쓸어 지운다. “그렇죠.” 그 뒤로 말이 없다.', 'Seo-ha wipes the ash flat with her palm. “That’s true.” She says nothing after that.'),
          },
        },
        {
          label: t('불을 지키다 잠든다', 'Fall asleep watching the fire'),
          intent: 'leave',
          success: { text: t('잠결에 손가락이 재를 긋는 소리가 들린다.', 'Half asleep, you hear a finger drawing in ash.') },
        },
      ],
    },
    pilot: {
      speaker: 'seo_ha',
      text: t(
        '“도선사는 배를 몰지 않아요. 옆에 서서 말만 해요. 왼쪽, 천천히, 지금.” 서하가 당신 손을 재 위에 올린다. “눈 감고, 내 말대로 따라가 봐요.”',
        '“A harbor pilot doesn’t steer. She stands beside the captain and talks. Port, slowly, now.” Seo-ha sets your hand on the ash. “Close your eyes. Follow what I say.”',
      ),
      options: [
        {
          label: t('눈을 감고 따라간다', 'Close your eyes and follow'),
          intent: 'offer',
          check: { stat: 'obs', dc: 11 },
          approval: { seo_ha: 1 },
          success: {
            text: t('왼쪽, 천천히, 지금. 손가락이 굽은 선을 벗어나지 않는다. 서하가 낮게 말한다. “입항.” 이상하게 숨이 편해진다.', 'Port, slowly, now. Your finger never leaves the curve. Seo-ha says quietly, “In harbor.” Your breathing eases, oddly.'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t('손가락이 선을 넘는다. 서하가 웃으며 손을 되돌려 준다. “좌초. 괜찮아요, 다들 처음엔 그래요.”', 'Your finger crosses the line. Seo-ha laughs and guides it back. “Aground. It’s fine, everyone does at first.”'),
            effects: [{ kind: 'hp', amount: 2 }],
          },
        },
        {
          label: t('“나 대신 길을 말해 줘요. 내일도.”', '“Tell me the way tomorrow too.”'),
          intent: 'insight',
          approval: { seo_ha: 1 },
          success: {
            text: t('서하가 고개를 끄덕인다. “첫 갈림길부터요.” 재 위의 선을 손바닥으로 덮어 둔다. 지우지 않고.', 'Seo-ha nods. “From the first fork.” She covers the lines with her palm, without erasing them.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('고맙다고 하고 눕는다', 'Thank her and lie down'),
          intent: 'leave',
          success: { text: t('재 위의 물길이 아침까지 남아 있다.', 'The channels in the ash are still there in the morning.') },
        },
      ],
    },
  },
}

const PARANG: DialogueDef = {
  id: 'camp_parang',
  start: 'own',
  nodes: {
    own: {
      speaker: 'parang',
      text: t(
        '파랑이 무릎을 끌어안고 불을 본다. 한참 만에 입을 연다.\n“파랑 안에 있는 거 다 남의 거야. 저녁도, 노래도, 비 오는 창문도. 파랑 거 하나만 있었으면 좋겠어.”',
        'Parang sits hugging both knees, watching the fire. After a long while:\n“Everything inside Parang is someone else’s. The suppers, the songs, the rainy windows. Parang wishes there was one thing that was Parang’s.”',
      ),
      options: [
        {
          label: t('“오늘 일은 다 파랑 거야.”', '“Everything from today is yours.”'),
          intent: 'insight',
          approval: { parang: 1 },
          success: {
            text: t('파랑이 오늘을 하나씩 센다. 걸은 길, 먹은 것, 웃은 일. “…세 개.” 처음으로 손가락을 접어 센다.', 'Parang counts today one by one: the road walked, what was eaten, something laughed at. “…Three.” For the first time, counting on fingers.'),
            goto: 'name',
          },
        },
        {
          label: t('“남의 거여도 괜찮아.”', '“It’s all right if it’s someone else’s.”'),
          intent: 'persuade',
          success: {
            text: t('파랑이 고개를 갸웃한다. “그럼 돌려줄 때 아파?” 대답을 기다린다.', 'Parang’s head tilts. “Then does it hurt to give it back?” And waits for an answer.'),
            goto: 'name',
          },
        },
        {
          label: t('“그런 생각 하지 말고 자.”', '“Stop thinking about that and sleep.”'),
          intent: 'persuade',
          approval: { parang: -2 },
          success: {
            text: t('파랑이 고개를 끄덕이고 눕는다. 눈은 감지 않는다.', 'Parang nods and lies down. Parang’s eyes stay open.'),
          },
        },
        {
          label: t('옆에 앉아 불을 같이 본다', 'Sit beside Parang and watch the fire'),
          intent: 'leave',
          success: { text: t('둘이 말없이 불을 본다. 그것도 파랑 것이 된다.', 'You watch the fire together in silence. That becomes Parang’s too.') },
        },
      ],
    },
    name: {
      speaker: 'parang',
      text: t(
        '“이름은? 파랑이라는 이름은 누가 불러 줬는지 기억 안 나. 그래도 파랑 거야?” 파랑이 당신을 본다.',
        '“And the name? Parang can’t remember who first called it that. Is it still Parang’s?” Parang looks at you.',
      ),
      options: [
        {
          label: t('이름을 천천히 불러 준다', 'Say the name, slowly'),
          intent: 'offer',
          approval: { parang: 2 },
          success: {
            text: t('“파랑.” 아이가 따라 한다. “파랑.” 그리고 작게 웃는다. “이번 건 누가 불렀는지 알아. 그러니까 파랑 거야.”', '“Parang.” The child repeats it. “Parang.” And smiles a little. “This time Parang knows who said it. So it’s Parang’s.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“네가 쓰면 네 거야.”', '“If you use it, it’s yours.”'),
          intent: 'insight',
          approval: { parang: 1 },
          success: {
            text: t('파랑이 생각한다. “그럼 많이 써야겠다.” 불가에 이름을 세 번 쓴다.', 'Parang thinks about it. “Then Parang should use it a lot.” And writes the name by the fire three times.'),
            effects: [{ kind: 'hp', amount: 3 }],
          },
        },
        {
          label: t('대답 대신 담요를 덮어 준다', 'Tuck a blanket round Parang instead of answering'),
          intent: 'leave',
          success: { text: t('담요 아래서 작은 목소리가 이름을 한 번 더 부른다.', 'Under the blanket, a small voice says the name once more.') },
        },
      ],
    },
  },
}

export const SEA_CAMP_DIALOGUES: DialogueDef[] = [MUJIN, SEO_HA, PARANG]

export const SEA_CAMP_SCENES: CampSceneDef[] = [
  { companion: 'mujin', minApproval: 2, dialogue: 'camp_mujin' },
  { companion: 'seo_ha', minApproval: 2, dialogue: 'camp_seo_ha' },
  { companion: 'parang', minApproval: 2, dialogue: 'camp_parang' },
]
