// Act 3 — An Old Wound. An enforcer unit keeps its deserter's shield but edits the evacuation out of its log.
// q_old_wound: inspect the disputed report (1) → lodge an unabridged account at the muster terminal (2).
// The captain supplies a signed copy by check or a free, trace-costing deposition; the medic offers another route.
// Tae-o never asks for absolution. One optional card pick at Stores; maximum positive credits: 20.
import type { DialogueDef, DistrictDef, NpcDef, QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const D3_OLD_WOUND: DistrictDef = {
  id: 'd3_old_wound',
  act: 3,
  name: t('오래된 상처', 'An Old Wound'),
  image: 'v2/districts/d3_old_wound.webp',
  intro: t(
    '해체 대기 중인 집행관 막사. 걸린 방패마다 새 번호가 붙고, 번호 아래 오래된 긁힌 자국이 남는다. 점호 스피커가 한 사람의 이름에서 잡음만 낸다.\n기록 이관 전까지 세 곳을 돌아볼 수 있다.',
    'An enforcer barracks awaits dissolution. Each hanging shield has a fresh number over old scratches. The roll-call speaker reaches one name and produces only static.\nYou have time for three stops before the records transfer.',
  ),
  actions: 3,
  outro: t(
    '이관등이 켜진다. 빈 막사에서 점호 소리가 다시 흐른다. 문밖까지 따라오는 것은 구령보다 늦은 발소리다.',
    'The transfer light comes on. Roll call resumes inside the empty barracks. What follows you out is a footstep, slower than the command.',
  ),
  pois: [
    { id: 'captain', name: t('중대장 책상', 'The Captain’s Desk'), blurb: t('보고서의 주어가 지워져 있다.', 'The report has no subject.'), dialogue: 'd3ow_captain' },
    { id: 'infirmary', name: t('폐쇄 의무실', 'The Closed Infirmary'), blurb: t('흉터와 기록은 방향이 다르다.', 'The scar and the report point different ways.'), dialogue: 'd3ow_medic' },
    { id: 'stores', name: t('반납 방패 창고', 'Returned Shields'), blurb: t('안쪽에도 손자국이 남는다.', 'Handprints survive on the inside too.'), dialogue: 'd3ow_stores' },
    { id: 'muster', name: t('마지막 점호대', 'The Last Muster'), blurb: t('누가 문을 막았는가.', 'Who held the door.'), dialogue: 'd3ow_muster' },
  ],
}

const CAPTAIN: DialogueDef = {
  id: 'd3ow_captain',
  npc: 'wound_captain_jeok',
  start: 'desk',
  nodes: {
    desk: {
      speaker: 'wound_captain_jeok',
      text: t(
        '적 중대장이 빈 명패를 닦는다. “부대는 해체한다. 기록은 남긴다.” 책상 위 사건 보고서에는 ‘사냥개, 대열 이탈’만 적혀 있다. 누구를 두고 이탈했는지는 없다.',
        'Captain Jeok polishes a blank nameplate. “The unit dissolves. The record remains.” The incident report reads only: Hound, broke formation. It never says whom he left the formation for.',
      ),
      options: [
        {
          label: t('삭제된 문장을 묻는다', 'Ask about the missing sentence'),
          intent: 'ask',
          success: {
            text: t('“대피문을 막았다는 증언이 있다. 진압을 방해했지.” 적이 보고서를 돌린다. ‘시민’이라는 단어 위에 흰 테이프가 붙어 있다.', '“A witness says he held an evacuation door. Obstructed enforcement.” Jeok turns the report around. White tape covers the word civilians.'),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 1 }],
            goto: 'report',
          },
        },
        {
          label: t('태오가 직접 보고서를 읽게 한다', 'Let Tae-o read the report himself'),
          intent: 'offer',
          requires: { companion: 'tae_o' },
          approval: { tae_o: 2 },
          success: {
            text: t(
              '태오가 종이를 편다. “그 전날 명단을 넘긴 것도 나다. 그 줄도 넣어라.” 적의 손이 명패 위에서 멎는다. 태오는 흉터에 손을 대지 않는다.',
              'Tae-o flattens the sheet. “I handed over the list the day before. Put that in too.” Jeok’s hand stills on the nameplate. Tae-o does not touch his scar.',
            ),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 1 }],
            goto: 'report',
          },
        },
        {
          label: t('빈 명패를 두고 물러난다', 'Leave him with the blank nameplate'),
          intent: 'leave',
          success: { text: t('천이 금속을 문지르는 소리가 다시 난다.', 'The cloth starts rubbing against metal again.') },
        },
      ],
    },
    report: {
      speaker: 'wound_captain_jeok',
      text: t(
        '“명령 이행 중 사고. 그게 공식 문구다.” 적이 봉인지를 꺼낸다. “정정하면 부대 전체를 다시 조사한다. 그 사람 하나의 흉터로 모두를 심문할 텐가?”',
        '“An incident in the execution of orders. That is the official wording.” Jeok produces a seal. “Amend it and they investigate the whole unit. You would question everyone over one man’s scar?”',
      ),
      options: [
        {
          label: t('“흉터 말고 명령서와 대피 시간을 맞춰 보죠.”', '“Then compare the orders with the evacuation times.”'),
          intent: 'persuade',
          check: { stat: 'cha', dc: 14 },
          assist: 'tae_o',
          approval: { tae_o: 2 },
          success: {
            text: t('시간을 나란히 놓자 십일 분이 빈다. 적이 테이프를 걷는다. “그동안 문이 열려 있었다. 서명은 하겠다.”', 'Side by side, the times leave eleven minutes unaccounted for. Jeok peels away the tape. “The door stayed open. I will sign that.”'),
            effects: [{ kind: 'flag', key: 'ow_account' }],
          },
          failure: {
            text: t('“그 비교 자체가 감사 대상이다.” 적이 종이를 돌려받는다. 천장의 녹음등이 켜진다.', '“The comparison itself warrants an audit.” Jeok takes the papers back. The recording light overhead comes on.'),
            effects: [{ kind: 'trace', amount: 5 }],
            goto: 'deposition',
          },
        },
        {
          label: t('단속관 절차에 따라 원본 대조 서명을 요구한다', 'Invoke the enforcer procedure for a signed comparison'),
          intent: 'ask',
          requires: { background: 'enforcer' },
          approval: { tae_o: 1 },
          success: {
            text: t('삭제보다 먼저 서명해야 하는 조항을 짚는다. 적이 조항을 끝까지 읽고 서명한다. “아직 그 순서를 기억하는군.”', 'You point to the clause requiring a signature before deletion. Jeok reads to the end and signs. “You still remember the order of things.”'),
            effects: [{ kind: 'flag', key: 'ow_account' }],
          },
        },
        {
          label: t('내 이름으로 이의 신청을 접수한다', 'File an objection under your own name'),
          intent: 'offer',
          success: {
            text: t('적이 새 서식을 밀어 준다. 서명란에는 익명 칸이 없다.', 'Jeok slides over a fresh form. There is no anonymous signature field.'),
            goto: 'deposition',
          },
        },
        {
          label: t('봉인하기 전에 자리를 뜬다', 'Leave before he seals it'),
          intent: 'leave',
          success: { text: t('적이 봉인지를 붙이지 않고 보고서 위에 올려 둔다.', 'Jeok rests the seal on the report without attaching it.') },
        },
      ],
    },
    deposition: {
      speaker: 'wound_captain_jeok',
      text: t(
        '“증언과 사실 확인은 다르다. 자네가 보지 않은 일은 보았다고 쓰지 마라.” 적이 원본 사본을 붙인다. 지워진 단어까지 읽힌다. 접수하면 방문 기록도 함께 묶인다.',
        '“Testimony is not verification. Do not claim you saw what you did not.” Jeok attaches a copy of the original, erased words and all. Filing it will attach your visit log too.',
      ),
      options: [
        {
          label: t('원본 보존과 재조사만 요구한다', 'Request preservation and a new inquiry'),
          intent: 'offer',
          approval: { tae_o: 1 },
          success: {
            text: t('직접 본 것은 보고서라고 적는다. 적이 접수 사본을 건넨다. “점호대에 넣어라. 내 책상에서는 또 사라질 수 있으니.”', 'You state that what you saw was the report. Jeok hands over the filed copy. “Put it in the muster terminal. It could disappear again from my desk.”'),
            effects: [{ kind: 'flag', key: 'ow_account' }, { kind: 'trace', amount: 5 }],
          },
        },
        {
          label: t('서명하지 않고 돌려준다', 'Return it unsigned'),
          intent: 'leave',
          success: { text: t('적이 첨부 사본을 원본 밑에 넣는다. 흰 테이프는 다시 붙이지 않는다.', 'Jeok slips the copy beneath the original. He does not replace the white tape.') },
        },
      ],
    },
  },
}

