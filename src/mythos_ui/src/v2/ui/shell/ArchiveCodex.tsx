// Archive tab — the codex of things met (engine/bestiary.ts): enemies seen (with total kills) and cards ever
// owned. Unmet entries stay as dark silhouettes / '???'. Completing either earns an achievement.
import { useState } from 'react'
import { bestiaryIds, codexCardIds } from '../../engine/bestiary.ts'
import type { ContentRegistry, DuoDef, Lang, MetaProfile } from '../../engine/types.ts'
import { sprite } from '../common/assets.ts'
import { tr } from '../common/lang.ts'
import { art } from '../components/art.ts'

/** Found duos show their pair, effect and lines; unfound ones keep the pair's secret. */
function ArchiveDuos({ duos, found, C, lang }: { duos: DuoDef[]; found: Set<string>; C: ContentRegistry; lang: Lang }) {
  return (
    <div className="m2-codex__duos">
      {duos.map((d) => {
        const seen = found.has(d.id)
        return (
          <div key={d.id} className={`m2-codex__duo${seen ? '' : ' is-hidden'}`}>
            <b>{seen ? tr(d.name, lang) : '???'}</b>
            <small>{seen ? d.pair.map((id) => tr(C.companions[id]?.name, lang)).join(' × ') : '??? × ???'}</small>
            {seen && <p>{tr(d.text, lang)}</p>}
            {seen && <p className="m2-codex__duo-lines">“{tr(d.lines[0], lang)}” “{tr(d.lines[1], lang)}”</p>}
          </div>
        )
      })}
    </div>
  )
}

export function ArchiveCodex({ profile, C, lang }: { profile: MetaProfile; C: ContentRegistry; lang: Lang }) {
  const ko = lang === 'ko'
  const [view, setView] = useState<'enemies' | 'cards' | 'duos'>('enemies')
  const enemies = bestiaryIds(C)
  const cards = codexCardIds(C)
  const met = profile.bestiary ?? {}
  const owned = new Set(profile.cardsSeen ?? [])
  const metCount = enemies.filter((id) => met[id] !== undefined).length
  const ownedCount = cards.filter((id) => owned.has(id)).length
  const duos = Object.values(C.duos ?? {})
  const found = new Set(profile.duos ?? [])
  return (
    <div className="m2-codex" data-testid="archive-codex">
      <div className="m2-codex__switch" role="tablist">
        <button role="tab" aria-selected={view === 'enemies'} className={view === 'enemies' ? 'is-on' : ''} onClick={() => setView('enemies')}>
          {ko ? '적' : 'Enemies'} <small className="m2-mono">{metCount}/{enemies.length}</small>
        </button>
        <button role="tab" aria-selected={view === 'cards'} className={view === 'cards' ? 'is-on' : ''} onClick={() => setView('cards')}>
          {ko ? '카드' : 'Cards'} <small className="m2-mono">{ownedCount}/{cards.length}</small>
        </button>
        <button role="tab" aria-selected={view === 'duos'} className={view === 'duos' ? 'is-on' : ''} onClick={() => setView('duos')}>
          {ko ? '듀오' : 'Duos'} <small className="m2-mono">{duos.filter((d) => found.has(d.id)).length}/{duos.length}</small>
        </button>
      </div>
      {view === 'duos' && <ArchiveDuos duos={duos} found={found} C={C} lang={lang} />}
      <div className="m2-codex__grid">
        {view === 'enemies' &&
          enemies.map((id) => {
            const def = C.enemies[id]
            const kills = met[id]
            const seen = kills !== undefined
            return (
              <div key={id} className={`m2-codex__cell${seen ? '' : ' is-hidden'}`} title={seen && def ? tr(def.name, lang) : '???'}>
                <img src={sprite(def?.sprite ?? id)} alt="" loading="lazy" />
                <span className="m2-codex__name">{seen && def ? tr(def.name, lang) : '???'}</span>
                {seen && <small className="m2-mono">{ko ? `처치 ${kills}` : `${kills} killed`}</small>}
              </div>
            )
          })}
        {view === 'cards' &&
          cards.map((id) => {
            const def = C.cards[id]
            const seen = owned.has(id)
            return (
              <div key={id} className={`m2-codex__cell m2-codex__cell--card${seen ? '' : ' is-hidden'}`} title={seen && def ? tr(def.text, lang) : '???'}>
                {seen ? <img src={art.card(id, def?.icon)} alt="" loading="lazy" /> : <span className="m2-codex__blank" aria-hidden="true" />}
                <span className="m2-codex__name">{seen && def ? tr(def.name, lang) : '???'}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
