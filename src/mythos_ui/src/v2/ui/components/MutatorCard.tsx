// Mythos 2.0 — the daily mutator as a readable trade: name, one flavour line, what helps, what costs.
import { Shuffle } from 'lucide-react'
import { mutatorById } from '../../engine/mutators.ts'
import type { Lang } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import './mutator.css'

export function MutatorCard({ id, lang }: { id: string | undefined; lang: Lang }) {
  const m = mutatorById(id)
  if (!m) return null
  const ko = lang === 'ko'
  return (
    <div className="m2-mutator" data-testid="mutator-card">
      <div className="m2-mutator__head">
        <Shuffle size={14} aria-hidden="true" />
        <span className="m2-mutator__kicker">{ko ? '오늘의 변형' : "Today's twist"}</span>
        <b className="m2-mutator__name">{tr(m.name, lang)}</b>
      </div>
      <p className="m2-mutator__blurb">{tr(m.blurb, lang)}</p>
      <div className="m2-mutator__trade">
        <span className="m2-mutator__boon">▲ {tr(m.boon, lang)}</span>
        <span className="m2-mutator__burden">▼ {tr(m.burden, lang)}</span>
      </div>
    </div>
  )
}
