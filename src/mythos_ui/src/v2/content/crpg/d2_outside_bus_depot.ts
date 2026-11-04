// Outside the List (DLC 2), Act 2 — The Last-Bus Depot. The night bus that carries off-list workers home after
// closing is to be decommissioned tonight: the Closing Crew is pulling its route card, and without one the doors
// will not open. q_outside_bus: find a route card the system still accepts (1) → get the bus out on its last run
// (2) → off-list passengers jam the street before the boss and slow the Crew (weaken). Driver Gwang, the depot
// dispatcher machine Ticket, or Tae-o help; the lost-and-found shelf holds a card picker. At most 20 credits.
// Prop: the route card.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D2_OUTSIDE_BUS_DEPOT: DistrictDef = {
  id: 'd2_outside_bus_depot',
  act: 2,
  route: 'outside',
  name: t('막차 차고', 'The Last-Bus Depot'),
  image: 'v2/districts/d2_outside_bus_depot.webp',
  intro: t(
    '뒷골목 끝 차고에 낡은 심야 버스 한 대가 서 있다. 폐점 뒤 명단 밖 사람들을 집에 데려다주는 유일한 버스다. 오늘 밤 폐차 예정이다. 정리반이 노선 카드를 회수하면 문이 열리지 않는다.\n막차 시간 전에 세 곳을 들를 수 있다.',
    'At the end of the back alley, an old night bus stands in its depot: the only bus that takes off-list people home after closing. It is to be scrapped tonight. Once the Crew pulls its route card, the doors will not open.\nThere is time for three stops before the last-bus hour.',
  ),
  actions: 3,
  outro: t(
    '막차 시간. 차고 셔터가 올라간다. 버스 전조등이 골목을 비춘다.',
    'The last-bus hour. The depot shutter rolls up. The bus’s headlights light the alley.',
  ),
  pois: [
    { id: 'gwang', name: t('운전석', 'The Driver’s Seat'), blurb: t('마지막 운행을 기다린다.', 'Waiting for one last run.'), dialogue: 'd2bd_gwang' },
    { id: 'ticket', name: t('배차 단말', 'The Dispatch Terminal'), blurb: t('카드를 읽는 기계.', 'The machine that reads cards.'), dialogue: 'd2bd_ticket' },
    { id: 'lost', name: t('분실물 선반', 'The Lost-and-Found Shelf'), blurb: t('승객들이 두고 내린 것.', 'What passengers left behind.'), dialogue: 'd2bd_lost' },
    { id: 'stop', name: t('차고 앞 정류장', 'The Stop Outside'), blurb: t('벌써 줄이 섰다.', 'A line has already formed.'), dialogue: 'd2bd_stop' },
  ],
}

