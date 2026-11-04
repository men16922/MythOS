// Unwritten Sea, Act 4 — Container Alley (The Dry Harbor). Families live in the empty containers stacked on the dry
// harbor floor; Customs Enforcement deregisters a container by sealing its doors with tape, and whoever is inside
// stops existing on paper. q_sea_container: find out which container is sealed tonight (1) → get the family out or
// the seal voided (2) → the alley's people jam the Commissioner's paperwork (weaken). Seal-clerk Oh, the container
// kid Narae, or Mujin know; Granny Pan trades. One card picker at Pan; at most 25 credits. Prop: seal tape.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_SEA_CONTAINER_ALLEY: DistrictDef = {
  id: 'd4_sea_container_alley',
  act: 4,
  route: 'sea_4',
  name: t('컨테이너 골목', 'Container Alley'),
  image: 'v2/districts/d4_sea_container_alley.webp',
  intro: t(
    '마른 항구 바닥에 빈 컨테이너가 삼 층으로 쌓여 골목이 됐다. 문마다 빨래가 걸리고 화분이 놓였다. 몇몇 문에는 세관 봉인 테이프가 엑스 자로 붙어 있다.\n봉인반이 다음 줄을 돌기 전, 세 곳을 들를 수 있다.',
    'Empty containers stacked three high on the dry harbor floor have become an alley. Laundry hangs at the doors, pots of plants sit on the sills. A few doors wear customs seal tape in an X.\nThere is time for three stops before the sealing team works the next row.',
  ),
  actions: 3,
  outro: t(
    '봉인반의 테이프 뜯는 소리가 골목 끝에서 들린다. 한 집의 화분이 문 안쪽으로 들어간다.',
    'The sound of tape being pulled comes from the end of the alley. One family’s plant pot disappears inside the door.',
  ),
  pois: [
    { id: 'oh', name: t('봉인 수레', 'The Sealing Cart'), blurb: t('테이프 롤이 산더미.', 'A mountain of tape rolls.'), dialogue: 'd4ca_oh' },
    { id: 'narae', name: t('3층 컨테이너 지붕', 'The Third-Tier Roof'), blurb: t('아이가 골목을 내려다본다.', 'A kid watches the alley.'), dialogue: 'd4ca_narae' },
    { id: 'pan', name: t('반 할머니 노점', 'Granny Pan’s Stall'), blurb: t('컨테이너 문짝이 계산대.', 'A container door for a counter.'), dialogue: 'd4ca_pan' },
    { id: 'door', name: t('오늘 밤의 문', 'Tonight’s Door'), blurb: t('아직 테이프가 없다.', 'No tape yet.'), dialogue: 'd4ca_door' },
  ],
}

