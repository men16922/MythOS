// What each run stat does in a fight right now, one line per stat (engine/statPerks.ts is the single source).
// Shared by the TopBar tooltip and the character sheet.
import { statPerks } from '../../engine/statPerks.ts'
import type { Lang, Stats } from '../../engine/types.ts'

export function statPerkLines(stats: Stats, lang: Lang): [string, string][] {
  const p = statPerks(stats)
  const ko = lang === 'ko'
  const parts = (xs: (string | false)[]) => xs.filter(Boolean).join(', ') || (ko ? '효과 없음' : 'no bonus yet')
  return [
    [`STR ${stats.str}`, parts([p.attack > 0 && (ko ? `직격 +${p.attack}` : `Direct +${p.attack}`), p.bump > 0 && (ko ? `충돌 +${p.bump}` : `Bump +${p.bump}`)])],
    [
      `AGI ${stats.agi}`,
      parts([
        p.openEvade > 0 && (ko ? `개전 회피 ${p.openEvade}` : `Start Evade ${p.openEvade}`),
        p.sprintEvade && (ko ? '3칸 질주 시 회피 +1' : '3-tile sprint: Evade +1'),
        p.move > 0 && (ko ? `이동 +${p.move}` : `Move +${p.move}`),
      ]),
    ],
    [`INT ${stats.int}`, parts([p.dot > 0 && (ko ? `지속 피해 부여 +${p.dot}` : `DoT +${p.dot}`), p.openDraw > 0 && (ko ? `첫 턴 드로우 +${p.openDraw}` : `Turn 1 draw +${p.openDraw}`)])],
    [
      `CHA ${stats.cha}`,
      parts([
        p.companionBlock > 0 && (ko ? `동료 개전 방어막 +${p.companionBlock}` : `Companion start block +${p.companionBlock}`),
        p.companionRefund && (ko ? '첫 동료 카드 에너지 +1' : '1st companion card +1 energy'),
      ]),
    ],
    [
      `OBS ${stats.obs}`,
      parts([
        p.openFocus > 0 && (ko ? `개전 집중 ${p.openFocus}` : `Start Focus ${p.openFocus}`),
        p.focusPerHit > 0 && (ko ? `타격당 집중 +${p.focusPerHit} (4=치명타)` : `Focus/hit +${p.focusPerHit} (4 = crit)`),
        p.mark > 0 && (ko ? `표식 +${p.mark}` : `Mark +${p.mark}`),
      ]),
    ],
  ]
}