const MEDIC: DialogueDef = {
  id: 'd3ow_medic',
  npc: 'wound_medic_ryu',
  start: 'cot',
  nodes: {
    cot: {
      speaker: 'wound_medic_ryu',
      text: t(
        '류 의무관이 빈 침대의 시트를 접는다. “치료 기록은 상처를 설명합니다. 사람 전체를 설명하지는 못해요.” 도표 한 장에 얼굴 옆을 스친 문 경첩의 궤적이 남아 있다.',
        'Medic Ryu folds the sheet on an empty cot. “A chart explains an injury. Not an entire person.” One diagram shows the path of a door hinge past a face.',
      ),
      options: [
        {
          label: t('“이 기록과 사고 보고서가 왜 다르죠?”', '“Why does this differ from the incident report?”'),
          intent: 'ask',
          success: {
            text: t(
              '“사고 보고서는 앞으로 돌진했다고 하죠. 치료 기록은 뒤로 버틴 자세예요.” 류가 개인정보를 가린 대조본을 준다. “결론은 조사할 사람이 내리게 두세요.”',
              '“The report says he charged forward. This chart shows someone bracing backward.” Ryu gives you a comparison with personal details covered. “Let the inquiry draw its conclusions.”',
            ),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 1 }, { kind: 'flag', key: 'ow_account' }],
          },
        },
        {
          label: t('긴장한 손을 풀어 주는 처치를 돕는다', 'Help with a treatment for cramped hands'),
          intent: 'offer',
          requires: { background: 'medic' },
          approval: { tae_o: 1 },
          success: {
            text: t('류와 번갈아 붕대를 감으며 당신 손의 긴장도 풀린다. “잘 낫는 것과 잊는 것은 달라요.”', 'Taking turns winding the bandage with Ryu eases the tension in your own hand. “Healing well and forgetting are different things.”'),
            effects: [{ kind: 'hp', amount: 6 }],
          },
        },
        {
          label: t('“그 부대에 있었으니 당신도 똑같아.”', '“You served with them. You’re no different.”'),
          intent: 'intimidate',
          approval: { tae_o: -2 },
          success: {
            text: t('류가 시트를 내려놓는다. “제가 한 일은 제 이름으로 물으세요.” 약품함이 잠긴다.', 'Ryu puts down the sheet. “Ask me about what I did, under my own name.” The medicine cabinet locks.'),
            effects: [{ kind: 'trace', amount: 3 }],
          },
        },
        {
          label: t('시트 접는 소리만 남겨 둔다', 'Leave her to fold the sheets'),
          intent: 'leave',
          success: { text: t('류가 마지막 모서리를 침대 밑에 넣는다.', 'Ryu tucks the last corner beneath the cot.') },
        },
      ],
    },
  },
}

