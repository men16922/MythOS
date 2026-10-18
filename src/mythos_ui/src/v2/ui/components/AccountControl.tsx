// Mythos 2.0 — the Google account control: a small chip on the title screen (sign in, or the signed-in player with an
// account sheet to sign out) and the account section of Settings. Signing in turns on cloud saves, the AI GM and the
// daily leaderboard; without it the game plays fully offline on this device.
import { Cloud, CloudOff, LogIn, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lang } from '../../engine/types.ts'
import type { AuthUser } from '../../net/auth.ts'
import { tr } from '../common/lang.ts'
import { ACCOUNT_WHY, DELETE_WARNING, initialOf, useAccountActions, useAuthStatus, type AccountNote } from './account.ts'
import { Modal } from './Modal.tsx'
import { usePlan } from './plan.ts'
import { sound } from './sound.ts'
import './account.css'

function Avatar({ user, size = 28 }: { user: AuthUser; size?: number }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="m2-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {user.photoUrl && !broken ? (
        <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <b style={{ fontSize: Math.round(size * 0.5) }}>{initialOf(user.name)}</b>
      )}
    </span>
  )
}

function Note({ note, lang }: { note: AccountNote | null; lang: Lang }) {
  if (!note) return null
  return (
    <p className={`m2-account__note is-${note.tone}`} role="status">
      {tr(note.text, lang)}
    </p>
  )
}

/** Title screen: "Google로 로그인" (+ why), or the signed-in player; a click opens the account sheet. */
export function AccountChip({ lang }: { lang: Lang }) {
  const ko = lang === 'ko'
  const status = useAuthStatus()
  const { busy, note, signIn, signOut, clearNote } = useAccountActions()
  const [sheet, setSheet] = useState(false)
  const plan = usePlan()

  // A sign-in outcome line fades out on its own after a while.
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(clearNote, 9000)
    return () => window.clearTimeout(t)
  }, [note, clearNote])

  if (status.kind === 'signed-in') {
    const { user } = status
    return (
      <div className="m2-account">
        <button
          className="m2-account__chip is-in"
          onClick={() => {
            sound('ui_click')
            setSheet(true)
          }}
          title={ko ? '계정' : 'Account'}
        >
          <Avatar user={user} />
          <span className="m2-account__text">
            <b>{user.name}</b>
            <small>
              <Cloud size={11} /> {ko ? '클라우드 저장 중' : 'Cloud saves on'}
            </small>
          </span>
        </button>
        <Note note={note} lang={lang} />
        {sheet && (
          <Modal
            onClose={() => setSheet(false)}
            title={ko ? '계정' : 'Account'}
            actions={
              <>
                <button
                  className="m2-btn m2-btn--ghost"
                  disabled={busy}
                  onClick={() => {
                    sound('ui_click')
                    void signOut().then(() => setSheet(false))
                  }}
                >
                  <LogOut size={15} /> {ko ? '로그아웃' : 'Sign out'}
                </button>
                <button className="m2-btn m2-btn--primary" onClick={() => setSheet(false)}>
                  {ko ? '닫기' : 'Close'}
                </button>
              </>
            }
          >
            <AccountSummary user={user} lang={lang} />
          </Modal>
        )}
      </div>
    )
  }

  return (
    <div className="m2-account">
      <button
        className="m2-account__chip"
        disabled={busy}
        onClick={() => {
          sound('ui_click')
          void signIn()
        }}
      >
        <span className="m2-account__icon">
          <LogIn size={16} />
        </span>
        <span className="m2-account__text">
          <b>{busy ? (ko ? '접속 중…' : 'Signing in…') : ko ? 'Google로 로그인' : 'Sign in with Google'}</b>
          <small>{tr(ACCOUNT_WHY, lang)}</small>
        </span>
      </button>
      {plan.demo && (
        <p className="m2-account__demo" data-testid="demo-chip">
          {ko ? '데모 접속 — 로그인 없이 AI 대사가 켜져 있다 (기기당 한도)' : 'Demo access — AI lines are on without sign-in (per-device allowance)'}
        </p>
      )}
      <Note note={note} lang={lang} />
    </div>
  )
}

function AccountSummary({ user, lang }: { user: AuthUser; lang: Lang }) {
  const ko = lang === 'ko'
  return (
    <div className="m2-account__who">
      <Avatar user={user} size={44} />
      <span>
        <b>{user.name}</b>
        {user.email && <small className="m2-mono">{user.email}</small>}
        <small className="m2-account__on">
          <Cloud size={12} /> {ko ? '클라우드 저장 · AI 대사 · 순위표가 켜져 있다' : 'Cloud saves · AI lines · leaderboard are on'}
        </small>
      </span>
    </div>
  )
}

/** Settings: account status with sign-in / sign-out, and account deletion behind an inline confirmation. */
export function AccountSection({ lang }: { lang: Lang }) {
  const ko = lang === 'ko'
  const status = useAuthStatus()
  const { busy, note, signIn, signOut, deleteAccount } = useAccountActions()
  const [confirming, setConfirming] = useState(false)
  const signedIn = status.kind === 'signed-in'
  return (
    <div className="m2-toggle m2-account-section">
      {signedIn ? (
        <AccountSummary user={status.user} lang={lang} />
      ) : (
        <span className="m2-toggle__text">
          <b>
            <CloudOff size={14} /> {ko ? '이 기기에만 저장 중' : 'Saving on this device only'}
          </b>
          <small>
            {ko
              ? 'Google로 로그인하면 클라우드 저장과 AI 대사, 오늘의 시드 순위표가 켜진다. 로그인하지 않아도 끝까지 플레이할 수 있다.'
              : 'Sign in with Google for cloud saves, AI lines and the Daily Signal leaderboard. You can play everything without it.'}
          </small>
        </span>
      )}
      <div className="m2-account-section__row">
        {signedIn ? (
          <>
            <button className="m2-btn m2-btn--ghost" disabled={busy} onClick={() => void signOut()}>
              <LogOut size={15} /> {ko ? '로그아웃' : 'Sign out'}
            </button>
            {!confirming && (
              <button className="m2-btn m2-btn--ghost m2-btn--danger" disabled={busy} onClick={() => setConfirming(true)}>
                <Trash2 size={15} /> {ko ? '계정 삭제' : 'Delete account'}
              </button>
            )}
          </>
        ) : (
          <button className="m2-btn m2-btn--primary" disabled={busy} onClick={() => void signIn()}>
            <LogIn size={15} /> {busy ? (ko ? '접속 중…' : 'Signing in…') : ko ? 'Google로 로그인' : 'Sign in with Google'}
          </button>
        )}
      </div>
      {signedIn && confirming && (
        <div className="m2-account-delete" role="alertdialog" aria-label={ko ? '계정 삭제 확인' : 'Confirm account deletion'}>
          <p>{tr(DELETE_WARNING, lang)}</p>
          <div className="m2-account-section__row">
            <button className="m2-btn m2-btn--ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {ko ? '취소' : 'Cancel'}
            </button>
            <button
              className="m2-btn m2-btn--danger"
              disabled={busy}
              onClick={() => {
                void deleteAccount().then((ok) => {
                  if (ok) setConfirming(false)
                })
              }}
            >
              <Trash2 size={15} /> {busy ? (ko ? '삭제 중…' : 'Deleting…') : ko ? '영구 삭제' : 'Delete for good'}
            </button>
          </div>
        </div>
      )}
      <Note note={note} lang={lang} />
    </div>
  )
}
