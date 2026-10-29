// Mythos 2.0 — achievements (DLC plan §11 "업적" 60 + 4 codex-completion ones). Pure data: what each one asks
// lives in `when` (engine/achievements.ts checks it when a run is banked). Cosmetic only: no
// achievement changes a run, so balance is untouched. One per archetype and per companion is
// generated from the merged content lists (content/index.ts).
import { FEAT_BOSS_FLAWLESS, FEAT_BURSTS, FEAT_FIGHT_TERRAIN } from '../engine/achievements.ts'
import type { AchievementDef, ArchetypeDef, CompanionDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

const FIXED: AchievementDef[] = [
  // progress
  { id: 'ach_first_loop', group: 'progress', name: t('첫 접속', 'First Connection'), text: t('루프를 하나 끝낸다.', 'Finish a loop.'), when: { kind: 'loops', n: 1 } },
  { id: 'ach_loops_10', group: 'progress', name: t('익숙한 천장', 'A Familiar Ceiling'), text: t('루프를 10번 끝낸다.', 'Finish 10 loops.'), when: { kind: 'loops', n: 10 } },
  { id: 'ach_loops_30', group: 'progress', name: t('IX가 이름을 외웠다', 'IX Knows Your Name'), text: t('루프를 30번 끝낸다.', 'Finish 30 loops.'), when: { kind: 'loops', n: 30 } },
  { id: 'ach_first_win', group: 'progress', name: t('출구는 있었다', 'There Was a Way Out'), text: t('처음으로 탈출한다.', 'Escape for the first time.'), when: { kind: 'wins', n: 1 } },
  { id: 'ach_wins_5', group: 'progress', name: t('반복되는 탈출', 'Repeat Escape'), text: t('5번 탈출한다.', 'Escape 5 times.'), when: { kind: 'wins', n: 5 } },
  { id: 'ach_wins_15', group: 'progress', name: t('도시의 오류', 'A Bug in the City'), text: t('15번 탈출한다.', 'Escape 15 times.'), when: { kind: 'wins', n: 15 } },
  { id: 'ach_act_3', group: 'progress', name: t('관리자의 문 앞', "At the Administrator's Door"), text: t('3막에 도달한다.', 'Reach Act 3.'), when: { kind: 'bestAct', n: 3 } },
  { id: 'ach_act_6', group: 'progress', name: t('신호의 바닥', 'Bottom of the Signal'), text: t('깊은 신호의 6막에 도달한다.', 'Reach Act 6 of the Deep Signal.'), when: { kind: 'bestAct', n: 6 } },
  { id: 'ach_arch_mastery', group: 'progress', name: t('몸에 밴 방식', 'Second Nature'), text: t('한 접속자로 6번 탈출한다(숙련 III).', 'Escape 6 times as one archetype (Mastery III).'), when: { kind: 'archMastery', wins: 6 } },
  { id: 'ach_comp_mastery', group: 'progress', name: t('말없이도 아는 사이', 'No Words Needed'), text: t('한 동료와 함께 5번 탈출한다.', 'Escape 5 times with the same companion.'), when: { kind: 'companionMastery', wins: 5 } },
  { id: 'ach_daily_7', group: 'progress', name: t('일주일의 시드', 'A Week of Seeds'), text: t('서로 다른 7일의 오늘의 시드에 접속한다.', 'Play the Daily Signal on 7 different days.'), when: { kind: 'dailyDays', n: 7 } },
  { id: 'ach_daily_30', group: 'progress', name: t('한 달의 시드', 'A Month of Seeds'), text: t('서로 다른 30일의 오늘의 시드에 접속한다.', 'Play the Daily Signal on 30 different days.'), when: { kind: 'dailyDays', n: 30 } },
  // endings
  { id: 'ach_endings_3', group: 'ending', name: t('갈림길', 'Forks'), text: t('서로 다른 결말 3개를 본다.', 'See 3 different endings.'), when: { kind: 'endings', n: 3 } },
  { id: 'ach_endings_6', group: 'ending', name: t('여러 개의 내일', 'Many Tomorrows'), text: t('서로 다른 결말 6개를 본다.', 'See 6 different endings.'), when: { kind: 'endings', n: 6 } },
  { id: 'ach_endings_all', group: 'ending', name: t('모든 결말', 'Every Ending'), text: t('모든 결말을 본다.', 'See every ending.'), when: { kind: 'endings', n: 'all' } },
  {
    id: 'ach_first_record',
    group: 'ending',
    name: t('최초의 접속자', 'The First Connector'),
    text: t('최초 기록의 결말에 닿는다.', 'Reach the ending of the First Record.'),
    when: { kind: 'ending', id: 'ending_first_record' },
    secret: true,
  },
  // collection
  { id: 'ach_codex_15', group: 'collection', name: t('복원 중', 'Restoring'), text: t('코덱스 기록 15개를 되살린다.', 'Restore 15 codex entries.'), when: { kind: 'codex', n: 15 } },
  { id: 'ach_codex_25', group: 'collection', name: t('읽을 수 있는 기록', 'Legible Again'), text: t('코덱스 기록 25개를 되살린다.', 'Restore 25 codex entries.'), when: { kind: 'codex', n: 25 } },
  { id: 'ach_codex_all', group: 'collection', name: t('손상 없는 아카이브', 'An Uncorrupted Archive'), text: t('코덱스 기록을 모두 되살린다.', 'Restore every codex entry.'), when: { kind: 'codex', n: 'all' } },
  { id: 'ach_memories_5', group: 'collection', name: t('조용한 장면들', 'Quiet Scenes'), text: t('동료와의 기억 5개를 연다.', 'Unlock 5 companion memories.'), when: { kind: 'memories', n: 5 } },
  { id: 'ach_memories_11', group: 'collection', name: t('나눠 가진 밤들', 'Shared Nights'), text: t('동료와의 기억 11개를 연다.', 'Unlock 11 companion memories.'), when: { kind: 'memories', n: 11 } },
  { id: 'ach_memories_all', group: 'collection', name: t('곁에 남은 사람들', 'The Ones Who Stayed'), text: t('동료와의 기억을 모두 연다.', 'Unlock every companion memory.'), when: { kind: 'memories', n: 22 } },
  { id: 'ach_met_5', group: 'collection', name: t('분대가 생겼다', 'A Squad Forms'), text: t('동료 5명을 만난다.', 'Meet 5 companions.'), when: { kind: 'companionsMet', n: 5 } },
  { id: 'ach_met_all', group: 'collection', name: t('네오서울의 얼굴들', 'Faces of Neo-Seoul'), text: t('모든 동료를 만난다.', 'Meet every companion.'), when: { kind: 'companionsMet', n: 'all' } },
  { id: 'ach_bestiary_40', group: 'collection', name: t('적의 얼굴', 'Faces of the Enemy'), text: t('적 도감에 40종을 기록한다.', 'Record 40 kinds of enemy in the bestiary.'), when: { kind: 'bestiary', n: 40 } },
  { id: 'ach_bestiary_all', group: 'collection', name: t('도시의 모든 이빨', 'Every Tooth in the City'), text: t('적 도감을 완성한다.', 'Complete the bestiary.'), when: { kind: 'bestiary', n: 'all' } },
  { id: 'ach_cards_60', group: 'collection', name: t('손에 익은 프로토콜', 'Familiar Protocols'), text: t('카드 도감에 60장을 기록한다.', 'Record 60 cards in the card codex.'), when: { kind: 'cardCodex', n: 60 } },
  { id: 'ach_cards_all', group: 'collection', name: t('모든 프로토콜', 'Every Protocol'), text: t('카드 도감을 완성한다.', 'Complete the card codex.'), when: { kind: 'cardCodex', n: 'all' } },
  { id: 'ach_records_7', group: 'collection', name: t('일곱 조각', 'Seven Shards'), text: t('최초 기록 조각 7개를 모두 찾는다.', 'Find all 7 First Record shards.'), when: { kind: 'records', n: 7 } },
  // challenge (one run)
  { id: 'ach_paradox_3', group: 'challenge', name: t('어긋난 규칙', 'Bent Rules'), text: t('역설 3 이상에서 탈출한다.', 'Escape at Paradox 3 or higher.'), when: { kind: 'paradoxWin', n: 3 } },
  { id: 'ach_paradox_5', group: 'challenge', name: t('역설 속의 출구', 'An Exit in the Paradox'), text: t('역설 5 이상에서 탈출한다.', 'Escape at Paradox 5 or higher.'), when: { kind: 'paradoxWin', n: 5 } },
  { id: 'ach_paradox_7', group: 'challenge', name: t('무너지는 논리', 'Collapsing Logic'), text: t('역설 7 이상에서 탈출한다.', 'Escape at Paradox 7 or higher.'), when: { kind: 'paradoxWin', n: 7 } },
  { id: 'ach_paradox_10', group: 'challenge', name: t('불가능한 루프', 'The Impossible Loop'), text: t('역설 10에서 탈출한다.', 'Escape at Paradox 10.'), when: { kind: 'paradoxWin', n: 10 } },
  { id: 'ach_deep_win', group: 'challenge', name: t('깊은 신호 너머', 'Beyond the Deep Signal'), text: t('깊은 신호 런을 끝까지 마치고 탈출한다.', 'Escape at the end of a Deep Signal run.'), when: { kind: 'deepWin' } },
  { id: 'ach_endless_lap', group: 'challenge', name: t('한 바퀴 더', 'One More Lap'), text: t('무한 신호에서 한 바퀴를 돈다.', 'Complete a lap of the Endless Signal.'), when: { kind: 'endlessLap', n: 1 } },
  { id: 'ach_endless_3', group: 'challenge', name: t('잔향 3층', 'Third Layer of Echo'), text: t('무한 신호에서 세 바퀴를 돈다.', 'Complete 3 laps of the Endless Signal.'), when: { kind: 'endlessLap', n: 3 } },
  { id: 'ach_daily_win', group: 'challenge', name: t('오늘은 이겼다', 'Today, a Win'), text: t('오늘의 시드에서 탈출한다.', 'Escape on the Daily Signal.'), when: { kind: 'dailyWin' } },
  { id: 'ach_terrain_20', group: 'challenge', name: t('도시가 대신 싸웠다', 'The City Fought for You'), text: t('한 루프에서 환경으로 적 20명을 처치한다.', 'Kill 20 enemies with the terrain in one loop.'), when: { kind: 'runTally', stat: 'environmentKills', min: 20 } },
  { id: 'ach_elites_5', group: 'challenge', name: t('정예 사냥', 'Elite Hunt'), text: t('한 루프에서 정예 5명을 쓰러뜨린다.', 'Defeat 5 elites in one loop.'), when: { kind: 'runTally', stat: 'elites', min: 5 } },
  { id: 'ach_boss_flawless', group: 'challenge', name: t('손끝 하나 닿지 않았다', 'Untouched'), text: t('접속자가 피해를 입지 않고 보스를 쓰러뜨린다.', 'Defeat a boss without the connector losing HP.'), when: { kind: 'runFlag', flag: FEAT_BOSS_FLAWLESS, min: 1 } },
  { id: 'ach_fight_terrain', group: 'challenge', name: t('도시가 무기다', 'The City Is a Weapon'), text: t('한 전투에서 환경으로 적 5명을 처치한다.', 'Kill 5 enemies with the terrain in one fight.'), when: { kind: 'runFlag', flag: FEAT_FIGHT_TERRAIN, min: 5 } },
  { id: 'ach_bursts_10', group: 'challenge', name: t('과부하 상태', 'Running Hot'), text: t('한 루프에서 버스트나 궁극기를 쓴 전투 10번을 이긴다.', 'Win 10 fights in one loop with a burst or ultimate fired.'), when: { kind: 'runFlag', flag: FEAT_BURSTS, min: 10 } },
  { id: 'ach_flawless', group: 'challenge', name: t('스치기만 했다', 'Barely a Scratch'), text: t('받은 피해 40 이하로 탈출한다.', 'Escape having taken 40 damage or less.'), when: { kind: 'flawless', maxDamage: 40 } },
  { id: 'ach_lean_deck', group: 'challenge', name: t('가벼운 덱', 'Travelling Light'), text: t('덱 18장 이하로 탈출한다.', 'Escape with a deck of 18 cards or fewer.'), when: { kind: 'leanDeck', maxCards: 18 } },
  { id: 'ach_rich', group: 'challenge', name: t('주머니가 무겁다', 'Heavy Pockets'), text: t('크레딧 600 이상을 들고 탈출한다.', 'Escape holding 600 credits or more.'), when: { kind: 'richWin', credits: 600 } },
  { id: 'ach_implants_13', group: 'challenge', name: t('사람보다 기계', 'More Machine Than Man'), text: t('임플란트 13개 이상을 단 채 탈출한다.', 'Escape with 13 or more implants.'), when: { kind: 'implantWin', n: 13 } },
  { id: 'ach_quiet', group: 'challenge', name: t('IX가 눈치채지 못했다', 'IX Never Noticed'), text: t('추적도 30 이하로 탈출한다.', 'Escape with trace at 30 or less.'), when: { kind: 'quietWin', maxTrace: 30 } },
  { id: 'ach_solo', group: 'challenge', name: t('혼자 걸은 길', 'Walked Alone'), text: t('동료를 한 명도 들이지 않고 탈출한다.', 'Escape without ever taking a companion.'), when: { kind: 'soloWin' } },
]

/** Every achievement: the fixed list plus one per archetype and one per companion. */
export function buildAchievements(archetypes: readonly ArchetypeDef[], companions: readonly CompanionDef[]): AchievementDef[] {
  const arch = archetypes.map(
    (a): AchievementDef => ({
      id: `ach_arch_${a.id}`,
      group: 'archetype',
      name: t(`${a.name.ko} · 첫 탈출`, `${a.name.en}: First Escape`),
      text: t('이 접속자로 탈출한다.', 'Escape as this archetype.'),
      when: { kind: 'archetypeWin', id: a.id },
    }),
  )
  const comp = companions.map(
    (c): AchievementDef => ({
      id: `ach_comp_${c.id}`,
      group: 'companion',
      name: t(`${c.name.ko} · 함께 탈출`, `${c.name.en}: Out Together`),
      text: t('이 동료가 끝까지 분대에 남은 채 탈출한다.', 'Escape with this companion still in the squad.'),
      when: { kind: 'companionWin', id: c.id },
    }),
  )
  return [...FIXED, ...arch, ...comp]
}
