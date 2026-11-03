// Mythos 2.0 — what a loop carries into the next one (plan: docs/plans/2026-10-18-tiers-and-ai-narrative.md N2/N5).
//
//   Echo inscription (1.x `echoes.py`): at loop start the player may inscribe one of up to three echoes offered by the
//   last normal loop (how it ended, who came along, how deep it went) for a small run-start effect.
//   Autonomy (1.x `determine_autonomy_level`): the more lore the Connector has found across loops, the more the grid
//   bends — Improvise checks get easier, each new act starts quieter, and at the top a growth point to start with.
//
// Both are frozen into the run at newRun and never apply to a daily (it must be the same run for everyone).
import type { ContentRegistry, EchoDef, EchoSource, MetaProfile, RunEffect, RunRecord, RunState, Text } from './types.ts'

/** Lore entries (profile.codex) needed for autonomy levels 1–5 (4 and 5 need the Deep Signal lore). */
export const AUTONOMY_STEPS = [6, 12, 18, 24, 30] as const
/** What each autonomy level adds (1.0 verbs: observe → refuse/modify → rewrite). Shown on the setup screen. */
export const AUTONOMY_TEXT = [
  { ko: '관찰: 즉흥 판정 난이도 −1', en: 'Observe: Improvise DC −1' },
  { ko: '은폐: 2막부터 막 시작 시 추적 −5', en: 'Hide: −5 Trace at the start of each act' },
  { ko: '성장: 시작 성장 포인트 +1', en: 'Grow: +1 growth point at start' },
  { ko: '거부: 시작할 때 카드 1장 제거', en: 'Refuse: remove a card at the start' },
  { ko: '재작성: 시작 덱에 「지우기」', en: 'Rewrite: start with the Erase card' },
] as const
export const MAX_ECHO_OFFERS = 3
/** Placeholder companion id in a 'companion' echo's bond effect (newRun swaps in the last loop's companion). */
export const ECHO_COMPANION = '$last_companion'
/** Autonomy 1+: Improvise DCs are this much lower. */
export const AUTONOMY_IMPROVISE_DC = 1
/** Autonomy 2+: Trace scrubbed at the start of acts 2 and 3. */
export const AUTONOMY_ACT_SCRUB = 5

export function autonomyLevel(profile: Pick<MetaProfile, 'codex'>): number {
  return AUTONOMY_STEPS.filter((step) => profile.codex.length >= step).length
}

/** The lore needed for the next autonomy level (null at the top). */
export function nextAutonomyStep(profile: Pick<MetaProfile, 'codex'>): number | null {
  return AUTONOMY_STEPS.find((step) => profile.codex.length < step) ?? null
}

function lastLoop(profile: Pick<MetaProfile, 'history'>): RunRecord | undefined {
  return profile.history.find((r) => !r.daily)
}

function sourcesOf(r: RunRecord): Set<EchoSource> {
  const out = new Set<EchoSource>(['any'])
  if (r.result === 'defeat') out.add('fell')
  if (r.result === 'victory') out.add('won')
  if (r.result === 'abandoned') out.add('abandoned')
  if (r.party.length > 0) out.add('companion')
  if (r.act >= 2) out.add('deep')
  return out
}

/** Echoes the last normal loop offers (most specific first, at most three). Empty on a first loop. */
export function echoOffers(profile: Pick<MetaProfile, 'history'>, C: ContentRegistry): EchoDef[] {
  const last = lastLoop(profile)
  if (!last || !C.echoes) return []
  const have = sourcesOf(last)
  const specific = C.echoes.filter((e) => e.source !== 'any' && have.has(e.source))
  const general = C.echoes.filter((e) => e.source === 'any')
  return [...specific, ...general].slice(0, MAX_ECHO_OFFERS)
}

/** The companion an echo of source 'companion' speaks of: the last loop's first companion. */
export function echoCompanion(profile: Pick<MetaProfile, 'history'>): string | undefined {
  return lastLoop(profile)?.party[0]
}

/** An echo's effects with the companion placeholder resolved (dropped when the last loop had nobody). */
export function echoEffects(echo: EchoDef, profile: Pick<MetaProfile, 'history'>): RunEffect[] {
  const mate = echoCompanion(profile)
  return echo.effects.flatMap((e): RunEffect[] => (e.kind === 'bond' && e.id === ECHO_COMPANION ? (mate ? [{ ...e, id: mate }] : []) : [e]))
}

/** Improvise DC reduction from autonomy. */
export function autonomyDc(run: Pick<RunState, 'autonomy'>): number {
  return (run.autonomy ?? 0) >= 1 ? AUTONOMY_IMPROVISE_DC : 0
}

