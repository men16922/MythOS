// Mythos 2.0 — title: the city in the rain, the wordmark, and three ways in.
import { art } from '../components/art.ts'
import { Archive, Play, RotateCcw, Settings } from 'lucide-react'
import logoUrl from '../../../assets/mythos-logo-concept.png'
import type { ContentRegistry, Lang, MetaProfile, RunState } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'

export interface TitleScreenProps {
  profile: MetaProfile
  run: RunState | null
  C: ContentRegistry
  onContinue: () => void
  onNewLoop: () => void
  onArchive: () => void
  onSettings: () => void
  onLang: (lang: Lang) => void
}

export function TitleScreen({ profile, run, C, onContinue, onNewLoop, onArchive, onSettings, onLang }: TitleScreenProps) {
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
        <p className="m2-title__tag">
          {ko ? '지워지기 전에, 도시의 끝까지 달려라.' : 'Run the city end to end before it erases you.'}
        </p>

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
                  {ko ? `루프 ${run.loop}` : `Loop ${run.loop}`} · {tr(arch?.name, lang)} · {tr(actDef?.name, lang)}
                </small>
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
              <small>{profile.loops === 0 ? (ko ? '처음 접속한다' : 'Connect for the first time') : ko ? `지금까지 ${profile.loops}번 접속했다` : `${profile.loops} loops so far`}</small>
            </span>
          </button>
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
                ◈ {profile.echoes} · {ko ? '해금, 기록, 결말' : 'Unlocks, codex, endings'}
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
