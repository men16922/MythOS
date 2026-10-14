// Mythos 2.0 — the AI GM's narration card. Always absolutely positioned over scene art by the caller, so its
// late arrival (or a later swap) can never move buttons under the cursor.

import { Sparkles } from 'lucide-react'
import type { Lang } from '../../engine/types.ts'
import type { AiLineReport } from '../../net/api.ts'
import { ReportLine } from '../components/ReportLine.tsx'
import { Typewriter } from '../components/Typewriter.tsx'
import './voices.css'

interface Props {
  /** The line; null while the GM is still composing (shows a quiet "receiving" state when `pending`). */
  text: string | null
  lang: Lang
  fast: boolean
  pending?: boolean
  className?: string
  /** Where the line came from, to offer an inline report flag (omit on click-through cards). */
  report?: Omit<AiLineReport, 'text' | 'lang'>
}

export function GmCard({ text, lang, fast, pending, className, report }: Props) {
  if (!text && !pending) return null
  return (
    <aside className={`m2-gmcard${text ? '' : ' is-pending'}${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
      <div className="m2-gmcard__label">
        <Sparkles size={13} aria-hidden="true" />
        <span>{lang === 'ko' ? 'GM · 세계:접속' : 'GM · World:Connect'}</span>
        {text && report && <ReportLine className="m2-gmcard__report" line={{ ...report, text, lang }} lang={lang} />}
      </div>
      {text ? (
        <Typewriter key={text} className="m2-gmcard__text" text={text} cps={fast ? 400 : 46} tick={false} />
      ) : (
        <span className="m2-gmcard__dots" aria-label={lang === 'ko' ? 'GM이 상황을 읽는 중' : 'The GM is reading the scene'}>
          <i />
          <i />
          <i />
        </span>
      )}
    </aside>
  )
}
