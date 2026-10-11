// Mythos 2.0 — settings modal (language, BGM, SFX, fast animations, invite code; crash reports in the Android app).
import { useState, type CSSProperties } from 'react'
import type { Lang, MetaProfile } from '../../engine/types.ts'
import { getInviteKey, setInviteKey } from '../../net/api.ts'
import { Modal } from './Modal.tsx'

type Settings = MetaProfile['settings']

/** Android app build (`vite build --mode app`). A build-time constant: the web bundle drops the app-only rows. */
const APP_BUILD = import.meta.env.MODE === 'app'
/** Mirror native/crash.ts (read/sent here without loading the Capacitor plugin). */
const CRASH_REPORTS_KEY = 'mythos2.crashReports'
const CRASH_REPORTS_EVENT = 'mythos:crash-reports'

export interface SettingsPanelProps {
  settings: Settings
  onChange: (s: Settings) => void
  onClose: () => void
}

function Toggle({ on, label, hint, onClick }: { on: boolean; label: string; hint?: string; onClick: () => void }) {
  return (
    <button className={`m2-toggle${on ? ' is-on' : ''}`} onClick={onClick} role="switch" aria-checked={on}>
      <span className="m2-toggle__text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <span className="m2-toggle__sw">
        <i />
      </span>
    </button>
  )
}

const INVITE_BOX: CSSProperties = { cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10 }
const INVITE_INPUT: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 40,
  padding: '0 12px',
  font: 'inherit',
  fontSize: 15,
  color: 'var(--m2-ink)',
  background: 'rgba(3, 10, 12, 0.85)',
  border: '1px solid var(--m2-line-2)',
  outline: 'none',
}

/**
 * Invite code (the production API's access key). The web client also takes it from `?invite=`; the Android app
 * has no URL, so it is typed here. Saving reloads the game so saves follow the new identity (see setInviteKey).
 * The stored key is never shown back.
 */
function InviteField({ ko }: { ko: boolean }) {
  const [hasKey] = useState(() => getInviteKey() !== null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const apply = async (key: string | null) => {
    setBusy(true)
    await setInviteKey(key)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      window.location.replace(url.toString())
    } catch {
      window.location.reload()
    }
  }
  return (
    <div className="m2-toggle" style={INVITE_BOX}>
      <span className="m2-toggle__text">
        <b>{ko ? '초대 코드' : 'Invite code'}</b>
        <small>
          {hasKey
            ? ko
              ? '등록됨. 바꾸면 그 코드의 클라우드 저장을 불러온다.'
              : 'Saved. Changing it loads that code’s cloud save.'
            : ko
              ? '받은 코드를 넣으면 클라우드 저장과 AI GM이 켜진다. 없어도 오프라인으로 플레이할 수 있다.'
              : 'Enter your code to turn on cloud saves and the AI GM. You can play offline without one.'}
        </small>
      </span>
      <form
        className="m2-improv__row"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim() && !busy) void apply(draft)
        }}
      >
        <input
          type="password"
          value={draft}
          maxLength={128}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={hasKey ? (ko ? '새 코드' : 'New code') : ko ? '초대 코드' : 'Invite code'}
          aria-label={ko ? '초대 코드' : 'Invite code'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          style={INVITE_INPUT}
        />
        <button className="m2-btn" type="submit" disabled={!draft.trim() || busy}>
          {ko ? '저장' : 'Save'}
        </button>
        {hasKey && (
          <button className="m2-btn m2-btn--ghost" type="button" disabled={busy} onClick={() => void apply(null)}>
            {ko ? '지우기' : 'Clear'}
          </button>
        )}
      </form>
    </div>
  )
}

function readCrashReports(): boolean {
  try {
    return window.localStorage.getItem(CRASH_REPORTS_KEY) !== '0'
  } catch {
    return true
  }
}

/** Android app only: Firebase Crashlytics opt-out. */
function CrashReportsToggle({ ko }: { ko: boolean }) {
  const [on, setOn] = useState(readCrashReports)
  return (
    <Toggle
      on={on}
      label={ko ? '오류 보고 보내기' : 'Send crash reports'}
      hint={ko ? '앱이 멈추거나 오류가 나면 기술 정보만 익명으로 보낸다' : 'Sends anonymous technical details when the app crashes or errors'}
      onClick={() => {
        const next = !on
        setOn(next)
        // native/crash.ts listens (kept as an event so this shared component never imports the Capacitor plugin).
        window.dispatchEvent(new CustomEvent<boolean>(CRASH_REPORTS_EVENT, { detail: next }))
      }}
    />
  )
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const lang: Lang = settings.lang
  const ko = lang === 'ko'
  return (
    <Modal onClose={onClose} title={ko ? '설정' : 'Settings'} actions={<button className="m2-btn" onClick={onClose}>{ko ? '닫기' : 'Close'}</button>}>
      <div className="m2-settings">
        <div className="m2-langswitch" role="radiogroup">
          {(['ko', 'en'] as const).map((l) => (
            <button key={l} className={l === lang ? 'is-on' : ''} onClick={() => onChange({ ...settings, lang: l })} role="radio" aria-checked={l === lang}>
              {l === 'ko' ? '한국어' : 'English'}
            </button>
          ))}
        </div>
        <Toggle on={settings.bgm} label={ko ? '배경 음악' : 'Music'} onClick={() => onChange({ ...settings, bgm: !settings.bgm })} />
        <Toggle on={settings.sfx} label={ko ? '효과음' : 'Sound effects'} onClick={() => onChange({ ...settings, sfx: !settings.sfx })} />
        <Toggle
          on={settings.fastAnim}
          label={ko ? '빠른 연출' : 'Fast animations'}
          hint={ko ? '텍스트와 전투 연출을 빠르게 넘긴다' : 'Text and combat animations play faster'}
          onClick={() => onChange({ ...settings, fastAnim: !settings.fastAnim })}
        />
        <InviteField ko={ko} />
        {APP_BUILD && <CrashReportsToggle ko={ko} />}
      </div>
    </Modal>
  )
}
