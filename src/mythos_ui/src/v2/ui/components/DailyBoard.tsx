// Mythos 2.0 — "오늘의 시드" leaderboard (modal): one date, archetype tabs, the top 20 with my row highlighted
// (and my place when it is further down), loading / offline / empty states. Opened from the title's daily item and
// from the end screen of a daily run. Signed out on a sign-in server it is read-only with a nudge to sign in.
import { Pencil, RefreshCw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dateLabel, shiftDateKey } from '../../engine/daily.ts'
import type { ContentRegistry, Lang, MetaProfile } from '../../engine/types.ts'
import { cloudAvailable } from '../../net/api.ts'
import { cleanName, fetchDailyBoard, flushDailyQueue, NAME_MAX, submitDaily, type DailyBoardData } from '../../net/daily.ts'
import { tr } from '../common/lang.ts'
import { useAccountActions, useAuthStatus } from './account.ts'
import { boardView, dayOf, firstTab, resultLabel, SIGNED_OUT_HINT, timeLabel, type BoardRow } from './dailyBoard.ts'
import { Modal } from './Modal.tsx'
import { sound } from './sound.ts'
import './account.css'
import './dailyboard.css'

export interface DailyBoardProps {
  lang: Lang
  C: ContentRegistry
  /** The seed's date ('YYYY-MM-DD', KST). */
  date: string
  /** Today in KST (decides "오늘" / "어제"). */
  today: string
  /** The tab to open on (e.g. the archetype of the run that just ended). */
  archetype?: string
  profile: MetaProfile
  /** Change the name the leaderboard shows for this player (profile.playerName). */
  onRename: (name: string) => void
  onClose: () => void
}

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; data: DailyBoardData }
type Loaded = { key: string; load: Load }

function Row({ row, lang }: { row: BoardRow; lang: Lang }) {
  const ko = lang === 'ko'
  return (
    <li className={`m2-board__row${row.me ? ' is-me' : ''}${row.rank <= 3 ? ` is-top is-top${row.rank}` : ''}${row.result.won ? ' is-won' : ''}`}>
      <span className="m2-board__rank m2-mono">{row.rank}</span>
      <span className="m2-board__name">
        {row.name}
        {row.me && <em className="m2-board__me">{ko ? '나' : 'You'}</em>}
      </span>
      <span className="m2-board__res">{tr(resultLabel(row.result), lang)}</span>
      <span className="m2-board__echo m2-mono">◈ {row.result.echoes}</span>
      <span className="m2-board__time m2-mono">{timeLabel(row.result.secs)}</span>
    </li>
  )
}

function NameEditor({ name, lang, onSave }: { name: string; lang: Lang; onSave: (n: string) => void }) {
  const ko = lang === 'ko'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  if (!editing) {
    return (
      <div className="m2-board__namebar">
        <span>
          {ko ? '순위표 이름' : 'Board name'} <b>{name}</b>
        </span>
        <button
          className="m2-iconbtn"
          onClick={() => {
            setDraft(name)
            setEditing(true)
          }}
          title={ko ? '이름 바꾸기' : 'Change name'}
          aria-label={ko ? '이름 바꾸기' : 'Change name'}
        >
          <Pencil size={14} />
        </button>
      </div>
    )
  }
  const clean = cleanName(draft)
  return (
    <form
      className="m2-board__namebar is-editing"
      onSubmit={(e) => {
        e.preventDefault()
        if (!clean) return
        onSave(clean)
        setEditing(false)
      }}
    >
      <input
        value={draft}
        maxLength={NAME_MAX * 2}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={ko ? '순위표에 남길 이름' : 'Name on the board'}
        aria-label={ko ? '순위표에 남길 이름' : 'Name on the board'}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            setEditing(false)
          }
        }}
      />
      <button className="m2-btn" type="submit" disabled={!clean}>
        {ko ? '저장' : 'Save'}
      </button>
    </form>
  )
}

