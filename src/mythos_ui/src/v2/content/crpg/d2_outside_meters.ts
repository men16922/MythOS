// Outside the List (DLC 2), Act 2 — The Meter Wall. Every flat in the back alley has a power meter on one shared
// wall; at meter hour a reader logs them, and any meter turning behind an off-list door flags that home for the
// Closing Crew. q_outside_meters: learn which meter gets flagged tonight (1) → make it read like an empty flat (2) →
// the alley's lights go out together in the boss fight and you know where the Crew stands (intel). Meter reader
// Misuk, the off-list electrician Gang, or Se-rin can help; pawnbroker Yeom holds a card picker. At most 25 credits.
// Prop: the meter wall.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_OUTSIDE_METERS: DistrictDef = {
  id: 'd2_outside_meters',
  act: 2,
  route: 'outside',
  name: t('계량기 벽', 'The Meter Wall'),
  image: 'v2/districts/d2_outside_meters.webp',
  intro: t(
    '뒷골목 집들의 전기 계량기가 벽 하나에 빼곡히 붙어 있다. 바늘이 도는 계량기는 누군가 그 안에서 살고 있다는 뜻이다. 명단에 없는 집이라면, 정리반이 올 이유가 된다.\n검침 시간이 되기 전, 세 곳을 들를 수 있다.',
    'The back alley’s power meters are packed onto a single wall. A turning dial means someone lives behind that door. If the home is off the list, that is reason enough for the Crew to come.\nThere is time for three stops before meter hour.',
  ),
  actions: 3,
  outro: t(
    '검침원의 손전등이 벽을 한 줄씩 훑는다. 바늘 하나가 멈춰 있다.',
    'The reader’s torch sweeps the wall row by row. One dial stands still.',
  ),
  pois: [
    { id: 'misuk', name: t('검침 가방', 'The Reader’s Satchel'), blurb: t('숫자를 적는 손.', 'The hand that writes the numbers.'), dialogue: 'd2om_misuk' },
    { id: 'gang', name: t('배전함', 'The Fuse Box'), blurb: t('선을 아는 사람.', 'Someone who knows the wires.'), dialogue: 'd2om_gang' },
    { id: 'yeom', name: t('전당포 창구', 'The Pawn Window'), blurb: t('맡기면 돈이 된다.', 'Leave it here, get cash.'), dialogue: 'd2om_yeom' },
    { id: 'wall', name: t('계량기 벽', 'The Meter Wall'), blurb: t('돌아가는 바늘 하나.', 'One dial still turning.'), dialogue: 'd2om_wall' },
  ],
}

