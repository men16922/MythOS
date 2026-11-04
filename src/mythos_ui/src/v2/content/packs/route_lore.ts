// Route lore (Unwritten Sea, Outside the List): Archive codex entries awarded by those routes' events. The route
// maps roll only their own events, so until 2026-11-04 neither route awarded any codex entry. Sea entries follow
// the DLC 3 bible's order: the blank square and Customs first, the gray tide in Act 5, the Keepers in Act 6; the
// final truth (what the Lightkeeper promised IX) stays for the ending. Merged into LORE by content/index.ts.
import type { LoreEntry } from '../../engine/types.ts'

export const ROUTE_LORE: LoreEntry[] = [
  // District lore (Signal+): awarded when a district quest reaches its last stage.
  {
    id: 'lore_d_errata',
    title: { ko: '정오표', en: 'The Errata' },
    text: {
      ko: '최초 기록에는 고칠 줄의 목록이 따로 있다. 다음 개정 때 목록의 모든 줄이 바르게 된다. 예외는 교정자가 “그대로 둘 것”이라고 표시한 줄뿐이다. 오자에서 생겨난 사람이 하나 있다. 그 사람이 남느냐는 그 부호 하나에 달려 있다.',
      en: 'The first record keeps a separate list of lines to fix. At the next revision every line on it is made correct, except a line the proofreader marks “stet”. One person exists only because of a typo. Whether they remain depends on that single mark.',
    },
  },
  {
    id: 'lore_d_crane_chapel',
    title: { ko: '크레인 예배당', en: 'The Crane Chapel' },
    text: {
      ko: '고철 묘역의 크레인 하나는 몇 년째 기계를 분쇄기에 넣지 않는다. 들어 올린 것을 부수는 건 자기 일이 아니라고 정했다. 그 팔 아래 흙더미마다 꿈을 끝까지 꾸고 싶어 했던 기계가 하나씩 묻혀 있다.',
      en: 'One crane in the scrap graveyard has not fed the crusher in years; it decided breaking what it lifts is not its job. Under its arm, each mound holds one machine that wanted to finish its dream.',
    },
  },
  {
    id: 'lore_d_old_beat',
    title: { ko: '옛 박자', en: 'The Old Beat' },
    text: {
      ko: '등대단의 무적은 길게 둘, 짧게 하나로 운다. 등대지기가 정한 박자다. 그 전에는 짧게 셋, 길게 하나였다. 옛 항로 신호로 “입항 허가”, 들어와도 된다는 뜻이었다. 녹슨 부표 하나가 아직 그 박자로 깜빡인다.',
      en: 'The Keepers’ foghorn sounds two long, one short: the Lightkeeper’s beat. Before that it was three short, one long, the old channel signal for “clear to enter”: you may come in. One rusted buoy still blinks it.',
    },
  },
  {
    id: 'lore_d_letters',
    title: { ko: '등대지기에게 가는 편지', en: 'Letters to the Lightkeeper' },
    text: {
      ko: '해저 케이블 중계 기지는 IX가 지운 것을 다시 바다로 밀어낸다. 그런데 밀어내도 돌아오는 기록이 있다. 수신인이 등대지기인 편지들이다. 첫 줄은 늘 같다. “저희는 바다를 보고 싶었을 뿐입니다.”',
      en: 'The seabed cable relay pushes what IX erases back out to sea. Some records keep coming back anyway: letters addressed to the Lightkeeper. The first line is always the same. “We only wanted to see the sea.”',
    },
  },
  {
    id: 'lore_sea_blank_square',
    title: { ko: '번호 없는 칸', en: 'The Unnumbered Square' },
    text: {
      ko: '네오서울의 낡은 노선도 맨 아래, 남쪽 끝에 번호 없는 칸이 하나 있다. 인쇄 실수가 아니다. IX는 이 칸을 일부러 비웠고, 그 칸으로 가는 화물선로만 남겨 두었다. 지도에서 지운 곳으로 가는 길을 왜 지우지 않았는지는 아무도 묻지 않았다.',
      en: 'At the bottom of Neo-Seoul’s old route maps, at the southern edge, there is one square with no number. It is not a printing error. IX left it blank on purpose and kept only the freight line that runs to it. Nobody asked why the road to an erased place was never erased.',
    },
  },
  {
    id: 'lore_sea_customs',
    title: { ko: '세관 집행국', en: 'Customs Enforcement' },
    text: {
      ko: '해문항의 세관 집행국은 물건과 사람을 검사하고 압류한다. 압류에는 반드시 사유가 붙는다. ‘정박할 선박 없음’, ‘비가동 항만 부속’. 공손하고 정확한 서류가 사람을 지운다. 그래서 이곳에서는 서류가 무기이고, 서류의 빈틈이 피난처다.',
      en: 'Haemun’s Customs Enforcement inspects and seizes goods and people. Every seizure carries a reason: “no vessel to berth”, “attached to a non-operating port”. Polite, exact paperwork erases people. So here paperwork is a weapon, and the gaps in it are shelter.',
    },
  },
  {
    id: 'lore_sea_gray_tide',
    title: { ko: '회색 조수', en: 'The Gray Tide' },
    text: {
      ko: '하루 두 번 해문항으로 밀려오는 회색 물에는 파도 소리가 없다. 웅성거림이 있을 뿐이다. 닿은 사람은 모르는 사람의 부엌, 생일, 이름을 기억하게 된다. 물이 품고 있는 것은 소금이 아니라 기록이다. 어디서 흘러왔는지는 아직 아무도 말하지 않는다.',
      en: 'The gray water that floods Haemun twice a day makes no sound of waves, only murmuring. Whoever it touches starts remembering strangers’ kitchens, birthdays, names. What the water carries is not salt but records. Where it flows from, no one has said yet.',
    },
  },
  {
    id: 'lore_sea_keepers',
    title: { ko: '등대단', en: 'The Keepers' },
    text: {
      ko: '등대로 가는 철탑 길을 지키는 사람들과 항로 표지 기계들. 그들은 무적을 기도처럼 분다. 길게 둘, 짧게 하나. 울릴 때마다 조수가 한 뼘 물러난다. 박자를 정한 것은 등대지기다. 그 박자가 원래 무엇이었는지 기억하는 것은 녹슨 부표 하나뿐이다.',
      en: 'The people and channel-marker machines who guard the causeway to the lighthouse. They sound the foghorn like a prayer: two long, one short. Each blast pushes the tide back a hand’s width. The Lightkeeper set that beat. Only one rusted buoy remembers what it used to be.',
    },
  },
  {
    id: 'lore_outside_list',
    title: { ko: '명단 밖', en: 'Off the List' },
    text: {
      ko: '최적화 명단에 오르지 못한 사람은 폐점 방송 뒤로 존재하지 않는 것이 된다. 그래도 그들은 배식대에 줄을 서고, 세탁물을 걷고, 셔터를 내린다. 등록번호 칸은 비어 있지만 근무 시간은 정확하다. 명단 밖의 삶은 서류 대신 교대표로 기록된다.',
      en: 'Anyone who doesn’t make the optimization list stops existing after the closing broadcast. Still they line up at the serving counter, collect the laundry, pull the shutters. The registration field is blank but the working hours are exact. Life off the list is recorded in shift rosters instead of files.',
    },
  },
  {
    id: 'lore_outside_closing_crew',
    title: { ko: '폐점 정리반', en: 'The Closing Crew' },
    text: {
      ko: '폐점 방송이 끝나면 경광등을 단 정리반이 골목을 돈다. 그들은 얼굴을 보지 않는다. 이름표와 계량기와 노선 카드를 읽는다. 문을 닫고, 닫힌 문 안쪽을 지운다. 정리반원 대부분은 첫 주에 생각보다 이름이 많다는 것을 알게 된다.',
      en: 'When the closing broadcast ends, the Closing Crew walk the alleys under rotating beacons. They don’t look at faces. They read name tags, power meters and route cards. They shut doors and erase what is behind them. Most of the Crew learn in their first week that there are more names than they thought.',
    },
  },
]