export function DailyBoard({ lang, C, date, today, archetype, profile, onRename, onClose }: DailyBoardProps) {
  const ko = lang === 'ko'
  const ids = Object.keys(C.archetypes)
  const [tab, setTab] = useState(() => firstTab(ids, archetype ?? profile.daily?.[date]?.best.archetype))
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [nonce, setNonce] = useState(0)
  const status = useAuthStatus()
  const { busy, note, signIn } = useAccountActions()
  const canPost = status.kind === 'signed-in' || cloudAvailable()
  const flushed = useRef<Promise<void> | null>(null)
  const yesterday = shiftDateKey(today, -1)
  const day = dayOf(date, today, yesterday)

  // One fetch per (date, tab, retry, sign-in state); whatever does not match the current key is still loading.
  const key = `${date}|${tab}|${nonce}|${status.kind}`
  const load: Load = loaded?.key === key ? loaded.load : { state: 'loading' }
  useEffect(() => {
    let alive = true
    // Queued submits (an offline run end) go out first so the board already counts them.
    flushed.current ??= flushDailyQueue(today).catch(() => undefined)
    void flushed.current
      .then(() => fetchDailyBoard(date, tab))
      .then((res) => {
        if (alive) setLoaded({ key, load: res === 'offline' ? { state: 'offline' } : { state: 'ready', data: res } })
      })
    return () => {
      alive = false
    }
  }, [key, date, tab, today])

  const rename = useCallback(
    (name: string) => {
      onRename(name)
      // The server updates the name on its next submit: resend this date's best (kept if not better).
      const best = profile.daily?.[date]?.best
      if (best && canPost && (day === 'today' || day === 'yesterday')) {
        void submitDaily({ date, name, result: best }, today).then(() => setNonce((n) => n + 1))
      }
    },
    [onRename, profile.daily, date, canPost, day, today],
  )

  const view = load.state === 'ready' ? boardView(load.data) : null
  // My row scrolls into view once the board is in; when it is appended below the top list, the board's end does
  // (my row plus the name / sign-in footer under it).
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (loaded?.load.state !== 'ready') return
    const me = rootRef.current?.querySelector('.m2-board__row.is-me')
    if (!me) return
    if (me.previousElementSibling?.classList.contains('m2-board__gap')) rootRef.current?.lastElementChild?.scrollIntoView({ block: 'end' })
    else me.scrollIntoView({ block: 'nearest' })
  }, [loaded])
  const dayWord = day === 'today' ? (ko ? '오늘' : 'Today') : day === 'yesterday' ? (ko ? '어제' : 'Yesterday') : ''

  return (
    <Modal
      onClose={onClose}
      title={
        <span className="m2-board__title">
          <Trophy size={18} /> {ko ? '오늘의 시드 순위표' : 'Daily Signal leaderboard'}
        </span>
      }
      actions={
        <button className="m2-btn m2-btn--primary" onClick={onClose}>
          {ko ? '닫기' : 'Close'}
        </button>
      }
    >
      <div className="m2-board" ref={rootRef}>
        <div className="m2-board__head">
          <span className="m2-board__date">
            {tr(dateLabel(date), lang)}
            {dayWord && <em>{dayWord}</em>}
          </span>
          {view && <span className="m2-board__total m2-mono">{ko ? `총 ${view.total}명` : `${view.total} runners`}</span>}
        </div>

        <div className="m2-langswitch m2-board__tabs" role="tablist">
          {ids.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={id === tab}
              className={id === tab ? 'is-on' : ''}
              onClick={() => {
                if (id === tab) return
                sound('ui_click')
                setTab(id)
              }}
            >
              {tr(C.archetypes[id]?.name, lang)}
            </button>
          ))}
        </div>

        {load.state === 'loading' && <p className="m2-board__state">{ko ? '순위를 불러오는 중…' : 'Loading the board…'}</p>}
        {load.state === 'offline' && (
          <div className="m2-board__state is-offline">
            <p>{ko ? '순위표에 닿지 않는다. 연결된 뒤 다시 열어라.' : 'Can’t reach the leaderboard. Try again once you’re online.'}</p>
            <button className="m2-btn m2-btn--ghost" onClick={() => setNonce((n) => n + 1)}>
              <RefreshCw size={14} /> {ko ? '다시 시도' : 'Retry'}
            </button>
          </div>
        )}
        {view?.empty && (
          <p className="m2-board__state">
            {day === 'today'
              ? ko
                ? '아직 아무도 기록을 남기지 않았다. 첫 번째가 되어라.'
                : 'No one has posted yet. Be the first.'
              : ko
                ? '이날은 기록이 없다.'
                : 'No runs posted that day.'}
          </p>
        )}
        {view && !view.empty && (
          <ol className="m2-board__list">
            {view.rows.map((r) => (
              <Row key={r.key} row={r} lang={lang} />
            ))}
            {view.myRow && (
              <>
                <li className="m2-board__gap" aria-hidden="true">
                  ⋯
                </li>
                <Row row={view.myRow} lang={lang} />
              </>
            )}
          </ol>
        )}

        {canPost ? (
          <NameEditor name={profile.playerName} lang={lang} onSave={rename} />
        ) : (
          <div className="m2-board__signin">
            <p>{tr(SIGNED_OUT_HINT, lang)}</p>
            <button className="m2-btn" disabled={busy} onClick={() => void signIn()}>
              {busy ? (ko ? '접속 중…' : 'Signing in…') : ko ? 'Google로 로그인' : 'Sign in with Google'}
            </button>
            {note && <p className={`m2-account__note is-${note.tone}`}>{tr(note.text, lang)}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
