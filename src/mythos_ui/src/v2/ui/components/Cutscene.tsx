// Mythos 2.0 — a companion bond cutscene: full-bleed still, title, typed text, one button. No choice.
import { useEffect, useRef, useState } from 'react'
import type { CutsceneDef } from '../../content/cutscenes.ts'
import type { Lang } from '../../engine/types.ts'
import { ART } from '../common/artManifest.ts'
import { asset } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { sound } from './sound.ts'
import { Typewriter } from './Typewriter.tsx'
import './cutscene.css'

export interface CutsceneProps {
  scene: CutsceneDef
  lang: Lang
  fast?: boolean
  /** Called when the player continues (or presses Escape). */
  onDone: () => void
}

export function Cutscene({ scene, lang, fast, onDone }: CutsceneProps) {
  const [typed, setTyped] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const ko = lang === 'ko'
  const src = ART.cutscenes[scene.id]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])
  useEffect(() => {
    if (typed) btn.current?.focus()
  }, [typed])
  return (
    <div className="m2-cutscene" role="dialog" aria-modal="true" aria-label={tr(scene.title, lang)} data-testid="cutscene">
      {src && <img className="m2-cutscene__art" src={asset(src)} alt="" />}
      <div className="m2-cutscene__veil" />
      <div className="m2-cutscene__panel">
        <div className="m2-cutscene__kicker">{ko ? '기억 · 유대' : 'Memory · Bond'}</div>
        <h2 className="m2-cutscene__title">{tr(scene.title, lang)}</h2>
        {/* Re-keyed on skip so the full text shows at once; the first press never closes the scene. */}
        <Typewriter key={skipped ? 'skipped' : 'typing'} className="m2-cutscene__text" text={tr(scene.text, lang)} cps={fast ? 400 : 70} instant={skipped} onDone={() => setTyped(true)} />
        <button
          ref={btn}
          className="m2-btn m2-btn--primary m2-btn--lg"
          onClick={() => {
            sound('ui_click')
            if (typed) onDone()
            else setSkipped(true)
          }}
        >
          {typed ? (ko ? '계속' : 'Continue') : ko ? '글 넘기기' : 'Show all'}
        </button>
      </div>
    </div>
  )
}
