// Mythos 2.0 — thought cabinet (engine/thoughts.ts): the offer a stat voice just made (carry it or let it go), the
// thoughts being carried with their progress, and the closing line of one that just settled.
import { Brain, X } from 'lucide-react'
import { useState } from 'react'
import type { ContentRegistry, Lang, RunState, ThoughtDef } from '../../engine/types.ts'
import { THOUGHT_NODES, THOUGHT_SLOTS } from '../../engine/thoughts.ts'
import { STAT_VOICES } from '../../content/statVoices.ts'
import { tr } from '../common/lang.ts'
import { sound } from '../components/sound.ts'
import { rx } from './rx.ts'
import './thoughts.css'

const def = (C: ContentRegistry, id: string | null | undefined): ThoughtDef | undefined => (id ? C.thoughts?.find((x) => x.id === id) : undefined)

export function ThoughtCabinet({ run, C, lang, act }: { run: RunState; C: ContentRegistry; lang: Lang; act: (next: RunState) => void }) {
  const ko = lang === 'ko'
  const s = run.thoughts
  const [seenSettled, setSeenSettled] = useState('')
  if (!s || (!s.offer && !s.settled && s.slots.length === 0)) return null
  const offer = def(C, s.offer)
  const settled = def(C, s.settled)
  const settledKey = settled ? `${run.id}:${run.visited.length}:${settled.id}` : ''
  const full = s.slots.length >= THOUGHT_SLOTS
  return (
    <div className="m2-thoughts">
      {offer && (
        <div className={`m2-thought m2-voice--${offer.stat}`} role="dialog" aria-label={ko ? '떠오른 생각' : 'A thought'}>
          <div className="m2-thought__head">
            <Brain size={14} /> {tr(STAT_VOICES[offer.stat].tag, lang)} · <b>{tr(offer.name, lang)}</b>
          </div>
          <p>“{tr(offer.offer, lang)}”</p>
          <small>
            {ko ? `${THOUGHT_NODES}노드 동안 품으면: ` : `Carry it for ${THOUGHT_NODES} nodes: `}
            {tr(offer.gain, lang)}
          </small>
          <div className="m2-thought__actions">
            <button
              className="m2-btn m2-btn--primary"
              disabled={full}
              title={full ? (ko ? '생각을 품을 자리가 없다' : 'No room for another thought') : undefined}
              onClick={() => {
                sound('ui_click')
                act(rx.acceptThought(run))
              }}
            >
              {ko ? '품는다' : 'Carry it'}
            </button>
            <button
              className="m2-btn m2-btn--ghost"
              onClick={() => {
                sound('ui_click')
                act(rx.declineThought(run))
              }}
            >
              {ko ? '흘려보낸다' : 'Let it go'}
            </button>
          </div>
        </div>
      )}
      {settled && seenSettled !== settledKey && (
        <div className={`m2-thought is-settled m2-voice--${settled.stat}`} onClick={() => setSeenSettled(settledKey)}>
          <div className="m2-thought__head">
            <Brain size={14} /> {ko ? '내면화' : 'Internalised'} · <b>{tr(settled.name, lang)}</b> <X size={12} />
          </div>
          <p>“{tr(settled.settled, lang)}”</p>
          <small>{tr(settled.gain, lang)}</small>
        </div>
      )}
      {s.slots.length > 0 && (
        <ul className="m2-thoughts__slots" aria-label={ko ? '품은 생각' : 'Carried thoughts'}>
          {s.slots.map((slot) => {
            const d = def(C, slot.id)
            return d ? (
              <li key={slot.id} title={tr(d.gain, lang)}>
                <Brain size={12} /> {tr(d.name, lang)}
                <span className="m2-mono">
                  {slot.progress}/{THOUGHT_NODES}
                </span>
                <button aria-label={ko ? '잊는다' : 'Forget'} onClick={() => act(rx.forgetThought(run, slot.id))}>
                  <X size={11} />
                </button>
              </li>
            ) : null
          })}
        </ul>
      )}
    </div>
  )
}