const STORES: DialogueDef = {
  id: 'd3ow_stores',
  npc: 'wound_keeper_mun',
  start: 'rack',
  nodes: {
    rack: {
      speaker: 'wound_keeper_mun',
      text: t(
        '문 보급관이 찌그러진 방패를 저울에 올린다. “소유자 불명. 재사용 가능.” 손잡이 안쪽에는 ‘뒤에 사람 있음’이라고 긁어 쓴 글씨가 있다. 그는 그쪽을 저울 바닥으로 돌린다.',
        'Quartermaster Mun weighs a dented shield. “Owner unknown. Serviceable.” Scratched inside the grip: someone behind me. He turns that side toward the scales.',
      ),
      options: [
        {
          label: t('손잡이의 마모에서 방어 자세를 읽는다', 'Read the defensive stance from the worn grip'),
          intent: 'insight',
          check: { stat: 'obs', dc: 13 },
          assist: 'tae_o',
          approval: { tae_o: 1 },
          success: {
            text: t(
              '앞으로 치는 손과 뒤를 받치는 손의 자국이 다르다. 문이 훈련 기록지를 내준다. “장비는 두고 가세요. 자세까지 창고에 둘 필요는 없겠죠.”',
              'A striking hand and a bracing hand leave different marks. Mun offers the training sheets. “Leave the shield. No need to warehouse the stance as well.”',
            ),
            effects: [{ kind: 'card_choice', count: 3 }],
          },
          failure: {
            text: t('무게중심을 잘못 잡아 방패가 발에 떨어진다. 문이 재빨리 들어 올린다. “빈 방패라고 가볍진 않습니다.”', 'You misjudge its balance and drop it on your foot. Mun lifts it quickly. “An empty shield is still heavy.”'),
            effects: [{ kind: 'hp', amount: -3 }],
          },
        },
        {
          label: t('빈 걸쇠를 회수해 준다', 'Collect the empty mounting hooks'),
          intent: 'offer',
          success: {
            text: t('벽에 남은 걸쇠를 작은 상자에 모은다. 문이 회수 수당을 세어 준다. 글씨가 있는 방패는 저울 옆에 세워 둔다.', 'You collect the wall hooks in a small box. Mun counts out a salvage fee. He sets the inscribed shield beside the scales.'),
            effects: [{ kind: 'credits', amount: 20 }],
          },
        },
        {
          label: t('“명령서가 왔어. 이 방패는 압수야.”', '“New orders. This shield is confiscated.”'),
          intent: 'deceive',
          check: { stat: 'cha', dc: 12 },
          approval: { tae_o: -2, se_rin: 1 },
          success: {
            text: t(
              '문이 방패를 내민다. 정식 반출 게이트가 막혀 복도에 내려놓는다. 다음 교전에서 쓸 엄폐물은 생기지만 거짓 명령도 기록에 남는다.',
              'Mun hands it over. The exit gate refuses it, so you position it in the corridor. It will provide cover in the next fight; the false order stays on record.',
            ),
            effects: [{ kind: 'combat_mod', mod: 'cover' }, { kind: 'trace', amount: 3 }],
          },
          failure: {
            text: t('“서명 번호부터요.” 문이 수신기를 들자 당신의 말이 그대로 녹음되어 돌아온다.', '“Signature number first.” Mun lifts his receiver; your own words play back from it.'),
            effects: [{ kind: 'trace', amount: 6 }],
          },
        },
        {
          label: t('방패를 제자리에 놓는다', 'Set the shield back'),
          intent: 'leave',
          success: { text: t('문이 이번에는 글씨를 바깥으로 돌려 세운다.', 'This time Mun sets it with the inscription facing outward.') },
        },
      ],
    },
  },
}

