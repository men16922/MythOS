// Mythos 2.0 — IX's memory of earlier loops, as a few short facts for the GM prompts (`context.memory`). IX records
// every connection, so it may bring up one of these; the prompt forbids inventing any other past. Facts come only from
// the profile's run history (newest first) and are written without digits (counts as words), because the line cleaner
// drops sentences that quote numbers.
import type { ContentRegistry, Lang, MetaProfile, RunRecord, Text } from '../../engine/types.ts'
import { hasBatchim, tr, withRo } from './lang.ts'

/** Earlier normal loops this companion was recruited in (their faint déjà vu in the safehouse chat; they do not
 *  remember the loops, only feel them). */
export function loopsWith(profile: Pick<MetaProfile, 'history'>, companion: string): number {
  return profile.history.filter((r) => !r.daily && r.party.includes(companion)).length
}

/** Facts sent at most (the server bounds lists anyway). */
export const MEMORY_FACTS = 4

/** Who killed the connector, as IX would name it: an enemy, not a map label. `killedBy` may be an
 *  encounter id ("Behind Cover") — then name its toughest enemy instead. */
export function killerName(killerId: string | undefined, C: ContentRegistry): Text | undefined {
  if (!killerId) return undefined
  const direct = C.enemies[killerId]
  if (direct) return direct.name
  const enc = C.encounters[killerId]
  if (!enc) return undefined
  const TIER = { boss: 3, elite: 2, normal: 1, minion: 0 } as const
  const lead = enc.enemies
    .map((e) => C.enemies[e.id])
    .filter((d): d is NonNullable<typeof d> => !!d)
    .sort((a, b) => TIER[b.tier] - TIER[a.tier] || b.hp - a.hp)[0]
  return lead?.name ?? enc.name
}

const KO_TIMES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열']
const EN_TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times', 'ten times']

const EN_COUNT = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const countWord = (n: number): string => (n > 10 ? 'many' : (EN_COUNT[n] ?? ''))

/** "세 번" / "three times"; more than ten reads as "여러 번" / "many times". */
export function timesWord(n: number, lang: Lang): string {
  if (lang === 'ko') return n > 10 ? '여러 번' : `${KO_TIMES[n] ?? ''} 번`
  return n > 10 ? 'many times' : (EN_TIMES[n] ?? '')
}

function runFact(r: RunRecord, C: ContentRegistry, lang: Lang): string {
  const ko = lang === 'ko'
  const arch = tr(C.archetypes[r.archetype]?.name, lang)
  const mates = r.party.map((id) => tr(C.companions[id]?.name, lang)).filter(Boolean)
  const lastMate = mates[mates.length - 1] ?? ''
  const withWho = mates.length ? (ko ? `${mates.join('·')}${hasBatchim(lastMate) ? '과' : '와'} 함께 ` : `, with ${mates.join(' and ')}`) : ''
  const act = tr(C.acts[r.act as 1 | 2 | 3]?.name, lang)
  if (r.result === 'victory') {
    const ending = tr(C.endings[r.endingId]?.title, lang)
    return ko ? `${withWho}${withRo(arch)} 접속해 끝까지 갔다(${ending})` : `Connected as ${arch} and reached the end (${ending})${withWho}`
  }
  if (r.result === 'abandoned') return ko ? `${withRo(arch)} 접속했다가 ${act}에서 스스로 접속을 끊었다` : `Connected as ${arch} and cut the connection in ${act}`
  const killer = tr(killerName(r.killedBy, C), lang)
  return ko
    ? `${withWho}${withRo(arch)} 접속해 ${act}에서 ${killer || '무언가'}에게 쓰러졌다`
    : `Connected as ${arch}; fell to ${killer || 'something'} in ${act}${withWho}`
}

/**
 * Short facts about earlier normal loops for IX. With `encounterId` (a boss / elite about to start) the first fact is
 * how often this very fight already ended a loop, when it did.
 */
export function loopMemory(profile: MetaProfile, C: ContentRegistry, lang: Lang, encounterId?: string): string[] {
  const ko = lang === 'ko'
  const runs = profile.history.filter((r) => !r.daily)
  if (runs.length === 0) return []
  const facts: string[] = []
  if (encounterId) {
    const here = runs.filter((r) => r.result === 'defeat' && r.killedBy === encounterId).length
    const name = tr(killerName(encounterId, C), lang)
    if (here > 0 && name) facts.push(ko ? `지난 루프들에서 이 ${name}에게 ${timesWord(here, lang)} 쓰러졌다` : `Earlier loops ended at this ${name} ${timesWord(here, lang)}`)
  }
  const wins = runs.filter((r) => r.result === 'victory').length
  facts.push(
    ko
      ? `기록된 접속 ${timesWord(runs.length, lang)} 중 끝까지 간 것은 ${wins ? timesWord(wins, lang) : '아직 없다'}`
      : `Recorded connections: ${countWord(runs.length)}; reached the end: ${wins ? countWord(wins) : 'none yet'}`,
  )
  for (const r of runs.slice(0, MEMORY_FACTS)) facts.push(`${ko ? '지난 접속' : 'A past connection'}: ${runFact(r, C, lang)}`)
  return facts.slice(0, MEMORY_FACTS)
}
