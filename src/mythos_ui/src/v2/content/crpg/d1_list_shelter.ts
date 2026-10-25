// Act 1 — Signal of the Abandoned: an ordinary citizen hides in a welfare-capsule shelter.
// q_shelter: hear Eun-sol's request → escort her through the linen chute with her consent.
// Eun-sol starts the quest and grants ls_ready; the chute finishes it on a free, checked or prepared route.
// All four stops are open. A rescue takes two visits; Hyeon offers an optional third-stop preparation.
// Budget: 15 credits at the cabinet, one card pick at Hyeon; payoff = cover. No repeatable nodes.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D1_LIST_SHELTER: DistrictDef = {
  id: 'd1_list_shelter',
  act: 1,
  name: t('버려진 자들의 신호', 'Signal of the Abandoned'),
  image: 'v2/districts/d1_list_shelter.webp',
  intro: t(
    '복지 캡슐 쉼터의 벽에서 취침 안내가 흐른다. 입구에는 최적화 대상자 명단이 새로 붙고, 천장에서는 빈 침대를 세는 빛이 움직인다. 한 캡슐의 문틈에서 숟가락이 세 번 두드려진다.\n집행관들이 층별 점검을 마치기 전에 세 곳을 들를 수 있다.',
    'A bedtime announcement plays through the welfare-capsule shelter. A fresh optimisation list hangs at the entrance; overhead, a scanning light counts empty beds. A spoon taps three times behind one capsule door.\nYou can make three stops before the enforcers finish their floor inspections.',
  ),
  actions: 3,
  outro: t(
    '입구 스피커가 다음 번호를 부른다. 쉼터의 조명이 야간 모드로 바뀐다. 당신은 닫히는 방화문 사이로 빠져나간다.',
    'The entrance speaker calls the next number. The shelter lights switch to night mode. You slip between the closing fire doors.',
  ),
  pois: [
    { id: 'capsule', name: t('열일곱 번째 캡슐', 'Capsule Seventeen'), blurb: t('번호 대신 이름을 말하는 사람.', 'Someone who gives a name instead of a number.'), dialogue: 'd1ls_eunsol' },
    { id: 'desk', name: t('숙직 관리대', 'The Night Desk'), blurb: t('빈 침대에도 담요가 있다.', 'Blankets even on empty beds.'), dialogue: 'd1ls_hyeon' },
    { id: 'inspection', name: t('점검 게이트', 'The Inspection Gate'), blurb: t('확인 서명이 하나 모자란다.', 'One confirmation signature is missing.'), dialogue: 'd1ls_warden' },
    { id: 'linen', name: t('세탁물 투입구', 'The Linen Chute'), blurb: t('지하 수거장으로 이어지는 경사로.', 'A slope down to the collection bay.'), dialogue: 'd1ls_linen' },
  ],
}

