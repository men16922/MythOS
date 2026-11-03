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
  const act = tr(C.acts[r.act]?.name, lang)
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
  const habit = habitFact(runs, C, lang)
  if (habit) facts.push(habit)
  for (const r of runs.slice(0, MEMORY_FACTS)) facts.push(`${ko ? '지난 접속' : 'A past connection'}: ${runFact(r, C, lang)}`)
  return facts.slice(0, MEMORY_FACTS)
}

/** A habit IX can name: who you bring, what you connect as, where loops end, what your deck leans to. */
export type Habit = { kind: 'mate' | 'archetype' | 'act' | 'lean'; id: string }

/** Every habit the history shows (three normal loops at least), most telling first. */
export function habits(runs: readonly RunRecord[]): Habit[] {
  if (runs.length < 3) return []
  const tally = (keys: string[]): [string, number] | undefined =>
    [...keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const out: Habit[] = []
  const deaths = runs.filter((r) => r.result === 'defeat')
  const act = tally(deaths.map((r) => String(r.act)))
  if (act && deaths.length >= 2 && act[1] >= Math.ceil(deaths.length * 0.6)) out.push({ kind: 'act', id: act[0] })
  const leaned = runs.filter((r) => r.lean)
  const lean = tally(leaned.map((r) => r.lean as string))
  if (lean && leaned.length >= 3 && lean[1] >= Math.ceil(leaned.length * 0.6)) out.push({ kind: 'lean', id: lean[0] })
  const mate = tally(runs.flatMap((r) => r.party))
  if (mate && mate[1] >= Math.ceil(runs.length * 0.6)) out.push({ kind: 'mate', id: mate[0] })
  const arch = tally(runs.map((r) => r.archetype))
  if (arch && arch[1] >= Math.ceil(runs.length * 0.7)) out.push({ kind: 'archetype', id: arch[0] })
  return out
}

/** One habit for this loop: they take turns by loop count, so the companion everyone brings does not hide the rest. */
function habitFor(runs: readonly RunRecord[]): Habit | undefined {
  const all = habits(runs)
  return all.length ? all[runs.length % all.length] : undefined
}

/** IX profiles the player, as a fact for the GM's memory list (third person, no digits). */
export function habitFact(runs: readonly RunRecord[], C: ContentRegistry, lang: Lang): string | null {
  const h = habitFor(runs)
  if (!h) return null
  const ko = lang === 'ko'
  if (h.kind === 'mate') {
    const name = tr(C.companions[h.id]?.name, lang)
    return name ? (ko ? `접속자는 거의 매번 ${name}${hasBatchim(name) ? '을' : '를'} 데려온다` : `The connector brings ${name} almost every time`) : null
  }
  if (h.kind === 'archetype') {
    const name = tr(C.archetypes[h.id]?.name, lang)
    return name ? (ko ? `접속자는 늘 ${withRo(name)} 접속한다` : `The connector nearly always connects as ${name}`) : null
  }
  if (h.kind === 'act') {
    const name = tr(C.acts[Number(h.id) as keyof typeof C.acts]?.name, lang)
    return name ? (ko ? `접속자의 루프는 대개 ${name}에서 끝난다` : `The connector's loops usually end in ${name}`) : null
  }
  return ko
    ? `접속자는 늘 ${h.id === 'attack' ? '공격' : '기술'} 카드로 덱을 채운다`
    : `The connector keeps filling the deck with ${h.id === 'attack' ? 'attacks' : 'skills'}`
}

/** The same habit as IX says it to you (authored, for when no AI line comes), or null. */
export function ixHabitLine(runs: readonly RunRecord[], C: ContentRegistry, lang: Lang): string | null {
  const h = habitFor(runs)
  if (!h) return null
  const ko = lang === 'ko'
  if (h.kind === 'mate') {
    const name = tr(C.companions[h.id]?.name, lang)
    return name ? (ko ? `당신은 거의 매번 ${name}${hasBatchim(name) ? '을' : '를'} 데려옵니다. 기록해 두었습니다.` : `You bring ${name} almost every time. I have noted it.`) : null
  }
  if (h.kind === 'archetype') {
    const name = tr(C.archetypes[h.id]?.name, lang)
    return name ? (ko ? `당신은 늘 ${withRo(name)} 접속합니다. 예측하기 쉽습니다.` : `You always connect as ${name}. Easy to predict.`) : null
  }
  if (h.kind === 'act') {
    const name = tr(C.acts[Number(h.id) as keyof typeof C.acts]?.name, lang)
    return name ? (ko ? `당신의 기록은 대개 ${name}에서 멈춥니다.` : `Your records usually stop in ${name}.`) : null
  }
  return ko
    ? h.id === 'attack'
      ? '당신은 늘 먼저 때립니다. 관찰 중입니다.'
      : '당신은 늘 피하고 돌아갑니다. 관찰 중입니다.'
    : h.id === 'attack'
      ? 'You always strike first. I am watching.'
      : 'You always step around. I am watching.'
}
