// Mythos 2.0 — deck viewer: grid of CardViews sorted by type, with counts.
import type { CardInstance, ContentRegistry, Lang } from '../../engine/types.ts'
import { CardView } from './CardView.tsx'
import { cardSort } from './format.ts'
import { Modal } from './Modal.tsx'

export interface DeckModalProps {
  cards: CardInstance[]
  C: ContentRegistry
  lang: Lang
  onClose: () => void
  title?: string
}

export function DeckModal({ cards, C, lang, onClose, title }: DeckModalProps) {
  const list = cards
    .map((c) => ({ c, def: C.cards[c.defId] }))
    .filter((x): x is { c: CardInstance; def: NonNullable<typeof x.def> } => !!x.def)
    .sort((a, b) => cardSort(a.def, b.def, lang) || Number(a.c.upgraded) - Number(b.c.upgraded))
  const counts: Record<string, number> = {}
  for (const x of list) counts[x.def.type] = (counts[x.def.type] ?? 0) + 1
  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <div className="m2-deckmodal__head">
          <span>{title ?? (lang === 'ko' ? '프로토콜 덱' : 'Protocol deck')}</span>
          <span className="m2-mono m2-deckmodal__n">{list.length}</span>
        </div>
      }
    >
      <div className="m2-cardgrid">
        {list.map(({ c, def }) => (
          <CardView key={c.uid} def={def} upgraded={c.upgraded} lang={lang} size="md" />
        ))}
        {list.length === 0 && <div className="m2-empty">{lang === 'ko' ? '카드가 없다.' : 'No cards.'}</div>}
      </div>
    </Modal>
  )
}
