// Mythos 2.0 — account UI state (no JSX): the auth status hook and the player-facing lines for sign-in outcomes.
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { Text } from '../../engine/types.ts'
import { getAuth, type AuthStatus, type DeleteAccountOutcome, type SignInFailure, type SignInResult } from '../../net/auth.ts'
import { L } from '../common/lang.ts'

export function useAuthStatus(): AuthStatus {
  const auth = getAuth()
  return useSyncExternalStore(auth.subscribe, auth.status, auth.status)
}

export const ACCOUNT_WHY = L('클라우드 저장 · AI 대사 · 오늘의 시드 순위표', 'Cloud saves · AI lines · Daily leaderboard')

const FAIL_LINE: Record<Exclude<SignInFailure, 'cancelled' | 'busy'>, Text> = {
  'not-configured': L('Google 로그인은 아직 열리지 않았다. 그때까지 기록은 이 기기에 남는다.', 'Google sign-in isn’t open yet. Until then, your progress stays on this device.'),
  offline: L('신호가 닿지 않는다. 연결된 뒤 다시 시도해라.', 'No signal. Try again once you’re online.'),
  'popup-blocked': L('로그인 창이 막혔다. 팝업을 허용하고 다시 눌러라.', 'The sign-in window was blocked. Allow pop-ups and try again.'),
  'no-account': L('이 기기에 Google 계정이 없다. 기기 설정에서 계정을 추가하고 다시 시도해라.', 'No Google account on this device. Add one in system settings, then try again.'),
  failed: L('로그인하지 못했다. 잠시 뒤 다시 시도해라.', 'Couldn’t sign in. Try again in a moment.'),
}

export type AccountNote = { tone: 'ok' | 'warn'; text: Text }

/** What to tell the player after a sign-in attempt (null: say nothing, e.g. they closed the Google window). */
export function signInNote(res: SignInResult): AccountNote | null {
  if (!res.ok) return res.reason === 'cancelled' || res.reason === 'busy' ? null : { tone: 'warn', text: FAIL_LINE[res.reason] }
  const a = res.adopted
  if (!a) return { tone: 'ok', text: L('로그인했다.', 'Signed in.') }
  if (a.profile === null || a.run === null) return { tone: 'ok', text: L('로그인했다. 연결되면 기록을 맞춘다.', 'Signed in. Your progress syncs once you’re online.') }
  if (a.profile === 'take-remote') return { tone: 'ok', text: L('계정에 남아 있던 기록을 불러왔다.', 'Loaded the progress saved on your account.') }
  if (a.profile === 'push-local') return { tone: 'ok', text: L('이 기기의 기록을 계정에 올렸다.', 'This device’s progress is now on your account.') }
  return { tone: 'ok', text: L('로그인했다.', 'Signed in.') }
}

export const SIGNED_OUT_NOTE: AccountNote = { tone: 'ok', text: L('로그아웃했다. 이 기기의 기록은 그대로 남는다.', 'Signed out. This device keeps its progress.') }

/** What Settings explains before the player confirms an account deletion. */
export const DELETE_WARNING = L(
  '클라우드 저장, 지난 작전 기록, 순위표 항목, Google 로그인 정보가 서버에서 영구히 지워진다. 되돌릴 수 없다. 이 기기의 진행은 남는다.',
  'Your cloud saves, run history, leaderboard entries and Google sign-in record are erased from the server for good. This cannot be undone. This device keeps its progress.',
)

/** What to tell the player after an account deletion attempt (null: nothing happened, e.g. already busy). */
export function deleteNote(res: DeleteAccountOutcome): AccountNote | null {
  if (res.ok) {
    return res.signInRecordDeleted === false
      ? { tone: 'warn', text: L('게임 기록을 서버에서 지웠다. 남은 로그인 정보는 운영자가 30일 안에 지운다.', 'Your game data is erased from the server. The remaining sign-in record is removed by the operator within 30 days.') }
      : { tone: 'ok', text: L('계정을 삭제했다. 서버에 남은 기록은 없다.', 'Account deleted. Nothing of yours is left on the server.') }
  }
  if (res.reason === 'offline') return { tone: 'warn', text: L('신호가 닿지 않는다. 연결된 뒤 다시 시도해라. 아무것도 지워지지 않았다.', 'No signal. Nothing was deleted; try again once you’re online.') }
  if (res.reason === 'failed') return { tone: 'warn', text: L('삭제하지 못했다. 잠시 뒤 다시 시도해라.', 'Couldn’t delete the account. Try again in a moment.') }
  return null
}

/** Sign-in / sign-out / delete actions with a busy flag and the last outcome line. */
export function useAccountActions(): {
  busy: boolean
  note: AccountNote | null
  signIn: () => Promise<boolean>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<boolean>
  clearNote: () => void
} {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<AccountNote | null>(null)
  const signIn = useCallback(async () => {
    setBusy(true)
    setNote(null)
    const res = await getAuth().signIn()
    setBusy(false)
    setNote(signInNote(res))
    return res.ok
  }, [])
  const signOut = useCallback(async () => {
    setBusy(true)
    await getAuth().signOut()
    setBusy(false)
    setNote(SIGNED_OUT_NOTE)
  }, [])
  const deleteAccount = useCallback(async () => {
    setBusy(true)
    setNote(null)
    const res = await getAuth().deleteAccount()
    setBusy(false)
    setNote(deleteNote(res))
    return res.ok
  }, [])
  const clearNote = useCallback(() => setNote(null), [])
  return { busy, note, signIn, signOut, deleteAccount, clearNote }
}

/** First visible character of a name, for the avatar fallback. */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?'
}
