// Mythos 2.0 — Protocol card face. Used by combat (hand), rewards, shop, deck viewer, card pick.
import type { ReactNode } from 'react'
import '../../v2.css'
import { cardFace } from '../../engine/combat.ts'
import type { CardDef, CardType, Lang, Rarity, TargetMode } from '../../engine/types.ts'
import { portrait } from '../common/assets.ts'
import { L, tr } from '../common/lang.ts'
import { art } from './art.ts'

export interface CardViewProps {
  def: CardDef
  upgraded: boolean
  lang: Lang
  playable?: boolean
  selected?: boolean
  size?: 'sm' | 'md' | 'lg'
  reason?: string
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const TYPE_LABEL: Record<CardType, { ko: string; en: string }> = {
  attack: L('공격', 'Attack'),
  skill: L('기술', 'Skill'),
  tactic: L('전술', 'Tactic'),
  power: L('강화', 'Power'),
  junk: L('잡음', 'Junk'),
}

const RARITY_LABEL: Record<Rarity, { ko: string; en: string }> = {
  starter: L('기본', 'Starter'),
  common: L('일반', 'Common'),
  uncommon: L('특수', 'Uncommon'),
  rare: L('희귀', 'Rare'),
  special: L('고유', 'Special'),
}

function targetLabel(t: TargetMode, lang: Lang): string | null {
  const s = (ko: string, en: string) => (lang === 'ko' ? ko : en)
  switch (t.mode) {
    case 'none':
      return null
    case 'self':
      return s('자신', 'Self')
    case 'ally':
      return s(`아군 ${t.range}`, `Ally ${t.range}`)
    case 'melee':
      return s('근접', 'Melee')
    case 'line':
      return s(`직선 ${t.range}`, `Line ${t.range}`)
    case 'beam':
      return s(`관통 ${t.range}`, `Beam ${t.range}`)
    case 'lob':
      return s(`곡사 ${t.minRange}–${t.range}`, `Lob ${t.minRange}–${t.range}`)
    case 'tile':
      return s(`지점 ${t.range}`, `Tile ${t.range}`)
  }
}

/** Highlights numbers in rules text so values read at a glance. */
function richText(text: string, upgraded: boolean): ReactNode[] {
  const parts = text.split(/(\d+)/)
  return parts.map((p, i) =>
    /^\d+$/.test(p) ? (
      <b key={i} className={upgraded ? 'm2-num m2-num--up' : 'm2-num'}>
        {p}
      </b>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

export function CardView(props: CardViewProps) {
  const { def, upgraded, lang, playable = true, selected = false, size = 'md', reason } = props
  const face = cardFace(def, upgraded)
  const companionOwner = def.owner !== 'any' && def.owner !== 'connector' ? def.owner : null
  const tgt = targetLabel(face.target, lang)
  const artUrl = art.card(def.id, def.icon)
  const unplayableCost = face.cost < 0
  const classes = [
    'm2-card',
    `m2-card--${size}`,
    `m2-card--${def.type}`,
    `m2-rar--${def.rarity}`,
    upgraded ? 'is-upgraded' : '',
    playable ? '' : 'is-unplayable',
    selected ? 'is-selected' : '',
    props.onClick ? 'is-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role={props.onClick ? 'button' : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onClick={props.onClick}
      onKeyDown={
        props.onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                props.onClick?.()
              }
            }
          : undefined
      }
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      aria-disabled={!playable || undefined}
    >
      <div className="m2-card__frame">
        <div className="m2-card__art">
          {artUrl ? <img src={artUrl} alt="" loading="lazy" draggable={false} /> : <div className="m2-card__art-empty" />}
          <div className="m2-card__art-shade" />
        </div>
        <div className={unplayableCost ? 'm2-card__cost is-x' : 'm2-card__cost'}>
          <span>{unplayableCost ? '✕' : face.cost}</span>
        </div>
        {companionOwner && (
          <div className="m2-card__owner" title={companionOwner}>
            <img src={portrait(companionOwner.replaceAll('_', '-'))} alt="" draggable={false} />
          </div>
        )}
        <div className="m2-card__body">
          <div className="m2-card__name">
            {tr(def.name, lang)}
            {upgraded && <span className="m2-card__plus">+</span>}
          </div>
          <div className="m2-card__meta">
            <span className="m2-card__type">{tr(TYPE_LABEL[def.type], lang)}</span>
            {tgt && <span className="m2-card__tgt">{tgt}</span>}
            <span className="m2-card__gem" title={tr(RARITY_LABEL[def.rarity], lang)} />
          </div>
          <div className="m2-card__text">{richText(tr(face.text, lang), upgraded)}</div>
          {(face.exhaust || face.retain) && (
            <div className="m2-card__keys">
              {face.exhaust && <span>{lang === 'ko' ? '소멸' : 'Exhaust'}</span>}
              {face.retain && <span>{lang === 'ko' ? '유지' : 'Retain'}</span>}
            </div>
          )}
        </div>
      </div>
      {!playable && reason && <div className="m2-card__reason">{reason}</div>}
    </div>
  )
}
