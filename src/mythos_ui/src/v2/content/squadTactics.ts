// Squad tactics (DLC 3): every mix of three roles has a name, and two trios have their own. Numbers are perks the engine
// already reads, so the party screen and the HUD can state them in one line (engine/squad.ts).
import type { SquadRole, SquadTacticDef, Text } from '../engine/types.ts'

const t = (ko: string, en: string): Text => ({ ko, en })

export const SQUAD_ROLES: Record<string, SquadRole> = {
  tae_o: 'assault',
  doyun: 'assault',
  su_ah: 'assault',
  kai: 'assault',
  se_rin: 'support',
  lin_yue: 'support',
  miro: 'support',
  han: 'tech',
  io: 'tech',
  bel: 'tech',
  rem: 'tech',
}

export const SQUAD_TACTICS: SquadTacticDef[] = [
  { id: 'wedge', name: t('쐐기', 'Wedge'), roles: ['assault', 'assault', 'assault'], text: t('동료 직격 +2', 'Companion direct attacks +2'), perks: { companionDamage: 2 } },
  { id: 'covered_breach', name: t('엄호 돌파', 'Covered Breach'), roles: ['assault', 'assault', 'support'], text: t('동료 개전 방어막 +5', 'Companions open with +5 block'), perks: { companionBlock: 5 } },
  { id: 'painted_target', name: t('표적 지정', 'Painted Target'), roles: ['assault', 'assault', 'tech'], text: t('표식 피해 +2, 개전 시 적 전원 표식', 'Marks deal +2; all enemies start marked'), perks: { mark: 2, openMark: 1 } },
  { id: 'shield_wall', name: t('방패벽', 'Shield Wall'), roles: ['assault', 'support', 'support'], text: t('턴마다 접속자 방어막 +3', 'Connector gains 3 block each turn'), perks: { turnBlock: 3 } },
  { id: 'crossfire', name: t('교차 사격', 'Crossfire'), roles: ['assault', 'support', 'tech'], text: t('턴 시작 집중 효과 강화: 치명 조건 −1, 타격마다 집중 +1', 'Crits need 1 less Focus; hits build +1 Focus'), perks: { critEase: 1, focusPerHit: 1 } },
  { id: 'demolition', name: t('철거조', 'Demolition Crew'), roles: ['assault', 'tech', 'tech'], text: t('밀치기 +1칸, 충돌 피해 +2', 'Pushes go 1 tile further; bumps deal +2'), perks: { pushBonus: 1, bump: 2 } },
  { id: 'safe_house', name: t('안가', 'Safe House'), roles: ['support', 'support', 'support'], text: t('개전 에너지 +1, 동료 개전 방어막 +3', '+1 energy on turn 1; companions open with +3 block'), perks: { openEnergy: 1, companionBlock: 3 } },
  { id: 'quiet_routes', name: t('조용한 길', 'Quiet Routes'), roles: ['support', 'support', 'tech'], text: t('턴마다 접속자 회피 1', 'Connector gains 1 Evade each turn'), perks: { turnEvade: 1 } },
  { id: 'open_channel', name: t('열린 회선', 'Open Channel'), roles: ['support', 'tech', 'tech'], text: t('동료 카드가 턴마다 처음 1 에너지 돌려줌', 'The first companion card each turn refunds 1 energy'), perks: { companionRefund: true, refundEachTurn: true } },
  { id: 'shared_compute', name: t('공동 연산', 'Shared Compute'), roles: ['tech', 'tech', 'tech'], text: t('턴마다 카드 1장 더 뽑기', 'Draw 1 extra card each turn'), perks: { turnDraw: 1 } },
  { id: 'first_crew', name: t('첫 번째 팀', 'The First Crew'), trio: ['se_rin', 'tae_o', 'han'], text: t('턴마다 카드 1장 더 뽑기, 턴마다 접속자 방어막 +2', 'Draw 1 extra card and gain 2 block each turn'), perks: { turnDraw: 1, turnBlock: 2 } },
  { id: 'harbor_three', name: t('해문의 세 사람', 'The Harbor Three'), trio: ['mujin', 'seo_ha', 'parang'], text: t('밀치기 +1칸, 턴마다 접속자 회피 1', 'Pushes go 1 tile further; Connector gains 1 Evade each turn'), perks: { pushBonus: 1, turnEvade: 1 } },
]