const GWANG: DialogueDef = {
  id: 'd2bd_gwang',
  npc: 'bus_driver_gwang',
  start: 'seat',
  nodes: {
    seat: {
      speaker: 'bus_driver_gwang',
      text: t(
        '광 기사가 운전대에 팔을 걸치고 앉아 있다. “이십 년 몰았어요. 오늘 노선 카드 뺏기면 끝이지. 카드가 없으면 문이 안 열려요. 근데… 옛날 카드가 한 장 있긴 해. 폐지된 노선 거.”',
        'Driver Gwang sits with his arms over the wheel. “Twenty years I’ve driven her. Once they take tonight’s route card, that’s it. No card, no doors. But… I do have one old card. For a route they cancelled.”',
      ),
      options: [
        {
          label: t('폐지된 노선 카드가 아직 먹히는지 묻는다', 'Ask whether the cancelled route card still works'),
          intent: 'ask',
          check: { stat: 'int', dc: 12 },
          success: {
            text: t('광 기사가 카드를 꺼낸다. 만료일이 없다. “폐지는 됐는데 만료는 안 시켰더라고. 단말이 받아 주면 달릴 수 있어요.”', 'Gwang takes out the card. No expiry date. “They cancelled the route but never expired the card. If the terminal takes it, she runs.”'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 1 }, { kind: 'flag', key: 'outside_bd_card' }],
          },
          failure: {
            text: t('카드를 이리저리 돌려 보다 떨어뜨린다. 차고 밖 정리반이 고개를 든다.', 'Turning the card over, you drop it. The Crew outside the depot look up.'),
            effects: [{ kind: 'trace', amount: 4 }],
          },
        },
        {
          label: t('태오에게 버스를 점검하게 한다', 'Let Tae-o check the bus over'),
          intent: 'offer',
          requires: { companion: 'tae_o' },
          approval: { tae_o: 2 },
          success: {
            text: t('태오가 버스 밑으로 들어갔다 나온다. “타이어 괜찮고, 브레이크 괜찮아. 한 번은 간다.” 광 기사가 웃는다. 폐지 노선 카드를 꺼낸다.', 'Tae-o crawls under the bus and comes out. “Tyres fine, brakes fine. She’ll make one run.” Gwang laughs and takes out the cancelled-route card.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 1 }, { kind: 'flag', key: 'outside_bd_card' }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('폐지된 노선을 뛰어 본 적 있다고 말한다', 'Say you used to run the cancelled route'),
          intent: 'ask',
          requires: { background: 'runner' },
          success: {
            text: t('광 기사가 눈을 크게 뜬다. “그 노선 승객이었어요?” 서랍에서 만료되지 않은 옛 노선 카드를 꺼낸다.', 'Gwang’s eyes widen. “You rode that route?” He takes the never-expired old route card from a drawer.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 1 }, { kind: 'flag', key: 'outside_bd_card' }],
          },
        },
        {
          label: t('운전석을 떠난다', 'Leave the driver’s seat'),
          intent: 'leave',
          success: { text: t('광 기사가 백미러를 고쳐 단다.', 'Gwang adjusts the mirror.') },
        },
      ],
    },
  },
}

const TICKET: DialogueDef = {
  id: 'd2bd_ticket',
  npc: 'dispatch_ticket',
  start: 'terminal',
  nodes: {
    terminal: {
      speaker: 'dispatch_ticket',
      text: t(
        '배차 단말이 녹색 불을 깜빡인다. “유효한 노선 카드를 삽입하십시오. 오늘 회수 예정 카드: 1장. 폐지 노선 카드는… 오류 코드 없음. 판정 불가.”',
        'The dispatch terminal blinks green. “Insert a valid route card. Cards scheduled for recall today: 1. Cancelled-route cards… no error code. Undetermined.”',
      ),
      options: [
        {
          label: t('“판정 불가면 허용이지?”', '“Undetermined means allowed, right?”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 13 },
          success: {
            text: t('단말이 오래 생각한다. “…금지 목록에 없음. 허용으로 처리.” 차고 출구 신호가 녹색으로 바뀐다.', 'The terminal thinks a long while. “…Not on the forbidden list. Processing as allowed.” The depot exit signal turns green.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 1 }, { kind: 'flag', key: 'outside_bd_green' }],
          },
          failure: {
            text: t('“판정 보류. 관리자 호출.” 정리반 무전이 지직거린다.', '“Decision deferred. Calling supervisor.” The Crew’s radio crackles.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('배차 기록을 읽어 본다', 'Read the dispatch log'),
          intent: 'ask',
          success: {
            text: t('이십 년 치 막차 기록. 승객 수가 매일 조금씩 늘었다. 오늘 밤 예상 승객: 마흔하나.', 'Twenty years of last-bus runs. Ridership crept up every day. Expected passengers tonight: forty-one.'),
            effects: [{ kind: 'trace', amount: -3 }],
          },
        },
        {
          label: t('단말을 떠난다', 'Leave the terminal'),
          intent: 'leave',
          success: { text: t('녹색 불이 계속 깜빡인다.', 'The green light keeps blinking.') },
        },
      ],
    },
  },
}

const LOST: DialogueDef = {
  id: 'd2bd_lost',
  start: 'shelf',
  nodes: {
    shelf: {
      text: t(
        '분실물 선반에 승객들이 두고 내린 것들이 쌓여 있다. 장갑 한 짝, 도시락 가방, 손때 묻은 수첩 몇 권. 이름은 없다. 명단 밖 사람들의 물건이다.',
        'The lost-and-found shelf is piled with things passengers left behind: one glove, a lunch bag, a few well-thumbed notebooks. No names. These belong to people off the list.',
      ),
      options: [
        {
          label: t('수첩 하나를 빌린다', 'Borrow a notebook'),
          intent: 'ask',
          success: {
            text: t('셋 중 하나. 야간 근무자들이 적어 둔 싸움 요령이 있다.', 'One of three: fighting tips jotted down by night-shift workers.'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('분실물을 버스 좌석에 돌려놓는다', 'Put the lost things back on the seats'),
          intent: 'offer',
          approval: { tae_o: 1 },
          success: {
            text: t('주인들이 오늘 밤 다시 탈 것이다. 광 기사가 고맙다며 잔돈 통을 흔든다.', 'Their owners will ride tonight. Gwang shakes the change box in thanks.'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('선반을 떠난다', 'Leave the shelf'),
          intent: 'leave',
          success: { text: t('장갑 한 짝이 선반 끝에 걸려 있다.', 'One glove hangs from the edge of the shelf.') },
        },
      ],
    },
  },
}

const STOP: DialogueDef = {
  id: 'd2bd_stop',
  start: 'line',
  nodes: {
    line: {
      text: t(
        '차고 앞 정류장에 벌써 줄이 섰다. 앞치마를 맨 사람, 작업복을 입은 사람. 정리반 두 명이 차고 문 앞에서 노선 카드를 회수하러 들어올 준비를 한다.',
        'A line has already formed at the stop outside: people in aprons, people in work clothes. Two of the Closing Crew wait at the depot door, ready to come in for the route card.',
      ),
      options: [
        {
          label: t('폐지 노선 카드로 버스를 출발시킨다', 'Start the bus on the cancelled-route card'),
          intent: 'offer',
          approval: { doyun: 1 },
          requires: { flag: 'outside_bd_card', quest: { id: 'q_outside_bus', stage: 1 } },
          success: {
            text: t('카드가 들어간다. 단말이 잠깐 망설이다 문을 연다. 마흔한 명이 탄다. 정리반이 회수할 카드는 오늘 운행표에 없다.', 'The card goes in. The terminal hesitates, then opens the doors. Forty-one people board. The card the Crew came for isn’t on tonight’s schedule.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('녹색 신호를 믿고 셔터를 올린다', 'Trust the green signal and raise the shutter'),
          intent: 'offer',
          requires: { flag: 'outside_bd_green', quest: { id: 'q_outside_bus', stage: 1 } },
          success: {
            text: t('셔터가 올라간다. 버스가 정리반 옆을 지나 정류장에 선다. 정리반은 허용 처리된 신호를 막을 근거가 없다.', 'The shutter rises. The bus rolls past the Crew and stops at the line. They have no grounds to stop a signal processed as allowed.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 2 }],
          },
        },
        {
          label: t('정리반을 차고 안으로 유인한다', 'Lure the Crew into the depot'),
          intent: 'sneak',
          requires: { quest: { id: 'q_outside_bus', stage: 1 } },
          check: { stat: 'agi', dc: 13 },
          success: {
            text: t('정리반이 엉뚱한 차고 칸으로 들어간 사이 버스가 빠져나간다. 경광등이 뒤늦게 돈다.', 'While the Crew search the wrong bay, the bus slips out. The beacons start late.'),
            effects: [{ kind: 'quest', id: 'q_outside_bus', stage: 2 }, { kind: 'trace', amount: 6 }],
          },
          failure: {
            text: t('정리반이 미끼를 무시한다. 당신을 본다.', 'The Crew ignore the bait. They see you.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('정류장을 떠난다', 'Leave the stop'),
          intent: 'leave',
          success: { text: t('줄이 조금 더 길어진다.', 'The line grows a little longer.') },
        },
      ],
    },
  },
}

export const D2_OUTSIDE_BUS_DEPOT_DIALOGUES: DialogueDef[] = [GWANG, TICKET, LOST, STOP]

export const D2_OUTSIDE_BUS_DEPOT_NPCS: NpcDef[] = [
  { id: 'bus_driver_gwang', name: t('광 기사', 'Driver Gwang'), role: t('명단 밖 사람들의 막차를 이십 년 몬 운전기사', 'Driver who has run the off-list last bus for twenty years'), faction: 'offgrid', portrait: 'v2/npcs/bus_driver_gwang.webp' },
  { id: 'dispatch_ticket', name: t('배차 단말', 'Ticket'), role: t('노선 카드를 판정하는 차고의 배차 기계', 'The depot’s dispatch machine that rules on route cards'), faction: 'grid', portrait: 'v2/npcs/dispatch_ticket.webp' },
]

export const D2_OUTSIDE_BUS_DEPOT_QUESTS: QuestDef[] = [{
  id: 'q_outside_bus',
  title: t('막차 차고', 'The Last-Bus Depot'),
  stages: [
    t('시스템이 아직 받아 주는 노선 카드를 찾는다.', 'Find a route card the system still accepts.'),
    t('막차를 마지막 운행에 내보낸다.', 'Get the last bus out on one more run.'),
  ],
  payoff: { stage: 2, bossMod: 'weaken', text: t('막차에서 내린 사람들이 거리를 메운다. 정리반의 걸음이 느려진다.', 'The passengers off the last bus fill the street. The Crew’s pace slows.') },
}]
