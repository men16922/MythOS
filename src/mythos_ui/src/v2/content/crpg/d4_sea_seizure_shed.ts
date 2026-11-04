// Unwritten Sea, Act 4 — The Seizure Shed (The Dry Harbor). Customs Enforcement keeps what it seizes in a shed of
// numbered tags; one locker holds the longshore crew's shift clock, seized "for having no ship to time".
// q_sea_seizure: learn which locker (1) → get the clock back to the crew (2) → the crew opens the customs back gate
// for the boss fight, so you see the Commissioner first (marked). Inspector No (papers), Boram (youngest of the crew) or Mujin show the locker;
// the clock can be signed out, lifted, or swapped. One card picker at the auction rail; at most 25 credits.
// Prop: seizure tags (bible: one prop per scene).
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D4_SEA_SEIZURE_SHED: DistrictDef = {
  id: 'd4_sea_seizure_shed',
  act: 4,
  route: 'sea_4',
  name: t('압류 창고', 'The Seizure Shed'),
  image: 'v2/districts/d4_sea_seizure_shed.webp',
  intro: t(
    '세관 창고 안, 선반마다 노란 압류 딱지가 붙은 물건이 줄지어 있다. 우산, 신발 한 짝, 아이 도시락통. 딱지마다 번호와 사유가 적혀 있다.\n검수 종이 울리기 전, 세 곳을 들를 수 있다.',
    'Inside the customs shed, every shelf is lined with things wearing yellow seizure tags. An umbrella, one shoe, a child’s lunchbox. Each tag has a number and a reason.\nThere is time for three stops before the inspection bell rings.',
  ),
  actions: 3,
  outro: t(
    '검수 종이 울린다. 선반 하나에서 딱지 한 장이 떨어져 바닥을 쓸고 간다.',
    'The inspection bell rings. One tag falls from a shelf and skates across the floor.',
  ),
  pois: [
    { id: 'desk', name: t('검수대', 'The Inspection Desk'), blurb: t('모든 압류엔 사유가 있다.', 'Every seizure has a reason.'), dialogue: 'd4ss_no' },
    { id: 'boram', name: t('하역조 막내', 'The Youngest Hand'), blurb: t('교대 시간을 잃어버렸다.', 'Lost the shift times.'), dialogue: 'd4ss_boram' },
    { id: 'rail', name: t('경매 난간', 'The Auction Rail'), blurb: t('주인 없는 압류품이 팔린다.', 'Unclaimed seizures, sold.'), dialogue: 'd4ss_rail' },
    { id: 'locker', name: t('412번 사물함', 'Locker 412'), blurb: t('안에서 째깍거린다.', 'Something ticks inside.'), dialogue: 'd4ss_locker' },
  ],
}

