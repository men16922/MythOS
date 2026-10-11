// Mythos 2.0 — ending + run summary: ending art, text, Echo tally count-up, stats, chronicle.
import { art } from '../components/art.ts'
import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { computeEchoes } from '../../engine/meta.ts'
import type { Lang, RunState } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import { CountUp } from '../components/CountUp.tsx'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { narrate } from './gm.ts'
import type { ScreenProps } from './types.ts'

/** True when the word's last Hangul syllable has a final consonant (받침); non-Hangul counts as yes. */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code < 0 || code > 11171 || code % 28 !== 0
}

function authoredChronicle(run: RunState, lang: Lang, C: ScreenProps['C']): string {
  const ko = lang === 'ko'
  const arch = C.archetypes[run.archetype]
  const party = run.party.map((m) => tr(C.companions[m.id]?.name, lang)).filter(Boolean)
  const won = run.screen.kind === 'ended' && run.screen.result === 'victory'
  const lines: string[] = []
  const who = tr(arch?.name, lang) || '접속자'
  lines.push(
    ko
      ? `루프 ${run.loop}. ${who}${hasBatchim(who) ? '은' : '는'} ${run.act}막까지 ${run.tally.floors}개 구역을 지났다.`
      : `Loop ${run.loop}. The ${tr(arch?.name, lang) || 'connector'} crossed ${run.tally.floors} sectors, reaching Act ${run.act}.`,
  )
  if (party.length) {
    const last = party[party.length - 1] ?? ''
    lines.push(ko ? `${party.join(', ')}${hasBatchim(last) ? '이' : '가'} 곁에 있었다.` : `${party.join(' and ')} stood beside them.`)
  }
  lines.push(
    ko
      ? `처치 ${run.tally.kills}, 환경 처치 ${run.tally.environmentKills}. 받은 피해 ${run.tally.damageTaken}.`
      : `${run.tally.kills} kills, ${run.tally.environmentKills} of them by the terrain. ${run.tally.damageTaken} damage taken.`,
  )
  lines.push(won ? (ko ? '이번에는 도시가 대답했다.' : 'This time, the city answered.') : ko ? 'IX는 이 루프를 기억한다. 당신도 잊지 않는다.' : 'IX remembers this loop. So do you.')
  return lines.join(' ')
}

export interface EndingScreenProps extends ScreenProps {
  onDone: () => void
  onChronicle: (text: string) => void
}

const CHRONICLE_WAIT_MS = 8000

