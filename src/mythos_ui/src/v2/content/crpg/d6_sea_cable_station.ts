// Unwritten Sea, Act 6 — The Cable Station (The Last Lighthouse). Where the seabed cables come ashore, the Keepers run
// a relay that pushes whatever IX erases back out into the tide before it can surface. One relay keeps failing because
// a single record keeps resending itself: a letter someone wrote to the Lightkeeper. q_sea_cable: find the record
// that will not go away (1) → deliver it instead of pushing it out (2) → the Lightkeeper's light falters when it
// matters (marked). Relay tech Ryu, the old splicer machine Knot, or Seo-ha know the way; Ryu's spares hold a card
// picker. At most 20 credits. Prop: the lighthouse lens (seen through the relay window).
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_SEA_CABLE_STATION: DistrictDef = {
  id: 'd6_sea_cable_station',
  act: 6,
  route: 'sea_6',
  name: t('케이블 기지', 'The Cable Station'),
  image: 'v2/districts/d6_sea_cable_station.webp',
  intro: t(
    '해저 케이블이 뭍으로 올라오는 자리에 등대단의 중계 기지가 있다. IX가 지운 것들이 케이블을 타고 오면, 여기서 다시 바다로 밀어낸다. 중계기 하나가 계속 경고음을 낸다.\n교대 점검이 오기 전, 세 곳을 들를 수 있다.',
    'Where the seabed cables come ashore, the Keepers run a relay station. What IX erases arrives along the cables, and here it is pushed back out to sea. One relay keeps sounding a warning.\nThere is time for three stops before the shift inspection.',
  ),
  actions: 3,
  outro: t(
    '점검반의 손전등이 계단을 내려온다. 창밖, 등대 렌즈가 한 바퀴를 돈다.',
    'The inspection team’s torches come down the stairs. Outside the window, the lighthouse lens makes one turn.',
  ),
  pois: [
    { id: 'ryu', name: t('중계 콘솔', 'The Relay Console'), blurb: t('밀어내는 게 일.', 'Pushing out is the job.'), dialogue: 'd6cs_ryu' },
    { id: 'knot', name: t('접속기 매듭', 'Knot the Splicer'), blurb: t('케이블을 이어 붙이던 기계.', 'The machine that used to splice cables.'), dialogue: 'd6cs_knot' },
    { id: 'relay', name: t('경고음 중계기', 'The Alarming Relay'), blurb: t('같은 기록이 돌아온다.', 'The same record keeps coming back.'), dialogue: 'd6cs_relay' },
    { id: 'window', name: t('렌즈 창', 'The Lens Window'), blurb: t('등대가 정면으로 보인다.', 'The lighthouse, straight ahead.'), dialogue: 'd6cs_window' },
  ],
}

