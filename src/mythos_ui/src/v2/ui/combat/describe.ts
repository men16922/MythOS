// Human-readable combat text (bilingual). No raw ids ever reach the screen.

import type { BonusObjective, CombatState, Effect, EncounterDef, EnemyMove, Lang, StatusKind, Text } from '../../engine/types.ts'
import { L, tr } from '../common/lang.ts'

export const STATUS_NAME: Record<StatusKind, Text> = {
  burn: L('화상', 'Burn'),
  bleed: L('출혈', 'Bleed'),
  corrode: L('침식', 'Corrode'),
  shock: L('감전', 'Shock'),
  mark: L('표식', 'Mark'),
  weak: L('약화', 'Weak'),
  guard: L('수호', 'Guard'),
  thorns: L('가시', 'Thorns'),
  evade: L('회피', 'Evade'),
  focus: L('집중', 'Focus'),
  rage: L('분노', 'Rage'),
}

export const STATUS_TEXT: Record<StatusKind, Text> = {
  burn: L('적 페이즈가 끝날 때 수치만큼 피해(방어막 무시). 그 뒤 1 줄어든다.', 'Takes N damage at the end of each enemy phase (ignores block), then N − 1.'),
  bleed: L('움직이거나 밀려날 때마다 수치만큼 피해(방어막 무시) 후 1 감소. 가만히 있으면 적 페이즈 종료 시 절반으로 줄어든다.', 'Takes N damage (ignores block) each time it moves or is pushed, then N − 1. Standing still halves it at enemy phase end.'),
  corrode: L('적 페이즈 종료 시 수치만큼 피해(방어막 무시) 및 장갑 −1. 사망 시 인접 적에게 전염된다.', 'Takes N damage (ignores block) and loses 1 armor at enemy phase end. Spreads to adjacent enemies on death.'),
  shock: L('적: 공격이 불발되고 움직이지 못한다. 아군: 이동할 수 없다.', 'Enemy: its attack fizzles and it does not move. Party: cannot move.'),
  mark: L('다음에 받는 피해가 수치만큼 늘어난다.', 'The next hit taken deals N extra damage.'),
  weak: L('주는 피해 −2.', 'Deals 2 less damage.'),
  guard: L('매 턴 시작 시 수치만큼 방어막을 얻는다.', 'Gains N block at the start of each turn.'),
  thorns: L('근접·돌진으로 공격한 상대는 수치만큼 피해를 받는다.', 'Melee/charge attackers take N damage.'),
  evade: L('직격 공격을 받을 때 피해량을 절반으로 줄이고(스침) 1 줄어든다.', 'Halves incoming direct attack damage (grazed), then N − 1.'),
  rage: L('모든 공격 피해 +N. 엘리트·보스는 전투가 길어지면 매 턴 쌓인다.', 'Every attack deals +N. Elites and bosses build it each turn once a fight drags on.'),
  focus: L('4 이상 모이면 다음 직접 공격이 치명타(피해 1.5배 + 장갑 무시)로 적중하고 4 소모된다.', 'At 4+, the next direct attack critically hits (1.5× damage, ignores armor) and consumes 4.'),
}

const PATTERN: Record<EnemyMove['pattern'], Text> = {
  melee: L('근접', 'Melee'),
  line: L('사격', 'Shot'),
  beam: L('관통 빔', 'Beam'),
  charge: L('돌진', 'Charge'),
  nova: L('충격파', 'Nova'),
  lob: L('포격', 'Artillery'),
  buff: L('강화', 'Buff'),
  summon: L('호출', 'Summon'),
  track: L('추적 조준', 'Lock-on'),
}

export const TRACK_NOTE = L('추적 조준 — 회피 불가 (방어·해킹·처치로 대응)', "Lock-on — can't be dodged (block, hack or kill)")

function patternLabel(p: EnemyMove['pattern'], lang: Lang): string {
  return tr(PATTERN[p], lang)
}

