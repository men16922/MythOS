// Act 1 — Water Spider's Debt: a flooded laundromat and arcade in C-17.
// q_spider: learn about Ji-an's final delivery → carry her recorded route out of the arcade.
// Bok or Moru starts the quest; Moru can finish it in the same visit, including after a failed check.
// Se-rin gets to speak without being absolved on somebody else's behalf. No dialogue loops.
// Budget across all four stops: 20 credits, one card pick (pump); quest payoff = cover.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D1_SPIDER_DEBT: DistrictDef = {
  id: 'd1_spider_debt',
  act: 1,
  name: t('물거미의 빚', 'Water Spider’s Debt'),
  image: 'v2/districts/d1_spider_debt.webp',
  intro: t(
    'C-17의 물이 세탁기 유리창까지 차오른다. 옆 오락실에서는 전원도 없는 경품 인형들이 물결에 고개를 끄덕인다. 세탁소 창문에 손글씨가 남아 있다. ‘맡긴 것은 찾아가세요.’\n배수문이 열리기 전, 세 군데를 돌아볼 시간이 있다.',
    'Water in C-17 reaches the washing-machine windows. Next door, arcade prizes nod with the current inside unpowered cabinets. A handwritten notice clings to the laundry window: “Please collect what you left.”\nThere is time for three stops before the sluice opens.',
  ),
  actions: 3,
  outro: t(
    '배수문이 울린다. 빈 세탁 바구니가 문턱을 넘어 골목으로 떠내려간다. 당신은 높은 쪽 계단을 오른다.',
    'The sluice groans. An empty laundry basket floats over the threshold and down the alley. You climb the steps on higher ground.',
  ),
  pois: [
    { id: 'laundry', name: t('복의 세탁대', 'Bok’s Counter'), blurb: t('찾아가지 않은 옷 한 벌.', 'One uncollected coat.'), dialogue: 'd1sd_bok' },
    { id: 'arcade', name: t('잠긴 오락실', 'The Flooded Arcade'), blurb: t('마지막 점수 옆에 남긴 말.', 'A message beside the last score.'), dialogue: 'd1sd_moru' },
    { id: 'ferry', name: t('문짝 나룻배', 'The Door-Raft'), blurb: t('사람부터, 짐은 그다음.', 'People first, cargo second.'), dialogue: 'd1sd_naru' },
    { id: 'pump', name: t('배수 펌프실', 'The Pump Room'), blurb: t('젖지 않은 선반 하나.', 'One shelf above the water.'), dialogue: 'd1sd_pump' },
  ],
}