const MUSTER: DialogueDef = {
  id: 'd3ow_muster',
  start: 'terminal',
  nodes: {
    terminal: {
      text: t(
        '점호 단말이 마지막 이관을 기다린다. 정정 서류를 넣는 홈과 훈장 신청을 넣는 홈이 나란하다. 위쪽 카메라는 둘을 구분하지 않고 같은 각도로 찍는다.',
        'The muster terminal waits for the final transfer. The correction slot sits beside the medal application slot. The camera above films both from exactly the same angle.',
      ),
      options: [
        {
          label: t('대조본을 정정 서류함에 넣는다', 'File the comparison as a correction'),
          intent: 'offer',
          requires: { flag: 'ow_account' },
          approval: { tae_o: 1 },
          success: {
            text: t(
              '접수증과 함께 당시 방어선 도면이 출력된다. 사람을 넘긴 기록과 문을 지킨 기록이 같은 묶음에 남는다. 도면에는 보스 구역의 엄폐판 잠금도 보인다.',
              'A receipt prints with the old defensive layout. Handing people over and holding the door remain in the same file. The layout also shows the cover-panel locks in the boss sector.',
            ),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 2 }],
          },
        },
        {
          label: t('태오에게 최종 진술을 맡긴다', 'Let Tae-o give the final statement'),
          intent: 'offer',
          requires: { companion: 'tae_o', flag: 'ow_account' },
          approval: { tae_o: 2 },
          success: {
            text: t('태오가 녹음 버튼을 누른다. 짧게 숨을 들이쉬고 자기 이름부터 말한다.', 'Tae-o presses Record. He takes one short breath and begins with his own name.'),
            goto: 'statement',
          },
        },
        {
          label: t('빈 서류함을 닫는다', 'Close the empty slot'),
          intent: 'leave',
          success: { text: t('단말이 중대장과 의무실의 대조 서류를 요청한다. 점호는 계속된다.', 'The terminal requests a comparison from the captain or infirmary. Roll call continues.') },
        },
      ],
    },
    statement: {
      speaker: 'tae_o',
      text: t(
        '“태오. 명단을 넘겼다. 다음 날 그 문을 막았다.” 그가 녹음등을 똑바로 본다. “두 번째 일이 첫 번째를 없애지는 않는다.” 흉터 위로 붉은 불빛이 지나간다. “이대로 남겨라.”',
        '“Tae-o. I handed over the list. The next day I held that door.” He looks straight at the recording light. “The second thing does not erase the first.” Red light passes over his scar. “Keep it as it is.”',
      ),
      options: [
        {
          label: t('말을 보태지 않고 제출한다', 'Submit it without adding a word'),
          intent: 'offer',
          approval: { tae_o: 2 },
          success: {
            text: t('녹음이 잠긴다. 출력된 방어선 도면을 태오가 접어 준다. “다음 문은 여기다.” 그가 보스 구역의 엄폐판 위치를 짚는다.', 'The recording seals. Tae-o folds the printed defensive layout for you. “The next door is here.” He points to the cover panels in the boss sector.'),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 2 }, { kind: 'inspiration', amount: 1 }],
          },
        },
        {
          label: t('접수증만 챙기고 출구로 간다', 'Collect the receipt and head for the exit'),
          intent: 'leave',
          success: {
            text: t('태오가 직접 제출을 누른다. 방어선 도면이 접수증 뒤에 붙는다. 그는 당신 뒤를 지키며 걸어온다.', 'Tae-o presses Submit himself. The defensive layout attaches behind the receipt. He follows, watching your back.'),
            effects: [{ kind: 'quest', id: 'q_old_wound', stage: 2 }],
          },
        },
      ],
    },
  },
}