const EUNSOL: DialogueDef = {
  id: 'd1ls_eunsol',
  npc: 'ls_eunsol',
  start: 'door',
  nodes: {
    door: {
      speaker: 'ls_eunsol',
      text: t(
        '문이 손가락 너비만큼 열린다. 여자가 구내식당 명찰을 뒤집어 쥔다. “박은솔이에요. 식판 닦는 일을 해요. 명단에 제 이름이 있는데… 왜인지는 안 적혀 있어요.”',
        'The door opens a finger’s width. A woman holds a canteen badge face down. “Park Eun-sol. I wash trays. My name’s on that list, but… it doesn’t say why.”',
      ),
      options: [
        {
          label: t('“지금 필요한 게 뭐예요?”', '“What do you need right now?”'),
          intent: 'ask',
          approval: { tae_o: 1, kai: 1 },
          success: {
            text: t('“여기서 나가고 싶어요. 뛰라고 하면 뛸 수는 있어요.” 그녀가 운동화 끈을 다시 묶는다.', '“I want to leave. I can run if I have to.” She reties her trainers.'),
            effects: [{ kind: 'quest', id: 'q_shelter', stage: 1 }],
            goto: 'choice',
          },
        },
        {
          label: t('무면허 진료 경험으로 호흡부터 안정시킨다', 'Use your medical experience to steady her breathing'),
          intent: 'offer',
          requires: { background: 'medic' },
          approval: { tae_o: 2 },
          success: {
            text: t('당신이 숨을 천천히 내쉰다. 은솔이 그 박자를 따라 한다. “고마워요. 이제 말할 수 있겠어요.”', 'You breathe out slowly. Eun-sol matches your rhythm. “Thank you. I can talk now.”'),
            effects: [{ kind: 'quest', id: 'q_shelter', stage: 1 }, { kind: 'inspiration', amount: 1 }],
            goto: 'choice',
          },
        },
        {
          label: t('“누명을 썼다는 증거부터 보여 줘요.”', '“Show me proof they’ve got the wrong person.”'),
          intent: 'intimidate',
          approval: { tae_o: -2, kai: -1 },
          success: {
            text: t('은솔이 명찰 앞뒤를 뒤집는다. “이거밖에 없어요.” 문이 닫힌다. 숟가락 소리도 멎는다.', 'Eun-sol turns her badge over twice. “This is all I have.” The door shuts. The spoon falls silent.'),
          },
        },
        {
          label: t('문에서 물러난다', 'Step away from the door'),
          intent: 'leave',
          success: { text: t('은솔이 문을 닫기 전에 복도 양쪽을 살핀다.', 'Eun-sol checks both ends of the corridor before shutting the door.') },
        },
      ],
    },
    choice: {
      speaker: 'ls_eunsol',
      text: t(
        '“세탁물 통로는 알아요. 수거장에 배식하러 갔거든요.” 은솔이 문 아래 틈을 가리킨다. “저기까지 갈게요. 거기서 같이 나가 주실래요? 제 물건은 제가 들고요.”',
        '“I know the linen chute. I’ve brought meals to the collection bay.” Eun-sol points through the gap under the door. “I can get there. Will you help me out from there? I’ll carry my own things.”',
      ),
      options: [
        {
          label: t('“좋아요. 통로에서 만나요.”', '“All right. Meet me at the chute.”'),
          intent: 'offer',
          approval: { tae_o: 2, se_rin: 1 },
          success: {
            text: t('은솔이 도시락을 가방에 넣는다. 복도등이 돌아가는 틈에 몸을 낮추고 세탁실로 향한다.', 'Eun-sol packs her lunch box. As the corridor light turns away, she crouches and heads for the laundry room.'),
            effects: [{ kind: 'flag', key: 'ls_ready' }],
          },
        },
        {
          label: t('“빠져나갈 곳의 사정을 먼저 알려 줘요.”', '“Tell me about the place we’re heading into.”'),
          intent: 'insight',
          success: {
            text: t('“수거장 사람들은 명단 안 물어요. 문만 다시 닫아 달래요.” 은솔이 출구를 그려 주고 세탁실로 먼저 간다.', '“The collection crew don’t ask about lists. They just ask you to close the door.” Eun-sol sketches the exit and goes ahead to the laundry room.'),
            effects: [{ kind: 'flag', key: 'ls_ready' }],
          },
        },
        {
          label: t('지금은 동행을 약속하지 않는다', 'Make no promise to escort her'),
          intent: 'leave',
          success: {
            text: t('은솔이 가방을 내려놓는다. “그럼 다른 방법을 찾아볼게요.” 도시락 뚜껑이 작게 달각거린다.', 'Eun-sol lowers her bag. “Then I’ll look for another way.” Her lunch-box lid rattles softly.'),
          },
        },
      ],
    },
  },
}

