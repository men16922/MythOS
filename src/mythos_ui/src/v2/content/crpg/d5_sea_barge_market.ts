// Unwritten Sea, Act 5 — The Barge Market (The Tide Line). Barges lashed together over the flooded reclamation
// streets trade in what the gray tide brings up. A Residue jellyfish drone carries a memory that is not its own and
// is looking for whose it is. q_sea_barge: learn whose memory the drone carries (1) → return it (2) → the barge folk
// lash their hulls into cover for the boss fight (cover). Ong (the bottle seller from Act 2), the drone Mul, or
// Parang point the way. One card picker at Ong; at most 25 credits district-wide. Prop: bottles.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_SEA_BARGE_MARKET: DistrictDef = {
  id: 'd5_sea_barge_market',
  act: 5,
  route: 'sea_5',
  name: t('바지선 시장', 'The Barge Market'),
  image: 'v2/districts/d5_sea_barge_market.webp',
  intro: t(
    '잠긴 매립지 위로 바지선 수십 척이 밧줄로 묶여 있다. 판자를 건너 배에서 배로 시장이 이어진다. 조수가 올려 보낸 것들이 좌판에 놓인다.\n다음 밀물이 오기 전, 세 곳을 들를 수 있다.',
    'Dozens of barges are roped together over the drowned reclamation streets. The market runs from hull to hull across planks. What the tide brings up is laid out on the stalls.\nThere is time for three stops before the next flood.',
  ),
  actions: 3,
  outro: t(
    '밀물이 바지선 밑을 들어 올린다. 밧줄이 일제히 삐걱거리고, 시장은 그대로 떠 있다.',
    'The flood lifts the barges from below. Every rope creaks at once, and the market stays afloat.',
  ),
  pois: [
    { id: 'ong', name: t('병 좌판', 'The Bottle Stall'), blurb: t('“그 병, 여기서 뜬 거라네.”', '“That bottle was drawn here.”'), dialogue: 'd5bm_ong' },
    { id: 'mul', name: t('해파리 드론', 'The Jellyfish Drone'), blurb: t('남의 기억을 들고 떠다닌다.', 'Drifts with someone else’s memory.'), dialogue: 'd5bm_mul' },
    { id: 'pilot', name: t('바지선 키잡이', 'The Barge Pilot'), blurb: t('어느 배가 누구 것인지 안다.', 'Knows which hull is whose.'), dialogue: 'd5bm_pilot' },
    { id: 'stern', name: t('맨 끝 바지선', 'The Last Barge'), blurb: t('불 꺼진 창 하나.', 'One dark window.'), dialogue: 'd5bm_stern' },
  ],
}