const OH: DialogueDef = {
  id: 'd4ca_oh',
  npc: 'seal_clerk_oh',
  start: 'cart',
  nodes: {
    cart: {
      speaker: 'seal_clerk_oh',
      text: t(
        '오 사무관이 테이프 롤을 손목에 끼우고 명부를 넘긴다. “등록 말소 대상 C-7동. 봉인은 집행입니다. 집행은 통보로 갈음합니다.” 그가 잠깐 멈춘다. “통보는 아무도 안 읽지만요.”',
        'Clerk Oh slides a tape roll onto his wrist and turns the register. “Deregistration: unit C-7. Sealing is enforcement. Notice is deemed served.” He pauses. “Nobody reads the notices.”',
      ),
      options: [
        {
          label: t('명부를 슬쩍 본다', 'Glance at the register'),
          intent: 'sneak',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('C-7. 3층, 왼쪽에서 네 번째. 명부 여백에 연필로 “아이 있음”이라고 적혀 있다.', 'C-7. Third tier, fourth from the left. In the margin, in pencil: “child present.”'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 1 }],
          },
          failure: {
            text: t('오가 명부를 덮는다. “열람은 신청서로.” 당신 얼굴을 장부에 적는다.', 'Oh shuts the register. “Viewing is by application.” He notes your face in the ledger.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('“이의 신청서는 어디서 받죠?”', '“Where do I get an objection form?”'),
          intent: 'persuade',
          check: { stat: 'int', dc: 13 },
          success: {
            text: t('오가 한참 서랍을 뒤진다. 먼지 쌓인 서식 한 장. “삼십 년 동안 아무도 안 물어봤습니다.” 서식이 봉인을 하루 멈춘다.', 'Oh digs through a drawer for a long time. One dusty form. “Nobody has asked in thirty years.” The form halts a seal for a day.'),
            effects: [{ kind: 'flag', key: 'sea_ca_form' }],
          },
          failure: {
            text: t('“해당 서식은 폐지되었습니다.” 오가 다음 쪽으로 넘어간다.', '“That form has been discontinued.” Oh turns the page.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('수레를 지나친다', 'Pass the cart'),
          intent: 'leave',
          success: { text: t('테이프가 찌익 풀린다.', 'Tape unspools with a rip.') },
        },
      ],
    },
  },
}

const NARAE: DialogueDef = {
  id: 'd4ca_narae',
  npc: 'container_kid_narae',
  start: 'roof',
  nodes: {
    roof: {
      speaker: 'container_kid_narae',
      text: t(
        '컨테이너 지붕에 아이 하나가 다리를 늘어뜨리고 앉아 있다. “봉인반이 오면 다들 불 꺼요. 근데 오늘은 우리 줄이래요. 엄마는 모르는 척해요.”',
        'A kid sits on a container roof, legs dangling. “When the sealing team comes everyone turns their lights off. But tonight it’s our row, they say. Mum pretends she doesn’t know.”',
      ),
      options: [
        {
          label: t('“너희 집이 몇 번이야?”', '“Which one is yours?”'),
          intent: 'ask',
          success: {
            text: t('나래가 발끝으로 가리킨다. “C-7. 화분 있는 집.” 그리고 덧붙인다. “토마토예요.”', 'Narae points with a toe. “C-7. The one with the plant.” And adds, “It’s a tomato.”'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 1 }],
          },
        },
        {
          label: t('무진에게 지붕 길을 물어보게 한다', 'Let Mujin ask about the roof routes'),
          intent: 'ask',
          requires: { companion: 'mujin' },
          approval: { mujin: 2 },
          success: {
            text: t('무진이 짧게 묻고, 나래가 길게 대답한다. 컨테이너 지붕을 건너 크레인 발치까지 가는 길이 있다.', 'Mujin asks short, Narae answers long. There is a way across the roofs to the foot of the crane.'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 1 }, { kind: 'flag', key: 'sea_ca_roof' }],
          },
        },
        {
          label: t('지붕을 떠난다', 'Leave the roof'),
          intent: 'leave',
          success: { text: t('나래의 발이 계속 흔들린다.', 'Narae’s feet keep swinging.') },
        },
      ],
    },
  },
}