export function EndingScreen({ run, C, lang, settings, onDone, onChronicle }: EndingScreenProps) {
  const ended = run.screen.kind === 'ended' ? run.screen : null
  const ending = ended ? C.endings[ended.endingId] : undefined
  const breakdown = useMemo(() => computeEchoes(run, C), [run, C])
  const fallback = useMemo(() => authoredChronicle(run, lang, C), [run, lang, C])
  const [chronicle, setChronicle] = useState<string | null>(null)
  /** Which chronicle is on screen. Locked once chosen: the GM line used to replace the authored one mid-read. */
  const [chronSource, setChronSource] = useState<'gm' | 'auth' | null>(null)
  const [stage, setStage] = useState(0)
  const ko = lang === 'ko'

  useEffect(() => {
    sound(ended?.result === 'victory' ? 'victory' : 'defeat')
    const ts = [700, 1500, 2300].map((ms, i) => window.setTimeout(() => setStage(i + 1), settings.fastAnim ? ms / 4 : ms))
    // Give the GM a few seconds; after that the authored chronicle stays (a late GM line is still archived).
    ts.push(window.setTimeout(() => setChronSource((s) => s ?? 'auth'), CHRONICLE_WAIT_MS))
    return () => ts.forEach((t) => window.clearTimeout(t))
    // once per ending screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let alive = true
    void narrate(
      'chronicle',
      lang,
      {
        loop: run.loop,
        archetype: tr(C.archetypes[run.archetype]?.name, lang),
        result: (run.flags.abandoned ?? 0) > 0 ? 'abandoned' : ended?.result,
        ending: tr(ending?.title, lang),
        act: run.act,
        actName: tr(C.acts[run.act]?.name, lang),
        party: run.party.map((m) => tr(C.companions[m.id]?.name, lang)),
        kills: run.tally.kills,
        // not "floors": the model read 24 as the tower's height ("24층 높이의 ARK 첨탑")
        sectorsCleared: run.tally.floors,
        highlights: run.log.slice(-14).map((l) => tr(l.note, lang)),
      },
      15000,
      true,
    ).then((text) => {
      if (!alive) return
      if (!text) return setChronSource((s) => s ?? 'auth')
      setChronicle(text)
      setChronSource((s) => s ?? 'gm')
      onChronicle(text)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id])

  useEffect(() => {
    if (stage === 2) sound('coin', { intensity: 1.4 })
  }, [stage])

  if (!ended) return null
  const victory = ended.result === 'victory'
  const rows: [string, number][] = [
    [ko ? '통과한 구역' : 'Sectors cleared', breakdown.nodes],
    [ko ? '정예 처치' : 'Elites', breakdown.elites],
    [ko ? '보스 처치' : 'Bosses', breakdown.bosses],
    [ko ? '사건' : 'Events', breakdown.other],
    [ko ? '승리' : 'Victory', breakdown.victory],
    [ko ? '결말 보너스' : 'Ending bonus', breakdown.ending],
  ]

  return (
    <div className={`m2-ending${victory ? ' is-victory' : ' is-defeat'}`}>
      <div className="m2-ending__art" style={{ backgroundImage: `url(${art.ending(ended?.endingId ?? '', ending?.image ?? 'endings/forced-erasure.png')})` }} />
      <div className="m2-ending__shade" />
      <div className="m2-ending__inner">
        <div className="m2-ending__main">
          <div className="m2-ending__kicker">{victory ? (ko ? '루프 완료' : 'Loop complete') : ko ? '접속 종료' : 'Connection lost'}</div>
          <h1 className="m2-ending__title">{tr(ending?.title, lang) || (ko ? '강제 삭제' : 'Forced Erasure')}</h1>
          <Typewriter className="m2-ending__text" text={tr(ending?.text, lang)} cps={settings.fastAnim ? 500 : 80} />
          <div className="m2-ending__chron">
            <div className="m2-ending__chron-head">
              <Sparkles size={14} /> {ko ? '루프 기록' : 'Loop chronicle'}
            </div>
            {stage >= 1 && chronSource && (
              <Typewriter key={chronSource} text={chronSource === 'gm' && chronicle ? chronicle : fallback} cps={settings.fastAnim ? 500 : 90} tick={false} />
            )}
            {stage >= 1 && !chronSource && <p className="m2-ending__chron-wait">{ko ? '기록을 정리하는 중…' : 'Compiling the record…'}</p>}
          </div>
        </div>

        <aside className="m2-ending__side">
          <div className={`m2-tally${stage >= 2 ? ' is-in' : ''}`}>
            <div className="m2-tally__head">{ko ? '획득한 에코' : 'Echoes earned'}</div>
            <div className="m2-tally__total">
              ◈ <CountUp value={stage >= 2 ? breakdown.total : 0} ms={1400} from={0} />
            </div>
            <ul>
              {rows
                .filter(([, v]) => v !== 0)
                .map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <b className="m2-mono">{v > 0 ? `+${v}` : v}</b>
                  </li>
                ))}
            </ul>
          </div>
          <div className={`m2-runstats${stage >= 3 ? ' is-in' : ''}`}>
            <div>
              <b className="m2-mono">{run.tally.floors}</b>
              <small>{ko ? '구역' : 'Floors'}</small>
            </div>
            <div>
              <b className="m2-mono">{run.tally.kills}</b>
              <small>{ko ? '처치' : 'Kills'}</small>
            </div>
            <div>
              <b className="m2-mono">{run.tally.environmentKills}</b>
              <small>{ko ? '환경 처치' : 'Terrain kills'}</small>
            </div>
            <div>
              <b className="m2-mono">{run.tally.cardsPlayed}</b>
              <small>{ko ? '사용한 카드' : 'Cards played'}</small>
            </div>
            <div>
              <b className="m2-mono">{run.tally.damageTaken}</b>
              <small>{ko ? '받은 피해' : 'Damage taken'}</small>
            </div>
            <div>
              <b className="m2-mono">{run.deck.length}</b>
              <small>{ko ? '덱' : 'Deck'}</small>
            </div>
          </div>
          <button
            className="m2-btn m2-btn--primary m2-btn--lg"
            onClick={() => {
              sound('transition')
              onDone()
            }}
          >
            {ko ? '아카이브로' : 'Back to the Archive'}
          </button>
        </aside>
      </div>
    </div>
  )
}
