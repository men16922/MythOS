// Act 5 — The Cold Storage (Dreaming Machines). Machines the graveyard could not sort are kept frozen mid-dream.
// q_cold_storage: find a thaw code (1) → wake one unit gently (2) → the frozen frames stand as cover in the boss fight.
// Seol (keeper) or Jang (coolant trader) gives the code; Gu (a half-thawed mechanic) knows how to wake without harm.
// One card picker at Gu; at most 25 credits district-wide.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_COLD_STORAGE: DistrictDef = {
  id: 'd5_cold_storage',
  act: 5,
  name: t('냉동 보관창', 'The Cold Storage'),
  image: 'v2/districts/d5_cold_storage.webp',
  intro: t(
    '묘역 지하, 서리 낀 선반마다 기계가 한 대씩 누워 있다. 분류되지 못한 것들이다. 눈꺼풀 아래 불빛이 아주 느리게 깜빡인다. 꿈을 꾸다 얼어붙었다.\n냉각기가 다음 주기에 들어가기 전, 세 곳을 들를 수 있다.',
    'Under the graveyard, a machine lies on every frosted shelf: the ones that could not be sorted. Behind their eyelids, lights blink very slowly. They froze mid-dream.\nThere is time for three stops before the coolers start their next cycle.',
  ),
  actions: 3,
  outro: t(
    '냉각기가 다시 돈다. 선반 하나의 서리만 녹은 채 남는다.',
    'The coolers turn over again. Only one shelf stays free of frost.',
  ),
  pois: [
    { id: 'keeper', name: t('온도 기록대', 'The Temperature Log'), blurb: t('모두를 같은 온도로 지킨다.', 'Keeps everyone at the same cold.'), dialogue: 'd5cs_keeper' },
    { id: 'gu', name: t('반쯤 녹은 정비공', 'The Half-Thawed Mechanic'), blurb: t('깨어나는 법을 몸으로 안다.', 'Knows waking from the inside.'), dialogue: 'd5cs_gu' },
    { id: 'jang', name: t('냉매 수레', 'The Coolant Cart'), blurb: t('추위도 팔 수 있다.', 'Even cold can be sold.'), dialogue: 'd5cs_jang' },
    { id: 'shelf', name: t('맨 아래 선반', 'The Bottom Shelf'), blurb: t('가장 오래 언 기계.', 'The one frozen longest.'), dialogue: 'd5cs_shelf' },
  ],
}