const PAN: DialogueDef = {
  id: 'd4ca_pan',
  npc: 'granny_pan',
  start: 'stall',
  nodes: {
    stall: {
      speaker: 'granny_pan',
      text: t(
        '반 할머니가 컨테이너 문짝을 눕혀 만든 계산대에 통조림을 쌓는다. “봉인 붙은 집 물건은 여기로 와. 주인이 나중에 찾으러 오면 돌려주고. 안 오면… 파는 거지.”',
        'Granny Pan stacks tins on a counter made from a container door laid flat. “Things from sealed homes end up here. If the owners come back, I return them. If not… I sell them.”',
      ),
      options: [
        {
          label: t('주인 안 온 물건 하나를 고른다', 'Pick something nobody came back for'),
          intent: 'ask',
          success: {
            text: t('할머니가 낡은 전술 수첩 셋을 꺼낸다. “전에 살던 경비원 거야. 하나만.”', 'She brings out three worn tactics notebooks. “A guard who used to live here. One.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('통조림 정리를 돕는다', 'Help stack the tins'),
          intent: 'offer',
          approval: { seo_ha: 1 },
          success: {
            text: t('라벨 없는 통조림을 무게로 나눈다. 할머니가 동전을 세어 준다.', 'You sort unlabelled tins by weight. She counts coins into your hand.'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('노점을 지나친다', 'Pass the stall'),
          intent: 'leave',
          success: { text: t('통조림 탑이 하나 더 올라간다.', 'One more tower of tins goes up.') },
        },
      ],
    },
  },
}

const DOOR: DialogueDef = {
  id: 'd4ca_door',
  start: 'c7',
  nodes: {
    c7: {
      text: t(
        'C-7. 문 앞에 토마토 화분. 안에서 라디오 소리가 작게 난다. 봉인반의 발소리가 두 줄 건너에서 다가온다.',
        'C-7. A tomato plant at the door. A radio plays softly inside. The sealing team’s footsteps come closer, two rows away.',
      ),
      options: [
        {
          label: t('이의 신청서를 문에 붙인다', 'Tape the objection form to the door'),
          intent: 'offer',
          requires: { flag: 'sea_ca_form', quest: { id: 'q_sea_container', stage: 1 } },
          success: {
            text: t('봉인반이 문 앞에서 멈춘다. 서식을 읽는다. 한참 읽는다. 그리고 다음 줄로 간다. 골목 사람들이 같은 서식을 베끼기 시작한다.', 'The sealing team stops at the door and reads the form. Reads it for a long time. Then moves to the next row. The alley starts copying the form.'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('지붕 길로 가족을 옮긴다', 'Move the family out along the roofs'),
          intent: 'offer',
          requires: { flag: 'sea_ca_roof', quest: { id: 'q_sea_container', stage: 1 } },
          success: {
            text: t('나래가 앞장서고, 엄마가 화분을 안고 따른다. 봉인반은 빈 문에 테이프를 붙인다. 지붕 위의 골목 사람들이 서로 눈짓한다.', 'Narae leads; her mother follows with the tomato in her arms. The sealing team tapes an empty door. On the roofs, the alley’s people exchange looks.'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 2 }],
          },
        },
        {
          label: t('문을 두드려 당장 나오라고 한다', 'Knock and tell them to get out now'),
          intent: 'persuade',
          requires: { quest: { id: 'q_sea_container', stage: 1 } },
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('라디오가 꺼진다. 문이 열린다. 세 식구가 짐 하나씩 들고 나온다. 봉인반이 모퉁이를 돈다.', 'The radio goes off. The door opens. Three of them come out, a bag each. The sealing team rounds the corner.'),
            effects: [{ kind: 'quest', id: 'q_sea_container', stage: 2 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('안에서 대답이 없다. 라디오 소리만 커진다.', 'No answer from inside. Only the radio gets louder.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('문 앞을 떠난다', 'Leave the door'),
          intent: 'leave',
          success: { text: t('토마토 잎이 바람에 흔들린다.', 'The tomato leaves shiver in the wind.') },
        },
      ],
    },
  },
}

export const D4_SEA_CONTAINER_ALLEY_DIALOGUES: DialogueDef[] = [OH, NARAE, PAN, DOOR]

export const D4_SEA_CONTAINER_ALLEY_NPCS: NpcDef[] = [
  { id: 'seal_clerk_oh', name: t('오 사무관', 'Clerk Oh'), role: t('컨테이너 문에 봉인 테이프를 붙이는 세관 사무관', 'Customs clerk who tapes container doors shut'), faction: 'grid', portrait: 'v2/npcs/seal_clerk_oh.webp' },
  { id: 'container_kid_narae', name: t('나래', 'Narae'), role: t('컨테이너 지붕에서 골목을 지켜보는 아이', 'A kid who watches the alley from the container roofs'), faction: 'offgrid', portrait: 'v2/npcs/container_kid_narae.webp' },
  { id: 'granny_pan', name: t('반 할머니', 'Granny Pan'), role: t('봉인된 집의 물건을 맡아 두는 노점상', 'Stallholder who keeps the things from sealed homes'), faction: 'market', portrait: 'v2/npcs/granny_pan.webp' },
]

export const D4_SEA_CONTAINER_ALLEY_QUESTS: QuestDef[] = [{
  id: 'q_sea_container',
  title: t('컨테이너 골목', 'Container Alley'),
  stages: [
    t('오늘 밤 봉인될 컨테이너를 알아낸다.', 'Find out which container is sealed tonight.'),
    t('봉인 전에 그 집을 지킨다.', 'Keep that home from the seal.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('골목 사람들이 세관장의 서류를 이의 신청서로 막는다. 집행이 느려진다.', 'The alley jams the Commissioner’s paperwork with objection forms. Enforcement slows.') },
}]
