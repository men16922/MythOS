// Mythos 2.0 — IX detection meter with tier colour + label.
import type { Lang } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import { TRACE_EFFECT, TRACE_LABEL, traceTier } from './format.ts'
import { Tooltip } from './Tooltip.tsx'

export function TraceMeter({ trace, lang, compact }: { trace: number; lang: Lang; compact?: boolean }) {
  const tier = traceTier(trace)
  const pct = Math.max(0, Math.min(100, trace))
  return (
    <Tooltip
      placement="bottom"
      content={
        <div>
          <div className="m2-tip__title">
            {lang === 'ko' ? '추적도' : 'Trace'} {pct}/100 · {tr(TRACE_LABEL[tier], lang)}
          </div>
          <div className="m2-tip__text">
            {lang === 'ko'
              ? 'IX가 당신을 얼마나 바짝 쫓는지 보여 준다. 노드를 옮길 때, 시끄러운 카드를 쓸 때, 욕심을 부릴 때 오른다. 은신처와 암시장에서 낮출 수 있다.'
              : 'How closely IX is watching. Rises with every node, loud cards and greedy choices. Scrub it at safehouses and the black market.'}
          </div>
          <div className="m2-trace-tips">
            {(['quiet', 'alert', 'hunted', 'purge'] as const).map((t) => (
              <div key={t} className={`m2-trace-tip m2-trace-tip--${t}${t === tier ? ' is-on' : ''}`}>
                <b>{tr(TRACE_LABEL[t], lang)}</b> {tr(TRACE_EFFECT[t], lang)}
              </div>
            ))}
          </div>
        </div>
      }
      width={320}
    >
      <div className={`m2-trace m2-trace--${tier}${compact ? ' m2-trace--compact' : ''}`}>
        <div className="m2-trace__head">
          <span className="m2-trace__label">{lang === 'ko' ? '추적도' : 'Trace'}</span>
          <span className="m2-trace__tier">{tr(TRACE_LABEL[tier], lang)}</span>
          <span className="m2-trace__val m2-mono">{pct}</span>
        </div>
        <div className="m2-trace__bar">
          <div className="m2-trace__fill" style={{ width: `${pct}%` }} />
          <i style={{ left: '33%' }} />
          <i style={{ left: '66%' }} />
        </div>
      </div>
    </Tooltip>
  )
}
