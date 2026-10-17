// Mythos 2.0 — Signal+ party banter on the map (content/banter.ts): after a node, sometimes the two deployed
// companions trade a few lines. UI-only flavour; deterministic per run and node so a reload shows the same thing.
import { useEffect, useState } from 'react'
import type { ContentRegistry, Lang, RunState } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { pickBanter } from './banterPick.ts'

export function MapBanter({ run, C, lang, fast }: { run: RunState; C: ContentRegistry; lang: Lang; fast: boolean }) {
  const banter = pickBanter(run)
  const key = banter ? `${run.id}:${run.visited.length}:${banter.id}` : ''
  const [shown, setShown] = useState<{ key: string; n: number; closed: boolean }>({ key: '', n: 0, closed: false })
  const state = shown.key === key ? shown : { key, n: 0, closed: false }
  useEffect(() => {
    if (!banter || state.closed || state.n >= banter.lines.length) return
    const id = window.setTimeout(() => setShown({ key, n: state.n + 1, closed: false }), state.n === 0 ? 500 : fast ? 900 : 2200)
    return () => window.clearTimeout(id)
  }, [banter, key, state.n, state.closed, fast])
  if (!banter || state.closed || state.n === 0) return null
  return (
    <ol className="m2-banter" aria-live="polite" onClick={() => setShown({ key, n: state.n, closed: true })}>
      {banter.lines.slice(0, state.n).map((l, i) => {
        const def = C.companions[l.who]
        return (
          <li key={i} className={l.who === banter.pair[0] ? 'is-a' : 'is-b'}>
            {def && <img src={portrait(def.sprite)} alt="" />}
            <span>
              <b>{tr(def?.name, lang)}</b>
              {tr(l.text, lang)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
