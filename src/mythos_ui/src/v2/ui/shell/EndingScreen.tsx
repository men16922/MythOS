// Mythos 2.0 — ending + run summary: ending art, text, Echo tally count-up, stats, chronicle.
import { art } from '../components/art.ts'
import { Award, Check, Copy, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { computeEchoes } from '../../engine/meta.ts'
import type { Lang, RunState } from '../../engine/types.ts'
import { isDateKey, shiftDateKey } from '../../engine/daily.ts'
import type { SubmitOutcome } from '../../net/daily.ts'
import { tr } from '../common/lang.ts'
import { CountUp } from '../components/CountUp.tsx'
import { dayOf, IMPROVED, submitLine } from '../components/dailyBoard.ts'
import { sound } from '../components/sound.ts'
import { Typewriter } from '../components/Typewriter.tsx'
import { authoredChronicle } from './chronicle.ts'
import { narrate } from './gm.ts'
import { commsEntries, improvisedRecords } from '../common/commsLog.ts'
import type { ScreenProps } from './types.ts'
import './ending.css'

function buildShareSummary(
  run: RunState,
  lang: Lang,
  C: ScreenProps['C'],
  echoTotal: number,
  dailyOutcome?: SubmitOutcome | null,
): string {
  const ko = lang === 'ko'
  const arch = C.archetypes[run.archetype]
  const who = tr(arch?.name, lang) || (ko ? '접속자' : 'Connector')
  const ended = run.screen.kind === 'ended' ? run.screen : null
  const victory = ended?.result === 'victory'
  const ending = ended ? C.endings[ended.endingId] : undefined
  const endingTitle = tr(ending?.title, lang) || (ko ? '강제 삭제' : 'Forced Erasure')
  const header = isDateKey(run.daily)
    ? ko
      ? `⚡ 세계:접속 — 오늘의 시드 ${run.daily}`
      : `⚡ Mythos: Signal Run — Daily Signal ${run.daily}`
    : ko
      ? `⚡ 세계:접속 — 루프 #${run.loop}`
      : `⚡ Mythos: Signal Run — Loop #${run.loop}`
  const statusLine = ko
    ? `${who} · ${victory ? '루프 완료' : '접속 종료'} (${endingTitle}) · ${run.act}막 / ${run.tally.floors}구역`
    : `${who} · ${victory ? 'Loop Complete' : 'Connection Lost'} (${endingTitle}) · Act ${run.act} / ${run.tally.floors} sectors`
  const rankBit =
    dailyOutcome && dailyOutcome.kind === 'ranked'
      ? ko
        ? ` · 순위 #${dailyOutcome.rank}/${dailyOutcome.total}`
        : ` · Rank #${dailyOutcome.rank}/${dailyOutcome.total}`
      : ''
  const statsLine = ko
    ? `처치 ${run.tally.kills} (환경 ${run.tally.environmentKills}) · ◈ ${echoTotal}${rankBit}`
    : `Kills ${run.tally.kills} (Terrain ${run.tally.environmentKills}) · ◈ ${echoTotal}${rankBit}`
  const best = run.bestTurn
  const bestLine = best ? (ko ? `최고의 한 턴: 피해 ${best.damage} · 처치 ${best.kills}` : `Best turn: ${best.damage} damage · ${best.kills} kills`) : null
  return [header, statusLine, statsLine, ...(bestLine ? [bestLine] : [])].join('\n')
}

export interface EndingScreenProps extends ScreenProps {
  onDone: () => void
  onChronicle: (text: string) => void
  /** A daily-seed run: its leaderboard submit (outcome null while sending), today's KST date and the board opener. */
  daily?: { outcome: SubmitOutcome | null; today: string; onBoard: () => void }
  /** Achievement ids this run earned (its banked history row). */
  achievements?: readonly string[]
}

/** One quiet line under the stats: the achievements this run earned (first three named, then a count). */
function EarnedLine({ ids, C, lang }: { ids: readonly string[]; C: ScreenProps['C']; lang: Lang }) {
  const names = ids.map((id) => C.achievements?.[id]?.name).filter((n) => !!n)
  if (names.length === 0) return null
  const shown = names.slice(0, 3).map((n) => tr(n, lang)).join(' · ')
  const more = names.length - 3
  return (
    <div className="m2-ending__ach" role="status" data-testid="ending-achievements">
      <Award size={13} />
      <span>
        {shown}
        {more > 0 && (lang === 'ko' ? ` 외 ${more}개` : ` +${more} more`)}
      </span>
    </div>
  )
}

/** The daily run's leaderboard line: rank / total, "기록 갱신!", or why it is waiting. */
function DailyRank({ date, daily, lang }: { date: string; daily: NonNullable<EndingScreenProps['daily']>; lang: Lang }) {
  const ko = lang === 'ko'
  const line = submitLine(daily.outcome, dayOf(date, daily.today, shiftDateKey(daily.today, -1)))
  return (
    <div className={`m2-ending__daily is-${line.tone}`}>
      <div className="m2-ending__daily-line" role="status">
        <Trophy size={16} />
        <span>
          {tr(line.text, lang)}
          {line.improved && <em>{tr(IMPROVED, lang)}</em>}
        </span>
      </div>
      <button className="m2-btn m2-btn--ghost" onClick={daily.onBoard}>
        {ko ? '순위표' : 'Leaderboard'}
      </button>
    </div>
  )
}

const CHRONICLE_WAIT_MS = 8000

export function EndingScreen({ run, C, lang, settings, onDone, onChronicle, daily, achievements }: EndingScreenProps) {
  const ended = run.screen.kind === 'ended' ? run.screen : null
  const ending = ended ? C.endings[ended.endingId] : undefined
  const breakdown = useMemo(() => computeEchoes(run, C), [run, C])
  const fallback = useMemo(() => authoredChronicle(run, lang, C), [run, lang, C])
  const [chronicle, setChronicle] = useState<string | null>(null)
  /** Which chronicle is on screen. Locked once chosen: the GM line used to replace the authored one mid-read. */
  const [chronSource, setChronSource] = useState<'gm' | 'auth' | null>(null)
  const [stage, setStage] = useState(0)
  const [copied, setCopied] = useState(false)
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
        // What the player typed as free actions this loop (comms log) with the outcome that followed, so the
        // chronicle can weave one in without guessing how it went.
        improvised: improvisedRecords(commsEntries()),
      },
      15000,
      // Only a model line replaces the authored chronicle below (the server's own fallback is a flat fact list).
      false,
    ).then((text) => {
      if (!alive) return
      if (!text) {
        setChronSource((s) => s ?? 'auth')
        onChronicle(fallback) // archive what the player read
        return
      }
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

  const onCopySummary = () => {
    const text = buildShareSummary(run, lang, C, breakdown.total, daily?.outcome)
    sound('ui_click')
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      },
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      },
    )
  }

  return (
    <div className={`m2-ending${victory ? ' is-victory' : ' is-defeat'}`}>
      <div className="m2-ending__art" style={{ backgroundImage: `url(${art.ending(ended?.endingId ?? '', ending?.image ?? 'endings/forced-erasure.png')})` }} />
      <div className="m2-ending__shade" />
      <div className="m2-ending__inner">
        <div className="m2-ending__main">
          <div className="m2-ending__kicker">
            {isDateKey(run.daily) ? (ko ? '오늘의 시드 · ' : 'Daily Signal · ') : ''}
            {victory ? (ko ? '루프 완료' : 'Loop complete') : ko ? '접속 종료' : 'Connection lost'}
          </div>
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
          {stage >= 3 && run.bestTurn && (
            <div className="m2-ending__ach" data-testid="ending-best-turn">
              {ko ? `최고의 한 턴: 피해 ${run.bestTurn.damage} · 처치 ${run.bestTurn.kills}` : `Best turn: ${run.bestTurn.damage} damage · ${run.bestTurn.kills} kills`}
            </div>
          )}
          {stage >= 3 && achievements && achievements.length > 0 && <EarnedLine ids={achievements} C={C} lang={lang} />}
          {daily && isDateKey(run.daily) && <DailyRank date={run.daily} daily={daily} lang={lang} />}
          <div className="m2-ending__actions">
            <button className="m2-btn m2-btn--ghost m2-ending__share" onClick={onCopySummary}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? (ko ? '복사됨' : 'Copied') : ko ? '기록 복사' : 'Copy Summary'}</span>
            </button>
            <button
              className="m2-btn m2-btn--primary m2-btn--lg"
              onClick={() => {
                sound('transition')
                onDone()
              }}
            >
              {ko ? '아카이브로' : 'Back to the Archive'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
