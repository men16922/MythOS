// Mythos 2.0 — title: the city in the rain, the wordmark, and the ways in (continue, new loop, today's seed + its
// leaderboard, archive), with the Google account chip in the corner.
import { art } from '../components/art.ts'
import { Archive, CalendarDays, Play, RotateCcw, Settings, Trophy } from 'lucide-react'
import logoUrl from '../../../assets/mythos-logo-concept.png'
import { attemptsLabel, dailyLabel, dateLabel } from '../../engine/daily.ts'
import type { ContentRegistry, DailyRecord, Lang, MetaProfile, RunState } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import { AccountChip } from '../components/AccountControl.tsx'
import { SCREEN_LABEL, savedAgo } from '../components/format.ts'
import { sound } from '../components/sound.ts'
import './title.css'

export interface TitleScreenProps {
  profile: MetaProfile
  run: RunState | null
  /** When that run was last auto-saved (shown under Continue). */
  savedAt?: number | null
  C: ContentRegistry
  /** Today's KST date key and its daily-seed record, if any. */
  today: string
  daily?: DailyRecord
  onContinue: () => void
  onNewLoop: () => void
  /** Open the setup screen in daily-seed mode (the shell asks first if a run is live). */
  onDaily: () => void
  /** Open today's leaderboard. */
  onBoard: () => void
  /** Draw the eye to the daily item (arrived from the daily notification). */
  highlightDaily?: boolean
  onArchive: () => void
  onSettings: () => void
  onLang: (lang: Lang) => void
}

export function TitleScreen({ profile, run, savedAt, C, today, daily, onContinue, onNewLoop, onDaily, onBoard, highlightDaily, onArchive, onSettings, onLang }: TitleScreenProps) {
  const lang = profile.settings.lang
  const ko = lang === 'ko'
  const arch = run ? C.archetypes[run.archetype] : undefined
  const actDef = run ? C.acts[run.act] : undefined
  const hover = () => sound('ui_hover')

  return (
    <div className="m2-title">
      <div className="m2-title__bg" style={{ backgroundImage: `url(${art.title()})` }} />
      <div className="m2-title__rain" />
      <div className="m2-title__shade" />
      <div className="m2-title__account">
        <AccountChip lang={lang} />
      </div>

      <div className="m2-title__inner">
        <div className="m2-title__mark">
          <img src={logoUrl} alt="" />
        </div>
        <h1 className="m2-title__word" aria-label="세계:접속 MYTHOS">
          <span className="m2-title__ko" data-text="세계:접속">
            세계:접속
          </span>
          <span className="m2-title__en">
            MYTHOS <span className="m2-title__ver">2.0 · SIGNAL RUN</span>
          </span>
        </h1>
        <p className="m2-title__tag">{ko ? '지워지기 전에, 도시의 끝까지 달려라.' : 'Run the city end to end before it erases you.'}</p>

        <nav className="m2-title__menu">
          {run && (
            <button
              className="m2-menu-item m2-menu-item--primary"
              onMouseEnter={hover}
              onClick={() => {
                sound('ui_click')
                onContinue()
              }}
            >
              <Play size={18} />
              <span>
                <b>{ko ? '이어하기' : 'Continue'}</b>
                <small>
                  {run.daily ? `${ko ? '오늘의 시드' : 'Daily Signal'} ${tr(dateLabel(run.daily), lang)}` : ko ? `루프 ${run.loop}` : `Loop ${run.loop}`} · {tr(arch?.name, lang)} ·{' '}
                  {tr(actDef?.name, lang)} · {tr(SCREEN_LABEL[run.screen.kind], lang)}
                </small>
                {savedAt && <small className="m2-title__saved">{ko ? `자동 저장 · ${savedAgo(savedAt, lang)}` : `Auto-saved · ${savedAgo(savedAt, lang)}`}</small>}
              </span>
            </button>
          )}
          <button
            className={`m2-menu-item${run ? '' : ' m2-menu-item--primary'}`}
            onMouseEnter={hover}
            onClick={() => {
              sound('ui_click')
              onNewLoop()
            }}
          >
            <RotateCcw size={18} />
            <span>
              <b>{ko ? '새 루프' : 'New loop'}</b>
              <small>{profile.loops === 0 ? (ko ? '첫 접속' : 'Connect for the first time') : ko ? `지금까지 ${profile.loops}번 접속했다` : `${profile.loops} loops so far`}</small>
            </span>
          </button>
          <div className={`m2-menu-row${highlightDaily ? ' is-flagged' : ''}`}>
            <button
              className="m2-menu-item m2-menu-item--daily"
              onMouseEnter={hover}
              onClick={() => {
                sound('ui_click')
                onDaily()
              }}
            >
              <CalendarDays size={18} />
              <span>
                <b>{ko ? '오늘의 시드' : 'Daily Signal'}</b>
                <small>
                  {tr(dateLabel(today), lang)} · <em className={`m2-daily-best${daily?.best.won ? ' is-won' : daily ? ' is-tried' : ''}`}>{tr(dailyLabel(daily), lang)}</em>
                  {daily && ` · ${tr(attemptsLabel(daily.attempts), lang)}`}
                </small>
              </span>
            </button>
            <button
              className="m2-menu-side"
              onMouseEnter={hover}
              onClick={() => {
                sound('ui_click')
                onBoard()
              }}
              title={ko ? '오늘의 순위표' : 'Today’s leaderboard'}
              aria-label={ko ? '오늘의 순위표' : 'Today’s leaderboard'}
            >
              <Trophy size={18} />
              <small>{ko ? '순위' : 'Board'}</small>
            </button>
          </div>
          <button
            className="m2-menu-item"
            onMouseEnter={hover}
            onClick={() => {
              sound('ui_click')
              onArchive()
            }}
          >
            <Archive size={18} />
            <span>
              <b>{ko ? '아카이브' : 'Archive'}</b>
              <small>
                ◈ {profile.echoes} · {ko ? '해금, 코덱스, 결말' : 'Unlocks, codex, endings'}
              </small>
            </span>
          </button>
        </nav>

        <div className="m2-title__foot">
          <div className="m2-langswitch m2-langswitch--sm" role="radiogroup">
            {(['ko', 'en'] as const).map((l) => (
              <button
                key={l}
                className={l === lang ? 'is-on' : ''}
                onClick={() => {
                  sound('ui_click')
                  onLang(l)
                }}
                role="radio"
                aria-checked={l === lang}
              >
                {l === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
          <button className="m2-iconbtn" onClick={onSettings} title={ko ? '설정' : 'Settings'}>
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
