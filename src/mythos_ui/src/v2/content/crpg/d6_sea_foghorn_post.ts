// Unwritten Sea, Act 6 — The Foghorn Post (The Last Lighthouse). On the steel causeway to the lighthouse, the
// Keepers sound the foghorn in shifts like prayer, to push the gray tide back. Between blasts, the fog carries
// erased names. q_sea_foghorn: learn the old pattern the foghorn used before the Lightkeeper changed it (1) → sound
// it once, so the fog falls silent long enough to see where the Lightkeeper's lens turns (2) → intel.
// Keeper Hui (shift keeper), Buoy 7 (a channel-marker machine) or Seo-ha know the pattern; diver Kang trades salvage.
// One card picker at Kang; at most 25 credits district-wide. Prop: the foghorn.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D6_SEA_FOGHORN_POST: DistrictDef = {
  id: 'd6_sea_foghorn_post',
  act: 6,
  route: 'sea_6',
  name: t('무적 초소', 'The Foghorn Post'),
  image: 'v2/districts/d6_sea_foghorn_post.webp',
  intro: t(
    '등대로 가는 철탑 길 중간, 안개 속에 초소 하나가 있다. 등대단이 교대로 무적을 분다. 한 번 울릴 때마다 회색 조수가 한 뼘 물러난다. 울림 사이로 안개가 이름을 실어 온다.\n다음 교대가 오기 전, 세 곳을 들를 수 있다.',
    'Halfway along the steel causeway to the lighthouse, a post stands in the fog. The Keepers take turns sounding the foghorn. Each blast pushes the gray tide back a hand’s width. Between blasts, the fog carries names.\nThere is time for three stops before the next shift.',
  ),
  actions: 3,
  outro: t(
    '교대가 바뀐다. 새 근무자가 무적에 입을 댄다. 이번 울림은 조금 낮다.',
    'The shift changes. The new keeper puts their lips to the foghorn. This blast is a little lower.',
  ),
  pois: [
    { id: 'hui', name: t('무적 교대석', 'The Foghorn Seat'), blurb: t('기도하듯 분다.', 'Blown like a prayer.'), dialogue: 'd6fp_hui' },
    { id: 'buoy', name: t('부표 7호', 'Buoy 7'), blurb: t('옛 항로를 기억하는 기계.', 'A machine that remembers the old channel.'), dialogue: 'd6fp_buoy' },
    { id: 'kang', name: t('케이블 잠수부', 'The Cable Diver'), blurb: t('해저에서 건진 것들.', 'Things raised from the seabed.'), dialogue: 'd6fp_kang' },
    { id: 'horn', name: t('빈 무적', 'The Spare Foghorn'), blurb: t('아무도 불지 않는 나팔.', 'The horn nobody blows.'), dialogue: 'd6fp_horn' },
  ],
}

