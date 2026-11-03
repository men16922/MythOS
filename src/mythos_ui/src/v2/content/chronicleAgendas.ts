// Chronicle NPC agendas (W4 step 4, prototype): the people with their own goals in 1.0's npc_agendas. Between chapters
// each moves at most one stage, when what the connector carried out allows it (engine/chronicle.ts advanceAgendas).
// The chapter-end screen shows where each one stands.
import type { ChronicleAgendaDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const CHRONICLE_AGENDAS: ChronicleAgendaDef[] = [
  {
    id: 'agenda_serin',
    who: t('정세린', 'Jung Se-rin'),
    goal: t('비접속자 연대 구축', 'An off-grid alliance'),
    stages: [
      { when: { rep: { faction: 'offgrid', min: 1 } }, text: t('세린이 지하 환승층에 모임 시간을 적어 붙인다.', 'Se-rin pins a meeting time on the transfer level wall.') },
      { when: { approval: { id: 'se_rin', min: 3 } }, text: t('모임에 처음 보는 얼굴이 셋 늘었다. 세린이 당신 자리를 비워 둔다.', 'Three new faces at the meeting. Se-rin keeps a seat for you.') },
    ],
  },
  {
    id: 'agenda_linyue',
    who: t('린위에', 'Lin-yue'),
    goal: t('야시장 자산 보존', 'Keeping the market’s assets'),
    stages: [
      { when: { rep: { faction: 'market', min: 1 } }, text: t('린위에가 장부 한 권을 새로 연다. 표지에 당신 이름의 첫 글자.', 'Lin-yue opens a new ledger. Your initial is on the cover.') },
      { when: { quest: { id: 'q_spider', stage: 2 } }, text: t('거미줄 빚이 정리되자 야시장 좌판 두 곳이 다시 불을 켠다.', 'With the spider debt settled, two night-market stalls light up again.') },
    ],
  },
  {
    id: 'agenda_ix',
    who: t('관리자 IX', 'Administrator IX'),
    goal: t('비식별 신호 정정', 'Correcting the unidentified signal'),
    stages: [
      { when: { rep: { faction: 'grid', max: -1 } }, text: t('IX가 당신의 신호에 이름 대신 번호를 붙인다.', 'IX gives your signal a number instead of a name.') },
      { when: { axis: { axis: 'dominance', min: 2 } }, text: t('정정 대상 목록 맨 위에 그 번호가 올라간다.', 'That number moves to the top of the correction list.') },
    ],
  },
  {
    id: 'agenda_kai',
    who: t('카이', 'Kai'),
    goal: t('사람인지 장비인지 증거 찾기', 'Proof: person or equipment'),
    stages: [
      { when: { axis: { axis: 'insight', min: 1 } }, text: t('카이가 꿈 기록과 정비 기록을 나란히 놓고 비교하기 시작한다.', 'Kai starts laying his dream log beside his maintenance log.') },
      { when: { axis: { axis: 'humanity', min: 2 } }, text: t('정비 기록에 없는 한 줄을 찾았다. “우산을 씌워 준 사람이 있었다.”', 'He finds a line no maintenance log has: “Someone held an umbrella over me.”') },
    ],
  },
  {
    id: 'agenda_listed',
    who: t('명단 대상자들', 'The people on the list'),
    goal: t('기억 하나 지키기', 'Keeping one memory'),
    stages: [
      { when: { quest: { id: 'q_shelter', stage: 1 } }, text: t('대피소 벽에 이름 하나가 분필로 적힌다.', 'A name goes up in chalk on the shelter wall.') },
      { when: { quest: { id: 'q_shelter', stage: 2 } }, text: t('분필 이름 옆에 다른 손글씨가 덧붙는다. 지워지지 않게.', 'Another hand writes beside the chalk name, so it will not be wiped.') },
    ],
  },
]
