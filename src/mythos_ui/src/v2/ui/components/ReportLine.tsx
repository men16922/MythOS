// Mythos 2.0 — "report this AI line" (Google Play AI-generated content policy: in-app flagging). A small flag next to a
// line a model wrote; one press sends just that line to /api/v2/gm/report for the operator's dashboard (no player id
// is kept). It never changes the game, and a failed send can simply be pressed again.
import { Check, Flag } from 'lucide-react'
import { useState } from 'react'
import type { Lang } from '../../engine/types.ts'
import { reportAiLine, type AiLineReport } from '../../net/api.ts'
import { aiLineReported, markAiLineReported } from '../common/aiLines.ts'
import './report.css'

type State = 'idle' | 'sending' | 'sent' | 'failed'

export function ReportLine({ line, lang, className }: { line: AiLineReport; lang: Lang; className?: string }) {
  const ko = lang === 'ko'
  // Keyed by the text: a new line starts unreported without an effect.
  const [mark, setMark] = useState<{ text: string; state: State }>({ text: line.text, state: 'idle' })
  const state: State = aiLineReported(line.text) ? 'sent' : mark.text === line.text ? mark.state : 'idle'
  const label =
    state === 'sent' ? (ko ? '신고했다' : 'Reported') : state === 'failed' ? (ko ? '보내지 못했다 · 다시' : 'Not sent · retry') : ko ? '이 AI 대사 신고' : 'Report this AI line'
  return (
    <button
      type="button"
      className={`m2-report is-${state}${className ? ` ${className}` : ''}`}
      disabled={state === 'sending' || state === 'sent'}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        const text = line.text
        setMark({ text, state: 'sending' })
        void reportAiLine(line).then((ok) => {
          if (ok) markAiLineReported(text)
          setMark((m) => (m.text === text ? { text, state: ok ? 'sent' : 'failed' } : m))
        })
      }}
    >
      {state === 'sent' ? <Check size={12} aria-hidden="true" /> : <Flag size={12} aria-hidden="true" />}
      {(state === 'sent' || state === 'failed') && <span>{label}</span>}
    </button>
  )
}
