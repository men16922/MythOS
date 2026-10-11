// Mythos 2.0 — which implant family a piece belongs to, how far along the player is, and what each tier gives.
// Shown in tooltips and next to reward / shop offers so "what is this FOR" and "what would it unlock" are visible.
import { implantSetOf, setCounts } from '../../engine/implantSets.ts'
import type { Lang } from '../../engine/types.ts'
import { tr } from '../common/lang.ts'
import './implantSet.css'

export interface ImplantSetNoteProps {
  implantId: string
  /** Implants held right now (an offer counts as the pickup it would be). */
  owned: readonly string[]
  lang: Lang
  /** Treat the piece as already held (the top bar) instead of as a prospective pickup (reward / shop). */
  held?: boolean
}

export function ImplantSetNote({ implantId, owned, lang, held }: ImplantSetNoteProps) {
  const set = implantSetOf(implantId)
  if (!set) return null
  const have = (setCounts(owned)[set.id] ?? 0) + (held || owned.includes(implantId) ? 0 : 1)
  const ko = lang === 'ko'
  return (
    <div className="m2-setnote" data-testid="implant-set-note">
      <div className="m2-setnote__head">
        <b>{tr(set.name, lang)}</b>
        <span className="m2-mono">
          {Math.min(have, set.members.length)}/{set.members.length}
        </span>
        <small>{tr(set.blurb, lang)}</small>
      </div>
      <ul>
        {set.tiers.map((tier) => (
          <li key={tier.count} className={have >= tier.count ? 'is-on' : ''}>
            <span className="m2-mono">{ko ? `${tier.count}개` : `${tier.count} pcs`}</span> {tr(tier.text, lang)}
          </li>
        ))}
      </ul>
    </div>
  )
}
