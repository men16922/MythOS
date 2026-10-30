// Combat screen overlays: played-card ghosts flying to their target, turn / phase / result banners, the boss
// splash, and a held card shown large (touch long press).

import type { CSSProperties } from 'react'
import type { CardDef, ContentRegistry, EncounterDef, Lang } from '../../../engine/types.ts'
import { asset } from '../../common/assets.ts'
import { tr } from '../../common/lang.ts'
import { CardView } from '../../components/CardView.tsx'
import type { Banner, FxItem } from '../animator.ts'
import type { BoardGeom } from '../geometry.ts'
import './overlays.css'

type CardFx = Extract<FxItem, { kind: 'card' }>

/** Card ghosts: snap to the target tile, burn away. */
export function CardGhosts(p: { cards: CardFx[]; g: BoardGeom; boardLeft: number; boardTop: number; fs: number; C: ContentRegistry; lang: Lang }) {
  const { g, boardLeft, boardTop } = p
  return p.cards.map((f) => {
    const def = p.C.cards[f.cardId]
    if (!def) return null
    const tp = g.project(f.to.x + 0.5, f.to.y + 0.5)
    const tx = boardLeft + tp.x - (f.rect.left + f.rect.width / 2)
    const ty = boardTop + tp.y - g.tw * 0.6 - (f.rect.top + f.rect.height / 2)
    return (
      <div
        key={f.id}
        className="m2c-ghostcard"
        style={
          {
            left: f.rect.left,
            top: f.rect.top,
            width: f.rect.width,
            height: f.rect.height,
            '--tx': `${tx}px`,
            '--ty': `${ty}px`,
            animationDuration: `${f.ms}ms`,
            '--fs': `${p.fs}px`,
          } as CSSProperties
        }
      >
        <CardView def={def} upgraded={f.upgraded} lang={p.lang} />
      </div>
    )
  })
}

export function CombatBanner({ banner }: { banner: Banner }) {
  const tone = banner.kind === 'burst' ? ` is-${banner.tone ?? 'burst'}${banner.splash ? ' has-splash' : ''}` : ''
  return (
    <>
      {banner.kind === 'burst' && <UltScreen tone={banner.tone ?? 'burst'} art={banner.art} splash={banner.splash} />}
      <div className={`m2c-banner is-${banner.kind}${tone}`}>
        <div className="m2c-banner-bar" />
        {banner.art && <img className="m2c-banner-art" src={banner.art} alt="" />}
        <div className="m2c-banner-title">{banner.title}</div>
        {banner.sub && <div className="m2c-banner-sub">{banner.sub}</div>}
        {banner.quote && <div className="m2c-banner-quote">{banner.quote}</div>}
      </div>
    </>
  )
}

/** Radial streaks thrown out of the cut-in's impact (angle in degrees, delay in ms). */
const ULT_SHARDS = [0, 47, 92, 136, 180, 226, 271, 316].map((a, i) => ({ a, d: (i % 4) * 30 }))

/**
 * Full-screen cut-in behind a Signal Burst / companion ultimate banner: impact flash, letterbox, speed lines,
 * the ultimate's illustration slammed in on a skewed band (an inverted impact frame first), shards and a ring.
 */
function UltScreen({ tone, art, splash }: { tone: 'burst' | 'ult'; art: string | undefined; splash: string | undefined }) {
  return (
    <div className={`m2c-ultfx is-${tone}`} aria-hidden="true">
      <div className="m2c-ultfx-dim" />
      <div className="m2c-ultfx-lines" />
      <div className="m2c-ultfx-stripe is-a" />
      <div className="m2c-ultfx-stripe is-b" />
      {splash ? (
        <div className="m2c-ultfx-panel">
          <div className="m2c-ultfx-clip">
            <img className="m2c-ultfx-splash" src={splash} alt="" />
            <img className="m2c-ultfx-splash is-impact" src={splash} alt="" />
            <div className="m2c-ultfx-scan" />
          </div>
        </div>
      ) : (
        art && <img className="m2c-ultfx-art" src={art} alt="" />
      )}
      <div className="m2c-ultfx-ring" />
      <div className="m2c-ultfx-shards">
        {ULT_SHARDS.map((s) => (
          <i key={s.a} style={{ '--a': `${s.a}deg`, '--d': `${s.d}ms` } as CSSProperties} />
        ))}
      </div>
      <div className="m2c-ultfx-sweep" />
      <div className="m2c-ultfx-bar is-top" />
      <div className="m2c-ultfx-bar is-bottom" />
      <div className="m2c-ultfx-flash" />
    </div>
  )
}

/** Boss fights open on the boss: art + threat class, before the intro banner. */
export function BossSplash({ enc, art, lang }: { enc: EncounterDef; art: string | undefined; lang: Lang }) {
  const k = lang === 'ko'
  return (
    <div className="m2c-splash">
      {art ? <img src={asset(art)} alt="" /> : <div className="m2c-splash-noart" />}
      <div className="m2c-splash-name">
        <em>{k ? '위협 등급: 보스' : 'THREAT CLASS: BOSS'}</em>
        <b>{tr(enc.name, lang)}</b>
      </div>
    </div>
  )
}

/** Touch long press on a card: read it large. */
export function CardZoom(p: { fs: number; def: CardDef; upgraded: boolean; lang: Lang; play: { ok: boolean; reason?: string } | undefined }) {
  return (
    <div className="m2c-zoom" style={{ '--fs': `${p.fs}px` } as CSSProperties}>
      <CardView def={p.def} upgraded={p.upgraded} lang={p.lang} playable={p.play?.ok ?? false} {...(p.play?.reason ? { reason: p.play?.reason } : {})} />
    </div>
  )
}
