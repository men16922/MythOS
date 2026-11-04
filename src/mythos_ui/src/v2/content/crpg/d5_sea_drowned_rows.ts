// Unwritten Sea, Act 5 — The Drowned Rows (The Tide Line). A reclamation housing estate the gray tide floods twice a
// day. Between tides people come back to their flooded flats; anyone the tide touches wakes with a stranger's
// memories. A Residue figure in a soaked school uniform knocks at one door every low tide, asking for its own name.
// q_sea_rows: find whose door it knocks at (1) → give it a name to go by (2) → the Residue in the boss fight hesitate
// (weaken). Warden Ha (the estate's unofficial warden), the tide-touched man Seok, or Parang know; the flat at the
// end holds a card picker. At most 20 credits. Prop: the wet roster.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D5_SEA_DROWNED_ROWS: DistrictDef = {
  id: 'd5_sea_drowned_rows',
  act: 5,
  route: 'sea_5',
  name: t('잠긴 동네', 'The Drowned Rows'),
  image: 'v2/districts/d5_sea_drowned_rows.webp',
  intro: t(
    '매립지 주택가는 하루 두 번 물에 잠긴다. 썰물이면 사람들이 젖은 집으로 돌아와 가구를 말린다. 복도 끝에서 젖은 교복을 입은 형체가 한 집 문을 두드린다.\n다음 밀물까지, 세 곳을 들를 수 있다.',
    'The reclamation estate floods twice a day. At low tide people come back to their soaked flats and set the furniture out to dry. At the end of a corridor, a figure in a wet school uniform knocks on one door.\nThere is time for three stops before the next flood.',
  ),
  actions: 3,
  outro: t(
    '밀물이 계단을 한 칸씩 올라온다. 두드리는 소리가 잦아든다.',
    'The flood climbs the stairs one step at a time. The knocking fades.',
  ),
  pois: [
    { id: 'ha', name: t('관리실', 'The Warden’s Room'), blurb: t('젖은 입주자 명부.', 'A wet tenants’ roster.'), dialogue: 'd5dr_ha' },
    { id: 'seok', name: t('2층 베란다', 'The Second-Floor Balcony'), blurb: t('남의 기억을 말리는 남자.', 'A man drying someone else’s memories.'), dialogue: 'd5dr_seok' },
    { id: 'flat', name: t('끝집', 'The End Flat'), blurb: t('아무도 안 돌아온 집.', 'Nobody came back to this one.'), dialogue: 'd5dr_flat' },
    { id: 'door', name: t('두드리는 문', 'The Knocked Door'), blurb: t('밀물마다 같은 문.', 'The same door every tide.'), dialogue: 'd5dr_door' },
  ],
}

