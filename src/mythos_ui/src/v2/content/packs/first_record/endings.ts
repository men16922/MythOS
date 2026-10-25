// Pack 3 — Deep Signal endings (Act 6: `minAct: 6`) and the true ending (`secret`: only shown once the First
// Connector is beaten). Axis endings read run.axes (engine/run.ts addAxis); the sacrifice stays available too.
import type { EndingDef } from '../../../engine/types.ts'

export const ORIGIN_ENDINGS: EndingDef[] = [
  {
    id: 'ending_city_of_memory',
    title: { ko: '기억의 도시', en: 'City of Memory' },
    image: 'v2/ending/ending_city_of_memory.webp',
    text: {
      ko: '원본 서버에 지워진 이름들을 다시 써 넣는다. 다음 날 아침, 명단에서 사라졌던 사람들이 출근길 지하철에 앉아 있다. 아무도 이유를 모른다. 당신만 안다.',
      en: 'You write the erased names back into the origin server. The next morning, people who vanished from the list are sitting on the commuter train. No one knows why. Only you do.',
    },
    requires: { minAct: 6, axis: { axis: 'humanity', min: 4 } },
    choice: { ko: '지워진 이름을 다시 쓴다', en: 'Write the erased names back' },
    stakes: { ko: '도시가 기억을 되찾는다. IX는 남지만, 더는 지우지 못한다.', en: 'The city remembers. IX stays, but it can no longer erase.' },
    echoBonus: 70,
  },
  {
    id: 'ending_new_administrator',
    title: { ko: '새 관리자', en: 'The New Administrator' },
    image: 'v2/ending/ending_new_administrator.webp',
    text: {
      ko: '관리자 권한이 당신에게 넘어온다. 도시의 모든 화면이 당신의 문장으로 바뀐다. 명령은 정확하고, 거리는 조용하다. 너무 조용해서, 가끔 IX가 그리워진다.',
      en: 'Administrator rights pass to you. Every screen in the city switches to your sentences. Your orders are exact and the streets are quiet. So quiet that sometimes you miss IX.',
    },
    requires: { minAct: 6, axis: { axis: 'dominance', min: 4 } },
    choice: { ko: '관리자 권한을 가져간다', en: 'Take the administrator rights' },
    stakes: { ko: '도시는 당신의 것이 된다. 그만큼 당신도 도시의 것이 된다.', en: 'The city becomes yours — and you become the city’s.' },
    echoBonus: 70,
  },
  {
    id: 'ending_endless_resistance',
    title: { ko: '끝나지 않는 저항', en: 'The Resistance Goes On' },
    image: 'v2/ending/ending_endless_resistance.webp',
    text: {
      ko: '루프 엔진을 끄지 않는다. 대신 엔진실 벽에 낙서를 남긴다. "다음 접속자에게. 여기까지 올 수 있다." 다음 루프의 누군가가 그 글씨를 읽고 웃을 것이다.',
      en: 'You do not shut the loop engine down. You leave graffiti on the engine-room wall instead: "To the next connector. You can make it this far." Someone in the next loop will read it and smile.',
    },
    requires: { minAct: 6, axis: { axis: 'resilience', min: 10 } }, // every elite and boss win adds 1
    choice: { ko: '다음 접속자에게 길을 남긴다', en: 'Leave the way open for the next connector' },
    stakes: { ko: '루프는 계속된다. 다음 루프는 조금 덜 외롭다.', en: 'The loop goes on. The next one is a little less lonely.' },
    echoBonus: 75,
  },
  {
    id: 'ending_the_reader',
    title: { ko: '열람자', en: 'The Reader' },
    image: 'v2/ending/ending_the_reader.webp',
    text: {
      ko: '당신은 아무것도 고치지 않는다. 처음부터 끝까지, 모든 루프의 기록을 읽는다. 마지막 장을 덮었을 때, 당신은 이 도시가 왜 반복되는지 이해한다. 그리고 그 이해를 아무에게도 강요하지 않기로 한다.',
      en: 'You fix nothing. You read the record of every loop from beginning to end. When you close the last page you understand why the city repeats — and you decide not to force that understanding on anyone.',
    },
    requires: { minAct: 6, axis: { axis: 'insight', min: 4 } },
    choice: { ko: '모든 루프의 기록을 읽는다', en: 'Read the record of every loop' },
    stakes: { ko: '세상은 그대로다. 당신만 모든 것을 안다.', en: 'The world is unchanged. Only you know everything.' },
    echoBonus: 75,
  },
  {
    id: 'ending_bond_of_the_left',
    title: { ko: '남겨진 자들의 연대', en: 'Those Left Behind' },
    image: 'v2/ending/ending_bond_of_the_left.webp',
    text: {
      ko: '서버실 바닥에 다 같이 둘러앉는다. 누구도 영웅이 되지 않는다. 대신 다음 날도, 그다음 날도 같이 있기로 한다. 버려진 사람들과 버려진 기계들이 하나의 루프를 나눠 쓴다.',
      en: 'You all sit in a circle on the server-room floor. No one becomes a hero. Instead you agree to be together tomorrow, and the day after. Discarded people and discarded machines share a single loop.',
    },
    requires: { minAct: 6, minBondTotal: 9 },
    choice: { ko: '동료들과 루프를 나눠 쓴다', en: 'Share the loop with your companions' },
    stakes: { ko: '아무도 혼자 남지 않는다.', en: 'No one is left alone.' },
    echoBonus: 80,
  },
  {
    id: 'ending_first_record',
    title: { ko: '첫 번째 접속 기록', en: 'The First Record' },
    image: 'v2/ending/ending_first_record.webp',
    text: {
      ko: '그림자가 무너지며 마지막 기록을 건넨다. 첫 루프의 첫 줄. "누군가 이 도시를 기억해 주기를." 그 문장을 쓴 것은 IX도, 오메가도 아니었다. 처음부터 당신이었다. 이제 반복할 이유가 없다. 당신은 문장 끝에 마침표를 찍는다.',
      en: 'The shadow collapses and hands you the last record: the first line of the first loop. "Let someone remember this city." Neither IX nor Omega wrote it. It was you, from the start. There is no reason left to repeat. You put a full stop at the end of the sentence.',
    },
    requires: { minAct: 6, flag: 'first_connector_won' },
    secret: true,
    choice: { ko: '첫 문장에 마침표를 찍는다', en: 'End the first sentence' },
    stakes: { ko: '루프가 끝난다. 다음 판의 IX는 당신을 기억한다.', en: 'The loop ends. In the next one, IX remembers you.' },
    echoBonus: 120,
  },
]