/**
 * World echo: the last victorious normal loop's ending leaves the city changed for the next loop. Frozen into the
 * run as `run.flags[id] = 1` at newRun (never on a daily); the run-start part applies there, the combat part at
 * every fight start (combat.ts). `text` is what the setup screen shows — keep it in step with the numbers.
 */
export interface WorldEchoDef {
  id: string
  endingId: string
  name: Text
  text: Text
  /** Credits at run start. */
  credits?: number
  /** Bond with every starting companion. */
  bond?: number
  /** Max HP (and HP) at run start. */
  maxHp?: number
  /** One line of what changed in the city, shown under the Act 1 title (W1-3: the first screen differs). */
  scene?: Text
  combat?: {
    /** Block on every party unit on turn 1 of every fight. */
    openingBlock?: number
    /** Act 3 boss changes. */
    finalBoss?: { armor?: number; thorns?: number }
  }
}

const t = (ko: string, en: string): Text => ({ ko, en })

export const WORLD_ECHOES: readonly WorldEchoDef[] = [
  // ---- standard endings
  {
    id: 'world_echo_rewrite',
    endingId: 'ending_code_rewrite',
    name: t('재작성된 코드', 'Rewritten Code'),
    text: t('+15₵ · 최종 보스 장갑 +1 · 가시 2 (IX 역방화벽)', '+15₵ · final boss armor +1 and Thorns 2 (IX counter-firewall)'),
    scene: t('광고판의 IX 로고가 한 프레임씩 늦게 바뀐다.', 'The IX logo on the billboards changes one frame late.'),
    credits: 15,
    combat: { finalBoss: { armor: 1, thorns: 2 } },
  },
  {
    id: 'world_echo_refuge',
    endingId: 'ending_safe_refuge',
    name: t('은신처의 유대', 'Safe Refuge'),
    text: t('시작 동료 유대 +1', '+1 starting companion bond'),
    scene: t('은신처 냉장고에 누가 넣어 둔 도시락 두 개가 있다.', 'Someone left two lunchboxes in the safehouse fridge.'),
    bond: 1,
  },
  {
    id: 'world_echo_noble',
    endingId: 'ending_noble_sacrifice',
    name: t('남은 불씨', 'Remaining Ember'),
    text: t('+15₵ · 매 전투 첫 턴 아군 방어막 +4', '+15₵ · +4 block for every ally on turn 1 of each fight'),
    scene: t('타 버린 옥상 난간에 아직 온기가 남아 있다.', 'The burnt rooftop railing is still warm.'),
    credits: 15,
    combat: { openingBlock: 4 },
  },
  // ---- Deep Signal endings
  {
    id: 'world_echo_memory',
    endingId: 'ending_city_of_memory',
    name: t('돌아온 이름들', 'Returned Names'),
    text: t('+10₵ · 시작 동료 유대 +1', '+10₵ · +1 starting companion bond'),
    scene: t('지하철 안내 방송이 지워졌던 역 이름 하나를 다시 부른다.', 'The subway announcement calls out a station name that had been erased.'),
    credits: 10,
    bond: 1,
  },
  {
    id: 'world_echo_admin',
    endingId: 'ending_new_administrator',
    name: t('남겨 둔 권한', 'Leftover Access'),
    text: t('+25₵', '+25₵'),
    scene: t('광고판 하나가 아직 당신이 쓴 문장으로 깜박인다.', 'One billboard still flickers with a sentence you wrote.'),
    credits: 25,
  },
  {
    id: 'world_echo_graffiti',
    endingId: 'ending_endless_resistance',
    name: t('벽의 낙서', 'The Scrawl'),
    text: t('최대 HP +3', '+3 max HP'),
    scene: t('골목 벽에 낯익은 글씨가 있다. "여기까지 올 수 있다."', 'A familiar scrawl on an alley wall: "You can make it this far."'),
    maxHp: 3,
  },
  {
    id: 'world_echo_reader',
    endingId: 'ending_the_reader',
    name: t('먼저 읽은 사람', 'Someone Read Ahead'),
    text: t('+20₵', '+20₵'),
    scene: t('책상 위에 당신 필체의 메모가 있다. 쪽수 하나만 적혀 있다.', 'A note in your handwriting lies on the desk. Only a page number.'),
    credits: 20,
  },
  {
    id: 'world_echo_together',
    endingId: 'ending_bond_of_the_left',
    name: t('같이 있기로 한 날', 'The Day We Stayed'),
    text: t('시작 동료 유대 +1 · 최대 HP +2', '+1 starting companion bond · +2 max HP'),
    scene: t('서버실 바닥에 방석 여러 개가 둥글게 놓여 있다.', 'Cushions sit in a circle on the server-room floor.'),
    bond: 1,
    maxHp: 2,
  },
  {
    id: 'world_echo_period',
    endingId: 'ending_first_record',
    name: t('마침표', 'Full Stop'),
    text: t('+25₵ · 최종 보스 장갑 +1 · 가시 1', '+25₵ · final boss armor +1 and Thorns 1'),
    scene: t('부팅 화면 첫 줄 끝에 마침표 하나가 찍혀 있다.', 'The first line of the boot screen ends with a full stop.'),
    credits: 25,
    combat: { finalBoss: { armor: 1, thorns: 1 } },
  },
  // ---- Unwritten Sea endings
  {
    id: 'world_echo_mourning',
    endingId: 'ending_sea_return',
    name: t('모르는 이름들', 'Names No One Knows'),
    text: t('최대 HP +3', '+3 max HP'),
    scene: t('출근길 사람들이 모르는 이름을 중얼거리며 지나간다.', 'Commuters pass by, murmuring names they do not know.'),
    maxHp: 3,
  },
  {
    id: 'world_echo_lamp',
    endingId: 'ending_sea_keeper',
    name: t('열두 초의 빛', 'Twelve-Second Light'),
    text: t('매 전투 첫 턴 아군 방어막 +3', '+3 block for every ally on turn 1 of each fight'),
    scene: t('밤이면 열두 초에 한 번, 수평선 쪽 하늘이 희미하게 밝아진다.', 'At night, every twelve seconds, the sky toward the horizon brightens faintly.'),
    combat: { openingBlock: 3 },
  },
  {
    id: 'world_echo_shift',
    endingId: 'ending_sea_wall',
    name: t('교대 근무', 'The Shift'),
    text: t('+10₵ · 매 전투 첫 턴 아군 방어막 +2', '+10₵ · +2 block for every ally on turn 1 of each fight'),
    scene: t('부두 게시판에 근무표가 붙어 있다. 맨 아래 칸이 비어 있다.', 'A duty roster is pinned to the dock board. The bottom line is empty.'),
    credits: 10,
    combat: { openingBlock: 2 },
  },
  {
    id: 'world_echo_tides',
    endingId: 'ending_sea_chart',
    name: t('아이들이 외운 시간', 'Times the Children Know'),
    text: t('+15₵ · 최대 HP +2', '+15₵ · +2 max HP'),
    scene: t('정류장 화면 구석에 조석표가 작게 떠 있다.', 'A small tide table sits in the corner of the bus-stop screen.'),
    credits: 15,
    maxHp: 2,
  },
  {
    id: 'world_echo_promise',
    endingId: 'ending_sea_promise',
    name: t('지운 자리의 표시', 'Marked Where It Was Erased'),
    text: t('+10₵ · 시작 동료 유대 +1', '+10₵ · +1 starting companion bond'),
    scene: t('건물이 사라진 자리에 작은 표지판이 서 있다. "여기 있었음."', 'Where a building vanished stands a small sign: "Was here."'),
    credits: 10,
    bond: 1,
  },
  {
    id: 'world_echo_bottle',
    endingId: 'ending_sea_bottle',
    name: t('병 냄새', 'The Smell in the Bottle'),
    text: t('+20₵', '+20₵'),
    scene: t('골목 어딘가에서 바다 냄새가 난다. 이 도시에는 바다가 없다.', 'Somewhere in the alley it smells of the sea. This city has no sea.'),
    credits: 20,
  },
  {
    id: 'world_echo_horizon',
    endingId: 'ending_sea_unwritten',
    name: t('지도 밖', 'Off the Map'),
    text: t('+10₵ · 최대 HP +2', '+10₵ · +2 max HP'),
    scene: t('지도 앱 가장자리에 회색 바다가 한 픽셀 그려져 있다.', 'At the edge of the map app, one pixel of grey sea.'),
    credits: 10,
    maxHp: 2,
  },
]

const ECHO_BY_ID: Record<string, WorldEchoDef> = Object.fromEntries(WORLD_ECHOES.map((e) => [e.id, e]))

export function worldEchoById(id: string | undefined): WorldEchoDef | undefined {
  return id ? ECHO_BY_ID[id] : undefined
}

/** The run's world echo (from run.flags), if any. */
export function worldEchoOf(run: Pick<RunState, 'flags'>): WorldEchoDef | undefined {
  return WORLD_ECHOES.find((e) => run.flags[e.id])
}

/** World-state carryover from the last victorious normal loop's ending. */
export function worldEchoFor(profile: Pick<MetaProfile, 'history'>): WorldEchoDef | undefined {
  const last = lastLoop(profile)
  if (!last || last.result !== 'victory') return undefined
  return WORLD_ECHOES.find((e) => e.endingId === last.endingId)
}
