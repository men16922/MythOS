// Unwritten Sea, Act 5 — The Gray Shallows (The Tide Line). At low tide a strip of gray shallows opens past the
// breakwater; memory-fishers wade in on ropes to bring back what the tide took. A mother has lost the memory of her
// child's voice to the water. q_sea_shallows: learn where the voice sank (1) → bring it back without being taken
// (2) → the tide hesitates around you in the boss fight and the boss is exposed (marked). Rope-holder Bong, the
// fisher Ae-ri, or Parang know the water; Ae-ri's catch holds a card picker. At most 20 credits. Prop: the rope.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_SEA_SHALLOWS: DistrictDef = {
  id: 'd5_sea_shallows',
  act: 5,
  route: 'sea_5',
  name: t('회색 여울', 'The Gray Shallows'),
  image: 'v2/districts/d5_sea_shallows.webp',
  intro: t(
    '썰물이면 방파제 너머로 회색 여울이 드러난다. 허리에 밧줄을 맨 사람들이 물속으로 걸어 들어가 무언가를 건져 온다. 물에 빼앗긴 기억이다. 밧줄을 놓치면 돌아오지 못한다.\n밀물이 돌아오기 전, 세 곳을 들를 수 있다.',
    'At low tide, gray shallows open past the breakwater. People with ropes round their waists wade in and bring things back: memories the water took. Whoever loses the rope does not come back.\nThere is time for three stops before the tide returns.',
  ),
  actions: 3,
  outro: t(
    '밀물이 여울을 덮는다. 밧줄들이 하나씩 감겨 돌아온다. 하나도 끊어지지 않았다.',
    'The tide covers the shallows. The ropes are wound back in one by one. Not one has snapped.',
  ),
  pois: [
    { id: 'bong', name: t('밧줄 말뚝', 'The Rope Post'), blurb: t('잡아 주는 사람.', 'The one who holds on.'), dialogue: 'd5gs_bong' },
    { id: 'aeri', name: t('건짐 바구니', 'The Catch Basket'), blurb: t('오늘 건진 것들.', 'Today’s catch.'), dialogue: 'd5gs_aeri' },
    { id: 'mother', name: t('물가의 여자', 'The Woman at the Edge'), blurb: t('목소리를 잃었다.', 'She lost a voice.'), dialogue: 'd5gs_mother' },
    { id: 'water', name: t('여울 한가운데', 'The Middle of the Shallows'), blurb: t('물이 웅성거린다.', 'The water murmurs.'), dialogue: 'd5gs_water' },
  ],
}