const HYEON: DialogueDef = {
  id: 'd1ls_hyeon',
  npc: 'ls_hyeon',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'ls_hyeon',
      text: t(
        '숙직자 현이 비어 있는 캡슐에 담요를 밀어 넣는다. 관리 화면에는 전부 취침 중이라고 뜬다. “문 열어 보진 마세요. 겨우 재웠으니까.” 손이 빈 담요 위에 잠깐 멈춘다.',
        'Night attendant Hyeon pushes a blanket into an empty capsule. The desk display says everyone is asleep. “Please don’t open them. I only just got them settled.” Her hand pauses over the empty blanket.',
      ),
      options: [
        {
          label: t('“사람을 숨길 수 있는 통로가 필요해요.”', '“I need a route that can hide someone.”'),
          intent: 'ask',
          success: {
            text: t('현이 세탁실 쪽을 보지 않은 채 서랍을 연다. “무슨 통로인지부터 얘기해 봐요.”', 'Hyeon opens a drawer without looking toward the laundry room. “Tell me what sort of route.”'),
            goto: 'drawer',
          },
        },
        {
          label: t('빈 담요를 함께 채워 점검을 늦춘다', 'Help fill empty blankets to slow the inspection'),
          intent: 'offer',
          approval: { tae_o: 1, kai: 1 },
          success: {
            text: t('담요 아래에 말아 둔 수건이 들어간다. 현이 낡은 대피 훈련철을 건넨다. “이건 외워 두세요. 사람마다 빠져나가는 법이 달라요.”', 'Rolled towels go beneath the blankets. Hyeon hands you an old evacuation binder. “Learn one of these. Different people need different ways out.”'),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
        },
        {
          label: t('“점검반에 빈 침대 얘기를 해도 될까요?”', '“Should I tell the inspectors about the empty beds?”'),
          intent: 'intimidate',
          approval: { tae_o: -2 },
          success: {
            text: t('현이 서랍을 잠근다. “하실 말은 직접 하세요.” 그녀는 담요를 빼지 않는다.', 'Hyeon locks the drawer. “Say it yourself, then.” She leaves the blankets where they are.'),
          },
        },
        {
          label: t('관리대를 지나간다', 'Pass the desk'),
          intent: 'leave',
          success: { text: t('현이 빈 캡슐에도 잘 자라는 인사를 건넨다.', 'Hyeon wishes even the empty capsules good night.') },
        },
      ],
    },
    drawer: {
      speaker: 'ls_hyeon',
      text: t(
        '서랍에는 세탁물 봉인띠가 있다. “이걸 통로 센서에 걸면 수거 작업으로 보여요. 한 번 쓰고 버려야 해요. 제 이름은 말하지 마시고.”',
        'Laundry seals fill the drawer. “Hang one on the chute sensor and it reads as a collection run. One use only. Keep my name out of it.”',
      ),
      options: [
        {
          label: t('은솔과 만나기로 했다고 알린다', 'Tell her you arranged to meet Eun-sol'),
          intent: 'persuade',
          requires: { flag: 'ls_ready' },
          approval: { tae_o: 1 },
          success: {
            text: t('현이 봉인띠 하나를 내민다. “그분 도시락 챙겼어요? 끼니 거르면 손부터 떨던데.”', 'Hyeon offers a seal. “Did she take her lunch? Her hands shake when she skips a meal.”'),
            effects: [{ kind: 'flag', key: 'ls_seal' }],
          },
        },
        {
          label: t('“누가 쓰는지는 묻지 말아 주세요.”', '“Please don’t ask who it’s for.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 12 },
          assist: 'tae_o',
          success: {
            text: t('현이 봉인띠를 뒤집어 건넨다. “제가 먼저 그렇게 말했죠.”', 'Hyeon hands you a seal face down. “That was my request too.”'),
            effects: [{ kind: 'flag', key: 'ls_seal' }],
          },
          failure: {
            text: t('그녀가 서랍을 닫는다. “얼굴도 모르는 사람한테는 못 줘요. 미안해요.”', 'She closes the drawer. “I can’t give one to a stranger. I’m sorry.”'),
          },
        },
        {
          label: t('서랍을 닫아 준다', 'Close the drawer for her'),
          intent: 'leave',
          success: { text: t('손잡이에 남은 손자국을 소매로 닦는다.', 'You wipe your fingerprints off the handle with your sleeve.') },
        },
      ],
    },
  },
}

