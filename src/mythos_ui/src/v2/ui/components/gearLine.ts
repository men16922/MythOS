import type { GearMods, Lang } from '../../engine/types.ts'

/** One short line per bonus, in the order a player reads them. */
export function gearLine(mods: GearMods, lang: Lang): string {
  const ko = lang === 'ko'
  const parts: string[] = []
  if (mods.damage) parts.push(ko ? `직격 +${mods.damage}` : `Direct +${mods.damage}`)
  if (mods.armor) parts.push(ko ? `장갑 +${mods.armor}` : `Armor +${mods.armor}`)
  if (mods.move) parts.push(ko ? `이동 +${mods.move}` : `Move +${mods.move}`)
  if (mods.openBlock) parts.push(ko ? `개전 방어막 ${mods.openBlock}` : `Start block ${mods.openBlock}`)
  if (mods.openFocus) parts.push(ko ? `개전 집중 ${mods.openFocus}` : `Start Focus ${mods.openFocus}`)
  if (mods.openEvade) parts.push(ko ? `개전 회피 ${mods.openEvade}` : `Start Evade ${mods.openEvade}`)
  if (mods.thorns) parts.push(ko ? `가시 ${mods.thorns}` : `Thorns ${mods.thorns}`)
  return parts.join(' · ')
}
