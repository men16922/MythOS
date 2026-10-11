// Mythos 2.0 — daily-seed mode ("오늘의 시드" / Daily Signal).
//
// Everyone who starts a daily on the same calendar day (KST) with the same archetype gets
// the same run: the seed comes from the date + archetype only, and newRun freezes the
// content pools to the base (no-unlock) set, skips Archive threads, fixes paradox at 0 and
// starts with Se-rin (see run.newRun `daily`). Nothing here reads the clock: the UI turns
// "now" into a date key with `dateKeyAt(Date.now())` and passes that key in.
//
// Dates are plain 'YYYY-MM-DD' keys (lexicographic order = calendar order). Day arithmetic
// is integer-only (Hinnant's civil-day algorithms), so it is exact and timezone-free.

import { hashSeed } from './rng.ts'
import type { DailyRecord, DailyResult, Text } from './types.ts'

/** Korea Standard Time, UTC+9, no daylight saving. */
export const KST_OFFSET_MINUTES = 9 * 60
/** Days of daily records a profile keeps (older ones are pruned when a new day is banked). */
export const DAILY_CAP = 30

const DAY_MS = 86_400_000
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Days since 1970-01-01 for a proleptic Gregorian date. */
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y
  const era = Math.floor(yy / 400)
  const yoe = yy - era * 400
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

function civilFromDays(days: number): string {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp < 10 ? mp + 3 : mp - 9
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0)
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function keyToDays(key: string): number | null {
  const m = KEY_RE.exec(key)
  if (!m) return null
  const days = daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]))
  // Round-trip rejects impossible dates such as 2026-02-30.
  return civilFromDays(days) === key ? days : null
}

/** True for a real calendar date written 'YYYY-MM-DD'. */
export function isDateKey(key: unknown): key is string {
  return typeof key === 'string' && keyToDays(key) !== null
}

/** Calendar date ('YYYY-MM-DD') at `epochMs` in a fixed UTC offset (KST by default). */
export function dateKeyAt(epochMs: number, offsetMinutes = KST_OFFSET_MINUTES): string {
  return civilFromDays(Math.floor((epochMs + offsetMinutes * 60_000) / DAY_MS))
}

/** The date `days` after (negative: before) `key`. */
export function shiftDateKey(key: string, days: number): string {
  const base = keyToDays(key)
  if (base === null) throw new Error(`daily: bad date key "${key}"`)
  return civilFromDays(base + Math.trunc(days))
}

/** `today` and the `n - 1` days before it, newest first. */
export function recentDateKeys(today: string, n: number): string[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => shiftDateKey(today, -i))
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** "10월 11일 (일)" / "Sun, Oct 11" for a date key (the key itself if it is not one). */
export function dateLabel(key: string): Text {
  const days = keyToDays(key)
  if (days === null) return { ko: key, en: key }
  const [, mm, dd] = key.split('-').map(Number) as [number, number, number]
  const wd = (((days + 4) % 7) + 7) % 7 // 1970-01-01 was a Thursday
  return { ko: `${mm}월 ${dd}일 (${WEEKDAY_KO[wd]})`, en: `${WEEKDAY_EN[wd]}, ${MONTH_EN[mm - 1]} ${dd}` }
}

/** The run seed shared by every player for this date + archetype. */
export function dailySeed(date: string, archetype: string): number {
  if (!isDateKey(date)) throw new Error(`daily: bad date key "${date}"`)
  return hashSeed(`daily:${date}|${archetype}`)
}

const secsOrWorst = (r: DailyResult): number => r.secs ?? Number.POSITIVE_INFINITY

/** Is `a` a better daily result than `b`? Won, then act, sectors, echoes, kills, then faster. */
export function isBetterDaily(a: DailyResult, b: DailyResult | undefined): boolean {
  if (!b) return true
  const keys: [number, number][] = [
    [Number(a.won), Number(b.won)],
    [a.act, b.act],
    [a.floors, b.floors],
    [a.echoes, b.echoes],
    [a.kills, b.kills],
    [-secsOrWorst(a), -secsOrWorst(b)],
  ]
  for (const [x, y] of keys) if (x !== y) return x > y
  return false
}

/** "3회 도전" / "3 tries". */
export function attemptsLabel(n: number): Text {
  return { ko: `${n}회 도전`, en: `${n} ${n === 1 ? 'try' : 'tries'}` }
}

/** Short label for a day's best: "미도전" / "2막 · 12구역" / "승리". */
export function dailyLabel(rec: DailyRecord | undefined): Text {
  const best = rec?.best
  if (!best) return { ko: '미도전', en: 'Not tried' }
  if (best.won) return { ko: '승리', en: 'Won' }
  return { ko: `${best.act}막 · ${best.floors}구역`, en: `Act ${best.act} · ${best.floors} floors` }
}