const BONG: DialogueDef = {
  id: 'd5gs_bong',
  npc: 'rope_holder_bong',
  start: 'post',
  nodes: {
    post: {
      speaker: 'rope_holder_bong',
      text: t(
        '봉 씨가 말뚝에 밧줄을 감고 발을 버틴다. 손바닥이 굳은살투성이다. “들어가는 건 누구나 해요. 붙잡고 있는 게 일이지. 내가 잡는 줄은 한 번도 안 끊어졌어요.”',
        'Bong winds a rope round the post and braces his feet, palms all calluses. “Anyone can go in. Holding on is the job. No rope I’ve held has ever broken.”',
      ),
      options: [
        {
          label: t('밧줄을 매 달라고 한다', 'Ask him to tie you on'),
          intent: 'offer',
          success: {
            text: t('봉 씨가 당신 허리에 밧줄을 두 번 감는다. “당기면 돌아와요. 물이 뭐라고 하든.”', 'Bong winds the rope round your waist twice. “When I pull, you come back. Whatever the water says.”'),
            effects: [{ kind: 'flag', key: 'sea_gs_rope' }],
          },
        },
        {
          label: t('여울 물길을 묻는다', 'Ask about the currents in the shallows'),
          intent: 'ask',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('봉 씨가 물빛을 가리킨다. “저기 짙은 데가 오늘 깊어요. 목소리 같은 가벼운 건 저기 뜨고.”', 'Bong points at the color of the water. “That dark patch is deep today. Light things, like a voice, float up there.”'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 1 }],
          },
          failure: {
            text: t('물빛을 오래 보다 어지러워진다. 남의 기억이 잠깐 스친다.', 'You stare at the water too long and go dizzy. A stranger’s memory brushes past.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('운반책 매듭으로 직접 몸을 묶는다', 'Tie yourself on with a runner’s knot'),
          intent: 'offer',
          requires: { background: 'runner' },
          success: {
            text: t('봉 씨가 매듭을 보고 고개를 끄덕인다. “그 매듭은 안 풀려요. 들어가요. 내가 잡을게.”', 'Bong looks at the knot and nods. “That one won’t slip. Go in. I’ve got you.”'),
            effects: [{ kind: 'flag', key: 'sea_gs_rope' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('말뚝을 떠난다', 'Leave the post'),
          intent: 'leave',
          success: { text: t('밧줄이 팽팽하게 당겨진다.', 'The rope pulls taut.') },
        },
      ],
    },
  },
}

const AERI: DialogueDef = {
  id: 'd5gs_aeri',
  npc: 'memory_fisher_aeri',
  start: 'basket',
  nodes: {
    basket: {
      speaker: 'memory_fisher_aeri',
      text: t(
        '애리가 젖은 바구니를 뒤집는다. 조개처럼 닫힌 빛덩이들이 쏟아진다. 하나하나가 누군가의 기억이다. “주인 찾아 주는 게 일이에요. 못 찾으면… 쓸 데 있는 사람한테.”',
        'Ae-ri upends a wet basket. Lumps of light, shut like clams, spill out, each one someone’s memory. “I find their owners. If I can’t… someone who can use them.”',
      ),
      options: [
        {
          label: t('주인 없는 것 하나를 고른다', 'Pick one with no owner'),
          intent: 'ask',
          success: {
            text: t('애리가 셋을 골라 준다. 하나에서 싸우는 소리가 난다. “그건 주인이 싸움꾼이었나 봐요.”', 'Ae-ri picks out three. One rattles with the sound of a fight. “That one’s owner must have been a fighter.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('아이 목소리를 건진 적 있는지 묻는다', 'Ask if she has fished up a child’s voice'),
          intent: 'ask',
          check: { stat: 'cha', dc: 12 },
          success: {
            text: t('애리가 고개를 젓는다. “가벼운 건 깊은 데 떠 있어요. 혼자는 못 가요.” 짙은 물빛 쪽을 본다.', 'Ae-ri shakes her head. “Light things float over the deep part. Can’t go alone.” She looks toward the dark water.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 1 }],
          },
          failure: {
            text: t('애리가 바구니를 챙겨 돌아선다. “손님 일은 손님이 해요.”', 'Ae-ri gathers her basket and turns away. “Your job’s your job.”'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('바구니를 떠난다', 'Leave the basket'),
          intent: 'leave',
          success: { text: t('빛덩이들이 바구니 안에서 떤다.', 'The lumps of light tremble in the basket.') },
        },
      ],
    },
  },
}

const MOTHER: DialogueDef = {
  id: 'd5gs_mother',
  start: 'edge',
  nodes: {
    edge: {
      text: t(
        '물가에 여자 하나가 무릎을 꿇고 있다. 아이 사진을 쥐고 있다. 얼굴은 기억한다. 목소리가 기억나지 않는다. 지난 밀물에 물이 가져갔다.',
        'A woman kneels at the water’s edge holding a photo of a child. She remembers the face. She cannot remember the voice. The last flood took it.',
      ),
      options: [
        {
          label: t('목소리를 찾아 주겠다고 한다', 'Promise to find the voice'),
          intent: 'offer',
          approval: { seo_ha: 1 },
          success: {
            text: t('여자가 사진 뒷면을 보여 준다. 아이가 마지막으로 한 말이 연필로 적혀 있다. 목소리를 알아볼 실마리다.', 'She shows you the back of the photo: the child’s last words, in pencil. A clue to recognise the voice by.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 1 }],
          },
        },
        {
          label: t('파랑이 여자 곁에 앉는다', 'Let Parang sit with her'),
          intent: 'ask',
          requires: { companion: 'parang' },
          approval: { parang: 2 },
          success: {
            text: t('파랑이 조용히 말한다. “그 목소리, 들은 적 있어. 물속에서.” 파랑이 짙은 물빛을 가리킨다.', 'Parang says quietly, “I’ve heard that voice. In the water.” Parang points at the dark patch.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 1 }, { kind: 'flag', key: 'sea_gs_parang' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('물가를 떠난다', 'Leave the edge'),
          intent: 'leave',
          success: { text: t('여자가 사진을 다시 본다.', 'She looks at the photo again.') },
        },
      ],
    },
  },
}

const WATER: DialogueDef = {
  id: 'd5gs_water',
  start: 'deep',
  nodes: {
    deep: {
      text: t(
        '여울 한가운데, 물이 허리까지 온다. 물속에서 수많은 목소리가 웅성거린다. 그중 하나가 아주 가볍다. 아이의 목소리다.',
        'In the middle of the shallows the water reaches your waist. Countless voices murmur under the surface. One of them is very light: a child’s.',
      ),
      options: [
        {
          label: t('밧줄을 믿고 깊이 손을 넣는다', 'Trust the rope and reach deep'),
          intent: 'offer',
          requires: { flag: 'sea_gs_rope', quest: { id: 'q_sea_shallows', stage: 1 } },
          success: {
            text: t('물이 손목을 당긴다. 봉 씨가 당긴다. 손 안에 작은 빛덩이 하나. 물가의 여자가 그걸 받아 들고 아이 이름을 부른다. 처음으로 목소리가 맞다.', 'The water pulls your wrist. Bong pulls harder. In your hand, one small lump of light. The woman at the edge takes it and calls her child’s name. For the first time, the voice is right.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 2 }],
          },
        },
        {
          label: t('파랑이 목소리를 불러낸다', 'Let Parang call the voice out'),
          intent: 'offer',
          requires: { flag: 'sea_gs_parang', quest: { id: 'q_sea_shallows', stage: 1 } },
          approval: { parang: 1 },
          success: {
            text: t('파랑이 물 위로 몸을 숙여 아이의 마지막 말을 따라 한다. 가벼운 목소리가 스스로 떠올라 파랑의 손에 닿는다.', 'Parang leans over the water and repeats the child’s last words. The light voice rises by itself and settles into Parang’s hand.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('밧줄 없이 손을 넣는다', 'Reach in without a rope'),
          intent: 'fight',
          requires: { quest: { id: 'q_sea_shallows', stage: 1 } },
          check: { stat: 'str', dc: 13 },
          success: {
            text: t('물이 끌어당긴다. 버틴다. 목소리를 쥐고 물러난다. 남의 기억 몇 개가 함께 묻어 나온다.', 'The water drags at you. You hold. You back out clutching the voice, a few strangers’ memories clinging on.'),
            effects: [{ kind: 'quest', id: 'q_sea_shallows', stage: 2 }, { kind: 'hp', amount: -6 }],
          },
          failure: {
            text: t('물이 무릎을 꺾는다. 겨우 일어선다. 손은 비어 있다.', 'The water buckles your knees. You barely stand. Your hand is empty.'),
            effects: [{ kind: 'hp', amount: -6 }],
          },
        },
        {
          label: t('물에서 나온다', 'Get out of the water'),
          intent: 'leave',
          success: { text: t('웅성거림이 등 뒤에 남는다.', 'The murmuring stays behind you.') },
        },
      ],
    },
  },
}

export const D5_SEA_SHALLOWS_DIALOGUES: DialogueDef[] = [BONG, AERI, MOTHER, WATER]

export const D5_SEA_SHALLOWS_NPCS: NpcDef[] = [
  { id: 'rope_holder_bong', name: t('봉 씨', 'Mr. Bong'), role: t('여울에 들어간 사람의 밧줄을 붙잡는 사람', 'The man who holds the ropes of those who wade in'), faction: 'offgrid', portrait: 'v2/npcs/rope_holder_bong.webp' },
  { id: 'memory_fisher_aeri', name: t('애리', 'Ae-ri'), role: t('물에 빼앗긴 기억을 건지는 사람', 'A fisher of memories the water took'), faction: 'market', portrait: 'v2/npcs/memory_fisher_aeri.webp' },
]

export const D5_SEA_SHALLOWS_QUESTS: QuestDef[] = [{
  id: 'q_sea_shallows',
  title: t('회색 여울', 'The Gray Shallows'),
  stages: [
    t('아이의 목소리가 어디 가라앉았는지 알아낸다.', 'Find where the child’s voice sank.'),
    t('물에 빼앗기지 않고 목소리를 건져 온다.', 'Bring the voice back without being taken.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('목소리를 돌려받은 물이 당신 곁에서 머뭇거린다. 보스의 자리가 드러난다.', 'The water that gave back a voice hesitates around you. The boss’s position shows.') },
}]
