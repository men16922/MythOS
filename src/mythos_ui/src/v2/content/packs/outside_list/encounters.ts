// Pack 4 — the route's fights. Three Relay fights (a unit on the dashed tile takes direct hits meant for the citizen,
// enemy included), two escorts (the citizen walks out and the tile walks with them), a hold, three plain streets, an
// event ambush, three elites and two bosses. No citizen dies to a rule: losing one only loses the bonus.
import type { EncounterDef, Pos, Text, TileKind } from '../../../engine/types.ts'
import { OUTSIDE_ROUTE } from './act.ts'

const t = (ko: string, en: string): Text => ({ ko, en })
const at = (x: number, y: number): Pos => ({ x, y })
const tiles = (kind: TileKind, ...ps: [number, number][]): { pos: Pos; kind: TileKind }[] => ps.map(([x, y]) => ({ pos: at(x, y), kind }))
const foe = (id: string, x: number, y: number): { id: string; pos: Pos } => ({ id, pos: at(x, y) })
const base = { route: OUTSIDE_ROUTE, act: 2, backdrop: 'undercity' } as const

export const OUTSIDE_ENCOUNTERS: EncounterDef[] = [
  // ---------------------------------------------------------------- Relay
  {
    ...base,
    id: 'outside_serving',
    kind: 'normal',
    name: t('마지막 배식', 'Last Serving'),
    enemies: [foe('notice_drone', 5, 1), foe('shutter_bot', 6, 3), foe('ledger_mite', 5, 4)],
    terrain: tiles('cover', [3, 1], [4, 3]),
    neutral: { name: t('배식 담당', 'The Server'), sprite: 'listed-citizen', hp: 14, pos: at(2, 2) },
    relay: at(3, 2),
    bonus: { kind: 'protect' },
    intro: t(
      '배식 담당은 국자를 놓지 않는다. 점선 칸에 선 누군가가 대신 맞는다. 적을 밀어 넣어도 된다.',
      'The server will not put the ladle down. Whoever stands on the dashed tile takes the hit instead. Push an enemy in, if you can.',
    ),
  },
  {
    ...base,
    id: 'outside_pickup',
    kind: 'normal',
    name: t('수거 종료', 'Last Pickup'),
    enemies: [foe('shutter_bot', 5, 2), foe('notice_drone', 6, 0), foe('lock_hound', 4, 4)],
    terrain: tiles('cover', [2, 0], [3, 3]),
    neutral: { name: t('세탁물 수거원', 'The Laundry Runner'), sprite: 'listed-citizen', hp: 12, pos: at(1, 1) },
    relay: at(2, 1),
    reinforcements: [{ turn: 3, enemies: [foe('notice_drone', 6, 4)] }],
    bonus: { kind: 'protect' },
    intro: t(
      '수거원이 장치를 끄기 전에는 자리를 뜨지 않는다. 오늘 치 빨래가 아직 남았다.',
      'The runner will not leave until the machine is off. Tonight’s load is not done.',
    ),
  },
  {
    ...base,
    id: 'outside_door',
    kind: 'normal',
    name: t('문을 잡는 사람', 'Holding the Door'),
    enemies: [foe('notice_drone', 5, 1), foe('wash_unit', 5, 3), foe('shutter_bot', 6, 2)],
    terrain: tiles('cover', [4, 1], [3, 4]),
    neutral: { name: t('문지기', 'The Doorkeeper'), sprite: 'listed-citizen', hp: 16, pos: at(2, 3) },
    relay: at(3, 3),
    reinforcements: [{ turn: 3, enemies: [foe('ledger_mite', 6, 4)] }],
    bonus: { kind: 'protect' },
    intro: t(
      '다들 나갈 때까지 문은 그 사람 손에 있다. 관리망은 그 손부터 지우려 한다.',
      'The door stays in their hands until everyone is out. The grid means to erase the hands first.',
    ),
  },
  // ---------------------------------------------------------------- escorts
  {
    ...base,
    id: 'outside_queue',
    kind: 'normal',
    name: t('줄의 맨 끝', 'End of the Line'),
    enemies: [foe('notice_drone', 5, 1), foe('wash_unit', 6, 3), foe('lock_hound', 5, 4)],
    terrain: tiles('cover', [4, 2]),
    neutral: { name: t('줄 끝의 노인', 'The Old Man at the End of the Line'), sprite: 'listed-citizen', hp: 14, pos: at(2, 0) },
    relay: at(3, 0),
    walkTo: at(2, 4),
    objective: { kind: 'survive', turns: 6 },
    bonus: { kind: 'protect' },
    intro: t(
      '노인은 그릇을 들고 출구까지 걷는다. 재촉해도 소용없다. 점선 칸이 함께 걸어간다.',
      'The old man carries his bowl to the exit at his own pace. The dashed tile walks with him.',
    ),
  },
  {
    ...base,
    id: 'outside_stairs',
    kind: 'normal',
    name: t('계단까지', 'As Far as the Stairs'),
    enemies: [foe('shutter_bot', 6, 1), foe('meter_reader', 6, 3), foe('collection_clerk', 6, 4)],
    terrain: tiles('void', [3, 0], [3, 4]),
    neutral: { name: t('장부 든 수선공', 'The Mender with the Ledger'), sprite: 'listed-citizen', hp: 15, pos: at(5, 2) },
    relay: at(5, 1),
    walkTo: at(2, 2),
    objective: { kind: 'survive', turns: 5 },
    bonus: { kind: 'protect' },
    intro: t(
      '수선공이 빚 장부를 품고 계단 쪽으로 온다. 뒤쪽은 정리반이 막았다. 이쪽으로 데려와.',
      'The mender is coming your way with the debt ledger under one arm. The crew has the far end. Bring them in.',
    ),
  },
  // ---------------------------------------------------------------- streets
  {
    ...base,
    id: 'outside_shutters',
    kind: 'normal',
    name: t('셔터가 내려올 때까지', 'Until the Shutters Are Down'),
    enemies: [foe('shutter_bot', 5, 1), foe('shutter_bot', 5, 3), foe('lock_hound', 6, 2)],
    terrain: [...tiles('cover', [3, 0], [3, 4]), ...tiles('hazard', [4, 2])],
    objective: { kind: 'survive', turns: 5 },
    intro: t(
      '상인들이 셔터를 다 내릴 때까지 다섯 턴. 전부 잡을 필요는 없다.',
      'Five turns until the stallholders have their shutters down. You do not have to beat them all.',
    ),
  },
  {
    ...base,
    id: 'outside_meter',
    kind: 'normal',
    name: t('검침 시간', 'Meter Hour'),
    enemies: [foe('meter_reader', 6, 1), foe('meter_reader', 6, 3), foe('lock_hound', 4, 2)],
    terrain: [...tiles('cover', [3, 1], [3, 3]), ...tiles('void', [5, 2])],
    intro: t('검침원은 멀리서 던진다. 개를 넘어 뒷줄까지 가라.', 'The readers throw from the back. Get past the hound.'),
  },
  {
    ...base,
    id: 'outside_wash',
    kind: 'normal',
    name: t('물청소', 'Hosing Down'),
    enemies: [foe('wash_unit', 5, 1), foe('wash_unit', 5, 3), foe('ledger_mite', 4, 0), foe('ledger_mite', 4, 4)],
    terrain: [...tiles('hazard', [3, 2], [4, 2]), ...tiles('void', [6, 0], [6, 4])],
    intro: t('젖은 바닥에 전선이 늘어져 있다. 먼저 밀리는 쪽이 감전된다.', 'Live cable lies on the wet floor. Whoever gets pushed first gets the shock.'),
  },
  // ---------------------------------------------------------------- event fight
  {
    ...base,
    id: 'outside_event_ambush',
    kind: 'normal',
    name: t('골목 단속', 'Alley Sweep'),
    enemies: [foe('collection_clerk', 4, 2), foe('lock_hound', 6, 1), foe('notice_drone', 6, 3)],
    reinforcements: [{ turn: 2, enemies: [foe('ledger_mite', 6, 2)] }],
    terrain: [...tiles('cover', [2, 2]), ...tiles('void', [4, 0], [5, 4])],
    intro: t('경광등이 골목 양쪽에서 동시에 켜진다.', 'Beacons light up at both ends of the alley at once.'),
  },
  // ---------------------------------------------------------------- elites
  {
    ...base,
    id: 'outside_elite_inspector',
    kind: 'elite',
    name: t('야간 감독', 'The Night Inspection'),
    enemies: [foe('night_inspector', 6, 2), foe('shutter_bot', 4, 1), foe('lock_hound', 5, 4)],
    terrain: [...tiles('cover', [3, 2], [5, 0]), ...tiles('hazard', [4, 3])],
    intro: t('감독관이 서명할 때마다 부하들이 단단해진다. 서명하기 전에 끊어라.', 'Each signature hardens the crew. Cut in before the next one.'),
  },
  {
    ...base,
    id: 'outside_elite_rig',
    kind: 'elite',
    name: t('철거 통지', 'Demolition Notice'),
    enemies: [foe('wrecking_rig', 5, 2), foe('ledger_mite', 4, 0), foe('ledger_mite', 4, 4)],
    terrain: [...tiles('void', [3, 0], [3, 4]), ...tiles('hazard', [6, 1], [6, 3])],
    neutral: { name: t('가판 주인', 'The Stall Owner'), sprite: 'listed-citizen', hp: 18, pos: at(2, 2) },
    relay: at(3, 2),
    bonus: { kind: 'protect' },
    intro: t('가판 주인이 자리를 지킨다. 중기가 시동을 건다.', 'The stall owner stays put. The rig starts its engine.'),
  },
  {
    ...base,
    id: 'outside_elite_foreman',
    kind: 'elite',
    name: t('잔반 소각', 'Burning the Refuse'),
    enemies: [foe('sweep_foreman', 6, 2), foe('collection_clerk', 4, 1), foe('lock_hound', 4, 3)],
    terrain: [...tiles('cover', [2, 1], [2, 3]), ...tiles('void', [5, 0], [5, 4])],
    intro: t('반장은 뒤에서 불만 놓는다. 불이 번지기 전에 앞줄을 뚫어라.', 'The foreman stays back and sets fires. Break the front line before they spread.'),
  },
  // ---------------------------------------------------------------- bosses
  {
    ...base,
    id: 'outside_boss_bell',
    kind: 'boss',
    name: t('마감 종', 'THE CLOSING BELL'),
    enemies: [foe('closing_bell', 5, 2), foe('ledger_mite', 6, 0), foe('ledger_mite', 6, 4)],
    terrain: [...tiles('cover', [3, 0], [3, 4]), ...tiles('hazard', [4, 1], [4, 3])],
    neutral: { name: t('종탑 아래 상인', 'The Vendor Under the Bell'), sprite: 'listed-citizen', hp: 20, pos: at(2, 3) },
    relay: at(3, 3),
    bonus: { kind: 'protect' },
    intro: t('골목의 시간을 정하는 기계. 울릴 때마다 간판이 꺼진다. 아래에 아직 한 사람이 남아 있다.', 'The machine that sets the alley’s hours. Each toll kills a sign. One person is still working underneath it.'),
  },
  {
    ...base,
    id: 'outside_boss_closer',
    kind: 'boss',
    name: t('구역 마감', 'THE BLOCK CLOSES'),
    enemies: [foe('block_closer', 5, 2), foe('notice_drone', 6, 0), foe('notice_drone', 6, 4)],
    terrain: [...tiles('cover', [3, 1], [3, 3]), ...tiles('hazard', [5, 0], [5, 4])],
    intro: t('마감관은 소리를 높이지 않는다. 명단을 펴고 시계를 본다.', 'The Closer does not raise their voice. They open the list and check the clock.'),
  },
]