const ONG: DialogueDef = {
  id: 'd5bm_ong',
  npc: 'bottle_seller_ong',
  start: 'stall',
  nodes: {
    stall: {
      speaker: 'bottle_seller_ong',
      text: t(
        '옹 노인이 병을 하나씩 햇빛에 비춰 본다. 병마다 회색 물이 반쯤 들었다. 노인이 당신을 알아본다. “아래 동네에서 병 산 손님. 그 병, 여기서 뜬 거라네.”',
        'Old Ong holds bottles up to the light one by one, each half full of gray water. He recognises you. “The customer from down in the undercity. That bottle was drawn here.”',
      ),
      options: [
        {
          label: t('병에 든 기억 하나를 고른다', 'Choose a memory from the bottles'),
          intent: 'ask',
          success: {
            text: t('노인이 병 셋을 늘어놓는다. 하나는 싸움의 기억이다. “하나만. 무거우니까.”', 'He sets out three bottles. One holds the memory of a fight. “Just one. They’re heavy.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('드론이 든 기억이 누구 것인지 묻는다', 'Ask whose memory the drone carries'),
          intent: 'ask',
          check: { stat: 'cha', dc: 12 },
          success: {
            text: t('“부엌, 끓는 냄비, 비 오는 창문. 그건 맨 끝 배 할멈 거야. 아들이 지워졌지.”', '“A kitchen, a pot on the boil, a rainy window. That’s the old woman’s on the last barge. Her son was erased.”'),
            effects: [{ kind: 'quest', id: 'q_sea_barge', stage: 1 }],
          },
          failure: {
            text: t('노인이 병 하나를 흔들고 웃기만 한다. 옆 좌판 세관 끄나풀이 귀를 기울인다.', 'He only shakes a bottle and laughs. A customs informer at the next stall leans in.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('좌판을 떠난다', 'Leave the stall'),
          intent: 'leave',
          success: { text: t('병이 햇빛 아래서 흐려진다.', 'The bottles cloud in the light.') },
        },
      ],
    },
  },
}

const MUL: DialogueDef = {
  id: 'd5bm_mul',
  npc: 'jellyfish_drone_mul',
  start: 'drift',
  nodes: {
    drift: {
      speaker: 'jellyfish_drone_mul',
      text: t(
        '반투명한 드론이 바지선 사이를 떠다닌다. 촉수 끝에 따개비가 붙어 있다. 몸통 안에서 장면이 비친다. 부엌, 냄비, 창문. “이건 내 것이 아니야. 돌려줘야 하는데, 어디로?”',
        'A translucent drone drifts between the barges, barnacles on the ends of its tendrils. Inside its body a scene flickers: a kitchen, a pot, a window. “This isn’t mine. I should give it back. But where?”',
      ),
      options: [
        {
          label: t('장면을 자세히 들여다본다', 'Look closely at the scene'),
          intent: 'ask',
          check: { stat: 'obs', dc: 13 },
          success: {
            text: t('창문 밖으로 바지선 밧줄이 보인다. 맨 끝 배의 창문이다.', 'Outside the window, barge ropes. It is the window of the last barge.'),
            effects: [{ kind: 'quest', id: 'q_sea_barge', stage: 1 }],
          },
          failure: {
            text: t('장면이 흔들리며 당신 쪽으로 번진다. 모르는 사람의 슬픔이 잠깐 손끝을 적신다.', 'The scene wavers and spills toward you. A stranger’s grief wets your fingertips for a moment.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('파랑에게 말을 걸어 보게 한다', 'Let Parang speak to it'),
          intent: 'offer',
          requires: { companion: 'parang' },
          approval: { parang: 2 },
          success: {
            text: t('파랑이 드론의 말투를 그대로 따라 한다. 드론이 맨 끝 배 쪽으로 몸을 돌린다. “거기. 거기였어.”', 'Parang echoes the drone’s way of speaking. The drone turns toward the last barge. “There. It was there.”'),
            effects: [{ kind: 'quest', id: 'q_sea_barge', stage: 1 }, { kind: 'flag', key: 'sea_bm_mul' }],
          },
        },
        {
          label: t('드론을 지나친다', 'Let it drift'),
          intent: 'leave',
          success: { text: t('드론이 밧줄 사이로 떠간다.', 'It drifts on between the ropes.') },
        },
      ],
    },
  },
}

const PILOT: DialogueDef = {
  id: 'd5bm_pilot',
  npc: 'barge_pilot_gil',
  start: 'helm',
  nodes: {
    helm: {
      speaker: 'barge_pilot_gil',
      text: t(
        '길 키잡이가 밧줄 매듭을 다시 맨다. “밀물 땐 줄이 끊겨요. 끊기면 배 하나가 조수로 떠내려가고. 사람 손이 모자라.”',
        'Pilot Gil reties a knot. “Ropes snap at high water. When one does, a barge drifts off into the tide. We’re short of hands.”',
      ),
      options: [
        {
          label: t('밧줄을 같이 맨다', 'Help tie the ropes'),
          intent: 'offer',
          check: { stat: 'str', dc: 12 },
          approval: { mujin: 1 },
          success: {
            text: t('매듭 열두 개. 길이 품삯을 건네며 맨 끝 배를 가리킨다. “저 할멈 배는 아무도 안 묶어 줘. 불이 꺼져서.”', 'Twelve knots. Gil pays you and points to the last barge. “No one ties the old woman’s barge. Her light’s out.”'),
            effects: [{ kind: 'credits', amount: 25 }],
          },
          failure: {
            text: t('밧줄이 손바닥을 쓸고 지나간다.', 'The rope tears across your palm.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('서하에게 물길을 읽게 한다', 'Ask Seo-ha to read the water'),
          intent: 'ask',
          requires: { companion: 'seo_ha' },
          approval: { seo_ha: 1 },
          success: {
            text: t('서하가 물빛을 보고 다음 밀물 시각을 말한다. 길이 받아 적는다. “도선사님이셨구나.”', 'Seo-ha reads the color of the water and names the next flood. Gil writes it down. “You were a harbor pilot.”'),
            effects: [{ kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('키잡이를 떠난다', 'Leave the helm'),
          intent: 'leave',
          success: { text: t('매듭이 하나 더 단단해진다.', 'One more knot pulls tight.') },
        },
      ],
    },
  },
}

const STERN: DialogueDef = {
  id: 'd5bm_stern',
  start: 'window',
  nodes: {
    window: {
      text: t(
        '맨 끝 바지선, 불 꺼진 창 너머에 할머니 한 분이 빈 냄비 앞에 앉아 있다. 누구를 위해 끓이던 냄비인지 잊었다.',
        'On the last barge, behind a dark window, an old woman sits before an empty pot. She has forgotten who she used to cook for.',
      ),
      options: [
        {
          label: t('드론을 데려와 기억을 돌려준다', 'Bring the drone and give the memory back'),
          intent: 'offer',
          requires: { quest: { id: 'q_sea_barge', stage: 1 } },
          success: {
            text: t('드론이 창문에 몸을 댄다. 할머니가 냄비에 불을 켠다. 이름 하나를 부른다. 바지선 사람들이 하나둘 맨 끝 배에 밧줄을 건다.', 'The drone presses against the window. The old woman lights the stove under the pot and calls a name. One by one the barge folk throw ropes to the last barge.'),
            effects: [{ kind: 'quest', id: 'q_sea_barge', stage: 2 }],
          },
        },
        {
          label: t('파랑이 대신 그 이름을 불러 준다', 'Let Parang say the name for her'),
          intent: 'offer',
          requires: { flag: 'sea_bm_mul', quest: { id: 'q_sea_barge', stage: 1 } },
          approval: { parang: 1 },
          success: {
            text: t('파랑이 모르는 사람의 이름을 정확히 부른다. 할머니가 파랑의 손을 잡는다. “밥은 먹었니.”', 'Parang says a stranger’s name exactly right. The old woman takes Parang’s hand. “Have you eaten?”'),
            effects: [{ kind: 'quest', id: 'q_sea_barge', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('창문을 두드리지 않는다', 'Don’t knock'),
          intent: 'leave',
          success: { text: t('냄비는 차가운 채로 있다.', 'The pot stays cold.') },
        },
      ],
    },
  },
}

export const D5_SEA_BARGE_MARKET_DIALOGUES: DialogueDef[] = [ONG, MUL, PILOT, STERN]

export const D5_SEA_BARGE_MARKET_NPCS: NpcDef[] = [
  { id: 'bottle_seller_ong', name: t('옹 노인', 'Old Ong'), role: t('조수에서 뜬 기억을 병에 담아 파는 노인', 'Old man who sells memories drawn from the tide in bottles'), faction: 'market', portrait: 'v2/npcs/bottle_seller_ong.webp' },
  { id: 'jellyfish_drone_mul', name: t('물', 'Mul'), role: t('남의 기억을 들고 떠다니는 잔류물 드론', 'A Residue drone drifting with someone else’s memory'), faction: 'offgrid', portrait: 'v2/npcs/jellyfish_drone_mul.webp' },
  { id: 'barge_pilot_gil', name: t('길 키잡이', 'Pilot Gil'), role: t('밀물마다 밧줄을 다시 매는 바지선 키잡이', 'Barge pilot who reties the ropes every flood'), faction: 'offgrid', portrait: 'v2/npcs/barge_pilot_gil.webp' },
]

export const D5_SEA_BARGE_MARKET_QUESTS: QuestDef[] = [{
  id: 'q_sea_barge',
  title: t('바지선 시장', 'The Barge Market'),
  stages: [
    t('드론이 든 기억이 누구 것인지 알아낸다.', 'Find out whose memory the drone carries.'),
    t('그 기억을 주인에게 돌려준다.', 'Give the memory back to its owner.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('바지선 사람들이 배를 묶어 보스전 엄폐물로 띄운다.', 'The barge folk lash their hulls together as cover for the boss fight.') },
}]