const HUI: DialogueDef = {
  id: 'd6fp_hui',
  npc: 'keeper_hui',
  start: 'seat',
  nodes: {
    seat: {
      speaker: 'keeper_hui',
      text: t(
        '희가 무적에서 입을 떼고 숨을 고른다. 입술이 갈라져 있다. “등대지기님이 정해 주신 박자예요. 길게 둘, 짧게 하나. 옛날엔 달랐대요. 아무도 기억 못 하지만.”',
        'Hui lowers the foghorn and catches her breath, lips cracked. “The beat the Lightkeeper set us. Two long, one short. It used to be different, they say. Nobody remembers.”',
      ),
      options: [
        {
          label: t('옛 박자를 아는 사람이 있는지 묻는다', 'Ask if anyone knows the old beat'),
          intent: 'ask',
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('희가 망설이다 낮게 말한다. “부표 7호가 가끔 다른 박자로 깜빡여요. 고장인 줄 알았는데.”', 'Hui hesitates, then says quietly. “Buoy 7 blinks a different beat sometimes. I thought it was broken.”'),
            effects: [{ kind: 'flag', key: 'sea_fp_hint' }],
          },
          failure: {
            text: t('“박자를 의심하면 안 돼요.” 희가 무적을 다시 문다. 다른 근무자가 당신을 본다.', '“You mustn’t doubt the beat.” She lifts the horn again. Another keeper looks your way.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('한 차례 대신 분다', 'Take one turn for her'),
          intent: 'offer',
          approval: { seo_ha: 1, mujin: 1 },
          success: {
            text: t('폐가 타들어 가는 것 같다. 조수가 한 뼘 물러난다. 희가 물병과 교대 수당을 건넨다.', 'Your lungs burn. The tide falls back a hand’s width. Hui hands you water and a shift wage.'),
            effects: [{ kind: 'credits', amount: 15 }, { kind: 'hp', amount: 4 }],
          },
        },
        {
          label: t('교대석을 떠난다', 'Leave the seat'),
          intent: 'leave',
          success: { text: t('길게 둘, 짧게 하나.', 'Two long, one short.') },
        },
      ],
    },
  },
}

const BUOY: DialogueDef = {
  id: 'd6fp_buoy',
  npc: 'buoy_seven',
  start: 'blink',
  nodes: {
    blink: {
      speaker: 'buoy_seven',
      text: t(
        '녹슨 항로 표지 부표가 철탑 기둥에 묶여 있다. 꼭대기 등이 느리게 깜빡인다. 짧게 셋, 길게 하나. 그리고 말한다. “옛 항로. 배가 다니던 때. 기억하는 건 나뿐.”',
        'A rusted channel-marker buoy is lashed to a causeway pillar. Its top lamp blinks slowly: three short, one long. Then it speaks. “The old channel. When ships ran. Only I remember.”',
      ),
      options: [
        {
          label: t('깜빡이는 박자를 받아 적는다', 'Write down the blinking beat'),
          intent: 'ask',
          check: { stat: 'obs', dc: 13 },
          success: {
            text: t('짧게 셋, 길게 하나. 무적의 박자와 정반대다. 등대지기가 바꾸기 전의 박자.', 'Three short, one long. The opposite of the foghorn’s beat. The beat from before the Lightkeeper changed it.'),
            effects: [{ kind: 'quest', id: 'q_sea_foghorn', stage: 1 }],
          },
          failure: {
            text: t('안개가 등을 가린다. 박자를 하나 놓친다.', 'Fog covers the lamp. You lose a beat.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('서하에게 옛 항로 신호를 묻는다', 'Ask Seo-ha about the old channel signals'),
          intent: 'ask',
          requires: { companion: 'seo_ha' },
          approval: { seo_ha: 2 },
          success: {
            text: t('서하가 눈을 감고 손가락으로 박자를 짚는다. “짧게 셋, 길게 하나. 입항 허가. 들어와도 된다는 뜻이었지.”', 'Seo-ha closes her eyes and taps the beat. “Three short, one long. Clear to enter. It meant you may come in.”'),
            effects: [{ kind: 'quest', id: 'q_sea_foghorn', stage: 1 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('부표를 지나친다', 'Pass the buoy'),
          intent: 'leave',
          success: { text: t('등이 계속 깜빡인다. 아무도 읽지 않는다.', 'The lamp keeps blinking. Nobody reads it.') },
        },
      ],
    },
  },
}

const KANG: DialogueDef = {
  id: 'd6fp_kang',
  npc: 'cable_diver_kang',
  start: 'ladder',
  nodes: {
    ladder: {
      speaker: 'cable_diver_kang',
      text: t(
        '강이 잠수복 지퍼를 내리며 사다리를 올라온다. 손에 해저 케이블 조각이 들려 있다. “밑에 다 쌓여 있어요. 지워진 것들. 건지는 족족 누군가 사 가요.”',
        'Kang climbs the ladder, unzipping a dive suit, a piece of seabed cable in hand. “It’s all piled up down there. Erased things. Whatever I bring up, someone buys.”',
      ),
      options: [
        {
          label: t('건져 온 것 중 하나를 고른다', 'Pick one thing from the haul'),
          intent: 'ask',
          success: {
            text: t('강이 젖은 꾸러미를 푼다. 싸움 기록 셋이 소금에 절어 있다. “하나만 가져가요.”', 'Kang unwraps a wet bundle. Three fight records, crusted with salt. “Take one.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('잠수 장비 정리를 돕는다', 'Help stow the dive gear'),
          intent: 'offer',
          success: {
            text: t('호스를 감고 추를 정리한다. 강이 품삯을 건넨다.', 'You coil the hoses and rack the weights. Kang pays you.'),
            effects: [{ kind: 'credits', amount: 10 }],
          },
        },
        {
          label: t('사다리를 떠난다', 'Leave the ladder'),
          intent: 'leave',
          success: { text: t('강이 다시 물속으로 내려간다.', 'Kang goes back down into the water.') },
        },
      ],
    },
  },
}

const HORN: DialogueDef = {
  id: 'd6fp_horn',
  start: 'spare',
  nodes: {
    spare: {
      text: t(
        '초소 구석, 먼지 앉은 예비 무적이 걸려 있다. 아무도 불지 않는다. 불면 안개 너머 등대의 렌즈가 이쪽을 볼 것이다.',
        'In a corner of the post hangs a dusty spare foghorn. Nobody blows it. Blow it, and the lighthouse lens beyond the fog will turn this way.',
      ),
      options: [
        {
          label: t('옛 박자로 한 번 분다', 'Sound it once in the old beat'),
          intent: 'offer',
          requires: { quest: { id: 'q_sea_foghorn', stage: 1 } },
          success: {
            text: t('짧게 셋, 길게 하나. 안개가 한순간 조용해진다. 등대 렌즈가 돌아가는 방향이 보인다. 그다음 무엇을 보는지도.', 'Three short, one long. The fog falls silent for a moment. You see which way the lighthouse lens turns, and what it looks at next.'),
            effects: [{ kind: 'quest', id: 'q_sea_foghorn', stage: 2 }],
          },
        },
        {
          label: t('희와 함께 두 나팔로 분다', 'Sound it together with Hui'),
          intent: 'offer',
          requires: { flag: 'sea_fp_hint', quest: { id: 'q_sea_foghorn', stage: 1 } },
          success: {
            text: t('두 나팔이 옛 박자를 맞춘다. 근무자들이 하나둘 고개를 든다. 희가 운다. “들어와도 된다는 뜻이었구나.”', 'Two horns keep the old beat together. The keepers look up one by one. Hui is crying. “So it meant you may come in.”'),
            effects: [{ kind: 'quest', id: 'q_sea_foghorn', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('무적을 그대로 둔다', 'Leave the horn'),
          intent: 'leave',
          success: { text: t('먼지가 그대로 앉아 있다.', 'The dust stays where it is.') },
        },
      ],
    },
  },
}

export const D6_SEA_FOGHORN_POST_DIALOGUES: DialogueDef[] = [HUI, BUOY, KANG, HORN]

export const D6_SEA_FOGHORN_POST_NPCS: NpcDef[] = [
  { id: 'keeper_hui', name: t('희', 'Hui'), role: t('기도하듯 무적을 부는 등대단 근무자', 'A Keeper who sounds the foghorn like a prayer'), faction: 'grid', portrait: 'v2/npcs/keeper_hui.webp' },
  { id: 'buoy_seven', name: t('부표 7호', 'Buoy 7'), role: t('옛 항로를 기억하는 항로 표지 기계', 'A channel-marker machine that remembers the old channel'), faction: 'offgrid', portrait: 'v2/npcs/buoy_seven.webp' },
  { id: 'cable_diver_kang', name: t('강', 'Kang'), role: t('해저 케이블에서 지워진 것을 건지는 잠수부', 'Diver who raises erased things from the seabed cables'), faction: 'market', portrait: 'v2/npcs/cable_diver_kang.webp' },
]

export const D6_SEA_FOGHORN_POST_QUESTS: QuestDef[] = [{
  id: 'q_sea_foghorn',
  title: t('무적 초소', 'The Foghorn Post'),
  stages: [
    t('등대지기가 바꾸기 전의 옛 박자를 알아낸다.', 'Learn the old beat from before the Lightkeeper changed it.'),
    t('옛 박자로 무적을 한 번 분다.', 'Sound the foghorn once in the old beat.'),
  ],
  payoff: { stage: 2, bossMod: 'intel', text: t('옛 박자에 안개가 걷힌 순간, 등대 렌즈가 어디를 볼지 알았다.', 'In the moment the old beat cleared the fog, you learned where the lens will look.') },
}]
