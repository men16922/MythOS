// Mythos 2.0 — choose a deck card to remove or upgrade (with a before → after preview for upgrades).
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { CardDef, CardInstance } from '../../engine/types.ts'
import { CardView } from '../components/CardView.tsx'
import { cardSort } from '../components/format.ts'
import { sound } from '../components/sound.ts'
import { rx } from './rx.ts'
import type { ScreenProps } from './types.ts'

export function CardPickScreen({ run, C, lang, act }: ScreenProps) {
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  if (run.screen.kind !== 'card_pick') return null
  const { purpose, count } = run.screen
  const ko = lang === 'ko'
  const list = rx
    .pickable(run, C)
    .map((c) => ({ c, def: C.cards[c.defId] }))
    .filter((x): x is { c: CardInstance; def: CardDef } => !!x.def)
    .sort((a, b) => cardSort(a.def, b.def, lang))
  const focus = list.find((x) => x.c.uid === (sel ?? hover))

  const confirm = () => {
    if (!sel) return
    sound(purpose === 'upgrade' ? 'success' : 'buy')
    act(rx.pickCard(run, sel, C))
    setSel(null)
  }

  return (
    <div className="m2-pick">
      <header className="m2-pick__head">
        <div>
          <div className="m2-pick__kicker">{purpose === 'upgrade' ? (ko ? '정비' : 'Upgrade') : ko ? '삭제' : 'Remove'}</div>
          <h1 className="m2-pick__title">
            {purpose === 'upgrade' ? (ko ? '강화할 카드를 고른다' : 'Choose a card to upgrade') : ko ? '덱에서 지울 카드를 고른다' : 'Choose a card to remove'}
            {count > 1 && <span className="m2-mono"> ×{count}</span>}
          </h1>
        </div>
        <div className="m2-pick__actions">
          {rx.canCancelPick(run) && (
            <button className="m2-btn m2-btn--ghost" onClick={() => act(rx.cancelPick(run))}>
              {ko ? '취소' : 'Cancel'}
            </button>
          )}
          <button className={`m2-btn ${purpose === 'remove' ? 'm2-btn--danger' : 'm2-btn--primary'}`} disabled={!sel} onClick={confirm}>
            {purpose === 'upgrade' ? (ko ? '강화' : 'Upgrade') : ko ? '제거' : 'Remove'}
          </button>
        </div>
      </header>
      <div className="m2-pick__body">
        <div className="m2-cardgrid">
          {list.map(({ c, def }) => (
            <CardView
              key={c.uid}
              def={def}
              upgraded={c.upgraded}
              lang={lang}
              size="md"
              selected={sel === c.uid}
              onClick={() => {
                sound('ui_click')
                setSel(sel === c.uid ? null : c.uid)
              }}
              onMouseEnter={() => {
                sound('card_hover')
                setHover(c.uid)
              }}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {list.length === 0 && <div className="m2-empty">{ko ? '고를 수 있는 카드가 없다.' : 'No eligible cards.'}</div>}
        </div>
        {purpose === 'upgrade' && (
          <aside className="m2-pick__preview">
            {focus ? (
              <>
                <CardView def={focus.def} upgraded={false} lang={lang} size="md" />
                <ArrowRight size={26} className="m2-pick__arrow" />
                <CardView def={focus.def} upgraded lang={lang} size="md" />
              </>
            ) : (
              <p>{ko ? '카드에 마우스를 올리면 강화 결과가 보인다.' : 'Hover a card to preview the upgrade.'}</p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
