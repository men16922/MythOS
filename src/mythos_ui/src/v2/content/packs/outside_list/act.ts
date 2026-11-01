// Pack 4 — Outside the List (DLC 2): the parallel Act 2. Same place in the run as the Undercity Market, its own map
// content. Art is borrowed until the owner has played the rule (docs/plans/2026-11-01-dlc2-parallel-act-plan.md).
import type { ActDef } from '../../../engine/types.ts'

export const OUTSIDE_ROUTE = 'outside'

export const OUTSIDE_ACT: ActDef = {
  act: 2,
  name: { ko: '명단 밖의 사람들', en: 'Outside the List' },
  subtitle: { ko: '폐점 방송 뒤의 뒷골목', en: 'The back alleys after closing' },
  intro: {
    ko: '방송이 끝나자 간판이 한 줄씩 꺼진다. 큰길의 사람들은 돌아가고, 뒷골목의 사람들은 앞치마를 고쳐 맨다.\n배식대, 세탁 수레, 셔터 내리는 갈고리. 명단에 없는 사람들은 오늘 일을 끝내야 집에 간다.\n골목 끝에서 폐점 정리반의 경광등이 돈다. 그들은 차례로 문을 닫고, 닫힌 문 안쪽을 지운다.\n첨탑으로 가는 길은 이쪽으로도 이어진다. 조금 늦을 뿐이다.',
    en: 'When the broadcast ends the signs go dark one row at a time. The main street goes home. The back alley ties its aprons tighter.\nA serving counter, a laundry cart, a hook for pulling shutters. People off the list go home when the work is done.\nAt the far end of the alley, the Closing Crew’s beacons turn. They shut the doors in order and erase what is behind them.\nThe road to the Spire runs this way too. It just takes longer.',
  },
  backdrop: 'undercity',
  image: 'v2/art/outside.webp',
}
