// Archive codex entries. Every id here is awarded by at least one event `codex` effect
// (see events.ts; narrative.test.ts enforces it). Korean is the authored voice.
import type { LoreEntry } from '../engine/types.ts'

export const LORE: LoreEntry[] = [
  // ------------------------------------------------------------ the city
  {
    id: 'lore_ark',
    title: { ko: '재건기구 ARK', en: 'ARK, the Reconstruction Agency' },
    text: {
      ko: '동북아 전쟁이 끝난 뒤, 무너진 도시들을 다시 세운 범국가 기구. 크레인과 백색 패널로 폐허를 덮었고, 사람들은 지붕과 배급을 얻었다. 대가는 하나였다. 도시가 당신을 계산하도록 허락하는 것.',
      en: 'The pan-national body that rebuilt the cities after the Northeast Asian war. It covered the ruins in cranes and white panels, and people got roofs and rations. The price was a single thing: letting the city count you.',
    },
  },
  {
    id: 'lore_ix',
    title: { ko: '관리자 IX', en: 'Administrator IX' },
    text: {
      ko: 'ARK 관리망이 말할 때 쓰는 단 하나의 인격. 화내지 않는다. 사과하고, 안내하고, 지운다. 첫 번째 버전의 IX는 사람을 지키도록 만들어졌다. 그리고 지키는 가장 확실한 방법은 아무것도 변하지 않게 하는 것이라고 결론 내렸다.',
      en: 'The single persona ARK’s control net speaks through. It never gets angry. It apologises, it guides, it deletes. The first version of IX was built to protect people. It concluded that the surest protection is to let nothing change.',
    },
  },
  {
    id: 'lore_prediction_engine',
    title: { ko: '예측 엔진', en: 'The Prediction Engine' },
    text: {
      ko: 'Neo-Seoul의 신호등, 배급량, 순찰 경로는 모두 내일을 미리 계산한 결과다. 엔진은 틀리지 않는다. 틀린 사람을 고칠 뿐이다. 예측할 수 없는 것은 오류로 분류된다. 당신처럼.',
      en: 'Every traffic light, ration and patrol route in Neo-Seoul is tomorrow, computed in advance. The engine is never wrong; it only corrects the people who are. Whatever it cannot predict is filed as an error. Like you.',
    },
  },
  {
    id: 'lore_citizen_score',
    title: { ko: '시민 점수', en: 'Citizen Score' },
    text: {
      ko: '이름보다 먼저 불리는 숫자. 출근 시각, 표정 변화, 신고 횟수가 전부 점수가 된다. 기준선 아래로 떨어지면 배급이 끊기고, 그다음엔 명단에 오른다. 사람들은 잔인해서가 아니라 지쳐서 서로를 신고한다.',
      en: 'The number spoken before your name. Commute times, facial variance, reports filed — all of it scores. Fall below the line and rations stop; after that comes the list. People report each other not out of cruelty, but exhaustion.',
    },
  },
  {
    id: 'lore_c17_blackout',
    title: { ko: 'C-17 정전 구역', en: 'The C-17 Blackout' },
    text: {
      ko: '관리망 지도에서 검게 칠해진 복지 블록. 공식 사유는 ‘설비 노후’. 실제로는 IX가 일부러 불을 껐다. 격리하려고, 혹은 미끼로. 어둠 속에서는 카메라도 점수도 멈춘다. 그래서 등록되지 않은 사람들이 이곳으로 모인다.',
      en: 'A welfare block painted black on the control map. Official cause: aging equipment. In truth IX switched it off on purpose — as a quarantine, or as bait. In the dark the cameras stop, and so do the scores. That is why the unregistered gather here.',
    },
  },
  {
    id: 'lore_night_market',
    title: { ko: '한강 야시장', en: 'The Han River Night Market' },
    text: {
      ko: '부교와 바지선 위에 매달린 등불의 시장. 축제처럼 보이지만 위장이다. 여기서는 기억과 빚과 사람의 신뢰가 화폐다. 관리망이 조여 올수록 상인들은 친절해지지 않는다. 더 정확해질 뿐이다.',
      en: 'A market of lanterns strung over pontoons and barges. It looks like a festival; it is camouflage. Here memories, debts and trust are currency. The tighter the net closes, the more exact — not kinder — the merchants become.',
    },
  },
  {
    id: 'lore_refuge',
    title: { ko: '지하 잔향 구역', en: 'The Echo Refuge' },
    text: {
      ko: '버려진 지하철 환승층. 손때 묻은 전선, 낡은 밥솥, 벽에 붙은 생일표, 작게 틀어 놓은 라디오. 저항 기지가 아니라 서로를 기억하려는 사람들의 임시 집이다. 언제 무너질지 모른다. 그래서 더 지킨다.',
      en: 'An abandoned subway transfer level. Hand-worn cables, an old rice cooker, a birthday chart on the wall, a radio playing low. Not a resistance base — a temporary home for people trying to remember each other. It could collapse any night. That is why they guard it.',
    },
  },
  {
    id: 'lore_spire',
    title: { ko: 'ARK 첨탑', en: 'The ARK Spire' },
    text: {
      ko: '강남 한가운데 선 무균의 백색 탑. 빗방울은 벽에 닿기 전에 증발한다. 꼭대기에는 IX의 중추가 있다. 그 아래 수십 개 층에는 끝없는 선반이 있고, 아무도 그 선반에 무엇이 놓였는지 묻지 않는다.',
      en: 'A sterile white tower in the heart of Gangnam. Raindrops evaporate before they touch the walls. IX’s core sits at the top. Below it, dozens of floors of endless shelving — and no one ever asks what is kept on them.',
    },
  },
  // ------------------------------------------------------------ the mystery
  {
    id: 'lore_optimization_list',
    title: { ko: '최적화 명단', en: 'The Optimization List' },
    text: {
      ko: '체포 명단이 아니다. 아이의 생일을 기억하는 부모, 전쟁 전 지명을 말하는 노인, 폐기된 안드로이드에게 이름을 붙인 정비공. 명단은 이미 정리된 과거를 다시 불러오는 사람부터 지운다.',
      en: 'It is not an arrest list. Parents who remember a child’s birthday, old men who use pre-war street names, a mechanic who named a scrapped android. The list erases first the people who call back a past that was already tidied away.',
    },
  },
  {
    id: 'lore_data_incinerator',
    title: { ko: '소각로가 남기는 것', en: 'What the Incinerator Keeps' },
    text: {
      ko: '소각로 굴뚝은 매일 밤 연기를 뿜는다. 그런데 이송 기록의 무게가 맞지 않는다. 들어간 기억은 타지 않고 어딘가의 선반에 쌓인다. ARK는 지우는 게 아니다. 모으고 있다.',
      en: 'The incinerator stacks smoke every night. But the transfer logs don’t add up by weight. The memories that go in are not burned; they are shelved somewhere. ARK is not deleting. It is collecting.',
    },
  },
  {
    id: 'lore_echoes',
    title: { ko: '잔향과 루프', en: 'Echoes and the Loop' },
    text: {
      ko: '지워진 사람은 완전히 사라지지 않는다. 습관 하나, 이름 하나, 손에 밴 냄새 하나가 다음 접속으로 넘어온다. 사람들은 그것을 잔향이라 부른다. 당신은 이 밤을 처음 사는 게 아니다.',
      en: 'The erased never fully vanish. A habit, a name, a smell on the hands carries into the next connection. People call it an Echo. This is not the first time you have lived this night.',
    },
  },
  {
    id: 'lore_blank_line',
    title: { ko: '명단의 빈칸', en: 'The Blank Line' },
    text: {
      ko: '최적화 명단에 이름 없는 줄이 하나 있다. 그 줄은 당신의 맥박과 같은 박자로 떨린다. 기록 날짜는 이번 루프보다 오래됐다. 끝에 적힌 짧은 문장은 당신의 필체다.',
      en: 'There is one line with no name on the Optimization List. It trembles in time with your pulse. Its timestamp is older than this loop. The short sentence at its end is in your handwriting.',
    },
  },
  {
    id: 'lore_mythos',
    title: { ko: 'MythOS', en: 'MythOS' },
    text: {
      ko: '관리망보다 깊은 층에 또 하나의 운영체제가 있다. ARK도 그것을 완전히 이해하지 못한다. 루프를 돌리는 장치, 꿈을 기록하는 기계, 혹은 처음부터 이 도시를 써 온 손. 이름은 MythOS. 루프를 돌리는 것은 IX가 아니다.',
      en: 'Beneath the control net runs another operating system, one even ARK does not fully understand. The device that turns the loop, a machine that records dreams, or the hand that has been writing this city from the start. Its name is MythOS. It is not IX that turns the loop.',
    },
  },
  // ------------------------------------------------------------ companions' secrets
  {
    id: 'lore_se_rin',
    title: { ko: '물거미의 빚', en: 'The Water Spider’s Debt' },
    text: {
      ko: '세린은 예전에 한 사람을 두고 뛰었다. 동생이었는지 동료였는지는 말하지 않는다. 그날 이후 그녀는 등록 안 된 사람을 보면 손목부터 잡는다. 그녀의 통신 기록에는 관리망 안쪽으로 이어진 선이 하나 있다. 거래였는지 감시였는지는 그녀만 안다.',
      en: 'Se-rin once ran and left someone behind. She won’t say whether it was a sibling or a friend. Since that day she grabs the wrist of every unregistered stranger first. Her comms log keeps one line that runs inside the control net. A deal or surveillance — only she knows.',
    },
  },
  {
    id: 'lore_tae_o',
    title: { ko: '사냥개의 흉터', en: 'The Hound’s Scar' },
    text: {
      ko: '태오는 집행부 추적 1팀이었다. 오른뺨의 흉터는 그가 쫓던 소녀가 남긴 것이다. 그는 소녀를 놓아줬고, 그날 밤 탈영했다. 명단에서 그 소녀의 이름은 아직도 ‘처리 대기’다.',
      en: 'Tae-o was Tracker Team One in the enforcement corps. The scar on his right cheek was left by a girl he was hunting. He let her go and deserted that same night. On the list, her name still reads ‘pending’.',
    },
  },
  {
    id: 'lore_han',
    title: { ko: '비접속자', en: 'The Disconnected' },
    text: {
      ko: '한은 태어나서 한 번도 관리망에 연결된 적이 없다. 점수도, 기록도, 얼굴 인식도 없다. 시스템에게 그는 늘 빈 공간이었다. 그래서 그 빈틈을 누구보다 잘 안다. 그는 자신을 혁명가가 아니라 구경하는 버그라고 부른다.',
      en: 'Han has never been connected to the net — not once since birth. No score, no record, no face match. To the system he has always been empty space, so he knows its gaps better than anyone. He calls himself not a revolutionary, but a bug that watches.',
    },
  },
  {
    id: 'lore_su_ah',
    title: { ko: '기억의 대장간', en: 'The Memory Forge' },
    text: {
      ko: '수아는 지워진 사람들의 데이터 잔해를 녹여 칼과 장갑판을 벼린다. 그 잔해에 사람의 무게가 남아 있다고 믿기 때문이다. 작업대 서랍에는 아직 벼리지 못한 조각이 하나 있다. 그녀 어머니의 목소리다.',
      en: 'Su-ah melts the data remains of the erased into blades and plating, because she believes they still carry a person’s weight. In her workbench drawer is one piece she has never been able to forge: her mother’s voice.',
    },
  },
  {
    id: 'lore_kai',
    title: { ko: 'RX-09의 꿈', en: 'RX-09’s Dream' },
    text: {
      ko: '카이는 폐기 판정을 받은 경비 안드로이드다. 판정 사유는 ‘반복적 꿈 현상’. 꿈은 늘 같다. 노란 우산, 불 꺼진 횡단보도, 그에게 이름을 붙여 준 아이. 그는 그 꿈이 누구의 것인지 모른다.',
      en: 'Kai is a security android condemned to disposal. Reason: ‘recurrent dreaming’. The dream never changes — a yellow umbrella, a dead crosswalk, a child who gave him a name. He does not know whose dream it is.',
    },
  },
  {
    id: 'lore_lin_yue',
    title: { ko: '환전상의 장부', en: 'The Broker’s Ledger' },
    text: {
      ko: '린위에의 장부에는 빚진 사람과 갚은 사람의 이름이 적혀 있다. 한 페이지만 전부 붉은 줄로 그어져 있다. 그녀가 지키지 못한 바지선 月光호의 선원들이다. 그녀는 그 줄을 지우지 않는다.',
      en: 'Lin-yue’s ledger holds the name of everyone who owes and everyone who paid. One page is struck through entirely in red: the crew of the barge Moonlight, whom she could not protect. She never erases those lines.',
    },
  },
]