const MISUK: DialogueDef = {
  id: 'd2om_misuk',
  npc: 'meter_reader_misuk',
  start: 'satchel',
  nodes: {
    satchel: {
      speaker: 'meter_reader_misuk',
      text: t(
        '미숙이 검침 가방을 고쳐 메고 볼펜 끝을 씹는다. “저는 숫자만 적어요. 정리반이 그 숫자로 뭘 하는지는… 알아요. 그래서 천천히 적어요.”',
        'Misuk shifts the satchel and chews her pen. “I just write the numbers. What the Crew does with them… I know. So I write slowly.”',
      ),
      options: [
        {
          label: t('오늘 걸릴 계량기를 묻는다', 'Ask which meter gets flagged tonight'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 12 },
          approval: { tae_o: 1 },
          success: {
            text: t('미숙이 장부를 슬쩍 기울인다. 7열 3번. 명단에 없는 집인데 바늘이 돈다. “제가 거기 갈 때까지 이십 분.”', 'Misuk tips the ledger your way. Row 7, number 3. Off the list, and its dial is turning. “Twenty minutes before I get there.”'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 1 }],
          },
          failure: {
            text: t('미숙이 장부를 덮는다. “말하면 제가 걸려요.” 무전기가 지직거린다.', 'Misuk shuts the ledger. “If I tell, I get flagged.” Her radio crackles.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('검침 가방을 들어 준다', 'Carry the satchel for her'),
          intent: 'offer',
          success: {
            text: t('미숙이 어깨를 돌리며 웃는다. 가방 앞주머니에서 사탕과 동전을 꺼내 준다.', 'Misuk rolls her shoulder and smiles, handing you sweets and coins from the front pocket.'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('검침원을 지나친다', 'Pass the reader'),
          intent: 'leave',
          success: { text: t('볼펜 딸깍 소리가 이어진다.', 'The pen keeps clicking.') },
        },
      ],
    },
  },
}

const GANG: DialogueDef = {
  id: 'd2om_gang',
  npc: 'electrician_gang',
  start: 'fuse',
  nodes: {
    fuse: {
      speaker: 'electrician_gang',
      text: t(
        '강 씨가 배전함 문을 열어 둔 채 전선을 만진다. 맨손이다. “명단 밖 집들 전기, 다 내가 따 준 거야. 바늘 하나쯤 멈추는 건 일도 아니지. 문제는 어느 바늘이냐고.”',
        'Gang has the fuse box open and handles the wires bare-handed. “Every off-list flat’s power, I tapped it. Stopping one dial is nothing. The question is which dial.”',
      ),
      options: [
        {
          label: t('배선을 따라 어느 집인지 찾는다', 'Trace the wiring to find the flat'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('강 씨가 손가락으로 선을 따라간다. 7열 3번. “우회선을 붙이면 바늘이 서. 대신 그 집 불은 내 선으로 켜지고.”', 'Gang follows a line with his finger. Row 7, number 3. “Splice a bypass and the dial stops. The flat runs off my line instead.”'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 1 }, { kind: 'flag', key: 'outside_om_bypass' }],
          },
          failure: {
            text: t('엉뚱한 선을 건드린다. 골목 가로등 하나가 펑 꺼진다.', 'You touch the wrong wire. A streetlight in the alley pops out.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('세린에게 우회선 붙이는 걸 맡긴다', 'Let Se-rin splice the bypass'),
          intent: 'offer',
          requires: { companion: 'se_rin' },
          approval: { se_rin: 2 },
          success: {
            text: t('세린이 강 씨보다 빨리 선을 벗긴다. 강 씨가 휘파람을 분다. “7열 3번이야. 거기 붙여.”', 'Se-rin strips the wire faster than Gang. He whistles. “Row 7, number 3. Hook it there.”'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 1 }, { kind: 'flag', key: 'outside_om_bypass' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('배전함을 떠난다', 'Leave the fuse box'),
          intent: 'leave',
          success: { text: t('불꽃 하나가 튄다.', 'One spark flies.') },
        },
      ],
    },
  },
}

const YEOM: DialogueDef = {
  id: 'd2om_yeom',
  npc: 'pawnbroker_yeom',
  start: 'window',
  nodes: {
    window: {
      speaker: 'pawnbroker_yeom',
      text: t(
        '쇠창살 너머 염 씨가 돋보기를 낀다. “명단 밖 사람들이 맡긴 물건이 제일 많아요. 찾으러 오는 사람은 제일 적고.”',
        'Behind the bars, Yeom puts on a loupe. “Off-list people pawn the most. And come back for it the least.”',
      ),
      options: [
        {
          label: t('주인 안 온 물건을 살펴본다', 'Look at what nobody came back for'),
          intent: 'ask',
          success: {
            text: t('염 씨가 낡은 장갑 셋을 창구에 놓는다. 손때가 다르다. “하나만 가져가요. 전당 기한이 오늘이라.”', 'Yeom sets three worn gloves on the counter, each worn differently. “Take one. Their pawn term ends today.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('“계량기 봉인 스티커 남는 거 있어요?”', '“Got any spare meter seal stickers?”'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          success: {
            text: t('염 씨가 돋보기를 벗는 사이 서랍에서 스티커 한 장이 당신 소매로 옮겨 간다. “고장” 표시다.', 'While Yeom takes off the loupe, a sticker moves from his drawer to your sleeve. A “faulty” seal.'),
            effects: [{ kind: 'flag', key: 'outside_om_sticker' }],
          },
          failure: {
            text: t('염 씨가 창살을 탁 친다. “그건 파는 게 아니에요.”', 'Yeom raps the bars. “That’s not for sale.”'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('염 씨와 업계 이야기를 나눈다', 'Talk shop with Yeom'),
          intent: 'offer',
          requires: { background: 'broker' },
          success: {
            text: t('염 씨가 돋보기를 벗는다. 중개인끼리 통하는 셈이 있다. 서랍에서 “고장” 스티커 한 장이 넘어온다.', 'Yeom takes off the loupe. Brokers understand each other’s sums. A “faulty” seal sticker comes out of the drawer.'),
            effects: [{ kind: 'flag', key: 'outside_om_sticker' }],
          },
        },
        {
          label: t('창구를 떠난다', 'Leave the window'),
          intent: 'leave',
          success: { text: t('돋보기에 불빛이 반짝인다.', 'Light glints off the loupe.') },
        },
      ],
    },
  },
}

const WALL: DialogueDef = {
  id: 'd2om_wall',
  start: 'dials',
  nodes: {
    dials: {
      text: t(
        '7열 3번. 바늘이 천천히 돈다. 문 너머에서 밥솥이 김을 뿜는 소리가 들린다. 검침원의 손전등이 세 줄 건너에 있다.',
        'Row 7, number 3. The dial turns slowly. Behind the door, a rice cooker hisses steam. The reader’s torch is three rows away.',
      ),
      options: [
        {
          label: t('강 씨의 우회선을 붙인다', 'Hook up Gang’s bypass'),
          intent: 'offer',
          requires: { flag: 'outside_om_bypass', quest: { id: 'q_outside_meters', stage: 1 } },
          success: {
            text: t('바늘이 멈춘다. 밥솥 소리는 계속된다. 골목의 다른 집들도 하나둘 강 씨 선으로 옮겨 탄다.', 'The dial stops. The rice cooker keeps hissing. One by one the alley’s other flats switch over to Gang’s line.'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 2 }, { kind: 'codex', id: 'lore_d_meter_hour' }],
          },
        },
        {
          label: t('“고장” 스티커를 붙인다', 'Stick on the “faulty” seal'),
          intent: 'sneak',
          requires: { flag: 'outside_om_sticker', quest: { id: 'q_outside_meters', stage: 1 } },
          success: {
            text: t('미숙의 손전등이 스티커에서 멈춘다. 그녀가 장부에 “고장, 측정 불가”라고 쓴다. 그리고 당신 쪽은 보지 않는다.', 'Misuk’s torch stops on the sticker. She writes “faulty, unreadable” in the ledger, and does not look your way.'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 2 }, { kind: 'codex', id: 'lore_d_meter_hour' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('문을 두드려 전기를 끄라고 한다', 'Knock and tell them to switch everything off'),
          intent: 'persuade',
          requires: { quest: { id: 'q_outside_meters', stage: 1 } },
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('밥솥이 꺼진다. 바늘이 선다. 문 너머에서 누군가 어둠 속에 숨을 죽인다.', 'The rice cooker goes off. The dial stops. Behind the door, someone holds their breath in the dark.'),
            effects: [{ kind: 'quest', id: 'q_outside_meters', stage: 2 }, { kind: 'codex', id: 'lore_d_meter_hour' }, { kind: 'trace', amount: 5 }],
          },
          failure: {
            text: t('대답이 없다. 바늘은 계속 돈다.', 'No answer. The dial keeps turning.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('벽을 떠난다', 'Leave the wall'),
          intent: 'leave',
          success: { text: t('바늘이 한 칸 더 간다.', 'The dial ticks one more notch.') },
        },
      ],
    },
  },
}

export const D2_OUTSIDE_METERS_DIALOGUES: DialogueDef[] = [MISUK, GANG, YEOM, WALL]

export const D2_OUTSIDE_METERS_NPCS: NpcDef[] = [
  { id: 'meter_reader_misuk', name: t('미숙', 'Misuk'), role: t('일부러 천천히 적는 검침원', 'Meter reader who writes slowly on purpose'), faction: 'grid', portrait: 'v2/npcs/meter_reader_misuk.webp' },
  { id: 'electrician_gang', name: t('강 씨', 'Mr. Gang'), role: t('명단 밖 집들에 전기를 따 준 전기공', 'Electrician who tapped power for the off-list flats'), faction: 'offgrid', portrait: 'v2/npcs/electrician_gang.webp' },
  { id: 'pawnbroker_yeom', name: t('염 씨', 'Mr. Yeom'), role: t('명단 밖 사람들의 물건을 맡아 둔 전당포 주인', 'Pawnbroker holding the off-list people’s things'), faction: 'market', portrait: 'v2/npcs/pawnbroker_yeom.webp' },
]

export const D2_OUTSIDE_METERS_QUESTS: QuestDef[] = [{
  id: 'q_outside_meters',
  title: t('계량기 벽', 'The Meter Wall'),
  stages: [
    t('오늘 밤 걸릴 계량기를 알아낸다.', 'Find out which meter gets flagged tonight.'),
    t('그 계량기를 빈집처럼 보이게 한다.', 'Make that meter read like an empty flat.'),
  ],
  payoff: { stage: 2, bossMod: 'intel', text: t('골목 불이 한꺼번에 꺼진 사이, 정리반이 어디 서 있는지 먼저 본다.', 'In the moment the alley’s lights all go out together, you see where the Crew stands first.') },
}]
