// Mythos 2.0 — persistent run HUD: HP, credits, Trace, act/floor, party, implants, consumables, deck, settings.
import { art } from '../components/art.ts'
import { BookOpen, CloudCheck, Coins, Heart, Layers, Menu, Settings, Shuffle } from 'lucide-react'
import { useEffect } from 'react'
import type { ContentRegistry, Lang, RunState } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { CountUp } from '../components/CountUp.tsx'
import { companionSprite, savedAgo } from '../components/format.ts'
import { HpBar } from '../components/HpBar.tsx'
import { ImplantIcon } from '../components/ImplantIcon.tsx'
import { mutatorById } from '../../engine/mutators.ts'
import { Tooltip } from '../components/Tooltip.tsx'
import { TraceMeter } from '../components/TraceMeter.tsx'
import '../components/mutator.css'
import './topbar.css'

/** Implants already shown once (module-level so it survives the bar unmounting during combat). */
const shownImplants = new Set<string>()

export interface TopBarProps {
  run: RunState
  C: ContentRegistry
  lang: Lang
  onDeck: () => void
  onSettings: () => void
  /** Pause menu: save & quit / settings / abandon. */
  onMenu: () => void
  /** Last auto-save of this run (ms epoch). */
  savedAt: number | null
  /** Drop a consumable from the belt (asks first). */
  onDiscard?: (index: number) => void
}

