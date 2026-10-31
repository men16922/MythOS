// Gear (2026-11-01): one weapon and one armor per person, found on elites and bosses or bought at shops, gone when the run
// ends. Numbers are plain so the party screen reads at a glance; only rare pieces stack two bonuses.
import type { GearDef, GearMods, GearSlot, Rarity, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })
const gear = (id: string, slot: GearSlot, rarity: Extract<Rarity, 'common' | 'uncommon' | 'rare'>, name: Text, mods: GearMods): GearDef => ({ id, slot, rarity, name, mods })

export const GEAR: GearDef[] = [
  gear('wp_pipe', 'weapon', 'common', t('쇠파이프', 'Iron Pipe'), { damage: 1 }),
  gear('wp_wrench', 'weapon', 'common', t('소켓 렌치', 'Socket Wrench'), { damage: 1, openBlock: 2 }),
  gear('wp_ladle', 'weapon', 'common', t('배식 국자', 'Serving Ladle'), { damage: 1, thorns: 1 }),
  gear('wp_flare', 'weapon', 'common', t('신호탄 권총', 'Flare Pistol'), { damage: 1, openFocus: 1 }),
  gear('wp_cutter', 'weapon', 'uncommon', t('볼트 절단기', 'Bolt Cutter'), { damage: 2 }),
  gear('wp_baton', 'weapon', 'uncommon', t('압수한 충격봉', 'Seized Baton'), { damage: 1, openBlock: 4 }),
  gear('wp_nailgun', 'weapon', 'uncommon', t('못 총', 'Nail Gun'), { damage: 1, openFocus: 2 }),
  gear('wp_gauntlet', 'weapon', 'uncommon', t('유압 건틀릿', 'Hydraulic Gauntlet'), { damage: 1, thorns: 2 }),
  gear('wp_rail', 'weapon', 'rare', t('소형 레일건', 'Pocket Railgun'), { damage: 2, openFocus: 1 }),
  gear('wp_mono', 'weapon', 'rare', t('단분자 칼날', 'Monofilament Blade'), { damage: 2, move: 1 }),
  gear('ar_vest', 'armor', 'common', t('방검 조끼', 'Stab Vest'), { openBlock: 3 }),
  gear('ar_poncho', 'armor', 'common', t('방수 우비', 'Rain Poncho'), { openEvade: 1 }),
  gear('ar_apron', 'armor', 'common', t('두꺼운 앞치마', 'Heavy Apron'), { openBlock: 2, thorns: 1 }),
  gear('ar_visor', 'armor', 'common', t('표적 바이저', 'Target Visor'), { openFocus: 1 }),
  gear('ar_plate', 'armor', 'uncommon', t('진압 흉갑', 'Riot Plate'), { armor: 1 }),
  gear('ar_boots', 'armor', 'uncommon', t('러너 부츠', 'Runner Boots'), { move: 1 }),
  gear('ar_coat', 'armor', 'uncommon', t('납 안감 코트', 'Lead-Lined Coat'), { openBlock: 5 }),
  gear('ar_spikes', 'armor', 'uncommon', t('가시 어깨받이', 'Spiked Pauldrons'), { thorns: 2 }),
  gear('ar_mesh', 'armor', 'rare', t('나노 메시', 'Nano Mesh'), { armor: 1, openBlock: 4 }),
  gear('ar_frame', 'armor', 'rare', t('외골격 프레임', 'Exo Frame'), { armor: 1, move: 1 }),
]
