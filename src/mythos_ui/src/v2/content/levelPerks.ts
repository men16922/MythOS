// Companion level perks: at level 3 and 5 each companion takes one of two bonuses, once, for the rest of the run
// (engine/companionLevel.ts). Option A is the bonus every companion had before (opening block / Momentum); option B
// fits the companion — at level 3 it follows their best stat, at level 5 it is the same steady upgrade for everyone.
// Two choices per companion per run at most (reverse-engineering 1: Across the Obelisk, without its per-level picks).
// Measured 2026-11-04 (mixed bot, canonical blocks, 450 runs per depth): every option b within ±3 points of option a and
// none ahead in every block. Rejected: Footwork as evade 2 or 1 (Se-rin is in almost every party; with it every set of b's
// was ahead in all three Deep blocks) and Heavy Hands +1 damage (+3 in Deep).
import type { LevelPerkDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const LEVEL_PERKS: LevelPerkDef[] = [
  // ---- level 3
  { id: 'l3_guard', level: 3, option: 'a', name: t('방어 자세', 'Guarded'), text: t('전투 시작 시 방어막 3.', 'Starts each fight with 3 block.'), mods: { openBlock: 3 } },
  { id: 'l3_counter', level: 3, option: 'b', lead: 'str', name: t('맞받아치기', 'Counterpunch'), text: t('근접 공격을 받으면 공격자에게 피해 2.', 'Melee attackers take 2 damage.'), mods: { thorns: 2 } },
  { id: 'l3_footwork', level: 3, option: 'b', lead: 'agi', name: t('발놀림', 'Footwork'), text: t('이동력 +1.', '+1 move.'), mods: { move: 1 } },
  { id: 'l3_hardened', level: 3, option: 'b', lead: 'int', name: t('보강 회로', 'Hardened Rig'), text: t('장갑 +1.', '+1 armor.'), mods: { armor: 1 } },
  { id: 'l3_read', level: 3, option: 'b', lead: 'cha', name: t('눈치', 'Read the Room'), text: t('전투 시작 시 회피 1.', 'Starts each fight with 1 evade.'), mods: { openEvade: 1 } },
  { id: 'l3_aim', level: 3, option: 'b', lead: 'obs', name: t('조준 습관', 'Steady Aim'), text: t('전투 시작 시 집중 2.', 'Starts each fight with 2 focus.'), mods: { openFocus: 2 } },
  // ---- level 5
  { id: 'l5_momentum', level: 5, option: 'a', name: t('신호 공명', 'Resonance'), text: t('전투 시작 시 모멘텀 +15.', '+15 Momentum at the start of each fight.'), momentum: 15 },
  { id: 'l5_veteran', level: 5, option: 'b', name: t('노련함', 'Veteran'), text: t('직접 공격 피해 +1, 장갑 +1.', '+1 damage on direct attacks, +1 armor.'), mods: { damage: 1, armor: 1 } },
]