export function TopBar({ run, C, lang, onDeck, onSettings, onMenu, savedAt, onDiscard }: TopBarProps) {
  // Mark implants as seen after their pulse has played.
  const implantKey = run.implants.join('|')
  useEffect(() => {
    const keys = run.implants.map((id, i) => `${run.id}:${id}:${i}`)
    const t = window.setTimeout(() => keys.forEach((k) => shownImplants.add(k)), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, implantKey])
  const archetype = C.archetypes[run.archetype]
  const floor = run.nodeId ? (run.map.nodes[run.nodeId]?.row ?? 0) + 1 : 0
  const actDef = C.acts[run.act]
  // Codex entries the Code Rewrite ending asks for (content/endings.ts).
  const CODEX_GOAL = Math.max(0, ...Object.values(C.endings).map((e) => e.requires?.minCodex ?? 0))
  return (
    <header className="m2-topbar">
      <div className="m2-topbar__who">
        <div className="m2-topbar__avatar">
          <img src={portrait(archetype?.sprite ?? 'player-noise')} alt="" />
        </div>
        <div className="m2-topbar__hp">
          <div className="m2-topbar__name">
            <Heart size={13} className="m2-ico-hp" />
            {archetype ? tr(archetype.name, lang) : ''}
          </div>
          <HpBar hp={run.hp} max={run.maxHp} />
        </div>
      </div>

      <Tooltip content={lang === 'ko' ? '크레딧. 암시장에서 쓸 수 있다.' : 'Credits. Spend them at the black market.'} placement="bottom">
        <div className="m2-topbar__credits">
          <Coins size={15} />
          <CountUp value={run.credits} className="m2-mono" />
        </div>
      </Tooltip>

      <TraceMeter trace={run.trace} lang={lang} />

      {run.mutator && mutatorById(run.mutator) && (
        <Tooltip
          content={`${tr(mutatorById(run.mutator)!.blurb, lang)} ▲ ${tr(mutatorById(run.mutator)!.boon, lang)} · ▼ ${tr(mutatorById(run.mutator)!.burden, lang)}`}
          placement="bottom"
        >
          <div className="m2-topbar__mutator" data-testid="mutator-chip">
            <Shuffle size={13} aria-hidden="true" />
            <span>{tr(mutatorById(run.mutator)!.name, lang)}</span>
          </div>
        </Tooltip>
      )}

      {/* Codex entries gate the Code Rewrite ending — keep the count visible all run. */}
      {CODEX_GOAL > 0 && (
        <Tooltip
          content={
            lang === 'ko'
              ? `이번 루프에서 찾은 코덱스 기록. ${CODEX_GOAL}개를 모으면 마지막에 'IX의 코드를 다시 쓴다'를 고를 수 있다.`
              : `Codex entries found this loop. Collect ${CODEX_GOAL} to unlock “Rewrite IX’s code” at the end.`
          }
          placement="bottom"
        >
          <div className={`m2-topbar__credits m2-topbar__codex${run.codex.length >= CODEX_GOAL ? ' is-met' : ''}`}>
            <BookOpen size={15} />
            <span className="m2-mono">
              {run.codex.length}
              <small>/{CODEX_GOAL}</small>
            </span>
          </div>
        </Tooltip>
      )}

      <Tooltip content={actDef ? tr(actDef.subtitle, lang) : null} placement="bottom">
        <div className="m2-topbar__act">
          <span className="m2-topbar__actnum">
            {lang === 'ko' ? (
              <>
                {run.act}
                <small>막</small>
              </>
            ) : (
              <>
                <small>ACT</small>
                {run.act}
              </>
            )}
          </span>
          <span className="m2-topbar__actname">{actDef ? tr(actDef.name, lang) : ''}</span>
          <span className="m2-topbar__floor m2-mono">{floor}/8</span>
        </div>
      </Tooltip>

      <div className="m2-topbar__party">
        {run.party.map((m) => {
          const def = C.companions[m.id]
          if (!def) return null
          return (
            <Tooltip
              key={m.id}
              placement="bottom"
              content={
                <div>
                  <div className="m2-tip__title">
                    {tr(def.name, lang)} <em>{tr(def.role, lang)}</em>
                  </div>
                  {def.combatPassive && (
                    <div className="m2-tip__text">
                      <b>{tr(def.combatPassive.name, lang)}</b> · {tr(def.combatPassive.text, lang)}
                    </div>
                  )}
                  <div className="m2-tip__text">{tr(def.passiveText, lang)}</div>
                  <div className="m2-tip__text" style={{ marginTop: 4 }}>
                    HP {m.hp}/{m.maxHp} · {lang === 'ko' ? '유대' : 'Bond'} {m.bond}/3
                  </div>
                </div>
              }
            >
              <div className={`m2-mate${m.hp <= 0 ? ' is-down' : ''}`}>
                <img src={portrait(companionSprite(m.id, C))} alt={tr(def.name, lang)} />
                <HpBar hp={m.hp} max={m.maxHp} small label={false} />
                <div className="m2-mate__bond">
                  {[1, 2, 3].map((i) => (
                    <i key={i} className={i <= m.bond ? 'is-on' : ''} />
                  ))}
                </div>
              </div>
            </Tooltip>
          )
        })}
      </div>

      <div className="m2-topbar__implants">
        {run.implants.map((id, i) => {
          const def = C.implants[id]
          const key = `${run.id}:${id}:${i}`
          const fresh = shownImplants.size > 0 && !shownImplants.has(key)
          return def ? <ImplantIcon key={key} def={def} lang={lang} size={30} flash={fresh} /> : null
        })}
      </div>

      <div className="m2-topbar__cons">
        {[0, 1, 2].map((i) => {
          const id = run.consumables[i]
          const def = id ? C.consumables[id] : undefined
          return def ? (
            <Tooltip
              key={i}
              placement="bottom"
              content={
                <div>
                  <div className="m2-tip__title">{tr(def.name, lang)}</div>
                  <div className="m2-tip__text">{tr(def.text, lang)}</div>
                  <div className="m2-tip__text" style={{ marginTop: 4, color: 'var(--m2-mute)' }}>
                    {lang === 'ko' ? '전투 중 에너지 없이 사용 · 클릭하면 버린다' : 'Free to use in combat · click to discard'}
                  </div>
                </div>
              }
            >
              <button className="m2-cons" onClick={() => onDiscard?.(i)} aria-label={tr(def.name, lang)}>
                <img src={art.consumable(def.id, def.icon)} alt="" />
              </button>
            </Tooltip>
          ) : (
            <div key={i} className="m2-cons is-empty" />
          )
        })}
      </div>

      <div className="m2-topbar__tools">
        <button className="m2-deckbtn" onClick={onDeck} title={lang === 'ko' ? '덱 보기' : 'View deck'}>
          <Layers size={16} />
          <span className="m2-mono">{run.deck.length}</span>
        </button>
        <button className="m2-iconbtn" onClick={onSettings} title={lang === 'ko' ? '설정' : 'Settings'}>
          <Settings size={16} />
        </button>
        {savedAt && (
          // Re-keyed on every save so the check pulses: progress is written after every action.
          <span key={savedAt} className="m2-autosave" title={lang === 'ko' ? `자동 저장됨 · ${savedAgo(savedAt, lang)}` : `Auto-saved · ${savedAgo(savedAt, lang)}`}>
            <CloudCheck size={15} />
            <span>{lang === 'ko' ? '자동 저장' : 'Saved'}</span>
          </span>
        )}
        <button className="m2-iconbtn" onClick={onMenu} title={lang === 'ko' ? '메뉴 · 저장하고 나가기' : 'Menu · save & quit'}>
          <Menu size={16} />
        </button>
      </div>
    </header>
  )
}