const NO: DialogueDef = {
  id: 'd4ss_no',
  npc: 'customs_inspector_no',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'customs_inspector_no',
      text: t(
        '노 검수원이 딱지 묶음을 가지런히 맞춘다. “압류 사유를 확인하시겠습니까? 412번. 하역조 교대 시계. 사유: 정박할 선박 없음.” 그가 고개를 든다. “시간을 잴 배가 없으니까요.”',
        'Inspector No squares a stack of tags. “Would you like to confirm a seizure reason? Number 412. Longshore shift clock. Reason: no vessel to berth.” He looks up. “There is no ship to time.”',
      ),
      options: [
        {
          label: t('반환 신청서를 쓴다', 'Fill in a return form'),
          intent: 'persuade',
          check: { stat: 'int', dc: 13 },
          success: {
            text: t('칸을 하나도 비우지 않고 채운다. 노가 도장을 찍는다. “서류는 서류입니다.” 412번 열쇠 번호를 불러 준다.', 'You fill every box. No stamps it. “A form is a form.” He reads out the key number for 412.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 1 }, { kind: 'flag', key: 'sea_ss_form' }],
          },
          failure: {
            text: t('서명란을 하나 빠뜨린다. 노가 서류를 반려하고, 당신 이름을 장부에 적는다.', 'You miss one signature box. No returns the form and writes your name in the ledger.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('딱지 정리를 돕는다', 'Help sort the tags'),
          intent: 'offer',
          success: {
            text: t('번호순으로 딱지를 맞춘다. 노가 처음으로 웃는다. “수고비입니다. 규정대로.”', 'You put the tags in number order. No smiles for the first time. “Your fee. As regulated.”'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('집행 절차 용어로 반환을 요청한다', 'Request the return in enforcement procedure terms'),
          intent: 'ask',
          requires: { background: 'enforcer' },
          success: {
            text: t('노 검수원이 당신 말투를 알아듣는다. “동업자시군요.” 반환 서식과 412번 열쇠 번호가 함께 나온다.', 'Inspector No recognises the way you talk. “A colleague, I see.” The return form and the key number for 412 come out together.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 1 }, { kind: 'flag', key: 'sea_ss_form' }],
          },
        },
        {
          label: t('검수대를 떠난다', 'Leave the desk'),
          intent: 'leave',
          success: { text: t('딱지 넘기는 소리가 이어진다.', 'The tags keep turning.') },
        },
      ],
    },
  },
}

const BORAM: DialogueDef = {
  id: 'd4ss_boram',
  npc: 'longshore_boram',
  start: 'crate',
  nodes: {
    crate: {
      speaker: 'longshore_boram',
      text: t(
        '보람이 빈 컨테이너에 걸터앉아 손목을 본다. 시계가 없다. “반장님 시계가 압류됐어요. 그게 없으면 교대를 몰라요. 배가 안 와도 교대는 지켜야 하는데.”',
        'Boram sits on an empty container, looking at a bare wrist. “They seized the foreman’s clock. Without it we don’t know the shifts. Even with no ship, we keep the shifts.”',
      ),
      options: [
        {
          label: t('어느 사물함인지 묻는다', 'Ask which locker'),
          intent: 'ask',
          success: {
            text: t('“사백십이. 딱지 붙일 때 봤어요.” 보람이 손가락으로 4, 1, 2를 그린다.', '“Four-twelve. I saw them tag it.” Boram draws 4, 1, 2 in the air.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 1 }],
          },
        },
        {
          label: t('무진에게 교대 시간을 대신 불러 주게 한다', 'Ask Mujin to call the shifts for now'),
          intent: 'offer',
          requires: { companion: 'mujin' },
          approval: { mujin: 2 },
          success: {
            text: t('무진이 짧게 말한다. “여섯 시. 열두 시. 여섯 시.” 보람이 따라 외운다. 무진이 412번 쪽으로 턱짓한다.', 'Mujin says it short. “Six. Twelve. Six.” Boram repeats it. Mujin nods toward 412.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 1 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('보람을 쉬게 둔다', 'Let Boram rest'),
          intent: 'leave',
          success: { text: t('보람이 다시 손목을 본다.', 'Boram looks at the bare wrist again.') },
        },
      ],
    },
  },
}

const RAIL: DialogueDef = {
  id: 'd4ss_rail',
  npc: 'auctioneer_pyo',
  start: 'rail',
  nodes: {
    rail: {
      speaker: 'auctioneer_pyo',
      text: t(
        '표 경매인이 딱지 붙은 상자를 난간 위로 올린다. “주인이 안 찾아간 압류품입니다. 무엇이 들었는지는 낙찰 뒤에 아시죠.”',
        'Auctioneer Pyo heaves a tagged crate onto the rail. “Seizures no one came back for. You find out what’s inside after you win.”',
      ),
      options: [
        {
          label: t('작은 상자 하나에 입찰한다', 'Bid on a small crate'),
          intent: 'offer',
          success: {
            text: t('상자 안에 전술 기록 칩 셋. 원래 주인이 쓰던 순서대로 꽂혀 있다.', 'Inside, three tactics-log chips, slotted in the order their owner used them.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('412번 열쇠가 경매에 나왔는지 본다', 'Look for the key to 412 among the lots'),
          intent: 'sneak',
          check: { stat: 'obs', dc: 13 },
          success: {
            text: t('열쇠 꾸러미 사이에 412번이 있다. 표가 다른 쪽을 보는 사이 꾸러미가 당신 주머니로 옮겨 간다.', 'Among a bunch of keys, 412. While Pyo looks the other way, the bunch moves to your pocket.'),
            effects: [{ kind: 'flag', key: 'sea_ss_key' }],
          },
          failure: {
            text: t('표가 망치로 난간을 친다. “구경은 무료지만 손은 아닙니다.”', 'Pyo raps the rail with the gavel. “Looking is free. Hands are not.”'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('난간을 떠난다', 'Leave the rail'),
          intent: 'leave',
          success: { text: t('다음 상자가 올라온다.', 'The next crate goes up.') },
        },
      ],
    },
  },
}

const LOCKER: DialogueDef = {
  id: 'd4ss_locker',
  start: 'tick',
  nodes: {
    tick: {
      text: t(
        '412번 사물함 문에 노란 딱지가 붙어 있다. 안에서 째깍 소리가 난다. 배가 오지 않는 항구에서 아직 시간을 재고 있다.',
        'A yellow tag is stuck across the door of locker 412. Something inside is ticking, still keeping time in a harbor no ship comes to.',
      ),
      options: [
        {
          label: t('반환 서류를 붙이고 정식으로 연다', 'Attach the return form and open it properly'),
          intent: 'offer',
          requires: { flag: 'sea_ss_form', quest: { id: 'q_sea_seizure', stage: 1 } },
          success: {
            text: t('딱지 위에 반환 도장이 찍힌다. 시계를 들고 나가는 당신을 아무도 막지 않는다. 보람이 시계를 받아 들고 교대 종을 친다.', 'A return stamp lands on the tag. Nobody stops you walking out with the clock. Boram takes it and rings the shift bell.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 2 }, { kind: 'codex', id: 'lore_d_shift_clock' }],
          },
        },
        {
          label: t('경매에서 챙긴 열쇠로 연다', 'Open it with the key from the auction'),
          intent: 'sneak',
          requires: { flag: 'sea_ss_key', quest: { id: 'q_sea_seizure', stage: 1 } },
          success: {
            text: t('딱지는 그대로 두고 시계만 꺼낸다. 하역조가 세관 뒷문 열쇠를 대신 건넨다. “우리 쪽 교대 문이에요.”', 'You leave the tag and take only the clock. The crew hands you the customs back-gate key in return. “That’s our shift door.”'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 2 }, { kind: 'codex', id: 'lore_d_shift_clock' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('딱지를 찢고 연다', 'Tear the tag and force it'),
          intent: 'fight',
          requires: { quest: { id: 'q_sea_seizure', stage: 1 } },
          check: { stat: 'str', dc: 13 },
          success: {
            text: t('문이 휘어 열린다. 시계는 무사하다. 창고 전체에 경보가 울린다.', 'The door bends open. The clock is fine. The whole shed alarms.'),
            effects: [{ kind: 'quest', id: 'q_sea_seizure', stage: 2 }, { kind: 'codex', id: 'lore_d_shift_clock' }, { kind: 'trace', amount: 8 }],
          },
          failure: {
            text: t('경첩이 버틴다. 딱지가 반쯤 찢긴 채 펄럭인다.', 'The hinge holds. The tag flaps, half torn.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('째깍 소리를 두고 간다', 'Leave the ticking'),
          intent: 'leave',
          success: { text: t('째깍, 째깍. 문 너머에서 시간이 혼자 간다.', 'Tick, tick. Behind the door, time goes on alone.') },
        },
      ],
    },
  },
}

export const D4_SEA_SEIZURE_SHED_DIALOGUES: DialogueDef[] = [NO, BORAM, RAIL, LOCKER]

export const D4_SEA_SEIZURE_SHED_NPCS: NpcDef[] = [
  { id: 'customs_inspector_no', name: t('노 검수원', 'Inspector No'), role: t('사유 없는 압류는 하지 않는 세관 검수원', 'Customs inspector who never seizes without a reason'), faction: 'grid', portrait: 'v2/npcs/customs_inspector_no.webp' },
  { id: 'longshore_boram', name: t('보람', 'Boram'), role: t('시계를 잃은 하역조 막내', 'Youngest of the longshore crew, without a clock'), faction: 'offgrid', portrait: 'v2/npcs/longshore_boram.webp' },
  { id: 'auctioneer_pyo', name: t('표 경매인', 'Auctioneer Pyo'), role: t('주인 없는 압류품을 파는 경매인', 'Auctioneer of seizures no one came back for'), faction: 'market', portrait: 'v2/npcs/auctioneer_pyo.webp' },
]

export const D4_SEA_SEIZURE_SHED_QUESTS: QuestDef[] = [{
  id: 'q_sea_seizure',
  title: t('압류 창고', 'The Seizure Shed'),
  stages: [
    t('하역조의 교대 시계가 든 사물함을 찾는다.', 'Find the locker holding the crew’s shift clock.'),
    t('시계를 하역조에게 돌려준다.', 'Get the clock back to the crew.'),
  ],
  payoff: { stage: 2, bossMod: 'marked', text: t('하역조의 교대 문 틈으로 세관장을 먼저 본다. 그의 자리가 표시된다.', 'Through the crew’s shift door you see the Commissioner first. His position is marked.') },
}]