export const D3_OLD_WOUND_DIALOGUES: DialogueDef[] = [CAPTAIN, MEDIC, STORES, MUSTER]

export const D3_OLD_WOUND_NPCS: NpcDef[] = [
  {
    id: 'wound_captain_jeok',
    name: t('적 중대장', 'Captain Jeok'),
    role: t('해체 부대의 마지막 보고서를 봉인하는 중대장', 'Captain sealing the disbanding unit’s final report'),
    faction: 'grid',
    portrait: 'v2/npcs/wound_captain_jeok.webp',
  },
  {
    id: 'wound_medic_ryu',
    name: t('류 의무관', 'Medic Ryu'),
    role: t('치료 기록을 공적 기록과 구별하는 의무관', 'Unit medic who keeps treatment charts distinct from commendations'),
    faction: 'grid',
    portrait: 'v2/npcs/wound_medic_ryu.webp',
  },
  {
    id: 'wound_keeper_mun',
    name: t('문 보급관', 'Quartermaster Mun'),
    role: t('돌아온 방패의 무게를 재는 보급관', 'Quartermaster weighing the returned shields'),
    faction: 'grid',
    portrait: 'v2/npcs/wound_keeper_mun.webp',
  },
]

export const D3_OLD_WOUND_QUESTS: QuestDef[] = [{
  id: 'q_old_wound',
  title: t('오래된 상처', 'An Old Wound'),
  stages: [
    t('태오의 옛 부대 보고서에 누락이 있다. 원본 대조본을 점호대에 제출할 수 있다.', 'Tae-o’s old unit report has omissions. A comparison with the original can be filed at Muster.'),
    t('삭제하지 않은 진술을 남기고 당시 방어선 도면을 받는다.', 'File the unabridged account and receive the old defensive layout.'),
  ],
  payoff: { stage: 2, bossMod: 'cover', text: t('방어선 도면에 따라 보스 구역의 엄폐판 두 개를 세운다.', 'Use the defensive layout to raise two cover panels in the boss sector.') },
}]