const HA: DialogueDef = {
  id: 'd5dr_ha',
  npc: 'warden_ha',
  start: 'room',
  nodes: {
    room: {
      speaker: 'warden_ha',
      text: t(
        '하 관리인이 젖은 명부를 한 장씩 빨랫줄에 넌다. “아무도 날 뽑진 않았어요. 그냥 명부를 말리다 보니 관리인이 됐지. 저 교복 애? 밀물마다 404호를 두드려요.”',
        'Warden Ha hangs a wet roster on a line, page by page. “Nobody elected me. I just kept drying the roster and became the warden. That kid in the uniform? Knocks on 404 every tide.”',
      ),
      options: [
        {
          label: t('404호에 누가 살았는지 명부에서 찾는다', 'Look up who lived in 404'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('번진 잉크 아래 성 하나가 남았다. 이름 칸은 비어 있다. 하가 말한다. “이름은 물이 가져갔나 봐.”', 'Under the smeared ink, a surname survives. The given-name box is blank. Ha says, “The water must have taken the name.”'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 1 }],
          },
          failure: {
            text: t('명부 장이 손에서 찢어진다. 하가 한숨을 쉰다. 복도 카메라가 깜빡인다.', 'The page tears in your hands. Ha sighs. A corridor camera blinks.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('가구 말리는 걸 돕는다', 'Help set furniture out to dry'),
          intent: 'offer',
          approval: { mujin: 1 },
          success: {
            text: t('소파 둘, 장롱 하나. 하가 고맙다며 관리비 통에서 동전을 꺼낸다.', 'Two sofas, one wardrobe. Ha thanks you with coins from the maintenance tin.'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('404호의 진료 카드를 찾아본다', 'Look for 404’s clinic card'),
          intent: 'ask',
          requires: { background: 'medic' },
          success: {
            text: t('관리실 구급함에 젖은 진료 카드가 있다. 이름 칸은 비었고 성만 남았다. 의료인의 눈엔 그걸로 충분하다.', 'In the warden’s first-aid box, a soaked clinic card: the given name blank, only the surname left. To a medic’s eye, that is enough.'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 1 }],
          },
        },
        {
          label: t('관리실을 나온다', 'Leave the room'),
          intent: 'leave',
          success: { text: t('명부가 빨랫줄에서 뚝뚝 떨어진다.', 'The roster drips on its line.') },
        },
      ],
    },
  },
}

const SEOK: DialogueDef = {
  id: 'd5dr_seok',
  npc: 'tide_touched_seok',
  start: 'balcony',
  nodes: {
    balcony: {
      speaker: 'tide_touched_seok',
      text: t(
        '석이 베란다 난간에 기대 젖은 사진을 말린다. 그의 가족 사진이 아니다. “지난 밀물에 발목까지 잠겼거든요. 그 뒤로 남의 집 저녁 메뉴가 기억나요. 교복 입은 애가 학교에서 혼나던 것도.”',
        'Seok leans on the balcony rail drying wet photos. Not of his family. “The last flood got me to the ankle. Since then I remember other people’s dinners. A kid in a uniform getting told off at school, too.”',
      ),
      options: [
        {
          label: t('그 아이가 뭐라고 불렸는지 묻는다', 'Ask what the kid was called'),
          intent: 'ask',
          check: { stat: 'cha', dc: 12 },
          success: {
            text: t('석이 눈을 감는다. “선생님이 출석을 부를 때… 이름 대신 번호로 불렀어요. 십칠 번.” 아이의 이름은 그의 기억에도 없다.', 'Seok closes his eyes. “When the teacher took the register… a number, not a name. Seventeen.” Even his borrowed memory has no name for the kid.'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 1 }],
          },
          failure: {
            text: t('석이 다른 사람의 기억을 하나 더 꺼낸다. 길고, 슬프고, 아무 관계가 없다.', 'Seok brings up another stranger’s memory. Long, sad and unrelated.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('파랑에게 이야기해 보게 한다', 'Let Parang talk with him'),
          intent: 'ask',
          requires: { companion: 'parang' },
          approval: { parang: 2 },
          success: {
            text: t('파랑과 석이 서로 남의 기억을 주고받는다. 파랑이 말한다. “그 애는 이름이 없었어. 지워지기 전부터.”', 'Parang and Seok trade borrowed memories. Parang says, “That kid had no name. Even before being erased.”'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 1 }, { kind: 'flag', key: 'sea_dr_parang' }],
          },
        },
        {
          label: t('베란다를 떠난다', 'Leave the balcony'),
          intent: 'leave',
          success: { text: t('사진이 바람에 한 장 날아간다.', 'One photo blows away.') },
        },
      ],
    },
  },
}

const FLAT: DialogueDef = {
  id: 'd5dr_flat',
  start: 'empty',
  nodes: {
    empty: {
      text: t(
        '끝집 문이 열려 있다. 아무도 돌아오지 않았다. 식탁 위에 물에 불은 공책 세 권이 놓여 있다. 누군가 싸움 연습을 적어 둔 공책이다.',
        'The end flat’s door is open. Nobody came back. On the table, three swollen notebooks. Someone wrote down fight drills in them.',
      ),
      options: [
        {
          label: t('공책 하나를 챙긴다', 'Take one notebook'),
          intent: 'ask',
          success: {
            text: t('물이 덜 든 한 권. 마지막 장에 “다음 밀물 전에”라고 적혀 있다.', 'The least soaked one. The last page says, “Before the next flood.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('문을 닫아 준다', 'Close the door for them'),
          intent: 'offer',
          approval: { seo_ha: 1 },
          success: {
            text: t('문이 닫힌다. 복도가 조금 조용해진다.', 'The door shuts. The corridor grows a little quieter.'),
            effects: [{ kind: 'trace', amount: -3 }],
          },
        },
        {
          label: t('끝집을 떠난다', 'Leave the end flat'),
          intent: 'leave',
          success: { text: t('물방울이 식탁에서 떨어진다.', 'Water drips off the table.') },
        },
      ],
    },
  },
}

const DOOR: DialogueDef = {
  id: 'd5dr_door',
  npc: 'uniform_residue',
  start: 'knock',
  nodes: {
    knock: {
      speaker: 'uniform_residue',
      text: t(
        '젖은 교복의 형체가 404호 문을 두드리다 돌아본다. 얼굴이 물속처럼 흔들린다. “안에 있는 사람이 날 불러 줘야 들어갈 수 있어. 근데 아무도 내 이름을 몰라.”',
        'The figure in the wet uniform stops knocking on 404 and turns. Its face wavers like something underwater. “Someone inside has to call me before I can go in. But nobody knows my name.”',
      ),
      options: [
        {
          label: t('명부에 남은 성으로 불러 준다', 'Call it by the surname left in the roster'),
          intent: 'offer',
          requires: { quest: { id: 'q_sea_rows', stage: 1 } },
          success: {
            text: t('형체가 그 성을 따라 말한다. 두드리던 손이 내려간다. 404호 문이 안에서 조금 열린다.', 'The figure repeats the surname. Its knocking hand drops. Door 404 opens a little from inside.'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 2 }],
          },
        },
        {
          label: t('파랑이 새 이름을 지어 준다', 'Let Parang give it a new name'),
          intent: 'offer',
          requires: { flag: 'sea_dr_parang', quest: { id: 'q_sea_rows', stage: 1 } },
          approval: { parang: 1 },
          success: {
            text: t('파랑이 조용히 이름 하나를 말한다. 형체가 그 이름으로 처음 웃는다. “이제 들어가도 돼?”', 'Parang quietly says a name. The figure smiles for the first time under it. “Can I go in now?”'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('“십칠 번”이라고 부른다', 'Call it “Seventeen”'),
          intent: 'offer',
          requires: { quest: { id: 'q_sea_rows', stage: 1 } },
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('형체가 잠깐 굳는다. 그리고 고개를 끄덕인다. “번호라도. 불러 줬으니까.”', 'The figure freezes for a moment, then nods. “A number, even. Someone called it.”'),
            effects: [{ kind: 'quest', id: 'q_sea_rows', stage: 2 }],
          },
          failure: {
            text: t('형체가 뒷걸음질 친다. 복도 물이 갑자기 차오른다.', 'The figure backs away. The corridor water suddenly rises.'),
            effects: [{ kind: 'hp', amount: -5 }],
          },
        },
        {
          label: t('두드리게 둔다', 'Let it keep knocking'),
          intent: 'leave',
          success: { text: t('똑, 똑. 밀물이 올 때까지.', 'Knock, knock. Until the flood comes.') },
        },
      ],
    },
  },
}

export const D5_SEA_DROWNED_ROWS_DIALOGUES: DialogueDef[] = [HA, SEOK, FLAT, DOOR]

export const D5_SEA_DROWNED_ROWS_NPCS: NpcDef[] = [
  { id: 'warden_ha', name: t('하 관리인', 'Warden Ha'), role: t('젖은 명부를 말리다 관리인이 된 주민', 'A resident who became warden by drying the roster'), faction: 'offgrid', portrait: 'v2/npcs/warden_ha.webp' },
  { id: 'tide_touched_seok', name: t('석', 'Seok'), role: t('조수에 닿아 남의 기억을 떠안은 남자', 'A man the tide touched, carrying strangers’ memories'), faction: 'offgrid', portrait: 'v2/npcs/tide_touched_seok.webp' },
  { id: 'uniform_residue', name: t('교복 입은 형체', 'The Figure in Uniform'), role: t('밀물마다 같은 문을 두드리는 잔류물', 'A Residue figure that knocks on the same door every tide'), faction: 'offgrid', portrait: 'v2/npcs/uniform_residue.webp' },
]

export const D5_SEA_DROWNED_ROWS_QUESTS: QuestDef[] = [{
  id: 'q_sea_rows',
  title: t('잠긴 동네', 'The Drowned Rows'),
  stages: [
    t('교복 입은 형체가 누구인지 알아낸다.', 'Find out who the figure in uniform was.'),
    t('그 형체를 불러 줄 이름을 준다.', 'Give the figure a name to be called by.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('이름을 얻은 잔류물이 생긴다는 소문에, 보스 곁의 잔류물들이 머뭇거린다.', 'Word that a Residue was given a name makes the Residue at the boss’s side hesitate.') },
}]