const WARDEN: DialogueDef = {
  id: 'd1ls_warden',
  npc: 'ls_warden_cho',
  start: 'gate',
  nodes: {
    gate: {
      speaker: 'ls_warden_cho',
      text: t(
        '조 집행관이 명단을 손가락으로 넘긴다. “야간 방문은 끝났습니다. 퇴실하십시오.” 화면의 확인 서명 칸 하나가 비어 있다. 뒤편 대원들이 문고리를 하나씩 당긴다.',
        'Enforcer Cho scrolls through the list. “Visiting hours are over. Leave the premises.” One confirmation field on his screen is blank. Behind him, officers try the doors one by one.',
      ),
      options: [
        {
          label: t('“서명 없는 이송은 인수 거부될 겁니다.”', '“An unsigned transfer will be refused at intake.”'),
          intent: 'persuade',
          requires: { background: 'enforcer' },
          approval: { tae_o: 1, han: 1 },
          success: {
            text: t('조가 무전을 누른다. “인수 확인부터 받는다. 현 위치 대기.” 대원들의 손이 문에서 떨어진다.', 'Cho keys his radio. “Get intake confirmation first. Hold position.” The officers take their hands off the doors.'),
            effects: [{ kind: 'flag', key: 'ls_hold' }],
          },
        },
        {
          label: t('“명단과 침대 번호가 다릅니다. 확인해 주세요.”', '“The list and bed numbers don’t match. Please check.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'tae_o',
          success: {
            text: t('조가 두 목록을 나란히 띄운다. 빈 캡슐들이 다른 번호를 달고 있다. “대기. 대조부터 한다.”', 'Cho opens both lists side by side. The empty capsules have different numbers. “Hold. Check them first.”'),
            effects: [{ kind: 'flag', key: 'ls_hold' }],
          },
          failure: {
            text: t('“확인 요청자의 신원을 기록합니다.” 조가 당신 얼굴을 스캔한다.', '“Recording the identity of the person requesting verification.” Cho scans your face.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('빈 복도에서 이송 신호를 들었다고 속인다', 'Claim you heard a transfer signal in the empty corridor'),
          intent: 'deceive',
          check: { stat: 'cha', dc: 13 },
          approval: { se_rin: 1 },
          success: {
            text: t('조가 대원 한 명을 복도로 보낸다. 그의 시선이 당신에게 한 번 더 머문다.', 'Cho sends an officer down the corridor. His gaze lingers on you once more.'),
            effects: [{ kind: 'trace', amount: -4 }],
          },
          failure: {
            text: t('“그쪽 수신기는 철거됐습니다.” 조가 당신의 출구 방향을 기록한다.', '“That receiver has been removed.” Cho records which exit you are heading toward.'),
            effects: [{ kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('퇴실 표지를 따라 움직인다', 'Follow the exit signs'),
          intent: 'leave',
          success: { text: t('조의 시선이 다시 명단으로 내려간다.', 'Cho looks back down at his list.') },
        },
      ],
    },
  },
}

const LINEN: DialogueDef = {
  id: 'd1ls_linen',
  start: 'hatch',
  nodes: {
    hatch: {
      text: t(
        '세탁물 투입구 아래로 넓은 경사판이 내려간다. 끝에는 수거장의 노란 문이 보인다. 투입구 센서가 지나가는 것마다 붉은 점을 찍는다.',
        'A broad slope runs beneath the linen hatch. At the bottom stands the collection bay’s yellow door. The hatch sensor marks each passing object with a red dot.',
      ),
      options: [
        {
          label: t('은솔과 합류해 출구를 살핀다', 'Meet Eun-sol and check the exit'),
          intent: 'ask',
          requires: { flag: 'ls_ready' },
          success: {
            text: t('은솔이 세탁 바구니 뒤에서 나온다. “저 노란 문이에요. 손잡이가 뻑뻑해요.” 그녀가 가방을 앞으로 멘다.', 'Eun-sol steps out from behind a basket. “The yellow door. Its handle sticks.” She moves her bag to her chest.'),
            goto: 'descent',
          },
        },
        {
          label: t('분실물 반환함의 정리 일감을 마친다', 'Finish a sorting job at the lost-property cabinet'),
          intent: 'offer',
          success: {
            text: t('짝 없는 슬리퍼를 크기대로 놓고 봉투를 접는다. 작업 단말이 남은 일삯을 지급한다. 남의 물건은 칸에 그대로 남는다.', 'You sort odd slippers by size and fold the bags. The work terminal pays the outstanding wage. Everyone’s belongings stay in their slots.'),
            effects: [{ kind: 'credits', amount: 15 }],
          },
        },
        {
          label: t('투입구에서 물러난다', 'Step away from the hatch'),
          intent: 'leave',
          success: { text: t('수거장의 문이 바람에 한 번 덜컹인다.', 'The collection-bay door rattles once in the draught.') },
        },
      ],
    },
    descent: {
      speaker: 'ls_eunsol',
      text: t(
        '“내려가다 멈추면 뒤에서 밀어 주세요. 올라가라는 뜻 아니에요.” 은솔이 경사판에 발을 올린다. 위층에서 무전이 짧게 끊긴다.',
        '“If I stop on the way down, push from behind. It doesn’t mean I want to go back.” Eun-sol puts a foot on the slope. A radio cuts off upstairs.',
      ),
      options: [
        {
          label: t('현의 봉인띠로 수거 작업을 표시한다', 'Mark a collection run with Hyeon’s seal'),
          intent: 'sneak',
          requires: { flag: 'ls_seal' },
          approval: { tae_o: 2 },
          success: {
            text: t('센서가 초록으로 바뀐다. 은솔이 손잡이를 두 번 당겨 노란 문을 연다. 수거원이 길을 비켜 준다.', 'The sensor turns green. Eun-sol pulls twice and opens the yellow door. A collection worker makes room.'),
            effects: [{ kind: 'quest', id: 'q_shelter', stage: 2 }],
          },
        },
        {
          label: t('점검 보류 시간을 이용해 함께 내려간다', 'Descend together while the inspection is on hold'),
          intent: 'sneak',
          requires: { flag: 'ls_hold' },
          approval: { tae_o: 2 },
          success: {
            text: t('문고리를 당기는 소리가 멎어 있다. 은솔이 바닥에 닿고, 당신 손을 잡아 마지막 경사를 내려 준다.', 'The door-handle checks have stopped. Eun-sol reaches the floor, then takes your hand for the final slope.'),
            effects: [{ kind: 'quest', id: 'q_shelter', stage: 2 }],
          },
        },
        {
          label: t('센서가 바구니를 따라 도는 틈에 움직인다', 'Move while the sensor follows a basket'),
          intent: 'sneak',
          check: { stat: 'agi', dc: 13 },
          assist: 'se_rin',
          approval: { tae_o: 2, se_rin: 1 },
          success: {
            text: t('센서가 빈 바구니를 세는 동안 두 사람이 노란 문을 지난다. 은솔이 약속대로 문을 다시 닫는다.', 'While the sensor counts an empty basket, you both pass through the yellow door. Eun-sol closes it as promised.'),
            effects: [{ kind: 'quest', id: 'q_shelter', stage: 2 }],
          },
          failure: {
            text: t('붉은 점이 당신 등에 앉는다. 당신이 시선을 끄는 사이 은솔이 문을 열고 기다린다. 둘 다 통과하지만 얼굴이 기록된다.', 'A red dot settles on your back. While you draw its attention, Eun-sol opens the door and waits. You both get through, but your face is logged.'),
            effects: [{ kind: 'trace', amount: 8 }, { kind: 'quest', id: 'q_shelter', stage: 2 }],
          },
        },
        {
          label: t('얼굴을 드러내 센서를 가리고 은솔을 먼저 보낸다', 'Block the sensor with your face exposed and send Eun-sol ahead'),
          intent: 'offer',
          approval: { tae_o: 3, kai: 1 },
          success: {
            text: t('센서가 당신을 기록한다. 은솔이 노란 문을 열어 둔다. 당신까지 들어서자 수거원이 철제 바구니로 문을 받친다.', 'The sensor records you. Eun-sol holds the yellow door. Once you are through, a worker braces it with a steel basket.'),
            effects: [{ kind: 'trace', amount: 6 }, { kind: 'quest', id: 'q_shelter', stage: 2 }],
          },
        },
        {
          label: t('은솔에게 기다려 달라고 하고 물러난다', 'Ask Eun-sol to wait and step back'),
          intent: 'leave',
          success: { text: t('은솔이 바구니 뒤에 다시 몸을 낮춘다. “너무 오래는 못 기다려요.”', 'Eun-sol crouches behind the basket again. “I can’t wait much longer.”') },
        },
      ],
    },
  },
}

export const D1_LIST_SHELTER_DIALOGUES: DialogueDef[] = [EUNSOL, HYEON, WARDEN, LINEN]

export const D1_LIST_SHELTER_NPCS: NpcDef[] = [
  { id: 'ls_eunsol', name: t('박은솔', 'Park Eun-sol'), role: t('최적화 명단에 오른 식당 노동자', 'A canteen worker on the optimisation list'), portrait: 'v2/npcs/ls_eunsol.webp', faction: 'offgrid' },
  { id: 'ls_hyeon', name: t('현', 'Hyeon'), role: t('빈 캡슐을 덮어 두는 숙직자', 'A night attendant covering empty capsules'), portrait: 'v2/npcs/ls_hyeon.webp', faction: 'offgrid' },
  { id: 'ls_warden_cho', name: t('조 집행관', 'Enforcer Cho'), role: t('이송 명단을 대조하는 집행관', 'An enforcer checking transfer lists'), portrait: 'v2/npcs/ls_warden_cho.webp', faction: 'grid' },
]

export const D1_LIST_SHELTER_QUESTS: QuestDef[] = [{
  id: 'q_shelter',
  title: t('열일곱 번째 캡슐의 이름', 'The Name in Capsule Seventeen'),
  stages: [
    t('박은솔이 쉼터를 나가고 싶어 한다. 동행을 약속하면 세탁물 통로에서 합류할 수 있다.', 'Park Eun-sol wants to leave the shelter. Agree to escort her and meet at the linen chute.'),
    t('은솔과 수거장으로 빠져나왔다. 수거원들이 앞쪽 구역에 엄폐물을 옮겨 주기로 한다.', 'You escape with Eun-sol through the collection bay. Its workers agree to move cover into the district ahead.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('수거원들이 보스 구역에 철제 세탁 바구니를 세워 둔다.', 'Collection workers place steel laundry baskets as cover in the boss’s district.') },
}]
