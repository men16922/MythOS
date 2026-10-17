// Mythos 2.0 — settings modal (language, BGM, SFX, fast animations, the Google account, the Signal+ plan and AI
// allowance; daily notification and crash reports in the Android app).
import { useState } from 'react'
import type { Lang, MetaProfile } from '../../engine/types.ts'
import { pushControl } from '../common/nativeBridge.ts'
import { AccountSection } from './AccountControl.tsx'
import { AiLinesSection } from './AiLinesSection.tsx'
import { Modal } from './Modal.tsx'
import { PlanSection } from './SignalPlus.tsx'

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

/** Android app only: "오늘의 시드 알림" (default off). native/push.ts does the work through the nativeBridge seam. */
function DailyPushToggle({ lang }: { lang: Lang }) {
  const ko = lang === 'ko'
  const control = pushControl()
  const [on, setOn] = useState(() => control?.enabled() ?? false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  if (!control) return null
  const base = ko ? '매일 저녁, 오늘의 시드가 열렸다고 알려 준다' : 'An evening nudge when the Daily Signal opens'
  return (
    <Toggle
      on={on}
      label={ko ? '오늘의 시드 알림' : 'Daily Signal alerts'}
      hint={hint ?? base}
      onClick={() => {
        if (busy) return
        setBusy(true)
        const next = !on
        setOn(next) // optimistic; settled below
        void control.set(next, lang).then((res) => {
          setBusy(false)
          setOn(res === 'on')
          setHint(
            res === 'denied'
              ? ko
                ? '알림 권한이 꺼져 있다. 기기 설정에서 허용해라.'
                : 'Notifications are blocked. Allow them in system settings.'
              : res === 'unavailable'
                ? ko
                  ? '이 기기에서는 알림을 켤 수 없다.'
                  : 'Notifications aren’t available on this device.'
                : null,
          )
        })
      }}
    />
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
    <Modal
      onClose={onClose}
      title={ko ? '설정' : 'Settings'}
      actions={
        <button className="m2-btn" onClick={onClose}>
          {ko ? '닫기' : 'Close'}
        </button>
      }
    >
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
        <Toggle
          on={settings.ai}
          label={ko ? 'AI 대사 사용' : 'AI-written lines'}
          hint={
            ko
              ? 'GM 내레이션, 동료의 대답, IX 통신, 자유 행동 판정을 AI가 쓴다. 끄면 미리 쓰인 대사만 나온다.'
              : 'AI writes GM narration, companion replies, IX comms and judges improvised actions. Off = authored lines only.'
          }
          onClick={() => onChange({ ...settings, ai: !settings.ai })}
        />
        <AccountSection lang={lang} />
        <PlanSection lang={lang} />
        <AiLinesSection lang={lang} />
        {APP_BUILD && <DailyPushToggle lang={lang} />}
        {APP_BUILD && <CrashReportsToggle ko={ko} />}
      </div>
    </Modal>
  )
}
