// Mythos 2.0 — settings modal (language, BGM, SFX, fast animations).
import type { Lang, MetaProfile } from '../../engine/types.ts'
import { Modal } from './Modal.tsx'

type Settings = MetaProfile['settings']

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
      </div>
    </Modal>
  )
}
