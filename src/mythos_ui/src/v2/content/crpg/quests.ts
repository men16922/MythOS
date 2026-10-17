// Signal+ quests (engine/crpg.ts): started and advanced by district conversations. A quest's payoff sets up the next
// boss fight while the quest sits exactly at that stage. `stages[i]` is the journal line for stage i + 1 (a later stage may be another ending, e.g. q_grid's betrayal) (COMBAT_MOD_TEXT in engine/crpg.ts says what each mod does).
import type { QuestDef, Text } from '../../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const QUESTS: QuestDef[] = [
  {
    id: 'q_grid',
    title: t('훔친 전기', 'Stolen Power'),
    stages: [
      t('변전소 17의 사람들은 단속국 몰래 전기를 끌어 쓰고 있다. 오 기사가 그 배선을 쥐고 있다.', 'Substation 17 runs on power stolen from under Enforcement’s nose. Old Oh holds the wiring.'),
      t('오 기사의 배선을 순찰대에게서 숨겨 줬다. 그는 빚을 잊지 않는 사람이다.', 'You hid Oh’s wiring from the patrol. He is not a man who forgets a debt.'),
      t('배선을 단속국에 넘겼다. 변전소의 불이 하나씩 꺼졌다.', 'You handed the wiring to Enforcement. The substation’s lights went out one by one.'),
    ],
    payoff: { stage: 2, bossMod: 'cover', text: t('오 기사의 사람들이 보스 구역에 철판을 세워 둔다.', 'Oh’s people have bolted steel plates across the boss’s arena.') },
  },
  {
    id: 'q_schedule',
    title: t('순찰표', 'The Patrol Sheet'),
    stages: [
      t('구 여사가 이번 주 순찰표를 갖고 있다는 소문이 있다.', 'Word is Madam Ku has this week’s patrol sheet.'),
      t('순찰표를 손에 넣었다. 보스가 어디서 기다리는지 안다.', 'You have the patrol sheet. You know where the boss will be waiting.'),
    ],
    payoff: { stage: 2, bossMod: 'intel', text: t('순찰표 덕에 보스전 첫 턴을 한 발 앞서 시작한다.', 'Thanks to the patrol sheet, you start the boss fight one step ahead.') },
  },
  {
    id: 'q_last_train',
    title: t('마지막 열차', 'The Last Train'),
    stages: [
      t('역장은 폐선된 열차 한 대를 아직 움직일 수 있다고 믿는다. 연료 셀이 없을 뿐이다.', 'The stationmaster believes one decommissioned train can still run. It only lacks a fuel cell.'),
      t('열차가 깨어났다. 역장은 그것을 어디에 쓸지 당신에게 맡겼다.', 'The train is awake. The stationmaster left it to you to decide where it goes.'),
    ],
    payoff: { stage: 2, bossMod: 'weaken', text: t('마지막 열차가 보스의 호위대를 들이받는다.', 'The last train ploughs through the boss’s escort.') },
  },
  {
    id: 'q_sold_summer',
    title: t('팔린 여름', 'A Summer, Sold'),
    stages: [
      t('이슬은 열두 살 여름의 기억을 경매에 내놓았다. 그녀는 그게 무엇이었는지 이미 모른다.', 'Iseul put the summer she was twelve up for auction. She already doesn’t know what it was.'),
      t('경매 장부를 넘겨받았다. 누가 무엇을 샀는지, 보스의 약점까지 적혀 있다.', 'You have the auction ledger. Who bought what — and the boss’s weak points.'),
    ],
    payoff: { stage: 2, bossMod: 'marked', text: t('경매 장부에 적힌 약점: 보스가 표식을 단 채로 시작한다.', 'The ledger lists its weak points: the boss starts Marked.') },
  },
  {
    id: 'q_open_window',
    title: t('열린 창', 'An Open Window'),
    stages: [
      t('창문 청소부 연은 첨탑 외벽의 점검 창 하나가 잠기지 않는다는 걸 안다.', 'Yeon, the window cleaner, knows one inspection hatch on the Spire’s skin never locks.'),
      t('점검 창의 위치를 받았다. 백색의 정상으로 가는 지름길이다.', 'You have the hatch’s location. A shortcut to the white summit.'),
    ],
    payoff: { stage: 2, bossMod: 'intel', text: t('점검 창으로 먼저 들어가 첫 턴을 앞서 시작한다.', 'In through the hatch first: the first turn is yours.') },
  },
  {
    id: 'q_names',
    title: t('이름들', 'The Names'),
    stages: [
      t('보관관 07은 지워진 시민들의 이름을 몰래 남겨 두었다. 누군가 그것을 밖으로 가져가 주기를 기다린다.', 'Archivist 07 has secretly kept the names of erased citizens. It is waiting for someone to carry them out.'),
      t('이름 목록을 받았다. 첨탑의 경비 체계가 그 이름들 때문에 흔들린다.', 'You carry the list of names. The Spire’s guard systems falter around them.'),
    ],
    payoff: { stage: 2, bossMod: 'weaken', text: t('되살아난 이름들이 경비 체계를 흔든다: 적 체력 -25%.', 'Restored names shake the guard systems: enemies at -25% HP.') },
  },
]