const RYU: DialogueDef = {
  id: 'd6cs_ryu',
  npc: 'relay_tech_ryu',
  start: 'console',
  nodes: {
    console: {
      speaker: 'relay_tech_ryu',
      text: t(
        '류가 콘솔의 같은 버튼을 세 번째로 누른다. “7번 중계기. 기록 하나가 밀어내도 밀어내도 돌아와요. 크기도 작아요. 편지 한 장 정도. 근데 수신인이… 등대지기님이에요.”',
        'Ryu presses the same console button for the third time. “Relay 7. One record keeps coming back however often I push it out. Small, too. About one letter. But the addressee is… the Lightkeeper.”',
      ),
      options: [
        {
          label: t('그 기록을 밀어내지 말고 꺼내 보자고 한다', 'Suggest pulling the record out instead of pushing it away'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('류가 망설이다 버튼에서 손을 뗀다. “…읽기만 해요. 규정 위반은 제가 안 본 걸로.” 7번 중계기의 잠금이 풀린다.', 'Ryu hesitates, then takes his hand off the button. “…Just read it. I didn’t see the breach.” Relay 7 unlocks.'),
            effects: [{ kind: 'quest', id: 'q_sea_cable', stage: 1 }],
          },
          failure: {
            text: t('“등대단은 밀어냅니다.” 류가 버튼을 네 번째로 누른다. 점검반 호출등이 켜진다.', '“The Keepers push it out.” Ryu presses the button a fourth time. The inspection call light comes on.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('예비 부품 상자를 뒤진다', 'Go through the spares crate'),
          intent: 'ask',
          success: {
            text: t('부품 사이에 전 근무자가 남긴 전투 기록 칩 셋. 류가 어깨를 으쓱한다. “하나 가져가요.”', 'Among the spares, three combat-log chips a previous shift left. Ryu shrugs. “Take one.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('콘솔을 떠난다', 'Leave the console'),
          intent: 'leave',
          success: { text: t('경고음이 계속된다.', 'The warning keeps sounding.') },
        },
      ],
    },
  },
}

const KNOT: DialogueDef = {
  id: 'd6cs_knot',
  npc: 'splicer_knot',
  start: 'coil',
  nodes: {
    coil: {
      speaker: 'splicer_knot',
      text: t(
        '케이블 더미 위에 낡은 접속 기계가 웅크리고 있다. 팔 끝이 매듭 모양이다. “나는 잇는 기계. 등대단은 끊으라고 해. 7번은 내가 이어 둔 거야. 그 편지는 도착해야 해.”',
        'An old splicing machine crouches on a pile of cable, its arms ending in knots. “I am a joining machine. The Keepers tell me to cut. Relay 7 is one I joined. That letter should arrive.”',
      ),
      options: [
        {
          label: t('편지가 어디로 가야 하는지 묻는다', 'Ask where the letter is meant to go'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('매듭이 케이블 하나를 짚는다. 등대 렌즈실로 바로 올라가는 선이다. “렌즈 옆 단말. 등대지기는 거기서 읽어.”', 'Knot taps one cable: a line running straight up to the lens room. “The terminal by the lens. The Lightkeeper reads there.”'),
            effects: [{ kind: 'quest', id: 'q_sea_cable', stage: 1 }, { kind: 'flag', key: 'sea_cs_line' }],
          },
          failure: {
            text: t('매듭이 엉뚱한 케이블을 집어 든다. 스파크가 튄다.', 'Knot picks up the wrong cable. Sparks fly.'),
            effects: [{ kind: 'hp', amount: -4 }],
          },
        },
        {
          label: t('서하에게 옛 항만 배선도를 떠올려 보게 한다', 'Ask Seo-ha to recall the old harbor wiring'),
          intent: 'ask',
          requires: { companion: 'seo_ha' },
          approval: { seo_ha: 2 },
          success: {
            text: t('서하가 손가락으로 공중에 선을 긋는다. “항만 관제가 등대에 직접 보고하던 선. 아직 살아 있다면.” 매듭이 그 선을 들어 보인다.', 'Seo-ha traces lines in the air. “The line harbor control used to report straight to the lighthouse. If it still lives.” Knot holds up exactly that cable.'),
            effects: [{ kind: 'quest', id: 'q_sea_cable', stage: 1 }, { kind: 'flag', key: 'sea_cs_line' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('매듭을 지나친다', 'Pass Knot by'),
          intent: 'leave',
          success: { text: t('매듭이 다음 케이블을 이어 붙인다.', 'Knot splices the next cable.') },
        },
      ],
    },
  },
}

const RELAY: DialogueDef = {
  id: 'd6cs_relay',
  start: 'alarm',
  nodes: {
    alarm: {
      text: t(
        '7번 중계기의 화면에 편지 한 장이 반복해서 뜬다. 첫 줄만 읽힌다. “등대지기님께. 저희는 바다를 보고 싶었을 뿐입니다.”',
        'Relay 7’s screen shows the same letter over and over. Only the first line is legible. “To the Lightkeeper. We only wanted to see the sea.”',
      ),
      options: [
        {
          label: t('렌즈실 선으로 편지를 보낸다', 'Send the letter up the lens-room line'),
          intent: 'offer',
          requires: { flag: 'sea_cs_line', quest: { id: 'q_sea_cable', stage: 1 } },
          success: {
            text: t('경고음이 멎는다. 창밖 등대의 빛이 한순간 흔들린다. 누군가 편지를 읽고 있다.', 'The warning stops. Outside, the lighthouse light wavers for a moment. Someone is reading.'),
            effects: [{ kind: 'quest', id: 'q_sea_cable', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('편지를 출력해 직접 들고 간다', 'Print the letter and carry it yourself'),
          intent: 'offer',
          requires: { quest: { id: 'q_sea_cable', stage: 1 } },
          check: { stat: 'agi', dc: 12 },
          success: {
            text: t('젖은 종이 한 장이 출력기에서 나온다. 품에 넣는다. 등대지기를 만날 때 꺼낼 것이다.', 'A damp sheet slides out of the printer. You tuck it inside your coat, to take out when you meet the Lightkeeper.'),
            effects: [{ kind: 'quest', id: 'q_sea_cable', stage: 2 }, { kind: 'trace', amount: 4 }],
          },
          failure: {
            text: t('출력기가 종이를 씹는다. 경고음이 두 배로 커진다.', 'The printer chews the paper. The warning doubles in volume.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('중계기를 두고 간다', 'Leave the relay'),
          intent: 'leave',
          success: { text: t('편지가 또 한 번 밀려나고, 또 한 번 돌아온다.', 'The letter is pushed out once more, and comes back once more.') },
        },
      ],
    },
  },
}

const WINDOW: DialogueDef = {
  id: 'd6cs_window',
  start: 'lens',
  nodes: {
    lens: {
      text: t(
        '중계 기지 창으로 등대가 정면에 보인다. 렌즈가 돈다. 일정한 박자로, 한 번도 쉬지 않고.',
        'Through the station window the lighthouse stands straight ahead. The lens turns. A steady beat, never once resting.',
      ),
      options: [
        {
          label: t('렌즈가 도는 박자를 센다', 'Count the lens’s turning beat'),
          intent: 'ask',
          check: { stat: 'obs', dc: 12 },
          success: {
            text: t('스물셋을 세면 한 바퀴. 스물셋째마다 빛이 반 박자 늦는다. 지친 기계의 박자다.', 'A full turn every twenty-three counts; on every twenty-third the light lags half a beat. The rhythm of a tired machine.'),
            effects: [{ kind: 'trace', amount: -4 }, { kind: 'inspiration', amount: 1 }],
          },
          failure: {
            text: t('빛이 눈을 찌른다. 한동안 아무것도 안 보인다.', 'The light stabs your eyes. For a while you see nothing.'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('창가에서 숨을 고른다', 'Catch your breath at the window'),
          intent: 'offer',
          success: {
            text: t('빛이 지나갈 때마다 바다가 잠깐 보인다. 처음 보는 바다다.', 'Each time the light sweeps past, the sea shows for a moment. A sea you have never seen before.'),
            effects: [{ kind: 'hp', amount: 6 }],
          },
        },
        {
          label: t('창을 떠난다', 'Leave the window'),
          intent: 'leave',
          success: { text: t('렌즈는 계속 돈다.', 'The lens keeps turning.') },
        },
      ],
    },
  },
}

export const D6_SEA_CABLE_STATION_DIALOGUES: DialogueDef[] = [RYU, KNOT, RELAY, WINDOW]

export const D6_SEA_CABLE_STATION_NPCS: NpcDef[] = [
  { id: 'relay_tech_ryu', name: t('류', 'Ryu'), role: t('지워진 기록을 바다로 밀어내는 등대단 중계 기사', 'Keepers’ relay tech who pushes erased records back to sea'), faction: 'grid', portrait: 'v2/npcs/relay_tech_ryu.webp' },
  { id: 'splicer_knot', name: t('매듭', 'Knot'), role: t('끊으라는 명령에도 케이블을 잇는 접속 기계', 'A splicing machine that joins cables though told to cut'), faction: 'offgrid', portrait: 'v2/npcs/splicer_knot.webp' },
]

export const D6_SEA_CABLE_STATION_QUESTS: QuestDef[] = [{
  id: 'q_sea_cable',
  title: t('케이블 기지', 'The Cable Station'),
  stages: [
    t('밀어내도 돌아오는 기록을 찾는다.', 'Find the record that keeps coming back.'),
    t('그 편지를 등대지기에게 전한다.', 'Deliver the letter to the Lightkeeper.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('편지를 읽은 등대지기의 빛이 결정적인 순간 반 박자 늦는다.', 'Having read the letter, the Lightkeeper’s light lags half a beat when it matters.') },
}]
