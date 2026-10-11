// Mythos 2.0 — implant (relic) icon with rarity ring + rules tooltip.
import type { ImplantDef, Lang } from '../../engine/types.ts'
import { L, tr } from '../common/lang.ts'
import { art } from './art.ts'
import { ImplantSetNote } from './ImplantSetNote.tsx'
import { Tooltip } from './Tooltip.tsx'
import './implant.css'

const RARITY = {
  starter: L('기본', 'Starter'),
  common: L('일반', 'Common'),
  uncommon: L('고급', 'Uncommon'),
  rare: L('희귀', 'Rare'),
  boss: L('보스', 'Boss'),
  shop: L('상점', 'Shop'),
}

export interface ImplantIconProps {
  def: ImplantDef
  lang: Lang
  size?: number
  /** Brief pulse (e.g. when it triggers in combat). */
  flash?: boolean
  /** Hide the tooltip (when a parent shows the text already). */
  noTip?: boolean
  onClick?: () => void
  /** Implants held now: adds the set note (family, progress, tier bonuses) to the tooltip. */
  owned?: readonly string[]
}

export function ImplantIcon({ def, lang, size = 36, flash, noTip, onClick, owned }: ImplantIconProps) {
  const icon = (
    <span className={`m2-implant m2-implant--${def.rarity}${flash ? ' is-flash' : ''}${onClick ? ' is-clickable' : ''}`} style={{ width: size, height: size }} onClick={onClick}>
      <img src={art.implant(def.id, def.icon)} alt={tr(def.name, lang)} draggable={false} />
    </span>
  )
  if (noTip) return icon
  return (
    <Tooltip
      content={
        <div className="m2-tip__implant">
          <div className="m2-tip__title">
            {tr(def.name, lang)} <em className={`m2-rtag m2-rtag--${def.rarity}`}>{tr(RARITY[def.rarity], lang)}</em>
          </div>
          <div className="m2-tip__text">{tr(def.text, lang)}</div>
          {owned && <ImplantSetNote implantId={def.id} owned={owned} lang={lang} held />}
        </div>
      }
    >
      {icon}
    </Tooltip>
  )
}
