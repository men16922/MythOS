// Mythos 2.0 — daily leaderboard view model (pure; DailyBoard.tsx renders it, dailyBoard.test.ts checks it).
import type { DailyResult, Text } from '../../engine/types.ts'
import type { DailyBoardData, SubmitOutcome } from '../../net/daily.ts'
import { L } from '../common/lang.ts'

export interface BoardRow {
  key: string
  rank: number
  name: string
  result: DailyResult
  me: boolean
}

export interface BoardView {
  rows: BoardRow[]
  /** This player's place when it is not among `rows` (outside the top N): shown under a gap. */
  myRow: BoardRow | null
  total: number
  empty: boolean
}

/** Rows in rank order with my row flagged; my own place appended separately when it falls outside the list. */
export function boardView(data: DailyBoardData): BoardView {
  const rows = [...data.entries]
    .sort((a, b) => a.rank - b.rank)
    .map((e, i): BoardRow => ({ key: `${e.rank}:${i}`, rank: e.rank, name: e.name.trim() || '익명', result: e.result, me: e.me }))
  const listed = rows.some((r) => r.me)
  const me = data.me
  const myRow = !listed && me ? { key: `me:${me.rank}`, rank: me.rank, name: me.name.trim() || '익명', result: me.result, me: true } : null
  return { rows, myRow, total: Math.max(data.total, rows.length, myRow?.rank ?? 0), empty: rows.length === 0 && !myRow }
}

/** "승리" / "2막 · 12구역". */
export function resultLabel(r: DailyResult): Text {
  if (r.won) return L('승리', 'Won')
  return { ko: `${r.act}막 · ${r.floors}구역`, en: `Act ${r.act} · ${r.floors} floors` }
}

/** "12:34" / "1:02:03" for a run's wall-clock seconds ("" when unknown). */
export function timeLabel(secs: number | undefined): string {
  if (typeof secs !== 'number' || !Number.isFinite(secs) || secs <= 0) return ''
  const s = Math.round(secs)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** "오늘 3위 / 총 41명" (or "어제 …" for yesterday's seed). */
export function rankText(rank: number, total: number, day: 'today' | 'yesterday' | 'other' = 'today'): Text {
  const t = Math.max(total, rank)
  const ko = day === 'today' ? '오늘 ' : day === 'yesterday' ? '어제 ' : ''
  const en = day === 'today' ? 'Today: ' : day === 'yesterday' ? 'Yesterday: ' : ''
  return { ko: `${ko}${rank}위 / 총 ${t}명`, en: `${en}#${rank} of ${t}` }
}

export const IMPROVED = L('기록 갱신!', 'New best!')

/** The ending screen's leaderboard line for a submit (null outcome = still sending). */
export function submitLine(outcome: SubmitOutcome | null, day: 'today' | 'yesterday' | 'other' = 'today'): { text: Text; improved: boolean; tone: 'ok' | 'wait' | 'warn' } {
  if (!outcome) return { text: L('순위표에 기록을 올리는 중…', 'Posting to the leaderboard…'), improved: false, tone: 'wait' }
  switch (outcome.kind) {
    case 'ranked':
      return { text: rankText(outcome.rank, outcome.total, day), improved: outcome.improved, tone: 'ok' }
    case 'queued':
      return { text: L('신호가 끊겼다. 연결되면 기록을 올린다.', 'No signal. Your run is posted once you’re online.'), improved: false, tone: 'wait' }
    case 'signed-out':
      return { text: SIGNED_OUT_HINT, improved: false, tone: 'warn' }
    case 'rejected':
      return { text: L('이 기록은 순위표에 올라가지 않는다. 그날의 시드가 이미 닫혔다.', 'This run can’t be posted: that day’s seed has closed.'), improved: false, tone: 'warn' }
  }
}

export const SIGNED_OUT_HINT = L('로그인하면 기록이 올라간다.', 'Sign in to post your runs.')

/** Which day a date key is relative to today. */
export function dayOf(date: string, today: string, yesterday: string): 'today' | 'yesterday' | 'other' {
  return date === today ? 'today' : date === yesterday ? 'yesterday' : 'other'
}

/** The tab to open first: the preferred archetype if it exists, else the first one. */
export function firstTab(ids: readonly string[], preferred?: string): string {
  return preferred && ids.includes(preferred) ? preferred : (ids[0] ?? '')
}
