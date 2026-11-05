// Mythos 2.0 — Settings: the AI lines shown this session, each with a report flag (Google Play AI-generated content
// policy). The only place the click-through IX comms and boss lines can be flagged from.
import { Flag } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import type { Lang } from '../../engine/types.ts'
import { recentAiLines, subscribeAiLines, type AiLine } from '../common/aiLines.ts'
import { ReportLine } from './ReportLine.tsx'
import './report.css'

function source(line: AiLine, ko: boolean): string {
  if (line.route === 'improvise') return ko ? '즉흥 행동 판정' : 'Improvised action'
  if (line.kind.startsWith('companion:')) return ko ? '동료 대화' : 'Companion chat'
  if (line.kind.startsWith('ix:')) return ko ? 'IX 통신' : 'IX comms'
  if (line.kind === 'boss') return ko ? '보스전 내레이션' : 'Boss narration'
  if (line.kind === 'chronicle') return ko ? '루프 기록' : 'Loop chronicle'
  return ko ? 'GM 내레이션' : 'GM narration'
}

export function AiLinesSection({ lang }: { lang: Lang }) {
  const ko = lang === 'ko'
  const lines = useSyncExternalStore(subscribeAiLines, recentAiLines, recentAiLines)
  return (
    <div className="m2-toggle m2-ailines">
      <span className="m2-toggle__text">
        <b>
          <Flag size={14} /> {ko ? 'AI 대사 신고' : 'Report AI lines'}
        </b>
        <small>
          {ko
            ? 'GM, 동료, IX의 일부 대사는 AI가 쓴다. 부적절한 대사는 깃발로 신고할 수 있다. 대사와 나온 곳·언어를 보낸다. 신고자 ID를 별도로 남기지 않지만 대사에 개인정보가 있을 수 있다.'
            : 'Some GM, companion and IX lines are written by AI. Flag inappropriate lines to send their text, context and language. We do not store a separate reporter ID, but the text may contain personal information.'}
        </small>
      </span>
      {lines.length ? (
        <ol aria-label={ko ? '이번 접속의 AI 대사' : 'AI lines this session'}>
          {lines.map((l) => (
            <li key={l.id}>
              <p>
                <small>{source(l, ko)}</small>
                {l.text}
              </p>
              <ReportLine line={l} lang={lang} />
            </li>
          ))}
        </ol>
      ) : (
        <small className="m2-ailines__empty">{ko ? '이번 접속에서 AI가 쓴 대사가 아직 없다.' : 'No AI-written lines yet this session.'}</small>
      )}
    </div>
  )
}