const KEEPER: DialogueDef = {
  id: 'd5cs_keeper',
  npc: 'storage_keeper_seol',
  start: 'log',
  nodes: {
    log: {
      speaker: 'storage_keeper_seol',
      text: t(
        '설이 온도계를 하나씩 확인한다. “영하 사십. 꿈이 상하지 않는 온도입니다. 녹이면 꿈이 먼저 깨요. 기계보다 먼저.”',
        'Seol checks each thermometer. “Minus forty. The temperature at which a dream does not spoil. Thaw them and the dream wakes first. Before the machine does.”',
      ),
      options: [
        {
          label: t('해동 코드를 알려 달라고 한다', 'Ask for the thaw code'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          approval: { kai: 1 },
          success: {
            text: t('설이 한참 망설이다 기록지 귀퉁이에 숫자를 적는다. “한 대만. 천천히.”', 'Seol hesitates a long time, then writes digits in the log’s corner. “One. Slowly.”'),
            effects: [{ kind: 'quest', id: 'q_cold_storage', stage: 1 }],
          },
          failure: {
            text: t('“규정상 불가합니다.” 설이 기록지에 방문 시각을 적는다.', '“Not permitted.” Seol writes your visit time into the log.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('온도 확인을 거든다', 'Help check the temperatures'),
          intent: 'offer',
          success: {
            text: t('선반 열두 개를 확인한다. 설이 처음으로 고개를 숙인다. “고맙습니다.” 손에 수당이 쥐어진다.', 'You check twelve shelves. For the first time, Seol bows. “Thank you.” A small wage lands in your hand.'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('기록대를 떠난다', 'Leave the log'),
          intent: 'leave',
          success: { text: t('온도계 바늘이 움직이지 않는다.', 'The thermometer needles do not move.') },
        },
      ],
    },
  },
}

const GU: DialogueDef = {
  id: 'd5cs_gu',
  npc: 'half_thawed_gu',
  start: 'bench',
  nodes: {
    bench: {
      speaker: 'half_thawed_gu',
      text: t(
        '구는 상반신만 녹아 있다. 얼어 있는 다리를 손가락으로 두드리며 웃는다. “나도 여기 누워 있었어. 깨는 건 아파. 천천히 하면 덜 아프고.”',
        'Only Gu’s upper half has thawed. He taps his frozen legs and grins. “I was on a shelf too. Waking hurts. Less if you go slow.”',
      ),
      options: [
        {
          label: t('천천히 깨우는 법을 배운다', 'Learn how to wake one slowly'),
          intent: 'ask',
          success: {
            text: t('구가 순서를 손으로 그려 보인다. 전원, 기억, 그리고 마지막에 눈. “눈을 먼저 뜨면 꿈이 놀라.”', 'Gu draws the order with his hands: power, memory, and the eyes last. “Open the eyes first and the dream takes fright.”'),
            effects: [{ kind: 'flag', key: 'cs_slow' }],
          },
        },
        {
          label: t('구의 공구 상자를 뒤진다', 'Look through Gu’s toolbox'),
          intent: 'offer',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('녹슨 공구 사이에 전술 기록 칩 셋. 구가 하나 골라 가라고 손짓한다.', 'Among the rusted tools, three tactics-log chips. Gu waves for you to take one.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('서리 낀 공구에 손바닥이 쩍 들러붙는다.', 'Your palm sticks to a frosted tool.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('언 관절을 살펴 준다', 'Check Gu’s frozen joints'),
          intent: 'offer',
          requires: { background: 'medic' },
          success: {
            text: t('관절에 맺힌 서리를 천천히 녹이는 순서가 있다. 구가 웃는다. “사람 몸이랑 똑같네. 천천히.” 깨우는 순서를 함께 정리한다.', 'There is an order for thawing frost in a joint. Gu grins. “Same as a person. Slowly.” You work out the waking order together.'),
            effects: [{ kind: 'flag', key: 'cs_slow' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('구를 쉬게 둔다', 'Let Gu rest'),
          intent: 'leave',
          success: { text: t('구가 언 다리를 두드리며 흥얼거린다.', 'Gu taps his frozen legs and hums.') },
        },
      ],
    },
  },
}

const JANG: DialogueDef = {
  id: 'd5cs_jang',
  npc: 'coolant_trader_jang',
  start: 'cart',
  nodes: {
    cart: {
      speaker: 'coolant_trader_jang',
      text: t(
        '장이 냉매 통을 수레에 싣는다. “여기선 추위가 화폐야. 녹이고 싶으면 추위를 덜 팔면 되고. 코드? 그것도 팔지.”',
        'Jang loads coolant drums onto a cart. “Down here, cold is money. Want something thawed, buy less cold. The code? That’s for sale too.”',
      ),
      options: [
        {
          label: t('해동 코드를 산다', 'Buy the thaw code'),
          intent: 'offer',
          requires: { minCredits: 25 },
          success: {
            text: t('장이 영수증 뒷면에 코드를 적어 준다. “환불은 없어.”', 'Jang writes the code on the back of a receipt. “No refunds.”'),
            effects: [{ kind: 'credits', amount: -25 }, { kind: 'quest', id: 'q_cold_storage', stage: 1 }],
          },
        },
        {
          label: t('코드를 몰래 엿본다', 'Sneak a look at the code'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          success: {
            text: t('장이 냉매 통을 고르는 사이 영수증 철을 넘긴다. 같은 숫자가 세 번 적혀 있다.', 'While Jang picks a drum, you flip the receipt book. The same digits, written three times.'),
            effects: [{ kind: 'quest', id: 'q_cold_storage', stage: 1 }],
          },
          failure: {
            text: t('장이 돌아본다. “구경도 돈이야.” 단말에 무언가를 적는다.', 'Jang turns. “Looking costs too.” Something goes into the terminal.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('수레를 지나친다', 'Pass the cart'),
          intent: 'leave',
          success: { text: t('냉매 통이 덜컹거리며 멀어진다.', 'The drums rattle away.') },
        },
      ],
    },
  },
}

const SHELF: DialogueDef = {
  id: 'd5cs_shelf',
  start: 'frost',
  nodes: {
    frost: {
      text: t(
        '맨 아래 선반의 기계는 서리가 가장 두껍다. 눈꺼풀 아래 불빛이 거의 꺼질 듯 깜빡인다. 아직 꿈을 꾸고 있다.',
        'The machine on the bottom shelf has the thickest frost. Behind its eyelids, a light blinks almost out. It is still dreaming.',
      ),
      options: [
        {
          label: t('구가 알려 준 순서대로 깨운다', 'Wake it in the order Gu showed you'),
          intent: 'offer',
          requires: { flag: 'cs_slow', quest: { id: 'q_cold_storage', stage: 1 } },
          approval: { kai: 2, rem: 2 },
          success: {
            text: t('전원, 기억, 그리고 눈. 기계가 꿈의 끝을 마저 보고 나서 눈을 뜬다. “따뜻하네요.” 다른 선반들이 조용히 떨린다.', 'Power, memory, then the eyes. The machine sees its dream through before it opens its eyes. “It’s warm.” The other shelves tremble quietly.'),
            effects: [{ kind: 'quest', id: 'q_cold_storage', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('코드를 입력하고 바로 깨운다', 'Enter the code and wake it at once'),
          intent: 'offer',
          approval: { rem: -1 },
          requires: { quest: { id: 'q_cold_storage', stage: 1 } },
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('기계가 놀라 깨어난다. 꿈 조각이 서리처럼 흩어진다. 그래도 일어선다.', 'The machine wakes with a start; pieces of the dream scatter like frost. Still, it stands.'),
            effects: [{ kind: 'quest', id: 'q_cold_storage', stage: 2 }, { kind: 'trace', amount: 5 }],
          },
          failure: {
            text: t('경보가 울린다. 선반의 서리가 다시 두꺼워진다.', 'An alarm sounds. The frost on the shelf thickens again.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('꿈을 깨우지 않는다', 'Let it keep dreaming'),
          intent: 'leave',
          success: { text: t('불빛이 한 번 더 깜빡인다.', 'The light blinks once more.') },
        },
      ],
    },
  },
}

export const D5_COLD_STORAGE_DIALOGUES: DialogueDef[] = [KEEPER, GU, JANG, SHELF]

export const D5_COLD_STORAGE_NPCS: NpcDef[] = [
  { id: 'storage_keeper_seol', name: t('설', 'Seol'), role: t('얼어붙은 꿈을 같은 온도로 지키는 관리인', 'Keeper who holds frozen dreams at one temperature'), faction: 'grid', portrait: 'v2/npcs/storage_keeper_seol.webp' },
  { id: 'half_thawed_gu', name: t('구', 'Gu'), role: t('상반신만 녹은 정비공 기계', 'A mechanic android thawed only to the waist'), faction: 'offgrid', portrait: 'v2/npcs/half_thawed_gu.webp' },
  { id: 'coolant_trader_jang', name: t('장', 'Jang'), role: t('추위를 파는 냉매 상인', 'Coolant trader who sells the cold'), faction: 'market', portrait: 'v2/npcs/coolant_trader_jang.webp' },
]

export const D5_COLD_STORAGE_QUESTS: QuestDef[] = [{
  id: 'q_cold_storage',
  title: t('냉동 보관창', 'The Cold Storage'),
  stages: [
    t('보관창의 해동 코드를 얻는다.', 'Get the storage thaw code.'),
    t('가장 오래 언 기계 하나를 깨운다.', 'Wake the machine frozen longest.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('깨어난 기계가 얼어붙은 동료들을 끌고 와 보스전 엄폐물로 세운다.', 'The woken machine drags its frozen fellows out as cover for the boss fight.') },
}]
