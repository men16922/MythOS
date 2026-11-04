// Route lore (Unwritten Sea, Outside the List): Archive codex entries awarded by those routes' events. The route
// maps roll only their own events, so until 2026-11-04 neither route awarded any codex entry. Sea entries follow
// the DLC 3 bible's order: the blank square and Customs first, the gray tide in Act 5, the Keepers in Act 6; the
// final truth (what the Lightkeeper promised IX) stays for the ending. Merged into LORE by content/index.ts.
import type { LoreEntry } from '../../engine/types.ts'

export const ROUTE_LORE: LoreEntry[] = [
  // District lore (Signal+): awarded when a district quest reaches its last stage.
  {
    id: 'lore_d_name_tags',
    title: { ko: '꿰맨 이름표', en: 'Sewn Name Tags' },
    text: {
      ko: '명단 밖 사람들은 작업복 가슴에 이름표를 꿰매 단다. 서류에 남지 않는 이름이 세탁소 빨랫줄에서는 하루에 한 번씩 다시 걸린다. 정리반이 오는 밤에는 이름표를 안쪽으로 뒤집어 단다. 이름은 그대로 있고, 보이지만 않는다.',
      en: 'People off the list sew name tags onto the chests of their work clothes. A name no file keeps is hung up again once a day on the laundry lines. On nights the Crew comes, the tags are turned inward. The name is still there. It just can’t be seen.',
    },
  },
  {
    id: 'lore_d_meter_hour',
    title: { ko: '검침 시간', en: 'Meter Hour' },
    text: {
      ko: '정리반은 사람을 세지 않고 계량기 바늘을 센다. 명단 밖 집들의 전기는 전기공 한 사람이 따 준 선에서 나온다. 한 골목이 그 선 하나를 나눠 쓰면, 장부에는 한 집으로 적힌다. 밥솥 열 개가 바늘 하나로 돈다.',
      en: 'The Crew don’t count people; they count meter dials. Power for off-list flats comes from lines one electrician tapped. When a whole alley shares a single line, the ledger records one flat. Ten rice cookers turn one dial.',
    },
  },
  {
    id: 'lore_d_night_bus',
    title: { ko: '심야 버스', en: 'The Night Bus' },
    text: {
      ko: '폐점 뒤 명단 밖 사람들을 집에 데려다주는 버스는 한 대뿐이다. 어느 운행표에도 그 노선은 없다. 기사는 정류장 대신 얼굴을 외운다. 정리반이 노선 카드를 회수하면 문이 열리지 않는다. 그래서 카드는 매일 밤 다른 사람의 주머니에서 잔다.',
      en: 'Only one bus takes off-list people home after closing. Its route is on no schedule; the driver memorizes faces instead of stops. Once the Crew pull the route card, the doors won’t open, so each night the card sleeps in someone else’s pocket.',
    },
  },
  {
    id: 'lore_d_shift_clock',
    title: { ko: '압류 412번', en: 'Seizure No. 412' },
    text: {
      ko: '하역조의 교대 시계는 배가 들어올 때마다 종을 쳤다. 배가 끊긴 뒤에도 하역조는 그 종에 맞춰 잠들고 일어났다. 세관은 시계를 압류했다. 하역조는 그 뒤로 조수에 맞춰 교대했다. 시계가 돌아오면 첫 종은 막내가 친다.',
      en: 'The longshore crew’s shift clock rang each time a ship came in. After the ships stopped, the crew still slept and woke by its bell. Customs seized the clock, and the crew changed shifts by the tide instead. When the clock comes back, the youngest rings the first bell.',
    },
  },
  {
    id: 'lore_d_rope',
    title: { ko: '밧줄 규칙', en: 'The Rope Rule' },
    text: {
      ko: '썰물 여울에 들어가는 사람은 허리에 밧줄을 묶는다. 물가에서 다른 사람이 그 끝을 쥔다. 손에 잡히는 것 중에는 남의 기억도 섞여 있다. 그래서 건져 올린 것은 알아보는 사람에게 돌아간다. 밧줄을 놓친 사람은 돌아오지 않는다. 물에 들어갈 때는 셋, 나올 때는 둘이 되는 날도 있다.',
      en: 'Anyone wading into the low-tide shallows ties a rope round their waist, and someone on the shore holds the other end. What the hand closes on is often a stranger’s memory, so whatever comes up goes to whoever recognizes it. Whoever loses the rope does not come back. Some days three go in and two come out.',
    },
  },
  {
    id: 'lore_d_lens_window',
    title: { ko: '렌즈의 창문', en: 'The Window in the Lens' },
    text: {
      ko: '옛날 등대 렌즈에는 대개 작은 흠이 있었다. 배들은 그 흠이 만드는 깜빡임으로 자기 항구를 알아봤다. 등대단 점검표에는 흠이 불량으로 적힌다. 렌즈 장인 목 영감은 새 렌즈에 머리카락만 한 흠을 일부러 남겼다. 하룻밤에 한 번, 빛이 그 틈으로 새어 나간다.',
      en: 'Old lighthouse lenses usually carried a small flaw, and ships knew their harbor by the flicker it made. On the Keepers’ checklist a flaw is a defect. Old Mok, the lens grinder, left a hairline one in the new lens on purpose. Once a night, light leaks through it.',
    },
  },
  {
    id: 'lore_d_seal_tape',
    title: { ko: '엑스 자 테이프', en: 'The X of Tape' },
    text: {
      ko: '마른 항구의 빈 컨테이너에는 가족들이 산다. 세관 봉인반이 문에 테이프를 엑스 자로 붙이면 그 컨테이너는 서류에서 사라진다. 안에 있던 사람도 함께 사라진다. 봉인반은 문 앞에 붙은 서식은 끝까지 읽는다. 그래서 골목 사람들은 이의 신청서를 베껴 둔다.',
      en: 'Families live in the empty containers on the dry harbor floor. When the Customs sealing team tapes an X across a door, that container vanishes from the files, and whoever is inside vanishes with it. The sealers always read a form taped to a door to the end, so the alley keeps copies of the objection form.',
    },
  },
  {
    id: 'lore_d_tide_table',
    title: { ko: '삼십 년치 조석표', en: 'Thirty Years of Tide Tables' },
    text: {
      ko: '배가 끊긴 뒤에도 하역조 기숙사 식당 벽에는 매일 새 조석표가 붙었다. 지난 것은 한 사물함에 모였다. 삼십 년치다. 세관은 기숙사를 “비운영 항만 부속 숙소”로 폐쇄하려 했다. 검사관은 그 사물함 앞에서 확인서에 “해당 없음”이라고 적었다.',
      en: 'After the ships stopped, a new tide table still went up on the crew dormitory’s mess wall every day, and the old ones went into one locker: thirty years’ worth. Customs tried to close the dormitory as “housing attached to a non-operating port”. In front of that locker the inspector wrote “not applicable”.',
    },
  },
  {
    id: 'lore_d_jelly_drone',
    title: { ko: '해파리 드론', en: 'The Jellyfish Drones' },
    text: {
      ko: '바지선 시장 사이를 반투명한 해파리 드론들이 떠다닌다. 회색 조수가 지나가면 그 몸통에 남의 기억이 하나씩 걸린다. 부엌, 냄비, 창문 같은 것들이다. 드론은 그 기억을 버리지 않는다. 주인을 찾을 때까지 시장을 돈다.',
      en: 'Translucent jellyfish drones drift between the barges of the market. When the gray tide passes, one of them comes away with a stranger’s memory caught in its body: a kitchen, a pot, a window. The drone does not drop it. It circles the market until it finds whose it is.',
    },
  },
  {
    id: 'lore_d_seventeen',
    title: { ko: '404호를 두드리는 아이', en: 'The Knock at 404' },
    text: {
      ko: '간척 단지에는 썰물 때마다 젖은 교복을 입은 형체가 나타나 404호 문을 두드린다. 그 아이의 이름은 어디에도 남지 않았다. 출석부에는 번호뿐이었고, 그 번호는 십칠 번이었다. 형체는 문을 열어 달라고 하지 않는다. 불러 줄 이름을 달라고 한다.',
      en: 'At every low tide a figure in a soaked school uniform knocks at door 404 of the reclamation estate. The child’s name survived nowhere; the class register had only a number, and the number was seventeen. The figure does not ask for the door to open. It asks for a name to be called by.',
    },
  },
  {
    id: 'lore_d_off_pitch',
    title: { ko: '반음 어긋난 합창', en: 'The Choir Off Pitch' },
    text: {
      ko: '고철 묘역에 버려진 기계들은 모두 같은 꿈을 노래로 흥얼거린다. 그런데 기계마다 음이 조금씩 어긋나 있다. 그래서 노래는 늘 마지막 마디 바로 앞에서 멈춘다. 기준음 하나만 있으면 끝까지 갈 수 있다. 조율사 달은 녹슨 소리굽쇠로 그 음을 찾고 있다.',
      en: 'The discarded machines in the scrap graveyard all hum the same dream as a song, each a little off pitch. So it always stops just before the last bar. One reference note would carry it to the end, and Dal the tuner is still searching for it with a rusted tuning fork.',
    },
  },
  {
    id: 'lore_d_minus_forty',
    title: { ko: '영하 사십 도', en: 'Minus Forty' },
    text: {
      ko: '분류되지 못한 기계들은 묘역 아래 냉동 선반에 꿈을 꾸던 채로 얼려진다. 영하 사십 도에서는 꿈이 상하지 않는다. 녹이면 기계보다 꿈이 먼저 깬다. 전원, 기억, 눈의 순서로 천천히 깨우면 기계는 꿈을 끝까지 보고 일어난다. 서두르면 꿈이 서리처럼 흩어진다.',
      en: 'Machines the graveyard could not sort are frozen mid-dream on shelves beneath it. At minus forty a dream does not spoil. Thawed, the dream wakes before the machine does. Woken slowly, power then memory then eyes, a machine sees its dream through before it rises. Hurry it, and the dream scatters like frost.',
    },
  },
  {
    id: 'lore_d_struck_streets',
    title: { ko: '두 줄 그은 거리', en: 'The Doubly Struck Streets' },
    text: {
      ko: '도시의 초고에서 편집자는 거리를 빨간 펜으로 지운다. 도시가 짧을수록 관리하기 쉽다는 이유다. 지워진 거리에도 사람들은 그대로 산다. 잃은 것은 이름뿐이다. 그 이름을 다시 쓰려면 편집자 펜보다 진한 잉크가 필요하다.',
      en: 'In the city’s first draft, the editor strikes streets out with a red pen: the shorter the city, the easier to manage. People go on living in the struck streets; only the name is gone. To write it back you need ink darker than the editor’s pen.',
    },
  },
  {
    id: 'lore_d_margins',
    title: { ko: '본문과 여백', en: 'Text and Margin' },
    text: {
      ko: '최초 기록의 본문은 IX가 썼다. 여백은 루프마다 접속자들이 썼다. 필사가 하는 둘 다 옮겨 적는다. 지우개를 든 아이가 여백을 하나씩 지운다. 깨끗한 쪽이 다음 루프에 더 잘 써진다고 들었기 때문이다. 여백의 줄을 읽고 여기까지 온 접속자는 한 줄을 남기고 간다.',
      en: 'IX wrote the text of the first record; connectors wrote the margins, one loop at a time. Ha the scribe copies both. A child with an eraser wipes the margins one by one, having been told clean pages write better next loop. A connector who got this far by reading a margin line leaves a line behind.',
    },
  },
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