const BOK: DialogueDef = {
  id: 'd1sd_bok',
  npc: 'sd_bok',
  start: 'counter',
  nodes: {
    counter: {
      speaker: 'sd_bok',
      text: t(
        '복이 젖은 옷 사이에서 노란 우비를 골라 높은 못에 건다. “지안이 것. 물거미가 데리러 오기로 한 날 맡겼지. 그날 방수문이 닫혔어.” 그녀가 빈 옷걸이를 내려놓는다. “돌아온 건 옷뿐이야.”',
        'Bok lifts a yellow raincoat from the wet clothes and hangs it on a high nail. “Ji-an’s. Left it the day Water Spider was meant to collect her. The flood doors shut that day.” She sets down an empty hanger. “Only the coat came back.”',
      ),
      options: [
        {
          label: t('“지안이 남긴 게 더 있어요?”', '“Did Ji-an leave anything else?”'),
          intent: 'ask',
          success: {
            text: t('“옆 오락실에 음성을 맡겼대. 모루가 지키고 있어.” 복이 물 위에 뜬 의자를 붙잡는다.', '“A recording at the arcade. Moru keeps it.” Bok catches a chair drifting past.'),
            effects: [{ kind: 'quest', id: 'q_spider', stage: 1 }],
            goto: 'coat',
          },
        },
        {
          label: t('세린이 우비 앞에 서도록 자리를 내준다', 'Make room for Se-rin beside the coat'),
          intent: 'offer',
          requires: { companion: 'se_rin' },
          approval: { se_rin: 3 },
          success: {
            text: t('세린이 우비 소매를 펴 놓는다. 복은 세린을 보고도 계산대를 치우지 않는다. “이번엔 무슨 일로 왔니.”', 'Se-rin straightens the coat’s sleeve. Bok looks at her without clearing the counter. “What brings you back this time?”'),
            effects: [{ kind: 'quest', id: 'q_spider', stage: 1 }],
            goto: 'spider',
          },
        },
        {
          label: t('“못 구한 사람 얘기는 그만하죠.”', '“Enough about someone who couldn’t be saved.”'),
          intent: 'intimidate',
          approval: { se_rin: -3, tae_o: -1 },
          success: {
            text: t('복이 우비 단추를 끝까지 잠근다. “그 사람 이름은 지안이야. 여기서는 그렇게 불러.”', 'Bok buttons the coat all the way up. “Her name is Ji-an. Use it while you’re here.”'),
          },
        },
        {
          label: t('물살을 피해 물러난다', 'Step out of the current'),
          intent: 'leave',
          success: { text: t('복이 의자를 뒤집어 세탁대 위에 올린다.', 'Bok turns the chair upside down on the counter.') },
        },
      ],
    },
    spider: {
      speaker: 'se_rin',
      text: t(
        '“데리러 온다고 했어. 못 갔고.” 세린이 못 아래에 손을 붙인다. “문이 닫힌 시간은 외워. 그게 무슨 소용인지도 알아. 그래도 남긴 건 가져갈 거야.”',
        '“I said I’d come. I didn’t.” Se-rin rests her hand below the nail. “I know when the door shut. I know remembering won’t change it. But I’m taking what she left.”',
      ),
      options: [
        {
          label: t('“그럼 같이 듣자.”', '“Then we’ll listen together.”'),
          intent: 'offer',
          approval: { se_rin: 2 },
          success: {
            text: t('“그래. 못 들은 척하지만 마.” 세린이 손을 뗀다. 복이 오락실 쪽 문을 턱으로 가리킨다.', '“Fine. Just don’t pretend you didn’t hear it.” Se-rin lowers her hand. Bok nods toward the arcade door.'),
            goto: 'coat',
          },
        },
        {
          label: t('“지안도 널 용서했을 거야.”', '“Ji-an would have forgiven you.”'),
          intent: 'persuade',
          approval: { se_rin: -2 },
          success: {
            text: t('“걔 말 대신 하지 마.” 세린이 물에 잠긴 신발 끝을 본다. 복도 아무 말 없이 기다린다.', '“Don’t put words in her mouth.” Se-rin looks down at her submerged boots. Bok waits in silence.'),
            goto: 'coat',
          },
        },
        {
          label: t('잠시 혼자 있게 둔다', 'Give her a moment alone'),
          intent: 'leave',
          success: { text: t('세린이 고개를 한 번 끄덕인다. 우비에서 물방울이 떨어진다.', 'Se-rin nods once. Water drips from the coat.') },
        },
      ],
    },
    coat: {
      speaker: 'sd_bok',
      text: t(
        '“지안이는 사람들 숨을 곳부터 적었어. 빨래 봉투에도.” 복이 우비 안주머니의 세탁표를 보여 준다. 배달 주소 대신 계단과 난간 그림이 있다.',
        '“Ji-an wrote down places to hide. Even on laundry bags.” Bok shows you the ticket inside the coat. Stairs and railings take the place of a delivery address.',
      ),
      options: [
        {
          label: t('배달 표식으로 오락실 보관함 번호를 읽는다', 'Read the courier marks for a locker number'),
          intent: 'insight',
          requires: { background: 'runner' },
          approval: { se_rin: 1 },
          success: {
            text: t('위층, 오른쪽, 마른 칸. 익숙한 약호다. 복이 세탁표 뒷면에 번호를 적어 준다.', 'Upstairs, right side, dry compartment. Familiar shorthand. Bok writes its number on the back of the ticket.'),
            effects: [{ kind: 'flag', key: 'sd_locker' }],
          },
        },
        {
          label: t('우비를 더 높은 곳에 걸어 준다', 'Hang the coat farther above the water'),
          intent: 'offer',
          approval: { se_rin: 1, su_ah: 1 },
          success: {
            text: t('복이 발판을 받쳐 준다. 이제 물이 더 차도 소매는 닿지 않는다. “거기면 되겠네.”', 'Bok steadies the stool. Even rising water will not reach the sleeves now. “That’ll do.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('세탁표를 돌려주고 나간다', 'Return the ticket and leave'),
          intent: 'leave',
          success: { text: t('복이 표를 우비 안주머니에 다시 넣는다.', 'Bok slips the ticket back inside the coat.') },
        },
      ],
    },
  },
}

const MORU: DialogueDef = {
  id: 'd1sd_moru',
  npc: 'sd_moru',
  start: 'cabinet',
  nodes: {
    cabinet: {
      speaker: 'sd_moru',
      text: t(
        '오락기 수리공 모루가 전원선을 감아 올린다. “전기는 끊었어. 물에는 들어가도 돼.” 천장 가까운 보관함에 작은 녹음기가 있다. “지안이가 맡긴 거야. 사람들 숨길 길이라고. 마지막 손님이었어.”',
        'Moru, the arcade repairer, reels in a power cable. “Disconnected. Safe to wade.” A little recorder sits in a locker near the ceiling. “Ji-an left it. Routes for hiding people, she said. My last customer.”',
      ),
      options: [
        {
          label: t('“그 길을 밖으로 가져가겠어요.”', '“I’ll carry those routes out.”'),
          intent: 'persuade',
          approval: { se_rin: 1 },
          success: {
            text: t('모루가 녹음기 아래 물결을 본다. “좋아. 다만 잠금쇠가 녹슬었어.”', 'Moru watches the ripples under the recorder. “All right. But the latch is rusted shut.”'),
            effects: [{ kind: 'quest', id: 'q_spider', stage: 1 }],
            goto: 'locker',
          },
        },
        {
          label: t('“숨겨 둔 물건 전부 내놔.”', '“Hand over everything you’ve hidden.”'),
          intent: 'intimidate',
          check: { stat: 'str', dc: 12 },
          approval: { se_rin: -2 },
          success: {
            text: t('모루가 빈 공구함을 발로 민다. 안에는 드라이버뿐이다. “숨기는 것하고 지키는 건 달라.”', 'Moru nudges over a tool case. Only screwdrivers inside. “Keeping something safe isn’t the same as hiding it.”'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
          failure: {
            text: t('목소리가 환기구를 타고 거리로 샌다. 멀리서 순찰등이 멈춘다.', 'Your voice carries through the vent. A distant patrol light stops moving.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('오락실을 나간다', 'Leave the arcade'),
          intent: 'leave',
          success: { text: t('모루가 녹음기 위에 비닐을 한 겹 더 씌운다.', 'Moru adds another layer of plastic over the recorder.') },
        },
      ],
    },
    locker: {
      speaker: 'sd_moru',
      text: t(
        '모루가 접이식 사다리를 편다. 잠금쇠 옆에는 번호 다이얼이, 아래에는 뜯어낼 수 있는 얇은 판이 있다. “기계만 안 떨어뜨리면 돼. 다른 건 고치면 되고.”',
        'Moru unfolds a stepladder. Beside the latch is a numbered dial; below it, a thin removable panel. “Just don’t drop the recorder. Anything else, I can fix.”',
      ),
      options: [
        {
          label: t('복이 적어 준 번호를 맞춘다', 'Enter the number Bok gave you'),
          intent: 'insight',
          requires: { flag: 'sd_locker' },
          success: {
            text: t('다이얼이 맞물리며 녹슨 걸쇠를 밀어낸다. 녹음기가 마른 손바닥에 놓인다.', 'The dial engages and pushes the rusty latch aside. The recorder lands in your dry palm.'),
            goto: 'recording',
          },
        },
        {
          label: t('가느다란 철사로 걸쇠를 들어 올린다', 'Lift the latch with a thin wire'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          assist: 'se_rin',
          approval: { se_rin: 1 },
          success: {
            text: t('철사가 한 번 휘고 걸쇠가 들린다. 모루가 아래에서 녹음기를 받친다.', 'The wire bends once and the latch lifts. Moru catches the recorder from below.'),
            goto: 'recording',
          },
          failure: {
            text: t('철사가 끊어진다. 모루가 밑판을 뜯어 녹음기를 꺼낸다. 철판 소리에 거리의 순찰등이 돌아선다.', 'The wire snaps. Moru removes the bottom panel and retrieves the recorder. The clatter turns a patrol light toward the street.'),
            effects: [{ kind: 'trace', amount: 5 }],
            goto: 'recording',
          },
        },
        {
          label: t('모루와 함께 밑판을 조용히 풀어낸다', 'Help Moru unscrew the bottom panel'),
          intent: 'offer',
          success: {
            text: t('당신이 판을 받치고 모루가 나사를 푼다. 긴 정적 끝에 녹음기가 내려온다.', 'You support the panel while Moru turns the screws. After a long, quiet wait, the recorder comes down.'),
            goto: 'recording',
          },
        },
        {
          label: t('사다리에서 내려온다', 'Climb down'),
          intent: 'leave',
          success: { text: t('모루가 사다리 다리를 잡아 준다.', 'Moru holds the ladder steady for you.') },
        },
      ],
    },
    recording: {
      text: t(
        '녹음기가 돌아간다. “세린아. 서쪽 길은 닫혔어. 세탁소 뒤 계단으로 사람들 보내. 난 안쪽 문 열어 볼게.” 잡음 뒤로 문을 두드리는 소리. 모루가 재생을 멈춘다. 길 안내는 남지만, 그 뒤의 대답은 없다.',
        'The recorder plays. “Se-rin. West route’s shut. Send people up the stairs behind the laundry. I’ll try the inner door.” Static, then knocking. Moru stops playback. The directions survive; no answer follows them.',
      ),
      options: [
        {
          label: t('녹음을 챙겨 피난길을 잇는다', 'Take the recording and reconnect the escape route'),
          intent: 'offer',
          approval: { se_rin: 2, tae_o: 1 },
          success: {
            text: t('모루가 계단 약도를 덧붙인다. “복한테도 전할게. 그 길 쓰는 사람들이 아직 있어.” 당신이 녹음기를 방수 주머니에 넣는다.', 'Moru adds a sketch of the stairs. “I’ll tell Bok. People still use that route.” You seal the recorder in a waterproof pouch.'),
            effects: [{ kind: 'quest', id: 'q_spider', stage: 2 }],
          },
        },
        {
          label: t('세린에게 녹음기를 건넨다', 'Give Se-rin the recorder'),
          intent: 'offer',
          requires: { companion: 'se_rin' },
          approval: { se_rin: 3 },
          success: {
            text: t('세린이 재생 버튼에서 손을 뗀다. “길은 내가 확인할게. 이번엔 사람들 나오는 것까지.” 모루가 약도를 접어 건넨다.', 'Se-rin takes her finger off the play button. “I’ll check the route. And see everyone out this time.” Moru hands her the folded sketch.'),
            effects: [{ kind: 'quest', id: 'q_spider', stage: 2 }],
          },
        },
        {
          label: t('아직은 모루에게 맡긴다', 'Leave it with Moru for now'),
          intent: 'leave',
          success: { text: t('모루가 녹음기를 품 안쪽에 넣는다. 이번에는 높은 선반에 두지 않는다.', 'Moru tucks the recorder inside his coat instead of putting it back on the shelf.') },
        },
      ],
    },
  },
}

const NARU: DialogueDef = {
  id: 'd1sd_naru',
  npc: 'sd_naru',
  start: 'raft',
  nodes: {
    raft: {
      speaker: 'sd_naru',
      text: t('나루가 문짝에 묶은 빈 물통을 두드린다. “배라고 부르면 비싸져. 문이라고 불러.” 그가 밧줄 끝을 내민다. “저쪽 난간까지만 잡아 줘.”', 'Naru taps the empty jugs lashed beneath a door. “Call it a boat and the price goes up. It’s a door.” He offers a rope. “Hold it as far as that railing.”'),
      options: [
        {
          label: t('밧줄을 잡고 마지막 승객까지 건넨다', 'Hold the rope until the last passenger crosses'),
          intent: 'offer',
          check: { stat: 'str', dc: 11 },
          assist: 'tae_o',
          approval: { se_rin: 2, tae_o: 1 },
          success: {
            text: t('마지막 발이 마른 난간에 닿는다. 나루가 일삯을 쥐여 준다. “문지기 몫.”', 'The last passenger steps onto the dry landing. Naru hands you your pay. “For holding the door.”'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
          failure: {
            text: t('밧줄이 손바닥을 쓸고 지나간다. 나루가 난간에 줄을 감아 배를 세운다. 모두 내리지만 당신 손은 쓰리다.', 'The rope slides through your palms. Naru loops it round the railing and stops the raft. Everyone gets off; your hands sting.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('“돌아올 때 쓸 엄폐물을 알려 줘.”', '“Show me cover I can use on the way back.”'),
          intent: 'ask',
          success: {
            text: t('나루가 높은 골목의 철제 세탁함을 가리킨다. “빈 건 움직여도 돼. 옷 든 건 놔두고.”', 'Naru points out steel laundry bins in the upper alley. “Move the empty ones. Leave the clothes alone.”'),
            effects: [{ kind: 'combat_mod', mod: 'cover' }],
          },
        },
        {
          label: t('난간을 따라 떠난다', 'Leave along the railing'),
          intent: 'leave',
          success: { text: t('나루가 다음 승객에게 손을 내민다.', 'Naru reaches for the next passenger.') },
        },
      ],
    },
  },
}

const PUMP: DialogueDef = {
  id: 'd1sd_pump',
  start: 'shelf',
  nodes: {
    shelf: {
      text: t('펌프실 선반에 방수 훈련 교본이 놓여 있다. 아래의 밸브 손잡이는 빠져 있다. 벽에 새 물금이 오래된 금 위로 올라간다.', 'Waterproof drill manuals sit on a pump-room shelf. The valve beneath them is missing its handle. A fresh waterline rises above the old one.'),
      options: [
        {
          label: t('마른 교본에서 수로 전술을 익힌다', 'Study canal tactics in a dry manual'),
          intent: 'insight',
          success: {
            text: t('접힌 쪽마다 이동할 발판과 숨을 모서리가 그려져 있다. 한 가지를 골라 동선을 외운다.', 'Each folded page marks a foothold or a hiding corner. You choose a drill and memorise its route.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('공구로 밸브를 돌려 수위를 낮춘다', 'Turn the valve with a tool to lower the water'),
          intent: 'offer',
          check: { stat: 'int', dc: 12 },
          approval: { se_rin: 1 },
          success: {
            text: t('물이 배수구로 빨려든다. 젖은 계단 한 칸이 다시 드러난다.', 'Water draws toward the drain. One wet stair emerges again.'),
            effects: [{ kind: 'trace', amount: -4 }],
          },
          failure: {
            text: t('밸브가 헛돈다. 튄 물을 피하다 어깨를 선반에 부딪친다.', 'The valve spins loose. Dodging the spray, you knock your shoulder against the shelf.'),
            effects: [{ kind: 'hp', amount: -2 }],
          },
        },
        {
          label: t('문을 닫는다', 'Close the door'),
          intent: 'leave',
          success: { text: t('수위 눈금이 문틈으로 사라진다.', 'The water gauge disappears behind the closing door.') },
        },
      ],
    },
  },
}

export const D1_SPIDER_DEBT_DIALOGUES: DialogueDef[] = [BOK, MORU, NARU, PUMP]

export const D1_SPIDER_DEBT_NPCS: NpcDef[] = [
  { id: 'sd_bok', name: t('복', 'Bok'), role: t('찾아가지 않은 옷을 지키는 세탁소 주인', 'A laundress keeping uncollected clothes'), portrait: 'v2/npcs/sd_bok.webp', faction: 'offgrid' },
  { id: 'sd_moru', name: t('모루', 'Moru'), role: t('마지막 손님의 녹음을 지키는 수리공', 'An arcade repairer guarding his last customer’s recording'), portrait: 'v2/npcs/sd_moru.webp', faction: 'offgrid' },
  { id: 'sd_naru', name: t('나루', 'Naru'), role: t('문짝으로 사람을 나르는 뱃사공', 'A ferryman carrying people on a door'), portrait: 'v2/npcs/sd_naru.webp', faction: 'offgrid' },
]

export const D1_SPIDER_DEBT_QUESTS: QuestDef[] = [{
  id: 'q_spider',
  title: t('지안의 마지막 길', 'Ji-an’s Last Route'),
  stages: [
    t('지안이 C-17 오락실에 피난길 녹음을 남겼다. 모루가 보관하고 있다.', 'Ji-an left a recording of an escape route at the C-17 arcade. Moru keeps it safe.'),
    t('녹음과 약도를 가지고 나왔다. 피난길을 쓰는 이들이 앞쪽 구역에 엄폐물을 마련한다.', 'You carry the recording and sketch out. People using the escape route prepare cover farther ahead.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('피난길의 사람들이 보스 구역에 엄폐물을 세운다.', 'People from the escape route set up cover in the boss’s district.') },
}]