function effectBit(e: Effect, lang: Lang): string | null {
  const k = lang === 'ko'
  switch (e.kind) {
    case 'push':
      return e.dir === 'toward' ? (k ? `끌어당기기 ${e.distance ?? 1}` : `Pull ${e.distance ?? 1}`) : k ? `밀쳐내기 ${e.distance ?? 1}` : `Push ${e.distance ?? 1}`
    case 'status':
      return `${tr(STATUS_NAME[e.status], lang)} ${e.amount}`
    case 'block':
      return k ? `방어막 +${e.amount}` : `Block +${e.amount}`
    case 'heal':
      return k ? `회복 ${e.amount}` : `Heal ${e.amount}`
    case 'damage':
      return k ? `피해 ${e.amount}` : `${e.amount} damage`
    case 'ignite':
      return k ? `불길 ${e.turns}턴` : `Fire ${e.turns}t`
    case 'electrify':
      return k ? `전기 바닥 ${e.turns}턴` : `Live wire ${e.turns}t`
    default:
      return null
  }
}

/** "사격 · 피해 3 · 밀쳐내기 1 · 2턴 뒤 발사" */
export function describeMove(move: EnemyMove, damage: number | undefined, windupLeft: number, lang: Lang): string {
  const k = lang === 'ko'
  const bits: string[] = [patternLabel(move.pattern, lang)]
  const dmg = damage ?? move.damage
  if (dmg && dmg > 0) bits.push(k ? `피해 ${dmg}` : `${dmg} damage`)
  if (move.range && (move.pattern === 'line' || move.pattern === 'beam')) bits.push(k ? `사거리 ${move.range}` : `range ${move.range}`)
  for (const e of move.effects ?? []) {
    const b = effectBit(e, lang)
    if (b) bits.push(b)
  }
  if (move.summon) bits.push(k ? `증원 ${move.summon.count}` : `${move.summon.count} reinforcement${move.summon.count > 1 ? 's' : ''}`)
  if (windupLeft > 0) bits.push(k ? `${windupLeft + 1}턴 뒤 발사` : `fires in ${windupLeft + 1} turns`)
  return bits.join(' · ')
}

export function bonusText(b: BonusObjective, lang: Lang): string {
  const k = lang === 'ko'
  switch (b.kind) {
    case 'turn_limit':
      return k ? `${b.turns}턴 안에 승리` : `Win within ${b.turns} turns`
    case 'untouched':
      return k ? '접속자 무피해' : 'Connector untouched'
    case 'environment':
      return k ? `환경으로 ${b.count}명 처치` : `${b.count} environment kills`
    case 'protect':
      return k ? '보호 대상 생존' : 'Keep the civilian alive'
  }
}

export function bonusProgress(c: CombatState): string | null {
  const b = c.bonus
  if (!b) return null
  switch (b.def.kind) {
    case 'turn_limit':
      return `${Math.min(c.turn, b.def.turns)}/${b.def.turns}`
    case 'environment':
      return `${Math.min(b.progress, b.def.count)}/${b.def.count}`
    default:
      return null
  }
}

export function objectiveText(enc: EncounterDef | undefined, c: CombatState, lang: Lang): string {
  const k = lang === 'ko'
  const o = enc?.objective
  if (o && o.kind === 'survive') {
    const left = Math.max(0, o.turns - (c.turn - 1))
    return k ? `${o.turns}턴 버티기 · 남은 턴 ${left}` : `Survive ${o.turns} turns · ${left} left`
  }
  return k ? '적 전멸' : 'Eliminate all hostiles'
}

export function kindTag(kind: EncounterDef['kind'] | undefined, lang: Lang): string | null {
  if (kind === 'elite') return lang === 'ko' ? '정예' : 'ELITE'
  if (kind === 'boss') return lang === 'ko' ? '보스' : 'BOSS'
  return null
}

// ---------------------------------------------------------------- first-combat tutorial flag

export const TUTORIAL_KEY = 'mythos2.tutorialDone'

export function tutorialDone(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return true
  }
}

export function markTutorialDone(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    // storage blocked — the tips simply show again next time
  }
}
