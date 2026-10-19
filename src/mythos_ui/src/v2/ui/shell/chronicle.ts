// The authored loop chronicle (ending screen) for when no model line comes back: a short story of THIS run, told
// from its own log — the acts walked, the bosses beaten, one free action the player wrote themselves, the end.
// Concrete and short (narrative register rule), particles fitted to the names (lang.ts josa).

import { isDateKey, dateLabel } from '../../engine/daily.ts'
import { runKilledBy } from '../../engine/meta.ts'
import type { ContentRegistry, Lang, RunState } from '../../engine/types.ts'
import { hasBatchim, josa, tr } from '../common/lang.ts'

const IMPROV_KO = '즉흥: '
const IMPROV_EN = 'Improvised: '

/** Korean list "가, 나와 다" with the last particle fitted. */
function joinKo(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')}${hasBatchim(names[names.length - 2] ?? '') ? '과' : '와'} ${names[names.length - 1]}`
}

export function authoredChronicle(run: RunState, lang: Lang, C: ContentRegistry): string {
  const ko = lang === 'ko'
  const who = tr(C.archetypes[run.archetype]?.name, lang) || (ko ? '접속자' : 'the connector')
  const party = run.party.map((m) => tr(C.companions[m.id]?.name, lang)).filter(Boolean)
  const ended = run.screen.kind === 'ended' ? run.screen : null
  const abandoned = (run.flags.abandoned ?? 0) > 0
  const won = ended?.result === 'victory'
  const acts = ([1, 2, 3] as const).filter((a) => a <= run.act).map((a) => tr(C.acts[a]?.name, lang)).filter(Boolean)
  const bosses = run.log
    .filter((l) => l.kind === 'boss')
    .map((l) => tr(l.note, lang))
    .slice(0, run.tally.bosses)
  const improvised = run.log
    .filter((l) => l.kind === 'event')
    .map((l) => tr(l.note, 'en').startsWith(IMPROV_EN) ? tr(l.note, lang).replace(ko ? IMPROV_KO : IMPROV_EN, '') : '')
    .filter(Boolean)
  const killer = runKilledBy(run)
  const killerName = killer ? tr(C.encounters[killer]?.name, lang) : ''
  const label = isDateKey(run.daily)
    ? ko
      ? `오늘의 시드 ${tr(dateLabel(run.daily), lang)}`
      : `Daily Signal ${tr(dateLabel(run.daily), lang)}`
    : ko
      ? `루프 ${run.loop}`
      : `Loop ${run.loop}`
  const lines: string[] = []
  if (ko) {
    const route = acts.length > 1 ? `${acts[0]}에서 ${acts[acts.length - 1]}까지` : `${acts[0] ?? '정전 구역'}에서`
    lines.push(`${label}. ${josa(who, '은', '는')} ${party.length ? `${joinKo(party)}${hasBatchim(party[party.length - 1] ?? '') ? '과' : '와'} 함께 ` : ''}${route} 걸었다.`)
    if (bosses.length) lines.push(`${josa(joinKo(bosses), '을', '를')} 넘었다.`)
    const mine = improvised[improvised.length - 1]
    if (mine) lines.push(`가장 오래 남은 건 직접 써 넣은 한 수 — “${mine}”.`)
    if (run.tally.kills > 0) {
      lines.push(
        run.tally.environmentKills > 0
          ? `적 ${run.tally.kills}명을 쓰러뜨렸고, 그중 ${run.tally.environmentKills}명은 도시가 대신 처리했다.`
          : `적 ${run.tally.kills}명을 쓰러뜨렸다.`,
      )
    }
    if (won) {
      const ending = ended && 'endingId' in ended ? tr(C.endings[ended.endingId]?.title, lang) : ''
      lines.push(`${ending ? `마지막 선택은 ‘${ending}’. ` : ''}이번에는 도시가 대답했다.`)
    } else if (abandoned) {
      lines.push('스스로 접속을 끊었다. 기록은 미완으로 남는다.')
    } else {
      lines.push(`${killerName ? `${killerName} 앞에서 ` : ''}신호가 끊겼다. IX는 이 루프를 기억한다. 당신도 잊지 않는다.`)
    }
  } else {
    const route = acts.length > 1 ? `from ${acts[0]} to ${acts[acts.length - 1]}` : `through ${acts[0] ?? 'the blackout zone'}`
    lines.push(`${label}. The ${who} walked ${route}${party.length ? ` with ${party.join(' and ')}` : ''}.`)
    if (bosses.length) lines.push(`Got past ${bosses.join(' and ')}.`)
    const mine = improvised[improvised.length - 1]
    if (mine) lines.push(`What stays is the move you wrote yourself — “${mine}”.`)
    if (run.tally.kills > 0) {
      lines.push(
        run.tally.environmentKills > 0
          ? `${run.tally.kills} enemies down, ${run.tally.environmentKills} of them by the city itself.`
          : `${run.tally.kills} enemies down.`,
      )
    }
    if (won) {
      const ending = ended && 'endingId' in ended ? tr(C.endings[ended.endingId]?.title, lang) : ''
      lines.push(`${ending ? `The last choice: “${ending}.” ` : ''}This time, the city answered.`)
    } else if (abandoned) {
      lines.push('You cut the connection yourself. The record stays unfinished.')
    } else {
      lines.push(`${killerName ? `The signal died at ${killerName}. ` : 'The signal died. '}IX remembers this loop. So do you.`)
    }
  }
  return lines.join(' ')
}
